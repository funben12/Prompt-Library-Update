# Prompt Library Pro — Vault System Spec

Drafted 2026-09-14. Aligned with `.impeccable.md` and `REFACTOR_SPEC.md`. Status: approved by Eugene 2026-09-14, awaiting implementation plan.

## The idea

Obsidian's local-folder model, applied to prompts. A vault is a plain folder on disk. Prompts inside it are `.md` files with YAML front matter. Delete the file, the prompt is gone from the app. The vault folder is portable: copy it, move it, plug it into another machine, it still works.

This sits **alongside** the existing DB library, not instead of it. `PromptLibrary.db` and everything backed by it (folders, chains, meta blueprints, relationships) is untouched. Vaults are a new, optional storage type.

## Decisions locked

1. **Vault-swap picker.** Opening a vault swaps the whole Prompts workspace list. No blended view across vaults or between a vault and "My Library." One picker, one active source at a time.
2. **Additive, not a migration.** The current library stays exactly as it is, DB-only, forever, unless Eugene explicitly exports prompts out of it. No auto-cutover on first launch.
3. **Prompts only for v1.** A vault holds prompts (folders + `.md` files). Chains and meta-blueprints stay DB-only — their JSON node/graph structure doesn't flatten cleanly into markdown without real design work, deferred to a v2 if it earns its place.
4. **Plugins and themes:** out of scope. Not being built.

## Storage model

```
Any Vault Folder/ (user-chosen, anywhere on disk)
├── .promptvault/
│   └── index.db              ← SQLite cache, rebuilt from the files, disposable
├── Client Prompts/
│   └── PE-Discovery-Call-v1.md
├── Boot Fair Ops/
│   └── OPS-Floor-Plan-v1.md
└── Standalone-Prompt-v1.md
```

- Real OS folders = folders in the app. No virtual taxonomy layered on top for vaults.
- `.promptvault/index.db` is a cache, not a source of truth. It can be deleted and rebuilt from the `.md` files with no data loss. It exists purely so search/filter/tag lookups don't re-parse every file on every keystroke.
- Vaults never reference `PromptLibrary.db` and vice versa. No shared IDs, no foreign keys across the boundary. This is what keeps "My Library" untouched by anything that happens to a vault.

## File format

Reuses the existing library export convention rather than inventing a new one:

```
[PREFIX]-[Prompt-Name]-v1.md
```

```yaml
---
title: ...
category: ...
subcategory: ...
tags: [...]
difficulty: Beginner | Intermediate | Advanced | Expert
target_audience: ...
inputs: ...
expected_output: ...
related_prompts: [...]
version: 1
last_updated: YYYY-MM-DD
---

<prompt body, Markdown>
```

A file dropped into a vault folder from outside the app (Explorer, git, hand-written) is picked up on next scan if the front matter parses. If it doesn't parse, it's listed as "unrecognised" in the vault view rather than silently skipped — Eugene sees it and can fix or ignore it.

## Sync

**Recommended approach:** rescan on vault open + rescan on window focus regain + a manual "Rescan" button. No background watcher, no new dependency.

Rejected for v1: a live filesystem watcher (`watchdog` package). Would give instant updates but is a new dependency on a PyInstaller-frozen single-file app that has none today — against the "no new dependencies without approval" rule, and one more thing to debug silently if it misbehaves. Can be revisited later if rescan-on-focus proves too laggy in practice.

Rescan behaviour: walk the vault folder, parse front matter on each `.md`, upsert into `index.db` by file path. Files present in `index.db` but missing on disk are dropped from the cache. Files on disk with unparseable front matter are flagged, not dropped.

## Vault picker (UI)

Lives in the Prompts workspace sidebar, above the existing Library / Favourites / Analytics sub-nav from `REFACTOR_SPEC.md`. Same visual pattern as the workspace switcher already being built:

```
┌──────────────────────────┐
│  📖 My Library    (default)│  ← DB-only, today's library
├──────────────────────────┤
│  🗂  Client Prompts        │  ← a vault
│  🗂  Boot Fair Ops         │  ← a vault
├──────────────────────────┤
│  + Add vault               │
└──────────────────────────┘
```

