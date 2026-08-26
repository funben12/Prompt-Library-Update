# Three New Workspaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Taxonomy Studio, Relationship Graph, and Version Timeline — three premium workspaces backed by real (currently unused) DB schema — following the design in `docs/superpowers/specs/2026-08-16-three-new-workspaces-design.md`.

**Architecture:** Backend first (schema + 8 new Flask routes on the existing `app.py` monolith), then each workspace's JS+CSS as a self-contained, not-yet-reachable section (safe to add without touching shared wiring), then one task that wires all three into the shared launcher/palette/bootstrap machinery, then one task that adds the HTML and does the full interactive verification pass.

**Tech Stack:** Flask + sqlite3 (`app.py`), vanilla JS IIFE (`static/app.js`), plain CSS custom properties (`static/app.css`), no build step.

## Global Constraints

- **No test suite in this project.** Verification is manual: `node --check static/app.js`, `python3 -m py_compile app.py`, and (for backend) `curl` against the running dev server, or (for frontend) clicking through in the running app. Every task's "test" steps below use these, not pytest/jest — this overrides the writing-plans skill's default TDD framing per this project's CLAUDE.md.
- **Never use Edit or Write on `static/app.js` or `static/index.html`.** Per CLAUDE.md hard rule 1, use a Python script (via the Write tool, run via Bash — never a bash heredoc, which mangles backslashes on this box) that reads the file, does one `content.replace(old, new, 1)` after asserting `content.count(old) == 1`, and writes back with `newline='\n'`. `app.py` and `static/app.css` may use the Edit tool directly.
- **Run `python3 update_hash.py` after every `app.js`/`app.css` change**, or the browser serves a stale cached copy.
- **No schema changes beyond the one approved table** (`prompt_taxonomy`) — everything else is new routes/UI on existing tables.
- **Icons: classic (pre-2022) Material Symbols names only** (see project memory `material-icons-classic-only`) — this plan only uses `sell`, `device_hub`, `history`, `add`, `edit`, `delete`, `close`, `link_off`, `add_link`, `star`, `star_outline`, all of which are pre-2021 classic names.
- **Build order for new workspaces (CLAUDE.md hard rule 5):** JS functions + wiring (nav-item toggle, `_escapeToLibrary`, BOOTSTRAP init call) land before the HTML that makes them reachable. Tasks 5–7 add self-contained JS/CSS; Task 8 wires the shared arrays; Task 9 adds HTML last.
- **No duplicate CSS blocks (hard rule 6):** the base workspace-overlay rule at `static/app.css:8121` is *extended* with three more `#id` selectors, never re-declared.
- **Parked WIP:** before Task 5, the controller found ~4,600 lines of unrelated uncommitted work already dirty in `static/app.js`/`app.css`/`index.html` (an in-progress AI-provider settings feature, plus a "Prompt Board" launcher card not yet wired into `app.js`). To stop implementer subagents from sweeping it into task commits (as happened twice with `app.py` on Tasks 1–2), it was saved to `.superpowers/sdd/_wip_appjs.patch`, `_wip_appcss.patch`, `_wip_indexhtml.patch` and reverted from the working tree. **After Task 9's commit lands and verification passes, the controller must reapply all three patches** (`git apply .superpowers/sdd/_wip_*.patch`) before considering this plan finished — that WIP is real user work, not scratch.

---

## Task 1: Schema — `prompt_taxonomy` junction table

**Files:**
- Modify: `app.py` (inside `init_db()`, right after the `taxonomy_use_cases` table creation)

**Interfaces:**
- Produces: table `prompt_taxonomy(prompt_id, use_case_id)`, PK on both columns, `FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE`, `FOREIGN KEY (use_case_id) REFERENCES taxonomy_use_cases(id) ON DELETE CASCADE`. `get_db()` already sets `PRAGMA foreign_keys = ON`, so both cascades are live.

- [ ] **Step 1: Add the table to `init_db()`**

In `app.py`, find this exact block (currently ends the taxonomy table setup):

```python
    c.execute('''CREATE TABLE IF NOT EXISTS taxonomy_use_cases (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        domain_id INTEGER NOT NULL,
        name      TEXT NOT NULL,
        UNIQUE(domain_id, name)
    )''')
```

Replace it with:

```python
    c.execute('''CREATE TABLE IF NOT EXISTS taxonomy_use_cases (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        domain_id INTEGER NOT NULL,
        name      TEXT NOT NULL,
        UNIQUE(domain_id, name)
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS prompt_taxonomy (
        prompt_id   INTEGER NOT NULL,
        use_case_id INTEGER NOT NULL,
        PRIMARY KEY (prompt_id, use_case_id),
        FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
        FOREIGN KEY (use_case_id) REFERENCES taxonomy_use_cases(id) ON DELETE CASCADE
    )''')
```

Use the Edit tool (this file is not covered by hard rule 1).

- [ ] **Step 2: Verify syntax**

Run: `python3 -m py_compile app.py`
Expected: no output, exit code 0.

- [ ] **Step 3: Verify the table is created on a fresh DB**

Run:
```bash
python3 -c "
import sqlite3, os
os.environ.setdefault('PROMPTLIB_DB', '/tmp/_pl_test.db')
import app
app.DATABASE = '/tmp/_pl_test.db'
app.init_db()
conn = sqlite3.connect('/tmp/_pl_test.db')
row = conn.execute(\"SELECT name FROM sqlite_master WHERE type='table' AND name='prompt_taxonomy'\").fetchone()
print('OK' if row else 'MISSING')
os.remove('/tmp/_pl_test.db')
"
```
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add app.py
git commit -m "feat: add prompt_taxonomy junction table"
```

---

## Task 2: Backend — taxonomy domain/use-case CRUD + bulk-tag

**Files:**
- Modify: `app.py` (insert after the existing `get_taxonomy()` route, which ends just before the `/api/prompts/<int:pid>/relationships` GET route)

**Interfaces:**
- Consumes: `prompt_taxonomy` table from Task 1.
- Produces: `POST/PUT/DELETE /api/taxonomy/domains[/<id>]`, `POST/PUT/DELETE /api/taxonomy/use-cases[/<id>]`, `GET /api/taxonomy/use-cases/<id>/prompts`, `POST /api/taxonomy/bulk-tag`. All return JSON; errors return `{'error': msg}` with 400/404.

- [ ] **Step 1: Add the routes**

In `app.py`, find this exact block:

```python
@app.route('/api/taxonomy', methods=['GET'])
def get_taxonomy():
    """Return all taxonomy domains and their use cases."""
    conn = get_db()
    try:
        domains = conn.execute('SELECT id, name FROM taxonomy_domains ORDER BY name').fetchall()
        result = []
        for d in domains:
            use_cases = conn.execute(
                'SELECT id, name FROM taxonomy_use_cases WHERE domain_id=? ORDER BY name',
                (d['id'],)
            ).fetchall()
            result.append({
                'id': d['id'],
                'name': d['name'],
                'use_cases': [{'id': u['id'], 'name': u['name']} for u in use_cases]
            })
    finally:
        conn.close()
    return jsonify(result)


@app.route('/api/prompts/<int:pid>/relationships', methods=['GET'])
```

Replace it with:

```python
@app.route('/api/taxonomy', methods=['GET'])
def get_taxonomy():
    """Return all taxonomy domains and their use cases."""
    conn = get_db()
    try:
        domains = conn.execute('SELECT id, name FROM taxonomy_domains ORDER BY name').fetchall()
        result = []
        for d in domains:
            use_cases = conn.execute(
                'SELECT id, name FROM taxonomy_use_cases WHERE domain_id=? ORDER BY name',
                (d['id'],)
            ).fetchall()
            result.append({
                'id': d['id'],
                'name': d['name'],
                'use_cases': [{'id': u['id'], 'name': u['name']} for u in use_cases]
            })
    finally:
        conn.close()
    return jsonify(result)


@app.route('/api/taxonomy/domains', methods=['POST'])
def create_taxonomy_domain():
    data = _json_body()
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    conn = get_db()
    try:
        conn.execute('INSERT INTO taxonomy_domains (name) VALUES (?)', (name,))
        conn.commit()
        row = conn.execute('SELECT id, name FROM taxonomy_domains WHERE name=?', (name,)).fetchone()
    finally:
        conn.close()
    return jsonify({'id': row['id'], 'name': row['name']})


@app.route('/api/taxonomy/domains/<int:did>', methods=['PUT'])
def rename_taxonomy_domain(did):
    data = _json_body()
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    conn = get_db()
    try:
        conn.execute('UPDATE taxonomy_domains SET name=? WHERE id=?', (name, did))
        conn.commit()
    finally:
        conn.close()
    return jsonify({'success': True})


@app.route('/api/taxonomy/domains/<int:did>', methods=['DELETE'])
def delete_taxonomy_domain(did):
    conn = get_db()
    try:
        uc_ids = [r['id'] for r in conn.execute(
            'SELECT id FROM taxonomy_use_cases WHERE domain_id=?', (did,)).fetchall()]
        if uc_ids:
            placeholders = ','.join('?' * len(uc_ids))
            conn.execute(f'DELETE FROM prompt_taxonomy WHERE use_case_id IN ({placeholders})', uc_ids)
            conn.execute('DELETE FROM taxonomy_use_cases WHERE domain_id=?', (did,))
        conn.execute('DELETE FROM taxonomy_domains WHERE id=?', (did,))
        conn.commit()
    finally:
        conn.close()
    return jsonify({'success': True})


@app.route('/api/taxonomy/use-cases', methods=['POST'])
def create_taxonomy_use_case():
    data = _json_body()
    domain_id = data.get('domain_id')
    name = (data.get('name') or '').strip()
    if not domain_id or not name:
        return jsonify({'error': 'domain_id and name are required'}), 400
    conn = get_db()
    try:
        conn.execute('INSERT OR IGNORE INTO taxonomy_use_cases (domain_id, name) VALUES (?,?)',
                     (domain_id, name))
        conn.commit()
        row = conn.execute('SELECT id, name FROM taxonomy_use_cases WHERE domain_id=? AND name=?',
                            (domain_id, name)).fetchone()
    finally:
        conn.close()
    return jsonify({'id': row['id'], 'name': row['name']})


