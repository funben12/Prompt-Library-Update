## Project

Prompt Library Pro — local-first Windows desktop app for storing, organising, and running AI prompts. No cloud, no accounts, no internet required.

**Context (2026-09-16):** the app may be shown to, or invested in by, an outside party. Until told
otherwise, treat any visual/UX work here with an investor-demo bar, not a normal internal-tool
polish pass — clean typography and spacing, real hierarchy, no "default AI slop" card grids.

---

## Stack

- Python 3.9+, Flask 3.0.0, flask-cors 4.0.0, PyWebView 5.3.2, waitress 3.0.0
- SQLite (`PromptLibrary.db`), PyInstaller (`PromptLibrary.spec`), Inno Setup (`PromptLibrary.iss`)
- Frontend: vanilla JS (single `static/app.js`, ~18k lines, IIFE), Tailwind via CDN, no build step

---

## Browser verification

Whenever checking the running app in a browser (visual review, clicking through a flow, reading
console/network state), use the Playwright MCP tools. Do not use any other browser tool for this
project.

---

## Commands

```
start.bat              # create/activate venv, install deps, run Main.py (dev)
python3 update_hash.py # MD5 cache-bust hash for app.js -- run after every app.js edit
node --check static/app.js       # JS syntax check
python3 -m py_compile app.py     # Flask syntax check
Build.bat / BUILD_INSTALLER.bat  # PyInstaller build + Inno Setup installer
```

No test suite, no linter, no package.json. Verification is manual: syntax checks above + running the app.

---

## Architecture

- `Main.py` -- entry point, launches Flask + PyWebView, handles frozen-vs-dev path resolution
- `app.py` (~2.6k lines) -- Flask app: DB init/schema (`init_db()`), all `/api/*` routes, serialisation helpers. One file, no blueprints
- `static/index.html` (~3.4k lines) -- all markup; 11 `<script>` tags (components-data, forge-frameworks, xray-views, qrcode.min, combine-prompts, app.js, randomiser-motion, vartypes-3d, deck-shuffles, dice-rolls, inline bootstrap)
- `static/app.css` (~270KB) -- all styling, cache-busted via `app.css?v=[hash]` in index.html
- `static/app.js` (~18k lines) -- entire frontend logic in one IIFE: `state` object, render functions, workspace init/open functions, API calls
- `static/components-data.js` -- static prompt-component library data, separated from app.js because of size
- `licence_api.py`, `licence_ui.js` -- licence validation, kept separate from core app logic
- DB tables (see `init_db()` in app.py): settings, folders, prompts, prompt_versions, variable_templates, usage_log, chains, meta_blueprints, roles, taxonomy_domains, taxonomy_use_cases, prompt_relationships
- `_rollbacks/` -- manual snapshots of index.html/app.js kept for recovery; `_archive/` -- retired code/docs
- `Prompt Library Interface Files/` -- per-view reference extracts, see below

---

## `Prompt Library Interface Files/` -- how Eugene points at what to upgrade

One folder per user-facing screen (29 of them: sidebar, library main, prompt viewer, settings,
command palette, workspaces launcher, and every workspace). Each holds `markup.html`,
`styles.css`, `script.js`, `preview.html`, `README.md` for that screen only, cut out of the
three monolith files. `_shared/` holds global tokens/primitives CSS and shared JS helpers.

**Purpose: this is how Eugene shows which interface he wants upgraded.** When he names a
folder, or drops one of these files in, that folder IS the scope of the work -- read
`markup.html`, `styles.css` and `script.js` there to see the current state of that screen
before proposing or making changes. Don't go spelunking through the 18k-line `app.js` to
work out what a screen looks like; the folder already isolates it.

**These are reference copies, not the live app.** The app loads `static/index.html`,
`static/app.css`, `static/app.js`. Work out the change against the folder, then port it into
`static/` by hand, following the hard rules below. Never treat editing a folder file as
shipping the change.

### Porting a change back into the main system

Every edit made under `Prompt Library Interface Files/<view>/` has to land in the real
files before it exists in the app. Checklist, every time:

1. **HTML** (`markup.html`) -> find the matching block in `static/index.html` by its root
   `id` and replace it there (bash + Python `content.replace()`, per hard rule 1 -- never
   Edit/Write on this file).
2. **CSS** (`styles.css`) -> add/update the same rules in `static/app.css`. If a rule you
   need already exists in `_shared/shared.css`, it lives in `app.css` too (that file is a
   split view of `app.css`, not an addition to it) -- change it once, in `app.css`.
