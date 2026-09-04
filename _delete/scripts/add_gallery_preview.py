import os, re
os.chdir(r'C:\Users\Eugene Phillips\Desktop\Prompt Library Update')

# ─── app.js changes ─────────────────────────────────────────────────────────

code = open('static/app.js', 'r', encoding='utf-8').read()

# 1. Update _galRender to add Preview button on each card
OLD_RENDER = """  grid.innerHTML = items.map(t => {
    const idx = GAL_TEMPLATES.indexOf(t);
    return '<div class="gal-card">' +
      '<div class="gal-card-top"><span class="gal-card-cat">' + escapeHtml(t.category) + '</span></div>' +
      '<h3 class="gal-card-title">' + escapeHtml(t.title) + '</h3>' +
      '<p class="gal-card-desc">' + escapeHtml(t.description || '') + '</p>' +
      '<p class="gal-card-prev">' + escapeHtml((t.content || '').slice(0, 110)) + '&hellip;</p>' +
      '<div class="gal-card-actions">' +
      '<button class="btn btn-ghost" data-gal-copy="' + idx + '"><span class="material-symbols-outlined">content_copy</span> Copy</button>' +
      '<button class="btn btn-accent" data-gal-add="' + idx + '"><span class="material-symbols-outlined">add</span> Add</button>' +
      '</div></div>';
  }).join('');"""

NEW_RENDER = """  grid.innerHTML = items.map(t => {
    const idx = GAL_TEMPLATES.indexOf(t);
    const catColour = _galCatColour(t.category);
    return '<div class="gal-card">' +
      '<div class="gal-card-top"><span class="gal-card-cat" style="' + catColour + '">' + escapeHtml(t.category) + '</span></div>' +
      '<h3 class="gal-card-title">' + escapeHtml(t.title) + '</h3>' +
      '<p class="gal-card-desc">' + escapeHtml(t.description || '') + '</p>' +
      '<p class="gal-card-prev">' + escapeHtml((t.content || '').slice(0, 100)) + '&hellip;</p>' +
      '<div class="gal-card-actions">' +
      '<button class="btn btn-ghost" data-gal-preview="' + idx + '"><span class="material-symbols-outlined">preview</span> Preview</button>' +
      '<button class="btn btn-accent" data-gal-add="' + idx + '"><span class="material-symbols-outlined">add</span> Add</button>' +
      '</div></div>';
  }).join('');"""

assert OLD_RENDER in code, "OLD_RENDER not found"
code = code.replace(OLD_RENDER, NEW_RENDER, 1)

# 2. Add _galCatColour helper + _galPreview function + _galPreviewClose before initGalleryWorkspace
INJECT_BEFORE = "function initGalleryWorkspace() {"

