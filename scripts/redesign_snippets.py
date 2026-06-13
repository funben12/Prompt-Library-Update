import os
os.chdir(r'C:\Users\Eugene Phillips\Desktop\Prompt Library Update')

# ─── index.html: replace snippets workspace HTML ──────────────────────────

html = open('static/index.html', 'r', encoding='utf-8').read()

OLD_SNIP_HTML = """<div id="snippetsWorkspace" role="dialog" aria-modal="true" aria-label="Snippets">
  <div class="ws-header">
    <div class="ws-header-left">
      <span class="material-symbols-outlined ws-header-icon">bolt</span>
      <div>
        <h2 class="ws-title">Snippets</h2>
        <p class="ws-subtitle">Reusable text fragments &mdash; copy into any prompt.</p>
      </div>
    </div>
    <div class="ws-header-actions">
      <button class="btn btn-accent" id="snipNewBtn"><span class="material-symbols-outlined">add</span> New snippet</button>
      <button class="icon-btn" id="closeSnippetsBtn" aria-label="Close Snippets"><span class="material-symbols-outlined">close</span></button>
    </div>
  </div>
  <div class="ws-body ctx-body">
    <div class="ctx-list-panel">
      <div class="ctx-search-row">
        <span class="material-symbols-outlined ctx-search-icon">search</span>
        <input type="search" id="snipSearch" class="ctx-search-input" placeholder="Search snippets…" autocomplete="off" />
      </div>
      <div class="ctx-list snip-list" id="snipList"></div>
    </div>
    <div class="ctx-editor-panel">
      <div class="ctx-editor-empty" id="snipEditorEmpty">
        <span class="material-symbols-outlined">touch_app</span>
        <p>Select a snippet<br>or click <strong>New snippet</strong></p>
      </div>
      <div class="ctx-editor-form" id="snipEditorForm" hidden>
        <div class="ctx-editor-top">
          <span class="ctx-editor-eyebrow">Snippet</span>
        </div>
        <div class="ctx-editor-scroll">
          <div class="ctx-field">
            <label class="ctx-label">Label</label>
            <input type="text" id="snipLabelInput" class="ctx-input" placeholder="e.g. Brand voice intro" autocomplete="off" />
          </div>
          <div class="ctx-field ctx-field-grow">
            <label class="ctx-label">Content
              <span class="ctx-label-hint">This text gets copied into your prompt</span>
            </label>
            <textarea id="snipContentInput" class="ctx-textarea" rows="14" placeholder="The reusable text…"></textarea>
          </div>
        </div>
        <div class="ctx-editor-footer">
          <button class="btn btn-accent" id="snipSaveBtn"><span class="material-symbols-outlined">save</span> Save</button>
          <button class="btn btn-ghost" id="snipCopyBtn"><span class="material-symbols-outlined">content_copy</span> Copy</button>
          <button class="btn btn-ghost ctx-delete-btn" id="snipDeleteBtn" style="margin-left:auto"><span class="material-symbols-outlined">delete</span></button>
        </div>
      </div>
    </div>
  </div>
</div>"""

