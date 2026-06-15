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
| Live variable preview added to detail panel | When filling variables in the detail panel, a live preview box shows the substituted prompt text in real time as the user types. | 2026-05-17 |
| Roles workspace kept as standalone | Roles workspace remains as a full-screen workspace switcher (sidebar nav button → takes over main area). | 2026-05-17 |
| Inno Setup for installer | Distribution pipeline: build.bat → build_installer.bat → single .exe via Inno Setup. ~50MB installer with Start Menu/Desktop shortcuts, Add/Remove Programs registration, optional DB cleanup on uninstall. | Prior |
| No cloud, no accounts | Fully local app. SQLite DB in user data directory. No internet required. | Prior |
| Onboarding tour — no video | Interactive spotlight tour only. Video-based onboarding was explicitly rejected. If onboarding is ever extended, do not add video. | 2026-06-04 |
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
- **Chain Prompting:** Was briefly a standalone workspace — reverted 2026-05-17. Now lives in detail panel tab.
- **Scorecard workspace:** Removed 2026-06-02. Do not rebuild or reference.
- **Collection Builder workspace:** Removed 2026-06-02. Do not rebuild or reference.

## Current State (2026-06-15)

- **Build hash:** `06c6eb18` (app.js) / `f84b07e0` (app.css) — updated 2026-06-15. Run `python3 update_hash.py` after every app.js change.
- **Starter templates:** `/api/starter-templates` seeds 10 curated prompts on empty library
- **Variable ordering:** `variable_meta[v].sort_order` — up/down via `PL_moveVar(v, dir)`. Falls back to alphabetical.
- **Variable preview:** `#variablePreview` live preview + `#copyFilledBtn` in `#usePromptSection`
- **Roles workspace:** One-page scrollable editor. `buildRolePrompt()` fixed (strict mode). `prependRole()` outputs full structured role block (identity→KB).
- **Config panel:** Sidebar footer button → slides up. CSS: `config-panel-header`, `config-panel-body`, `config-provider-tab`.
- **Prompt starter select:** 168 deduplicated options.
- **App icon:** Multi-size ICO (16–256px) from `app-icon.png`. Both `icon.ico` and `static/icon.ico` updated.
- **Roles agent fields:** 6 DB columns (`audience`, `output_format`, `constraints`, `domain`, `tasks`, `response_style`) in `app.py` + `_role_payload` + `serialize_role`.
- **Text Expansion workspace:** ⚠️ PLANNED — NOT YET IN HTML/JS. `shortcuts.db` API exists in `app.py` but `#shortcutsWorkspace` UI and Tab-trigger have not been integrated into `static/` files.
- **Context Bank workspace:** Live as of 2026-06-02. localStorage-backed reusable context blocks. Accessible via sidebar nav (`data-view="contextBank"`) and as slide-out panel in New Prompt modal (`#promptCtxPanel`). Full CRUD, category filter, search, insert-at-cursor.
- **Onboarding tour (fixed 2026-06-15):** 12-step spotlight tour. `initOnboarding()` now correctly called from BOOTSTRAP (was missing — tour never auto-launched). `promptlib.tourDone` localStorage key. Replay via sidebar footer "App tour" button (`#tourBtn`, onclick `PL_startOnboarding`). Old Components tutorial (`PL_startTutorial`, `#tutorialOverlay`) auto-launch disabled to prevent double-tour; still accessible if called directly. Tour step target IDs corrected: `#promptsContainer`, `#foldersList`, `#categoriesList`, `#workspacesToggle`. **Workspace previews (2026-06-15):** steps 6/7/9 now actually OPEN the workspace they describe (Agents→`openRolesWorkspace`, Power workspaces→`openForgeWorkspace`, Context Bank→`openContextBankWorkspace`) via a per-step `open` field + `_reconcileView()`. `_closeTourWorkspaces()` restores body scroll + nav state on library steps, finish, and Escape. Spotlight runs synchronously after `.open` (no rAF — throttles in background). Previews show for free users too (open-fns have no premium guard); nav buttons stay premium-locked outside the tour. Verified end-to-end in browser across all 13 steps.
- **Prompt Components workspace:** Live. Pre-expansion baseline (verified 2026-06-11): flat `BLOCKS` array (no `cat:` tags, no `CATEGORIES` array — uncategorised palette) + **23 `FRAMEWORKS`**: 5W2H, AIDA, APE, BAB, CARE, CO-STAR, COSTAR+, CSI+FBI, GROW, GRWC, META, OKR, PARA, PAS, PREP, RISEN, RODES, ROSES, RTF, SCQA, STAR, TRACE, ToT. `renderPalette()` targets `#pcwBlockGrid` / `#pcwFwList` (flat grid + list, no category pills/search). Drag-and-drop canvas, editable block cards, save to library. Sidebar nav (`data-view="components"`) + slide-out panel in New Prompt modal (`#promptComponentsPanel`, rendered separately by `_compPanelRender()`). Exposes `window._pcwBLOCKS` / `window._pcwFRAMEWORKS` globals (no `_pcwCATEGORIES` — not yet built). A 22-category/295-block/51-framework expansion (with new `#pcwCatPills`/`#pcwPaletteSearch`/`#pcwPaletteBody` palette UI) was built in `_rollbacks/app.js/app_20260611_110936.js` + `_rollbacks/index.html/index_20260611_110936.html` but never merged into live `static/` — reframed as planned future work, not yet scoped or scheduled.
- **Full-screen Prompt Viewer (fixed 2026-06-15):** `#promptViewer` overlay. `initPromptViewer()` now correctly called from BOOTSTRAP (was missing — close button and Escape key were broken). Opens via `window.PL_openViewer(id)`. Escape to close now works.
- **Prompt Optimizer workspace:** ⚠️ PLANNED — NOT IN LIVE FILES. Described in prior sessions but `#optimizerWorkspace` has zero occurrences in `static/app.js` and `static/index.html`.
- **Tone Calibrator workspace:** ⚠️ PLANNED — NOT IN LIVE FILES. Described in prior sessions but `#tonecalWorkspace` has zero occurrences in `static/app.js` and `static/index.html`.
- **Context Bank workspace (live):** `#contextBankWorkspace`. Left list panel + right editor. Category pills (Persona/Company/Audience/Product/Style/Other). `ctxSaveBtn`, `ctxCopyBtn`, `ctxDeleteBtn`. `_renderCtxList()` / `_openCtxEditor()`. Also available as side panel `#promptCtxPanel` in New Prompt modal.
- **Onboarding tour visual polish (2026-06-05):** Animated progress bar (`#obProgressBar`) fills as steps advance. Spotlight gets `ob-has-target` class → pulse animation when targeting an element. Card has accent glow border. `.ob-icon-wrap` has accent border and glow.
- **Cool-slate theme (2026-06-09):** Replaced warm-beige (hue 70) with cool-slate (hue 255) for both light and dark. Light: `--bg oklch(92.5% 0.007 255)`, `--surface oklch(96.5% 0.005 255)` — surface sits above bg, no depth inversion. Dark: `--bg oklch(15% 0.012 255)`. Accent is teal `oklch(40% 0.13 198)` light / `oklch(74% 0.13 198)` dark. CSS hash: `2083709d`.
- **Command palette redesign (2026-06-09):** Grouped sections (4 groups: Create/Navigate/Workspaces/Tools), 18 commands, icon tiles (`.cmd-ic`), subtitles (`.sub`), PRO chip in header (`.cmd-pro-chip`), keyboard hint footer. Now **Pro-gated** — free users see premium modal. `#cmdBtn` has `premium-locked` + `data-premium="true"`.
- **Pro-gating (confirmed 2026-06-15):** Internal `isPremium` guards on 8 open-functions. `#chainNavBtn` confirmed `premium-locked` + `data-premium="true"` in HTML (fixed 2026-06-15 — was missing). Chain tab in detail panel remains Free.
- **Dashboard workspace:** ⚠️ PLANNED — NOT IN LIVE FILES. `#dashboardWorkspace` has zero occurrences in `static/` files.
- **Template Gallery workspace:** ⚠️ PLANNED — NOT IN LIVE FILES. `#galleryWorkspace` has zero occurrences in `static/` files.
- **Snippets workspace:** ⚠️ PLANNED — NOT IN LIVE FILES. `#snippetsWorkspace` has zero occurrences in `static/` files.
- **Trash & Restore workspace:** ⚠️ PLANNED — NOT IN LIVE FILES. `#trashWorkspace` has zero occurrences in `static/` files.
- **Plan modal:** Free column: 25 prompts, 3 folders, locked items listed. Pro column: 18 features accurately. Payhip CTA link live.

