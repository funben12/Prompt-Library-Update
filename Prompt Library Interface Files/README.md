# Prompt Library Interface Files

One folder per user-facing interface area of Prompt Library Pro. Each folder holds the
HTML, CSS and JS for that area only, pulled out of the three monolith files so a single
screen can be worked on in isolation.

**These are reference copies, not the live app.** The app still loads
`static/index.html`, `static/app.css`, `static/app.js`. Port changes back by hand.

## Layout of each folder

```
<view>/
  markup.html    HTML block, dedented, root element noted in the README
  styles.css     CSS rules targeting this view
  script.js      app.js functions belonging to this view
  preview.html   standalone page: shared.css + styles.css + markup + script
  README.md      source locations, function list, edit workflow
```

`_shared/` holds the global CSS (tokens, resets, primitives) and the global JS
(state, api, helpers) that every view depends on.

## Views

| Folder | Area | Root element | CSS rules | JS fns | HTML lines |
|---|---|---|---|---|---|
| [01-sidebar-nav](01-sidebar-nav/) | Sidebar / primary navigation | `#sidebar` | 14 | 5 | 113 |
| [02-library-main](02-library-main/) | Library main view (toolbar, grid, list, folders) | `#main` | 105 | 26 | 876 |
| [03-prompt-viewer](03-prompt-viewer/) | Prompt viewer overlay | `#promptViewer` | 35 | 4 | 50 |
| [04-settings-config](04-settings-config/) | Settings / config panel | `#configPanel` | 11 | 1 | 51 |
| [05-command-palette](05-command-palette/) | Command palette | `#cmdPalette` | 1 | 3 | 16 |
| [06-workspaces-launcher](06-workspaces-launcher/) | Workspaces launcher grid | `#workspacesLauncher` | 34 | 3 | 175 |
| [07-agents-roles](07-agents-roles/) | Agents / Roles workspace | `#rolesWorkspace` | 82 | 7 | 549 |
| [08-playground](08-playground/) | Prompt Playground | `#playgroundWorkspace` | 30 | 4 | 43 |
| [09-forge](09-forge/) | Prompt Forge | `#forgeWorkspace` | 29 | 4 | 184 |
| [10-lab](10-lab/) | Prompt Lab | `#labWorkspace` | 28 | 6 | 71 |
| [11-chain](11-chain/) | Prompt Chain | `#chainWorkspace` | 35 | 9 | 57 |
| [12-meta](12-meta/) | Metaprompting | `#metaWorkspace` | 10 | 3 | 71 |
| [13-optimizer](13-optimizer/) | Prompt Optimizer | `#optimizerWorkspace` | 40 | 5 | 134 |
| [14-context-bank](14-context-bank/) | Context Bank | `#contextBankWorkspace` | 48 | 5 | 111 |
| [15-quick-fill](15-quick-fill/) | Quick Fill | `#fillWorkspace` | 11 | 4 | 32 |
| [16-auditor](16-auditor/) | Prompt Auditor | `#auditWorkspace` | 14 | 2 | 42 |
| [17-diff-lens](17-diff-lens/) | Diff Lens | `#diffWorkspace` | 8 | 3 | 32 |
| [18-cost-lens](18-cost-lens/) | Cost Lens | `#costWorkspace` | 12 | 3 | 43 |
| [19-library-pulse](19-library-pulse/) | Library Pulse | `#pulseWorkspace` | 7 | 3 | 20 |
| [20-xray](20-xray/) | Prompt X-Ray | `#xrayWorkspace` | 7 | 3 | 33 |
| [21-splicer](21-splicer/) | Prompt Splicer | `#spliceWorkspace` | 8 | 3 | 36 |
| [22-components](22-components/) | Prompt Components | `#componentsWorkspace` | 81 | 17 | 145 |
| [23-generator](23-generator/) | Prompt Generator | `#genWorkspace` | 40 | 4 | 176 |
| [24-dashboard](24-dashboard/) | Dashboard | `#dashboardWorkspace` | 15 | 3 | 66 |
| [25-batch-runner](25-batch-runner/) | Batch Runner | `#batchWorkspace` | 26 | 5 | 50 |
| [26-board](26-board/) | Prompt Board | `#boardWorkspace` | 19 | 6 | 40 |
| [27-onboarding-tour](27-onboarding-tour/) | Onboarding tour overlay | `#onboardingOverlay` | 16 | 3 | 17 |
| [28-tutorial-coachmarks](28-tutorial-coachmarks/) | Tutorial coachmark card | `#tutorialCard` | 22 | 2 | 20 |
| [29-toasts](29-toasts/) | Toast notifications | `#toastContainer` | 1 | 1 | 1 |

## Rules when porting back

1. Never use Edit/Write on `static/app.js` or `static/index.html` — use bash + Python
   `content.replace()`, then verify (project CLAUDE.md hard rule 1).
2. `node --check static/app.js` and `python3 -m py_compile app.py` after edits.
3. `python3 update_hash.py` after every `app.js` change, or the browser serves a stale copy.
4. New workspace order: `openXxxWorkspace()` -> nav route -> `_escapeToLibrary()` -> `initXxxWorkspace()` -> HTML.
