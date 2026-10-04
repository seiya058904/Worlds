import { useEffect, useMemo, useRef, useState } from 'react';
import type { Chapter, ParsedWorld, Section } from '../types';
import type { SyncStatus } from '../useWorlds';
import { Icon } from './Icon';
import { SyncIndicator } from './SyncIndicator';

type TocNode = Section & { children: TocNode[] };
function sectionTree(chapter: Chapter) {
  const roots: TocNode[] = [], stack: TocNode[] = [];
  for (const section of chapter.sections.filter(section => section.depth >= 3)) {
    const item: TocNode = { ...section, children: [] };
    while (stack.length && stack.at(-1)!.depth >= item.depth) stack.pop();
    (stack.at(-1)?.children ?? roots).push(item);
    stack.push(item);
  }
  return roots;
}
function SectionRow({ node, active, onChoose, depth = 0, filter }: { node: TocNode; active: string; onChoose: (id: string) => void; depth?: number; filter: string }) {
  const [expanded, setExpanded] = useState<boolean | undefined>(undefined);
  const containsActive = active.startsWith(node.id + '/');
  const visible = Boolean(filter) || (expanded ?? containsActive);
  const selected = active === node.id || (containsActive && !visible);
  if (filter && !node.title.includes(filter) && !node.children.some(child => matches(child, filter))) return null;
  return <li><div className={`toc-row section-row ${selected ? 'active' : ''}`} style={{ paddingLeft: `${25 + depth * 15}px` }}>
    {node.children.length ? <button className={`disclosure ${visible ? 'expanded' : ''}`} aria-label={`${visible ? '折叠' : '展开'}${node.title}`} aria-expanded={visible} onClick={() => setExpanded(!visible)}><Icon name="chevron" size={15} /></button> : <span className="disclosure-spacer" />}
    <button className="toc-link" title={node.title} aria-current={selected ? 'location' : undefined} onClick={() => onChoose(node.id)}>{node.title}</button>
  </div>{visible && node.children.length > 0 ? <ul>{node.children.map(child => <SectionRow key={child.id} node={child} active={active} onChoose={onChoose} depth={depth + 1} filter={filter} />)}</ul> : null}</li>;
}
function matches(node: TocNode, query: string): boolean { return node.title.includes(query) || node.children.some(child => matches(child, query)); }

export function Sidebar({ world, chapter, activeSection, status, onChoose, onClose, mobile, hidden }: { world: ParsedWorld; chapter: Chapter; activeSection: string; status: SyncStatus; onChoose: (chapterId: string, sectionId?: string) => void; onClose: () => void; mobile: boolean; hidden: boolean }) {
  const panel = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const [query, setQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState(new Set<string>());
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => {
    const grouped = new Map<string, { title: string; chapters: Chapter[] }>();
    for (const item of world.chapters) {
      if (!grouped.has(item.groupId)) grouped.set(item.groupId, { title: item.groupTitle, chapters: [] });
      grouped.get(item.groupId)!.chapters.push(item);
    }
    return [...grouped];
  }, [world]);
  const trees = useMemo(() => new Map(world.chapters.map(item => [item.id, sectionTree(item)])), [world]);
  const filter = query.trim();
  useEffect(() => {
    const nav = panel.current?.querySelector<HTMLElement>('.toc-scroll');
    const row = nav?.querySelector<HTMLElement>('.active');
    if (!nav || !row) return;
    const bounds = nav.getBoundingClientRect(), item = row.getBoundingClientRect();
    if (item.top < bounds.top) nav.scrollTop += item.top - bounds.top - 14;
    else if (item.bottom > bounds.bottom) nav.scrollTop += item.bottom - bounds.bottom + 14;
  }, [activeSection, chapter.id, filter]);
  useEffect(() => {
    if (!mobile) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLInputElement>('input')?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const items = [...(panel.current?.querySelectorAll<HTMLElement>('button, input') ?? [])].filter(item => item.getClientRects().length);
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)!.focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('keydown', keyboard); previous?.focus(); };
  }, [mobile]);
  return <>
    {mobile ? <button className="sidebar-backdrop" aria-label="关闭目录" onClick={onClose} /> : null}
    <aside ref={panel} className={`sidebar ${mobile ? 'mobile-open' : ''} ${hidden ? 'desktop-hidden' : ''}`} role={mobile ? 'dialog' : undefined} aria-modal={mobile ? true : undefined} aria-label="章节目录">
      <div className="sidebar-heading"><h1>{world.label}</h1><button className="icon-button mobile-close" aria-label="收起目录" onClick={onClose}><Icon name="close" /></button></div>
      <label className="chapter-filter"><Icon name="search" size={19} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="查找章节" aria-label="查找章节" /></label>
      <nav className="toc-scroll">
        {groups.map(([id, group]) => {
          const items = group.chapters.filter(item => !filter || item.title.includes(filter) || item.sections.some(section => section.title.includes(filter)));
          if (!items.length) return null;
          const groupOpen = !collapsedGroups.has(id) || Boolean(filter);
          return <div className="toc-group" key={id}>
            <button className="toc-group-title" onClick={() => setCollapsedGroups(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; })} aria-expanded={groupOpen}><span className={`group-chevron ${groupOpen ? '' : 'collapsed'}`}><Icon name="chevron" size={17} /></span><span>{group.title}</span></button>
            {groupOpen ? <ul>{items.map(item => {
              const nodes = trees.get(item.id)!;
              const isCurrent = item.id === chapter.id;
              const expanded = Boolean(filter) || (expandedChapters[item.id] ?? isCurrent);
              const selected = isCurrent && (!expanded || !nodes.some(node => activeSection === node.id || activeSection.startsWith(node.id + '/')));
              return <li key={item.id}><div className={`toc-row chapter-row ${selected ? 'active' : ''}`}>
                {nodes.length ? <button className={`disclosure ${expanded ? 'expanded' : ''}`} aria-label={`${expanded ? '折叠' : '展开'}${item.title}`} aria-expanded={expanded} onClick={() => setExpandedChapters(current => ({ ...current, [item.id]: !expanded }))}><Icon name="chevron" size={16} /></button> : <span className="disclosure-spacer" />}
                <button className="toc-link" title={item.title} aria-current={selected ? 'location' : undefined} onClick={() => onChoose(item.id)}>{item.title}</button>
              </div>{nodes.length && expanded ? <ul>{nodes.map(node => <SectionRow key={node.id} node={node} active={activeSection} onChoose={sectionId => onChoose(item.id, sectionId)} filter={filter} />)}</ul> : null}</li>;
            })}</ul> : null}
          </div>;
        })}
        {filter && !world.chapters.some(item => item.title.includes(filter) || item.sections.some(section => section.title.includes(filter))) ? <p className="toc-empty">没有找到这个章节。</p> : null}
      </nav>
      <div className="sidebar-footer"><SyncIndicator status={status} /></div>
    </aside>
  </>;
}
