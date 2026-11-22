# Block Studio and Your Blocks

Status: implemented on `feature/prompt-stress-lab`. Verified in headless Chromium against a throwaway data folder. Not yet checked in the installed PyWebView build.

## What it is

Users design their own Prompt Builder Pro blocks: what they take in, what they hand out, their settings and the instructions they add to the compiled prompt. A block can be a standard block, a single agent, a reviewer, or a team coordinator that briefs a roster of agents. Saved blocks sit first in the Block Library under **Your Blocks**, and in the Component Library as the first department, also called **Your Blocks**.

This replaces the earlier `builder-pro-custom-blocks.js`, which assigned to the engine's getter-only `compilePrompt` export. That threw on load in strict mode, so the studio never mounted. The old file is kept in `_rollbacks/22-11-2026-builder-pro-custom-blocks-pre-studio.js`.

## Files

| File | Role |
| --- | --- |
| `static/builder-pro-custom-blocks.js` | Studio, definitions, registration, database sync, token resolution. Exposes `window.PLBlockStudio`. Loads after the engine and before `builder-pro.js`. |
| `static/builder-pro-custom-blocks.css` | Studio sheet (`#pbp-block-studio`) and the library additions under `#builderProWorkspace`. Tokens only, no hex, no blur. |
| `static/builder-pro.js` | Integration points only: Your Blocks group and edit pencil in the library, `compileNodes` hook, shared spawn table, Workshop `def` link, `refreshBlocks`. |
| `static/app.js` | `window.PL_setYourBlocks`, the Your Blocks department in the Component Library, create and edit actions in the gallery. |
| `static/app.css` | `.pcw-gal-yours` strip. |

The studio is its own full-screen sheet rather than part of `#builderProWorkspace` because it is also opened from the Component Library, where the workspace is closed. That is the one deliberate exception to the "every rule sits under `#builderProWorkspace`" rule, and its rules are scoped under `#pbp-block-studio`.

## Definition

Stored as `definition` JSON on a `component_blocks` row (category `yours`):

```json
{
  "schema": 2, "kind": "builder-block", "type": "user_block_fact_checker_ab12cd",
  "label": "Fact Checker", "hint": "Checks each claim", "about": "", "icon": "fact_check",
  "role": "worker", "section": "instructions",
  "inputs":  [{ "id": "claims_in", "label": "Claims in", "type": "text", "desc": "" }],
  "outputs": [{ "id": "verdict",   "label": "Verdict",   "type": "flag", "desc": "" }],
  "settings": [{ "id": "strictness", "label": "Strictness", "type": "select", "defaultValue": "balanced", "options": ["lenient", "balanced", "strict"] }],
  "template": "Check {{input:claims_in}}. Be {{setting:strictness}}. Give a {{output:verdict}}.",
  "roster": { "verdict": "agent_critic" }
}
```

- `role`: `standard` (prints into `section`), `worker` or `reviewer` (an agent), `coordinator` (an agent with a roster).
- Port types: Text, Prompt, List, Data (JSON), Number, Yes or no. They are shown in the preview and the inspector. They do not restrict wiring.
- Setting types: Short text, Long text, Number, Dropdown (with options).
- `roster` maps a coordinator output to the agent block it briefs. It powers "Add its agents and wire them" through the shared `window.PLBuilderSpawn` table.
- Agent roles use `category: "agents"`, so the unchanged engine treats them as team members and prints their Receives and Hands off lines from the wiring.

## Tokens

`{{input:key}}`, `{{setting:key}}` and `{{output:key}}` are resolved on a copy of the nodes at compile time through `PLBlockStudio.prepare(nodes, edges)`, so the text stored on the canvas never changes.

- `input` becomes `the "Label" supplied by <connected block>`, or `the "Label" (nothing is connected to it yet)`.
- `output` becomes `"Label"`.
- `setting` becomes the node's current value, or the default.

In the Component Library the same template is shown with `[Label]` blanks instead, which is that library's own convention.

## Persistence

- The database is the source of truth: `/api/components` (existing routes and table, no schema change). Category `yours`, `body` is the plain text version, `definition` carries the JSON.
- `localStorage` key `prompt-builder-pro.custom-blocks.v2` is a cache. It registers blocks synchronously at load so a saved canvas never loses them, then the database is read. Blocks found only in the cache (older versions, or saved while the database was unreachable) are pushed to the database. The version 1 key written by the earlier attempt is read once and migrated.
- Builder Pro waits for `PLBlockStudio.ready` (4 second limit) before it builds, so a restored canvas keeps its custom blocks even when browser storage was reset.
- Editing a block updates the library and new copies. Copies already on a canvas keep their own text and settings. Wires to ports that no longer exist are removed.
- Deleting asks twice, warns how many copies are on the canvas, and removes those copies. The database delete runs first, so a failure leaves everything in place.

## Component Library link

`window.PL_setYourBlocks(rows)` in `app.js` rebuilds the `yours` category inside the existing `BLOCKS` and `CATEGORIES`, and re-renders the palette and gallery. `rows` is also kept on `window.__plYoursRows` so a workspace opened later still reads it. Items carry a `def` field. When a Your Blocks item travels into the Builder Pro Workshop and onto the canvas, it becomes the real custom block with its ports and settings, not a plain Component.

## Verification

Run on 2026-11-22 with headless Chromium, a disposable data folder and a fresh browser context:

- 19 checks on creating blocks from each starter, validation, discard guard, database rows, `[blank]` text, coordinator spawning four wired agents, token resolution from wiring, and the agent entry in the compiled prompt.
- 20 checks on restoring from the database with empty browser storage, editing in place, the Component Library department order and count, the Workshop adding the real block, a saved canvas surviving reload, and a two step delete.
- Light, dark and 390 px layouts checked by screenshot, with no horizontal overflow.
- No page errors in any run. `node tests/builder-showcases/validate.js` still passes.

Not checked: the installed Windows PyWebView build.
