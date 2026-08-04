# PRD — Component Workspace

**Feature:** Component Workspace (PCW) — compose prompts from a library of reusable blocks on an infinite canvas
**Users:** Prompt engineers and power users
**Stack:** Python 3.9+ / Flask 3.0.0 / SQLite / PyWebView 5.3.2 / waitress · vanilla JS (single-IIFE `static/app.js`) · CSS custom properties (`static/app.css`) · no build step · PyInstaller + Inno Setup packaging · fully offline
**Status:** v0 ships today (~3,400 JS lines). This PRD covers v1 — making compositions first-class.
**Companion:** `docs/ui-brief-component-workspace.md`

---

## 1. Problem statement

The workspace lets a user assemble a prompt from 589 blocks across 24 categories and 70 frameworks, then save the result as a flat prompt. Three structural problems:

1. **Compositions are disposable.** The arrangement — which blocks, in what order, with what fills — is discarded at save. Reopening a saved prompt gives you text, not a recomposable structure. Iteration means rebuilding from scratch.
2. **One draft, client-only.** All work-in-progress lives in a single `localStorage` key (`pl_pcw_draft`) whose write is wrapped in a silent `try/catch`. Users cannot keep parallel drafts, and a full quota loses work with no warning.
3. **The block library is read-only and hardcoded.** Blocks ship in `static/components-data.js`. A prompt engineer cannot add their own block, edit a supplied one, or build a reusable kit — the exact thing this audience does daily.

Underneath all three: **there is no server-side data model for components.** `app.py` has no components, blocks or kits table.

### Success metrics

| Metric | Baseline | v1 target |
| :--- | :--- | :--- |
| Saved compositions reopened and edited (vs rebuilt) | 0% — impossible | ≥40% of composition saves are re-opens |
| Prompts created via workspace / total prompts created | measure at v1 start | +25% relative |
| User-authored blocks per active power user | 0 — impossible | ≥5 within 30 days |
| Draft loss incidents | unknown, silently swallowed | 0 (explicit failure surfaced) |
| Keyboard-only completion of add→arrange→save | impossible | 100% |
| Time from empty canvas to first saved prompt | measure at v1 start | −30% |

---

## 2. User stories + acceptance criteria

**US-1 — Reopen a composition**
*As a prompt engineer, I want to reopen a saved composition on the canvas so I can iterate instead of rebuilding.*
- Saving a composition stores block IDs, assembly order, canvas positions, zoom/pan and blank fills.
- Opening it restores the canvas byte-identical to the save state.
- Editing and re-saving updates the same composition; "Save as new" is a separate, explicit action.
- A composition still emits a normal prompt row so it appears in the library unchanged (backward compatible).

**US-2 — Multiple named drafts**
*As a power user, I want more than one draft so I can work on parallel prompts.*
- Drafts list shows name, block count and last-modified.
- Switching drafts never discards the current one.
- Autosave every 2s after a change, debounced; the last-saved time is visible.
- If persistence fails, a toast states it plainly and the canvas stays intact. Never silent.

**US-3 — Author and edit blocks**
*As a prompt engineer, I want my own blocks in the library so my patterns are reusable.*
- Create a block: name, category, body text, optional description.
- Editing a shipped block forks it to a user copy; shipped blocks are never mutated.
- User blocks appear in palette and gallery, visually marked as user-authored, filterable.
- Delete asks for confirmation and reports how many saved compositions reference the block.

**US-4 — Keyboard composition**
*As a keyboard-first user, I want to build without a mouse.*
- `Tab` reaches every block; `Arrow` moves the focused block; `Shift+↑/↓` reorders assembly; `Enter` expands; `Delete` removes.
- Every interactive element has a visible `:focus-visible` ring.
- Full add→arrange→fill→save flow completes with no pointer input.

**US-5 — Trustworthy visual system**
*As any user, I want the UI to render as designed.*
- Declared font families actually load (`Fraunces`, `Instrument Sans`) or the token is changed to match reality.
- Workspace is usable from 768px up; below that it degrades to a documented single-column tabbed layout.
- Every async path has a loading state and a visible error state.

---

## 3. Scope

### Ships in v1
- Composition persistence — new tables, save/open/update, restore canvas exactly (US-1)
- Named multi-draft support with visible autosave status and surfaced failures (US-2)
- User-authored blocks: create, fork-on-edit, delete with reference count (US-3)
- Full keyboard interaction model + restored focus rings (US-4)
- Font loading fix, responsive breakpoints ≥768px, loading/error states (US-5)

### Does not ship in v1
- Sharing, export or import of compositions and kits between users (no cloud, no accounts — out of product scope)
- Real-time collaboration
- AI-driven auto-composition beyond the existing `#pcwAiOverlay` behaviour
- Versioning/diff of compositions (`prompt_versions` covers the emitted prompt only)
- Sub-768px 2D canvas — mobile gets the linear list, not a scaled world
- Reordering or re-categorising the 589 shipped blocks
- Any change to the existing prompts/folders/tags schema

