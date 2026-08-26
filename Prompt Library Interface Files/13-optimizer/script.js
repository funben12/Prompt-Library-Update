/* Prompt Optimizer — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    window.openOptimizerWorkspace = function() {
        if (!state.isPremium) {
            showPremiumModal();
            return;
        }
        $('#optimizerWorkspace')?.classList.add('open');
        $$('.nav-item[data-view]').forEach(el =>
            el.classList.toggle('active', el.dataset.view === 'optimizer'));
        setTimeout(() => $('#optPromptInput')?.focus(), 80);
    };

    function closeOptimizerWorkspace() {
        $('#optimizerWorkspace')?.classList.remove('open');
        $$('.nav-item[data-view]').forEach(el =>
            el.classList.toggle('active', el.dataset.view === 'library'));
    }

    

    function _optSelectHistory(id) {
        const item = _optState.history.find(h => h.id === id);
        if (!item) return;
        const idx = _optState.selectedForCompare.indexOf(id);
        if (idx === -1) {
            if (_optState.selectedForCompare.length >= 2) _optState.selectedForCompare.shift();
            _optState.selectedForCompare.push(id);
        } else {
            _optState.selectedForCompare.splice(idx, 1);
        }
        _optRenderHistory();
        _optRenderCompare();
        const out = $('#optOutput');
        if (out) {
            out.textContent = item.output;
        }
        _optState.currentOutput = item.output;
        const actions = $('#optOutputActions');
        if (actions) actions.style.display = 'flex';
    }

    

    async function _optRunOptimize() {
        const prompt = $('#optPromptInput')?.value?.trim();
        if (!prompt) {
            toast('Paste a prompt first', 'warning');
            return;
        }
        const frameworks = Array.from(_optState.selectedFrameworks).join(', ');
        const techniques = Array.from(_optState.selectedTechniques.entries())
            .map(([t, lvl]) => lvl > 1 ? t + ' (emphasis ×' + lvl + ')' : t).join(', ');
        const custom = $('#optCustomInstructions')?.value?.trim();
        const sys = 'You are an expert prompt engineer. Optimize the given prompt and return: 1. The optimized prompt 2. Key improvements 3. Why these changes work. End your response with SCORE: [number 1-100] reflecting the optimized prompt quality. Plain text only, no markdown fencing.';
        let usr = 'Optimize this prompt:\n\n"' + prompt + '"\n\n';
        if (frameworks) usr += 'Apply frameworks: ' + frameworks + '.\n';
        if (techniques) usr += 'Enhance with techniques: ' + techniques + '.\n';
        if (custom) usr += 'Additional requirements: ' + custom + '.\n';
        const out = $('#optOutput');
        if (out) out.innerHTML = '<span class="hint">⏳ Optimizing…</span>';
        const result = await callAI(sys, usr, 1800);
        const scoreMatch = result.match(/SCORE:\s*(\d{1,3})/i);
        const score = scoreMatch ? Math.min(100, parseInt(scoreMatch[1])) : 75;
        const clean = scoreMatch ? result.slice(0, result.lastIndexOf('SCORE:')).trim() : result;
        if (out) out.textContent = clean;
        _optState.currentOutput = clean;
        const actions = $('#optOutputActions');
        if (actions) actions.style.display = 'flex';
        _optSetScore(Math.min(95, score + 5));
        _optAddHistory('optimize', prompt, clean, score);
        toast('Prompt optimized', 'success');
    }

    

    function initOptimizerWorkspace() {
        const ws = $('#optimizerWorkspace');
        if (!ws) return;

        $$('#optimizerWorkspace .opt-fw-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const fw = this.dataset.fw;
                if (_optState.selectedFrameworks.has(fw)) {
                    _optState.selectedFrameworks.delete(fw);
                    this.classList.remove('active');
                } else {
                    _optState.selectedFrameworks.add(fw);
                    this.classList.add('active');
                }
            });
        });

        $$('#optimizerWorkspace .opt-tech-btn').forEach(btn => {
            btn.dataset.label = btn.textContent;
            btn.addEventListener('click', function() {
                const tech = this.dataset.tech;
                const lbl = this.dataset.label;
                const cur = _optState.selectedTechniques.get(tech) || 0;
                if (cur >= 12) {
                    _optState.selectedTechniques.delete(tech);
                    this.classList.remove('active');
                    this.removeAttribute('data-level');
                    this.textContent = lbl;
                } else {
                    const next = cur + 1;
                    _optState.selectedTechniques.set(tech, next);
                    this.classList.add('active');
                    this.dataset.level = next;
                    this.textContent = lbl + ' ×' + next;
                }
            });
        });

        $('#optSelectAllTechBtn')?.addEventListener('click', () => {
            $$('#optimizerWorkspace .opt-tech-btn').forEach(btn => {
                _optState.selectedTechniques.set(btn.dataset.tech, 1);
                btn.classList.add('active');
                btn.dataset.level = '1';
                btn.textContent = btn.dataset.label + ' ×1';
            });
        });
        $('#optClearTechBtn')?.addEventListener('click', () => {
            _optState.selectedTechniques.clear();
            $$('#optimizerWorkspace .opt-tech-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.removeAttribute('data-level');
                btn.textContent = btn.dataset.label;
            });
        });

        $('#optOptimizeBtn')?.addEventListener('click', async function() {
            this.disabled = true;
            this.innerHTML = '<span class="material-symbols-outlined" style="animation:spin 1s linear infinite">progress_activity</span> Optimizing…';
            try {
                await _optRunOptimize();
            } catch (err) {
                const out = $('#optOutput');
                if (out) out.innerHTML = '<span class="hint">Error: ' + escapeHtml(err.message) + '</span>';
                toast('Optimization failed: ' + err.message, 'error');
            } finally {
                this.disabled = false;
                this.innerHTML = '<span class="material-symbols-outlined">rocket_launch</span> Optimize';
            }
        });

        $('#optAnalyzeBtn')?.addEventListener('click', async function() {
            this.disabled = true;
            this.innerHTML = '<span class="material-symbols-outlined" style="animation:spin 1s linear infinite">progress_activity</span> Analyzing…';
            try {
                await _optRunAnalyze();
            } catch (err) {
                const out = $('#optOutput');
                if (out) out.innerHTML = '<span class="hint">Error: ' + escapeHtml(err.message) + '</span>';
                toast('Analysis failed: ' + err.message, 'error');
            } finally {
                this.disabled = false;
                this.innerHTML = '<span class="material-symbols-outlined">analytics</span> Analyze';
            }
        });

        $('#optCopyBtn')?.addEventListener('click', async () => {
            const text = _optState.currentOutput || $('#optOutput')?.textContent?.trim();
            if (!text) return;
            if (await copyToClipboard(text)) toast('Output copied', 'success');
        });

        $('#optSaveBtn')?.addEventListener('click', async () => {
            if (!_optState.currentOutput) {
                toast('Optimize a prompt first', 'warning');
                return;
            }
            const raw = $('#optPromptInput')?.value?.trim() || '';
            const title = (raw.split(' ').slice(0, 6).join(' ') || 'Optimized prompt') + ' (opt)';
            try {
                const result = await api('/prompts', {
                    method: 'POST',
                    body: {
                        title,
                        content: _optState.currentOutput,
                        description: 'Optimized via Prompt Optimizer workspace',
                        categories: 'Prompt Engineering',
                        tags: 'optimized'
                    }
                });
                await loadPrompts();
                await loadFilterOptions();
                toast('Saved: ' + title, 'success');
                closeOptimizerWorkspace();
                if (result?.id) setTimeout(() => openDetail(result.id), 200);
            } catch {
                toast('Could not save', 'error');
            }
        });

        $('#closeOptimizerBtn')?.addEventListener('click', closeOptimizerWorkspace);
        ws.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeOptimizerWorkspace();
        });
    }

    
