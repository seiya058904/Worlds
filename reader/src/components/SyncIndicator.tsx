import type { SyncStatus } from '../useWorlds';
const labels = { loading: '读取中', syncing: '同步中', ready: '已同步', offline: '离线 · 正在重连' };
export function SyncIndicator({ status, library = false }: { status: SyncStatus; library?: boolean }) {
  return <div className={`sync-indicator ${status}`} role="status"><span className="sync-dot" />{library && status === 'ready' ? '本地文档已同步' : labels[status]}</div>;
}
