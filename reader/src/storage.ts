import type { Preferences, ReadingPosition } from './types';

const STORAGE_KEY = 'worlds-reader:v1';
type Saved = { positions: Record<string, ReadingPosition>; preferences: Preferences };
const defaults: Preferences = { fontSize: 28, lineHeight: 1.95, font: 'serif' };
let memory: Saved | undefined;
function read(): Saved {
  if (memory) return memory;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    const preferences = localStorage.getItem(`${STORAGE_KEY}:preferences`);
    if (preferences !== null) saved.preferences = JSON.parse(preferences);
    memory = { positions: saved.positions && typeof saved.positions === 'object' ? saved.positions : {}, preferences: { fontSize: Math.max(16, Math.min(32, Number(saved.preferences?.fontSize) || defaults.fontSize)), lineHeight: Math.max(1.5, Math.min(2.3, Number(saved.preferences?.lineHeight) || defaults.lineHeight)), font: saved.preferences?.font === 'sans' ? 'sans' : 'serif' } };
  } catch { memory = { positions: {}, preferences: defaults }; }
  return memory;
}
export function getPosition(id: string): ReadingPosition | undefined {
  let value = read().positions[id];
  try { const raw = localStorage.getItem(`${STORAGE_KEY}:position:${id}`); if (raw !== null) value = JSON.parse(raw); } catch { /* Keep the in-memory/legacy position. */ }
  if (!value || typeof value.chapterId !== 'string' || typeof value.sectionId !== 'string' || typeof value.paragraph !== 'string' || !Number.isFinite(value.chapterIndex) || !Number.isFinite(value.offset) || !Number.isFinite(value.ratio)) return undefined;
  return { ...value, chapterIndex: Math.max(0, Math.floor(value.chapterIndex)), ratio: Math.max(0, Math.min(1, value.ratio)) };
}
export function savePosition(id: string, position: ReadingPosition) { read().positions[id] = position; try { localStorage.setItem(`${STORAGE_KEY}:position:${id}`, JSON.stringify(position)); } catch { /* Keep reading in memory. */ } }
export function getPreferences() { return read().preferences; }
export function savePreferences(preferences: Preferences) { read().preferences = preferences; try { localStorage.setItem(`${STORAGE_KEY}:preferences`, JSON.stringify(preferences)); } catch { /* Keep preferences in memory. */ } }
