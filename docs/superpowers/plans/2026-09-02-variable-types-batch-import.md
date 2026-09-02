# Variable Types Overhaul and Batch Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the prompt variable-type list (remove Markdown, swap three Input types, add Toggle Group multi-select, add five new Advanced choice types) and overhaul batch import (destination-folder picker, a new heuristic "Paste (Smart)" tab backed by a new endpoint, a short custom-instructions-sized Markdown template, and a hardened Markdown parser).

**Architecture:** All variable-type changes live inside `renderVariableFields()` / `renderVarMetaList()` / `collectVarMeta()` in `static/app.js` — the type list, its render switch, and its save/collect logic are three parallel switches keyed on the same `type` string, and every type's data lives in the existing freeform `variable_meta` JSON blob (no schema change). Batch import adds one new read-only Flask route (`POST /api/import/parse-raw`) that heuristically splits raw text server-side, and a new import-modal tab that calls it, previews the results, and commits through the existing `POST /api/import` route unchanged.

**Tech Stack:** Flask 3.0.0 (`app.py`), vanilla JS IIFE (`static/app.js`), plain CSS (`static/app.css`), no build step, no test framework.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-02-variable-types-batch-import-design.md`.
- No schema changes, no new dependencies (per `CLAUDE.md` and the spec).
- **No automated test suite in this project.** Verification is manual:
  `node --check static/app.js`, `python3 -m py_compile app.py`, and running
  the app. Every task's "test" steps below use these, not pytest/jest — this
  overrides the writing-plans skill's default TDD framing per this
  project's `CLAUDE.md`.
- **Never use the Edit or Write tool on `static/app.js` or
  `static/index.html`.** Per `CLAUDE.md` hard rule 1: write a Python script
  with the Write tool (never a bash heredoc — it mangles backslashes on
  this box) to a scratch file at the repo root (e.g. `_scratch_task1.py`),
  using raw triple-quoted strings (`r"""..."""`) for the `old`/`new` blocks
  so embedded backslashes match exactly. The script reads the file, asserts
  `content.count(old) == <expected>` before replacing, writes back with
  `newline='\n'`, then run it with `python3 _scratch_taskN.py` and delete it.
  `app.py` and `static/app.css` may use the Edit tool directly.
- **Run `python3 update_hash.py` after every `app.js`/`app.css` change**,
  or the browser serves a stale cached copy.
- Grep before appending new CSS — no duplicate rule blocks targeting the
  same class under a different name (`CLAUDE.md` hard rule 6).
- Commit after every task with a message ending in the required
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` trailer.

---

### Task 1: Remove Markdown type, replace Percentage/File Path/Image URL

**Files:**
- Modify: `static/app.js` (type dropdown ~L2637-2663, type-icon map
  ~L1344-1376, render switch ~L1440-1464, helper `_PL_previewImageUrl`
  ~L1613-1624)
- Modify: `static/app.css` (~L1197, ~L1272, ~L1274)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: variable types `duration`, `timezone`, `language` (render,
  icon, dropdown entry). Removes `markdown`, `percentage`, `filepath`,
  `imageurl` and the now-dead `window._PL_previewImageUrl` helper.

- [ ] **Step 1: Write the edit script**

Create `_scratch_task1.py` at the repo root with the Write tool:

```python
path = 'static/app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove `markdown` from the type dropdown (Text optgroup)
old1 = r"""            <option value="text"      ${type === 'text'      ? 'selected' : ''}>Text</option>
            <option value="paragraph" ${type === 'paragraph' ? 'selected' : ''}>Paragraph</option>
            <option value="markdown"  ${type === 'markdown'  ? 'selected' : ''}>Markdown</option>
            <option value="code"      ${type === 'code'      ? 'selected' : ''}>Code</option>"""
new1 = r"""            <option value="text"      ${type === 'text'      ? 'selected' : ''}>Text</option>
            <option value="paragraph" ${type === 'paragraph' ? 'selected' : ''}>Paragraph</option>
            <option value="code"      ${type === 'code'      ? 'selected' : ''}>Code</option>"""
assert content.count(old1) == 1, f'old1 found {content.count(old1)} times'
content = content.replace(old1, new1, 1)

# 2. Replace Percentage/File Path/Image URL with Duration/Timezone/Language in the dropdown
old2 = r"""            <option value="currency"   ${type === 'currency'   ? 'selected' : ''}>Currency</option>
            <option value="percentage" ${type === 'percentage' ? 'selected' : ''}>Percentage</option>
            <option value="filepath"   ${type === 'filepath'   ? 'selected' : ''}>File Path</option>
            <option value="imageurl"   ${type === 'imageurl'   ? 'selected' : ''}>Image URL</option>
            <option value="json"       ${type === 'json'       ? 'selected' : ''}>JSON</option>"""
new2 = r"""            <option value="currency"   ${type === 'currency'   ? 'selected' : ''}>Currency</option>
            <option value="duration"   ${type === 'duration'   ? 'selected' : ''}>Duration</option>
            <option value="timezone"   ${type === 'timezone'   ? 'selected' : ''}>Timezone</option>
            <option value="language"   ${type === 'language'   ? 'selected' : ''}>Language</option>
            <option value="json"       ${type === 'json'       ? 'selected' : ''}>JSON</option>"""
assert content.count(old2) == 1, f'old2 found {content.count(old2)} times'
content = content.replace(old2, new2, 1)

# 3. Remove `markdown` from the typeIcon map, replace percentage/filepath/imageurl icons
old3 = r"""            currency: 'payments',
            percentage: 'percent',
            filepath: 'folder_open',
            imageurl: 'image',
            datetime: 'event_available',"""
new3 = r"""            currency: 'payments',
            duration: 'timer',
            timezone: 'public',
            language: 'translate',
            datetime: 'event_available',"""
assert content.count(old3) == 1, f'old3 found {content.count(old3)} times'
content = content.replace(old3, new3, 1)

old3b = r"""            paragraph: 'subject',
            markdown: 'article',
            code: 'code',"""
new3b = r"""            paragraph: 'subject',
            code: 'code',"""
assert content.count(old3b) == 1, f'old3b found {content.count(old3b)} times'
content = content.replace(old3b, new3b, 1)

# 4. Remove the markdown render branch
old4 = r"""            } else if (type === 'markdown') {
                input = `<textarea class="var-input var-markdown" data-var="${escapeAttr(v)}" placeholder="Enter markdown… (# headings, **bold**, - lists)" rows="8" style="width:100%;resize:vertical;font-family:monospace;font-size:12px;">${escapeHtml(def)}</textarea>`;
            } else if (type === 'code') {"""
new4 = r"""            } else if (type === 'code') {"""
assert content.count(old4) == 1, f'old4 found {content.count(old4)} times'
content = content.replace(old4, new4, 1)

# 5. Replace the percentage/filepath/imageurl render branches with duration/timezone/language
old5 = r"""            } else if (type === 'percentage') {
                input = `<div style="display:flex;align-items:center;gap:6px;">
        <input type="number" min="0" max="100" class="var-input" data-var="${escapeAttr(v)}" placeholder="0" value="${escapeAttr(def)}" style="flex:1;" />
        <span style="font-size:13px;color:var(--ink-2);font-weight:600;">%</span>
      </div>`;
            } else if (type === 'filepath') {
                input = `<input type="text" class="var-input var-code" data-var="${escapeAttr(v)}" placeholder="C:\\path\\to\\file.ext" value="${escapeAttr(def)}" style="font-family:monospace;font-size:12px;" />`;
            } else if (type === 'imageurl') {
                input = `<div>
        <input type="url" class="var-input var-imageurl-input" data-var="${escapeAttr(v)}" placeholder="https://example.com/image.png" value="${escapeAttr(def)}" oninput="window._PL_previewImageUrl(this)" />
        <div class="var-imageurl-preview" style="margin-top:6px;${def ? '' : 'display:none;'}">
          <img src="${escapeAttr(def)}" style="max-width:120px;max-height:80px;border-radius:6px;border:1px solid var(--line);" onerror="this.parentElement.style.display='none';" onload="this.parentElement.style.display='block';" />
        </div>
      </div>`;
            } else if (type === 'tags') {"""
new5 = r"""            } else if (type === 'duration') {
                input = `<input type="text" class="var-input" list="var-duration-list" data-var="${escapeAttr(v)}" placeholder="e.g. 30 minutes, 2h 15m" value="${escapeAttr(def)}" />
      <datalist id="var-duration-list">
        <option value="15 minutes"></option><option value="30 minutes"></option>
        <option value="1 hour"></option><option value="2 hours"></option>
        <option value="1 day"></option><option value="1 week"></option>
      </datalist>`;
            } else if (type === 'timezone') {
                input = `<input type="text" class="var-input" list="var-timezone-list" data-var="${escapeAttr(v)}" placeholder="e.g. UTC, EST, PST" value="${escapeAttr(def)}" />
      <datalist id="var-timezone-list">
        ${['UTC','GMT','EST','CST','MST','PST','CET','EET','IST','JST','KST','AEST','ACST','AWST','NZST','BRT','ART','SAST','WAT','MSK','GST','SGT','HKT','ChST','AKST','HST'].map(z => `<option value="${z}"></option>`).join('')}
      </datalist>`;
            } else if (type === 'language') {
                input = `<input type="text" class="var-input" list="var-language-list" data-var="${escapeAttr(v)}" placeholder="e.g. English, Spanish" value="${escapeAttr(def)}" />
      <datalist id="var-language-list">
        ${['English','Spanish','French','German','Italian','Portuguese','Dutch','Russian','Mandarin Chinese','Japanese','Korean','Arabic','Hindi','Bengali','Turkish','Vietnamese','Polish','Ukrainian','Swedish','Greek','Hebrew','Thai','Indonesian','Tagalog','Swahili'].map(l => `<option value="${l}"></option>`).join('')}
      </datalist>`;
            } else if (type === 'tags') {"""
assert content.count(old5) == 1, f'old5 found {content.count(old5)} times'
content = content.replace(old5, new5, 1)

# 6. Remove the now-dead _PL_previewImageUrl helper and fix the stale comment above it
old6 = r"""    /* ---- New variable type interaction helpers (Tags / Toggle Group / Star Rating / Checklist / Image URL / Range) ---- */
    window._PL_previewImageUrl = function(input) {
        const wrap = input.parentElement.querySelector('.var-imageurl-preview');
        if (!wrap) return;
        const img = wrap.querySelector('img');
        if (input.value.trim()) {
            img.src = input.value.trim();
            wrap.style.display = 'block';
        } else {
            wrap.style.display = 'none';
        }
    };

    window._PL_addTagKey = function(evt, input) {"""
new6 = r"""    /* ---- Variable type interaction helpers (Tags / Toggle Group / Star Rating / Checklist / Range) ---- */
    window._PL_addTagKey = function(evt, input) {"""
assert content.count(old6) == 1, f'old6 found {content.count(old6)} times'
content = content.replace(old6, new6, 1)

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print('OK')
```

