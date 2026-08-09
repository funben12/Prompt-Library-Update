# Launch Plan — Prompt Library Pro

**Owner:** Eugene Phillips
**Date:** 07-08-2026 (retrospective — launch already happened)
**Status:** Live product, launched 24-06-2026

---

## 1. Pre-Launch Testing (as actually performed)

No formal QA/beta/UAT process is documented — verification was manual: `node --check static/app.js`, `python3 -m py_compile app.py`, and running the app directly. This is consistent with the project's stated approach (no test suite, no linter — root CLAUDE.md).

## 2. Release Checklist (as actually executed)

- [x] Windows installer built via `Build.bat` → `BUILD_INSTALLER.bat` → Inno Setup `.exe`
- [x] Licence system live: keys generated, loaded, validated via `/api/licence/validate`
- [x] Payhip listing live: https://payhip.com/b/WKSLO
- [x] Launch discount code configured (`PlaygroundRelease`, 50% off, first 5 uses)

## 3. Known Build Issue Fixed Pre-Launch

`Build.bat` Error 5 / Access Denied — fixed 18-05-2026 by (1) force-killing any running `PromptLibrary.exe` with a 2-second wait before the clean step, (2) adding `--noupx` to the PyInstaller command since UPX compression was triggering Windows Defender mid-build. Both fixes are permanent, live in `Build.bat`.

## 4. Rollback Plan

No formal rollback plan documented for this desktop-app distribution model — there's no live server to roll back. If a bad build ships, the practical rollback is: fix the bug, rebuild, re-upload the installer to Payhip. Existing installs aren't auto-updated (no update-check mechanism currently exists).

## 5. Launch-Day Monitoring

No telemetry — local-first means no phone-home by design (see 02_TRD). The only launch-day signal available is Payhip sales dashboard and licence activation count (`/api/admin/licence/count`).

## 6. Communications Plan (as actually executed)

- Telegram community: feature screenshots shared over the days following launch.
- YouTube tutorial: planned as of 24-06-2026 — status of whether this shipped is not confirmed in current memory files.

---

## Notes

- This retrospective launch plan highlights a real gap: **no update-check mechanism** for existing installs. If a critical bug ships, there's no way to notify or auto-update existing customers — worth flagging as a future infrastructure investment if the user base grows.
- No formal rollback plan exists because the distribution model (one-time installer download) doesn't have a live-service rollback concept — this is architecturally different from a web app and shouldn't be forced into that framework.
