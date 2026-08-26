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

            const section = (label, icon, arr, hintText) => {
                const items = arr.slice(0, 15);
                return '<div class="pulse-card">' +
                    '<div class="pulse-card-head"><span class="material-symbols-outlined">' + icon + '</span>' +
                    '<span>' + label + '</span><span class="pulse-count' + (arr.length ? '' : ' ok') + '">' + arr.length + '</span></div>' +
                    (arr.length ?
                        items.map(rowFor).join('') + (arr.length > 15 ? '<div class="hint" style="padding:6px 12px;">+' + (arr.length - 15) + ' more…</div>' : '') :
                        '<div class="pulse-clean">' + hintText + '</div>') +
                    '</div>';
            };

            if (body) {
                body.innerHTML =
                    section('Untagged', 'label_important', issues.untagged, 'Every prompt is tagged. ✓') +
                    section('No category', 'category', issues.uncategorised, 'Every prompt has a category. ✓') +
                    section('No description', 'description', issues.undescribed, 'All prompts described. ✓') +
                    section('Thin content', 'compress', issues.thin, 'No under-developed prompts. ✓') +
                    section('Stale (90+ days)', 'history', issues.stale, 'Library is fresh. ✓') +
                    '<div class="pulse-card"><div class="pulse-card-head"><span class="material-symbols-outlined">content_copy</span>' +
                    '<span>Possible duplicates</span><span class="pulse-count' + (dupPairs.length ? '' : ' ok') + '">' + dupPairs.length + '</span></div>' +
                    (dupPairs.length ?
                        dupPairs.map(([a, b]) =>
                            '<div class="pulse-dup-pair">' + rowFor(a) + '<span class="pulse-dup-tie">≈</span>' + rowFor(b) + '</div>').join('') :
                        '<div class="pulse-clean">No near-duplicates found. ✓</div>') +
                    '</div>';
                body.querySelectorAll('[data-pulse-id]').forEach(row => {
                    row.addEventListener('click', () => {
                        const id = parseInt(row.dataset.pulseId, 10);
                        closePulseWorkspace();
                        setTimeout(() => openDetail(id), 150);
                    });
                });
            }
        } catch (e) {
            if (body) body.innerHTML = '<div class="hint" style="padding:var(--sp-4);">Scan failed: ' + escapeHtml(e.message) + '</div>';
        } finally {
            if (scanBtn) scanBtn.disabled = false;
        }
    }

    

    function closePulseWorkspace() {
        $('#pulseWorkspace')?.classList.remove('open');
        document.body.style.overflow = '';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
    }

    
