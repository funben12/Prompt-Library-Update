# Fork Lab — architecture contract (v0)

Workspace name: **Fork Lab** (`data-view="forklab"`, `openForkLabWorkspace()`), PRO-gated, lives in the Workspaces picker.
Goal: take a prompt, explore what it could become, understand why each version differs, systematically improve the whole prompt system.

## Hard constraints (from CLAUDE.md, non-negotiable)
- NEVER Edit/Write `static/app.js` or `static/index.html`. Scripted bash+Python `content.replace()` only, assert marker uniqueness, snapshot first, verify after (`grep -c "<script"`, `node --check`, ends `})();`).
- No schema changes, no new dependencies (no npm libs, no CDN additions beyond what index.html already loads).
- Monolith must not grow: ALL Fork Lab code lives in NEW files under `static/forklab/`. app.js/index.html get only thin glue (see "Glue").
- Never reuse taken class names. Every class is prefixed `fl-`, every id `fl` + PascalCase. Grep app.css before adding anything outside `forklab.css`.
- Existing tokens only (`--bg --surface --surface-2/3 --surface-sunk --line --line-strong --ink --ink-2/3/4 --accent --accent-soft --accent-line --warn --danger --success --c-* --r-* --sp-* --fs-* --ff-display/sans/mono --shadow-* --ease-* --t-*`). Light + dark via `:root[data-theme="dark"]`. New tokens are `--fl-*` and defined for both themes.
- Material Symbols: CLASSIC (pre-2022) icon names only.
- Browser verification: Playwright MCP only.
- Never use Edit/Write against the user's real library data in tests; never leave junk prompts in the live DB (delete what you create, or don't create).
- Comments: plain English, one line, imperative. No paragraph comments.

## Files (all new)
```
static/forklab/fl-core.js       namespace window.ForkLab, store, data model, persistence, events, undo/redo, ids, utils
static/forklab/fl-taxonomy.js   fork-type registry + local transformers + AI meta-prompts
static/forklab/fl-analysis.js   prompt quality evaluator + system analyzer (whole-library)
static/forklab/fl-diff.js       line/word/section diff + semantic (structural) diff + plain-English summary
static/forklab/fl-ui-shell.js   workspace DOM, layout, panes, top bar, responsive, keyboard map, onboarding, status/toasts
static/forklab/fl-ui-canvas.js  Prompt Canvas (view/edit/annotate)
static/forklab/fl-ui-lineage.js Fork Explorer (lineage visualisation)
static/forklab/fl-ui-forge.js   Fork creation dialog + generation states
static/forklab/fl-ui-compare.js Comparison experience (+ merge)
static/forklab/fl-ui-intel.js   Intelligence panel
static/forklab/fl-ui-system.js  System Organiser mode
static/forklab/forklab.css      all styling
```
Loaded as ordered `<script defer>` tags before `app.js`. Each file is an IIFE that attaches to `window.ForkLab` (no ES modules, no build).

## Glue (the only edits outside static/forklab/)
1. app.js (inside the IIFE, python-scripted): `window.PLBridge = { state, api, toast, callAI, copyToClipboard, loadPrompts, openDetail, showPremiumModal, $, $$ }` (state is the live object); `window.openForkLabWorkspace` = premium gate + `ForkLab.open(opts)`; nav route `v === 'forklab'`; `'#forkLabWorkspace'` in `_escapeToLibrary()`; palette entry in the command palette array; `ForkLab.init(PLBridge)` in BOOTSTRAP. Rule-5 order.
2. index.html (python-scripted): `<link forklab.css>`, script tags, launcher-card in the picker (group "Refine"), nothing else — the workspace DOM is built by fl-ui-shell.js into `<div id="forkLabWorkspace">` which is appended to `<body>` before the script tags (overlay order rule 7).
3. `update_hash.py` extended to cache-bust forklab files (`?v=`).
4. CLAUDE.md sanity-check line updated (script-tag count).

## Data model
Persistence: `localStorage` (no schema change). Keys: `promptlib.forklab.index.v1` (list of tree summaries), `promptlib.forklab.tree.<treeId>.v1` (one tree), `promptlib.forklab.prefs.v1`. Guard every access with try/catch; degrade to in-memory with a visible "not saving" state. JSON export/import. Quota-aware (warn at 80%).

