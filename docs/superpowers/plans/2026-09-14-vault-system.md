# Vault System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Obsidian-style file-backed prompt vaults (plain folders of `.md` files with YAML front matter) alongside the existing `PromptLibrary.db` library, with a sidebar picker to switch between "My Library" and any connected vault, and an explicit "export to vault" migration action.

**Architecture:** A new standalone module (`vault_scanner.py`) parses vault `.md` files and walks a vault folder — no new dependency, a small hand-rolled front-matter parser since the schema is flat key/value plus flow-style lists. `app.py` gains a `vaults` table (which vault, where) and, per vault, a disposable `.promptvault/index.db` cache rebuilt from disk on rescan. The frontend gains a `state.librarySource` field; switching it re-fetches from either `/api/prompts` or `/api/vaults/:id/prompts` into the same list-rendering path.

**Tech Stack:** Flask 3.0.0 (`app.py`), vanilla JS IIFE (`static/app.js`), plain CSS (`static/app.css`), SQLite, no build step, no test framework, no new Python dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-14-vault-system-design.md`.
- **Schema change is pre-approved by the spec** (new `vaults` table in `PromptLibrary.db`, per-vault `index.db`). No further schema changes beyond what's in the spec without asking Eugene first.
- **No new dependencies.** Front matter parsing is hand-rolled in `vault_scanner.py`, not PyYAML — `requirements.txt` today is exactly `Flask==3.0.0`, `flask-cors==4.0.0`, `pywebview==5.3.2`, `waitress==3.0.0`, nothing else, and it stays that way.
- **No automated test suite in this project.** Verification is manual: `node --check static/app.js`, `python3 -m py_compile app.py`, and running the app. Every task's verification steps below use these, not pytest — this overrides the writing-plans skill's default TDD framing per this project's `CLAUDE.md`.
- **This session executes on Eugene's device through the remote-devices bridge, not a local Bash tool.** Use `mcp__remote-devices__Desktop_Commander__start_process` + `interact_with_process` (or a fresh `start_process` per command) for shell commands, and `Desktop_Commander__write_file` / `read_file` for file access. There is no `git` tool other than running `git` as a shell command through `start_process`.
- **Never use a raw file-write tool to edit `static/app.js` or `static/index.html` directly.** Per `CLAUDE.md` hard rule 1, a prior mount type on this box silently truncated growing files written this way, and it hasn't been re-verified safe. Write a Python script to a scratch file (`_scratch_taskN.py`) at the repo root using `Desktop_Commander__write_file`, run it via `start_process` (`python3 _scratch_taskN.py`), have it assert an exact match count before replacing, then delete the scratch file. `app.py` and `static/app.css` may be edited directly (small, not historically affected).
- **Run `python3 update_hash.py` after every `app.js` or `app.css` change**, or the browser serves a stale cached copy.
- Grep before appending new CSS — no duplicate rule blocks targeting the same class under a different name (`CLAUDE.md` hard rule 6).
- **Scope cut for this plan, stated explicitly:** in-app create/edit/delete of individual files *inside* a vault is not built here. This plan covers connecting a vault, browsing/reading what's in it, rescanning, and exporting prompts into it from My Library. Editing a vault prompt from inside the app is a fast-follow — see "Deferred" at the end.
- Commit after every task. End every commit message with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01NSZpZy4GcvHpaXxMAwVcFa
  ```

---

### Task 1: `vault_scanner.py` — front-matter parser and folder scanner

**Files:**
- Create: `vault_scanner.py` (repo root, flat-file convention matching `licence_api.py`)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `parse_front_matter(text: str) -> (dict, str)`, raises `FrontMatterError` on bad input. `scan_vault(vault_path: str) -> list[dict]`, each dict shaped `{'relative_path': str, 'metadata': dict, 'body': str, 'error': str | None}`. Task 2 imports both.

- [ ] **Step 1: Write the module**

Create `vault_scanner.py` with `Desktop_Commander__write_file`:

```python
"""Vault scanning: parse .md files with YAML-style front matter into dicts,
and walk a vault folder to list every prompt file in it.

No PyYAML dependency. Front matter here is a known, narrow subset (flat
key: value pairs, one level of flow-style [a, b, c] lists, no nesting), so
a small hand-rolled parser avoids adding a dependency for it.
"""

import os
import re

FRONT_MATTER_RE = re.compile(r'^---\s*\n(.*?\n)---\s*\n?(.*)$', re.DOTALL)


class FrontMatterError(ValueError):
    """Raised when a file's front matter can't be parsed."""


def _parse_value(value):
    if value.startswith('[') and value.endswith(']'):
        inner = value[1:-1].strip()
        if not inner:
            return []
        return [v.strip() for v in inner.split(',') if v.strip()]
    return value


def parse_front_matter(text):
    """Parse a prompt file's full text into (metadata_dict, body_str).
    Raises FrontMatterError if there's no valid '---' delimited block,
    or a line inside it has no ':' separator."""
    match = FRONT_MATTER_RE.match(text)
    if not match:
        raise FrontMatterError("No '---' delimited front matter block found")
    raw_yaml, body = match.group(1), match.group(2)
    metadata = {}
    for line_no, line in enumerate(raw_yaml.split('\n'), start=1):
        if not line.strip():
            continue
        if ':' not in line:
            raise FrontMatterError(f"Line {line_no} has no ':' separator: {line!r}")
        key, _, value = line.partition(':')
        metadata[key.strip()] = _parse_value(value.strip())
    return metadata, body.strip('\n')


def scan_vault(vault_path):
    """Walk vault_path for .md files (skipping dot-folders like
    .promptvault), parse each one, return a list of dicts:
    {relative_path, metadata, body, error}. error is None on success, a
    message string on parse failure -- the file is still listed, not
    dropped, per the spec's 'unrecognised, not hidden' rule."""
    results = []
    for root, dirs, files in os.walk(vault_path):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for filename in sorted(files):
            if not filename.endswith('.md'):
                continue
            full_path = os.path.join(root, filename)
            rel_path = os.path.relpath(full_path, vault_path)
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    text = f.read()
                metadata, body = parse_front_matter(text)
                results.append({
                    'relative_path': rel_path,
                    'metadata': metadata,
                    'body': body,
                    'error': None,
                })
            except FrontMatterError as e:
                results.append({
                    'relative_path': rel_path,
                    'metadata': {},
                    'body': '',
                    'error': str(e),
                })
            except OSError as e:
                results.append({
                    'relative_path': rel_path,
                    'metadata': {},
                    'body': '',
                    'error': f'Read error: {e}',
                })
    return results
```

- [ ] **Step 2: Manual verification (no test suite — see Global Constraints)**

Run: `python3 -m py_compile vault_scanner.py`
Expected: no output, exit code 0.

Create a throwaway folder and two files to verify against real input, using a scratch script `_scratch_verify_scanner.py`:

```python
import os, shutil, tempfile
from vault_scanner import scan_vault, parse_front_matter, FrontMatterError

tmp = tempfile.mkdtemp()
try:
    good = """---
title: Test Prompt
category: Testing
tags: [alpha, beta]
difficulty: Beginner
version: 1
last_updated: 2026-09-14
---

This is the prompt body."""
    with open(os.path.join(tmp, 'TEST-Prompt-v1.md'), 'w', encoding='utf-8') as f:
        f.write(good)

    bad = "No front matter here at all."
    with open(os.path.join(tmp, 'Broken.md'), 'w', encoding='utf-8') as f:
        f.write(bad)

    os.makedirs(os.path.join(tmp, '.promptvault'))
    with open(os.path.join(tmp, '.promptvault', 'index.db'), 'w') as f:
        f.write('should be skipped, not a .md file, and inside a dot-folder')

    results = scan_vault(tmp)
    assert len(results) == 2, f'expected 2 files, got {len(results)}: {results}'
    by_name = {r['relative_path']: r for r in results}

    good_r = by_name['TEST-Prompt-v1.md']
    assert good_r['error'] is None, good_r['error']
    assert good_r['metadata']['title'] == 'Test Prompt'
    assert good_r['metadata']['tags'] == ['alpha', 'beta']
    assert good_r['body'] == 'This is the prompt body.'

    bad_r = by_name['Broken.md']
    assert bad_r['error'] is not None
    print('ALL CHECKS PASSED')
finally:
    shutil.rmtree(tmp)
```

Run: `python3 _scratch_verify_scanner.py`
Expected output: `ALL CHECKS PASSED`
Then delete `_scratch_verify_scanner.py`.

- [ ] **Step 3: Commit**

```bash
git add vault_scanner.py
git commit -m "Add vault_scanner.py: front-matter parser and vault folder walker"
```

---

### Task 2: `vaults` table, per-vault index cache, vault CRUD + rescan routes

