# Prompt Library Pro — Forward-Looking UX & Architecture Strategy

**Date:** 03-06-2026  
**Status:** Strategic reference — ground all major feature decisions against this

---

## The Core Thesis

Prompts are not static text. They are evolving knowledge assets. Every architectural decision you make in the next six months will either enable or block you from treating them that way.

The failure mode is building features that assume prompts are strings. The opportunity is building an architecture that treats prompts as structured, versioned, composable programs — and then surfaces that power through an interface that never feels complicated.

---

## The Three Waves of User Evolution

**Wave 1 — Storage (where most users are now)**  
Prompts as a filing cabinet. Users copy, paste, occasionally search. The interface is a list. The primary action is retrieval. This is already well-served by the current build.

**Wave 2 — Iteration (where power users go within 6–12 months)**  
Users begin treating prompts as living assets. They fork variants, compare versions, note what worked for which model, and tag by outcome rather than just topic. They want to track which version of a prompt produced the best result. They want to copy a base prompt and specialize it without losing the original.

**Wave 3 — Composition (where the tool becomes irreplaceable)**  
Prompts become building blocks. Users assemble complex prompt sequences from reusable parts — a persona block, a format constraint, a task definition — each maintained and improved independently. The library becomes a knowledge system with structured relationships between components.

**The principle:** Design for Wave 3 now — in schema and architecture only. Surface Wave 2 UX now. Let Wave 1 users stay comfortable.

---

## What's Already Built (Audit)

The codebase is further along than a blank-slate analysis would suggest. Credit where it's due:

| Feature | Status | Notes |
|---|---|---|
| Variable system (`{{var}}` detection) | ✅ Live | text, number, date, dropdown types |
| Version history (auto-snapshot) | ✅ Live | capped at 20, no labels |
| Usage tracking (use_count, last_used) | ✅ Live | tracked per prompt |
| Rating field | ✅ Live | 0–5 scale |
| Notes field | ✅ Live | free text per prompt |
| Categories + free-form tags | ✅ Live | freeform only |
| Chain prompting workspace | ✅ Live | nodes + layout stored as JSON |
| Context Bank (block library embryo) | ✅ Live | partial toward block reuse |
| Roles system (persona presets) | ✅ Live | prepended at copy time |
| Colour labels | ✅ Live | visual org signal |
| Version diff view | ❌ Planned | roadmap item |
| Status field (draft/active/deprecated) | ❌ Missing | needed now |
| Semantic version labels + commit notes | ❌ Missing | needed now |
| Controlled taxonomy | ❌ Missing | freeform tags only |
| Parent/fork relationship | ❌ Missing | needed now |
| Conditional prompt blocks | ❌ Missing | Wave 3 |
| Semantic/embedding-based search | ❌ Missing | Wave 3 |
| Prompt-to-prompt interface contracts | ❌ Missing | Wave 3 |

---

## The Five Architectural Bets to Make Now

These are decisions that are cheap now and expensive later. Lock them in before the codebase grows further.

### Bet 1: The Content Model

**The decision:** Stay with one text blob, or introduce named structural zones.

**The argument for zones:**  
A prompt always has the same structural anatomy: who the AI is, what it knows, what it must do, what it cannot do, how it must respond, and what gets filled in each run. These are not formatting conventions — they are logical components. If they stay mixed in one blob, every feature that operates on prompt structure (conditional logic, block insertion, zone-level search) requires parsing. If they are named zones in the DB, those features become simple queries.

**The pragmatic path:**  
Don't force users to fill separate fields for every zone. Store the prompt as a single `content` field (unchanged for backward compat), AND add a `structure` JSON field that optionally maps zone labels to character ranges or extracted content. UI renders them as one editor. Power users can opt into structured mode. Extraction is progressive — the system infers zones from common patterns (system prompt signifiers, OUTPUT FORMAT headers, etc.) and lets the user confirm them.

**The bet:** Add `structure JSON` column now. Populate it only for new structured prompts. Legacy prompts show as unstructured. Never break existing data.

---

### Bet 2: The Version Model

**What you have:** Auto-snapshots on save, no labels, no commit intent, capped at 20.

**What's missing:**  
Users can't reason about their version history without labels. "Version 7 of 20" means nothing. "v1.2 — changed tone to direct, removed hedging" means everything.

**The additions:**
- `version_label TEXT` on `prompt_versions` — semantic version string, user-set or auto-generated (e.g., "v1.0", "v1.1")
- `version_notes TEXT` on `prompt_versions` — one-line commit message ("removed examples section", "tightened task definition")
- `is_baseline INTEGER DEFAULT 0` on `prompt_versions` — flag a specific version as the "golden" reference point for diffs

