# Prompt Builder Pro: Claude Code handover

Date: 13-11-2026
Target repo: `funben12/Prompt-Library-Update` (checked at commit `37a1491`, 11-11-2026)
Source file to port: `12-11-2026-prompt-builder-pro-agent-teams.html`

## 1. THE JOB IN ONE PARAGRAPH

Port the standalone Prompt Builder Pro file into the Prompt Library as a new workspace. Give it its own launcher list called My Favorites, placed to the left of Build. Make every launcher list collapsible. Restyle the builder with the Prompt Library's own design tokens. It must open instantly.

## 2. WHAT EXISTS TODAY

| Item | State |
| :--- | :--- |
| Standalone builder (single HTML file) | Working. Tested in headless Chrome at desktop and phone widths |
| Compile engine, 112 blocks, 13 templates, agent teams, Markdown import | Inside that file, in three `<script>` blocks |
| Anything in the Prompt Library repo | Not started. No file in the repo has been changed |
| Earlier "Expert" list idea | Replaced by My Favorites |

The builder file has three scripts in this order: the engine (`var PromptEngine = ...`), the templates (`const TEMPLATES = ...`), and the interface (one IIFE). The engine has no DOM access and can be lifted out unchanged.

## 3. DECISIONS

Made:

1. New launcher list named My Favorites, first in the launcher, left of Build.
2. It holds one card for now: Prompt Builder Pro. Eugene will name more later.
3. Every launcher list can be collapsed and reopened.
4. The workspace uses the Prompt Library design system, light and dark.
5. Opening the workspace must feel instant.

Open, ask Eugene before building:

| # | Question | Default if he says "your call" |
| :- | :--- | :--- |
| 1 | Native port or iframe (see section 4) | Native port |
| 2 | Is the card Pro gated (`data-premium="true"`) like most Build cards? | Yes |
| 3 | The left nav already has a Favorites view for starred prompts. Is "My Favorites" still the right name for a launcher list of tools? | Keep the name, use a different icon |
| 4 | With six lists the launcher grid wraps to two rows. Keep four columns, or go to six narrower ones? | Keep four, rely on collapse |

## 4. NATIVE PORT OR IFRAME

**A. Native port: builder markup, CSS and JS become part of the app.**

- For: uses the app tokens directly, so light and dark themes work with no extra code.
- For: can reuse the existing component gallery and dataset in phase 2.
- For: one toast, one focus order, one Escape behaviour.
- Against: every id, class and global in the builder must be renamed and scoped.
- Against: more work, more chance of touching `app.js`.

**B. Iframe: ship the HTML file in `static/` and show it inside a workspace shell.**

- For: an hour of work, almost no risk to the existing app.
- For: nothing to rename, no CSS collisions.
- Against: tokens must be copied in and kept in step by hand; theme changes need messaging.
- Against: reusing the component gallery needs `postMessage` plumbing.
- Against: feels bolted on.

Decision rule: if the component library connection (phase 2) is definitely wanted, choose A. If the goal is to have the builder inside the app this week and decide the rest later, choose B, and treat A as a later rewrite.

## 5. REPO FACTS (VERIFY BEFORE RELYING ON THEM, LINE NUMBERS DRIFT)

Stack: Flask, one page, `static/index.html` (about 5,000 lines), `static/app.js` (about 23,600 lines), `static/app.css` (about 10,800 lines). No build step.

**Launcher**

- Markup: `#workspacesLauncher` > `#launcherGrid` > `.launcher-group[data-group]` > `.launcher-group-label` + `.launcher-grid` > `button.launcher-card[data-open]`.
- Lists today, in order: `build`, `refine`, `inspect`, `run`, `protect` (`index.html` near 4489 to 4761).
- `#launcherGrid` is a four column CSS grid (`app.css` near 8437). Lists are columns, so "left of Build" means first in the DOM. It drops to two columns, then one, at the breakpoints near 8513.
- Icon colour per list is set by `.launcher-group[data-group="..."] .launcher-card-icon` near 8520.
- Click handling: `app.js` near 18645. It reads `card.dataset.open` and calls `window[fn]()`. Premium check is `card.dataset.premium === 'true' && !state.isPremium`.
- Search filter (same area) hides cards, then hides any list with no visible cards. Collapse must not fight this.
- There is no collapse behaviour today.

**Adding a workspace**

