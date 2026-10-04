import { useEffect, useRef, useState } from 'react';
import { parseWorld } from './content';
import type { ParsedWorld, WorldInfo, WorldSource } from './types';

export type SyncStatus = 'loading' | 'syncing' | 'ready' | 'offline';
export function useWorlds() {
  const [worlds, setWorlds] = useState<ParsedWorld[]>([]);
  const [status, setStatus] = useState<SyncStatus>('loading');
  const [error, setError] = useState('');
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    let active = true;
    let inFlight = false;
    let queued = false;
    let revision = '';
    let cache = new Map<string, ParsedWorld>();
    const controller = new AbortController();
    async function refresh() {
      if (inFlight) { queued = true; return; }
      inFlight = true;
      try {
        const response = await fetch('/api/worlds', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('暂时无法读取本地文档。');
        const manifest: { revision: string; worlds: WorldInfo[] } = await response.json();
        if (manifest.revision !== revision) {
          if (active) setStatus(revision ? 'syncing' : 'loading');
          const next = await Promise.all(manifest.worlds.map(async info => {
            const existing = cache.get(info.id);
            if (existing?.revision === info.revision) return existing;
            const sourceResponse = await fetch(`/api/worlds/${encodeURIComponent(info.id)}`, { cache: 'no-store', signal: controller.signal });
            if (!sourceResponse.ok) throw new Error('文档正在保存，稍后重试。');
            const source: WorldSource = await sourceResponse.json();
            if (source.revision !== info.revision) { queued = true; throw new Error('文档正在更新。'); }
            return parseWorld(source);
          }));
          if (!active) return;
          cache = new Map(next.map(world => [world.id, world]));
          revision = manifest.revision;
          setWorlds(next);
        }
        if (active) { setStatus('ready'); setError(''); }
      } catch (reason) {
        if (active) { setStatus('offline'); setError(reason instanceof Error ? reason.message : '连接已中断，正在尝试重新同步。'); }
      } finally {
        inFlight = false;
        if (queued && active) { queued = false; void refresh(); }
      }
    }
    refreshRef.current = refresh;
    const offline = () => { if (active) setStatus('offline'); };
    const reconnect = () => void refresh();
    void refresh();
    // Also reconcile on focus / periodically, so a missed socket event cannot leave stale content.
    const interval = setInterval(refresh, 5000);
    window.addEventListener('focus', reconnect);
    import.meta.hot?.on('worlds:changed', reconnect);
    import.meta.hot?.on('worlds:unavailable', offline);
    import.meta.hot?.on('vite:ws:disconnect', offline);
    import.meta.hot?.on('vite:ws:connect', reconnect);
    return () => {
      active = false; controller.abort(); clearInterval(interval);
      window.removeEventListener('focus', reconnect);
      import.meta.hot?.off('worlds:changed', reconnect);
      import.meta.hot?.off('worlds:unavailable', offline);
      import.meta.hot?.off('vite:ws:disconnect', offline);
      import.meta.hot?.off('vite:ws:connect', reconnect);
    };
  }, []);
  return { worlds, status, error, refresh: () => refreshRef.current() };
}
