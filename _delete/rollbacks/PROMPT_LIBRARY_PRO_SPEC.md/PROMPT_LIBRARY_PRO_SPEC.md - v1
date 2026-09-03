# Prompt Library Pro — Comprehensive Product Specification

**Version:** 1.0  
**Date:** 2026-06-04  
**Status:** Ship-Ready + Full Vision  
**Scope:** Complete product spec covering V1 release + roadmap vision

---

## Executive Summary

Prompt Library Pro is a local-first Windows desktop application for storing, organizing, running, and versioning AI prompts. It's designed for prompt engineers, marketers, developers, and anyone who uses LLMs repeatedly and needs a system to manage, refine, and deploy prompts efficiently.

**Core value proposition:** Take control of your prompt strategy. Build a personal knowledge base of proven prompts, organize them by domain and use case, attach AI personas (Roles) to standardize outputs, chain prompts together for multi-step workflows, version track everything, and export your entire library in multiple formats. All local. No cloud. No accounts. No internet required.

**Target user:** Prompt engineers and AI-focused professionals aged 20-40 who know AI should do more of their thinking but have no system, framework, or knowledge base to make it repeatable.

**Monetization:** Free tier (25 prompts, 3 folders) + Premium tier ($9-19/month or one-time) unlocks advanced features.

---

## Problem Statement

Users who rely on AI for core workflows face three critical gaps:

1. **No persistence.** Prompts that work are lost between sessions. Users re-engineer the same prompt across different tools and conversations.
2. **No structure.** Without organization, good prompts become noise. Finding "that email template from 3 weeks ago" is impossible.
3. **No consistency.** Every AI call is isolated. Tone, style, persona, and format expectations are never standardized. Output quality varies wildly.

The cost of not solving this: wasted time on re-prompting, inconsistent outputs that require rework, knowledge fragmentation across 5+ tools, and inability to build on past success.

---

## Goals (Success Criteria)

### User Goals
1. **Create once, use many times.** Store a prompt once, run it unlimited times with variable substitution (via {{var}} or [[var]] syntax).
2. **Organize with confidence.** Use folders, categories, tags, domains, use cases, and search to reliably find any prompt.
3. **Standardize tone & persona.** Attach a Role (system prompt) to a prompt so the AI knows what voice/style/expertise to use.
4. **Track what works.** See which prompts are used most, rate them, favorite them, and see historical versions.
5. **Build workflows.** Chain multiple prompts together to create multi-step AI workflows without leaving the app.
6. **Take it anywhere.** Export entire library (JSON/CSV/Markdown/ZIP), share as .plp packs (bundles of prompts + roles), import packs from others.

### Business Goals
1. **Achieve 50%+ adoption in target segment.** Launch to 500+ active free users within 6 months.
2. **Convert 5-10% to Premium.** Demonstrate clear value-add of Pro features (version history, analytics, advanced exports, themes).
3. **Build moat through data lock-in.** Users who accumulate 50+ prompts and roles become sticky.
4. **Establish distribution channel via .plp packs.** Users build and share prompt libraries; Gumroad becomes secondary marketplace.

---

## Non-Goals

1. **Cloud sync or multi-device.** App is strictly local. No accounts, no servers, no cloud storage. Scope remains bounded.
2. **Built-in AI execution via native API.** No OpenAI/Anthropic API integration in V1. Users copy/paste to ChatGPT or Claude (Pro tier exploration only).
3. **Version diff visualization.** Version history exists but no side-by-side diff viewer in V1 (roadmap candidate).
4. **Real-time collaboration.** No multi-user editing or shared libraries. Each install is independent.
5. **Prompt marketplace.** No in-app store, rating system, or user profiles. .plp packs are the distribution mechanism.
6. **Mobile version.** Windows desktop only (v1). Mobile/web are future roads.

---

## User Personas

### 1. **The Prompt Engineer**
- Age 25-35, technical background (dev, marketer, analyst).
- Uses Claude/GPT daily across multiple projects.
- **Pain:** Has dozens of good prompts scattered across Notion, email, GitHub gists. Wants a single source of truth.
- **Goal:** Build a reusable prompt library that scales as their AI practice grows.
- **Motivation:** Efficiency, consistency, competitive edge.

