import { useEffect, useRef, useState } from 'react';
import { createWorldSync, syncInterval, type SyncStatus } from './sync';
import type { ParsedWorld, SourceMode } from './types';

export type { SyncStatus } from './sync';
export const sourceMode: SourceMode = import.meta.env.DEV ? 'local' : 'online';
export function useWorlds() {
  const [worlds, setWorlds] = useState<ParsedWorld[]>([]);
  const [status, setStatus] = useState<SyncStatus>('loading');
  const [error, setError] = useState('');
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    const controller = new AbortController();
    const sync = createWorldSync({
      mode: sourceMode,
      baseUrl: new URL(import.meta.env.BASE_URL, document.baseURI).href,
      signal: controller.signal,
      publish(next) {
        // Flush the old DOM's reading position before React replaces any content.
        window.dispatchEvent(new Event('worlds:before-update'));
        setWorlds(next);
      },
      status(value, message = '') { setStatus(value); setError(message); },
    });
    refreshRef.current = () => { void sync.refresh(); };
    const offline = () => setStatus('offline');
    const reconnect = () => { void sync.refresh(); };
    const visible = () => { if (document.visibilityState === 'visible') reconnect(); };
    reconnect();
    const interval = setInterval(reconnect, syncInterval(sourceMode));
    window.addEventListener('focus', reconnect);
    window.addEventListener('online', reconnect);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', visible);
    import.meta.hot?.on('worlds:changed', reconnect);
    import.meta.hot?.on('worlds:unavailable', offline);
    import.meta.hot?.on('vite:ws:disconnect', offline);
    import.meta.hot?.on('vite:ws:connect', reconnect);
    return () => {
      controller.abort(); clearInterval(interval);
      window.removeEventListener('focus', reconnect);
      window.removeEventListener('online', reconnect);
      window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', visible);
      import.meta.hot?.off('worlds:changed', reconnect);
      import.meta.hot?.off('worlds:unavailable', offline);
      import.meta.hot?.off('vite:ws:disconnect', offline);
      import.meta.hot?.off('vite:ws:connect', reconnect);
    };
  }, []);
  return { worlds, status, error, mode: sourceMode, refresh: () => refreshRef.current() };
}
