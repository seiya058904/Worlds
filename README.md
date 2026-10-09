# Worlds

**Four imagined universes. One evolving archive.**

Worlds is a collection of original worldbuilding kept in Markdown and Git, with a quiet, read-only library for exploring its histories, civilizations, maps, and ideas. The worlds are the finished work—not drafts waiting to become novels or games.

**[📖 Open the library](https://seiya058904.github.io/Worlds/)** · [Explore the worlds](#explore-the-worlds) · [Read locally](#read-online-or-locally) · [Writing principles](#writing-and-canon)

> **The worlds are the work.** The manuscripts are the source of truth; the website is simply another way to read them.

## Explore the worlds

Each world has its own setting, history, and internal logic. Select a world to read its complete source document, or open the [library](https://seiya058904.github.io/Worlds/) for a chapter-based reading experience.

| World | Inside the archive |
| --- | --- |
| **[人界](worlds/人界.md)** | A cultivation cosmos of nine major races, eight vast domains, imperial eras, and the legacies of emperors and Dao sovereigns. |
| **[西幻世界](worlds/西幻世界.md)** *(working title)* | A high-fantasy continent with five principal races, a 1–100 level system, a barrier at level 70, and ten artifacts capable of shaping the world's rules. |
| **[星星联邦](worlds/星星联邦.md)** *(Stellar Federation)* | A far-reaching interstellar federation: member civilizations, shared trade routes, postwar politics, and the divide between P-series and classified S-series technology. |
| **[宋世江湖](worlds/宋世江湖.md)** | A Song-inspired martial world of schools, lineages, duels, regional rankings, the northern and southern lists, and an elusive all-under-heaven register. |

Every world is maintained as **one complete Markdown document** under [`worlds/`](worlds/). Its referenced maps remain alongside the writing. The reader does not create a second, editable version of the canon.

## Inside the library

The library is designed for reading long, evolving documents without turning them into a database or a conventional wiki.

- **Chapters and navigation:** browse an outline, jump between sections, and move to the previous or next chapter.
- **Find a passage:** filter the contents or press `Ctrl+K` to search across worlds.
- **Maps in context:** open referenced maps for full-screen inspection, zooming, and panning.
- **A personal reading space:** adjust type, spacing, and reading preferences; the browser remembers your position.
- **Updates without losing your place:** local edits can appear in the reader as you work; the published library checks for new deployed content and retains the last successfully loaded version when a refresh fails.

> **Note:** Both the online library and the local reader are **read-only**. They do not edit world files, resolve lore conflicts, or write changes back to GitHub.

## Read online or locally

**Online:** [Open Worlds · Library](https://seiya058904.github.io/Worlds/). New source changes appear online after they have been committed, pushed, and successfully deployed through the existing GitHub Actions workflow.

**On Windows:** run [`启动阅读器.cmd`](启动阅读器.cmd) from the repository root. It starts the local reader at **http://127.0.0.1:4175/**. The first launch may require an internet connection to install locked dependencies; keep the terminal open while reading.

**For development:** use Node.js 22.12+ (Node 24 LTS recommended) and run these commands from the repository root:

```
cd reader
npm ci
npm run dev
```

The development server listens at `http://127.0.0.1:4175/`. To check the reader or create a production build, run from `reader/`:

```
npm test
npm run build
npm run preview
```

Production preview uses `http://127.0.0.1:4176/`. Serve the built site over HTTP rather than opening its HTML file directly.

## Writing and canon

The archive is organized around a few deliberate boundaries:

1. **Capture ideas first.** Put unassigned notes, fragments, and uncertain material in [`INBOX.md`](INBOX.md).
2. **Keep each world together.** Edit the appropriate file in [`worlds/`](worlds/) instead of splitting its characters, history, geography, and factions into separate databases.
3. **Distinguish facts from proposals.** A suggestion from an AI assistant is not canon until the author accepts it. Preserve unresolved contradictions and competing accounts rather than silently choosing one.
4. **Use Git for history.** Review changes before committing. GitHub stores revisions, while the library presents the published source as a readable experience.

The author retains authority over the setting. AI may help organize, analyze, and refine material, but it does not independently establish official history. See [`AGENTS.md`](AGENTS.md) for the full editing and validation rules.

## Repository guide

```
worlds/          Canonical manuscripts and their referenced maps
INBOX.md         Unsorted notes and uncertain ideas
reader/          Read-only library, local scanner, build, and tests
启动阅读器.cmd    Windows reader launcher
AGENTS.md        Rules for AI-assisted editing and maintenance
```

Worlds is a personal worldbuilding archive, not a novel generator, a content-management platform, or a browser-based world editor. No repository-wide open-source license is currently specified.

## 项目边界

本仓库用于**长期维护多世界观的个人档案**，不是小说自动生成器、故事项目管理系统或开放编辑平台。公开阅读入口与作者的编辑权限是两回事；请保留原有设定来源和文字的上下文。