---

## 4. Data model changes

Three new tables. No changes to existing tables — backward compatibility is a hard rule.

```sql
CREATE TABLE IF NOT EXISTS component_blocks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,
    body        TEXT NOT NULL,
    description TEXT,
    source      TEXT NOT NULL DEFAULT 'user',   -- 'user' | 'fork'
    forked_from TEXT,                            -- shipped block id when source='fork'
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS compositions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    prompt_id  INTEGER,                          -- emitted prompt, nullable until saved
    folder_id  INTEGER,
    tags       TEXT,
    view_state TEXT NOT NULL DEFAULT '{}',       -- JSON: zoom, panX, panY
    is_draft   INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE SET NULL,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS composition_blocks (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    composition_id INTEGER NOT NULL,
    block_ref      TEXT NOT NULL,                -- shipped block id, or 'user:<component_blocks.id>'
    position       INTEGER NOT NULL,             -- assembly order
    x              REAL NOT NULL DEFAULT 0,
    y              REAL NOT NULL DEFAULT 0,
    z_index        INTEGER NOT NULL DEFAULT 0,
    collapsed      INTEGER NOT NULL DEFAULT 0,
    body_override  TEXT,                         -- filled blanks / local edits
    FOREIGN KEY (composition_id) REFERENCES compositions(id) ON DELETE CASCADE
);
```

Notes:
- `block_ref` is TEXT, not a FK — shipped blocks live in JS, user blocks in SQLite. One column addresses both.
- Existing `localStorage` draft migrates once on first run to a composition row with `is_draft=1`, then the key is cleared.
- Follows the file's existing `CREATE TABLE IF NOT EXISTS` convention in `init_db()`.

New endpoints, matching existing `/api/*` route style:
`GET|POST /api/compositions` · `GET|PUT|DELETE /api/compositions/<id>` · `GET|POST /api/components` · `PUT|DELETE /api/components/<id>`

---

## 5. Edge cases + failure states

| Case | Behaviour |
| :--- | :--- |
| `localStorage` full on autosave | Toast: "Draft not saved — storage full." Canvas untouched. Never silent (fixes current `try/catch` swallow). |
| Corrupt draft JSON on load | Start clean, keep the corrupt payload in a recovery slot, tell the user. |
| Composition references a deleted user block | Render placeholder block with original body text preserved, flagged "source block deleted". Never drop content. |
| Shipped block removed in a future release | Same placeholder path; `block_ref` misses resolve gracefully. |
| Emitted prompt deleted from library | Composition survives with `prompt_id` NULL; next save creates a new prompt. |
| Save with blanks unfilled | Allow it, warn with count. Blanks are a legitimate template feature. |
| Save with empty title | Blocked; footer input is the required field, save button disabled. |
| 500+ blocks on canvas | Virtualise rendering above 150 blocks; warn above 300. |
| Zoom at 0.25 with dense canvas | Blocks render as labelled tiles, body text hidden below 0.5 zoom. |
| SQLite locked mid-save | Retry once, then toast and keep the draft in memory. |
| Two workspaces open on same draft | Last write wins; `updated_at` mismatch triggers a "reloaded elsewhere" notice. |
| Frozen (PyInstaller) build paths | Use `get_data_dir()` / `get_static_dir()` — never source-relative paths. |

---

## 6. Open questions

1. **User blocks in the same palette as shipped blocks, or a separate "My blocks" section?** Mixed is faster to reach; separate is easier to trust. My call: separate section, pinned top.
2. **Should a composition be premium-gated?** Multi-draft and user blocks are power-user features. Everything gated needs `premium-locked` + `state.isPremium`. Which of the five v1 items, if any, are paid?
3. **Do you want `prompt_versions` extended to compositions,** or is composition history explicitly out (currently listed as out of scope)?
4. **Fonts — load Fraunces + Instrument Sans, or change the tokens to the fallbacks?** Loading them adds two network requests; the app is otherwise fully offline. Bundling them locally is a third option and my recommendation.
5. **Sub-768px — is it worth building at all?** This is a Windows desktop app in a PyWebView window. If nobody resizes below 768px, that scope drops.
6. **Migration of the existing `pl_pcw_draft`** — silent auto-migrate on first run, or prompt the user? My call: silent, it is strictly additive.

---

## 7. Verification

No test suite exists. Per-change gate:
```
node --check static/app.js
python3 -m py_compile app.py
python3 update_hash.py          # required after every app.js change
grep -c "<script" static/index.html   # must be 3
```
Then launch via `start.bat` and exercise the flow manually.