3. **JS** (`script.js`) -> add/update the same functions inside the `static/app.js` IIFE
   (bash + Python `content.replace()`, same rule 1). If the change touched
   `_shared/shared.js`, the target is still `app.js` -- that file is shared logic already
   living there, not a separate module to sync.
4. `node --check static/app.js` and `python3 -m py_compile app.py`.
5. `python3 update_hash.py` -- every `app.js` or `app.css` change needs a fresh cache-bust
   hash or the browser keeps serving the old version.
6. Re-run the extractor so the reference folder reflects what's now live (optional but
   keeps the two in sync):
   ```
   python "Prompt Library Interface Files/_shared/extract_views.py"
   ```

The folder is a workbench, not a second copy of the app -- nothing there runs until step 1-5
land in `static/`.

Regenerate after the monolith files change (overwrites the whole folder, so port back first):

```
python "Prompt Library Interface Files/_shared/extract_views.py"
```

Split is heuristic: CSS lands in a view when a selector names one of its ids or a class used
by at most two views; JS lands in a view when a function names its ids or carries its prefix.
Anything broader falls into `_shared/`. So a rule missing from a view folder may still exist
in `_shared/shared.css` -- grep both before concluding something isn't styled.

**Why one-file app.js/index.html instead of modules:** no build step by design (Tailwind CDN, PyWebView loads static files directly) -- see Key Principle 9, monolith growth is a known failure mode, not an intentional pattern to continue.

---

## Conventions actually in the code

- JS: camelCase for functions/variables (`openXxxWorkspace`, `initXxxWorkspace`, `state.isPremium`)
- Python: snake_case (`get_data_dir`, `_prompt_payload`, `serialize_prompt`)
- Flask routes: private helpers prefixed `_` (`_json_body`, `_normalise_list`, `_folder_id`)
- Comments: plain English, one line, imperative. No paragraph comments, no docstring blocks
- No new dependencies without explicit approval. No schema migrations without explicit approval
- Premium-gated features: `premium-locked` class on the HTML element + `state.isPremium` check in JS. **Since 2026-11-16 there is no free tier inside the app**: a first launch licence screen (`#activationGate`) asks for the key and, once a valid key is saved, every lock and limit is gone. Do not reintroduce `FREE_LIMITS` or upgrade toasts. The old `premium-locked` markup and `state.isPremium` checks are now dead code kept for safety.

---

## Hard rules -- never touch without asking

1. **Never use the Edit or Write tool on this project's static/app.js or static/index.html.** Historically (bindfs mount, confirmed 2026-06-21) the Edit/Write path silently truncated growing files back to their previous length, and its own success message did not reflect this. Root mount has since changed to native Windows (per 2026-07-25 memory) so this may no longer reproduce -- but it has not been re-verified. Until confirmed safe, keep using bash + Python `content.replace()` for edits to these two files, and verify independently via bash after every write.
2. **No schema changes, no new dependencies** without explicit approval (Editorial Rules + Key Principle 6).
3. **Run `python3 update_hash.py` after every app.js change** -- the script tag must carry `app.js?v=[8-char hex]` or the browser serves a stale cached copy.
4. **Do not grow app.js or index.html arbitrarily.** Monolith growth was the V1 failure mode.
5. **New workspace build order is fixed:** (1) `openXxxWorkspace()`, (2) nav route in `init()`'s `.nav-item[data-view]` handler, (3) `'#xxxWorkspace'` added to `_escapeToLibrary()`, (4) `initXxxWorkspace()` called from BOOTSTRAP -- only then add the HTML. A `data-view` button with no handler fails silently.
6. **No duplicate CSS rule blocks** targeting the same ID/class under a different activation class name (e.g. `.ob-active` vs `.active`) -- the earlier block wins silently. Grep before appending new CSS.
7. **Overlay/modal HTML order before `</body>`:** viewer -> onboarding overlay -> toast container. Never after script tags.
8. **Editing a file under `Prompt Library Interface Files/` is not shipping the change.** That folder is reference only. Every change has to be ported into `static/index.html` / `static/app.css` / `static/app.js` and verified there.

---

## Gotchas (week 1)

