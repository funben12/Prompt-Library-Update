/* Settings / config panel — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */


    /* ── Config Panel (API key storage) ─────────────────────────────────────── */
    function initConfigPanel() {
        const toggleBtn = $('#configToggleBtn');
        const panel = $('#configPanel');
        if (!toggleBtn || !panel) return;

        // Sync API keys with the DB file. The DB copy is durable; localStorage is
        // the working copy callAI reads. Existing localStorage-only keys migrate up.
        (async () => {
            try {
                const dbKeys = await api('/settings/ai-keys');
                for (const p of ['openai', 'anthropic', 'gemini', 'openrouter']) {
                    const local = localStorage.getItem(`pl_api_key_${p}`) || '';
                    const remote = (dbKeys && dbKeys[p]) || '';
                    if (remote && remote !== local) {
                        localStorage.setItem(`pl_api_key_${p}`, remote);
                    } else if (local && !remote) {
                        await api('/settings/ai-keys', {
                            method: 'POST',
                            body: {
                                provider: p,
                                key: local
                            }
                        });
                    }
                }
            } catch (e) {
                console.warn('ai-key sync:', e);
            }
        })();

        // Toggle open/close
        toggleBtn.addEventListener('click', () => {
            const open = panel.classList.toggle('open');
            toggleBtn.classList.toggle('active', open);
            if (open) loadConfigSettings();
        });

        // Close button inside panel
        const closeBtn = $('#configCloseBtn');
        if (closeBtn) closeBtn.addEventListener('click', () => {
            panel.classList.remove('open');
            toggleBtn.classList.remove('active');
        });

        // Provider tab switching
        $$('.config-provider-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                $$('.config-provider-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const provider = tab.dataset.provider;
                const saved = localStorage.getItem(`pl_api_key_${provider}`) || '';
                const input = $('#configApiKeyInput');
                if (input) input.value = saved;
                const modelRow = $('#configModelRow');
                const modelInput = $('#configModelInput');
                if (modelRow) modelRow.style.display = provider === 'openrouter' ? '' : 'none';
                if (modelInput && provider === 'openrouter') modelInput.value = localStorage.getItem('pl_openrouter_model') || '';
            });
        });

        // Save button
        const saveBtn = $('#configSaveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const provider = ($$('.config-provider-tab.active')[0]?.dataset.provider) || 'openai';
                const key = $('#configApiKeyInput')?.value?.trim() || '';
                if (provider === 'openrouter') {
                    const model = $('#configModelInput')?.value?.trim() || '';
                    if (model) localStorage.setItem('pl_openrouter_model', model);
                    else localStorage.removeItem('pl_openrouter_model');
                }
                if (key) {
                    localStorage.setItem(`pl_api_key_${provider}`, key);
                    localStorage.setItem('pl_ai_provider', provider);
                    api('/settings/ai-keys', {
                        method: 'POST',
                        body: {
                            provider,
                            key
                        }
                    }).catch(() => {});
                    const status = $('#configStatus');
                    if (status) {
                        status.textContent = 'Saved to your database.';
                        setTimeout(() => {
                            status.textContent = '';
                        }, 2000);
                    }
                } else {
                    localStorage.removeItem(`pl_api_key_${provider}`);
                    api('/settings/ai-keys', {
                        method: 'POST',
                        body: {
                            provider,
                            key: ''
                        }
                    }).catch(() => {});
                    const status = $('#configStatus');
                    if (status) {
                        status.textContent = 'Key cleared.';
                        setTimeout(() => {
                            status.textContent = '';
                        }, 2000);
                    }
                }
            });
        }

        // Close when clicking outside
        document.addEventListener('click', e => {
            if (!panel.contains(e.target) && e.target !== toggleBtn) {
                panel.classList.remove('open');
            }
        });
    }

    
