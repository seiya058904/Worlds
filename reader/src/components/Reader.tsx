import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { Chapter, ParsedWorld, Preferences, ReadingPosition } from '../types';
import type { SyncStatus } from '../useWorlds';
import { getPosition, getPreferences, savePosition, savePreferences } from '../storage';
import { Icon } from './Icon';
import { Sidebar } from './Sidebar';
import { MarkdownBody } from './MarkdownBody';
import { PreferencesDialog } from './PreferencesDialog';
const MapViewer = lazy(() => import('./MapViewer'));

export type NavigationTarget = { chapterId?: string; sectionId?: string; sourceOffset?: number; nonce?: number; resume?: boolean };
export function Reader({ world, chapter, target, status, onLibrary, onSearch, onNavigate }: { world: ParsedWorld; chapter: Chapter; target: NavigationTarget; status: SyncStatus; onLibrary: () => void; onSearch: () => void; onNavigate: (value: NavigationTarget) => void }) {
  const viewport = useRef<HTMLElement>(null);
  const article = useRef<HTMLElement>(null);
  const [preferences, setPreferences] = useState(getPreferences);
  const [settings, setSettings] = useState(false);
  const [mobileToc, setMobileToc] = useState(false);
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 800px)').matches);
  const [hideSidebar, setHideSidebar] = useState(false);
  const [map, setMap] = useState<{ url: string; alt: string } | null>(null);
  const [activeSection, setActiveSection] = useState(chapter.sections[0]?.id ?? chapter.id);
  const [progress, setProgress] = useState(0);
  const currentPosition = useRef<ReadingPosition | undefined>(undefined);
  const restoring = useRef(false);
  const scrollFrame = useRef(0);
  const lastSaved = useRef(0);
  const identity = useRef({ worldId: world.id, chapterId: chapter.id });
  const handledTarget = useRef(-1);

  const capture = useCallback((persist = true) => {
    const scroller = viewport.current, body = article.current;
    if (!scroller || !body || restoring.current) return;
    const top = scroller.getBoundingClientRect().top + 32;
    const headings = [...body.querySelectorAll<HTMLElement>('[data-section]')];
    let sectionId = chapter.sections[0]?.id ?? chapter.id;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top > top) break;
      sectionId = heading.dataset.section!;
    }
    const blocks = [...body.querySelectorAll<HTMLElement>('[data-read-block]')];
    let block = blocks[0];
    for (const item of blocks) {
      if (item.getBoundingClientRect().top > top) break;
      block = item;
    }
    const ratio = scroller.scrollHeight > scroller.clientHeight ? scroller.scrollTop / (scroller.scrollHeight - scroller.clientHeight) : 1;
    currentPosition.current = { chapterId: chapter.id, chapterIndex: chapter.index, sectionId, paragraph: block?.textContent?.replace(/\s+/g, ' ').slice(0, 140) ?? '', offset: block ? scroller.getBoundingClientRect().top - block.getBoundingClientRect().top : 0, ratio };
    setActiveSection(sectionId);
    setProgress(ratio);
    if (persist) savePosition(world.id, currentPosition.current);
  }, [world.id, chapter]);

  useLayoutEffect(() => {
    const scroller = viewport.current, body = article.current;
    if (!scroller || !body) return;
    restoring.current = true;
    const sameChapter = identity.current.worldId === world.id && identity.current.chapterId === chapter.id;
    identity.current = { worldId: world.id, chapterId: chapter.id };
    const isNewTarget = target.nonce !== undefined && target.nonce !== handledTarget.current;
    if (isNewTarget) handledTarget.current = target.nonce!;
    const saved = sameChapter ? currentPosition.current ?? getPosition(world.id) : getPosition(world.id);
    let element: HTMLElement | null = null;
    let offset = 0;
    const explicitTarget = isNewTarget && !target.resume;
    if (explicitTarget && target.sourceOffset !== undefined) {
      const nodes = [...body.querySelectorAll<HTMLElement>('[data-source-offset]')];
      element = nodes.find(node => Number(node.dataset.sourceOffset) === target.sourceOffset) ?? null;
    } else if (explicitTarget && target.sectionId) element = document.getElementById(target.sectionId);
    else if (!explicitTarget && saved?.chapterId === chapter.id) {
      element = [...body.querySelectorAll<HTMLElement>('[data-read-block]')].find(node => node.textContent?.replace(/\s+/g, ' ').slice(0, 140) === saved.paragraph) ?? document.getElementById(saved.sectionId);
      offset = saved.offset;
    }
    if (element) scroller.scrollTop += element.getBoundingClientRect().top - scroller.getBoundingClientRect().top + offset;
    else scroller.scrollTop = !explicitTarget && saved?.chapterId === chapter.id ? saved.ratio * Math.max(0, scroller.scrollHeight - scroller.clientHeight) : 0;
    const frame = requestAnimationFrame(() => { restoring.current = false; capture(); });
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(scrollFrame.current); };
  }, [world.revision, world.id, chapter, target.nonce, preferences, capture]);

  useEffect(() => {
    const flush = () => { if (currentPosition.current) savePosition(world.id, currentPosition.current); };
    window.addEventListener('pagehide', flush);
    return () => { flush(); window.removeEventListener('pagehide', flush); };
  }, [world.id]);

  useEffect(() => {
    setMap(current => current ? world.maps.find(image => image.url.split('?')[0] === current.url.split('?')[0]) ?? null : null);
  }, [world.revision, world.maps]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 800px)');
    const changed = () => { setNarrow(media.matches); setMobileToc(false); };
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);

  function updatePreferences(value: Preferences) { capture(); savePreferences(value); setPreferences(value); }
  function choose(value: NavigationTarget) { capture(); setMobileToc(false); onNavigate(value); }
  const anchor = useCallback((chapterId: string, sectionId: string) => {
    capture(); setMobileToc(false); onNavigate({ chapterId, sectionId });
  }, [capture, onNavigate]);
  const chapterBefore = world.chapters[chapter.index - 1], chapterAfter = world.chapters[chapter.index + 1];
  return <div className={`reader-shell ${hideSidebar ? 'focus-reading' : ''}`}>
    <header className="app-toolbar reader-toolbar"><button className="back-library" onClick={() => { capture(); onLibrary(); }}><Icon name="back" /><span>藏书</span></button><span className="toolbar-world">{world.label}</span><div className="toolbar-actions"><button className="icon-button" aria-label="搜索所有世界" onClick={onSearch}><Icon name="search" size={25} /></button><button className="icon-button type-button" aria-label="阅读设置" onClick={() => setSettings(true)}>Aa</button><button className="icon-button" aria-label="显示或隐藏目录" aria-expanded={narrow ? mobileToc : !hideSidebar} onClick={() => {
      if (narrow) setMobileToc(value => !value);
      else { capture(); setHideSidebar(value => !value); }
    }}><Icon name="panel" size={25} /></button></div></header>
    <Sidebar key={world.id} world={world} chapter={chapter} activeSection={activeSection} status={status} onChoose={(chapterId, sectionId) => choose({ chapterId, sectionId })} onClose={() => setMobileToc(false)} mobile={mobileToc} hidden={hideSidebar} />
    <main className="reading-scroll" ref={viewport} tabIndex={-1} onScroll={() => {
      cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = requestAnimationFrame(() => {
        const now = Date.now(); capture(now - lastSaved.current > 250);
        if (now - lastSaved.current > 250) lastSaved.current = now;
      });
    }}><article ref={article} className={`reading-body ${preferences.font === 'sans' ? 'sans-body' : ''}`} style={{ '--reader-size': `${preferences.fontSize}px`, '--reader-leading': preferences.lineHeight } as CSSProperties}><MarkdownBody world={world} chapter={chapter} onMap={setMap} onAnchor={anchor} /></article></main>
    <footer className="reading-footer"><span className="footer-chapter" title={chapter.title}>{chapter.title}</span><div className="chapter-progress"><input aria-label="本章阅读进度" type="range" min="0" max="1000" value={Math.round(progress * 1000)} onChange={event => { const scroller = viewport.current; if (scroller) scroller.scrollTop = Number(event.target.value) / 1000 * (scroller.scrollHeight - scroller.clientHeight); }} style={{ '--progress': `${progress * 100}%` } as CSSProperties} /></div><div className="chapter-navigation"><button className="previous-chapter icon-button" aria-label="上一章" disabled={!chapterBefore} onClick={() => choose({ chapterId: chapterBefore.id })}><Icon name="back" size={19} /></button><button className="next-chapter" disabled={!chapterAfter} onClick={() => { if (chapterAfter) choose({ chapterId: chapterAfter.id }); }}>{chapterAfter ? <><span>下一章<span className="next-title"> · {chapterAfter.title}</span></span><Icon name="next" size={20} /></> : <span>已读至本书末尾</span>}</button></div></footer>
    {settings ? <PreferencesDialog preferences={preferences} onChange={updatePreferences} onClose={() => setSettings(false)} /> : null}
    {map ? <Suspense fallback={<div className="map-loading" role="status">正在打开地图…</div>}><MapViewer image={map} onClose={() => setMap(null)} /></Suspense> : null}
  </div>;
}