- **No build step.** Editing app.js/index.html directly IS the deploy for dev; there's no bundler to catch mistakes -- syntax-check manually (`node --check`).
- **Cache busting is manual.** Forgetting `update_hash.py` means your JS change silently doesn't show up in the running app (stale cache).
- **Frozen vs dev paths differ.** `get_data_dir()` / `get_static_dir()` in app.py branch on PyInstaller frozen state -- don't hardcode paths relative to the source tree.
- **Flask/PyWebView startup race.** Main.py polls the socket to confirm Flask is up before WebView loads the page -- don't remove that wait.
- **Async loaders need try/catch around every render call inside them,** or a failed fetch silently blanks the UI with no error surfaced.
- **NUL bytes and truncation have hit this file before.** Before trusting static/index.html or app.js, sanity check: `grep -c "<script" static/index.html` should be 11; `node --check static/app.js` should pass and end in `})();`.
- **PromptLibrary.db and PromptLibrary.db-journal are live SQLite files in the repo root** -- don't blindly overwrite/delete, the journal implies an interrupted write.
- **licence_api.py / licence_ui.js are a separate system from the main prompt CRUD** -- don't conflate premium-gating logic with licence validation logic.
- **`.chain-step` / `.chain-step-num` / `.chain-step-body` are already taken.** An unrelated chain-search picker elsewhere in `app.css` (~line 1479) uses these exact class names with `display: grid; grid-template-columns: 32px 1fr auto`, which silently breaks any other feature that reuses them (missing `display` overrides leak straight through the cascade). The Prompt Chain workspace uses `chainw-step` / `chainw-step-num` / `chainw-step-body` instead -- grep for a class before reusing it, don't assume `chain-` prefixed names are free.

---

## Triage: "prompts not showing"

1. `grep -c "<script" static/index.html` -> must be 11, else file truncated
2. `node --check static/app.js` -> JS syntax error
3. `python3 -m py_compile app.py` -> Flask startup error
4. Check render calls inside async loaders are wrapped in try/catch
---

## Current implementation state, 2026-10-06

This section supersedes older state descriptions where they conflict.

### October 5, 2026 architectural direction

- The application remains a local-first Windows desktop app with Flask, PyWebView, SQLite, vanilla JS, no cloud requirement, and no account system.
- The attempted account management layer was fully reverted. Do not reintroduce account profiles, authentication, account switching, account memory, passwords, account-specific licence state, or account-lock UI unless explicitly requested.
- The existing SQLite database and Prompt Components graph core were preserved while the account layer was removed.
- Recent smoke testing was refocused on database integrity and Prompt Components graph persistence, rather than account auditing.
- Licence validation remains a separate premium system. Do not conflate licence validation with the removed account system.

### Prompt Components is now a serious node canvas

The Prompt Components workspace is no longer just a basic drag-and-drop node editor. Recent work upgraded the canvas interaction model substantially:

- Component nodes can be resized, with resize state controlling rendered dimensions.
- Marquee/multi-selection and alignment controls were added.
- Canvas selection and alignment feedback was improved.
- Connection creation has live edge previews and selection feedback.
- Edge endpoints are explicit and can be reconnected.
- Connection inspector editing was added.
- Text input focus is preserved while editing connection data.
- Continuous node dragging works across canvas rerenders.
- Canvas navigation and restored node sizing were polished.
- Graph prompt compilation was improved for branches and convergence.
- Existing graph/database persistence must remain intact when changing this workspace.
- The target UX direction is closer to a professional visual editor, not a generic node demo. Think Figma, tldraw, or React Flow quality in interaction depth, while retaining the product's prompt-specific purpose.

### Memory update requirement

After every substantial repository change, Claude must update MEMORY.md in the same change sequence.

A change is substantial when it changes functionality, architecture, UX, workspace behaviour, persistence, licensing, project direction, important bugs, or another decision that would materially affect future development.

If a change contains Claude-specific working context, also update the appropriate Claude-specific notes. Do not wait for a separate request.

The memory update must describe the resulting state, not merely the intention. Keep it concise and supersede stale guidance when necessary.

## Prompt Forge

The 2026-10-05 Prompt Forge workbench redesign and stylesheet cache refresh were reverted because the new visual treatment was not preferred. The pre-redesign Prompt Forge layout is the current baseline. Do not reapply the reverted workbench styling or cache version unless explicitly requested.

### Workspace suite consolidation

The October 5 work added and wired a broader prompt-engineering tool suite, then removed redundant evaluation/workflow tools after review. The current live suite must be treated as the source of truth in the live static files and launcher, not older changelog entries or abandoned workspace experiments.

Current live specialised workspace IDs include:

- fill, Quick Fill
- audit, Prompt Auditor
- diff, Diff Lens
- cost, Cost Lens
- pulse, Library Organizer
- xray, Prompt X-Ray
- splice, Prompt Splicer
- generate, Prompt Generator
- example, Prompt from Example
- adapter, Model Adapter
- simplify, Prompt Simplifier
- tone, Tone & Style Rewriter
- translate, Prompt Translator
- gauntlet, Gauntlet Loop
- batch, Batch Runner

Do not assume every workspace ever mentioned in the changelog still exists. Always verify the live files before modifying workspace architecture.

### Recent stability work

Recent fixes also include:

- repaired app.py syntax after database-initialisation corruption
- removed obsolete app - v1.py
- fixed remaining workspace dialogs so they can close correctly
- refreshed workspace launcher state after workspace removal
- preserved the existing Prompt Components graph/database core during account-system removal
- restored an existing premium licence key through the normal licence system

### Randomiser motion (dice, card deck, random pick, random number)

These have broken into a still flip more than once after updates. Rules that keep them moving:

- The result is picked first with `_PL_rand` (crypto, rejection sampling). The animation only reveals it.
- How much motion plays is the app's own setting (Settings, Randomiser motion: Full, Short or Off, localStorage `pl.randomMotion`, default Full). Never gate it on `prefers-reduced-motion` again: Windows "Animation effects" off was what flattened it.
- Motion is Web Animations API in `static/vartypes-3d.js` and `static/randomiser-motion.js`, so the global reduced motion rule in `app.css` cannot kill it. Do not move it back to CSS transitions.
- Load order is app.js, randomiser-motion.js, vartypes-3d.js, all `defer`, all cache-busted by `update_hash.py`. If either file fails, app.js still draws its own dice, deck and text reel.
- Run `tests/randomiser` after touching any of this.

### Working principle

For future changes, prefer surgical upgrades to the live architecture over adding parallel systems. Preserve the SQLite schema and existing graph data unless a schema change is explicitly approved. Before adding a workspace, first check whether an existing workspace already covers the same job.

## Android companion app (Prompt Library Mobile)

The phone app lives in the separate repo `funben12/AI-App-Factory`, folder `apps/app-003-prompt-library-mobile` (v0.7.1). It is not part of this repo's build. Read its `specification.md` and `architecture.md` before touching anything that has to stay in step with it.

- **Same rules, different code:** no AI key and no account on the phone, ever. Workspaces that call an AI on desktop are not ported. Tools that only build text are.
- **Phone tools (Tools hub):** Prompt Forge, Quick Fill, Prompt Components, Gauntlet Loop, AI Teammate, Prompt Splicer, Prompt Board, Library Organizer, Backup and restore, Prompt Auditor, Prompt X-Ray. Each is its own `assets/tools-*.js` file registering `PL_TOOLS[view]`.
- **Redesigned for the phone, not copied:** Quick Fill is guided, one blank per card, using every variable type. Prompt Components is a stacked block builder, not the node canvas. Splicer defaults to by part. Prompt Board is local to the phone.
- **Must stay in step with desktop:**
  - `static/components-data.js` feeds the phone through `scripts/build-components-data.js` in the AI-App-Factory app folder. Rerun it when blocks or frameworks change here.
  - `static/forge-frameworks.js` is copied to the phone as `forge-frameworks.js`.
  - `static/xray-views.js` (Prompt X-Ray views) is copied to the phone as `xray-views.js`, byte for byte.
  - `variable_meta` (type, default, options, visible, multi, wrap) and nearby share (`share_server.py`, `/api/share/send`) carry variable types both ways. Changing either needs the phone's `vartypes.js` and `MainActivity.java` checked.
  - The Gauntlet Loop text is shared word for word with the phone (`_gauntTemplate` here, `tools-build.js` there).
  - `static/vartypes-3d.js` (3D dice, card deck, and the random pick and random number drums) is the phone's `assets/vartypes-3d.js` byte for byte. Edit it on the phone side, copy it here, then run `python3 update_hash.py`. `tests/randomiser` fails if the two differ (set `PHONE_ASSETS`).