@app.route('/api/taxonomy/use-cases/<int:uid>', methods=['PUT'])
def rename_taxonomy_use_case(uid):
    data = _json_body()
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    conn = get_db()
    try:
        conn.execute('UPDATE taxonomy_use_cases SET name=? WHERE id=?', (name, uid))
        conn.commit()
    finally:
        conn.close()
    return jsonify({'success': True})


@app.route('/api/taxonomy/use-cases/<int:uid>', methods=['DELETE'])
def delete_taxonomy_use_case(uid):
    conn = get_db()
    try:
        conn.execute('DELETE FROM prompt_taxonomy WHERE use_case_id=?', (uid,))
        conn.execute('DELETE FROM taxonomy_use_cases WHERE id=?', (uid,))
        conn.commit()
    finally:
        conn.close()
    return jsonify({'success': True})


@app.route('/api/taxonomy/use-cases/<int:uid>/prompts', methods=['GET'])
def get_taxonomy_use_case_prompts(uid):
    conn = get_db()
    try:
        rows = conn.execute('''
            SELECT p.id, p.title, p.description, p.folder_id, p.updated_at
            FROM prompt_taxonomy pt
            JOIN prompts p ON p.id = pt.prompt_id
            WHERE pt.use_case_id=?
            ORDER BY p.title
        ''', (uid,)).fetchall()
        result = [dict(r) for r in rows]
    finally:
        conn.close()
    return jsonify(result)


@app.route('/api/taxonomy/bulk-tag', methods=['POST'])
def bulk_tag_taxonomy():
    data = _json_body()
    prompt_ids = data.get('prompt_ids') or []
    use_case_id = data.get('use_case_id')
    action = data.get('action', 'add')
    if not prompt_ids or not use_case_id or action not in ('add', 'remove'):
        return jsonify({'error': 'prompt_ids, use_case_id and a valid action are required'}), 400
    conn = get_db()
    try:
        if action == 'add':
            conn.executemany(
                'INSERT OR IGNORE INTO prompt_taxonomy (prompt_id, use_case_id) VALUES (?,?)',
                [(pid, use_case_id) for pid in prompt_ids]
            )
        else:
            placeholders = ','.join('?' * len(prompt_ids))
            conn.execute(
                f'DELETE FROM prompt_taxonomy WHERE use_case_id=? AND prompt_id IN ({placeholders})',
                [use_case_id] + prompt_ids
            )
        conn.commit()
    finally:
        conn.close()
    return jsonify({'success': True, 'count': len(prompt_ids)})


@app.route('/api/prompts/<int:pid>/relationships', methods=['GET'])
```

Use the Edit tool.

- [ ] **Step 2: Verify syntax**

Run: `python3 -m py_compile app.py`
Expected: no output, exit code 0.

- [ ] **Step 3: Manual verification against the running dev server**

Start the app (`start.bat` or `python3 Main.py` per project convention), then:

```bash
curl -s -X POST http://localhost:5000/api/taxonomy/domains -H "Content-Type: application/json" -d '{"name":"Test Domain"}'
```
Expected: JSON with `id` and `name: "Test Domain"`.

```bash
curl -s http://localhost:5000/api/taxonomy
```
Expected: array including the new domain with empty `use_cases`.

Take the domain `id` from the first response (call it `DID`) and run:
```bash
curl -s -X POST http://localhost:5000/api/taxonomy/use-cases -H "Content-Type: application/json" -d "{\"domain_id\":$DID,\"name\":\"Test Use Case\"}"
```
Expected: JSON with `id` and `name: "Test Use Case"`. Take that `id` as `UID`.

```bash
curl -s -X POST http://localhost:5000/api/taxonomy/bulk-tag -H "Content-Type: application/json" -d "{\"prompt_ids\":[1],\"use_case_id\":$UID,\"action\":\"add\"}"
curl -s http://localhost:5000/api/taxonomy/use-cases/$UID/prompts
```
Expected: bulk-tag returns `{"success": true, "count": 1}`; the prompts list includes prompt id 1 (adjust to any real prompt id in your dev DB).

```bash
curl -s -X DELETE http://localhost:5000/api/taxonomy/domains/$DID
curl -s http://localhost:5000/api/taxonomy
```
Expected: delete returns `{"success": true}`; the domain and its use-case are gone from the list, and `SELECT * FROM prompt_taxonomy` for that use-case id is empty (cascade worked).

- [ ] **Step 4: Commit**

```bash
git add app.py
git commit -m "feat: add taxonomy domain/use-case CRUD and bulk-tag routes"
```

---

## Task 3: Backend — relationship delete + orphan finder

**Files:**
- Modify: `app.py` (insert after the existing `add_prompt_relationship()` route, before `/api/prompts/<int:pid>/favorite`)

**Interfaces:**
- Produces: `DELETE /api/prompts/<pid>/relationships/<other_id>`, `GET /api/relationships/orphans`.

- [ ] **Step 1: Add the routes**

In `app.py`, find this exact block:

```python
@app.route('/api/prompts/<int:pid>/relationships', methods=['POST'])
def add_prompt_relationship(pid):
    """Link two prompts as related."""
    data = _json_body()
    other_id = data.get('related_id')
    rel_type  = data.get('rel_type', 'related')
    if not other_id or other_id == pid:
        return jsonify({'error': 'Invalid related_id'}), 400
    a, b = (pid, other_id) if pid < other_id else (other_id, pid)
    conn = get_db()
    try:
        conn.execute(
            'INSERT OR IGNORE INTO prompt_relationships (prompt_a, prompt_b, rel_type) VALUES (?,?,?)',
            (a, b, rel_type)
        )
        conn.commit()
    finally:
        conn.close()
    return jsonify({'success': True})


@app.route('/api/prompts/<int:pid>/favorite', methods=['POST'])
```

Replace it with:

```python
@app.route('/api/prompts/<int:pid>/relationships', methods=['POST'])
def add_prompt_relationship(pid):
    """Link two prompts as related."""
    data = _json_body()
    other_id = data.get('related_id')
    rel_type  = data.get('rel_type', 'related')
    if not other_id or other_id == pid:
        return jsonify({'error': 'Invalid related_id'}), 400
    a, b = (pid, other_id) if pid < other_id else (other_id, pid)
    conn = get_db()
    try:
        conn.execute(
            'INSERT OR IGNORE INTO prompt_relationships (prompt_a, prompt_b, rel_type) VALUES (?,?,?)',
            (a, b, rel_type)
        )
        conn.commit()
    finally:
        conn.close()
    return jsonify({'success': True})


@app.route('/api/prompts/<int:pid>/relationships/<int:other_id>', methods=['DELETE'])
def delete_prompt_relationship(pid, other_id):
    a, b = (pid, other_id) if pid < other_id else (other_id, pid)
    conn = get_db()
    try:
        conn.execute('DELETE FROM prompt_relationships WHERE prompt_a=? AND prompt_b=?', (a, b))
        conn.commit()
    finally:
        conn.close()
    return jsonify({'success': True})


@app.route('/api/relationships/orphans', methods=['GET'])
def get_relationship_orphans():
    conn = get_db()
    try:
        rows = conn.execute('''
            SELECT id, title, description FROM prompts
            WHERE id NOT IN (SELECT prompt_a FROM prompt_relationships)
              AND id NOT IN (SELECT prompt_b FROM prompt_relationships)
            ORDER BY title
        ''').fetchall()
        result = [dict(r) for r in rows]
    finally:
        conn.close()
    return jsonify(result)


@app.route('/api/prompts/<int:pid>/favorite', methods=['POST'])
```

Use the Edit tool.

- [ ] **Step 2: Verify syntax**

Run: `python3 -m py_compile app.py`
Expected: no output, exit code 0.

- [ ] **Step 3: Manual verification**

With the dev server running and two real prompt ids `1` and `2` in your dev DB:

```bash
curl -s -X POST http://localhost:5000/api/prompts/1/relationships -H "Content-Type: application/json" -d '{"related_id":2,"rel_type":"related"}'
curl -s http://localhost:5000/api/relationships/orphans
```
Expected: POST returns `{"success": true}`; prompts 1 and 2 are absent from the orphans list (everything else with no relationships is present).

```bash
curl -s -X DELETE http://localhost:5000/api/prompts/1/relationships/2
curl -s http://localhost:5000/api/prompts/1/relationships
```
Expected: DELETE returns `{"success": true}`; the relationships list for prompt 1 no longer includes prompt 2.

- [ ] **Step 4: Commit**

```bash
git add app.py
git commit -m "feat: add relationship delete and orphan-finder routes"
```

---

## Task 4: Backend — version label/notes/baseline update

**Files:**
- Modify: `app.py` (insert after `restore_version()`, before `/api/variable-templates` GET)

**Interfaces:**
- Produces: `PUT /api/prompts/<pid>/versions/<vid>` accepting any of `version_label`, `version_notes`, `is_baseline` in the JSON body.

- [ ] **Step 1: Add the route**

In `app.py`, find this exact block:

```python
@app.route('/api/prompts/<int:pid>/versions/<int:vid>/restore', methods=['POST'])
def restore_version(pid, vid):
    conn = get_db()
    ver  = conn.execute('SELECT * FROM prompt_versions WHERE id=? AND prompt_id=?', (vid, pid)).fetchone()
    if not ver:
        conn.close()
        return jsonify({'error': 'Version not found'}), 404

    # Snapshot current before restoring
    old = conn.execute('SELECT title, content, description FROM prompts WHERE id=?', (pid,)).fetchone()
    if old:
        conn.execute('INSERT INTO prompt_versions (prompt_id, title, content, description) VALUES (?,?,?,?)',
                     (pid, old['title'], old['content'], old['description'] or ''))

    conn.execute('''
        UPDATE prompts SET title=?, content=?, description=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
    ''', (ver['title'], ver['content'], ver['description'] or '', pid))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/api/variable-templates', methods=['GET'])
