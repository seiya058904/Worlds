import assert from 'node:assert/strict';
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import filesystem from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { test } from 'node:test';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { worldsPlugin } from '../server/worlds-plugin.ts';
import { parseWorld } from '../src/content.ts';

for (const trigger of ['watcher', 'refresh']) {
  test(`${trigger}: saves arriving after Markdown was read trail the blocked scan and coalesce`, async t => {
    const directory = await mkdtemp(path.join(tmpdir(), 'worlds-reader-trailing-'));
    const document = path.join(directory, '测试.md');
    const image = path.join(directory, '地图.png');
    const body = (value: string) => `# 测试\n\n## 章节\n${value}\n\n![地图](地图.png)\n`;
    await writeFile(document, body('initial'));
    await writeFile(image, Buffer.from([1, 2, 3]));
    const server = await createServer({ configFile: false, root: fileURLToPath(new URL('..', import.meta.url)), plugins: [worldsPlugin(directory)], server: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' });
    let release!: () => void;
    let blocked!: () => void;
    const atImage = new Promise<void>(resolve => { blocked = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    let armed = false, failRead = false, reads = 0;
    const original = filesystem.readFile;
    try {
      await server.listen();
      const { port } = server.httpServer!.address() as { port: number };
      const origin = `http://127.0.0.1:${port}`;
      t.mock.method(filesystem, 'readFile', async (...args: any[]) => {
        if (String(args[0]) === document) reads++;
        if (String(args[0]) === image && failRead) throw Object.assign(new Error('temporary read failure'), { code: 'EACCES' });
        const result = await Reflect.apply(original, filesystem, args);
        if (String(args[0]) === image && armed) { armed = false; blocked(); await gate; }
        return result;
      });
      syncBuiltinESMExports();
      await pause(200);
      async function save(value: string) {
        await pause(150); // Chokidar coalesces adjacent native changes within its throttle window.
        const event = new Promise<void>(resolve => { const listener = (file: string) => { if (path.resolve(file) === document) { server.watcher.off('change', listener); resolve(); } }; server.watcher.on('change', listener); });
        await writeFile(document, body(value));
        await Promise.race([event, pause(5000).then(() => { throw new Error('watcher did not observe save'); })]);
      }
      armed = true;
      await save('first save');
      await Promise.race([atImage, pause(5000).then(() => { throw new Error('scan did not reach image I/O'); })]);
      // The first scan has already consumed Markdown and is awaiting unrelated image I/O.
      await save('second save');
      let explicit: Promise<Response> | undefined;
      if (trigger === 'refresh') explicit = fetch(`${origin}/api/worlds?refresh=1`);
      for (let index = 0; index < 5; index++) await save(`burst ${index}`);
      await pause(300); // Debounced requests also arrive while the original scan is blocked.
      release();
      if (explicit) assert.equal((await explicit).status, 200);
      const end = Date.now() + 5000;
      let source: any;
      do { source = await (await fetch(`${origin}/api/worlds/${encodeURIComponent('测试')}`)).json(); if (source.markdown.includes('burst 4')) break; await pause(50); } while (Date.now() < end);
      assert.ok(source.markdown.includes('burst 4'), 'latest body appears without another save or launcher restart');
      assert.ok(!source.markdown.includes('first save'));
      await pause(500);
      assert.equal(reads, 2, 'all blocked invalidations need only one trailing scan');
      failRead = true;
      assert.equal((await fetch(`${origin}/api/worlds?refresh=1`)).status, 503);
      failRead = false;
      assert.equal((await fetch(`${origin}/api/worlds?refresh=1`)).status, 200);
      await server.close();
      const afterClose = reads;
      server.watcher.emit('all', 'change', document);
      await pause(300);
      assert.equal(reads, afterClose, 'closed watcher cannot schedule another scan');
    } finally {
      release();
      await server.close();
      t.mock.restoreAll();
      syncBuiltinESMExports();
      await unlink(document); await unlink(image); await rmdir(directory);
    }
  });
}

test('重新打开时主动扫描磁盘，即使遗漏文件事件也能更新正文和章节', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'worlds-reader-reopen-'));
  const document = path.join(directory, '测试.md');
  const added = path.join(directory, '新增.md');
  await writeFile(document, '# 测试\n\n## 旧章\n旧正文\n');
  const server = await createServer({ configFile: false, root: fileURLToPath(new URL('..', import.meta.url)), plugins: [worldsPlugin(directory)], server: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' });
  try {
    await server.listen();
    const { port } = server.httpServer!.address() as { port: number };
    const origin = `http://127.0.0.1:${port}`;
    const initial = await (await fetch(`${origin}/api/worlds`)).json();
    // Simulate a missed filesystem event without touching the author's documents.
    await server.watcher.close();
    await writeFile(document, '# 测试\n\n## 修改章\n最新正文\n\n## 新章\n### 小节\n新增段落\n');
    await writeFile(added, '# 新增世界\n\n## 开始\n内容\n');
    assert.equal((await (await fetch(`${origin}/api/worlds`)).json()).revision, initial.revision);
    assert.equal((await fetch(`${origin}/api/worlds?refresh=1`, { headers: { Origin: 'https://unrelated.example' } })).status, 403);
    assert.equal((await fetch(`${origin}/api/worlds?refresh=1`, { method: 'POST' })).status, 405);
    const refreshed = await (await fetch(`${origin}/api/worlds?refresh=1`)).json();
    assert.notEqual(refreshed.revision, initial.revision);
    assert.equal(refreshed.identity, initial.identity);
    assert.equal(refreshed.worlds.length, 2);
    const source = await (await fetch(`${origin}/api/worlds/${encodeURIComponent('测试')}`)).json();
    assert.ok(source.markdown.includes('最新正文'));
    assert.ok(!source.markdown.includes('旧正文'));
    const parsed = parseWorld(source);
    assert.deepEqual(parsed.chapters.map(chapter => chapter.title), ['开篇', '修改章', '新章']);
    assert.equal(parsed.chapters.at(-1)!.sections.find(section => section.depth === 3)?.title, '小节');
  } finally {
    await server.close();
    await unlink(document);
    await unlink(added).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await rmdir(directory);
  }
});

test('临时副本文档与地图的新增、修改、删除及文件事件同步；接口只读且限制资源范围', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'worlds-reader-test-'));
  const created = new Set<string>();
  async function write(name: string, value: string | Buffer) { created.add(name); await writeFile(path.join(directory, name), value); }
  const events: unknown[] = [];
  await write('测试.md', '# 测试\n\n## 第一章\n原文\n\n![地图](地图.png)\n');
  await write('地图.png', Buffer.from([1, 2, 3]));
  await write('未引用.png', Buffer.from([4, 5]));
  const server = await createServer({ configFile: false, root: fileURLToPath(new URL('..', import.meta.url)), plugins: [worldsPlugin(directory)], server: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' });
  const send = server.ws.send.bind(server.ws);
  server.ws.send = ((...args: Parameters<typeof send>) => { events.push(args[0]); return send(...args); }) as typeof server.ws.send;
  try {
    await server.listen();
    const address = server.httpServer!.address() as { port: number };
    const origin = `http://127.0.0.1:${address.port}`;
    async function manifest() { return (await fetch(`${origin}/api/worlds`)).json(); }
    async function until(predicate: (manifest: any) => boolean) {
      const end = Date.now() + 7000;
      while (Date.now() < end) { const value = await manifest(); if (predicate(value)) return value; await pause(80); }
      assert.fail('Timed out waiting for filesystem sync');
    }
    const initial = await manifest();
    assert.equal(initial.worlds.length, 1);
    assert.equal(initial.worlds[0].maps.length, 1);
    assert.ok(!('markdown' in initial.worlds[0]));
    assert.equal((await fetch(`${origin}/api/worlds/%E6%B5%8B%E8%AF%95`)).status, 200);
    assert.equal((await fetch(`${origin}/api/worlds`, { method: 'POST' })).status, 405);
    assert.equal((await fetch(`${origin}/api/worlds`, { headers: { Origin: 'https://unrelated.example' } })).status, 403);
    assert.equal((await fetch(`${origin}/api/assets/${encodeURIComponent('未引用.png')}`)).status, 404);
    assert.equal((await fetch(`${origin}/api/assets/..%2FREADME.md`)).status, 404);
    assert.equal((await fetch(`${origin}/api/worlds/%2E%2E%2FREADME`)).status, 404);
    await pause(200); // Let the directory watcher finish its initial subscription.
    await write('测试.md', '# 测试\n\n## 修改章\n更新正文\n\n## 新章\n新增段落\n\n![地图](地图.png)\n');
    const changed = await until(value => value.revision !== initial.revision);
    const source = await (await fetch(`${origin}/api/worlds/${encodeURIComponent('测试')}`)).json();
    assert.ok(source.markdown.includes('新增段落'));
    assert.ok(!source.markdown.includes('原文'));
    assert.ok(events.some((event: any) => event?.type === 'custom' && event.event === 'worlds:changed'));
    await write('地图.png', Buffer.from([9, 8, 7, 6]));
    const replaced = await until(value => value.worlds[0].maps[0].url !== changed.worlds[0].maps[0].url);
    assert.deepEqual(Buffer.from(await (await fetch(origin + replaced.worlds[0].maps[0].url)).arrayBuffer()), Buffer.from([9, 8, 7, 6]));
    await write('新增.md', '# 新增世界\n\n## 开始\n内容\n');
    await until(value => value.worlds.length === 2);
    await unlink(path.join(directory, '新增.md')); created.delete('新增.md');
    await until(value => value.worlds.length === 1);
    await write('测试.md', '# 测试\n\n## 修改章\n仅剩这章\n');
    const removedReference = await until(value => !value.worlds[0].maps.length);
    assert.notEqual(removedReference.revision, replaced.revision);
    assert.equal((await fetch(origin + replaced.worlds[0].maps[0].url)).status, 404);
    await unlink(path.join(directory, '测试.md')); created.delete('测试.md');
    await until(value => !value.worlds.length);
    assert.equal((await fetch(`${origin}/api/worlds/${encodeURIComponent('测试')}`)).status, 404);
  } finally {
    await server.close();
    for (const name of created) await unlink(path.join(directory, name));
    await rmdir(directory);
  }
});
