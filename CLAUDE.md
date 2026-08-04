## Project

Prompt Library Pro — local-first Windows desktop app for storing, organising, and running AI prompts. No cloud, no accounts, no internet required.

---

## Stack

- Python 3.9+, Flask 3.0.0, flask-cors 4.0.0, PyWebView 5.3.2, waitress 3.0.0
- SQLite (`PromptLibrary.db`), PyInstaller (`PromptLibrary.spec`), Inno Setup (`PromptLibrary.iss`)
- Frontend: vanilla JS (single `static/app.js`, ~18k lines, IIFE), Tailwind via CDN, no build step

---

## Commands

```
start.bat              # create/activate venv, install deps, run Main.py (dev)
python3 update_hash.py # MD5 cache-bust hash for app.js -- run after every app.js edit
node --check static/app.js       # JS syntax check
python3 -m py_compile app.py     # Flask syntax check
Build.bat / BUILD_INSTALLER.bat  # PyInstaller build + Inno Setup installer
```

No test suite, no linter, no package.json. Verification is manual: syntax checks above + running the app.

---

## Architecture

- `Main.py` -- entry point, launches Flask + PyWebView, handles frozen-vs-dev path resolution
- `app.py` (~2.6k lines) -- Flask app: DB init/schema (`init_db()`), all `/api/*` routes, serialisation helpers. One file, no blueprints
- `static/index.html` (~3.4k lines) -- all markup + inline `<style>`; 3 `<script>` tags: components-data.js, app.js, inline bootstrap
- `static/app.js` (~18k lines) -- entire frontend logic in one IIFE: `state` object, render functions, workspace init/open functions, API calls
- `static/components-data.js` -- static prompt-component library data, separated from app.js because of size
- `licence_api.py`, `licence_ui.js` -- licence validation, kept separate from core app logic
- DB tables (see `init_db()` in app.py): settings, folders, prompts, prompt_versions, variable_templates, usage_log, chains, meta_blueprints, roles, taxonomy_domains, taxonomy_use_cases, prompt_relationships
- `_rollbacks/` -- manual snapshots of index.html/app.js kept for recovery; `_archive/` -- retired code/docs

**Why one-file app.js/index.html instead of modules:** no build step by design (Tailwind CDN, PyWebView loads static files directly) -- see Key Principle 9, monolith growth is a known failure mode, not an intentional pattern to continue.

---

## Conventions actually in the code

- JS: camelCase for functions/variables (`openXxxWorkspace`, `initXxxWorkspace`, `state.isPremium`)
- Python: snake_case (`get_data_dir`, `_prompt_payload`, `serialize_prompt`)
- Flask routes: private helpers prefixed `_` (`_json_body`, `_normalise_list`, `_folder_id`)
- Comments: plain English, one line, imperative. No paragraph comments, no docstring blocks
- No new dependencies without explicit approval. No schema migrations without explicit approval
- Premium-gated features: `premium-locked` class on the HTML element + `state.isPremium` check in JS

---

## Hard rules -- never touch without asking

1. **Never use the Edit or Write tool on this project's static/app.js or static/index.html.** Historically (bindfs mount, confirmed 2026-06-21) the Edit/Write path silently truncated growing files back to their previous length, and its own success message did not reflect this. Root mount has since changed to native Windows (per 2026-07-25 memory) so this may no longer reproduce -- but it has not been re-verified. Until confirmed safe, keep using bash + Python `content.replace()` for edits to these two files, and verify independently via bash after every write.
2. **No schema changes, no new dependencies** without explicit approval (Editorial Rules + Key Principle 6).
3. **Run `python3 update_hash.py` after every app.js change** -- the script tag must carry `app.js?v=[8-char hex]` or the browser serves a stale cached copy.
4. **Do not grow app.js or index.html arbitrarily.** Monolith growth was the V1 failure mode.
5. **New workspace build order is fixed:** (1) `openXxxWorkspace()`, (2) nav route in `init()`'s `.nav-item[data-view]` handler, (3) `'#xxxWorkspace'` added to `_escapeToLibrary()`, (4) `initXxxWorkspace()` called from BOOTSTRAP -- only then add the HTML. A `data-view` button with no handler fails silently.
6. **No duplicate CSS rule blocks** targeting the same ID/class under a different activation class name (e.g. `.ob-active` vs `.active`) -- the earlier block wins silently. Grep before appending new CSS.
7. **Overlay/modal HTML order before `</body>`:** viewer -> onboarding overlay -> toast container. Never after script tags.

---

## Gotchas (week 1)

- **No build step.** Editing app.js/index.html directly IS the deploy for dev; there's no bundler to catch mistakes -- syntax-check manually (`node --check`).
- **Cache busting is manual.** Forgetting `update_hash.py` means your JS change silently doesn't show up in the running app (stale cache).
- **Frozen vs dev paths differ.** `get_data_dir()` / `get_static_dir()` in app.py branch on PyInstaller frozen state -- don't hardcode paths relative to the source tree.
- **Flask/PyWebView startup race.** Main.py polls the socket to confirm Flask is up before WebView loads the page -- don't remove that wait.
- **Async loaders need try/catch around every render call inside them,** or a failed fetch silently blanks the UI with no error surfaced.
- **NUL bytes and truncation have hit this file before.** Before trusting static/index.html or app.js, sanity check: `grep -c "<script" static/index.html` should be 3; `node --check static/app.js` should pass and end in `})();`.
- **PromptLibrary.db and PromptLibrary.db-journal are live SQLite files in the repo root** -- don't blindly overwrite/delete, the journal implies an interrupted write.
- **licence_api.py / licence_ui.js are a separate system from the main prompt CRUD** -- don't conflate premium-gating logic with licence validation logic.

---

## Triage: "prompts not showing"

1. `grep -c "<script" static/index.html` -> must be 3, else file truncated
2. `node --check static/app.js` -> JS syntax error
3. `python3 -m py_compile app.py` -> Flask startup error
4. Check render calls inside async loaders are wrapped in try/catch