```

Replace it with:

```python
@app.route('/api/prompts/<int:pid>/versions/<int:vid>/restore', methods=['POST'])
def restore_version(pid, vid):
    conn = get_db()
    ver  = conn.execute('SELECT * FROM prompt_versions WHERE id=? AND prompt_id=?', (vid, pid)).fetchone()
    if not ver:
        conn.close()
        return jsonify({'error': 'Version not found'}), 404

    # Snapshot current before restoring
    old = conn.execute('SELECT title, content, description FROM prompts WHERE id=?', (pid,)).fetchone()
    if old:
        conn.execute('INSERT INTO prompt_versions (prompt_id, title, content, description) VALUES (?,?,?,?)',
                     (pid, old['title'], old['content'], old['description'] or ''))

    conn.execute('''
        UPDATE prompts SET title=?, content=?, description=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
    ''', (ver['title'], ver['content'], ver['description'] or '', pid))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/api/prompts/<int:pid>/versions/<int:vid>', methods=['PUT'])
def update_version_meta(pid, vid):
    data = _json_body()
    conn = get_db()
    try:
        ver = conn.execute('SELECT id FROM prompt_versions WHERE id=? AND prompt_id=?', (vid, pid)).fetchone()
        if not ver:
            return jsonify({'error': 'Version not found'}), 404
        if 'version_label' in data:
            conn.execute('UPDATE prompt_versions SET version_label=? WHERE id=?',
                         (data['version_label'], vid))
        if 'version_notes' in data:
            conn.execute('UPDATE prompt_versions SET version_notes=? WHERE id=?',
                         (data['version_notes'], vid))
        if 'is_baseline' in data:
            if data['is_baseline']:
                conn.execute('UPDATE prompt_versions SET is_baseline=0 WHERE prompt_id=?', (pid,))
            conn.execute('UPDATE prompt_versions SET is_baseline=? WHERE id=?',
                         (1 if data['is_baseline'] else 0, vid))
        conn.commit()
    finally:
        conn.close()
    return jsonify({'success': True})


