import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { worldsPlugin } from './server/worlds-plugin.ts';
import { staticContentPlugin } from './server/static-content.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const worlds = fileURLToPath(new URL('../worlds', import.meta.url));
export default defineConfig({
  root,
  base: './',
  plugins: [react(), worldsPlugin(worlds), staticContentPlugin(worlds)],
  server: {
    host: '127.0.0.1', port: 4175, strictPort: true,
    fs: { strict: true, allow: [root], deny: ['.env', '.env.*', '*.{crt,pem,key}', '**/.git/**'] },
  },
});
