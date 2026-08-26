/* Prompt Generator — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    window.openGenWorkspace = function() {
        if (!state.isPremium) {
            showPremiumModal();
            return;
        }
        $('#genWorkspace')?.classList.add('open');
        $$('.nav-item[data-view]').forEach(el =>
            el.classList.toggle('active', el.dataset.view === 'generate'));
        setTimeout(() => $('#genTaskInput')?.focus(), 80);
    };

    function closeGenWorkspace() {
        $('#genWorkspace')?.classList.remove('open');
        $$('.nav-item[data-view]').forEach(el =>
            el.classList.toggle('active', el.dataset.view === 'library'));
    }

    

    function _genShowOutput(text) {
        _genState.lastOutput = text;
        const out = $('#genOutput');
        if (out) out.textContent = text;
        const actions = $('#genOutputActions');
        if (actions) actions.hidden = false;
        const count = $('#genTokenCount');
        if (count) count.textContent = '~' + Math.ceil(text.length / 4) + ' tokens · ' + text.length + ' chars';
        _genUpdateStats(text);
    }

    

    function initGenWorkspace() {
        const ws = $('#genWorkspace');
        if (!ws) return;

        // Single-select chip groups
        const wireChips = (containerId, stateKey) => {
            $$('#' + containerId + ' .gen-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    $$('#' + containerId + ' .gen-chip').forEach(b => {
                        b.classList.remove('active');
                        b.setAttribute('aria-pressed', 'false');
                    });
                    btn.classList.add('active');
                    btn.setAttribute('aria-pressed', 'true');
                    _genState[stateKey] = btn.dataset.value;
                });
            });
        };
        wireChips('genTypeChips', 'type');
        wireChips('genDetailChips', 'detail');
        wireChips('genCreativityChips', 'creativity');

        // Framework rail: single-select
        $$('#genFrameworks .opt-fw-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('#genFrameworks .opt-fw-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                _genState.framework = btn.dataset.fw;
            });
        });

        // Techniques: multi-select toggle
        $$('#genTechniques .opt-tech-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const t = btn.dataset.tech;
                if (_genState.techniques.has(t)) {
                    _genState.techniques.delete(t);
                    btn.classList.remove('active');
                } else {
                    _genState.techniques.add(t);
                    btn.classList.add('active');
                }
            });
        });
        $('#genSelectAllTechBtn')?.addEventListener('click', () => {
            $$('#genTechniques .opt-tech-btn').forEach(btn => {
                _genState.techniques.add(btn.dataset.tech);
                btn.classList.add('active');
            });
        });
        $('#genClearTechBtn')?.addEventListener('click', () => {
            _genState.techniques.clear();
            $$('#genTechniques .opt-tech-btn').forEach(btn => btn.classList.remove('active'));
        });

        const runWithSpinner = async () => {
            const btn = $('#genRunBtn');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-outlined" style="animation:spin 1s linear infinite">progress_activity</span> Generating...';
            }
            try {
                await runGeneration();
            } catch (err) {
                toast(err.message || 'Generation failed', 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<span class="material-symbols-outlined">bolt</span> Generate';
                }
            }
        };
        $('#genRunBtn')?.addEventListener('click', runWithSpinner);
        $('#genRegenBtn')?.addEventListener('click', runWithSpinner);

        $('#genCopyBtn')?.addEventListener('click', async () => {
            if (!_genState.lastOutput) return;
            const ok = await copyToClipboard(_genState.lastOutput);
            if (ok) toast('Generated prompt copied', 'success');
        });
        $('#genToOptimizerBtn')?.addEventListener('click', () => {
            if (!_genState.lastOutput) {
                toast('Generate a prompt first', 'warning');
                return;
            }
            closeGenWorkspace();
            window.openOptimizerWorkspace();
            const input = $('#optPromptInput');
            if (input) input.value = _genState.lastOutput;
        });
        $('#genSaveBtn')?.addEventListener('click', async () => {
            const text = _genState.lastOutput;
            if (!text) {
                toast('Generate a prompt first', 'warning');
                return;
            }
            const task = $('#genTaskInput')?.value?.trim() || '';
            const title = (task.split(' ').slice(0, 6).join(' ') || 'Generated prompt') + ' (generated)';
            try {
                const result = await api('/prompts', {
                    method: 'POST',
                    body: {
                        title,
                        content: text,
                        description: 'Created via Prompt Generator workspace',
                        categories: 'Prompt Engineering',
                        tags: 'generated'
                    }
                });
                await loadPrompts();
                await loadFilterOptions();
                toast('Saved: ' + title, 'success');
                closeGenWorkspace();
                if (result?.id) setTimeout(() => openDetail(result.id), 200);
            } catch {
                toast('Could not save', 'error');
            }
        });
        $('#closeGenBtn')?.addEventListener('click', closeGenWorkspace);
        ws.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeGenWorkspace();
        });
    }

    
