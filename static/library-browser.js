/* Library Browser workspace: browse your prompts by tag, folder and category.
   Self contained: builds its own root element, owns every id and class (prefix lbr) and keeps only a view preference in localStorage.
   Read only. Data comes from GET /api/prompts, /api/folders and /api/prompts/filters and nothing is ever written to the library.
   It deliberately knows nothing about workspace organisation: these are the tags, folders and categories of the prompts themselves. */
(function () {
    'use strict';

    const ROOT_ID = 'libraryBrowserWorkspace';
    const STORE_KEY = 'library-browser.v1';
    const PAGE = 60;
    const RAIL_PAGE = 150;
    const MAX_CHIPS_CAT = 3;
    const MAX_CHIPS_TAG = 4;
    const FETCH_MS = 30000;

    const TABS = [
        { id: 'folders', label: 'Folders', icon: 'folder', all: 'All prompts', none: 'No folder', noneIcon: 'folder_off' },
        { id: 'categories', label: 'Categories', icon: 'category', all: 'All prompts', none: 'Uncategorised', noneIcon: 'label_off' },
        { id: 'tags', label: 'Tags', icon: 'sell', all: 'All prompts', none: 'Untagged', noneIcon: 'sell' }
    ];

    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const ms = (name, cls) => '<span class="material-symbols-outlined' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + name + '</span>';
    const nf = n => Number(n).toLocaleString('en-GB');
    const oneLine = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    const toast = (msg, kind) => { if (window.PL_toast) window.PL_toast(msg, kind || 'info'); };

    /* ---------- view preferences (localStorage only) ---------- */
    function loadPrefs() {
        const base = { tab: 'folders', view: 'list', tagSort: 'count' };
        try {
            const d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
            if (d && typeof d === 'object') {
                if (TABS.some(t => t.id === d.tab)) base.tab = d.tab;
                if (d.view === 'grid' || d.view === 'list') base.view = d.view;
                if (d.tagSort === 'name' || d.tagSort === 'count') base.tagSort = d.tagSort;
            }
        } catch (e) { /* unreadable storage starts clean */ }
        return base;
    }
    function savePrefs() {
        try { localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, tab: ui.tab, view: ui.view, tagSort: ui.tagSort })); } catch (e) { /* storage may be blocked */ }
    }

    /* ---------- state ---------- */
    let root = null;
    let mounted = false;
    let opener = null;
    let loadToken = 0;
    let searchTimer = 0;
    let idx = null;
    const data = { prompts: [], folders: [], filters: null, loaded: false };
    const ui = Object.assign(loadPrefs(), {
        sel: { folders: { t: 'all' }, categories: { t: 'all' }, tags: { t: 'all' } },
        q: '', tagQ: '', limit: PAGE, railLimit: RAIL_PAGE, shown: 0, state: 'idle', error: '', matched: []
    });

    const $ = (s, r) => (r || root).querySelector(s);
    const $$ = (s, r) => Array.from((r || root).querySelectorAll(s));
    const isOpen = () => !!root && root.classList.contains('open');

    /* ---------- data shaping ---------- */
    function asList(v) {
        const seen = new Set();
        const out = [];
        (Array.isArray(v) ? v : []).forEach(x => {
            const s = oneLine(x);
            if (s && !seen.has(s)) { seen.add(s); out.push(s); }
        });
        return out;
    }
    function parseTime(v) {
        if (!v) return 0;
        let s = String(v).trim();
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) s = s.replace(' ', 'T');
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) s += 'Z';
        const t = Date.parse(s);
        return Number.isFinite(t) ? t : 0;
    }
    // Keep only what the browser needs so 2000 prompts stay light in memory.
    function slim(p) {
        const fid = p.folder_id == null || p.folder_id === '' ? null : Number(p.folder_id);
        const rating = Math.max(0, Math.min(5, Math.round(Number(p.rating) || 0)));
        return {
            id: p.id,
            title: oneLine(p.title) || 'Untitled prompt',
            desc: oneLine(p.description).slice(0, 400),
            fid: Number.isFinite(fid) ? fid : null,
            cats: asList(p.categories),
            tags: asList(p.tags),
            fav: Number(p.is_favorite) ? 1 : 0,
            rating,
            uses: Math.max(0, Number(p.use_count) || 0),
            ts: parseTime(p.updated_at),
            tsRaw: String(p.updated_at || ''),
            hay: ''
        };
    }
    function byName(a, b) { return String(a).localeCompare(String(b), 'en-GB', { sensitivity: 'base', numeric: true }); }

    function buildIndex() {
        const fmap = new Map();
        data.folders.forEach(f => {
            const id = Number(f.id);
            if (!Number.isFinite(id) || fmap.has(id)) return;
            const rawParent = f.parent_id != null ? f.parent_id : f.parent;
            const parent = rawParent == null || rawParent === '' ? null : Number(rawParent);
            fmap.set(id, { id, name: oneLine(f.name) || 'Untitled folder', parent: Number.isFinite(parent) ? parent : null, kids: [], direct: 0, total: 0, depth: 0 });
        });
        // Attach children, then cut any cycle or dangling parent so the tree is always finite.
        fmap.forEach(n => {
            if (n.parent != null && (!fmap.has(n.parent) || n.parent === n.id)) n.parent = null;
        });
        fmap.forEach(n => {
            const seen = new Set([n.id]);
            let p = n.parent;
            while (p != null) {
                if (seen.has(p)) { n.parent = null; break; }
                seen.add(p);
                p = fmap.get(p).parent;
            }
        });
        fmap.forEach(n => { if (n.parent != null) fmap.get(n.parent).kids.push(n); });
        const sortKids = list => list.sort((a, b) => byName(a.name, b.name));
        const roots = sortKids(Array.from(fmap.values()).filter(n => n.parent == null));
        fmap.forEach(n => sortKids(n.kids));

        const cats = new Map();
        const tags = new Map();
        let noFolder = 0, noCat = 0, noTag = 0, favs = 0;
        data.prompts.forEach(p => {
            if (p.fid != null && !fmap.has(p.fid)) p.fid = null;
            if (p.fid == null) noFolder++; else fmap.get(p.fid).direct++;
            if (!p.cats.length) noCat++;
            if (!p.tags.length) noTag++;
            if (p.fav) favs++;
            p.cats.forEach(c => cats.set(c, (cats.get(c) || 0) + 1));
            p.tags.forEach(t => tags.set(t, (tags.get(t) || 0) + 1));
            const fname = p.fid != null ? fmap.get(p.fid).name : '';
            p.hay = (p.title + ' ' + p.desc + ' ' + p.cats.join(' ') + ' ' + p.tags.join(' ') + ' ' + fname).toLowerCase();
        });

        const flat = [];
        const walk = (n, depth) => {
            n.depth = depth;
            const ids = [n.id];
            n.kids.forEach(k => { ids.push(...walk(k, depth + 1)); });
            n.ids = new Set(ids);
            n.total = 0;
            return ids;
        };
        // Post order totals, pre order flat list for display.
        roots.forEach(r => walk(r, 0));
        fmap.forEach(n => { let t = 0; n.ids.forEach(i => { t += fmap.get(i).direct; }); n.total = t; });
        const emit = n => { flat.push(n); n.kids.forEach(emit); };
        roots.forEach(emit);

        idx = { fmap, roots, flat, cats, tags, noFolder, noCat, noTag, favs, nested: flat.some(n => n.depth > 0) };
    }

    // Reset a stale selection after a refresh removed its folder, category or tag.
    function validateSel() {
        if (!idx) return;
        TABS.forEach(t => {
            const s = ui.sel[t.id];
            if (s.t !== 'val') return;
            const ok = t.id === 'folders' ? idx.fmap.has(Number(s.v)) : t.id === 'categories' ? idx.cats.has(s.v) : idx.tags.has(s.v);
            if (!ok) ui.sel[t.id] = { t: 'all' };
        });
    }

    /* ---------- selection and search ---------- */
    function selPredicate(tab, sel) {
        if (!sel || sel.t === 'all') return null;
        if (tab === 'folders') {
            if (sel.t === 'none') return p => p.fid == null;
            const node = idx.fmap.get(Number(sel.v));
            const ids = node ? node.ids : new Set();
            return p => p.fid != null && ids.has(p.fid);
        }
        if (tab === 'categories') return sel.t === 'none' ? p => !p.cats.length : p => p.cats.indexOf(sel.v) >= 0;
        return sel.t === 'none' ? p => !p.tags.length : p => p.tags.indexOf(sel.v) >= 0;
    }
    function words() { return ui.q.toLowerCase().split(/\s+/).filter(Boolean); }
    function computeMatches() {
        const pred = selPredicate(ui.tab, ui.sel[ui.tab]);
        const w = words();
        ui.matched = data.prompts.filter(p => (!pred || pred(p)) && w.every(x => p.hay.indexOf(x) >= 0));
        return ui.matched;
    }
    function selLabel(tab, sel) {
        const T = TABS.find(t => t.id === tab);
        if (!sel || sel.t === 'all') return T.all;
        if (sel.t === 'none') return T.none;
        if (tab === 'folders') { const n = idx.fmap.get(Number(sel.v)); return n ? n.name : T.all; }
        return sel.v;
    }

    /* ---------- formatting ---------- */
    function ago(ts) {
        if (!ts) return '';
        const sec = Math.round((Date.now() - ts) / 1000);
        let rtf = null;
        try { rtf = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' }); } catch (e) { /* fall back below */ }
        const steps = [[60, 'second', 1], [3600, 'minute', 60], [86400, 'hour', 3600], [604800, 'day', 86400], [2629800, 'week', 604800], [31557600, 'month', 2629800], [Infinity, 'year', 31557600]];
        if (sec < 45) return 'just now';
        for (const [lim, unit, div] of steps) {
            if (Math.abs(sec) < lim) {
                const v = -Math.round(sec / div);
                if (rtf) return rtf.format(v, unit);
                return Math.abs(v) + ' ' + unit + (Math.abs(v) === 1 ? '' : 's') + ' ago';
            }
        }
        return '';
    }
    function fullDate(ts) {
        if (!ts) return '';
        try { return new Date(ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return ''; }
    }
    const plural = (n, one, many) => nf(n) + ' ' + (n === 1 ? one : many);

    /* ---------- markup ---------- */
    const MARKUP = `
<div class="ws-header lbr-header">
  <div class="ws-header-left lbr-title-wrap">
    ${ms('collections_bookmark', 'ws-header-icon')}
    <div class="lbr-title-text">
      <h2 class="ws-title" id="lbr-title">Library Browser</h2>
      <p class="ws-subtitle">Browse your prompts by tag, folder and category</p>
    </div>
  </div>
  <div class="lbr-search" role="search">
    ${ms('search', 'lbr-search-icon')}
    <input class="form-input lbr-search-input" id="lbr-search" type="search" autocomplete="off" spellcheck="false" placeholder="Search title, description, tags, folders" aria-label="Search your prompts">
    <button class="lbr-search-clear" type="button" data-act="clear-search" aria-label="Clear search" hidden>${ms('close')}</button>
  </div>
  <div class="ws-header-actions lbr-header-actions">
    <button class="icon-btn lbr-refresh" type="button" data-act="refresh" aria-label="Refresh data" title="Refresh data">${ms('refresh')}</button>
    <button class="btn lbr-close" type="button" data-act="close" aria-label="Close Library Browser">${ms('close')}<span>Close</span></button>
  </div>
</div>
<div class="lbr-tabbar">
  <div class="lbr-tabs" role="tablist" aria-label="Browse by" id="lbr-tabs">
    ${TABS.map(t => `<button class="lbr-tab" type="button" role="tab" id="lbr-tab-${t.id}" data-act="tab" data-tab="${t.id}" aria-controls="lbr-panel">${ms(t.icon)}<span class="lbr-tab-label">${t.label}</span><span class="lbr-mono lbr-tab-n" id="lbr-tab-n-${t.id}">0</span></button>`).join('')}
  </div>
</div>
<div class="lbr-panel" id="lbr-panel" role="tabpanel" aria-labelledby="lbr-tab-folders">
  <aside class="lbr-rail" id="lbr-rail" aria-label="Browse selection">
    <div class="lbr-rail-head" id="lbr-rail-head" hidden>
      <div class="lbr-rail-filter">
        ${ms('filter_list')}
        <input class="form-input lbr-rail-input" id="lbr-tagq" type="text" autocomplete="off" spellcheck="false" placeholder="Filter tags" aria-label="Filter tags">
      </div>
      <div class="lbr-seg" role="group" aria-label="Sort tags">
        <button type="button" data-act="tagsort" data-sort="count" aria-pressed="true">Count</button>
        <button type="button" data-act="tagsort" data-sort="name" aria-pressed="false">Name</button>
      </div>
    </div>
    <ul class="lbr-rail-list" id="lbr-rail-list"></ul>
  </aside>
  <section class="lbr-main" id="lbr-main" aria-label="Prompts">
    <div class="lbr-banner" id="lbr-banner" role="alert" hidden></div>
    <div class="lbr-overview" id="lbr-overview" hidden></div>
    <div class="lbr-main-head" id="lbr-main-head">
      <h3 class="lbr-count-head" id="lbr-count-head" aria-live="polite"></h3>
      <div class="lbr-seg" role="group" aria-label="Layout" id="lbr-layout">
        <button type="button" data-act="view" data-view="list" aria-pressed="true">${ms('view_list')}<span class="lbr-seg-t">List</span></button>
        <button type="button" data-act="view" data-view="grid" aria-pressed="false">${ms('grid_view')}<span class="lbr-seg-t">Grid</span></button>
      </div>
    </div>
    <div class="lbr-results" id="lbr-results">
      <ul class="lbr-list" id="lbr-list"></ul>
      <div class="lbr-more" id="lbr-more" hidden></div>
      <div class="lbr-state" id="lbr-state" hidden></div>
    </div>
  </section>
</div>`;

    /* ---------- rendering ---------- */
    function renderTabs() {
        TABS.forEach(t => {
            const b = $('#lbr-tab-' + t.id);
            const on = ui.tab === t.id;
            b.setAttribute('aria-selected', on ? 'true' : 'false');
            b.tabIndex = on ? 0 : -1;
            const n = !idx ? '' : t.id === 'folders' ? idx.fmap.size : t.id === 'categories' ? idx.cats.size : idx.tags.size;
            $('#lbr-tab-n-' + t.id).textContent = idx ? nf(n) : '';
        });
        $('#lbr-panel').setAttribute('aria-labelledby', 'lbr-tab-' + ui.tab);
        const head = $('#lbr-rail-head');
        head.hidden = ui.tab !== 'tags';
        $$('[data-act="tagsort"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.sort === ui.tagSort ? 'true' : 'false'));
        $$('[data-act="view"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === ui.view ? 'true' : 'false'));
        const tq = $('#lbr-tagq');
        if (tq.value !== ui.tagQ) tq.value = ui.tagQ;
        root.classList.toggle('lbr-grid-view', ui.view === 'grid');
    }

    function railButton(o) {
        const cur = o.active ? ' aria-current="true"' : '';
        return '<li class="lbr-rail-li"><button type="button" class="lbr-rail-item' + (o.active ? ' lbr-on' : '') + (o.dim ? ' lbr-dim' : '') + '" data-act="sel" data-t="' + o.t + '"' + (o.v != null ? ' data-v="' + esc(o.v) + '"' : '') + cur + ' style="--lbr-depth:' + (o.depth || 0) + '">' +
            ms(o.icon) + '<span class="lbr-rail-name">' + esc(o.name) + '</span><span class="lbr-mono lbr-rail-n">' + nf(o.n) + '</span></button></li>';
    }
    function renderRail() {
        const list = $('#lbr-rail-list');
        if (!idx) { list.innerHTML = ''; return; }
        const tab = ui.tab;
        const T = TABS.find(t => t.id === tab);
        const sel = ui.sel[tab];
        const noneN = tab === 'folders' ? idx.noFolder : tab === 'categories' ? idx.noCat : idx.noTag;
        const out = [];
        out.push(railButton({ t: 'all', icon: 'library_books', name: T.all, n: data.prompts.length, active: sel.t === 'all' }));
        out.push(railButton({ t: 'none', icon: T.noneIcon, name: T.none, n: noneN, active: sel.t === 'none', dim: noneN === 0 }));
        let total = 0, shown = 0;
        if (tab === 'folders') {
            total = idx.flat.length;
            idx.flat.slice(0, ui.railLimit).forEach(n => {
                shown++;
                out.push(railButton({ t: 'val', v: n.id, icon: n.kids.length ? 'folder_open' : 'folder', name: n.name, n: n.total, active: sel.t === 'val' && Number(sel.v) === n.id, depth: n.depth, dim: n.total === 0 }));
            });
        } else {
            const map = tab === 'categories' ? idx.cats : idx.tags;
            let rows = Array.from(map.entries());
            if (tab === 'tags' && ui.tagQ.trim()) {
                const q = ui.tagQ.trim().toLowerCase();
                rows = rows.filter(r => r[0].toLowerCase().indexOf(q) >= 0);
            }
            const byCount = tab === 'categories' || ui.tagSort === 'count';
            rows.sort(byCount ? (a, b) => (b[1] - a[1]) || byName(a[0], b[0]) : (a, b) => byName(a[0], b[0]));
            total = rows.length;
            rows.slice(0, ui.railLimit).forEach(r => {
                shown++;
                out.push(railButton({ t: 'val', v: r[0], icon: T.icon, name: r[0], n: r[1], active: sel.t === 'val' && sel.v === r[0] }));
            });
            if (!rows.length) {
                out.push('<li class="lbr-rail-empty">' + (tab === 'tags' && ui.tagQ.trim() ? 'No tag matches "' + esc(ui.tagQ.trim()) + '".' : tab === 'tags' ? 'No tags yet.' : 'No categories yet.') + '</li>');
            }
        }
        if (tab === 'folders' && !idx.flat.length) out.push('<li class="lbr-rail-empty">No folders yet.</li>');
        if (total > shown) {
            out.push('<li class="lbr-rail-li"><button type="button" class="lbr-rail-more" data-act="rail-more">Show more <span class="lbr-mono">' + nf(total - shown) + '</span> remaining</button></li>');
        }
        list.innerHTML = out.join('');
    }

    function renderOverview() {
        const el = $('#lbr-overview');
        const show = !!idx && data.prompts.length > 0 && ui.sel[ui.tab].t === 'all' && !words().length;
        el.hidden = !show;
        if (!show) { el.innerHTML = ''; return; }
        const cell = (label, n, act, tab, tone) => {
            const dead = n === 0 && tone === 'gap';
            return '<li class="lbr-ov-li"><button type="button" class="lbr-ov' + (tone === 'gap' ? ' lbr-ov-gap' : '') + '" data-act="' + act + '"' + (tab ? ' data-tab="' + tab + '"' : '') + (dead ? ' disabled' : '') + '>' +
                '<span class="lbr-mono lbr-ov-n">' + nf(n) + '</span><span class="lbr-ov-l">' + (tone === 'gap' && n > 0 ? '<i class="lbr-dot" aria-hidden="true"></i>' : '') + label + '</span></button></li>';
        };
        el.innerHTML = '<h3 class="lbr-label" id="lbr-ov-label">Library at a glance</h3><ul class="lbr-ov-list" aria-labelledby="lbr-ov-label">' +
            cell('Prompts', data.prompts.length, 'ov-all') +
            cell('Folders', idx.fmap.size, 'tab', 'folders') +
            cell('Categories', idx.cats.size, 'tab', 'categories') +
            cell('Tags', idx.tags.size, 'tab', 'tags') +
            cell('No folder', idx.noFolder, 'ov-none', 'folders', 'gap') +
            cell('No category', idx.noCat, 'ov-none', 'categories', 'gap') +
            cell('No tags', idx.noTag, 'ov-none', 'tags', 'gap') +
            '</ul>';
    }

    function countHeadHtml(n) {
        const tab = ui.tab, sel = ui.sel[tab];
        const num = '<span class="lbr-mono lbr-count-n">' + nf(n) + '</span> ';
        const noun = n === 1 ? 'prompt' : 'prompts';
        let tail = ' in your library';
        if (sel.t === 'none') tail = tab === 'folders' ? ' with no folder' : tab === 'categories' ? ' with no category' : ' with no tags';
        else if (sel.t === 'val') tail = tab === 'folders' ? ' in <em>' + esc(selLabel(tab, sel)) + '</em>' : tab === 'categories' ? ' in category <em>' + esc(sel.v) + '</em>' : ' tagged <em>' + esc(sel.v) + '</em>';
        const w = ui.q.trim() ? ' matching <em>' + esc(ui.q.trim()) + '</em>' : '';
        return num + noun + tail + w;
    }

    function chipHtml(kind, v, on) {
        return '<button type="button" class="lbr-chip lbr-chip-' + kind + (on ? ' lbr-chip-on' : '') + '" data-act="chip-' + kind + '" data-v="' + esc(v) + '" title="' + (kind === 'cat' ? 'Browse category ' : 'Browse tag ') + esc(v) + '"><span class="lbr-chip-in">' + (kind === 'tag' ? '<span class="lbr-hash" aria-hidden="true">#</span>' : '') + esc(v) + '</span></button>';
    }
    function itemHtml(p) {
        const f = p.fid != null ? idx.fmap.get(p.fid) : null;
        const selT = ui.sel.tags, selC = ui.sel.categories;
        const catsShown = p.cats.slice(0, MAX_CHIPS_CAT);
        const tagsShown = p.tags.slice(0, MAX_CHIPS_TAG);
        const catMore = p.cats.length - catsShown.length;
        const tagMore = p.tags.length - tagsShown.length;
        const chips = [];
        chips.push(f
            ? '<button type="button" class="lbr-folder" data-act="chip-folder" data-v="' + f.id + '" title="Browse folder ' + esc(f.name) + '">' + ms('folder') + '<span>' + esc(f.name) + '</span></button>'
            : '<span class="lbr-folder lbr-folder-none">' + ms('folder_off') + '<span>No folder</span></span>');
        catsShown.forEach(c => chips.push(chipHtml('cat', c, selC.t === 'val' && selC.v === c)));
        if (catMore > 0) chips.push('<span class="lbr-more-chip lbr-mono" title="' + esc(p.cats.slice(MAX_CHIPS_CAT).join(', ')) + '">+' + catMore + '</span>');
        tagsShown.forEach(t => chips.push(chipHtml('tag', t, selT.t === 'val' && selT.v === t)));
        if (tagMore > 0) chips.push('<span class="lbr-more-chip lbr-mono" title="' + esc(p.tags.slice(MAX_CHIPS_TAG).join(', ')) + '">+' + tagMore + '</span>');
        const pips = p.rating > 0
            ? '<span class="lbr-rating" role="img" aria-label="Rated ' + p.rating + ' out of 5" title="Rated ' + p.rating + ' out of 5">' + [1, 2, 3, 4, 5].map(i => '<i class="lbr-pip' + (i <= p.rating ? ' lbr-pip-on' : '') + '"></i>').join('') + '</span>'
            : '<span class="lbr-rating lbr-rating-none" title="Not rated"><span class="lbr-sr">Not rated</span></span>';
        const when = ago(p.ts);
        return '<li class="lbr-item" data-id="' + esc(p.id) + '">' +
            '<div class="lbr-item-main">' +
            '<h4 class="lbr-item-title"><button type="button" class="lbr-open" data-act="open" data-id="' + esc(p.id) + '" aria-label="Open prompt: ' + esc(p.title) + '">' +
            (p.fav ? '<span class="material-symbols-outlined lbr-fav" role="img" aria-label="Favourite">star</span>' : '') +
            '<span class="lbr-item-name">' + esc(p.title) + '</span></button></h4>' +
            (p.desc ? '<p class="lbr-desc">' + esc(p.desc) + '</p>' : '') +
            '</div>' +
            '<div class="lbr-meta">' + pips +
            '<span class="lbr-uses" title="Times used"><span class="lbr-mono">' + nf(p.uses) + '</span> ' + (p.uses === 1 ? 'use' : 'uses') + '</span>' +
            (when ? '<time class="lbr-when" datetime="' + esc(p.tsRaw) + '" title="Updated ' + esc(fullDate(p.ts)) + '">' + esc(when) + '</time>' : '') +
            '</div>' +
            '<div class="lbr-chips">' + chips.join('') + '</div></li>';
    }

    function stateHtml(kind) {
        const clear = '<button class="btn" type="button" data-act="clear-filters">' + ms('filter_alt_off') + '<span>Clear filters</span></button>';
        if (kind === 'loading') return '';
        if (kind === 'empty-library') return ms('collections_bookmark', 'lbr-state-icon') + '<h4 class="lbr-state-title">Your library is empty</h4><p class="lbr-state-text">Prompts you create or import will appear here, grouped by folder, category and tag. This screen only lets you look, nothing here can change your library.</p>';
        if (kind === 'no-results') return ms('search_off', 'lbr-state-icon') + '<h4 class="lbr-state-title">No prompts match</h4><p class="lbr-state-text">Nothing ' + (ui.sel[ui.tab].t === 'all' ? 'in your library' : 'in <em>' + esc(selLabel(ui.tab, ui.sel[ui.tab])) + '</em>') + ' matches <em>' + esc(ui.q.trim()) + '</em>. Try fewer words or clear the filters.</p>' + clear;
        const tab = ui.tab, sel = ui.sel[tab];
        const what = sel.t === 'none' ? (tab === 'folders' ? 'without a folder' : tab === 'categories' ? 'without a category' : 'without tags') : sel.t === 'val' ? (tab === 'folders' ? 'in ' + esc(selLabel(tab, sel)) : tab === 'categories' ? 'in category ' + esc(sel.v) : 'tagged ' + esc(sel.v)) : '';
        return ms(tab === 'folders' ? 'folder_open' : tab === 'categories' ? 'category' : 'sell', 'lbr-state-icon') + '<h4 class="lbr-state-title">Nothing here yet</h4><p class="lbr-state-text">There are no prompts ' + what + '. Pick another entry on the left or go back to every prompt.</p>' + clear;
    }

    function setBanner(msg, retry) {
        const b = $('#lbr-banner');
        if (!msg) { b.hidden = true; b.innerHTML = ''; return; }
        b.hidden = false;
        b.innerHTML = ms('error') + '<span class="lbr-banner-text">' + esc(msg) + '</span>' + (retry ? '<button class="btn lbr-btn-sm" type="button" data-act="refresh">' + ms('refresh') + '<span>Try again</span></button>' : '');
    }

    function renderList(append) {
        const list = $('#lbr-list'), more = $('#lbr-more'), st = $('#lbr-state'), head = $('#lbr-count-head');
        const results = $('#lbr-results');
        results.setAttribute('aria-busy', ui.state === 'loading' ? 'true' : 'false');
        $('#lbr-main-head').hidden = !idx && ui.state === 'error';
        // Loading with nothing to show yet: skeleton rows.
        if (!idx) {
            more.hidden = true;
            if (ui.state === 'error') {
                list.innerHTML = '';
                st.hidden = false;
                st.innerHTML = ms('cloud_off', 'lbr-state-icon') + '<h4 class="lbr-state-title">Could not load your prompts</h4><p class="lbr-state-text">' + esc(ui.error || 'Something went wrong.') + '</p><button class="btn" type="button" data-act="refresh">' + ms('refresh') + '<span>Try again</span></button>';
            } else {
                st.hidden = true; st.innerHTML = '';
                head.textContent = 'Loading your prompts';
                list.innerHTML = Array.from({ length: 6 }, () => '<li class="lbr-item lbr-skel" aria-hidden="true"><div class="lbr-skel-a"></div><div class="lbr-skel-b"></div><div class="lbr-skel-c"></div></li>').join('');
            }
            return;
        }
        const matched = computeMatches();
        head.innerHTML = countHeadHtml(matched.length);
        if (!matched.length) {
            list.innerHTML = '';
            more.hidden = true; more.innerHTML = '';
            ui.shown = 0;
            st.hidden = false;
            st.innerHTML = stateHtml(!data.prompts.length ? 'empty-library' : words().length ? 'no-results' : 'empty-folder');
            return;
        }
        st.hidden = true; st.innerHTML = '';
        const end = Math.min(ui.limit, matched.length);
        const from = append ? ui.shown : 0;
        const html = matched.slice(from, end).map(itemHtml).join('');
        if (append) list.insertAdjacentHTML('beforeend', html); else list.innerHTML = html;
        ui.shown = end;
        const left = matched.length - end;
        if (left > 0) {
            more.hidden = false;
            more.innerHTML = '<button class="btn" type="button" data-act="more">Show ' + '<span class="lbr-mono">' + nf(Math.min(PAGE, left)) + '</span> more</button><span class="lbr-more-note lbr-mono">' + nf(end) + ' of ' + nf(matched.length) + '</span>';
        } else { more.hidden = true; more.innerHTML = ''; }
    }

    // Every piece renders on its own so one failure shows an inline message and never blanks the screen.
    function safe(name, fn) {
        try { fn(); return true; } catch (e) {
            console.warn('Library Browser ' + name + ' failed:', e);
            setBanner('Part of this screen could not be drawn (' + name + '). Try refreshing.', true);
            return false;
        }
    }
    function renderAll() {
        if (!root || !mounted) return;
        safe('tabs', renderTabs);
        safe('rail', renderRail);
        safe('overview', renderOverview);
        safe('list', () => renderList(false));
        const refresh = $('.lbr-refresh');
        refresh.disabled = ui.state === 'loading';
        refresh.classList.toggle('lbr-spin', ui.state === 'loading');
        const clearBtn = $('[data-act="clear-search"]');
        clearBtn.hidden = !ui.q;
    }

    /* ---------- loading ---------- */
    async function getJson(url) {
        const ctl = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = ctl ? setTimeout(() => ctl.abort(), FETCH_MS) : 0;
        try {
            const r = await fetch(url, ctl ? { signal: ctl.signal, headers: { Accept: 'application/json' } } : undefined);
            if (!r.ok) throw new Error(url + ' answered ' + r.status);
            return await r.json();
        } finally { if (timer) clearTimeout(timer); }
    }
    async function load() {
        const my = ++loadToken;
        ui.state = 'loading';
        if (idx) setBanner('');
        renderAll();
        try {
            const [prompts, folders, filters] = await Promise.all([
                getJson('/api/prompts'),
                getJson('/api/folders'),
                getJson('/api/prompts/filters').catch(() => null)
            ]);
            if (my !== loadToken) return;
            if (!Array.isArray(prompts)) throw new Error('The prompt list came back in an unexpected shape');
            if (!Array.isArray(folders)) throw new Error('The folder list came back in an unexpected shape');
            data.prompts = prompts.map(slim);
            data.folders = folders;
            data.filters = filters && typeof filters === 'object' ? filters : null;
            buildIndex();
            validateSel();
            data.loaded = true;
            ui.state = 'ready';
            ui.error = '';
            setBanner('');
        } catch (e) {
            if (my !== loadToken) return;
            ui.state = 'error';
            ui.error = (e && e.name === 'AbortError') ? 'The library took too long to answer.' : 'The library could not be read (' + (e && e.message ? e.message : 'unknown error') + ').';
            if (idx) setBanner(ui.error + ' Showing what was loaded earlier.', true);
        }
        renderAll();
    }

    /* ---------- actions ---------- */
    function resetPaging() { ui.limit = PAGE; ui.railLimit = RAIL_PAGE; ui.shown = 0; }
    function setSel(tab, sel, jump) {
        ui.sel[tab] = sel;
        ui.tab = tab;
        resetPaging();
        savePrefs();
        renderAll();
        const m = $('#lbr-main'); if (m) m.scrollTop = 0;
        if (jump) {
            const on = $('.lbr-rail-item.lbr-on');
            if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
        }
    }
    function setTab(tab, focus) {
        if (!TABS.some(t => t.id === tab) || ui.tab === tab) { if (focus) $('#lbr-tab-' + tab).focus(); return; }
        ui.tab = tab;
        resetPaging();
        savePrefs();
        renderAll();
        const m = $('#lbr-main'); if (m) m.scrollTop = 0;
        if (focus) $('#lbr-tab-' + tab).focus();
    }
    function setSearch(v, immediate) {
        ui.q = v;
        resetPaging();
        clearTimeout(searchTimer);
        const run = () => {
            safe('overview', renderOverview);
            safe('list', () => renderList(false));
            $('[data-act="clear-search"]').hidden = !ui.q;
            const m = $('#lbr-main'); if (m) m.scrollTop = 0;
        };
        $('[data-act="clear-search"]').hidden = !ui.q;
        if (immediate) run(); else searchTimer = setTimeout(run, 120);
    }
    function clearFilters() {
        const input = $('#lbr-search');
        input.value = '';
        ui.q = '';
        ui.sel[ui.tab] = { t: 'all' };
        resetPaging();
        renderAll();
        input.focus();
    }
    function openPrompt(id) {
        if (typeof window.PL_openDetail !== 'function') { toast('This prompt cannot be opened from here right now', 'error'); return; }
        closeWorkspace(true);
        try {
            const r = window.PL_openDetail(isNaN(Number(id)) ? id : Number(id));
            if (r && typeof r.catch === 'function') r.catch(e => { console.warn('Library Browser open failed:', e); toast('That prompt could not be opened', 'error'); });
        } catch (e) { console.warn('Library Browser open failed:', e); toast('That prompt could not be opened', 'error'); }
    }

    function onClick(e) {
        const t = e.target.closest ? e.target.closest('[data-act]') : null;
        if (!t || !root.contains(t) || t.disabled) {
            // A click on the body of a row opens it, unless the user was selecting text.
            const item = e.target.closest && e.target.closest('.lbr-item[data-id]');
            if (item && !e.target.closest('button, a, input') && !String(window.getSelection && window.getSelection()).length) openPrompt(item.dataset.id);
            return;
        }
        const act = t.dataset.act;
        switch (act) {
            case 'close': closeWorkspace(); break;
            case 'refresh': load(); break;
            case 'tab': setTab(t.dataset.tab); break;
            case 'sel': {
                const tab = ui.tab;
                const v = t.dataset.v;
                if (t.dataset.t === 'val') setSel(tab, { t: 'val', v: tab === 'folders' ? Number(v) : v });
                else setSel(tab, { t: t.dataset.t });
                break;
            }
            case 'ov-all': setSel(ui.tab, { t: 'all' }); break;
            case 'ov-none': setSel(t.dataset.tab, { t: 'none' }, true); break;
            case 'chip-cat': setSel('categories', { t: 'val', v: t.dataset.v }, true); break;
            case 'chip-tag': setSel('tags', { t: 'val', v: t.dataset.v }, true); break;
            case 'chip-folder': setSel('folders', { t: 'val', v: Number(t.dataset.v) }, true); break;
            case 'tagsort': ui.tagSort = t.dataset.sort === 'name' ? 'name' : 'count'; ui.railLimit = RAIL_PAGE; savePrefs(); renderTabs(); renderRail(); break;
            case 'view': ui.view = t.dataset.view === 'grid' ? 'grid' : 'list'; savePrefs(); renderTabs(); break;
            case 'rail-more': ui.railLimit += RAIL_PAGE; renderRail(); break;
            case 'more': {
                const before = ui.shown;
                ui.limit += PAGE;
                safe('list', () => renderList(true));
                const first = $$('.lbr-item', $('#lbr-list'))[before];
                const btn = first && first.querySelector('.lbr-open');
                if (btn) btn.focus({ preventScroll: false });
                break;
            }
            case 'clear-search': { const i = $('#lbr-search'); i.value = ''; setSearch('', true); i.focus(); break; }
            case 'clear-filters': clearFilters(); break;
            case 'open': openPrompt(t.dataset.id); break;
            default: break;
        }
    }

    function bind() {
        root.addEventListener('click', onClick);
        root.addEventListener('input', e => {
            if (e.target.id === 'lbr-search') setSearch(e.target.value, false);
            else if (e.target.id === 'lbr-tagq') { ui.tagQ = e.target.value; ui.railLimit = RAIL_PAGE; safe('rail', renderRail); }
        });
        root.addEventListener('keydown', e => {
            const tl = e.target.closest && e.target.closest('[role="tablist"]');
            if (tl && ['ArrowRight', 'ArrowLeft', 'Home', 'End'].indexOf(e.key) >= 0) {
                const ids = TABS.map(t => t.id);
                const i = ids.indexOf(ui.tab);
                let n = i;
                if (e.key === 'ArrowRight') n = (i + 1) % ids.length;
                else if (e.key === 'ArrowLeft') n = (i + ids.length - 1) % ids.length;
                else if (e.key === 'Home') n = 0;
                else n = ids.length - 1;
                e.preventDefault();
                setTab(ids[n], true);
            }
        });
    }

    function mount() {
        if (mounted) return;
        root.innerHTML = MARKUP;
        mounted = true;
        bind();
    }

    /* ---------- open and close ---------- */
    function closeWorkspace(skipFocus) {
        if (!root) return;
        clearTimeout(searchTimer);
        loadToken++;
        root.classList.remove('open');
        document.querySelectorAll('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
        if (!skipFocus && opener && opener.isConnected && typeof opener.focus === 'function') { try { opener.focus(); } catch (e) { /* ignore */ } }
        opener = null;
    }
    function ensureRoot() {
        root = document.getElementById(ROOT_ID);
        if (!root) {
            root = document.createElement('div');
            root.id = ROOT_ID;
            root.setAttribute('role', 'region');
            root.setAttribute('aria-label', 'Library Browser');
            document.body.appendChild(root);
        }
        return root;
    }
    window.openLibraryBrowserWorkspace = function () {
        ensureRoot();
        mount();
        opener = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
        ui.q = ''; ui.tagQ = ''; resetPaging();
        const input = $('#lbr-search');
        input.value = '';
        root.classList.add('open');
        document.querySelectorAll('.nav-item[data-view]').forEach(el => el.classList.remove('active'));
        root.setAttribute('tabindex', '-1');
        load();
        root.focus({ preventScroll: true });
    };
    window.PL_closeLibraryBrowser = function () { closeWorkspace(); };
    Object.defineProperty(window, '__lbr', { configurable: true, get: () => ({ ui, data, idx }) });

    // Escape steps back out: a filter text first, then the search text, then the workspace. It ignores everything while closed.
    document.addEventListener('keydown', e => {
        if (!isOpen() || e.key !== 'Escape' || e.defaultPrevented) return;
        if (e.target !== document.body && !root.contains(e.target)) return;
        if (ui.tagQ) { ui.tagQ = ''; ui.railLimit = RAIL_PAGE; const q = $('#lbr-tagq'); q.value = ''; safe('rail', renderRail); e.preventDefault(); return; }
        if (ui.q) { const i = $('#lbr-search'); i.value = ''; setSearch('', true); e.preventDefault(); return; }
        e.preventDefault();
        closeWorkspace();
    });

    // The root exists from load so index.html needs no markup. Its contents are built on first open.
    function init() { try { ensureRoot(); } catch (e) { console.warn('Library Browser could not create its root:', e); } }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
