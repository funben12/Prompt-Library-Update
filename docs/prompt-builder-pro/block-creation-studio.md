# Custom Block Creation Studio

Status: implemented on `feature/prompt-stress-lab`. Requires interactive browser and installed PyWebView verification before merge.

## Purpose

Let users create their own reusable Prompt Components blocks, with configurable node inputs, outputs and settings. The Block Creation Studio opens as a modal window from the Block Library inside Prompt Components.

## User workflow

1. Open Prompt Components.
2. Select **Create custom block** in the Block Library.
3. Set the block name, category, icon and description.
4. Add any number of named inputs and outputs.
5. Choose each port's data type and whether an input is required.
6. Add adjustable settings with a type, default value and optional dropdown choices.
7. Write the reusable instruction body, inserting input, setting and output tokens.
8. Review the live node preview and create the block.
9. Find the saved block in the dedicated **My blocks** library section.
10. Add it to the canvas, configure its settings and connect its output ports to other blocks' input ports.

Existing custom blocks can be edited from their library entry. Editing the library definition does not silently rewrite definitions already embedded in saved graph nodes.

## Definition format

A custom definition uses a versioned JSON object:

```json
{
  "schema": 1,
  "kind": "custom",
  "icon": "hub",
  "inputs": [
    {"id": "task", "name": "Task brief", "type": "prompt", "required": true}
  ],
  "outputs": [
    {"id": "result", "name": "Final result", "type": "text"}
  ],
  "settings": [
    {"id": "agent_count", "name": "Number of agents", "type": "number", "default": 3}
  ]
}
```

Supported port types: text, prompt, JSON, number, boolean and file or asset.

Supported setting types: text, long text, number, dropdown and toggle.

Template tokens:
- `{{input:key}}`
- `{{setting:key}}`
- `{{output:key}}`

## Multi-agent starter

The studio includes a multi-agent example with:
- Inputs: task brief, shared context and constraints.
- Outputs: final synthesis, independent critique and confidence assessment.
- Settings: number of agents, coordination method and review rounds.
- A starter instruction body using the template tokens.

It is a reusable prompt graph block, not a runtime agent executor. The generated prompt describes the multi-agent structure and its input/output contracts.

## Connection behaviour

- Custom input ports appear on the left side of a node.
- Custom output ports appear on the right side.
- A custom output can connect only to a custom input.
- Existing shipped components retain their legacy generic connection handles.
- Port IDs are stored in the existing `composition_edges.source_port` and `target_port` fields.

## Persistence and compatibility

- User blocks reuse the existing `component_blocks` table and `/api/components` routes.
- Definition metadata is packed into the existing description field with a versioned prefix, then unpacked by the API serializer.
- No database schema changes or new dependencies.
- Node configuration and a definition snapshot are stored in the existing composition `view_state` JSON.
- The graph API remaps client node IDs to saved database node IDs when persisting node metadata.
- Existing saved compositions and shipped blocks remain readable.
- The Block Creation Studio is loaded through the existing Prompt Components asset loader.

## Verification

- JavaScript syntax checks pass for the node canvas and account loader.
- Python AST validation passes for the changed metadata helpers and graph mapping.
- Static checks confirm modal creation/editing, custom port rendering, output-to-input validation, multi-agent preset, node metadata persistence and no schema migration.
- Interactive create, edit, connect, save, reload and Windows PyWebView checks remain outstanding.
