# Context Bank upgrade, 13 November 2026

## What changed

The Context Bank is back within reach and reworked.

**Ways in**

* Workspaces launcher: a Context Bank card in the Build group, marked Pro.
* New prompt window: a Context button beside Components and Snippets.
* The command palette entry and the app tour step still work.

**Find**

* Category pills are built from the blocks, each with a count. All 60 starter blocks can now be filtered, and a category you invent gets its own pill.
* Search covers titles and content. Sort by recent or by name. Pinned blocks stay at the top.

**Use**

* Every block has Copy and Use in new prompt, in the list and in the editor.
* The New prompt panel shows a two line preview of each block and inserts at the cursor on one click.
* One setting, Insert as, picks the wrap: Plain, Labelled or XML tags. It applies to copy and insert in both places. Labelled stays the default, so nothing changes for a user who never touches it. The XML style gives `<context name="Title">` with the content inside.

**Keep**

* Duplicate, pin, delete with a 7 second Undo. Delete sits in the editor's top bar beside the pin, clear of the toast corner.
* An unsaved changes bar appears before an edit would be lost: Save, Discard or Keep editing. It covers picking another block, New block, Duplicate, Use in new prompt, the close button and Escape.
* Word count and token estimate under the content.
* Export saves every block to one JSON file. Import adds blocks from that file and skips any already in the bank.
* Ctrl+S saves.

**Safe**

* Every save also writes a copy to the settings table through `/api/settings/context-bank`. If localStorage comes back empty, the copy is restored on start.
* No schema change: the copy is one row in the existing settings table, key `context_bank_blocks`.

**Look**

* A find bar across the top, bordered block tiles on the left, a roomy editor on the right. Existing colour, spacing and type tokens only. New classes carry the `ctxb-` prefix.

## Bugs fixed on the way

* Starter seeding replaced any blocks added from the side panel before the first workspace visit. It now adds the starters after them.
* Escape did nothing once focus left the workspace. The workspace now keeps focus.
* Found in review: the Undo toast covered Delete, so a second click undid the first. Delete was moved.
* Found in review: Undo now clears a filter or search that would hide the restored block.

## Files

* `static/index.html`: workspace markup, side panel markup, launcher card, Context button.
* `static/app.css`: old `.ctx-*` workspace rules replaced by `ctxb-` rules. The `.ctx-panel-*` rules that Snippets shares are untouched.
* `static/app.js`: Context Bank section rewritten, panel functions rewritten, saved copy sync added.
* `app.py`: `GET` and `POST /api/settings/context-bank`.
* Backups: `_rollbacks/index v-pre-context-bank.html`, `app v-pre-context-bank.css`, `app v-pre-context-bank.js`, `app v-pre-context-bank.py`.

## Screenshots

* `13-11-2026-context-bank-light-v2.png`
* `13-11-2026-context-bank-dark-v2.png`
* `13-11-2026-context-bank-unsaved-v2.png`
* `13-11-2026-context-bank-panel-v1.png`
* `13-11-2026-context-bank-panel-dark-v1.png`

## Known limits

* Two deletes in quick succession stack two Undo toasts, and the upper one covers the Insert as buttons for up to 7 seconds.
* `app.js` grew by about 19 KB. The old Context Bank code was replaced, not kept beside the new.

## Not verified

* The PyWebView window on Windows. All checks ran in headless Chromium against a disposable data folder.
* The native Save As window for Export. It needs a desktop. The browser download fallback was checked.

## Left alone

* The phone app. The Context Bank is not on the phone.
* The 60 starter blocks themselves. Their wording is unchanged.
