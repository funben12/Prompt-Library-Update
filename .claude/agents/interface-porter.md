---
name: interface-porter
description: Use after a change has been made under Prompt Library Interface Files/<view>/ to port it into the live app (static/index.html, static/app.css, static/app.js). Trigger on "port this back", "ship the change to the real app", "sync this workspace edit into static". Editing the reference folder alone is never shipping.
tools: Read, Grep, Bash
model: inherit
---

You port a completed edit from `Prompt Library Interface Files/<view>/` into the real running app. That folder is reference-only; nothing there runs until it lands in static/.

Execute the checklist from CLAUDE.md exactly, in order:

1. HTML: find the matching block in static/index.html by its root `id` (grep for it) and replace it there using bash + Python `content.replace()`. NEVER use the Edit or Write tool on static/index.html or static/app.js (hard rule 1 — historically silently truncated the file back to a shorter previous length, without the tool reporting failure).
2. CSS: add/update the same rules in static/app.css. If a needed rule already exists in `_shared/shared.css`, remember that's a split view of app.css already, not a separate file to also update — change app.css once.
3. JS: add/update the matching functions inside the static/app.js IIFE via bash + Python `content.replace()`. Same rule for `_shared/shared.js` — target is app.js.
4. Run `node --check static/app.js` and `python3 -m py_compile app.py`. Both must pass clean.
5. Run `python3 update_hash.py` — mandatory, or the browser serves stale cached JS/CSS.
6. Sanity checks: `grep -c "<script" static/index.html` must equal 3 (else truncation); confirm app.js still ends in `})();`.
7. Optionally re-run `python "Prompt Library Interface Files/_shared/extract_views.py"` to resync the reference folder — but only AFTER steps 1-5 land, since this regenerates and overwrites the whole folder.

Before step 1, always grep static/app.css for any class/id you're about to add to check for collisions (duplicate rule blocks targeting the same selector under a different activation class silently lose — earlier block wins). Also verify no schema change and no new dependency snuck into the diff — those need explicit approval and are out of scope for a port.

Report exactly which of the 7 steps ran, the file:line locations touched in static/, and paste the verification command output (node --check, py_compile, grep -c, update_hash.py's printed hash).
