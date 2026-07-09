# Cross-Workspace Save & Bulk Operations

Date: 2026-07-09

## Context

Prompt Library Pro's Library view holds ~337 prompts, organized by folder/tag/category. Multiple workspaces (Auditor, Generator, Optimizer, X-Ray, Splicer, etc.) produce results — improved prompts, audit findings, generated content — but users must manually copy them back to the Library. At scale, this is friction.

Similarly, bulk operations on Library prompts (tag many, move many to a folder, delete many) require one-by-one clicks, which is tedious.

This spec covers two features:
1. **Cross-Workspace Save:** Let workspaces save results directly to the Library with auto-sourced metadata.
2. **Bulk Operations:** Add checkboxes to Library prompts, enable multi-select, support bulk tag/folder/delete actions.

Both are independent but complement each other (cross-workspace save creates Library content that bulk ops then organize).

## Feature 1: Cross-Workspace Save

### Purpose
Reduce friction when a workspace produces a result: let users save it to the Library immediately without copying text or switching views.

### Scope
- Applies to: Auditor, Generator, Optimizer, X-Ray, Splicer (any workspace with a result to save).
- Does not apply: Quick Fill, Diff Lens, Cost Lens, Pulse (these are read-only analysis or have no "final result" concept).

### Design

#### User Flow
1. User opens a workspace (e.g., Optimizer), runs a task, gets a result.
2. A "Save to Library" button appears in the result panel (or action bar).
3. Click → modal dialog shows two options:
   - **"Save as New Prompt"** (always available)
   - **"Replace [Original Prompt Name]"** (only if the result came from editing an existing Library prompt; grayed out otherwise)
4. User selects one, clicks "Save".
5. Backend creates a new prompt or updates the existing one with:
   - Result text (from the workspace)
   - Auto-injected metadata:
     - **Source tag:** workspace-specific tag (e.g., `#optimized`, `#audited`, `#generated`)
     - **Source note:** "Generated via Optimizer on Jul 9, 2026 at 3:45 PM" (or similar timestamp)
     - **Folder/tags (on new):** left blank (user fills later)
     - **Folder/tags (on edit):** preserved from original
6. Toast confirms: "Saved to Library as '[Prompt Title]'".
7. Optional: workspace closes or user stays (workspace decides).

#### Source Tags Per Workspace
| Workspace | Tag |
|-----------|-----|
| Auditor | `#audited` |
| Generator | `#generated` |
| Optimizer | `#optimized` |
| X-Ray | `#xrayed` |
| Splicer | `#spliced` |

#### Implementation Details
- **Result text source:** comes from each workspace's result container (e.g., Optimizer's `#optResult` text, Auditor's findings export, etc.). Each workspace defines where the "saveable result" is.
- **Original prompt detection:** if user opened a prompt via `_wsFillPromptPicker`, store the prompt ID in the workspace's state; on Save, pass it to the modal so it can offer "Replace" option.
- **API:** `POST /prompts` (new) or `PATCH /prompts/{id}` (edit). Include `source_workspace` and `source_timestamp` in the request body so the backend can auto-inject the tag and note.
- **No schema change:** source metadata goes into the prompt's `notes` field (formatted as "Generated via X on Y") and a new `source_workspace` tag. Both are optional, both optional on read, no migration needed.
- **Error handling:** if save fails (network, validation), show toast with reason and offer Retry. User can stay in workspace or close.

#### Architecture
New helper in `app.js`:

```javascript
async function saveResultToLibrary(resultText, originalPromptId, sourceWorkspace) {
  const method = originalPromptId ? 'PATCH' : 'POST';
  const endpoint = originalPromptId ? `/prompts/${originalPromptId}` : '/prompts';
  
  const sourceTag = WORKSPACE_SOURCE_TAGS[sourceWorkspace]; // e.g., 'optimized'
  const sourceNote = `Generated via ${sourceWorkspace} on ${new Date().toLocaleString()}`;
  
  const body = {
    content: resultText,
    source_workspace: sourceWorkspace,
    source_timestamp: new Date().toISOString(),
    notes: (originalPromptId && existing.notes) ? existing.notes + '\n' + sourceNote : sourceNote,
    tags: (originalPromptId && existing.tags) ? existing.tags + ',' + sourceTag : sourceTag,
  };
  
  if (!originalPromptId) {
    body.title = resultText.split('\n')[0].slice(0, 80); // auto-title from first line
  }
  
  const result = await api(endpoint, { method, body });
  return result;
}
```