- **Baseline (2026-10-09):** current main of both repos, after the 2026-10-09 variable type PR merges, is the version Eugene uses. Clean up starts from it. Do not compare against the APKs uploaded or committed so far: both are older, pre-cleanup builds. The reference phone build is the latest "Build Prompt Library Mobile APK" release from AI-App-Factory main. See MEMORY.md, BASELINE.
- **Phone-side gotchas:** the Android WebView has no Material Symbols font, so icons are inline SVG. Phone data is in IndexedDB (`prompt-library`, prompts only) and localStorage (boards, drafts, custom frameworks). Library Organizer deletes by writing IndexedDB directly. Backup restore keeps a safety copy in IndexedDB `prompt-library-safety`.
- **Verification:** headless Chromium at 390 x 844 against the phone's `assets/index.html`. It has not been run on a physical phone yet.

---

## Prompt Builder Pro (added 2026-11-13)

A Pro workspace opened from the launcher's My Favorites list. It is a node canvas that wires blocks and agent teams into one compiled prompt. All five phases of its handover are built. Details are in MEMORY.md, the source file and handover are in `docs/prompt-builder-pro/`.

**It does not live in `app.js`.** Four files own it:

- `static/builder-pro-engine.js` -- compile engine and templates, lifted unchanged from the standalone tool, no DOM. Exposes `window.PLBuilder`. Do not edit it to add features, extend from `builder-pro.js`.
- `static/builder-pro.js` -- the interface. Exposes `window.openBuilderProWorkspace`, `window.PL_closeBuilderPro`, `window.__pb` (for tests).
- `static/builder-pro.css` -- all its styles.
- `static/builder-pro-showcases.js` -- the Learn tab's Showcases: nineteen complete workflows in five groups as data (chapters of blocks and wires) plus `PB.showcaseBuild`. The player is in `builder-pro.js`. Check any change with `node tests/builder-showcases/validate.js`.
- Builder Pro reaches the library's AI key only through `window.PL_ai` (`info()` and `ask()`, defined next to `callAI` in `app.js`, no advisor model, JSON reply). Do not read the key from `localStorage` in `builder-pro.js`.

`index.html` only holds the empty root `<div id="builderProWorkspace">`, one stylesheet link, and one loader line in the inline script.

**Rules for this workspace:**

1. Every id and class is prefixed `pbp-`, and every CSS rule sits under `#builderProWorkspace`.
2. Colours come from `app.css` tokens only. No hex values, no blur. Icons are Material Symbols.
3. Listeners go on the workspace root. The one `document` keydown listener must keep returning at once while the workspace is closed.
4. **Cache busting is separate.** `update_hash.py` does not touch these files. They carry a hand-set `?v=` value in `index.html` (two places, currently `20261116k`). Bump it whenever one of the four files changes.
5. Saved flows and layout are localStorage only (`prompt-builder-pro.v5`, `.workshop.v1`, `.panes.v1`, `.tour.v1`, `.learn.v1`). The quick tour flag and finished lessons are also kept in the database through `window.PL_prefs` (`builder_tour`, `builder_learn`) because WebView storage can reset. No schema change.
6. It shares the Component Library with Prompt Components through `window.PL_galleryBorrow` in `app.js`. Never build a second component dataset, and never edit `static/components-data.js` for this workspace.
7. The `body.is-premium` check at the top of `openBuilderProWorkspace` is a leftover: there is no free tier any more (see the licence screen), so it never refuses anyone after activation.
8. **New agent blocks and lessons live in `builder-pro.js`, not the engine:** `MORE_AGENTS` registers extra blocks into `PE.BLOCKS` and `PE.LIBRARY` (the engine treats every block in the `agents` category as a team member) and `LESSONS` drives the Learn tab. A block needs its ports, `about`, `use` and `defaults`; extra fields are not compiled unless the engine's `blockText` handles that type, so keep new agents to the one text field.

**Launcher:** list headers are buttons that collapse their list (`pl_ws_collapsed` in localStorage). A new launcher list needs an icon colour rule beside the others in `app.css`.

**Corrections to older notes in this file (checked 2026-11-13):**

- `grep -c "<script" static/index.html` is **11** (re-checked 2026-11-16, combine-prompts.js restored; was 10 on 2026-11-15, deck-shuffles.js and dice-rolls.js added: components-data, forge-frameworks, xray-views, qrcode.min, app.js, randomiser-motion, vartypes-3d, inline bootstrap), not 5 or 3. Use 10 in the truncation check and the triage list.
- `Prompt Library Interface Files/` is not in this git repository. It may exist only on Eugene's machine. If it is missing, work from the live files in `static/`.
- Browser checks in cloud sessions have been run with scripted Playwright (the `playwright` Node library with headless Chromium) against a disposable data folder. The Playwright MCP tools were not tried there, so the rule above still stands for local sessions.
