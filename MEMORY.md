# Prompt Library Pro — Memory

## Contacts

| Name | Role | Notes |
| :--- | :--- | :--- |
| Eugene Phillips | Solo developer & product owner | Building commercial Windows desktop app. Distribution via Payhip (not Gumroad). |

## Key Decisions

| Decision | Reasoning | Date |
| :--- | :--- | :--- |
| Chain Prompting reverted to detail panel tab | Standalone workspace was broken and over-engineered. Chain tab in right detail panel + Chain tab in prompt editor is simpler and fully functional. | 2026-05-17 |
| Standalone chain workspace removed | `#chainWorkspace` section, `chains` workspace switcher nav button, and all standalone chain JS functions deleted. Chain data still persists via `chain_ids` column in SQLite. | 2026-05-17 |
| **Correction (2026-09-19):** the row above is stale. `#chainWorkspace` exists live in `static/index.html` today (confirmed running, screenshotted, and redesigned this session — see History). It coexists with the separate detail-panel "Chain" tab described in Architecture below. Exact date/reason it was reinstated after 2026-05-17 is unknown; flagging rather than guessing. | Discovered while redesigning the workspace; line 167 of this file already said the nav for it was `✅ Live`, contradicting this row. | 2026-09-19 |
| Live variable preview added to detail panel | When filling variables in the detail panel, a live preview box shows the substituted prompt text in real time as the user types. | 2026-05-17 |
| Roles workspace kept as standalone | Roles workspace remains as a full-screen workspace switcher (sidebar nav button → takes over main area). | 2026-05-17 |
| Inno Setup for installer | Distribution pipeline: build.bat → build_installer.bat → single .exe via Inno Setup. ~50MB installer with Start Menu/Desktop shortcuts, Add/Remove Programs registration, optional DB cleanup on uninstall. | Prior |
| No cloud, no accounts | Fully local app. SQLite DB in user data directory. No internet required. | Prior |
| Onboarding tour — no video | Interactive spotlight tour only. Video-based onboarding was explicitly rejected. If onboarding is ever extended, do not add video. | 2026-06-04 |
| Randomiser motion follows the app's own setting, not the OS | Dice and card deck kept turning into a still flip because both apps skipped the motion whenever Windows or Android had reduced animations on. Desktop now uses the phone's 3D dice and riffle deck (shared `static/vartypes-3d.js`), random pick and random number get slot machine drums from the same shared file (the text reel stays as the fallback), results come from crypto, and Settings has Randomiser motion (Full, Short, Off). Guarded by `tests/randomiser`. | 2026-11-11 |
| Build.bat Error 5 / Access Denied | Fixed: (1) `taskkill /F /IM PromptLibrary.exe /T >nul 2>&1` + 2s wait before clean step; (2) `--noupx` on pyinstaller command — UPX triggers Windows Defender mid-build. Both fixes live in Build.bat. | 2026-05-18 |

## Architecture

- **UI shell:** Three-pane layout — collapsible sidebar, prompt list/feed pane, right detail panel. Cool-slate theme (hue 255 OKLCH, teal accent hue 198), Inter font, Material Symbols icons. Light mode: bg 92.5% / surface 96.5% — correct depth hierarchy. Dark mode: bg 15% / surface 19%. Middle pane: dense list/feed with sort bar, group-by-folder mode, sticky section headers, hover-revealed action buttons.
- **Prompt editor:** Textarea with variable syntax highlighting, live preview, variable meta editor. Autosave on change.
- **Variable system:** `[[name]]`, `{{name}}`, `((name))` syntax. Types: text, number, date, dropdown. Filled via form in detail panel with live preview. `variable_meta[v].sort_order` controls display order. Keyboard: Ctrl+N, Ctrl+F, Ctrl+T, Ctrl+K.
- **Chain Prompting:** Lives in right detail panel as "Chain" tab and in prompt editor modal. Chain steps stored as `chain_ids` on each prompt. Phase-based runner with role badges, persona prepend, per-phase variable fill, live preview. Functions: `startChainRunner`, `renderChainRunner`, `PL_copyChainPhase`, `PL_showOutputCapture`, `PL_captureAndNext`, `PL_skipCapture`, `PL_finishChain`, `PL_exportFullChain`, `PL_stopChain`, `_updateChainPreview`.
- **Roles workspace:** Standalone full-screen workspace (sidebar nav → takes over main area). `roles` table in SQLite. State: `_rolesState`. Three copy formats: Structured, XML, Prose. Role dropdown in prompt editor wires `role_id` on save.
- **Chat Format:** `#pane-chat` in prompt editor. Copy turns with format selector (Plain text / ChatML / OpenAI JSON) via `PL_copyChatTurns()`. Premium-gated tab.
- **Premium tier:** SHA-256 key validation. Licence stored in SQLite `settings` table (not localStorage). `state.isPremium` set on startup via `/licence/check`. On Pro: all `premium-locked` classes removed from DOM. Gated (24 features): command palette, chain workspace nav, all advanced workspaces (Forge/Lab/Playground/Components/Meta/Optimizer/ToneCal/ContextBank/Gallery/Snippets/TextExpansion), version history, analytics, duplicate, Markdown/CSV/bulk export, chat format, rating & notes, Ctrl+T, theme toggle.
- **Data storage:** Local SQLite via Flask API. Single `.db` in user data directory.
- **Distribution:** `build.bat` (MD5 hash injection) → `build_installer.bat` → `.exe` via Inno Setup.

## History

- **V1:** Monolith. app.js ~88KB, index.html ~76KB. Unmaintainable.
- **V2:** Rebuilt from scratch. Modular architecture, size limits, phased approval gates, MD5 cache-busting.
- **Meta Prompting:** Removed. Do not rebuild or reference.
- **Chain Prompting:** Was briefly a standalone workspace — reverted 2026-05-17. Now lives in detail panel tab. **Correction (2026-09-19):** the standalone `#chainWorkspace` is back and live (see Key Decisions correction above) — redesigned this session from a dashed-box/accordion-card layout to a "signal rail" (hairline spine, `IN`/`01`/`02` mono tags). It now coexists with the detail-panel Chain tab as two separate features.
- **Scorecard workspace:** Removed 2026-06-02. Do not rebuild or reference.
- **Collection Builder workspace:** Removed 2026-06-02. Do not rebuild or reference.

## Current State (2026-06-24)

- **Payhip launch (2026-06-24):** App is now live on Payhip at https://payhip.com/b/WKSLO. Launch discount code `PlaygroundRelease` gives 50% off — first 5 uses only. A second discount code (25% off) is planned pending sales momentum. YouTube tutorial planned. Feature screenshots to be shared to Telegram community over coming days.

- **Build hash:** `89c28185` (app.js) / `bfd143ad` (app.css) — updated 2026-07-25. Run `python update_hash.py` after every app.js change.
- **Starter templates:** `/api/starter-templates` seeds 10 curated prompts on empty library
- **Variable ordering:** `variable_meta[v].sort_order` — up/down via `PL_moveVar(v, dir)`. Falls back to alphabetical.
- **Variable preview:** `#variablePreview` live preview + `#copyFilledBtn` in `#usePromptSection`
- **Roles workspace:** One-page scrollable editor. `buildRolePrompt()` fixed (strict mode). `prependRole()` outputs full structured role block (identity→KB).
- **Config panel:** Sidebar footer button → slides up. CSS: `config-panel-header`, `config-panel-body`, `config-provider-tab`.
- **Prompt starter select:** 168 deduplicated options.
- **App icon:** Multi-size ICO (16–256px) from `app-icon.png`. Both `icon.ico` and `static/icon.ico` updated.
- **Roles agent fields:** 6 DB columns (`audience`, `output_format`, `constraints`, `domain`, `tasks`, `response_style`) in `app.py` + `_role_payload` + `serialize_role`.
- **Text Expansion workspace (corrected 2026-06-22):** ⚠️ PLANNED — fully unbuilt. Prior entry claiming a `shortcuts.db` API exists in app.py was checked and is FALSE — no `shortcuts` table, no `shortcut` string anywhere in app.py. Backend AND UI both need building from scratch.
- **Context Bank workspace:** Reworked 2026-11-13, see "Context Bank rework (2026-11-13)" at the end of this file. That section replaces every older Context Bank note.
- **Onboarding tour (fixed 2026-06-15):** 12-step spotlight tour. `initOnboarding()` now correctly called from BOOTSTRAP (was missing — tour never auto-launched). `promptlib.tourDone` localStorage key. Replay via sidebar footer "App tour" button (`#tourBtn`, onclick `PL_startOnboarding`). Old Components tutorial (`PL_startTutorial`, `#tutorialOverlay`) auto-launch disabled to prevent double-tour; still accessible if called directly. Tour step target IDs corrected: `#promptsContainer`, `#foldersList`, `#categoriesList`, `#workspacesToggle`. **Workspace previews (2026-06-15):** steps 6/7/9 now actually OPEN the workspace they describe (Agents→`openRolesWorkspace`, Power workspaces→`openForgeWorkspace`, Context Bank→`openContextBankWorkspace`) via a per-step `open` field + `_reconcileView()`. `_closeTourWorkspaces()` restores body scroll + nav state on library steps, finish, and Escape. Spotlight runs synchronously after `.open` (no rAF — throttles in background). Previews show for free users too (open-fns have no premium guard); nav buttons stay premium-locked outside the tour. **Preview polish (2026-06-15, hash 72411254):** workspace-preview steps (6/7/9) now set `target: null` and add `ob-preview` to `#onboardingOverlay`, whose CSS hides the dark `#onboardingSpotlight` so the real workspace shows fully (was: a pointless full-screen cutout that let the 70%-black dimmer sweep across the freshly-opened workspace). Step 8 ("The detail panel") now sets `openDetail: true` → `_openTourDetail()` opens the first library prompt's `#detailPanel` (was: spotlighted an empty/off-screen rail — the user saw nothing). Detail step keeps the dimmer + spotlight (panel is `z-index:20`, below the 9000 overlay; hole reveals it). Async/race-safe: `_openTourDetail()` returns `openDetail`'s promise, spotlight fires 380ms later (after the 0.32s slide) and only if `_step` is unchanged — else `_closeTourDetail()` removes the stray panel. `_closeTourDetail()` also runs on start/skip and on every workspace/library step. NOTE: the detail panel slide is transform-transition based and is *throttled/paused in headless preview* (Chromium) so it reads as `translateX(100%)` there; it runs normally in the visible WebView2 window — verify via DOM/`transition:none`, not headless screenshots. Verified end-to-end (DOM assertions): forward/back/Escape teardown clean, body scroll restored, one workspace open at a time, race handled.
- **Prompt Components workspace:** Live. Pre-expansion baseline (verified 2026-06-11): flat `BLOCKS` array (no `cat:` tags, no `CATEGORIES` array — uncategorised palette) + **23 `FRAMEWORKS`**: 5W2H, AIDA, APE, BAB, CARE, CO-STAR, COSTAR+, CSI+FBI, GROW, GRWC, META, OKR, PARA, PAS, PREP, RISEN, RODES, ROSES, RTF, SCQA, STAR, TRACE, ToT. `renderPalette()` targets `#pcwBlockGrid` / `#pcwFwList` (flat grid + list, no category pills/search). Drag-and-drop canvas, editable block cards, save to library. Sidebar nav (`data-view="components"`) + slide-out panel in New Prompt modal (`#promptComponentsPanel`, rendered separately by `_compPanelRender()`). Exposes `window._pcwBLOCKS` / `window._pcwFRAMEWORKS` globals (no `_pcwCATEGORIES` — not yet built). A 22-category/295-block/51-framework expansion (with new `#pcwCatPills`/`#pcwPaletteSearch`/`#pcwPaletteBody` palette UI) was built in `_rollbacks/app.js/app_20260611_110936.js` + `_rollbacks/index.html/index_20260611_110936.html` but never merged into live `static/` — reframed as planned future work, not yet scoped or scheduled.
- **Full-screen Prompt Viewer (fixed 2026-06-15):** `#promptViewer` overlay. `initPromptViewer()` now correctly called from BOOTSTRAP (was missing — close button and Escape key were broken). Opens via `window.PL_openViewer(id)`. Escape to close now works.
- **Prompt Optimizer workspace (corrected 2026-06-22):** ✅ LIVE, not planned — prior MEMORY.md entry was wrong. `#optimizerWorkspace` exists in index.html, `_optRunOptimize()` / `_optRunAnalyze()` in app.js call the shared `callAI()` helper. Pro-gated via `#optimizerNavBtn` (`premium-locked` + `data-premium="true"`).
- **Tone Calibrator workspace (built 2026-06-22):** ✅ LIVE. `#tonecalWorkspace`, mirrors Prompt Optimizer's structure. 6 tone presets (Formal/Casual/Persuasive/Concise/Friendly/Technical), calls shared `callAI()`, before/after panes, save-to-library. Pro-gated via `#tonecalNavBtn`. No new dependencies, no schema change.
- **Context Bank workspace (live):** `#contextBankWorkspace`. Left list panel + right editor. Category pills are built by JS from one list (`_ctxAllCats()`): the 11 starter categories (Persona, Company, Audience, Product, Style, Business, Writing, Coding, Marketing, Meta, Other), the user's own, and any category found on a block. **Own categories (2026-11-15, branch claude/context-bank-own-categories):** dashed Categories pill opens `#ctxCatManager` to add, rename and remove user made categories, stored in localStorage `pl_ctx_categories` (array of names, missing key = none, so no migration). Starter categories are fixed. Rename rewrites matching blocks; remove moves its blocks to Other (no block lost). Editor select `#ctxCategory` and the modal panel chips/quick add select read the same list; the editor select ends with `+ New category…` (value `__new__`, never saved). Fixed on the way: editing a Writing/Coding/Business/Marketing/Meta starter block used to save it as Other (no matching option), and `_ctxClose` threw `$$$ is not defined`. Note `#ctxPanelToggleBtn` has no button in index.html, so the modal side panel is unreachable from the UI (pre existing, not changed). `ctxSaveBtn`, `ctxCopyBtn`, `ctxDeleteBtn`. `_renderCtxList()` / `_openCtxEditor()`. Also available as side panel `#promptCtxPanel` in New Prompt modal.

