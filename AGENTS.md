# Repository Guidelines

## Project scope

Worlds is a private multi-worldbuilding Markdown notebook, maintained with Git. The worldbuilding itself is the project; do not turn it into a novel-production system. The author owns final canon decisions. AI acts as an editor, organizer, analyst, and worldbuilding assistant.

## Repository structure

- `README.md` explains the project and indexes the worlds.
- `worlds/<world-name>.md` contains one complete world per Markdown file. Keep characters, geography, history, factions, timelines, items, civilizations, technology, and power systems inside that world file as readable sections.
- `INBOX.md` is the only intentionally unstructured inbox for notes whose world or status is uncertain.
- `.reasonix/` and `.workbuddy/` are local editor metadata and are ignored by Git.

Do not create split directories such as `characters/`, `history/`, `geography/`, `factions/`, `timeline/`, `lore/`, `archive/`, `resources/`, `plans/`, or `database/`. Do not introduce databases, scripts, state machines, workflows, templates, or JSON/YAML data structures for world content.

## Canon and editing rules

- A user statement made in definite language is normally formal canon.
- Uncertain user ideas belong in `未定设定` or `候选扩展`, never in formal canon by assumption.
- AI-generated ideas are proposals and must remain in `候选扩展` until the user explicitly accepts them.
- Preserve both sides of unresolved canon conflicts, record the issue in `未定设定`, and report it. Only obvious wording errors may be corrected directly.
- Preserve the author's meaning while improving order, headings, wording, and readability. Update `README.md` only when the world index changes or a world summary genuinely changes.
- Keep the lightweight outer sections where applicable: `世界速览`, `正式设定`, `当前世界状态`, `未定设定`, `候选扩展`, `灵感池`, `当前空白`, and `废弃设定`.

## Validation and commands

This is a Markdown-plus-Git repository with no dependency manifest, build system, test suite, linter, type checker, or CI/CD configuration. There is no project-specific build or test command. For content changes, inspect the affected Markdown from start to finish, verify headings and canon boundaries, and use the relevant Git checks:

```powershell
git diff --check
git status --short
git diff --name-only
```

Read and write text as UTF-8. Do not open or output `.env`, `.dev.vars`, private keys, keystores, tokens, cookies, or other credentials.

## Git and collaboration

Make focused changes only. Preserve unrelated user modifications. Daily project commits may be made directly on `main`; use a simple, specific message such as `Expand northern empire history` or `Import original western fantasy notes`. Do not deploy, publish, update dependencies, or perform external actions unless explicitly authorized. Before committing, inspect the final diff, run `git diff --check`, and stage only the intended files. Never use broad staging or destructive cleanup commands.

## AI boundaries

Read `README.md` and this file before working. Read the target world file before editing it. Do not infer a target world when the source is ambiguous; place the material in `INBOX.md`. Do not silently promote proposals, resolve formal conflicts, restore abandoned Story/novel plans, or add unrelated structure. Keep world files suitable for a complete human reading rather than turning headings into database fields.
