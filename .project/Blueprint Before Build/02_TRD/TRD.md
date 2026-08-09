# Technical Requirements Document (TRD) — Prompt Library Pro

**Owner:** Eugene Phillips
**Date:** 07-08-2026 (retrospective)
**Status:** Live — describes the actual shipped architecture

---

## 1. Architecture Overview

Local desktop app: Flask backend serves a PyWebView-rendered frontend, both bundled into a single Windows .exe via PyInstaller. No client-server split in the network sense — Flask runs on localhost, PyWebView is just the window shell. No cloud, no accounts.

## 2. Tech Stack Decisions

| Layer | Choice | Reason |
|-------|--------|--------|
| Backend | Python 3.9+, Flask 3.0.0, flask-cors 4.0.0 | Simple, no build step needed, easy to bundle with PyInstaller |
| Desktop shell | PyWebView 5.3.2 | Renders the web frontend as a native-feeling window without Electron overhead |
| Server | waitress 3.0.0 | Production WSGI server for the local Flask instance |
| Database | SQLite (`PromptLibrary.db`) | Local-first requirement — no server, single file, easy backup |
| Frontend | Vanilla JS (single `static/app.js`, ~18k lines, IIFE), Tailwind via CDN | No build step by design — PyWebView loads static files directly |
| Packaging | PyInstaller (`PromptLibrary.spec`) | Bundles Python + deps into a single .exe |
| Installer | Inno Setup (`PromptLibrary.iss`) | Windows installer with Start Menu/Desktop shortcuts, uninstall registration |

## 3. API Contracts

All routes live in `app.py` (~2.6k lines), one file, no blueprints. Key route groups:
- `/api/prompts`, `/api/folders`, `/api/chains`, `/api/roles` — core CRUD
- `/api/licence/validate`, `/api/licence/status` — licence system (see `LICENCE_SYSTEM.md`)
- `/api/starter-templates` — seeds 10 curated prompts on empty library
- `/api/admin/licence/count` — admin key count

## 4. Integration Points

- AI providers (Pro only): OpenAI, Anthropic, Gemini, OpenRouter — called client-side via shared `callAI()` helper using user-supplied API keys.
- No other third-party integrations. Fully offline-capable except for the optional AI executor calls.

## 5. Database & Infra

- SQLite file in user data directory (frozen) or repo root (dev) — path resolved via `get_data_dir()` in `app.py`, which branches on PyInstaller frozen state.
- No hosting — the "infra" is the end user's Windows machine.
- No scaling plan needed — single-user, single-machine by design.

## 6. Security

- Licence keys: SHA-256 hashed, stored in SQLite `licences` table, locked to `machine_id`.
- **Known gap:** AI provider API keys stored in plain `localStorage` (`pl_api_key_<provider>`), not DPAPI-encrypted. Flagged in root MEMORY.md as unresolved — relevant if data-at-rest security ever becomes a stated requirement.
- No auth system — single local user, no accounts.

## 7. Performance Targets

No formal targets documented. Practical constraint: app.js and index.html must not grow arbitrarily (Hard Rule 4, root CLAUDE.md) — monolith growth was the V1 failure mode and caused unmaintainability.

## 8. Monitoring & Observability

- `error.log` — local file logging via `_init_logging()` in `Main.py`, with fallback to data dir if the primary location is read-only (fixed 25-07-2026).
- No remote error tracking or analytics telemetry — local-first means no phone-home by design.

---

## Notes

- **No test suite, no linter, no package.json.** Verification is manual: `node --check static/app.js`, `python3 -m py_compile app.py`, plus running the app. This is a deliberate trade-off for a solo-maintained local app, not an oversight — but it means every change needs manual verification discipline.
- Six Hard Rules govern app.js/index.html editing specifically (see root CLAUDE.md) — most critically: never use Edit/Write tools on these two files, use bash + Python `content.replace()` instead, and always run `update_hash.py` after any app.js change.