- **Context Bank workspace (live):** `#contextBankWorkspace`, reworked 2026-11-13. See "Context Bank rework (2026-11-13)" at the end of this file.
- **Onboarding tour visual polish (2026-06-05):** Animated progress bar (`#obProgressBar`) fills as steps advance. Spotlight gets `ob-has-target` class → pulse animation when targeting an element. Card has accent glow border. `.ob-icon-wrap` has accent border and glow.
- **Cool-slate theme (2026-06-09):** Replaced warm-beige (hue 70) with cool-slate (hue 255) for both light and dark. Light: `--bg oklch(92.5% 0.007 255)`, `--surface oklch(96.5% 0.005 255)` — surface sits above bg, no depth inversion. Dark: `--bg oklch(15% 0.012 255)`. Accent is teal `oklch(40% 0.13 198)` light / `oklch(74% 0.13 198)` dark. CSS hash: `2083709d`.
- **Command palette redesign (2026-06-09):** Grouped sections (4 groups: Create/Navigate/Workspaces/Tools), 18 commands, icon tiles (`.cmd-ic`), subtitles (`.sub`), PRO chip in header (`.cmd-pro-chip`), keyboard hint footer. Now **Pro-gated** — free users see premium modal. `#cmdBtn` has `premium-locked` + `data-premium="true"`.
- **Pro-gating (confirmed 2026-06-15):** Internal `isPremium` guards on 8 open-functions. `#chainNavBtn` confirmed `premium-locked` + `data-premium="true"` in HTML (fixed 2026-06-15 — was missing). Chain tab in detail panel remains Free.
- **Dashboard workspace:** ⚠️ PLANNED — NOT IN LIVE FILES. `#dashboardWorkspace` has zero occurrences in `static/` files.
- **Template Gallery workspace:** ⚠️ PLANNED — NOT IN LIVE FILES. `#galleryWorkspace` has zero occurrences in `static/` files.
- **Snippets workspace (built 2026-06-22):** ✅ LIVE. `#snippetsWorkspace` — localStorage-backed (`pl_snippets`, mirrors Context Bank's `pl_ctx_blocks` pattern), categories Signatures/Disclaimers/Boilerplate/Greetings/Closings/Other, 6 starter snippets seeded on first open. Two surfaces: full CRUD workspace + `#promptSnippetsPanel` slide-out in the New Prompt modal (`#snipPanelToggleBtn`) for click-to-insert-at-cursor into `#promptContent` — inserts raw content with no wrapper text, unlike Context Bank's "--- Context: X ---" wrapping. Reuses `.ctx-*` CSS classes wholesale; only new CSS is the `#snippetsWorkspace` overlay rule. Pro-gated via `#snippetsNavBtn`. No new dependencies, no schema change.
- **Trash & Restore workspace:** ⚠️ PLANNED — NOT IN LIVE FILES. `#trashWorkspace` has zero occurrences in `static/` files.
- **Plan modal (fixed 2026-06-22):** Free column: 35 prompts, 8 folders, 5 tags & 8 categories per prompt, locked items listed. Pro column: 18 features accurately. Payhip CTA link live. Confirmed Pro stays one-off lifetime licence (not subscription).

## Current State (2026-07-25)

**Theme — correction.** The cool-slate (hue 255) entry below is WRONG. Live `static/app.css`
is warm beige + teal: `--bg oklch(93.5% 0.01 70)`, `--accent oklch(38% 0.14 190)`,
Fraunces display serif + Instrument Sans. Only two theme selectors exist:
`:root` (light) and `:root[data-theme="dark"]`. No `prefers-color-scheme` block.

**Snippets and Tone Calibrator workspaces were removed 2026-07-04** and replaced by the
7-workspace suite (Quick Fill, Auditor, Diff, Cost, Pulse, X-Ray, Splicer). The Snippets
*editor side panel* survives; only the standalone workspace died. Entries below still
listing them as live are stale.

### Library screen redesign (phase 1)
- Header cut from three stacked bars to two. Row 1: sidebar toggle, title block, search
  (the hero), `#cmdBtn`, `New prompt`. Row 2: `#filtersBtn` popover, sort, `#activeFilterPill`,
  and a right cluster (view toggle, group-by-folder, surprise-me). 180px -> 120px at desktop.
- `#filtersPop` holds Favourites + Rated. `#filtersCount` badge and the still-visible
  active pill keep filter state from hiding behind the popover. `window._syncFilterCount`
  is called from `refreshActivePill()`.
- `#viewTitle` was inheriting `--fs-2xl` (48px, the page-hero size); now `--fs-lg`.
  `#breadcrumb:empty { display: none }` — it reserved 20px on the library view.
- Cards: meta row muted to `--ink-4` and stripped of folder/clock glyphs (variable icon
  kept), chips capped at 2 cats + 2 tags with a `.card-tag.more` `+N`, category chips no
  longer borrow `--accent`. Bulk checkbox hover-reveals.
- Row 1 has `flex-wrap` plus a 1100px breakpoint dropping search to its own line —
  without it `#app`'s `overflow:hidden` clipped `New prompt`.

### Launcher (phase 2)
- `#launcherRecent` "Jump back in" strip, last 3 tools, localStorage `pl_ws_recent`,
  hidden while searching. Clicks are delegated and re-check `state.isPremium`.
- All 14 padlocks replaced by `.launcher-card-pro` gold chips.
- Group colour on icons only: build blue, refine purple, inspect orange, run green.
  This reclaimed `--accent`, which had been on all 17 card icons.
- `.launcher-grid > .launcher-card:first-child` is the lead card (34px icon).

### Batch Runner workspace (phase 3) — NEW, Pro
`#batchWorkspace`, `data-view="batch"`, icon `table_view`, in the launcher's Run group.
Runs one prompt across many input rows via `callAI`, sequentially.
- Three input modes: 1 variable = one value per line; 2+ variables = first line must be a
  CSV header naming them (`_brSplitCsv` handles quotes); no variables = each line is
  appended to the prompt as its input.
- `BR_MAX_ROWS` 50 (hard cap), `BR_WARN_ROWS` 25. Cost estimate reuses `COST_MODELS`.
- `_brCancel` flag checked between rows — `callAI` has no abort support and was NOT changed.
- A failed row does not halt the batch. Last template+rows persist to `pl_br_last`.
- Export CSV and Copy all go to the clipboard. Per-row Save posts to `/prompts`.

### Bugs fixed this session (all pre-existing)
- `.bulk-toolbar` set `display:flex`, which outranks the UA `[hidden]` rule — the toolbar
  held **49px of invisible dead space** above every prompt list at all times. Added
  `.bulk-toolbar[hidden] { display: none }`.
- Duplicate `#promptsContainer.list-view .card-actions` block set `opacity:1` after the
  hover rule, so the **card hover-reveal never worked**. Duplicates merged (Key Principle 14).
- Dark-theme `--c-blue` was authored at **hue 190** (teal's hue) while light uses 245, so
  the blue and teal **prompt colour labels were identical in dark mode**. Now hue 245.
- `Main.py` logging init had no try/except. A ReadOnly `error.log` crashed the app before
  launch. `_init_logging()` now falls back to the data dir, then to no file handler.

### Environment note (2026-07-25)
The whole working tree had the Windows **ReadOnly** attribute set — 1,910 files outside
`.git`, including `static/app.js`, `app.css`, `index.html`, `app.py`. This crashed the app
and would have blocked every edit. Also found: repo files dragged into a `New Folder/`,
an Explorer `desktop.ini`, and stale `app.js.tmp` / `index.html.tmp`. Cleared and cleaned.
Detect with: `Get-ChildItem -Force -File -Recurse | Where-Object { $_.Attributes -match 'ReadOnly' }`.

## Current State (2026-09-19)

- **Prompt Chain workspace redesign.** `#chainWorkspace` (the standalone step builder, see
  History correction above) redesigned from a dashed-box seed + circular-badge accordion
  cards to a "signal rail": one hairline spine runs through the seed and every step
  (`IN`, `01`, `02`... in mono type), no cards, shadows, or gradients. All functions/ids
  kept unchanged, only markup and CSS changed. Step markup classes renamed
  `chain-step`/`chain-step-num`/`chain-step-body` → `chainw-step`/`chainw-step-num`/
  `chainw-step-body` to fix a collision with an unrelated chain-search picker (see Gotchas
  in `CLAUDE.md`). Verified live via headless-browser screenshots in light and dark mode.
- **PR:** funben12/Prompt-Library-Update#8 (draft, being watched by this session).

## Feature Inventory — Free vs Pro

### Free (all users)
| Feature | Notes |
| :--- | :--- |
| Prompt library | Up to 35 prompts. Create, edit, delete, organise |
| Folders | Up to 8 folders |
| Tags & categories | Up to 5 tags & 8 categories per prompt |
| Variable system | `[[name]]` `{{name}}` `((name))` — text, number, date, dropdown |
| Variable live preview | Fill variables with live substitution preview |
| Chain prompting (detail panel) | Chain tab in right detail panel + prompt editor modal — NOT the nav workspace |
| Agents / Roles workspace | Full role builder — identity, voice, context, KB, skills |
| Copy formats (Structured / XML / Prose) | Role copy formats |
| Dashboard workspace | 🔲 Planned — not in static/ files |
| Trash & Restore workspace | 🔲 Planned — not in static/ files |
| Prompt starter (168 options) | Starter selector in prompt editor |
| Colour labels | Per-prompt colour coding |
| Favourites | Star/unstar prompts |
| Keyboard shortcuts | Ctrl+N, Ctrl+F, Ctrl+K |
| Import / Export (.plp pack) | Pack import/export |
| Starter templates | Auto-seeded on empty library |
| Dark theme | Fixed dark mode (cool-slate) |
| Onboarding tour | 13-step spotlight tour on first launch. Replay via "App tour" sidebar button. |

### Pro (licence required — SHA-256 key validation)
| Feature | Status | Notes |
| :--- | :--- | :--- |
| Unlimited prompts, folders, tags, categories | ✅ Live | Removes FREE_LIMITS caps |
| Command palette | ✅ Live | `#cmdBtn` + `Ctrl+K` — 18 commands, 4 groups. `premium-locked` |
| Prompt Chain workspace nav | ✅ Live | `#chainNavBtn` `premium-locked` — chain in detail panel stays Free |
| Playground workspace | ✅ Live | `#playgroundWorkspace` — run prompts live |
| Prompt Forge workspace | ✅ Live | `#forgeWorkspace` — structured prompt builder |
| Prompt Lab workspace | ✅ Live | `#labWorkspace` — A/B testing |
| Prompt Components workspace | ✅ Live | Flat block list + 23 frameworks (no categories yet). Drag-and-drop canvas |
| Metaprompting workspace | ✅ Live | `#metaWorkspace` — AI prompt rewriter |
| Prompt Optimizer workspace | ✅ Live | Pro-gated, calls shared `callAI()` helper. Corrected 2026-06-22 — was wrongly marked Planned |
| Tone Calibrator workspace | ✅ Live | Built 2026-06-22. Calls shared `callAI()`, mirrors Optimizer pattern |
| Context Bank workspace | ✅ Live | Reworked 2026-11-13: launcher card, Context button in New prompt, pills from data, wrap styles, saved copy in settings table |
| Template Gallery workspace | 🔲 Planned | Not in static/ files — described in prior sessions only |
| Snippets workspace | ✅ Live | Built 2026-06-22. localStorage-backed, mirrors Context Bank pattern + insert-at-cursor panel |
| Text Expansion workspace | 🔲 Planned | Fully unbuilt — no backend, no UI. Corrected 2026-06-22, prior `shortcuts.db` claim was false |
| Version history | ✅ Live | Per-prompt version log with restore |
| Analytics | ✅ Live | Usage stats, top prompts, tag clouds |
| Duplicate prompt | ✅ Live | One-click clone |
| Export — Markdown / CSV / Bulk | ✅ Live | Multiple export formats |
| Chat format tab | ✅ Live | Copy turns as Plain / ChatML / OpenAI JSON |
| Rating & notes | ✅ Live | Per-prompt star rating + private notes |
| Ctrl+T text case cycling | ✅ Live | Toggle case in prompt editor |
| Dark/light theme toggle | ✅ Live | User-switchable theme |
| In-app AI executor | ✅ Live | `callAI(systemPrompt, userMsg, maxTokens)` in app.js (~line 6997). Supports OpenAI, Anthropic, Gemini, OpenRouter. Corrected 2026-06-22 — was wrongly marked Planned |
| Version diff view | 🔲 Planned | Side-by-side diff between versions |

## Roadmap

### Pro — Planned
- **In-app AI executor (corrected 2026-06-22):** ✅ Already live, not planned. Shared `callAI()` helper in app.js, used by Prompt Optimizer, Metaprompting, Smart/AI tagging, Prompt Score, Roles AI persona generation. ⚠️ Key storage is plain `localStorage` (`pl_api_key_<provider>`), NOT DPAPI-encrypted as previously documented — this is a real gap if it matters for the security story, flagged but not yet fixed.
- **Version diff view:** Side-by-side diff between any two saved versions of a prompt. Complexity high — design TBD.
- **Text Expansion Layer 2 (system-wide):** Global keyboard hook via `pynput`/`keyboard`. Deferred — AV flag risk, requires explicit user opt-in. Do not build until Layer 1 is proven stable.

### Free — Planned
- **Bulk operations:** Checkbox-select multiple prompts → bulk tag, move, export, delete
- **Drag-and-drop folder assignment:** Drag prompt card onto folder in sidebar
- **Expanded keyboard shortcuts:** Additional shortcuts throughout app
- **Components panel drag-to-modal:** Drag blocks/frameworks from the modal side panel directly into the prompt textarea (approved 2026-06-02)
- **Interactive canvas (Components workspace):** Unlimited pan/zoom canvas, drag blocks to any position, moveable nodes, user-defined node connections (neural-link style). Approved direction 2026-06-02.

### Reference
- PRD exists covering full free/premium feature inventory, DB schema, API endpoints, licensing architecture, competitive positioning
---

## Current State (2026-10-06) — supersedes older state notes where they conflict

### Product architecture

Prompt Library Pro is currently a local-first Windows desktop prompt engineering application. The account-management experiment has been completely reverted. The product should again be treated as having no user accounts, no authentication, no account switching, no account memory, no password layer, and no account-specific licence state.

The SQLite database and Prompt Components graph core were deliberately preserved through the account-system reversion. Recent verification work focuses on database integrity and graph persistence rather than account functionality.

### Prompt Components canvas upgrade

The Prompt Components workspace has moved substantially beyond its earlier flat node editor baseline.

Current interaction work includes:

- Resizable component nodes, with stored resize state controlling rendered dimensions.
- Marquee selection and alignment controls.
- Improved selection and alignment feedback.
- Live edge previews while creating connections.
- Explicit connection endpoints.
- Endpoint reconnection.
- Connection inspector editing.
- Preservation of text-input focus while editing connection data.
- Continuous node dragging across canvas rerenders.
- Canvas navigation polish and restored node sizing.
- Improved graph prompt compilation for branches and convergence.

The strategic direction is a professional visual editor for prompt systems, with interaction depth approaching tools such as Figma, tldraw, or React Flow, while remaining purpose-built for prompt construction and graph compilation.

Do not replace this with a generic node editor, and do not damage the existing SQLite graph persistence while extending it.

### Nearby share (v0.2 of the Android companion, 2026-10-06)

- `share_server.py` runs a second, tiny Flask app on fixed port **47800** (started in its own thread from `Main.py` after `init_db()`; failure there is logged and never stops the main app). It only serves `GET /share/hello`, `POST /share/offer`, `GET /share/offer/<id>`. Private network addresses only, 256KB body cap, offers expire after 180s, 10 offers a minute per IP, 20 pending max. It has no route to `/api` or the database.
- Accepting is local only: `GET /api/share/inbox`, `POST /api/share/inbox/<id>` (`{accept}`), `POST /api/share/settings` (`{receiving, name}`) in `app.py`, all refused unless the request is loopback. Accepted prompts go into a `Received` folder (created on first use) with notes "Received from <device>".
- Settings keys (existing `settings` table, no schema change): `device_id` (uuid hex, created on first boot), `device_name` (defaults to hostname), `share_receiving` ('1' default on).
- `app.py` now has `_insert_prompt(conn, data)`; `create_prompt` and the share accept route both use it.
- UI: incoming offers show as AirDrop style cards top right (`.nearby-stack` / `.nearby-card`, polled every 3s, code in the main IIFE). The receive switch and computer name live in the "Continue on phone" modal under NEARBY SHARE.
- Scope gotcha: `static/app.js` has four top level IIFEs (main ends near line 28322). Later IIFEs (onboarding, viewer, phone share) cannot see `toast`, `escapeHtml` or `loadAll`; the main IIFE exposes `window.PL_toast`. The phone share panel's "Link copied" toast was silently broken by this until now.
- `grep -c "<script" static/index.html` is **4**, not 3 (CLAUDE.md triage note is stale).
- Desktop icon changed 2026-10-06 to the teal hardcover book with a prompt label (same art as the Android app): `icon.ico`, `static/icon.ico`, `app-icon.png`, plus `<link rel="icon">` in index.html. Old icons backed up in `_rollbacks/` as `icon v1.ico` and `static-icon v1.ico`; the old `app-icon.png` is in git history only (`*.png` is gitignored). The in-app logos `static/logo-mark.png` (sidebar) and `static/logo.png` now use the same book, and `mac/app-icon.icns` (referenced by `mac/setup.py`, previously missing) is generated from it.
- Sending (v0.3): each prompt card has a paper plane button (`window.PL_sendNearby(id)`) that opens "Send to nearby". `GET /api/share/devices` scans this computer's /24 on port 47800 (64 threads, 0.8s timeout, about 4s, excludes its own device ID); `POST /api/share/send {ip, prompt_id}` offers the prompt; `GET /api/share/send/<ip>/<offerId>` reports pending, accepted, declined or expired. Sending uses `urllib` only and refuses non-private addresses. Works to phones (app open) and to other desktops (laptop to laptop).
- Discovery fix (2026-10-07, after a real test where the phone found the laptop but not the reverse): the desktop now scans every private IPv4 /24 it has (route guess plus `gethostbyname_ex`, link local skipped, max 4 networks, 96 threads), always probes peers that recently said hello or sent an offer (`_peers`, kept 24h; phones send `?from=&name=&type=` on hello), bypasses the Windows system proxy for local calls, and the Send modal has "Add by address" (`GET /api/share/devices?ip=`) plus the scanned networks in its empty state. Root causes covered: wrong adapter picked (WSL, Hyper-V, VPN), system proxy, phone app not on screen.
- Root cause of desktop not finding phones (2026-10-07, confirmed in the 0.7.0 APK bytecode): `MainActivity.handleShare` matched `/share/hello` exactly, so the desktop probe `/share/hello?from=&name=&type=` got a 404. `share_server.probe()` now retries the plain path on a 404, so already installed phone builds are found. The phone source now strips the query string; rebuild the APK to pick it up. Backup: `_rollbacks/share_server v-pre-hello-fix.py`.
- Phone side lives in `funben12/AI-App-Factory` `apps/app-003-prompt-library-mobile` (v0.3: sends and receives; it only receives while the app is on screen).

### Nearby share test harness (2026-10-13)

- `tests/nearby/` runs two real desktop instances (own `HOME`, share port bound to 127.0.0.2 and 127.0.0.3), a Python stub of the Android receiver (127.0.0.4) and the real phone `index.html` in headless Chromium. `test_desktop.py` passes 11 of 11: desktop to desktop and desktop to phone discovery, send, accept, decline, receive off, port isolation, rate limit all work. `test_phone.py` (9 tests) covers phone to desktop and phone to phone sender side and the Incoming sheet.
- Already in the code before this harness: phone to phone sending (the phone Send sheet lists any Prompt Library, phone or computer) and desktop to desktop sending. Neither had been run between two real devices.
- First run found three things, all fixed 2026-10-13 in AI-App-Factory `apps/app-003-prompt-library-mobile` (backups in its `_rollbacks/`, `*v-pre-parse-fix.js` and `index v-pre-nearby-copy.html`): `tools-board.js` had a misplaced `}` in a template string plus a stray duplicate `})();`, `tools-components.js` had a stray duplicate `})();`, so Prompt Board and Prompt Components never loaded; and the phone Send sheet empty state now says another phone or a computer. Harness now 11 of 11 desktop and 9 of 9 phone.
- Not covered by the harness: the Java receiver and real radios. Phone app folder `tests/README.md` items 14 to 21 still need two real devices.

### Nearby quick discovery and phone background receive (2026-11-11)

- Quick discovery: every Prompt Library answers a "who is here" question on **UDP 47800** (multicast group `224.0.0.168`, plus subnet and global broadcast). Question `{"app":"prompt-library","v":1,"kind":"query","deviceId"}`, answer `{"app","v","kind":"here","deviceId","name","type","receiving","port"}` sent back to the asker. The asker still says hello over HTTP to each answer, so the device list format is unchanged.
- Desktop: `share_server.start_discovery()` (started by `serve_forever`; failure is logged and never stops the app), `discover()`, `quick_scan()`. `GET /api/share/devices?quick=1` returns answering devices plus recent peers in about a second; the Send to nearby modal calls it first, then the full /24 scan, and merges. `SHARE_HOST` lets the test harness bind one loopback address per fake device. Stdlib only, no new dependency.
- Phone 0.9.0 (AI-App-Factory branch `claude/nearby-background`, built on the 0.8.0 branch): the receiver moved from `MainActivity` into `ShareHub.java`, shared by the screen and a new `ShareService` foreground service (`connectedDevice`). Manage, Nearby has "Receive with the app closed" (off by default). With it on, offers that arrive with the app closed become a notification; tapping opens the app on the Incoming sheet. Nothing is saved without Accept, same as before.
- Tests: `tests/nearby/test_desktop.py` 12 of 12 (new `test_01b_quick_discovery_both_ways`); phone stub answers discovery too. Not tested on real devices or Windows firewall (UDP 47800 may need the same private network allow as TCP 47800).

### Memory maintenance rule

Substantial repository changes must update the relevant model-specific memory file automatically.

GPT changes update GPT-MEMORY.md. Claude changes update MEMORY.md and any applicable Claude-specific notes. When a change establishes shared project truth, MEMORY.md must also be updated.

Memory should describe the current resulting state and supersede stale instructions rather than accumulating contradictory history.

## Prompt Forge

The 2026-10-05 Prompt Forge workbench redesign and stylesheet cache refresh were reverted. The pre-redesign Prompt Forge layout is the current intended baseline. Do not reapply the reverted visual treatment unless explicitly requested.

### Prompt Forge frameworks and custom frameworks (2026-10-07)

- All framework definitions now live in `static/forge-frameworks.js` (`window.PL_FORGE_FRAMEWORKS`, 354 entries, each with `title` = the dropdown label). `app.js` builds `FORGE_FRAMEWORKS` from it (about 5,800 lines left app.js). The phone app ships a copy of the same file.
- Before this, 225 of the 354 dropdown options had no definition and silently did nothing. Every option now has fields; a Playwright check walks all 354 and confirms each renders and assembles.
- Loaded by its own `<script>` tag after components-data.js, so `grep -c "<script" static/index.html` is now 5. `mac/setup.py` lists the file.
- Custom frameworks: "+ New" beside the dropdown (or "+ New framework…" in it) opens an editor; typing an acronym makes one part per letter. Saved via `GET/POST /api/settings/forge-frameworks` into the settings key `forge_custom_frameworks` (JSON list, max 50, 12 parts each; no schema change). Shown first under "My frameworks" as keys `my_<id>`; Edit appears only for those. Same JSON shape as the phone's `forgeFrameworks`.
- Modal is built in JS, inserted before `#toastContainer`, z-index above the Forge workspace. `.btn` overrides `[hidden]`, so hidden buttons need an explicit `[hidden]{display:none}` rule.

### Workspace suite

A broader prompt engineering suite was added and wired into the existing launcher convention. Redundant evaluation/workflow workspaces were subsequently removed.

Current live specialised workspace IDs observed in static/index.html:

fill, audit, diff, cost, pulse, xray, splice, generate, example, adapter, simplify, tone, translate, gauntlet, batch.

Human-readable roles:

- Quick Fill
- Prompt Auditor
- Diff Lens
- Cost Lens
- Library Organizer
- Prompt X-Ray
- Prompt Splicer
- Prompt Generator
- Prompt from Example
- Model Adapter
- Prompt Simplifier
- Tone & Style Rewriter
- Prompt Translator
- Gauntlet Loop
- Batch Runner

The live files are authoritative. Older workspace descriptions in the historical changelog may describe experiments that were later removed.

### Recent stability and cleanup

October 5 work also included:

- app.py syntax repair after corruption around database initialisation.
- Removal of obsolete app - v1.py.
- Reversion of the account-management layer.
- Removal of account-lock styling and account-specific licence documentation.
- Database and graph smoke-test refocus.
- Fixes allowing remaining workspace dialogs to close.
- Workspace-suite refresh after workspace removal.
- Prompt Forge redesign and stylesheet cache refresh were reverted after review.
- Restoration of an existing premium licence key through the normal licence mechanism.

### Theme switch (2026-10-22)

- The sidebar footer dark mode control (`#themeToggleBtn`) is now a round illuminated push switch (`.theme-switch-btn`, `.rswitch`, `.rswitch-cap`, `.rswitch-mark`), modelled on the Evil Buttons RealisticSwitch props but built in vanilla HTML, CSS and JS. The shadcn/React component cannot be installed here: no React, no npm, no build step.
- Off is light mode, red `#ff0000` with a white sun. On is dark mode, blue `#2a4dff` (lighter than the original `#0000ff` so it reads on the dark sidebar), pressed in, with a white moon. Colour comes from `--rswitch-color` keyed on `[data-theme]`.
- `role="switch"` with `aria-checked` set in `applyTheme()`. The label stays "Dark mode" and the switch shows the state.
- `playSwitchClick()` makes a short click with Web Audio on user toggles only, not on load. No audio file.
- Backups: `_rollbacks/* v-pre-theme-switch.*`.

### Development direction

The current product priority is coherent prompt-engineering tooling rather than accumulating workspaces. New features should earn their place by providing a distinct job, should reuse existing launcher and workspace conventions, and should not create duplicate functionality.

Preserve the local-first architecture, SQLite data, graph persistence, existing licence system, and the established live-file workflow. Do not reintroduce the reverted account system unless explicitly requested.

### Gauntlet Loop prompt (2026-10-08)

The Gauntlet Loop workspace now generates the Gauntlet meta-prompt (goal, inspectable quality bar, Matt Shumer Claude of Duty style short agent prompt, builder and critic fan-out, blind A/B critique, live progress page, subagents and ultracode). Inputs are two textareas: Goal (required, `#gauntBuiltInput`) and References (optional, `#gauntRefsInput`). The old three-input AAA template and the language field were removed. Still client-side string templating, no AI call, no schema change. Backups: `_rollbacks/app v-pre-gauntlet-meta.js`, `_rollbacks/index v-pre-gauntlet-meta.html`.

### Variable types expansion (2026-10-08)

- Desktop fill sheet gained 8 types: Segmented, Stepper, Percentage, Date Range, Today, Title Case, Hashtags, List. Total is now 44. No schema change, `variable_meta` stays freeform JSON.
- Output formatting per type happens in `_readVarControlValue` via `_PL_formatVar` (title case, `#` hashtags, `- ` bullets, `%`, `a to b` dates). The input keeps the raw value, the preview and copy use the formatted one.
- Mobile companion (AI-App-Factory `apps/app-003-prompt-library-mobile`) now keeps `variable_meta` on import as `varMeta` and renders the right control per type through a new `vartypes.js`, with the same 8 new types. Types are set on desktop only, nearby share does not carry them yet (needs `MainActivity.java` offer JSON and `share_server.py` changes).
- Backups: `_rollbacks/app v-pre-var-types-2.js` and `.css`. Cache hashes refreshed with `update_hash.py`.
- Stage 2 (2026-10-08): per-variable `wrap` key in `variable_meta` (quotes, codefence, xml tag named after the variable), set in the variable editor row, applied in `_readVarControlValue`. New types Clipboard (paste button) and Library Prompt (inserts another prompt's content), 46 types total. `replaceVariables` is now single pass so inserted text is never re-expanded and `$` in values is safe. Backups: `_rollbacks/app v-pre-var-types-3.js` and `.css`.
- Mobile stage 2: editor has a Variable types section (type picker, options, wrap), plus Clipboard and Library prompt types. Phone saves `varMeta` with `wrap`.
- Nearby share now carries `variable_meta` both ways (2026-10-08). Desktop: `share_server._meta()` cleans incoming settings (50 vars, size caps, known keys only), `app.py` `/api/share/send` includes it, accept saves it through the normal prompt insert. Phone: `MainActivity.cleanVarMeta` on receive, `varMeta` sent as `variable_meta`. Backups: `_rollbacks/share_server v-pre-nearby-types.py`, `_rollbacks/app v-pre-nearby-types.py`. Phone Java change needs the APK rebuilt and reinstalled to take effect.
- Mobile parity (2026-10-08): the phone now renders every desktop variable type (added Range, Range Slider, Ranked List, Matrix, Emoji, Icon names, Duration, Timezone, Language) and its editor sets type, options, default, wrap, Show when filling and multi. Prompts can be written, typed and filled entirely on the phone. Icon Picker on the phone shows icon names as chips (no Material Symbols font on the phone). Paragraph `size` is not carried to the phone.
- Open: desktop live preview chains sequential replaces, copy output is correct.
- Phone companion state (2026-10-09, v0.7.1 in AI-App-Factory): Quick Fill redesigned (guided, all variable types), Prompt Components (stacked block builder, no AI key), Prompt Board, Gauntlet Loop on the desktop meta prompt, Library Organizer, Prompt Splicer (by part), Backup and restore with safety copy, Forge templates and tone. Boards travel in phone backups. Committed APK here is stale, use the AI-App-Factory workflow build. CLAUDE.md has a new Android companion section.
### BASELINE: the version to clean up from (2026-10-09)

Eugene chose the current main of both repos as the version to clean up from, after the variable type work below merges. Any clean up, trim or refactor starts from here. Do not clean up from older commits or older APKs.

- Desktop: `funben12/Prompt-Library-Update` main. Phone: `funben12/AI-App-Factory` main, app-003 Prompt Library Mobile `versionName 0.7.1` (`versionCode 10`). Read the merge commit of the PR that carries this section for the exact SHAs.
- Do not use the APK Eugene sent on 2026-10-09 (sha256 `4390e8e8...fa0d`, 894,623 bytes) as the reference. It is an older pre-cleanup build: it still has XY Pad, Color, Icon Picker, Persona Text, Clipboard and Library Prompt and lacks Dice Roll, Weighted Mix and every new type. The committed `PromptLibrary-Mobile-debug.apk` (sha256 `4efa097c...3335e`) is older still. The reference phone build is the latest "Build Prompt Library Mobile APK" release from AI-App-Factory main. Ask Eugene for a fresh APK from that release if a byte comparison is needed.
- Removed for good on both apps: XY Pad, Color, Icon Picker, Persona Text, Clipboard, Library Prompt, JSON. Old saved variables of those types open as a plain text field.
- Kept: Dice Roll, Weighted Mix. Do not remove them.
- Before cleaning anything, list what would go and ask. The desktop and phone type lists must stay identical.

### Variable types cleanup and presets (2026-10-09)

This supersedes the 2026-10-08 notes above wherever they conflict.

- Removed for good from desktop and phone: XY Pad, Color, Icon Picker, Persona Text, Clipboard, Library Prompt. Dice Roll and Weighted Mix are KEPT (Eugene confirmed, do not remove them). Dead code removed too (`_PL_rollChoice`, `_PL_pasteClip`, `_PL_pickLibPrompt`, `_PL_selectIcon`, the `.var-icon-*`, `.var-clip`, `.var-lib-select` CSS). The phone's "paste a template" button in Quick Fill is a separate feature and stays.
- Random group (same on both apps): Dice Roll, Weighted Mix, plus new Coin Flip, Random Pick (uniform from options) and Random Number (options box takes `min, max`, whole numbers). One picker, `_PL_randomValue` (app.js) and `randomValue` (phone `vartypes.js`), defaults in `_PL_RANDOM_DEFAULTS` / `RANDOM`. Keep the two in step.
- New types, same on both apps: Combo Box (pick or type, options become suggestions), Number Scale (1 to 10 buttons), and six presets with built-in options that the user can override in the options box: Tone, Output Format (`outputformat`), Length, Audience, Priority, Sentiment. Presets render as single-select chips through the existing `var-toggle-group` path on desktop and `chips()` on the phone. Desktop editor has a new Presets group, Combo Box and Number Scale sit in Choice.
- Option sets live in `_PL_VAR_PRESETS` (app.js) and `PRESETS` (phone `vartypes.js`). Keep the two lists identical.
- Cards and controls (2026-10-09, same on both apps): Card Deck (`carddeck`, shuffle animation, draws without repeats until the deck is empty then reshuffles, cards come from the options box, five sample cards when blank), Card Carousel (`cardcarousel`, scroll snap row, prev and next arrows, tap to pick), Step Slider (`stepslider`, options are the steps in order, labels are tappable), and presets Agreement, Frequency, Importance, Difficulty. Card Deck sits in the Random group, Card Carousel and Step Slider in Choice, the new presets in Presets. Code: `_PL_drawCard`, `_PL_carouselNav`, `_PL_stepSlide` here, `data-vdraw`, `data-vccard`, `data-vss` handlers in the phone's `vartypes.js`.
- Verified headless: desktop detail panel renders all new types and the random buttons write into the live preview, phone `vartypes.js` renders and emits values at 390 px.


### Variable types trim and motion (2026-10-09, later)

This supersedes every earlier variable type note above wherever they conflict, including the "Kept" and presets notes.

- Eugene approved a cut to 22 types, identical on desktop and phone: Text (text, paragraph, code, list, language), Choice (dropdown, choicechips, choicecards, checkbox, combobox, stepslider), Number (number, percentage, slider, rangeslider), Date (date, daterange), Random (diceroll, weightedmix, carddeck, randompick, randomnumber). Everything else is removed: the 10 presets, matrix, ranked list, star rating, radio, segmented, yes/no/maybe, multiselect, togglegroup, yes/no toggle (boolean), card carousel, tags, number scale, currency, range pair, stepper, coin flip, title case, hashtags, password, email, url, phone, duration, timezone, today, datetime, month, week, emoji. Decided by two read-only audit agents plus Eugene. Eugene also confirmed the Yes / No toggle (`boolean`) goes. Old saved ones open as choice chips Yes and No (default true or yes becomes Yes).
- Old saved variables never break: `_PL_normMeta` (desktop) and `norm` (phone) map radio, segmented, yesno and boolean to choicechips (yesno with no options gets Yes, No, Maybe), multiselect and togglegroup to checkbox, anything else to text. No schema change, `variable_meta` stays freeform JSON.
- Dice Roll: a real CSS 3D die that tumbles and lands. Numeric d6 shows pips. Custom words or numbers in the options box show on the faces. New per-variable key `faces` (2 to 100, default 6) sets sides when options are blank. Code: `_PL_rollDice`, `_PL_dieHTML` (desktop), `rollDice`, `dieHtml` (phone).
- Weighted Mix: one slider per option, percentages always total 100 (moving one rescales the others), output is `Name 50%, Name 30%`. Options use `Name:weight`, rescaled to percentages. It no longer picks randomly. Code: `_PL_mixSlide`, `_PL_mixParse`.
- Card Deck: visible stacked pile that riffles, then the drawn card slides out and flips. No repeats until empty, then reshuffles. Code: `_PL_drawCard` / `drawCard`.
- Choice Chips vs Choice Cards: chips are compact label pills. Cards are real cards (title, optional description, tick mark), one option per line as `Title | description`, large grid. Both honour `multi`. Options box splits on newlines when present (or when a cards line has `|`), else commas.
- Settings: type, options, default, visible, wrap, size (paragraph), multi (chips and cards), faces (dice). Random types hide default and wrap in the editor. The editor shows settings per type through `_PL_applyVarTypeUI`, one shared `_PL_OPTION_TYPES` list replaces the two duplicated copies.
- Nearby share: `share_server._meta` now passes `faces` and allows option lines up to 160 chars. Phone `MainActivity.cleanVarMeta` does the same, so the phone APK must be rebuilt and reinstalled for faces and long card lines to survive a nearby share.
- Respects `prefers-reduced-motion`: animations skip and the value lands straight away.
- Verified headless (Chromium, disposable app copy): desktop fill panel and phone `vartypes.js` at 390 px, dice, mix, deck, cards, chips multi, legacy fallbacks, no console errors. Not run on a physical phone or in the PyWebView window.
- Backups: `_rollbacks/app v-pre-var-trim.js`, `.css`, `index v-pre-var-trim.html`, `share_server v-pre-var-trim.py`. Phone: `_rollbacks/vartypes v-pre-var-trim.js` in the app-003 folder.

- **Icon, favicon and logo swap (2026-10-11):** all three now use the cream squircle with the teal hardcover book (supplied art, dark background removed, transparent PNG). Regenerated: `icon.ico` and `static/icon.ico` (16 to 256), `app-icon.png` (512), `static/logo.png` (256), `static/logo-mark.png` (128, sidebar), `mac/app-icon.icns`. New: `static/favicon-32.png`, `static/apple-touch-icon.png`, with matching `<link>` tags in index.html. `.brand-mark` CSS no longer crops or borders the logo, since the squircle carries its own shape. Old files backed up in `_rollbacks/` (`icon v2.ico`, `static-icon v2.ico`, `app-icon v1.png`, `static-logo v1.png`, `static-logo-mark v1.png`, `mac-app-icon v1.icns`, `index v-pre-icon-swap.html`, `app v-pre-icon-swap.css`). Not verified in a browser or installer build. The Android app in AI-App-Factory still uses the previous book art.

### Variable types shared data and phone motion (2026-10-13)

- `static/variable-types-data.js` is the source of truth for every variable type (label, group, icon, option mode, hint, defaults, motion style, speed, intensity). The phone gets a byte identical copy through `scripts/sync-vartypes-data.js` in AI-App-Factory `apps/app-003-prompt-library-mobile`. Rerun the sync after any edit. The desktop does not read it yet (Phase 2).
- Phone: new `vartypes-motion.js` owns SVG dice (shape follows the sides: 4, 6, 8, 10, 12, 20, token for anything else, 1 to 6 dice, total when several numeric dice) and motion presets for chips, cards, checkbox list, sliders, step slider, weighted mix, number, percentage, random and deck. `vartypes.js` reads the data file and calls two hooks, with the old lists as fallback. Saved value formats are unchanged, except multi dice save `3, 5, 2 (total 10)`.
- Harness: `apps/app-003-prompt-library-mobile/tests/vartypes/` (regression against a golden snapshot, dice, motion). Not run on a physical phone. Backups in the app's `_rollbacks/` (`*v-pre-motion*`).
- Per variable motion overrides need a new `variable_meta` key, which the phone's Java `cleanVarMeta` and `share_server._meta` would drop until both are updated and the APK rebuilt. Parked.

### Backend bug fixes in app.py (2026-11-11)

- Saving a prompt (`PUT /api/prompts/<id>`) now merges: fields the caller leaves out keep their stored values. Before, the main editor, notes and rating panel, Prompt IDE and others blanked status, parent link, taxonomy, role or folder on every save.
- A version is saved only when title, content or description changes. Pruning (`_prune_prompt_versions`, also used by version restore) keeps the newest 20 ordinary versions and never deletes the baseline or a labelled version.
- Bulk delete now writes `fork_snapshot` into forks like single delete does (`_snapshot_parent_into_forks`).
- Restoring a backup runs `init_db()` afterwards, so an older backup gets the current columns straight away.
- Editing a local library (vault) prompt keeps every other front matter line (description, version and so on) and only renames the file when the title changes. Hand-written `[[Title]]` files keep their format (`_rewrite_vault_markdown`).
- Verified against a disposable copy over HTTP (scratch database and vault). Not clicked through in the PyWebView window. Backup: `_rollbacks/app v-pre-bugfix-five.py`.

### AI engine, Prompt Board rework and showcase folder (2026-11-11)

- One AI caller. `callAI(systemPrompt, userMsg, maxTokens, { json })` now serves the Agents role generator too (`PL_generateRoleWithAI` lost its own copy of the provider calls). `{ json: true }` asks OpenAI and Gemini for JSON and throws when the reply is cut off.
- Model per provider. `_aiDefaultModel(provider)` holds the defaults (same models as before), `_aiModel(provider)` returns the saved choice or the default. API settings shows a Model field for every provider. Choices live in localStorage (`pl_model_<provider>`, Open Router keeps `pl_openrouter_model`) and in the settings table through the new `/api/settings/ai-models` routes (keys `ai_model_<slug>`, no schema change). The same store keeps `second_opinion` and `active_provider`, restored at start because WebView storage can reset.
- Second opinion (Anthropic only, off by default, marked Beta). When on, calls of 1500 tokens or more go through `_aiAnthropicAdvised`: Anthropic advisor tool (`advisor_20260301`, beta header `advisor-tool-2026-03-01`, advisor `claude-opus-4-8`, one use, 2048 token cap), with `pause_turn` resume. Any error falls back to the normal call. Tested only against mocked replies, never against a live key.
- Prompt Board now follows Pinterest patterns in the app's own tokens: icon rail (Home, Boards, Favourites, Tags, New board), centred search pill, tag chips with the sort chip on the right, 236 px masonry pins (colour tile with the prompt text, title below), hover shows the last used board, Save, favourite and copy. Save goes straight to the last used board (`pl_pmb_last_board`), the chip opens the board picker. Pin close up is two columns with More like this below. Board covers are a collage of the first three pins. `_pmbState.pinMap` (board id to prompt ids) is loaded with one pins call per board.
- Pin from anywhere: `window.PL_pinToBoard(promptId, anchor)` opens the `.pin-pop` popover from library cards and `#panelPinBtn` in the detail panel. Pro only.
- Padlocks on Analytics, Prompt Board and the detail tabs no longer show for Pro users (`body.is-premium .nav-lock, .lock`, needs `!important` because the icon font sets display outside the layers).
- `showcase/`: 50 screens in `light/` and `dark/` plus `index.html` gallery, captured in headless Chromium against a disposable database. Eugene asked for Context Bank to be included and for Taxonomy and Version history to be left out.
- Hidden attribute fix (global): `app.css` ends with `[hidden] { display: none !important; }`. Before it, any rule that set `display` kept hidden elements on screen. Cleared in one go: the editor panels under the Prompt Forking picker, a stray "0" badge and empty filter pill in the Library header, the empty state and output section showing together in Prompt Chain, and the Stop button showing while Batch Runner was idle. Do not add per element `[hidden]` rules any more.
- Old Fork Workstation (`#forkWorkstation`, the earlier version of Prompt Forking) had no container styling, so it sat as a loose block at the bottom of the page. It now shares the standard hidden overlay rule. Nothing outside its own code opens it. Removing it for good needs Eugene's go ahead.
- Known bug, not fixed: the full screen prompt viewer never opens. Its IIFE reads `window.state.prompts`, which is never set.
- Stray files seen in `static/`, not touched: `accounts.js` (17 KB, account layer was removed) and `app` (1.1 MB, no extension). Neither is loaded by `index.html`.
- Verified in headless Chromium only, not in the PyWebView window. Backups: `_rollbacks/* v-pre-desktop-upgrade.*`.

### Prompt Builder Pro workspace and launcher lists (2026-11-13)

- New Pro workspace `#builderProWorkspace`, a native port of the standalone Prompt Builder Pro file (node canvas, 112 blocks, 13 templates, agent teams, Markdown import, trace). Source file and the Cowork handover are kept in `docs/prompt-builder-pro/`. All five phases of the handover are done (see the two later sections for phases 4 and 5).
- It lives in its own files, not in `app.js`: `static/builder-pro-engine.js` (compile engine and templates, lifted unchanged, no DOM, exposes `window.PLBuilder = { engine, templates }`), `static/builder-pro.js` (interface, exposes `window.openBuilderProWorkspace`, `window.PL_closeBuilderPro`, `window.__pb` for tests) and `static/builder-pro.css`.
- `index.html` holds one empty root div, one stylesheet link after `app.css`, and one line in the inline script that loads the two scripts at boot in order (`s.async = false`). All three carry a hand-set `?v=` value (currently `20261113c`). `update_hash.py` does not touch that value, so change it by hand whenever one of the three files changes.
- The markup is built once, while the page is idle after boot. The canvas measures the DOM, so the first paint happens on first open (`api.show()`). Measured open time from the launcher card: about 30 ms, no network request.
- Scoping rules to keep: every id and class is prefixed `pbp-`, every CSS rule sits under `#builderProWorkspace`, colours come from `app.css` tokens only (no hex, no blur), icons are Material Symbols (`ICONS` map in `builder-pro.js`, one name per block type). Shared pieces come from the app: `ws-header`, `btn`, `icon-btn`, `form-input`, `form-textarea`, `window.PL_toast`.
- Listeners sit on the workspace root. The one `document` keydown listener returns at once unless the workspace is open. Escape closes a dialog first, then deselects a block, then closes the workspace. Routine canvas actions (add, connect, remove) no longer raise a toast because the app toast is larger than the builder's old one.
- The saved canvas stays in localStorage under `prompt-builder-pro.v5`. No database or schema change.
- Pro gate: the launcher card has `data-premium="true"`. `showPremiumModal` and `state` are private to the `app.js` IIFE, so `openBuilderProWorkspace` checks `body.is-premium` and refuses with a toast when called directly by a free user.
- Deliberately not done: no nav route and no command palette entry (there is no `data-view` button, and `app.js` growth was kept to the `_escapeToLibrary` entry plus the launcher collapse). The phone layout from the standalone file (bottom tab bar under 960 px) was dropped because the desktop app does not run that narrow. `mac/setup.py` was not updated (its file list was already missing fonts and `gauntlet-suite.js`).
- Launcher: new first list `data-group="favorites"`, label "My Favorites", icon `bookmark_heart`, pink icons, holding the Prompt Builder Pro card. Eugene will name more cards later. The left nav Favorites view for starred prompts is a separate thing.
- Launcher: every list header is now a `button.launcher-group-label.launcher-group-toggle` with `aria-expanded` and a chevron. Collapsed lists get `.is-collapsed`, saved per list in localStorage `pl_ws_collapsed` (a map of group name to 1, default all open). While a search is typed, `#launcherGrid.is-searching` shows matches inside collapsed lists, and the collapsed state returns when the search is cleared. Code: `_launcherCollapsed`, `_applyLauncherCollapse` beside the launcher code in `app.js`.
- Found while checking the handover: `Prompt Library Interface Files/` does not exist in this repo although `CLAUDE.md` describes it, the Protect list has no icon colour rule (the CSS still names an old `organize` group), and `grep -c "<script" static/index.html` is 5.
- Verified in headless Chromium against a disposable database (scripted Playwright): launcher collapse by mouse and keyboard, persistence across reload, search with every list collapsed, all 36 launcher cards open, all 13 templates show "Ready to copy", wire drag, block drag, inspector focus, copy, import, trace, close, free user gate, light and dark at 1280, 1600 and 1920. Not run in the PyWebView window.
- Backups: `_rollbacks/* v-pre-builder-pro.*`.

### Prompt Builder Pro: Component Library connection and Workshop (2026-11-13)

This is handover phase 4, done.

- Prompt Builder Pro uses the existing Component Library. There is no second dataset and `static/components-data.js` was not touched. Its sidebar has a Workshop section above the Block library with an "Open library" button.
- Gallery switch, the only change to existing gallery code (`app.js`, 24 lines): `window.PL_galleryBorrow(host)` with `host = { label, onCheckout }`. Borrowing swaps `_galCart` with a spare kit (`_galSpareKit`), so the Prompt Components kit and the Workshop kit never mix, and sets the bar button to "Add all to <label>". `_galCheckout` hands the kit to `host.onCheckout` and returns before touching the Components canvas. The kit view button uses the same label. `PL_galleryBorrow(null)` swaps the kits back and restores "Add all to canvas".
- `builder-pro.js` moves the `#pcwGallery` element into `#builderProWorkspace` while it is borrowed and puts it back in its original slot when it closes. A MutationObserver on the gallery's `hidden` attribute and on the workspace's `class` does the hand-back, so it also happens when `_escapeToLibrary()` closes the workspace.
- Gallery handlers are only wired the first time `openComponentsWorkspace()` runs. If Components has never been opened, the builder calls it once and removes its `open` class in the same tick (nothing is painted). Do not "tidy" this away without moving the wiring out of `openComponentsWorkspace` first.
- The gallery inherits font size and line height, so `builder-pro.css` resets them on `#builderProWorkspace > .pcw-gallery` (`1rem`, `1.55`, the body values). A scripted check confirms the gallery renders identically in both workspaces and both themes.
- Workshop: list of `{ label, text, cat, icon, badge }` in localStorage `prompt-builder-pro.workshop.v1`. Items stay after use (Eugene's choice), exact duplicates are skipped and the toast says how many. Each item drags onto the canvas and has "Add to canvas" and remove buttons.
- Compatibility layer: one generic block type per prompt section, `component_<section>` for 14 sections, registered on the engine's `BLOCKS` when `builder-pro.js` loads. The engine file is unchanged. They are not in `LIBRARY`, so they do not show in the Block library. Node config is `{ title, content, original, source: { label, cat, icon, badge } }`.
- Section choice: `guessSection` matches the label first (`SECTION_BY_LABEL`), then the category (`SECTION_BY_CAT`), otherwise Task. The block settings have a "Prompt section" dropdown. Changing it changes the node's type and keeps its wires, because every component type has the same ports.
- Label strip: `stripOwnLabel` runs on a copy of the nodes inside `compile()` and the JSON download. It removes a leading label only when it matches the record's own label, the block name or the section heading. Stored text is never changed. Only about 19 dataset blocks start with their own label. Around 2,700 start with a different label (for example "Organization:"), which is content and is kept.
- `compile()` also removes role, task or output from the engine's "missing" list when a wired component sits in that section, because the engine checks by block type.
- Facts found: the `window._pcw*` globals are not the raw file. `app.js` merges the file with its inline blocks, removes duplicates and adds a colour per category, then reassigns them. The file has 3,784 blocks, 24 categories and 641 frameworks. Frameworks have no category or icon.
- Verified in headless Chromium (scripted Playwright, disposable database): the seven tests in the brief, kit separation both ways, clean hand-back, section change, label strip, wiring into and out of an agent block, Escape closing the library only, and the earlier launcher and workspace suites for regressions. Not run in the PyWebView window.
- Backups: `_rollbacks/* v-pre-workshop.*`.

### Prompt Builder Pro: sidebars, export formats, quick tour (2026-11-13)

Handover phase 5, done. All five phases of the Prompt Builder Pro handover are now complete. Eugene reviewed phases 1 to 4 and approved the look ("absolutely gorgeous"), so treat the current visual treatment as the baseline.

- Sidebars collapse on their own. A 14 px strip (`.pbp-rail`, a real button with `aria-expanded`) sits between each sidebar and the canvas. State lives on the root as `data-pbp-left-closed` and `data-pbp-right-closed`, widths come from `--pbp-left` and `--pbp-right` on `.pbp-body`, and every grid child has an explicit `grid-column` so a hidden sidebar cannot shift the others. Saved in localStorage `prompt-builder-pro.panes.v1`.
- Export: one Export menu in the prompt panel footer (`#pbp-export-menu`, opens upwards) with Text, Markdown, JSON and XML. `buildExport(kind)` builds each from the compiled prompt. JSON is the engine's Messages format and is run through `JSON.parse` before saving. XML is built in `builder-pro.js`, not by the engine: one `<prompt title="">` root, one child per section using the engine's section tags, text escaped, then parsed with `DOMParser`. A failed check saves nothing and says so. The old `.txt` and `.json` footer buttons are gone. "Export prompt (Markdown)" in the Workflow menu uses the same code.
- The XML tab in the live preview still shows the engine's XML (several top level tags, not escaped). That is for pasting into a chat, the XML export is the valid file. Do not confuse the two.
- Quick tour: five steps (`TOUR_STEPS`) with a ring around the target and a card beside it. It starts by itself the first time the workspace is opened, and the flag button in the header (`data-act="startTour"`) replays it. Seen flag in localStorage `prompt-builder-pro.tour.v1`. It opens collapsed sidebars while it runs and puts them back afterwards without saving that. Escape skips, the arrow keys step.
- Any `.pbp-menu` closes on an outside click or Escape (was only the Workflow menu).
- The three builder files now carry `?v=20261113c`.
- Verified in headless Chromium: all four sidebar combinations with wires still on their ports, keyboard toggles, state across a restart, the four exports including text with `&`, `<`, quotes, `]]>` and emoji, the tour by button and keys in light and dark and at 1280 wide, plus every earlier suite. Not run in the PyWebView window. File download from inside PyWebView is the part most worth checking by hand.
- Backups: `_rollbacks/* v-pre-phase5.*`.

### Dice cleanup: calmer cube (2026-11-15, branch desktop-combine-verify)

Only `static/vartypes-3d.js` dice section changed (card deck, drums, roll logic untouched). Dice stay a six faced cube. Changes: face shading lowered (max opacity 0.14, was 0.2), face stroke 1.5 with `paint-order:stroke` for even edges, pip radius 0.125 R on the same 3 by 3 grid, face text box 1.5 x inner radius with max size 22 (was 1.8 and 24) so words have padding, ground shadow softened with a small box-shadow spread at opacity 0.4. Backups: `_rollbacks/15-11-2026-vartypes-3d-pre-cleancube.js`, `-randomiser-motion-pre-cleancube.js`, `15-11-2026-MEMORY-pre-cleancube.md`. `static/vartypes-3d.js` now differs further from the phone's `assets/vartypes-3d.js`: copy it there too. Rolled result checked against the landed face (15 rolls, plain, 3 and 20 option lists). `tests/randomiser` passes.

### Library scope bar: favourites and folders above the list (2026-11-15)

- Eugene found the Library one long list. Favourites sat inside the Filters popover and the sidebar Folders section starts collapsed and sits under the licence panel, so folders were easy to miss.
- New row of chips above the list (`#libraryScopeBar`, `renderScopeBar()` in app.js, `.scope-*` rules in app.css): All, Favourites, then every folder A to Z with its count. A chip calls `PL_setView`, so it is the same view as the sidebar (title, breadcrumb, New in folder, Rename, Delete folder). Empty folders show faded. One line that scrolls sideways (mouse wheel works), the active chip scrolls into view. Hidden in local library (vault) mode and outside the Library views.
- `renderScopeBar()` runs from `updateCounts()` and `renderFolders()`, so stars, moves and new folders refresh it.
- `#contentHeader` got `min-width: 0` so a wide row can never push the page wider than the window.
- Known, not fixed: below about 500 px wide the library cards squash to a narrow column (card actions take the width). Same before this change.
- Verified in headless Chromium against a disposable database (160 prompts, 9 folders, 14 favourites) at 1366 and 390 px wide. Not checked in the PyWebView window. Backups: `_rollbacks/* v-pre-scope-bar.*`.
- JSON exports (`/api/export` and the JSON inside `/api/export/bulk`) now carry `folder` (the folder's name, empty when none) beside `folder_id`, so the phone app can show folders. Markdown exports unchanged, because the desktop Markdown importer would read a Folder line as prompt text. Backup: `_rollbacks/app v-pre-export-folder.py`.

### Combine two prompts instead of deleting a duplicate (2026-11-15)

- New `static/combine-prompts.js` and `static/combine-prompts.css` (own files, so app.js grows by one bridge object and two lines). Side by side view of two prompts: pick A, B or both per field (title, prompt, description, tags, categories, folder, favourite, notes) or edit the combined value. Fields that match are folded into one line. Variables follow the combined prompt text; when both prompts set up the same variable differently, a per variable A or B toggle picks the settings.
- Entry points: `#bulkCombineBtn` in the bulk toolbar (shows only with exactly 2 selected), `#panelCombineBtn` in the detail panel (opens a picker sorted by similarity, same Jaccard scorer as Library Organizer), and `window.PL_openCombine(idA, idB)` for other workspaces. Fires `pl:prompts-combined` on window after a combine or undo.
- `window.PL_libraryBridge` (end of the main IIFE) exposes api, toast, loadPrompts, loadFilterOptions, openDetail, closeDetailPanel, bulkDeselectAll, getState, getBulkSelection for files outside app.js.
- Backend: `POST /api/prompts/combine` inserts the combined prompt and removes both originals in one transaction (nothing is removed if the save fails). Carries over board pins, taxonomy use cases, related links and composition links, adds up use counts, keeps the latest last used, highest rating. Forks of a removed original get the usual parent snapshot. Locked prompts are refused (423). `POST /api/prompts/combine/undo` puts the originals back with their own ids, versions, usage log, pins and links, and removes the combined prompt. Undo snapshots live in memory (last 20), so undo ends when the app restarts. Undo returns 409 if the combined prompt was edited since, unless `force`.
- No schema change, no new dependency. Test: `python tests/combine/test_combine.py` (throwaway database).
- Library Organizer's duplicate card still offers only "Keep this, delete other"; the swipe organizer work is adding a Combine button that calls `PL_openCombine`.
- Verified in headless Chromium against a throwaway database only, not in the PyWebView window. Backups: `_rollbacks/* v-pre-combine.*`.

### Library organiser swipe deck (2026-11-15)

- Every pile in the Library organiser except Duplicates is now a swipe deck: one prompt card at a time. Right or the right arrow keeps, left or the left arrow archives, Delete or Backspace marks for deletion, Z undoes. Buttons do the same.
- Engine is `static/swipe-deck.js` (`window.PL_SwipeDeck.create(host, options)`), lazy loaded by `_pulseLoadDeck`, so `index.html` has no new script tag. The phone app carries a byte identical copy in its assets folder. Change both or neither. Motion uses the Web Animations API, so a reduced motion CSS rule cannot freeze it. Under reduced motion the timings shrink to 0.7.
- Archive is the category `Archive` (no schema change). Archived prompts drop out of the organiser piles. The main list still shows them: hiding them there is a follow up.
- Delete never removes straight away. Marked prompts sit in `_pulsePendingDel` until "Delete N now" or closing the organiser, and both ask first. Cancelling keeps them.
- New pile "Every prompt" lists everything not yet kept, oldest edit first. Kept ids live in localStorage `pl.organiserKept`, cleared by Start over.
- Duplicate pairs keep their side by side review. They get a Combine button only when `window.PL_openCombine` exists (combine flow, PR 67), and the organiser rescans on the `pl:prompts-combined` event.
- Touch bug fixed in the engine: on touch screens the browser holds the finger on the inner element, so a bubbled `lostpointercapture` cancelled every drag. The handler now only reacts when the event target is the card itself.
- Tested in headless Chromium on a scratch database at 1280 and 390 wide, 26 checks. Not tested in the PyWebView window or on Eugene's real database. Backups: `_rollbacks/* v-pre-swipe-deck.*`.

### Prompt Board masonry reads left to right (2026-11-15)
- `.pmb-masonry` feeds (Home, single board, More like this) are now laid out by `_pmbMasonry` in app.js: each pin goes into the shortest column, so the sort order runs along the top row like Pinterest. Before this, CSS `columns` filled each column top to bottom, so the newest pins stacked down the left column.
- Column width and gap still come from app.css (`columns: 236px`, 160px under 900px, 200px for More like this). The JS reads them with getComputedStyle and builds `.pmb-masonry-col` flex columns; a ResizeObserver relays when the column count or width changes. The CSS columns stay as the fallback if JS layout never runs.
- Backups: `_rollbacks/app v-pre-board-masonry.js`, `.css`.

### Prompt X-Ray views from Prompt Forge (2026-11-15)

- X-Ray has a View dropdown under the prompt box: Classic (the old six parts, unchanged), My frameworks, Popular (18 picks) and all 353 Prompt Forge layouts. Changing the view rebuilds the cards straight away; the choice is kept in localStorage `pl_xray_view`.
- Splitting for Forge views lives in `static/xray-views.js` (`window.PL_XRAY_VIEWS`), shared byte for byte with the phone app. It reads headings first (a `## Situation` section lands in Situation), otherwise scores each sentence: the classic part it looks like, matched to the Forge part whose name points at that classic part, plus words shared with the part's name and hint. Anything with no match goes to Unclassified. Offline, keyword scored, no AI.
- Copy and Save use the chosen view's part names as headings. Prompt Splicer still uses the classic six parts (`XRAY_PARTS`), untouched.
- Verified in headless Chromium against a disposable database (18 checks), not in the PyWebView window. Backups: `_rollbacks/* v-pre-xray-views.*`.

### Branch combine (2026-11-15)

- This branch is origin/main (Prompt Builder Pro, launcher My Favorites) plus 8 merged feature branches: library-scope-bar (favourites and folder chips), combine-duplicates, organiser-swipe-deck, pinterest-board, context-bank-own-categories, xray-forge-views, nearby-background, randomiser-motion.
- Conflicts were only `?v=` cache-bust lines and MEMORY.md; hashes regenerated with update_hash.py. `grep -c "<script" static/index.html` is now 5+ on main by design (the old "3" check is stale).
- Verified in headless Chromium: page loads, no console errors, libraryScopeBar and openBuilderProWorkspace present, new scripts served. Not yet clicked through each feature, not run in PyWebView.
- NOT merged, decisions needed: ccr-a045f841-s45c5q (Context Bank rework, direct clash with own-categories, needs hand merge); claude/sharp-ptolemy-1lwhno (removes variable types, overlaps randomiser-motion); feature/prompt-switchboard and three old variable-type branches (wizardly-ptolemy, variable-types-original, relaxed-gauss reldate) are unique but unmerged; Prompt Rush (sleepy-brown) is a separate game. Other branches were judged already in main or stale.
- Backups: `_rollbacks/*.15-11-2026-pre-combine`.


### Context Bank rework (2026-11-13)

- Ways in: launcher card in the Build group (`data-open="openContextBankWorkspace"`, Pro), `#ctxPanelToggleBtn` (Context) in the New prompt window, command palette, tour step. Before this the command palette was the only way in.
- Layout: find bar (`#ctxSearch`, pills in `#ctxCategoryRow`, `#ctxSort`), block tiles in `#ctxList`, editor in `#ctxEditorForm`. New classes use the `ctxb-` prefix. The old `.ctx-*` workspace rules are gone from `app.css`. The `.ctx-panel-*` rules stay, because the Snippets panel shares them.
- Block shape: `{id, title, category, content, created, updated, pinned}` in localStorage `pl_ctx_blocks`. Old blocks without `updated` or `pinned` load as they are.
- Categories are free text. Pills and the panel chips are built from the blocks with `_ctxCategories()`, known names first (`CTX_CAT_ORDER`), Other last. The editor select has a "New category" option.
- Wrap style: `pl_ctx_wrap` is `plain`, `labelled` (default, same text as before) or `xml` (`<context name="Title">`). `_ctxWrapText()` serves Copy, Use in new prompt and the panel insert. `_ctxInsertAt()` puts text at the cursor on its own lines.
- Unsaved changes: `_ctxGuard(next)` holds any action that would drop an edit behind the `#ctxGuard` bar (Save, Discard, Keep editing). Escape closes the bar first, then the workspace.
- Delete (`#ctxDeleteBtn`) sits in the editor top bar beside the pin, because toasts cover the bottom right corner. It shows a 7 second Undo toast (`_ctxUndoToast`), and Undo clears a filter that would hide the restored block. Duplicate, pin, sort by recent or name, word and token count, Ctrl+S.
- Export writes one JSON file (`type: prompt-library-context-bank`) through `/api/save-file`, with a browser download as fallback. Import takes that file or a bare array and skips blocks with the same title and content.
- Saved copy: `_ctxSave()` also posts the blocks to `/api/settings/context-bank` (settings key `context_bank_blocks`, no schema change). `_ctxSync()` runs at start: if `pl_ctx_blocks` is missing and a copy exists, the copy is restored, otherwise the copy is refreshed from localStorage. `openContextBankWorkspace` and the panel wait for it. If the read fails, `_ctxCopyUnread` stops seeding and pushing until a later read works, so the starters can never overwrite the copy.
- Seeding fix: `_ctxSeedTemplates` now adds the 60 starters after any blocks already stored. Before, it replaced them.
- The workspace has `tabindex="-1"` and `_ctxKeepFocus()` so Escape and Ctrl+S work after a focused button is hidden.
- Verified in headless Chromium at 1280 px against a disposable data folder, light and dark. Not run in the PyWebView window. The native Save As window for Export could not be opened there.
- Backups: `_rollbacks/* v-pre-context-bank.*`. Job files and screenshots: `jobs/context-bank/`.

### Branch combine follow-up (2026-11-15), supersedes the notes above where they differ

- Library scope bar (favourites and folder chips) REMOVED again: Eugene did not like how it looked on desktop. The JSON export folder name change from that branch stays. The launcher's My Favorites list from main is unchanged.
- Dice are always six sided on desktop. `static/vartypes-3d.js` is untouched (it must stay byte for byte with the phone). Instead `app.js` forces 6 faces, the variable editor Sides field is hidden and no longer saved, and `app.css` hides the sides stepper and presets (`.vd [data-vdk="sides"]`, `.vd .vd-presets`). Custom word faces still set their own face count.
- Context Bank rework (ccr-a045f841-s45c5q) is now merged: Pro launcher card, Context button and side panel in the New prompt window (`#ctxPanelToggleBtn`), category pills with counts, sort, pin, duplicate, saved copy through `/api/settings/context-bank`. It replaces the own-categories manager: rename and remove of custom categories is gone, new categories are made by typing one in the block editor. The dead own-categories code (`CTX_CATS_KEY`, `_ctxCatUI`, `_ctxRenderCatManager` and related) was deleted from `app.js`.
- Verified in headless Chromium (disposable data folder): launcher card present, workspace opens with 60 starter blocks and 12 pills, New prompt Context panel opens, no console errors. Not run in PyWebView, not clicked through block editing, pin or import.
- Backups: `_rollbacks/*.15-11-2026-pre-dice6` and `*.15-11-2026-pre-ctxbank`.
- Still unmerged: claude/sharp-ptolemy-1lwhno, feature/prompt-switchboard, three older variable-type branches.

### Working rule: always state the branch (2026-11-15)

- Claude must say which git branch it is on in every reply that touches the repo, taken from `git branch --show-current` at the time, never from memory. Eugene works across many branches and needs to know which version he is looking at.
- Current working branch for this combine work: `ccr-e4605b92-9rygdj` (draft PR 70 into `main`). `main` has not been changed.

### Working rule: name branches by purpose (2026-11-15)

- New branches get a name that says what they hold, for example `agents-builder-pro` or `context-bank-categories`, not a random id. Eugene should be able to read the branch list and know what each one contains.
- Format: lowercase, words joined by hyphens, feature first. One purpose per branch.
- Cloud sessions are told to develop on a fixed branch (currently `ccr-e4605b92-9rygdj`) and that name cannot be changed by Claude. When the session branch is fixed, say so and suggest the purpose name for the PR title instead.

### Desktop combine verification (2026-11-15)

- Branch `desktop-combine-verify`, from `ccr-e4605b92-9rygdj`. Full report: `outputs/15-11-2026-desktop-verification.md`.
- Pinterest Prompt Board, X-Ray layouts (all 372 picker options), nearby share (quick then full scan merge, send and accept between two instances), Context Bank (launcher card, block CRUD, pin, duplicate, delete with Undo, import and export, saved copy restore, New prompt Context panel) and Prompt Builder Pro (launcher, wiring, compile, four exports, `PL_galleryBorrow`, My Favorites collapse) were clicked through in headless Chromium on a disposable data folder. All pass, no console or network errors, all 37 launcher cards open.
- No application file was changed, so no cache hash or Builder Pro `?v=` bump was needed.
- The `<script` count in `static/index.html` is now 8 (components-data, forge-frameworks, xray-views, qrcode.min, app.js, randomiser-motion, vartypes-3d, inline bootstrap). The 5 in `CLAUDE.md` is stale. Use 8 for the truncation check.
- `tests/randomiser` needs the Python `playwright` package and `CHROME` set. It passes (the phone drift check skips without `PHONE_ASSETS`).
- Still open: nearby share on real devices, committing the click through scripts as tests.
- `CLAUDE.md` updated 2026-11-15: the `<script` count is now 8 everywhere it appears (architecture line, gotchas, triage, corrections). Backup: `_rollbacks/15-11-2026-CLAUDE.md`.

### Dice cube only, card fit, shuffle styles (2026-11-15, branch desktop-combine-verify)

- Desktop dice are now always a 3D six faced cube, including custom option lists (a 20 option die used to draw a d20 solid). With more than six options the face that lands is rewritten with the rolled option, never the face already showing. Long option text wraps onto up to three lines on the face.
- The dealt card grows to fit its text (wider by the longest word, then taller, table makes room). Whole words are kept.
- Card shuffle styles: Riffle (default), Overhand, Fan out, Surprise me. Setting is in Settings, Randomiser motion, stored in localStorage `pl.shuffleStyle`.
- `static/vartypes-3d.js` NO LONGER matches the phone's copy byte for byte. The phone repo (AI-App-Factory, `assets/vartypes-3d.js`) needs the same change, or this file must be reconciled before the next phone sync. `tests/randomiser` only flags the drift when `PHONE_ASSETS` is set. Backups of the pre change files are in `_rollbacks/15-11-2026-*`.
- Open: Eugene asked (mid session) for a nicer look across all buttons and a replacement for the red glowing Dark mode orb in the sidebar. Not started, waiting on direction.

### Sub-agents for dice and card polish (2026-11-15)

- Added `.claude/agents/dice-polish.md` and `.claude/agents/card-polish.md`. Each owns the look of one randomiser (dice cube, card deck) in `static/vartypes-3d.js` and `static/randomiser-motion.js` only, never behaviour. They carry the fixed decisions (cube only, result chosen first, card fits its text, shuffle styles, no gradients) and require backups, scripted Playwright before and after screenshots, `tests/randomiser`, and a phone drift warning. Neither has been run yet.

## Card deck polish (2026-11-15)

Only the `.vc*` CSS block in `static/vartypes-3d.js` changed (markup, drawCard, fitCard, shuffles and motion untouched). Card and table radius now `--r-lg`, table border `--line-strong` with a faint inset shadow, deck cards carry `--shadow-sm` and the bottom card `--shadow-md` (shadow under the stack), dashed slot uses `--line-strong` on `--surface-sunk`, dealt face has 12px 11px padding, 16px type, `--shadow-md` and an inner `--accent-line` hairline frame (`.vc-face::before`), row spacing 12px. No gradients, no new colours. Checked: all three shuffle styles complete and deal, light and dark, 5, 3 and 20 option decks, "Chief AI Technology Officer", a 7 word option and "Internationalisation" fit with no clipping. `tests/randomiser` passes. Backups: `_rollbacks/15-11-2026-vartypes-3d-pre-cardpolish.js`, `15-11-2026-MEMORY-pre-cardpolish.md`. The phone's `assets/vartypes-3d.js` needs the same CSS edit (it already differs).

### Buttons 3D (2026-11-15, branch desktop-combine-verify)

- Every button family now shares one set of tokens in `app.css` (`--btn-edge`, `--btn-rest`, `--btn-hover`, `--btn-down`, `--btn-lift`, `--btn-sink`, `--btn-spring`, light and dark): soft top highlight, short bottom edge, small drop, 1px lift on hover, 1px sink on press, springy return, `--ring` focus, flat when disabled, reduced motion drops the transforms. No gradients, no blur, no new hex colours.
- Five areas were restyled by separate agents and merged: core `.btn` family (accent, primary and danger tint their edge through local `--be` and redefined shadow tokens; ghost stays flat; old `scale(0.96)` press and the `#contentHeader .btn` shadow override removed), sidebar rows, `.icon-btn` keycaps, `.chip`, sort select, view toggle, Forge tabs, `.panel-toggle-btn`, launcher cards (grid gap 3px to 7px) and component, framework, department, gallery and role cards, workspace picker buttons, Builder Pro (`builder-pro.css`), Prompt Board (`pmb-*`) and the randomiser buttons (CSS in `vartypes-3d.js` and `randomiser-motion.js`).
- Theme toggle: `#themeToggleBtn` is now a raised button with a sun or moon mark in the accent colour that rotates and fades on toggle. The red and blue orb and its `#ff0000` and `#2a4dff` are gone. `app.js` never sets `#themeLabel`, so CSS flips the visible label to "Light mode" in dark mode (the DOM text and `aria-checked` are unchanged).
- Builder Pro `?v=` bumped to `20261115a` (both places in `index.html`). `update_hash.py` run. Backups: `_rollbacks/15-11-2026-*pre-*`.
- `static/vartypes-3d.js` has drifted further from the phone's copy (now also button CSS). The phone repo needs the combined patch.
- Merge note: agents' worktrees were first cut from an old base, so each merged `desktop-combine-verify` before working. Shared scratchpad scripts can be overwritten by agents: use unique names.

### Rounder cube (2026-11-15)

- Dice faces are drawn inset and stroked with a round join, so every cube corner has a radius of `ROUND * R` (`ROUND = 0.2` in `faceSvg`, `static/vartypes-3d.js`). An outline underlay `.vd3-o` carries the edge colour, `.vd3-p` the face, `.vd3-s` the shade. The landed face turns its outline accent. Raise or lower `ROUND` to change the roundness. Phone copy of `vartypes-3d.js` still needs the combined patch. Backup: `_rollbacks/15-11-2026-vartypes-3d-pre-round.js`.

### Card deck shuffle types (2026-11-15, in progress)

- Each card shuffle is its own variable type: `deck_overhand`, `deck_riffle`, `deck_hindu`, `deck_strip`, `deck_wash`, `deck_faro`, `deck_mongean`, `deck_pile`, `deck_charlier`, `deck_cascade`, `deck_cut`, `deck_fan`, shown in the variable editor under "Card decks (one shuffle each)". The older `carddeck` type stays and follows Settings, Randomiser motion, Card shuffle style.
- Plumbing: `vartypes-3d.js` registers every `deck_*` type through `deckHtml` (the `.vc` element carries `data-shuffle`), keeps a registry `PL_MOTION.shuffles` and exposes `PL_MOTION.deck` helpers. New file `static/deck-shuffles.js` (script tag count is now 9, cache busted by `update_hash.py`) holds one marked section per shuffle. `app.js` has `_PL_DECK_STYLES`, `_PL_DECK_TYPES`, `_PL_isDeck`. A shuffle that is not written yet falls back to riffle. Backups: `_rollbacks/15-11-2026-*-pre-decktypes.*`.
- Phone: `variable-types-data.js`, the phone's `vartypes.js` and `vartypes-3d.js` need the new types and `deck-shuffles.js` (new shared file).

### Card deck shuffles written (2026-11-15)

- All 12 shuffles are written in `static/deck-shuffles.js` by four agents (A overhand, hindu, strip; B riffle with bridge, faro, cascade; C wash, pile, mongean; D charlier, cut, fan) and merged. Each `deck_<id>` type runs its own animation; `carddeck` follows Settings, Card shuffle style (riffle, overhand, fan, surprise me) and now gets the better registered versions of those three.
- Checked in a browser: 12 shuffles x 2 window widths (1440 and 900) x full and short motion = 48 draws, all complete, correct dealt value, no console errors. Full mode takes about 3.4 to 5.3 s per draw (two passes, gather, deal), short about 1.5 to 2.3 s. Card positions were sampled each frame: cascade (15 to 17px over the table top), wash (6px left) and mongean (2px) clipped, fixed (lower arch and lift, wider wash margin) and re-checked at 0px. Backup: `_rollbacks/15-11-2026-deck-shuffles-pre-clipfix.js`.
- Not done: phone port (`deck-shuffles.js`, `vartypes-3d.js`, `variable-types-data.js`, `vartypes.js` and `MainActivity.java` check), dice roll styles as separate types (waiting on Eugene's list), the checkbox of whether the long full mode passes feel too slow.

### Dice roll style types (2026-11-15, in progress)

- Same pattern as the decks: each roll style is its own variable type, `dice_tumble` (the existing `diceroll`), `dice_drop`, `dice_cup`, `dice_spin`, `dice_throw`, `dice_tray`, `dice_flip`, `dice_float`, in the editor under "Dice rolls (one style each)". `vartypes-3d.js` has `diceHtml` (the `.vd` carries `data-rollstyle`), the registry `PL_MOTION.rolls` (tumble is the existing `throwDie`) and `PL_MOTION.dice` helpers. New file `static/dice-rolls.js` (script tag count is now 10, cache busted by `update_hash.py`) holds one marked section per roll; a style not written yet falls back to the tumble. `app.js` has `_PL_DICE_STYLES`, `_PL_DICE_TYPES`, `_PL_isDice`. Backups: `_rollbacks/15-11-2026-*-pre-dicetypes.*`.

### Shared Context Bank picker (2026-11-15)

- `window.PL_ctxPicker(anchorEl, target, opts)` (in `app.js`, next to the New prompt Context panel code) opens a floating Context Bank list (search, category chips, wrap choice, Open Context Bank) under any button and inserts the chosen block at the cursor of `target` (a textarea or input, a selector, or a function returning one). `opts.onPick(block)` replaces the default insert. `window.PL_ctxList()` resolves to every block as `{ id, title, category, content, wrapped }`. Styles `.ctxpick*` at the end of `app.css`. Workspaces should use this, not a second picker. Backups: `_rollbacks/15-11-2026-app-pre-ctxpicker.*`.

### Dice rolls and Context Bank in workspaces written (2026-11-16)

- All 8 dice roll styles are written in `static/dice-rolls.js` by four agents (A drop, flip; B cup, float; C spin, tray; D hard throw) and merged. Each `dice_<id>` type rolls its own way, the plain `diceroll` stays the tumble. Checked with 1, 3 and 6 dice at once for all 8: no die or shadow leaves the stage (worst case 0.3px, six dice, spin and tray). `roll()` now clears stale `.win` highlights at the start of each roll (it used to leave several faces marked on non-list dice).
- Context Bank is inside the workspaces: 13 text workspaces have a header "Context" button (`data-ctx-pick="last"`, `data-ctx-default="<selector>"`, one delegated listener plus a `focusin` tracker before `_ctxPanelSaveNew` in `app.js`, Pro gated like the launcher card). Prompt Builder Pro has a Context button in the Workshop header that adds a `component_context` node (`window.PL_bpAddContext`), Prompt Components has a header Context button that adds a canvas block with category Context (`window.PL_pcwAddContext`), and the Context Bank editor footer has "Use in a workspace" (Builder Pro, Components, Forge, Quick Fill; the text ones copy the block to the clipboard). A new text workspace needs only a button with those two attributes. Builder Pro `?v=` is now `20261116a`.
- Verified after merging everything: Context Bank CRUD, undo, import and export, saved copy; Prompt Board; X-Ray; Builder Pro (all flows); 12 deck types; 8 dice types; buttons in light and dark; all 37 launcher cards; `tests/randomiser`, `tests/combine`, `tests/nearby`.
- Still open: the phone patch (new shared files `deck-shuffles.js`, `dice-rolls.js`, `vartypes-3d.js`, type data, `vartypes.js`, `MainActivity.java` check), whether full mode is too slow, the dice and deck feel in the real Windows app, and the launcher in dark mode.

### Shift+F3 case cycle and Components canvas contrast (2026-11-16)

- **Shift+F3 case cycle** lives in `static/app.js`, section "SHIFT+F3 CASE CYCLE", inside the main IIFE (the file has three IIFEs; `toast` is only visible in the first, so keep it there). One capture-phase `keydown` on `document`. Works on the selected text in any focused editable `<textarea>` or `<input>` of type text, search, url or tel. Read-only text and `contenteditable` are not handled (there is none in the app).
- Cycle order: Title Case, lowercase, UPPERCASE, Capitalised Each Word, Sentence case, then back to Title Case. Title Case keeps minor words lowercase (Chicago style list) except the first word, the last word and a word after `:` or a sentence end. A mode that would not change the text is skipped. The next press continues from the last mode only if the selection still holds the last result, otherwise it restarts at Title Case.
- `[[variable]]`, `{{variable}}` and `((variable))` placeholders are never changed, and count as words for first or last word rules. The edit uses `document.execCommand('insertText')`, so Ctrl+Z undoes it and the `input` event fires; falls back to `setRangeText`. The selection is kept after each press. A short toast names the mode. No selection gives a hint toast.
- Verified headless (Chromium, disposable data folder): 9 checks pass (cycle order, variables, partial selection, input field, no-op skip, undo, selection kept, no selection, input event) with no page errors. Not yet run in the real PyWebView window. Backup: `_rollbacks/app.js.16-11-2026-pre-casecycle`.
- **Components canvas contrast:** in light mode the canvas (`--bg`, 93.5%) and the cards (`--surface`, 95.2%) were 1.05:1 and the dot grid was almost invisible. New tokens in `app.css` (`--canvas-well`, `--canvas-edge`, `--canvas-dot`, `--canvas-text`, defined in `:root` and `:root[data-theme="dark"]`): light mode canvas is `--surface-3` (cards 1.23:1 against it, card and dashed border about 2.4:1, hint text 8.97:1); dark mode keeps its old values. Used by `.pcw-canvas`, `.pcw-drop-zone`, `.pcw-canvas-block`, `.pcw-view-tools`, `.pcw-drop-hint`, `.pcw-qs-label`; empty state text has a canvas coloured halo so dots do not cross it. Dot size went from 1px to 1.2px. Backup: `_rollbacks/app.css.16-11-2026-pre-canvascontrast`.

### Editor, licence, Context Bank, Combine and Components nodes (2026-11-16)

- **No free tier inside the app.** `#activationGate` (index.html, styled in app.css, logic `_gateOpen` / `_gateSubmit` next to `loadStoredLicence` in app.js) covers the app (`#app` is `inert`) until a valid key is saved: it validates with `/api/licence/validate`, saves the key to the database straight away, and fires `pl:licensed`. `FREE_LIMITS` and every "Free plan" toast are gone. The first run app tour waits for `pl:licensed`. Existing free users are asked for a key on the next launch. The pricing modal (with its Free card) and the `premium-locked` markup are dead code now. Global shortcuts do nothing while `body.gate-open`.
- **Variables panel.** The Variables tab left Advanced Settings: a `Variables` button (`#varsPanelToggleBtn`, with a count badge) sits beside Components, Context and Snippets and opens `#promptVarsPanel` (a fourth modal side panel). `#varMetaList`, Load template and Save as template moved into it with their ids unchanged. Advanced Settings now starts on Chain, and `switchEditorTab('variables')` maps to Chain.
- **Chain tab in the editor** shows the whole flow: this prompt as the first row, step cards with description and "Receives the output of ...", a missing prompt warning, a step count, a real empty state and aria labels. The search skips prompts already in the chain, shows descriptions, supports arrow keys and Enter (Enter never submits the form from that box).
- **Database backed preferences.** `GET/POST /api/settings/prefs` (app.py, stored under settings key `ui_prefs`, no schema change) and `window.PL_prefs` (`ready`, `get`, `set`, writes debounced 400 ms) exist because WebView `localStorage` can reset between launches. Used so far for the Context Bank wrap style and custom opener. Keys must match `[a-z0-9_.-]{1,40}`, values up to 2000 characters.
- **Context Bank "Insert as"** now has Plain, Labelled, XML tags, Markdown (`## Title`), Brackets (`[Title]`) and Custom. A small "Starts with" field under the buttons shows what the block starts with; on Custom it is editable and `{title}` becomes the block title (`\n` is a line break). Stored as prefs `ctx_wrap` and `ctx_wrap_custom`. The panel and workspace pickers have the same options (edit the custom text in the Context Bank workspace).
- **Combine was not loading.** The stylesheet link and script tag for `combine-prompts.css/js` had been lost from index.html in an earlier merge, so the detail panel and bulk Combine buttons did nothing. Restored, `combine-prompts.js` added to `update_hash.py`, a "Combine Prompts" card added to the launcher (Refine column, no PRO badge) and a command palette entry, plus a start screen in `combine-prompts.js` (`openStart`, `window.openCombineWorkspace`) with likely duplicate pairs and a search. Verified headless: detail button, launcher card, pair, side by side compare, combine, undo.
- **Components is now a node canvas** (`initComponentsWorkspace` in app.js, section "WIRES"). Every block has four connection points: two inputs on the left, two outputs on the right. The upper pair is the step flow, the lower pair draws a dashed "supports" wire; a wire stores `{from, to, fp, tp}` (output and input slot). Blocks have stable ids; wires live in `_canvasLinks`, saved in the `pl_pcw_draft` draft with the blocks. Drag from any point, drop on a block (nearest point by height) or a point; drag from an input wires backwards; the same pair again moves the wire; loops are refused; click a wire for its remove button, Delete removes the selected wire; removing a middle block rejoins its neighbours. The assembled prompt follows the wires (topological order, ties by reading order); blocks with no wire come last (`pcw-loose`); with no wires at all it reads top to bottom as before. Batches (quick start, frameworks, component cart) arrive laid out left to right, three to a row, and wired in order; AI Build wires as it goes. View tools gained Connect in order and Remove all wires. The board is endless: no border, the dot grid moves and scales with the view, zoom 10 to 300 percent, middle mouse pans. Tailwind's global `svg { max-width: 100% }` squeezes the wire layer to nothing, so `.pcw-wires` sets `max-width: none`.
- **Open finding, not changed:** `Main.py` calls `webview.start()` with no `private_mode=False` / `storage_path`. PyWebView defaults to private mode, which would explain why `localStorage` resets between launches. That also affects Builder Pro's saved flow and tour flag, the theme and the components draft. A one line fix is likely, but it cannot be tested here, so it was left for Eugene to approve.
- Verified headless (Chromium, disposable data folder): licence screen (wrong key, good key, saved, no gate on relaunch), Variables panel, Chain tab keyboard flow, Context Bank styles and survival of a storage reset, Combine flows, Components wires (4 ports, order, drag, loops, delete, bridge, restore, zoom range). Not run in the real PyWebView window. Backups in `_rollbacks/` end `16-11-2026-pre-vars-panel`, `pre-prefs`, `pre-combine-wire`, `pre-components-nodes`.

### Builder Pro: more agents, Learn tab, tour once; new app tour (2026-11-16)

- **Nine new multi-agent blocks** (registered from `static/builder-pro.js`, `MORE_AGENTS`, engine untouched): Proponent Agent, Red Team Agent, Audience Reviewer, Brainstormer Agent, Summariser Agent, Coder Agent, Tester Agent, Triage Agent and Debate Moderator (a coordinator, with "Add its agents and wire them" through `SPAWN`). The library now has 121 blocks. They compile like the other agents (hand-off lines, revision loops through a Feedback input) and show in the Guide table automatically.
- **Learn tab** on the right of the canvas (fourth tab beside Prompt, Checks and Trace, markup `#pbp-panel-learn`, logic in `mount()` under "Learn tab"). Ten hands-on lessons (`LESSONS`): two agents, revision loop, plan research write, Conductor, Router, debate, team lead and merge, human approval, dev team, stress test. Every step can be done by hand (it reads as done when the canvas matches) or with Show me. Lessons reuse your own matching blocks, add theirs to the right of your work, and "Remove lesson blocks" deletes only what the lesson made. A box shows what the compiled agent section says right now. Finished lessons are saved (`prompt-builder-pro.learn.v1` and `PL_prefs` key `builder_learn`).
- **The quick tour shows once.** Its flag is now also stored in the database (`PL_prefs` key `builder_tour`) and checked after `PL_prefs.ready`, so it stays away after a WebView storage reset. A "Learn by doing" step was added. Cache version for the three Builder Pro files is `20261116b`.
- **App tour rewritten** (app.js, `STEPS` in the onboarding section): 17 cards, steps numbered automatically. New: Combine similar prompts, Prompt Components, Prompt Builder Pro, Shift+F3, an updated Context Bank card (insert styles) and Variables mention; the old "Pro features" card became "Your licence". Components can now be opened by a tour step (`OPEN_FNS.components`). It runs once, mirrored in the database (`tour_done`), and waits for the licence screen.
- Verified headless: lessons (all ten build and read as done), Remove lesson blocks, tour once across a storage reset, nine blocks in the library, all 17 tour cards with their workspaces opening, plus the earlier suites. Not run in the real PyWebView window.

### Components wiring made self-explanatory (2026-11-16, supersedes the wire notes above)

- Eugene and coworkers could not tell what the four dots did, and the lower pair had no real effect. New rules, one idea each: **top dots set the order** (a wire is `{from, to, kind: 'flow'}`), **lower dots attach background** (`kind: 'support'`, dashed). A background block that is not in the chain is placed right before the block it supports; a background wire from a block already in the chain changes nothing. Blocks with no wire at all go last and carry a "not wired" chip and a dashed outline. Old drafts migrate (`fp` / `tp` of 1 became `support`).
- The drag always makes the kind of the dot it started from; dropping on any part of a block works. Dragging the same pair with the other kind switches the wire. Loops are refused across both kinds.
- Every dot has a plain label on hover ("Previous step", "Next step (click to add)", "Background in", "Use as background"), wires end in an arrowhead (SVG marker with `context-stroke`), and the numbered badge is the place in the final prompt.
- **Click a top right dot** to open a small picker (six common blocks, search, "Browse the whole library") and add the next block already wired and placed to the right (`_pcwOpenPicker`, `_pcwAddAfter`). A drag under 5 px counts as a click.
- **New blocks join the end of the chain** by default (`_pcwAutoLink`, `_pcwTailId`; blocks dropped from the library keep the drop position, others land right of the chain end and the board pans only if the block is off screen). Switch it off with the checkbox in the help card.
- A **How wiring works** card (`#pcwHelp`, three lines with a key for each line style) shows until dismissed; the question mark button in the view tools brings it back. Choices are kept in the database prefs: `pcw_help` and `pcw_autolink`.
- Verified headless (46 checks in the Components suite, plus the other four suites unchanged): order versus background reading order, arrowheads, labels, picker, auto join on and off, saved choices, plus everything from the earlier node tests. Backups end `16-11-2026-pre-pcw-clarity`.
