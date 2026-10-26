# Prompt Switchboard

## Scope
Prompt Switchboard adds two modes to Prompt Library through a same-origin overlay.

- **Local Switchboard:** no API key; deterministic keyword rules recommend relevant modules. Every recommendation is editable and can be overridden manually.
- **AI Switchboard:** calls an OpenAI-compatible Chat Completions endpoint using a user-entered session key. The key is not saved or exported.
- Shared modules cover Foundation, Instructions, Intelligence, Quality, Output, Workflow, Advanced and Custom.
- Includes Quick, Balanced, Advanced and Custom presets, editable instruction text, custom switches, live prompt preview, copy, browser-local saved configurations, JSON import and export.
- Uses `static/switchboard.html`, `static/switchboard.css`, and `static/switchboard.js`. No SQLite schema changes or third-party dependencies.

## Known limits
Local recommendations are keyword heuristics, not semantic AI understanding. AI mode requires a compatible endpoint, valid model/key, network access and provider CORS support in the WebView. The initial version does not yet import directly from Prompt Components or call Chain Prompting.

## Smoke-test checklist
1. Launch the overlay from the Prompt Library sidebar and close it again.
2. Switch between Local and AI modes.
3. Test Quick, Balanced, Advanced and Custom presets.
4. Toggle and edit modules and check that the preview updates.
5. Test local keyword recommendations with objectives containing words such as research, examples, reusable and plan.
6. Add a custom switch, save a configuration, reload, and load it.
7. Export JSON and import the exported file.
8. Confirm no API key appears in saved configurations or exports.
9. Test AI recommendations with a valid compatible endpoint and key, then test the missing-key validation message.
10. Check narrow/mobile layout and confirm the existing Library workspace remains available.
