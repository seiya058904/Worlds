import { useDeferredValue, useMemo, useState } from 'react';
import { searchWorlds } from '../content';
import type { ParsedWorld, SearchHit } from '../types';
import { Dialog } from './Dialog';
import { Icon } from './Icon';

function Snippet({ text, query }: { text: string; query: string }) {
  const start = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  return start < 0 ? text : <>{text.slice(0, start)}<mark>{text.slice(start, start + query.length)}</mark>{text.slice(start + query.length)}</>;
}
export function SearchDialog({ worlds, onClose, onChoose }: { worlds: ParsedWorld[]; onClose: () => void; onChoose: (hit: SearchHit) => void }) {
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query.trim());
  const hits = useMemo(() => searchWorlds(worlds, deferred), [worlds, deferred]);
  return <Dialog title="搜索所有世界" className="search-dialog" onClose={onClose}>
    <div className="search-heading"><Icon name="search" /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索所有世界" aria-label="搜索正文与章节" /><button className="icon-button" aria-label="关闭搜索" onClick={onClose}><Icon name="close" /></button></div>
    <div className="search-results" aria-live="polite">
      {!deferred ? <p className="empty-message">搜索人物、地点、设定或章节名称。</p> : !hits.length ? <p className="empty-message">没有找到“{deferred}”，试试其他关键词。</p> : <><p className="result-count">{hits.length >= 100 ? '显示前 100 条结果' : `${hits.length} 条结果`}</p>{hits.map((hit, index) => <button className="search-result" key={`${hit.worldId}:${hit.chapterId}:${index}`} onClick={() => { onChoose(hit); onClose(); }}><span className="result-path">{hit.worldTitle}<span> / </span>{hit.chapterTitle}</span><span className="result-snippet"><Snippet text={hit.snippet} query={deferred} /></span><Icon name="next" size={18} /></button>)}</>}
    </div>
  </Dialog>;
}
