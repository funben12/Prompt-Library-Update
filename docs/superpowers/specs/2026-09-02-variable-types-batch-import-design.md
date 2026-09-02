# Variable Types Overhaul and Batch Import Design

Date: 2026-09-02
Status: proposed (awaiting user review)

## Summary

Three related changes to the prompt-editing and import experience:

1. Rework the variable-type list: remove Markdown, replace three low-value
   Input types with more broadly useful ones, add a multi-select mode to
   Toggle Group, and add six new "Advanced" choice types.
2. Overhaul batch import: a single destination-folder picker for the whole
   batch, plus a new "Paste (Smart)" tab that accepts raw, unformatted
   clipboard text and heuristically splits it into candidate prompts via a
   new backend endpoint.
3. Add a short, character-capped version of the Markdown import template
   sized for AI custom-instructions fields, and harden the existing
   Markdown parser against minor formatting drift.

This design needs no database schema changes and no new dependencies.

## A. Variable types

### A.1 Remove

`markdown` type is removed from the "Text" optgroup and from the render
switch in `renderVariableFields()`. A prompt with an existing variable
saved as `type: 'markdown'` renders as plain `text` going forward. No
migration needed: `variable_meta` is freeform JSON, so old data just stops
matching a case and falls through to the default text renderer.

### A.2 Replace in "Input" optgroup

`percentage`, `filepath`, `imageurl` are removed and replaced with:

- **Duration** (`duration`): free-text input with a placeholder like
  `e.g. 30 minutes, 2h 15m` and an HTML `<datalist>` of common suggestions
  (`15 minutes`, `30 minutes`, `1 hour`, `2 hours`, `1 day`, `1 week`). No
  parsing or validation: this is a prompt-fill value, not a stored duration.
- **Timezone** (`timezone`): free-text input with a `<datalist>` of about
  25 common zone labels (UTC, EST, PST, CET, GMT, JST, IST, AEST, and so on).
- **Language** (`language`): free-text input with a `<datalist>` of about
  25 common languages (English, Spanish, French, German, Mandarin, Japanese,
  Portuguese, Hindi, Arabic, and so on).

All three follow the existing pattern used by other Input-group types: a
single `<input>` bound to `data-var`, no new storage shape.

### A.3 Toggle Group multi-select

Toggle Group's per-variable meta gains one new optional key: `multi: true`.
This is a new key inside the existing freeform `variable_meta` JSON object,
not a schema change.

- The variable-editor row for a `togglegroup` variable gets a checkbox,
  "Allow multiple selections," next to its options editor (visible only
  when `type === 'togglegroup'`, alongside the existing options-list UI
  gated by `OPTIONS_TYPES`).
- Render (`renderVariableFields`): when `m.multi` is true, `_PL_selectToggle`
  toggles `.active` on the clicked chip without clearing siblings, and the
  hidden input's value becomes the comma-joined list of active chips
  (matching the existing `tags`/`checkbox` value convention). When `multi`
  is false or absent, behavior is unchanged from today: single active chip,
  plain string value.
- This is listed in the type dropdown's Advanced group as "Toggle Group
  (Multi-select)" for discoverability, but it is not a separate `type`.
  Selecting it just sets `type: 'togglegroup'` with `multi: true` pre-checked
  in the options editor, so existing single-select Toggle Group variables
  are unaffected.

### A.4 New Advanced types (6)

Added to the "Advanced" optgroup, alongside the existing `slider`/`rating`:

1. **Range Slider** (`rangeslider`): a true dual-handle slider (two
   `<input type="range">` elements visually paired, min and max clamped to
   each other) that produces a `"min,max"` value. This is distinct from the
   existing `range` type, which is two plain number inputs with no slider
   UI. Both are kept because they serve different input styles: typed
   numbers versus drag-to-set.
2. **Ranked List** (`rankedlist`): options render as a vertically
   drag-reorderable list (native HTML5 `draggable`, no library). The value
   is the comma-joined options in their current order, e.g.
   `"Speed,Cost,Quality"`. Uses the same `opts` (options array) storage as
   `dropdown`, `checkbox`, and the rest.
3. **Icon Picker** (`iconpicker`): a fixed grid of about 16 curated Material
   Symbols names (the same font already used throughout the app, so no new
   asset). The value is the icon name string, e.g. `"rocket_launch"`.
4. **Matrix / Likert Grid** (`matrix`): each entry in the variable's `opts`
   list is a row (a statement or item); columns are a fixed 5-point scale
   (Strongly Disagree through Strongly Agree) rather than user-configurable.
   That keeps this inside the existing single-list `opts` shape instead of
   requiring a second config axis. The value is a JSON string mapping row to
   column index, e.g. `{"Ease of use":3,"Price":1}`.
5. **Emoji Picker** (`emojipicker`): a fixed grid of about 28 curated emoji.
   The value is the emoji character.
6. **Toggle Group (Multi-select)**: see A.3. Listed here as the sixth new
   choice type from the user's perspective, though it's implemented as a
   flag on the existing type rather than a new one.

All six store into the existing `variable_meta` JSON blob using the same
`{type, default, visible, size, options}` shape already used by every other
type (`matrix` and `rangeslider` use `default` for their composite value,
the same convention `range`/`checklist` use today). Zero schema changes.

## B. Batch import overhaul

### B.1 Destination folder

The Import modal gains a folder `<select>` at the top (populated from the
same folders list used elsewhere in the app), applied to every prompt in
the batch at commit time. If an individual JSON item already specifies its
own `folder_id`, that explicit value wins over the batch default. This
preserves round-trip fidelity for JSON re-imports of prior exports.

