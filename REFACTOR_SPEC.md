# Prompt Library Pro — Workspace Refactor Spec

Locked 2026-05-16. Aligned with `.impeccable.md` (Editorial Workshop aesthetic).

## The shift

Old model: a prompt library with chain prompting bolted onto each prompt.
New model: a prompt operating system with three first-class workspaces.

```
Prompts          →  Quick tools. Storage, retrieval, tagging, execution.
Meta Prompting   →  Prompt engineering workspace. Build prompts that generate prompts.
Chain Prompting  →  Systems workshop. Build, edit, and reuse multi-step workflows.
```

Each section opens into its own dedicated environment. Selecting a workspace changes what the sidebar, header, and main area mean. Different operational modes, not different filters over the same list.

## Sidebar — new architecture

Top-level **Workspace Switcher**:

```
┌──────────────────────────┐
│  Prompt Library          │
├──────────────────────────┤
│  📖  Prompts             │  ← active workspace highlighted
│  🧠  Meta Prompting      │
│  ⛓   Chain Prompting    │
├──────────────────────────┤
│  (contextual sub-nav)    │  ← changes per workspace
└──────────────────────────┘
```

Removed: **Unsorted**, **Untagged** (filter noise, not workspaces).

Sub-nav per workspace:

**Prompts**
- Library, Favourites, Analytics (existing)
- Folders, Categories, Tags (existing — scoped to prompts only)

**Meta Prompting**
- All blueprints, Favourites
- Frameworks (tag-style grouping)
- Recent runs

**Chain Prompting**
- All chains, Favourites
- Tags / collections
- Recent runs

## Data model — additions

Existing `prompts.chain_ids` column stays for backward compatibility but is no longer the storage path for new chains. New tables live alongside.

```sql
CREATE TABLE chains (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  description  TEXT,
  nodes        TEXT NOT NULL,    -- JSON array of node objects
  layout       TEXT,             -- JSON for graph view (x/y per node)
  tags         TEXT,
  colour_label TEXT,
  is_favorite  INTEGER DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE meta_blueprints (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  description   TEXT,
  template      TEXT NOT NULL,   -- the meta-prompt itself
  system        TEXT,            -- optional system instructions
  variables     TEXT,            -- JSON list of input variables
  output_format TEXT,            -- TEXT | JSON | MARKDOWN | XML
  tags          TEXT,
  is_favorite   INTEGER DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chain node shape

```jsonc
{
  "id": "n_abc123",
  "type": "prompt" | "inline" | "note",
  "title": "Brief opener",
  "promptId": 47,           // when type === "prompt"
  "content": "...",         // when type === "inline"
  "passContext": true,      // append previous output as context
  "variables": { "k": "v" } // pre-filled vars for this node
}
```

Stored as an ordered JSON array. List view = the array in order. Graph view reads `layout` for `(x, y)` per node id; missing entries fall back to a clean vertical layout.

## API surface — additions

```
GET    /api/chains
POST   /api/chains
GET    /api/chains/:id
PUT    /api/chains/:id
DELETE /api/chains/:id
POST   /api/chains/:id/duplicate
POST   /api/chains/:id/favorite

GET    /api/meta
POST   /api/meta
GET    /api/meta/:id
PUT    /api/meta/:id
DELETE /api/meta/:id
POST   /api/meta/:id/duplicate
POST   /api/meta/:id/favorite
```

Existing `/api/prompts/*` endpoints are unchanged.

## Routing / state

Frontend state grows a `workspace` field:

```js
state = {
  workspace: 'prompts' | 'meta' | 'chains',
  view: 'library' | 'favorites' | <folder_id>,   // scoped per workspace
  // ...existing
}
```

Switching workspaces resets `view` to the workspace default. Each workspace owns its own list/detail/editor template.

## Prompts workspace — what changes

Strip from the prompt editor:
- Chain tab → **removed**
- Chain runner in detail panel → **removed**

Keep:
- Variables tab
- Chat format tab
- Rating & notes tab
- Read-only "Used in chains" badge on detail view (optional, defers to v2)

The prompt becomes a pure unit: text, variables, metadata. Composition lives in the Chain workspace.

## Chain Prompting workspace

### Left rail (sub-nav)
List of chains, filter by tag, sort by recent/favourites.

### Main area — two modes, toggle in header

**List view (default)**
- Vertical column of nodes
- Each node: number badge, title, prompt preview, copy/duplicate/delete, drag handle
- Tap to expand into inline editor
- "Add node" at the bottom: choose existing prompt or write inline

**Graph view**
- SVG canvas, drag nodes, lines connect step n → step n+1
- Each node card shows title + preview
- Pan + zoom (cmd-drag pans, +/- zoom)
- Layout persisted per chain in `chains.layout`

Both views read and write the same `nodes` array. Toggling preserves order. Reordering in list view recomputes graph layout.

### Run mode
Sequential step-through. Each step: fill variables, copy text, advance. Output context carries forward when `passContext: true`.

## Meta Prompting workspace

### Left rail
List of blueprints. Filter by framework tag, sort by recent/favourites.

### Main area — three panes

**Editor pane (default)**
- Template field (the meta-prompt itself, with `{{slot}}` variables)
- Optional system instructions field
- Variables list (name, default, description)
- Output format selector (text, JSON, markdown, XML)

**Test pane**
- Fill in the variables → preview the rendered prompt
- "Save as Prompt" — drops the rendered output into the Prompts workspace
- "Run variation" — record multiple test outputs side-by-side

**Library pane**
- Save the blueprint
- Tag as framework (e.g. RACE, CRISPE, custom)
- Duplicate, version, share

## Visual language

Unchanged from `.impeccable.md`:
- Fraunces display, Instrument Sans body, JetBrains Mono in prompt text
- OKLCH warm neutrals, single ink-blue accent
- 4pt spacing scale, fluid `clamp()` typography
- 100/200/300ms motion, transform+opacity only

Workspace switcher uses the active-state ink-blue rule on the left edge. Each workspace gets a one-line subtitle in the header confirming what mode you're in. No glow, no gradient, no neon.

## Migration

On first launch after upgrade:
1. Existing `prompts.chain_ids` arrays auto-import into the new `chains` table as one chain per source prompt with name `"<Prompt title> — chain"`. Original `chain_ids` column kept for rollback.
2. No data loss. Users see their chains in the new workspace immediately.

## Build order

1. Backend: add tables, endpoints, migration step.
2. Frontend HTML: new sidebar, three workspace containers, chain + meta templates.
3. Frontend JS: workspace state, view switching, chain CRUD, meta CRUD, list/graph toggle.
4. Strip chain UI from prompt editor.
5. Verify end-to-end: launch, switch workspaces, create chain, create blueprint.
