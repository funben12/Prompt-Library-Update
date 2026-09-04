# Code Snippets

A reference library of reusable boilerplate pulled out of this codebase, so
recurring patterns (CRUD routes, modal lifecycle, fetch wrappers, etc.) don't
need to be regenerated from scratch for the next feature or the next app.

This folder is **not loaded by the app**. It sits outside `static/`, isn't
referenced by `app.py`, `Main.py`, or any `<script>` tag, and has no effect
on the CLAUDE.md script-tag/div-balance/truncation checks or the monolith
size limits on `app.js`/`index.html`. Treat it as a personal cookbook, not
shippable code — copy a snippet into the real file and adapt names/fields
before using it.

## Contents

| File | What's in it |
| :--- | :--- |
| `python_backend.py` | Flask + SQLite patterns: data dir resolution, DB connection, CRUD route template, payload normalisation, row serialisation, dynamic filter queries, licence key hashing, .plp pack import, server-ready socket polling |
| `javascript_frontend.js` | Vanilla JS patterns: DOM helpers, API fetch wrapper, toast notifications, clipboard copy, workspace open/close, escape-to-library, premium gate, drag-and-drop reorder, drop zones, localStorage helpers, live search/filter |
| `html_markup.html` | Markup skeletons: full-screen modal/workspace, sidebar nav item with `data-view` routing, toast container, premium-locked nav button |

Each snippet header lists the original `file:line` it was extracted from
(as of 2026-06-16) so you can diff against the live version if the source
has since changed.

## Adding to this library

When you write something new and reusable: drop it in the matching file
under a new `# ---- N. Title ----` section, with a one-line note on what it's
for and a `file:line` source reference. Keep snippets generic — strip
app-specific field names where it doesn't hurt, but prefer real working code
over invented pseudocode.
