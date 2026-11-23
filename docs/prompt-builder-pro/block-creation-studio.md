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

## Studio extras (2026-11-22, second pass)

- **Draft with AI.** Describe a block in a sentence and the studio fills in the whole form (kind, ports, settings, instructions, and for a coordinator the agent each output briefs). One JSON request through `window.PL_ai.ask`, only when the button is pressed. Port and setting keys are derived from the labels, so the tokens the model writes match. Nothing is saved until the user does.
- **Try it.** Sample text per input, then one plain request through `window.PLBridge.callAI` (it honours the second opinion setting). The block's tokens resolve to "given under INPUTS" and the samples are sent beside them. The answer shows in the studio and is never stored.
- **Required inputs and typed wires.** Each input has a Required flag. `PLBlockStudio.diagnose(nodes, edges)` adds warnings to the Checks tab: a wired block with an unconnected required input, and a wire between two custom ports whose types disagree. Text is compatible with everything, so only clear clashes (for example Data into Number) warn. Built-in ports have no types, so wires to them are never flagged. Warnings never block copying.
- **Duplicate.** From an edited block. Opens a new block with the same design and keys.
- **Export and import.** Export one block from the studio, or everything from the Your Blocks header. File shape: `{ "type": "prompt-builder-blocks", "version": 1, "blocks": [...], "teams": [...] }`, without database ids. Import always creates new copies with new types (labels get " (imported)" when the name exists), remaps team nodes to the new types, and refuses files that are not this shape or larger than 2 MB.
- **Team blocks.** Workflow menu, "Save canvas as team block". Saves every valid block and wire (keys instead of canvas ids, positions relative to the top left). Stored as a `component_blocks` row, definition `kind: "builder-team"`, body is the compiled prompt, so the Component Library lists it as text. In Your Blocks the team has a place button (adds every block and wire to the right of the current canvas through `placeGraph`, so it can be placed more than once) and a two press delete. Placing drops blocks whose type no longer exists and says so if none survive. Local cache key `prompt-builder-pro.teams.v1`.

## Adjustable port counts (2026-11-22, third pass)

Each side of a block, inputs or outputs, is either **Fixed ports** (rows, as before) or an **Adjustable count**. An adjustable side is one named group of ports whose number each copy on the canvas chooses with + and - controls in its settings. This is the same mechanism Parallel Execution and Merge use, so blocks you design behave the same way.

- **Definition.** `dynamic: { inputs, outputs }`, each `null` or `{ name, type, min, max, count }`. `min` is 1 or more, `max` is at most 12, `count` is the starting number and always sits between them. Entered values are corrected when a field is left, and again on save, so an invalid range cannot be stored.
- **Ports.** The group is generated as `in_1 .. in_max` (outputs `out_1 ..`) labelled "<name> 1", "<name> 2" and so on. Keys do not depend on the name, so renaming the group never breaks a wire. The canvas shows the first n. Wires to a port that is no longer shown are taken off, with a notice.
- **Tokens.** `{{inputs}}` and `{{outputs}}` list every port a copy shows with what is wired to it. `{{input_count}}` and `{{output_count}}` are the numbers. `{{input:in_2}}` still works for one port, and reads "not in use on this copy" when the copy shows fewer ports. These work on fixed sides too.
- **Rules.** A team coordinator keeps fixed outputs (each output is tied to an agent), so adjustable outputs are unavailable for it. Switching a saved block between fixed and adjustable renames that side's ports, and the studio says wires on existing canvases will be taken off. Fixed rows are kept out of sight if you switch back.
- **Checks.** Required inputs and type warnings only consider the ports a copy shows. The preview and Try it use the starting number of ports.
- **Starters.** Two new starters, Parallel tracks and Merge, give editable versions of the built-in Parallel Execution and Merge.
- **Everywhere else.** Export, import, duplicate, team blocks and the database store `dynamic` with the block. The Component Library text shows `[inputs]` and the starting number. The AI draft can ask for an adjustable side.
- **Limits per block.** The canvas now reads each block's own range (`dynamic` on the registered block carries `key`, `min`, `max`, `def`), so built-in blocks use 2 to 8 and your blocks use whatever you set.

## Verification

Run on 2026-11-22 with headless Chromium, a disposable data folder and a fresh browser context:

- 19 checks on creating blocks from each starter, validation, discard guard, database rows, `[blank]` text, coordinator spawning four wired agents, token resolution from wiring, and the agent entry in the compiled prompt.
- 20 checks on restoring from the database with empty browser storage, editing in place, the Component Library department order and count, the Workshop adding the real block, a saved canvas surviving reload, and a two step delete.
- Light, dark and 390 px layouts checked by screenshot, with no horizontal overflow.
- 32 checks on the second pass: required and type warnings, duplicate, single and full export, import (including a refused file), AI draft, Try it, team save, place twice, compiled prompt identical after placing, Component Library text, reload and two press delete. The two AI features were run with the provider endpoint mocked.
- No page errors in any run. `node tests/builder-showcases/validate.js` still passes.

- 37 checks on adjustable counts: both starters, limits and guard rails, generated ports, wiring, shrinking, merge text, editing a saved block, coordinator rule, AI draft, Try it, export and import, team blocks, and restore from the database with empty browser storage.

Not checked: the installed Windows PyWebView build.
