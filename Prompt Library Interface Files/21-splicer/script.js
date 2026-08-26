/* Prompt Splicer — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    function _splRun() {
        const a = $('#splInputA')?.value?.trim();
        const b = $('#splInputB')?.value?.trim();
        if (!a || !b) {
            toast('Fill both sides first', 'warning');
            return;
        }
        _splParts = {
            a: _wsSplitComponents(a),
            b: _wsSplitComponents(b)
        };
        const grid = $('#splGrid');
        if (!grid) return;
        grid.innerHTML = XRAY_PARTS.filter(p => p.key !== 'other').map(p => {
            const av = (_splParts.a[p.key] || []).join('\n');
            const bv = (_splParts.b[p.key] || []).join('\n');
            // Default pick: whichever side has content; A wins ties.
            const pick = av ? 'a' : (bv ? 'b' : 'none');
            const cell = (side, val) =>
                '<label class="spl-side' + (pick === side ? ' picked' : '') + (val ? '' : ' spl-empty') + '">' +
                '<input type="radio" name="spl-' + p.key + '" value="' + side + '"' + (pick === side ? ' checked' : '') + (val ? '' : ' disabled') + ' />' +
                '<span class="spl-side-tag">' + side.toUpperCase() + '</span>' +
                '<span class="spl-side-text">' + (val ? escapeHtml(val.length > 220 ? val.slice(0, 220) + '…' : val) : '<em>not present</em>') + '</span>' +
                '</label>';
            return '<div class="spl-row" data-spl-key="' + p.key + '">' +
                '<div class="spl-row-label"><span class="material-symbols-outlined">' + p.icon + '</span>' + p.label +
                (av || bv ? '' : ' <span class="xr-chip">Missing in both</span>') + '</div>' +
                '<div class="spl-pair">' + cell('a', av) + cell('b', bv) + '</div>' +
                '</div>';
        }).join('');
        const actions = $('#splActions');
        if (actions) actions.style.display = 'flex';
        _splPreview();
    }

    

    function _splPreview() {
        const out = $('#splPreview');
        if (!out) return;
        // Sync .picked highlight with radio state
        $$('#splGrid .spl-side').forEach(l => l.classList.toggle('picked', l.querySelector('input')?.checked || false));
        const text = _splAssemble();
        out.innerHTML = text ? escapeHtml(text) : '<span class="hint">Pick components above to build the hybrid…</span>';
    }

    

    function closeSpliceWorkspace() {
        $('#spliceWorkspace')?.classList.remove('open');
        document.body.style.overflow = '';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
    }

    