### 2. **The Solo Knowledge Worker**
- Age 30-50, non-technical (consultant, founder, writer).
- Uses AI for copywriting, ideation, research, summaries.
- **Pain:** Doesn't have time to learn complex tools. Prompts buried in Note or Word docs.
- **Goal:** Simple, fast way to store and reuse the prompts that work.
- **Motivation:** Time saved, fewer mistakes, better outputs.

### 3. **The Team Leader**
- Age 35-55, manages a team that uses AI.
- Needs to standardize tone, brand voice, and output quality across the team.
- **Pain:** Team members use AI inconsistently. Outputs lack coherence. Can't scale quality.
- **Goal:** Create a shared prompt library (via .plp packs) that team members can import and use.
- **Motivation:** Consistency, brand integrity, quality control.

---

## Core Features

### 1. **Prompt Library (Core)**
Store, organize, and manage individual prompts.

**Features:**
- **Create/Edit/Delete prompts** with title, description, content, categories, tags, color label, rating, notes.
- **Variable detection** — auto-detect {{var}}, [[var]], ((var)) patterns in content.
- **Folder organization** — create folders to group prompts by domain, project, or use case.
- **Search & filter** by title, content, description, tags, categories, color, or rating.
- **Favorite prompts** — star icon to mark frequently-used prompts.
- **Rating system** (1-5 stars) — subjective quality metric + optional note.
- **Color labels** — visual taxonomy (e.g., red=urgent, blue=testing, green=production).
- **Usage tracking** — see use_count, last_used timestamp, daily usage graph (Pro feature).
- **List + Grid views** — dense scannable list (default) or card grid.
- **Sort options** — by updated date, creation date, usage count, rating, alphabetical, favorited.
- **View modes:**
  - **Library** — all prompts, searchable.
  - **Favorites** — starred prompts only.
  - **By folder** — see only prompts in a selected folder.
  - **Group by folder** — list view organized into folder sections with sticky headers.

**Premium features:**
- **Version history** — track and restore past versions of any prompt (keep last 20 per prompt).
- **Analytics** — top 5 most-used, never-used, 30-day usage chart, rating distribution.

---

### 2. **Roles (System Prompt Manager)**
Define reusable AI personas and attach them to prompts.

**What's a Role?**
A Role is a system prompt that defines an AI's persona, tone, expertise, and constraints. Attach a Role to a prompt at copy time, and the Role's full system instruction prepends to the prompt before use.

**Role fields:**
- **Name** — e.g., "CEO Advisor", "Academic Researcher", "Empathetic Coach"
- **Icon** — emoji or character (default 🎯)
- **Color** — hex or preset (default indigo)
- **Persona** — the core character/voice definition
- **Tone** — how the AI should communicate (e.g., "professional, concise, data-driven")
- **Expertise** — domain(s) the role specializes in
- **Example phrases** — 2-3 sample outputs so users know the voice
- **Audience** — who is the target reader/listener
- **Output format** — expected structure (JSON, markdown, bullet points, prose, etc.)
- **Constraints** — hard rules (e.g., "max 100 words", "no jargon")
- **Domain** — primary knowledge area
- **Tasks** — what this role is best at
- **Response style** — formal/casual/creative/analytical
- **Knowledge base** (Pro) — attach snippets of custom knowledge (e.g., brand guidelines, company policies) to include in the system prompt
- **Skills** (Pro) — define reusable skills the role can apply

**Features:**
- **CRUD roles** — create, edit, delete, duplicate.
- **Favorite roles** — star frequently-used personas.
- **Role preview** — see a generated example prompt using the role.
- **Attach to prompts** — dropdown in prompt editor to select a role (prepends on copy/use).
- **Role chip display** — optional always-visible chip showing attached role on prompt cards.
- **Prompt count per role** — see how many prompts use a given role.

**UI:** Standalone "Roles" workspace with cards showing icon, name, tone, and usage count.

---

### 3. **Chain Prompting (Multi-Step Workflows)**
Build workflows where output of one prompt feeds into the next.

**What's a Chain?**
A sequence of connected prompt nodes where:
- Node 0 (input) captures user input or starts with a base prompt.
- Nodes 1..N refine, analyze, or transform the output.
- Final node is the deliverable.

**Features:**
- **Visual node editor** — drag-and-drop canvas to add/remove/connect nodes.
- **Node types:**
  - Input node — text area for user input or starting seed.
  - Prompt node — select a prompt from library; surfaces variables for inline entry.
  - Output node — final result.
