/* Prompt X-Ray — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    function _xrayRun() {
        const text = $('#xrayInput')?.value?.trim();
        if (!text) {
            toast('Paste a prompt first', 'warning');
            return;
        }
        const parts = _wsSplitComponents(text);
        const grid = $('#xrayGrid');
        if (!grid) return;
        grid.innerHTML = XRAY_PARTS.map(p => {
            const content = (parts[p.key] || []).join('\n');
            const present = !!content.trim();
            if (p.key === 'other' && !present) return '';
            return '<div class="xr-card' + (present ? '' : ' xr-missing') + '">' +
                '<div class="xr-card-head"><span class="material-symbols-outlined">' + p.icon + '</span>' +
                '<span>' + p.label + '</span>' +
                '<span class="xr-chip">' + (present ? 'Found' : 'Missing') + '</span>' +
                '<button class="icon-btn xr-copy" data-xr-part="' + p.key + '" title="Copy section"><span class="material-symbols-outlined" style="font-size:15px;">content_copy</span></button></div>' +
                '<textarea class="forge-input xr-text" data-xr-key="' + p.key + '" rows="3" placeholder="' +
                (present ? '' : 'Nothing detected — add your own ' + p.label.toLowerCase() + ' here…') + '">' + escapeHtml(content) + '</textarea>' +
                '</div>';
        }).join('');
        grid.querySelectorAll('.xr-copy').forEach(btn => {
            btn.addEventListener('click', async () => {
                const ta = grid.querySelector('.xr-text[data-xr-key="' + btn.dataset.xrPart + '"]');
                if (ta?.value.trim() && await copyToClipboard(ta.value.trim())) toast('Section copied', 'success');
            });
        });
        const actions = $('#xrayActions');
        if (actions) actions.style.display = 'flex';
    }

    

    window.openXrayWorkspace = function() {
        if (!state.isPremium) {
            showPremiumModal();
            return;
        }
        const ws = $('#xrayWorkspace');
        if (!ws) return;
        ws.classList.add('open');
        document.body.style.overflow = 'hidden';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'xray'));
        _wsFillPromptPicker('#xrayPicker');
        setTimeout(() => $('#xrayInput')?.focus(), 80);
    };

    function closeXrayWorkspace() {
        $('#xrayWorkspace')?.classList.remove('open');
        document.body.style.overflow = '';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
    }

    
