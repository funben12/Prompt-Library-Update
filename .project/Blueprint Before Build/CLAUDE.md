# Blueprint Before Build — Prompt Library Pro

Operating instructions for this project's Blueprint Before Build stack.

---

## Status: Retrospective, Not Pre-Build

This stack normally runs before a build starts. Prompt Library Pro is already live on Payhip (launched 24-06-2026) with a mature feature set — so this is a **retrospective blueprint**: capturing what's actually true about the product so future feature work has a real reference point, not a fresh-start scaffold.

## Purpose

Same ten-document standard as every project: define what's built, how, and why. Here it doubles as documentation debt repayment — CLAUDE.md and MEMORY.md already carry a lot of this informally; this stack organises it by document type so it's easier to find and keep current.

## Folder Structure

Same as the master template at `00_Resources/Templates/Structure Templates/Blueprint Before Build/`. Ten numbered folders, each with its own CLAUDE.md, MEMORY.md, and one populated document.

## Rules for Claude

- Treat this as living documentation, not a one-time exercise. When a new workspace ships or a feature gets removed, update the relevant document (usually 01_PRD or 03_MVP_Scope) — same discipline as the root MEMORY.md's Current State entries.
- Source of truth for facts always remains the project root `CLAUDE.md` and `MEMORY.md` — this stack is a reorganised view of that truth, not a competing one. If they ever disagree, root MEMORY.md wins; flag the discrepancy and fix it here.
- Don't duplicate the Hard Rules (never touch app.js/index.html with Edit/Write, no schema changes without approval, etc.) — those stay in root CLAUDE.md. Reference them, don't restate them.
- 02_TRD, 06_Data_Model, and 07_Permissions_Roles map closely to the existing Architecture section in root CLAUDE.md/MEMORY.md — cross-check before editing to avoid drift.
