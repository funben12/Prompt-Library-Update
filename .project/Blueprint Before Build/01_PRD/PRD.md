# Product Requirements Document (PRD) — Prompt Library Pro

**Owner:** Eugene Phillips
**Date:** 07-08-2026 (retrospective)
**Status:** Live product — captures shipped state, not a future spec

---

## 1. Overview

Prompt Library Pro is a local-first Windows desktop app for storing, organising, and running AI prompts. No cloud, no accounts, no internet required. Built for people who work with AI prompts regularly and want a dedicated, private tool instead of scattered notes or docs. Distributed as a one-off paid Windows installer via Payhip, live since 24-06-2026.

## 2. Feature List (Prioritised)

| Feature | Tier | Description |
|---------|------|--------------|
| Prompt library (CRUD) | Free (35 cap) / Pro (unlimited) | Create, edit, delete, organise prompts |
| Folders | Free (8 cap) / Pro (unlimited) | Prompt organisation |
| Tags & categories | Free (5 tags/8 cats per prompt) / Pro (unlimited) | Classification |
| Variable system | Free | `[[name]]` `{{name}}` `((name))` syntax, live substitution preview |
| Chain prompting (detail panel) | Free | Multi-step prompt chains via detail panel tab |
| Agents / Roles workspace | Free | Full role builder — identity, voice, context, KB, skills |
| Command palette | Pro | Ctrl+K, 18 commands, 4 groups |
| Prompt Forge / Lab / Playground | Pro | Structured building, A/B testing, live execution |
| Prompt Components workspace | Pro | Drag-and-drop block/framework canvas, 23 frameworks |
| Prompt Optimizer / Tone Calibrator | Pro | AI-assisted rewriting via shared `callAI()` |
| Context Bank | Pro | Reusable context blocks, localStorage-backed |
| Batch Runner | Pro | Run one prompt across many input rows via CSV/line input |
| Version history | Pro | Per-prompt version log with restore |
| Analytics | Pro | Usage stats, top prompts, tag clouds |
| Export (Markdown/CSV/Bulk) | Pro | Multiple export formats |
| Licence system | System | SHA-256 key validation, one key per machine, permanent |

## 3. Acceptance Criteria (Free tier caps — confirmed live)

| Feature | Acceptance Criteria |
|---------|---------------------|
| Prompt cap | Free users blocked at 35 prompts with upgrade prompt |
| Folder cap | Free users blocked at 8 folders |
| Tag/category cap | Free users blocked at 5 tags, 8 categories per prompt |
| Licence activation | Key validates via `/api/licence/validate`, locks to machine_id, persists in SQLite `settings` table |

## 4. Business Logic

- Free vs Pro gating is DOM-class-based (`premium-locked`) plus `state.isPremium` JS check — not server-enforced beyond licence validation itself.
- Licence is a one-off lifetime purchase, not a subscription — confirmed in root MEMORY.md Plan modal notes.
- No AI provider is bundled — Pro's in-app AI executor (`callAI()`) calls user-supplied API keys (OpenAI, Anthropic, Gemini, OpenRouter), stored in plain `localStorage` (flagged as an unresolved security gap in root MEMORY.md — not yet DPAPI-encrypted).

## 5. Edge Cases

- Interrupted DB writes: `PromptLibrary.db-journal` presence implies an interrupted write — never blindly overwrite.
- Stale JS cache: forgetting `update_hash.py` after an app.js edit means changes silently don't appear — no error, just old behaviour.
- ReadOnly file attribute (seen 2026-07-25) can crash the app pre-launch across the whole working tree, not just one file.

## 6. UX Expectations

- Three-pane layout: sidebar, prompt list/feed, right detail panel.
- Warm beige + teal theme (`--bg oklch(93.5% 0.01 70)`, accent `oklch(38% 0.14 190)`), Fraunces display serif + Instrument Sans body.
- No video onboarding — interactive spotlight tour only (explicitly rejected as a direction, don't revisit).
- New workspace build order is fixed (see root CLAUDE.md Hard Rule 5) — a nav button with no handler fails silently, so UX consistency depends on following that order exactly.

## 7. Out of Scope (explicitly removed or rejected)

- Meta Prompting workspace — removed, do not rebuild.
- Scorecard workspace — removed 02-06-2026.
- Collection Builder workspace — removed 02-06-2026.
- Standalone Chain workspace — reverted to detail panel tab, 17-05-2026.
- Video-based onboarding — explicitly rejected.
- System-wide Text Expansion (Layer 2, global keyboard hook) — deferred over AV flag risk.

---

## Notes

- This PRD is retrospective — it documents the shipped product, not a plan for one. For active feature planning, see the Roadmap section of root `MEMORY.md`.
- `PROMPT_LIBRARY_PRO_SPEC.md` (745 lines) is the deeper canonical spec — this PRD is a compressed, current-state summary of it plus everything MEMORY.md has recorded since.
