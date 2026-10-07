import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWorldSync, contentUrl, syncInterval, type SyncStatus } from '../src/sync.ts';
import { parseWorld, searchWorlds } from '../src/content.ts';
import type { ParsedWorld, SourceMode, WorldSource, WorldsManifest } from '../src/types.ts';

function harness(mode: SourceMode = 'online') {
  let sources: WorldSource[] = ['甲', '乙'].map(id => ({ id, title: id, label: id, revision: `${id}-1`, markdown: `# ${id}\n\n## 章节\n${id}的正文。\n`, maps: [], status: '典藏' }));
  let revision = 'global-1';
  const requests: { url: URL; cache: RequestCache | undefined }[] = [];
  const publications: ParsedWorld[][] = [];
  const statuses: SyncStatus[] = [];
  let failures = new Set<string>();
  let mismatch = false, malformed = false;
  let gate: (() => Promise<void>) | undefined;
  let parses = 0;
  const controller = new AbortController();
  const manifest = (): WorldsManifest => ({ app: 'worlds-reader', mode, revision, worlds: sources.map(({ markdown: _markdown, ...world }) => ({ ...world, source: mode === 'online' ? `content/worlds/${encodeURIComponent(world.id)}.json?v=${world.revision}` : `/api/worlds/${encodeURIComponent(world.id)}` })) });
  const fetcher = (async (input: any, options: RequestInit) => {
    const url = new URL(String(input));
    requests.push({ url, cache: options.cache });
    if (gate) await gate();
    if (failures.has(url.pathname)) return new Response('', { status: 503 });
    const isManifest = url.pathname.endsWith('/manifest.json') || url.pathname === '/api/worlds';
    const id = decodeURIComponent(url.pathname.split('/').at(-1)!).replace(/\.json$/, '');
    const source = sources.find(world => world.id === id);
    const value = isManifest ? malformed ? { revision: 'bad' } : manifest() : mismatch ? { ...source, revision: 'stale' } : source;
    return new Response(JSON.stringify(value), { status: 200 });
  }) as typeof fetch;
  const sync = createWorldSync({ mode, baseUrl: mode === 'online' ? 'https://example.test/Worlds/' : 'http://127.0.0.1:4175/', signal: controller.signal, fetcher,
    publish: next => publications.push(next), status: value => statuses.push(value), parse: source => { parses++; return parseWorld(source); } });
  return { sync, requests, publications, statuses, controller, manifest, get parses() { return parses; },
    update(ids: string[]) { revision += '-next'; sources = sources.map(world => ids.includes(world.id) ? { ...world, revision: `${world.revision}-next`, markdown: world.markdown + '\n新增段落。\n' } : world); },
    remove(id: string) { revision += '-removed'; sources = sources.filter(world => world.id !== id); },
    add(id: string) { revision += '-added'; sources.push({ id, title: id, label: id, revision: `${id}-1`, markdown: `# ${id}\n\n## 新书章节\n新书正文。\n`, maps: [], status: '典藏' }); },
    rewrite(id: string, markdown: string) { revision += '-rewritten'; sources = sources.map(world => world.id === id ? { ...world, revision: `${world.revision}-next`, markdown } : world); },
    fail(paths: string[]) { failures = new Set(paths); }, mismatch(value: boolean) { mismatch = value; }, malformed(value: boolean) { malformed = value; }, gate(value?: () => Promise<void>) { gate = value; } };
}

test('unchanged manifest makes no source requests, reparses or publications; cache busting changes each check', async () => {
  const h = harness(); await h.sync.refresh();
  assert.equal(h.parses, 2); assert.equal(h.publications.length, 1);
  const count = h.requests.length;
  await h.sync.refresh(); await h.sync.refresh();
  assert.equal(h.requests.length, count + 2); assert.equal(h.parses, 2); assert.equal(h.publications.length, 1);
  const manifests = h.requests.filter(item => item.url.pathname.endsWith('/manifest.json'));
  assert.equal(new Set(manifests.map(item => item.url.searchParams.get('_sync'))).size, 3);
  assert.ok(manifests.every(item => item.cache === 'no-store'));
  assert.equal(h.statuses.at(-1), 'ready');
});

test('only changed world is fetched/parsed; unchanged world retains object identity and Pages subpath', async () => {
  const h = harness(); await h.sync.refresh(); const before = h.publications[0];
  h.update(['乙']); const start = h.requests.length; await h.sync.refresh();
  const after = h.publications[1];
  assert.equal(after[0], before[0]); assert.notEqual(after[1], before[1]); assert.equal(h.parses, 3);
  assert.equal(h.requests.length - start, 2);
  assert.ok(h.requests.every(item => item.url.pathname.startsWith('/Worlds/content/')));
  assert.ok(h.requests.at(-1)!.url.pathname.endsWith(`${encodeURIComponent('乙')}.json`));
});

test('partial source failure preserves the entire last-known-good snapshot; recovery commits all changed worlds', async () => {
  const h = harness(); await h.sync.refresh(); const before = h.publications[0];
  h.update(['甲', '乙']); h.fail([`/Worlds/content/worlds/${encodeURIComponent('乙')}.json`]); await h.sync.refresh();
  assert.equal(h.statuses.at(-1), 'offline'); assert.equal(h.publications.length, 1); assert.equal(h.publications[0], before);
  assert.ok(!before[0].markdown.includes('新增段落'));
  h.fail([]); await h.sync.refresh();
  assert.equal(h.statuses.at(-1), 'ready'); assert.equal(h.publications.length, 2); assert.ok(h.publications[1].every(world => world.markdown.includes('新增段落')));
});

