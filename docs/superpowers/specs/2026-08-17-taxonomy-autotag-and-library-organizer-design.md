# Taxonomy Auto-Tag, Library Organizer, Relationship Graph Removal

Date: 2026-08-17

## Context

Three related changes to the workspace suite:

1. **Taxonomy Studio** (`static/app.js` ~14385-14683) is fully wired to `/api/taxonomy/*` for manual CRUD and manual bulk-tagging, but has no automatic tagging — every prompt must be tagged by hand via the "Tag more prompts" picker.
2. **Library Pulse** (`static/app.js` ~12563-12703) already scans the library offline for untagged/uncategorised/undescribed/thin/stale prompts and near-duplicate pairs, but is read-only — clicking a row just opens that prompt in the Library. There is no way to act on an issue from inside the workspace. This is being repurposed into **Library Organizer**: same scan, but every issue category gets a fix action.
3. **Relationship Graph** (`static/app.js` ~14684 onward, `#relationshipWorkspace` in index.html) is being removed outright — not needed.

No DB schema changes and no new dependencies are required for any of this — everything is built on endpoints that already exist (`/api/taxonomy/bulk-tag`, `PUT /api/prompts/<id>`, `DELETE /api/prompts/<id>`). This app is local-first/offline (CLAUDE.md), so "auto-tag via API" means driving the app's own REST API with a local keyword-scoring algorithm, not calling an external/cloud LLM.

## Feature 1: Taxonomy Studio Auto-Tag

### Purpose
Let the user auto-populate domain/use-case tagging for prompts that aren't tagged into the taxonomy yet, instead of tagging one-by-one.

### Scope
Applies only within Taxonomy Studio. Operates on taxonomy assignment (`prompt_taxonomy` table via `/api/taxonomy/*`), which is a separate concept from the prompt's own `tags`/`categories` fields (those are handled by Feature 2).

### Matching Algorithm
Reuse the existing Jaccard word-overlap scorer already in app.js (`_pulseTokenSet` / `_pulseJaccard`, ~line 12570) rather than writing a second one.

For each use-case, build a text corpus = use-case name + concatenated title/content of prompts already tagged to that use-case (via `GET /api/taxonomy/use-cases/{id}/prompts`, cross-referenced against full prompt records already in `state.prompts`). A use-case with zero tagged prompts yet is scored on its name alone.

For each prompt not yet tagged to *any* use-case: score it (via `_pulseJaccard` over `_pulseTokenSet` of title+content) against every use-case's corpus, take the best match. Keep it as a candidate suggestion if score ≥ 0.12 (empirically low because corpora are short name-only text in the common case; tune during implementation if the threshold produces too much noise).

### User Flow
1. New "Auto-tag" button in the Taxonomy Studio tree header (next to "Add domain").
2. Click → runs the scan (client-side, synchronous over already-loaded `state.prompts` + one API call to fetch tagged sets) → opens a review modal.
3. Review modal lists: prompt title → suggested use-case (with parent domain shown) → score as a rough confidence label (High/Medium ≥0.12) → checkbox, checked by default. No suggestion found for a prompt = it's simply not listed (not shown as "unmatched" clutter).
4. "Apply" groups the checked rows by `use_case_id` and issues one `POST /api/taxonomy/bulk-tag` per group (`action: 'add'`), matching the existing manual tag-picker's call shape exactly.
5. Toast confirms count tagged. Modal closes. Tree/detail view refreshes if the currently selected use-case was affected.

### Error Handling
If the tagged-prompts fetch fails for a use-case during corpus-building, that use-case is scored on its name alone (already covered above) rather than failing the whole scan. If the apply call fails for a group, toast the failure and leave that group's checkboxes checked so the user can retry.

## Feature 2: Library Organizer (renamed from Library Pulse)

### Purpose
Turn the existing read-only health scan into something that fixes what it finds, so "the duplicates, the stale ones" actually get acted on instead of just reported.

