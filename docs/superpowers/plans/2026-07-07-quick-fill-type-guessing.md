# Quick Fill Variable Type Guessing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quick Fill workspace guesses a field type (text/longtext/number/boolean) per detected variable from its name, renders the matching input control, and lets the user override the guess via a small dropdown, with the override persisted per variable name.

**Architecture:** Pure keyword-based heuristic (no AI/network call) added to the existing Quick Fill workspace in `static/app.js`. `localStorage` memory (`pl_qf_memory`) extended from `name → valueString` to `name → {value, type}`, with backward-compatible reads of the old string shape. No new workspace, no HTML template changes (Quick Fill's field markup is fully JS-built), no DB schema changes.

**Tech Stack:** Vanilla JS (browser IIFE, no build step, no module system, no JS test runner), Flask/SQLite backend (untouched by this feature), PyWebView desktop shell.

## Global Constraints

(From `CLAUDE.md` — apply to every task below)

- **Never use the Edit or Write tool on `static/app.js`, `static/index.html`, or `static/app.css`.** All edits go through bash + Python `content.replace()`: read file bytes → strip NUL bytes → `content.replace(OLD, NEW)` → write back. This project's mount silently truncates files grown via Edit/Write; verified independently, not a coincidence. Write throwaway patch scripts to the scratchpad temp dir, run with `python`, never inline heredocs (backslashes get mangled by this shell).
- **Run `node --check static/app.js` after every app.js edit.** Must show no output (success) before moving on.
- **Run `python update_hash.py` after every app.js change** (updates the cache-busting hash in index.html's script tag).
- **No new dependencies, no schema migrations.** This feature touches only `localStorage` shape, not the SQLite schema — exempt from the "no schema migration" rule, but never drop a user's existing remembered fill value when reading the old string shape.
- **No test harness exists in this project for JS.** "Tests" in this plan means: (a) standalone `node -e` / scratch-script verification of pure logic before it's wired into the UI, and (b) manual browser verification via the dev preview tool after wiring. There is no `pytest`/`jest` to run.
- Session-open integrity check (`static/index.html` script-tag count == 3, no NUL bytes; `static/app.js` passes `node --check` and ends in `})();`) must already have been run this session before any edit — if resuming in a new session, run it again first.

---

### Task 1: Type-guessing heuristic (pure function, no DOM)

**Files:**
- Modify: `static/app.js` — insert new functions immediately after `_qfExtractVars` (currently ends at line 11363, right before `_qfRenderForm` at line 11365).
- Scratch verification file: use the scratchpad temp dir (see system prompt for exact path), e.g. `qf_guess_type_check.js` — not part of the repo, delete-or-ignore after use (deletion may fail per house rule 11 on this mount; leaving it in scratchpad is fine, it's outside the repo).

**Interfaces:**
- Produces: `_qfWords(name: string): string[]` — splits a variable name on camelCase boundaries and non-alphanumeric separators, lowercased.
- Produces: `_qfGuessType(name: string): 'text' | 'longtext' | 'number' | 'boolean'` — used by Task 2's `_qfRenderForm`.

- [ ] **Step 1: Write the scratch verification script**

Write this to the scratchpad temp dir as `qf_guess_type_check.js`:

```javascript
function _qfWords(name) {
    return (name || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .split(/[^a-zA-Z0-9]+/)
        .map(w => w.toLowerCase())
        .filter(Boolean);
}

function _qfGuessType(name) {
    const words = _qfWords(name);
    const has = (...keys) => keys.some(k => words.includes(k));
    if (has('is', 'has', 'should', 'can', 'enable')) return 'boolean';
    if (has('count', 'qty', 'quantity', 'number', 'age', 'amount', 'price', 'total', 'rating', 'score', 'percent', 'year', 'days', 'weight', 'height')) return 'number';
    if (has('description', 'desc', 'bio', 'summary', 'details', 'notes', 'content', 'body', 'instructions', 'context', 'background', 'paragraph')) return 'longtext';
    return 'text';
}

const cases = [
    ['isPremium', 'boolean'],
    ['has_discount', 'boolean'],
    ['canEdit', 'boolean'],
    ['enable_notifications', 'boolean'],
    ['itemCount', 'number'],
    ['total_price', 'number'],
    ['customerAge', 'number'],
    ['description', 'longtext'],
    ['productDescription', 'longtext'],
    ['bio', 'longtext'],
    ['customerName', 'text'],
    ['audience', 'text'],
    ['product', 'text'],
];

let failed = 0;
for (const [name, expected] of cases) {
    const got = _qfGuessType(name);
    const ok = got === expected;
    if (!ok) failed++;
    console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + ' -> ' + got + ' (expected ' + expected + ')');
}
console.log(failed === 0 ? 'ALL PASS' : failed + ' FAILED');
```

- [ ] **Step 2: Run it and confirm ALL PASS**

Run: `node "<scratchpad>/qf_guess_type_check.js"` (substitute the actual scratchpad path from the system prompt)
Expected: every line `PASS`, final line `ALL PASS`. If any `FAIL`, fix the heuristic/word-splitting until all pass — do not proceed to Step 3 with failures.

- [ ] **Step 3: Insert the verified functions into app.js**

Write a Python patch script to the scratchpad temp dir, e.g. `patch_task1.py`:

```python
path = "static/app.js"
d = open(path, "rb").read()
d = d.replace(b"\x00", b"")
content = d.decode("utf-8")

marker = "        return vars;\n    }\n\n    function _qfRenderForm() {"
assert content.count(marker) == 1, "marker not unique"

insertion = """        return vars;
    }

    function _qfWords(name) {
        return (name || '')
            .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
            .split(/[^a-zA-Z0-9]+/)
            .map(w => w.toLowerCase())
            .filter(Boolean);
    }

    function _qfGuessType(name) {
        const words = _qfWords(name);
        const has = (...keys) => keys.some(k => words.includes(k));
        if (has('is', 'has', 'should', 'can', 'enable')) return 'boolean';
        if (has('count', 'qty', 'quantity', 'number', 'age', 'amount', 'price', 'total', 'rating', 'score', 'percent', 'year', 'days', 'weight', 'height')) return 'number';
        if (has('description', 'desc', 'bio', 'summary', 'details', 'notes', 'content', 'body', 'instructions', 'context', 'background', 'paragraph')) return 'longtext';
        return 'text';
    }

    function _qfRenderForm() {"""

content = content.replace(marker, insertion)
open(path, "w", encoding="utf-8", newline="\\n").write(content)
print("patched")
```

Run: `python "<scratchpad>/patch_task1.py"` from the repo root.
Expected output: `patched`

- [ ] **Step 4: Verify syntax**

Run: `node --check static/app.js`
Expected: no output (clean pass)

- [ ] **Step 5: Run update_hash.py**

Run: `python update_hash.py`
Expected: prints the new JS/CSS hashes, no error

- [ ] **Step 6: Commit**

```bash
git add static/app.js static/index.html
git commit -m "feat: add Quick Fill variable type-guessing heuristic"
```

---

### Task 2: Extend `pl_qf_memory` to `{value, type}` shape with backward compatibility

**Files:**
- Modify: `static/app.js:11332-11346` (`_qfMemory` / `_qfRemember`)

**Interfaces:**
- Consumes: `QF_MEM_KEY` (existing constant, line 11329).
- Produces: `_qfMemory(): object` (unchanged signature, raw parsed localStorage object — mixed legacy-string / new-object entries).
- Produces: `_qfMemGet(name: string): {value: string, type: string|undefined}` — normalizes either shape. Used by Task 3's `_qfRenderForm` and Task 4's `_qfRememberAll`.
- Produces: `_qfRemember(vals: {[name]: {value: string, type: string}}): void` — same name, new expected shape of `vals` (was `{[name]: string}`).

- [ ] **Step 1: Write the scratch verification script**

Write to scratchpad as `qf_memory_check.js`:

```javascript
function _qfMemGet(mem, name) {
    const entry = mem[name];
    if (entry == null) return { value: '', type: undefined };
    if (typeof entry === 'string') return { value: entry, type: undefined };
    return { value: entry.value || '', type: entry.type };
}

const mem = {
    legacyVar: 'old plain value',
    newVar: { value: 'new value', type: 'number' },
};

const cases = [
    ['legacyVar', { value: 'old plain value', type: undefined }],
    ['newVar', { value: 'new value', type: 'number' }],
    ['missingVar', { value: '', type: undefined }],
];

let failed = 0;
for (const [name, expected] of cases) {
    const got = _qfMemGet(mem, name);
    const ok = got.value === expected.value && got.type === expected.type;
    if (!ok) failed++;
    console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + ' -> ' + JSON.stringify(got));
}
console.log(failed === 0 ? 'ALL PASS' : failed + ' FAILED');
```

- [ ] **Step 2: Run it and confirm ALL PASS**

Run: `node "<scratchpad>/qf_memory_check.js"`
Expected: `ALL PASS`

- [ ] **Step 3: Patch app.js**

Write to scratchpad as `patch_task2.py`:

```python
path = "static/app.js"
d = open(path, "rb").read()
d = d.replace(b"\x00", b"")
content = d.decode("utf-8")

old = """    function _qfMemory() {
        try {
            return JSON.parse(localStorage.getItem(QF_MEM_KEY) || '{}');
        } catch {
            return {};
        }
    }

    function _qfRemember(vals) {
        const mem = _qfMemory();
        Object.assign(mem, vals);
        const keys = Object.keys(mem);
        if (keys.length > 200) keys.slice(0, keys.length - 200).forEach(k => delete mem[k]);
        localStorage.setItem(QF_MEM_KEY, JSON.stringify(mem));
    }"""
assert content.count(old) == 1, "block not unique"

new = """    function _qfMemory() {
        try {
            return JSON.parse(localStorage.getItem(QF_MEM_KEY) || '{}');
        } catch {
            return {};
        }
    }

    // Legacy entries were a plain string value; normalize both shapes to {value, type}.
    function _qfMemGet(name) {
        const entry = _qfMemory()[name];
        if (entry == null) return { value: '', type: undefined };
        if (typeof entry === 'string') return { value: entry, type: undefined };
        return { value: entry.value || '', type: entry.type };
    }

    function _qfRemember(vals) {
        const mem = _qfMemory();
        Object.assign(mem, vals);
        const keys = Object.keys(mem);
        if (keys.length > 200) keys.slice(0, keys.length - 200).forEach(k => delete mem[k]);
        localStorage.setItem(QF_MEM_KEY, JSON.stringify(mem));
    }"""

content = content.replace(old, new)
open(path, "w", encoding="utf-8", newline="\\n").write(content)
print("patched")
```

Run: `python "<scratchpad>/patch_task2.py"`
Expected: `patched`

- [ ] **Step 4: Verify syntax**

Run: `node --check static/app.js`
Expected: no output

- [ ] **Step 5: Run update_hash.py**

Run: `python update_hash.py`

- [ ] **Step 6: Commit**

```bash
git add static/app.js static/index.html
git commit -m "feat: extend pl_qf_memory to store type overrides, backward-compatible"
```

---

### Task 3: Render per-type input controls + override dropdown

**Files:**
- Modify: `static/app.js:11365-11393` (`_qfRenderForm`, currently reads `_qfMemory()` once and maps `_qfVars` to plain textareas)
- Modify: `static/app.js:11442-11454` region — no signature change, but `_qfVars` items now carry a `type` field consumed here indirectly via re-render.

**Interfaces:**
- Consumes: `_qfExtractVars(text): {token, name}[]` (existing, unchanged), `_qfGuessType(name): string` (Task 1), `_qfMemGet(name): {value, type}` (Task 2).
- Produces: `_qfVars: {token, name, type}[]` (module-level array, existing variable, now with `type` added) — consumed by Task 4's `_qfValues`/`_qfResult`/`_qfRememberAll`.
- Produces: `_qfFieldControlHtml(v, idx, value): string`, `_qfTypeSelectHtml(v, idx): string`, `_qfWireFieldInput(el): void` — internal to this file, not consumed elsewhere.

- [ ] **Step 1: Patch app.js**

Write to scratchpad as `patch_task3.py`:

```python
path = "static/app.js"
d = open(path, "rb").read()
d = d.replace(b"\x00", b"")
content = d.decode("utf-8")

old = """    function _qfRenderForm() {
        const src = $('#qfSource')?.value || '';
        const list = $('#qfVarList');
        if (!list) return;
        _qfVars = _qfExtractVars(src);
        const countEl = $('#qfVarCount');
        if (countEl) countEl.textContent = _qfVars.length;

        if (!_qfVars.length) {
            list.innerHTML = '<div class="qf-empty">No placeholders found.<br>Use <code>[square brackets]</code> or <code>{{curly pairs}}</code> in the template.</div>';
            _qfRenderPreview();
            return;
        }
        const mem = _qfMemory();
        list.innerHTML = _qfVars.map((v, i) =>
            '<div class="qf-field">' +
            '<label class="qf-field-label" title="' + escapeAttr(v.token) + '">' + escapeHtml(v.name || v.token) + '</label>' +
            '<textarea class="forge-input qf-var-input" data-qf-idx="' + i + '" rows="1" placeholder="' + escapeAttr(v.token) + '">' +
            escapeHtml(mem[v.name] || '') + '</textarea>' +
            '</div>').join('');
        list.querySelectorAll('.qf-var-input').forEach(ta => {
            ta.addEventListener('input', () => {
                ta.style.height = 'auto';
                ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
                _qfRenderPreview();
            });
        });
        _qfRenderPreview();
    }"""
assert content.count(old) == 1, "block not unique"

new = """    function _qfFieldControlHtml(v, idx, value) {
        const attrs = 'data-qf-idx="' + idx + '"';
        if (v.type === 'boolean') {
            const opts = ['', 'Yes', 'No'].map(o =>
                '<option value="' + o + '"' + (value === o ? ' selected' : '') + '>' + (o || '\\u2014') + '</option>'
            ).join('');
            return '<select class="forge-input qf-var-input" ' + attrs + '>' + opts + '</select>';
        }
        if (v.type === 'number') {
            return '<input type="number" class="forge-input qf-var-input" ' + attrs +
                ' value="' + escapeAttr(value) + '" placeholder="' + escapeAttr(v.token) + '" />';
        }
        const rows = v.type === 'longtext' ? 3 : 1;
        return '<textarea class="forge-input qf-var-input" ' + attrs + ' rows="' + rows + '" placeholder="' +
            escapeAttr(v.token) + '">' + escapeHtml(value) + '</textarea>';
    }

    function _qfTypeSelectHtml(v, idx) {
        const types = ['text', 'longtext', 'number', 'boolean'];
        const labels = { text: 'Text', longtext: 'Long text', number: 'Number', boolean: 'Yes/No' };
        const opts = types.map(t =>
            '<option value="' + t + '"' + (v.type === t ? ' selected' : '') + '>' + labels[t] + '</option>'
        ).join('');
        return '<select class="qf-type-select" data-qf-type-idx="' + idx + '">' + opts + '</select>';
    }

    function _qfWireFieldInput(el) {
        const evt = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(evt, () => {
            if (el.tagName === 'TEXTAREA') {
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            }
            _qfRenderPreview();
        });
    }

    function _qfRenderForm() {
        const src = $('#qfSource')?.value || '';
        const list = $('#qfVarList');
        if (!list) return;
        const extracted = _qfExtractVars(src);
        _qfVars = extracted.map(v => {
            const remembered = _qfMemGet(v.name);
            return { token: v.token, name: v.name, type: remembered.type || _qfGuessType(v.name) };
        });
        const countEl = $('#qfVarCount');
        if (countEl) countEl.textContent = _qfVars.length;

        if (!_qfVars.length) {
            list.innerHTML = '<div class="qf-empty">No placeholders found.<br>Use <code>[square brackets]</code> or <code>{{curly pairs}}</code> in the template.</div>';
            _qfRenderPreview();
            return;
        }
        list.innerHTML = _qfVars.map((v, i) => {
            const value = _qfMemGet(v.name).value || '';
            return '<div class="qf-field">' +
                '<div class="qf-field-head">' +
                '<label class="qf-field-label" title="' + escapeAttr(v.token) + '">' + escapeHtml(v.name || v.token) + '</label>' +
                _qfTypeSelectHtml(v, i) +
                '</div>' +
                _qfFieldControlHtml(v, i, value) +
                '</div>';
        }).join('');
        list.querySelectorAll('.qf-var-input').forEach(_qfWireFieldInput);
        list.querySelectorAll('.qf-type-select').forEach(sel => {
            sel.addEventListener('change', () => {
                const idx = Number(sel.dataset.qfTypeIdx);
                const v = _qfVars[idx];
                if (!v) return;
                const wrapper = sel.closest('.qf-field');
                const oldInput = wrapper.querySelector('.qf-var-input');
                const currentValue = oldInput ? oldInput.value : '';
                v.type = sel.value;
                _qfRemember({ [v.name]: { value: currentValue, type: v.type } });
                oldInput.outerHTML = _qfFieldControlHtml(v, idx, currentValue);
                _qfWireFieldInput(wrapper.querySelector('.qf-var-input'));
                _qfRenderPreview();
            });
        });
        _qfRenderPreview();
    }"""

content = content.replace(old, new)
open(path, "w", encoding="utf-8", newline="\\n").write(content)
print("patched")
```

Run: `python "<scratchpad>/patch_task3.py"`
Expected: `patched`

- [ ] **Step 2: Verify syntax**

Run: `node --check static/app.js`
Expected: no output

- [ ] **Step 3: Run update_hash.py**

Run: `python update_hash.py`

- [ ] **Step 4: Commit**

```bash
git add static/app.js static/index.html
git commit -m "feat: render type-guessed Quick Fill inputs with override dropdown"
```

---

### Task 4: Persist type overrides on Copy/Save, add CSS, manual verification

**Files:**
- Modify: `static/app.js:11476-11492` (`initFillWorkspace` — the `#qfCopyBtn` and `#qfSaveBtn` click handlers currently call `_qfRemember(_qfValues())`)
- Modify: `static/app.css` — insert new rules after line 8043 (`.qf-var-input { ... }`)

**Interfaces:**
- Consumes: `_qfVars: {token, name, type}[]` (Task 3), `_qfValues(): {[name]: string}` (existing, unchanged — reads `.value` off whatever control is in the DOM, works for `<select>`/`<input>`/`<textarea>` alike, no change needed).
- Produces: `_qfRememberAll(): void` — replaces the two `_qfRemember(_qfValues())` call sites.

- [ ] **Step 1: Patch app.js**

Write to scratchpad as `patch_task4.py`:

```python
path = "static/app.js"
d = open(path, "rb").read()
d = d.replace(b"\x00", b"")
content = d.decode("utf-8")

# Add _qfRememberAll right before initFillWorkspace
marker = "    function initFillWorkspace() {"
assert content.count(marker) == 1, "marker not unique"
insertion = """    function _qfRememberAll() {
        const vals = {};
        $$('#qfVarList .qf-var-input').forEach(el => {
            const v = _qfVars[Number(el.dataset.qfIdx)];
            if (v) vals[v.name] = { value: el.value, type: v.type };
        });
        _qfRemember(vals);
    }

    function initFillWorkspace() {"""
content = content.replace(marker, insertion)

old_calls = "            _qfRemember(_qfValues());"
count = content.count(old_calls)
assert count == 2, "expected exactly 2 call sites, found " + str(count)
content = content.replace(old_calls, "            _qfRememberAll();")

open(path, "w", encoding="utf-8", newline="\\n").write(content)
print("patched, replaced " + str(count) + " call sites")
```

Run: `python "<scratchpad>/patch_task4.py"`
Expected: `patched, replaced 2 call sites`

- [ ] **Step 2: Verify syntax**

Run: `node --check static/app.js`
Expected: no output

- [ ] **Step 3: Add CSS**

Write to scratchpad as `patch_task4_css.py`:

```python
path = "static/app.css"
d = open(path, "rb").read()
d = d.replace(b"\x00", b"")
content = d.decode("utf-8")

marker = ".qf-var-input { resize: none; overflow: hidden; min-height: 34px; }\n"
assert content.count(marker) == 1, "marker not unique"
insertion = marker + (
    ".qf-field { display: flex; flex-direction: column; gap: 4px; }\n"
    ".qf-field-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }\n"
    ".qf-type-select { font-size: 11px; color: var(--ink-3); background: transparent; border: 1px solid var(--line); "
    "border-radius: var(--r-sm, 4px); padding: 1px 4px; flex-shrink: 0; }\n"
)
content = content.replace(marker, insertion)
open(path, "w", encoding="utf-8", newline="\\n").write(content)
print("patched")
```

Run: `python "<scratchpad>/patch_task4_css.py"`
Expected: `patched`

- [ ] **Step 4: Run update_hash.py**

Run: `python update_hash.py`

- [ ] **Step 5: Manual browser verification**

Using the dev preview tool:
1. Start the app, open Quick Fill workspace.
2. Paste a template: `Hi {{customerName}}, you have {{itemCount}} items totalling {{totalPrice}}. {{isPremium}} member. {{description}}`
3. Confirm rendered controls: `customerName` → single-line text, `itemCount`/`totalPrice` → number inputs, `isPremium` → Yes/No select, `description` → taller textarea.
4. Change `customerName`'s type dropdown to "Number" — confirm the control swaps to a number input in place, no page error in console.
5. Fill in values, click Copy — confirm toast "Filled prompt copied" and no console errors.
6. Reload the app, reopen Quick Fill, paste the same template — confirm the overridden type (Number for `customerName`) and previously-typed values reload correctly.
7. Check browser console for errors throughout (`preview_console_logs`).

- [ ] **Step 6: Commit**

```bash
git add static/app.js static/index.html static/app.css
git commit -m "feat: persist Quick Fill type overrides on copy/save, add field styling"
```
