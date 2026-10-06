# Repository Guidelines

## Project scope

Worlds is a private multi-worldbuilding Markdown notebook, maintained with Git. The worldbuilding itself is the project; do not turn it into a novel-production system. The author owns final canon decisions. AI acts as an editor, organizer, analyst, and worldbuilding assistant.

The night-mode web reader is a read-only presentation of this notebook, available locally and at `https://seiya058904.github.io/Worlds/`. Markdown and its referenced maps remain the only content source. Keep app code separate from world content. GitHub Pages deployment through the existing workflow is authorized; do not add web editing or other hosting/publishing without an explicit request.

## Repository structure

- `README.md` explains the project and indexes the worlds.
- `worlds/<world-name>.md` contains one complete world per Markdown file. Keep characters, geography, history, factions, timelines, items, civilizations, technology, and power systems inside that world file as readable sections.
- `INBOX.md` is the only intentionally unstructured inbox for notes whose world or status is uncertain.
- `.reasonix/` and `.workbuddy/` are local editor metadata and are ignored by Git.
- `reader/` contains the React/TypeScript/Vite reader, its shared content scanner, local document service, static exporter and tests. `启动阅读器.cmd` launches it on Windows at `http://127.0.0.1:4175`. App dependencies and build output are ignored by Git.
- `.github/workflows/pages.yml` tests and builds on `main` pushes or manual dispatch, then deploys `reader/dist/` using GitHub Actions Pages source. No `gh-pages` branch is used.

Do not create split directories such as `characters/`, `history/`, `geography/`, `factions/`, `timeline/`, `lore/`, `archive/`, `resources/`, `plans/`, or `database/`. Do not introduce databases, scripts, state machines, workflows, templates, or JSON/YAML data structures for world content.

The reader may use normal app source files, manifests, scripts, API responses and browser-local preferences inside its own scope. Do not encode a duplicate body of world content in these files. “典藏” and “持续迭代” are reader labels, not canon changes.

## Canon and editing rules

- A user statement made in definite language is normally formal canon.
- Uncertain user ideas belong in `未定设定` or `候选扩展`, never in formal canon by assumption.
- AI-generated ideas are proposals and must remain in `候选扩展` until the user explicitly accepts them.
- Preserve both sides of unresolved canon conflicts, record the issue in `未定设定`, and report it. Only obvious wording errors may be corrected directly.
- Preserve the author's meaning while improving order, headings, wording, and readability. Update `README.md` only when the world index changes or a world summary genuinely changes.
- Keep the lightweight outer sections where applicable: `世界速览`, `正式设定`, `当前世界状态`, `未定设定`, `候选扩展`, `灵感池`, `当前空白`, and `废弃设定`.

## Validation and commands

For world content changes, inspect the affected Markdown from start to finish, verify headings and canon boundaries, and use the relevant Git checks:

```powershell
git diff --check
git status --short
git diff --name-only
```

For reader changes, run `npm ci`, `npm test` and `npm run build` from `reader/`, then verify affected interactions in a real browser using the production build (`npm run preview`, port 4176), including desktop and narrow-screen layouts and `/Worlds/` subpath/hash links. Also check the local service for synchronization changes. Use temporary document copies for synchronization tests; never alter the author's world files as test fixtures. Confirm source Markdown and map hashes when reorganizing or renaming files. After an authorized release, wait for the exact commit's Pages Actions run and verify the live site's manifest, document/map bytes and real interactions.

`reader/server/worlds-snapshot.ts` is the single scanner and revision implementation. Allow only top-level Markdown and explicitly referenced raster images resolved inside `worlds/`; never export arbitrary repository files. `reader/server/static-content.ts` emits generated manifest, source JSON and original map bytes only into build output. No generated body is maintained in source control. Production uses relative base/`BASE_URL` and static content, with no `/api` or GitHub API dependency.

`reader/src/sync.ts` keeps the last successful snapshot in memory, serializes/coalesces refreshes, and commits changed worlds atomically after all loads succeed. Online checks occur every 30 seconds and on focus/visibility/network recovery; local reconciliation occurs every 5 seconds and on HMR events. Unchanged revisions must not reload or reparse documents. Failures must retain readable content and position. Before replacing content, capture the old DOM's reading position; preserve paragraph/section/chapter/index/ratio fallbacks and browser settings.

`reader/server/worlds-plugin.ts` owns local scan scheduling and watcher notifications. Keep scans serial: file events and explicit refreshes record invalidation immediately, including while a scan is active; coalesce bursts into a trailing scan until current invalidations are covered. Debouncing must not discard changes. On server close, stop scheduling/publishing and detach watchers and timers.

Read and write text as UTF-8. Do not open or output `.env`, `.dev.vars`, private keys, keystores, tokens, cookies, or other credentials.

## Git and collaboration

Make focused changes only. Preserve unrelated user modifications. Daily project commits may be made directly on `main`; use a simple, specific message such as `Expand northern empire history` or `Import original western fantasy notes`. Do not deploy, publish, update dependencies, or perform external actions unless explicitly authorized. Before committing, inspect the final diff, run `git diff --check`, and stage only the intended files. Never use broad staging or destructive cleanup commands.

## AI boundaries

Read `README.md` and this file before working. Read the target world file before editing it. Do not infer a target world when the source is ambiguous; place the material in `INBOX.md`. Do not silently promote proposals, resolve formal conflicts, restore abandoned Story/novel plans, or add unrelated structure. Keep world files suitable for a complete human reading rather than turning headings into database fields.
