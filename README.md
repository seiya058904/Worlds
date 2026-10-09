 <h1 align="center">🌌 Worlds</h1>

<p align="center">
  <strong>Four universes. Countless histories. One living archive.</strong>
</p>

<p align="center">
  An evolving library of imagined civilizations, histories, maps, and lore.<br>
  Built in Markdown. Preserved with Git. Designed to be read.
</p>

<p align="center">
  <a href="https://seiya058904.github.io/Worlds/"><strong>📖 Enter the Library</strong></a>
  &nbsp;·&nbsp;
  <a href="#the-four-worlds">🗺️ Explore the Worlds</a>
  &nbsp;·&nbsp;
  <a href="#start-reading">🚀 Start Reading</a>
  &nbsp;·&nbsp;
  <a href="#for-developers">⚙️ For Developers</a>
</p>

<p align="center">
  <sub>FOUR WORLDS &nbsp; · &nbsp; MARKDOWN FIRST &nbsp; · &nbsp; GIT-VERSIONED &nbsp; · &nbsp; READ-ONLY LIBRARY</sub>
</p>

---

> **Not every world needs to become a novel. Some are worth building simply to exist.**
>
> *Worlds* is a personal worldbuilding archive. Its manuscripts—not a game, a story outline, or the reader application—are the work itself. The website opens a window into those worlds without changing their canon.

<a name="the-four-worlds"></a>
## 🗺️ The Four Worlds

Four independent settings, each maintained as **one complete Markdown manuscript**. Their original titles are preserved here.

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🌠 <a href="worlds/人界.md">人界</a></h3>
      <p><sub>CULTIVATION · COSMIC HISTORY</sub></p>
      <p>Nine major races across eight cosmic domains. Cultivation, imperial eras, ancient forbidden regions, and the legacies of emperors and Dao sovereigns shape a universe with a long and contested past.</p>
    </td>
    <td width="50%" valign="top">
      <h3>🏰 <a href="worlds/西幻世界.md">西幻世界</a></h3>
      <p><sub>HIGH FANTASY · WORKING TITLE</sub></p>
      <p>A continent of five principal races, a 1–100 level system, an ancient limit at level 70, and ten artifacts powerful enough to influence the rules of the world.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🚀 <a href="worlds/星星联邦.md">星星联邦</a></h3>
      <p><sub>STELLAR FEDERATION · CIVILIZATION</sub></p>
      <p>An interstellar federation of member civilizations, shared routes, vast industry, postwar politics, and a strategic divide between the established P-series and closely guarded S-series technologies.</p>
    </td>
    <td width="50%" valign="top">
      <h3>⚔️ <a href="worlds/宋世江湖.md">宋世江湖</a></h3>
      <p><sub>MARTIAL WORLD · LIVING CHRONICLE</sub></p>
      <p>A Song-inspired martial world of rival schools, master–disciple lineages, regional rankings, northern and southern lists, and legendary figures whose stories survive as chronicles and rumor.</p>
    </td>
  </tr>
</table>

The manuscripts and their referenced maps are the **single source of truth**. The library is a way to explore them, not a second copy of their content.

## ✨ Inside the Reading Room

A long-form reading experience built around the shape of the manuscripts—not around a conventional wiki or an editable database.

- 📚 **Chapter by chapter** — Browse a structured table of contents and move naturally between chapters.
- 🔎 **Find a passage** — Filter the contents or press `Ctrl+K` to search across all four worlds.
- 🗺️ **Explore original maps** — Open maps referenced by the manuscripts, with zoom, pan, and full-screen viewing.
- 🌓 **Make reading comfortable** — Adjust type, spacing, and reading preferences; your browser remembers them.
- 🔄 **Follow a living archive** — The local reader reflects edits, while the published site checks for new deployed revisions and tries to preserve your place.
- 🛟 **Keep reading through interruptions** — If an update fails, the reader retains the last successfully loaded content rather than replacing it with an incomplete revision.

> [!IMPORTANT]
> **The reader is read-only.** Neither the published library nor the local reading interface can edit the manuscripts, settle conflicting lore, or publish changes to GitHub.

<a name="start-reading"></a>
## 🚀 Start Reading

### 🌐 Online library

**[Open Worlds · Library →](https://seiya058904.github.io/Worlds/)**

Read the published collection in your browser. Changes to source Markdown appear online only after they have been committed, pushed, and successfully deployed.

### 💻 Local library (Windows)

1. Open the repository folder.
2. Double-click **[`启动阅读器.cmd`](启动阅读器.cmd)**.
3. Read at **http://127.0.0.1:4175/**.

The first launch may need internet access to install the locked reader dependencies. Keep the launcher window open while using the local library. A supported Node.js installation is required (22.12+; Node 24 LTS recommended).

<a name="for-developers"></a>
## ⚙️ For Developers

The reader uses **React, TypeScript, and Vite**. The world manuscripts stay in [`worlds/`](worlds/); reader code, tests, and generated output stay under `reader/`.

<details>
<summary><strong>🛠️ Development, tests, and production preview</strong></summary>

From the repository root:

```powershell
cd reader
npm ci
npm run dev
```

For validation and a production preview (from `reader/`):

```powershell
npm test
npm run build
npm run preview
```

- Development: `http://127.0.0.1:4175/`
- Production preview: `http://127.0.0.1:4176/`
- Serve the build over HTTP; opening the generated HTML directly is not a supported reading workflow.
- Deployment is handled by the existing GitHub Actions workflow after changes reach `main`.

</details>

### Repository map

```text
worlds/           Canonical manuscripts and referenced maps
INBOX.md          Unsorted ideas and uncertain notes
reader/           Read-only app, content scanner, build and tests
启动阅读器.cmd     Windows local reader launcher
AGENTS.md         AI-assisted editing and repository rules
```

## ✍️ Authorship & Canon

The author owns the worlds and decides what is canon. AI may assist with organizing, analyzing, or polishing material, but it cannot independently make a proposal official.

**Capture → Organize → Verify → Commit**

1. **Capture** ideas in [`INBOX.md`](INBOX.md) when their place in a world is uncertain.
2. **Organize** confirmed material inside its world's single Markdown manuscript.
3. **Verify** the distinction between established canon, unresolved contradictions, and possible extensions.
4. **Commit** deliberate changes with Git; the library reflects the published state rather than editing it.

The full collaboration rules and validation boundaries are documented in [`AGENTS.md`](AGENTS.md).

---

<p align="center">
  <sub>Worldbuilding is the work. The library is the doorway.</sub><br>
  <sub>No repository-wide open-source license has been declared.</sub>
</p>
