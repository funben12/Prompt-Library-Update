/* Workspace sidebar: the workspace button under the brand and the organised Workspaces section.
   Needs window.PLWS (static/workspace-registry.js). Mounts itself after DOMContentLoaded and is safe to run twice.
   The button opens the full screen picker (window.PL_openWorkspacePicker), falling back to the launcher.
   Public API: window.PLWSSidebar = { mount, refresh }. */
(function () {
    'use strict';
    if (window.PLWSSidebar) { try { window.PLWSSidebar.mount(); } catch (e) { /* already mounted */ } return; }

    const MODES = ['categories', 'tags', 'folders'];
    const MODE_LABEL = { categories: 'Categories', tags: 'Tags', folders: 'Folders' };
    const COLOURS = /^[a-z]+$/;
    let mounted = false;
    let skipRender = false;
    let lastSig = '';
    let timer = 0;
    let uid = 0;
    const watched = new WeakSet();
    let observer = null;

    // Small element builder. Text goes in through textContent so user names are never parsed as HTML.
    function h(tag, attrs, kids) {
        const el = document.createElement(tag);
        Object.keys(attrs || {}).forEach(k => {
            const v = attrs[k];
            if (v === false || v == null) return;
            if (k === 'text') el.textContent = v;
            else el.setAttribute(k, v === true ? '' : v);
        });
        (kids || []).forEach(c => { if (c) el.appendChild(c); });
        return el;
    }
    const icon = (name, cls) => h('span', { class: 'material-symbols-outlined' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true', text: name });
    const isPremium = () => document.body.classList.contains('is-premium');
    const phone = () => !!(window.matchMedia && window.matchMedia('(max-width: 820px)').matches);
    const closeDrawer = () => { if (phone()) document.body.classList.add('sidebar-hidden'); };

    function mode() {
        const m = window.PLWS.ui('sidebarGroup');
        return MODES.includes(m) ? m : 'categories';
    }
    function collapsedMap() {
        const m = window.PLWS.ui('sidebarCollapsed');
        return m && typeof m === 'object' ? m : {};
    }
    // Explicit choice wins. Otherwise Favourites and the group holding the current workspace start open.
    function isOpen(key, g, cur) {
        const m = collapsedMap();
        if (key in m) return !m[key];
        if (key === 'fav') return true;
        return !!cur && groupHas(g, cur);
    }
    function groupHas(g, id) {
        return g.items.some(w => w.id === id) || (g.children || []).some(c => groupHas(c, id));
    }
    function groupCount(g) {
        const ids = new Set(g.items.map(w => w.id));
        (g.children || []).forEach(c => c.items.forEach(w => ids.add(w.id)));
        return ids.size;
    }

    // Build the group list for the current organisation mode.
    function buildGroups(m) {
        const P = window.PLWS, all = P.catalog(), out = [];
        if (m === 'categories') {
            P.categories().forEach(c => out.push({ key: 'categories:' + c.id, name: c.name, color: c.color, items: P.inCategory(c.id) }));
            out.push({ key: 'categories:none', name: 'No category', items: all.filter(w => !P.orgOf(w.id).category), plain: true });
        } else if (m === 'tags') {
            P.tags().forEach(t => out.push({ key: 'tags:' + t.id, name: t.name, color: t.color, items: P.inTag(t.id) }));
            out.push({ key: 'tags:none', name: 'Untagged', items: all.filter(w => !P.orgOf(w.id).tags.length), plain: true });
        } else {
            const folders = P.folders(), byId = {};
            folders.forEach(f => { byId[f.id] = f; });
            const topOf = f => { let cur = f, n = 0; while (cur.parentId && byId[cur.parentId] && n++ < 20) cur = byId[cur.parentId]; return cur; };
            const tops = folders.filter(f => !f.parentId || !byId[f.parentId]);
            tops.forEach(f => {
                const kids = folders.filter(k => k.id !== f.id && topOf(k).id === f.id).map(k => ({ key: 'folders:' + k.id, name: k.name, color: k.color, folder: true, items: P.inFolder(k.id) }));
                out.push({ key: 'folders:' + f.id, name: f.name, color: f.color, folder: true, items: P.inFolder(f.id), children: kids });
            });
            out.push({ key: 'folders:none', name: 'No folder', items: all.filter(w => !P.orgOf(w.id).folder), plain: true });
        }
        // Empty groups are hidden, except real folders which show an empty hint.
        return out.filter(g => g.items.length || (g.children && g.children.some(c => c.items.length)) || (m === 'folders' && g.folder));
    }

    function rowFor(w, cur, premium) {
        const isCur = w.id === cur, locked = w.pro && !premium;
        const b = h('button', {
            type: 'button', class: 'wss-row' + (isCur ? ' wss-current' : ''), 'data-id': w.id, 'data-wss-key': 'row:' + w.id,
            'aria-current': isCur ? 'true' : false,
            'aria-label': w.name + (locked ? ', Pro' : '') + (isCur ? ', current' : '')
        }, [icon(w.icon || 'grid_view', 'wss-row-ic'), h('span', { class: 'wss-row-name', text: w.name })]);
        if (locked) b.appendChild(icon('lock', 'wss-lock'));
        return b;
    }

    function groupFor(g, cur, premium, opts) {
        const open = isOpen(g.key, g, cur), id = 'wss-g-' + (++uid);
        const wrap = h('div', { class: 'wss-group' + (opts && opts.fav ? ' wss-fav' : '') });
        const ic = opts && opts.fav ? icon('star', 'wss-star') : g.folder ? icon('folder', 'wss-fold') : (g.plain ? null : h('span', { class: 'wss-dot', 'aria-hidden': 'true' }));
        const head = h('button', { type: 'button', class: 'wss-ghead', 'data-wss-key': 'g:' + g.key, 'data-key': g.key, 'aria-expanded': open ? 'true' : 'false', 'aria-controls': id }, [
            icon('expand_more', 'wss-chev'), ic, h('span', { class: 'wss-gname', text: g.name }), h('span', { class: 'wss-count', text: String(groupCount(g)) })
        ]);
        if (ic && ic.classList.contains('wss-dot') && COLOURS.test(g.color || '')) head.style.setProperty('--wss-c', 'var(--c-' + g.color + ', var(--ink-3))');
        const body = h('div', { class: 'wss-gbody', id, role: 'group', 'aria-label': g.name });
        if (!open) body.hidden = true;
        (g.children || []).forEach(c => { if (c.items.length || c.folder) body.appendChild(groupFor(c, cur, premium)); });
        g.items.forEach(w => body.appendChild(rowFor(w, cur, premium)));
        if (!g.items.length && !(g.children || []).some(c => c.items.length)) body.appendChild(h('div', { class: 'wss-hint', text: 'Empty folder' }));
        wrap.appendChild(head); wrap.appendChild(body);
        return wrap;
    }

    function render() {
        const root = document.getElementById('wssRoot');
        if (!root || !window.PLWS) return;
        const P = window.PLWS, m = mode(), cur = P.current(), premium = isPremium();
        // Keep keyboard focus on the same control across a redraw.
        const ae = document.activeElement, keep = ae && root.contains(ae) ? ae.getAttribute('data-wss-key') : null;
        uid = 0;

        const head = h('div', { class: 'wss-title-row' }, [
            h('h2', { class: 'wss-title', id: 'wssTitle', text: 'Workspaces' }),
            h('span', { class: 'wss-total', text: String(P.catalog().length), title: 'Workspaces in the app' })
        ]);
        const seg = h('div', { class: 'wss-seg', role: 'radiogroup', 'aria-label': 'Group workspaces by' });
        MODES.forEach(k => {
            const on = k === m;
            seg.appendChild(h('button', { type: 'button', class: 'wss-seg-btn', role: 'radio', 'aria-checked': on ? 'true' : 'false', tabindex: on ? '0' : '-1', 'data-mode': k, 'data-wss-key': 'seg:' + k, text: MODE_LABEL[k] }));
        });

        const list = h('div', { class: 'wss-list' });
        const favs = P.favourites();
        if (favs.length) list.appendChild(groupFor({ key: 'fav', name: 'Favourites', items: favs }, cur, premium, { fav: true }));
        if (m === 'folders' && !P.folders().length) list.appendChild(h('p', { class: 'wss-note', text: 'Folders you create in the workspace picker appear here.' }));
        const groups = buildGroups(m);
        groups.forEach(g => list.appendChild(groupFor(g, cur, premium)));
        if (!groups.length && !favs.length) list.appendChild(h('p', { class: 'wss-note', text: 'No workspaces to show.' }));

        root.replaceChildren(h('div', { class: 'wss-top' }, [head, seg]), list);
        root.setAttribute('aria-labelledby', 'wssTitle');
        if (keep) { const el = root.querySelector('[data-wss-key="' + keep.replace(/"/g, '') + '"]'); if (el) el.focus({ preventScroll: true }); }
        updateSwitcher(cur);
        lastSig = signature();
    }

    function updateSwitcher(cur) {
        const sw = document.getElementById('wssSwitcher');
        if (!sw || !window.PLWS) return;
        const c = cur === undefined ? window.PLWS.current() : cur, w = c && window.PLWS.get(c);
        const name = w ? w.name : 'Library';
        sw.querySelector('.wss-sw-ic').textContent = w ? (w.icon || 'grid_view') : 'menu_book';
        sw.querySelector('.wss-sw-name').textContent = name;
        sw.setAttribute('aria-label', 'Workspace: ' + name + '. Open workspace picker');
    }

    function signature() { return (window.PLWS ? window.PLWS.current() : '') + '|' + (isPremium() ? 1 : 0); }

    function openPicker() {
        closeDrawer();
        const fn = typeof window.PL_openWorkspacePicker === 'function' ? window.PL_openWorkspacePicker : window.openWorkspacesLauncher;
        if (typeof fn === 'function') fn();
    }

    function setCollapsed(key, collapsed) {
        const next = Object.assign({}, collapsedMap()); next[key] = collapsed;
        skipRender = true;
        try { window.PLWS.ui('sidebarCollapsed', next); } finally { skipRender = false; }
    }

    function onRootClick(e) {
        const row = e.target.closest('.wss-row');
        if (row) { window.PLWS.open(row.getAttribute('data-id')); closeDrawer(); return; }
        const head = e.target.closest('.wss-ghead');
        if (head) { toggleGroup(head, head.getAttribute('aria-expanded') !== 'true'); return; }
        const seg = e.target.closest('.wss-seg-btn');
        if (seg) chooseMode(seg.getAttribute('data-mode'));
    }
    // Expand or collapse in place so the chevron animates and focus stays put.
    function toggleGroup(head, open) {
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
        const body = document.getElementById(head.getAttribute('aria-controls'));
        if (body) body.hidden = !open;
        setCollapsed(head.getAttribute('data-key'), !open);
    }
    function chooseMode(k) {
        if (!MODES.includes(k) || k === mode()) return;
        window.PLWS.ui('sidebarGroup', k);
        const el = document.querySelector('#wssRoot [data-wss-key="seg:' + k + '"]');
        if (el) el.focus({ preventScroll: true });
    }

    function onRootKey(e) {
        const t = e.target;
        if (t.classList.contains('wss-seg-btn')) {
            const i = MODES.indexOf(t.getAttribute('data-mode')); let n = -1;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % MODES.length;
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i + MODES.length - 1) % MODES.length;
            else if (e.key === 'Home') n = 0;
            else if (e.key === 'End') n = MODES.length - 1;
            if (n < 0) return;
            e.preventDefault(); chooseMode(MODES[n]);
            return;
        }
        if (!t.classList.contains('wss-ghead') && !t.classList.contains('wss-row')) return;
        if (t.classList.contains('wss-ghead') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
            const open = t.getAttribute('aria-expanded') === 'true';
            if ((e.key === 'ArrowRight') !== open) { e.preventDefault(); toggleGroup(t, e.key === 'ArrowRight'); }
            return;
        }
        const stops = Array.from(document.querySelectorAll('#wssRoot .wss-ghead, #wssRoot .wss-row')).filter(el => !el.closest('[hidden]'));
        const i = stops.indexOf(t); let n = -1;
        if (e.key === 'ArrowDown') n = Math.min(stops.length - 1, i + 1);
        else if (e.key === 'ArrowUp') n = Math.max(0, i - 1);
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = stops.length - 1;
        if (n < 0) return;
        e.preventDefault(); stops[n].focus();
    }

    // Watch only the class attribute of workspace roots (plus the body class for Pro state and added roots). Debounced, no polling.
    function watch() {
        if (!observer) {
            observer = new MutationObserver(() => {
                clearTimeout(timer);
                timer = setTimeout(() => { watch(); if (signature() !== lastSig) render(); else updateSwitcher(); }, 120);
            });
            observer.observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true });
            const main = document.getElementById('main');
            if (main) observer.observe(main, { childList: true });
        }
        window.PLWS.catalog().forEach(w => {
            const el = w.root && document.querySelector(w.root);
            if (el && !watched.has(el)) { watched.add(el); observer.observe(el, { attributes: true, attributeFilter: ['class'] }); }
        });
    }

    function mount() {
        const sb = document.getElementById('sidebar');
        if (!sb || !window.PLWS) return false;
        if (!document.getElementById('wssSwitcher')) {
            const sw = h('button', { type: 'button', id: 'wssSwitcher', 'aria-haspopup': 'dialog' }, [
                h('span', { class: 'wss-sw-tile', 'aria-hidden': 'true' }, [icon('menu_book', 'wss-sw-ic')]),
                h('span', { class: 'wss-sw-text' }, [h('span', { class: 'wss-sw-label', text: 'Workspace' }), h('span', { class: 'wss-sw-name', text: 'Library' })]),
                icon('chevron_right', 'wss-sw-chev')
            ]);
            sw.addEventListener('click', openPicker);
            const brand = sb.querySelector('.brand');
            if (brand) brand.after(sw); else sb.prepend(sw);
        }
        if (!document.getElementById('wssRoot')) {
            const scroll = document.getElementById('sidebarScroll');
            if (!scroll) return false;
            const root = h('section', { id: 'wssRoot' });
            root.addEventListener('click', onRootClick);
            root.addEventListener('keydown', onRootKey);
            scroll.prepend(root);
        }
        if (!mounted) {
            mounted = true;
            document.addEventListener('plws:change', () => { if (!skipRender) render(); });
        }
        watch();
        render();
        try { mountLibrary(); } catch (e) { console.warn('Library organiser not mounted', e); }
        return true;
    }

    // Library organiser: the existing prompt Folders, Categories and Tags sections move into one cluster with a shared switch.
    const LIB_MODES = [['folders', 'Folders'], ['categories', 'Categories'], ['tags', 'Tags']];
    function libMode() { const m = window.PLWS && window.PLWS.ui('sidebarLibGroup'); return LIB_MODES.some(x => x[0] === m) ? m : 'folders'; }
    function applyLibMode(root, m) {
        LIB_MODES.forEach(([k]) => {
            const lab = root.querySelector('.nav-section-label[data-toggle="' + k + '"]');
            const sec = lab && lab.closest('.nav-section');
            if (!sec) return;
            sec.hidden = k !== m;
            // The shown section opens, so one click on the switch is enough.
            const content = document.getElementById(k + '-content');
            if (k === m && content && content.classList.contains('collapsed')) {
                content.classList.remove('collapsed');
                lab.setAttribute('aria-expanded', 'true');
                const chev = lab.querySelector('.chev');
                if (chev) chev.style.transform = '';
            }
        });
        root.querySelectorAll('.wss-seg-btn').forEach(b => {
            const on = b.getAttribute('data-lib') === m;
            b.setAttribute('aria-checked', on ? 'true' : 'false');
            b.tabIndex = on ? 0 : -1;
        });
    }
    function mountLibrary() {
        const scroll = document.getElementById('sidebarScroll');
        if (!scroll) return false;
        if (document.getElementById('wssPrompts')) return true;
        const secs = LIB_MODES.map(([k]) => { const lab = scroll.querySelector('.nav-section-label[data-toggle="' + k + '"]'); return lab && lab.closest('.nav-section'); });
        if (secs.some(x => !x)) return false;
        const root = h('section', { id: 'wssPrompts', 'aria-label': 'Library organiser' });
        const seg = h('div', { class: 'wss-seg', role: 'radiogroup', 'aria-label': 'Organise library by' });
        LIB_MODES.forEach(([k, label]) => seg.appendChild(h('button', { type: 'button', class: 'wss-seg-btn', role: 'radio', 'aria-checked': 'false', 'data-lib': k, text: label })));
        const full = h('button', { type: 'button', class: 'wss-full', 'aria-label': 'Open the Library Browser', title: 'Browse prompts by folder, category and tag' }, [icon('open_in_full', 'wss-full-ic')]);
        full.addEventListener('click', () => { if (typeof window.openLibraryBrowserWorkspace === 'function') window.openLibraryBrowserWorkspace(); });
        root.appendChild(h('div', { class: 'wss-title-row' }, [h('h2', { class: 'wss-title', text: 'Library organiser' }), full]));
        root.appendChild(seg);
        secs.forEach(x => root.appendChild(x));
        seg.addEventListener('click', e => {
            const b = e.target.closest('.wss-seg-btn');
            if (!b) return;
            window.PLWS.ui('sidebarLibGroup', b.getAttribute('data-lib'));
            applyLibMode(root, b.getAttribute('data-lib'));
        });
        seg.addEventListener('keydown', e => {
            const i = LIB_MODES.findIndex(x => x[0] === libMode());
            const next = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? LIB_MODES.length - 1 : -1;
            if (next < 0) return;
            e.preventDefault();
            const k = LIB_MODES[(next + LIB_MODES.length) % LIB_MODES.length][0];
            window.PLWS.ui('sidebarLibGroup', k);
            applyLibMode(root, k);
            const btn = seg.querySelector('[data-lib="' + k + '"]');
            if (btn) btn.focus();
        });
        const anchorEl = document.getElementById('wssRoot');
        if (anchorEl) anchorEl.after(root); else scroll.prepend(root);
        applyLibMode(root, libMode());
        return true;
    }

    window.PLWSSidebar = { mount, refresh: () => { if (mounted) render(); } };

    function start() {
        if (mount()) return;
        // The registry or sidebar may arrive a moment later; try once more on load.
        window.addEventListener('load', () => { try { mount(); } catch (e) { console.warn('Workspace sidebar not mounted', e); } }, { once: true });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
