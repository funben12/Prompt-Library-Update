# Brief: context bank
Goal: Put the Context Bank back within reach in the live desktop app and make it a tool worth opening: easy to find, quick to use inside a prompt, and safe from data loss.
Audience: Eugene, plus the people he shows the app to (buyers, possible investors).
Deliverable: Code changes in `static/index.html`, `static/app.css`, `static/app.js`, and one small settings route pair in `app.py` for the saved copy. Updated `MEMORY.md`. Light and dark screenshots in `jobs/context-bank/outputs/`. One draft pull request.
Inputs: Live Context Bank code (`#contextBankWorkspace`, `#promptCtxPanel`, `_ctx*` functions, `pl_ctx_blocks`), `_design-system/`, `CLAUDE.md`, `MEMORY.md`, `jobs/_system/global-lessons.md`.
Constraints: No schema change (the saved copy uses the existing settings table). No new dependency. Blocks already saved in `pl_ctx_blocks` must survive untouched. Bash plus Python replace for `app.js` and `index.html`, backups in `_rollbacks/` first. Existing design tokens only. Phone app is not touched. Snippets keeps working, since it reuses the `.ctx-*` classes.
Done means: Eugene can open the Context Bank from the Workspaces launcher and from the New prompt window, find any block by category or search, drop it into a prompt in one click, and his blocks are still there after the WebView storage resets.

## Found before the work

* The workspace and its side panel still exist, but nothing on screen opens them. There is no launcher card and no button in the New prompt window. The command palette is the only way in.
* 60 starter blocks are seeded, yet 27 of them sit in categories with no filter pill (Writing, Business, Marketing, Meta, Coding).
* Blocks live only in localStorage, which the WebView can reset.
* Delete has no confirm and no undo. Leaving an edited block loses the changes without warning.

## Parts

1. Ways in. A Context Bank card in the Workspaces launcher (Pro, as before) and a Context button in the New prompt window beside Components and Snippets.
2. Find. Category pills built from the blocks themselves, with counts, so every block can be filtered. Search over title and content. Sort by recent or name. Pin favourites to the top.
3. Use. Each block gets Copy and Insert. The New prompt panel shows a preview of each block and inserts at the cursor. One setting picks how a block is wrapped: plain, labelled, or XML tags.
4. Keep. Duplicate, delete with undo, a warning on unsaved changes, word and token estimate, export and import as a JSON file.
5. Safe. A copy of the blocks is saved through the settings table and restored when localStorage comes back empty.
6. Look. The workspace is reworked to the investor demo bar with the app's own tokens.
