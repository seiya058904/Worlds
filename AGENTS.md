# Repository Guidelines

## Scope & Structure
- Worlds is a private multi-worldbuilding Markdown notebook (not a novel-production system). The author owns all canon decisions; AI acts as editor, organizer, and analyst.
- Each complete world lives in one file `worlds/<world-name>.md`; `INBOX.md` is the only intentionally unstructured inbox for ambiguous notes.
- **Forbidden**: do not create split directories (`characters/`, `history/`, `geography/`, `factions/`, `timeline/`, `lore/`, `archive/`, `resources/`, `plans/`, `database/`) or databases/JSON/YAML/state machines for world content.
- `reader/` is a read-only night-mode web reader (React/TS/Vite, deployed to `https://seiya058904.github.io/Worlds/` via `.github/workflows/pages.yml`, no `gh-pages` branch). Keep app code separate from world content; never duplicate world content in app files or add web editing/new hosting without explicit request. "典藏"/"持续迭代" are reader labels only.

## Canon & Editing Rules
- Definite user statements → formal canon; uncertain ideas → `未定设定`/`候选扩展`; AI ideas stay in `候选扩展` until explicitly accepted.
- Preserve both sides of unresolved conflicts in `未定设定` and report them; only fix obvious wording errors directly. Keep outer sections where applicable (`世界速览`, `正式设定`, `当前世界状态`, `未定设定`, `候选扩展`, `灵感池`, `当前空白`, `废弃设定`).
- Read `README.md` and the target world file before editing; update `README.md` only when the world index or summary genuinely changes. Place ambiguous-world notes in `INBOX.md`; never silently promote proposals or restore abandoned novel plans.

## Reader Invariants & Verification
- **World edits**: inspect full affected Markdown, verify canon boundaries, run `git diff --check`.
- **Reader edits**: run `npm ci`, `npm test`, `npm run build` in `reader/`, verify production `npm run preview` (port `4176`) in a real browser (desktop/narrow + `/Worlds/` subpath & hash links). Use temporary document copies for sync tests — **never alter author world files as test fixtures**.
- `reader/server/worlds-snapshot.ts` is the sole scanner: allow only top-level Markdown and explicitly referenced raster images inside `worlds/`; never export arbitrary repo files. `static-content.ts` emits only to build output (relative `BASE_URL`, no `/api` or GitHub API in production).
- `reader/src/sync.ts`: serialize/coalesce refreshes, commit changed worlds atomically, skip unchanged revisions, preserve reading position & settings on refresh/failure (online 30s, local 5s).
- `reader/server/worlds-plugin.ts`: keep scans serial; record invalidation during active scans and coalesce trailing scan without dropping changes; detach watchers/timers on close.

## Safety & Delivery
- Read/write UTF-8. Never open or output `.env`, `.dev.vars`, private keys, keystores, tokens, cookies, or credentials.
- Daily commits may go directly on `main` with specific messages; stage explicit paths only. Deploying, publishing, dependency updates, or external actions require explicit authorization. After an authorized Pages release, verify the exact commit's Actions run, live manifest, document/map bytes, and interactions.