### Scope
Internal identifiers (`openPulseWorkspace`, `#pulseWorkspace`, `initPulseWorkspace`, `_pulse*` helpers) are unchanged — this is a UI relabel ("Library Pulse" → "Library Organizer" in the launcher card, nav label, command palette entry, and workspace header) plus new actions layered onto the existing six report sections. Renaming the internal function/id names is out of scope (pure churn, no behavioral benefit, touches more of the file for no reason — violates the "don't grow/thrash app.js" rule).

### Actions Per Section

- **Untagged / No category / No description**: "No description" stays report-only (nothing meaningful to auto-generate from). Untagged and No-category each get a "Suggest" button:
  - Nearest-neighbor suggestion using the same `_pulseJaccard`/`_pulseTokenSet` scorer, but against *other prompts' `tags`/`categories` fields* (not the taxonomy) — i.e., "prompts like this one already have tag X / category Y, apply it here too?" This is deliberately a different signal source than Feature 1: taxonomy assignment and the freeform tags/categories fields are separate systems in this schema and shouldn't be conflated.
  - Review list (prompt → suggested tag or category → checkbox) → Apply merges the accepted suggestion into that prompt via `PUT /api/prompts/{id}` (full-record update, tags/categories field extended, rest unchanged — same endpoint the Library edit form already uses, so it correctly creates the normal version-history snapshot).
- **Thin content**: stays click-to-open only. Under-40-character content can't be meaningfully auto-fixed.
- **Stale (90+ days)**: checkboxes per row (currently rows have no checkboxes — add them) plus two bulk buttons:
  - "Delete selected" → `DELETE /api/prompts/{id}` per checked row.
  - "Mark reviewed" → `PUT /api/prompts/{id}` with the record unchanged (bumps `updated_at`, which is exactly what a stale-prompt review should do — it drops off the stale list on next scan).
- **Possible duplicates**: each pair gets "Keep left" / "Keep right" buttons → `DELETE /api/prompts/{id}` on the one not kept.

### User Flow
Every action re-runs `_pulseScan()` afterward so the view reflects the new state immediately (already-fixed items disappear from their section).

### Error Handling
Each action shows a toast on failure and leaves the affected row/section as-is (no optimistic removal before the API call succeeds).

## Feature 3: Remove Relationship Graph

### Scope
Full removal, not a hide-from-nav:
- Nav item entry (`['Relationship Graph', ...]` in the command list, ~line 3754 area) and its `.nav-item[data-view]` handling.
- Launcher card (`data-open="openRelationshipWorkspace"` button in index.html).
- `#relationshipWorkspace` HTML block in index.html (dialog + all its child markup).
- All `_rel*` JS functions, `openRelationshipWorkspace`, `closeRelationshipWorkspace`, `initRelationshipWorkspace` in app.js.
- Its entry in the `_escapeToLibrary()` array (`'#relationshipWorkspace'`) and the bootstrap `initRelationshipWorkspace()` call.
- Its CSS block in app.css.
- Its command-palette entry (`'Relationship Graph', ...` search row, same line area as other workspace entries at ~3754-3759).

### Verification
`grep -n "_rel\|relationshipWorkspace\|RelationshipWorkspace" static/app.js static/index.html static/app.css` must return zero matches after removal (already confirmed nothing outside its own section currently calls into `_rel*`).

## Shared Implementation Notes

- No schema changes, no new dependencies (CLAUDE.md hard rule 2).
- All edits to `static/app.js` / `static/index.html` via bash + Python `content.replace()` per CLAUDE.md hard rule 1 — never Edit/Write tool on those two files.
- `python3 update_hash.py` after every `app.js`/`app.css` change (hard rule 3).
- `node --check static/app.js` and `python3 -m py_compile app.py` before considering any step done.
- New workspace build order (hard rule 5) doesn't apply here — no new workspace is being created, only features added to two existing ones and one existing one removed.
- No duplicate CSS rule blocks (hard rule 6) — check before adding Organizer action styles (checkboxes, dup-pair keep buttons, suggestion review modal) that nothing with the same selector already exists.
