# 小说项目入口

## 项目目标

这是由 AI Agent 持续创作的原创中文玄幻长篇。用户提供方向、审核正文、提出修改意见并确认重大设定；Codex 读取当前事实源、规划被要求的章节、写作和修订正文，并在正文推进中维护必要连续性。

## Agent 自动入口

所有 Agent 进入项目后必须先遵守根目录 `AGENTS.md`。

涉及正文创建或修改时，还必须遵守
`02-manuscript/AGENTS.md`
和
`01-current/chapter-writing-protocol.md`。

用户只需说明具体任务，不需要重复粘贴项目流程、固定文风或必读文件列表。

## 当前模式：`ROLLING_PILOT`

- 第 1—3 章为可替换的文风与故事方向试写稿，不是不可修改的正式连载正文。
- 不固定整书章节数、轮回次数、全书人物弧线或伏笔回收章号；不执行旧 240 章规划。
- 只有用户明确要求创作或修改某一章时，Codex 才执行；不得自行连续生成章节。
- 用户确认某章转为正式正文后，再记录其状态。

## 当前唯一事实源

| 类型 | 路径 |
| --- | --- |
| 项目入口与工作方式 | `PROJECT.md` |
| 当前世界规则 | `01-current/canon.md` |
| 当前人物和关系 | `01-current/characters-and-relations.md` |
| 全书长期大纲 | `01-current/series-outline.md` |
| 当前写作规则 | `01-current/style.md` |
| 单章正文执行流程 | `01-current/chapter-writing-protocol.md` |
| 当前与近期剧情计划 | `01-current/rolling-plan.md` |
| 已发生事实和当前状态 | `01-current/continuity.md` |
| 试写／正文 | `02-manuscript/` |
| 用户原始素材 | `00-input/` |
| 可选创作素材 | `03-resources/` |
| 参考资料 | `04-references/` |
| 废止方案和历史资料 | `99-archive/` |

冲突优先级：用户最新明确指令 → 当前世界规则 → 已写正文事实 → 当前人物与连续性 → 用户原始世界观素材 → 滚动计划 → 创作资源 → 参考资料 → 历史归档。正文事实不得被计划静默覆盖；归档不得作为现行约束。

## 默认读取顺序

正式新写或重写正文必须按顺序读取：`PROJECT.md`、`01-current/canon.md`、`01-current/series-outline.md`、`01-current/characters-and-relations.md`、`01-current/rolling-plan.md`、`01-current/continuity.md`、`01-current/style.md`、`01-current/chapter-writing-protocol.md`、`03-resources/story-resources.md`、`03-resources/anti-patterns.md`、相关上一章或待重写正文、用户本次最新要求。

按需读取：`04-references/working-notes.md`、`selected-excerpts.txt` 与 `00-input/user-world-source.txt`。

不得默认读取三部参考原文、`99-archive/`、旧 240 章规划、旧审计、否决正文、历史 zip 或旧参考应用协议。

## 一章的最简工作流

1. 用户明确要求创作或修改正文。
2. 按强制读取顺序阅读，并创建/覆盖 `scratch/current-chapter-brief.md`，逐项写出实际提取事实与正文用途。
3. 按单章协议完成简报、检索资源库并提取本章输入；资源库无合适机制时明确记录不采用。
4. 按固定正文生成规范内部规划并写作。
5. 用户审核正文。
6. 修改正文。
7. 只更新真正变化的当前资料。

## 章后最少更新

默认只更新 `01-current/continuity.md`。正文确认新世界规则时更新 `canon.md`；人物目标、关系或知识变化时更新 `characters-and-relations.md`；后续方向改变时更新 `rolling-plan.md`；用户调整写作要求时更新 `style.md`。不得机械修改全部文件。

## 归档隔离

`99-archive/` 中全部资料均为历史、废止方案、否决稿或迁移备份。除非用户明确要求追溯旧设计，否则不得作为当前事实源，也不得默认读取。

## 固定文风保护

`01-current/style.md` 是当前项目唯一有效的固定正文生成规范。参考笔记、素材库、历史文风文件和归档方案均不能覆盖它。除非用户明确要求修改，否则不得自行删减、重写或替换。
