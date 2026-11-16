/* Workspace picker: the full screen dashboard for choosing a workspace.
   Reads everything from window.PLWS (workspace-registry.js). Previews come from window.PLWS_PREVIEW when it exists.
   Root element #wsPickerOverlay is filled once on first open. Every id and class is prefixed wsp (ids wsp) and lives inside it.
   Opens with window.PL_openWorkspacePicker(opts) or Ctrl+Shift+K (Cmd+Shift+K on a Mac). Closes with window.PL_closeWorkspacePicker(). */
(function () {
    'use strict';
    const ROOT_ID = 'wsPickerOverlay';
    const TABS = [
        { id: 'tags', label: 'Tags', icon: 'sell', kind: 'tag', plural: 'tags' },
        { id: 'categories', label: 'Categories', icon: 'category', kind: 'category', plural: 'categories' },
        { id: 'folders', label: 'Folders', icon: 'folder', kind: 'folder', plural: 'folders' }
    ];
    const NONE = '__none';
    const PALETTE = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'teal', 'cyan', 'blue', 'indigo', 'purple', 'pink', 'violet', 'magenta', 'fuchsia', 'rose', 'lavender'];
    const SWATCHES = PALETTE.slice(0, 12);
    const NONE_LABEL = { categories: 'Uncategorised', tags: 'No tags', folders: 'Unfiled' };
    const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const ms = (name, cls) => '<span class="material-symbols-outlined' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + esc(name) + '</span>';
    const colourOf = n => (PALETTE.indexOf(n) >= 0 ? n : 'teal');
    const chipVars = n => '--chip-c:var(--c-' + colourOf(n) + ');--chip-soft:var(--c-' + colourOf(n) + '-soft)';
    const attr = k => String(k).replace(/["\\]/g, '\\$&');
    const norm = s => String(s || '').toLowerCase().trim();
    const isMac = /Mac|iPhone|iPad/i.test((navigator.platform || '') + ' ' + (navigator.userAgent || ''));
    const isTouch = () => !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    const st = {
        open: false, tab: 'categories', filter: { tags: 'all', categories: 'all', folders: 'all' }, q: '',
        railOpen: false, opener: null, menuBtn: null, layer: null, dragId: null, raf: 0, dirty: {}
    };
    const previewCache = new Map();
    let root = null, shell = null, railEl = null, mainEl = null, tabsEl = null, panelEl = null, layerEl = null, menuEl = null, liveEl = null, searchEl = null;

    /* ---------- small helpers ---------- */
    const P = () => window.PLWS;
    const premium = () => document.body.classList.contains('is-premium');
    const toast = (msg, kind) => { if (typeof window.PL_toast === 'function') { try { window.PL_toast(msg, kind || 'info'); } catch (e) { /* toast is optional */ } } };
    function say(msg, kind) {
        if (liveEl) { liveEl.textContent = ''; setTimeout(() => { if (liveEl) liveEl.textContent = msg; }, 30); }
        toast(msg, kind);
    }
    function ago(t) {
        const s = Math.max(0, (Date.now() - t) / 1000);
        if (s < 60) return 'just now';
        const m = Math.floor(s / 60);
        if (m < 60) return m + ' min ago';
        const h = Math.floor(m / 60);
        if (h < 24) return h + ' h ago';
        const d = Math.floor(h / 24);
        if (d < 7) return d + ' d ago';
        try { return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return d + ' d ago'; }
    }
    const kindOfTab = tab => (TABS.find(t => t.id === tab) || TABS[1]).kind;
    const listOf = kind => (kind === 'tag' ? P().tags() : kind === 'category' ? P().categories() : P().folders());
    const byId = (list, id) => list.find(x => x.id === id) || null;
    const validTab = t => (TABS.some(x => x.id === t) ? t : null);

    /* ---------- folder tree ---------- */
    function foldersCollapsed() { const v = P().ui('wsp.fc'); return new Set(Array.isArray(v) ? v : []); }
    function folderKids() {
        const fs = P().folders(), ids = new Set(fs.map(f => f.id)), kids = new Map();
        fs.forEach(f => {
            const p = f.parentId && ids.has(f.parentId) && f.parentId !== f.id ? f.parentId : '';
            if (!kids.has(p)) kids.set(p, []);
            kids.get(p).push(f);
        });
        return kids;
    }
    function folderTree() {
        const kids = folderKids(), col = foldersCollapsed(), seen = new Set(), out = [];
        (function walk(p, depth, hidden) {
            (kids.get(p) || []).forEach(f => {
                if (seen.has(f.id)) return;
                seen.add(f.id);
                const k = kids.get(f.id) || [];
                out.push({ f, depth, hasKids: k.length > 0, hidden, collapsed: col.has(f.id) });
                walk(f.id, depth + 1, hidden || col.has(f.id));
            });
        })('', 0, false);
        P().folders().forEach(f => { if (!seen.has(f.id)) out.push({ f, depth: 0, hasKids: false, hidden: false, collapsed: false }); });
        return out;
    }
    function folderSet(id) {
        const kids = folderKids(), out = new Set([id]), queue = [id];
        while (queue.length) { (kids.get(queue.pop()) || []).forEach(f => { if (!out.has(f.id)) { out.add(f.id); queue.push(f.id); } }); }
        return out;
    }
    function folderPath(id) {
        const fs = P().folders(), names = [];
        let cur = byId(fs, id), guard = 0;
        while (cur && guard++ < 12) { names.unshift(cur.name); cur = cur.parentId ? byId(fs, cur.parentId) : null; }
        return names.join(' / ');
    }

    /* ---------- data for the current view ---------- */
    function orgMap() { const m = new Map(); P().catalog().forEach(w => m.set(w.id, P().orgOf(w.id))); return m; }
    function matchesFilter(org, tab, f, fset) {
        if (f === 'all') return true;
        if (tab === 'categories') return f === NONE ? !org.category : org.category === f;
        if (tab === 'tags') return f === NONE ? org.tags.length === 0 : org.tags.indexOf(f) >= 0;
        if (f === NONE) return !org.folder;
        return !!org.folder && fset.has(org.folder);
    }
    function normaliseFilter() {
        TABS.forEach(t => {
            const f = st.filter[t.id];
            if (f === 'all' || f === NONE) return;
            if (!byId(listOf(t.kind), f)) st.filter[t.id] = 'all';
        });
    }
    function filtered() {
        const tab = st.tab, f = st.filter[tab], orgs = orgMap(), fset = tab === 'folders' && f !== 'all' && f !== NONE ? folderSet(f) : null;
        const q = norm(st.q), cats = P().categories(), tags = P().tags();
        return P().catalog().filter(w => {
            const o = orgs.get(w.id);
            if (!matchesFilter(o, tab, f, fset)) return false;
            if (!q) return true;
            const cat = byId(cats, o.category);
            const hay = [w.name, w.desc, cat ? cat.name : '', o.tags.map(t => (byId(tags, t) || {}).name || '').join(' ')].join(' ').toLowerCase();
            return q.split(/\s+/).every(part => hay.indexOf(part) >= 0);
        });
    }
    function counts(tab) {
        const orgs = orgMap(), cat = P().catalog(), out = { all: cat.length, none: 0, by: {} };
        if (tab === 'folders') {
            P().folders().forEach(f => {
                const set = folderSet(f.id);
                out.by[f.id] = cat.filter(w => { const o = orgs.get(w.id).folder; return o && set.has(o); }).length;
            });
        } else {
            cat.forEach(w => {
                const o = orgs.get(w.id);
                if (tab === 'categories') { if (o.category) out.by[o.category] = (out.by[o.category] || 0) + 1; }
                else o.tags.forEach(t => { out.by[t] = (out.by[t] || 0) + 1; });
            });
        }
        cat.forEach(w => {
            const o = orgs.get(w.id);
            if ((tab === 'categories' && !o.category) || (tab === 'tags' && !o.tags.length) || (tab === 'folders' && !o.folder)) out.none++;
        });
        return out;
    }

    /* ---------- previews (isolated: the only place that touches PLWS_PREVIEW) ---------- */
    function previewHtml(id, variant) {
        const size = variant === 'featured' ? 'lg' : 'sm';
        const key = id + '|' + size;
        if (previewCache.has(key)) return previewCache.get(key);
        let out = '';
        try {
            const api = window.PLWS_PREVIEW;
            if (api && typeof api.html === 'function') {
                const h = api.html(id, { size });
                out = typeof h === 'string' ? h : (h && h.outerHTML) || '';
            }
        } catch (e) { out = ''; }
        if (!out) {
            const w = P().get(id), cat = byId(P().categories(), P().orgOf(id).category);
            out = '<span class="wsp-prev-ph" style="' + chipVars(cat ? cat.color : 'teal') + '">' + ms((w && w.icon) || 'grid_view') + '</span>';
        } else previewCache.set(key, out);
        return out;
    }

    /* ---------- card ---------- */
    function chip(name, colour, cls) { return '<span class="wsp-chip' + (cls ? ' ' + cls : '') + '" style="' + chipVars(colour) + '"><span class="wsp-chip-dot" aria-hidden="true"></span>' + esc(name) + '</span>'; }
    function cardHtml(w, variant, section, ctx) {
        const o = ctx.orgs.get(w.id), cat = byId(ctx.cats, o.category);
        const tags = o.tags.map(t => byId(ctx.tags, t)).filter(Boolean);
        const cur = ctx.current === w.id, fav = P().isFav(w.id), gated = w.pro && !ctx.premium;
        const opened = ctx.opened.get(w.id);
        const label = w.name + ', ' + (cat ? cat.name : 'Uncategorised');
        const shown = tags.slice(0, 3);
        const draggable = st.tab === 'folders' ? ' draggable="true"' : '';
        return '<div class="wsp-tile wsp-tile-' + variant + '" data-id="' + esc(w.id) + '"' + (cur ? ' data-current="true"' : '') + draggable + '>' +
            '<button type="button" class="wsp-card" data-act="open" data-id="' + esc(w.id) + '" data-fk="card:' + section + ':' + esc(w.id) + '" aria-label="' + esc(label) + '"' + (cur ? ' aria-current="true"' : '') + '>' +
                '<span class="wsp-prev" aria-hidden="true">' + previewHtml(w.id, variant) + '<span class="wsp-open-hint">Open ' + ms('arrow_outward') + '</span></span>' +
                (cur ? '<span class="wsp-flag">Current</span>' : '') +
                '<span class="wsp-card-body">' +
                    '<span class="wsp-card-head">' + ms(w.icon || 'grid_view', 'wsp-card-icon') + '<span class="wsp-card-name">' + esc(w.name) + '</span>' +
                        (gated ? '<span class="wsp-pro">' + ms('lock') + 'PRO</span>' : '') + '</span>' +
                    '<span class="wsp-desc">' + esc(w.desc) + '</span>' +
                    '<span class="wsp-chips">' + (cat ? chip(cat.name, cat.color, 'wsp-chip-cat') : '') + shown.map(t => chip(t.name, t.color)).join('') +
                        (tags.length > 3 ? '<span class="wsp-chip wsp-chip-more wsp-mono">+' + (tags.length - 3) + '</span>' : '') + '</span>' +
                    '<span class="wsp-meta wsp-mono">' + (opened ? 'Opened ' + esc(ago(opened)) : 'Not opened yet') + '</span>' +
                '</span>' +
            '</button>' +
            '<div class="wsp-actions">' +
                '<button type="button" class="wsp-act" data-act="organise" data-id="' + esc(w.id) + '" data-fk="org:' + section + ':' + esc(w.id) + '" aria-label="Organise ' + esc(w.name) + ': move to a folder, set category and tags" title="Organise">' + ms('drive_file_move') + '</button>' +
                '<button type="button" class="wsp-act wsp-fav" data-act="fav" data-id="' + esc(w.id) + '" data-fk="fav:' + section + ':' + esc(w.id) + '" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Remove ' : 'Add ') + esc(w.name) + (fav ? ' from favourites' : ' to favourites') + '" title="' + (fav ? 'Remove from favourites' : 'Add to favourites') + '">' + ms('star') + '</button>' +
            '</div>' +
        '</div>';
    }
    function context() {
        const opened = new Map();
        P().data().recent.forEach(r => { if (!opened.has(r.id)) opened.set(r.id, r.at); });
        return { orgs: orgMap(), cats: P().categories(), tags: P().tags(), current: P().current(), premium: premium(), opened };
    }

    /* ---------- main area ---------- */
    function secHead(title, count, key, collapsed) {
        const inner = '<span class="wsp-sec-title">' + esc(title) + '</span><span class="wsp-count wsp-mono">' + count + '</span>';
        if (!key) return '<div class="wsp-sec-head">' + inner + '</div>';
        return '<h3 class="wsp-sec-head"><button type="button" class="wsp-sec-toggle" data-act="sec" data-key="' + key + '" data-fk="sec:' + key + '" aria-expanded="' + !collapsed + '" aria-controls="wspSec-' + key + '">' +
            ms('expand_more', 'wsp-sec-chev') + inner + '</button></h3>';
    }
    function rowSection(key, title, list, ctx, emptyHtml) {
        const collapsed = !!P().ui('wsp.sec.' + key);
        return '<section class="wsp-sec" aria-label="' + esc(title) + '">' + secHead(title, list.length, key, collapsed) +
            '<div class="wsp-sec-body" id="wspSec-' + key + '"' + (collapsed ? ' hidden' : '') + '>' +
            (list.length ? '<div class="wsp-grid wsp-grid-featured">' + list.map(w => cardHtml(w, 'featured', key, ctx)).join('') + '</div>' : emptyHtml) +
            '</div></section>';
    }
    function emptyState(kind) {
        const tab = st.tab, f = st.filter[tab], q = norm(st.q);
        if (!q && tab === 'folders' && f !== 'all' && f !== NONE) {
            return '<div class="wsp-empty" role="status">' + ms('folder_open', 'wsp-empty-icon') + '<h4>This folder is empty</h4><p>Drag a workspace card onto this folder in the list on the left, or use Organise on a card.</p></div>';
        }
        if (!q && f !== 'all' && tab !== 'folders') {
            return '<div class="wsp-empty" role="status">' + ms(tab === 'tags' ? 'sell' : 'category', 'wsp-empty-icon') + '<h4>Nothing here yet</h4><p>No workspaces use this ' + kindOfTab(tab) + '. Use Organise on a card to add one.</p>' +
                '<button type="button" class="wsp-btn" data-act="clear-filters" data-fk="empty:clear">Clear filters</button></div>';
        }
        return '<div class="wsp-empty" role="status">' + ms('search_off', 'wsp-empty-icon') + '<h4>No workspaces match</h4><p>' + (q ? 'Try a different word, or clear the filters.' : 'Clear the filters to see everything.') + '</p>' +
            '<button type="button" class="wsp-btn" data-act="clear-filters" data-fk="empty:clear">Clear filters</button></div>';
    }
    function resultsTitle() {
        if (norm(st.q)) return 'Search results';
        const tab = st.tab, f = st.filter[tab];
        if (f === 'all') return 'All workspaces';
        if (f === NONE) return NONE_LABEL[tab];
        const it = byId(listOf(kindOfTab(tab)), f);
        return it ? it.name : 'All workspaces';
    }
    function renderMain() {
        const top = mainEl.scrollTop, ctx = context(), list = filtered();
        const rows = !norm(st.q) && st.filter[st.tab] === 'all';
        let h = '';
        if (rows) {
            const recent = P().recent(4).map(r => r.w);
            if (recent.length) h += rowSection('recent', 'Recent', recent, ctx, '');
            const favs = P().favourites();
            h += rowSection('fav', 'Favourites', favs, ctx, '<p class="wsp-hint">' + ms('star') + 'Star a workspace to keep it here.</p>');
        }
        h += '<section class="wsp-sec" aria-label="' + esc(resultsTitle()) + '">' + secHead(resultsTitle(), list.length, '', false) +
            (list.length ? '<div class="wsp-grid">' + list.map(w => cardHtml(w, 'standard', 'all', ctx)).join('') + '</div>' : emptyState()) + '</section>';
        mainEl.innerHTML = h;
        mainEl.scrollTop = top;
    }

    /* ---------- rail ---------- */
    function railRow(o) {
        const acts = o.manage ? '<span class="wsp-rail-acts">' +
            '<button type="button" class="wsp-mini" data-act="rename" data-kind="' + o.kind + '" data-id="' + esc(o.id) + '" data-fk="ren:' + esc(o.id) + '" aria-label="Rename ' + o.kind + ' ' + esc(o.name) + '" title="Rename">' + ms('edit') + '</button>' +
            '<button type="button" class="wsp-mini" data-act="delete" data-kind="' + o.kind + '" data-id="' + esc(o.id) + '" data-fk="del:' + esc(o.id) + '" aria-label="Delete ' + o.kind + ' ' + esc(o.name) + '" title="Delete">' + ms('delete') + '</button></span>' : '';
        const lead = o.icon ? ms(o.icon, 'wsp-rail-icon') : o.none ? '<span class="wsp-dot wsp-dot-none" aria-hidden="true"></span>' : '<span class="wsp-dot" style="' + chipVars(o.colour) + '" aria-hidden="true"></span>';
        const drop = o.drop ? ' data-drop="true" data-folder-id="' + esc(o.id === NONE ? '' : o.id) + '"' : '';
        const exp = o.depthMode ? (o.hasKids ? '<button type="button" class="wsp-exp" data-act="fold" data-id="' + esc(o.id) + '" data-fk="fold:' + esc(o.id) + '" aria-expanded="' + !o.collapsed + '" aria-label="' + (o.collapsed ? 'Expand ' : 'Collapse ') + esc(o.name) + '">' + ms('expand_more') + '</button>' : '<span class="wsp-exp-gap"></span>') : '';
        return '<div class="wsp-rail-row' + (o.sel ? ' is-sel' : '') + (o.hidden ? ' wsp-fold-hidden' : '') + '" style="--depth:' + (o.depth || 0) + '"' + drop + '>' + exp +
            '<button type="button" class="wsp-rail-main" data-act="filter" data-id="' + esc(o.id) + '" data-fk="flt:' + esc(o.id) + '" aria-pressed="' + !!o.sel + '">' +
                lead + '<span class="wsp-rail-name">' + esc(o.name) + '</span><span class="wsp-rail-count wsp-mono">' + o.count + '</span></button>' + acts + '</div>';
    }
    function renderRail() {
        const tab = st.tab, t = TABS.find(x => x.id === tab), kind = t.kind, f = st.filter[tab], c = counts(tab);
        let rows = railRow({ id: 'all', name: 'All workspaces', count: c.all, icon: 'apps', sel: f === 'all' });
        const items = listOf(kind);
        if (tab === 'folders') {
            folderTree().forEach(n => {
                rows += railRow({ id: n.f.id, name: n.f.name, count: c.by[n.f.id] || 0, icon: n.collapsed ? 'folder' : 'folder_open', kind, manage: true, drop: true, sel: f === n.f.id, depth: n.depth, depthMode: true, hasKids: n.hasKids, collapsed: n.collapsed, hidden: n.hidden });
            });
        } else {
            items.forEach(it => { rows += railRow({ id: it.id, name: it.name, count: c.by[it.id] || 0, colour: it.color, kind, manage: true, sel: f === it.id }); });
        }
        if (c.none > 0 || f === NONE) rows += railRow({ id: NONE, name: NONE_LABEL[tab], count: c.none, none: tab !== 'folders', icon: tab === 'folders' ? 'folder_off' : '', drop: tab === 'folders', sel: f === NONE });
        const empty = items.length ? '' : '<div class="wsp-rail-empty">' + ms(t.icon, 'wsp-empty-icon') + '<p class="wsp-rail-empty-title">No ' + t.plural + ' yet</p><p>' +
            (tab === 'tags' ? 'Tags group workspaces by what they do.' : tab === 'categories' ? 'Categories sort workspaces by job.' : 'Folders keep related workspaces together. Drag a card onto one to file it.') +
            '</p><button type="button" class="wsp-btn" data-act="new-kind" data-kind="' + kind + '" data-fk="rail:empty-new">' + ms('add') + 'Create ' + kind + '</button></div>';
        railEl.innerHTML = '<div class="wsp-rail-head"><span class="wsp-label">' + esc(t.label) + ' <span class="wsp-count wsp-mono">' + items.length + '</span></span>' +
            '<button type="button" class="wsp-new" data-act="new-menu" data-fk="rail:new" aria-haspopup="menu" aria-expanded="' + !!st.menuBtn + '">' + ms('add') + '<span>New</span></button></div>' +
            '<div class="wsp-rail-list" role="group" aria-label="Filter by ' + esc(t.label.toLowerCase()) + '">' + rows + empty + '</div>';
    }
    function syncTabs() {
        const lab = document.getElementById('wspTabs');
        TABS.forEach(t => {
            const b = lab.querySelector('[data-tab="' + t.id + '"]');
            if (!b) return;
            const on = t.id === st.tab;
            b.setAttribute('aria-selected', on);
            b.tabIndex = on ? 0 : -1;
            b.querySelector('.wsp-tab-count').textContent = listOf(t.kind).length;
        });
        panelEl.setAttribute('aria-labelledby', 'wspTab-' + st.tab);
        panelEl.dataset.rail = st.railOpen ? 'open' : 'closed';
        const fb = root.querySelector('.wsp-filters-btn');
        if (fb) fb.setAttribute('aria-expanded', st.railOpen);
    }
    function syncSub() {
        const n = P().catalog().length;
        root.querySelector('#wspSub').innerHTML = '<span class="wsp-mono">' + n + '</span> workspaces';
        const clr = root.querySelector('.wsp-search-clear');
        if (clr) clr.hidden = !st.q;
    }
    function keepFocus(fn) {
        const a = document.activeElement, k = a && shell && shell.contains(a) ? a.dataset.fk : null;
        fn();
        if (k) { const n = root.querySelector('[data-fk="' + attr(k) + '"]'); if (n) n.focus({ preventScroll: true }); }
    }
    function renderAll() { normaliseFilter(); syncTabs(); renderRail(); renderMain(); syncSub(); }
    function flush() {
        st.raf = 0;
        const d = st.dirty; st.dirty = {};
        if (!st.open) return;
        normaliseFilter();
        keepFocus(() => { syncTabs(); if (d.rail) renderRail(); if (d.main) renderMain(); syncSub(); });
        if (st.layer && typeof st.layer.refresh === 'function') st.layer.refresh();
    }
    function schedule(flags) { Object.assign(st.dirty, flags); if (!st.raf) st.raf = requestAnimationFrame(flush); }

    /* ---------- state changes ---------- */
    function setTab(id, focus) {
        if (!validTab(id) || id === st.tab) return;
        st.tab = id;
        P().ui('wsp.tab', id);
        closeMenu();
        renderAll();
        if (focus) { const b = document.getElementById('wspTab-' + id); if (b) b.focus(); }
    }
    function setFilter(id) {
        st.filter[st.tab] = id;
        st.railOpen = false;
        keepFocus(() => { syncTabs(); renderRail(); renderMain(); });
        mainEl.scrollTop = 0;
    }
    function clearFilters() {
        st.q = ''; searchEl.value = '';
        TABS.forEach(t => { st.filter[t.id] = 'all'; });
        keepFocus(() => { syncTabs(); renderRail(); renderMain(); syncSub(); });
    }
    function toggleSection(key) {
        P().ui('wsp.sec.' + key, !P().ui('wsp.sec.' + key));
        keepFocus(renderMain);
    }
    function toggleFold(id) {
        const set = foldersCollapsed();
        if (set.has(id)) set.delete(id); else set.add(id);
        P().ui('wsp.fc', Array.from(set));
        keepFocus(renderRail);
    }
    function toggleFav(id) {
        const w = P().get(id); if (!w) return;
        const on = P().toggleFav(id);
        say((on ? 'Added ' : 'Removed ') + w.name + (on ? ' to favourites' : ' from favourites'), 'info');
    }
    function fileInFolder(id, folderId) {
        const w = P().get(id); if (!w) return;
        const dest = folderId ? byId(P().folders(), folderId) : null;
        if (folderId && !dest) return;
        P().assign(id, { folder: dest ? dest.id : null });
        say(dest ? 'Moved ' + w.name + ' to ' + dest.name : 'Removed ' + w.name + ' from its folder', 'success');
    }
    function openWorkspace(id) {
        const w = P().get(id);
        if (!w) return;
        if (P().current() === id) { closePicker({ restore: false }); return; }
        let ok = false;
        try { ok = P().open(id); } catch (e) { console.warn('Workspace picker open failed', e); }
        if (!ok && !(w.pro && !premium())) toast('That workspace could not be opened', 'error');
        // The premium prompt sits behind a still open picker, so the picker always steps aside.
        closePicker({ restore: !ok });
    }

    /* ---------- layers: dialogs inside the overlay ---------- */
    function openLayer(html, cfg) {
        closeMenu();
        if (st.layer) closeLayer(false);
        const active = document.activeElement;
        st.layer = { restore: active && shell.contains(active) ? active : null, restoreKey: active && active.dataset ? active.dataset.fk : null, refresh: cfg.refresh || null, onSubmit: cfg.onSubmit || null, after: cfg.after || null };
        layerEl.innerHTML = '<div class="wsp-dlg-scrim" data-act="layer-dismiss"></div>' + html;
        layerEl.hidden = false;
        shell.inert = true;
        const first = layerEl.querySelector(cfg.focus || FOCUSABLE);
        if (first) first.focus();
    }
    function closeLayer(restore) {
        if (!st.layer) return;
        const L = st.layer, after = L.after;
        st.layer = null;
        layerEl.hidden = true;
        layerEl.innerHTML = '';
        shell.inert = false;
        if (restore !== false) {
            let el = L.restore && L.restore.isConnected ? L.restore : null;
            if (!el && L.restoreKey) el = root.querySelector('[data-fk="' + attr(L.restoreKey) + '"]');
            if (!el) el = searchEl;
            if (el) el.focus({ preventScroll: true });
        }
        if (typeof after === 'function') after();
    }
    function dlgFrame(id, title, body, foot, role) {
        return '<div class="wsp-dialog" role="' + (role || 'dialog') + '" aria-modal="true" aria-labelledby="' + id + 'T">' +
            '<div class="wsp-dlg-head"><h3 id="' + id + 'T">' + title + '</h3><button type="button" class="wsp-mini wsp-dlg-x" data-act="layer-dismiss" data-fk="dlg:x" aria-label="Close">' + ms('close') + '</button></div>' +
            '<div class="wsp-dlg-body">' + body + '</div>' + (foot ? '<div class="wsp-dlg-foot">' + foot + '</div>' : '') + '</div>';
    }

    // Create or rename a tag, category or folder.
    function nameDialog(o) {
        const create = o.mode === 'create', kind = o.kind;
        const cur = create ? null : byId(listOf(kind), o.id);
        if (!create && !cur) return;
        const taken = SWATCHES[listOf(kind).length % SWATCHES.length];
        const colour = taken;
        const parent = create && kind === 'folder' && o.parentId ? byId(P().folders(), o.parentId) : null;
        const title = create ? (parent ? 'New folder inside ' + esc(parent.name) : 'New ' + kind) : 'Rename ' + kind;
        const swatches = create && kind !== 'folder' ? '<div class="wsp-field"><span class="wsp-label" id="wspColL">Colour</span><div class="wsp-swatches" role="radiogroup" aria-labelledby="wspColL">' +
            SWATCHES.map(n => '<button type="button" class="wsp-swatch" role="radio" data-swatch="' + n + '" aria-checked="' + (n === colour) + '" tabindex="' + (n === colour ? 0 : -1) + '" aria-label="' + n + '" style="' + chipVars(n) + '"></button>').join('') + '</div></div>' : '';
        const body = '<form class="wsp-form" novalidate><div class="wsp-field"><label class="wsp-label" for="wspName">Name</label>' +
            '<input id="wspName" class="wsp-input" type="text" maxlength="40" autocomplete="off" spellcheck="false" value="' + esc(cur ? cur.name : '') + '" aria-describedby="wspErr"><p class="wsp-err" id="wspErr" role="alert"></p></div>' + swatches + '</form>';
        const foot = '<button type="button" class="wsp-btn" data-act="layer-dismiss" data-fk="dlg:cancel">Cancel</button><button type="button" class="wsp-btn wsp-btn-primary" data-act="layer-submit" data-fk="dlg:ok">' + (create ? 'Create' : 'Save') + '</button>';
        openLayer(dlgFrame('wspDlg', title, body, foot), {
            focus: '#wspName', after: o.then,
            onSubmit() {
                const input = layerEl.querySelector('#wspName'), err = layerEl.querySelector('#wspErr'), name = input.value.trim();
                const fail = m => { err.textContent = m; input.setAttribute('aria-invalid', 'true'); input.focus(); };
                if (!name) return fail('Enter a name.');
                if (create) {
                    const picked = layerEl.querySelector('[data-swatch][aria-checked="true"]');
                    const extra = kind === 'folder' ? (parent ? { parentId: parent.id } : {}) : { color: picked ? picked.dataset.swatch : colour };
                    const made = P().create(kind, name, extra);
                    if (!made) return fail('That name is already in use here.');
                    closeLayer(false);
                    say('Created ' + kind + ' ' + made.name, 'success');
                    focusRailNew();
                } else {
                    const dupe = listOf(kind).some(x => x.id !== cur.id && norm(x.name) === norm(name) && (x.parentId || null) === (cur.parentId || null));
                    if (dupe) return fail('That name is already in use here.');
                    if (!P().rename(kind, cur.id, name)) return fail('Enter a name.');
                    closeLayer(false);
                    say('Renamed ' + kind + ' to ' + name, 'success');
                    focusRailNew();
                }
            }
        });
    }
    function setSwatch(name, focus) {
        layerEl.querySelectorAll('[data-swatch]').forEach(b => {
            const on = b.dataset.swatch === name;
            b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1;
            if (on && focus) b.focus();
        });
    }
    function focusRailNew() { const b = railEl.querySelector('.wsp-new'); if (b) b.focus({ preventScroll: true }); }

    function confirmDelete(kind, id) {
        const it = byId(listOf(kind), id);
        if (!it) return;
        const orgs = orgMap();
        let n = 0;
        orgs.forEach(o => { if (kind === 'category' ? o.category === id : kind === 'tag' ? o.tags.indexOf(id) >= 0 : o.folder === id) n++; });
        const extra = kind === 'folder' && P().folders().some(f => f.parentId === id) ? ' Folders inside it move up to the top level.' : '';
        const body = '<p class="wsp-dlg-text">Delete the ' + kind + ' <strong>' + esc(it.name) + '</strong>? It is removed from <span class="wsp-mono">' + n + '</span> ' + (n === 1 ? 'workspace' : 'workspaces') + '. The workspaces themselves are not changed.' + extra + '</p>';
        const foot = '<button type="button" class="wsp-btn" data-act="layer-dismiss" data-fk="dlg:cancel">Cancel</button><button type="button" class="wsp-btn wsp-btn-danger" data-act="layer-submit" data-fk="dlg:ok">Delete ' + kind + '</button>';
        openLayer(dlgFrame('wspDlg', 'Delete ' + kind + '?', body, foot, 'alertdialog'), {
            focus: '[data-fk="dlg:cancel"]',
            onSubmit() {
                closeLayer(false);
                P().remove(kind, id);
                say('Deleted ' + kind + ' ' + it.name, 'success');
                focusRailNew();
            }
        });
    }

    // Organise one workspace: folder (the keyboard route to filing), category and tags.
    function organiseBody(w) {
        const o = P().orgOf(w.id), folders = folderTree(), cats = P().categories(), tags = P().tags();
        const opt = (act, id, label, on, extra) => '<button type="button" class="wsp-opt' + (on ? ' is-on' : '') + '" data-act="' + act + '" data-val="' + esc(id) + '" data-fk="opt:' + act + ':' + esc(id) + '" aria-pressed="' + on + '"' + (extra || '') + '>' + label + (on ? ms('check', 'wsp-opt-check') : '') + '</button>';
        const fl = opt('o-folder', '', ms('folder_off') + 'No folder', !o.folder) + folders.map(n => opt('o-folder', n.f.id, ms('folder') + esc(n.f.name), o.folder === n.f.id, ' style="--depth:' + n.depth + '"')).join('');
        return '<div class="wsp-field"><span class="wsp-label">Move to folder</span>' +
            (folders.length ? '<div class="wsp-optlist" role="group" aria-label="Folder">' + fl + '</div>' : '<p class="wsp-dlg-text">No folders yet.</p><button type="button" class="wsp-btn" data-act="o-newfolder" data-fk="opt:newfolder">' + ms('add') + 'New folder</button>') + '</div>' +
            '<div class="wsp-field"><span class="wsp-label">Category</span><div class="wsp-optrow" role="group" aria-label="Category">' +
                cats.map(c => '<button type="button" class="wsp-pick' + (o.category === c.id ? ' is-on' : '') + '" style="' + chipVars(c.color) + '" data-act="o-cat" data-val="' + esc(c.id) + '" data-fk="opt:cat:' + esc(c.id) + '" aria-pressed="' + (o.category === c.id) + '"><span class="wsp-chip-dot" aria-hidden="true"></span>' + esc(c.name) + '</button>').join('') +
            '</div></div>' +
            '<div class="wsp-field"><span class="wsp-label">Tags</span>' + (tags.length ? '<div class="wsp-optrow" role="group" aria-label="Tags">' +
                tags.map(t => '<button type="button" class="wsp-pick' + (o.tags.indexOf(t.id) >= 0 ? ' is-on' : '') + '" style="' + chipVars(t.color) + '" data-act="o-tag" data-val="' + esc(t.id) + '" data-fk="opt:tag:' + esc(t.id) + '" aria-pressed="' + (o.tags.indexOf(t.id) >= 0) + '"><span class="wsp-chip-dot" aria-hidden="true"></span>' + esc(t.name) + '</button>').join('') + '</div>' : '<p class="wsp-dlg-text">No tags yet.</p>') + '</div>';
    }
    function organiseDialog(id) {
        const w = P().get(id);
        if (!w) return;
        const paint = () => {
            const box = layerEl.querySelector('.wsp-dlg-body'); if (!box) return;
            const a = document.activeElement, k = a && layerEl.contains(a) ? a.dataset.fk : null;
            box.innerHTML = organiseBody(w);
            if (k) { const n = layerEl.querySelector('[data-fk="' + attr(k) + '"]'); if (n) n.focus({ preventScroll: true }); }
        };
        openLayer(dlgFrame('wspDlg', 'Organise ' + esc(w.name), organiseBody(w), '<button type="button" class="wsp-btn wsp-btn-primary" data-act="layer-dismiss" data-fk="dlg:done">Done</button>'), { refresh: paint, focus: '.wsp-opt, .wsp-pick, .wsp-btn' });
        st.layer.workspace = id;
    }

    /* ---------- New menu (a small button list, not a select) ---------- */
    function openMenu(btn) {
        if (st.menuBtn) { closeMenu(); return; }
        const tab = TABS.find(t => t.id === st.tab), order = [tab].concat(TABS.filter(t => t !== tab));
        const f = st.filter.folders, sub = st.tab === 'folders' && f !== 'all' && f !== NONE ? byId(P().folders(), f) : null;
        let h = order.map(t => '<button type="button" role="menuitem" class="wsp-menu-item" data-act="new-kind" data-kind="' + t.kind + '" data-fk="menu:' + t.kind + '">' + ms(t.icon) + 'New ' + t.kind + '</button>').join('');
        if (sub) h += '<button type="button" role="menuitem" class="wsp-menu-item" data-act="new-kind" data-kind="folder" data-parent="' + esc(sub.id) + '" data-fk="menu:sub">' + ms('create_new_folder') + 'New folder inside ' + esc(sub.name) + '</button>';
        menuEl.innerHTML = h;
        menuEl.hidden = false;
        const r = btn.getBoundingClientRect(), mw = menuEl.offsetWidth, vw = root.clientWidth, vh = root.clientHeight;
        menuEl.style.left = Math.max(8, Math.min(r.left, vw - mw - 8)) + 'px';
        const below = r.bottom + 6, mh = menuEl.offsetHeight;
        menuEl.style.top = (below + mh > vh - 8 ? Math.max(8, r.top - mh - 6) : below) + 'px';
        st.menuBtn = btn;
        btn.setAttribute('aria-expanded', 'true');
        menuEl.querySelector('.wsp-menu-item').focus();
    }
    function closeMenu(refocus) {
        if (!st.menuBtn) return;
        const b = st.menuBtn;
        st.menuBtn = null;
        menuEl.hidden = true;
        menuEl.innerHTML = '';
        if (b.isConnected) { b.setAttribute('aria-expanded', 'false'); if (refocus) b.focus(); }
    }

    /* ---------- open and close ---------- */
    function buildRoot() {
        let el = document.getElementById(ROOT_ID);
        if (!el) { el = document.createElement('div'); el.id = ROOT_ID; document.body.appendChild(el); }
        root = el;
        if (el.dataset.wspBuilt) { cacheRefs(); return; }
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.setAttribute('aria-labelledby', 'wspTitle');
        el.tabIndex = -1;
        el.innerHTML =
            '<div class="wsp-shell" id="wspShell">' +
                '<header class="wsp-top">' +
                    '<div class="wsp-heading"><h2 class="wsp-title" id="wspTitle">Workspaces</h2><p class="wsp-sub" id="wspSub"></p></div>' +
                    '<div class="wsp-search" role="search">' + ms('search') +
                        '<input id="wspSearch" class="wsp-search-input" type="text" autocomplete="off" spellcheck="false" placeholder="Search workspaces, tags and categories" aria-label="Search workspaces">' +
                        '<button type="button" class="wsp-search-clear" data-act="search-clear" data-fk="search:clear" aria-label="Clear search" hidden>' + ms('close') + '</button></div>' +
                    '<div class="wsp-top-end"><span class="wsp-kbd" title="Open the workspace picker from anywhere">' + (isMac ? '<kbd>Cmd</kbd>' : '<kbd>Ctrl</kbd>') + '<kbd>Shift</kbd><kbd>K</kbd></span>' +
                        '<button type="button" class="wsp-close" data-act="close" data-fk="top:close" aria-label="Close workspace picker">' + ms('close') + '</button></div>' +
                '</header>' +
                '<div class="wsp-tabbar"><div class="wsp-tabs" id="wspTabs" role="tablist" aria-label="Organise workspaces by">' +
                    TABS.map(t => '<button type="button" class="wsp-tab" role="tab" id="wspTab-' + t.id + '" data-tab="' + t.id + '" aria-controls="wspPanel" aria-selected="false" tabindex="-1">' + ms(t.icon) + '<span>' + t.label + '</span><span class="wsp-tab-count wsp-mono"></span></button>').join('') +
                    '</div><button type="button" class="wsp-filters-btn" data-act="filters" data-fk="top:filters" aria-controls="wspRail" aria-expanded="false">' + ms('tune') + 'Filters</button></div>' +
                '<div class="wsp-panel" id="wspPanel" role="tabpanel" aria-labelledby="wspTab-categories" data-rail="closed">' +
                    '<aside class="wsp-rail" id="wspRail" aria-label="Filters"></aside>' +
                    '<div class="wsp-rail-scrim" data-act="filters-close" aria-hidden="true"></div>' +
                    '<div class="wsp-main" id="wspMain"></div>' +
                '</div>' +
            '</div>' +
            '<div class="wsp-layer" id="wspLayer" hidden></div>' +
            '<div class="wsp-menu" id="wspMenu" role="menu" aria-label="Create" hidden></div>' +
            '<div class="wsp-live" id="wspLive" role="status" aria-live="polite"></div>';
        el.dataset.wspBuilt = '1';
        cacheRefs();
        bind();
    }
    function cacheRefs() {
        shell = root.querySelector('#wspShell'); railEl = root.querySelector('#wspRail'); mainEl = root.querySelector('#wspMain');
        tabsEl = root.querySelector('#wspTabs'); panelEl = root.querySelector('#wspPanel'); layerEl = root.querySelector('#wspLayer');
        menuEl = root.querySelector('#wspMenu'); liveEl = root.querySelector('#wspLive'); searchEl = root.querySelector('#wspSearch');
    }
    function openPicker(opts) {
        opts = opts || {};
        if (!window.PLWS) { console.warn('Workspace picker needs workspace-registry.js'); return; }
        buildRoot();
        if (st.open) { if (validTab(opts.tab)) setTab(opts.tab); return; }
        const a = document.activeElement;
        st.opener = opts.opener || (a && a !== document.body && !root.contains(a) ? a : null);
        st.open = true;
        previewCache.clear();
        st.tab = validTab(opts.tab) || validTab(P().ui('wsp.tab')) || 'categories';
        st.q = ''; searchEl.value = '';
        st.railOpen = false;
        TABS.forEach(t => { st.filter[t.id] = 'all'; });
        renderAll();
        root.classList.add('open');
        mainEl.scrollTop = 0;
        if (isTouch()) root.focus({ preventScroll: true }); else searchEl.focus({ preventScroll: true });
    }
    function closePicker(o) {
        if (!st.open) return;
        closeMenu();
        if (st.layer) closeLayer(false);
        st.open = false;
        st.railOpen = false;
        st.dragId = null;
        root.classList.remove('open');
        const op = st.opener;
        st.opener = null;
        if (!(o && o.restore === false) && op && op.isConnected && typeof op.focus === 'function') op.focus({ preventScroll: true });
    }

    /* ---------- keyboard ---------- */
    function visibleCards() { return Array.prototype.filter.call(mainEl.querySelectorAll('.wsp-card'), c => c.offsetParent !== null); }
    function cardNav(e, btn) {
        const cards = visibleCards(), i = cards.indexOf(btn);
        let next = null;
        if (e.key === 'ArrowRight') next = cards[i + 1];
        else if (e.key === 'ArrowLeft') next = cards[i - 1];
        else if (e.key === 'Home') next = cards[0];
        else if (e.key === 'End') next = cards[cards.length - 1];
        else {
            const down = e.key === 'ArrowDown', r = btn.getBoundingClientRect(), cx = r.left + r.width / 2;
            const pool = cards.filter(c => { const q = c.getBoundingClientRect(); return down ? q.top > r.bottom - 6 : q.bottom < r.top + 6; });
            if (pool.length) {
                const edge = down ? Math.min.apply(null, pool.map(c => c.getBoundingClientRect().top)) : Math.max.apply(null, pool.map(c => c.getBoundingClientRect().bottom));
                const row = pool.filter(c => { const q = c.getBoundingClientRect(); return Math.abs((down ? q.top : q.bottom) - edge) < 24; });
                next = row.sort((a, b) => Math.abs(a.getBoundingClientRect().left + a.offsetWidth / 2 - cx) - Math.abs(b.getBoundingClientRect().left + b.offsetWidth / 2 - cx))[0];
            } else if (!down) next = searchEl;
        }
        if (next) { e.preventDefault(); next.focus(); }
    }
    function listNav(e, items, cur) {
        const i = items.indexOf(cur);
        let n = null;
        if (e.key === 'ArrowDown') n = items[Math.min(items.length - 1, i + 1)];
        else if (e.key === 'ArrowUp') n = items[Math.max(0, i - 1)];
        else if (e.key === 'Home') n = items[0];
        else if (e.key === 'End') n = items[items.length - 1];
        if (n) { e.preventDefault(); n.focus(); }
    }
    function trapTab(e) {
        const scope = st.layer ? layerEl : st.menuBtn ? menuEl : root;
        const items = Array.prototype.filter.call(scope.querySelectorAll(FOCUSABLE), el => el.offsetParent !== null || el === document.activeElement);
        if (!items.length) { e.preventDefault(); return; }
        const first = items[0], last = items[items.length - 1], a = document.activeElement;
        if (st.menuBtn) { closeMenu(true); e.preventDefault(); return; }
        if (e.shiftKey && (a === first || !scope.contains(a))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (a === last || !scope.contains(a))) { e.preventDefault(); first.focus(); }
    }
    function onRootKey(e) {
        const t = e.target, key = e.key || '';
        // Background shortcuts in the app never see keys typed inside the picker.
        if (!(e.ctrlKey || e.metaKey)) e.stopPropagation();
        if (key === 'Tab') { trapTab(e); return; }
        if (st.menuBtn && t.closest && t.closest('.wsp-menu')) {
            listNav(e, Array.prototype.slice.call(menuEl.querySelectorAll('.wsp-menu-item')), t.closest('.wsp-menu-item'));
            return;
        }
        if (key === 'Enter' && st.layer && t.id === 'wspName') { e.preventDefault(); if (st.layer.onSubmit) st.layer.onSubmit(); return; }
        if (st.layer) {
            if (t.dataset && t.dataset.swatch && /^Arrow|^Home$|^End$/.test(key)) {
                const all = Array.prototype.slice.call(layerEl.querySelectorAll('[data-swatch]')), i = all.indexOf(t);
                const n = key === 'Home' ? 0 : key === 'End' ? all.length - 1 : (i + (key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1) + all.length) % all.length;
                e.preventDefault(); setSwatch(all[n].dataset.swatch, true);
            }
            return;
        }
        if (t.matches && t.matches('.wsp-tab')) {
            const ids = TABS.map(x => x.id), i = ids.indexOf(st.tab);
            let n = -1;
            if (key === 'ArrowRight') n = (i + 1) % ids.length;
            else if (key === 'ArrowLeft') n = (i - 1 + ids.length) % ids.length;
            else if (key === 'Home') n = 0;
            else if (key === 'End') n = ids.length - 1;
            if (n >= 0) { e.preventDefault(); setTab(ids[n], true); }
            return;
        }
        if (t.matches && t.matches('.wsp-card') && /^Arrow|^Home$|^End$/.test(key)) { cardNav(e, t); return; }
        if (t === searchEl && key === 'ArrowDown') { const c = visibleCards()[0]; if (c) { e.preventDefault(); c.focus(); } return; }
        if (t.closest && t.closest('.wsp-rail') && /^Arrow(Up|Down)$|^Home$|^End$/.test(key)) {
            listNav(e, Array.prototype.filter.call(railEl.querySelectorAll('.wsp-rail-main'), b => b.offsetParent !== null), t.closest('.wsp-rail-main'));
        }
    }
    function onDocKey(e) {
        const key = (e.key || '');
        const hot = (e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && key.toLowerCase() === 'k';
        if (!st.open) {
            if (!hot) return;
            // The command palette listens for Ctrl K with or without Shift, so this key is kept from it.
            e.preventDefault(); e.stopPropagation();
            openPicker();
            return;
        }
        if (hot) { e.preventDefault(); e.stopPropagation(); closePicker(); return; }
        if (key !== 'Escape') return;
        e.preventDefault(); e.stopPropagation();
        if (st.layer) closeLayer();
        else if (st.menuBtn) closeMenu(true);
        else if (st.railOpen && window.matchMedia('(max-width: 1024px)').matches) { st.railOpen = false; syncTabs(); const b = root.querySelector('.wsp-filters-btn'); if (b) b.focus(); }
        else if (document.activeElement === searchEl && st.q) { st.q = ''; searchEl.value = ''; schedule({ main: 1 }); }
        else closePicker();
    }
    function onFocusIn(e) {
        if (!st.open || !root || root.contains(e.target)) return;
        const scope = st.layer ? layerEl : root;
        const f = scope.querySelector(FOCUSABLE);
        if (f) f.focus(); else root.focus();
    }

    /* ---------- events ---------- */
    function onClick(e) {
        const sw = e.target.closest ? e.target.closest('[data-swatch]') : null;
        if (sw) { setSwatch(sw.dataset.swatch, true); return; }
        const t = e.target.closest ? e.target.closest('[data-act],[data-tab]') : null;
        if (st.menuBtn && !(t && (t.dataset.act === 'new-kind' || t.dataset.act === 'new-menu'))) closeMenu();
        if (!t) return;
        if (t.dataset.tab) { setTab(t.dataset.tab); return; }
        const id = t.dataset.id, kind = t.dataset.kind;
        switch (t.dataset.act) {
            case 'close': closePicker(); break;
            case 'open': openWorkspace(id); break;
            case 'fav': toggleFav(id); break;
            case 'organise': organiseDialog(id); break;
            case 'filter': setFilter(id); break;
            case 'sec': toggleSection(t.dataset.key); break;
            case 'fold': toggleFold(id); break;
            case 'rename': nameDialog({ mode: 'rename', kind, id }); break;
            case 'delete': confirmDelete(kind, id); break;
            case 'new-menu': openMenu(t); break;
            case 'new-kind': closeMenu(); nameDialog({ mode: 'create', kind, parentId: t.dataset.parent || null }); break;
            case 'clear-filters': clearFilters(); break;
            case 'search-clear': st.q = ''; searchEl.value = ''; searchEl.focus(); keepFocus(() => { renderMain(); syncSub(); }); break;
            case 'filters': st.railOpen = !st.railOpen; syncTabs(); if (st.railOpen) { const f = railEl.querySelector('.wsp-rail-main'); if (f) f.focus(); } break;
            case 'filters-close': st.railOpen = false; syncTabs(); break;
            case 'layer-dismiss': closeLayer(); break;
            case 'layer-submit': if (st.layer && st.layer.onSubmit) st.layer.onSubmit(); break;
            case 'o-folder': if (st.layer) { fileInFolder(st.layer.workspace, t.dataset.val); } break;
            case 'o-cat': if (st.layer) { const w = P().get(st.layer.workspace); const cur = P().orgOf(w.id).category; P().assign(w.id, { category: cur === t.dataset.val ? null : t.dataset.val }); } break;
            case 'o-tag': if (st.layer) P().toggleTag(st.layer.workspace, t.dataset.val); break;
            case 'o-newfolder': { const w = st.layer && st.layer.workspace; closeLayer(false); nameDialog({ mode: 'create', kind: 'folder', then: () => { if (w) organiseDialog(w); } }); break; }
            default: break;
        }
    }
    function onDragStart(e) {
        const tile = e.target.closest ? e.target.closest('.wsp-tile') : null;
        if (!tile || st.tab !== 'folders') return;
        st.dragId = tile.dataset.id;
        try { e.dataTransfer.setData('text/plain', st.dragId); e.dataTransfer.effectAllowed = 'move'; } catch (err) { /* some engines block data access */ }
        tile.classList.add('is-dragging');
        panelEl.classList.add('is-dragging');
        // A closed tablet drawer would hide the folders, so it opens for the drag.
        if (window.matchMedia('(max-width: 1024px)').matches && !st.railOpen) setTimeout(() => { st.railOpen = true; panelEl.dataset.rail = 'open'; }, 0);
    }
    function onDragEnd() {
        st.dragId = null;
        root.querySelectorAll('.is-dragging, .is-drop').forEach(n => n.classList.remove('is-dragging', 'is-drop'));
        panelEl.classList.remove('is-dragging');
    }
    function dropRow(e) { return e.target.closest ? e.target.closest('.wsp-rail-row[data-drop]') : null; }
    function onDragOver(e) {
        const row = dropRow(e);
        if (!row || !st.dragId) return;
        e.preventDefault();
        try { e.dataTransfer.dropEffect = 'move'; } catch (err) { /* ignore */ }
        railEl.querySelectorAll('.is-drop').forEach(n => { if (n !== row) n.classList.remove('is-drop'); });
        row.classList.add('is-drop');
    }
    function onDragLeave(e) {
        const row = dropRow(e);
        if (row && !row.contains(e.relatedTarget)) row.classList.remove('is-drop');
    }
    function onDrop(e) {
        const row = dropRow(e);
        if (!row || !st.dragId) return;
        e.preventDefault();
        const id = st.dragId;
        onDragEnd();
        fileInFolder(id, row.dataset.folderId || '');
    }
    function bind() {
        root.addEventListener('click', onClick);
        root.addEventListener('submit', e => e.preventDefault());
        root.addEventListener('keydown', onRootKey);
        root.addEventListener('dragstart', onDragStart);
        root.addEventListener('dragend', onDragEnd);
        root.addEventListener('dragover', onDragOver);
        root.addEventListener('dragleave', onDragLeave);
        root.addEventListener('drop', onDrop);
        searchEl.addEventListener('input', () => { st.q = searchEl.value; keepFocus(() => { renderMain(); syncSub(); }); });
        // A click on the shell background (not a control) keeps focus inside the dialog.
        root.addEventListener('mousedown', e => { if (e.target === root || e.target === shell) { e.preventDefault(); } });
    }

    // Registry changes redraw only while open; the next open always starts from a full draw.
    document.addEventListener('plws:change', e => {
        if (!st.open) return;
        const what = e && e.detail && e.detail.what;
        if (what === 'ui') return;
        schedule(what === 'fav' || what === 'recent' ? { main: 1 } : { rail: 1, main: 1 });
        if (st.layer && st.layer.refresh) st.layer.refresh();
    });
    document.addEventListener('keydown', onDocKey, true);
    document.addEventListener('focusin', onFocusIn);

    window.PL_openWorkspacePicker = openPicker;
    window.PL_closeWorkspacePicker = closePicker;
    window.__wsp = { st, renderAll, filtered, counts, previewHtml };
})();