## Feature Inventory — Free vs Pro

### Free (all users)
| Feature | Notes |
| :--- | :--- |
| Prompt library | Up to 25 prompts. Create, edit, delete, organise |
| Folders | Up to 3 folders |
| Tags & categories | Up to 5 tags & 3 categories per prompt |
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
| Prompt Optimizer workspace | 🔲 Planned | Not in static/ files — described in prior sessions only |
| Tone Calibrator workspace | 🔲 Planned | Not in static/ files — described in prior sessions only |
| Context Bank workspace | ✅ Live | `#contextBankWorkspace` — left list + right editor, category pills |
| Template Gallery workspace | 🔲 Planned | Not in static/ files — described in prior sessions only |
| Snippets workspace | 🔲 Planned | Not in static/ files — described in prior sessions only |
| Text Expansion workspace | 🔲 Planned | API in app.py (`shortcuts.db`) — UI not in static/ files |
| Version history | ✅ Live | Per-prompt version log with restore |
| Analytics | ✅ Live | Usage stats, top prompts, tag clouds |
| Duplicate prompt | ✅ Live | One-click clone |
| Export — Markdown / CSV / Bulk | ✅ Live | Multiple export formats |
| Chat format tab | ✅ Live | Copy turns as Plain / ChatML / OpenAI JSON |
| Rating & notes | ✅ Live | Per-prompt star rating + private notes |
| Ctrl+T text case cycling | ✅ Live | Toggle case in prompt editor |
| Dark/light theme toggle | ✅ Live | User-switchable theme |
| In-app AI executor | 🔲 Planned | Claude/GPT with DPAPI-encrypted key storage |
| Version diff view | 🔲 Planned | Side-by-side diff between versions |

## Roadmap

### Pro — Planned
- **In-app AI executor:** Send prompt directly to Claude or GPT from the app. DPAPI-encrypted API key storage. Provider scope and encryption approach TBD before build.
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
