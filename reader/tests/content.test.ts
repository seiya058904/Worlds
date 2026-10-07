import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseWorld, restoreChapter, searchWorlds } from '../src/content.ts';
import { MarkdownBody } from '../src/components/MarkdownBody.tsx';
import type { WorldSource } from '../src/types.ts';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';

function source(markdown: string, id = '测试'): WorldSource { return { id, title: id, label: id, markdown, revision: 'test', status: '典藏', maps: [] }; }

const directory = new URL('../../worlds/', import.meta.url);
const documents = (await readdir(directory, { withFileTypes: true })).filter(entry => entry.isFile() && !entry.name.startsWith('.') && entry.name.endsWith('.md'));
const parser = unified().use(remarkParse).use(remarkGfm);

function assertComplete(markdown: string, name: string) {
  const world = parseWorld(source(markdown, name));
  assert.equal(world.markdown, markdown);
  assert.equal(world.chapters.map(chapter => markdown.slice(chapter.start, chapter.end)).join(''), markdown);
  const expected = parser.parse(markdown).children.filter(node => node.type === 'heading').map(node => ({ title: toString(node), depth: node.depth, offset: node.position!.start.offset! }));
  const headings = world.chapters.flatMap(chapter => chapter.sections.map(section => ({ title: section.title, depth: section.depth, offset: chapter.start + section.offset })));
  assert.deepEqual(headings, expected, '每个实际标题的文字、层级、顺序和原文位置均应保留');
  const ids = world.chapters.flatMap(chapter => [chapter.id, ...chapter.sections.map(section => section.id)]);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(world.chapters[0].start, 0);
  assert.equal(world.chapters.at(-1)!.end, markdown.length);
  for (let i = 1; i < world.chapters.length; i++) assert.equal(world.chapters[i - 1].end, world.chapters[i].start);
  return world;
}

for (const document of documents) {
  const name = document.name.slice(0, -3);
  test(`${name}：完整原文与所有标题均保留`, async () => {
    assertComplete(await readFile(new URL(document.name, directory), 'utf8'), name);
  });
}

test('扩写、改名、删章与新书不固定标题数量；分组引言仍属于正文', () => {
  const original = '# 测试\n\n开篇正文。\n\n## 旧章\n### 小节\n原段落。\n\n# 第二部\n\n分组引言。\n\n## 后章\n末段。\n';
  const expanded = original.replace('## 旧章', '## 改名章') + '\n## 新章\n### 新节\n#### 四级\n##### 五级\n###### 六级\n新增正文。\n';
  const world = assertComplete(expanded, '任意新书');
  assert.ok(world.chapters.find(chapter => chapter.groupTitle === '第二部' && chapter.title === '引言')?.markdown.includes('分组引言。'));
  assertComplete(expanded.replace('## 改名章\n### 小节\n原段落。\n\n', ''), '任意新书');
  assertComplete('新书名\n======\n\n第一章\n------\n\n正文。\n', '新书');
  assertComplete(expanded.replaceAll('\n', '\r\n'), 'Windows 换行');
  assertComplete('', '空书');
});

test('代码块中的伪标题不分章；同名小节和父级路径具有唯一定位', () => {
  const world = parseWorld(source('# 测试\n\n## 甲\n\n```md\n## 不应分章\n```\n\n### 重复\n甲\n\n### 重复\n乙\n\n## 乙\n\n### 重复\n丙\n'));
  assert.equal(world.chapters.length, 3);
  assert.equal(world.chapters[1].sections.filter(section => section.depth === 3).length, 2);
  assert.equal(new Set(world.chapters.flatMap(chapter => chapter.sections.map(section => section.id))).size, 6);
  const revised = parseWorld(source('# 测试\n\n## 新章\n内容\n\n' + world.markdown.slice('# 测试\n\n'.length)));
  assert.equal(revised.chapters.find(chapter => chapter.title === '甲')!.id, world.chapters[1].id);
});

test('跨章引用定义可解析；Markdown 原始 HTML 不执行', () => {
  const world = parseWorld(source('# 测试\n\n## 甲\n[参考][ref]\n\n<script>alert(1)</script>\n\n## 乙\n[ref]: https://example.com\n'));
  const html = renderToStaticMarkup(createElement(MarkdownBody, { world, chapter: world.chapters[1], onMap: () => {}, onAnchor: () => {} }));
  assert.ok(html.includes('href="https://example.com"'));
  assert.ok(!html.includes('<script'));
  assert.ok(!html.includes('alert(1)'));
});

test('全文搜索命中正确世界、章、小节和源段落；空查询无结果', () => {
  const world = parseWorld(source('# 测试\n\n## 甲\n\n### 小节\n\n独特人物在河边。\n'));
  const hits = searchWorlds([world], '独特人物');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].chapterId, world.chapters[1].id);
  assert.equal(hits[0].sectionId, world.chapters[1].sections[1].id);
  assert.ok(world.chapters[1].markdown.slice(hits[0].sourceOffset).startsWith('独特人物'));
  assert.deepEqual(searchWorlds([world], '  '), []);
});

test('章节删除后回退有效章节；非法索引与空文档不会崩溃', () => {
  const world = parseWorld(source('# 测试\n\n## 甲\n内容\n'));
  const position = { chapterId: 'deleted', chapterIndex: 999, sectionId: '', paragraph: '', offset: 0, ratio: 0 };
  assert.equal(restoreChapter(world, position).chapter.title, '甲');
  assert.equal(restoreChapter(world, position).missing, true);
  assert.equal(restoreChapter(world, { ...position, chapterIndex: -99 }).chapter.title, '开篇');
  assert.equal(parseWorld(source('')).chapters.length, 1);
});

test('榜单中的 Markdown 双空格换行保持分行与加粗', () => {
  const world = parseWorld(source('# 测试\n\n## 榜谱\n\n**第一席**  \n**第二席**\n'));
  const html = renderToStaticMarkup(createElement(MarkdownBody, { world, chapter: world.chapters[1], onMap: () => {}, onAnchor: () => {} }));
  assert.ok(/<strong\b[^>]*>第一席<\/strong><br\b[^>]*\/?\>/.test(html), html);
  assert.ok(/<strong\b[^>]*>第二席<\/strong>/.test(html));
});
