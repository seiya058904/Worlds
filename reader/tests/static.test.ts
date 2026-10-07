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
  const remove = async (name: string) => { await unlink(path.join(directory, name)); files.delete(name); };
  return { directory, write, remove };
}

test('任意新书、书名修改、移走书籍和新地图自动进入或退出发布索引', async t => {
  const { directory, write, remove } = await fixture(t);
  const original = await readSnapshot(directory, 'online');
  await write('新世界.md', '# 任意书名\n\n## 新章\n![新地图](新地图.webp)\n');
  await write('新地图.webp', Buffer.from([10, 11, 12]));
  const added = await readSnapshot(directory, 'online');
  assert.notEqual(added.revision, original.revision);
  const book = added.worlds.find(world => world.id === '新世界')!;
  assert.equal(book.title, '任意书名');
  assert.equal(book.maps[0].name, '新地图.webp');
  const result: any = await build({ configFile: false, root: fileURLToPath(new URL('..', import.meta.url)), base: './', plugins: [react(), staticContentPlugin(directory)], build: { write: false }, logLevel: 'silent' });
  const output = result.output as { fileName: string; source?: string | Uint8Array }[];
  const get = (name: string) => { const item = output.find(item => item.fileName === name); assert.ok(item, name); return Buffer.from(item.source!); };
  const manifest = JSON.parse(get('content/manifest.json').toString('utf8'));
  assert.ok(manifest.worlds.some((world: any) => world.id === '新世界'));
  assert.equal(JSON.parse(get('content/worlds/新世界.json').toString('utf8')).markdown, book.markdown);
  assert.deepEqual(get('content/assets/新地图.webp'), Buffer.from([10, 11, 12]));
  await write('改名世界.md', book.markdown);
  await remove('新世界.md');
  const renamed = await readSnapshot(directory, 'online');
  assert.ok(renamed.worlds.some(world => world.id === '改名世界'));
  assert.ok(!renamed.worlds.some(world => world.id === '新世界'));
  await remove('改名世界.md');
  const removed = await readSnapshot(directory, 'online');
  assert.equal(removed.revision, original.revision);
  assert.ok(!removed.assets.has('新地图.webp'), '未再被引用的地图不进入发布产物');
});

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

test('当前所有文档与引用地图逐字节保留；书籍和地图数量随源文件变化', async () => {
  const directory = fileURLToPath(new URL('../../worlds', import.meta.url));
  const snapshot = await readSnapshot(directory, 'online');
  const documents = (await readdir(directory, { withFileTypes: true })).filter(entry => entry.isFile() && !entry.name.startsWith('.') && entry.name.endsWith('.md')).map(entry => entry.name.slice(0, -3)).sort();
  assert.deepEqual(snapshot.worlds.map(world => world.id).sort(), documents);
  assert.deepEqual([...snapshot.assets.keys()].sort(), [...new Set(snapshot.worlds.flatMap(world => world.maps.map(map => map.name)))].sort());
  for (const world of snapshot.worlds) assert.deepEqual(Buffer.from(world.markdown, 'utf8'), await readFile(path.join(directory, `${world.id}.md`)));
  for (const [name, asset] of snapshot.assets) assert.deepEqual(asset.bytes, await readFile(path.join(directory, name)));
  const manifest = manifestFor(snapshot, 'online');
  assert.ok(manifest.worlds.every(info => !info.source.includes('/api/') && info.maps.every(map => !map.url.includes('/api/'))));
  assert.equal(documents.length, manifest.worlds.length);
});
