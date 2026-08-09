# Data Model & Database Schema — Prompt Library Pro

**Owner:** Eugene Phillips
**Date:** 07-08-2026 (retrospective)
**Status:** Live — SQLite, schema defined in `init_db()` in `app.py`

---

## 1. Entities (confirmed tables, from root CLAUDE.md Architecture section)

| Entity | Notes |
|--------|-------|
| settings | Key-value store — includes licence activation state |
| folders | Prompt organisation, Free-tier capped at 8 |
| prompts | Core entity — title, content, variables, folder, tags, categories |
| prompt_versions | Version history (Pro feature) |
| variable_templates | Reusable variable definitions |
| usage_log | Analytics source (Pro feature) |
| chains | Chain prompting — `chain_ids` column links prompts into a sequence |
| meta_blueprints | Supports Metaprompting workspace |
| roles | Roles/Agents workspace — identity, voice, context, plus 6 added columns: `audience`, `output_format`, `constraints`, `domain`, `tasks`, `response_style` |
| taxonomy_domains | Roles workspace taxonomy |
| taxonomy_use_cases | Roles workspace taxonomy |
| prompt_relationships | Links between prompts |
| licences | Key hash, display key, is_used, date_activated, machine_id (see `LICENCE_SYSTEM.md`) |

## 2. Relationships

| From | To | Cardinality | Notes |
|------|----|-----------  |-------|
| prompts | folders | N:1 | A prompt belongs to one folder |
| prompts | prompt_versions | 1:N | Version history per prompt |
| prompts | chains (via chain_ids) | N:N | Chain steps reference prompt IDs |
| prompts | roles (via role_id) | N:1 | Optional role attached to a prompt |
| licences | (machine) | 1:1 | One key locked to one machine_id |

## 3. Indexes & Constraints

Not exhaustively documented — see `init_db()` directly in `app.py` for the authoritative schema (CREATE TABLE statements with constraints).

## 4. Data Retention & Privacy

| Entity | Contains PII? | Notes |
|--------|----------------|-------|
| licences | Machine ID only, no personal data | Locked to machine, not to a person |
| settings | AI provider API keys (Pro) | Stored in `localStorage`, plain text — flagged security gap, not DPAPI-encrypted |
| All prompt data | User-generated content, stays local | Never transmitted except direct AI provider API calls (Pro, user-initiated) |

No GDPR/CCPA exposure in the traditional sense — fully local storage, no server-side collection of user data. The one live privacy consideration is the plaintext API key storage.

## 5. Backups & Migrations

- No formal migration system. **Hard Rule 2 (root CLAUDE.md): no schema changes without explicit approval.**
- `_rollbacks/` folder holds manual snapshots of index.html/app.js (not DB) for recovery.
- `PromptLibrary.db` and `PromptLibrary.db-journal` are live files in repo root during dev — the journal's presence signals an interrupted write; never blindly overwrite.

---

## Notes

- This is a solo-maintained local app — schema changes are low-frequency and manual by design, not automated via migration tooling. That's appropriate for the scale; don't propose migration frameworks unless the project genuinely needs multi-environment schema sync.
- The plaintext API key storage in `localStorage` is the one real gap worth eventually fixing — see 02_TRD Security section.
