import type { Plugin } from 'vite';
import { manifestFor, readSnapshot } from './worlds-snapshot.ts';

/** Build output only: no generated content or second source is maintained in Git. */
export function staticContentPlugin(directory: string): Plugin {
  return {
    name: 'worlds-static-content',
    apply: 'build',
    async generateBundle() {
      const snapshot = await readSnapshot(directory, 'online');
      this.emitFile({ type: 'asset', fileName: 'content/manifest.json', source: JSON.stringify(manifestFor(snapshot, 'online')) });
      for (const world of snapshot.worlds) {
        this.emitFile({ type: 'asset', fileName: `content/worlds/${world.id}.json`, source: JSON.stringify(world) });
      }
      for (const [name, asset] of snapshot.assets) {
        this.emitFile({ type: 'asset', fileName: `content/assets/${name}`, source: asset.bytes });
      }
    },
  };
}
