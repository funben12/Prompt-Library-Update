# Cross-Workspace Save Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the two real gaps in cross-workspace save (discovered during planning — Optimizer/X-Ray/Splicer/Generator already have working "Save to Library" buttons that create a new prompt): add a Save button to the Auditor workspace, and let both Auditor and X-Ray optionally replace the source prompt they were loaded from, instead of always creating a new one.

**Architecture:** One shared helper `_wsSaveOrReplace()` added to the "WORKSPACE SUITE — shared helpers" section of `static/app.js` (already used by Quick Fill, Diff Lens, Cost Lens, Pulse, X-Ray, Splicer). It uses the native `confirm()` dialog (same pattern as the existing single-prompt delete flow) to ask "replace the original, or save as new?" when a source prompt is available, falling back to always-new when it isn't (pasted/freeform input). Auditor and X-Ray's existing Save button handlers call this helper instead of a raw `POST /prompts`.

**Tech Stack:** Vanilla JS (browser IIFE, no build step, no JS test framework), Flask/SQLite backend (untouched — no schema or endpoint changes needed; `PUT /api/prompts/{id}` and `POST /api/prompts` already accept everything required).

## Global Constraints

(From `CLAUDE.md` — apply to every task below)

- **Never use the Edit or Write tool on `static/app.js` or `static/index.html`.** All edits go through bash + Python `content.replace()`: read file bytes → strip NUL bytes → `content.replace(OLD, NEW)` → write back. Write throwaway patch scripts to the scratchpad temp dir, run with `python`, never inline heredocs (backslashes get mangled by this shell).
- **Run `node --check static/app.js` after every app.js edit.** Must show no output.
- **Run `python update_hash.py` after every app.js change.**
- **No new dependencies, no schema migrations, no backend changes** — this feature is 100% frontend; `PUT /api/prompts/{id}` already accepts a full prompt object (title, description, content, categories, tags, folder_id, colour_label, rating, notes, chain_ids, variable_meta, chat_turns, role_id, status, parent_id, prompt_domain, prompt_use_case, prompt_output_format, prompt_tone) and `POST /api/prompts` already accepts the same minus `id`. Extra/unknown JSON keys in the body are silently ignored by the backend's `_prompt_payload()` (`app.py:576`), so passing a full cached prompt object through is safe.
- **No test harness exists for JS in this project.** "Tests" here means manual browser verification via the dev preview tool — there's no pure-logic piece worth a node scratch script this time (both tasks are DOM/API wiring, not algorithmic).
- Session-open integrity check must already have been run this session before any edit — if resuming in a new session, run it again first (see `CLAUDE.md` Workflow step 1).

---

### Task 1: Shared `_wsSaveOrReplace()` helper

**Files:**
- Modify: `static/app.js:11313-11318` (insert new function between `_wsPickedPrompt` and the `_wsEstTokens` comment)

