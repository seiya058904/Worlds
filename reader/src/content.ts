import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';
import type { RootContent, Heading } from 'mdast';
import type { Chapter, ParsedWorld, ReadingPosition, SearchHit, WorldSource } from './types';

const parser = unified().use(remarkParse).use(remarkGfm);
const key = (value: string) => encodeURIComponent(value.trim().normalize('NFC'));

/** Split the parsed document, never heading-looking text inside a code block. */
export function parseWorld(source: WorldSource): ParsedWorld {
  const tree = parser.parse(source.markdown);
  const chapters: Chapter[] = [];
  const ids = new Map<string, number>();
  const unique = (base: string) => {
    const count = (ids.get(base) ?? 0) + 1;
    ids.set(base, count);
    return `${base}:${count}`;
  };
  let groupTitle = source.title;
  let groupId = 'root';
  let current: Chapter | undefined;
  let firstTitle = true;
  const definitions = tree.children.filter(node => node.type === 'definition' || node.type === 'footnoteDefinition');

  for (const node of tree.children) {
    const start = node.position?.start.offset ?? 0;
    if (node.type === 'heading' && node.depth === 1) {
      groupTitle = toString(node);
      groupId = firstTitle ? 'root' : unique(`group/${key(groupTitle)}`);
      firstTitle = false;
      current = undefined;
    }
    if (!current || (node.type === 'heading' && node.depth === 2)) {
      const title = node.type === 'heading' && node.depth === 2 ? toString(node) : groupId === 'root' ? '开篇' : '引言';
      current = {
        id: unique(`${groupId}/${key(title)}`), title, groupId, groupTitle,
        index: chapters.length, start: chapters.length ? start : 0, end: source.markdown.length,
        markdown: '', sections: [], blocks: [], nodes: [],
      };
      chapters.push(current);
    }
    current.nodes.push(node);
    if (node.type === 'heading') {
      const heading = node as Heading;
      const title = toString(heading);
      const parent = [...current.sections].reverse().find(section => section.depth < heading.depth);
      current.sections.push({ id: unique(`${parent?.id ?? current.id}/${key(title)}`), title, depth: heading.depth, offset: start - current.start });
    }
    const text = toString(node);
    if (text) current.blocks.push({ start, text, sectionId: current.sections.at(-1)?.id ?? current.id });
  }
  if (!chapters.length) {
    chapters.push({ id: 'root/empty:1', title: '开篇', groupId: 'root', groupTitle, index: 0, start: 0, end: source.markdown.length, markdown: source.markdown, sections: [], blocks: [], nodes: [] });
  }
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    chapter.end = chapters[i + 1]?.start ?? source.markdown.length;
    chapter.markdown = source.markdown.slice(chapter.start, chapter.end);
    // Reference-style links can be defined elsewhere in the same source document.
    const otherDefinitions = definitions.filter(node => !chapter.nodes.includes(node));
    if (otherDefinitions.length) chapter.markdown += '\n\n' + otherDefinitions.map(node => source.markdown.slice(node.position!.start.offset!, node.position!.end.offset!)).join('\n');
  }
  return { ...source, chapters };
}

export function searchWorlds(worlds: ParsedWorld[], query: string): SearchHit[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [];
  const hits: SearchHit[] = [];
  for (const world of worlds) for (const chapter of world.chapters) for (const block of chapter.blocks) {
    const at = block.text.toLocaleLowerCase().indexOf(needle);
    if (at < 0) continue;
    const from = Math.max(0, at - 32);
    hits.push({ worldId: world.id, worldTitle: world.label, chapterId: chapter.id, chapterTitle: chapter.title, sectionId: block.sectionId, sourceOffset: block.start - chapter.start, snippet: `${from ? '…' : ''}${block.text.slice(from, at + needle.length + 70)}${block.text.length > at + needle.length + 70 ? '…' : ''}` });
    if (hits.length >= 100) return hits;
  }
  return hits;
}

export function restoreChapter(world: ParsedWorld, position?: ReadingPosition) {
  const exact = world.chapters.find(chapter => chapter.id === position?.chapterId);
  if (exact) return { chapter: exact, missing: false };
  const paragraph = position?.paragraph ? world.chapters.find(chapter => chapter.blocks.some(block => paragraphFingerprint(block.text) === paragraphFingerprint(position.paragraph))) : undefined;
  const section = position?.sectionId ? world.chapters.find(chapter => chapter.sections.some(section => section.id === position.sectionId)) : undefined;
  const index = Number.isFinite(position?.chapterIndex) ? Math.max(0, Math.min(position!.chapterIndex, world.chapters.length - 1)) : 0;
  return { chapter: exact ?? paragraph ?? section ?? world.chapters[index], missing: Boolean(position && !exact) };
}

export function paragraphFingerprint(text: string) { return text.trim().replace(/\s+/g, ' ').slice(0, 140); }

/** Prefer a paragraph over its heading; only a matched paragraph keeps its pixel offset. */
export function readingAnchor(position: ReadingPosition, blocks: { text: string }[], sectionIds: string[]) {
  const blockIndex = position.paragraph ? blocks.findIndex(block => paragraphFingerprint(block.text) === paragraphFingerprint(position.paragraph)) : -1;
  if (blockIndex >= 0) return { blockIndex, sectionId: '', offset: position.offset };
  return { blockIndex: -1, sectionId: sectionIds.includes(position.sectionId) ? position.sectionId : '', offset: 0 };
}