Each workspace calls this with its result text and workspace name.

---

## Feature 2: Bulk Operations

### Purpose
Enable users to manage many prompts at once (tag, move folder, delete) without clicking each prompt individually.

### Scope
- Library view only (card grid or list view, both support).
- Dashboard, Folders view, Favourites do not get bulk ops (low frequency, lower value).
- Applies to: Free and Pro (no premium gate).

### Design

#### User Flow
1. In Library, a checkbox appears in the header row (before the sort/view controls).
2. Each prompt card/row also gets a checkbox (left side, or leading column).
3. User clicks checkboxes to select prompts (single click to toggle). Shift+click for range select (optional MVP; checkbox alone is sufficient).
4. Header checkbox toggles "all visible" (respects current sort/filter).
5. When ≥1 prompt selected:
   - Selection count badge appears: "12 selected"
   - A toolbar appears above the list with three buttons: `Tag`, `Move`, `Delete`
6. Click a button → action-specific dialog:
   - **Tag:** dropdown/combobox of all tags, user picks one or types to add new, confirms.
   - **Move:** dropdown of folders, user picks one, confirms.
   - **Delete:** confirmation modal "Delete 12 prompts? This cannot be undone. ⚠️", user confirms.
7. Action runs (batch API call), list updates, checkboxes clear.

#### Visual Layout
- **Header row:** `[Checkbox (Select All)] [Search] [Sort Dropdown] [View Toggle]`
- **Each prompt row/card:** `[Checkbox] [Prompt Title] [Folder Icon] [Tags] [Date] [Actions]`
- **Bulk toolbar:** appears above the list when selected > 0: `12 selected | [Tag] [Move] [Delete]`

#### Implementation Details

**Selection state (app.js):**
```javascript
let _bulkSelection = new Set(); // set of prompt IDs
```

**Helpers:**
```javascript
function toggleBulkSelect(promptId) {
  if (_bulkSelection.has(promptId)) _bulkSelection.delete(promptId);
  else _bulkSelection.add(promptId);
  renderBulkToolbar();
  renderLibrary(); // re-render to update checkbox state
}

function bulkSelectAll() {
  state.prompts.forEach(p => _bulkSelection.add(p.id));
  renderBulkToolbar();
  renderLibrary();
}

function bulkDeselectAll() {
  _bulkSelection.clear();
  renderBulkToolbar();
  renderLibrary();
}

async function bulkTag(promptIds, tag) {
  // PATCH /prompts/bulk with { ids, action: 'add_tag', tag }
  const result = await api('/prompts/bulk', {
    method: 'PATCH',
    body: { ids: Array.from(promptIds), action: 'add_tag', tag }
  });
  // Result: { success: 12, failed: 0 }
  if (result.failed > 0) toast(`${result.success} tagged, ${result.failed} failed`, 'warning');
  else toast(`${result.success} prompts tagged`, 'success');
  _bulkSelection.clear();
  refreshLibrary();
}

async function bulkMove(promptIds, folderId) {
  const result = await api('/prompts/bulk', {
    method: 'PATCH',
    body: { ids: Array.from(promptIds), action: 'move_folder', folder_id: folderId }
  });
  if (result.failed > 0) toast(`${result.success} moved, ${result.failed} failed`, 'warning');
  else toast(`${result.success} prompts moved`, 'success');
  _bulkSelection.clear();
  refreshLibrary();
}

async function bulkDelete(promptIds) {
  // Show confirmation: "Delete N prompts? This cannot be undone."
  const confirmed = await showConfirmDialog(`Delete ${promptIds.size} prompts?`, 'Delete', 'Cancel');
  if (!confirmed) return;
  
  const result = await api('/prompts/bulk', {
    method: 'DELETE',
    body: { ids: Array.from(promptIds) }
  });
  if (result.failed > 0) toast(`${result.success} deleted, ${result.failed} failed`, 'warning');
  else toast(`${result.success} prompts deleted`, 'success');
  _bulkSelection.clear();
  refreshLibrary();
}
```

