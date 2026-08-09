# 02_TRD — CLAUDE.md

## Purpose

Specify how the product is actually built. Retrospective record of the real architecture, not a design proposal.

## Rules for Claude

- This TRD is descriptive, not prescriptive — it documents what's live, not what should be built next.
- The six Hard Rules in root `CLAUDE.md` (app.js/index.html editing, schema changes, cache-busting, monolith growth, workspace build order, CSS duplication) are the load-bearing technical constraints. This TRD summarises them but root CLAUDE.md is canonical — always check there before technical decisions.
- If the stack changes (new dependency, schema migration), both this file and root CLAUDE.md need updating — and any new dependency or schema change needs Eugene's explicit approval first per Hard Rule 2.
