/*
 * Reusable vanilla-JS frontend boilerplate, extracted from static/app.js.
 *
 * Reference only — not loaded by the app (no <script> tag points here).
 * Copy a section into a real file and adapt selectors/state before use.
 */

/* ============================================================================
   1. DOM selector shorthand helpers
   Source: static/app.js:61-62
   Use when: any vanilla-JS project wants short, chainable querySelector calls.
   ============================================================================ */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));


/* ============================================================================
   2. API fetch wrapper
   Source: static/app.js:91-112
   Use when: talking to a JSON REST backend — handles body stringification,
   error extraction, 204 No Content, and non-JSON responses in one place.
   ============================================================================ */
const API_BASE = window.location.origin + '/api';

async function api(path, opts = {}) {
  const url = API_BASE + path;
  const init = {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  };
  if (init.body && typeof init.body !== 'string') {
    init.body = JSON.stringify(init.body);
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error || ''; } catch {}
    throw new Error(`API ${res.status}: ${detail || res.statusText}`);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}


/* ============================================================================
   3. Toast notifications
   Source: static/app.js:210-220
   Use when: need a drop-in, dependency-free notification system.
   Requires markup: <div id="toastContainer" aria-live="polite"></div>
   ============================================================================ */
function toast(msg, kind = 'success') {
  const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
  const root = $('#toastContainer');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `<span class="material-symbols-outlined">${icons[kind] || 'info'}</span><span>${escapeHtml(msg)}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    el.style.transition = 'all 200ms ease-out';
  }, 2700);
  setTimeout(() => el.remove(), 3000);
}

const escapeHtml = (text) => {
  if (text == null) return '';
  const d = document.createElement('div');
  d.textContent = String(text);
  return d.innerHTML;
};


/* ============================================================================
   4. Clipboard copy with legacy fallback
   Source: static/app.js:225-244
   Use when: copy-to-clipboard needs to work in both secure (navigator.clipboard)
   and non-secure / older WebView contexts.
   ============================================================================ */
async function copyToClipboard(text) {
  if (!text || !text.trim()) {
    toast('Nothing to copy', 'warning');
    return false;
  }
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    return true;
  } catch (err) {
    console.error('clipboard:', err);
    toast('Could not copy to clipboard', 'error');
    return false;
  }
}


/* ============================================================================
   5. Full-screen workspace open/close
   Source: static/app.js:~3360-3375 (openRolesWorkspace / closeRolesWorkspace)
   Use when: a full-screen panel needs scroll-lock plus an async data load on
   open, and clean state reset on close. Rename "Thing" per workspace.
   ============================================================================ */
window.openThingWorkspace = async function () {
  const ws = $('#thingWorkspace');
  if (!ws) return;
  ws.classList.add('open');
  document.body.style.overflow = 'hidden';
  await loadThingData();
};

function closeThingWorkspace() {
  const ws = $('#thingWorkspace');
  if (!ws) return;
  ws.classList.remove('open');
  document.body.style.overflow = '';
}


/* ============================================================================
   6. Close-all-overlays / escape-to-library
   Source: static/app.js:~3004-3025 (_escapeToLibrary)
   Use when: multiple full-screen workspaces exist and navigating away or
   pressing Escape should close whichever one is open, in one place.
   ============================================================================ */
function _escapeToLibrary() {
  [
    '#forgeWorkspace', '#labWorkspace', '#rolesWorkspace', '#playgroundWorkspace',
    '#chainWorkspace', '#metaWorkspace', '#contextBankWorkspace', '#componentsWorkspace',
  ].forEach((sel) => {
    const el = $(sel);
    if (el && el.classList.contains('open')) el.classList.remove('open');
  });
  document.body.style.overflow = '';
}


/* ============================================================================
   7. Premium feature gate
   Source: static/app.js:~1506-1509, 1697
   Use when: a feature should be blocked for free users and a "go premium"
   modal shown instead. Pair with the `premium-locked` HTML class
   (see html_markup.html) for the visual lock state.
   ============================================================================ */
function requirePremium(state) {
  if (!state.isPremium) {
    showPremiumModal();
    return false;
  }
  return true;
}
// Usage at the top of any gated function:
//   if (!requirePremium(state)) return;


/* ============================================================================
   8. Drag-and-drop reorder within a list
   Source: static/app.js:~6046-6070
   Use when: items in an array need to be reorderable by dragging cards over
   each other (e.g. a canvas/board UI).
   ============================================================================ */
function wireDragReorder(card, idx, items, rerender) {
  let dragSrcIdx = null;

  card.draggable = true;

  card.addEventListener('dragstart', (e) => {
    dragSrcIdx = idx;
    card.classList.add('drag-source');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'card-' + idx);
    e.stopPropagation();
  });

  card.addEventListener('dragend', () => card.classList.remove('drag-source'));

  card.addEventListener('dragover', (e) => e.preventDefault());

  card.addEventListener('drop', (e) => {
    e.preventDefault();
    if (dragSrcIdx === null) return;
    const moved = items.splice(dragSrcIdx, 1)[0];
    items.splice(idx, 0, moved);
    rerender();
  });
}


/* ============================================================================
   9. Drop zone receiving drags from a palette
   Source: static/app.js:~6122-6147
   Use when: a "palette" of options can be dragged onto a separate drop
   target (e.g. building blocks dropped onto a canvas).
   ============================================================================ */
function wirePaletteDropZone(zone, palette, onDrop) {
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    zone.classList.add('drag-active');
  });

  zone.addEventListener('dragleave', () => zone.classList.remove('drag-active'));

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-active');
    const idx = e.dataTransfer.getData('palette-index');
    if (idx === '') return;
    const item = palette[parseInt(idx, 10)];
    if (item) onDrop(item);
  });
}


/* ============================================================================
   10. Typed localStorage read/write helpers
   Source: static/app.js:~2611-2612, 2678, 2690
   Use when: storing small JSON-able values in localStorage and wanting safe
   parse fallbacks instead of repeating try/catch everywhere.
   ============================================================================ */
function getStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setStored(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}


/* ============================================================================
   11. Live search/filter render
   Source: static/app.js:~3166-3169, 650-669
   Use when: an input should filter a rendered list on every keystroke. The
   render call sits inside the try/catch per CLAUDE.md rule #5 — never let a
   render call float outside the loader's try block.
   ============================================================================ */
$('#searchInput')?.addEventListener('input', (e) => {
  state.search = e.target.value;
  renderFilteredList();
});

async function renderFilteredList() {
  const container = $('#listContainer');
  try {
    const list = getFilteredItems();
    container.innerHTML = list.length
      ? list.map(renderItemCard).join('')
      : renderEmptyState();
  } catch (err) {
    console.error('renderFilteredList:', err);
    container.innerHTML = renderEmptyState();
  }
}
