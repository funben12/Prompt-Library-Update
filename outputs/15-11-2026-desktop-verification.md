# Desktop combine verification, 15-11-2026

Branch: `desktop-combine-verify` (from `ccr-e4605b92-9rygdj`, draft PR 70, which is `main` plus the combined features).
Draft PR: into `main`, titled "Verify and fix combined desktop features on Builder Pro".

## Method

- Real app (`app.py` served by waitress) on a disposable data folder (`HOME` pointed at a throwaway directory). No real `PromptLibrary.db` was touched.
- Flask, flask-cors and waitress installed in a venv outside the repo (`/tmp/venv-pl`). Nothing added to `requirements.txt`.
- Scripted Playwright (Node library, pre-installed headless Chromium) at 1440 x 900. The Playwright MCP tools were not available in this cloud session, so the scripted route from `CLAUDE.md` was used.
- Pro gating: the test browser answered `/api/licence/check` with `valid: true`. No real licence key was used.
- Every feature was clicked through in the UI. API and file checks were made only where the UI hands off to the server (saved copy, exports, share endpoints).
- Console errors, page errors, failed requests and HTTP 4xx and 5xx were captured in every run.
- The test scripts live in the session scratchpad only. They are not committed (see Outstanding).

## Result per feature

### 1. Prompt Board (Pinterest style): PASS

| Check | Result |
| :--- | :--- |
| Opens from the launcher | PASS |
| Masonry lays out in several columns (5 at 1440 px) with 9 uneven pins | PASS |
| Reads left to right, then down: pin order in data equals visual order (tops never decrease, ties go left to right) | PASS |
| First row fills columns left to right (x = 96, 364, 632, 900, 1168) | PASS |
| Reflows to fewer columns when the window narrows (5 to 4), order preserved | PASS |
| Add: New prompt from inside a board creates the prompt and pins it, saved on the server | PASS |
| Move: board picker on a pin adds it to Board B, then Remove from board takes it off Board A, prompt kept | PASS |
| Layout recalculates after removal (10 to 9 pins) | PASS |
| Delete board removes the board, prompts survive | PASS |
| Home feed also lays out as masonry | PASS |
| Console and network errors | none |

Test assumption corrected, not an app fault: the sidebar is navigation only (Home, Boards, Favourites, Tags, New board). It does not list boards, by design.

### 2. Prompt X-Ray layouts: PASS

| Check | Result |
| :--- | :--- |
| Opens from the launcher, picker grouped Classic, Popular, All Prompt Forge layouts (353) | PASS |
| Classic: 6 of 6 parts found on a structured sample prompt | PASS |
| 14 named layouts (CO-STAR, RTF, RACE, CRISPE, TAG, BAB, STAR, PAS, RISEN, CARE, RODES, RICCE, TRACE, APE) each render their own cards with content | PASS |
| 15 views produced 15 distinct part sets | PASS |
| Sweep of all 372 picker options: every one renders cards, no exception | PASS |
| Copy structured gives `## Section` text and a toast | PASS |
| Save to Library creates a prompt | PASS |
| Chosen layout persists across reload | PASS |
| Console and network errors | none |

Observed behaviour (not a defect): changing the picker re-runs the split straight away once a prompt is pasted.

### 3. Nearby share: PASS

Run with two real desktop instances (own databases, loopback addresses 127.0.0.2 and 127.0.0.3) and the real share server.

| Check | Result |
| :--- | :--- |
| `GET /api/share/devices?quick=1` responds 200, `quick: true`, finds the other desktop | PASS |
| `GET /api/share/devices` (full scan) responds 200 and finds it | PASS |
| Own device never listed | PASS |
| Bad address (`?ip=999.1.1.1`) handled, no 5xx | PASS |
| UI dialog (`PL_sendNearby`): device appears at about 750 ms while the scan indicator is still showing, then listed exactly once after the full scan (merge) | PASS |
| Send, accept on the other side: sender shows "Sent to Desk B", prompt lands in the receiver library | PASS |
| Console errors during the flow | none |
| `tests/nearby/test_desktop.py` (12 tests) | OK |

Limit: on loopback the quick and full scans finish within about a second of each other, so the ordering evidence is weak. The merge logic itself reads correctly (`merge` skips known IPs). Real radios, firewalls and the phone are not covered (see `tests/nearby/README.md`).

### 4. Context Bank: PASS