### B.2 New "Paste (Smart)" tab

A fifth import tab alongside JSON / Markdown / Upload file / Template.
Purpose: let the user dump raw, unformatted text (pasted straight from
clipboard, no AI reformatting step) and get it split into candidate prompts
automatically.

This adds one new endpoint, `POST /api/import/parse-raw`. Request body:
`{"text": "<raw pasted blob>"}`. Response:
`{"candidates": [{"title": "...", "content": "..."}, ...]}`. The endpoint
only parses; it does not write to the database. It's a plain heuristic
splitter, no AI or network call, consistent with the app's local-first,
offline requirement:

1. Split on any line that is just `---` or `===` (3+ chars), the same
   separator already used by the Markdown format.
2. If no such separators are found, split on runs of 2+ blank lines.
3. If that still yields a single block, split on lines matching a numbered
   or "Prompt N" header pattern (`^\d+[.)]\s`, `^Prompt\s+\d+`, `^#{1,2}\s`).
4. For each resulting block: `title` = first non-empty line (truncated to
   about 80 chars if longer), `content` = the remaining lines, trimmed.
   Blocks with no content after the title line are dropped.

After the endpoint returns, the tab renders a list of the candidates: each
with an editable title field, a collapsed content excerpt (expand to see
the full text), and an include/exclude checkbox, plus a count such as
"14 prompts found." Confirming the import filters to the checked items and
calls the existing `POST /api/import`, the same code path the JSON and
Markdown tabs use, so the commit logic itself doesn't change, only what
feeds it.

### B.3 Existing tabs

JSON, Markdown, Upload file, and Template tabs are unchanged in behavior
apart from now reading the shared destination-folder picker (B.1).

## C. Markdown template for custom instructions

### C.1 Short version

A new, separate template string (`_MARKDOWN_TEMPLATE_SHORT_TEXT`), targeting
roughly 1200-1500 characters so it fits inside a ChatGPT/Claude persistent
"custom instructions" field. It keeps only the non-negotiable structural
rules (heading = title, italics = description, `**Categories:**`,
`**Tags:**`, backtick-fenced content, `---` separators, `[[snake_case]]`
placeholders) and drops the worked example and the edge-case handling
prose from the existing long template. A second button, "Copy short
template (for custom instructions)," sits next to the existing "Get
Markdown template" button on the Markdown tab and next to the Template
tab's existing copy button.

### C.2 Existing long template

Kept as-is for one-off paste-into-chat use, where the extra explanation and
worked example improve first-try accuracy from a model with no persistent
memory of the format.

### C.3 Parser hardening

`parseMarkdownImport()` is made more tolerant of minor AI formatting drift:

- Accept one or more blank lines around the `---` separator, not just an
  exact `\n---+\n` match.
- Accept a title line with no leading `#`/`##` if no heading line exists
  anywhere in the block (some models drop the heading marker entirely).
- Drop the current parser's dead condition that silently required a title
  to exist before an italic line could be read as a description.
- Accept `**Categories**` / `**Tags**` without the trailing colon inside
  the bold markers (`**Categories:**` vs `**Categories**:`), since models
  sometimes place the colon outside.

These are additive tolerance fixes to the existing regex-based parser, not
a rewrite.

## D. Files touched

No schema changes. No new dependencies.

- `static/app.js`: variable type list, render, and save switches; Toggle
  Group multi-select handling; new Advanced-type renderers; import modal
  JS (folder picker wiring, Smart Paste tab, short template text, parser
  hardening).
- `static/index.html`: import modal markup (folder `<select>`, new Smart
  Paste tab panel), variable-editor markup (multi-select checkbox for
  Toggle Group).
- `static/app.css`: styling for the new Advanced-type widgets (range
  slider, ranked list, icon/emoji grids, matrix grid) and the Smart Paste
  preview list.
- `app.py`: one new route, `POST /api/import/parse-raw`, implementing the
  heuristic splitter described in B.2. No changes to the existing
  `POST /api/import` commit route.
- `Prompt Library Interface Files/` reference folders for the affected
  screens (library main / import modal, prompt viewer / variable editor)
  get re-extracted after the change lands in `static/`, per the project's
  standard porting checklist.

## Error handling

- `/api/import/parse-raw` returns `{"candidates": []}`, not an error, when
  the input yields no splittable blocks. The UI shows "No prompts detected.
  Check your paste." instead of a failure toast.
- Smart Paste preview commit reuses `/api/import`'s existing validation
  (title/content required, empty entries skipped), so no new server-side
  validation path is introduced.
- New variable-type renderers (`rangeslider`, `rankedlist`, `iconpicker`,
  `matrix`, `emojipicker`) each get the same "add options in the variable
  editor to use this" placeholder message the existing `checkbox`/
  `togglegroup` types show when their `opts` list is empty, where
  applicable. `rangeslider`, `iconpicker`, and `emojipicker` don't need
  options and skip this.

## Testing

No automated test suite exists in this project (per `CLAUDE.md`).
Verification is manual, per project convention:

- `node --check static/app.js` and `python3 -m py_compile app.py` after
  every edit.
- Manual pass in the running app: create one variable of each new/changed
  type, fill and save a prompt using it, reload, confirm the value
  round-trips.
- Manual pass on Smart Paste: paste a few raw prompt blobs in different
  shapes (numbered list, blank-line separated, `---` separated) and confirm
  reasonable splitting; paste something with no structure and confirm the
  "no prompts detected" message appears instead of a crash.
- Manual pass on the destination-folder picker: import a JSON batch with no
  `folder_id` set (all land in the picked folder) and one with an explicit
  `folder_id` on one item (that item keeps its own folder).