GAL_COLOUR_AND_PREVIEW = """function _galCatColour(cat) {
  const map = {
    'Writing':'color:var(--accent);background:var(--accent-soft)',
    'Coding':'color:#0ea5e9;background:rgba(14,165,233,0.12)',
    'Marketing':'color:#ec4899;background:rgba(236,72,153,0.12)',
    'Business':'color:#f97316;background:rgba(249,115,22,0.12)',
    'Research':'color:#8b5cf6;background:rgba(139,92,246,0.12)',
    'Productivity':'color:#22c55e;background:rgba(34,197,94,0.12)',
    'Prompt Engineering':'color:#eab308;background:rgba(234,179,8,0.12)',
    'Prompt Generation':'color:#06b6d4;background:rgba(6,182,212,0.12)',
    'Context Prompts':'color:#a78bfa;background:rgba(167,139,250,0.12)',
  };
  return map[cat] || 'color:var(--accent);background:var(--accent-soft)';
}
let _galPreviewIdx = -1;
function _galPreview(idx) {
  const t = GAL_TEMPLATES[idx];
  if (!t) return;
  _galPreviewIdx = idx;
  const modal = $('#galPreviewModal');
  if (!modal) return;
  const catStyle = _galCatColour(t.category);
  const catEl = $('#galPreviewCat');
  const titleEl = $('#galPreviewTitle');
  const descEl = $('#galPreviewDesc');
  const bodyEl = $('#galPreviewBody');
  const tagsEl = $('#galPreviewTags');
  if (catEl)   { catEl.textContent = t.category; catEl.style.cssText = catStyle; }
  if (titleEl)  titleEl.textContent = t.title;
  if (descEl)   descEl.textContent = t.description || '';
  if (bodyEl)   bodyEl.textContent = t.content || '';
  if (tagsEl)   tagsEl.innerHTML = (t.tags || []).map(tg =>
    '<span class="gal-preview-tag">' + escapeHtml(tg) + '</span>').join('');
  modal.hidden = false;
  modal.removeAttribute('hidden');
  modal.classList.add('open');
  bodyEl?.focus();
}
function _galPreviewClose() {
  const modal = $('#galPreviewModal');
  if (modal) { modal.classList.remove('open'); modal.hidden = true; }
  _galPreviewIdx = -1;
}
function initGalleryWorkspace() {"""

assert INJECT_BEFORE in code, "INJECT_BEFORE not found"
code = code.replace(INJECT_BEFORE, GAL_COLOUR_AND_PREVIEW, 1)

# 3. Update initGalleryWorkspace to wire preview + close
OLD_GALLERY_INIT_CLICKS = """  $('#galGrid')?.addEventListener('click', (e) => {
    const add = e.target.closest('[data-gal-add]');
    const cp  = e.target.closest('[data-gal-copy]');
    if (add) { _galAdd(Number(add.dataset.galAdd)); return; }
    if (cp)  { _galCopy(Number(cp.dataset.galCopy)); return; }
  });
  const ws = $('#galleryWorkspace');
  if (ws) ws.addEventListener('keydown', e => { if (e.key === 'Escape') _galClose(); });
}"""

NEW_GALLERY_INIT_CLICKS = """  $('#galGrid')?.addEventListener('click', (e) => {
    const add  = e.target.closest('[data-gal-add]');
    const prev = e.target.closest('[data-gal-preview]');
    if (add)  { _galAdd(Number(add.dataset.galAdd)); return; }
    if (prev) { _galPreview(Number(prev.dataset.galPreview)); return; }
  });
  $('#galPreviewCloseBtn')?.addEventListener('click', _galPreviewClose);
  $('#galPreviewAddBtn')?.addEventListener('click', () => { if (_galPreviewIdx >= 0) { _galAdd(_galPreviewIdx); _galPreviewClose(); } });
  $('#galPreviewCopyBtn')?.addEventListener('click', () => { if (_galPreviewIdx >= 0) { _galCopy(_galPreviewIdx); } });
  const ws = $('#galleryWorkspace');
  if (ws) ws.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const modal = $('#galPreviewModal');
      if (modal && !modal.hidden) { _galPreviewClose(); return; }
      _galClose();
    }
  });
}"""

assert OLD_GALLERY_INIT_CLICKS in code, "OLD_GALLERY_INIT_CLICKS not found"
code = code.replace(OLD_GALLERY_INIT_CLICKS, NEW_GALLERY_INIT_CLICKS, 1)

open('static/app.js', 'w', encoding='utf-8').write(code)
print("app.js updated.")

# ─── index.html: add gallery preview modal inside #galleryWorkspace ───────────
html = open('static/index.html', 'r', encoding='utf-8').read()