@app.route('/api/variable-templates', methods=['GET'])
```

Use the Edit tool.

- [ ] **Step 2: Verify syntax**

Run: `python3 -m py_compile app.py`
Expected: no output, exit code 0.

- [ ] **Step 3: Manual verification**

With the dev server running and a real prompt id `1` that has at least one saved version (create one by editing prompt 1 once if needed — saving a prompt writes a version row per existing app behavior):

```bash
curl -s http://localhost:5000/api/prompts/1/versions
```
Note a version `id` (call it `VID`).

```bash
curl -s -X PUT http://localhost:5000/api/prompts/1/versions/$VID -H "Content-Type: application/json" -d '{"version_label":"Baseline v1","is_baseline":true}'
curl -s http://localhost:5000/api/prompts/1/versions
```
Expected: PUT returns `{"success": true}`; the version list shows `version_label: "Baseline v1"` and `is_baseline: 1` on that row (and `0` on any other row for the same prompt).

- [ ] **Step 4: Commit**

```bash
git add app.py
git commit -m "feat: add version label/notes/baseline update route"
```

---

## Task 5: Frontend — Taxonomy Studio (JS + CSS, not yet reachable)

**Files:**
- Modify: `static/app.js` (append new section before the BOOTSTRAP block — via Python script, not Edit)
- Modify: `static/app.css` (append new rules — Edit tool ok)

**Interfaces:**
- Consumes: `api()`, `$`, `$$`, `escapeHtml`, `escapeAttr`, `toast`, `state.prompts` (all pre-existing globals inside the app.js IIFE).
- Produces: `window.openTaxonomyWorkspace()`, `closeTaxonomyWorkspace()`, `initTaxonomyWorkspace()` — not called from anywhere yet (that's Task 8/9). This task is verified by syntax check only; interactive verification happens in Task 9.

- [ ] **Step 1: Write the Python edit script**

Write this to `_scratch_task5.py` in the repo root (use the Write tool):

```python
path = 'static/app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '''    /* ============================================================================
       BOOTSTRAP
       ============================================================================ */
    document.addEventListener('DOMContentLoaded', async () => {'''

new_section = '''    /* ============================================================================
       TAXONOMY STUDIO
       data-view="taxonomy" | openTaxonomyWorkspace() | initTaxonomyWorkspace()
       ============================================================================ */

    let _taxState = { domains: [], selectedType: null, selectedId: null, tagPickerOpen: false, tagPickerQuery: '' };

    async function _taxLoadTree() {
        const list = $('#taxTreeList');
        if (list) list.innerHTML = '<p class="hint">Loading…</p>';
        try {
            _taxState.domains = await api('/taxonomy');
            _taxRenderTree();
        } catch {
            if (list) list.innerHTML = '<p class="hint">Couldn\\'t load taxonomy — <a href="#" id="taxRetryLink">retry</a></p>';
            $('#taxRetryLink')?.addEventListener('click', (e) => { e.preventDefault(); _taxLoadTree(); });
        }
    }

    function _taxRenderTree() {
        const list = $('#taxTreeList');
        if (!list) return;
        if (!_taxState.domains.length) {
            list.innerHTML = '<p class="hint">No domains yet — add one to get started.</p>';
            return;
        }
        list.innerHTML = _taxState.domains.map(d => `
      <div class="tax-domain" data-domain-id="${d.id}">
        <div class="tax-domain-row ${_taxState.selectedType === 'domain' && _taxState.selectedId === d.id ? 'active' : ''}" data-select-domain="${d.id}">
          <span class="material-symbols-outlined tax-domain-icon">folder</span>
          <span class="tax-node-name">${escapeHtml(d.name)}</span>
          <span class="tax-node-count">${d.use_cases.length}</span>
          <button class="folder-mini-btn" data-tax-rename-domain="${d.id}" title="Rename"><span class="material-symbols-outlined">edit</span></button>
          <button class="folder-mini-btn danger" data-tax-delete-domain="${d.id}" title="Delete"><span class="material-symbols-outlined">delete</span></button>
          <button class="folder-mini-btn" data-tax-add-usecase="${d.id}" title="Add use-case"><span class="material-symbols-outlined">add</span></button>
        </div>
        <div class="tax-usecase-list">
          ${d.use_cases.length ? d.use_cases.map(u => `
            <div class="tax-usecase-row ${_taxState.selectedType === 'usecase' && _taxState.selectedId === u.id ? 'active' : ''}" data-select-usecase="${u.id}">
              <span class="material-symbols-outlined tax-usecase-icon">label</span>
              <span class="tax-node-name">${escapeHtml(u.name)}</span>
              <button class="folder-mini-btn" data-tax-rename-usecase="${u.id}" title="Rename"><span class="material-symbols-outlined">edit</span></button>
              <button class="folder-mini-btn danger" data-tax-delete-usecase="${u.id}" title="Delete"><span class="material-symbols-outlined">delete</span></button>
            </div>`).join('') : '<div class="tax-usecase-empty hint">No use-cases yet</div>'}
        </div>
      </div>`).join('');
    }

    async function _taxSelectNode(type, id) {
        _taxState.selectedType = type;
        _taxState.selectedId = id;
        _taxState.tagPickerOpen = false;
        _taxRenderTree();
        await _taxRenderDetail();
    }

    async function _taxRenderDetail() {
        const detail = $('#taxDetail');
        if (!detail) return;
        if (!_taxState.selectedType) {
            detail.innerHTML = '<div class="tax-detail-empty hint">Select a domain or use-case to see details.</div>';
            return;
        }
        if (_taxState.selectedType === 'domain') {
            const d = _taxState.domains.find(x => x.id === _taxState.selectedId);
            if (!d) return;
            detail.innerHTML = `
          <h3 class="tax-detail-title">${escapeHtml(d.name)}</h3>
          <p class="hint">${d.use_cases.length} use-case${d.use_cases.length !== 1 ? 's' : ''} in this domain.</p>`;
            return;
        }
        let uc = null, parentDomain = null;
        for (const d of _taxState.domains) {
            const found = d.use_cases.find(u => u.id === _taxState.selectedId);
            if (found) { uc = found; parentDomain = d; break; }
        }
        if (!uc) return;
        detail.innerHTML = `
      <h3 class="tax-detail-title">${escapeHtml(uc.name)}</h3>
      <p class="hint">In ${escapeHtml(parentDomain.name)}</p>
      <div class="tax-tagged-list" id="taxTaggedList"><p class="hint">Loading tagged prompts…</p></div>
      <button class="btn btn-ghost" id="taxTagMoreBtn"><span class="material-symbols-outlined">add</span> Tag more prompts</button>
      <div id="taxTagPicker" hidden></div>`;
        try {
            const tagged = await api(`/taxonomy/use-cases/${uc.id}/prompts`);
            const listEl = $('#taxTaggedList');
            if (listEl) {
                listEl.innerHTML = tagged.length
                    ? tagged.map(p => `
                    <div class="tax-tagged-row" data-prompt-id="${p.id}">
                      <span class="tax-tagged-title">${escapeHtml(p.title)}</span>
                      <button class="folder-mini-btn danger" data-tax-untag="${p.id}" title="Untag"><span class="material-symbols-outlined">close</span></button>
                    </div>`).join('')
                    : '<p class="hint">No prompts tagged yet.</p>';
            }
        } catch {
            const listEl = $('#taxTaggedList');
            if (listEl) listEl.innerHTML = '<p class="hint">Couldn\\'t load tagged prompts.</p>';
        }
    }

    function _taxRenderTagPicker() {
        const picker = $('#taxTagPicker');
        if (!picker) return;
        const q = _taxState.tagPickerQuery.trim().toLowerCase();
        const matches = state.prompts.filter(p => !q || (p.title || '').toLowerCase().includes(q));
        picker.innerHTML = `
      <input type="text" class="forge-input" id="taxTagPickerSearch" placeholder="Search prompts…" value="${escapeAttr(_taxState.tagPickerQuery)}" />
      <div class="tax-tag-picker-list">
        ${matches.slice(0, 50).map(p => `
          <label class="tax-tag-picker-row">
            <input type="checkbox" value="${p.id}" />
            <span>${escapeHtml(p.title)}</span>
          </label>`).join('')}
      </div>
      <button class="btn btn-accent" id="taxTagPickerApply">Tag selected</button>`;
        $('#taxTagPickerSearch')?.addEventListener('input', (e) => {
            _taxState.tagPickerQuery = e.target.value;
            _taxRenderTagPicker();
        });
        $('#taxTagPickerApply')?.addEventListener('click', async () => {
            const ids = $$('#taxTagPicker input[type="checkbox"]:checked').map(el => parseInt(el.value, 10));
            if (!ids.length) { toast('Pick at least one prompt', 'warning'); return; }
            try {
                await api('/taxonomy/bulk-tag', { method: 'POST', body: { prompt_ids: ids, use_case_id: _taxState.selectedId, action: 'add' } });
                toast(ids.length + ' prompt' + (ids.length !== 1 ? 's' : '') + ' tagged', 'success');
                _taxState.tagPickerOpen = false;
                await _taxRenderDetail();
            } catch {
                toast('Could not tag prompts', 'error');
            }
        });
    }

    async function _taxAddDomain() {
        const name = prompt('Domain name:');
        if (!name || !name.trim()) return;
        try {
            await api('/taxonomy/domains', { method: 'POST', body: { name: name.trim() } });
            await _taxLoadTree();
            toast('Domain added', 'success');
        } catch {
            toast('Could not add domain', 'error');
        }
    }

    async function _taxRenameDomain(id) {
        const d = _taxState.domains.find(x => x.id === id);
        const name = prompt('Rename domain:', d ? d.name : '');
        if (!name || !name.trim()) return;
        try {
            await api(`/taxonomy/domains/${id}`, { method: 'PUT', body: { name: name.trim() } });
            await _taxLoadTree();
        } catch {
            toast('Could not rename domain', 'error');
        }
    }

    async function _taxDeleteDomain(id) {
        const d = _taxState.domains.find(x => x.id === id);
        if (!confirm(`Delete domain "${d ? d.name : ''}" and all its use-cases? This can't be undone.`)) return;
        try {
            await api(`/taxonomy/domains/${id}`, { method: 'DELETE' });
            if (_taxState.selectedType === 'domain' && _taxState.selectedId === id) {
                _taxState.selectedType = null; _taxState.selectedId = null;
            }
            await _taxLoadTree();
            await _taxRenderDetail();
            toast('Domain deleted', 'success');
        } catch {
            toast('Could not delete domain', 'error');
        }
    }

    async function _taxAddUseCase(domainId) {
        const name = prompt('Use-case name:');
        if (!name || !name.trim()) return;
        try {
            await api('/taxonomy/use-cases', { method: 'POST', body: { domain_id: domainId, name: name.trim() } });
            await _taxLoadTree();
            toast('Use-case added', 'success');
        } catch {
            toast('Could not add use-case', 'error');
        }
    }

    async function _taxRenameUseCase(id) {
        let current = '';
        for (const d of _taxState.domains) {
            const u = d.use_cases.find(x => x.id === id);
            if (u) { current = u.name; break; }
        }
        const name = prompt('Rename use-case:', current);
        if (!name || !name.trim()) return;
        try {
            await api(`/taxonomy/use-cases/${id}`, { method: 'PUT', body: { name: name.trim() } });
            await _taxLoadTree();
        } catch {
            toast('Could not rename use-case', 'error');
        }
    }

    async function _taxDeleteUseCase(id) {
        if (!confirm('Delete this use-case and untag all its prompts?')) return;
        try {
            await api(`/taxonomy/use-cases/${id}`, { method: 'DELETE' });
            if (_taxState.selectedType === 'usecase' && _taxState.selectedId === id) {
                _taxState.selectedType = null; _taxState.selectedId = null;
            }
            await _taxLoadTree();
            await _taxRenderDetail();
            toast('Use-case deleted', 'success');
        } catch {
            toast('Could not delete use-case', 'error');
        }
    }

    window.openTaxonomyWorkspace = function() {
        const ws = $('#taxonomyWorkspace');
        if (!ws) return;
        ws.classList.add('open');
        document.body.style.overflow = 'hidden';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'taxonomy'));
        _taxState.selectedType = null;
        _taxState.selectedId = null;
        _taxLoadTree();
        _taxRenderDetail();
    };

    function closeTaxonomyWorkspace() {
        $('#taxonomyWorkspace')?.classList.remove('open');
        document.body.style.overflow = '';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
    }

    function initTaxonomyWorkspace() {
        const ws = $('#taxonomyWorkspace');
        if (!ws) return;
        $('#closeTaxonomyBtn')?.addEventListener('click', closeTaxonomyWorkspace);
        $('#taxAddDomainBtn')?.addEventListener('click', _taxAddDomain);
        $('#taxTreeList')?.addEventListener('click', (e) => {
            const selDomain = e.target.closest('[data-select-domain]');
            const selUsecase = e.target.closest('[data-select-usecase]');
            const renameDomain = e.target.closest('[data-tax-rename-domain]');
            const deleteDomain = e.target.closest('[data-tax-delete-domain]');
            const addUsecase = e.target.closest('[data-tax-add-usecase]');
            const renameUsecase = e.target.closest('[data-tax-rename-usecase]');
            const deleteUsecase = e.target.closest('[data-tax-delete-usecase]');
            if (renameDomain) { _taxRenameDomain(parseInt(renameDomain.dataset.taxRenameDomain, 10)); return; }
            if (deleteDomain) { _taxDeleteDomain(parseInt(deleteDomain.dataset.taxDeleteDomain, 10)); return; }
            if (addUsecase) { _taxAddUseCase(parseInt(addUsecase.dataset.taxAddUsecase, 10)); return; }
            if (renameUsecase) { _taxRenameUseCase(parseInt(renameUsecase.dataset.taxRenameUsecase, 10)); return; }
            if (deleteUsecase) { _taxDeleteUseCase(parseInt(deleteUsecase.dataset.taxDeleteUsecase, 10)); return; }
            if (selDomain) { _taxSelectNode('domain', parseInt(selDomain.dataset.selectDomain, 10)); return; }
            if (selUsecase) { _taxSelectNode('usecase', parseInt(selUsecase.dataset.selectUsecase, 10)); return; }
        });
        $('#taxDetail')?.addEventListener('click', (e) => {
            const tagMore = e.target.closest('#taxTagMoreBtn');
            const untag = e.target.closest('[data-tax-untag]');
            if (tagMore) {
                _taxState.tagPickerOpen = true;
                _taxState.tagPickerQuery = '';
                $('#taxTagPicker').hidden = false;
                _taxRenderTagPicker();
                return;
            }
            if (untag) {
                const pid = parseInt(untag.dataset.taxUntag, 10);
                api('/taxonomy/bulk-tag', { method: 'POST', body: { prompt_ids: [pid], use_case_id: _taxState.selectedId, action: 'remove' } })
                    .then(() => _taxRenderDetail())
                    .catch(() => toast('Could not untag prompt', 'error'));
            }
        });
    }

    /* ============================================================================
       BOOTSTRAP
       ============================================================================ */
    document.addEventListener('DOMContentLoaded', async () => {'''

assert content.count(old) == 1, f'anchor found {content.count(old)} times, expected 1'
content = content.replace(old, new_section, 1)
with open(path, 'w', encoding='utf-8', newline='\\n') as f:
    f.write(content)
print('OK')
```

- [ ] **Step 2: Run it**

```bash
python3 _scratch_task5.py
```
Expected: `OK`

- [ ] **Step 3: Add the CSS**

In `static/app.css`, use the Edit tool to append after the last rule in the file (or any clearly-separate location — this is a brand-new class namespace, no collision risk):

```css
/* -- Taxonomy Studio -- */
.tax-body { display: grid; grid-template-columns: minmax(280px, 34%) 1fr; flex: 1; overflow: hidden; }
.tax-tree { display: flex; flex-direction: column; border-right: 1px solid var(--line); overflow-y: auto; padding: var(--sp-4); }
.tax-tree-header { display: flex; align-items: center; justify-content: space-between; font-size: var(--fs-sm); font-weight: 600; color: var(--ink-2); margin-bottom: var(--sp-3); }
.tax-domain { margin-bottom: var(--sp-2); }
.tax-domain-row, .tax-usecase-row { display: flex; align-items: center; gap: var(--sp-2); padding: var(--sp-2); border-radius: var(--radius-md, 8px); cursor: pointer; }
.tax-domain-row:hover, .tax-usecase-row:hover { background: var(--surface-2); }
.tax-domain-row.active, .tax-usecase-row.active { background: var(--accent-soft); }
.tax-usecase-row { margin-left: var(--sp-5); font-size: var(--fs-sm); }
.tax-node-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tax-node-count { font-size: var(--fs-xs); color: var(--ink-3); }
.tax-usecase-empty { margin-left: var(--sp-5); font-size: var(--fs-xs); color: var(--ink-3); padding: var(--sp-1) 0; }
.tax-detail { padding: var(--sp-5); overflow-y: auto; flex: 1; }
.tax-detail-empty { color: var(--ink-3); }
.tax-detail-title { margin: 0 0 var(--sp-2); font-size: var(--fs-lg); }
.tax-tagged-list { margin: var(--sp-4) 0; display: flex; flex-direction: column; gap: var(--sp-1); }
.tax-tagged-row { display: flex; align-items: center; justify-content: space-between; padding: var(--sp-2) var(--sp-3); background: var(--surface-2); border-radius: var(--radius-md, 8px); }
.tax-tag-picker-list { max-height: 260px; overflow-y: auto; margin: var(--sp-3) 0; display: flex; flex-direction: column; gap: var(--sp-1); }
.tax-tag-picker-row { display: flex; align-items: center; gap: var(--sp-2); font-size: var(--fs-sm); padding: var(--sp-1) 0; }
```

- [ ] **Step 4: Verify syntax and clean up**

```bash
node --check static/app.js
rm _scratch_task5.py
python3 update_hash.py
```
Expected: `node --check` prints nothing and exits 0. `update_hash.py` reports a new hash written.

- [ ] **Step 5: Commit**

```bash
git add static/app.js static/app.css
git commit -m "feat: add Taxonomy Studio JS and CSS (not yet reachable)"
```

---

## Task 6: Frontend — Relationship Graph (JS + CSS, not yet reachable)

**Files:**
- Modify: `static/app.js` (append new section before BOOTSTRAP — via Python script)
- Modify: `static/app.css` (append new rules — Edit tool ok)

**Interfaces:**
- Consumes: `api()`, `$`, `$$`, `escapeHtml`, `toast`, `state.prompts`, `_wsFillPromptPicker()` (existing helper).
- Produces: `window.openRelationshipWorkspace()`, `closeRelationshipWorkspace()`, `initRelationshipWorkspace()`.

- [ ] **Step 1: Write the Python edit script**

Write this to `_scratch_task6.py` in the repo root:

```python
path = 'static/app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '''    /* ============================================================================
       BOOTSTRAP
       ============================================================================ */
    document.addEventListener('DOMContentLoaded', async () => {'''

new_section = '''    /* ============================================================================
       RELATIONSHIP GRAPH
       data-view="relationship" | openRelationshipWorkspace() | initRelationshipWorkspace()
       ============================================================================ */

    let _relState = { centerId: null, centerPrompt: null, related: [], addPanelOpen: false };

    function _relTruncate(text, n) {
        if (!text) return '';
        return text.length > n ? text.slice(0, n - 1) + '…' : text;
    }

    async function _relLoadCenter(promptId) {
        _relState.centerId = promptId;
        _relState.addPanelOpen = false;
        $('#relPickerPanel').hidden = true;
        $('#relOrphansPanel').hidden = true;
        $('#relGraphPanel').hidden = false;
        const svg = $('#relSvg');
        if (svg) svg.innerHTML = '<text x="320" y="240" text-anchor="middle" class="rel-svg-hint">Loading…</text>';
        try {
            _relState.centerPrompt = state.prompts.find(p => p.id === promptId) || (await api(`/prompts/${promptId}`));
            _relState.related = await api(`/prompts/${promptId}/relationships`);
            _relRenderGraph();
        } catch {
            if (svg) svg.innerHTML = '<text x="320" y="240" text-anchor="middle" class="rel-svg-hint">Couldn\\'t load relationships</text>';
        }
    }

    function _relRenderGraph() {
        const svg = $('#relSvg');
        if (!svg) return;
        const cx = 320, cy = 240, r = 170;
        const center = _relState.centerPrompt;
        const related = _relState.related;
        let parts = [];
        related.forEach((p, i) => {
            const angle = (2 * Math.PI * i / Math.max(1, related.length)) - Math.PI / 2;
            const nx = cx + r * Math.cos(angle);
            const ny = cy + r * Math.sin(angle);
            parts.push(`<line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" class="rel-edge" />`);
            const midx = (cx + nx) / 2, midy = (cy + ny) / 2;
            parts.push(`<text x="${midx.toFixed(1)}" y="${midy.toFixed(1)}" class="rel-edge-label" text-anchor="middle">${escapeHtml(p.rel_type || 'related')}</text>`);
        });
        parts.push(`<g class="rel-node rel-node-center">
        <circle cx="${cx}" cy="${cy}" r="46" />
        <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle">${escapeHtml(_relTruncate(center ? center.title : '', 16))}</text>
      </g>`);
        related.forEach((p, i) => {
            const angle = (2 * Math.PI * i / Math.max(1, related.length)) - Math.PI / 2;
            const nx = cx + r * Math.cos(angle);
            const ny = cy + r * Math.sin(angle);
            parts.push(`<g class="rel-node" data-rel-node="${p.id}" tabindex="0">
            <circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="34" />
            <text x="${nx.toFixed(1)}" y="${ny.toFixed(1)}" text-anchor="middle" dominant-baseline="middle">${escapeHtml(_relTruncate(p.title, 14))}</text>
            <title>${escapeHtml(p.title)}</title>
          </g>
          <g class="rel-node-remove" data-rel-remove="${p.id}">
            <circle cx="${(nx + 24).toFixed(1)}" cy="${(ny - 24).toFixed(1)}" r="10" />
            <text x="${(nx + 24).toFixed(1)}" y="${(ny - 24).toFixed(1)}" text-anchor="middle" dominant-baseline="middle">×</text>
          </g>`);
        });
        svg.innerHTML = parts.join('');
        if (!related.length) {
            svg.innerHTML += `<text x="${cx}" y="${cy + 90}" text-anchor="middle" class="rel-svg-hint">No relationships yet — add one above.</text>`;
        }
    }

    function _relOpenAddPanel() {
        _relState.addPanelOpen = true;
        const panel = $('#relAddPanel');
        if (!panel) return;
        panel.hidden = false;
        panel.innerHTML = `
      <select id="relAddPicker" class="forge-input qf-picker"><option value="">Load from library…</option></select>
      <select id="relAddType" class="forge-input">
        <option value="related">Related</option>
        <option value="variant">Variant</option>
        <option value="depends_on">Depends on</option>
        <option value="inspired_by">Inspired by</option>
      </select>
      <button class="btn btn-accent" id="relAddConfirmBtn">Link</button>
      <button class="btn btn-ghost" id="relAddCancelBtn">Cancel</button>`;
        _wsFillPromptPicker('#relAddPicker');
        $('#relAddConfirmBtn')?.addEventListener('click', async () => {
            const otherId = parseInt($('#relAddPicker').value, 10);
            if (!otherId) { toast('Pick a prompt first', 'warning'); return; }
            if (otherId === _relState.centerId) { toast('Pick a different prompt', 'warning'); return; }
            try {
                await api(`/prompts/${_relState.centerId}/relationships`, {
                    method: 'POST',
                    body: { related_id: otherId, rel_type: $('#relAddType').value }
                });
                panel.hidden = true;
                _relState.addPanelOpen = false;
                await _relLoadCenter(_relState.centerId);
                toast('Relationship added', 'success');
            } catch {
                toast('Could not add relationship', 'error');
            }
        });
        $('#relAddCancelBtn')?.addEventListener('click', () => {
            panel.hidden = true;
            _relState.addPanelOpen = false;
        });
    }

    async function _relDeleteRelationship(otherId) {
        if (!confirm('Remove this relationship?')) return;
        try {
            await api(`/prompts/${_relState.centerId}/relationships/${otherId}`, { method: 'DELETE' });
            await _relLoadCenter(_relState.centerId);
            toast('Relationship removed', 'success');
        } catch {
            toast('Could not remove relationship', 'error');
        }
    }

    async function _relShowOrphans() {
        $('#relPickerPanel').hidden = true;
        $('#relGraphPanel').hidden = true;
        $('#relOrphansPanel').hidden = false;
        const list = $('#relOrphansList');
        if (list) list.innerHTML = '<p class="hint">Loading…</p>';
        try {
            const orphans = await api('/relationships/orphans');
            if (list) {
                list.innerHTML = orphans.length
                    ? orphans.map(p => `<button class="rel-orphan-row" data-rel-orphan="${p.id}">${escapeHtml(p.title)}</button>`).join('')
                    : '<p class="hint">No orphans — every prompt has at least one relationship.</p>';
            }
        } catch {
            if (list) list.innerHTML = '<p class="hint">Couldn\\'t load orphans.</p>';
        }
    }

    window.openRelationshipWorkspace = function() {
        const ws = $('#relationshipWorkspace');
        if (!ws) return;
        ws.classList.add('open');
        document.body.style.overflow = 'hidden';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'relationship'));
        _relState = { centerId: null, centerPrompt: null, related: [], addPanelOpen: false };
        $('#relPickerPanel').hidden = false;
        $('#relGraphPanel').hidden = true;
        $('#relOrphansPanel').hidden = true;
        _wsFillPromptPicker('#relCenterPicker');
    };

    function closeRelationshipWorkspace() {
        $('#relationshipWorkspace')?.classList.remove('open');
        document.body.style.overflow = '';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
    }

    function initRelationshipWorkspace() {
        const ws = $('#relationshipWorkspace');
        if (!ws) return;
        $('#closeRelationshipBtn')?.addEventListener('click', closeRelationshipWorkspace);
        $('#relCenterPicker')?.addEventListener('change', (e) => {
            const id = parseInt(e.target.value, 10);
            if (id) _relLoadCenter(id);
        });
        $('#relAddBtn')?.addEventListener('click', () => {
            if (!_relState.centerId) { toast('Pick a prompt to center on first', 'warning'); return; }
            _relOpenAddPanel();
        });
        $('#relOrphansBtn')?.addEventListener('click', _relShowOrphans);
        $('#relOrphansCloseBtn')?.addEventListener('click', () => {
            $('#relOrphansPanel').hidden = true;
            if (_relState.centerId) { $('#relGraphPanel').hidden = false; }
            else { $('#relPickerPanel').hidden = false; }
        });
        $('#relOrphansList')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-rel-orphan]');
            if (btn) _relLoadCenter(parseInt(btn.dataset.relOrphan, 10));
        });
        $('#relSvg')?.addEventListener('click', (e) => {
            const remove = e.target.closest('[data-rel-remove]');
            if (remove) { _relDeleteRelationship(parseInt(remove.dataset.relRemove, 10)); return; }
            const node = e.target.closest('[data-rel-node]');
            if (node) _relLoadCenter(parseInt(node.dataset.relNode, 10));
        });
    }

    /* ============================================================================
       BOOTSTRAP
       ============================================================================ */
    document.addEventListener('DOMContentLoaded', async () => {'''

assert content.count(old) == 1, f'anchor found {content.count(old)} times, expected 1'
content = content.replace(old, new_section, 1)
with open(path, 'w', encoding='utf-8', newline='\\n') as f:
    f.write(content)
print('OK')
```

- [ ] **Step 2: Run it**

```bash
python3 _scratch_task6.py
```
Expected: `OK`

- [ ] **Step 3: Add the CSS**

In `static/app.css`, use the Edit tool to append:

```css
/* -- Relationship Graph -- */
.rel-body { display: flex; flex-direction: column; flex: 1; overflow: hidden; padding: var(--sp-5); position: relative; }
.rel-picker-panel { display: flex; flex-direction: column; gap: var(--sp-3); max-width: 420px; margin: var(--sp-7) auto; text-align: center; }
.rel-graph-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
#relSvg { width: 100%; flex: 1; }
.rel-node circle { fill: var(--surface-2); stroke: var(--line); stroke-width: 1.5; cursor: pointer; }
.rel-node:hover circle { stroke: var(--accent); }
.rel-node text { fill: var(--ink); font-size: 11px; pointer-events: none; }
.rel-node-center circle { fill: var(--accent-soft); stroke: var(--accent); stroke-width: 2; cursor: default; }
.rel-node-center text { font-weight: 600; }
.rel-edge { stroke: var(--line); stroke-width: 1.5; }
.rel-edge-label { fill: var(--ink-3); font-size: 10px; }
.rel-node-remove circle { fill: var(--danger); opacity: 0; transition: opacity .12s; cursor: pointer; }
.rel-node-remove text { fill: #fff; font-size: 12px; pointer-events: none; opacity: 0; }
.rel-node-remove:hover circle, .rel-node-remove:hover text { opacity: 1; }
.rel-svg-hint { fill: var(--ink-3); font-size: 13px; }
.rel-add-panel { display: flex; gap: var(--sp-2); align-items: center; padding: var(--sp-3); background: var(--surface-2); border-radius: var(--radius-md, 8px); margin-bottom: var(--sp-3); flex-wrap: wrap; }
.rel-orphans-panel { flex: 1; overflow-y: auto; }
.rel-orphans-header { display: flex; align-items: center; justify-content: space-between; font-weight: 600; margin-bottom: var(--sp-3); }
.rel-orphan-row { display: block; width: 100%; text-align: left; padding: var(--sp-2) var(--sp-3); border: none; background: var(--surface-2); border-radius: var(--radius-md, 8px); margin-bottom: var(--sp-1); cursor: pointer; color: var(--ink); }
.rel-orphan-row:hover { background: var(--accent-soft); }
```

- [ ] **Step 4: Verify syntax and clean up**

```bash
node --check static/app.js
rm _scratch_task6.py
python3 update_hash.py
```
Expected: `node --check` prints nothing and exits 0.

- [ ] **Step 5: Commit**

```bash
git add static/app.js static/app.css
git commit -m "feat: add Relationship Graph JS and CSS (not yet reachable)"
```

---

## Task 7: Frontend — Version Timeline (JS + CSS, not yet reachable)

**Files:**
- Modify: `static/app.js` (append new section before BOOTSTRAP — via Python script)
- Modify: `static/app.css` (append new rules — Edit tool ok)

**Interfaces:**
- Consumes: `api()`, `$`, `$$`, `escapeHtml`, `escapeAttr`, `toast`, `relativeTime()`, `_diffTokens()` (all pre-existing; `_diffTokens` is defined in the Diff Lens section earlier in the same IIFE).
- Produces: `window.openVersionWorkspace()`, `closeVersionWorkspace()`, `initVersionWorkspace()`.

- [ ] **Step 1: Write the Python edit script**

Write this to `_scratch_task7.py` in the repo root:

```python
path = 'static/app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '''    /* ============================================================================
       BOOTSTRAP
       ============================================================================ */
    document.addEventListener('DOMContentLoaded', async () => {'''

new_section = '''    /* ============================================================================
       VERSION TIMELINE
       data-view="version" | openVersionWorkspace() | initVersionWorkspace()
       ============================================================================ */

    let _verState = { promptId: null, versions: [], selected: [] };

    async function _verLoad(promptId) {
        _verState.promptId = promptId;
        _verState.selected = [];
        $('#verPickerPanel').hidden = true;
        $('#verTimelinePanel').hidden = false;
        const list = $('#verTimelineList');
        if (list) list.innerHTML = '<p class="hint">Loading…</p>';
        try {
            _verState.versions = await api(`/prompts/${promptId}/versions`);
            _verRenderTimeline();
            _verRenderDiff();
        } catch {
            if (list) list.innerHTML = '<p class="hint">Couldn\\'t load version history — <a href="#" id="verRetryLink">retry</a></p>';
            $('#verRetryLink')?.addEventListener('click', (e) => { e.preventDefault(); _verLoad(promptId); });
        }
    }

    function _verRenderTimeline() {
        const list = $('#verTimelineList');
        if (!list) return;
        if (!_verState.versions.length) {
            list.innerHTML = '<p class="hint">No saved versions yet for this prompt.</p>';
            return;
        }
        list.innerHTML = _verState.versions.map(v => `
      <div class="ver-row ${_verState.selected.includes(v.id) ? 'selected' : ''}" data-version-id="${v.id}">
        <input type="checkbox" data-ver-select="${v.id}" ${_verState.selected.includes(v.id) ? 'checked' : ''} />
        <button class="ver-baseline-btn ${v.is_baseline ? 'active' : ''}" data-ver-baseline="${v.id}" title="${v.is_baseline ? 'Baseline version' : 'Mark as baseline'}">
          <span class="material-symbols-outlined">${v.is_baseline ? 'star' : 'star_outline'}</span>
        </button>
        <div class="ver-row-main">
          <input type="text" class="ver-label-input" data-ver-label="${v.id}" value="${escapeAttr(v.version_label || '')}" placeholder="Label this version…" />
          <span class="ver-row-date">${relativeTime(v.saved_at)}</span>
        </div>
        <button class="btn btn-ghost btn-sm" data-ver-restore="${v.id}">Restore</button>
      </div>`).join('');
    }

    function _verRenderDiff() {
        const panel = $('#verDiffPanel');
        if (!panel) return;
        if (_verState.selected.length !== 2) {
            panel.innerHTML = '<span class="hint">Select two versions to compare.</span>';
            return;
        }
        const [idA, idB] = _verState.selected;
        const a = _verState.versions.find(v => v.id === idA);
        const b = _verState.versions.find(v => v.id === idB);
        if (!a || !b) return;
        const ops = _diffTokens(a.content, b.content);
        if (!ops) {
            panel.innerHTML = '<span class="hint">Texts too large for word-level diff.</span>';
            return;
        }
        let html = '';
        ops.forEach(o => {
            const esc = escapeHtml(o.text);
            if (o.op === 'eq') html += esc;
            else if (o.op === 'del') html += '<del class="dif-del">' + esc + '</del>';
            else html += '<ins class="dif-ins">' + esc + '</ins>';
        });
        panel.innerHTML = `<div class="ver-diff-header">${escapeHtml(a.version_label || relativeTime(a.saved_at))} → ${escapeHtml(b.version_label || relativeTime(b.saved_at))}</div><div class="ver-diff-text">${html}</div>`;
    }

    function _verToggleSelect(vid) {
        const idx = _verState.selected.indexOf(vid);
        if (idx >= 0) {
            _verState.selected.splice(idx, 1);
        } else {
            if (_verState.selected.length >= 2) _verState.selected.shift();
            _verState.selected.push(vid);
        }
        _verRenderTimeline();
        _verRenderDiff();
    }

    async function _verSaveLabel(vid, label) {
        try {
            await api(`/prompts/${_verState.promptId}/versions/${vid}`, { method: 'PUT', body: { version_label: label } });
            const v = _verState.versions.find(x => x.id === vid);
            if (v) v.version_label = label;
        } catch {
            toast('Could not save label', 'error');
        }
    }

    async function _verToggleBaseline(vid) {
        const v = _verState.versions.find(x => x.id === vid);
        if (!v) return;
        try {
            await api(`/prompts/${_verState.promptId}/versions/${vid}`, { method: 'PUT', body: { is_baseline: !v.is_baseline } });
            await _verLoad(_verState.promptId);
        } catch {
            toast('Could not update baseline', 'error');
        }
    }

    async function _verRestore(vid) {
        const v = _verState.versions.find(x => x.id === vid);
        if (!confirm(`Restore "${v ? (v.version_label || relativeTime(v.saved_at)) : 'this version'}"? The current content will be saved as a new version first.`)) return;
        try {
            await api(`/prompts/${_verState.promptId}/versions/${vid}/restore`, { method: 'POST' });
            toast('Version restored', 'success');
            await _verLoad(_verState.promptId);
        } catch {
            toast('Could not restore version', 'error');
        }
    }

    window.openVersionWorkspace = function() {
        const ws = $('#versionWorkspace');
        if (!ws) return;
        ws.classList.add('open');
        document.body.style.overflow = 'hidden';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'version'));
        _verState = { promptId: null, versions: [], selected: [] };
        $('#verPickerPanel').hidden = false;
        $('#verTimelinePanel').hidden = true;
        _wsFillPromptPicker('#verPicker');
    };

    function closeVersionWorkspace() {
        $('#versionWorkspace')?.classList.remove('open');
        document.body.style.overflow = '';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
    }

    function initVersionWorkspace() {
        const ws = $('#versionWorkspace');
        if (!ws) return;
        $('#closeVersionBtn')?.addEventListener('click', closeVersionWorkspace);
        $('#verPicker')?.addEventListener('change', (e) => {
            const id = parseInt(e.target.value, 10);
            if (id) _verLoad(id);
        });
        $('#verTimelineList')?.addEventListener('click', (e) => {
            const baseline = e.target.closest('[data-ver-baseline]');
            const restore = e.target.closest('[data-ver-restore]');
            const select = e.target.closest('[data-ver-select]');
            if (baseline) { _verToggleBaseline(parseInt(baseline.dataset.verBaseline, 10)); return; }
            if (restore) { _verRestore(parseInt(restore.dataset.verRestore, 10)); return; }
            if (select) { _verToggleSelect(parseInt(select.dataset.verSelect, 10)); return; }
        });
        $('#verTimelineList')?.addEventListener('change', (e) => {
            const labelInput = e.target.closest('[data-ver-label]');
            if (labelInput) _verSaveLabel(parseInt(labelInput.dataset.verLabel, 10), labelInput.value.trim());
        });
    }

    /* ============================================================================
       BOOTSTRAP
       ============================================================================ */
    document.addEventListener('DOMContentLoaded', async () => {'''

assert content.count(old) == 1, f'anchor found {content.count(old)} times, expected 1'
content = content.replace(old, new_section, 1)
with open(path, 'w', encoding='utf-8', newline='\\n') as f:
    f.write(content)
print('OK')
```

- [ ] **Step 2: Run it**

```bash
python3 _scratch_task7.py
```
Expected: `OK`

- [ ] **Step 3: Add the CSS**

In `static/app.css`, use the Edit tool to append:

```css
/* -- Version Timeline -- */
.ver-body { display: flex; flex-direction: column; flex: 1; overflow: hidden; padding: var(--sp-5); }
.ver-picker-panel { display: flex; flex-direction: column; gap: var(--sp-3); max-width: 420px; margin: var(--sp-7) auto; text-align: center; }
.ver-timeline-panel { display: grid; grid-template-columns: minmax(320px, 42%) 1fr; gap: var(--sp-5); flex: 1; overflow: hidden; }
.ver-timeline-list { overflow-y: auto; display: flex; flex-direction: column; gap: var(--sp-2); padding-right: var(--sp-2); }
.ver-row { display: flex; align-items: center; gap: var(--sp-2); padding: var(--sp-2) var(--sp-3); border: 1px solid var(--line); border-radius: var(--radius-md, 8px); background: var(--surface); }
.ver-row.selected { border-color: var(--accent); background: var(--accent-soft); }
.ver-row .btn-sm { padding: 4px 10px; font-size: var(--fs-xs); }
.ver-baseline-btn { background: none; border: none; cursor: pointer; color: var(--ink-3); padding: 0; display: flex; }
.ver-baseline-btn.active { color: var(--gold); }
.ver-row-main { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ver-label-input { border: none; background: transparent; font-size: var(--fs-sm); color: var(--ink); padding: 2px 0; }
.ver-label-input:focus { outline: 1px solid var(--accent); border-radius: 4px; }
.ver-row-date { font-size: var(--fs-xs); color: var(--ink-3); }
.ver-diff-panel { overflow-y: auto; padding: var(--sp-4); background: var(--surface-2); border-radius: var(--radius-md, 8px); }
.ver-diff-header { font-size: var(--fs-xs); color: var(--ink-3); margin-bottom: var(--sp-3); font-weight: 600; }
.ver-diff-text { font-size: var(--fs-sm); line-height: 1.6; white-space: pre-wrap; }
```

- [ ] **Step 4: Verify syntax and clean up**

```bash
node --check static/app.js
rm _scratch_task7.py
python3 update_hash.py
```
Expected: `node --check` prints nothing and exits 0.

- [ ] **Step 5: Commit**

```bash
git add static/app.js static/app.css
git commit -m "feat: add Version Timeline JS and CSS (not yet reachable)"
```

---

## Task 8: Wire the three workspaces into shared arrays

**Files:**
- Modify: `static/app.js` (BOOTSTRAP init calls, `_escapeToLibrary()` array, `getWorkspaceCommands()` table — all via Python script)
- Modify: `static/app.css` (extend base overlay selector — Edit tool ok)

**Interfaces:**
- Consumes: `openTaxonomyWorkspace`/`initTaxonomyWorkspace` etc. from Tasks 5–7.
- Produces: the three workspaces become launchable once HTML lands in Task 9 — command palette, `Escape` key, and BOOTSTRAP wiring are all live after this task.

- [ ] **Step 1: Write the Python edit script**

Write this to `_scratch_task8.py` in the repo root:

```python
path = 'static/app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. BOOTSTRAP init calls
old1 = '''        initBoardWorkspace(); // prompt board workspace
        initModalSidePanels(); // prompt modal side panels'''
new1 = '''        initBoardWorkspace(); // prompt board workspace
        initTaxonomyWorkspace(); // taxonomy studio workspace
        initRelationshipWorkspace(); // relationship graph workspace
        initVersionWorkspace(); // version timeline workspace
        initModalSidePanels(); // prompt modal side panels'''
assert content.count(old1) == 1, f'anchor 1 found {content.count(old1)} times, expected 1'
content = content.replace(old1, new1, 1)

# 2. _escapeToLibrary() array
old2 = '''        ['#forgeWorkspace', '#labWorkspace', '#rolesWorkspace', '#playgroundWorkspace',
            '#chainWorkspace', '#metaWorkspace', '#contextBankWorkspace', '#componentsWorkspace',
            '#optimizerWorkspace', '#genWorkspace', '#dashboardWorkspace', '#workspacesLauncher', '#fillWorkspace', '#auditWorkspace', '#diffWorkspace',
            '#costWorkspace', '#pulseWorkspace', '#xrayWorkspace', '#spliceWorkspace',
            '#batchWorkspace', '#boardWorkspace',
        ].forEach(sel => {'''
new2 = '''        ['#forgeWorkspace', '#labWorkspace', '#rolesWorkspace', '#playgroundWorkspace',
            '#chainWorkspace', '#metaWorkspace', '#contextBankWorkspace', '#componentsWorkspace',
            '#optimizerWorkspace', '#genWorkspace', '#dashboardWorkspace', '#workspacesLauncher', '#fillWorkspace', '#auditWorkspace', '#diffWorkspace',
            '#costWorkspace', '#pulseWorkspace', '#xrayWorkspace', '#spliceWorkspace',
            '#batchWorkspace', '#boardWorkspace', '#taxonomyWorkspace', '#relationshipWorkspace', '#versionWorkspace',
        ].forEach(sel => {'''
assert content.count(old2) == 1, f'anchor 2 found {content.count(old2)} times, expected 1'
content = content.replace(old2, new2, 1)

# 3. getWorkspaceCommands() table
old3 = '''            ['Playground', 'science', 'openPlaygroundWorkspace', 'playground sessions test freeform'],
        ];'''
new3 = '''            ['Playground', 'science', 'openPlaygroundWorkspace', 'playground sessions test freeform'],
            ['Taxonomy Studio', 'sell', 'openTaxonomyWorkspace', 'taxonomy domain use case organise tag'],
            ['Relationship Graph', 'device_hub', 'openRelationshipWorkspace', 'relationships graph links connections orphans'],
            ['Version Timeline', 'history', 'openVersionWorkspace', 'version history restore baseline diff'],
        ];'''
assert content.count(old3) == 1, f'anchor 3 found {content.count(old3)} times, expected 1'
content = content.replace(old3, new3, 1)

with open(path, 'w', encoding='utf-8', newline='\\n') as f:
    f.write(content)
print('OK')
```

- [ ] **Step 2: Run it**

```bash
python3 _scratch_task8.py
```
Expected: `OK`

- [ ] **Step 3: Extend the base overlay CSS**

In `static/app.css`, find this exact block (line ~8121):

```css
#fillWorkspace, #auditWorkspace, #diffWorkspace, #costWorkspace,
#pulseWorkspace, #xrayWorkspace, #spliceWorkspace, #batchWorkspace, #boardWorkspace {
  display: none;
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 100);
  background: var(--bg);
  flex-direction: column;
}
#fillWorkspace.open, #auditWorkspace.open, #diffWorkspace.open, #costWorkspace.open,
#pulseWorkspace.open, #xrayWorkspace.open, #spliceWorkspace.open,
#batchWorkspace.open, #boardWorkspace.open { display: flex; }
```

Replace it with (using the Edit tool):

```css
#fillWorkspace, #auditWorkspace, #diffWorkspace, #costWorkspace,
#pulseWorkspace, #xrayWorkspace, #spliceWorkspace, #batchWorkspace, #boardWorkspace,
#taxonomyWorkspace, #relationshipWorkspace, #versionWorkspace {
  display: none;
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 100);
  background: var(--bg);
  flex-direction: column;
}
#fillWorkspace.open, #auditWorkspace.open, #diffWorkspace.open, #costWorkspace.open,
#pulseWorkspace.open, #xrayWorkspace.open, #spliceWorkspace.open,
#batchWorkspace.open, #boardWorkspace.open, #taxonomyWorkspace.open,
#relationshipWorkspace.open, #versionWorkspace.open { display: flex; }
```

- [ ] **Step 4: Verify syntax and clean up**

```bash
node --check static/app.js
rm _scratch_task8.py
python3 update_hash.py
```
Expected: `node --check` prints nothing and exits 0.

- [ ] **Step 5: Commit**

```bash
git add static/app.js static/app.css
git commit -m "feat: wire Taxonomy Studio, Relationship Graph, Version Timeline into shared bootstrap/palette/escape arrays"
```

---

## Task 9: Add HTML + full interactive verification

**Files:**
- Modify: `static/index.html` (new launcher group + 3 workspace overlay divs — via Python script)

**Interfaces:**
- Consumes: everything from Tasks 1–8. This is the task where all three workspaces become clickable end-to-end.

- [ ] **Step 1: Write the Python edit script**

Write this to `_scratch_task9.py` in the repo root:

```python
path = 'static/index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. New "Organize" launcher group, inserted after the "Run" group closes
# NOTE: the plan's original anchor assumed a "Prompt Board" launcher card existed
# in the committed file. It does not (that card only ever existed in the
# session's uncommitted working tree, alongside ~4600 unrelated dirty lines
# that were parked in .superpowers/sdd/_wip_appjs.patch / _wip_appcss.patch /
# _wip_indexhtml.patch before Task 5 began). The true committed "Run" group's
# last card is Context Bank. Anchor on that instead.
old1 = '''      <button class="launcher-card" data-open="openContextBankWorkspace" data-premium="true">
        <span class="material-symbols-outlined launcher-card-icon">database</span>
        <span class="launcher-card-title">Context Bank</span>
        <span class="launcher-card-desc">Reusable context blocks to drop into any prompt</span>
        <span class="launcher-card-pro">PRO</span>
      </button>
        </div>
      </div>
      <p class="launcher-empty" id="launcherEmpty" hidden>No tools match your search</p>'''
