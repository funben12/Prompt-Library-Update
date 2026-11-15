# Sources: context bank

All facts come from the live repository, read on 13-11-2026. Nothing outside was needed.

* The workspace markup is `#contextBankWorkspace` in `static/index.html`, and the New prompt side panel is `#promptCtxPanel` | repo | static/index.html | 13-11-2026
* No launcher card and no `#ctxPanelToggleBtn` exist in the markup, the command palette entry is the only way in | repo | static/index.html, static/app.js | 13-11-2026
* Blocks live in localStorage key `pl_ctx_blocks` as `{id, title, category, content, created}`, seeded once behind `pl_ctx_seeded` | repo | static/app.js | 13-11-2026
* 60 starter blocks across 11 categories, 27 of them in Writing, Business, Marketing, Meta and Coding, which have no pill | repo | static/app.js | 13-11-2026
* Seeding replaces whatever is in `pl_ctx_blocks`, so blocks added from the side panel before the first workspace visit are lost | repo | static/app.js | 13-11-2026
* The settings table already stores per feature values through small route pairs such as `/api/settings/ai-models` | repo | app.py | 13-11-2026
* `/api/save-file` opens a native Save As window, `triggerDownload` is the browser fallback | repo | app.py, static/app.js | 13-11-2026
* The Snippets side panel reuses only the `.ctx-panel-*` classes, the standalone Snippets workspace is gone | repo | static/index.html, static/app.js | 13-11-2026
* `app.css` ends with a global `[hidden]` rule, so the `hidden` attribute is safe to use | repo | MEMORY.md | 13-11-2026
* The older `.ctx-*` workspace classes are used nowhere outside the Context Bank code | repo | grep of static/ | 13-11-2026
