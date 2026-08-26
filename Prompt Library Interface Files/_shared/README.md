# Shared layer

`shared.css` — design tokens, resets, buttons, layout primitives, any rule not tied to a single view.

`shared.js` — `state`, `api()`, `$`, `$$`, `toast()`, `escapeHtml()`, loaders, and any function touched by 5+ views (164 functions).

Change anything here and every view is affected. Check the view folders before editing.
