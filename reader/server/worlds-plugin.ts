import { realpath } from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';
import { digest, IMAGE_TYPES, manifestFor, readSnapshot, type Snapshot } from './worlds-snapshot.ts';

/** Only this directory's Markdown and explicitly referenced raster images are readable. */
export function worldsPlugin(directory: string): Plugin {
  let root: string;
  let identity = '';
  let snapshot: Snapshot;
  let scanPromise: Promise<Snapshot> | undefined;
  let generation = 0;
  let scannedGeneration = -1;
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let server: ViteDevServer;
  let readError = false;

  async function scan(): Promise<Snapshot> {
    if (!scanPromise) {
      scanPromise = (async () => {
        let next: Snapshot;
        do {
          const currentGeneration = generation;
          next = await readSnapshot(root);
          scannedGeneration = currentGeneration;
        } while (!closed && scannedGeneration !== generation);
        return next;
      })();
    }
    const pending = scanPromise;
    try { return await pending; } finally { if (scanPromise === pending) scanPromise = undefined; }
  }

  async function refresh(invalidate = false) {
    if (closed) return;
    if (invalidate) generation++;
    try {
      const next = await scan();
      if (closed) return;
      const changed = next.revision !== snapshot.revision || readError;
      snapshot = next;
      readError = false;
      if (changed) server.ws.send({ type: 'custom', event: 'worlds:changed', data: { revision: snapshot.revision } });
    } catch {
      if (closed) return;
      readError = true;
      server.ws.send({ type: 'custom', event: 'worlds:unavailable', data: {} });
    }
  }

  async function respond(req: IncomingMessage, res: ServerResponse, next: () => void) {
    if (!req.url?.startsWith('/api/')) return next();
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const json = (code: number, value: unknown) => {
      res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(value));
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(405, { error: '此阅读器仅支持读取。' });
    const origin = req.headers.origin;
    if (origin && origin !== `http://${req.headers.host}`) return json(403, { error: '仅允许本机阅读器访问。' });
    let url: URL;
    try { url = new URL(req.url, 'http://127.0.0.1'); } catch { return json(400, { error: '地址无效。' }); }
    const { pathname } = url;
    // Reopening the launcher reconciles directly with disk, even if a file event was missed.
    if (pathname === '/api/worlds' && url.searchParams.get('refresh') === '1') await refresh(true);
    if (readError) return json(503, { error: '暂时无法读取本地文档，稍后重试。' });
    if (pathname === '/api/worlds') {
      return json(200, { ...manifestFor(snapshot, 'local'), identity });
    }
    if (pathname.startsWith('/api/worlds/')) {
      let id: string;
      try { id = decodeURIComponent(pathname.slice('/api/worlds/'.length)); } catch { return json(400, { error: '地址无效。' }); }
      const world = snapshot.worlds.find(world => world.id === id);
      return world ? json(200, world) : json(404, { error: '这份文档已移走或不存在。' });
    }
    if (pathname.startsWith('/api/assets/')) {
      let name: string;
      try { name = decodeURIComponent(pathname.slice('/api/assets/'.length)); } catch { return json(400, { error: '地址无效。' }); }
      const asset = snapshot.assets.get(name);
      if (!asset) return json(404, { error: '图片不存在或未被文档引用。' });
      res.writeHead(200, { 'Content-Type': asset.type, 'Content-Length': asset.bytes.length });
      return res.end(req.method === 'HEAD' ? undefined : asset.bytes);
    }
    return json(404, { error: '地址不存在。' });
  }

  return {
    name: 'worlds-local-documents',
    async configureServer(vite) {
      server = vite;
      root = await realpath(directory);
      identity = digest(root);
      snapshot = await scan();
      server.middlewares.use(respond);
      server.watcher.add(root);
      const onChange = (_event: string, file: string) => {
        if (path.dirname(path.resolve(file)) !== root) return;
        if (!file.endsWith('.md') && !IMAGE_TYPES[path.extname(file).toLowerCase()]) return;
        generation++;
        clearTimeout(timer);
        timer = setTimeout(() => { if (scannedGeneration !== generation) void refresh(); }, 220);
      };
      server.watcher.on('all', onChange);
      // Retry transient read errors (for example an editor's atomic save).
      const retry = setInterval(() => { if (readError) void refresh(true); }, 2000);
      server.httpServer?.once('close', () => {
        closed = true;
        clearInterval(retry);
        clearTimeout(timer);
        server.watcher.off('all', onChange);
      });
    },
    handleHotUpdate(context) {
      if (path.dirname(context.file) === root) return [];
    },
  };
}
