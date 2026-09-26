# Prompt Forking Workstation — Design Spec

Date: 2026-09-26

## Purpose

Let a user take an existing prompt (original or an existing fork) and create an
independently-editable derivative ("fork") without altering the source. The
workstation makes the original/fork relationship, and multi-generation
lineage, immediately legible — without behaving like a version-control tool.

## Data model

Add three nullable columns to the existing `prompts` table (schema change,
approved by Eugene 2026-09-26):

- `parent_prompt_id INTEGER` — immediate parent. NULL = this row is an
  original (root), not a fork.
- `fork_root_id INTEGER` — topmost ancestor in the fork tree. NULL if this row
  is itself a root. Lets "all descendants of X" be a single indexed query
  instead of a recursive walk.
- `fork_snapshot TEXT` (JSON, nullable) — frozen `{title, content}` of the
  immediate parent at the moment the parent was deleted. Populated lazily by
  the delete path (see below), never written at fork-creation time.

No new table. Forks are ordinary rows in `prompts` / `prompt_versions`;
existing CRUD, versioning, variable, tag, and search code paths apply
unchanged. Index `parent_prompt_id` and `fork_root_id` for lineage/descendant
queries.

## API

- `POST /api/prompts/<id>/fork` — reads prompt `<id>` (original or fork),
  creates a new `prompts` row copying title (append " (Fork)"), content,
  variables, tags, model info, folder. Sets `parent_prompt_id = <id>`,
  `fork_root_id = source.fork_root_id or <id>` (so a fork-of-a-fork still
  resolves to the true root). Returns the new prompt's id and full payload.
- `GET /api/prompts/<id>/lineage` — returns the ancestor chain (root → ... →
  immediate parent) and sibling/descendant counts for the breadcrumb rail.
  Ancestors already deleted are represented via their `fork_snapshot`.
- Existing `DELETE /api/prompts/<id>` gains one side effect: before deleting,
  find all rows where `parent_prompt_id = id`, and for each, if it has no
  `fork_snapshot` yet, write one from the about-to-be-deleted row's current
  `{title, content}`. This only ever fires on direct children; a grandchild's
  own parent (an intermediate fork) is unaffected unless *it* is later
  deleted too.

## Workstation UI

New dedicated workspace (`openForkWorkstation`, own nav item), matching the
existing workspace-suite pattern (Quick Fill, Auditor, Diff, etc.):

- **Entry points:** "Fork" button on the Prompt Viewer (opens workstation
  seeded with that prompt as source); nav item opens a picker if no prompt is
  pre-selected.
- **Layout:** two-pane split.
  - Left pane: source (parent) prompt, read-only chrome, "ORIGINAL" or
    "PARENT FORK" badge depending on whether the source itself has a parent.
    If the source was deleted, renders from `fork_snapshot` with an "Original
    deleted" badge instead of live data.
  - Right pane: the fork being edited, fully editable — reuses the same
    editing components as the main Prompt Viewer (title, content, variables,
    tags, model, folder). No special-cased save path.
- **Top rail:** lineage breadcrumb, root → ... → current, clickable to jump
  the left pane to any ancestor. "+ New Fork" re-forks whichever node is
  currently focused (root or any descendant), enabling multi-generation
  forking from the same screen.
- **Library integration:** forks list in the main library with a small
  branch icon and "forked from <parent title>" subtitle; included in normal
  search/filter, no separate silo view.

## Build order (per CLAUDE.md hard rule 5)

1. `openForkWorkstation()`
2. nav route in `init()`'s `.nav-item[data-view]` handler
3. `'#forkWorkstation'` added to `_escapeToLibrary()`
4. `initForkWorkstation()` called from BOOTSTRAP
5. HTML added last

## Out of scope

- No merge/diff-back-into-parent feature (that's the existing Diff workspace,
  reused only for manual comparison, not integrated automatically here).
- No fork-count limits or approval gates on forking depth.
- No bulk-fork or fork-from-search-results in v1.

## Testing

Manual verification only (no test suite in this project):
`node --check static/app.js`, `python3 -m py_compile app.py`, then exercise in
running app: fork an original, fork a fork (2 generations), delete a parent
and confirm child shows frozen snapshot + badge, confirm forked prompts
appear/search correctly in main library, confirm original is byte-for-byte
unchanged after editing a fork.