- **Variable pass-through** — outputs can be piped to next node's variables.
- **Save/load chains** — persist chains independently in the DB.
- **Duplicate chains** — copy an existing chain to iterate.
- **Export chain** — "Copy full chain" button assembles all steps into one formatted block for use in ChatGPT/Claude.
- **Favorite chains** — star for quick access.
- **Tags & color labels** — organize chains like prompts.

**Premium feature:**
- **Chain versioning** — track versions of entire chains.

**UI:** Standalone "Chain Prompting" workspace with visual editor canvas + chain list sidebar.

---

### 4. **Meta Blueprints (Prompt Templates)**
Define reusable prompt templates that generate other prompts.

**What's a Meta Blueprint?**
A template that produces a customized prompt based on user inputs. E.g., "Cold Email Template" generates a cold email prompt when given prospect name, company, and value prop.

**Features:**
- **Template syntax** — {{var}} placeholders in the template.
- **Variable definitions** — declare required/optional variables with type (text, number, date, dropdown).
- **System instruction** — optional prepend system prompt for the generation.
- **Output format** — specify expected output structure (text, JSON, markdown).
- **CRUD blueprints** — create, edit, delete, duplicate.
- **Generate from blueprint** — fill variables, click "Generate", see output prompt in preview.
- **Save generated prompt** — directly add the output to library.

**UI:** Standalone "Meta Blueprints" workspace with card list and modal for generation.

**Status:** V1 basic support; full meta prompting (AI-powered generation via API) is Pro roadmap.

---

### 5. **Variables & Variable Templates**
Handle prompt variables and create reusable variable sets.

**Variable detection:**
Auto-detect patterns: `{{variable_name}}`, `[[variable_name]]`, `((variable_name))`

**Variable metadata:**
- **Name** — the variable key.
- **Type** — text, number, date, dropdown, or computed.
- **Required** — whether form shows field as mandatory.
- **Visible** — whether field appears in the variable form (allow hidden defaults).
- **Dropdown options** — if type=dropdown, list of allowed values.

**Variable templates:**
Save common variable sets (e.g., "Cold Email Variables: prospect_name, company_name, industry, value_prop") and reuse across prompts.

**Features:**
- **Inline variable editor** — when editing a prompt, see detected variables; set metadata inline.
- **Variable form generation** — when copying/using a prompt, auto-generate a form to fill variables.
- **Variable templates CRUD** — create, edit, delete templates.
- **Apply template to prompt** — bulk-set variables on a prompt from a saved template.

**UI:** Modal editor in prompt detail panel + "Variable Templates" subsection in Settings.

---

### 6. **Import/Export & .plp Packs**

#### Export options (all users):
1. **JSON** — full prompt data (all fields).
2. **CSV** — flat export (title, content, categories, tags, rating, use_count, timestamps).
3. **Markdown** — human-readable formatted export.
4. **Bulk ZIP** — combine JSON + Markdown in one archive.

#### .plp Packs (proprietary format):
A .plp file is a ZIP archive containing:
- `manifest.json` — metadata (pack name, author, version, description).
- `prompts.json` — array of prompt objects.
- `roles.json` — array of role objects.

**Features:**
- **Create pack** — export selected prompts + roles as .plp.
- **Import pack** — upload .plp, preview conflicts, select what to import.
- **Import from path** — load .plp from disk (used by file association flow).
- **Conflict resolution** — if title/name exists, prompt user to skip or rename.
- **Role attachment preview** — show which roles attach to which prompts during import.

**Use case:** Share your prompt library with a team. Export as .plp, email it, they import it and get your prompts + personas.

---

### 7. **Prompt Playground (Advanced Iteration)**
A scratch-pad workspace for drafting, comparing, and iterating prompts.

**Features:**
- **Sessions** — named containers for experimentation (e.g., "Email template v3 experiments").
- **Panels** — up to 3-6 side-by-side text areas for comparing prompt versions.
- **Panel fields:**
  - Label (e.g., "Approach A", "GPT-4", "v1.2")
  - Content (draft prompt text)
  - Model tag (GPT-4, Claude 3, etc. — for reference only)
  - Output (paste results from running the prompt)
  - Score (1-5 rating for this iteration)
- **Save to library** — copy best panel directly to library as a new prompt.
- **Pin sessions** — star for quick access.
- **Session note** — add context or memo to a session.