- Hard rule 5 in `CLAUDE.md` fixes the order: open function, nav route, `_escapeToLibrary()` entry, init call, then the HTML.
- `_escapeToLibrary()` is in `app.js` near 4985. It holds a list of workspace selectors.
- Workspace shell pattern: a fixed, full screen `div` that gets the class `open`. See `#componentsWorkspace` in `index.html` near 3166 and its CSS near `app.css` 6229. Shared header classes: `ws-header`, `ws-header-left`, `ws-header-icon`, `ws-title`, `ws-subtitle`, `ws-header-actions`, `ws-body`.
- Shared controls: `btn`, `btn-ghost`, `btn-accent`, `icon-btn`, `form-input`.
- Precedent for a separate script file: `static/gauntlet-suite.js` is injected by the inline script at the very end of `index.html`. `static/prompt-components-node.js` and its CSS are also separate files.
- `PromptLibrary.spec` packages the whole `static` folder, so new files in `static/` ship automatically.

**Hard rules that bite here**

1. Never use the Edit or Write tool on `static/app.js` or `static/index.html`. Use bash plus Python `content.replace()`.
2. No schema changes and no new dependencies without approval.
3. Run `python3 update_hash.py` after every `app.js` or `app.css` change.
4. Do not grow `app.js` or `index.html` arbitrarily.
5. Fixed build order for a new workspace (above).
6. No duplicate CSS rule blocks. Grep before appending.
7. Update `MEMORY.md` after every substantial change.

**Component library (phase 2 only)**

- Dataset: `static/components-data.js` exposes `window._pcwBLOCKS`, `window._pcwCATEGORIES`, `window._pcwFRAMEWORKS`. A block is `{ cat, icon, label, text }`. A framework is `{ badge, name, desc, text }`.
- Gallery: `#pcwGallery` inside `#componentsWorkspace`, driven by `_galOpen`, `_galClose`, `_galCart`, `_galCheckout` in `app.js` near 11950 to 12040. `window.PL_openComponentGallery` is already exposed.
- `_galCheckout` is the single point where the kit is pushed onto the Components canvas. That is the place for a "send to Workshop instead" switch.
- Gallery click handlers are wired the first time `openComponentsWorkspace()` runs, not at boot.
- Gallery CSS is not scoped to `#componentsWorkspace`, and the gallery is `position: absolute; inset: 0`, so the node can be moved into another workspace and back.

## 6. DESIGN SYSTEM MAPPING

The builder file uses its own dark tokens. Replace every one with the app's variable. Do not hard code a colour.

| Builder file | Prompt Library |
| :--- | :--- |
| `--background` | `--bg` |
| `--surface` | `--surface-2` |
| `--card` | `--surface` |
| `--card-raised` | `--surface-3` |
| `--border`, `--input` | `--line` |
| `--foreground` | `--ink` |
| `--muted-foreground` | `--ink-2` or `--ink-3` |
| `--faint` | `--ink-3` (not `--ink-4`, which fails body text contrast) |
| `--primary` | `--accent` |
| tinted primary fills | `--accent-soft`, borders `--accent-line` |
| `--ring` | `--ring` |
| `--destructive`, `--warning` | `--danger`, `--warn`, with their `-soft` pairs |
| category hues | the `--c-*` categorical tokens, on icons only |
| `--radius-sm`, `--radius`, `--radius-lg` | `--r-sm`, `--r-md`, `--r-lg` |
| `--s1` to `--s8` | `--sp-1` to `--sp-6` (nine step scale, do not round) |
| DM Sans | `--ff-sans` (Instrument Sans) |
| headings and workspace title | `--ff-display` (Fraunces), via `ws-title` |
| JetBrains Mono | `--ff-mono` |
| `--fast`, `--base`, `--ease` | `--t-fast`, `--t-base`, `--ease-out-quart` |

Rules from the design system that change the builder's look:

1. No blur or glass. The floating inspector and canvas pills become solid `--surface` with a `1px solid var(--line)` border and `--shadow-md`.
2. No letter monograms (`R`, `SYS`, `MAG`). Use Material Symbols Outlined. Give each block an icon name.
3. No inline SVG icons. Use `<span class="material-symbols-outlined">`.
4. Section labels: uppercase, `0.07em` tracking.
5. UI labels in sentence case. Workspace name in Title Case.
6. Counts and numbers in `--ff-mono`.
7. Hover changes background or border, never scale. Press is `scale(0.98)`.
8. Check both themes. `:root[data-theme="dark"]` is the dark switch.

