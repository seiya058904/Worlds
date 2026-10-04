import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { worldsPlugin } from './server/worlds-plugin.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  root,
  plugins: [react(), worldsPlugin(fileURLToPath(new URL('../worlds', import.meta.url)))],
  server: {
    host: '127.0.0.1', port: 4175, strictPort: true,
    fs: { strict: true, allow: [root], deny: ['.env', '.env.*', '*.{crt,pem,key}', '**/.git/**'] },
  },
});
