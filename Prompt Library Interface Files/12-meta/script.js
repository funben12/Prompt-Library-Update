/* Metaprompting — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    window.openMetaWorkspace = function() {
        $('#metaWorkspace')?.classList.add('open');
        $$('.nav-item[data-view]').forEach(el =>
            el.classList.toggle('active', el.dataset.view === 'meta'));
        setTimeout(() => $('#metaRoughPrompt')?.focus(), 80);
    };

    function closeMetaWorkspace() {
        $('#metaWorkspace')?.classList.remove('open');
        $$('.nav-item[data-view]').forEach(el =>
            el.classList.toggle('active', el.dataset.view === 'library'));
    }

    

    function initMetaWorkspace() {
        const ws = $('#metaWorkspace');
        if (!ws) return;

        $('#metaRunBtn')?.addEventListener('click', async () => {
            const btn = $('#metaRunBtn');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-outlined" style="animation:spin 1s linear infinite">progress_activity</span> Improving...';
            }
            try {
                await runMetaImprovement();
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<span class="material-symbols-outlined">auto_fix_high</span> Improve with AI';
                }
            }
        });
        $('#metaRefineBtn')?.addEventListener('click', async () => {
            // Load current output back into rough for another pass
            const current = $('#metaOutputBody')?.textContent?.trim();
            if (!current || current.includes('⏳') || current.includes('Fill in')) {
                toast('Run an improvement first', 'warning');
                return;
            }
            const rough = $('#metaRoughPrompt');
            if (rough) rough.value = current;
            await runMetaImprovement();
        });
        $('#metaIterateBtn')?.addEventListener('click', async () => {
            const current = $('#metaOutputBody')?.textContent?.trim();
            if (!current) return;
            const rough = $('#metaRoughPrompt');
            if (rough) rough.value = current;
            await runMetaImprovement();
        });
        $('#metaCopyBtn')?.addEventListener('click', async () => {
            const text = $('#metaOutputBody')?.textContent?.trim();
            if (!text) return;
            const ok = await copyToClipboard(text);
            if (ok) toast('Improved prompt copied', 'success');
        });
        $('#metaSaveBtn')?.addEventListener('click', async () => {
            const text = $('#metaOutputBody')?.textContent?.trim();
            if (!text || text.includes('⏳') || text.includes('Fill in')) {
                toast('Improve a prompt first', 'warning');
                return;
            }
            const rough = $('#metaRoughPrompt')?.value?.trim() || '';
            const title = (rough.split(' ').slice(0, 6).join(' ') || 'Improved prompt') + ' (meta)';
            try {
                const result = await api('/prompts', {
                    method: 'POST',
                    body: {
                        title,
                        content: text,
                        description: 'Improved via Metaprompting workspace',
                        categories: 'Prompt Engineering',
                        tags: 'meta,improved'
                    }
                });
                await loadPrompts();
                await loadFilterOptions();
                toast('Saved: ' + title, 'success');
                closeMetaWorkspace();
                if (result?.id) setTimeout(() => openDetail(result.id), 200);
            } catch {
                toast('Could not save', 'error');
            }
        });
        $('#closeMetaBtn')?.addEventListener('click', closeMetaWorkspace);
        ws.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeMetaWorkspace();
        });

        // Live prompt preview — shows as user types in rough prompt box
        const roughEl = $('#metaRoughPrompt');
        const previewPanel = $('#metaPromptPreview');
        const previewBody = $('#metaPromptPreviewBody');
        if (roughEl && previewPanel && previewBody) {
            const _updateMetaPreview = () => {
                const val = roughEl.value.trim();
                if (val) {
                    previewBody.textContent = val;
                    previewPanel.style.display = '';
                } else {
                    previewPanel.style.display = 'none';
                }
            };
            roughEl.addEventListener('input', _updateMetaPreview);
            roughEl.addEventListener('paste', () => setTimeout(_updateMetaPreview, 0));
        }
    }


    
