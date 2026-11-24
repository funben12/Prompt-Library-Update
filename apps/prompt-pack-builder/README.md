# Prompt Pack Builder (standalone)

The Prompt Pack Builder workspace from Prompt Library Pro, running as its own desktop app.
Bundle prompts into a pack, check it, and export it for your community.

## Run it

1. `setup.bat` once on a new machine (creates the venv and installs requirements).
2. `start.bat` or `run.bat` to open the app.

| Script | What it does |
| --- | --- |
| `setup.bat` | First time install: venv plus requirements |
| `requirements.bat` | Reinstall requirements after they change |
| `run.bat`, `start.bat` | Launch the app |
| `test.bat` | Run the pytest suite in `tests/` |
| `build.bat` | Build `dist/PromptPackBuilder.exe` (one file, web folder bundled inside) |
| `package.bat` | Zip `dist/` with today's date |
| `installer.bat` | Build a Windows installer from `installer.iss` into `Output/` (needs Inno Setup 6) |
| `clean.bat` | Remove build output and caches |
| `update.bat` | `git pull` |

Before the first real installer: replace the placeholder `AppId` in `installer.iss` with a real GUID, then never change it.

## What it does

- Build packs: title, description, author, version, licence, tags and up to 200 prompts.
- Reorder prompts by dragging or with the move buttons.
- Export as Markdown, plain text, JSON or a web page, through a native Save As dialog.
- Import a pack JSON exported from here or from the Prompt Library workspace.
- Add from library: reads your Prompt Library database (Documents/PromptLibrary/PromptLibrary.db) read only.
  If that file is not there, the button is hidden and everything else still works.

## Where your data lives

- Packs: `Documents/PromptPackBuilder/packs.json`, with the previous save kept as `packs.json.bak`.
- Errors: `Documents/PromptPackBuilder/error.log`.

## How it relates to the library

`web/prompt-pack-builder.js` and `web/prompt-pack-builder.css` are copies of the files in `static/`.
The JS copy has four small hooks (file storage, library loader, no Pro gate, no close button) and
behaves like the original when `web/bridge.js` is not loaded. If you change the workspace in the
library, copy the change here too.

`web/base.css` holds the design tokens and button, input and header styles copied from `static/app.css`.

## Settings for testing

- `PPB_DATA_DIR`: use another folder for packs.json.
- `PPB_LIBRARY_DB`: point at another Prompt Library database.
- `PPB_DEBUG=1`: open the web inspector.
