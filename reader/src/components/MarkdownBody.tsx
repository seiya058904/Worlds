import { memo, useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Root, Element } from 'hast';
import type { Chapter, ParsedWorld } from '../types';
import { Icon } from './Icon';
import { imageName } from '../asset-name';

function sourceAnnotations(chapter: Chapter) {
  return () => (tree: Root) => {
    function visit(node: Root | Element) {
      for (const child of node.children) {
        if (child.type !== 'element') continue;
        const offset = child.position?.start.offset;
        if (offset !== undefined) {
          child.properties['data-source-offset'] = offset;
          if (/^(p|h[1-6]|blockquote|table|ul|ol)$/.test(child.tagName)) child.properties['data-read-block'] = '';
          const section = chapter.sections.find(section => section.offset === offset);
          if (/^h[1-6]$/.test(child.tagName) && section) { child.properties.id = section.id; child.properties['data-section'] = section.id; }
        }
        visit(child);
      }
    }
    visit(tree);
  };
}

export const MarkdownBody = memo(function MarkdownBody({ world, chapter, onMap, onAnchor }: { world: ParsedWorld; chapter: Chapter; onMap: (image: { url: string; alt: string }) => void; onAnchor: (chapterId: string, sectionId: string) => void }) {
  const annotations = useMemo(() => [sourceAnnotations(chapter)], [chapter]);
  return <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={annotations} skipHtml components={{
    table: ({ node: _node, children, ...props }) => <div className="table-scroll" role="region" aria-label="设定表格" tabIndex={0}><table {...props}>{children}</table></div>,
    img: ({ src, alt }) => {
      const name = imageName(src ?? '');
      const image = name ? world.maps.find(map => map.name === name) : undefined;
      return image ? <button className="inline-map" onClick={() => onMap(image)} aria-label={`查看地图：${alt ?? image.alt}`}><img src={image.url} alt={alt ?? image.alt} draggable={false} /><span className="map-caption"><span>{alt ?? image.alt}</span><span><Icon name="expand" size={16} />全屏查看</span></span></button> : <span className="missing-image">图片暂不可用：{alt ?? name}</span>;
    },
    a: ({ node: _node, href, children, ...props }) => {
      if (href?.startsWith('#')) return <a {...props} href={href} onClick={event => {
        event.preventDefault();
        let anchor = href.slice(1);
        try { anchor = decodeURIComponent(anchor); } catch { return; }
        for (const target of world.chapters) {
          const section = target.sections.find(section => section.id === anchor || section.title === anchor || section.title.toLowerCase().replace(/\s+/g, '-') === anchor);
          if (section) { onAnchor(target.id, section.id); break; }
        }
      }}>{children}</a>;
      if (href && /^https?:\/\//.test(href)) return <a {...props} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
      return <span>{children}</span>;
    },
  }}>{chapter.markdown}</Markdown>;
});
