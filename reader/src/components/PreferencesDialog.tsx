import type { Preferences } from '../types';
import { Dialog } from './Dialog';
import { Icon } from './Icon';

export function PreferencesDialog({ preferences, onChange, onClose }: { preferences: Preferences; onChange: (value: Preferences) => void; onClose: () => void }) {
  return <Dialog title="阅读设置" className="preferences-dialog" onClose={onClose}>
    <div className="dialog-title"><h2>阅读设置</h2><button className="icon-button" aria-label="关闭阅读设置" onClick={onClose}><Icon name="close" /></button></div>
    <label className="preference-row"><span>字号</span><output>{preferences.fontSize}px</output><input type="range" aria-label="字号" min="16" max="32" step="1" value={preferences.fontSize} onChange={event => onChange({ ...preferences, fontSize: Number(event.target.value) })} /></label>
    <label className="preference-row"><span>行距</span><output>{preferences.lineHeight.toFixed(2)}</output><input type="range" aria-label="行距" min="1.5" max="2.3" step="0.05" value={preferences.lineHeight} onChange={event => onChange({ ...preferences, lineHeight: Number(event.target.value) })} /></label>
    <div className="preference-row"><span>字体</span><div className="segmented"><button aria-pressed={preferences.font === 'serif'} onClick={() => onChange({ ...preferences, font: 'serif' })}>宋体</button><button aria-pressed={preferences.font === 'sans'} onClick={() => onChange({ ...preferences, font: 'sans' })}>无衬线</button></div></div>
  </Dialog>;
}
