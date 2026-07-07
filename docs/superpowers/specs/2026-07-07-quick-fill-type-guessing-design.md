# Quick Fill: Variable Type Guessing

Date: 2026-07-07

## Context

Prompt Library Pro's existing **Quick Fill** workspace (`app.js:11329` region, `data-view="fill"`) extracts `{{var}}` / `[var]` placeholders from a pasted prompt and renders one auto-grow textarea per variable, with per-variable value memory in `localStorage` (`pl_qf_memory`).

A separate Cowork wireframe ("Variable Zapper", `C:\Users\Eugene Phillips\Documents\My Cowork OS\Variable Zapper Wireframe\`) prototypes the same core flow but additionally **guesses a field type per variable** (text / long text / number / yes-no) based on the variable name, and lets the user override the guess via a small dropdown.

This spec covers porting the type-guessing + override behavior into the existing Quick Fill workspace. It does **not** introduce a new workspace — Quick Fill already covers the placeholder-extract-and-fill flow, so this is an enhancement to it, not a rebuild.

Out of scope: the wireframe's `select` (custom dropdown) field type is dropped — there is no source for a custom option list per variable, and adding one is unrequested complexity (YAGNI).

## Design

### 1. Type-guess heuristic

Pure keyword match on the variable name, case-insensitive, first match wins, offline (no AI call — matches the app's local-first, no-internet-required identity):

| Type | Trigger (name contains) | Rendered as |
|---|---|---|
| `boolean` | `is_`, `has_`, `should_`, `can_`, `enable` | Yes/No `<select>` |
| `number` | `count`, `qty`, `quantity`, `number`, `age`, `amount`, `price`, `total`, `rating`, `score`, `percent`, `year`, `days`, `weight`, `height` | `<input type="number">` |
| `longtext` | `description`, `desc`, `bio`, `summary`, `details`, `notes`, `content`, `body`, `instructions`, `context`, `background`, `paragraph` | auto-grow textarea, taller default (more starting rows than current) |
| `text` (default) | (no match) | auto-grow textarea, single-row default (current behavior, unchanged) |

Implemented as a new helper, e.g. `_qfGuessType(name)`, called from `_qfRenderForm()` when building `_qfVars`.

### 2. Override control

Each rendered field gets a small `<select>` next to its label with options `Text / Long text / Number / Yes-No`, defaulting to the guessed type. Changing it re-renders just that field's input control in place (swap textarea ↔ number input ↔ yes/no select), preserving any already-typed value where the conversion makes sense (e.g. text ↔ longtext keep the string; switching to number/boolean and the existing value doesn't parse cleanly, clear it rather than showing a broken value).

### 3. Persistence

`pl_qf_memory` currently maps `varName → valueString`. Extend to `varName → { value, type }` so a manual type override is remembered per variable name across sessions, same as the value already is.

Backward compatibility: existing entries are plain strings (legacy shape). On read, if `mem[name]` is a string, treat it as `{ value: mem[name], type: undefined }` (falls back to the fresh keyword guess). No migration script — both shapes coexist; entries get upgraded to the object shape the next time that variable is filled or its type is overridden. This is a `localStorage` cache format, not the app's SQLite schema, so it's exempt from the "no schema migrations without approval" rule, but the same care applies: never drop a user's existing filled value.

### 4. Files touched

- `static/app.js` — `_qfGuessType()`, `_qfRenderForm()` changes, `_qfExtractVars`/`_qfVars` shape gains `type`, `pl_qf_memory` read/write helpers (`_qfMemory`/`_qfRemember`) updated for the new value shape, per-field-type input renderers, override `<select>` change handler.
- `static/index.html` — Quick Fill field template only if the current template is hardcoded there rather than built in JS (needs confirming while implementing; current rendering appears to be fully JS-built via `_qfRenderForm`, so likely no HTML change needed beyond possibly CSS for the new type-select).
- `static/app.css` (or wherever Quick Fill styles live) — small style for the new per-field type `<select>`.
- `update_hash.py` run after app.js edit (mandatory per project workflow).

### 5. Testing

Manual verification (no test harness in this project):
- Paste a template with vars named to hit each heuristic bucket (e.g. `{{isPremium}}`, `{{itemCount}}`, `{{description}}`, `{{customerName}}`) → confirm each renders the expected input type.
- Override a guessed type via the dropdown → confirm input control swaps and value handling is sane (no crash, no silently-wrong value shown).
- Reload the app → confirm remembered values AND overridden types persist.
- Confirm a variable filled under the *old* memory format (plain string, from before this change) still loads its value correctly post-upgrade.
