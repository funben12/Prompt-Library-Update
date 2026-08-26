# Metaprompting

Reference extract of one interface area of Prompt Library Pro. Read-only copy —
the live app still runs from `static/index.html`, `static/app.css`, `static/app.js`.

## Files

| File | What it is |
|---|---|
| `markup.html` | The exact HTML block for this view, dedented. Root element: `#metaWorkspace` |
| `styles.css` | CSS rules from `static/app.css` whose selectors target this view's ids / view-specific classes (10 rules) |
| `script.js` | Top-level functions from `static/app.js` that reference this view's ids or carry its name prefix (3 functions) |
| `preview.html` | Standalone page that loads `_shared` + the three files above, for isolated visual work |

## Source locations

- HTML: `static/index.html`, element `#metaWorkspace`
- CSS: `static/app.css`
- JS: `static/app.js` (one IIFE — these functions are extracted out of it)

## Functions in `script.js`

- `openMetaWorkspace()`
- `closeMetaWorkspace()`
- `initMetaWorkspace()`

## Editing workflow

1. Change here first, open `preview.html` to eyeball it.
2. Port the change back into the real files by hand (`static/index.html` / `app.css` / `app.js`).
3. `node --check static/app.js`, then `python3 update_hash.py` after any `app.js` edit.

Anything global (tokens, buttons, layout primitives, `state`, `api`, helpers) lives in
`../_shared/` — it is shared by every view, so change it with care.
