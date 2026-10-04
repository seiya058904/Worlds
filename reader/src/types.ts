import type { RootContent } from 'mdast';

export type WorldInfo = {
  id: string;
  title: string;
  label: string;
  status: '典藏' | '持续迭代';
  revision: string;
  maps: { url: string; alt: string }[];
};
export type WorldSource = WorldInfo & { markdown: string };
export type Section = { id: string; title: string; depth: number; offset: number };
export type Chapter = {
  id: string;
  title: string;
  groupId: string;
  groupTitle: string;
  index: number;
  start: number;
  end: number;
  markdown: string;
  sections: Section[];
  blocks: { start: number; text: string; sectionId: string }[];
  nodes: RootContent[];
};
export type ParsedWorld = WorldSource & { chapters: Chapter[] };
export type ReadingPosition = {
  chapterId: string;
  chapterIndex: number;
  sectionId: string;
  paragraph: string;
  offset: number;
  ratio: number;
};
export type Preferences = { fontSize: number; lineHeight: number; font: 'serif' | 'sans' };
export type SearchHit = { worldId: string; worldTitle: string; chapterId: string; chapterTitle: string; sectionId: string; sourceOffset: number; snippet: string };
