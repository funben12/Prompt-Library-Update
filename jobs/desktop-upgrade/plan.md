# Plan: desktop upgrade

Goal: one AI engine, a Prompt Board that Pinterest users recognise, and a folder of every screen.

TASK 1: AI engine
TYPE: code
OUTPUT: `static/app.js` (shared `callAI`, model helpers, advisor path), `static/index.html` (model field, switch), `static/app.css`, `app.py` (`/api/settings/ai-models`)
RULES: no schema change, no new dependency, bash plus Python replace for app.js and index.html, backups in `_rollbacks/`
LESSONS APPLIED: none yet, first run
WORKS WHEN: with mocked provider replies the role generator fills its fields on four paths (advised with pause, advisor error fallback, plain, default model) and a model choice survives a wiped localStorage
DONE WHEN: rubric check 1 and 5

TASK 2: Prompt Board
TYPE: code
OUTPUT: board functions in `static/app.js`, board styles in `static/app.css`, pin buttons in library cards and detail panel
RULES: app tokens only, no Pinterest branding, no duplicate CSS blocks
WORKS WHEN: at 1440 px and 820 px the feed, hover, close up, boards and one board render with no console errors and no sideways scroll; quick Save changes the pill to Saved; the popover saves from a library card and from the detail panel
DONE WHEN: rubric checks 2 and 3

TASK 3: Open goals
TYPE: writing
OUTPUT: `GOALS.md`
WORKS WHEN: every ticked line was seen working in the browser run
DONE WHEN: rubric check 5

TASK 4: Screens folder
TYPE: html
OUTPUT: `showcase/light`, `showcase/dark`, `showcase/index.html`
WORKS WHEN: every image the gallery names exists in both themes, the page has no sideways scroll at 390 px and 1280 px, the viewer and theme switch work
DONE WHEN: rubric check 4
