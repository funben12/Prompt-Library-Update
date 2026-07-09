# Bulk Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users select multiple prompts in the Library and bulk-tag, bulk-move-to-folder, or bulk-delete them, instead of acting on one prompt at a time.

**Architecture:** A checkbox per prompt card/row plus a "select all" checkbox in the Library header populate a module-level `Set` of selected prompt IDs. When the set is non-empty, a toolbar appears with a tag-picker `<select>`, a folder-picker `<select>`, and a Delete button — chosen deliberately over a modal dialog: additive/reversible actions (tag, move) apply immediately on `<select>` change, while the destructive action (delete) still goes through the same native `confirm()` used by the existing single-prompt delete flow. A new Flask endpoint (`/api/prompts/bulk`, PATCH for tag/move, DELETE for delete) does the batch DB work in a single request instead of N round-trips.

**Tech Stack:** Vanilla JS (browser IIFE, no build step, no JS test framework), Flask/SQLite backend (`app.py`), no new dependencies.

## Global Constraints

(From `CLAUDE.md` — apply to every task below)

- **Never use the Edit or Write tool on `static/app.js`, `static/index.html`, or `static/app.css`.** All edits go through bash + Python `content.replace()`: read file bytes → strip NUL bytes → `content.replace(OLD, NEW)` → write back. Write throwaway patch scripts to the scratchpad temp dir, run with `python`, never inline heredocs (backslashes get mangled by this shell). `app.py` has no such restriction — it can be edited normally with Edit/Write, since the file-truncation bug is specific to `static/`'s mount (per CLAUDE.md Key Principle 10, which names only those three files).
- **Run `node --check static/app.js` after every app.js change.** Must show no output.
- **Run `python update_hash.py` after every app.js change.**
- **Run `python -m py_compile app.py` after every app.py change.** Must show no output.
- **No new dependencies, no schema migrations.** The `prompts` table already has `tags` (comma-separated string) and `folder_id` columns — bulk tag/move only update existing columns.
- **No premium gate** — bulk operations are available to Free and Pro alike (per the approved spec).
- **No test harness exists for JS in this project.** "Tests" for the JS side means manual browser verification via the dev preview tool. The one pure/testable piece is the backend endpoint, which CAN be tested with a direct `curl`/`requests` call against the running dev server — do that instead of a full pytest suite (none exists in this project).
- Session-open integrity check must already have been run this session before any edit — if resuming in a new session, run it again first (see `CLAUDE.md` Workflow step 1).

---

### Task 1: Backend — bulk tag/move/delete endpoint

**Files:**
- Modify: `app.py:885-891` (insert two new routes immediately after the existing `DELETE /api/prompts/<int:pid>`, before `fork_prompt`)

**Interfaces:**
- Consumes: `get_db()`, `_json_body()`, `_normalise_list(value)` (`app.py:508`), `_list_for_db(value)` (`app.py:539`), `_folder_id(value)` (`app.py:568`) — all pre-existing.
- Produces:
  - `PATCH /api/prompts/bulk` — body `{ids: number[], action: 'add_tag'|'move_folder', tag?: string, folder_id?: number|null}` → `{success: number, failed: number}`. Consumed by Task 3's `bulkAddTag`/`bulkMove`.
  - `DELETE /api/prompts/bulk` — body `{ids: number[]}` → `{success: number, failed: number}`. Consumed by Task 3's `bulkDelete`.

- [ ] **Step 1: Add the two routes**

Using the Edit tool (app.py has no truncation restriction), insert immediately after the existing `delete_prompt` function (`app.py:885-891`):

