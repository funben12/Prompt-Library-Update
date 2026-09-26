# Prompt Forking Workstation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated two-pane workspace where a user forks an existing prompt (original or another fork), sees the source and the fork side by side with clear provenance badges, and can keep forking to build multi-generation lineages — all forks are ordinary rows in the existing `prompts` table.

**Architecture:** Backend already has `parent_id` on `prompts` plus a working `POST /api/prompts/<pid>/fork` and `POST /api/prompts/<pid>/duplicate`. We extend that existing lineage system (not the separate `prompt_relationships` many-to-many table — out of scope) with two new columns (`fork_root_id`, `fork_snapshot`), two new read routes (children, lineage chain), a delete-time snapshot side effect, and a new `static/app.js` workspace (`ForkWorkstation`) following the existing Cost-Lens-sized workspace pattern (two-pane `.fw-left`/`.fw-right` split, same shape as `.cl-left`/`.cl-right`).

**Tech Stack:** Flask/SQLite (app.py), vanilla JS IIFE (static/app.js), Tailwind-adjacent hand CSS (static/app.css), markup in static/index.html. No test framework — verification is `node --check`, `python3 -m py_compile`, and manual exercise in the running app per CLAUDE.md.

## Global Constraints

- No Edit/Write tool on `static/app.js` or `static/index.html` — use bash + Python `content.replace()`, verify independently after every write (CLAUDE.md hard rule 1).
- Schema change requires approval — **already granted** for fork lineage columns (2026-09-26); do not add further schema changes beyond `fork_root_id` + `fork_snapshot` without asking again.
- Run `python3 update_hash.py` after every `app.js`/`app.css` change (hard rule 3).
- Do not grow app.js/index.html beyond what this feature needs (hard rule 4).
- New workspace build order is fixed: (1) `openForkWorkstation()`, (2) nav route in `init()`'s `.nav-item[data-view]` handler, (3) `'#forkWorkstation'` added to `_escapeToLibrary()`, (4) `initForkWorkstation()` called from BOOTSTRAP — only then add the HTML (hard rule 5).
- Grep for any CSS class name before introducing it — no duplicate rule blocks targeting the same id/class under a different activation class (hard rule 6). Use a `fw-` prefix (unused — confirmed via `dif-`/`cl-` precedent, not `fw-`).
- Overlay/modal HTML order before `</body>`: workspaces → `#promptViewer` (static/index.html:4436) → `#onboardingOverlay` (static/index.html:4492) → `#toastContainer` (static/index.html:4509). New `#forkWorkstation` div goes among the other workspace divs, before line 4436 (hard rule 7).
- Reuse existing `parent_id` column and existing `fork_prompt()` / `duplicate_prompt()` routes — do not create a duplicate parent-tracking column.

---

## File Structure

- **Modify `app.py`:**
  - `init_db()` (app.py:257) — add 2 columns via `ALTER TABLE ... ADD COLUMN` guarded by try/except (SQLite has no `ADD COLUMN IF NOT EXISTS`), plus one new index.
  - `fork_prompt()` (app.py:1651) — set `fork_root_id` on the new row.
  - `delete_prompt()` (app.py:1573) — write `fork_snapshot` onto direct children before deleting.
  - New route: `GET /api/prompts/<pid>/forks` — list direct children.
  - New route: `GET /api/prompts/<pid>/lineage` — ancestor chain root → ... → parent.
  - `serialize_prompt()` (app.py:716) — add `fork_root_id`/`fork_snapshot` to the returned dict.
- **Modify `static/app.js`:** new `ForkWorkstation` block (open/close/init functions, lineage rendering, pane population, "+ New Fork" wiring), one nav-item handler line, one `_escapeToLibrary()` entry, one BOOTSTRAP call, one small addition to `renderPromptCard()` for the "forked from X" subtitle.
- **Modify `static/app.css`:** new `.fw-*` two-pane split rules (modeled on `.cl-body`/`.cl-left`/`.cl-right`, static/app.css:9446-9460).
- **Modify `static/index.html`:** new `#forkWorkstation` div, inserted among other workspace divs before line 4436; one "Fork" button added to the Prompt Viewer's action row.

---

### Task 1: Schema — add `fork_root_id` and `fork_snapshot` columns

**Files:**
- Modify: `app.py:257-310` (inside `init_db()`)

**Interfaces:**
- Produces: `prompts.fork_root_id` (INTEGER, nullable), `prompts.fork_snapshot` (TEXT/JSON, nullable) — later tasks read/write these by name.

