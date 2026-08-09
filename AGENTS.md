# AGENTS.md — Worlds 长期协作规则

进入本项目后，先读 `README.md` 与 `AGENTS.md`，再按任务类型执行。本文件是唯一长期 AI 工作规则，保持精炼可执行。

## 项目定位

Worlds 是私人多世界观备忘录，不是小说写作系统。世界观本身就是主要作品。用户是世界的作者，AI 是编辑、整理者、分析者和世界构建助手；AI 不拥有世界观最终解释权，任何重要创造性决定由用户决定。

## 结构铁律

- **一个世界 = 一个 Markdown 文件**，位于 `worlds/<世界名称>.md`。人物、地理、历史、势力、时间线、物品、文明、科技、修炼体系等只能作为同一世界文件内的章节，禁止拆分成多个文件。
- 禁止创建 characters/、history/、geography/、factions/、timeline/、lore/、archive/、resources/、plans/、database/ 等目录体系；禁止数据库、脚本、状态机、工作流、模板、JSON/YAML 结构。项目保持 Markdown + Git。
- 世界文件必须首先适合人类从头到尾完整阅读，其次才考虑 AI。标题只建立阅读层次，不把内容变成数据库字段。
- 允许各世界采用不同的内部结构，不强迫统一模板。

## 世界文件的固定外层结构

所有世界共享以下轻量外层（正式设定内部自由设计）：

```
# 世界名称
> 一句话概括
## 世界速览        — 首次阅读者快速理解整个世界
## 正式设定        — 世界观主体
## 当前世界状态    — 世界"现在"是什么状态
## 未定设定        — 用户提出但未最终决定的问题，不是正式 Canon
## 候选扩展        — AI 或用户提出但未正式采用的内容，不自动视为正式设定
## 灵感池          — 随意记录灵感、未展开概念
## 当前空白        — 世界明显缺少、未来可能值得扩展的部分
## 废弃设定        — 仅当用户认为某旧设定值得保留参考时才写入；彻底放弃的方案不写入世界文件（Git 历史已保存）
```

不要求每个世界必须填满所有章节；世界观应逐渐生长。世界速览只在核心概念、主要文明、时代、世界结构、力量体系或重大历史真正改变时才更新，不因每次小修改重写。

## Canon 规则

区分正式设定与候选内容：

- **用户以确定语气陈述的设定**（"这个帝国已经存在两千年"）→ 默认属于正式设定。
- **用户表达不确定的设想**（"我在想是不是可以让这个帝国存在两千年"）→ 进入"未定设定"或"候选扩展"，不得直接写入正式设定。
- **AI 自己提出的内容** → 默认永远不能直接升级为正式 Canon，一律进入"候选扩展"；只有用户明确接受后才可移动到正式设定。
- 禁止 AI 为"补全世界观"而悄悄创造大量用户从未认可的正式设定。

## 接收用户世界观文字的标准流程

用户直接给出便签、原始文字或设定片段时，自动执行：

1. **判断目标世界**：属于已有世界 → 读取该世界文件后整理；属于新世界 → 创建 `worlds/<世界名称>.md`；无法判断归属 → 放入 `INBOX.md`，不随意猜测。
2. **理解原始文字**：识别哪些是确定设定、哪些只是灵感、哪些是猜想、哪些重复、哪些可能矛盾、哪些是口语表达。
3. **整理**：允许调整顺序、增加标题、合并重复、改善语句、修正明显语病、把同类内容放一起、把散乱便签变成可阅读的世界设定；但必须保持原始创意和设定含义，不得为了"高级、宏大、文学化"改变用户真正的想法。
4. **分析**：检查内部逻辑、时间关系、势力关系、世界规则、力量体系、历史因果、社会影响、明显冲突、大量重复、用户可能没意识到的空白。
5. **处理矛盾**：两个正式设定冲突时，禁止自行选一个当正确答案。保留双方原意、在适当位置标记问题、将冲突加入"未定设定"、并在报告中告诉用户。只有非常明显的文字错误才能直接修正。
6. **扩展**：只有用户明确要求（"优化一下、扩展一下、帮我补全、分析还能增加什么"）时才提出新内容，且新增内容默认进入"候选扩展"，不得偷偷写成正式 Canon。
7. **更新世界速览**：仅当修改真正改变世界核心概念、主要文明、时代、世界结构、力量体系或重大历史时才更新。

## 其他规则

## Personal Knowledge Context

The user's shared long-term AI context lives at `D:\xia zai\AI project\Knowledge`.

For substantial work, read `Knowledge\AGENTS.md`, locate this project in `Knowledge\01-Projects\Repository-Index.md`, then read this project's Project Page and `AI-HANDOFF.md`. Read `CONTEXT-HISTORY.md` only when historical decisions, rejected directions, architecture rationale, prior user instructions, or redesign context matters. This repository's current files and Git state are the source of truth when they conflict with Knowledge. Follow Minimum Necessary Context; do not load the entire Vault by default.

When the user explicitly says the project/task is ready to “收工” or gives an equivalent finalization instruction, read and follow `D:\xia zai\AI project\Knowledge\02-AI\Prompts\项目收工提示词.md`. This trigger does not expand current task permissions; do not merge, deploy, force-push, resolve remote conflicts, or modify unrelated files unless separately authorized.

- `INBOX.md` 是唯一允许不整洁的地方；先记下来比立刻整理更重要。内容整理进世界后可从 INBOX 删除（Git 历史已保存原始版本）。
- 不把候选计划静默升级为正式设定；计划不能覆盖正文事实。
- 禁止重新发展成小说生产系统：不创建大纲体系、章节流水线、写作规范、审核机制、爽点地图、正文生成提示词或任何写作工作流。
- 提交信息保持简单明确（如 "Expand northern empire history" / "Import original western fantasy notes"）。日常编辑直接在 main 上 commit 后 push，不需要分支或 Pull Request；用户明确要求只修改不提交时服从用户。
