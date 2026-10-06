import { parseWorld } from './content';
import type { ParsedWorld, SourceMode, WorldSource, WorldsManifest } from './types';

export type SyncStatus = 'loading' | 'syncing' | 'ready' | 'offline';
export const syncInterval = (mode: SourceMode) => mode === 'online' ? 30000 : 5000;

/** Resolve against the app base, never the JSON document's directory or a root path. */
export function contentUrl(relative: string, baseUrl: string) {
  const base = new URL(baseUrl);
  const url = new URL(relative, base);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw new Error('内容地址超出阅读器范围。');
  return url.href;
}

export function createWorldSync({ mode, baseUrl, signal, publish, status, fetcher = fetch, parse = parseWorld }: {
  mode: SourceMode; baseUrl: string; signal: AbortSignal;
  publish: (worlds: ParsedWorld[]) => void;
  status: (value: SyncStatus, error?: string) => void;
  fetcher?: typeof fetch; parse?: typeof parseWorld;
}) {
  let revision = '';
  let cache = new Map<string, ParsedWorld>();
  let pending: Promise<void> | undefined;
  let queued = false;
  let request = 0;
  async function check() {
    try {
      const address = mode === 'online' ? contentUrl('content/manifest.json', baseUrl) : contentUrl('/api/worlds?refresh=1', baseUrl);
      const url = new URL(address);
      url.searchParams.set('_sync', `${Date.now()}-${++request}`);
      const response = await fetcher(url.href, { cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
      if (!response.ok) throw new Error(mode === 'local' ? '暂时无法读取本地文档。' : '暂时无法连接线上内容，正在重试。');
      const manifest: WorldsManifest = await response.json();
      if (manifest.app !== 'worlds-reader' || manifest.mode !== mode || !manifest.revision || typeof manifest.revision !== 'string' || !Array.isArray(manifest.worlds) || manifest.worlds.some(info => !info || typeof info.id !== 'string' || !info.id || typeof info.revision !== 'string' || !info.revision || typeof info.source !== 'string' || !Array.isArray(info.maps)) || new Set(manifest.worlds.map(info => info.id)).size !== manifest.worlds.length) throw new Error('内容索引无效，稍后重试。');
      if (manifest.revision !== revision) {
        if (!signal.aborted) status(revision ? 'syncing' : 'loading');
        const next = await Promise.all(manifest.worlds.map(async info => {
          const existing = cache.get(info.id);
          if (existing?.revision === info.revision) return existing;
          const sourceResponse = await fetcher(contentUrl(info.source, baseUrl), { cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
          if (!sourceResponse.ok) throw new Error('文档暂时无法加载，稍后重试。');
          const source: WorldSource = await sourceResponse.json();
          if (source.id !== info.id || source.revision !== info.revision || typeof source.markdown !== 'string' || !Array.isArray(source.maps)) throw new Error('文档正在更新，稍后重试。');
          return parse({ ...source, maps: source.maps.map(map => ({ ...map, url: contentUrl(map.url, baseUrl) })) });
        }));
        if (signal.aborted) return;
        // A partial update never mutates the last successful snapshot or its cache.
        cache = new Map(next.map(world => [world.id, world]));
        revision = manifest.revision;
        publish(next);
      }
      if (!signal.aborted) status('ready');
    } catch (reason) {
      if (!signal.aborted) status('offline', reason instanceof Error ? reason.message : '连接已中断，正在尝试重新同步。');
    }
  }
  function refresh(): Promise<void> {
    if (signal.aborted) return Promise.resolve();
    if (pending) { queued = true; return pending; }
    const running = (async () => {
      do { queued = false; await check(); } while (queued && !signal.aborted);
    })();
    pending = running;
    void running.finally(() => { if (pending === running) pending = undefined; });
    return running;
  }
  return { refresh };
}
