import type { SyncStatus } from '../sync';
import type { SourceMode } from '../types';
const labels = { loading: '读取中', syncing: '同步中', ready: '已同步', offline: '离线 · 正在重连' };
export function SyncIndicator({ status, library = false, mode }: { status: SyncStatus; library?: boolean; mode: SourceMode }) {
  return <div className={`sync-indicator ${status}`} role="status"><span className="sync-dot" />{status === 'ready' ? mode === 'online' ? '线上内容已同步' : library ? '本地文档已同步' : '已同步' : labels[status]}</div>;
}