```
Tree { id, title, sourcePromptId|null, rootId, activeId, compareIds:[a,b]|null,
       nodes:{[id]:Node}, order:[ids], view:{collapsed:[ids], filter:{types:[],status:[],q:''}, focusId|null},
       createdAt, updatedAt, schema:1 }
Node { id, parentId|null, kind:'source'|'fork'|'merge'|'edit',
       name, content, contentHash,
       forkType:'optimise'|...|'custom'|null, forkParams:{}, instruction:'' (custom/user text),
       origin:'local-engine'|'ai'|'user'|'import',
       status:'suggested'|'reviewing'|'accepted'|'rejected'|'archived',
       rationale:{ what:[strings], why:'', benefit:'', tradeoffs:[strings], confidence:'low'|'medium'|'high' },
       ops:[{kind, label, before, after, section?}],   // machine-readable change list
       notes:[{id, text, at}], tags:[], pinned:false,
       mergedFrom:[nodeId], revisions:[{content, at, by:'user'|'engine'}],
       analysis:{ scores:{...}, issues:[...] , at }|null,
       savedPromptId:null, createdAt, updatedAt }
```
Invariants: the source node is a read-only mirror — editing it forks an `edit` node. Generated content is never silently changed; user edits append a revision and flip `origin` markers visibly ("edited by you"). `accepted` requires an explicit user action. "Apply to library prompt" is always a confirm dialog with diff; default outward action is "Save as new prompt" (+ `prompt_relationships` rel_type `fork` via existing API). Delete = archive; every mutation is on an undo stack (`ForkLab.store.undo()/redo()`), with an undo toast.

## Core API surface (names are fixed; agents may ADD, not rename)
```
ForkLab.store: getTree(), openSource(promptIdOrText), select(id), createFork({parentId,type,params,instruction}) -> Promise<Node[]>,
  updateNode(id,patch), editContent(id,text), rename(id,name), addNote(id,text), setStatus(id,status), archive(id), restore(id),
  duplicate(id,{deep}), merge({aId,bId,picks}) -> Node, setCompare(a,b), undo(), redo(), on(evt,fn), off(evt,fn), exportTree(), importTree(json)
ForkLab.taxonomy: types[] (registry), get(id), families[], suggest(promptText)->rankedTypes, run(type,{text,params,ctx})->{content,rationale,ops}, aiPromptFor(type,ctx)
ForkLab.analysis: evaluate(text)->{scores,issues,failureModes,strengths,summary}, evaluateAsync, systemScan(prompts,{onProgress,signal})->{insights,clusters,components,stats}, understand(text)->{objective,audience,inputs,outputFormat,constraints,tone}
ForkLab.diff: lines(a,b), words(a,b), sections(a,b), semantic(a,b)->{objective,context,constraints,output,structure,tone, summary:[strings]}
ForkLab.ui: shell/canvas/lineage/forge/compare/intel/system each expose mount(el), update(), destroy()
ForkLab.open({promptId?, text?}), ForkLab.close(), ForkLab.init(bridge)
```
Engine honesty rule: every recommendation says "may / likely / consider"; no guarantee language; each carries `confidence`. Analysis is heuristic and local (works offline); AI mode via `PLBridge.callAI` upgrades quality and is clearly labelled "AI-generated"; on failure fall back to the local engine and say so.

## UX contract (from the brief)
Three interlocked areas: **Prompt Canvas** (centre, hero), **Fork Explorer** (lineage), **Intelligence Panel**; plus a top-level mode switch **Lab | System Organiser**. Primary action **Fork Prompt** (`F`). The user must always be able to answer: what am I looking at / what changed / why / what next / what happens if I click this. Generated vs user-approved is always visually distinct. States to cover: empty, first prompt, generating, multiple forks, deep branching, comparing, reviewing recs, applying an optimisation, conflicting recs, failed generation, loading, no recs, archived, large systems, narrow/mobile, keyboard nav, focus.
