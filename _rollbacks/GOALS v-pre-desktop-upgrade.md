## Component Workspace v1 — opened 2026-08-04

**Goal:** Make prompt compositions first-class — persisted, reopenable, extensible with user-authored blocks, and fully keyboard-accessible.

- [x] UI/UX design brief written and agreed (`docs/ui-brief-component-workspace.md`)
- [x] PRD written (`docs/prd-component-workspace.md`)
- [x] Quick visual wins landed: font loading + focus rings (`b0f61bd`). Breakpoints dropped — finding retracted, layout already fluid
- [x] Data model shipped: `component_blocks`, `compositions`, `composition_blocks` + `/api/*` routes (`fe14f95`)
- [ ] Compositions save, reopen and restore canvas exactly
- [ ] Named multi-draft support with surfaced save failures
- [ ] User-authored blocks: create, fork-on-edit, delete with reference count
- [ ] Full keyboard interaction model verified end to end

**Status:** backend done. Next: wire the workspace UI to the new API (save/open/multi-draft).
**Last updated:** 2026-08-04

## Library front-screen full width — opened 2026-08-12

**Goal:** Library screen (list + grid view) uses full available width cleanly and stays responsive, matching the provided mockup (`Prompt Library.dc.html`), with no regressions on narrow viewports.

- [x] 920px row cap removed from list-view (`96e537f`)
- [ ] List-view row layout confirmed against mockup at full width in running app
- [ ] Grid-view cards confirmed filling width responsively across sizes
- [ ] Narrow/mobile breakpoints re-checked, no overflow
- [ ] Screenshot proof captured in preview
- [ ] Syntax checks + `update_hash.py` run if app.js/app.css touched

**Status:** cap-removal fix already committed; verifying it live now.
**Last updated:** 2026-08-12

## Prompt Board — Pinterest-inspired MVP — opened 2026-08-12

**Goal:** Turn the Prompt Board from a CRUD panel into a visual pinning surface — grab a prompt from anywhere in one click, drop it on a board, and browse boards as a scannable grid rather than a list.

Pinterest pillar → local equivalent: Clipper → pin-from-anywhere; Board architecture → boards (shipped); Public feed → single-user "All Pins" stream, tag-sorted.

- [x] Boards + pins data model and `/api/boards*` routes (already shipped)
- [ ] Pin-from-anywhere: pin control on library cards + prompt detail, board-picker popover, no trip into the workspace
- [ ] Masonry pin grid replaces the flat card list — variable-height cards, deterministic cover treatment, hover-reveal actions
- [ ] Board sidebar rows become visual board objects (mosaic cover from top pins + count)
- [ ] "All Pins" feed: chronological stream across every board, tag-chip filter, lazy render
- [ ] Verified live in preview with screenshot proof; `node --check`, `update_hash.py` run

**Cut for MVP (explicit):** sharing/export of boards, collaborative boards, recommendation/related-prompt logic, any monetisation surface.

**Status:** backend done, UI v0 exists as list+dropdown. Next: pillar 1 (pin-from-anywhere).
**Last updated:** 2026-08-12
