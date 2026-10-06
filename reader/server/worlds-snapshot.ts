import { createHash } from 'node:crypto';
import { readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';
import type { RootContent } from 'mdast';
import type { SourceMode, WorldSource, WorldsManifest } from '../src/types.ts';
import { imageName } from '../src/asset-name.ts';

const parser = unified().use(remarkParse).use(remarkGfm);
export const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export const IMAGE_TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif' };
const ORDER = ['人界', '西幻世界', '星星联邦', '宋世江湖'];
export type Snapshot = { revision: string; worlds: WorldSource[]; assets: Map<string, { bytes: Buffer; type: string; revision: string }> };

/** Shared allowlist and revision calculation for the local API and static build. */
export async function readSnapshot(directory: string, mode: SourceMode = 'local'): Promise<Snapshot> {
  const root = await realpath(directory);
  const assets: Snapshot['assets'] = new Map();
  const entries = await readdir(root, { withFileTypes: true });
  const worlds = await Promise.all(entries.filter(entry => entry.isFile() && !entry.name.startsWith('.') && entry.name.endsWith('.md')).map(async entry => {
    const resolvedDocument = await realpath(path.join(root, entry.name));
    if (path.dirname(resolvedDocument) !== root) throw new Error('World document is outside worlds/.');
    const markdown = await readFile(resolvedDocument, 'utf8');
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
      const name = imageName(image.url);
      if (!name || !IMAGE_TYPES[path.extname(name).toLowerCase()]) continue;
      try {
        const resolved = await realpath(path.join(root, name));
        if (path.dirname(resolved) !== root) continue;
        let asset = assets.get(name);
        if (!asset) {
          const bytes = await readFile(resolved);
          asset = { bytes, type: IMAGE_TYPES[path.extname(name).toLowerCase()], revision: digest(bytes) };
          assets.set(name, asset);
        }
        const prefix = mode === 'local' ? '/api/assets/' : 'content/assets/';
        maps.push({ name, revision: asset.revision, url: `${prefix}${encodeURIComponent(name)}?v=${asset.revision}`, alt: image.alt });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    // Transport URLs never affect content identity. Maps are part of their world's revision.
    const revision = digest(markdown + JSON.stringify(maps.map(({ name, alt, revision }) => ({ name, alt, revision }))));
    return { id, title, label: id, status: id === '宋世江湖' ? '持续迭代' as const : '典藏' as const, markdown, maps, revision };
  }));
  worlds.sort((a, b) => {
    const ai = ORDER.indexOf(a.id), bi = ORDER.indexOf(b.id);
    return (ai < 0 ? ORDER.length : ai) - (bi < 0 ? ORDER.length : bi) || a.id.localeCompare(b.id, 'zh-CN');
  });
  return { worlds, assets, revision: digest(worlds.map(world => `${world.id}:${world.revision}`).join('\n')) };
}

export function manifestFor(snapshot: Snapshot, mode: SourceMode): WorldsManifest {
  return { app: 'worlds-reader', mode, revision: snapshot.revision, worlds: snapshot.worlds.map(({ markdown: _markdown, ...info }) => ({
    ...info,
    source: mode === 'local' ? `/api/worlds/${encodeURIComponent(info.id)}` : `content/worlds/${encodeURIComponent(info.id)}.json?v=${info.revision}`,
  })) };
}