NEW_SNIP_HTML = """<div id="snippetsWorkspace" role="dialog" aria-modal="true" aria-label="Snippets">
  <div class="ws-header">
    <div class="ws-header-left">
      <span class="material-symbols-outlined ws-header-icon">bolt</span>
      <div>
        <h2 class="ws-title">Snippets</h2>
        <p class="ws-subtitle">Reusable text fragments &mdash; tag, colour, pin, and copy into any prompt.</p>
      </div>
    </div>
    <div class="ws-header-actions">
      <button class="btn btn-accent" id="snipNewBtn"><span class="material-symbols-outlined">add</span> New</button>
      <button class="icon-btn" id="closeSnippetsBtn" aria-label="Close Snippets"><span class="material-symbols-outlined">close</span></button>
    </div>
  </div>
  <!-- Stats strip -->
  <div class="snip-stats-bar" id="snipStatsBar">
    <span class="snip-stat"><span class="material-symbols-outlined">bolt</span><strong id="snipStatCount">0</strong> snippets</span>
    <span class="snip-stat"><span class="material-symbols-outlined">push_pin</span><strong id="snipStatPinned">0</strong> pinned</span>
    <span class="snip-stat"><span class="material-symbols-outlined">format_size</span><strong id="snipStatChars">0</strong> total chars</span>
  </div>
  <div class="ws-body snip-body-v2">
    <!-- Left: list panel -->
    <div class="snip-list-panel">
      <div class="snip-toolbar">
        <div class="ctx-search-row">
          <span class="material-symbols-outlined ctx-search-icon">search</span>
          <input type="search" id="snipSearch" class="ctx-search-input" placeholder="Search snippets&hellip;" autocomplete="off" />
        </div>
        <div class="snip-tag-row" id="snipTagRow"></div>
      </div>
      <div class="snip-cards" id="snipCards"></div>
      <div class="ctx-empty snip-empty" id="snipCardsEmpty" style="display:none;">
        <span class="material-symbols-outlined">bolt</span>
        <p>No snippets yet.<br>Click <strong>New</strong> to capture your first fragment.</p>
      </div>
    </div>
    <!-- Right: editor -->
    <div class="snip-editor-v2" id="snipEditorPanel">
      <div class="snip-editor-empty" id="snipEditorEmpty">
        <span class="material-symbols-outlined">touch_app</span>
        <p>Select a snippet to edit<br>or click <strong>New</strong> to create one</p>
      </div>
      <div class="snip-editor-form" id="snipEditorForm" hidden>
        <div class="snip-editor-top">
          <span class="ctx-editor-eyebrow" id="snipFormEyebrow">New snippet</span>
          <div class="snip-colour-strip" id="snipColourStrip">
            <button class="snip-col-btn active" data-col="" title="No colour"></button>
            <button class="snip-col-btn" data-col="red"    title="Red"    style="--col:#ef4444"></button>
            <button class="snip-col-btn" data-col="orange" title="Orange" style="--col:#f97316"></button>
            <button class="snip-col-btn" data-col="yellow" title="Yellow" style="--col:#eab308"></button>
            <button class="snip-col-btn" data-col="green"  title="Green"  style="--col:#22c55e"></button>
            <button class="snip-col-btn" data-col="blue"   title="Blue"   style="--col:#3b82f6"></button>
            <button class="snip-col-btn" data-col="purple" title="Purple" style="--col:#a855f7"></button>
          </div>
        </div>
        <div class="snip-editor-scroll">
          <div class="ctx-field">
            <label class="ctx-label">Label</label>
            <input type="text" id="snipLabelInput" class="ctx-input" placeholder="e.g. Brand voice intro" autocomplete="off" />
          </div>
          <div class="ctx-field">
            <label class="ctx-label">Tag <span class="ctx-label-hint">for grouping &amp; filtering</span></label>
            <input type="text" id="snipTagInput" class="ctx-input" placeholder="e.g. tone, intro, closing" autocomplete="off" />
          </div>
          <div class="ctx-field ctx-field-grow">
            <label class="ctx-label">Content <span class="ctx-label-hint" id="snipCharCount">0 chars</span></label>
            <textarea id="snipContentInput" class="ctx-textarea" rows="11" placeholder="The reusable text fragment&hellip;"></textarea>
          </div>
        </div>
        <div class="ctx-editor-footer">
          <button class="btn btn-accent" id="snipSaveBtn"><span class="material-symbols-outlined">save</span> Save</button>
          <button class="btn btn-ghost" id="snipCopyBtn"><span class="material-symbols-outlined">content_copy</span> Copy</button>
          <button class="btn btn-ghost" id="snipPinBtn" title="Toggle pin"><span class="material-symbols-outlined">push_pin</span></button>
          <button class="btn btn-ghost ctx-delete-btn" id="snipDeleteBtn" style="margin-left:auto" title="Delete snippet"><span class="material-symbols-outlined">delete</span></button>
        </div>
      </div>
    </div>
  </div>
</div>"""

assert OLD_SNIP_HTML in html, "OLD_SNIP_HTML not found"
html = html.replace(OLD_SNIP_HTML, NEW_SNIP_HTML, 1)
open('static/index.html', 'w', encoding='utf-8').write(html)
print("index.html snippets HTML replaced.")

# ─── app.js: replace all _snip* functions + initSnippetsWorkspace ─────────

code = open('static/app.js', 'r', encoding='utf-8').read()

OLD_SNIP_JS_START = "/* ---- Snippets / Quick Capture (pro) ------------------------------------ */"
OLD_SNIP_JS_END   = "\n\n/* ---- Template Gallery (pro) -------------------------------------------- */"

