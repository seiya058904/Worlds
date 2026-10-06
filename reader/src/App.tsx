import { useEffect, useRef, useState } from 'react';
import { useWorlds } from './useWorlds';
import { getPosition } from './storage';
import { restoreChapter } from './content';
import { Library } from './components/Library';
import { Reader, type NavigationTarget } from './components/Reader';
import { SearchDialog } from './components/SearchDialog';
import { Icon } from './components/Icon';

function readRoute() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return { worldId: params.get('world') ?? '', chapterId: params.get('chapter') ?? '', sectionId: params.get('section') ?? '' };
}
export default function App() {
  const { worlds, status, error, mode, refresh } = useWorlds();
  const [route, setRoute] = useState(readRoute);
  const [target, setTarget] = useState<NavigationTarget>(() => {
    const initial = readRoute();
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    return { ...initial, nonce: 0, resume: navigation?.type === 'reload' || !initial.sectionId };
  });
  const [search, setSearch] = useState(false);
  const [notice, setNotice] = useState('');
  const serial = useRef(0);
  const expectedChapter = useRef('');
  const opened = useRef(false);
  const world = worlds.find(world => world.id === route.worldId);
  const restored = world ? restoreChapter(world, getPosition(world.id)) : undefined;
  const chapter = world?.chapters.find(chapter => chapter.id === route.chapterId) ?? restored?.chapter;

  function navigate(worldId: string, value: NavigationTarget = {}) {
    const params = new URLSearchParams();
    if (worldId) params.set('world', worldId);
    if (value.chapterId) params.set('chapter', value.chapterId);
    if (value.sectionId) params.set('section', value.sectionId);
    window.history.pushState(null, '', `#${params}`);
    setRoute(readRoute());
    setTarget({ ...value, nonce: ++serial.current });
    expectedChapter.current = value.chapterId ?? '';
  }
  useEffect(() => {
    const changed = () => {
      const next = readRoute(); setRoute(next); setTarget({ ...next, nonce: ++serial.current }); expectedChapter.current = next.chapterId;
    };
    window.addEventListener('hashchange', changed); window.addEventListener('popstate', changed);
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearch(value => !value); }
    };
    window.addEventListener('keydown', shortcut);
    return () => { window.removeEventListener('hashchange', changed); window.removeEventListener('popstate', changed); window.removeEventListener('keydown', shortcut); };
  }, []);
  useEffect(() => {
    document.title = world ? `${world.label} · Worlds` : 'Worlds · 藏书';
    if (world) opened.current = true;
    if (status === 'ready' && route.worldId && !world) {
      setNotice(opened.current ? '当前文档已移走，已返回藏书。' : '找不到这份文档，已返回藏书。');
      opened.current = false; navigate('');
    }
    if (world && chapter && route.chapterId && chapter.id !== route.chapterId && expectedChapter.current !== chapter.id) {
      setNotice('原章节已移走，已定位到最近可阅读的章节。');
      expectedChapter.current = chapter.id;
      navigate(world.id, { chapterId: chapter.id, resume: true });
    }
  }, [world, chapter, route.worldId, route.chapterId, status]);
  useEffect(() => { if (!notice) return; const timeout = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(timeout); }, [notice]);

  return <>
    {world && chapter ? <Reader key={world.id} world={world} chapter={chapter} target={target} status={status} mode={mode} onLibrary={() => navigate('')} onSearch={() => setSearch(true)} onNavigate={value => navigate(world.id, value)} /> : <Library worlds={worlds} status={status} mode={mode} onOpen={id => { const selected = worlds.find(world => world.id === id)!; navigate(id, { chapterId: restoreChapter(selected, getPosition(id)).chapter.id, resume: true }); }} onSearch={() => setSearch(true)} />}
    {search ? <SearchDialog worlds={worlds} onClose={() => setSearch(false)} onChoose={hit => navigate(hit.worldId, { chapterId: hit.chapterId, sectionId: hit.sectionId, sourceOffset: hit.sourceOffset })} /> : null}
    {status === 'offline' ? <div className="connection-notice" role="status"><span>{error || '连接已中断，正在尝试重新同步。'}</span><button onClick={refresh}>重试</button></div> : null}
    {notice ? <div className="toast" role="status">{notice}<button className="icon-button" aria-label="关闭提示" onClick={() => setNotice('')}><Icon name="close" size={17} /></button></div> : null}
  </>;
}