**UI:** Standalone "Playground" workspace with session list + editor area.

---

### 8. **Starter Templates**
Pre-loaded library of 10 common prompts to get new users up and running.

**Included:**
1. Cold Email Outreach
2. Summarise an Article
3. Rewrite for Clarity
4. LinkedIn Post
5. Meeting Agenda
6. Explain Like I'm 10
7. Weekly Reflection
8. Product Description
9. Bug Report
10. Cover Letter

**Behavior:** Load once on first run if library is empty. User can delete or ignore.

---

### 9. **Workspaces (Navigation)**
The UI is organized into discrete workspaces accessible via left sidebar nav:

1. **Library** — main prompt browsing + editing workspace.
2. **Favorites** — all starred prompts.
3. **Folders** — tree view of custom folders.
4. **Roles** — personas manager.
5. **Chain Prompting** — multi-step workflow builder.
6. **Meta Blueprints** — prompt templates.
7. **Playground** — iteration sandbox.
8. **Analytics** (Pro) — usage metrics, distribution graphs.
9. **Settings** — app config (author name, license, theme, etc.).

Each workspace is independent. Clicking a nav item swaps the main panel.

---

### 10. **Settings**
Application configuration and license management.

**User settings:**
- **Author name** — auto-populated from OS login; used for attribution in exports.
- **Role chips display** — toggle to always show role attachment on prompt cards.

**License settings (Pro):**
- **Validate license key** — enter SHA-256 key, check validity.
- **License status** — shows if premium is unlocked.

**Appearance (Pro):**
- **Theme toggle** — light/dark mode.
- **Font selection** — Inter (default), DM Sans, JetBrains Mono options.

**AI Configuration (Pro roadmap):**
- **Provider selection** — OpenAI or Claude.
- **API key storage** — DPAPI-encrypted local storage (not implemented in V1).

---

## Technical Architecture

### Stack
- **Backend:** Python 3.9+, Flask, SQLite3
- **Frontend:** Vanilla JavaScript (no frameworks), HTML5, Tailwind CSS (CDN)
- **Desktop shell:** PyWebView (embedded Chromium)
- **Build/Packaging:** PyInstaller (frozen bundle), Inno Setup (Windows installer)
- **Distribution:** Direct download (.exe) via website/Gumroad

### Database Schema

**Core tables:**
- `prompts` — individual prompts (id, title, description, content, categories, tags, folder_id, color_label, rating, notes, chain_ids, variable_meta, chat_turns, role_id, status, parent_id, domain, use_case, tone, output_format, created_at, updated_at, last_used, use_count, is_favorite)
- `folders` — prompt grouping (id, name, created_at)
- `roles` — personas (id, name, icon, color, persona, tone, expertise, example_phrase, example_phrases, knowledge_base, skills, is_favorite, created_at, updated_at)
- `chains` — multi-step workflows (id, name, description, nodes, layout, tags, color_label, is_favorite, created_at, updated_at)
- `meta_blueprints` — prompt templates (id, name, description, template, system, variables, output_format, tags, is_favorite, created_at, updated_at)
- `variable_templates` — saved variable sets (id, name, description, variables, created_at)
- `prompt_versions` — version history (id, prompt_id, title, content, description, saved_at, version_label, version_notes, is_baseline)
- `usage_log` — usage tracking for analytics (id, prompt_id, used_at)
- `playground_sessions` — scratch sessions (id, title, created_at, updated_at, is_pinned, note)
- `playground_panels` — session panels (id, session_id, slot, label, content, model_tag, output, score, updated_at)
- `taxonomy_domains` — predefined domains (id, name)
- `taxonomy_use_cases` — predefined use cases (id, domain_id, name)
- `prompt_relationships` — prompt linking (prompt_a, prompt_b, rel_type)
- `settings` — key-value config (key, value)

**Key design decisions:**
- JSON columns for complex structures (nodes, layout, variable_meta, chat_turns, example_phrases, knowledge_base, skills).
- Soft deletes via `status` field (draft, active, deprecated).
- Parent-child relationships via `parent_id` (for forking/versioning).
- No foreign key constraints on roles (allow role deletion even if prompts reference it).
- Denormalized use tracking (use_count + last_used on prompt + separate usage_log for analytics).

### API Endpoints

