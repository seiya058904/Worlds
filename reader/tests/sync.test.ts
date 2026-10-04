import assert from 'node:assert/strict';
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { test } from 'node:test';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { worldsPlugin } from '../server/worlds-plugin.ts';

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
