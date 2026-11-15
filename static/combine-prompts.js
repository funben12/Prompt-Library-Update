/* ============================================================================
   COMBINE PROMPTS
   Merge two similar prompts into one: side by side, pick or edit each field,
   save the combined prompt, then the server removes both originals in the same
   transaction. Undo puts the originals back exactly as they were.
   Entry points: bulk toolbar (2 selected), detail panel button, and
   window.PL_openCombine(idA, idB) for other workspaces (Library Organizer).
   ============================================================================ */
(function () {
    'use strict';

    const bridge = () => window.PL_libraryBridge || null;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    async function call(path, opts = {}) {
        const init = { headers: { 'Content-Type': 'application/json' }, ...opts };
        if (init.body && typeof init.body !== 'string') init.body = JSON.stringify(init.body);
        const res = await fetch('/api' + path, init);
        let data = null;
        try { data = await res.json(); } catch (e) { data = null; }
        if (!res.ok) {
            const err = new Error((data && data.error) || ('Request failed (' + res.status + ')'));
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    }

    function toast(msg, kind) {
        const b = bridge();
        if (b && b.toast) b.toast(msg, kind || 'success');
    }

    function findVars(text) {
        const b = bridge();
        if (b && b.detectVariables) return b.detectVariables(text || '');
        const found = new Set();
        [/\[\[(.+?)\]\]/g, /\{\{(.+?)\}\}/g, /\(\((.+?)\)\)/g].forEach(re => {
            let m;
            while ((m = re.exec(text || '')) !== null) {
                const v = m[1].trim();
                if (v && v.length < 100) found.add(v);
            }
        });
        return Array.from(found);
    }

    /* ── Similarity (same scorer as the Library Organizer duplicate check) ── */
    function tokenSet(p) {
        return new Set(((p.title || '') + ' ' + (p.content || '')).toLowerCase().slice(0, 400).match(/[a-z0-9]{3,}/g) || []);
    }
    function jaccard(sa, sb) {
        if (!sa.size || !sb.size) return 0;
        let inter = 0;
        sa.forEach(t => { if (sb.has(t)) inter++; });
        return inter / (sa.size + sb.size - inter);
    }

    /* ── Field model ── */
    const asList = v => Array.isArray(v) ? v.filter(Boolean).map(String) : String(v || '').split(',').map(s => s.trim()).filter(Boolean);
    const union = (a, b) => { const out = []; asList(a).concat(asList(b)).forEach(x => { if (!out.some(y => y.toLowerCase() === x.toLowerCase())) out.push(x); }); return out; };
    const joinText = (a, b, sep) => [String(a || '').trim(), String(b || '').trim()].filter(Boolean).join(sep);
    const longer = (a, b) => String(b || '').trim().length > String(a || '').trim().length ? 'b' : 'a';
    const sameList = (a, b) => asList(a).map(x => x.toLowerCase()).sort().join('|') === asList(b).map(x => x.toLowerCase()).sort().join('|');

    const FIELDS = [
        { key: 'title', label: 'Title', kind: 'line', both: false, pick: () => 'a' },
        { key: 'content', label: 'Prompt', kind: 'body', both: true, sep: '\n\n', pick: (A, B) => longer(A.content, B.content) },
        { key: 'description', label: 'Description', kind: 'text', both: true, sep: ' ', pick: (A, B) => longer(A.description, B.description) },
        { key: 'tags', label: 'Tags', kind: 'list', both: true, pick: () => 'both' },
        { key: 'categories', label: 'Categories', kind: 'list', both: true, pick: () => 'both' },
        { key: 'folder_id', label: 'Folder', kind: 'folder', both: false, pick: (A, B) => (A.folder_id || !B.folder_id) ? 'a' : 'b' },
        { key: 'is_favorite', label: 'Favourite', kind: 'fav', both: true, bothLabel: 'Either', pick: (A, B) => (A.is_favorite || B.is_favorite) ? 'both' : 'a' },
        { key: 'notes', label: 'Notes', kind: 'text', both: true, sep: '\n\n', pick: (A, B) => (String(A.notes || '').trim() && String(B.notes || '').trim()) ? 'both' : longer(A.notes, B.notes) },
    ];

    function valueFor(field, choice, A, B) {
        if (choice === 'a') return field.kind === 'list' ? asList(A[field.key]) : A[field.key];
        if (choice === 'b') return field.kind === 'list' ? asList(B[field.key]) : B[field.key];
        if (field.kind === 'list') return union(A[field.key], B[field.key]);
        if (field.kind === 'fav') return (A.is_favorite || B.is_favorite) ? 1 : 0;
        return joinText(A[field.key], B[field.key], field.sep || '\n\n');
    }

    function isSame(field, A, B) {
        const a = A[field.key], b = B[field.key];
        if (field.kind === 'list') return sameList(a, b);
        if (field.kind === 'fav') return !!a === !!b;
        if (field.kind === 'folder') return (a || null) === (b || null);
        return String(a || '').trim() === String(b || '').trim();
    }

    /* ── State ── */
    let S = null;
    let lastUndo = null;
    let snackTimer = null;

    function overlay() {
        let el = document.getElementById('cmbOverlay');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'cmbOverlay';
        el.className = 'cmb-overlay';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.setAttribute('aria-labelledby', 'cmbHeading');
        el.innerHTML = '<div class="cmb-box" tabindex="-1"></div>';
        el.addEventListener('mousedown', e => { if (e.target === el) closeCombine(); });
        el.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeCombine(); } });
        document.body.appendChild(el);
        return el;
    }
    const box = () => overlay().querySelector('.cmb-box');

    function show() {
        const el = overlay();
        el.classList.add('open');
        document.body.classList.add('cmb-lock');
        requestAnimationFrame(() => box().focus());
    }

    function closeCombine() {
        const el = document.getElementById('cmbOverlay');
        if (!el || !el.classList.contains('open')) return;
        el.classList.remove('open');
        document.body.classList.remove('cmb-lock');
        if (S && S.done && lastUndo) showSnack();
        S = null;
    }

    function folders() {
        const b = bridge();
        return (b && b.getState && b.getState().folders) || [];
    }
    function folderName(id) {
        if (!id) return 'No folder';
        const f = folders().find(x => String(x.id) === String(id));
        return f ? f.name : 'Folder ' + id;
    }
    function inVaultMode() {
        const b = bridge();
        const st = b && b.getState ? b.getState() : null;
        return !!(st && st.librarySource && st.librarySource.type === 'vault');
    }

    /* ── Picker: choose the second prompt ── */
    async function openPicker(id) {
        if (inVaultMode()) { toast('Combine works on library prompts, not local library files', 'info'); return; }
        let base, list;
        try {
            [base, list] = await Promise.all([call('/prompts/' + id), call('/prompts')]);
        } catch (e) { toast('Could not load prompts', 'error'); return; }
        const set = tokenSet(base);
        const ranked = list.filter(p => p.id !== base.id)
            .map(p => ({ p, score: jaccard(set, tokenSet(p)) }))
            .sort((x, y) => y.score - x.score);
        S = { mode: 'pick', base, ranked, query: '' };
        renderPicker();
        show();
        setTimeout(() => box().querySelector('[data-cmb-search]')?.focus(), 60);
    }

    function renderPicker() {
        const q = S.query.trim().toLowerCase();
        const rows = (q ? S.ranked.filter(r => ((r.p.title || '') + ' ' + (r.p.content || '')).toLowerCase().includes(q)) : S.ranked).slice(0, 8);
        box().innerHTML =
            '<header class="cmb-head"><div><div class="cmb-eyebrow">Combine</div>' +
            '<h2 id="cmbHeading" class="cmb-title">Combine “' + esc(S.base.title || 'Untitled') + '” with…</h2>' +
            '<p class="cmb-sub">Most similar first. You choose what to keep from each before anything is removed.</p></div>' +
            '<button type="button" class="icon-btn" data-cmb-close aria-label="Close"><span class="material-symbols-outlined">close</span></button></header>' +
            '<div class="cmb-pick-search"><span class="material-symbols-outlined">search</span><input type="search" placeholder="Search prompts" data-cmb-search value="' + esc(S.query) + '"></div>' +
            '<ul class="cmb-pick-list">' + (rows.length ? rows.map(r =>
                '<li><button type="button" class="cmb-pick-row" data-cmb-pick="' + r.p.id + '">' +
                '<span class="cmb-pick-score' + (r.score >= 0.75 ? ' high' : '') + '">' + Math.round(r.score * 100) + '%</span>' +
                '<span class="cmb-pick-text"><span class="cmb-pick-name">' + esc(r.p.title || 'Untitled') + '</span>' +
                '<span class="cmb-pick-preview">' + esc((r.p.content || '').slice(0, 120)) + '</span></span>' +
                '<span class="material-symbols-outlined">arrow_forward</span></button></li>').join('')
                : '<li class="cmb-empty">No other prompts match.</li>') + '</ul>';
        wireCommon();
        const input = box().querySelector('[data-cmb-search]');
        input.addEventListener('input', () => {
            S.query = input.value;
            const pos = input.selectionStart;
            renderPicker();
            const again = box().querySelector('[data-cmb-search]');
            again.focus();
            again.setSelectionRange(pos, pos);
        });
        box().querySelectorAll('[data-cmb-pick]').forEach(btn => btn.addEventListener('click', () => openCompare(S.base.id, parseInt(btn.dataset.cmbPick, 10))));
    }

    /* ── Compare: pick or edit each field ── */
    async function openCompare(idA, idB) {
        if (inVaultMode()) { toast('Combine works on library prompts, not local library files', 'info'); return; }
        if (!idA || !idB || idA === idB) { toast('Pick two different prompts to combine', 'warning'); return; }
        let A, B;
        try {
            [A, B] = await Promise.all([call('/prompts/' + idA), call('/prompts/' + idB)]);
        } catch (e) { toast('Could not load both prompts', 'error'); return; }
        const choice = {}, value = {}, edited = {};
        FIELDS.forEach(f => { choice[f.key] = f.pick(A, B); value[f.key] = valueFor(f, choice[f.key], A, B); });
        S = { mode: 'compare', A, B, choice, value, edited, varPick: {}, similarity: Math.round(jaccard(tokenSet(A), tokenSet(B)) * 100), saving: false };
        renderCompare();
        show();
    }

    function choiceButtons(f) {
        const opts = [['a', 'A'], ['b', 'B']];
        if (f.both) opts.push(['both', f.bothLabel || (f.kind === 'list' ? 'Both' : 'A then B')]);
        return '<div class="cmb-seg" role="group" aria-label="' + esc(f.label) + ' source">' + opts.map(([k, l]) =>
            '<button type="button" class="cmb-seg-btn' + (S.choice[f.key] === k && !S.edited[f.key] ? ' on' : '') + '" data-cmb-choice="' + f.key + '" data-val="' + k + '" aria-pressed="' + (S.choice[f.key] === k && !S.edited[f.key]) + '">' + l + '</button>').join('') +
            (S.edited[f.key] ? '<span class="cmb-edited">Edited</span>' : '') + '</div>';
    }

    function preview(f, p) {
        const v = p[f.key];
        if (f.kind === 'list') return asList(v).length ? asList(v).map(t => '<span class="cmb-chip">' + esc(t) + '</span>').join('') : '<span class="cmb-none">None</span>';
        if (f.kind === 'folder') return esc(folderName(v));
        if (f.kind === 'fav') return v ? 'Favourite' : 'Not a favourite';
        const t = String(v || '').trim();
        if (!t) return '<span class="cmb-none">Empty</span>';
        return f.kind === 'body' ? '<pre class="cmb-pre">' + esc(t) + '</pre>' : esc(t);
    }

    function editor(f) {
        const v = S.value[f.key];
        if (f.kind === 'line') return '<input type="text" class="cmb-input" data-cmb-edit="' + f.key + '" value="' + esc(v) + '">';
        if (f.kind === 'list') return '<input type="text" class="cmb-input" data-cmb-edit="' + f.key + '" value="' + esc(asList(v).join(', ')) + '" placeholder="Comma separated">';
        if (f.kind === 'folder') {
            return '<select class="cmb-input" data-cmb-edit="folder_id"><option value="">No folder</option>' +
                folders().map(x => '<option value="' + x.id + '"' + (String(x.id) === String(v || '') ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select>';
        }
        if (f.kind === 'fav') return '<label class="cmb-fav"><input type="checkbox" data-cmb-edit="is_favorite"' + (v ? ' checked' : '') + '> Keep as a favourite</label>';
        const rows = f.kind === 'body' ? 10 : 3;
        return '<textarea class="cmb-input' + (f.kind === 'body' ? ' cmb-mono' : '') + '" rows="' + rows + '" data-cmb-edit="' + f.key + '">' + esc(v) + '</textarea>';
    }

    function mergedVariables() {
        const { A, B, value, varPick } = S;
        const ma = A.variable_meta || {}, mb = B.variable_meta || {};
        return findVars(value.content).map(name => {
            const a = ma[name], b = mb[name];
            const clash = a && b && JSON.stringify(a) !== JSON.stringify(b);
            const from = clash ? (varPick[name] || 'a') : (a ? 'a' : (b ? 'b' : ''));
            return { name, clash, from, meta: from === 'a' ? a : (from === 'b' ? b : null) };
        });
    }

    function varsBlock() {
        const vars = mergedVariables();
        if (!vars.length) return '<p class="cmb-none">No variables in the combined prompt.</p>';
        return '<ul class="cmb-vars">' + vars.map(v => {
            const type = (v.meta && v.meta.type) || 'text';
            const label = v.from ? 'settings from ' + v.from.toUpperCase() : 'default settings';
            return '<li><code>' + esc(v.name) + '</code><span class="cmb-var-type">' + esc(type) + '</span>' +
                (v.clash
                    ? '<span class="cmb-seg cmb-seg-sm" role="group" aria-label="Settings for ' + esc(v.name) + '">' + ['a', 'b'].map(k => '<button type="button" class="cmb-seg-btn' + (v.from === k ? ' on' : '') + '" data-cmb-var="' + esc(v.name) + '" data-val="' + k + '">' + k.toUpperCase() + '</button>').join('') + '</span><span class="cmb-var-note">set up differently in each</span>'
                    : '<span class="cmb-var-note">' + label + '</span>') + '</li>';
        }).join('') + '</ul>';
    }

    function renderCompare() {
        const { A, B } = S;
        const same = FIELDS.filter(f => f.key !== 'content' && f.key !== 'title' && isSame(f, A, B));
        const rows = FIELDS.filter(f => !same.includes(f)).map(f =>
            '<section class="cmb-row' + (f.kind === 'body' ? ' cmb-row-body' : '') + '" data-cmb-row="' + f.key + '">' +
            '<div class="cmb-row-head"><h3>' + esc(f.label) + '</h3>' + (isSame(f, A, B) ? '<span class="cmb-same">Same in both</span>' : choiceButtons(f)) + '</div>' +
            (isSame(f, A, B) ? '' : '<div class="cmb-sides"><div class="cmb-side"><span class="cmb-tag">A</span><div class="cmb-side-val">' + preview(f, A) + '</div></div>' +
                '<div class="cmb-side"><span class="cmb-tag">B</span><div class="cmb-side-val">' + preview(f, B) + '</div></div></div>') +
            '<div class="cmb-result"><span class="cmb-result-label">Combined</span>' + editor(f) + '</div></section>').join('');
        const sameLine = same.length ? '<p class="cmb-sameline">Same in both, kept as is: ' + same.map(f => esc(f.label.toLowerCase())).join(', ') + '.</p>' : '';
        box().innerHTML =
            '<header class="cmb-head"><div><div class="cmb-eyebrow">Combine · ' + S.similarity + '% similar</div>' +
            '<h2 id="cmbHeading" class="cmb-title">Choose what to keep from each</h2>' +
            '<p class="cmb-pair"><span class="cmb-tag">A</span>' + esc(A.title || 'Untitled') + '<span class="cmb-tag">B</span>' + esc(B.title || 'Untitled') + '</p></div>' +
            '<button type="button" class="icon-btn" data-cmb-close aria-label="Close"><span class="material-symbols-outlined">close</span></button></header>' +
            '<div class="cmb-scroll">' + rows +
            '<section class="cmb-row" data-cmb-row="variables"><div class="cmb-row-head"><h3>Variables</h3><span class="cmb-same">Follows the combined prompt</span></div><div data-cmb-vars>' + varsBlock() + '</div></section>' +
            sameLine +
            '<p class="cmb-carry">Also carried over: highest rating, colour, role, use count added up, board pins and related links.</p></div>' +
            '<footer class="cmb-foot"><p class="cmb-foot-note">Saves one combined prompt, then removes both originals. You can undo straight after.</p>' +
            '<div class="cmb-foot-btns"><button type="button" class="btn btn-ghost" data-cmb-close>Cancel</button>' +
            '<button type="button" class="btn btn-primary" data-cmb-save' + (S.saving ? ' disabled' : '') + '>Combine and remove originals</button></div></footer>';
        wireCommon();
        wireCompare();
    }

    function refreshVars() {
        const holder = box().querySelector('[data-cmb-vars]');
        if (holder) { holder.innerHTML = varsBlock(); wireVarPicks(); }
    }

    function wireVarPicks() {
        box().querySelectorAll('[data-cmb-var]').forEach(btn => btn.addEventListener('click', () => {
            S.varPick[btn.dataset.cmbVar] = btn.dataset.val;
            refreshVars();
        }));
    }

    function fieldOf(key) { return FIELDS.find(x => x.key === key); }

    function bindSeg(row, f) {
        row.querySelectorAll('[data-cmb-choice]').forEach(b => b.addEventListener('click', () => {
            S.choice[f.key] = b.dataset.val;
            S.value[f.key] = valueFor(f, b.dataset.val, S.A, S.B);
            S.edited[f.key] = false;
            row.querySelector('.cmb-seg').outerHTML = choiceButtons(f);
            row.querySelector('.cmb-result').innerHTML = '<span class="cmb-result-label">Combined</span>' + editor(f);
            bindRow(row, f);
            if (f.key === 'content') refreshVars();
        }));
    }

    function bindEditor(row, f) {
        const el = row.querySelector('[data-cmb-edit]');
        if (!el) return;
        const onChange = () => {
            if (f.kind === 'list') S.value[f.key] = asList(el.value);
            else if (f.kind === 'fav') S.value[f.key] = el.checked ? 1 : 0;
            else if (f.kind === 'folder') S.value[f.key] = el.value ? parseInt(el.value, 10) : null;
            else S.value[f.key] = el.value;
            if (!S.edited[f.key]) {
                S.edited[f.key] = true;
                const seg = row.querySelector('.cmb-seg');
                if (seg) { seg.outerHTML = choiceButtons(f); bindSeg(row, f); }
            }
            if (f.key === 'content') refreshVars();
        };
        el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', onChange);
    }

    function bindRow(row, f) {
        bindSeg(row, f);
        bindEditor(row, f);
    }

    function wireCompare() {
        box().querySelectorAll('[data-cmb-row]').forEach(row => {
            const f = fieldOf(row.dataset.cmbRow);
            if (f) bindRow(row, f);
        });
        wireVarPicks();
        box().querySelector('[data-cmb-save]')?.addEventListener('click', save);
    }

    function buildPayload() {
        const { A, B, value } = S;
        const pickA = (k, fallback) => (A[k] !== null && A[k] !== undefined && A[k] !== '') ? A[k] : (B[k] !== undefined ? B[k] : fallback);
        const meta = {};
        mergedVariables().forEach(v => { if (v.meta) meta[v.name] = v.meta; });
        return {
            title: String(value.title || '').trim() || 'Untitled',
            content: String(value.content || ''),
            description: String(value.description || '').trim(),
            tags: asList(value.tags),
            categories: asList(value.categories),
            folder_id: value.folder_id || null,
            is_favorite: value.is_favorite ? 1 : 0,
            notes: String(value.notes || '').trim(),
            variable_meta: meta,
            colour_label: pickA('colour_label', ''),
            rating: Math.max(A.rating || 0, B.rating || 0),
            role_id: pickA('role_id', null),
            chat_turns: (A.chat_turns && A.chat_turns.length) ? A.chat_turns : (B.chat_turns || []),
            chain_ids: union(A.chain_ids, B.chain_ids),
            status: 'active',
            prompt_domain: pickA('prompt_domain', ''),
            prompt_use_case: pickA('prompt_use_case', ''),
            prompt_output_format: pickA('prompt_output_format', ''),
            prompt_tone: pickA('prompt_tone', ''),
        };
    }

    async function save() {
        if (!S || S.saving) return;
        const payload = buildPayload();
        if (!payload.content.trim()) { toast('The combined prompt needs some content', 'warning'); return; }
        S.saving = true;
        const btn = box().querySelector('[data-cmb-save]');
        if (btn) { btn.disabled = true; btn.textContent = 'Combining…'; }
        try {
            const res = await call('/prompts/combine', { method: 'POST', body: { source_ids: [S.A.id, S.B.id], prompt: payload } });
            lastUndo = { token: res.undo_token, id: res.id, title: payload.title };
            S.done = true;
            await refreshLibrary(res.removed_ids || [S.A.id, S.B.id]);
            notifyChanged({ combinedId: res.id, removedIds: res.removed_ids || [S.A.id, S.B.id] });
            renderDone(payload.title, res.id);
        } catch (e) {
            S.saving = false;
            if (btn) { btn.disabled = false; btn.textContent = 'Combine and remove originals'; }
            toast(e.message || 'Could not combine', 'error');
        }
    }

    async function refreshLibrary(removedIds) {
        const b = bridge();
        if (!b) return;
        try {
            const st = b.getState();
            if (st && removedIds.includes(st.detailId)) b.closeDetailPanel();
            const sel = b.getBulkSelection ? b.getBulkSelection() : [];
            if (sel.some(id => removedIds.includes(id))) b.bulkDeselectAll();
            await b.loadPrompts();
            await b.loadFilterOptions();
        } catch (e) { console.error('combine refresh:', e); }
    }

    function notifyChanged(detail) {
        try { window.dispatchEvent(new CustomEvent('pl:prompts-combined', { detail })); } catch (e) { /* older WebView */ }
    }

    function renderDone(title, id) {
        box().innerHTML =
            '<header class="cmb-head"><div><div class="cmb-eyebrow">Combined</div>' +
            '<h2 id="cmbHeading" class="cmb-title">“' + esc(title) + '” is ready</h2>' +
            '<p class="cmb-sub">The two originals have been removed. Undo brings them back exactly as they were.</p></div>' +
            '<button type="button" class="icon-btn" data-cmb-close aria-label="Close"><span class="material-symbols-outlined">close</span></button></header>' +
            '<footer class="cmb-foot cmb-foot-done"><button type="button" class="btn btn-ghost" data-cmb-undo><span class="material-symbols-outlined">undo</span> Undo</button>' +
            '<div class="cmb-foot-btns"><button type="button" class="btn btn-ghost" data-cmb-close>Close</button>' +
            '<button type="button" class="btn btn-primary" data-cmb-open>Open combined prompt</button></div></footer>';
        wireCommon();
        box().querySelector('[data-cmb-undo]').addEventListener('click', () => undo(false));
        box().querySelector('[data-cmb-open]').addEventListener('click', () => {
            closeCombine();
            const b = bridge();
            if (b && b.openDetail) b.openDetail(id);
        });
    }

    async function undo(force) {
        if (!lastUndo) return;
        try {
            const res = await call('/prompts/combine/undo', { method: 'POST', body: { undo_token: lastUndo.token, force: !!force } });
            const combinedId = lastUndo.id;
            lastUndo = null;
            hideSnack();
            if (S) S.done = false;
            closeCombine();
            const b = bridge();
            if (b) {
                const st = b.getState();
                if (st && st.detailId === combinedId) b.closeDetailPanel();
                try { await b.loadPrompts(); await b.loadFilterOptions(); } catch (e) { console.error(e); }
            }
            notifyChanged({ undone: true, combinedId, restoredIds: res.restored_ids || [] });
            toast('Both originals are back', 'success');
        } catch (e) {
            if (e.status === 409 && e.data && e.data.edited) {
                if (confirm('The combined prompt was edited after combining. Undo anyway and lose those edits?')) return undo(true);
                return;
            }
            lastUndo = null;
            hideSnack();
            toast(e.message || 'Could not undo', 'error');
        }
    }

    /* ── Undo snackbar after the dialog closes ── */
    function showSnack() {
        hideSnack();
        const el = document.createElement('div');
        el.className = 'cmb-snack';
        el.id = 'cmbSnack';
        el.setAttribute('role', 'status');
        el.innerHTML = '<span>Combined into “' + esc(lastUndo.title) + '”</span><button type="button" class="cmb-snack-btn">Undo</button>';
        el.querySelector('button').addEventListener('click', () => undo(false));
        document.body.appendChild(el);
        snackTimer = setTimeout(hideSnack, 10000);
    }
    function hideSnack() {
        clearTimeout(snackTimer);
        document.getElementById('cmbSnack')?.remove();
    }

    function wireCommon() {
        box().querySelectorAll('[data-cmb-close]').forEach(b => b.addEventListener('click', closeCombine));
    }

    /* ── Public entry points ── */
    window.PL_openCombine = function (idA, idB) {
        idA = parseInt(idA, 10);
        idB = parseInt(idB, 10);
        if (idA && idB) return openCompare(idA, idB);
        if (idA) return openPicker(idA);
    };
    window.PL_undoLastCombine = () => undo(false);

    function wireEntryPoints() {
        document.getElementById('bulkCombineBtn')?.addEventListener('click', () => {
            const b = bridge();
            const ids = b && b.getBulkSelection ? b.getBulkSelection() : [];
            if (ids.length !== 2) { toast('Select exactly two prompts to combine', 'info'); return; }
            openCompare(ids[0], ids[1]);
        });
        document.getElementById('panelCombineBtn')?.addEventListener('click', () => {
            const b = bridge();
            const id = b && b.getState ? b.getState().detailId : null;
            if (!id) return;
            openPicker(id);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireEntryPoints);
    else wireEntryPoints();
})();
