# Prompt Library Pro — Codebase Cleanup Audit

Repo: `funben12/prompt-library-update` · 746 tracked files · audited 2026-09-03

## Summary

The app itself (`app.py`, `static/app.js`, `static/app.css`, `static/index.html`) is intact: 3 `<script>` tags, `node --check` and `py_compile` both pass, no duplicate route registrations. The real problem is everything around the app. This repo has been tracking build output, installer binaries, a full manual-snapshot history, a live-looking SQLite DB, and one-time migration scripts for months, and none of it has been cleaned up. `installer/` alone is 130MB, `_rollbacks/` is 68MB across 364 tracked files, `build/` is 30MB — none of it should be in git. There's also committed licence-key material and a stray copy of the production database sitting in the repo root. None of this touches app logic, so the fix is close to zero-risk: delete from the working tree, `git rm --cached` where `.gitignore` should have caught it, and it's done. I did not attempt a function-level dead-code sweep of the 18k-line `static/app.js` — verifying that safely (checking dynamic dispatch via `data-view`/`nav-item` handlers per CLAUDE.md's stated architecture) is a separate, deeper pass; flag if you want that run next.

---

## Abandoned Files

### Abandoned Files — root one-off scripts (`add_sprites.py`, `add_tutorial.py`, `expand_agents.py`, `expand_components.py`, `expand_meta.py`, `fix_preview.py`, `fix_tutorial.py`, `gen_blocks.py`, `gen_frameworks.py`, `patch_more_frameworks.py`, `rebuild_from_backup.py`, `update_components.py`, `wire_sprites.py`)
**Why unnecessary:** These are one-time content-generation/migration scripts (component data expansion, sprite wiring, tutorial patching). None are called from `Build.bat`, `BUILD_INSTALLER.bat`, `start.bat`, `PromptLibrary.spec`, or each other, except `rebuild_from_backup.py` referencing `update_components.py` internally, and `expand_components.py`/`expand_meta.py` being mentioned only in `_changelog.md` (a log entry, not a live reference).
**Impact of removal:** ~13 files, roughly 290KB of source, removed from root-level clutter. No effect on the running app.
**Risk before deletion:** None identified, high confidence — these mutated `static/components-data.js`/`app.js` at the time they ran; the output they produced is already committed. Git history preserves the scripts if ever needed again.
**Recommended action:** Delete now. If any are still needed for future content batches, move them to a `tools/` or `scripts/` folder instead of root.

### Abandoned Files — `scripts/*.py` (`add_gallery_preview.py`, `add_snippets_css.py`, `expand_components.py`, `redesign_snippets.py`, `replace_gallery.py`)
**Why unnecessary:** Same pattern as above — one-time patch scripts against `static/`, not wired into any build step. `scripts/expand_components.py` duplicates the root-level `expand_components.py` by name (two different one-off scripts sharing a filename is itself a smell).
**Impact of removal:** 5 files removed; eliminates the confusing name collision with the root script.
**Risk before deletion:** None identified, high confidence.
**Recommended action:** Delete now.

### Abandoned Files — `.scratch_patch_review.py`, `.scratch_qf_patch.py`
**Why unnecessary:** Filenames are self-declared scratch files. Not referenced anywhere.
**Impact of removal:** 2 files, ~7.8KB.
**Risk before deletion:** None identified, high confidence.
**Recommended action:** Delete now.

### Abandoned Files — `code_snippets/` (`README.md`, `html_markup.html`, `javascript_frontend.js`, `python_backend.py`)
**Why unnecessary:** Zero references from any `.py`, `.js`, or `.html` in the app. Reads like example/reference material, not something the app loads or serves.
**Impact of removal:** 4 files removed.
**Risk before deletion:** UNCERTAIN — if this is reference content for a "code snippets" feature planned but not yet wired up, confirm with Eugene before deleting rather than assuming abandonment.
**Recommended action:** Delete after verification that no planned feature depends on it.

### Abandoned Files — `icon.ico.bak` (root) and `static/icon.ico.bak`
**Why unnecessary:** `.bak` icon files not referenced by `PromptLibrary.spec`, `PromptLibrary.iss`, or `mac/setup.py` (all point to `icon.ico`/`static/icon.ico` without the `.bak` suffix).
**Impact of removal:** 2 files, ~365KB combined.
**Risk before deletion:** None identified, high confidence.
**Recommended action:** Delete now.

### Abandoned Files — `static/app.css.prebake`
**Why unnecessary:** A 91KB intermediate build artefact of `app.css` (confirmed different content via `diff`), not referenced by `index.html` or any build script.
**Impact of removal:** 1 file, 91KB.
**Risk before deletion:** UNCERTAIN — if a Tailwind/prebake step regenerates `app.css` from this file, deleting it breaks that pipeline. No build script currently references it, but confirm there isn't a manual step Eugene runs by hand.
**Recommended action:** Delete after verification of the prebake workflow, if one exists.

### Abandoned Files — `_pcw_blocks.txt`, `_pcw_frameworks.txt`, `_pcw_header.txt`, `_pcw_logic.txt`
**Why unnecessary:** Referenced only by the now-deleted-candidate `gen_blocks.py` and `gen_frameworks.py`. Once those generation scripts go, these data files have no consumer.
**Impact of removal:** 4 files, ~65KB.
**Risk before deletion:** None identified, high confidence — tie removal to the `gen_*.py` script removal above.
**Recommended action:** Delete now, alongside `gen_blocks.py`/`gen_frameworks.py`.

### Abandoned Files — two UUID-named PNGs at root (`034aeede-d81d-48ac-bff3-5c1a1dea935a.png`, `8dfa3031-212d-44fe-952a-e80598d41f80.png`)
**Why unnecessary:** ~2.7MB combined, filenames give no indication of purpose, not referenced by any HTML/CSS/build config.
**Impact of removal:** 2.7MB off the repo.
**Risk before deletion:** UNCERTAIN — could be pasted screenshots from a past conversation with no lasting purpose, or could be marketing assets waiting for use. Confirm with Eugene before deleting.
**Recommended action:** Delete after verification.

### Abandoned Files — `.obsidian/`
**Why unnecessary:** A personal Obsidian vault config folder, unrelated to the Flask/PyWebView app. Almost certainly committed by accident from opening the repo folder as an Obsidian vault.
**Impact of removal:** ~9 config files removed, keeps the repo scoped to the app.
**Risk before deletion:** None identified, high confidence.
**Recommended action:** Delete and add `.obsidian/` to `.gitignore`.

---

## Legacy Code / Stale Artefacts

### Legacy — `_rollbacks/` (68MB, 364 tracked files)
**Why unnecessary:** Manual timestamped snapshots of `app.js`, `app.css`, `index.html`, `Main.py`, `MEMORY.md`, etc. (v1 through v22+ per file), duplicating exactly what git itself already tracks via commit history. This is version control implemented a second time, by hand, inside the repository it's meant to be a fallback for.
**Impact of removal:** 68MB and 364 files off the repo — the single largest cleanup opportunity by file count.
**Risk before deletion:** None identified for git history (every version already exists as a commit), but CLAUDE.md explicitly calls `_rollbacks/` "manual snapshots... kept for recovery." Confirm Eugene doesn't rely on this folder as a recovery path independent of git before removing it.
**Recommended action:** Delete after verification — first confirm `git log` can reconstruct any version currently in `_rollbacks/` (spot-check 2-3 files), then remove the folder and rely on git history going forward.

### Legacy — `installer/` (130MB: `.exe` and `.zip` build outputs, plus a stray `New Folder` and `New FolderPromptLibraryPro_Setup_PreRelease_1.zip`)
**Why unnecessary:** Compiled installer binaries from `Build.bat`/`BUILD_INSTALLER.bat` runs, checked into source control. Binary build output does not belong in git; it regenerates from source on demand. The stray `New Folder` entry is itself an accidental commit.
**Impact of removal:** 130MB — the largest single chunk of repo bloat.
**Risk before deletion:** None identified, high confidence. These are rebuildable from `PromptLibrary.spec` + `PromptLibrary.iss`.
**Recommended action:** Delete now, add `installer/` to `.gitignore`. If Eugene wants installer artefacts preserved for distribution history, move them to GitHub Releases instead of the repo.

### Legacy — `build/` (30MB PyInstaller output)
**Why unnecessary:** Standard PyInstaller working directory, fully regenerated by `Build.bat`. Same category as `installer/`.
**Impact of removal:** 30MB removed.
**Risk before deletion:** None identified, high confidence.
**Recommended action:** Delete now, add `build/` to `.gitignore`.

### Legacy — `_archive/static-backups/` (`app.js.backup-20260426-173046`, `index.html.backup-20260426-170345`)
**Why unnecessary:** Same pattern as `_rollbacks/` — a dated manual backup of files git already versions.
**Impact of removal:** 2 files removed.
**Risk before deletion:** None identified, high confidence, once `_rollbacks/` verification above is done (same logic applies).
**Recommended action:** Delete now.

### Legacy — `__pycache__/*.pyc` (tracked despite `.gitignore` listing `__pycache__/`)
**Why unnecessary:** `.gitignore` already excludes these, but 7 `.pyc` files were committed before the ignore rule existed and git doesn't retroactively drop tracked files. Pure compiled-bytecode noise, machine- and version-specific (cpython-310, 313, 314 variants all present).
**Impact of removal:** 7 stale binary files removed; prevents future confusion from stale bytecode being diffed or reviewed.
**Risk before deletion:** None identified, high confidence.
**Recommended action:** Delete now via `git rm --cached -r __pycache__` (the `.gitignore` entry already stops recurrence).

### Legacy — root `PromptLibrary.db` and `error.log`
**Why unnecessary:** `app.py`'s `get_data_dir()` resolves the real database to `~/Documents/PromptLibrary/PromptLibrary.db`, never the repo root — confirmed by reading `app.py:22-37`. The root `PromptLibrary.db` (2.4MB, 375 prompts) is a stray, out-of-date snapshot, not live application data, despite CLAUDE.md's standing caution to treat it as such. `error.log` is a tracked, currently-empty log file — logs should never be committed.
**Impact of removal:** 2.4MB removed; removes a live-looking file that could mislead a future contributor (or agent) into thinking it's the real DB and editing/restoring it as such.
**Risk before deletion:** None identified for deletion from git tracking. UNCERTAIN whether this snapshot has any standalone value (e.g. a seed/demo dataset) — if so, rename it clearly (`PromptLibrary.sample.db`) rather than deleting outright.
**Recommended action:** Remove from git tracking (`git rm --cached`) and add both to `.gitignore`; keep or rename the local file only if Eugene confirms it's an intentional seed/demo DB.

### Legacy — dated status/planning docs at root (`FINAL_STATUS.txt`, `DEPLOYMENT_CHECKLIST.md`, `LICENCE_SYSTEM.md`, `23-06-2026-licence-ui-complete.md`, `21-06-2026-telegram-launch-announcement.md` + its `- v1` duplicate, `03-06-2026 - prompt-library-ux-strategy.md`, `04-06-2026 - churn-analysis-and-improvements.md`, `23-06-2026-product-description.md`)
**Why unnecessary:** Point-in-time status snapshots and launch docs from May-June 2026, several announcing work as "complete" that has since moved on. `21-06-2026-telegram-launch-announcement - v1.md` sitting next to the current version is a manual version pair that git already handles.
**Impact of removal:** ~9 files decluttered from root; makes it obvious which docs (`README.md`, `CLAUDE.md`, `MEMORY.md`, `GOALS.md`) are the living ones.
**Risk before deletion:** UNCERTAIN — these may be Eugene's own project journal/history, which has value as a record even if stale. Not a code risk either way.
**Recommended action:** Leave, or move to an `_archive/docs/` folder if root clutter is the concern — this is a filing decision, not a cleanup one. Do not delete outright without asking; these read as intentional history, not debris.

---

## Technical Debt Opportunities

### Technical Debt — licence key material committed to git (`keys_PRIVATE.txt`, `keys_batch_50.txt`, `keys_batch_100.txt`, `all_keys_to_load.txt`)
**Why unnecessary:** `keys_PRIVATE.txt` is explicitly labelled "Do NOT ship in the app" and contains real, usable Payhip licence keys, alongside two more batch files and a combined load file — all committed to a git history that anyone with repo access (and every clone) can read indefinitely, including after later deletion.
**Impact of removal:** Closes a live business-risk hole — currently anyone with repo read access can pull working licence keys straight from git history, bypassing Payhip's purchase flow entirely.
**Risk before deletion:** Deleting the working-tree files is zero-risk to the app (they're not read by `app.py`/`licence_api.py` at runtime — `init_licences.py` reads them once, manually, to seed Payhip). The residual risk is that they remain in git history even after deletion.
**Recommended action:** Delete now from the working tree and add `keys_*.txt` / `all_keys_to_load.txt` to `.gitignore`. Separately, treat every key in these files as potentially exposed — if this repo has ever been cloned or shared, review Payhip's activation logs for unexpected redemptions and consider invalidating unused keys from these batches as a precaution.

### Technical Debt — `.audit_history`, `.impeccable.md` at root
**Why unnecessary:** Dotfiles with no reference from the app or build tooling; read like tool-session state (`.impeccable.md` matches an editorial/proofreading skill's working file naming) rather than project source.
**Impact of removal:** 2 small files, minor decluttering.
**Risk before deletion:** UNCERTAIN — if an editing tool/skill expects to find these on next use, deleting may just cause it to regenerate them, not break anything. Low stakes either way.
**Recommended action:** Leave, monitor — not worth spending a verification cycle on; delete opportunistically if they resurface as clutter later.

### Technical Debt — `.project/Blueprint Before Build/` nested `CLAUDE.md`/`MEMORY.md` files (10 subfolders, each with its own pair)
**Why unnecessary:** Pre-build planning docs (PRD, TRD, MVP scope, data model, etc.) from before the app existed. Not harmful, but every subfolder carries its own `CLAUDE.md` and `MEMORY.md` — nested instruction files that some tooling (including Claude Code itself) will pick up and merge into context when working anywhere under that path, adding planning-stage noise to a project that has long since shipped.
**Impact of removal:** Reduces instruction-file surface area from 11 `CLAUDE.md`/`MEMORY.md` pairs (10 subfolders + top level) down to the ones that reflect the current app.
**Risk before deletion:** UNCERTAIN — this looks like a deliberate planning archive Eugene may want kept as a historical reference for how the product was scoped. Content risk is low (docs, not code) but it's a judgement call on value, not a technical one.
**Recommended action:** Leave, monitor. If kept, consider stripping the nested `CLAUDE.md`/`MEMORY.md` files specifically (keep the content `.md` files) so the planning archive stops being picked up as live project instructions.

---

## Not Flagged (checked, found clean)

- **App core files** (`app.py`, `static/app.js`, `static/app.css`, `static/index.html`): pass all CLAUDE.md-documented sanity checks (3 `<script>` tags, `node --check`, `py_compile`). No duplicate Flask route registrations — the apparent duplicates are legitimate GET/POST/PUT/DELETE pairs on the same path.
- **`docs/superpowers/`**: dated plan/spec docs for shipped features (cross-workspace save, quick-fill, three new workspaces) — read as a working design-doc archive, not dead weight.
- **`mac/setup.py`**: unreferenced by any Windows build script, but it's a documented, self-contained macOS build entry point (`python3 mac/setup.py py2app`) a Mac user would run by hand. Not dead code, just a platform-specific build path that isn't exercised from this environment.
- **`Prompt Library Interface Files/`**: intentional reference-extraction workbench per CLAUDE.md, not orphaned.

---

## Cleanup Plan (sequenced, risk-ordered)

**1. Delete now, zero risk (do this first):**
- `__pycache__/*.pyc` → `git rm --cached -r __pycache__` (already gitignored)
- `installer/` (130MB) + add to `.gitignore`
- `build/` (30MB) + add to `.gitignore`
- `_archive/static-backups/`
- Root one-off scripts: `add_sprites.py`, `add_tutorial.py`, `expand_agents.py`, `expand_components.py`, `expand_meta.py`, `fix_preview.py`, `fix_tutorial.py`, `gen_blocks.py`, `gen_frameworks.py`, `patch_more_frameworks.py`, `rebuild_from_backup.py`, `update_components.py`, `wire_sprites.py`
- `scripts/*.py` (all 5)
- `_pcw_*.txt` (4 files, tied to the `gen_*.py` removal above)
- `.scratch_patch_review.py`, `.scratch_qf_patch.py`
- `icon.ico.bak`, `static/icon.ico.bak`
- `.obsidian/` + add to `.gitignore`
- `keys_PRIVATE.txt`, `keys_batch_50.txt`, `keys_batch_100.txt`, `all_keys_to_load.txt` + add pattern to `.gitignore` (separately: review Payhip logs given prior git history exposure)
- `PromptLibrary.db` (stray root copy — confirmed not the live DB) + `error.log`, both `git rm --cached` and gitignored

**2. Delete after a quick verification pass (low effort, do second):**
- `_rollbacks/` (68MB, 364 files) — spot-check 2-3 files against `git log` to confirm every version is reconstructable from commit history, then delete
- `code_snippets/` — confirm no planned feature depends on it
- `static/app.css.prebake` — confirm no manual prebake step exists
- Two UUID-named root PNGs — ask Eugene what they are

**3. Leave, monitor (filing decisions, not cleanup):**
- Dated status/planning `.md`/`.txt` docs at root — intentional project history, move to an archive folder if root clutter bothers you, don't delete
- `.audit_history`, `.impeccable.md` — tool-session state, harmless
- `.project/Blueprint Before Build/` — keep the planning docs; consider stripping just the nested `CLAUDE.md`/`MEMORY.md` pairs so they stop being read as live instructions

**Not attempted this pass:** function/component-level dead-code sweep inside `static/app.js` (18k lines) and `app.py` (2.6k lines). CLAUDE.md's dynamic dispatch pattern (`data-view` handlers wired in `init()`, workspace open/init functions called from BOOTSTRAP) means anything flagged there needs tracing through that wiring, not a grep for zero references — worth a dedicated follow-up pass if you want it.
