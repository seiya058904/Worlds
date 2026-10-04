import type { ParsedWorld } from '../types';
import type { SyncStatus } from '../useWorlds';
import { Icon } from './Icon';
import { SyncIndicator } from './SyncIndicator';

const numerals = ['零', '一', '两', '三', '四', '五', '六', '七', '八', '九', '十'];
export function Library({ worlds, status, onOpen, onSearch }: { worlds: ParsedWorld[]; status: SyncStatus; onOpen: (id: string) => void; onSearch: () => void }) {
  return <div className="library">
    <header className="app-toolbar library-toolbar"><span className="brand">Worlds</span><button className="icon-button" aria-label="搜索所有世界" onClick={onSearch}><Icon name="search" size={25} /></button></header>
    <main className="library-content">
      <h1>藏书</h1><p className="library-intro">{worlds.length ? `${numerals[worlds.length] ?? worlds.length}个世界，随时翻阅。` : status === 'loading' ? '正在打开你的世界。' : '将世界文档放入 worlds 文件夹，即可在这里阅读。'}</p>
      <div className="bookshelf">
        {worlds.map(world => <button className="book" key={world.id} onClick={() => onOpen(world.id)} aria-label={`阅读${world.label}`}>
          <div className={`book-cover ${world.id === '西幻世界' ? 'fantasy' : world.id === '星星联邦' ? 'stellar' : world.id === '宋世江湖' ? 'jianghu' : 'human'} ${world.maps.length ? 'has-map' : 'type-cover'}`}>
            <span className={`cover-title ${world.id === '人界' ? 'vertical-title' : ''}`}>{world.label}</span>
            {world.maps.length > 0 ? <img className="cover-map" src={world.maps[0].url} alt={world.maps[0].alt} draggable={false} /> : null}
          </div>
          <span className="book-title">{world.label}</span><span className={`book-status ${world.status === '持续迭代' ? 'iterating' : ''}`}>{world.status}</span>
        </button>)}
      </div>
    </main>
    <footer className="library-footer"><SyncIndicator status={status} library /></footer>
  </div>;
}