**Prompts:**
- `GET /api/prompts` — list all (with search, filter, sort)
- `POST /api/prompts` — create
- `GET /api/prompts/<id>` — get one
- `PUT /api/prompts/<id>` — update
- `DELETE /api/prompts/<id>` — delete
- `POST /api/prompts/<id>/use` — increment use_count
- `POST /api/prompts/<id>/favorite` — toggle is_favorite
- `POST /api/prompts/<id>/duplicate` — copy with "(Copy)" suffix
- `POST /api/prompts/<id>/fork` — copy with parent_id set
- `PATCH /api/prompts/<id>/status` — change status
- `POST /api/prompts/<id>/rating` — set rating + notes
- `POST /api/prompts/<id>/colour` — set color_label
- `POST /api/prompts/<id>/role` — attach/detach role
- `GET /api/prompts/<id>/relationships` — get related prompts
- `POST /api/prompts/<id>/relationships` — link two prompts
- `GET /api/prompts/<id>/versions` — list versions
- `POST /api/prompts/<id>/versions/<vid>/restore` — restore version

**Roles:**
- `GET /api/roles` — list all
- `POST /api/roles` — create
- `GET /api/roles/<id>` — get one
- `PUT /api/roles/<id>` — update
- `DELETE /api/roles/<id>` — delete
- `POST /api/roles/<id>/duplicate` — copy
- `POST /api/roles/<id>/favorite` — toggle favorite
- `GET /api/roles/<id>/prompt-count` — count prompts using this role

**Chains:**
- `GET /api/chains` — list
- `POST /api/chains` — create
- `GET /api/chains/<id>` — get one
- `PUT /api/chains/<id>` — update
- `DELETE /api/chains/<id>` — delete
- `POST /api/chains/<id>/duplicate` — copy
- `POST /api/chains/<id>/favorite` — toggle favorite

**Meta Blueprints:**
- `GET /api/meta` — list
- `POST /api/meta` — create
- `GET /api/meta/<id>` — get one
- `PUT /api/meta/<id>` — update
- `DELETE /api/meta/<id>` — delete
- `POST /api/meta/<id>/duplicate` — copy
- `POST /api/meta/<id>/favorite` — toggle favorite

**Variable Templates:**
- `GET /api/variable-templates` — list
- `POST /api/variable-templates` — create
- `DELETE /api/variable-templates/<id>` — delete

**Playground:**
- `GET /api/playground/sessions` — list sessions
- `POST /api/playground/sessions` — create session
- `GET /api/playground/sessions/<sid>` — get session + panels
- `PUT /api/playground/sessions/<sid>` — update title/note/pinned
- `DELETE /api/playground/sessions/<sid>` — delete session
- `PUT /api/playground/sessions/<sid>/panels` — save all panels atomically
- `POST /api/playground/sessions/<sid>/from-prompt/<pid>` — seed panel 0 from a prompt

**Export/Import:**
- `GET /api/export` — JSON export
- `GET /api/export/markdown` — Markdown export
- `GET /api/export/csv` — CSV export
- `GET /api/export/bulk` — ZIP (JSON + Markdown)
- `POST /api/import` — import JSON
- `POST /api/packs/import` — upload .plp for preview
- `POST /api/packs/commit` — commit selected items from preview
- `POST /api/packs/import-from-path` — load .plp from disk (file association)
- `GET/POST /api/pending-import` — temp flag file for single-instance launches

**Settings/License:**
- `GET /api/settings` — all settings
- `POST /api/licence/validate` — verify license key
- `POST /api/licence/check` — re-verify stored key
- `POST /api/settings/licence` — persist license
- `GET /api/settings/author` — get author name
- `POST /api/settings/author` — set author name
- `GET /api/settings/role-chips-always` — get role chip visibility
- `POST /api/settings/role-chips-always` — set role chip visibility
- `GET /api/settings/ai-config` — get provider (no key returned)
- `POST /api/settings/ai-config` — save provider selection

**Analytics:**
- `GET /api/analytics` — summary (total, favorites, top 5, never used, recent 10, 30-day usage, ratings distribution)

**Taxonomy/Misc:**
- `GET /api/taxonomy` — domains + use cases
- `GET /api/folders` — list folders
- `POST /api/folders` — create folder
- `PUT /api/folders/<id>` — rename
- `DELETE /api/folders/<id>` — delete (orphans prompts)
- `POST /api/starter-templates` — seed library on first run
- `POST /api/save-file` — opens native Save As dialog (tkinter)
- `GET /api/prompts/filters` — sidebar filter options (categories, tags with counts)