## 7. WORK ORDER

Work in this order. Stop after each phase, test, commit.

### Phase 0: inspect, no edits

1. Read `CLAUDE.md` and `MEMORY.md` in full.
2. Confirm every fact in section 5 against the live files. Report any that are wrong.
3. Read the whole builder file.
4. Write the plan: files to add, exact strings to replace in `index.html` and `app.js`, in order.
5. Wait for Eugene's go.

### Phase 1: launcher

1. Add a `launcher-group` with `data-group="favorites"` before the Build group. Label "My Favorites", a one line hint, one card: Prompt Builder Pro, `data-open="openBuilderProWorkspace"`.
2. Add an icon colour rule for the new group beside the existing five.
3. Make all lists collapsible:
   - The list label becomes a real `button` with `aria-expanded` and a chevron icon.
   - Collapsed state hides that list's `.launcher-grid` only.
   - State is saved per list in `localStorage` (wrap in `try`/`catch`), restored on open.
   - Default: all lists open.
   - Searching shows matches even inside a collapsed list, and collapse state returns when the search is cleared.
   - "Jump back in" recents keep working.
4. Keep the collapse code small and beside the existing launcher code.

Done when: six lists show, My Favorites is first, each list collapses and reopens with mouse and keyboard, state survives a restart, search still works, every existing card still opens its workspace.

### Phase 2: workspace shell

1. Follow hard rule 5 in order.
2. New files: `static/builder-pro-engine.js`, `static/builder-pro.js`, `static/builder-pro.css`. Load the two scripts at boot the same way `gauntlet-suite.js` is loaded. Do not load on click.
3. `index.html` gains one root element, `<div id="builderProWorkspace" role="dialog" aria-modal="true" aria-label="Prompt Builder Pro"></div>`, and one stylesheet link. The script builds the inner markup on first open and keeps it.
4. Scope everything:
   - Every id and class in the builder gets a `pbp-` prefix. The file uses generic names that already exist in the app (`canvas`, `nodes`, `toast`, `inspector`, `label`, `empty`, `menu`, `node`, `toggle`).
   - All CSS sits under `#builderProWorkspace`. Drop the file's global rules for `body`, `dialog`, `*`, `[hidden]` and `::selection`.
   - `PromptEngine` and `TEMPLATES` move under one global, for example `window.PLBuilder`.
   - The file binds click, input, change, dragstart and keydown on `document`. Bind them on the workspace root, and make the Delete and Escape keys do nothing unless the workspace is open.
   - Replace the file's own toast with the app's.
5. Header uses the shared `ws-header` pattern with a close button. Escape closes it unless a block or dialog is open.
6. Saved canvas stays in `localStorage` under its current key. No database change.

Done when: the card opens the workspace in under `150` ms with no network request on click, all 13 templates load and show "Ready to copy", wires drag, the inspector edits without losing focus, copy works, closing returns to the library, and no other workspace is affected.

### Phase 3: restyle

1. Apply section 6.
2. Check light and dark.
3. Check at `1280`, `1600` and `1920` wide.

Done when: no hex colour remains in `builder-pro.css`, no blur remains, both themes read correctly, and the workspace looks like it belongs beside Prompt Components.

### Phase 4, later session: connect the component library

1. Left sidebar gains a Workshop list and an "Open library" button.
2. Reuse the existing gallery. Add a small switch in `_galCheckout` so that, when opened from the builder, the kit goes to the Workshop and the button reads "Add all to Workshop". Keep a separate kit for each mode.
3. Workshop items drag onto the canvas, with a plus button as the fallback.
4. Selecting in the gallery must never add to the builder canvas directly.
5. Dataset records become a generic component block on the canvas. Do not copy or alter the dataset. Pick the prompt section from the record's label first, then its category, and let the user change it in the inspector. Strip a record's own leading label (for example "Task:") at compile time only.
6. The Components workspace must behave exactly as before.

### Phase 5, later session: remaining brief items

1. Both sidebars collapse independently. Test all four combinations.
2. Export formats: Text, Markdown, JSON, XML. XML needs one root element and escaped `&` and `<`. Validate JSON and XML by parsing them.
3. A short first run tutorial, also reachable from a help button.

### Every phase ends with

