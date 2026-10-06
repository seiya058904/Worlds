import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseWorld, paragraphFingerprint, readingAnchor, restoreChapter } from '../src/content.ts';
import { MarkdownBody } from '../src/components/MarkdownBody.tsx';
import { SyncIndicator } from '../src/components/SyncIndicator.tsx';
import { imageName } from '../src/asset-name.ts';
import type { WorldSource, ReadingPosition } from '../src/types.ts';

const source = (markdown: string): WorldSource => ({ id: '测试', title: '测试', label: '测试', status: '典藏', revision: 'test', maps: [], markdown });
const position: ReadingPosition = { chapterId: 'old', chapterIndex: 1, sectionId: 'old-section', paragraph: '保留的段落。', offset: 21, ratio: 0.6 };

test('renamed chapter is recovered by paragraph even when a new chapter changes its index', () => {
  const world = parseWorld(source('# 测试\n\n## 新章\n新内容。\n\n## 改名的旧章\n\n### 改名的小节\n\n保留的段落。\n'));
  assert.equal(restoreChapter(world, position).chapter.title, '改名的旧章');
  assert.equal(restoreChapter(world, position).missing, true);
});

test('paragraph anchor survives heading edits and preserves its pixel offset; changed paragraph falls back to section', () => {
  assert.deepEqual(readingAnchor(position, [{ text: '插入段落。' }, { text: '保留的段落。\n' }], ['renamed']), { blockIndex: 1, sectionId: '', offset: 21 });
  assert.deepEqual(readingAnchor(position, [{ text: '修改了段落。' }], ['old-section']), { blockIndex: -1, sectionId: 'old-section', offset: 0 });
  assert.deepEqual(readingAnchor(position, [], []), { blockIndex: -1, sectionId: '', offset: 0 });
  assert.equal(paragraphFingerprint('甲\n  乙'), '甲 乙');
});

test('map matching accepts Chinese names, Pages prefix and version queries without browser globals', () => {
  const world = parseWorld({ ...source('# 测试\n\n## 地图\n![原地图](%E4%B8%AD%E6%96%87%E5%9C%B0%E5%9B%BE.png?draft=1)\n'), maps: [{ name: '中文地图.png', revision: 'rev', alt: '原地图', url: '/Worlds/content/assets/%E4%B8%AD%E6%96%87%E5%9C%B0%E5%9B%BE.png?v=rev' }] });
  const html = renderToStaticMarkup(createElement(MarkdownBody, { world, chapter: world.chapters[1], onMap() {}, onAnchor() {} }));
  assert.ok(html.includes('inline-map')); assert.ok(html.includes('?v=rev')); assert.ok(!html.includes('图片暂不可用'));
  assert.equal(imageName('中文地图.png?v=rev#image'), '中文地图.png');
  assert.equal(imageName('../中文地图.png'), undefined); assert.equal(imageName('https://other.test/中文地图.png'), undefined);
});

test('sync indicator distinguishes Local/Online and preserves retry semantics', () => {
  for (const [mode, expected] of [['local', '本地文档已同步'], ['online', '线上内容已同步']] as const) {
    const html = renderToStaticMarkup(createElement(SyncIndicator, { mode, status: 'ready', library: true })); assert.ok(html.includes(expected));
  }
  assert.ok(renderToStaticMarkup(createElement(SyncIndicator, { mode: 'online', status: 'offline' })).includes('离线 · 正在重连'));
});
