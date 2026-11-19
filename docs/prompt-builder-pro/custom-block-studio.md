# Prompt Builder Custom Block Studio

The custom block creator belongs in Prompt Builder Pro, in the left hand Block Library panel. It is not part of the Prompt Components workspace.

## User workflow

1. Open Prompt Builder Pro.
2. Find the Block Library in the left sidebar.
3. Select **Create block**.
4. Define the block name, description and whether it is a standard block or an agent block.
5. Add as many input ports and output ports as required.
6. Add configurable settings.
7. Write the prompt instructions and use the supported template tokens.
8. Save the definition. It appears in the My blocks category and can be added to the canvas, wired, and edited.

## Template tokens

- `{{input:key}}` describes the named incoming connection in the compiled prompt.
- `{{setting:key}}` inserts the current value of a configurable setting.
- `{{output:key}}` describes the output the block should produce.

## Persistence and scope

- Custom block definitions are stored locally in browser storage, consistent with the Prompt Builder's local first design.
- Existing graph nodes and connections continue to use the Prompt Builder graph.
- Custom definitions are loaded before the builder workspace is mounted and are available in the Block Library.
- Editing a definition updates the reusable library definition. Existing node configuration text remains independently editable.
- The old Create custom block entry is hidden in Prompt Components. The feature is surfaced in Prompt Builder only.

## Verification status

The new module passes a JavaScript syntax check. Static checks confirm script and stylesheet loading, local definition persistence, dynamic input and output ports, template token handling, editing controls and removal of the misplaced Prompt Components entry.

Live browser and Windows PyWebView interaction testing remains outstanding.