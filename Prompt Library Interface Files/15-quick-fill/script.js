/* Quick Fill — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    function _qfValues() {
        const vals = {};
        $$('#qfVarList .qf-var-input').forEach(ta => {
            const v = _qfVars[Number(ta.dataset.qfIdx)];
            if (v) vals[v.name] = ta.value;
        });
        return vals;
    }

    

    function _qfRenderPreview() {
        const out = $('#qfPreview');
        if (!out) return;
        const src = $('#qfSource')?.value || '';
        if (!src.trim()) {
            out.innerHTML = '<span class="hint">Pick a prompt or paste a template on the left…</span>';
            const st = $('#qfFillStat');
            if (st) st.textContent = '';
            return;
        }
        const text = _qfResult();
        let html = escapeHtml(text);
        // Any tokens still present were left unfilled — highlight them.
        let remaining = 0;
        _qfVars.forEach(v => {
            const esc = escapeHtml(v.token);
            if (html.includes(esc)) {
                remaining += 1;
                html = html.split(esc).join('<mark class="qf-missing">' + esc + '</mark>');
            }
        });
        out.innerHTML = html;
        const st = $('#qfFillStat');
        if (st) st.textContent = _qfVars.length ?
            (_qfVars.length - remaining) + ' of ' + _qfVars.length + ' filled' :
            '';
    }

    

    function closeFillWorkspace() {
        $('#fillWorkspace')?.classList.remove('open');
        document.body.style.overflow = '';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
    }

    

    function initFillWorkspace() {
        const ws = $('#fillWorkspace');
        if (!ws) return;
        $('#closeFillBtn')?.addEventListener('click', closeFillWorkspace);
        $('#qfSource')?.addEventListener('input', _qfRenderForm);
        $('#qfPicker')?.addEventListener('change', () => {
            const p = _wsPickedPrompt('#qfPicker');
            if (!p) return;
            const src = $('#qfSource');
            if (src) {
                src.value = p.content || '';
                _qfRenderForm();
            }
        });
        $('#qfCopyBtn')?.addEventListener('click', async () => {
            const text = _qfResult().trim();
            if (!text) {
                toast('Nothing to copy yet', 'warning');
                return;
            }
            _qfRememberAll();
            if (await copyToClipboard(text)) toast('Filled prompt copied', 'success');
        });
        $('#qfSaveBtn')?.addEventListener('click', async () => {
            const text = _qfResult().trim();
            if (!text) {
                toast('Fill the template first', 'warning');
                return;
            }
            _qfRememberAll();
            const picked = _wsPickedPrompt('#qfPicker');
            const title = ((picked?.title || text.split(' ').slice(0, 6).join(' ')) + ' (filled)').slice(0, 120);
            try {
                const cats = Array.isArray(picked?.categories) ? picked.categories.join(', ') : (picked?.categories || '');
                const result = await api('/prompts', {
                    method: 'POST',
                    body: {
                        title,
                        content: text,
                        description: 'Filled via Quick Fill workspace',
                        categories: cats,
                        tags: 'quick-fill'
                    }
                });
                await loadPrompts();
                await loadFilterOptions();
                toast('Saved: ' + title, 'success');
                closeFillWorkspace();
                if (result?.id) setTimeout(() => openDetail(result.id), 200);
            } catch {
                toast('Could not save', 'error');
            }
        });
        $('#qfClearBtn')?.addEventListener('click', () => {
            const src = $('#qfSource');
            if (src) src.value = '';
            const pk = $('#qfPicker');
            if (pk) pk.selectedIndex = 0;
            _qfRenderForm();
        });
        ws.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeFillWorkspace();
        });
    }

    
