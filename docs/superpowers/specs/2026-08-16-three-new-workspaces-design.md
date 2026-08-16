# Three New Workspaces — Taxonomy Studio, Relationship Graph, Version Timeline

Date: 2026-08-16

## Context

This is Track A of a four-track upgrade (new workspaces → launcher redesign → command palette redesign → library organizer). Backend audit found three DB-backed features with real gaps:

- `taxonomy_domains` / `taxonomy_use_cases` exist (seeded), but no prompt ever links to them, and there's no CRUD UI — `GET /api/taxonomy` is the only route.
- `prompt_relationships` supports create + read (`get_prompt_relationships`, `add_prompt_relationship`) but has no delete route and no standalone UI (6 references total, buried in the detail panel).
- `prompt_versions` has `version_label`, `version_notes`, `is_baseline` columns, all unused by any UI. Only `GET .../versions` and `POST .../restore` exist.

All three new workspaces are premium-gated (`data-premium="true"`), matching the Generator/Components/Chain/Optimizer/Meta pattern for advanced power-user tools.

All three follow the existing workspace convention: a `launcher-card` in `#workspacesLauncher` with `data-open="openXxxWorkspace"`, opening a fixed overlay `#xxxWorkspace.open` via `openXxxWorkspace()` / closed via `closeXxxWorkspace()`, same lifecycle as Diff Lens (`static/app.js`, `_wsFillPromptPicker` reused for prompt-scoped pickers).

## Schema change (approved)

One new table — a many-to-many junction linking prompts to taxonomy use-cases (a prompt can carry multiple use-cases; each use-case implies its domain via the existing FK):

```sql
CREATE TABLE prompt_taxonomy (
    prompt_id   INTEGER NOT NULL,
    use_case_id INTEGER NOT NULL,
    PRIMARY KEY (prompt_id, use_case_id),
    FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
    FOREIGN KEY (use_case_id) REFERENCES taxonomy_use_cases(id) ON DELETE CASCADE
)
```

Added in `init_db()` alongside the existing `taxonomy_domains`/`taxonomy_use_cases` creation, guarded with `CREATE TABLE IF NOT EXISTS` like every other table in that function.

## New API routes (all additive — no existing route changes)

- `POST /api/taxonomy/domains` `{name}` — create domain.
- `PUT /api/taxonomy/domains/<id>` `{name}` — rename.
- `DELETE /api/taxonomy/domains/<id>` — delete domain. `taxonomy_use_cases.domain_id` has no DB-level cascade, so the route must first delete the domain's use-cases (and, via `prompt_taxonomy`'s own cascade, their tags) before deleting the domain row.
- `POST /api/taxonomy/use-cases` `{domain_id, name}` — create use-case.
- `PUT /api/taxonomy/use-cases/<id>` `{name}` — rename.
- `DELETE /api/taxonomy/use-cases/<id>` — delete use-case (cascades `prompt_taxonomy` via FK).
- `GET /api/taxonomy/use-cases/<id>/prompts` — list prompts tagged with a use-case.
- `POST /api/taxonomy/bulk-tag` `{prompt_ids: [...], use_case_id, action: 'add'|'remove'}` — bulk tag/untag.
- `DELETE /api/prompts/<pid>/relationships/<other_id>` — remove a relationship (missing today; creation exists, removal doesn't).
- `GET /api/relationships/orphans` — prompts with zero rows in `prompt_relationships`, library-wide.
- `PUT /api/prompts/<pid>/versions/<vid>` `{version_label?, version_notes?, is_baseline?}` — set the three unused columns.

## Workspace 1: Taxonomy Studio (`#taxonomyWorkspace`)

**Layout:** two-pane.
- Left pane: domain tree, each domain expandable to its use-cases. Inline add/rename/delete controls on both domain and use-case rows (icon buttons, not a separate modal — matches Auditor's inline-edit pattern).
- Right pane: selected node's detail. For a use-case: tagged-prompt list (title, folder, updated date) plus a "tag more prompts" control — a searchable checkbox picker over the library that calls `bulk-tag`. For a domain: rollup count of use-cases and total tagged prompts underneath it.

**Empty states:** a domain with zero use-cases shows an inline "Add a use-case" prompt, not a blank pane. A use-case with zero tagged prompts shows "No prompts tagged yet" plus the tag-picker control, not an empty list.

## Workspace 2: Relationship Graph (`#relationshipWorkspace`)

**Entry:** opens to a prompt picker (`_wsFillPromptPicker`, same widget Diff Lens uses) — the chosen prompt becomes the graph's center node.

**Rendering:** hand-rolled SVG radial layout — center node fixed, related prompts placed in a ring around it, edges labeled with `rel_type`. Explicitly **not** a full-library force-directed graph — that's expensive to compute and hard to read with no build step / no charting library available. Clicking a ring node re-centers the graph on it (breadth-first exploration, one hop at a time).

**Actions:** "Add relationship" opens a second prompt picker + a `rel_type` select, posts to the existing `add_prompt_relationship` route. Each edge gets a delete affordance calling the new `DELETE .../relationships/<other_id>` route.

**Orphan finder:** a toggle in the workspace header that swaps the graph for a flat list of prompts with zero rows in `prompt_relationships` library-wide, via `GET /api/relationships/orphans` (a straightforward `NOT IN` query against the existing table).

## Workspace 3: Version Timeline (`#versionWorkspace`)

**Entry:** prompt picker first (same `_wsFillPromptPicker` pattern), then the timeline for that prompt.

**Layout:** vertical timeline, newest-first, one row per `prompt_versions` row: `saved_at` timestamp, `version_label` (click to edit inline, saves via the new `PUT .../versions/<vid>` route), a baseline star toggle (`is_baseline`, same route).

**Diff:** selecting any two rows (checkbox per row, max 2 active) renders a diff using the existing `_diffTokens()` function from `static/app.js` — reused as-is, not duplicated, same rendering treatment Diff Lens already uses.

**Restore:** per-row restore button, confirms before acting (native confirm or the app's existing confirm-modal pattern — match whatever Auditor/Board use for destructive actions). The existing `/restore` route already snapshots current content into `prompt_versions` before overwriting, so no data loss risk even on a bad restore.

## Error handling

Every async loader in all three workspaces wrapped in try/catch per the CLAUDE.md gotcha — a failed fetch shows an inline error state in that pane ("Couldn't load taxonomy — retry" with a retry button), never a silently blank workspace.

## Testing

No test suite in this project — manual verification per CLAUDE.md conventions:
1. `node --check static/app.js`
2. `python3 -m py_compile app.py`
3. `python3 update_hash.py` (any app.js/app.css touch)
4. Click through in the running app: create/rename/delete a domain and use-case, bulk-tag prompts, add/remove a relationship, use the orphan finder, edit a version label, toggle baseline, diff two versions, restore a version.
