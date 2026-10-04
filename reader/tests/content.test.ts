import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseWorld, restoreChapter, searchWorlds } from '../src/content.ts';
import { MarkdownBody } from '../src/components/MarkdownBody.tsx';
import type { WorldSource } from '../src/types.ts';

function source(markdown: string, id = '测试'): WorldSource { return { id, title: id, label: id, markdown, revision: 'test', status: '典藏', maps: [] }; }

for (const [name, expected] of Object.entries({ 人界: [1, 8, 8], 西幻世界: [1, 7, 16], 星星联邦: [1, 8, 20], 宋世江湖: [2, 26, 537] })) {
  test(`${name}：完整原文与所有标题均保留`, async () => {
    const markdown = await readFile(new URL(`../../worlds/${name}.md`, import.meta.url), 'utf8');
    const world = parseWorld(source(markdown, name));
    assert.equal(world.chapters.map(chapter => markdown.slice(chapter.start, chapter.end)).join(''), markdown);
    const headings = world.chapters.flatMap(chapter => chapter.sections);
    for (let i = 0; i < expected.length; i++) assert.equal(headings.filter(heading => heading.depth === i + 1).length, expected[i]);
    assert.equal(new Set(headings.map(heading => heading.id)).size, headings.length);
    assert.ok(world.chapters[0].markdown.startsWith(`# ${name}`));
    if (name === '宋世江湖') {
      const introduction = world.chapters.find(chapter => chapter.groupTitle === '江湖纪事' && chapter.title === '引言');
      assert.ok(introduction?.markdown.includes('榜上只有名字，真正的江湖却在名字之间。'));
    }
  });
}

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