```python
@app.route('/api/prompts/bulk', methods=['PATCH'])
def bulk_update_prompts():
    data = _json_body()
    ids = data.get('ids') or []
    action = data.get('action')
    if not ids or action not in ('add_tag', 'move_folder'):
        return jsonify({'error': 'ids and a valid action are required'}), 400

    conn = get_db()
    success, failed = 0, 0
    try:
        if action == 'add_tag':
            tag = (data.get('tag') or '').strip()
            if not tag:
                conn.close()
                return jsonify({'error': 'tag is required for add_tag'}), 400
            for pid in ids:
                row = conn.execute('SELECT tags FROM prompts WHERE id=?', (pid,)).fetchone()
                if not row:
                    failed += 1
                    continue
                tags = _normalise_list(row['tags'])
                if tag not in tags:
                    tags.append(tag)
                conn.execute(
                    'UPDATE prompts SET tags=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
                    (_list_for_db(tags), pid)
                )
                success += 1
        elif action == 'move_folder':
            folder_id = _folder_id(data.get('folder_id'))
            for pid in ids:
                cur = conn.execute(
                    'UPDATE prompts SET folder_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
                    (folder_id, pid)
                )
                if cur.rowcount:
                    success += 1
                else:
                    failed += 1
        conn.commit()
    finally:
        conn.close()
    return jsonify({'success': success, 'failed': failed})

@app.route('/api/prompts/bulk', methods=['DELETE'])
def bulk_delete_prompts():
    data = _json_body()
    ids = data.get('ids') or []
    if not ids:
        return jsonify({'error': 'ids is required'}), 400
    conn = get_db()
    success, failed = 0, 0
    try:
        for pid in ids:
            cur = conn.execute('DELETE FROM prompts WHERE id=?', (pid,))
            if cur.rowcount:
                success += 1
            else:
                failed += 1
        conn.commit()
    finally:
        conn.close()
    return jsonify({'success': success, 'failed': failed})
```

- [ ] **Step 2: Verify syntax**

Run: `python -m py_compile app.py`
Expected: no output

- [ ] **Step 3: Start the dev server and manually test the endpoints**