new1 = '''      <button class="launcher-card" data-open="openContextBankWorkspace" data-premium="true">
        <span class="material-symbols-outlined launcher-card-icon">database</span>
        <span class="launcher-card-title">Context Bank</span>
        <span class="launcher-card-desc">Reusable context blocks to drop into any prompt</span>
        <span class="launcher-card-pro">PRO</span>
      </button>
        </div>
      </div>
      <div class="launcher-group" data-group="organize">
        <div class="launcher-group-label">
          <span class="material-symbols-outlined">sell</span>
          <span>Organize</span>
          <span class="launcher-group-hint">Structure and connect your library</span>
        </div>
        <div class="launcher-grid">
      <button class="launcher-card" data-open="openTaxonomyWorkspace" data-premium="true">
        <span class="material-symbols-outlined launcher-card-icon">sell</span>
        <span class="launcher-card-title">Taxonomy Studio</span>
        <span class="launcher-card-desc">Organise prompts by domain and use-case</span>
        <span class="launcher-card-pro">PRO</span>
      </button>
      <button class="launcher-card" data-open="openRelationshipWorkspace" data-premium="true">
        <span class="material-symbols-outlined launcher-card-icon">device_hub</span>
        <span class="launcher-card-title">Relationship Graph</span>
        <span class="launcher-card-desc">See how your prompts connect to each other</span>
        <span class="launcher-card-pro">PRO</span>
      </button>
      <button class="launcher-card" data-open="openVersionWorkspace" data-premium="true">
        <span class="material-symbols-outlined launcher-card-icon">history</span>
        <span class="launcher-card-title">Version Timeline</span>
        <span class="launcher-card-desc">Browse, diff and restore a prompt's saved versions</span>
        <span class="launcher-card-pro">PRO</span>
      </button>
        </div>
      </div>
      <p class="launcher-empty" id="launcherEmpty" hidden>No tools match your search</p>'''