| Check | Result |
| :--- | :--- |
| Launcher card opens the workspace | PASS |
| New block, saved and listed | PASS |
| Typed new category (`+ New category` option, value `__new`) becomes a pill | PASS |
| Edit saves | PASS |
| Pin: `aria-pressed` true, pin icon shown, pinned block sorts first | PASS |
| Duplicate ("... copy") | PASS |
| Delete then Undo restores it | PASS |
| Saved copy on the server (`/api/settings/context-bank`) holds the blocks | PASS |
| Export downloads `context-bank-15-11-2026.json` with the blocks | PASS |
| Import adds the new block, skips a duplicate and an empty one, refuses a non Context Bank file with a toast | PASS |
| Reload: blocks persist | PASS |
| Clear the browser copy, reload: blocks restore from the saved copy | PASS |
| New prompt window: Context button visible, side panel lists blocks, clicking one inserts at the cursor (offset 5) wrapped as `--- Context: Title ---` | PASS |
| Console and network errors | none |

### 5. Prompt Builder Pro: PASS

| Check | Result |
| :--- | :--- |
| My Favorites list collapses (aria-expanded flips), state survives reload, expands again | PASS |
| Opens from the launcher, `window.__pb` and `window.PLBuilder` present | PASS |
| Add blocks from the library, wire by dragging output port to input port (0 to 2 wires), stats show 3 blocks and 2 wires | PASS |
| Compiles a prompt from the wired blocks | PASS |
| Format tabs change the view (Markdown, XML, Messages JSON) | PASS |
| Four exports download: `.txt`, `.md`, `.json`, `.xml`. JSON parses, XML parses | PASS |
| Component Library borrow (`PL_galleryBorrow`): gallery opens inside Builder Pro, 25 departments from the shared dataset, button reads "Add all to Workshop" | PASS |
| Checkout adds the component to the workshop, gallery returns to `#componentsWorkspace` and is hidden | PASS |
| Prompt Components still opens afterwards and its button reads "Add all to canvas" again | PASS |
| Console and network errors | none |

### Whole app smoke

All 37 launcher cards opened one after another with no console error, page error or failed request, and each visibly opened.

## Sanity commands

| Command | Result |
| :--- | :--- |
| `grep -c "<script" static/index.html` | 8, not 5. See finding below |
| `node --check static/app.js` | OK, ends in `})();` |
| `node --check` on builder-pro, builder-pro-engine, randomiser-motion, vartypes-3d, swipe-deck, combine-prompts, xray-views | OK |
| `python3 -m py_compile app.py share_server.py` | OK |
| `python3 update_hash.py` | Hashes already current (js fef6d74c, css c95240b4), no file changed |
| `tests/combine/test_combine.py` | All passed |
| `tests/nearby/test_desktop.py` | 12 tests OK |
| `tests/randomiser` (offline, real Chromium) | 10 tests, OK, 1 skipped (phone asset drift check needs `PHONE_ASSETS`) |

## What was fixed

Nothing in the app. No defect was found in the four features or in Builder Pro, so no application file was edited. `static/app.js`, `static/index.html` and the Builder Pro files are unchanged, and the Builder Pro `?v=` value was not bumped.

## Findings that are not app defects

1. **Script count in the sanity check is stale.** `index.html` now has 8 `<script` tags: components-data, forge-frameworks, xray-views, qrcode.min, app.js, randomiser-motion, vartypes-3d and the inline bootstrap (Builder Pro loads from that bootstrap). `CLAUDE.md` still says 5. A truncation check should use 8 now. `CLAUDE.md` was not edited because it is project instruction text.
2. **`tests/randomiser` needs the Python `playwright` package** and `CHROME` set (here `/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`). Installed in the venv outside the repo.

## Outstanding

- Nearby share on real hardware: two real PCs, the phone app, Wi-Fi client isolation and firewalls. Needs real devices.
- Phone side: `tests/randomiser` drift check against the phone `vartypes-3d.js` was skipped (`PHONE_ASSETS` not available in this session).
- The click through scripts used here are not in the repo. They could be added under `tests/` if Eugene wants them kept (not done, to stay inside "fix defects only").
- Playwright MCP tools were not used (not available in this cloud session).

## Next action

Review draft PR into `main`, then update the script count in `CLAUDE.md` from 5 to 8 and decide whether the verification scripts should be committed under `tests/`.
