# Brief: desktop upgrade
Goal: Upgrade the live desktop app in three parts: one AI engine, a Prompt Board that feels familiar to Pinterest users, and a folder of screenshots of every screen.
Audience: Eugene, plus the people he shows the app to (buyers, possible investors).
Deliverable: Code changes in `static/app.js`, `static/app.css`, `static/index.html`. A `showcase/` folder with one PNG per screen in light and dark, plus `index.html` as a gallery. Updated `MEMORY.md` and `GOALS.md`. One draft pull request.
Inputs: Live files in `static/`, `app.py` routes for boards, `GOALS.md`, `MEMORY.md`, `CLAUDE.md`.
Constraints: No schema change. No new dependency. No edits to `app.py` unless a bug blocks the work. Bash plus Python replace for `app.js` and `index.html`, with backups in `_rollbacks/`. The board uses the app's own beige and teal design tokens, never Pinterest's logo, red or name. Phone app is not touched.
Done means: Eugene opens the app, the AI tools work as before with a model picker in API settings, the Prompt Board reads as Pinterest at first sight, a prompt can be pinned from the library without opening the board, and `showcase/index.html` shows every screen.

## Parts

1. AI engine. `PL_generateRoleWithAI` carries its own copy of the provider calls. Fold it into the shared `callAI`. Add a model field for every provider in API settings (today only Open Router and custom providers have one), with the current models as defaults. Add an optional "Second opinion" switch for Anthropic only, off by default, that uses Anthropic's advisor tool. It cannot be tested here without an API key, so it falls back to the normal call on any error.
2. Prompt Board. Keep the data and routes. Rework the look and flow: tighter masonry with rounded pins, hover Save with a board picker, pin close up with "More like this", board covers as a collage of their pins, search in the top centre. Add pin from anywhere: library cards and the detail panel.
3. Open goals. `GOALS.md` is stale. Prompt Components already saves and reopens its graph through `static/prompt-components-node.js`. Check each open line against the live app, tick what is done, finish what is small, list what is left.
4. Screens folder. Screenshot every screen and workspace at 1440 by 900, light and dark, with sample prompts loaded.