- [ ] **Step 2: Run it**

```bash
python3 _scratch_task1.py
```
Expected: `OK`

- [ ] **Step 3: Update the CSS**

In `static/app.css`, use the Edit tool for these three changes:

Change the stale comment header:
- Old: `  /* ---- New variable type widgets (Tags / Checklist / Toggle Group / Star Rating / Image URL) ---- */`
- New: `  /* ---- Variable type widgets (Tags / Checklist / Toggle Group / Star Rating) ---- */`

Remove the now-dead image-url preview rule:
- Old: `  .var-imageurl-preview img { display: block; object-fit: cover; }\n\n`
- New: `` (delete the line and its trailing blank line)

Drop `.var-markdown` from the monospace rule:
- Old: `  .var-code, .var-markdown { font-family: var(--ff-mono); }`
- New: `  .var-code { font-family: var(--ff-mono); }`

- [ ] **Step 4: Verify syntax, cache-bust, clean up**

```bash
node --check static/app.js
python3 -m py_compile app.py
rm _scratch_task1.py
python3 update_hash.py
```
Expected: `node --check` and `py_compile` print nothing and exit 0.
`update_hash.py` reports a new hash written.

- [ ] **Step 5: Manual smoke test**

Start the app (`start.bat` or `python3 Main.py`). Open any prompt with a
`[[variable]]` in its content, open the variable editor, confirm the type
dropdown no longer lists Markdown/Percentage/File Path/Image URL and does
list Duration/Timezone/Language. Set one variable's type to Duration, save,
reopen the prompt to fill variables, confirm the Duration field renders
with its datalist suggestions and the typed value round-trips after save.

- [ ] **Step 6: Commit**

```bash
git add static/app.js static/app.css static/index.html
git commit -m "$(cat <<'EOF'
feat: remove Markdown variable type, add Duration/Timezone/Language

Drops the low-value Markdown/Percentage/File Path/Image URL variable
types and replaces the Input group's trio with Duration, Timezone,
and Language — free-text inputs backed by a suggestions datalist.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Toggle Group multi-select

**Files:**
- Modify: `static/app.js` (render switch ~L1485-1491, `_PL_selectToggle`
  ~L1661-1670, var-meta-fields template ~L2682-2689, `PL_onVarTypeChange`
  ~L2698-2707, `collectVarMeta` ~L2709-2730)
- Modify: `static/app.css`

**Interfaces:**
- Consumes: nothing from Task 1 or Task 3 (disjoint regions of the same
  functions — see plan notes).
- Produces: `entry.multi` (boolean) inside the object `collectVarMeta()`
  returns for a `togglegroup` variable. `_PL_selectToggle(btn)` keeps its
  existing signature; behavior now branches on
  `btn.closest('.var-toggle-group').dataset.multi === '1'`.

- [ ] **Step 1: Write the edit script**

Create `_scratch_task2.py` at the repo root with the Write tool:

```python
path = 'static/app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Render switch: multi-aware Toggle Group
old1 = r"""            } else if (type === 'togglegroup' && opts.length) {
                input = `<div class="var-toggle-group" data-var="${escapeAttr(v)}">
        ${opts.map(o => `<span class="chip var-toggle-btn${def===o?' active':''}" data-value="${escapeAttr(o)}" onclick="window._PL_selectToggle(this)">${escapeHtml(o)}</span>`).join('')}
        <input type="hidden" class="var-input var-toggle-hidden" data-var="${escapeAttr(v)}" value="${escapeAttr(def)}" />
      </div>`;
            } else if (type === 'togglegroup') {"""
new1 = r"""            } else if (type === 'togglegroup' && opts.length) {
                const isMulti = !!m.multi;
                const activeVals = isMulti ? (def ? def.split(',').map(s => s.trim()) : []) : [def];
                input = `<div class="var-toggle-group" data-var="${escapeAttr(v)}" data-multi="${isMulti ? '1' : '0'}">
        ${opts.map(o => `<span class="chip var-toggle-btn${activeVals.includes(o)?' active':''}" data-value="${escapeAttr(o)}" onclick="window._PL_selectToggle(this)">${escapeHtml(o)}</span>`).join('')}
        <input type="hidden" class="var-input var-toggle-hidden" data-var="${escapeAttr(v)}" value="${escapeAttr(def)}" />
      </div>`;
            } else if (type === 'togglegroup') {"""
assert content.count(old1) == 1, f'old1 found {content.count(old1)} times'
content = content.replace(old1, new1, 1)

# 2. _PL_selectToggle: branch on multi
old2 = r"""    window._PL_selectToggle = function(btn) {
        const group = btn.closest('.var-toggle-group');
        group.querySelectorAll('.var-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const hidden = group.querySelector('.var-toggle-hidden');
        hidden.value = btn.dataset.value;
        hidden.dispatchEvent(new Event('input', {
            bubbles: true
        }));
    };"""
new2 = r"""    window._PL_selectToggle = function(btn) {
        const group = btn.closest('.var-toggle-group');
        const hidden = group.querySelector('.var-toggle-hidden');
        if (group.dataset.multi === '1') {
            btn.classList.toggle('active');
            const active = Array.from(group.querySelectorAll('.var-toggle-btn.active')).map(b => b.dataset.value);
            hidden.value = active.join(', ');
        } else {
            group.querySelectorAll('.var-toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            hidden.value = btn.dataset.value;
        }
        hidden.dispatchEvent(new Event('input', {
            bubbles: true
        }));
    };"""
assert content.count(old2) == 1, f'old2 found {content.count(old2)} times'
content = content.replace(old2, new2, 1)

# 3. var-meta-fields template: add the "Allow multiple selections" checkbox
old3 = r"""        <div class="paragraph-size" style="display: ${type === 'paragraph' ? 'flex' : 'none'}; gap: 8px; align-items: center; margin-top: 4px;">
          <span style="font-size: 11px; color: var(--ink-3);">Size:</span>
          <select data-field="size" style="font-size: 12px; padding: 4px 8px;">
            <option value="short"  ${size === 'short'  ? 'selected' : ''}>Short (3 rows)</option>
            <option value="medium" ${size === 'medium' ? 'selected' : ''}>Medium (6 rows)</option>
            <option value="tall"   ${size === 'tall'   ? 'selected' : ''}>Tall (10 rows)</option>
          </select>
        </div>
        <div class="dropdown-options" style="display: ${needsOptions ? 'block' : 'none'};">"""