### Frontend Architecture

**Organization:**
One large `app.js` file (~2000+ lines) organized into sections:
1. **STATE** — global `state` object holding UI and data state.
2. **DOM HELPERS** — `$`, `$$`, `html`, escapeHtml.
3. **API CLIENT** — fetch wrapper.
4. **RENDER FUNCTIONS** — render library, detail panel, forms, etc.
5. **CONTROL FUNCTIONS** — event handlers, UI logic.
6. **INIT FUNCTIONS** — workspace initialization (called from BOOTSTRAP).
7. **BOOTSTRAP** — startup sequence, event wiring, DOMContentLoaded.

**Modular design (V2 principle):**
- Keep each workspace initialization in a separate function (`initLibraryWorkspace()`, `initRolesWorkspace()`, etc.).
- File size limits: app.js <2500 lines, index.html <500 lines.
- Large edits use Python content.replace() via bash to avoid truncation.

**State management:**
- Central `state` object mutated directly (no Redux/Vuex).
- `render()` function (or workspace-specific render) called after state mutation.
- No persistent state in UI (all state lives in DB; localStorage holds only theme + licenseKey).

**Key UI patterns:**
- **List + detail split panel** — left sidebar shows prompts/roles/etc., right panel shows selected item editor.
- **Inline forms** — edit directly in the detail panel; Save/Cancel buttons.
- **Modal dialogs** — used for large operations (import preview, license entry).
- **Toast notifications** — quick feedback for actions.
- **Search + filter combo** — text search + sidebar filter pills.
- **Keyboard shortcuts** — Ctrl+N (new prompt), Ctrl+F (search), Ctrl+S (save), Escape (close detail).

### License Model

**Validation:**
- License keys are SHA-256 hashes stored in `_SALES_KEY_HASHES` (plaintext never shipped).
- User enters plaintext key; app hashes it and checks against the set.
- Valid keys unlock `isPremium` flag in state.
- Key persisted to settings table so it survives restarts.

**Key tiers:**
- **Test/dev keys** — hardcoded in app.py (Eugene, etc.) for testing.
- **Sales keys** — generated batch of 50+ keys on-demand, uploaded to Payhip.
- **Reward keys** — special keys for community/competition giveaways.

**Premium features gated:**
- Version history UI hidden unless `state.isPremium === true`.
- Analytics workspace hidden unless premium.
- Theme toggle hidden unless premium.
- Variable advanced management (form builder) hidden unless premium.
- Multiple export formats hidden unless premium.
- API key storage hidden unless premium.

---

## Free Tier Limits

Users without a valid license hit these caps:

| Feature | Free | Pro |
|---------|------|-----|
| Prompts | 25 | Unlimited |
| Folders | 3 | Unlimited |
| Categories | 3 | Unlimited |
| Roles | 5 | Unlimited |
| Chains | 3 | Unlimited |
| Version history per prompt | 1 (current only) | 20 |
| Analytics | None | Full |
| Theme toggle | Light only | Light + Dark |
| Export formats | JSON only | JSON, CSV, MD, ZIP |

**Enforcement:** Client-side checks before CRUD operations. If limit reached, show upsell modal.

---

## Ship-Ready State (V1 Release)

### Completed Features
✅ Prompt CRUD with full metadata (title, description, categories, tags, color, rating, notes)  
✅ Folder organization  
✅ Search + filter (text, category, tag, color, rating, folder)  
✅ Favorite/star system  
✅ Variable detection ([[var]], {{var}}, ((var)))  
✅ Variable forms auto-generated on copy  
✅ Roles workspace (full CRUD, icon, color, persona, tone, expertise, knowledge base, skills)  
✅ Attach/detach roles to prompts  
✅ Chain Prompting workspace (visual editor, node CRUD, chain save/load)  
✅ Meta Blueprints (template variables, generation)  
✅ Playground (sessions, multi-panel comparison, score)  
✅ Export (JSON, CSV, Markdown, ZIP)  
✅ Import JSON + .plp packs with conflict preview  
✅ Version history (save, list, restore) with keep-last-20 logic  
✅ Usage tracking (use_count, last_used, usage_log)  
✅ License validation (SHA-256 hash check)  
✅ Premium features gated (version history, analytics, export formats)  
✅ Starter templates (10 prompts on first run)  
✅ Analytics (summary, top 5, never used, recent 10, daily usage, ratings)  
✅ Taxonomy (predefined domains + use cases)  
✅ Prompt relationships (link prompts as related)  
✅ Settings (author name, role chip visibility)  
✅ Windows installer (.exe via Inno Setup)  
✅ Proper Windows file association (.plp files open in app)  
✅ Cache-busting (MD5 hash injection for app.js)  
✅ PyWebView + Flask architecture  

