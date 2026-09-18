/* Library Pulse — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    function _pulseTokenSet(text) {
        return new Set((text || '').toLowerCase().slice(0, 400).match(/[a-z0-9]{3,}/g) || []);
    }

    

    async function _pulseScan() {
        const scanBtn = $('#pulseRescanBtn');
        if (scanBtn) scanBtn.disabled = true;
        const body = $('#pulseBody');
        if (body) body.innerHTML = '<div class="hint" style="padding:var(--sp-4);">⏳ Scanning library…</div>';
        try {
            const data = await api('/prompts');
            const list = Array.isArray(data) ? data : (data.prompts || []);
            const metaEmpty = v => Array.isArray(v) ? !v.length : !String(v || '').trim();
            const issues = {
                untagged: list.filter(p => metaEmpty(p.tags)),
                uncategorised: list.filter(p => metaEmpty(p.categories)),
                undescribed: list.filter(p => metaEmpty(p.description)),
                thin: list.filter(p => (p.content || '').trim().length < 40),
            };
            // Stale — updated/created more than 90 days ago, when a date field exists.
            const cutoff = Date.now() - 90 * 24 * 3600 * 1000;
            issues.stale = list.filter(p => {
                const d = Date.parse(p.updated_at || p.created_at || '');
                return !isNaN(d) && d < cutoff;
            });
            // Near-duplicate pairs — Jaccard over title + content prefix, capped scan.
            const dupPairs = [];
            const capped = list.slice(0, 500).map(p => ({
                p,
                set: _pulseTokenSet((p.title || '') + ' ' + (p.content || ''))
            }));
            for (let i = 0; i < capped.length && dupPairs.length < 30; i++) {
                for (let j = i + 1; j < capped.length; j++) {
                    if (_pulseJaccard(capped[i].set, capped[j].set) >= 0.75) {
                        dupPairs.push([capped[i].p, capped[j].p]);
                        if (dupPairs.length >= 30) break;
                    }
                }
            }
            const total = list.length || 1;
            const pct = arr => arr.length / total;
            const score = Math.max(0, Math.round(100 -
                pct(issues.untagged) * 25 -
                pct(issues.undescribed) * 20 -
                pct(issues.uncategorised) * 15 -
                pct(issues.thin) * 15 -
                Math.min(25, dupPairs.length * 3)));

            const scoreEl = $('#pulseScoreNum');
            if (scoreEl) scoreEl.textContent = score;
            const meta = $('#pulseMeta');
            if (meta) meta.textContent = list.length + ' prompts scanned' + (list.length > 500 ? ' (duplicate check capped at 500)' : '');

            const rowFor = p => '<div class="pulse-row" data-pulse-id="' + escapeAttr(p.id) + '">' +
                '<span class="pulse-row-title">' + escapeHtml(p.title || 'Untitled') + '</span>' +
                '<span class="material-symbols-outlined">chevron_right</span></div>';

            const staleRowFor = p => '<div class="pulse-row pulse-row-checkable">' +
                '<label class="pulse-row-check"><input type="checkbox" data-pulse-stale-id="' + escapeAttr(p.id) + '" /></label>' +
                '<span class="pulse-row-title" data-pulse-id="' + escapeAttr(p.id) + '">' + escapeHtml(p.title || 'Untitled') + '</span>' +
                '</div>';

            const section = (label, icon, arr, hintText, actionKey) => {
                const items = arr.slice(0, 15);
                const suggestBtn = actionKey && arr.length ?
                    '<button class="btn btn-ghost btn-xs" data-pulse-suggest="' + actionKey + '">Suggest</button>' : '';
                return '<div class="pulse-card">' +
                    '<div class="pulse-card-head"><span class="material-symbols-outlined">' + icon + '</span>' +
                    '<span>' + label + '</span><span class="pulse-count' + (arr.length ? '' : ' ok') + '">' + arr.length + '</span>' + suggestBtn + '</div>' +
                    (arr.length ?
                        items.map(rowFor).join('') + (arr.length > 15 ? '<div class="hint" style="padding:6px 12px;">+' + (arr.length - 15) + ' more…</div>' : '') :
                        '<div class="pulse-clean">' + hintText + '</div>') +
                    '</div>';
            };

            const staleArr = issues.stale;
            const staleItems = staleArr.slice(0, 15);
            const staleBulkBar = staleArr.length ?
                '<div class="pulse-bulk-bar">' +
                '<button class="btn btn-ghost btn-xs" id="pulseStaleReviewBtn">Mark reviewed</button>' +
                '<button class="btn btn-danger btn-xs" id="pulseStaleDeleteBtn">Delete selected</button>' +
                '</div>' : '';
            const staleCard = '<div class="pulse-card">' +
                '<div class="pulse-card-head"><span class="material-symbols-outlined">history</span>' +
                '<span>Stale (90+ days)</span><span class="pulse-count' + (staleArr.length ? '' : ' ok') + '">' + staleArr.length + '</span></div>' +
                (staleArr.length ?
                    staleItems.map(staleRowFor).join('') +
                    (staleArr.length > 15 ? '<div class="hint" style="padding:6px 12px;">+' + (staleArr.length - 15) + ' more…</div>' : '') +
                    staleBulkBar :
                    '<div class="pulse-clean">Library is fresh. ✓</div>') +
                '</div>';

            const dupSide = (keep, other) => '<div class="pulse-dup-side">' + rowFor(keep) +
                '<button class="btn btn-ghost btn-xs pulse-dup-keepbtn" data-dup-keep-id="' + escapeAttr(keep.id) + '" data-dup-delete-id="' + escapeAttr(other.id) + '">Keep, delete other</button></div>';

            if (body) {
                body.innerHTML =
                    section('Untagged', 'label_important', issues.untagged, 'Every prompt is tagged. ✓', 'tags') +
                    section('No category', 'category', issues.uncategorised, 'Every prompt has a category. ✓', 'categories') +
                    section('No description', 'description', issues.undescribed, 'All prompts described. ✓') +
                    section('Thin content', 'compress', issues.thin, 'No under-developed prompts. ✓') +
                    staleCard +
                    '<div class="pulse-card"><div class="pulse-card-head"><span class="material-symbols-outlined">content_copy</span>' +
                    '<span>Possible duplicates</span><span class="pulse-count' + (dupPairs.length ? '' : ' ok') + '">' + dupPairs.length + '</span></div>' +
                    (dupPairs.length ?
                        dupPairs.map(([a, b]) =>
                            '<div class="pulse-dup-pair">' + dupSide(a, b) + '<span class="pulse-dup-tie">≈</span>' + dupSide(b, a) + '</div>').join('') :
                        '<div class="pulse-clean">No near-duplicates found. ✓</div>') +
                    '</div>';

                body.querySelectorAll('[data-pulse-id]').forEach(row => {
                    row.addEventListener('click', () => {
                        const id = parseInt(row.dataset.pulseId, 10);
                        closePulseWorkspace();
                        setTimeout(() => openDetail(id), 150);
                    });
                });
                body.querySelectorAll('.pulse-row-check input').forEach(cb => {
                    cb.addEventListener('click', e => e.stopPropagation());
                });
                body.querySelectorAll('[data-pulse-suggest]').forEach(btn => {
                    btn.addEventListener('click', () => _pulseSuggest(btn.dataset.pulseSuggest));
                });
                body.querySelectorAll('[data-dup-keep-id]').forEach(btn => {
                    btn.addEventListener('click', () => _pulseDeleteDuplicate(parseInt(btn.dataset.dupDeleteId, 10)));
                });
                $('#pulseStaleReviewBtn')?.addEventListener('click', () => _pulseStaleBulk('review'));
                $('#pulseStaleDeleteBtn')?.addEventListener('click', () => _pulseStaleBulk('delete'));
            }
        } catch (e) {
            if (body) body.innerHTML = '<div class="hint" style="padding:var(--sp-4);">Scan failed: ' + escapeHtml(e.message) + '</div>';
        } finally {
            if (scanBtn) scanBtn.disabled = false;
        }
    }

    

    async function _pulseStaleBulk(action) {
        const ids = $$('#pulseBody [data-pulse-stale-id]:checked').map(cb => parseInt(cb.dataset.pulseStaleId, 10));
        if (!ids.length) {
            toast('Check at least one prompt first', 'warning');
            return;
        }
        if (action === 'delete' && !confirm('Delete ' + ids.length + ' prompt' + (ids.length !== 1 ? 's' : '') + "? This can't be undone.")) return;
        let ok = 0, failed = 0;
        for (const id of ids) {
            try {
                if (action === 'delete') {
                    await api(`/prompts/${id}`, { method: 'DELETE' });
                } else {
                    const p = state.prompts.find(x => x.id === id) || await api(`/prompts/${id}`);
                    await api(`/prompts/${id}`, { method: 'PUT', body: p });
                }
                ok++;
            } catch {
                failed++;
            }
        }
        toast(ok + (action === 'delete' ? ' deleted' : ' marked reviewed') + (failed ? ', ' + failed + ' failed' : ''), failed ? 'warning' : 'success');
        await _pulseScan();
    }

    

    async function _pulseApplySuggestions() {
        const modal = $('#orgSuggestModal');
        const field = modal?.dataset.field;
        const checked = $$('#orgSuggestList input[type="checkbox"]:checked');
        if (!field || !checked.length) {
            toast('Nothing selected', 'warning');
            return;
        }
        let ok = 0, failed = 0;
        for (const cb of checked) {
            const pid = parseInt(cb.dataset.pid, 10);
            const value = cb.dataset.value;
            const p = state.prompts.find(x => x.id === pid);
            if (!p) { failed++; continue; }
            const nextValues = Array.isArray(p[field]) ? p[field].slice() : [];
            if (!nextValues.includes(value)) nextValues.push(value);
            try {
                await api(`/prompts/${pid}`, { method: 'PUT', body: { ...p, [field]: nextValues } });
                ok++;
            } catch {
                failed++;
            }
        }
        modal?.classList.remove('active');
        toast(ok + ' applied' + (failed ? ', ' + failed + ' failed' : ''), failed ? 'warning' : 'success');
        await _pulseScan();
    }

    

    function closePulseWorkspace() {
        $('#pulseWorkspace')?.classList.remove('open');
        document.body.style.overflow = '';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
    }

    