- [ ] **Step 1: Add the migration block**

Open `app.py`, find the existing pattern for adding columns to an established table (grep `ALTER TABLE prompts ADD COLUMN` in `init_db()` — there are several already, e.g. for `role_id`, `status`, `parent_id`). Add a new block immediately after those, still inside `init_db()`, before the index-creation block at app.py:306:

```python
    for ddl in (
        "ALTER TABLE prompts ADD COLUMN fork_root_id INTEGER",
        "ALTER TABLE prompts ADD COLUMN fork_snapshot TEXT",
    ):
        try:
            c.execute(ddl)
        except sqlite3.OperationalError:
            pass  # column already exists
```

Also add one index alongside the existing five at app.py:306-310:

```python
    c.execute('CREATE INDEX IF NOT EXISTS idx_prompts_fork_root_id ON prompts(fork_root_id)')
```

Use Python `content.replace()` via bash (not Edit tool is fine here — app.py is not in hard rule 1's restricted list — but follow project convention and use the Edit tool since app.py permits it).

- [ ] **Step 2: Verify syntax**

Run: `python3 -m py_compile app.py`
Expected: no output, exit code 0.

- [ ] **Step 3: Run the app once to apply the migration**

Run: `start.bat` (or `python3 Main.py` if already in an activated venv), let it fully boot, then stop it.
Expected: no traceback in console; `PromptLibrary.db` schema now has the two new columns — verify with:
`python3 -c "import sqlite3; c=sqlite3.connect('PromptLibrary.db'); print([r[1] for r in c.execute('PRAGMA table_info(prompts)').fetchall()])"`
Expected output includes `fork_root_id` and `fork_snapshot` in the column list.

Note: the real live DB is at `~/Documents/PromptLibrary/` per project memory, not the repo-root copy — run this check against whichever path `get_data_dir()` resolves to in dev mode (repo root when unfrozen).

- [ ] **Step 4: Commit**

```bash
git add app.py
git commit -m "Add fork_root_id and fork_snapshot columns for fork lineage"
```

---

### Task 2: Backend — extend `fork_prompt()` to set `fork_root_id`

**Files:**
- Modify: `app.py:1651-1687` (`fork_prompt()`)

**Interfaces:**
- Consumes: `prompts.parent_id`, `prompts.fork_root_id` (Task 1)
- Produces: every new fork row has `fork_root_id` = the topmost ancestor's id (never null once a row is a fork).

- [ ] **Step 1: Read the source row's own `fork_root_id` and compute the child's**

In `fork_prompt()`, right after `p = serialize_prompt(row)` (existing code), add:

```python
        source_root = p.get('fork_root_id') or pid
```

(If the prompt being forked is itself an original with no `fork_root_id`, its own `pid` becomes the root.)

- [ ] **Step 2: Add the column to the INSERT**

Extend the existing `INSERT INTO prompts (...)` column list and `VALUES` placeholders (currently ending `...prompt_output_format, prompt_tone`) to also include `fork_root_id`:

```python
          cur = conn.execute('''
              INSERT INTO prompts
                  (title, description, content, categories, tags, folder_id,
                   colour_label, notes, chain_ids, variable_meta, chat_turns, role_id,
                   status, parent_id, prompt_domain, prompt_use_case, prompt_output_format, prompt_tone,
                   fork_root_id)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          ''', (
              title, p['description'], p['content'],
              _list_for_db(p['categories']), _list_for_db(p['tags']), p['folder_id'],
              p['colour_label'], '',
              json.dumps(p['chain_ids']),
              json.dumps(p['variable_meta']),
              json.dumps(p['chat_turns']),
              p.get('role_id'),
              'draft', pid,
              p.get('prompt_domain') or '',
              p.get('prompt_use_case') or '',
              p.get('prompt_output_format') or '',
              p.get('prompt_tone') or '',
              source_root,
          ))
```

- [ ] **Step 2b: Add `fork_root_id` and `fork_snapshot` to `serialize_prompt()`**

In `app.py:716-744`, add two lines next to the other `setdefault` calls:

```python
      p.setdefault('fork_root_id', None)
      p.setdefault('fork_snapshot', None)
```

- [ ] **Step 3: Verify syntax**

Run: `python3 -m py_compile app.py`
Expected: no output, exit code 0.

- [ ] **Step 4: Manual verification**

Start the app, fork any existing prompt via the existing `/api/prompts/<id>/fork` endpoint (curl or the app's current UI trigger if one exists), then check via sqlite3:
`SELECT id, parent_id, fork_root_id FROM prompts ORDER BY id DESC LIMIT 1;`
Expected: the new row's `fork_root_id` equals the id of the prompt it was forked from (or that prompt's own `fork_root_id` if forking a fork).

- [ ] **Step 5: Commit**

```bash
git add app.py
git commit -m "Set fork_root_id when forking a prompt, for multi-generation lineage"
```

---

### Task 3: Backend — children and lineage-chain routes

**Files:**
- Modify: `app.py` (add two new routes near `fork_prompt()`, e.g. directly after it)

**Interfaces:**
- Consumes: `serialize_prompt()` (Task 2), `prompts.parent_id`, `prompts.fork_root_id`
- Produces: `GET /api/prompts/<pid>/forks` → `{"forks": [<serialized prompt>, ...]}` (direct children only)
- Produces: `GET /api/prompts/<pid>/lineage` → `{"chain": [<serialized prompt>, ...]}` (root first, ending at `<pid>`'s immediate parent; empty list if `<pid>` is a root)

- [ ] **Step 1: Write the failing manual check**

Before implementing, confirm the route doesn't exist:
Run: `curl -s http://127.0.0.1:5000/api/prompts/1/forks` (with the dev server running)
Expected: 404 (route not found).

- [ ] **Step 2: Implement `GET /api/prompts/<pid>/forks`**

Add directly after `fork_prompt()`:

```python
@app.route('/api/prompts/<int:pid>/forks', methods=['GET'])
def list_forks(pid):
    conn = get_db()
    rows = conn.execute('SELECT * FROM prompts WHERE parent_id=? ORDER BY created_at', (pid,)).fetchall()
    conn.close()
    return jsonify({'forks': [serialize_prompt(r) for r in rows]})
```

- [ ] **Step 3: Implement `GET /api/prompts/<pid>/lineage`**

```python
@app.route('/api/prompts/<int:pid>/lineage', methods=['GET'])
def get_lineage(pid):
    conn = get_db()
    chain = []
    current = conn.execute('SELECT * FROM prompts WHERE id=?', (pid,)).fetchone()
    seen = {pid}
    while current is not None:
        parent_id = current['parent_id']
        if parent_id is None or parent_id in seen:
            break
        parent = conn.execute('SELECT * FROM prompts WHERE id=?', (parent_id,)).fetchone()
        if parent is None:
            break
        chain.insert(0, serialize_prompt(parent))
        seen.add(parent_id)
        current = parent
    conn.close()
    return jsonify({'chain': chain})
```

(`seen` guards against a corrupted/cyclic `parent_id` chain so this can never infinite-loop.)

- [ ] **Step 4: Verify syntax**

Run: `python3 -m py_compile app.py`
Expected: no output, exit code 0.

- [ ] **Step 5: Manual verification**

With the app running and at least one fork-of-a-fork created (from Task 2's test):
`curl -s http://127.0.0.1:5000/api/prompts/<child_id>/forks` → `{"forks": []}` if it has no children yet, else a list.
`curl -s http://127.0.0.1:5000/api/prompts/<grandchild_id>/lineage` → `{"chain": [<root>, <parent>]}`.

- [ ] **Step 6: Commit**

```bash
git add app.py
git commit -m "Add /api/prompts/<id>/forks and /api/prompts/<id>/lineage routes"
```

---

### Task 4: Backend — delete-time snapshot for orphaned forks

**Files:**
- Modify: `app.py:1573-1581` (`delete_prompt()`)

**Interfaces:**
- Consumes: `serialize_prompt()`, `prompts.fork_snapshot` (Task 1)
- Produces: every direct child of a deleted prompt gets `fork_snapshot` populated (JSON `{"title": ..., "content": ...}`) if it didn't already have one.

- [ ] **Step 1: Add the snapshot side effect before the DELETE**

Replace the body of `delete_prompt()`:

```python
@app.route('/api/prompts/<int:pid>', methods=['DELETE'])
def delete_prompt(pid):
    if pid in _locked_prompt_ids():
        return jsonify({'error': 'This prompt is locked. Unlock it in Version Lock before deleting.'}), 423
    conn = get_db()
    row = conn.execute('SELECT title, content FROM prompts WHERE id=?', (pid,)).fetchone()
    if row is not None:
        snapshot = json.dumps({'title': row['title'], 'content': row['content']})
        conn.execute(
            'UPDATE prompts SET fork_snapshot=? WHERE parent_id=? AND fork_snapshot IS NULL',
            (snapshot, pid)
        )
    conn.execute('DELETE FROM prompts WHERE id=?', (pid,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})
```

- [ ] **Step 2: Verify syntax**

Run: `python3 -m py_compile app.py`
Expected: no output, exit code 0.

- [ ] **Step 3: Manual verification**

Create prompt A, fork it to get B. Delete A via `DELETE /api/prompts/<A_id>`. Check B:
`SELECT fork_snapshot FROM prompts WHERE id=<B_id>;`
Expected: non-null JSON containing A's title/content at time of deletion. Confirm B itself is otherwise untouched (title, content, parent_id unchanged).

- [ ] **Step 4: Commit**

```bash
git add app.py
git commit -m "Snapshot deleted prompt's title/content onto its direct forks"
```

---

### Task 5: CSS — two-pane fork layout

**Files:**
- Modify: `static/app.css` (append near the `.cl-*` block, static/app.css:9446-9460)

**Interfaces:**
- Produces: `.fw-body`, `.fw-left`, `.fw-right`, `.fw-badge`, `.fw-badge-original`, `.fw-badge-fork`, `.fw-badge-deleted`, `.fw-breadcrumb`, `.fw-crumb` classes consumed by Task 7's HTML/JS.

- [ ] **Step 1: Grep to confirm no collision**

Run: `grep -n "\.fw-" static/app.css`
Expected: no matches (prefix unused — confirms Task list assumption).

- [ ] **Step 2: Append the CSS block**

Using the Edit tool (app.css is not restricted by hard rule 1) or bash+Python, append after the `.cl-*` block (static/app.css:9446-9460):

```css
.fw-body { display: grid; grid-template-columns: 1fr 1fr; flex: 1; overflow: hidden; }
.fw-left, .fw-right { display: flex; flex-direction: column; padding: var(--sp-4) var(--sp-5); overflow-y: auto; }
.fw-left { border-right: 1px solid var(--line); background: color-mix(in oklch, var(--surface-2) 40%, transparent); }
.fw-pane-head { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); }
.fw-badge { font-size: var(--fs-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 2px 8px; border-radius: 999px; }
.fw-badge-original { background: color-mix(in oklch, var(--accent) 16%, transparent); color: var(--accent); }
.fw-badge-fork { background: color-mix(in oklch, #f59e0b 18%, transparent); color: #b45309; }
.fw-badge-deleted { background: color-mix(in oklch, #ef4444 16%, transparent); color: #dc2626; }
.fw-breadcrumb { display: flex; align-items: center; gap: var(--sp-1); flex-wrap: wrap; padding: var(--sp-2) var(--sp-5); border-bottom: 1px solid var(--line); font-size: var(--fs-xs); }
.fw-crumb { color: var(--ink-3); cursor: pointer; }
.fw-crumb:hover { color: var(--accent); text-decoration: underline; }
.fw-crumb-sep { color: var(--ink-4); }
@media (max-width: 900px) {
  .fw-body { grid-template-columns: 1fr; }
  .fw-left { border-right: none; border-bottom: 1px solid var(--line); }
}
```

- [ ] **Step 3: Verify**

Run: `grep -c "\.fw-body" static/app.css`
Expected: `1`.

- [ ] **Step 4: Commit**

```bash
git add static/app.css
git commit -m "Add two-pane fw-* CSS for the Fork Workstation"
```

---

### Task 6: HTML — `#forkWorkstation` workspace markup + Fork button on viewer

**Files:**
- Modify: `static/index.html` (insert new div among workspace divs before line 4436; add one button inside the existing Prompt Viewer action row)

**Interfaces:**
- Produces: `#forkWorkstation`, `#closeForkBtn`, `#forkBreadcrumb`, `#forkOriginalPane`, `#forkEditPane`, `#forkTitleInput`, `#forkContentInput`, `#newForkBtn`, `#forkPickerModal` (used by `#viewerForkBtn` when no prompt is pre-selected) — element ids consumed by Task 7's JS.
- Produces: `#viewerForkBtn` inside the Prompt Viewer's action row.

- [ ] **Step 1: Write the workstation markup to a scratch file**

Write this to `docs/superpowers/scratch/fork-workstation.html` (scratch, not shipped) so the next step's Python script has an exact block to insert — using the Write tool is fine for this scratch file (not a restricted file):

```html
<div id="forkWorkstation" role="dialog" aria-modal="true" aria-label="Prompt Forking Workstation">
  <div class="ws-header">
    <div class="ws-header-left">
      <span class="material-symbols-outlined ws-header-icon">call_split</span>
      <div>
        <h2 class="ws-title">Fork Workstation</h2>
        <p class="ws-subtitle">Experiment freely — the original stays untouched.</p>
      </div>
    </div>
    <div class="ws-header-actions">
      <button class="icon-btn" id="closeForkBtn" aria-label="Close Fork Workstation"><span class="material-symbols-outlined">close</span></button>
    </div>
  </div>
  <div class="fw-breadcrumb" id="forkBreadcrumb"></div>
  <div class="ws-body fw-body">
    <div class="fw-left" id="forkOriginalPane">
      <div class="fw-pane-head">
        <span class="fw-badge fw-badge-original" id="forkOriginalBadge">Original</span>
      </div>
      <h3 id="forkOriginalTitle"></h3>
      <pre id="forkOriginalContent" class="fw-readonly-content"></pre>
    </div>
    <div class="fw-right" id="forkEditPane">
      <div class="fw-pane-head">
        <span class="fw-badge fw-badge-fork">Fork</span>
        <button class="btn btn-sm" id="newForkBtn">+ New Fork</button>
        <button class="btn btn-sm btn-primary" id="forkSaveBtn">Save</button>
        <button class="btn btn-sm btn-ghost" id="forkFullEditorBtn">Edit full details&hellip;</button>
      </div>
      <input type="text" id="forkTitleInput" class="input" placeholder="Fork title" />
      <textarea id="forkContentInput" class="textarea" placeholder="Fork content"></textarea>
      <p class="fw-save-status" id="forkSaveStatus" aria-live="polite"></p>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Insert it into `static/index.html`**

Write and run this Python script (per hard rule 1 — bash + Python `content.replace()`, never Edit/Write on index.html):

```python
import pathlib

path = pathlib.Path("static/index.html")
content = path.read_text(encoding="utf-8")

marker = '<div id="promptViewer"'
assert content.count(marker) == 1, "expected exactly one #promptViewer div"

fork_html = pathlib.Path("docs/superpowers/scratch/fork-workstation.html").read_text(encoding="utf-8")

insert_at = content.index(marker)
new_content = content[:insert_at] + fork_html + "\n" + content[insert_at:]

assert new_content.count("<script") == 3, "script tag count changed unexpectedly"
path.write_text(new_content, encoding="utf-8")
print("inserted", len(fork_html), "chars before #promptViewer")
```

- [ ] **Step 3: Add the Fork button to the Prompt Viewer's action row**

Find the existing action-button row inside `#promptViewer` (grep `id="promptViewer"` then look a few dozen lines down for the row of icon buttons — edit/duplicate/delete). Use a second `content.replace()` Python script to insert, immediately before the existing duplicate/edit button:

```python
import pathlib

path = pathlib.Path("static/index.html")
content = path.read_text(encoding="utf-8")

old = '<button class="icon-btn" id="viewerDuplicateBtn"'
assert content.count(old) == 1, "expected exactly one viewerDuplicateBtn button"

new_button = '<button class="icon-btn" id="viewerForkBtn" aria-label="Fork this prompt"><span class="material-symbols-outlined">call_split</span></button>\n      '

new_content = content.replace(old, new_button + old, 1)
assert new_content.count("<script") == 3
path.write_text(new_content, encoding="utf-8")
print("inserted viewerForkBtn")
```

(If `viewerDuplicateBtn` doesn't exist under that exact id, grep first: `grep -n "icon-btn.*id=\"viewer" static/index.html` and adjust the anchor string to match what's actually there before running.)

- [ ] **Step 4: Verify**

Run: `grep -c "<script" static/index.html`
Expected: `3`.
Run: `grep -c "forkWorkstation" static/index.html`
Expected: at least `1`.
Run: `grep -c "viewerForkBtn" static/index.html`
Expected: `1`.

- [ ] **Step 5: Commit**

```bash
git add static/index.html
git commit -m "Add Fork Workstation markup and viewer Fork button"
```

---

### Task 7: JS — open/close/init, nav route, escape route, BOOTSTRAP

**Files:**
- Modify: `static/app.js` (new block near the Cost Lens workspace, static/app.js:14216-14343; nav handler near static/app.js:5018; `_escapeToLibrary()` at static/app.js:4896; BOOTSTRAP near static/app.js:19836)

**Interfaces:**
- Consumes: `state.prompts` (existing), `_wsFillPromptPicker`, `_wsPickedPrompt` (existing helpers used by other workspaces), `fetch` wrappers already used elsewhere in app.js for `/api/prompts/*` calls.
- Produces: `window.openForkWorkstation(promptId)`, `closeForkWorkstation()`, `initForkWorkstation()` — used by Task 6's HTML ids and by the viewer's Fork button.

- [ ] **Step 1: Write the JS block to a scratch file**

Write to `docs/superpowers/scratch/fork-workstation.js`:

```js
async function _fwLoadLineage(promptId) {
    const res = await fetch(`/api/prompts/${promptId}/lineage`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.chain || [];
}

function _fwRenderBreadcrumb(chain, currentPrompt) {
    const el = $('#forkBreadcrumb');
    if (!el) return;
    const parts = [...chain, currentPrompt].map((p, i, arr) => {
        const isLast = i === arr.length - 1;
        const label = escapeHtml(p.title || 'Untitled');
        return isLast
            ? `<span class="fw-crumb" style="cursor:default;color:var(--ink-1);font-weight:600;">${label}</span>`
            : `<span class="fw-crumb" data-fork-jump="${p.id}">${label}</span>`;
    });
    el.innerHTML = parts.join('<span class="fw-crumb-sep">/</span>');
    el.querySelectorAll('[data-fork-jump]').forEach(node => {
        node.addEventListener('click', () => window.openForkWorkstation(parseInt(node.dataset.forkJump, 10)));
    });
}

function _fwRenderOriginalPane(sourcePrompt) {
    const badge = $('#forkOriginalBadge');
    const titleEl = $('#forkOriginalTitle');
    const contentEl = $('#forkOriginalContent');
    if (!sourcePrompt) {
        if (badge) { badge.textContent = 'Original deleted'; badge.className = 'fw-badge fw-badge-deleted'; }
        if (titleEl) titleEl.textContent = '(deleted)';
        if (contentEl) contentEl.textContent = '';
        return;
    }
    if (badge) {
        const isFork = !!sourcePrompt.parent_id;
        badge.textContent = isFork ? 'Parent Fork' : 'Original';
        badge.className = 'fw-badge ' + (isFork ? 'fw-badge-fork' : 'fw-badge-original');
    }
    if (titleEl) titleEl.textContent = sourcePrompt.title || 'Untitled';
    if (contentEl) contentEl.textContent = sourcePrompt.content || '';
}

let _fwState = { currentId: null, sourceId: null };

window.openForkWorkstation = async function(promptId) {
    if (!state.isPremium) { showPremiumModal(); return; }
    const ws = $('#forkWorkstation');
    if (!ws || !promptId) return;
    const prompt = state.prompts.find(p => p.id === promptId);
    if (!prompt) return;

    _fwState.currentId = promptId;
    _fwState.sourceId = prompt.parent_id || null;

    ws.classList.add('open');
    document.body.style.overflow = 'hidden';
    $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'fork'));

    const chain = await _fwLoadLineage(promptId);
    _fwRenderBreadcrumb(chain, prompt);

    let sourcePrompt = null;
    if (prompt.parent_id) {
        sourcePrompt = state.prompts.find(p => p.id === prompt.parent_id) || null;
        if (!sourcePrompt && prompt.fork_snapshot) {
            try { sourcePrompt = JSON.parse(prompt.fork_snapshot); } catch (e) { sourcePrompt = null; }
        }
    }
    _fwRenderOriginalPane(sourcePrompt || (prompt.parent_id ? null : prompt));

    const titleInput = $('#forkTitleInput');
    const contentInput = $('#forkContentInput');
    if (titleInput) titleInput.value = prompt.title || '';
    if (contentInput) contentInput.value = prompt.content || '';
};

function closeForkWorkstation() {
    $('#forkWorkstation')?.classList.remove('open');
    document.body.style.overflow = '';
    $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
}

async function _fwCreateNewFork() {
    if (!_fwState.currentId) return;
    const res = await fetch(`/api/prompts/${_fwState.currentId}/fork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    if (!res.ok) return;
    const data = await res.json();
    await loadPrompts();
    window.openForkWorkstation(data.id);
}

async function _fwSaveCurrent() {
    if (!_fwState.currentId) return;
    const statusEl = $('#forkSaveStatus');
    const title = $('#forkTitleInput')?.value ?? '';
    const content = $('#forkContentInput')?.value ?? '';
    if (statusEl) statusEl.textContent = 'Saving…';
    const res = await fetch(`/api/prompts/${_fwState.currentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
    });
    if (!res.ok) {
        if (statusEl) statusEl.textContent = 'Save failed';
        return;
    }
    await loadPrompts();
    if (statusEl) statusEl.textContent = 'Saved';
}

function initForkWorkstation() {
    const ws = $('#forkWorkstation');
    if (!ws) return;
    $('#closeForkBtn')?.addEventListener('click', closeForkWorkstation);
    $('#newForkBtn')?.addEventListener('click', _fwCreateNewFork);
    $('#forkSaveBtn')?.addEventListener('click', _fwSaveCurrent);
    $('#forkFullEditorBtn')?.addEventListener('click', () => {
        const idToEdit = _fwState.currentId;
        closeForkWorkstation();
        window.PL_openDetail(idToEdit);
    });
    ws.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeForkWorkstation();
    });
}
```

Note: `loadPrompts()` is assumed to be the existing function that refreshes `state.prompts` from `/api/prompts` after a mutation — grep `async function loadPrompts` in app.js to confirm the exact name before this step; if it differs, use the actual name. `PUT /api/prompts/<id>` is assumed to be the existing prompt-update route (used by the standard editor) — grep `methods=['PUT']` near `update_prompt` in app.py to confirm its exact accepted body shape before wiring Step 6; it already accepts partial JSON bodies for title/content based on the same `_prompt_payload()` shaping used by create.

**Scope decision:** the workstation's right pane only edits title + content inline (fast path for the common "tweak the prompt" case). Full metadata (variables, tags, model, folder) is edited via the existing Prompt Viewer/editor — `#forkFullEditorBtn` closes the workstation and opens that editor on the same fork, so metadata editing isn't duplicated in two places. This satisfies spec item 8 (fork has its own editable metadata) without rebuilding the full metadata form inside the workstation.

- [ ] **Step 2: Insert the block into `static/app.js`**

```python
import pathlib

path = pathlib.Path("static/app.js")
content = path.read_text(encoding="utf-8")

marker = "function closeCostWorkspace()"
assert content.count(marker) == 1, "expected exactly one closeCostWorkspace anchor"

fork_js = pathlib.Path("docs/superpowers/scratch/fork-workstation.js").read_text(encoding="utf-8")

insert_at = content.index(marker)
new_content = content[:insert_at] + fork_js + "\n\n" + content[insert_at:]

assert new_content.endswith("})();") or new_content.rstrip().endswith("})();"), "IIFE closing not intact"
path.write_text(new_content, encoding="utf-8")
print("inserted", len(fork_js), "chars before closeCostWorkspace")
```

- [ ] **Step 3: Add the nav-item handler**

```python
import pathlib

path = pathlib.Path("static/app.js")
content = path.read_text(encoding="utf-8")

old = "    if (v === 'cost') {\n        window.openCostWorkspace();\n        return;\n    }"
assert content.count(old) == 1, "expected exactly one cost nav handler to anchor against"

new_block = old + "\n    if (v === 'fork') {\n        window.openForkWorkstation(state.detailId);\n        return;\n    }"
new_content = content.replace(old, new_block, 1)
path.write_text(new_content, encoding="utf-8")
print("inserted fork nav handler")
```

- [ ] **Step 4: Add to `_escapeToLibrary()`**

```python
import pathlib

path = pathlib.Path("static/app.js")
content = path.read_text(encoding="utf-8")

old = "'#costWorkspace', '#pulseWorkspace', '#xrayWorkspace', '#spliceWorkspace',"
assert content.count(old) == 1

new = "'#costWorkspace', '#pulseWorkspace', '#xrayWorkspace', '#spliceWorkspace', '#forkWorkstation',"
new_content = content.replace(old, new, 1)
path.write_text(new_content, encoding="utf-8")
print("added forkWorkstation to escape list")
```

- [ ] **Step 5: Add BOOTSTRAP call**

```python
import pathlib

path = pathlib.Path("static/app.js")
content = path.read_text(encoding="utf-8")

old = "initCostWorkspace(); // cost lens workspace"
assert content.count(old) == 1

new = old + "\n    initForkWorkstation(); // prompt forking workstation"
new_content = content.replace(old, new, 1)
path.write_text(new_content, encoding="utf-8")
print("added initForkWorkstation to BOOTSTRAP")
```

- [ ] **Step 6: Wire the viewer's Fork button**

Find the existing listener registration for `viewerDuplicateBtn` (or whichever button Task 6 anchored against) in `initPromptViewer()` or similar, and add a sibling listener via another `content.replace()` script:

```python
import pathlib

path = pathlib.Path("static/app.js")
content = path.read_text(encoding="utf-8")

old = "$('#viewerDuplicateBtn')?.addEventListener('click'"
assert content.count(old) == 1, "expected exactly one viewerDuplicateBtn listener registration to anchor against"

new = "$('#viewerForkBtn')?.addEventListener('click', () => window.openForkWorkstation(state.detailId));\n    " + old
new_content = content.replace(old, new, 1)
path.write_text(new_content, encoding="utf-8")
print("wired viewerForkBtn")
```

(If the exact anchor line doesn't match, grep `viewerDuplicateBtn` first and adjust — this mirrors Task 6 Step 3's caveat.)

- [ ] **Step 7: Verify**

Run: `node --check static/app.js`
Expected: no output, exit code 0.

- [ ] **Step 8: Cache-bust**

Run: `python3 update_hash.py`
Expected: script tag in index.html now carries a fresh `app.js?v=[hash]`.

- [ ] **Step 9: Commit**

```bash
git add static/app.js
git commit -m "Add Fork Workstation open/close/init, nav route, escape route, BOOTSTRAP call"
```

---

### Task 8: JS — "forked from X" subtitle on library cards

**Files:**
- Modify: `static/app.js:936-993` (`renderPromptCard`)

**Interfaces:**
- Consumes: `p.parent_id` (already serialized, per Task 2's `serialize_prompt` — was already present before this plan), `state.prompts`.

- [ ] **Step 1: Add the lookup and subtitle markup**

Inside `renderPromptCard(p)`, immediately after the existing `const folder = state.folders.find(...)` line, add:

```js
    const forkParent = p.parent_id ? state.prompts.find(x => x.id === p.parent_id) : null;
```

Then, inside the returned template string, immediately after the `card-desc` paragraph (or after `card-title-row` if there's no description), add:

```js
${forkParent ? `<p class="card-fork-subtitle"><span class="material-symbols-outlined" style="font-size:14px;vertical-align:-2px;">call_split</span> forked from ${escapeHtml(forkParent.title || 'Untitled')}</p>` : ''}
```

- [ ] **Step 2: Add the matching CSS**

Append to `static/app.css`, near the `.card-*` rules (grep `\.card-desc` to find the block):

```css
.card-fork-subtitle { font-size: var(--fs-xs); color: var(--ink-3); margin: 2px 0 0; display: flex; align-items: center; gap: 4px; }
```

- [ ] **Step 3: Verify**

Run: `node --check static/app.js`
Expected: no output, exit code 0.

- [ ] **Step 4: Cache-bust**

Run: `python3 update_hash.py`

- [ ] **Step 5: Manual verification**

Run the app, open the library, confirm a previously-created fork's card shows "forked from <parent title>" with the branch icon; confirm an original prompt's card shows no subtitle.

- [ ] **Step 6: Commit**

```bash
git add static/app.js static/app.css
git commit -m "Show forked-from subtitle and branch icon on library cards"
```

---

### Task 9: Final end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full syntax check**

Run: `node --check static/app.js && python3 -m py_compile app.py`
Expected: both succeed silently.

- [ ] **Step 2: Structural sanity**

Run: `grep -c "<script" static/index.html`
Expected: `3`.

- [ ] **Step 3: Manual walkthrough**

Start the app (`start.bat`). In the running app:
1. Open any existing prompt, click the new Fork button → Fork Workstation opens, left pane shows "Original" badge with that prompt's content, right pane is pre-filled with a copy.
2. Click "+ New Fork" — a second fork of the same original is created; breadcrumb updates.
3. From that second fork, click "+ New Fork" again (fork-of-a-fork) — left pane now shows "Parent Fork" badge (not "Original"), breadcrumb shows 3 levels.
4. Edit the fork's title/content and save (existing save path) — reopen the original prompt and confirm it is byte-for-byte unchanged.
5. Delete the original prompt — reopen one of its direct forks in the workstation — left pane shows "Original deleted" badge with the frozen snapshot title/content.
6. In the main library, confirm forked prompts show the branch icon + "forked from X" subtitle, and that they appear in normal search results.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "Complete Prompt Forking Workstation feature"
```