### Known Blockers / Missing for Ship
1. **Variable form UI** — auto-generate form from variable_meta; currently variables are detected but form input is manual.
2. **Copy to clipboard with role prepend** — when copying a prompt with attached role, the role system instruction should prepend. Current code structure supports it but UI flow incomplete.
3. **Drag-and-drop folder assignment** — drag a prompt onto a folder to reassign. Marked as future but not V1.
4. **Bulk operations** — select multiple prompts via checkbox and bulk-tag, bulk-rate, bulk-delete. Marked as future.
5. **Theme toggle (Pro)** — dark mode UI not yet designed/built.
6. **API key encryption** — DPAPI wrapper for secure API key storage (Pro roadmap, not V1).
7. **Chain node execution tracking** — chains save but no "run chain" button with output capture (marked as future).
8. **In-app AI executor** — Claude or GPT integration (Pro roadmap, not V1).

### What's Shippable Now
The app is **feature-complete for V1** with caveat: variable form generation and chain execution are roadmap features. Core loops work:
- Create prompt ✓
- Organize via folders/tags ✓
- Search/find prompts ✓
- Attach roles ✓
- Export/import ✓
- Version track ✓
- Build chains (save/load, not execute) ✓
- License validation ✓

**Minimum viable for launch:**
1. ✓ Library workspace (prompts CRUD, search, filter, organization)
2. ✓ Roles workspace (manage personas, attach to prompts)
3. ✓ Starter templates (first-run seeding)
4. ✓ Export/import (.plp packs + multiple formats)
5. ✓ Settings + License validation
6. ✓ Windows installer

**Could defer to V1.1:**
- Chain editor visual polish (works, but UI is functional not beautiful)
- Playground (nice-to-have iteration tool, not core)
- Taxonomy/domains UI (works but underdeveloped)
- Prompt relationships (works but underdeveloped)

---

## Roadmap

### V1.1 (4 weeks post-launch)
- [ ] Variable form auto-generation (form builder UI)
- [ ] "Copy with role prepended" — workflow from prompt → copy button → include role system instruction
- [ ] Chain execution simulator — test a chain end-to-end
- [ ] Drag-and-drop folder assignment
- [ ] Dark theme UI (Pro feature)

### V1.2 (8 weeks post-launch)
- [ ] Bulk operations (multi-select, bulk tag, bulk rate, bulk delete)
- [ ] Prompt version diff viewer (side-by-side comparison)
- [ ] Advanced analytics (trending prompts, category heatmap, domain distribution)
- [ ] Keyboard shortcuts expanded (Ctrl+K for command palette)
- [ ] Onboarding flow (guided intro for new users)

### V2.0 (Q3 2026)
- [ ] In-app AI executor (Claude/GPT integration with DPAPI key storage)
- [ ] Live variable filling (paste content, fill variables inline, send to Claude in one action)
- [ ] .plp marketplace (community packs, ratings, search)
- [ ] Prompt templates with AI-powered generation (meta blueprints on steroids)
- [ ] Team sharing (simple export-based collab, not real-time sync)
- [ ] Mobile web view (read-only access to library on phone)

### V3.0 (2027+)
- [ ] Cloud sync (opt-in; preserve local-first option)
- [ ] Multi-device (Windows + Mac + Linux)
- [ ] Real-time collab (shared workspaces)
- [ ] Plugin marketplace (community-built integrations)

---

## Success Metrics (What Success Looks Like)

### User Acquisition
- **DAU goal:** 500 users within 6 months of launch.
- **CAC:** Target <$5 via word-of-mouth, Product Hunt, Twitter/X.
- **Viral coefficient:** Estimate 10% of users share a .plp pack per month.

### Engagement
- **Retention:** 30-day retention >40% (free) | >70% (premium).
- **Feature adoption:** 50% of users create at least one Role | 30% use Playground.
- **Content generation:** Average user creates 15+ prompts in first month.

