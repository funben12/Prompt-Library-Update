# 06_Data_Model — CLAUDE.md

## Purpose

Document the live SQLite schema and data relationships.

## Rules for Claude

- Schema list here is not exhaustive on columns/constraints — `init_db()` in `app.py` is the authoritative source, always check it directly before making schema-dependent decisions.
- **No schema changes without Eugene's explicit approval** (Hard Rule 2, root CLAUDE.md) — this applies to any edit here that implies a new column or table too.
- `PromptLibrary.db-journal` presence means an interrupted write — flag it, don't overwrite.
