import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const address = 'http://127.0.0.1:4175';
const identity = createHash('sha256').update(realpathSync(new URL('../worlds', import.meta.url))).digest('hex');
const open = !process.argv.includes('--no-open');
async function openBrowser() {
  if (!open) return;
  const { execFile } = await import('node:child_process');
  if (process.platform === 'win32') execFile('rundll32.exe', ['url.dll,FileProtocolHandler', address], { windowsHide: true });
  else execFile(process.platform === 'darwin' ? 'open' : 'xdg-open', [address]);
}
try {
  let existing;
  try {
    const response = await fetch(`${address}/api/worlds?refresh=1`, { signal: AbortSignal.timeout(10000) });
    existing = response.ok ? await response.json() : { app: 'other' };
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'SyntaxError') existing = { app: 'other' };
  }
  if (existing) {
    if (existing.app !== 'worlds-reader' || existing.identity !== identity) throw new Error('4175 端口已被其他程序占用，请先关闭该程序，再打开阅读器。');
    console.log(`Worlds 已在运行，已同步最新本地文档：${address}`);
    await openBrowser();
  } else {
    const { createServer } = await import('vite');
    const server = await createServer({ configFile: fileURLToPath(new URL('./vite.config.ts', import.meta.url)), server: { open } });
    await server.listen();
    console.log(`Worlds 夜间阅读器：${address}\n保存 Markdown 后自动同步。关闭此窗口或按 Ctrl+C 可停止服务。`);
    const close = async () => { await server.close(); process.exit(0); };
    process.once('SIGINT', close);
    process.once('SIGTERM', close);
  }
} catch (error) {
  console.error(`无法启动阅读器：${error.message}`);
  process.exitCode = 1;
}
