import { createHash } from 'node:crypto';
import { readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';
import type { RootContent } from 'mdast';
import type { Plugin, ViteDevServer } from 'vite';
import type { WorldSource } from '../src/types.ts';

const parser = unified().use(remarkParse).use(remarkGfm);
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const IMAGE_TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif' };
const ORDER = ['人界', '西幻世界', '星星联邦', '宋世江湖'];
type Snapshot = { revision: string; worlds: WorldSource[]; assets: Map<string, { bytes: Buffer; type: string; revision: string }> };

/** Only this directory's Markdown and explicitly referenced raster images are readable. */
export function worldsPlugin(directory: string): Plugin {
  let root: string;
  let identity = '';
  let snapshot: Snapshot;
  let scanPromise: Promise<Snapshot> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let server: ViteDevServer;
  let readError = false;

  async function scan(): Promise<Snapshot> {
    if (scanPromise) return scanPromise;
    scanPromise = (async () => {
      const assets = new Map<string, { bytes: Buffer; type: string; revision: string }>();
      const entries = await readdir(root, { withFileTypes: true });
      const worlds = await Promise.all(entries.filter(entry => entry.isFile() && !entry.name.startsWith('.') && entry.name.endsWith('.md')).map(async entry => {
        const markdown = await readFile(path.join(root, entry.name), 'utf8');
        const id = entry.name.slice(0, -3);
        const tree = parser.parse(markdown);
        const title = toString(tree.children.find(node => node.type === 'heading' && node.depth === 1) ?? { type: 'text', value: id });
        const references = new Map(tree.children.filter(node => node.type === 'definition').map(node => [node.identifier, node.url]));
        const images: { url: string; alt: string }[] = [];
        function visit(node: RootContent) {
          const url = node.type === 'image' ? node.url : node.type === 'imageReference' ? references.get(node.identifier) : undefined;
          if (url) images.push({ url, alt: 'alt' in node ? node.alt ?? '' : '' });
          if ('children' in node) node.children.forEach(child => visit(child as RootContent));
        }
        tree.children.forEach(visit);
        const maps: WorldSource['maps'] = [];
        for (const image of images) {
          let name: string;
          try { name = decodeURIComponent(image.url); } catch { continue; }
          if (name !== path.basename(name) || name.includes('\\') || name.includes(':') || !IMAGE_TYPES[path.extname(name).toLowerCase()]) continue;
          try {
            const resolved = await realpath(path.join(root, name));
            if (path.dirname(resolved) !== root) continue;
            let asset = assets.get(name);
            if (!asset) {
              const bytes = await readFile(resolved);
              asset = { bytes, type: IMAGE_TYPES[path.extname(name).toLowerCase()], revision: digest(bytes) };
              assets.set(name, asset);
            }
            maps.push({ url: `/api/assets/${encodeURIComponent(name)}?v=${asset.revision}`, alt: image.alt });
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          }
        }
        return { id, title, label: id, status: id === '宋世江湖' ? '持续迭代' as const : '典藏' as const, markdown, maps, revision: digest(markdown + JSON.stringify(maps)) };
      }));
      worlds.sort((a, b) => {
        const ai = ORDER.indexOf(a.id), bi = ORDER.indexOf(b.id);
        return (ai < 0 ? ORDER.length : ai) - (bi < 0 ? ORDER.length : bi) || a.id.localeCompare(b.id, 'zh-CN');
      });
      return { worlds, assets, revision: digest(worlds.map(world => `${world.id}:${world.revision}`).join('\n')) };
    })();
    try { return await scanPromise; } finally { scanPromise = undefined; }
  }

  async function refresh() {
    try {
      const next = await scan();
      const changed = next.revision !== snapshot.revision || readError;
      snapshot = next;
      readError = false;
      if (changed) server.ws.send({ type: 'custom', event: 'worlds:changed', data: { revision: snapshot.revision } });
    } catch {
      readError = true;
      server.ws.send({ type: 'custom', event: 'worlds:unavailable', data: {} });
    }
  }

  function respond(req: IncomingMessage, res: ServerResponse, next: () => void) {
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
    if (readError) return json(503, { error: '暂时无法读取本地文档，稍后重试。' });
    let pathname: string;
    try { pathname = new URL(req.url, 'http://127.0.0.1').pathname; } catch { return json(400, { error: '地址无效。' }); }
    if (pathname === '/api/worlds') {
      return json(200, { app: 'worlds-reader', identity, revision: snapshot.revision, worlds: snapshot.worlds.map(({ markdown: _markdown, ...info }) => info) });
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
        clearTimeout(timer);
        timer = setTimeout(refresh, 220);
      };
      server.watcher.on('all', onChange);
      // Retry transient read errors (for example an editor's atomic save).
      const retry = setInterval(() => { if (readError) void refresh(); }, 2000);
      server.httpServer?.once('close', () => {
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