start_idx = code.find(OLD_SNIP_JS_START)
end_idx   = code.find(OLD_SNIP_JS_END, start_idx)

assert start_idx != -1, "Snippets JS start not found"
assert end_idx   != -1, "Snippets JS end not found"

NEW_SNIP_JS = """/* ---- Snippets / Quick Capture (pro) ------------------------------------ */
const SNIP_LS_KEY = 'pl_snippets';
let _snips = [];
let _snipActiveId = null;
let _snipTagFilter = 'all';

function _snipLoad() { try { _snips = JSON.parse(localStorage.getItem(SNIP_LS_KEY) || '[]'); } catch { _snips = []; } }
function _snipSave() { localStorage.setItem(SNIP_LS_KEY, JSON.stringify(_snips)); }
function _snipUID()  { return 'sn_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }

window.openSnippetsWorkspace = function() {
  /* Pro gate */ if (!state.isPremium) { showPremiumModal(); return; }
  _snipLoad();
  const ws = $('#snippetsWorkspace');
  if (!ws) return;
  ws.classList.add('open');
  document.body.style.overflow = 'hidden';
  $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'snippets'));
  _snipActiveId = null;
  _snipTagFilter = 'all';
  _snipShowEmpty();
  _snipRenderStats();
  _snipRenderTagRow();
  _snipRenderCards();
};

function _snipClose() {
  const ws = $('#snippetsWorkspace');
  if (!ws) return;
  ws.classList.remove('open');
  document.body.style.overflow = '';
  $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
}

function _snipShowEmpty() {
  const form  = $('#snipEditorForm');
  const empty = $('#snipEditorEmpty');
  if (form)  form.hidden = true;
  if (empty) empty.style.display = '';
}

function _snipRenderStats() {
  _snipLoad();
  const pinned = _snips.filter(s => s.pinned).length;
  const chars  = _snips.reduce((n, s) => n + (s.content || '').length, 0);
  const countEl  = $('#snipStatCount');
  const pinnedEl = $('#snipStatPinned');
  const charsEl  = $('#snipStatChars');
  if (countEl)  countEl.textContent  = _snips.length;
  if (pinnedEl) pinnedEl.textContent = pinned;
  if (charsEl)  charsEl.textContent  = chars >= 1000 ? (chars / 1000).toFixed(1) + 'k' : chars;
}

function _snipGetTags() {
  const tags = new Set();
  _snips.forEach(s => { if (s.tag && s.tag.trim()) s.tag.split(',').forEach(t => tags.add(t.trim().toLowerCase())); });
  return Array.from(tags).sort();
}

function _snipRenderTagRow() {
  const row = $('#snipTagRow');
  if (!row) return;
  const tags = _snipGetTags();
  if (!tags.length) { row.innerHTML = ''; return; }
  row.innerHTML = ['all'].concat(tags).map(t =>
    '<button class="ctx-pill' + (t === _snipTagFilter ? ' active' : '') + '" data-snip-tag="' + escapeAttr(t) + '">' +
    (t === 'all' ? 'All' : escapeHtml(t)) + '</button>').join('');
}

function _snipColourClass(col) {
  const map = { red:'snip-col-red', orange:'snip-col-orange', yellow:'snip-col-yellow',
                green:'snip-col-green', blue:'snip-col-blue', purple:'snip-col-purple' };
  return map[col] || '';
}

function _snipRenderCards() {
  _snipLoad();
  const q = ($('#snipSearch')?.value || '').toLowerCase();
  let items = _snips.slice();
  if (_snipTagFilter !== 'all') items = items.filter(s =>
    (s.tag || '').split(',').map(t => t.trim().toLowerCase()).includes(_snipTagFilter));
  if (q) items = items.filter(s =>
    (s.label || '').toLowerCase().includes(q) ||
    (s.content || '').toLowerCase().includes(q) ||
    (s.tag || '').toLowerCase().includes(q));
  // Pinned first
  items.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const grid  = $('#snipCards');
  const empty = $('#snipCardsEmpty');
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  grid.innerHTML = items.map(s => {
    const colCls  = _snipColourClass(s.colour || '');
    const preview = (s.content || '').slice(0, 80);
    const tagHtml = (s.tag ? s.tag.split(',').map(t => t.trim()).filter(Boolean) : [])
      .map(t => '<span class="snip-tag-chip">' + escapeHtml(t) + '</span>').join('');
    const chars   = (s.content || '').length;
    return '<div class="snip-card' + (s.id === _snipActiveId ? ' active' : '') +
      (colCls ? ' ' + colCls : '') + '" data-sid="' + escapeAttr(s.id) + '">' +
      '<div class="snip-card-top">' +
      (s.pinned ? '<span class="snip-pin-badge material-symbols-outlined" title="Pinned">push_pin</span>' : '') +
      '<span class="snip-card-label">' + escapeHtml(s.label || 'Untitled') + '</span>' +
      '<button class="snip-quick-copy icon-btn" data-snip-qcopy="' + escapeAttr(s.id) + '" title="Copy content"><span class="material-symbols-outlined">content_copy</span></button>' +
      '</div>' +
      '<p class="snip-card-preview">' + escapeHtml(preview) + (s.content && s.content.length > 80 ? '…' : '') + '</p>' +
      '<div class="snip-card-footer">' +
      (tagHtml ? '<div class="snip-tag-chips">' + tagHtml + '</div>' : '<span></span>') +
      '<span class="snip-char-count">' + (chars >= 1000 ? (chars/1000).toFixed(1)+'k' : chars) + ' chars</span>' +
      '</div></div>';
  }).join('');
}

function _snipOpen(id) {
  _snipLoad();
  const s = _snips.find(x => x.id === id);
  if (!s) return;
  _snipActiveId = id;
  const form  = $('#snipEditorForm');
  const empty = $('#snipEditorEmpty');
  if (empty) empty.style.display = 'none';
  if (form)  form.hidden = false;

  if ($('#snipFormEyebrow'))   $('#snipFormEyebrow').textContent  = 'Edit snippet';
  if ($('#snipLabelInput'))    $('#snipLabelInput').value   = s.label   || '';
  if ($('#snipTagInput'))      $('#snipTagInput').value     = s.tag     || '';
  if ($('#snipContentInput'))  $('#snipContentInput').value = s.content || '';
  if ($('#snipCharCount'))     $('#snipCharCount').textContent = ((s.content||'').length) + ' chars';

  // Colour strip
  $$('#snipColourStrip .snip-col-btn').forEach(b => {
    b.classList.toggle('active', (b.dataset.col || '') === (s.colour || ''));
  });

  // Pin button
  const pinBtn = $('#snipPinBtn');
  if (pinBtn) {
    pinBtn.classList.toggle('active', !!s.pinned);
    pinBtn.title = s.pinned ? 'Unpin' : 'Pin to top';
  }

  _snipRenderCards();
}

function _snipNew() {
  _snipActiveId = null;
  const form  = $('#snipEditorForm');
  const empty = $('#snipEditorEmpty');
  if (empty) empty.style.display = 'none';
  if (form)  form.hidden = false;

  if ($('#snipFormEyebrow'))   $('#snipFormEyebrow').textContent  = 'New snippet';
  if ($('#snipLabelInput'))    { $('#snipLabelInput').value = '';    }
  if ($('#snipTagInput'))      { $('#snipTagInput').value   = '';    }
  if ($('#snipContentInput'))  { $('#snipContentInput').value = ''; $('#snipContentInput').focus(); }
  if ($('#snipCharCount'))     $('#snipCharCount').textContent = '0 chars';

  $$('#snipColourStrip .snip-col-btn').forEach(b => b.classList.toggle('active', b.dataset.col === ''));
  const pinBtn = $('#snipPinBtn');
  if (pinBtn) { pinBtn.classList.remove('active'); pinBtn.title = 'Pin to top'; }

  _snipRenderCards();
}

function _snipGetActiveColour() {
  const active = document.querySelector('#snipColourStrip .snip-col-btn.active');
  return active ? (active.dataset.col || '') : '';
}

function _snipSaveCurrent() {
  const label   = ($('#snipLabelInput')?.value || '').trim();
  const tag     = ($('#snipTagInput')?.value   || '').trim();
  const content = ($('#snipContentInput')?.value || '');
  const colour  = _snipGetActiveColour();
  if (!label && !content.trim()) { toast('Add a label or some content first', 'warning'); return; }
  _snipLoad();
  if (_snipActiveId) {
    const s = _snips.find(x => x.id === _snipActiveId);
    if (s) { s.label = label; s.tag = tag; s.content = content; s.colour = colour; s.updated = new Date().toISOString(); }
  } else {
    const id = _snipUID();
    _snips.unshift({ id, label, tag, content, colour, pinned: false, created: new Date().toISOString() });
    _snipActiveId = id;
  }
  _snipSave();
  _snipRenderStats();
  _snipRenderTagRow();
  _snipRenderCards();
  toast('Snippet saved', 'success');
}

function _snipDelete() {
  if (!_snipActiveId) return;
  _snipLoad();
  _snips = _snips.filter(x => x.id !== _snipActiveId);
  _snipSave();
  _snipActiveId = null;
  _snipShowEmpty();
  _snipRenderStats();
  _snipRenderTagRow();
  _snipRenderCards();
  toast('Snippet deleted', 'info');
}

function _snipCopy() {
  const content = ($('#snipContentInput')?.value || '');
  if (!content) { toast('Nothing to copy', 'warning'); return; }
  copyToClipboard(content);
  toast('Snippet copied', 'success');
}

function _snipQuickCopy(id) {
  _snipLoad();
  const s = _snips.find(x => x.id === id);
  if (!s || !s.content) { toast('Nothing to copy', 'warning'); return; }
  copyToClipboard(s.content);
  toast('Copied', 'success');
}

function _snipTogglePin() {
  if (!_snipActiveId) return;
  _snipLoad();
  const s = _snips.find(x => x.id === _snipActiveId);
  if (!s) return;
  s.pinned = !s.pinned;
  _snipSave();
  const pinBtn = $('#snipPinBtn');
  if (pinBtn) { pinBtn.classList.toggle('active', s.pinned); pinBtn.title = s.pinned ? 'Unpin' : 'Pin to top'; }
  _snipRenderStats();
  _snipRenderCards();
  toast(s.pinned ? 'Pinned to top' : 'Unpinned', 'info');
}

function initSnippetsWorkspace() {
  $('#closeSnippetsBtn')?.addEventListener('click', _snipClose);
  $('#snipNewBtn')?.addEventListener('click', _snipNew);
  $('#snipSaveBtn')?.addEventListener('click', _snipSaveCurrent);
  $('#snipDeleteBtn')?.addEventListener('click', _snipDelete);
  $('#snipCopyBtn')?.addEventListener('click', _snipCopy);
  $('#snipPinBtn')?.addEventListener('click', _snipTogglePin);

  $('#snipSearch')?.addEventListener('input', () => { _snipRenderCards(); });

  // Tag row filter
  $('#snipTagRow')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-snip-tag]'); if (!b) return;
    _snipTagFilter = b.dataset.snipTag;
    _snipRenderTagRow();
    _snipRenderCards();
  });

  // Card clicks (open + quick copy)
  $('#snipCards')?.addEventListener('click', (e) => {
    const qcopy = e.target.closest('[data-snip-qcopy]');
    if (qcopy) { e.stopPropagation(); _snipQuickCopy(qcopy.dataset.snipQcopy); return; }
    const card = e.target.closest('[data-sid]');
    if (card) _snipOpen(card.dataset.sid);
  });

  // Colour strip
  $('#snipColourStrip')?.addEventListener('click', (e) => {
    const b = e.target.closest('.snip-col-btn'); if (!b) return;
    $$('#snipColourStrip .snip-col-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  });

  // Char count live update
  $('#snipContentInput')?.addEventListener('input', () => {
    const len = ($('#snipContentInput')?.value || '').length;
    if ($('#snipCharCount')) $('#snipCharCount').textContent = (len >= 1000 ? (len/1000).toFixed(1)+'k' : len) + ' chars';
  });

  const ws = $('#snippetsWorkspace');
  if (ws) ws.addEventListener('keydown', e => { if (e.key === 'Escape') _snipClose(); });
}"""

old_block = code[start_idx:end_idx]
new_code = code[:start_idx] + NEW_SNIP_JS + code[end_idx:]

print("Old snippets JS length:", len(old_block))
print("New snippets JS length:", len(NEW_SNIP_JS))
print("File size change:", len(new_code) - len(code))

open('static/app.js', 'w', encoding='utf-8').write(new_code)
print("app.js snippets JS replaced.")
