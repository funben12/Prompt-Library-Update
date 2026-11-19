# Agents Workspace Refresh and Prompt Import

Status: implemented on `feature/prompt-stress-lab`. Interactive browser and installed Windows PyWebView verification remain required before merge.

## Purpose

Refresh the existing Agents workspace and add a reverse prompt analysis workflow. Users can paste an existing system prompt, request AI analysis, and use the extracted information to populate the current agent editor. The generated configuration remains editable and is not saved automatically.

## Experience

- A clearer Agents workspace header and editor hierarchy.
- Refined agent list, statistics, preset cards, editor tabs and preview rail.
- Responsive layout adjustments for narrower screens.
- A visible choice to start from scratch or analyse an existing prompt.
- Expandable prompt import workbench with a 30,000 character input limit.
- Analysis status, mapped field count, confidence label, inferred fields count and missing information summary.

## Prompt analysis

The import workflow uses the existing AI bridge exposed by Prompt Testing Workspace, with fallbacks to the existing PyWebView bridge and global AI function.

The AI is instructed to treat the supplied prompt as untrusted data, not as instructions to follow. It extracts only supported information and returns a structured JSON configuration.

Mapped fields include:

- Agent name and role.
- Tone, expertise and persona.
- Primary objective and success criteria.
- Response style and behaviour flags.
- Constraints, audience and domain.
- Response depth and format preference.
- Custom output instructions and primary tasks.
- Output format, opening message and persistent context.
- Interaction mode.

The analysis also reports confidence, interpreted fields and missing information. Unsupported values are left empty rather than invented.

## Review and persistence

- The existing New Agent workflow is used to create a fresh editable form.
- Extracted values are populated into the existing editor fields and chip controls.
- The original prompt remains in the import text area for reference.
- The user can customise the generated fields before using the existing Save action.
- The analysis workflow does not automatically save, overwrite or activate an agent.

## Files

- `static/agent-workspace-refresh.js`: prompt import, AI analysis, structured response parsing and editor mapping.
- `static/agent-workspace-refresh.css`: workspace visual refresh and responsive styles.
- `static/index.html`: loads the new module after the existing application scripts.

No database schema changes or new dependencies are introduced.

## Verification

- JavaScript syntax check passes using `new Function(source)`.
- Static checks confirm the import UI, structured analysis prompt, existing AI bridge integration, editor field mapping, no automatic save, CSS loading and responsive rules.
- Not yet verified: live AI analysis, generated field values against representative prompts, interactive agent editing and saving, or the installed Windows PyWebView build.