These are three columns on an existing table. No migration risk. Zero breaking changes.

**The UX payoff:** Version history panel shows labels + notes instead of timestamps. Diff view (already roadmapped) becomes meaningful the moment labels exist.

---

### Bet 3: The Status Model

**What's missing:** Every prompt is implicitly "active." There is no way to mark a prompt as a draft (not ready to use), active (verified, ship it), or deprecated (outdated, keep for reference but don't surface in search).

**Why this matters at scale:** Without status, the library fills with graveyard prompts — things users tried once, abandoned, and never deleted. Search returns noise. The library feels cluttered at 200 prompts.

**The addition:** `status TEXT DEFAULT 'active'` on `prompts` table. Values: `draft`, `active`, `deprecated`.

**The UX payoff:**
- Default search filters to `active` only
- `deprecated` prompts still accessible but visually distinct (greyed, badge)
- `draft` prompts shown in a dedicated "In Progress" filter
- One-click status toggle in the detail panel

---

### Bet 4: The Taxonomy Model

**What you have:** Free-form tags. The failure mode is visible at 100+ prompts: "email" and "emails" and "cold-email" and "outreach" as separate tags, with no parent relationship, no auto-suggest from controlled vocabulary, and no way to browse by category hierarchy.

**The bet:** Introduce a two-level controlled taxonomy alongside free-form tags — not instead of them.

```
domain     → top-level: Marketing | Engineering | Operations | Creative | Research | Personal
use_case   → mid-level per domain: Email | Analysis | Code | Copy | Summary | Onboarding | etc.
```

Both stored as FK references to taxonomy tables, not free text. Free-form tags remain for everything else (model notes, client names, project names).

**The schema:**
```sql
CREATE TABLE taxonomy_domains (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE taxonomy_use_cases (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_id INTEGER REFERENCES taxonomy_domains(id),
    name      TEXT NOT NULL
);

-- Add to prompts:
ALTER TABLE prompts ADD COLUMN domain_id    INTEGER REFERENCES taxonomy_domains(id);
ALTER TABLE prompts ADD COLUMN use_case_id  INTEGER REFERENCES taxonomy_use_cases(id);
ALTER TABLE prompts ADD COLUMN output_format TEXT;   -- controlled list: Email | JSON | List | Narrative | Code | etc.
ALTER TABLE prompts ADD COLUMN tone          TEXT;   -- controlled list: Formal | Casual | Direct | Technical | Persuasive
```

**The UX payoff:** Filter sidebar gains a structured drill-down. "Show me all Marketing > Email prompts in Direct tone." This is not possible with free-form tags.

---

### Bet 5: The Relationship Model

**What's missing:** Prompts have no awareness of each other beyond chains. A user forks a "cold email" prompt into five variants for different audiences — but the library shows five disconnected items with no common thread.

**The additions:**
```sql
-- Self-referencing FK on prompts:
ALTER TABLE prompts ADD COLUMN parent_id INTEGER REFERENCES prompts(id) ON DELETE SET NULL;

-- Many-to-many related prompts:
CREATE TABLE prompt_relationships (
    prompt_a INTEGER REFERENCES prompts(id) ON DELETE CASCADE,
    prompt_b INTEGER REFERENCES prompts(id) ON DELETE CASCADE,
    rel_type TEXT DEFAULT 'related',   -- 'related' | 'complement' | 'successor'
    PRIMARY KEY (prompt_a, prompt_b)
);
```

**The UX payoff:**  
- Prompt detail panel shows "Variants of this prompt" (siblings with same parent_id)
- "Fork this prompt" action auto-sets parent_id on the new copy
- "Related prompts" section on detail panel
- Future: browse the prompt family tree

---

## The Prioritised Build Sequence

### Now (before any new workspace or feature)

These are schema additions. They cost < 1 hour each, break nothing, and enable everything that follows.

1. `prompts.status TEXT DEFAULT 'active'`
2. `prompt_versions.version_label TEXT`
3. `prompt_versions.version_notes TEXT`
4. `prompt_versions.is_baseline INTEGER DEFAULT 0`
5. `prompts.parent_id INTEGER` (FK to prompts)
6. `prompts.domain_id INTEGER` + taxonomy tables
7. `prompts.use_case_id INTEGER`
8. `prompts.output_format TEXT`
9. `prompts.tone TEXT`

