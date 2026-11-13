# Plan: context bank

Goal: make the Context Bank reachable again and better to find, use and keep blocks in, with a saved copy that survives a storage reset.

Lessons read:
* Global, patch scripts run every replace in memory and write last: applied to Task 1.
* Desktop upgrade, inspect one screenshot before a bulk capture: applied to Task 2.
* Desktop upgrade, list screens from the live DOM: does not apply, this job touches one workspace and one panel.

```
TASK 1: context bank build
TYPE: code
OUTPUT: Edits to static/index.html, static/app.css, static/app.js and app.py. One summary file, outputs/13-11-2026-context-bank-v1.md.
INPUT: sources.md, brief.md, the live files, backups in _rollbacks/ named "v-pre-context-bank".
RULES: No schema change. No new dependency. Blocks already in pl_ctx_blocks survive untouched. Bash plus Python replace for app.js and index.html. Existing design tokens only. New classes use the ctxb- prefix after a grep shows it is free. Snippets panel keeps working. UK English, no dash punctuation in copy.
LESSONS APPLIED: One patch script, every replace asserted in memory, files written last.
WORKS WHEN: With the app served from a disposable data folder and Pro on, in a headless browser at 1280 px:
  1. The launcher shows a Context Bank card that opens the workspace. The New prompt window shows a Context button that opens the panel.
  2. Pills cover every category and their counts add up to the block count (60 after seeding). Search for a word found only in one block's content returns that block.
  3. Clicking a panel block inserts it at the cursor in plain, labelled and XML styles.
  4. A pl_ctx_blocks value written in the old shape before load is shown unchanged. After a save, removing pl_ctx_blocks and reloading brings the blocks back from the saved copy.
  5. Delete shows Undo and Undo restores the block in place. Editing then picking another block shows the unsaved changes bar, with Save, Discard and Keep editing all working.
  6. Duplicate, pin, sort, export and import work. Import skips duplicates.
  7. No console errors. node --check and py_compile pass. grep -c "<script" static/index.html is unchanged.
DONE WHEN: Every judgement check in rubric.md passes.

TASK 2: screenshots
TYPE: other
OUTPUT: outputs/13-11-2026-context-bank-light-v1.png, -dark-v1.png, -panel-v1.png at 1280 by 800.
INPUT: The built app from Task 1.
RULES: Check the first screenshot before taking the rest.
LESSONS APPLIED: Inspect one screenshot before the bulk capture.
WORKS WHEN: Each image shows the named screen with no overflow, in the right theme.
DONE WHEN: The investor demo check in rubric.md passes in light and dark.
