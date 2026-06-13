## Identity

This is the Prompt Library Pro workstation. Everything here relates to Eugene's local-first Windows desktop application for storing, organising, and running AI prompts. Routes here: any code work, feature builds, bug fixes, UI changes, build/packaging, or architecture decisions for this project. Does not route here: general prompt engineering theory, unrelated product work, or marketing copy.

Stack: Python, Flask, PyWebView, SQLite, PyInstaller, Inno Setup, vanilla JS, Tailwind CDN. No cloud, no accounts, no internet required.

---

## Resources

| Resource | Read when... |
| :--- | :--- |
| MEMORY.md | Start of every session — key decisions, current state, contacts |
| static/index.html | Any HTML/CSS change, UI audit, or structural question |
| static/app.js | Any JS change, feature work, or behaviour question |
| app.py | Any Flask API, DB schema, or backend question |
| update_hash.py | After any edit to app.js — always run to update the MD5 cache-bust hash |

---

## Workflow

1. **Session open check — run this first, every session, before anything else:**
   ```
   python3 -c "d=open('static/index.html','rb').read(); print('scripts:', d.count(b'<script'), '| complete:', b'</body>' in d and b'</html>' in d, '| NUL:', d.count(b'\x00'))"
   ```
   Expected output: `scripts: 2 | complete: True | NUL: 0`. If any value is wrong, restore from the most recent complete rollback in `_rollbacks/index.html/` before proceeding. Do not skip this step even if no HTML changes are planned — the file has silently truncated on the Windows mount mid-session three times.
   Also verify app.js is intact:
   ```
   node --check static/app.js 2>&1 && tail -3 static/app.js
   ```
   Expected: no syntax error, last line is `})();` (IIFE close). If truncated, restore from the most recent complete rollback in `_rollbacks/app.js/`. Both files truncated simultaneously on 2026-06-05 — check both every session.
2. **Full audit.** Read MEMORY.md, then the relevant source files. Never assume state from prior context.
3. **Outline plan, wait for approval** before executing multi-step changes.
4. **Pre-edit checks:** Strip NUL bytes, verify no truncation (`grep -c "<script" static/index.html` → baseline 2; if lower, file is truncated).
5. **Make changes** using Python scripts (via bash) for any replacement longer than ~50 lines — the Edit tool silently truncates large blocks. Use Edit tool only for small, targeted changes (single lines or short blocks). Python pattern: read file → `content.replace(OLD, NEW)` → write file.
6. **Post-edit checks:** `node --check static/app.js`, `python3 -m py_compile app.py`, div balance check, script tag count.
7. **Run update_hash.py** after every app.js change.
8. **Summarise** what changed and what's next. List all modified files at session end.

---

## Editorial Rules

Follow my voice principles in 00_Resources (voice-principles.md).

- Code comments: plain English, one line, imperative tense. No waffle.
- Variable and function names: camelCase for JS, snake_case for Python. Match existing conventions exactly.
- No new dependencies without explicit approval.
- No schema migrations without explicit approval.
- Premium-gated features must include the `premium-locked` class on HTML elements and a `state.isPremium` check in JS.

---

## Key Principles (non-negotiable)

1. **Full audit before every response.** Read the codebase. Never assume.
2. **NUL byte contamination.** Strip before any syntax check: `python3 -c "f='PATH'; d=open(f,'rb').read(); open(f,'wb').write(d.replace(b'\x00',b''))"`.
3. **HTML truncation.** After any large edit: `grep -c "<script" static/index.html` → must equal 2 (one external app.js tag, one inline script block). Check div balance. Check file ends with `</body></html>`.
4. **Cache busting.** Run `python3 update_hash.py` after every app.js change. The script tag must contain `app.js?v=[8-char hex]`.
5. **Async loader safety.** All render calls inside async loaders must be inside try/catch — never floating outside it.
6. **Backward compatibility.** No schema changes, no new dependencies, unless explicitly approved.
7. **Frozen vs. dev context.** `get_data_dir()` and `get_static_dir()` distinguish PyInstaller frozen builds from dev.
8. **Flask/PyWebView race condition.** Flask confirmed ready (socket polling) before WebView loads.
9. **Monolith prevention.** Do not grow app.js or index.html arbitrarily. V1 failure mode.
10. **Large edits via Python only.** The Edit tool silently truncates multi-line replacements in index.html — confirmed at blocks as short as ~35 lines. Always use Python `content.replace(OLD, NEW)` via bash for any multi-line HTML block. For app.js and app.py, the ~50-line threshold still applies. Single-line or two-line edits are safe with the Edit tool.
11. **New workspace order of operations.** Before adding HTML for any new workspace nav button: (1) write `openXxxWorkspace()`, (2) add nav route to `init()` `$$('.nav-item[data-view]')` handler, (3) add `'#xxxWorkspace'` to `_escapeToLibrary()` array, (4) write `initXxxWorkspace()` and call it from BOOTSTRAP. Only then add HTML. Never add a `data-view` button with no JS handler — silent failures look like everything is broken.
12. **Stability before new features.** Do not add new workspace HTML before its JS is tested and working. Do not stack new workspaces on unvalidated foundations. A working feature at depth beats two broken features side by side.
13. **No duplicate CSS rule blocks.** Before appending any CSS section, `grep` for existing rules targeting the same IDs or class names. Duplicate blocks with different activation class names (e.g. `.ob-active` vs `.active`) cascade silently and cause hard-to-diagnose visual bugs. The old block wins. Always remove stale rules before adding new ones.
14. **Overlay/modal HTML order.** Full-screen overlays and fixed-position elements (`#promptViewer`, `#onboardingOverlay`, `#toastContainer`, etc.) must be placed before `</body>` in a consistent order: viewer → onboarding overlay → toast container → `</body>`. Never place them after script tags.

---

## Triage Sequence ("prompts not showing")

Run in order:
1. `grep -c "<script" static/index.html` → baseline is 2. If 0 or 1, file is truncated
2. `node --check static/app.js` → JS syntax error
3. `python3 -m py_compile app.py` → Flask startup error
4. Check render calls inside async loaders are protected by try/catch
