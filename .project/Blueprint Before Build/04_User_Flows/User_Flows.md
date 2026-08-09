# User Flows / Screen-by-Screen Journeys — Prompt Library Pro

**Owner:** Eugene Phillips
**Date:** 07-08-2026 (retrospective)
**Status:** Live — documents actual shipped flows

---

## 1. Screen Inventory

| Screen / Workspace | Purpose | Tier |
|----------------------|---------|------|
| Library (three-pane) | Main screen — sidebar, prompt list, detail panel | Free |
| Prompt editor modal | Create/edit a prompt, variable syntax highlighting | Free |
| Roles workspace | Full-screen agent/role builder | Free |
| Command palette | Ctrl+K quick actions | Pro |
| Forge / Lab / Playground | Structured building, A/B testing, live run | Pro |
| Components workspace | Drag-and-drop block/framework canvas | Pro |
| Context Bank | Reusable context blocks | Pro |
| Batch Runner | Run one prompt across many inputs | Pro |
| Settings / licence panel | Enter licence key, configure AI provider keys | Free (entry) / Pro (unlock) |

## 2. Primary Flow: Create and Run a Prompt

Library → "New prompt" → Prompt editor modal opens → fill title/content/variables → save (autosaves on change) → prompt appears in list → open detail panel → fill variables → live preview updates → copy filled prompt.

## 3. Primary Flow: Licence Activation

App launch → Settings → licence entry field → paste key → `POST /api/licence/validate` → on success, `premium-locked` classes removed from DOM, `state.isPremium = true` → Pro workspaces unlock in nav.

## 4. Primary Flow: Onboarding (first launch)

App launch → `initOnboarding()` fires from BOOTSTRAP → 12-13 step spotlight tour → steps 6/7/9 open real workspaces as previews (Roles, Forge, Context Bank) rather than just pointing at them → step 8 opens the detail panel on the first library prompt → Escape or finish closes tour, `promptlib.tourDone` set in localStorage. Replayable via sidebar footer "App tour" button.

## 5. Edge-Case Flows

| Scenario | Path |
|----------|------|
| Free tier cap hit (35 prompts / 8 folders) | Action blocked, upgrade prompt shown |
| Stale JS cache after dev edit | Silent — no error, old behaviour persists until `update_hash.py` run and browser reloads |
| Async loader fetch failure | Must be wrapped in try/catch or UI blanks silently with no error surfaced (known gotcha) |
| Interrupted DB write | `PromptLibrary.db-journal` file present — don't overwrite blindly |

## 6. Navigation Structure

Sidebar nav (`data-view` buttons) → each maps to an `openXxxWorkspace()` function → workspace takes over main area → Escape or nav click returns to library via `_escapeToLibrary()`. New workspace nav wiring is a fixed 4-step order (see root CLAUDE.md Hard Rule 5) — skipping a step means the button fails silently.

---

## Notes

- This is not exhaustive — 17+ workspaces exist. Only the most-traveled flows are mapped here. For full workspace-by-workspace behaviour, see the Architecture section of root `MEMORY.md`.
- The onboarding tour is the most heavily-engineered flow in the app relative to its size — six separate fix/polish entries exist in root MEMORY.md's history for it. Treat it as fragile; test manually after any related change.