**Interfaces:**
- Consumes: `api(path, opts)` (existing fetch wrapper, `app.js:99`), `loadPrompts()` (`app.js:520`), `loadFilterOptions()` (`app.js:534`-ish, loads `state.filters`), `toast(msg, kind)` (`app.js:249`).
- Produces: `async function _wsSaveOrReplace({ text, sourcePrompt, newTitle, description, tags, extraNote }): Promise<{id: number, replaced: boolean} | null>` — consumed by Task 2 (Auditor) and Task 3 (X-Ray).
  - `text` (string, required): the content to save.
  - `sourcePrompt` (object or null): the full cached prompt object from `_wsPickedPrompt(selector)` if the workspace's result came from an existing Library prompt; `null`/`undefined` if freeform/pasted.
  - `newTitle` (string): title to use if creating a new prompt.
  - `description` (string): description to use if creating a new prompt.
  - `tags` (string): comma-free single tag (or comma-joined tags) to attach — merged with the source prompt's existing tags on replace, or set directly on create.
  - `extraNote` (string, optional): appended to the prompt's `notes` field (both on replace and create).
  - Returns `{id, replaced}` on success (so callers can `closeWorkspace()` + `openDetail(id)`), or `null` if the user cancelled the whole operation is not possible (there's no bare "cancel entirely" path — cancelling "replace" falls through to "save as new") or if the API call failed.

- [ ] **Step 1: Write the patch script**

Write to the scratchpad temp dir as `patch_cws_task1.py`:

```python
path = "static/app.js"
d = open(path, "rb").read()
d = d.replace(b"\x00", b"")
content = d.decode("utf-8")

marker = """    function _wsPickedPrompt(selectSel) {
        const sel = $(selectSel);
        if (!sel || !sel.value || !sel._promptCache) return null;
        return sel._promptCache.find(p => String(p.id) === String(sel.value)) || null;
    }

    // Rough token estimate"""
assert content.count(marker) == 1, "marker not unique"

insertion = """    function _wsPickedPrompt(selectSel) {
        const sel = $(selectSel);
        if (!sel || !sel.value || !sel._promptCache) return null;
        return sel._promptCache.find(p => String(p.id) === String(sel.value)) || null;
    }

    // Offer to replace the prompt a workspace result came from, or save it as a
    // new prompt. `sourcePrompt` must be the full cached object from
    // _wsPickedPrompt() (not just an id) so a replace can carry over every
    // existing field via PUT — the backend's PUT expects a full prompt payload.
    async function _wsSaveOrReplace({ text, sourcePrompt, newTitle, description, tags, extraNote }) {
        if (sourcePrompt) {
            const replace = confirm(
                'Replace the original prompt "' + sourcePrompt.title + '" with this result?\\n\\n' +
                'Cancel to save as a new prompt instead.'
            );
            if (replace) {
                const notes = [sourcePrompt.notes, extraNote].filter(Boolean).join('\\n');
                const existingTags = Array.isArray(sourcePrompt.tags) ? sourcePrompt.tags.join(',') : (sourcePrompt.tags || '');
                const mergedTags = existingTags ? existingTags + ',' + tags : tags;
                try {
                    await api('/prompts/' + sourcePrompt.id, {
                        method: 'PUT',
                        body: {
                            ...sourcePrompt,
                            content: text,
                            notes,
                            tags: mergedTags,
                        }
                    });
                    await loadPrompts();
                    await loadFilterOptions();
                    toast('Updated: ' + sourcePrompt.title, 'success');
                    return { id: sourcePrompt.id, replaced: true };
                } catch {
                    toast('Could not update prompt', 'error');
                    return null;
                }
            }
        }
        try {
            const result = await api('/prompts', {
                method: 'POST',
                body: {
                    title: newTitle,
                    content: text,
                    description,
                    categories: 'Prompt Engineering',
                    tags,
                    notes: extraNote || '',
                }
            });
            await loadPrompts();
            await loadFilterOptions();
            toast('Saved: ' + newTitle, 'success');
            return { id: result?.id, replaced: false };
        } catch {
            toast('Could not save', 'error');
            return null;
        }
    }

    // Rough token estimate"""

content = content.replace(marker, insertion)
open(path, "w", encoding="utf-8", newline="\\n").write(content)
print("patched")
```

Run: `python "<scratchpad>/patch_cws_task1.py"` (substitute the actual scratchpad path from the system prompt) from the repo root.
Expected output: `patched`

- [ ] **Step 2: Verify syntax**

Run: `node --check static/app.js`
Expected: no output

- [ ] **Step 3: Run update_hash.py**

Run: `python update_hash.py`
Expected: prints new JS/CSS hashes, no error

- [ ] **Step 4: Commit**

```bash
git add static/app.js static/index.html
git commit -m "feat: add shared _wsSaveOrReplace helper for workspace save flows"
```

---

### Task 2: Auditor — add Save to Library button

**Files:**
- Modify: `static/index.html:2413-2416` (insert a Save button after the Findings block, inside `#audResults`)
- Modify: `static/app.js:11673` (add module-level state) and `static/app.js:11834-11841` (`#audRunBtn` handler — capture the result) and `static/app.js:11823-11868` (`initAuditWorkspace` — add the new button's click handler)

**Interfaces:**
- Consumes: `_wsSaveOrReplace(...)` (Task 1), `_wsPickedPrompt('#audPicker')` (existing), `_audScore(text)` / result shape `{overall, dims, findings: [{sev, text}], words, tokens}` (existing, `app.js:11675`), `closeAuditWorkspace()` (existing), `openDetail(id)` (existing, used elsewhere e.g. `app.js:11280`).
- Produces: module-level `let _audLastResult = null;` — holds the most recent `_audScore()` result so the Save handler can build a findings summary without re-running the audit.

- [ ] **Step 1: Patch index.html — add the Save button**

Write to scratchpad as `patch_cws_task2_html.py`:

```python
path = "static/index.html"
d = open(path, "rb").read()
d = d.replace(b"\x00", b"")
content = d.decode("utf-8")

marker = """      <div class="opt-section-label" style="margin-top:var(--sp-3);">Findings</div>
      <div id="audFindings"></div>
    </div>
  </div>
</div>"""
assert content.count(marker) == 1, "marker not unique"

new = """      <div class="opt-section-label" style="margin-top:var(--sp-3);">Findings</div>
      <div id="audFindings"></div>
      <div class="opt-actions" style="margin-top:var(--sp-3);">
        <button class="btn btn-accent" id="audSaveBtn"><span class="material-symbols-outlined">save</span> Save to Library</button>
      </div>
    </div>
  </div>
</div>"""

content = content.replace(marker, new)
open(path, "w", encoding="utf-8", newline="\\n").write(content)
print("patched")
```

Run: `python "<scratchpad>/patch_cws_task2_html.py"`
Expected: `patched`

- [ ] **Step 2: Patch app.js — add state, capture the audit result, wire the button**

Write to scratchpad as `patch_cws_task2_js.py`:

```python
path = "static/app.js"
d = open(path, "rb").read()
d = d.replace(b"\x00", b"")
content = d.decode("utf-8")

# 1. Add module-level state right before _audScore
marker1 = """    const AUD_VAGUE = ['some', 'various', 'stuff', 'things', 'good', 'nice', 'interesting', 'a few', 'better', 'appropriate', 'relevant', 'etc'];

    function _audScore(text) {"""
assert content.count(marker1) == 1, "marker1 not unique"
new1 = """    const AUD_VAGUE = ['some', 'various', 'stuff', 'things', 'good', 'nice', 'interesting', 'a few', 'better', 'appropriate', 'relevant', 'etc'];

    let _audLastResult = null;

    function _audScore(text) {"""
content = content.replace(marker1, new1)

# 2. Capture the result when Audit is run
marker2 = """        $('#audRunBtn')?.addEventListener('click', () => {
            const text = $('#audInput')?.value?.trim();
            if (!text) {
                toast('Paste a prompt first', 'warning');
                return;
            }
            _audRender(_audScore(text));
        });"""
assert content.count(marker2) == 1, "marker2 not unique"
new2 = """        $('#audRunBtn')?.addEventListener('click', () => {
            const text = $('#audInput')?.value?.trim();
            if (!text) {
                toast('Paste a prompt first', 'warning');
                return;
            }
            _audLastResult = _audScore(text);
            _audRender(_audLastResult);
        });

        $('#audSaveBtn')?.addEventListener('click', async () => {
            const text = $('#audInput')?.value?.trim();
            if (!text || !_audLastResult) {
                toast('Audit a prompt first', 'warning');
                return;
            }
            const picked = _wsPickedPrompt('#audPicker');
            const title = ((picked?.title || 'Audited prompt') + ' (audited)').slice(0, 120);
            const topFindings = _audLastResult.findings.slice(0, 3).map(f => f.text).join(' | ');
            const note = 'Audited via Prompt Auditor workspace \\u2014 score ' + _audLastResult.overall + '/100.' +
                (topFindings ? ' Top findings: ' + topFindings : '');
            const saved = await _wsSaveOrReplace({
                text,
                sourcePrompt: picked,
                newTitle: title,
                description: 'Audited via Prompt Auditor workspace',
                tags: 'audited',
                extraNote: note,
            });
            if (saved?.id) {
                closeAuditWorkspace();
                setTimeout(() => openDetail(saved.id), 200);
            }
        });"""
assert content.count(marker2) == 1, "marker2 (pre-replace check) not unique"
content = content.replace(marker2, new2)

open(path, "w", encoding="utf-8", newline="\\n").write(content)
print("patched")
```

Run: `python "<scratchpad>/patch_cws_task2_js.py"`
Expected: `patched`

- [ ] **Step 3: Verify syntax and HTML integrity**

Run: `node --check static/app.js`
Expected: no output

Run: `grep -c "<script" static/index.html`
Expected: `3` (baseline unchanged — this task doesn't touch script tags)

- [ ] **Step 4: Run update_hash.py**

Run: `python update_hash.py`

- [ ] **Step 5: Manual browser verification**

Using the dev preview tool:
1. Start the app, open Prompt Auditor.
2. Paste a short, vague prompt with no format/constraints (e.g. "write something good about our product"). Click Audit — confirm score + findings render, and `#audSaveBtn` is now visible (it lives inside `#audResults`, which only shows after a run).
3. Click "Save to Library" — confirm a toast "Saved: ..." appears, and check the new prompt in the Library has `#audited` tag and a notes field containing the score and top findings.
4. Reopen Auditor, use the `#audPicker` dropdown to load an existing Library prompt, click Audit, then click "Save to Library" — confirm a `confirm()` browser dialog appears asking to replace the original. Click OK — confirm the original prompt's `notes` and `tags` were updated (not a new prompt created) and content matches what was in `#audInput`.
5. Repeat step 4 but click Cancel on the confirm dialog — confirm a NEW prompt is created instead (original untouched).
6. Check browser console for errors throughout.

- [ ] **Step 6: Commit**

```bash
git add static/app.js static/index.html
git commit -m "feat: add Save to Library button to Prompt Auditor workspace"
```

---

### Task 3: X-Ray — offer Replace Original on save

**Files:**
- Modify: `static/app.js:12417-12444` (`#xraySaveBtn` click handler — replace the raw `POST` with a call to `_wsSaveOrReplace`)

**Interfaces:**
- Consumes: `_wsSaveOrReplace(...)` (Task 1), `_xrayAssemble()` (existing, builds the deconstructed text), `_wsPickedPrompt('#xrayPicker')` (existing), `closeXrayWorkspace()` (existing), `openDetail(id)` (existing).

- [ ] **Step 1: Patch app.js**

Write to scratchpad as `patch_cws_task3.py`:

```python
path = "static/app.js"
d = open(path, "rb").read()
d = d.replace(b"\x00", b"")
content = d.decode("utf-8")

old = """        $('#xraySaveBtn')?.addEventListener('click', async () => {
            const text = _xrayAssemble();
            if (!text) {
                toast('Deconstruct a prompt first', 'warning');
                return;
            }
            const picked = _wsPickedPrompt('#xrayPicker');
            const title = ((picked?.title || 'Deconstructed prompt') + ' (structured)').slice(0, 120);
            try {
                const result = await api('/prompts', {
                    method: 'POST',
                    body: {
                        title,
                        content: text,
                        description: 'Restructured via Prompt X-Ray workspace',
                        categories: 'Prompt Engineering',
                        tags: 'x-ray'
                    }
                });
                await loadPrompts();
                await loadFilterOptions();
                toast('Saved: ' + title, 'success');
                closeXrayWorkspace();
                if (result?.id) setTimeout(() => openDetail(result.id), 200);
            } catch {
                toast('Could not save', 'error');
            }
        });"""
assert content.count(old) == 1, "block not unique"

new = """        $('#xraySaveBtn')?.addEventListener('click', async () => {
            const text = _xrayAssemble();
            if (!text) {
                toast('Deconstruct a prompt first', 'warning');
                return;
            }
            const picked = _wsPickedPrompt('#xrayPicker');
            const title = ((picked?.title || 'Deconstructed prompt') + ' (structured)').slice(0, 120);
            const saved = await _wsSaveOrReplace({
                text,
                sourcePrompt: picked,
                newTitle: title,
                description: 'Restructured via Prompt X-Ray workspace',
                tags: 'x-ray',
            });
            if (saved?.id) {
                closeXrayWorkspace();
                setTimeout(() => openDetail(saved.id), 200);
            }
        });"""

content = content.replace(old, new)
open(path, "w", encoding="utf-8", newline="\\n").write(content)
print("patched")
```

Run: `python "<scratchpad>/patch_cws_task3.py"`
Expected: `patched`

- [ ] **Step 2: Verify syntax**

Run: `node --check static/app.js`
Expected: no output

- [ ] **Step 3: Run update_hash.py**

Run: `python update_hash.py`

- [ ] **Step 4: Manual browser verification**

Using the dev preview tool:
1. Open Prompt X-Ray, paste a prompt with no picker selection, click Deconstruct, click "Save to Library" — confirm it saves as new (no confirm dialog — `sourcePrompt` is null since nothing was picked).
2. Reopen X-Ray, use `#xrayPicker` to load an existing Library prompt, Deconstruct, click "Save to Library" — confirm the `confirm()` dialog appears; test both OK (replaces original, tags/notes merged) and Cancel (creates new) paths.
3. Check browser console for errors throughout.

- [ ] **Step 5: Commit**

```bash
git add static/app.js
git commit -m "feat: offer Replace Original when saving from Prompt X-Ray"
```