Use the dev preview tool to start the app (per `.claude/launch.json`, config name `promptlib-preview`). Once running, from a Bash/PowerShell tool (not inside the browser), hit the endpoints directly against 3 real prompt IDs from the running dev DB (pick 3 existing IDs by checking `GET http://127.0.0.1:5055/api/prompts` first, or use the browser preview's console to call `fetch`):

```bash
curl -s -X PATCH http://127.0.0.1:5055/api/prompts/bulk -H "Content-Type: application/json" -d '{"ids":[<id1>,<id2>],"action":"add_tag","tag":"bulk-test"}'
```
Expected: `{"success":2,"failed":0}` (adjust counts to match real IDs you used; an ID that doesn't exist should count as failed, e.g. try one bogus ID like `999999` mixed in and confirm `failed` increments).

```bash
curl -s -X PATCH http://127.0.0.1:5055/api/prompts/bulk -H "Content-Type: application/json" -d '{"ids":[<id1>],"action":"move_folder","folder_id":null}'
```
Expected: `{"success":1,"failed":0}`

```bash
curl -s -X DELETE http://127.0.0.1:5055/api/prompts/bulk -H "Content-Type: application/json" -d '{"ids":[999999]}'
```
Expected: `{"success":0,"failed":1}` (bogus ID, nothing deleted)

**Do not delete real prompts during this test** — only exercise `add_tag`/`move_folder` against real IDs (both are non-destructive/reversible), and only test `DELETE` against a bogus ID.

- [ ] **Step 4: Commit**

```bash
git add app.py
git commit -m "feat: add bulk tag/move/delete endpoint for prompts"
```

---

### Task 2: Frontend — selection state, checkboxes, header

**Files:**
- Modify: `static/index.html:830` region — actually apply via `static/app.js` since the card is JS-templated, not static HTML (see below)
- Modify: `static/app.js:718-737` (`renderPrompts`) and `static/app.js:812-861` (`renderPromptCard`) — add a checkbox per card and per-card selection state
- Modify: `static/index.html:164-183` (`#libraryFilterBar`) — add a "select all" checkbox to the header

**Interfaces:**
- Produces: module-level `let _bulkSelection = new Set();` (holds selected prompt IDs), `function toggleBulkSelect(id)`, `function bulkSelectAll()`, `function bulkDeselectAll()` — all consumed by Task 3's toolbar wiring and by `renderPromptCard`'s checkbox `onchange`.
- Consumes: `state.prompts` (existing), `getFilteredPrompts()` (existing — used by `renderPrompts`, referenced here to make "select all" respect the current filter/search).

- [ ] **Step 1: Patch app.js — add selection state and helpers, checkbox in card**

Write to scratchpad as `patch_bulk_task2.py`:

```python
path = "static/app.js"
d = open(path, "rb").read()
d = d.replace(b"\x00", b"")
content = d.decode("utf-8")

# 1. Add selection state right after the `state` object's closing brace
marker1 = """        theme: 'dark', // 'dark' | 'light'
    };
"""
assert content.count(marker1) == 1, "marker1 not unique"
new1 = """        theme: 'dark', // 'dark' | 'light'
    };

    // Bulk-select: prompt IDs currently checked in the Library view.
    let _bulkSelection = new Set();
"""
content = content.replace(marker1, new1)

# 2. Add checkbox to the card template, guarded against the card's own onclick
marker2 = '''    <article class="prompt-card ${active}" onclick="window.PL_openDetail(${p.id})" data-id="${p.id}">
      <div class="card-rule ${colour}"></div>
      <div class="card-body">
        <div class="card-title-row">
          <h3 class="card-title">${escapeHtml(p.title)}</h3>'''
assert content.count(marker2) == 1, "marker2 not unique"
new2 = '''    <article class="prompt-card ${active}" onclick="window.PL_openDetail(${p.id})" data-id="${p.id}">
      <div class="card-rule ${colour}"></div>
      <div class="card-body">
        <div class="card-title-row">
          <input type="checkbox" class="card-select" onclick="event.stopPropagation()" onchange="window.PL_toggleBulkSelect(${p.id})" ${_bulkSelection.has(p.id) ? 'checked' : ''} aria-label="Select ${escapeAttr(p.title)}" />
          <h3 class="card-title">${escapeHtml(p.title)}</h3>'''
assert content.count(marker2) == 1, "marker2 (pre-replace check) not unique"
content = content.replace(marker2, new2)

# 3. Add the selection helpers + toggle/select-all/deselect-all right after renderPrompts()
marker3 = """        if (state.groupByFolder && state.view !== 'favorites' && typeof state.view !== 'number') {
            container.innerHTML = renderGroupedByFolder(list);
        } else {
            container.innerHTML = list.map(renderPromptCard).join('');
        }
    }

    function renderEmptyState() {"""
assert content.count(marker3) == 1, "marker3 not unique"
new3 = """        if (state.groupByFolder && state.view !== 'favorites' && typeof state.view !== 'number') {
            container.innerHTML = renderGroupedByFolder(list);
        } else {
            container.innerHTML = list.map(renderPromptCard).join('');
        }
    }

    function toggleBulkSelect(id) {
        if (_bulkSelection.has(id)) _bulkSelection.delete(id);
        else _bulkSelection.add(id);
        renderBulkToolbar();
    }

    function bulkSelectAll() {
        getFilteredPrompts().forEach(p => _bulkSelection.add(p.id));
        renderPrompts();
        renderBulkToolbar();
    }

    function bulkDeselectAll() {
        _bulkSelection.clear();
        renderPrompts();
        renderBulkToolbar();
    }

    function renderEmptyState() {"""
content = content.replace(marker3, new3)

# 4. Expose toggleBulkSelect for the inline onchange handler
marker4 = "    window.PL_restoreVersion = restoreVersion;"
assert content.count(marker4) == 1, "marker4 not unique"
new4 = """    window.PL_restoreVersion = restoreVersion;
    window.PL_toggleBulkSelect = toggleBulkSelect;"""
content = content.replace(marker4, new4)

open(path, "w", encoding="utf-8", newline="\\n").write(content)
print("patched")
```

Run: `python "<scratchpad>/patch_bulk_task2.py"` (substitute the actual scratchpad path)
Expected: `patched`

Note: `renderBulkToolbar()` is called here but defined in Task 3 — this is expected; the function reference resolves at call-time (not parse-time) since it's a plain function declaration hoisted within the same IIFE scope, so `node --check` (a syntax check, not an execution check) will pass even though Task 3 hasn't landed yet. Do not skip Task 3 — the toolbar won't render without it, but the code here won't throw a "not defined" error until a checkbox is actually clicked, which happens after Task 3 has already provided `renderBulkToolbar`. If you need to test Task 2 in isolation before Task 3 lands, temporarily stub `renderBulkToolbar` — but the plan's normal flow is to land both tasks before manual verification.

- [ ] **Step 2: Add "select all" checkbox to the Library header**

Write to scratchpad as `patch_bulk_task2_html.py`:

```python
path = "static/index.html"
d = open(path, "rb").read()
d = d.replace(b"\x00", b"")
content = d.decode("utf-8")

marker = """      <div class="filter-bar" id="libraryFilterBar">
        <div id="searchWrap">"""
assert content.count(marker) == 1, "marker not unique"
new = """      <div class="filter-bar" id="libraryFilterBar">
        <input type="checkbox" id="bulkSelectAllCheckbox" title="Select all visible prompts" aria-label="Select all visible prompts" />
        <div id="searchWrap">"""
content = content.replace(marker, new)
open(path, "w", encoding="utf-8", newline="\\n").write(content)
print("patched")
```

Run: `python "<scratchpad>/patch_bulk_task2_html.py"`
Expected: `patched`

- [ ] **Step 3: Wire the header checkbox (in `init()`)**

Write to scratchpad as `patch_bulk_task2_wire.py`:

```python
path = "static/app.js"
d = open(path, "rb").read()
d = d.replace(b"\x00", b"")
content = d.decode("utf-8")

marker = """        $('#groupFolderBtn')?.addEventListener('click', () => {
            state.groupByFolder = !state.groupByFolder;
            $('#groupFolderBtn').classList.toggle('active', state.groupByFolder);
            renderPrompts();
        });"""
assert content.count(marker) == 1, "marker not unique"
new = """        $('#groupFolderBtn')?.addEventListener('click', () => {
            state.groupByFolder = !state.groupByFolder;
            $('#groupFolderBtn').classList.toggle('active', state.groupByFolder);
            renderPrompts();
        });

        $('#bulkSelectAllCheckbox')?.addEventListener('change', (e) => {
            if (e.target.checked) bulkSelectAll();
            else bulkDeselectAll();
        });"""
content = content.replace(marker, new)
open(path, "w", encoding="utf-8", newline="\\n").write(content)
print("patched")
```

Run: `python "<scratchpad>/patch_bulk_task2_wire.py"`
Expected: `patched`

- [ ] **Step 4: Verify syntax**

Run: `node --check static/app.js`
Expected: no output

- [ ] **Step 5: Run update_hash.py**

Run: `python update_hash.py`

- [ ] **Step 6: Commit**

```bash
git add static/app.js static/index.html
git commit -m "feat: add prompt selection checkboxes to Library"
```

---

### Task 3: Frontend — bulk toolbar (tag/move/delete) and API wiring

**Files:**
- Modify: `static/index.html:222-225` (insert toolbar HTML between `.sort-bar`'s closing tag and `#content`)
- Modify: `static/app.js` (add `renderBulkToolbar`, `bulkAddTag`, `bulkMove`, `bulkDelete`, and their event wiring in `init()`; also needs `state.folders` and `state.filters.tags`, both pre-existing)

**Interfaces:**
- Consumes: `_bulkSelection` (Task 2), `api(path, opts)` (existing), `toast(msg, kind)` (existing), `loadPrompts()` (existing), `loadFilterOptions()` (existing, refreshes `state.filters.tags`), `state.folders` (existing), `state.filters.tags` (existing).
- Produces: `function renderBulkToolbar()` (called by Task 2's `toggleBulkSelect`/`bulkSelectAll`/`bulkDeselectAll` — shows/hides the toolbar and updates its selection count and option lists), `async function bulkAddTag(tag)`, `async function bulkMove(folderId)`, `async function bulkDelete()`.

- [ ] **Step 1: Add the toolbar HTML**

Write to scratchpad as `patch_bulk_task3_html.py`:

```python
path = "static/index.html"
d = open(path, "rb").read()
d = d.replace(b"\x00", b"")
content = d.decode("utf-8")

marker = """    </header>

    <div id="content">
      <div id="promptsContainer" class="list-view"></div>
    </div>"""
assert content.count(marker) == 1, "marker not unique"
new = """    </header>

    <div class="bulk-toolbar" id="bulkToolbar" hidden>
      <span id="bulkCount">0 selected</span>
      <select id="bulkTagSelect">
        <option value="">Add tag\\u2026</option>
        <option value="__new__">+ New tag\\u2026</option>
      </select>
      <select id="bulkFolderSelect">
        <option value="">Move to folder\\u2026</option>
      </select>
      <button class="btn btn-ghost btn-sm" id="bulkDeleteBtn">Delete</button>
      <button class="btn btn-ghost btn-sm" id="bulkClearBtn">Clear selection</button>
    </div>

    <div id="content">
      <div id="promptsContainer" class="list-view"></div>
    </div>"""
content = content.replace(marker, new)
open(path, "w", encoding="utf-8", newline="\\n").write(content)
print("patched")
```

Run: `python "<scratchpad>/patch_bulk_task3_html.py"`
Expected: `patched`

- [ ] **Step 2: Add `renderBulkToolbar` and the bulk action functions**

Write to scratchpad as `patch_bulk_task3_js.py`:

```python
path = "static/app.js"
d = open(path, "rb").read()
d = d.replace(b"\x00", b"")
content = d.decode("utf-8")

marker = """    function bulkDeselectAll() {
        _bulkSelection.clear();
        renderPrompts();
        renderBulkToolbar();
    }

    function renderEmptyState() {"""
assert content.count(marker) == 1, "marker not unique"

new = """    function bulkDeselectAll() {
        _bulkSelection.clear();
        renderPrompts();
        renderBulkToolbar();
    }

    function renderBulkToolbar() {
        const bar = $('#bulkToolbar');
        if (!bar) return;
        const count = _bulkSelection.size;
        bar.hidden = count === 0;
        const countEl = $('#bulkCount');
        if (countEl) countEl.textContent = count + ' selected';

        const tagSel = $('#bulkTagSelect');
        if (tagSel) {
            const existing = (state.filters.tags || []).map(t =>
                '<option value="' + escapeAttr(t) + '">' + escapeHtml(t) + '</option>').join('');
            tagSel.innerHTML = '<option value="">Add tag\\u2026</option>' + existing +
                '<option value="__new__">+ New tag\\u2026</option>';
        }
        const folderSel = $('#bulkFolderSelect');
        if (folderSel) {
            const options = state.folders.map(f =>
                '<option value="' + f.id + '">' + escapeHtml(f.name) + '</option>').join('');
            folderSel.innerHTML = '<option value="">Move to folder\\u2026</option>' + options +
                '<option value="__none__">No folder</option>';
        }
    }

    async function bulkAddTag(tag) {
        if (!tag || !_bulkSelection.size) return;
        try {
            const result = await api('/prompts/bulk', {
                method: 'PATCH',
                body: { ids: Array.from(_bulkSelection), action: 'add_tag', tag }
            });
            if (result.failed > 0) toast(result.success + ' tagged, ' + result.failed + ' failed', 'warning');
            else toast(result.success + ' prompt' + (result.success !== 1 ? 's' : '') + ' tagged', 'success');
            bulkDeselectAll();
            await loadPrompts();
            await loadFilterOptions();
        } catch {
            toast('Bulk tag failed', 'error');
        }
    }

    async function bulkMove(folderId) {
        if (!_bulkSelection.size) return;
        try {
            const result = await api('/prompts/bulk', {
                method: 'PATCH',
                body: { ids: Array.from(_bulkSelection), action: 'move_folder', folder_id: folderId }
            });
            if (result.failed > 0) toast(result.success + ' moved, ' + result.failed + ' failed', 'warning');
            else toast(result.success + ' prompt' + (result.success !== 1 ? 's' : '') + ' moved', 'success');
            bulkDeselectAll();
            await loadPrompts();
        } catch {
            toast('Bulk move failed', 'error');
        }
    }

    async function bulkDelete() {
        if (!_bulkSelection.size) return;
        const count = _bulkSelection.size;
        if (!confirm('Delete ' + count + ' prompt' + (count !== 1 ? 's' : '') + '? This cannot be undone.')) return;
        try {
            const result = await api('/prompts/bulk', {
                method: 'DELETE',
                body: { ids: Array.from(_bulkSelection) }
            });
            if (result.failed > 0) toast(result.success + ' deleted, ' + result.failed + ' failed', 'warning');
            else toast(result.success + ' prompt' + (result.success !== 1 ? 's' : '') + ' deleted', 'success');
            bulkDeselectAll();
            await loadPrompts();
            await loadFilterOptions();
        } catch {
            toast('Bulk delete failed', 'error');
        }
    }

    function renderEmptyState() {"""

content = content.replace(marker, new)
open(path, "w", encoding="utf-8", newline="\\n").write(content)
print("patched")
```

Run: `python "<scratchpad>/patch_bulk_task3_js.py"`
Expected: `patched`

- [ ] **Step 3: Wire the toolbar controls in `init()`**

Write to scratchpad as `patch_bulk_task3_wire.py`:

```python
path = "static/app.js"
d = open(path, "rb").read()
d = d.replace(b"\x00", b"")
content = d.decode("utf-8")

marker = """        $('#bulkSelectAllCheckbox')?.addEventListener('change', (e) => {
            if (e.target.checked) bulkSelectAll();
            else bulkDeselectAll();
        });"""
assert content.count(marker) == 1, "marker not unique"
new = """        $('#bulkSelectAllCheckbox')?.addEventListener('change', (e) => {
            if (e.target.checked) bulkSelectAll();
            else bulkDeselectAll();
        });

        $('#bulkTagSelect')?.addEventListener('change', (e) => {
            const val = e.target.value;
            e.target.value = '';
            if (val === '__new__') {
                const tag = (prompt('New tag name:') || '').trim();
                if (tag) bulkAddTag(tag);
            } else if (val) {
                bulkAddTag(val);
            }
        });

        $('#bulkFolderSelect')?.addEventListener('change', (e) => {
            const val = e.target.value;
            e.target.value = '';
            if (val === '__none__') bulkMove(null);
            else if (val) bulkMove(parseInt(val, 10));
        });

        $('#bulkDeleteBtn')?.addEventListener('click', bulkDelete);
        $('#bulkClearBtn')?.addEventListener('click', bulkDeselectAll);"""
content = content.replace(marker, new)
open(path, "w", encoding="utf-8", newline="\\n").write(content)
print("patched")
```

Run: `python "<scratchpad>/patch_bulk_task3_wire.py"`
Expected: `patched`

- [ ] **Step 4: Verify syntax**

Run: `node --check static/app.js`
Expected: no output

- [ ] **Step 5: Run update_hash.py**

Run: `python update_hash.py`

- [ ] **Step 6: Manual browser verification**

Using the dev preview tool:
1. Start the app, open Library. Check 2-3 prompt checkboxes — confirm the toolbar appears with the correct "N selected" count.
2. Pick an existing tag from `#bulkTagSelect` — confirm a success toast and that all selected prompts now have that tag (check via Library filter or prompt detail).
3. Pick "+ New tag…" — confirm a browser `prompt()` appears, type a new tag name, confirm it's applied to all selected prompts.
4. Pick a folder from `#bulkFolderSelect` — confirm all selected prompts moved (check folder counts update).
5. Select prompts again, click Delete — confirm a `confirm()` dialog appears with the right count; test both Cancel (nothing deleted) and OK (prompts removed, toast "N deleted").
6. Click the header "select all" checkbox — confirm all currently-filtered/visible prompts get checked and the toolbar count matches. Uncheck it — confirm all deselect.
7. Search/filter to a subset, click "select all" — confirm only the filtered subset gets selected (not the whole library).
8. Check browser console for errors throughout.

- [ ] **Step 7: Commit**

```bash
git add static/app.js static/index.html
git commit -m "feat: add bulk tag/move/delete toolbar to Library"
```

---

### Task 4: CSS — checkbox and toolbar styling

**Files:**
- Modify: `static/app.css` (append new rules; insert near other Library card rules — grep for `.prompt-card` to find the section)

**Interfaces:**
- Consumes: existing CSS custom properties (`--sp-*`, `--line`, `--surface`, `--ink*`, `--accent*`, `--r-*`) — same tokens used throughout the file, confirm exact names by reading a few nearby rules before writing new ones (don't invent new variable names).

- [ ] **Step 1: Write and run the CSS patch**

First, read `static/app.css` around the `.prompt-card` rule (search `grep -n "\.prompt-card {" static/app.css`) to confirm the exact spacing/color custom properties in use nearby, then write a patch script (in the scratchpad dir, using the Write tool, not a heredoc) that appends a new rule block after that section:

```python
path = "static/app.css"
d = open(path, "rb").read()
d = d.replace(b"\x00", b"")
content = d.decode("utf-8")

# Confirm this exact marker exists before running — adjust to the real
# surrounding rule found via the grep above if it differs.
marker = ".prompt-card {"
assert marker in content, "marker not found — inspect static/app.css manually and adjust"

addition = """
.card-select {
  margin-right: var(--sp-2, 8px);
  cursor: pointer;
}
.bulk-toolbar {
  display: flex;
  align-items: center;
  gap: var(--sp-3, 12px);
  padding: var(--sp-2, 8px) var(--sp-3, 12px);
  margin-bottom: var(--sp-3, 12px);
  background: var(--surface, #1a1a1a);
  border: 1px solid var(--line, #333);
  border-radius: var(--r-md, 8px);
}
.bulk-toolbar select {
  padding: 4px 8px;
  border-radius: var(--r-sm, 4px);
  border: 1px solid var(--line, #333);
  background: transparent;
  color: inherit;
}
"""

# Append at end of file rather than mid-rule-block to avoid disturbing
# existing selectors — safest insertion point given this file's size.
content = content.rstrip('\\n') + '\\n' + addition
open(path, "w", encoding="utf-8", newline="\\n").write(content)
print("patched")
```

Run: `python "<scratchpad>/patch_bulk_task4.py"` (save the script above under this name first)
Expected: `patched`

- [ ] **Step 2: Run update_hash.py**

Run: `python update_hash.py`
(app.css changes also need the cache-bust hash refreshed — `update_hash.py` handles both js and css hashes per the project's existing convention.)

- [ ] **Step 3: Manual visual verification**

Using the dev preview tool: open Library, confirm checkboxes are visibly aligned with card titles (not overlapping text), confirm the bulk toolbar has visible spacing/border and doesn't look broken in both light and dark mode (toggle via the app's theme button).

- [ ] **Step 4: Commit**

```bash
git add static/app.css static/index.html
git commit -m "style: add bulk toolbar and card checkbox styling"
```