assert content.count(old1) == 1, f'anchor 1 found {content.count(old1)} times, expected 1'
content = content.replace(old1, new1, 1)

# 2. Three workspace overlay divs, inserted right before #promptViewer
old2 = '''  <div id="promptViewer" aria-modal="true" aria-label="Prompt viewer" role="dialog">'''
new2 = '''<div id="taxonomyWorkspace" role="dialog" aria-modal="true" aria-label="Taxonomy Studio">
  <div class="ws-header">
    <div class="ws-header-left">
      <span class="material-symbols-outlined ws-header-icon">sell</span>
      <div>
        <h2 class="ws-title">Taxonomy Studio</h2>
        <p class="ws-subtitle">Organise your library by domain and use-case, then tag prompts into them.</p>
      </div>
    </div>
    <div class="ws-header-actions">
      <button class="icon-btn" id="closeTaxonomyBtn" aria-label="Close Taxonomy Studio"><span class="material-symbols-outlined">close</span></button>
    </div>
  </div>
  <div class="ws-body tax-body">
    <div class="tax-tree" id="taxTree">
      <div class="tax-tree-header">
        <span>Domains</span>
        <button class="icon-btn" id="taxAddDomainBtn" title="Add domain"><span class="material-symbols-outlined">add</span></button>
      </div>
      <div id="taxTreeList"></div>
    </div>
    <div class="tax-detail" id="taxDetail">
      <div class="tax-detail-empty hint">Select a domain or use-case to see details.</div>
    </div>
  </div>
</div>

<div id="relationshipWorkspace" role="dialog" aria-modal="true" aria-label="Relationship Graph">
  <div class="ws-header">
    <div class="ws-header-left">
      <span class="material-symbols-outlined ws-header-icon">device_hub</span>
      <div>
        <h2 class="ws-title">Relationship Graph</h2>
        <p class="ws-subtitle">See how your prompts connect. Click a node to explore from there.</p>
      </div>
    </div>
    <div class="ws-header-actions">
      <button class="btn btn-ghost" id="relOrphansBtn"><span class="material-symbols-outlined">link_off</span> Orphans</button>
      <button class="btn btn-accent" id="relAddBtn"><span class="material-symbols-outlined">add_link</span> Add relationship</button>
      <button class="icon-btn" id="closeRelationshipBtn" aria-label="Close Relationship Graph"><span class="material-symbols-outlined">close</span></button>
    </div>
  </div>
  <div class="ws-body rel-body">
    <div class="rel-picker-panel" id="relPickerPanel">
      <p class="hint">Pick a prompt to center the graph on it.</p>
      <select id="relCenterPicker" class="forge-input qf-picker"><option value="">Load from library…</option></select>
    </div>
    <div class="rel-graph-panel" id="relGraphPanel" hidden>
      <div class="rel-add-panel" id="relAddPanel" hidden></div>
      <svg id="relSvg" viewBox="0 0 640 480" preserveAspectRatio="xMidYMid meet"></svg>
    </div>
    <div class="rel-orphans-panel" id="relOrphansPanel" hidden>
      <div class="rel-orphans-header">
        <span>Prompts with no relationships</span>
        <button class="icon-btn" id="relOrphansCloseBtn"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div id="relOrphansList"></div>
    </div>
  </div>
</div>

<div id="versionWorkspace" role="dialog" aria-modal="true" aria-label="Version Timeline">
  <div class="ws-header">
    <div class="ws-header-left">
      <span class="material-symbols-outlined ws-header-icon">history</span>
      <div>
        <h2 class="ws-title">Version Timeline</h2>
        <p class="ws-subtitle">Browse a prompt's saved versions, compare any two, or roll back.</p>
      </div>
    </div>
    <div class="ws-header-actions">
      <button class="icon-btn" id="closeVersionBtn" aria-label="Close Version Timeline"><span class="material-symbols-outlined">close</span></button>
    </div>
  </div>
  <div class="ws-body ver-body">
    <div class="ver-picker-panel" id="verPickerPanel">
      <p class="hint">Pick a prompt to see its version history.</p>
      <select id="verPicker" class="forge-input qf-picker"><option value="">Load from library…</option></select>
    </div>
    <div class="ver-timeline-panel" id="verTimelinePanel" hidden>
      <div class="ver-timeline-list" id="verTimelineList"></div>
      <div class="ver-diff-panel" id="verDiffPanel"><span class="hint">Select two versions to compare.</span></div>
    </div>
  </div>
</div>

  <div id="promptViewer" aria-modal="true" aria-label="Prompt viewer" role="dialog">'''