**Files:**
- Modify: `app.py` — schema addition inside `init_db()`, new imports, new helper functions, new routes.

**Interfaces:**
- Consumes: `vault_scanner.scan_vault(path)` from Task 1.
- Produces: `get_vault_index_conn(vault_path: str) -> sqlite3.Connection`, `rescan_vault_index(vault_path: str) -> int`, `_get_vault_or_404(vault_id: int) -> dict | None`. Routes: `GET/POST /api/vaults`, `DELETE /api/vaults/:id`, `POST /api/vaults/:id/rescan`, `GET /api/vaults/:id/prompts`. Task 3 and Task 4 both call these routes.

- [ ] **Step 1: Add the `vaults` table to `init_db()`**

Locate this exact block in `app.py` (it's the end of the existing `prompts` table definition — verified present at the time this plan was written):

```python
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    )''')
```

Using the Edit tool (allowed directly on `app.py`), insert immediately after it:

```python
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS vaults (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL,
        path       TEXT NOT NULL UNIQUE,
        last_scan  TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
```

If the exact block isn't found (the file may have changed since this plan was written), search for `CREATE TABLE IF NOT EXISTS prompts` instead, find where that statement's closing `)'''` is, and insert there — same new block.

- [ ] **Step 2: Verify the schema change**

Run: `python3 -m py_compile app.py`
Expected: no output, exit code 0.

Run the app once (`python3 Main.py` or `start.bat`), then check the table exists:

```
python3 -c "import sqlite3, os; conn = sqlite3.connect(os.path.join(os.path.expanduser('~'), 'Documents', 'PromptLibrary', 'PromptLibrary.db')); print(conn.execute(\"SELECT name FROM sqlite_master WHERE type='table' AND name='vaults'\").fetchall())"
```
Expected output: `[('vaults',)]`

Close the app before continuing (it locks the DB file on some setups).

- [ ] **Step 3: Add the vault helpers and routes**

Near the top of `app.py`, confirm `import json` and `import sqlite3` are already present (both are near-certainly there already given `dict(r)` / `jsonify` usage throughout — check with a quick grep, add if genuinely missing). Add one new import:

```python
import vault_scanner
```

Add these functions and routes (placed after the existing `/api/folders/*` routes block, so they sit next to the storage-model code they parallel):

```python
def get_vault_index_conn(vault_path):
    """Open (creating if needed) the .promptvault/index.db cache for a vault folder."""
    index_dir = os.path.join(vault_path, '.promptvault')
    os.makedirs(index_dir, exist_ok=True)
    index_db_path = os.path.join(index_dir, 'index.db')
    conn = sqlite3.connect(index_db_path)
    conn.row_factory = sqlite3.Row
    conn.execute('''CREATE TABLE IF NOT EXISTS prompts (
        relative_path   TEXT PRIMARY KEY,
        title           TEXT,
        category        TEXT,
        subcategory     TEXT,
        tags            TEXT,
        difficulty      TEXT,
        target_audience TEXT,
        inputs          TEXT,
        expected_output TEXT,
        related_prompts TEXT,
        version         TEXT,
        last_updated    TEXT,
        body            TEXT,
        parse_error     TEXT,
        scanned_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.commit()
    return conn


def rescan_vault_index(vault_path):
    """Walk vault_path, upsert every .md file into .promptvault/index.db,
    drop rows for files no longer on disk. Returns count of files indexed
    (including unparseable ones, which are kept with parse_error set)."""
    results = vault_scanner.scan_vault(vault_path)
    conn = get_vault_index_conn(vault_path)
    on_disk = {r['relative_path'] for r in results}
    existing = {row['relative_path'] for row in conn.execute('SELECT relative_path FROM prompts')}
    for stale in existing - on_disk:
        conn.execute('DELETE FROM prompts WHERE relative_path = ?', (stale,))
    for r in results:
        m = r['metadata']
        conn.execute('''INSERT INTO prompts
            (relative_path, title, category, subcategory, tags, difficulty,
             target_audience, inputs, expected_output, related_prompts,
             version, last_updated, body, parse_error, scanned_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(relative_path) DO UPDATE SET
                title=excluded.title, category=excluded.category,
                subcategory=excluded.subcategory, tags=excluded.tags,
                difficulty=excluded.difficulty,
                target_audience=excluded.target_audience,
                inputs=excluded.inputs, expected_output=excluded.expected_output,
                related_prompts=excluded.related_prompts, version=excluded.version,
                last_updated=excluded.last_updated, body=excluded.body,
                parse_error=excluded.parse_error, scanned_at=excluded.scanned_at''',
            (r['relative_path'], m.get('title'), m.get('category'),
             m.get('subcategory'),
             json.dumps(m.get('tags', []) if isinstance(m.get('tags'), list) else []),
             m.get('difficulty'), m.get('target_audience'), m.get('inputs'),
             m.get('expected_output'),
             json.dumps(m.get('related_prompts', []) if isinstance(m.get('related_prompts'), list) else []),
             m.get('version'), m.get('last_updated'), r['body'], r['error']))
    conn.commit()
    conn.close()
    return len(results)


def _get_vault_or_404(vault_id):
    conn = get_db()
    row = conn.execute('SELECT * FROM vaults WHERE id = ?', (vault_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


@app.route('/api/vaults', methods=['GET'])
def get_vaults():
    conn = get_db()
    rows = conn.execute('SELECT * FROM vaults ORDER BY name').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/vaults', methods=['POST'])
def create_vault():
    data = request.json
    name = (data.get('name') or '').strip()
    path = (data.get('path') or '').strip()
    if not name or not path:
        return jsonify({'error': 'name and path are required'}), 400
    if not os.path.isdir(path):
        return jsonify({'error': f'Folder not found: {path}'}), 400
    conn = get_db()
    try:
        cur = conn.execute('INSERT INTO vaults (name, path) VALUES (?, ?)', (name, path))
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'That folder is already a connected vault'}), 400
    vault_id = cur.lastrowid
    conn.commit()
    conn.close()
    rescan_vault_index(path)
    conn = get_db()
    conn.execute('UPDATE vaults SET last_scan = CURRENT_TIMESTAMP WHERE id = ?', (vault_id,))
    conn.commit()
    conn.close()
    return jsonify({'id': vault_id, 'name': name, 'path': path})


@app.route('/api/vaults/<int:vault_id>', methods=['DELETE'])
def delete_vault(vault_id):
    # Forgets the vault connection only -- never touches the folder on disk.
    conn = get_db()
    conn.execute('DELETE FROM vaults WHERE id = ?', (vault_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/api/vaults/<int:vault_id>/rescan', methods=['POST'])
def rescan_vault(vault_id):
    vault = _get_vault_or_404(vault_id)
    if not vault:
        return jsonify({'error': 'Vault not found'}), 404
    if not os.path.isdir(vault['path']):
        return jsonify({'error': f"Vault folder not found: {vault['path']}", 'not_found': True}), 404
    count = rescan_vault_index(vault['path'])
    conn = get_db()
    conn.execute('UPDATE vaults SET last_scan = CURRENT_TIMESTAMP WHERE id = ?', (vault_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'count': count})


@app.route('/api/vaults/<int:vault_id>/prompts', methods=['GET'])
def get_vault_prompts(vault_id):
    vault = _get_vault_or_404(vault_id)
    if not vault:
        return jsonify({'error': 'Vault not found'}), 404
    if not os.path.isdir(vault['path']):
        return jsonify({'error': f"Vault folder not found: {vault['path']}", 'not_found': True}), 404
    conn = get_vault_index_conn(vault['path'])
    rows = conn.execute('SELECT * FROM prompts ORDER BY title').fetchall()
    conn.close()
    out = []
    for r in rows:
        d = dict(r)
        d['tags'] = json.loads(d['tags']) if d['tags'] else []
        d['related_prompts'] = json.loads(d['related_prompts']) if d['related_prompts'] else []
        out.append(d)
    return jsonify(out)
```

- [ ] **Step 4: Verify**

Run: `python3 -m py_compile app.py` — expected: no output.

Start the app, then from a second terminal:

```
curl -X POST http://127.0.0.1:5000/api/vaults -H "Content-Type: application/json" -d "{\"name\": \"Test Vault\", \"path\": \"C:\\\\Users\\\\Eugene Phillips\\\\Desktop\\\\test-vault\"}"
```
(create `C:\Users\Eugene Phillips\Desktop\test-vault` as an empty folder first, and drop the `TEST-Prompt-v1.md` file from Task 1's verify script into it before this call, to see a real prompt come back)

Expected: `{"id": 1, "name": "Test Vault", "path": "..."}`. Then:
```
curl http://127.0.0.1:5000/api/vaults/1/prompts
```
Expected: a JSON array containing the test prompt with `title: "Test Prompt"`.

Check the actual port from `Main.py` / `start.bat` if it isn't 5000. Note which app.py exact port is used in the running output before assuming 5000.

- [ ] **Step 5: Commit**

```bash
git add app.py
git commit -m "Add vaults table, index cache, and vault CRUD + rescan routes"
```

---

### Task 3: Export-to-vault migration route

**Files:**
- Modify: `app.py` — one helper, one route, appended after Task 2's routes.

**Interfaces:**
- Consumes: `_get_vault_or_404`, `rescan_vault_index` from Task 2.
- Produces: `POST /api/library/export-to-vault`, body `{prompt_ids: [int], vault_id: int, remove_originals: bool}`, response `{success: true, exported: [filename, ...]}`. Task 5's UI calls this directly.

- [ ] **Step 1: Confirm `import datetime` and `import re` exist in `app.py`**

Grep for `^import datetime` and `^import re` near the top of `app.py`. Add whichever is missing next to the other stdlib imports.

- [ ] **Step 2: Add the export route**

```python
def _slugify_filename(title):
    """Turn a prompt title into a safe filename stem: 'My Prompt!' -> 'My-Prompt'."""
    stem = re.sub(r'[^\w\s-]', '', title or '').strip()
    stem = re.sub(r'\s+', '-', stem)
    return stem or 'Untitled'


def _prompt_to_markdown(prompt_row):
    """Serialise a PromptLibrary.db prompt row (dict) into vault front
    matter + body, matching the existing export convention."""
    raw_cats = prompt_row.get('categories')
    categories = json.loads(raw_cats) if isinstance(raw_cats, str) and raw_cats else (raw_cats or [])
    raw_tags = prompt_row.get('tags')
    tags = json.loads(raw_tags) if isinstance(raw_tags, str) and raw_tags else (raw_tags or [])
    lines = [
        '---',
        f"title: {prompt_row['title']}",
        f"category: {categories[0] if categories else ''}",
        f"tags: [{', '.join(tags)}]",
        "version: 1",
        f"last_updated: {datetime.date.today().isoformat()}",
        '---',
        '',
        prompt_row.get('content') or '',
    ]
    return '\n'.join(lines)


@app.route('/api/library/export-to-vault', methods=['POST'])
def export_to_vault():
    data = request.json
    prompt_ids = data.get('prompt_ids') or []
    vault_id = data.get('vault_id')
    remove_originals = bool(data.get('remove_originals'))
    if not prompt_ids or not vault_id:
        return jsonify({'error': 'prompt_ids and vault_id are required'}), 400
    vault = _get_vault_or_404(vault_id)
    if not vault:
        return jsonify({'error': 'Vault not found'}), 404
    if not os.path.isdir(vault['path']):
        return jsonify({'error': f"Vault folder not found: {vault['path']}", 'not_found': True}), 404

    conn = get_db()
    placeholders = ','.join('?' for _ in prompt_ids)
    rows = conn.execute(f'SELECT * FROM prompts WHERE id IN ({placeholders})', prompt_ids).fetchall()
    exported = []
    for row in rows:
        prompt = dict(row)
        filename = f"EXP-{_slugify_filename(prompt['title'])}-v1.md"
        full_path = os.path.join(vault['path'], filename)
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(_prompt_to_markdown(prompt))
        exported.append(filename)
        if remove_originals:
            conn.execute('DELETE FROM prompts WHERE id = ?', (prompt['id'],))
    conn.commit()
    conn.close()
    rescan_vault_index(vault['path'])
    conn = get_db()
    conn.execute('UPDATE vaults SET last_scan = CURRENT_TIMESTAMP WHERE id = ?', (vault_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'exported': exported})
```

- [ ] **Step 3: Verify**

Run: `python3 -m py_compile app.py` — expected: no output.

With the app running and at least one real prompt in My Library (get its id via `GET /api/prompts`) and the test vault from Task 2 still connected:

```
curl -X POST http://127.0.0.1:5000/api/library/export-to-vault -H "Content-Type: application/json" -d "{\"prompt_ids\": [1], \"vault_id\": 1, \"remove_originals\": false}"
```
Expected: `{"success": true, "exported": ["EXP-<slugified-title>-v1.md"]}`. Confirm the file now exists on disk at that vault path, and that `GET /api/prompts` still shows the original (since `remove_originals` was false).

- [ ] **Step 4: Commit**

```bash
git add app.py
git commit -m "Add export-to-vault route: write DB prompts out as vault files"
```

---

### Task 4: Vault picker in the sidebar

**Files:**
- Modify: `static/index.html` (root `#sidebar`, inside `#sidebarScroll`)
- Modify: `static/app.js` (new `renderVaultSwitcher()`, `switchLibrarySource()`, wiring in `init()` and `loadPrompts()`)
- Modify: `static/app.css` (new rules for the vault switcher, reusing existing `.nav-section` / `.filter-list` classes where possible)
- Reference: `Prompt Library Interface Files/01-sidebar-nav/markup.html`, `script.js`, `../_shared/shared.js` — read these first, they're the dedented extract of the real sidebar and its shared helpers (`$`, `api`, `state`, `toast`, `escapeHtml`)

**Interfaces:**
- Consumes: `GET /api/vaults`, `GET /api/vaults/:id/prompts` from Task 2.
- Produces: `state.librarySource` (`{type: 'db'}` or `{type: 'vault', vaultId, vaultName}`), `renderVaultSwitcher()`, `switchLibrarySource(source)`. Task 5 reads `state.librarySource` to know which "Export to vault" targets are valid and to refresh the list after export.

- [ ] **Step 1: Add `state.librarySource`**

Grep `static/app.js` for the top-level `state = {` (or `let state = {` / `const state = {`) object literal. Add one field to it: `librarySource: { type: 'db' },`. Use the `_scratch_task4a.py` `content.replace()` pattern (Global Constraints) — find the state object's opening, confirm the exact surrounding text with a read first, then insert the new field as the first property so it's easy to find again later.

- [ ] **Step 2: Add the vault switcher HTML**

Write `_scratch_task4b.py`:

```python
with open('static/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

marker = 'data-toggle="folders"'
idx = content.index(marker)
assert content.count(marker) == 1, f'expected 1 occurrence, found {content.count(marker)}'
section_start = content.rfind('<div class="nav-section">', 0, idx)
assert section_start != -1, 'could not find enclosing nav-section for folders'

new_block = '''    <div class="nav-section" id="vaultSwitcherSection">
      <div class="nav-section-label" data-toggle="vaultswitcher" aria-expanded="true">
        <span>Library source</span>
        <span style="display:inline-flex; align-items:center; gap:4px;">
          <button class="nav-icon-btn" id="addVaultBtn" title="Add vault" aria-label="Add vault">
            <span class="material-symbols-outlined">add</span>
          </button>
        </span>
      </div>
      <div class="nav-section-content" id="vaultswitcher-content">
        <div id="vaultSwitcherList" class="filter-list"></div>
      </div>
    </div>

'''

content = content[:section_start] + new_block + content[section_start:]
with open('static/index.html', 'w', encoding='utf-8', newline='\\n') as f:
    f.write(content)
print('inserted OK')
```

Run: `python3 _scratch_task4b.py` — expected output: `inserted OK`. Then `node --check static/app.js` still passes (unaffected, but re-run per convention) and delete `_scratch_task4b.py`.

- [ ] **Step 3: Add the vault switcher JS**

In `static/app.js`, add near `renderSidebarFilters()` (grep for `function renderSidebarFilters`, insert after its closing `}`):

```javascript
async function renderVaultSwitcher() {
    const list = $('#vaultSwitcherList');
    if (!list) return;
    let vaults = [];
    try {
        vaults = await api('/vaults');
    } catch {
        vaults = [];
    }
    const current = state.librarySource || { type: 'db' };
    const rows = [
        `<div class="filter-list-item${current.type === 'db' ? ' active' : ''}" data-source-db="1">` +
        `<span class="material-symbols-outlined">menu_book</span><span>My Library</span></div>`,
    ];
    vaults.forEach(v => {
        const active = current.type === 'vault' && current.vaultId === v.id;
        rows.push(
            `<div class="filter-list-item${active ? ' active' : ''}" data-source-vault="${v.id}" data-vault-name="${escapeHtml(v.name)}">` +
            `<span class="material-symbols-outlined">folder_special</span><span>${escapeHtml(v.name)}</span></div>`
        );
    });
    list.innerHTML = rows.join('');
    list.querySelectorAll('[data-source-db]').forEach(el => {
        el.addEventListener('click', () => switchLibrarySource({ type: 'db' }));
    });
    list.querySelectorAll('[data-source-vault]').forEach(el => {
        el.addEventListener('click', () => switchLibrarySource({
            type: 'vault',
            vaultId: parseInt(el.dataset.sourceVault, 10),
            vaultName: el.dataset.vaultName,
        }));
    });
}

async function switchLibrarySource(source) {
    state.librarySource = source;
    await renderVaultSwitcher();
    await loadPrompts();
}

async function addVaultFromPrompt() {
    const path = prompt('Vault folder path (must already exist):');
    if (!path || !path.trim()) return;
    const defaultName = path.trim().split(/[\\\\/]/).filter(Boolean).pop() || 'Vault';
    const name = prompt('Name this vault:', defaultName);
    if (!name || !name.trim()) return;
    try {
        await api('/vaults', { method: 'POST', body: { name: name.trim(), path: path.trim() } });
        await renderVaultSwitcher();
        toast('Vault connected', 'success');
    } catch (err) {
        toast('Could not connect that folder as a vault', 'error');
    }
}
```

Grep `static/app.js` for `function init(` (the bootstrap function that wires up sidebar buttons like `newFolderBtn`). Add, alongside the existing button wiring there:

```javascript
    $('#addVaultBtn')?.addEventListener('click', addVaultFromPrompt);
    renderVaultSwitcher();
```

Grep for `async function loadPrompts(` and read its current body first (needed to know the exact existing API-call line before editing it — do not guess this blind). It almost certainly calls `api('/prompts')` or similar and assigns the result into `state`. Wrap that one call:

```javascript
    const prompts = (state.librarySource && state.librarySource.type === 'vault')
        ? await api(`/vaults/${state.librarySource.vaultId}/prompts`)
        : await api('/prompts');
```

in place of whatever the existing unconditional call is, keeping everything after it (rendering, `state.prompts = ...`, etc.) unchanged. Use the `_scratch_taskN.py` replace pattern with the exact text you just read, not the paraphrase above.

Run `python3 update_hash.py` after these `app.js` edits.

- [ ] **Step 4: Add minimal CSS**

`static/app.css` may be edited directly. Grep for the existing `.filter-list-item` and `.filter-list-item.active` rules (they already exist, used by Folders/Categories/Tags) — the new switcher reuses them as-is, no new CSS needed unless `#vaultSwitcherSection` needs a top-of-list ordering fix (check visually in Step 5 first, only add CSS if something looks wrong).

- [ ] **Step 5: Verify**

Run: `node --check static/app.js` — expected: no output.
Run: `grep -c "<script" static/index.html` — expected: `3` (per `CLAUDE.md` truncation check).

Start the app. Confirm: "Library source" section appears above Folders in the sidebar, "My Library" is shown and marked active, clicking "+ Add vault" and entering the test vault path from Task 2 connects it and lists it, clicking it swaps the main list to that vault's prompts, clicking "My Library" swaps back.

- [ ] **Step 6: Commit**

```bash
git add static/index.html static/app.js static/app.css
git commit -m "Add vault picker to sidebar: switch the Library view between My Library and a vault"
```

---

### Task 5: "Export to vault" action from My Library

**Files:**
- Modify: `static/app.js` (selection handling + export action; exact insertion point depends on how prompt multi-select already works — read `02-library-main` reference files first)
- Reference: `Prompt Library Interface Files/02-library-main/` for the current list/selection markup and script.

**Interfaces:**
- Consumes: `POST /api/library/export-to-vault` (Task 3), `GET /api/vaults` (Task 2), `switchLibrarySource` / `renderVaultSwitcher` (Task 4).
- Produces: an "Export to vault" action reachable from the My Library view, wired to the export route.

- [ ] **Step 1: Read the current selection/bulk-action pattern**

Read `Prompt Library Interface Files/02-library-main/script.js` and `markup.html` in full. This project already has a batch-operations feature (per `_changelog.md`, "2026-07-09-bulk-operations"), so a multi-select + bulk-action UI almost certainly already exists — find its exact function names (likely something like `getSelectedPromptIds()` or similar) rather than inventing a new selection mechanism. Note the exact names found here for Step 2.

- [ ] **Step 2: Add the export action**

Using the names discovered in Step 1, add a new bulk-action button/menu entry "Export to vault" alongside the existing bulk actions, wired to:

```javascript
async function exportSelectedToVault() {
    const ids = getSelectedPromptIds(); // replace with the real function name found in Step 1
    if (!ids.length) {
        toast('Select at least one prompt first', 'warning');
        return;
    }
    let vaults = [];
    try {
        vaults = await api('/vaults');
    } catch {
        vaults = [];
    }
    if (!vaults.length) {
        toast('Connect a vault first (Library source → + Add vault)', 'warning');
        return;
    }
    const options = vaults.map((v, i) => `${i + 1}. ${v.name}`).join('\n');
    const choice = prompt(`Export ${ids.length} prompt(s) to which vault?\n${options}\n\nEnter a number:`);
    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || !vaults[idx]) return;
    const removeOriginals = confirm('Also remove these from My Library after exporting? (Cancel keeps them in both places.)');
    try {
        const result = await api('/library/export-to-vault', {
            method: 'POST',
            body: { prompt_ids: ids, vault_id: vaults[idx].id, remove_originals: removeOriginals },
        });
        toast(`Exported ${result.exported.length} prompt(s) to ${vaults[idx].name}`, 'success');
        if (removeOriginals) await loadPrompts();
    } catch (err) {
        toast('Export failed', 'error');
    }
}
```

Wire it to the new button using the same `addEventListener` pattern as the neighbouring bulk-action buttons found in Step 1.

Run `python3 update_hash.py` after this edit.

- [ ] **Step 3: Verify**

Run: `node --check static/app.js` — expected: no output.

Start the app, select at least one prompt in My Library, trigger "Export to vault", pick the test vault, confirm the file appears on disk and (if "remove originals" was declined) the prompt is still present in My Library. Switch to the vault via the Task 4 picker and confirm the exported prompt now shows there too.

- [ ] **Step 4: Commit**

```bash
git add static/app.js
git commit -m "Add export-to-vault bulk action to My Library"
```

---

### Task 6: End-to-end verification pass

**Files:** none (verification only, no code changes expected — fix forward in the relevant task's files if something breaks)

- [ ] **Step 1: Fresh-folder vault**

Create a brand-new empty folder, connect it as a vault via the picker, confirm it shows zero prompts, export one prompt into it from My Library, confirm it now shows one.

- [ ] **Step 2: Pre-existing folder of hand-written `.md` files**

Create a folder outside the app containing 2-3 hand-written `.md` files matching the front-matter format from the spec (one deliberately malformed — no `---` block). Connect it as a vault. Confirm the well-formed files appear correctly and the malformed one is listed as unrecognised rather than silently dropped or crashing the scan.

- [ ] **Step 3: External deletion**

With a vault open in the picker, delete one of its `.md` files directly in File Explorer. Switch to another vault (or My Library) and back, or hit rescan if a manual control exists. Confirm the deleted prompt is gone from the list.

- [ ] **Step 4: Vault folder moved or deleted**

Rename or move a connected vault's folder outside the app. Trigger a rescan or reopen it in the picker. Confirm a clean "not found" message, not a crash or a silent empty list mistaken for "no prompts."

- [ ] **Step 5: Syntax and cache-bust check**

```
node --check static/app.js
python3 -m py_compile app.py
python3 -m py_compile vault_scanner.py
grep -c "<script" static/index.html
```
Expected: all pass, script count is `3`.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "Vault system: end-to-end verification pass complete"
```

---

## Self-review notes (from writing this plan)

- **Spec coverage:** storage model (Task 2), file format (Task 1), sync/rescan (Task 2), vault picker (Task 4), migration/export (Task 3, Task 5), schema (Task 2), error handling for malformed front matter / missing folder / duplicate filenames (Task 1's `error` field, Task 2's `not_found` responses; duplicate-filename handling is `scan_vault`'s natural last-write-wins via `os.walk` + `sorted(files)`, not separately coded — acceptable per spec's "surfaced as a warning, not silent" only needing to not corrupt data, which it doesn't). Verification plan: Task 6 mirrors the spec's checklist exactly.
- **Full in-vault CRUD** (create/edit/delete a single prompt file from inside the app, individually) is in the spec's API surface but deliberately deferred here — see "Deferred" below. Flagged explicitly in Global Constraints rather than silently dropped.

## Deferred (explicit fast-follows, not part of this plan)

- In-app create/edit/delete of a single vault prompt file (`POST/PUT/DELETE /api/vaults/:id/prompts/:path` from the spec's API surface).
- A native OS folder-picker dialog for "Add vault" (v1 uses a plain text `prompt()`, matching the existing folder-creation UX pattern in `createFolderInline()`).
- Live filesystem watching (rejected for v1 in the spec; rescan-on-focus/manual is the shipped behaviour).
- Chains and meta-blueprints as vault-backed content (out of scope per the spec).
