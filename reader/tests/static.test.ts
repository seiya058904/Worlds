import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, writeFile, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { test, type TestContext } from 'node:test';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { digest, manifestFor, readSnapshot } from '../server/worlds-snapshot.ts';
import { staticContentPlugin } from '../server/static-content.ts';

async function fixture(t: TestContext) {
  const directory = await mkdtemp(path.join(tmpdir(), 'worlds-static-'));
  const files = new Set<string>();
  const write = async (name: string, value: string | Buffer) => { files.add(name); await writeFile(path.join(directory, name), value); };
  t.after(async () => { for (const name of files) await unlink(path.join(directory, name)); await rmdir(directory); });
  await write('人界.md', '# 人界\r\n\r\n## 山河\r\n中文与原始换行。  \r\n第二行。\r\n');
  await write('西幻世界.md', '# 西幻世界\n\n## 地理\n![大陆](中文地图.png?original=1)\n');
  await write('星星联邦.md', '# 星星联邦\n\n## 航道\n![星图][map]\n\n[map]: 中文地图.png\n');
  await write('宋世江湖.md', '# 宋世江湖\n\n## 江湖\n人物与关系。\n');
  await write('中文地图.png', Buffer.from([1, 2, 3, 4]));
  await write('未引用.png', Buffer.from([8, 9]));
  await write('不得公开.txt', 'private fixture');
  await write('.隐藏.md', '# hidden');
  return { directory, write };
}

test('static build emits a complete UTF-8 manifest, all four worlds and only referenced original maps', async t => {
  const { directory } = await fixture(t);
  const result: any = await build({ configFile: false, root: fileURLToPath(new URL('..', import.meta.url)), base: './', plugins: [react(), staticContentPlugin(directory)], build: { write: false }, logLevel: 'silent' });
  const output = result.output as { fileName: string; source?: string | Uint8Array }[];
  const get = (name: string) => { const item = output.find(item => item.fileName === name); assert.ok(item, name); return Buffer.from(item.source!); };
  const manifest = JSON.parse(get('content/manifest.json').toString('utf8'));
  assert.deepEqual(manifest.worlds.map((world: any) => world.id), ['人界', '西幻世界', '星星联邦', '宋世江湖']);
  assert.equal(manifest.mode, 'online');
  assert.match(manifest.revision, /^[a-f0-9]{64}$/);
  for (const info of manifest.worlds) {
    const url = new URL(info.source, 'https://example.test/Worlds/');
    assert.ok(url.pathname.startsWith('/Worlds/content/worlds/'));
    assert.equal(url.searchParams.get('v'), info.revision);
    const source = JSON.parse(get(decodeURIComponent(url.pathname.slice('/Worlds/'.length))).toString('utf8'));
    assert.equal(source.revision, info.revision);
    assert.deepEqual(Buffer.from(source.markdown, 'utf8'), await readFile(path.join(directory, `${info.id}.md`)));
    assert.ok(!('markdown' in info));
  }
  const map = manifest.worlds[1].maps[0];
  assert.equal(map.name, '中文地图.png');
  assert.equal(new URL(map.url, 'https://example.test/Worlds/').searchParams.get('v'), map.revision);
  assert.deepEqual(get('content/assets/中文地图.png'), await readFile(path.join(directory, '中文地图.png')));
  assert.equal(map.revision, digest(get('content/assets/中文地图.png')));
  assert.deepEqual(output.filter(item => item.fileName.startsWith('content/assets/')).map(item => item.fileName), ['content/assets/中文地图.png']);
  assert.ok(!output.some(item => /未引用|不得公开|隐藏/.test(item.fileName)));
  const html = get('index.html').toString('utf8');
  assert.match(html, /href="\.\/favicon.svg"/);
  assert.match(html, /src="\.\/assets\//);
  assert.ok(output.some(item => /^assets\/MapViewer-.*\.js$/.test(item.fileName)));
});

test('global and world revisions change only with their Markdown, including local/online parity', async t => {
  const { directory, write } = await fixture(t);
  const before = await readSnapshot(directory, 'online');
  assert.equal((await readSnapshot(directory, 'local')).revision, before.revision);
  assert.equal((await readSnapshot(directory, 'online')).revision, before.revision);
  await write('宋世江湖.md', '# 宋世江湖\n\n## 江湖\n修改后的正式正文。\n');
  const after = await readSnapshot(directory, 'online');
  assert.notEqual(after.revision, before.revision);
  for (const world of before.worlds) {
    const changed = after.worlds.find(item => item.id === world.id)!;
    assert.equal(changed.revision === world.revision, world.id !== '宋世江湖');
  }
});

test('map bytes version the asset and its referring worlds; unreferenced changes have no effect', async t => {
  const { directory, write } = await fixture(t);
  const before = await readSnapshot(directory, 'online');
  await write('未引用.png', Buffer.from([0, 0]));
  assert.equal((await readSnapshot(directory, 'online')).revision, before.revision);
  await write('中文地图.png', Buffer.from([9, 8, 7]));
  const after = await readSnapshot(directory, 'online');
  assert.notEqual(after.revision, before.revision);
  assert.notEqual(after.assets.get('中文地图.png')!.revision, before.assets.get('中文地图.png')!.revision);
  for (const world of before.worlds) assert.equal(after.worlds.find(item => item.id === world.id)!.revision === world.revision, !world.maps.length);
});

test('traversal, encoded separators, external URLs, HTML and disallowed extensions cannot export other files', async t => {
  const { directory, write } = await fixture(t);
  await write('人界.md', '# 人界\n\n![a](../secret.png)\n![b](..%2Fsecret.png)\n![c](..%5Csecret.png)\n![d](https://example.test/中文地图.png)\n![e](file:///secret.png)\n![f](不得公开.txt)\n![g](%E0%A4%A)\n<img src="未引用.png">\n');
  const snapshot = await readSnapshot(directory, 'online');
  assert.deepEqual(snapshot.worlds[0].maps, []);
  assert.deepEqual([...snapshot.assets.keys()], ['中文地图.png']);
});

test('real four documents are read byte-for-byte, with exactly the two original maps and no other repository content', async () => {
  const directory = fileURLToPath(new URL('../../worlds', import.meta.url));
  const snapshot = await readSnapshot(directory, 'online');
  assert.equal(snapshot.worlds.length, 4);
  assert.equal(snapshot.assets.size, 2);
  for (const world of snapshot.worlds) assert.deepEqual(Buffer.from(world.markdown, 'utf8'), await readFile(path.join(directory, `${world.id}.md`)));
  for (const [name, asset] of snapshot.assets) assert.deepEqual(asset.bytes, await readFile(path.join(directory, name)));
  const manifest = manifestFor(snapshot, 'online');
  assert.ok(manifest.worlds.every(info => !info.source.includes('/api/') && info.maps.every(map => !map.url.includes('/api/'))));
  assert.equal((await readdir(directory)).filter(name => name.endsWith('.md')).length, manifest.worlds.length);
});