assert content.count(old2) == 1, f'anchor 2 found {content.count(old2)} times, expected 1'
content = content.replace(old2, new2, 1)

with open(path, 'w', encoding='utf-8', newline='\\n') as f:
    f.write(content)
print('OK')
```

- [ ] **Step 2: Run it**

```bash
python3 _scratch_task9.py
```
Expected: `OK`

- [ ] **Step 3: Verify file integrity and syntax**

```bash
grep -c "<script" static/index.html
node --check static/app.js
python3 -m py_compile app.py
```
Expected: `grep -c` prints `3` (not truncated — per CLAUDE.md triage checklist); `node --check` and `py_compile` print nothing and exit 0.

- [ ] **Step 4: Clean up and cache-bust**

```bash
rm _scratch_task9.py
python3 update_hash.py
```

- [ ] **Step 5: Full interactive verification in the running app**

Start the app (`start.bat`), then in the running window:

1. Open the Workspaces launcher. A new **Organize** group should appear at the bottom with three PRO-badged cards: Taxonomy Studio, Relationship Graph, Version Timeline.
2. Click **Taxonomy Studio**: overlay opens. Add a domain, add a use-case under it, click the use-case, use "Tag more prompts" to tag at least one real prompt, confirm it appears in the tagged list, untag it, rename the use-case, rename the domain, delete the use-case, delete the domain. Close via the X button.
3. Click **Relationship Graph**: overlay opens to the prompt picker. Pick a prompt — the SVG radial graph renders with the center node. Click "Add relationship", pick a second prompt, submit — a new ring node with an edge label appears. Click the ring node to re-center on it. Click "Orphans" — list of unrelated prompts appears (or the empty state if none). Close via the X button.
4. Click **Version Timeline**: overlay opens to the prompt picker. Pick a prompt with at least one saved version (or edit-and-save a prompt first to create one) — the timeline renders. Edit a version's label inline, toggle the baseline star, select two version checkboxes and confirm the diff panel renders word-level highlighting, click Restore and confirm the confirmation dialog then the restore. Close via the X button.
5. Open the command palette (however it's triggered in this app — check `Prompt Library Interface Files/05-command-palette/README.md` if unsure) and search "taxonomy", "relationship", "version" — each should surface its workspace and open it on selection.
6. Press `Escape` while any of the three workspaces is open — confirm it closes back to the Library view (verifies the `_escapeToLibrary()` wiring from Task 8).

Take a screenshot of each of the three workspaces open and populated, confirming no console errors (check devtools/PyWebView console if available).

- [ ] **Step 6: Commit**

```bash
git add static/index.html
git commit -m "feat: add HTML for Taxonomy Studio, Relationship Graph, Version Timeline — all three now reachable from the launcher"
```
