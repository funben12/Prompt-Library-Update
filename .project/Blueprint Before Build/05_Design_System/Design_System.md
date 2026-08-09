# Design System / UI Kit — Prompt Library Pro

**Owner:** Eugene Phillips
**Date:** 07-08-2026 (retrospective, corrected)
**Status:** Live — sourced from live `static/app.css`

---

## Important Correction

Root MEMORY.md has a stale entry describing a "cool-slate" (hue 255) theme. That was **superseded on 09-06-2026** by the current warm beige + teal theme, confirmed live again on 25-07-2026. This document reflects the current, correct theme. Do not reintroduce cool-slate.

## 1. Brand Colours

| Token | Value | Use |
|-------|-------|-----|
| `--bg` (light) | `oklch(93.5% 0.01 70)` | Base background |
| `--accent` | `oklch(38% 0.14 190)` | Teal accent, light mode |
| `--bg` (dark) | *(see app.css — dark variant exists)* | Base background, dark mode |
| `--c-blue` (dark) | hue 245 | Prompt colour label — corrected 25-07-2026, was wrongly hue 190 (matched teal, made blue/teal labels indistinguishable) |

Two theme selectors only: `:root` (light) and `:root[data-theme="dark"]`. No `prefers-color-scheme` block — theme is user-toggled, not OS-driven.

## 2. Typography

| Role | Font |
|------|------|
| Display / headings | Fraunces (serif) |
| Body | Instrument Sans |

## 3. Spacing / Layout

- Header: two rows (cut from three in the phase-1 library redesign). Row 1: sidebar toggle, title, search, command palette button, "New prompt". Row 2: filters popover, sort, active filter pill, view toggle/group-by/surprise-me cluster. Reduced from 180px to 120px at desktop.
- `#viewTitle` uses `--fs-lg`, not `--fs-2xl` (that was a bug — inherited the page-hero size).
- 1100px breakpoint drops search to its own line to prevent `#app`'s `overflow:hidden` clipping the "New prompt" button.

## 4. Components

| Component | Notes |
|-----------|-------|
| Prompt cards | Meta row muted to `--ink-4`, folder/clock glyphs stripped (variable icon kept), chips capped at 2 categories + 2 tags with `+N` overflow |
| Bulk toolbar | Has a known bug pattern — `display:flex` outranked `[hidden]`, causing 49px of invisible dead space above every list. Fixed with `.bulk-toolbar[hidden] { display: none }` — watch for this pattern (a set `display` value beating the `[hidden]` attribute) elsewhere |
| Launcher cards | 17 workspace cards, group colour on icons only (build=blue, refine=purple, inspect=orange, run=green) — this freed `--accent` from being on all 17 icons |
| Pro-lock indicator | `.launcher-card-pro` gold chip, replaced old padlock icons |

## 5. Icons

Material Symbols, per root Cowork OS brand voice convention (also applies at app level, not just Cowork OS).

## 6. Accessibility

No formal accessibility audit documented for this project. Not yet a stated requirement — flag if it becomes one.

---

## Notes

- **CSS duplication is a real, recurring bug source here.** Hard Rule 6 in root CLAUDE.md exists because of it — grep before appending new CSS rules targeting the same ID/class, the earlier block wins silently.
- Theme hash for cache-busting: `2083709d` (as of 09-06-2026 rework) — this changes with future CSS edits, check root MEMORY.md's Build hash entry for current value.
