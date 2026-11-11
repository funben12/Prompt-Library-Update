## Component Workspace v1 — opened 2026-08-04

**Goal:** Make prompt compositions first-class — persisted, reopenable, extensible with user-authored blocks, and fully keyboard-accessible.

- [x] UI/UX design brief written and agreed (`docs/ui-brief-component-workspace.md`)
- [x] PRD written (`docs/prd-component-workspace.md`)
- [x] Quick visual wins landed: font loading + focus rings (`b0f61bd`). Breakpoints dropped — finding retracted, layout already fluid
- [x] Data model shipped: `component_blocks`, `compositions`, `composition_blocks` + `/api/*` routes (`fe14f95`)
- [ ] Compositions save, reopen and restore canvas exactly (2026-11-11: the node canvas saves and reloads its graph through `/api/compositions/.../graph` in `static/prompt-components-node.js`. Exact restore not clicked through, so left open)
- [ ] Named multi-draft support with surfaced save failures
- [ ] User-authored blocks: create, fork-on-edit, delete with reference count
- [ ] Full keyboard interaction model verified end to end

**Status:** backend done. Next: wire the workspace UI to the new API (save/open/multi-draft).
**Last updated:** 2026-08-04

## Library front-screen full width — opened 2026-08-12

**Goal:** Library screen (list + grid view) uses full available width cleanly and stays responsive, matching the provided mockup (`Prompt Library.dc.html`), with no regressions on narrow viewports.

- [x] 920px row cap removed from list-view (`96e537f`)
- [x] List-view rows fill the width at 1440 px in the running app (2026-11-11, `showcase/light/01-library-list.jpg`). Not compared against the mockup file
- [x] Grid-view cards fill the width: 3 columns of 356 px in a 1096 px container at 1440 px (2026-11-11)
- [ ] Narrow/mobile breakpoints re-checked, no overflow
- [x] Screenshot proof captured (`showcase/`, 2026-11-11)
- [ ] Syntax checks + `update_hash.py` run if app.js/app.css touched

**Status:** list and grid verified at 1440 px. Narrow widths not re-checked.
**Last updated:** 2026-11-11

## Prompt Board — Pinterest-inspired MVP — opened 2026-08-12

**Goal:** Turn the Prompt Board from a CRUD panel into a visual pinning surface — grab a prompt from anywhere in one click, drop it on a board, and browse boards as a scannable grid rather than a list.

Pinterest pillar → local equivalent: Clipper → pin-from-anywhere; Board architecture → boards (shipped); Public feed → single-user "All Pins" stream, tag-sorted.

- [x] Boards + pins data model and `/api/boards*` routes (already shipped)
- [x] Pin-from-anywhere: pin button on library cards and the detail panel opens a Save to board popover (`window.PL_pinToBoard`), with new board creation inline
- [x] Masonry pin grid: 236 px columns, height follows prompt length, colour tile from the prompt's label, hover shows board chip, Save, favourite and copy
- [x] Boards are visual objects: collage cover from the first three pins plus pin count. The board list moved out of the sidebar, which is now an icon rail
- [ ] "All Pins" feed: the Home feed streams every prompt with tag chips and a sort chip. Lazy render not built, not needed until libraries reach hundreds of prompts
- [x] Verified in headless Chromium with screenshots in `showcase/`; `node --check`, `update_hash.py` run

**Cut for MVP (explicit):** sharing/export of boards, collaborative boards, recommendation/related-prompt logic, any monetisation surface.

**Status:** Pinterest style rework shipped 2026-11-11. Left: lazy render for very large libraries.
**Last updated:** 2026-11-11