**UI additions that ship with the schema:**
- Status badge + toggle in detail panel
- Version history panel shows label + notes fields (editable)
- "Fork this prompt" action in prompt menu (sets parent_id, opens new prompt editor pre-filled)
- Domain/Use Case dropdowns in prompt editor (optional at creation, always editable)

---

### Next (when core schema is stable)

10. **Status-aware search** — default filter excludes `deprecated`; "In Progress" filter for `draft`
11. **Version diff view** — side-by-side comparison of two selected versions (already on roadmap, schema additions above make it meaningful)
12. **Variants panel** — detail panel section showing sibling prompts (same parent_id)
13. **Block promotion** — promote any prompt (or prompt section) to the Context Bank as a reusable block
14. **Taxonomy filter sidebar** — structured domain > use_case drill-down replacing or augmenting flat tag filter

---

### Later (when power user workflow is proven)

15. **Conditional block syntax** — if/then within prompt content. Syntax decision: `[[if variable=="x"]]...[[endif]]`. Rendered in preview, stripped in copy.
16. **Variable groups** — named config bundles ("B2B SaaS setup", "Casual social setup") that pre-fill multiple variables at once. Stored in `variable_templates` (table already exists).
17. **Semantic search** — SQLite FTS5 extension (already available, just needs enabling) for full-text; local embedding model (e.g., `sqlite-vec` + MiniLM) for semantic similarity. The embedding column lives on `prompts`, computed once on save/update.
18. **Prompt programs** — a named collection of chained prompts with shared variable scope and version-locked snapshots. Builds on existing chains + the relationship model above.
19. **Outcome tracking** — link a version to a logged result (model used, rating, notes). Enables "find me the highest-rated version of this prompt" and "which prompts work best with Claude Sonnet."

---

## UX Patterns to Design For

**Progressive disclosure, not feature overload.**  
The detail panel shows: title, content, copy button. Everything else — variables, versions, metadata, related prompts — lives in collapsible sections. New users see a clean editor. Power users expand what they need.

**Friction-free forking.**  
Fork = one click from the prompt menu. The new prompt opens pre-filled with the original content, the parent_id set, and the status pre-set to `draft`. No modal friction. The user is immediately editing the fork.

**Inline version commit.**  
Every save surfaces a one-line "What changed?" input (optional, dismissible). If filled, stored as `version_notes`. If skipped, auto-labelled "Auto-save". The habit forms fast because the field is always there, never a separate flow.

**Status as a visual language.**  
`draft` = slightly muted, pencil icon. `active` = default. `deprecated` = strikethrough badge, greyed. Users can read status without opening a prompt. One click to change it.

**Taxonomy as guardrails, not gates.**  
Domain and use case dropdowns show on first save but are never required. The system nudges ("Add a category to make this findable") without blocking. Completion rate can be surfaced in a "Library Health" panel later.

**Diff as default on version open.**  
When a user clicks any non-current version in the history panel, the default view is a side-by-side diff against the current version — not a raw display of the old version. This is how power users read history.

---

## What NOT to Build

- **AI-generated prompt suggestions** without a tested use case. The in-app AI executor (planned Pro feature) is the right home for this — not a generic "improve this prompt" button that produces noise.
- **Nested folders deeper than two levels.** Folder depth is a sign of taxonomy failure. Use the structured domain/use_case fields instead. Two levels of folder hierarchy is the ceiling.
- **Social/sharing features** before the core library UX is excellent for solo use. Sharing is a distribution problem, not a product problem.
- **Real-time sync** before the local-first model is proven. The value proposition is offline-first. Don't dilute it.

---

## The Summary

Five schema bets. Zero breaking changes. All addable this week:

| Column/Table | Table | Unlocks |
|---|---|---|
| `status` | `prompts` | Draft/active/deprecated workflow |
| `version_label` | `prompt_versions` | Meaningful version history |
| `version_notes` | `prompt_versions` | Diff context, commit-style reasoning |
| `is_baseline` | `prompt_versions` | Golden reference for diffs |
| `parent_id` | `prompts` | Fork relationships, variant families |
| `domain_id`, `use_case_id` | `prompts` | Structured taxonomy, drill-down filter |
| `output_format`, `tone` | `prompts` | Controlled classification, advanced filter |
| taxonomy tables | new | Source of truth for controlled vocabulary |
| `prompt_relationships` | new | Related prompt network |

The codebase is already past Wave 1. These additions push it into Wave 2 without rebuilding anything. Wave 3 architecture (conditional blocks, semantic search, prompt programs) follows from the relationship model and structured content work once the Wave 2 UX is proven.

Prompts become systems not through a single big feature. They become systems through schema decisions made early enough that every subsequent feature builds on structure, not string manipulation.