new3 = r"""        <div class="paragraph-size" style="display: ${type === 'paragraph' ? 'flex' : 'none'}; gap: 8px; align-items: center; margin-top: 4px;">
          <span style="font-size: 11px; color: var(--ink-3);">Size:</span>
          <select data-field="size" style="font-size: 12px; padding: 4px 8px;">
            <option value="short"  ${size === 'short'  ? 'selected' : ''}>Short (3 rows)</option>
            <option value="medium" ${size === 'medium' ? 'selected' : ''}>Medium (6 rows)</option>
            <option value="tall"   ${size === 'tall'   ? 'selected' : ''}>Tall (10 rows)</option>
          </select>
        </div>
        <div class="togglegroup-multi" style="display: ${type === 'togglegroup' ? 'flex' : 'none'}; gap: 8px; align-items: center; margin-top: 4px;">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink-2);cursor:pointer;">
            <input type="checkbox" data-field="multi" ${m.multi ? 'checked' : ''} />
            Allow multiple selections
          </label>
        </div>
        <div class="dropdown-options" style="display: ${needsOptions ? 'block' : 'none'};">"""
assert content.count(old3) == 1, f'old3 found {content.count(old3)} times'
content = content.replace(old3, new3, 1)

# 4. PL_onVarTypeChange: toggle the new checkbox row's visibility
old4 = r"""        const sizeRow = row.querySelector('.paragraph-size');
        const pill = row.querySelector('.var-meta-type-pill');
        if (opts) opts.style.display = OPTIONS_TYPES.includes(sel.value) ? 'block' : 'none';
        if (sizeRow) sizeRow.style.display = sel.value === 'paragraph' ? 'flex' : 'none';
        if (pill) pill.textContent = sel.value;
    };"""
new4 = r"""        const sizeRow = row.querySelector('.paragraph-size');
        const multiRow = row.querySelector('.togglegroup-multi');
        const pill = row.querySelector('.var-meta-type-pill');
        if (opts) opts.style.display = OPTIONS_TYPES.includes(sel.value) ? 'block' : 'none';
        if (sizeRow) sizeRow.style.display = sel.value === 'paragraph' ? 'flex' : 'none';
        if (multiRow) multiRow.style.display = sel.value === 'togglegroup' ? 'flex' : 'none';
        if (pill) pill.textContent = sel.value;
    };"""
assert content.count(old4) == 1, f'old4 found {content.count(old4)} times'
content = content.replace(old4, new4, 1)

# 5. collectVarMeta: save the multi flag
old5 = r"""            const sizeEl = row.querySelector('[data-field="size"]');
            const entry = {
                type,
                default: def,
                visible,
                options
            };
            if (type === 'paragraph' && sizeEl) entry.size = sizeEl.value;
            meta[v] = entry;"""
new5 = r"""            const sizeEl = row.querySelector('[data-field="size"]');
            const multiEl = row.querySelector('[data-field="multi"]');
            const entry = {
                type,
                default: def,
                visible,
                options
            };
            if (type === 'paragraph' && sizeEl) entry.size = sizeEl.value;
            if (type === 'togglegroup' && multiEl) entry.multi = multiEl.checked;
            meta[v] = entry;"""
assert content.count(old5) == 1, f'old5 found {content.count(old5)} times'
content = content.replace(old5, new5, 1)

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print('OK')
```

- [ ] **Step 2: Run it**

```bash
python3 _scratch_task2.py
```
Expected: `OK`

- [ ] **Step 3: Verify syntax, cache-bust, clean up**

```bash
node --check static/app.js
rm _scratch_task2.py
python3 update_hash.py
```
Expected: `node --check` prints nothing and exits 0. `update_hash.py` reports
a new hash written.

- [ ] **Step 4: Manual smoke test**

Open a prompt, add a variable, set its type to Toggle Group, add options
(e.g. `Red, Green, Blue`), check "Allow multiple selections," save. Open
the fill-variables view, click two chips, confirm both stay active (not
exclusive), save the filled values, reopen and confirm both selections
persisted. Then uncheck "Allow multiple selections" on a different
Toggle Group variable and confirm it goes back to single-select (clicking
a second chip deselects the first).

- [ ] **Step 5: Commit**

```bash
git add static/app.js static/app.css
git commit -m "$(cat <<'EOF'
feat: add multi-select mode to the Toggle Group variable type

Adds an "Allow multiple selections" checkbox to Toggle Group's
options editor. When on, _PL_selectToggle toggles chips independently
and stores a comma-joined value instead of replacing the selection —
existing single-select Toggle Group variables are unaffected.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Five new Advanced choice types

**Files:**
- Modify: `static/app.js` (type dropdown ~L2675-2678, typeIcon map, both
  `OPTIONS_TYPES` declarations ~L2608 and ~L2699, render switch after the
  `rating` branch ~L1511, new helper functions near `_PL_selectStar`
  ~L1687, delegated `input` listener near the existing range listener
  ~L1710)
- Modify: `static/app.css`

**Interfaces:**
- Consumes: nothing from Task 1/2 (disjoint regions — see Global
  Constraints; safe to do this task before or after them).
- Produces: variable types `rangeslider`, `rankedlist`, `iconpicker`,
  `matrix`, `emojipicker`. New globals: `window._PL_selectIcon(el)`,
  `window._PL_selectEmoji(el)`, `window._PL_selectMatrixCell(el)`,
  `window._PL_rankDragStart(evt)`, `window._PL_rankDragOver(evt)`,
  `window._PL_rankDrop(evt)`.

- [ ] **Step 1: Write the edit script**

Create `_scratch_task3.py` at the repo root with the Write tool:

```python
path = 'static/app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add the five types to the Advanced optgroup
old1 = r"""            <optgroup label="Advanced">
            <option value="slider"    ${type === 'slider'    ? 'selected' : ''}>Slider</option>
            <option value="rating"    ${type === 'rating'    ? 'selected' : ''}>Star Rating</option>
            </optgroup>"""
new1 = r"""            <optgroup label="Advanced">
            <option value="slider"      ${type === 'slider'      ? 'selected' : ''}>Slider</option>
            <option value="rating"      ${type === 'rating'      ? 'selected' : ''}>Star Rating</option>
            <option value="rangeslider" ${type === 'rangeslider' ? 'selected' : ''}>Range Slider (min-max)</option>
            <option value="rankedlist"  ${type === 'rankedlist'  ? 'selected' : ''}>Ranked List</option>
            <option value="iconpicker"  ${type === 'iconpicker'  ? 'selected' : ''}>Icon Picker</option>
            <option value="matrix"      ${type === 'matrix'      ? 'selected' : ''}>Matrix / Likert Grid</option>
            <option value="emojipicker" ${type === 'emojipicker' ? 'selected' : ''}>Emoji Picker</option>
            </optgroup>"""
assert content.count(old1) == 1, f'old1 found {content.count(old1)} times'
content = content.replace(old1, new1, 1)

# 2. typeIcon map entries
old2 = r"""            range: 'stacked_line_chart',
            slider: 'linear_scale',
            rating: 'star'
        };"""
new2 = r"""            range: 'stacked_line_chart',
            slider: 'linear_scale',
            rating: 'star',
            rangeslider: 'linear_scale',
            rankedlist: 'reorder',
            iconpicker: 'category',
            matrix: 'grid_on',
            emojipicker: 'mood'
        };"""
assert content.count(old2) == 1, f'old2 found {content.count(old2)} times'
content = content.replace(old2, new2, 1)

# 3. Both OPTIONS_TYPES declarations need 'rankedlist' and 'matrix' (they use an options list)
old3 = r"""const OPTIONS_TYPES = ['dropdown', 'multiselect', 'radio', 'choicechips', 'checkbox', 'togglegroup'];"""
new3 = r"""const OPTIONS_TYPES = ['dropdown', 'multiselect', 'radio', 'choicechips', 'checkbox', 'togglegroup', 'rankedlist', 'matrix'];"""
assert content.count(old3) == 2, f'old3 found {content.count(old3)} times, expected 2'
content = content.replace(old3, new3)

# 4. Render switch: insert the five new branches after the rating branch, before the final else
old4 = r"""            } else if (type === 'rating') {
                const ratingVal = parseInt(def, 10) || 0;
                input = `<div class="var-star-rating" data-var="${escapeAttr(v)}">
        ${[1,2,3,4,5].map(n => `<span class="material-symbols-outlined var-star${n<=ratingVal?' filled':''}" data-value="${n}" onclick="window._PL_selectStar(this)" style="cursor:pointer;font-size:22px;color:${n<=ratingVal?'var(--accent)':'var(--ink-3)'};">${n<=ratingVal?'star':'star_outline'}</span>`).join('')}
        <input type="hidden" class="var-input var-star-hidden" data-var="${escapeAttr(v)}" value="${escapeAttr(def)}" />
      </div>`;
            } else {"""
new4 = r"""            } else if (type === 'rating') {
                const ratingVal = parseInt(def, 10) || 0;
                input = `<div class="var-star-rating" data-var="${escapeAttr(v)}">
        ${[1,2,3,4,5].map(n => `<span class="material-symbols-outlined var-star${n<=ratingVal?' filled':''}" data-value="${n}" onclick="window._PL_selectStar(this)" style="cursor:pointer;font-size:22px;color:${n<=ratingVal?'var(--accent)':'var(--ink-3)'};">${n<=ratingVal?'star':'star_outline'}</span>`).join('')}
        <input type="hidden" class="var-input var-star-hidden" data-var="${escapeAttr(v)}" value="${escapeAttr(def)}" />
      </div>`;
            } else if (type === 'rangeslider') {
                const [rsMinRaw, rsMaxRaw] = def ? def.split(',').map(s => s.trim()) : ['25', '75'];
                const rsMin = rsMinRaw || '25', rsMax = rsMaxRaw || '75';
                input = `<div class="var-rangeslider" data-var="${escapeAttr(v)}">
        <div class="var-rangeslider-track">
          <input type="range" class="var-rangeslider-min" min="0" max="100" value="${escapeAttr(rsMin)}" />
          <input type="range" class="var-rangeslider-max" min="0" max="100" value="${escapeAttr(rsMax)}" />
        </div>
        <div class="var-rangeslider-labels"><span class="var-rangeslider-min-label">${escapeHtml(rsMin)}</span><span class="var-rangeslider-max-label">${escapeHtml(rsMax)}</span></div>
        <input type="hidden" class="var-input var-rangeslider-hidden" data-var="${escapeAttr(v)}" value="${escapeAttr(rsMin)}, ${escapeAttr(rsMax)}" />
      </div>`;
            } else if (type === 'rankedlist' && opts.length) {
                const order = def ? def.split(',').map(s => s.trim()).filter(o => opts.includes(o)) : [];
                const finalOrder = order.length ? order.concat(opts.filter(o => !order.includes(o))) : opts;
                input = `<div class="var-ranked-list" data-var="${escapeAttr(v)}">
        ${finalOrder.map((o, i) => `<div class="var-ranked-item" draggable="true" data-value="${escapeAttr(o)}" ondragstart="window._PL_rankDragStart(event)" ondragover="window._PL_rankDragOver(event)" ondrop="window._PL_rankDrop(event)"><span class="var-ranked-num">${i + 1}</span><span class="material-symbols-outlined var-ranked-handle">drag_indicator</span><span class="var-ranked-label">${escapeHtml(o)}</span></div>`).join('')}
        <input type="hidden" class="var-input var-ranked-hidden" data-var="${escapeAttr(v)}" value="${escapeAttr(finalOrder.join(', '))}" />
      </div>`;
            } else if (type === 'rankedlist') {
                input = `<p style="font-size:12px;color:var(--ink-3);">Add options in the variable editor to rank them.</p>`;
            } else if (type === 'iconpicker') {
                const ICON_CHOICES = ['rocket_launch','lightbulb','target','flag','star','bolt','favorite','psychology','trending_up','build','auto_awesome','emoji_objects','shield','diamond','local_fire_department','eco'];
                input = `<div class="var-icon-picker" data-var="${escapeAttr(v)}">
        ${ICON_CHOICES.map(ic => `<span class="material-symbols-outlined var-icon-choice${def===ic?' active':''}" data-value="${ic}" onclick="window._PL_selectIcon(this)">${ic}</span>`).join('')}
        <input type="hidden" class="var-input var-icon-hidden" data-var="${escapeAttr(v)}" value="${escapeAttr(def)}" />
      </div>`;
            } else if (type === 'matrix' && opts.length) {
                const MATRIX_COLS = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
                let matrixVal = {};
                try { matrixVal = def ? JSON.parse(def) : {}; } catch (e) { matrixVal = {}; }
                input = `<div class="var-matrix" data-var="${escapeAttr(v)}">
        <div class="var-matrix-header"><span></span>${MATRIX_COLS.map(c => `<span class="var-matrix-col-label">${escapeHtml(c)}</span>`).join('')}</div>
        ${opts.map(row => `<div class="var-matrix-row" data-row="${escapeAttr(row)}">
          <span class="var-matrix-row-label">${escapeHtml(row)}</span>
          ${MATRIX_COLS.map((c, ci) => `<span class="var-matrix-cell${matrixVal[row]===ci?' active':''}" data-col="${ci}" onclick="window._PL_selectMatrixCell(this)"></span>`).join('')}
        </div>`).join('')}
        <input type="hidden" class="var-input var-matrix-hidden" data-var="${escapeAttr(v)}" value='${escapeAttr(JSON.stringify(matrixVal))}' />
      </div>`;
            } else if (type === 'matrix') {
                input = `<p style="font-size:12px;color:var(--ink-3);">Add row items (options) in the variable editor to build the grid.</p>`;
            } else if (type === 'emojipicker') {
                const EMOJI_CHOICES = ['😀','😊','😎','🤔','😅','🥳','😴','🔥','✨','💡','🚀','⭐','❤️','👍','👎','🎯','📈','📉','⚡','🌟','🎉','🙌','💬','📝','✅','❌','⏰','🌈'];
                input = `<div class="var-emoji-picker" data-var="${escapeAttr(v)}">
        ${EMOJI_CHOICES.map(em => `<span class="var-emoji-choice${def===em?' active':''}" data-value="${em}" onclick="window._PL_selectEmoji(this)">${em}</span>`).join('')}
        <input type="hidden" class="var-input var-emoji-hidden" data-var="${escapeAttr(v)}" value="${escapeAttr(def)}" />
      </div>`;
            } else {"""
assert content.count(old4) == 1, f'old4 found {content.count(old4)} times'
content = content.replace(old4, new4, 1)

# 5. New interaction helpers, right after _PL_selectStar
old5 = r"""    window._PL_selectStar = function(star) {
        const wrap = star.closest('.var-star-rating');
        const val = parseInt(star.dataset.value, 10);
        const hidden = wrap.querySelector('.var-star-hidden');
        hidden.value = String(val);
        wrap.querySelectorAll('.var-star').forEach(s => {
            const n = parseInt(s.dataset.value, 10);
            const filled = n <= val;
            s.textContent = filled ? 'star' : 'star_outline';
            s.classList.toggle('filled', filled);
            s.style.color = filled ? 'var(--accent)' : 'var(--ink-3)';
        });
        hidden.dispatchEvent(new Event('input', {
            bubbles: true
        }));
    };"""
new5 = r"""    window._PL_selectStar = function(star) {
        const wrap = star.closest('.var-star-rating');
        const val = parseInt(star.dataset.value, 10);
        const hidden = wrap.querySelector('.var-star-hidden');
        hidden.value = String(val);
        wrap.querySelectorAll('.var-star').forEach(s => {
            const n = parseInt(s.dataset.value, 10);
            const filled = n <= val;
            s.textContent = filled ? 'star' : 'star_outline';
            s.classList.toggle('filled', filled);
            s.style.color = filled ? 'var(--accent)' : 'var(--ink-3)';
        });
        hidden.dispatchEvent(new Event('input', {
            bubbles: true
        }));
    };

    window._PL_selectIcon = function(el) {
        const wrap = el.closest('.var-icon-picker');
        wrap.querySelectorAll('.var-icon-choice').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
        const hidden = wrap.querySelector('.var-icon-hidden');
        hidden.value = el.dataset.value;
        hidden.dispatchEvent(new Event('input', { bubbles: true }));
    };

    window._PL_selectEmoji = function(el) {
        const wrap = el.closest('.var-emoji-picker');
        wrap.querySelectorAll('.var-emoji-choice').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
        const hidden = wrap.querySelector('.var-emoji-hidden');
        hidden.value = el.dataset.value;
        hidden.dispatchEvent(new Event('input', { bubbles: true }));
    };

    window._PL_selectMatrixCell = function(el) {
        const wrap = el.closest('.var-matrix');
        const row = el.closest('.var-matrix-row');
        const rowKey = row.dataset.row;
        const col = parseInt(el.dataset.col, 10);
        row.querySelectorAll('.var-matrix-cell').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        const hidden = wrap.querySelector('.var-matrix-hidden');
        let val = {};
        try { val = hidden.value ? JSON.parse(hidden.value) : {}; } catch (e) { val = {}; }
        val[rowKey] = col;
        hidden.value = JSON.stringify(val);
        hidden.dispatchEvent(new Event('input', { bubbles: true }));
    };

    let _rankDragEl = null;
    window._PL_rankDragStart = function(evt) {
        _rankDragEl = evt.target.closest('.var-ranked-item');
        evt.dataTransfer.effectAllowed = 'move';
    };
    window._PL_rankDragOver = function(evt) {
        evt.preventDefault();
    };
    window._PL_rankDrop = function(evt) {
        evt.preventDefault();
        const target = evt.target.closest('.var-ranked-item');
        if (!target || !_rankDragEl || target === _rankDragEl) return;
        const list = target.closest('.var-ranked-list');
        const items = Array.from(list.querySelectorAll('.var-ranked-item'));
        const dragIdx = items.indexOf(_rankDragEl);
        const dropIdx = items.indexOf(target);
        if (dragIdx < dropIdx) target.after(_rankDragEl);
        else target.before(_rankDragEl);
        list.querySelectorAll('.var-ranked-item').forEach((el, i) => {
            el.querySelector('.var-ranked-num').textContent = i + 1;
        });
        const hidden = list.querySelector('.var-ranked-hidden');
        hidden.value = Array.from(list.querySelectorAll('.var-ranked-item')).map(el => el.dataset.value).join(', ');
        hidden.dispatchEvent(new Event('input', { bubbles: true }));
        _rankDragEl = null;
    };"""
assert content.count(old5) == 1, f'old5 found {content.count(old5)} times'
content = content.replace(old5, new5, 1)

# 6. Delegated 'input' listener for the range-slider drag handles
old6 = r"""    document.addEventListener('input', function(evt) {
        if (evt.target.classList && (evt.target.classList.contains('var-range-min') || evt.target.classList.contains('var-range-max'))) {
            const container = evt.target.parentElement;
            const minEl = container.querySelector('.var-range-min');
            const maxEl = container.querySelector('.var-range-max');
            const hidden = container.querySelector('.var-range-hidden');
            hidden.value = (minEl.value || '') + ', ' + (maxEl.value || '');
        }
    });"""
new6 = r"""    document.addEventListener('input', function(evt) {
        if (evt.target.classList && (evt.target.classList.contains('var-range-min') || evt.target.classList.contains('var-range-max'))) {
            const container = evt.target.parentElement;
            const minEl = container.querySelector('.var-range-min');
            const maxEl = container.querySelector('.var-range-max');
            const hidden = container.querySelector('.var-range-hidden');
            hidden.value = (minEl.value || '') + ', ' + (maxEl.value || '');
        }
    });
    document.addEventListener('input', function(evt) {
        if (evt.target.classList && (evt.target.classList.contains('var-rangeslider-min') || evt.target.classList.contains('var-rangeslider-max'))) {
            const wrap = evt.target.closest('.var-rangeslider');
            const minEl = wrap.querySelector('.var-rangeslider-min');
            const maxEl = wrap.querySelector('.var-rangeslider-max');
            if (parseInt(minEl.value, 10) > parseInt(maxEl.value, 10)) {
                if (evt.target === minEl) minEl.value = maxEl.value;
                else maxEl.value = minEl.value;
            }
            wrap.querySelector('.var-rangeslider-min-label').textContent = minEl.value;
            wrap.querySelector('.var-rangeslider-max-label').textContent = maxEl.value;
            const hidden = wrap.querySelector('.var-rangeslider-hidden');
            hidden.value = minEl.value + ', ' + maxEl.value;
            hidden.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });"""
assert content.count(old6) == 1, f'old6 found {content.count(old6)} times'
content = content.replace(old6, new6, 1)

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print('OK')
```

