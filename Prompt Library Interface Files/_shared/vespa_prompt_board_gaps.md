# Prompt Board — Gap Analysis
Category: Pinterest-style bookmarking/collection board (local-first, single-user)

## Current State
Masonry feed of all prompts, user-created boards (pin groups), favorites, tags, search, 5-way sort, per-prompt colour swatch, fork, board rename/duplicate/export/delete, variable-fill-and-copy from the pin detail modal.

## Gaps

### Multi-select / bulk actions
Why it matters: category norm for any pin board once past a handful of items — move/delete/tag N pins at once instead of one modal round-trip per pin. Prompt Board has no selection mode at all; every action (unpin, delete, add-to-board) is single-item only.
Status: proposed

### Drag-to-reorder / drag-to-pin
Why it matters: Pinterest-style boards are defined by drag interaction — dragging a card onto a board sidebar item to pin it, or reordering pins within a board. Here "pinning" is a modal picker (click → pick board from list), never a drag. Given the masonry layout already exists, this is the biggest gap between "looks like Pinterest" and "behaves like Pinterest."
Status: proposed

### Undo on delete
Why it matters: `delete-prompt` and `delete-board` are `confirm()`-gated but permanent — no toast-with-undo window. Every other destructive flow in this app (per CLAUDE.md's own emphasis on local-first safety) would benefit from a few seconds of undo, and Prompt Board is the one place prompts get deleted outright rather than archived.
Status: proposed

### AI-assisted board suggestions
Why it matters: nearly every other workspace in this app (Auditor, Safety Lens, Simplifier, Translator) offers an optional `callAI()`-powered assist. Prompt Board has zero AI touchpoints — no "suggest a board for this prompt," no AI-generated board description. Given the app's own pattern, its absence here reads as an oversight rather than a deliberate choice.
Status: proposed

### Recently viewed / history rail
Why it matters: a feed-based browsing tool without a "recently viewed" or "recently opened" list makes it hard to get back to something you had open two prompts ago. Minor but standard in feed/board UIs.
Status: proposed

## Not in Scope
- No collaboration/sharing across boards — correct, this is a local-first single-user app, intentional.
- Board cover art is a colour swatch only, no custom image/emoji — cosmetic, flagged but not a functional gap.
- `_pmbOpenPinDetail` does a linear `.find()` over `_pmbState.prompts` on every click — fine at current scale, a performance note not a feature gap.