test('manifest network failure and malformed index preserve good content; manual refresh recovers', async () => {
  const h = harness(); await h.sync.refresh(); h.fail(['/Worlds/content/manifest.json']); await h.sync.refresh();
  assert.equal(h.publications.length, 1); assert.equal(h.statuses.at(-1), 'offline');
  h.fail([]); h.malformed(true); await h.sync.refresh(); assert.equal(h.publications.length, 1); assert.equal(h.statuses.at(-1), 'offline');
  h.malformed(false); await h.sync.refresh(); assert.equal(h.statuses.at(-1), 'ready'); assert.equal(h.publications.length, 1);
});

test('stale CDN source revision cannot commit and does not create a busy retry loop', async () => {
  const h = harness(); await h.sync.refresh(); h.update(['乙']); h.mismatch(true); const start = h.requests.length; await h.sync.refresh();
  assert.equal(h.publications.length, 1); assert.equal(h.requests.length - start, 2); assert.equal(h.statuses.at(-1), 'offline');
  h.mismatch(false); await h.sync.refresh(); assert.equal(h.publications.length, 2);
});

test('concurrent refreshes serialize and coalesce into one trailing check', async () => {
  const h = harness(); let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; }); h.gate(() => gate);
  const pending = h.sync.refresh(); for (let i = 0; i < 10; i++) void h.sync.refresh();
  assert.equal(h.requests.length, 1); h.gate(); release(); await pending;
  assert.equal(h.requests.filter(item => item.url.pathname.endsWith('/manifest.json')).length, 2);
  assert.equal(h.publications.length, 1);
});

test('unmounted sync cannot publish a delayed response or schedule another check', async () => {
  const h = harness(); let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); h.gate(() => gate);
  const pending = h.sync.refresh(); h.controller.abort(); release(); await pending;
  assert.equal(h.publications.length, 0); const count = h.requests.length; await h.sync.refresh(); assert.equal(h.requests.length, count);
});

test('world removal replaces the index atomically without reloading surviving world', async () => {
  const h = harness(); await h.sync.refresh(); const before = h.publications[0][0]; h.remove('乙'); await h.sync.refresh();
  assert.equal(h.publications[1].length, 1); assert.equal(h.publications[1][0], before); assert.equal(h.parses, 2);
});

test('新书与增删改章节原子同步；失败保留旧目录，恢复后搜索和目录一起更新', async () => {
  const h = harness(); await h.sync.refresh(); const before = h.publications[0];
  h.add('新书');
  h.rewrite('乙', '# 乙\n\n## 改名章\n修改后的正文。\n\n## 新增章\n### 新节\n新增人物。\n');
  h.fail([`/Worlds/content/worlds/${encodeURIComponent('新书')}.json`]);
  await h.sync.refresh();
  assert.equal(h.publications.length, 1);
  assert.deepEqual(before[1].chapters.map(chapter => chapter.title), ['开篇', '章节']);
  h.fail([]); await h.sync.refresh();
  const after = h.publications.at(-1)!;
  assert.deepEqual(after.map(world => world.id), ['甲', '乙', '新书']);
  assert.equal(after[0], before[0]);
  assert.deepEqual(after[1].chapters.map(chapter => chapter.title), ['开篇', '改名章', '新增章']);
  assert.equal(after[1].chapters.at(-1)!.sections.at(-1)!.title, '新节');
  assert.equal(searchWorlds(after, '新增人物')[0].chapterTitle, '新增章');
  h.rewrite('乙', '# 乙\n\n## 保留章\n最终正文。\n');
  h.remove('新书'); await h.sync.refresh();
  assert.deepEqual(h.publications.at(-1)!.map(world => world.id), ['甲', '乙']);
  assert.deepEqual(h.publications.at(-1)![1].chapters.map(chapter => chapter.title), ['开篇', '保留章']);
  assert.deepEqual(searchWorlds(h.publications.at(-1)!, '新增人物'), []);
});

test('local mode retains its API, explicit disk reconciliation and five-second cadence', async () => {
  const h = harness('local'); await h.sync.refresh();
  assert.equal(h.publications.length, 1); assert.equal(h.requests[0].url.searchParams.get('refresh'), '1');
  assert.ok(h.requests.every(item => item.url.pathname.startsWith('/api/')));
  assert.equal(syncInterval('local'), 5000); assert.equal(syncInterval('online'), 30000);
});

test('content URL resolution supports root/Pages bases and rejects escape or external sources', () => {
  assert.equal(contentUrl('content/worlds/中文.json?v=rev', 'https://example.test/Worlds/'), 'https://example.test/Worlds/content/worlds/%E4%B8%AD%E6%96%87.json?v=rev');
  assert.equal(contentUrl('content/manifest.json', 'http://127.0.0.1:4176/'), 'http://127.0.0.1:4176/content/manifest.json');
  assert.throws(() => contentUrl('../README.md', 'https://example.test/Worlds/'));
  assert.throws(() => contentUrl('https://other.test/content.json', 'https://example.test/Worlds/'));
});