- [ ] **Step 2: Run it**

```bash
python3 _scratch_task3.py
```
Expected: `OK`

- [ ] **Step 3: Add the CSS**

In `static/app.css`, use the Edit tool to append after the
`.var-code { font-family: var(--ff-mono); }` rule from Task 1 (or any
clearly-separate location — this is a brand-new class namespace):

```css
  /* ---- Advanced variable type widgets (Range Slider / Ranked List / Icon Picker / Matrix / Emoji Picker) ---- */
  .var-rangeslider-track { position: relative; height: 22px; }
  .var-rangeslider-track input[type="range"] {
    position: absolute; top: 0; left: 0; width: 100%; margin: 0;
    -webkit-appearance: none; background: transparent; pointer-events: none;
  }
  .var-rangeslider-track input[type="range"]::-webkit-slider-thumb { pointer-events: auto; }
  .var-rangeslider-track input[type="range"]::-moz-range-thumb { pointer-events: auto; }
  .var-rangeslider-labels { display: flex; justify-content: space-between; font-size: 12px; color: var(--ink-2); margin-top: 4px; }

  .var-ranked-list { display: flex; flex-direction: column; gap: 4px; }
  .var-ranked-item {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 10px; border: 1px solid var(--line); border-radius: 6px;
    background: var(--surface); cursor: grab; font-size: 13px; color: var(--ink-2);
  }
  .var-ranked-item:active { cursor: grabbing; }
  .var-ranked-num { font-weight: 700; color: var(--ink-3); min-width: 16px; }
  .var-ranked-handle { font-size: 16px; color: var(--ink-4); }

  .var-icon-picker, .var-emoji-picker { display: flex; flex-wrap: wrap; gap: 6px; }
  .var-icon-choice, .var-emoji-choice {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border: 1px solid var(--line); border-radius: 6px;
    cursor: pointer; font-size: 18px; background: var(--surface);
  }
  .var-icon-choice.active, .var-emoji-choice.active { border-color: var(--accent); background: var(--accent-soft); }

  .var-matrix { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
  .var-matrix-header, .var-matrix-row { display: grid; grid-template-columns: 1fr repeat(5, 32px); align-items: center; gap: 4px; }
  .var-matrix-col-label { text-align: center; color: var(--ink-3); font-size: 10px; }
  .var-matrix-row-label { color: var(--ink-2); }
  .var-matrix-cell {
    width: 18px; height: 18px; margin: 0 auto; border: 1px solid var(--line);
    border-radius: 50%; cursor: pointer; display: block;
  }
  .var-matrix-cell.active { background: var(--accent); border-color: var(--accent); }
```

- [ ] **Step 4: Verify syntax, cache-bust, clean up**

```bash
node --check static/app.js
rm _scratch_task3.py
python3 update_hash.py
```
Expected: `node --check` prints nothing and exits 0. `update_hash.py`
reports a new hash written.

- [ ] **Step 5: Manual smoke test**

For each of the five new types, add one variable of that type to a
prompt's content, open the variable editor, set its type, and (for
Ranked List and Matrix) add a few comma-separated options. Save, then
open the fill-variables view and confirm each widget renders and is
interactive: drag the range-slider handles, drag-reorder the ranked
list, click an icon, click a matrix cell, click an emoji. Save the
filled prompt and reopen it to confirm each value round-tripped.

- [ ] **Step 6: Commit**

```bash
git add static/app.js static/app.css
git commit -m "$(cat <<'EOF'
feat: add five new Advanced variable types

Range Slider (dual-handle min/max), Ranked List (drag to reorder),
Icon Picker, Matrix/Likert Grid, and Emoji Picker join Slider and
Star Rating in the Advanced group. All store into the existing
variable_meta JSON shape — no schema change.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Backend heuristic parser endpoint

**Files:**
- Modify: `app.py` (new route, immediately after `import_json()`,
  ~L2110)

**Interfaces:**
- Consumes: nothing (uses existing `_json_body()` helper).
- Produces: `POST /api/import/parse-raw` → `{"candidates": [{"title": str,
  "content": str}, ...]}`. Never writes to the database.

- [ ] **Step 1: Add the route**

In `app.py`, use the Edit tool. Old anchor (the end of `import_json()`):

```python
            imported += 1
        conn.commit()
    finally:
        conn.close()
    return jsonify({'imported': imported})

# ============================================================
#  ROLES  –  AI persona / system prompt manager
# ============================================================
```

New:

```python
            imported += 1
        conn.commit()
    finally:
        conn.close()
    return jsonify({'imported': imported})

@app.route('/api/import/parse-raw', methods=['POST'])
def parse_raw_import():
    """Heuristically split an unformatted text blob into candidate prompts.
    Body: {text: '...'}. Returns {candidates: [{title, content}, ...]}.
    Read-only — never writes to the database."""
    data = _json_body()
    text = (data.get('text') or '').strip() if isinstance(data, dict) else ''
    if not text:
        return jsonify({'candidates': []})

    def _split(pattern, s):
        parts = re.split(pattern, s)
        return [p.strip() for p in parts if p.strip()]

    blocks = _split(r'\n[-=]{3,}\n', text)
    if len(blocks) < 2:
        blocks = _split(r'\n{2,}', text)
    if len(blocks) < 2:
        blocks = _split(r'\n(?=\s*(?:\d+[.)]\s|Prompt\s+\d+|#{1,2}\s))', text)
    if not blocks:
        blocks = [text]

    candidates = []
    for block in blocks:
        lines = block.split('\n')
        title_line = ''
        rest_start = 0
        for i, line in enumerate(lines):
            if line.strip():
                title_line = line.strip()
                rest_start = i + 1
                break
        if not title_line:
            continue
        title = re.sub(
            r'^#{1,2}\s*|^\d+[.)]\s*|^Prompt\s+\d+:?\s*', '',
            title_line, flags=re.IGNORECASE
        ).strip()
        if len(title) > 80:
            title = title[:77].rstrip() + '...'
        content = '\n'.join(lines[rest_start:]).strip()
        if not content:
            continue
        candidates.append({'title': title, 'content': content})

    return jsonify({'candidates': candidates})