"Add vault" opens a folder picker. Pointing at an existing folder of `.md` files not created by this app is supported — that's the Obsidian-interop appeal, not just a container for exports.

## Migration / export

An explicit action on the DB library: **"Export to vault."**

1. Select one or more prompts from My Library.
2. Choose an existing vault or create a new one.
3. Prompts are written out as `.md` files using the existing naming convention, then pulled into that vault's `index.db`.
4. Default behaviour: **copy**, not move. My Library keeps the originals. An optional "remove from My Library after export" checkbox does the move for anyone who wants a clean cutover on specific prompts.

No batch or automatic migration of the whole library. Nothing destructive without an explicit, visible choice.

## Schema

```sql
CREATE TABLE vaults (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  path       TEXT NOT NULL UNIQUE,
  last_scan  TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

This table lives in `PromptLibrary.db` — it's just the list of known vaults and where to find them, nothing about their content. Each vault's own `.promptvault/index.db` holds a lightweight `prompts` table keyed by relative file path, mirroring the front-matter fields above. The two databases never join.

## API surface — additions

```
GET    /api/vaults
POST   /api/vaults                 # {name, path} — validates folder, creates .promptvault/, initial scan
DELETE /api/vaults/:id             # forgets the vault, does not touch the folder on disk
POST   /api/vaults/:id/rescan
GET    /api/vaults/:id/prompts
GET    /api/vaults/:id/prompts/:path
POST   /api/vaults/:id/prompts     # write new file + index
PUT    /api/vaults/:id/prompts/:path
DELETE /api/vaults/:id/prompts/:path   # deletes the file on disk, not just the row
POST   /api/library/export-to-vault    # {prompt_ids, vault_id, remove_originals}
```

Existing `/api/prompts/*`, `/api/folders/*`, `/api/chains/*`, `/api/meta/*` are unchanged.

## Frontend state

```js
state = {
  workspace: 'prompts' | 'meta' | 'chains',
  librarySource: { type: 'db' } | { type: 'vault', vaultId: N },
  view: 'library' | 'favorites' | <folder_id>,
  // ...existing
}
```

Switching `librarySource` re-fetches the prompt list from the matching endpoint and resets `view` to that source's default. Everything downstream (list rendering, detail panel) is agnostic to whether a prompt came from `PromptLibrary.db` or a vault's `index.db` — both are serialised to the same shape before hitting the frontend.

## Error handling / gotchas

- **Malformed front matter** → file listed as "unrecognised," not hidden, not crashed on.
- **Vault folder deleted or moved externally** → next rescan (or explicit "locate vault" action) fails cleanly with a clear message, vault stays in the picker in a "not found" state rather than silently vanishing.
- **Duplicate filenames within a vault folder** → last one wins on scan, surfaced as a warning, not a silent overwrite.
- **`.promptvault/index.db` corrupted or missing** → treated as empty cache, full rescan rebuilds it. Never a fatal error.
- Same journal-file caution as `PromptLibrary.db` applies to any `index.db` — don't blindly overwrite/delete if a `-journal` file is sitting next to it.

## Build order

1. Backend: standalone front-matter parser + scanner module. Verify against real files by hand before anything else touches it.
2. Backend: `vaults` table, `.promptvault/index.db` bootstrap, `/api/vaults*` routes.
3. Backend: `/api/library/export-to-vault`.
4. Frontend: vault picker in the Prompts sidebar, wired to `librarySource` state.
5. Frontend: export-to-vault action from My Library (prompt selection → vault target → confirm).
6. Verify end to end: create vault from empty folder, create vault from a folder of hand-written `.md` files, export a prompt, delete a file on disk and confirm it drops on rescan, rename/move the vault folder and confirm the "not found" path.

## Verification plan

No test suite in this project — same manual pattern as everything else here: `node --check static/app.js`, `python3 -m py_compile app.py`, `python3 update_hash.py` after any `app.js`/`app.css` change, then a real click-through of the build-order checklist above.

## Out of scope (explicit)

- Vault-level plugins, themes, or settings beyond the index cache.
- Chains and meta-blueprints as vault-backed content.
- Live filesystem watching.
- Cross-vault or vault-to-DB search in one view.
- Conflict resolution for two vaults sharing overlapping folder paths.
