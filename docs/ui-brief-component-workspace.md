# UI/UX Design Brief — Component Workspace

**Screen/flow:** `#componentsWorkspace` (PCW) — infinite-canvas prompt composition
**Audience:** Prompt engineers and power users. High tool literacy, keyboard-biased, build in long sessions.
**Status:** Workspace already ships. This brief covers the redesign, not a greenfield build.

---

## 1. Audit findings (verified in code, not assumed)

| # | Finding | Status | Evidence |
| :-- | :--- | :--- | :--- |
| A1 | `--ff-display: Fraunces` and `--ff-sans: Instrument Sans` were declared but **never loaded**. Every heading silently fell back to Georgia, all body copy to Segoe UI. | **Fixed** — commit `b0f61bd` | `app.css:20-21` vs `index.html:12` |
| A2 | ~~No responsive layout~~ — **overstated, retracted.** The raw count (287 `pcw-` rules, 1 in a media query) was misleading: `.pcw-body` is a single-column grid whose only child is the canvas, and the preview sheet already sizes at `min(460px, 55%)`. The layout is largely fluid by construction. Narrow-width behaviour still needs a real check, but it is not the headline defect I first called it. | Retracted | `app.css:5351`, `app.css:6755` |
| A3 | **Keyboard focus invisible on several components.** My first framing (`outline: none` ×19 vs `focus-visible` ×3) was imprecise — the global rule at `app.css:283-284` is correct modern practice. The real cause: ~6 component rules set `outline: none` on their *resting* state and, at equal specificity but later in the cascade, defeat the global `:focus-visible`. | **Fixed** — commit `b0f61bd` | `app.css:3695, 3880, 4089, 4225, 5387` |
| A4 | **Canvas is mouse-only.** Zero `Arrow` key references across the entire 3,930-line workspace block; 1 `tabindex`; the 5 `keydown` handlers are shortcuts and Esc, not spatial movement. Blocks cannot be moved or reordered from the keyboard. | Open — v1 scope | `app.js:7430-11360` |
| A5 | **One draft, client-only.** The whole canvas persists to a single `localStorage` key `pl_pcw_draft`; the write is wrapped in a silent `try/catch`. Storage full = work lost, no warning. | Open — v1 scope | `app.js:9376-9390` |
| A6 | **No server-side model for components at all** — no components/blocks/kits table exists. | Open — v1 scope | `app.py` (0 grep hits) |

### Retracted during verification

**`.pcw-palette*` is not dead CSS.** I briefly flagged its 27 CSS rules as orphaned because the class appears nowhere in `index.html`. It is rendered dynamically by JS into `#pcwPaletteBody` (`app.js:9624`). The first grep that would have caught this never executed — a preceding `grep -c` returned 0, exited non-zero, and short-circuited the `&&` chain. Recorded here because it is the exact false-positive mode that makes automated dead-CSS detection unsafe in this codebase: **class names are assembled in JS string templates, so absence from HTML proves nothing.**

A1 and A3 were the cheap global wins and are now landed. A4–A6 are structural and drive the PRD.

---

## 2. User journey

1. **Enter** — user opens Components from the nav. Canvas restores the previous draft, or shows the empty state.
2. **Empty state** — `#pcwDropHint`: one primary action (*Open component library*) plus three quick starts (Essential structure / Reasoning prompt / Browse frameworks). Keep this; it is doing real work.
3. **Browse** — gallery (`#pcwGallery`) opens over the canvas. User filters by category pill or searches, previews block text, adds to a kit (cart pattern).
4. **Compose** — blocks land on the infinite world (`#pcwWorld`, zoom 0.25–2.0, pan). User arranges, collapses, reorders, fills `[bracketed blanks]`.
5. **Review** — preview sheet (`#pcwPreviewSheet`) shows the assembled prompt, live word count and blank count.
6. **Save** — title (required), folder, tags → writes a normal prompt via the prompts API.

**The gap:** step 4→6 is a one-way street. Compositions are not first-class objects — you get a flat prompt out, and the arrangement is discarded. See PRD §4.

---

## 3. Layout and breakpoints

Three zones, current structure is sound — the problem is it does not adapt.

```
┌──────────────────────────────────────────────┐
│ header  title · stats (blocks/words/tokens)  │  56px
├─────────┬────────────────────────┬───────────┤
│ palette │  canvas (infinite)     │  preview  │
│ 264px   │  flex, zoom+pan        │  sheet    │
│         │  view tools bottom-L   │  360-480px│
├─────────┴────────────────────────┴───────────┤
│ footer  title input · block count · blanks   │  64px
└──────────────────────────────────────────────┘
```

Breakpoints to add (none exist today beyond one rule):

- **≥1440px** — all three zones open. Preview docked right.
- **1100–1439px** — preview becomes an overlay sheet, not a dock. Palette stays.
- **768–1099px** — palette collapses to an icon rail (56px), expands on click over the canvas.
- **<768px** — single column, tabbed: *Library / Canvas / Preview*. Canvas is a linear list, not a 2D world — 2D arrangement is meaningless at this width.