OLD_GAL_HTML = """<div id="galleryWorkspace" role="dialog" aria-modal="true" aria-label="Template Gallery">
  <div class="ws-header">
    <div class="ws-header-left">
      <span class="material-symbols-outlined ws-header-icon">auto_awesome_mosaic</span>
      <div>
        <h2 class="ws-title">Template Gallery</h2>
        <p class="ws-subtitle">Curated starter prompts &mdash; add to your library in one click.</p>
      </div>
    </div>
    <div class="ws-header-actions">
      <button class="icon-btn" id="closeGalleryBtn" aria-label="Close Template Gallery"><span class="material-symbols-outlined">close</span></button>
    </div>
  </div>
  <div class="ws-body gal-body">
    <div class="gal-toolbar">
      <div class="ctx-search-row gal-search">
        <span class="material-symbols-outlined ctx-search-icon">search</span>
        <input type="search" id="galSearch" class="ctx-search-input" placeholder="Search templates…" autocomplete="off" />
      </div>
      <div class="gal-cat-row" id="galCatRow"></div>
    </div>
    <div class="gal-grid" id="galGrid"></div>
    <div class="ctx-empty gal-empty" id="galEmptyHint" style="display:none;">
      <span class="material-symbols-outlined">auto_awesome_mosaic</span>
      <p>No templates match your search.</p>
    </div>
  </div>
</div>"""

NEW_GAL_HTML = """<div id="galleryWorkspace" role="dialog" aria-modal="true" aria-label="Template Gallery">
  <div class="ws-header">
    <div class="ws-header-left">
      <span class="material-symbols-outlined ws-header-icon">auto_awesome_mosaic</span>
      <div>
        <h2 class="ws-title">Template Gallery</h2>
        <p class="ws-subtitle">50 curated prompts across 9 categories &mdash; preview before you add.</p>
      </div>
    </div>
    <div class="ws-header-actions">
      <button class="icon-btn" id="closeGalleryBtn" aria-label="Close Template Gallery"><span class="material-symbols-outlined">close</span></button>
    </div>
  </div>
  <div class="ws-body gal-body">
    <div class="gal-toolbar">
      <div class="ctx-search-row gal-search">
        <span class="material-symbols-outlined ctx-search-icon">search</span>
        <input type="search" id="galSearch" class="ctx-search-input" placeholder="Search templates&hellip;" autocomplete="off" />
      </div>
      <div class="gal-cat-row" id="galCatRow"></div>
    </div>
    <div class="gal-grid" id="galGrid"></div>
    <div class="ctx-empty gal-empty" id="galEmptyHint" style="display:none;">
      <span class="material-symbols-outlined">auto_awesome_mosaic</span>
      <p>No templates match your search.</p>
    </div>
  </div>
  <!-- Preview modal (overlays the gallery) -->
  <div class="gal-preview-modal" id="galPreviewModal" hidden>
    <div class="gal-preview-card" role="dialog" aria-label="Template preview">
      <div class="gal-preview-header">
        <div class="gal-preview-meta">
          <span class="gal-card-cat" id="galPreviewCat"></span>
          <h3 class="gal-preview-title" id="galPreviewTitle"></h3>
          <p class="gal-preview-desc" id="galPreviewDesc"></p>
          <div class="gal-preview-tags" id="galPreviewTags"></div>
        </div>
        <button class="icon-btn" id="galPreviewCloseBtn" aria-label="Close preview"><span class="material-symbols-outlined">close</span></button>
      </div>
      <pre class="gal-preview-body" id="galPreviewBody" tabindex="0"></pre>
      <div class="gal-preview-footer">
        <button class="btn btn-ghost" id="galPreviewCopyBtn"><span class="material-symbols-outlined">content_copy</span> Copy prompt</button>
        <button class="btn btn-accent" id="galPreviewAddBtn"><span class="material-symbols-outlined">add</span> Add to Library</button>
      </div>
    </div>
  </div>
</div>"""

assert OLD_GAL_HTML in html, "OLD_GAL_HTML not found in index.html"
html = html.replace(OLD_GAL_HTML, NEW_GAL_HTML, 1)
open('static/index.html', 'w', encoding='utf-8').write(html)
print("index.html updated with preview modal.")