1. `python3 update_hash.py`.
2. `node --check static/app.js`.
3. Run the app and click through: Library, Workspaces launcher, Prompt Components, Prompt Forge, one Refine tool, then the new work.
4. Update `MEMORY.md` and `_changelog.md`.
5. Commit on a branch. Do not push to `main` without Eugene's say.
6. Report: files changed, what was built, what was not, anything that surprised you.

## 8. RISKS

| Risk | Guard |
| :--- | :--- |
| Name collisions between builder and app CSS or ids | Prefix and scope before anything else. Grep each new class in `app.css` first |
| `app.js` grows | Builder code lives in its own files. `app.js` gets only the `_escapeToLibrary` entry, the launcher collapse, and in phase 4 the gallery switch |
| Stale cache hides changes | `update_hash.py` every time, and give the new files a `?v=` value |
| Document level key handlers fire in other workspaces | Guard on the workspace being open |
| Collapse breaks launcher search | Test search with every list collapsed |
| Two things called Favorites | Decision 3 in section 3 |
| Builder file changes again before the port | Port from the file named at the top. Ask Eugene if a newer one exists |

## 9. PASTE THIS INTO CLAUDE CODE

```
You are working in the Prompt Library repo (funben12/Prompt-Library-Update).
Your job is to port a standalone HTML tool, Prompt Builder Pro, into this app as a new workspace.

BEFORE ANYTHING ELSE, ask me for these and wait for my answers:
1. The path to the handover document and to the builder HTML file.
2. Native port or iframe (handover section 4). Default: native port.
3. Should the launcher card be Pro gated? Default: yes.
4. Keep the list name "My Favorites" even though the nav has a Favorites view? Default: yes, with a different icon.
5. Keep the launcher at four columns? Default: yes.

THEN:
1. Read CLAUDE.md and MEMORY.md in full. Their hard rules override this prompt.
2. Read the handover document in full, then the builder HTML file in full.
3. Do Phase 0 only: check every repo fact in handover section 5 against the live files, tell me which are wrong, and give me a written plan listing each file you will add and each exact string you will replace. Make no edits. Wait for my go.

AFTER MY GO, build in this order, stopping after each phase for me to test:
Phase 1. Launcher: add a "My Favorites" list before Build holding one card, Prompt Builder Pro. Make every launcher list collapsible, with state saved per list.
Phase 2. Workspace shell: new files static/builder-pro-engine.js, static/builder-pro.js, static/builder-pro.css. Follow hard rule 5 in order. Prefix every builder id and class with pbp-, scope all CSS under #builderProWorkspace, and bind no listeners on document that run while the workspace is closed. Scripts load at boot so the workspace opens with no network request.
Phase 3. Restyle with the app's design tokens using the mapping table in handover section 6. No hex colours, no blur, Material Symbols icons only, light and dark themes both checked.

Do not start Phase 4 or 5 unless I ask.

RULES:
- Never use the Edit or Write tool on static/app.js or static/index.html. Use bash with Python content.replace(), and assert each target string exists exactly once before replacing.
- Back up any existing file you change into _rollbacks/ first.
- No schema changes. No new dependencies.
- Keep app.js growth to the minimum: the _escapeToLibrary entry and the launcher collapse.
- Do not redesign or restructure anything outside this job.
- Run python3 update_hash.py and node --check static/app.js after every change to app.js or app.css.
- If an existing feature breaks, stop, restore it, and tell me before continuing.
- Work on a branch. Do not push to main without asking.

AFTER EACH PHASE, report:
- Files added and files changed, with what changed in each.
- What you tested and the result.
- What is not done.
- Anything in the handover that turned out to be wrong.

DEFINITION OF DONE FOR PHASES 1 TO 3:
- My Favorites is the first launcher list and holds Prompt Builder Pro.
- Every launcher list collapses and reopens by mouse and keyboard, and remembers its state.
- Launcher search still finds cards in collapsed lists.
- The card opens the workspace in under 150 ms.
- All 13 templates load and show "Ready to copy".
- The workspace uses only the app's tokens and looks right in light and dark.
- Every workspace that existed before still opens and works.
- MEMORY.md and _changelog.md are updated.
```

## 10. WHAT TO GIVE CLAUDE CODE

1. This document.
2. `12-11-2026-prompt-builder-pro-agent-teams.html`. Put a copy in the repo's `Prompt Library Interface Files/` folder, which `CLAUDE.md` treats as the reference area.
3. Nothing else. The design tokens live in `static/app.css`.
