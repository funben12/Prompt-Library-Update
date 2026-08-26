/* Prompt Chain — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */


    /* ── Wire input listeners after every render ──────────────── */
    function _chainWireInputs() {
        setTimeout(function() {
            $$('#chainRunnerWrap .chain-var-input').forEach(function(inp) {
                inp.addEventListener('input', function() {
                    _chainSavePhaseVars(parseInt(inp.dataset.phase, 10));
                });
                // Pre-fill from saved state
                const phase = parseInt(inp.dataset.phase, 10);
                const stored = (_chainRunnerState.varMaps[phase] || {})[inp.dataset.var];
                if (stored !== undefined) inp.value = stored;
            });
            // Wire output textareas
            $$('#chainRunnerWrap .chain-output-ta').forEach(function(ta) {
                ta.addEventListener('input', function() {
                    var phase = parseInt(ta.dataset.phase, 10);
                    _chainRunnerState.outputs[phase] = ta.value.trim();
                });
                var phase = parseInt(ta.dataset.phase, 10);
                var stored = _chainRunnerState.outputs[phase] || '';
                if (stored) ta.value = stored;
            });
        }, 0);
    }

    


    /* ── Render all phases ────────────────────────────────────── */
    function renderChainRunner() {
        var wrap = $('#chainRunnerWrap');
        var runBtn = $('#runChainBtn');
        if (!wrap) return;
        var st = _chainRunnerState;
        if (!st.ids.length) {
            wrap.style.display = 'none';
            return;
        }
        if (runBtn) runBtn.style.display = 'none';
        wrap.style.display = 'block';

        var totalPhases = st.ids.length;

        var phasesHtml = st.ids.map(function(id, i) {
            var p = state.prompts.find(function(x) {
                return x.id === id;
            });
            var title = p ? p.title : ('Prompt #' + id);
            var vars = p ? detectVariables(p.content || '') : [];
            var role = st.roles[id];
            var isDone = i < st.step;
            var isCurr = i === st.step;
            var statusCls = isDone ? 'done' : (isCurr ? 'current' : '');
            var savedVars = st.varMaps[i] || {};

            var roleBadge = role ?
                '<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;padding:2px 7px;border-radius:20px;background:var(--accent-soft);color:var(--accent);margin-top:3px;font-weight:600;">' +
                escapeHtml(role.icon || '\u{1F3AF}') + ' ' + escapeHtml(role.name) +
                '</span>' :
                '';

            // Variable inputs — shown for ALL phases so user can pre-fill
            var varBlock = '';
            if (vars.length) {
                varBlock = '<div style="margin-top:var(--sp-3);display:flex;flex-direction:column;gap:var(--sp-2);">' +
                    vars.map(function(v) {
                        var saved = savedVars[v] !== undefined ? escapeAttr(savedVars[v]) : '';
                        return '<div>' +
                            '<div style="font-size:11px;font-weight:600;color:var(--ink-3);margin-bottom:3px;">' + escapeHtml(v) + '</div>' +
                            '<input type="text" class="form-input chain-var-input" data-var="' + escapeAttr(v) + '" data-phase="' + i + '" placeholder="Fill in…" value="' + saved + '" style="padding:6px 10px;" />' +
                            '</div>';
                    }).join('') +
                    '</div>';
            }

            // Output capture — shown for current phase after "Copy" is clicked, and for done phases
            var outputBlock = '';
            var savedOutput = st.outputs[i] || '';
            if (isDone) {
                outputBlock = savedOutput ?
                    '<div class="chain-output-preview" style="margin-top:var(--sp-2);">' + escapeHtml(savedOutput.slice(0, 180)) + (savedOutput.length > 180 ? '…' : '') + '</div>' :
                    '<div style="font-size:11px;color:var(--ink-3);margin-top:var(--sp-2);">No response captured</div>';
            } else if (isCurr) {
                // Always show output capture on current phase so user can paste response
                outputBlock = '<div style="margin-top:var(--sp-3);">' +
                    '<div style="font-size:11px;font-weight:600;color:var(--ink-3);margin-bottom:var(--sp-1);">PASTE AI RESPONSE (optional)</div>' +
                    '<textarea class="form-input chain-output-ta" data-phase="' + i + '" rows="4"' +
                    ' placeholder="Paste the AI’s response here—it becomes context for Phase ' + (i + 2) + '…"' +
                    ' style="resize:vertical;font-size:var(--fs-sm);width:100%;"></textarea>' +
                    '</div>';
            }

            // Context note for phases that will receive previous output
            var contextNote = (isCurr && i > 0 && st.outputs[i - 1]) ?
                '<div class="chain-phase-context"><span class="material-symbols-outlined" style="font-size:14px;">link</span>' +
                '<span>Phase ' + i + ' response will be prepended as context</span></div>' :
                '';

            // Per-phase actions
            var phaseActions = '';
            if (isCurr) {
                var copyLabel = 'Copy Phase ' + (i + 1) + (vars.length ? ' — fill variables first' : '');
                var nextOrFinish = i < totalPhases - 1 ?
                    '<button class="btn btn-primary" onclick="window.PL_advanceChain(' + i + ')" style="padding:6px 14px;">' +
                    'Mark done &amp; go to Phase ' + (i + 2) + ' <span class="material-symbols-outlined">arrow_forward</span>' +
                    '</button>' :
                    '<button class="btn" style="background:var(--success);color:white;border-color:var(--success);padding:6px 14px;" onclick="window.PL_finishChain()">' +
                    '<span class="material-symbols-outlined">check_circle</span> Finish chain' +
                    '</button>';
                phaseActions = '<div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-3);flex-wrap:wrap;">' +
                    '<button class="btn btn-accent" onclick="window.PL_copyChainPhase(' + i + ')" style="flex:1;justify-content:center;min-width:140px;">' +
                    '<span class="material-symbols-outlined">content_copy</span> ' + copyLabel +
                    '</button>' +
                    nextOrFinish +
                    '</div>';
            } else if (isDone) {
                phaseActions = '<div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-3);">' +
                    '<button class="btn btn-ghost" onclick="window.PL_copyChainPhase(' + i + ')" style="font-size:12px;padding:4px 10px;">' +
                    '<span class="material-symbols-outlined" style="font-size:14px;">content_copy</span> Re-copy Phase ' + (i + 1) +
                    '</button>' +
                    '<button class="btn btn-ghost" onclick="window.PL_goToPhase(' + i + ')" style="font-size:12px;padding:4px 10px;">' +
                    '<span class="material-symbols-outlined" style="font-size:14px;">undo</span> Edit' +
                    '</button>' +
                    '</div>';
            }

            return '<div class="chain-runner-step ' + statusCls + '">' +
                '<div style="display:flex;align-items:flex-start;gap:var(--sp-3);">' +
                '<div class="chain-step-num-badge ' + statusCls + '">' + (isDone ? '✓' : (i + 1)) + '</div>' +
                '<div style="flex:1;min-width:0;">' +
                '<div style="font-size:var(--fs-sm);font-weight:600;color:var(--ink);margin-bottom:2px;">' + escapeHtml(title) + '</div>' +
                '<div style="font-size:11px;color:var(--ink-3);">Phase ' + (i + 1) + (isDone && st.outputs[i] ? ' · response captured' : '') + '</div>' +
                roleBadge +
                contextNote +
                varBlock +
                outputBlock +
                phaseActions +
                '</div></div></div>';
        }).join('');

        // Bottom export bar (always visible once chain is running)
        var exportBar = '<div class="chain-runner-actions">' +
            '<button class="btn btn-ghost btn-sm" onclick="window.PL_exportFullChain()" style="flex:1;justify-content:center;">' +
            '<span class="material-symbols-outlined">download</span> Copy full chain' +
            '</button>' +
            '<button class="btn btn-ghost" style="padding:4px 8px;font-size:12px;" onclick="window.PL_stopChain()">' +
            '<span class="material-symbols-outlined" style="font-size:14px;">stop</span> Stop' +
            '</button>' +
            '</div>';

        wrap.innerHTML = '<div class="chain-runner">' +
            '<div class="chain-runner-header">' +
            '<span>Chain — ' + totalPhases + ' phase' + (totalPhases !== 1 ? 's' : '') + '</span>' +
            '<span style="font-size:11px;color:var(--ink-3);">Fill variables, copy each phase, paste response</span>' +
            '</div>' +
            phasesHtml +
            exportBar +
            '</div>';

        _chainWireInputs();
    }

    

    function updateChainSelect(currentId) {
        _chainSearchCurrentId = currentId;
        const inp = $('#chainPromptSearch');
        if (inp) {
            inp.value = '';
        }
        const res = $('#chainSearchResults');
        if (res) {
            res.innerHTML = '';
            res.classList.remove('open');
        }
    }

    

    function renderChainEditor(ids) {
        const list = $('#chainList');
        if (!ids.length) {
            list.innerHTML = '<p style="font-size: var(--fs-sm); color: var(--ink-3);">No steps yet.</p>';
            return;
        }
        list.innerHTML = ids.map((id, i) => {
            const p = state.prompts.find(x => x.id === id);
            const title = p ? p.title : `Prompt #${id}`;
            return `
      <div class="chain-step">
        <div class="chain-step-num">${i + 1}</div>
        <div class="chain-step-body">
          <div class="chain-step-title">${escapeHtml(title)}</div>
        </div>
        <div class="chain-step-actions">
          ${i > 0 ? `<button type="button" class="icon-btn" onclick="window.PL_moveChain(${i}, -1)"><span class="material-symbols-outlined">arrow_upward</span></button>` : ''}
          ${i < ids.length - 1 ? `<button type="button" class="icon-btn" onclick="window.PL_moveChain(${i}, 1)"><span class="material-symbols-outlined">arrow_downward</span></button>` : ''}
          <button type="button" class="icon-btn danger" onclick="window.PL_removeChain(${i})"><span class="material-symbols-outlined">close</span></button>
        </div>
      </div>`;
        }).join('');
    }
    

    window.openChainWorkspace = function() {
        $('#chainWorkspace')?.classList.add('open');
        $$('.nav-item[data-view]').forEach(el =>
            el.classList.toggle('active', el.dataset.view === 'chain'));
        if (_chainSteps.length === 0) _chainAddStep();
        setTimeout(() => $('#chainSeedInput')?.focus(), 80);
    };

    function closeChainWorkspace() {
        $('#chainWorkspace')?.classList.remove('open');
        $('#chainPreviewPanel')?.classList.add('collapsed');
        $$('.nav-item[data-view]').forEach(el =>
            el.classList.toggle('active', el.dataset.view === 'library'));
    }

    

    function _chainWordCount(text) {
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        return words + 'w / ' + text.length + 'c';
    }

    

    async function _runChain() {
        const seed = $('#chainSeedInput')?.value?.trim() || '';
        if (!_chainSteps.length) {
            toast('Add at least one step', 'warning');
            return;
        }
        if (!_chainSteps[0].prompt.trim()) {
            toast('Add a prompt to Step 1', 'warning');
            return;
        }

        const finalEl = $('#chainFinalOutput');
        const finalBody = $('#chainFinalBody');
        if (finalEl) finalEl.hidden = true;

        let currentInput = seed;
        for (let i = 0; i < _chainSteps.length; i++) {
            const step = _chainSteps[i];
            if (!step.prompt.trim()) {
                toast('Step ' + (i + 1) + ' has no prompt — skipping', 'warning');
                continue;
            }

            const outEl = document.querySelector('[data-out="' + i + '"]');
            if (outEl) {
                outEl.hidden = false;
                outEl.textContent = '⏳ Running step ' + (i + 1) + '...';
            }

            const filledPrompt = step.prompt.replace(/\{\{input\}\}/gi, currentInput);
            try {
                const out = await callAI(filledPrompt, '', 1500);
                _chainSteps[i].output = out;
                if (outEl) outEl.textContent = out;
                currentInput = out;
            } catch (err) {
                if (outEl) outEl.textContent = 'Error: ' + err.message;
                toast('Chain stopped at step ' + (i + 1) + ': ' + err.message, 'error');
                return;
            }
        }

        if (finalEl) finalEl.hidden = false;
        if (finalBody) finalBody.textContent = currentInput;
        toast('Chain complete', 'success');
    }

    

    function initChainWorkspace() {
        const ws = $('#chainWorkspace');
        if (!ws) return;

        $('#chainAddStepBtn')?.addEventListener('click', _chainAddStep);
        $('#chainClearBtn')?.addEventListener('click', () => {
            _chainSteps = [];
            _chainAddStep();
            const fin = $('#chainFinalOutput');
            if (fin) fin.hidden = true;
            $('#chainPreviewPanel')?.classList.add('collapsed');
            toast('Cleared', 'success');
        });

        $('#chainSaveBtn')?.addEventListener('click', async () => {
            if (!_chainSteps.length || !_chainSteps[0].prompt.trim()) {
                toast('Add at least one step first', 'warning');
                return;
            }
            const seed = ($('#chainSeedInput')?.value || '').trim();
            const placeholder = '[[YOUR INPUT HERE]]';
            const seedValue = seed || placeholder;

            const header = 'We are now going to be going through steps & phases.\n' +
                'Always confirm before you move to the next step — pass the output from the previous step to the next step.';

            const seedBlock = 'INITIAL INPUT:\n' + seedValue;
            const divider = '='.repeat(40);
            const isLast = (i) => i === _chainSteps.length - 1;

            const stepsBlock = _chainSteps.map((s, i) => {
                const prompt = s.prompt.replace(/\{\{input\}\}/gi, '{{INPUT}}');
                const passNote = isLast(i) ?
                    '\nIf there is a next phase pass the output of this phase to the next one, if not end here.' :
                    '\nNow pass the output of this phase to the next phase.';
                return 'Step ' + (i + 1) + ' — ' + s.label + ':\n' + prompt + passNote;
            }).join('\n---\n');

            const chainContent = header + '\n\n' + seedBlock + '\n' + divider + '\n' + stepsBlock;
            const title = 'Prompt Chain — ' + new Date().toLocaleDateString('en-GB');
            try {
                const result = await api('/prompts', {
                    method: 'POST',
                    body: {
                        title,
                        content: chainContent,
                        description: 'Prompt chain built in Chain workspace',
                        categories: 'Prompt Engineering',
                        tags: 'chain'
                    }
                });
                await loadPrompts();
                await loadFilterOptions();
                toast('Chain saved to library', 'success');
                if (result?.id) setTimeout(() => {
                    closeChainWorkspace();
                    openDetail(result.id);
                }, 200);
            } catch {
                toast('Could not save', 'error');
            }
        });
        $('#chainAssembleBtn')?.addEventListener('click', assembleChain);
        $('#chainPreviewCloseBtn')?.addEventListener('click', () => {
            $('#chainPreviewPanel')?.classList.add('collapsed');
        });
        $('#chainPreviewCopyBtn')?.addEventListener('click', async () => {
            const ta = $('#chainPreviewText');
            if (!ta?.value) {
                toast('Nothing to copy — assemble first', 'warning');
                return;
            }
            const ok = await copyToClipboard(ta.value);
            if (ok) toast('Copied to clipboard', 'success');
            else toast('Could not copy', 'error');
        });
        $('#chainPreviewSaveBtn')?.addEventListener('click', async () => {
            if (!state.isPremium) {
                $('#premiumModal')?.classList.add('active');
                return;
            }
            const ta = $('#chainPreviewText');
            if (!ta?.value) {
                toast('Nothing to save — assemble first', 'warning');
                return;
            }
            const title = 'Prompt Chain — ' + new Date().toLocaleDateString('en-GB');
            try {
                const result = await api('/prompts', {
                    method: 'POST',
                    body: {
                        title,
                        content: ta.value,
                        description: 'Prompt chain',
                        categories: 'Prompt Engineering',
                        tags: 'chain'
                    }
                });
                await loadPrompts();
                await loadFilterOptions();
                toast('Chain saved to library', 'success');
                if (result?.id) setTimeout(() => {
                    closeChainWorkspace();
                    openDetail(result.id);
                }, 200);
            } catch {
                toast('Could not save', 'error');
            }
        });
        $('#chainAddInlineBtn')?.addEventListener('click', _chainAddStep);
        $('#closeChainBtn')?.addEventListener('click', closeChainWorkspace);
        ws.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeChainWorkspace();
        });
    }

    