### Monetization
- **Conversion rate:** 5-10% of free users convert to Pro within 90 days.
- **MRR target:** $5,000/month at 6-month mark (500 free users × 10% conversion × $10/month).
- **Churn:** <5% monthly churn on Pro tier.

### Product Quality
- **Crash rate:** <0.1% sessions crash.
- **Load time:** Main view renders in <500ms.
- **Installer size:** Keep .exe under 80MB.
- **NPS:** Target 50+ (happy users).

---

## Open Questions (Must Resolve Before/During V1)

### Product
1. **Q: Should free users see all Pro features (grayed out) or only free features?**  
   A: Show all features; Pro features grayed with upsell tooltip. Transparency > artificial limitation.

2. **Q: How to handle role knowledge base at scale?**  
   A: V1: Allow paste/upload of text snippets. V2: Auto-ingest from web URLs or PDFs.

3. **Q: Should chains execute in-app or stay as templates?**  
   A: V1: Templates only (copy to ChatGPT). V1.1: Executor mockup (no API). V2: Live API executor.

### Technical
4. **Q: Database migration strategy for existing users?**  
   A: All schema changes in `init_db()` use ALTER TABLE IF NOT EXISTS. No breaking migrations.

5. **Q: How to handle license key revocation (refund)?**  
   A: Remove hash from `_SALES_KEY_HASHES`, rebuild .exe. Manual process for now; consider backend licensing in V2.

### Business
6. **Q: Pricing tier structure?**  
   A: **Free:** $0 (25 prompts, 3 folders). **Pro:** $9/mo or $79/year or $129 lifetime.

7. **Q: Single-instance vs. multi-launch?**  
   A: Single-instance (one window). File associations handled via pending-import flow (write flag file, app checks on startup).

8. **Q: Windows only or also Mac/Linux?**  
   A: V1: Windows only (.exe via Inno Setup). V2: Consider Mac/Linux if demand exists.

---

## Summary for Development

### For Ship Readiness
- Core library + organization works ✓
- Roles system works ✓
- Export/import infrastructure works ✓
- License validation works ✓
- Windows installer works ✓
- All major CRUD endpoints implemented ✓

### Before Launch
1. [ ] Full QA pass (all workspaces, edge cases, empty states).
2. [ ] UI polish (responsive, dark mode optional, accessibility review).
3. [ ] Docs/help (in-app tooltips + user guide PDF).
4. [ ] Starter templates tuned (10 prompts, all useful).
5. [ ] Marketing assets (landing page, demo video).
6. [ ] Support channel (email or Discord community).

### Known Debt to Track
- **Variable form builder** — detected but manual input for now. Easy to add post-launch.
- **Chain execution** — save/load works, execution is roadmap.
- **Playground UI** — functional but spartan. Redesign opportunity.
- **Analytics** — data collection works, UI is basic. Improve post-launch.
- **Keyboard shortcuts** — sparse. Expand in V1.1.

---

## Appendix: Frequently Asked Questions

**Q: Why local-first and not cloud?**  
A: Intentional choice. Removes infrastructure cost, privacy concerns, and vendor lock-in. Users own their data. Trade-off: no multi-device sync. We accept that trade for simplicity and trust.

**Q: How do users share libraries?**  
A: Via .plp packs (ZIP archives). Export as .plp, email it, recipient imports. Works offline. No marketplace in V1; community handles sharing.

**Q: What about API integration with Claude/GPT?**  
A: V1: Users copy/paste prompts to ChatGPT or Claude web UI. V2: In-app executor with DPAPI-encrypted key storage.

**Q: Can roles be shared/imported?**  
A: Yes, via .plp packs. Roles export/import alongside prompts.

**Q: Is there version sync/conflict resolution?**  
A: No. Each prompt version is independent. No merge logic. Restoration is "current overwrites all; old versions kept for 20 deep."

**Q: How to migrate from other tools (Notion, Obsidian, etc.)?**  
A: Export as JSON from source, transform to match our schema, import via /api/import. Manual process. Docs provided post-launch.

**Q: Free tier limits — are they enforced strictly?**  
A: Yes. Client-side checks before CRUD. If free user hits 25 prompts, Create button shows upsell modal.

---

**End of Specification**

*Last updated: 2026-06-04*  
*Status: Ready for development / QA approval*