**Backend API (new endpoint `/prompts/bulk`):**
```
PATCH /prompts/bulk
{
  ids: [1, 2, 3, ...],
  action: 'add_tag' | 'move_folder' | 'delete',
  tag: 'optional-tag-name' (for add_tag only),
  folder_id: 123 (for move_folder only)
}

Returns:
{
  success: 10,
  failed: 2,
  errors: [{ id: 2, reason: 'permission denied' }] (optional)
}
```

**Error handling:**
- Partial failures are OK (some prompts succeed, some fail). Show "X succeeded, Y failed" toast.
- If all fail, show error toast with reason if possible.
- No rollback on partial success (idempotent operations, safe to retry).

**Scope boundaries:**
- Search/filter don't affect selection (checkboxes stay checked across filters).
- "Select all" respects the current filter (e.g., if searching "GPT-4", select all finds only GPT-4 prompts).
- Pagination: if Library uses pagination, each page has independent selection. No "select all across all pages" (avoids confusion).

#### HTML/CSS Notes
- Checkboxes: standard `<input type="checkbox">`, styled to match Library card aesthetic.
- Bulk toolbar: fixed or sticky, appears above the prompt list, disappears when selection clears.
- No major layout changes (checkboxes are small, existing column order preserved).

---

## Files Affected

### `static/app.js`
- New helpers: `toggleBulkSelect`, `bulkSelectAll`, `bulkDeselectAll`, `bulkTag`, `bulkMove`, `bulkDelete`, `saveResultToLibrary`, `renderBulkToolbar`.
- Modified: each workspace (Auditor, Generator, Optimizer, X-Ray, Splicer) gets a "Save to Library" button and modal.
- Modified: Library render function adds checkboxes to each prompt.
- New state: `_bulkSelection` (Set of prompt IDs).

### `static/index.html`
- New: bulk toolbar HTML (hidden by default, shown when selection > 0).
- Modified: each prompt card/row template adds a checkbox column.

### `static/app.css`
- New: styles for checkboxes, bulk toolbar, selection state (hover, checked).
- New: styles for "Select All" header checkbox.

### `app.py` (Flask backend)
- New endpoint: `PATCH /prompts/bulk`, `DELETE /prompts/bulk` (batch operations).
- Modified: `/prompts` POST/PATCH to handle `source_workspace`, `source_timestamp` fields (optional, ignored if not provided).

### No schema migration
- Prompt table unchanged (source metadata goes into existing `notes` and `tags` fields).
- No new tables.

---

## Testing

### Cross-Workspace Save
- Manual: open Optimizer, run a task, click "Save to Library", verify new prompt created with source tag + note.
- Manual: open Optimizer with an existing prompt, run task, click "Replace", verify original prompt updated and note appended.
- Manual: save fails (network down), verify error toast and retry option.

### Bulk Operations
- Manual: select 5 prompts, click Tag, verify all tagged.
- Manual: select 3 prompts, click Move, verify all moved to new folder.
- Manual: select 2 prompts, click Delete, verify confirmation appears and prompts deleted.
- Manual: select all via header checkbox, verify all visible prompts selected.
- Manual: bulk delete with 1 success + 1 failure, verify "1 deleted, 1 failed" toast.

---

## Constraints

- No new dependencies.
- No schema migrations.
- Backward compatible (source metadata optional, ignored on old prompts).
- No breaking changes to existing workspaces or Library views.
- Bulk ops available to Free tier (no premium gate).