# ============================================================
#  ROLES  –  AI persona / system prompt manager
# ============================================================
```

- [ ] **Step 2: Verify syntax**

```bash
python3 -m py_compile app.py
```
Expected: no output, exit 0.

- [ ] **Step 3: Manual smoke test**

Start the app, then from another terminal:

```bash
curl -s -X POST http://127.0.0.1:5000/api/import/parse-raw \
  -H "Content-Type: application/json" \
  -d '{"text":"Cold Email Hook\nWrite a cold email to [[prospect_name]].\n\n---\n\nBlog Intro\nWrite an intro about [[topic]]."}'
```

(Replace the port with whatever `Main.py`/`start.bat` actually binds — check
its startup log or `app.py`'s `app.run(...)` call if unsure.)

Expected: `{"candidates": [{"title": "Cold Email Hook", "content": "Write a
cold email to [[prospect_name]]."}, {"title": "Blog Intro", "content":
"Write an intro about [[topic]]."}]}` (key order may vary). Also try an
empty body (`-d '{"text":""}'`) and confirm `{"candidates": []}`.

- [ ] **Step 4: Commit**

```bash
git add app.py
git commit -m "$(cat <<'EOF'
feat: add POST /api/import/parse-raw heuristic prompt splitter

Read-only endpoint that splits an unformatted pasted text blob into
candidate {title, content} prompts using --- /=== separators, blank-
line runs, or numbered/heading patterns as fallbacks in that order.
Backs the upcoming Smart Paste import tab; never writes to the DB.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Destination folder picker + Smart Paste import tab

**Files:**
- Modify: `static/index.html` (import modal ~L1550-1605)
- Modify: `static/app.js` (`_switchImportFmt` ~L3202-3217, `openImportModal`
  ~L3029-3034, `handleImport` ~L3291-3342, new helpers)
- Modify: `static/app.css`

**Interfaces:**
- Consumes: Task 4's `POST /api/import/parse-raw` (via
  `api('/import/parse-raw', {method:'POST', body:{text}})` →
  `{candidates: [{title, content}, ...]}`).
- Produces: `#importFolder` select in the DOM; `_applyBatchFolder(prompts)`
  helper (array in, array out, stamps `folder_id` onto entries that don't
  already have one); `window.PL_analyzeSmartPaste()`.

- [ ] **Step 1: Add the modal markup**

In `static/index.html`, use bash + Python `content.replace()` (same
hard-rule-1 process as `app.js` — write `_scratch_task5.py` with the
Write tool):

```python
path = 'static/index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old1 = r"""      <div class="modal-body">
        <div class="import-format-tabs">
          <button type="button" class="import-fmt-tab active" data-fmt="json">JSON</button>
          <button type="button" class="import-fmt-tab" data-fmt="markdown">Markdown</button>
          <button type="button" class="import-fmt-tab" data-fmt="file">Upload file</button>
          <button type="button" class="import-fmt-tab" data-fmt="template">Template</button>
        </div>"""
new1 = r"""      <div class="modal-body">
        <div class="form-group import-dest-folder">
          <label class="form-label" for="importFolder">Import into folder</label>
          <select id="importFolder" class="form-select"></select>
        </div>
        <div class="import-format-tabs">
          <button type="button" class="import-fmt-tab active" data-fmt="json">JSON</button>
          <button type="button" class="import-fmt-tab" data-fmt="markdown">Markdown</button>
          <button type="button" class="import-fmt-tab" data-fmt="file">Upload file</button>
          <button type="button" class="import-fmt-tab" data-fmt="template">Template</button>
          <button type="button" class="import-fmt-tab" data-fmt="smart">Paste (Smart)</button>
        </div>"""
assert content.count(old1) == 1, f'old1 found {content.count(old1)} times'
content = content.replace(old1, new1, 1)

old2 = r"""        <div id="importPanelTemplate" style="display:none;">
          <p class="import-template-note">Copy this template, paste it into Claude or ChatGPT with your prompts, and ask it to format them using this structure. Then paste the JSON output into the JSON tab above and click Import.</p>
          <div class="import-template-box" id="importTemplateBox"></div>
          <button type="button" class="btn btn-accent" style="width:100%;" onclick="window.PL_copyImportTemplate()">
            <span class="material-symbols-outlined">content_copy</span>
            Copy template to clipboard
          </button>
        </div>
      </div>
      <div class="modal-footer">"""
new2 = r"""        <div id="importPanelTemplate" style="display:none;">
          <p class="import-template-note">Copy this template, paste it into Claude or ChatGPT with your prompts, and ask it to format them using this structure. Then paste the JSON output into the JSON tab above and click Import.</p>
          <div class="import-template-box" id="importTemplateBox"></div>
          <button type="button" class="btn btn-accent" style="width:100%;" onclick="window.PL_copyImportTemplate()">
            <span class="material-symbols-outlined">content_copy</span>
            Copy template to clipboard
          </button>
        </div>
        <div id="importPanelSmart" style="display:none;">
          <div class="form-group">
            <label class="form-label" for="importSmartContent">Paste raw prompts (any format)</label>
            <textarea id="importSmartContent" class="form-textarea" rows="8" style="font-family: var(--ff-mono); font-size: 12px;" placeholder="Dump anything — numbered list, blank-line separated, or --- separated. No formatting required."></textarea>
          </div>
          <button type="button" class="btn btn-ghost" style="width:100%;margin-top:var(--sp-2);" onclick="window.PL_analyzeSmartPaste()">
            <span class="material-symbols-outlined">auto_fix_high</span>
            Find prompts
          </button>
          <div id="smartPasteResults" class="smart-paste-results"></div>
        </div>
      </div>
      <div class="modal-footer">"""
assert content.count(old2) == 1, f'old2 found {content.count(old2)} times'
content = content.replace(old2, new2, 1)

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print('OK')
```

Run it:

```bash
python3 _scratch_task5.py
grep -c "<script" static/index.html
```
Expected: `OK`, then `3` (confirms the file wasn't truncated, per
`CLAUDE.md`'s triage checklist).

- [ ] **Step 2: Wire up the JS**

Create `_scratch_task5b.py` at the repo root with the Write tool:

```python
path = 'static/app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. _switchImportFmt: register the new panel
old1 = r"""        const panels = {
            json: '#importPanelJson',
            markdown: '#importPanelMarkdown',
            file: '#importPanelFile',
            template: '#importPanelTemplate'
        };"""
new1 = r"""        const panels = {
            json: '#importPanelJson',
            markdown: '#importPanelMarkdown',
            file: '#importPanelFile',
            template: '#importPanelTemplate',
            smart: '#importPanelSmart'
        };"""
assert content.count(old1) == 1, f'old1 found {content.count(old1)} times'
content = content.replace(old1, new1, 1)

# 2. openImportModal: populate the folder select and reset Smart Paste state
old2 = r"""    let _importFmt = 'json';

    function openImportModal() {
        $('#importForm').reset();
        _importFmt = 'json';
        _switchImportFmt('json');
        $('#importModal').classList.add('active');
    }"""
new2 = r"""    let _importFmt = 'json';
    let _smartPasteCandidates = [];

    function openImportModal() {
        $('#importForm').reset();
        _importFmt = 'json';
        _switchImportFmt('json');
        const fsel = $('#importFolder');
        if (fsel) {
            fsel.innerHTML = '<option value="">No folder</option>' +
                state.folders.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');
        }
        _smartPasteCandidates = [];
        const results = $('#smartPasteResults');
        if (results) results.innerHTML = '';
        $('#importModal').classList.add('active');
    }

    function _applyBatchFolder(prompts) {
        const folderId = $('#importFolder')?.value || '';
        if (!folderId) return prompts;
        return prompts.map(p => ({
            ...p,
            folder_id: (p.folder_id !== undefined && p.folder_id !== null && p.folder_id !== '') ? p.folder_id : folderId
        }));
    }

    window.PL_analyzeSmartPaste = async function() {
        const raw = $('#importSmartContent').value.trim();
        const results = $('#smartPasteResults');
        if (!raw) {
            toast('Paste some text first', 'warning');
            return;
        }
        try {
            const res = await api('/import/parse-raw', { method: 'POST', body: { text: raw } });
            const candidates = res.candidates || [];
            if (!candidates.length) {
                results.innerHTML = '<p class="smart-paste-empty">No prompts detected. Check your paste.</p>';
                return;
            }
            results.innerHTML = `<p class="smart-paste-count">${candidates.length} prompt${candidates.length !== 1 ? 's' : ''} found</p>` +
                candidates.map(c => `
        <div class="smart-paste-item" data-content="${escapeAttr(c.content)}">
          <label class="smart-paste-item-head">
            <input type="checkbox" class="smart-paste-include" checked />
            <input type="text" class="smart-paste-title" value="${escapeAttr(c.title)}" />
          </label>
          <details class="smart-paste-excerpt">
            <summary>Preview</summary>
            <pre>${escapeHtml(c.content.slice(0, 400))}${c.content.length > 400 ? '…' : ''}</pre>
          </details>
        </div>`).join('');
        } catch (err) {
            toast('Could not analyze paste', 'error');
        }
    };"""
assert content.count(old2) == 1, f'old2 found {content.count(old2)} times'
content = content.replace(old2, new2, 1)

# 3. handleImport: apply the batch folder on every path, add the smart branch
old3 = r"""            if (_importFmt === 'json') {
                const raw = $('#importContent').value.trim();
                let prompts;
                try {
                    prompts = JSON.parse(raw);
                    if (!Array.isArray(prompts)) throw new Error();
                } catch {
                    toast('Invalid JSON — paste an array of prompt objects', 'warning');
                    return;
                }
                await _doImport(prompts);

            } else if (_importFmt === 'markdown') {
                const raw = $('#importMdContent').value.trim();
                if (!raw) {
                    toast('Paste some Markdown to import', 'warning');
                    return;
                }
                const prompts = parseMarkdownImport(raw);
                await _doImport(prompts);

            } else if (_importFmt === 'file') {
                const fileInput = $('#importFileInput');
                const file = fileInput?.files?.[0];
                if (!file) {
                    toast('Choose a file first', 'warning');
                    return;
                }
                const text = await file.text();
                let prompts;
                if (file.name.endsWith('.json')) {
                    try {
                        prompts = JSON.parse(text);
                        if (!Array.isArray(prompts)) throw new Error();
                    } catch {
                        toast('Invalid JSON file', 'warning');
                        return;
                    }
                } else {
                    // Markdown file
                    prompts = parseMarkdownImport(text);
                }
                await _doImport(prompts);
            }"""
new3 = r"""            if (_importFmt === 'json') {
                const raw = $('#importContent').value.trim();
                let prompts;
                try {
                    prompts = JSON.parse(raw);
                    if (!Array.isArray(prompts)) throw new Error();
                } catch {
                    toast('Invalid JSON — paste an array of prompt objects', 'warning');
                    return;
                }
                await _doImport(_applyBatchFolder(prompts));

            } else if (_importFmt === 'markdown') {
                const raw = $('#importMdContent').value.trim();
                if (!raw) {
                    toast('Paste some Markdown to import', 'warning');
                    return;
                }
                const prompts = parseMarkdownImport(raw);
                await _doImport(_applyBatchFolder(prompts));

            } else if (_importFmt === 'file') {
                const fileInput = $('#importFileInput');
                const file = fileInput?.files?.[0];
                if (!file) {
                    toast('Choose a file first', 'warning');
                    return;
                }
                const text = await file.text();
                let prompts;
                if (file.name.endsWith('.json')) {
                    try {
                        prompts = JSON.parse(text);
                        if (!Array.isArray(prompts)) throw new Error();
                    } catch {
                        toast('Invalid JSON file', 'warning');
                        return;
                    }
                } else {
                    // Markdown file
                    prompts = parseMarkdownImport(text);
                }
                await _doImport(_applyBatchFolder(prompts));

            } else if (_importFmt === 'smart') {
                const rows = $$('#smartPasteResults .smart-paste-item').filter(row => row.querySelector('.smart-paste-include').checked);
                if (!rows.length) {
                    toast('No prompts selected to import', 'warning');
                    return;
                }
                const prompts = rows.map(row => ({
                    title: row.querySelector('.smart-paste-title').value.trim(),
                    content: row.dataset.content
                }));
                await _doImport(_applyBatchFolder(prompts));
            }"""
assert content.count(old3) == 1, f'old3 found {content.count(old3)} times'
content = content.replace(old3, new3, 1)

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print('OK')
```

Run it:

```bash
python3 _scratch_task5b.py
```
Expected: `OK`

- [ ] **Step 3: Add the CSS**

In `static/app.css`, use the Edit tool to append:

```css
  /* ---- Import: destination folder + Smart Paste ---- */
  .import-dest-folder { margin-bottom: var(--sp-3); }
  .smart-paste-results { margin-top: var(--sp-3); display: flex; flex-direction: column; gap: 8px; }
  .smart-paste-count { font-size: 12px; color: var(--ink-3); margin: 0; }
  .smart-paste-empty { font-size: 12px; color: var(--ink-3); }
  .smart-paste-item { border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; }
  .smart-paste-item-head { display: flex; align-items: center; gap: 8px; cursor: default; }
  .smart-paste-title { flex: 1; font-size: 13px; padding: 4px 6px; border: 1px solid var(--line); border-radius: 4px; background: var(--surface); color: var(--ink); }
  .smart-paste-excerpt { margin-top: 6px; }
  .smart-paste-excerpt summary { font-size: 11px; color: var(--ink-3); cursor: pointer; }
  .smart-paste-excerpt pre { white-space: pre-wrap; font-size: 11px; color: var(--ink-2); margin-top: 4px; font-family: var(--ff-mono); }
```

- [ ] **Step 4: Verify syntax, cache-bust, clean up**

```bash
node --check static/app.js
python3 -m py_compile app.py
grep -c "<script" static/index.html
rm _scratch_task5.py _scratch_task5b.py
python3 update_hash.py
```
Expected: `node --check`/`py_compile` print nothing and exit 0; `grep -c`
prints `3`; `update_hash.py` reports a new hash written.

- [ ] **Step 5: Manual smoke test**

Start the app, open Import, confirm the folder select lists your folders
plus "No folder," and a fifth "Paste (Smart)" tab exists. Switch to it,
paste something unstructured like:

```
Cold Email Hook
Write a cold email to [[prospect_name]] at [[company]].

Blog Post Introduction
Write a compelling intro about [[topic]].
```

Click "Find prompts," confirm two candidates appear with editable titles
and expandable previews. Pick a destination folder, uncheck one candidate,
click Import, confirm only the checked one lands in that folder (check the
library view / that folder's contents). Then repeat with a JSON-tab import
with no `folder_id` in the payload and confirm it lands in whatever folder
is selected in the picker.

- [ ] **Step 6: Commit**

```bash
git add static/index.html static/app.js static/app.css
git commit -m "$(cat <<'EOF'
feat: add destination folder + Smart Paste tab to batch import

Import modal now has a folder picker applied to the whole batch
(existing per-item folder_id still wins if present), and a fifth
"Paste (Smart)" tab that hits the new parse-raw endpoint, previews
editable candidates, and commits through the existing import route.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Short custom-instructions template + parser hardening

**Files:**
- Modify: `static/app.js` (near `_MARKDOWN_TEMPLATE_TEXT` ~L3093,
  `parseMarkdownImport` ~L3231-3272)
- Modify: `static/index.html` (Markdown tab panel ~L1570-1579)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `_MARKDOWN_TEMPLATE_SHORT_TEXT` (string constant),
  `window.PL_copyMarkdownTemplateShort()`. `parseMarkdownImport(md)` keeps
  its existing signature (string in, array of `{title, description,
  content, categories, tags}` out) — behavior is more tolerant, not
  differently shaped.

- [ ] **Step 1: Write the app.js edit script**

Create `_scratch_task6.py` at the repo root with the Write tool:

```python
path = 'static/app.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add the short template constant + copy handler, right after the long template's copy handler
old1 = r"""    window.PL_copyMarkdownTemplate = async function() {
        try {
            await navigator.clipboard.writeText(_MARKDOWN_TEMPLATE_TEXT);
            toast('Markdown template copied — paste into your AI and send your prompts', 'success');
        } catch {
            toast('Copy failed', 'error');
        }
    };

    function _switchImportFmt(fmt) {"""
new1 = r"""    window.PL_copyMarkdownTemplate = async function() {
        try {
            await navigator.clipboard.writeText(_MARKDOWN_TEMPLATE_TEXT);
            toast('Markdown template copied — paste into your AI and send your prompts', 'success');
        } catch {
            toast('Copy failed', 'error');
        }
    };

    const _MARKDOWN_TEMPLATE_SHORT_TEXT = `Format each prompt like this, separated by "---" on its own line:

## Title (3-8 words, sentence case)
*One-sentence description, starts with a verb*
**Categories:** Comma, Separated
**Tags:** lowercase-hyphenated, 2-5 tags

\`\`\`
Full prompt text here. Use [[snake_case]] for any placeholder value,
e.g. [[company_name]], [[word_count]].
\`\`\`

---

Rules: no text outside this structure. If description/categories/tags
are missing from what I give you, infer them. Keep placeholders
lowercase with underscores. Return only the formatted Markdown, nothing else.`;

    window.PL_copyMarkdownTemplateShort = async function() {
        try {
            await navigator.clipboard.writeText(_MARKDOWN_TEMPLATE_SHORT_TEXT);
            toast('Short template copied — paste into your AI\u2019s custom instructions', 'success');
        } catch {
            toast('Copy failed', 'error');
        }
    };

    function _switchImportFmt(fmt) {"""
assert content.count(old1) == 1, f'old1 found {content.count(old1)} times'
content = content.replace(old1, new1, 1)

# 2. Harden parseMarkdownImport
old2 = r"""    function parseMarkdownImport(md) {
        const prompts = [];
        // Split on horizontal rules that separate prompts
        const blocks = md.split(/\n---+\n/);
        for (const block of blocks) {
            const lines = block.split('\n');
            let title = '',
                description = '',
                content = '',
                categories = '',
                tags = '';
            let inCode = false;
            const contentLines = [];

            for (const line of lines) {
                if (/^#{1,2}\s+/.test(line) && !inCode) {
                    title = line.replace(/^#{1,2}\s+/, '').trim();
                } else if (/^\*[^*].*[^*]\*$/.test(line.trim()) && !inCode && !title === false) {
                    description = line.trim().replace(/^\*|\*$/g, '').trim();
                } else if (/^\*\*Categories:\*\*/.test(line) && !inCode) {
                    categories = line.replace(/^\*\*Categories:\*\*/, '').trim();
                } else if (/^\*\*Tags:\*\*/.test(line) && !inCode) {
                    tags = line.replace(/^\*\*Tags:\*\*/, '').trim();
                } else if (line.trim() === '```') {
                    inCode = !inCode;
                } else if (inCode) {
                    contentLines.push(line);
                }
            }
            content = contentLines.join('\n').trim();
            if (title && content) {
                prompts.push({
                    title,
                    description,
                    content,
                    categories,
                    tags
                });
            }
        }
        return prompts;
    }"""
new2 = r"""    function parseMarkdownImport(md) {
        const prompts = [];
        // Normalise blank-line-padded separators, then split on --- or === rules
        const normalised = md.replace(/\n{2,}([-=]{3,})\n{2,}/g, '\n$1\n');
        const blocks = normalised.split(/\n[-=]{3,}\n/);
        for (const block of blocks) {
            const lines = block.split('\n');
            let title = '',
                description = '',
                content = '',
                categories = '',
                tags = '',
                firstNonEmpty = '';
            let inCode = false;
            const contentLines = [];

            for (const line of lines) {
                const trimmed = line.trim();
                if (!firstNonEmpty && trimmed && !/^\*/.test(trimmed) && !/^```/.test(trimmed)) {
                    firstNonEmpty = trimmed;
                }
                if (/^#{1,2}\s+/.test(line) && !inCode) {
                    title = line.replace(/^#{1,2}\s+/, '').trim();
                } else if (/^\*[^*].*[^*]\*$/.test(trimmed) && !inCode) {
                    description = trimmed.replace(/^\*|\*$/g, '').trim();
                } else if (/^\*\*Categories:?\*\*:?/i.test(trimmed) && !inCode) {
                    categories = trimmed.replace(/^\*\*Categories:?\*\*:?/i, '').trim();
                } else if (/^\*\*Tags:?\*\*:?/i.test(trimmed) && !inCode) {
                    tags = trimmed.replace(/^\*\*Tags:?\*\*:?/i, '').trim();
                } else if (trimmed === '```') {
                    inCode = !inCode;
                } else if (inCode) {
                    contentLines.push(line);
                }
            }
            if (!title && firstNonEmpty) {
                title = firstNonEmpty;
            }
            content = contentLines.join('\n').trim();
            if (title && content) {
                prompts.push({
                    title,
                    description,
                    content,
                    categories,
                    tags
                });
            }
        }
        return prompts;
    }"""
assert content.count(old2) == 1, f'old2 found {content.count(old2)} times'
content = content.replace(old2, new2, 1)

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print('OK')
```

- [ ] **Step 2: Run it**

```bash
python3 _scratch_task6.py
```
Expected: `OK`

- [ ] **Step 3: Add the short-template button to the Markdown tab**

Create `_scratch_task6b.py` at the repo root with the Write tool:

```python
path = 'static/index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = r"""          <button type="button" class="btn btn-ghost" style="width:100%;margin-top:var(--sp-2);" onclick="window.PL_copyMarkdownTemplate()">
            <span class="material-symbols-outlined">content_copy</span>
            Get Markdown template
          </button>
        </div>
        <div id="importPanelFile" style="display:none;">"""
new = r"""          <button type="button" class="btn btn-ghost" style="width:100%;margin-top:var(--sp-2);" onclick="window.PL_copyMarkdownTemplate()">
            <span class="material-symbols-outlined">content_copy</span>
            Get Markdown template
          </button>
          <button type="button" class="btn btn-ghost" style="width:100%;margin-top:var(--sp-2);" onclick="window.PL_copyMarkdownTemplateShort()">
            <span class="material-symbols-outlined">content_copy</span>
            Copy short template (for custom instructions)
          </button>
        </div>
        <div id="importPanelFile" style="display:none;">"""
assert content.count(old) == 1, f'old found {content.count(old)} times'
content = content.replace(old, new, 1)

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print('OK')
```

Run it:

```bash
python3 _scratch_task6b.py
grep -c "<script" static/index.html
```
Expected: `OK`, then `3`.

- [ ] **Step 4: Verify syntax, cache-bust, clean up**

```bash
node --check static/app.js
rm _scratch_task6.py _scratch_task6b.py
python3 update_hash.py
```
Expected: `node --check` prints nothing and exits 0. `update_hash.py`
reports a new hash written.

- [ ] **Step 5: Manual smoke test**

Open Import → Markdown tab, click "Copy short template," paste the
clipboard contents somewhere (e.g. a text editor) and confirm it's under
~1500 characters and self-contained. Then test parser hardening: paste a
Markdown block with extra blank lines around the `---` separator, and one
block missing its `##` heading (just an italic description as the first
line) — confirm both blocks still import correctly via the Markdown tab
(title falls back to the first non-empty, non-asterisk line when no
heading is present).

- [ ] **Step 6: Commit**

```bash
git add static/app.js static/index.html
git commit -m "$(cat <<'EOF'
feat: add short Markdown template for custom instructions, harden parser

Adds a ~1500-char template sized for ChatGPT/Claude persistent custom
instructions, alongside the existing long copy-paste template. Also
hardens parseMarkdownImport() against minor AI formatting drift:
blank-line-padded separators, missing heading markers (title falls
back to the first content line), and a colon-placement variant on
the Categories/Tags markers. Drops a dead condition that silently
required a title before a description line would be read.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Plan self-review notes

- **Spec coverage:** A.1 → Task 1. A.2 → Task 1. A.3 → Task 2. A.4 → Task 3
  (five render types) + Task 2 (the sixth, the multi-select flag). B.1 →
  Task 5. B.2 → Task 4 (endpoint) + Task 5 (tab/UI). B.3 → Task 5 (folder
  picker applies to all tabs). C.1 → Task 6. C.2 → no code change needed
  (long template already exists). C.3 → Task 6. D (files touched) → matches
  the Files list in every task. Error handling section → Task 4's empty-
  input case and Task 5's "no prompts detected" UI state. Testing section →
  each task's manual smoke test step.
- **Task ordering:** Tasks 1-3 (variable types) and Tasks 4-6 (import) are
  independent of each other and can be done in either order. Within
  variable types, Task 2 and Task 3 touch disjoint regions of the same
  functions (confirmed against the exact anchors above) so their order
  doesn't matter either, though Task 1 should land before Task 2/3 since
  Task 1 removes lines those two tasks' anchors are adjacent to.
- **Type consistency:** `collectVarMeta()`'s output shape
  (`{type, default, visible, options, size?, multi?}`) matches what
  `renderVariableFields()` reads (`m.type`, `m.default`, `m.options`,
  `m.multi`) in every task that touches it. `_applyBatchFolder` and
  `PL_analyzeSmartPaste` both call the same `api()` helper other import
  code already uses, at the same `/api` base.