Spacing: use the existing `--sp-*` scale only. Canvas gutter `--sp-5`, block padding `--sp-4`, gallery grid gap `--sp-3`.

---

## 4. Component inventory + every state

| Component | Rest | Hover | Focus | Active/selected | Loading | Empty | Error |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Canvas block | surface + 3px category-colour left edge | lift 2px, shadow-md | 2px `--accent` ring, offset 2px | ring + category tint bg | — | — | red left edge if blanks unfilled |
| Palette section | collapsed, count badge | bg `--surface-2` | ring | left border = `--cat-color` | shimmer rows x3 | "No blocks in this category" | — |
| Palette search | sunk field | line-strong border | accent ring | — | — | `.no-results` state exists — keep | — |
| Gallery card | surface, 1px line | lift + preview reveal | ring | accent border + check | skeleton card | "Nothing matches [query]" + clear-filter action | — |
| Kit/cart bar | hidden at 0 | — | — | slides up when count>0 | — | hidden | — |
| Preview sheet | docked/overlay | — | — | — | shimmer text block | "Add blocks to see your prompt" | "Could not assemble — [reason]" |
| Save (footer) | disabled until title | — | ring | spinner in button | — | — | inline toast, keep draft intact |
| Zoom control | 100% label | — | ring | — | — | — | — |

**Missing states to build:** every loading state above (only a generic `.skeleton` exists), and every error state — the current code swallows failures silently (A5).

---

## 5. Typography + colour tokens

Use existing tokens. Two changes only:

1. **Load the fonts that are already declared** (A1) — add `Fraunces` and `Instrument+Sans` to the Google Fonts request, or drop them from the token and commit to the fallback. Do not leave the current mismatch.
2. Canvas block body text → `--ff-mono` at `--fs-sm`. Prompt content is code-adjacent; monospace makes `[blanks]` scannable.

- Display/headings: `--ff-display`, `--fs-lg`/`--fs-xl`, letter-spacing `-0.02em`
- UI/body: `--ff-sans`, `--fs-sm`/`--fs-base`
- Block content + preview: `--ff-mono`, `--fs-sm`
- Surfaces: `--bg` page, `--surface` blocks, `--surface-sunk` inputs/preview well
- Category colour drives the block's left edge and palette section border only — never the block background at full saturation. Keep colour as a wayfinding signal, not decoration.
- Blanks `[like this]` render in `--warn` with `--warn-soft` background.

---

## 6. Motion

Existing tokens `--t-fast 120ms`, `--t-base 200ms`, `--t-slow 320ms`, `--ease-out-quart`, `--ease-out-expo`.

| What | Duration | Easing |
| :--- | :--- | :--- |
| Block add to canvas | 200ms scale 0.96→1 + fade | `--ease-out-expo` |
| Block drag lift | 120ms shadow + 2px translate | `--ease-out-quart` |
| Palette section expand | 200ms height | `--ease-out-quart` |
| Preview sheet slide | 320ms translateY | `--ease-out-expo` |
| Gallery open | 200ms fade + 8px rise | `--ease-out-expo` |
| Cart bar rise | 200ms translateY | `--ease-out-expo` |
| Zoom | 120ms transform | `--ease-out-quart` |

Never animate canvas pan — it must feel direct. `prefers-reduced-motion` blocks already exist; extend them to cover the new transitions.

---

## 7. Accessibility (this is the weakest area)

- **Restore focus rings.** Replace the 19 `outline: none` declarations with `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }`. Non-negotiable.
- **Keyboard canvas** (A4): `Tab` to a block, arrow keys to move it, `Shift+↑/↓` to reorder in assembly order, `Enter` to expand/edit, `Delete` to remove. A drag-only interface excludes keyboard users entirely and slows power users.
- Canvas needs `role="list"` semantics for assembly order, independent of 2D position.
- Announce state changes via the existing `aria-live` on `#pcwHeaderStats` — block added, block removed, blanks remaining.
- Category colour must never be the sole signal — pair with icon + label (already done in the palette; verify on canvas blocks).
- Verify contrast of `--ink-4` hint text on `--surface-3` — likely below 4.5:1.
- Gallery is a modal-over-canvas: trap focus, `Esc` closes, return focus to the trigger.

---

## 8. Direction (study, never copy)

- **Figma** — infinite canvas conventions: zoom-to-fit, spatial memory, non-destructive arrangement. Take the canvas *grammar*, not the chrome.
- **Linear** — keyboard-first density, command palette, restraint in colour. Take the speed and the discipline.
- **Notion** — block composition and slash-insert. Take the idea that a block is a first-class, reorderable, typed object.

House style stays: warm beige surfaces, teal accent, serif display, generous spacing. Do not drift toward a generic dark IDE look.
