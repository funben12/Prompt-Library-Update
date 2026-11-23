/* Workspace registry: the one shared source for the picker, the sidebar organiser and the previews.
   Reads the existing launcher cards (#launcherGrid .launcher-card) as the catalogue, so no workspace list is duplicated.
   Tag, category, folder, favourite and recent data live in localStorage only (key pl.ws.org.v1). No database, no schema change.
   Exposes window.PLWS. Fires document event "plws:change" (detail: {what}) after any change. */
(function () {
    'use strict';
    const KEY = 'pl.ws.org.v1';
    const uid = p => p + Math.random().toString(36).slice(2, 8);
    const emit = what => document.dispatchEvent(new CustomEvent('plws:change', { detail: { what } }));

    // Starting data. Assumed names, easy to change here. Ids are stable, names are editable by the user.
    const SEED_CATEGORIES = [
        { id: 'cat-build',    name: 'Build',    color: 'teal' },
        { id: 'cat-refine',   name: 'Refine',   color: 'blue' },
        { id: 'cat-inspect',  name: 'Inspect',  color: 'purple' },
        { id: 'cat-run',      name: 'Run',      color: 'orange' },
        { id: 'cat-protect',  name: 'Protect',  color: 'green' },
        { id: 'cat-publish',  name: 'Publish',  color: 'pink' }
    ];
    const SEED_TAGS = [
        { id: 'tag-canvas',   name: 'Canvas',    color: 'indigo' },
        { id: 'tag-export',   name: 'Export',    color: 'pink' },
        { id: 'tag-context',  name: 'Context',   color: 'cyan' },
        { id: 'tag-quality',  name: 'Quality',   color: 'green' },
        { id: 'tag-workflow', name: 'Workflow',  color: 'amber' },
        { id: 'tag-community',name: 'Community', color: 'purple' },
        { id: 'tag-safety',   name: 'Safety',    color: 'red' },
        { id: 'tag-ai',       name: 'Uses AI',   color: 'teal' }
    ];
    // Launcher group id to starting category.
    const GROUP_TO_CAT = { favorites: 'cat-build', build: 'cat-build', refine: 'cat-refine', inspect: 'cat-inspect', run: 'cat-run', protect: 'cat-protect' };
    // Starting tags per workspace function name. Anything missing simply starts with no tags.
    const SEED_ASSIGN = {
        openBuilderProWorkspace: { tags: ['tag-canvas', 'tag-workflow'] },
        openComponentsWorkspace: { tags: ['tag-canvas', 'tag-context'] },
        openChainWorkspace: { tags: ['tag-workflow'] },
        openContextBankWorkspace: { tags: ['tag-context'] },
        openGenWorkspace: { tags: ['tag-ai'] },
        openOptimizerWorkspace: { tags: ['tag-ai', 'tag-quality'] },
        openAuditWorkspace: { tags: ['tag-quality'] },
        openGauntletWorkspace: { tags: ['tag-quality', 'tag-ai'] },
        openPlxSurgeonWorkspace: { tags: ['tag-quality', 'tag-safety', 'tag-ai'] },
        openBackupWorkspace: { tags: ['tag-safety'] },
        openIntegrityWorkspace: { tags: ['tag-safety'] },
        openPromptPackBuilderWorkspace: { category: 'cat-publish', tags: ['tag-export', 'tag-community'] },
        openPromptWorkflowStudioWorkspace: { category: 'cat-build', tags: ['tag-canvas', 'tag-workflow', 'tag-quality'] },
        openContextPackBuilderWorkspace: { category: 'cat-publish', tags: ['tag-context', 'tag-export'] },
        openSkillFoundryWorkspace: { category: 'cat-build', tags: ['tag-export', 'tag-safety', 'tag-ai'] }
    };
    // Workspaces opened by function name that do not follow openXWorkspace to #xWorkspace.
    const ROOT_OVERRIDE = { openForkWorkstation: '#forkWorkstation', openPromptForkingWorkspace: '#forkWorkstation' };

    let store = null;
    let cache = null;
    let last = null;

    function seed() {
        return { v: 1, categories: SEED_CATEGORIES.map(c => ({ ...c })), tags: SEED_TAGS.map(t => ({ ...t })), folders: [], assign: {}, favourites: [], recent: [], ui: {} };
    }
    function load() {
        if (store) return store;
        try { store = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { store = null; }
        if (!store || typeof store !== 'object' || store.v !== 1) store = seed();
        ['categories', 'tags', 'folders', 'favourites', 'recent'].forEach(k => { if (!Array.isArray(store[k])) store[k] = []; });
        if (!store.assign || typeof store.assign !== 'object') store.assign = {};
        if (!store.ui || typeof store.ui !== 'object') store.ui = {};
        return store;
    }
    function save(what) {
        try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* quota or private mode: changes last for this session */ }
        emit(what || 'store');
    }

    // Favourites are also kept in the database through PL_prefs, because WebView localStorage can reset between launches.
    const FAV_PREF = 'ws_favs';
    function mirrorFavs() {
        try { if (window.PL_prefs) window.PL_prefs.set(FAV_PREF, JSON.stringify(load().favourites)); } catch (e) { /* localStorage copy still holds */ }
    }
    function hydrateFavs() {
        const p = window.PL_prefs;
        if (!p || !p.ready) return;
        p.ready.then(() => {
            const raw = p.get(FAV_PREF), s = load();
            // Nothing saved in the database yet: push what this device already has.
            if (raw === null || raw === undefined) { if (s.favourites.length) mirrorFavs(); return; }
            let ids; try { ids = JSON.parse(raw); } catch (e) { return; }
            if (!Array.isArray(ids)) return;
            const next = ids.filter(x => typeof x === 'string');
            if (JSON.stringify(next) === JSON.stringify(s.favourites)) return;
            s.favourites = next;
            save('fav');
        }).catch(() => { /* keep the localStorage copy */ });
    }

    function rootFor(fn) {
        if (ROOT_OVERRIDE[fn]) return ROOT_OVERRIDE[fn];
        const m = /^open(\w+)$/.exec(fn);
        return m ? '#' + m[1].charAt(0).toLowerCase() + m[1].slice(1) : null;
    }

    // Catalogue, built once from launcher cards. Call refresh() if cards are added later.
    function build() {
        const out = [];
        document.querySelectorAll('#launcherGrid .launcher-group').forEach(group => {
            const g = group.dataset.group;
            group.querySelectorAll('.launcher-card').forEach(card => {
                const fn = card.dataset.open;
                if (!fn || out.some(x => x.id === fn)) return;
                const seedA = SEED_ASSIGN[fn] || {};
                out.push({
                    id: fn,
                    name: (card.querySelector('.launcher-card-title') || {}).textContent.trim(),
                    desc: ((card.querySelector('.launcher-card-desc') || {}).textContent || '').trim(),
                    icon: ((card.querySelector('.launcher-card-icon') || {}).textContent || 'grid_view').trim(),
                    pro: card.dataset.premium === 'true',
                    group: g,
                    root: rootFor(fn),
                    defaultCategory: seedA.category || GROUP_TO_CAT[g] || 'cat-build',
                    defaultTags: seedA.tags || []
                });
            });
        });
        return out;
    }

    const PLWS = {
        catalog() { if (!cache) cache = build(); return cache; },
        refresh() { cache = null; emit('catalog'); return PLWS.catalog(); },
        get(id) { return PLWS.catalog().find(w => w.id === id) || null; },
        data() { return load(); },

        // Organisation of one workspace: user choice first, then the starting data.
        orgOf(id) {
            const w = PLWS.get(id), a = load().assign[id] || {};
            const category = 'category' in a ? a.category : (w ? w.defaultCategory : null);
            const tags = Array.isArray(a.tags) ? a.tags : (w ? w.defaultTags : []);
            const folder = 'folder' in a ? a.folder : null;
            return { category: PLWS.categories().some(c => c.id === category) ? category : null, tags: tags.filter(t => PLWS.tags().some(x => x.id === t)), folder: PLWS.folders().some(f => f.id === folder) ? folder : null };
        },
        categories() { return load().categories; },
        tags() { return load().tags; },
        folders() { return load().folders; },

        // Workspaces in a category, tag or folder. Pass null for "none set".
        inCategory(id) { return PLWS.catalog().filter(w => PLWS.orgOf(w.id).category === id); },
        inTag(id) { return PLWS.catalog().filter(w => PLWS.orgOf(w.id).tags.includes(id)); },
        inFolder(id) { return PLWS.catalog().filter(w => PLWS.orgOf(w.id).folder === id); },

        // Create, rename, delete. Callers must confirm rename and delete with the user first.
        create(kind, name, extra) {
            const s = load(), list = s[kind === 'category' ? 'categories' : kind === 'tag' ? 'tags' : 'folders'];
            const clean = String(name || '').trim().slice(0, 40);
            if (!clean || list.some(x => x.name.toLowerCase() === clean.toLowerCase() && (x.parentId || null) === ((extra && extra.parentId) || null))) return null;
            const item = Object.assign({ id: uid(kind.slice(0, 3) + '-'), name: clean, color: 'teal' }, extra || {});
            list.push(item); save(kind); return item;
        },
        rename(kind, id, name) {
            const list = load()[kind === 'category' ? 'categories' : kind === 'tag' ? 'tags' : 'folders'];
            const it = list.find(x => x.id === id), clean = String(name || '').trim().slice(0, 40);
            if (!it || !clean) return false;
            it.name = clean; save(kind); return true;
        },
        remove(kind, id) {
            const s = load(), key = kind === 'category' ? 'categories' : kind === 'tag' ? 'tags' : 'folders';
            s[key] = s[key].filter(x => x.id !== id);
            if (kind === 'folder') s.folders.forEach(f => { if (f.parentId === id) f.parentId = null; });
            Object.keys(s.assign).forEach(w => {
                const a = s.assign[w];
                if (kind === 'category' && a.category === id) a.category = null;
                if (kind === 'folder' && a.folder === id) a.folder = null;
                if (kind === 'tag' && Array.isArray(a.tags)) a.tags = a.tags.filter(t => t !== id);
            });
            save(kind); return true;
        },
        // Seed assignments are materialised on first edit so later changes to seed data never overwrite a user choice.
        assign(id, patch) {
            const s = load(), cur = PLWS.orgOf(id);
            s.assign[id] = Object.assign({ category: cur.category, tags: cur.tags.slice(), folder: cur.folder }, s.assign[id] || {}, patch);
            save('assign'); return s.assign[id];
        },
        toggleTag(id, tagId) {
            const cur = PLWS.orgOf(id).tags, next = cur.includes(tagId) ? cur.filter(t => t !== tagId) : cur.concat(tagId);
            return PLWS.assign(id, { tags: next });
        },

        // Favourites and recents.
        isFav(id) { return load().favourites.includes(id); },
        toggleFav(id) { const s = load(); s.favourites = s.favourites.includes(id) ? s.favourites.filter(x => x !== id) : s.favourites.concat(id); save('fav'); mirrorFavs(); return s.favourites.includes(id); },
        favourites() { return load().favourites.map(PLWS.get).filter(Boolean); },
        recent(n) { return load().recent.map(r => ({ w: PLWS.get(r.id), at: r.at })).filter(r => r.w).slice(0, n || 4); },
        markOpened(id) { const s = load(); s.recent = [{ id, at: Date.now() }].concat(s.recent.filter(r => r.id !== id)).slice(0, 12); save('recent'); },

        // Small UI memory (active tab, collapsed sections, sidebar grouping) shared by picker and sidebar.
        ui(k, v) { const s = load(); if (v === undefined) return s.ui[k]; s.ui[k] = v; save('ui'); return v; },

        // Opening goes through the launcher card so the Pro check, premium modal and close behaviour stay in one place.
        open(id) {
            const card = document.querySelector('#launcherGrid .launcher-card[data-open="' + id + '"]');
            if (!card) return false;
            const w = PLWS.get(id);
            card.click();
            const gated = w && w.pro && !document.body.classList.contains('is-premium');
            if (!gated) {
                last = id;
                PLWS.markOpened(id);
                if (window.PL_toast && w) window.PL_toast('Switched to ' + w.name, 'success');
            }
            return !gated;
        },

        // The workspace currently on screen, or null for the Library.
        current() {
            const w = last && PLWS.get(last);
            if (w && w.root) { const el = document.querySelector(w.root); if (el && el.classList.contains('open')) return w.id; }
            for (const x of PLWS.catalog()) { const el = x.root && document.querySelector(x.root); if (el && el.classList.contains('open')) return x.id; }
            return null;
        },
        // Called by anything that opens a workspace without PLWS.open, so Current stays right.
        noteOpened(id) { if (PLWS.get(id)) { last = id; PLWS.markOpened(id); } }
    };

    // Opening from anywhere else (launcher, nav, Ctrl K) still updates Current and Recent.
    function wrapOpeners() {
        PLWS.catalog().forEach(w => {
            const orig = window[w.id];
            if (typeof orig !== 'function' || orig.__plws) return;
            const wrapped = function () { last = w.id; if (!wrapped.__skip) { try { PLWS.markOpened(w.id); } catch (e) { /* recents are not essential */ } } return orig.apply(this, arguments); };
            wrapped.__plws = true;
            window[w.id] = wrapped;
        });
    }
    PLWS.wrapOpeners = wrapOpeners;

    window.PLWS = PLWS;
    // Wrap once the workspace functions exist (app.js defines them during boot).
    window.addEventListener('load', () => { try { wrapOpeners(); } catch (e) { console.warn('PLWS wrap failed', e); } });
    if (window.PL_prefs) hydrateFavs(); else window.addEventListener('load', hydrateFavs);
})();
