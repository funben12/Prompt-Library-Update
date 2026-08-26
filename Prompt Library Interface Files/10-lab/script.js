/* Prompt Lab — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    window.openLabWorkspace = function() {
        $('#labWorkspace')?.classList.add('open');
        $$('.nav-item[data-view]').forEach(el =>
            el.classList.toggle('active', el.dataset.view === 'lab'));
        initLabStars();
        setTimeout(() => $('#labPromptA')?.focus(), 80);
    };

    function closeLabWorkspace() {
        $('#labWorkspace')?.classList.remove('open');
        $$('.nav-item[data-view]').forEach(el =>
            el.classList.toggle('active', el.dataset.view === 'library'));
    }

    

    function _renderLabStars(containerId, hiddenId) {
        const container = $(`#${containerId}`);
        const hidden = $(`#${hiddenId}`);
        if (!container || !hidden) return;
        const current = parseInt(hidden.value || '0', 10);
        container.innerHTML = '';
        for (let i = 1; i <= 5; i++) {
            const span = document.createElement('span');
            span.className = 'lab-star material-symbols-outlined' + (i <= current ? ' lit' : '');
            span.textContent = i <= current ? 'star' : 'star';
            span.dataset.val = i;
            span.addEventListener('click', () => {
                hidden.value = i;
                _renderLabStars(containerId, hiddenId);
                updateLabWinner();
            });
            container.appendChild(span);
        }
    }

    

    function getLabWinner() {
        const scoreA = parseInt($('#labScoreA')?.value || '0', 10);
        const scoreB = parseInt($('#labScoreB')?.value || '0', 10);
        if (scoreA >= scoreB) {
            return {
                prompt: $('#labPromptA')?.value || '',
                name: $('#labVariantA .lab-variant-title')?.value || 'Variant A',
                score: scoreA
            };
        }
        return {
            prompt: $('#labPromptB')?.value || '',
            name: $('#labVariantB .lab-variant-title')?.value || 'Variant B',
            score: scoreB
        };
    }

    

    function initLabWorkspace() {
        const ws = $('#labWorkspace');
        if (!ws) return;

        // Copy buttons
        $$('.lab-copy-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const v = btn.dataset.variant;
                const text = (v === 'A' ? $('#labPromptA') : $('#labPromptB'))?.value || '';
                if (!text.trim()) {
                    toast('Nothing to copy', 'warning');
                    return;
                }
                const ok = await copyToClipboard(text);
                if (ok) toast('Variant ' + v + ' copied', 'success');
            });
        });

        // Save winner buttons (header + winner bar)
        ['#labSaveWinnerBtn', '#labSaveWinnerInlineBtn'].forEach(sel => {
            $(sel)?.addEventListener('click', saveLabWinner);
        });

        // Load from library
        $('#labLoadBtn')?.addEventListener('click', () => {
            if (!state.prompts || !state.prompts.length) {
                toast('No prompts in library', 'warning');
                return;
            }
            // Pick the most recently used prompt and load into variant A
            const latest = [...state.prompts].sort((a, b) => (b.use_count || 0) - (a.use_count || 0))[0];
            if (latest) {
                const ta = $('#labPromptA');
                const title = $('#labVariantA .lab-variant-title');
                if (ta) ta.value = latest.content || '';
                if (title) title.value = latest.title || 'Variant A';
                toast('Loaded: ' + latest.title, 'success');
            }
        });

        // Close
        $('#closeLabBtn')?.addEventListener('click', closeLabWorkspace);
        ws.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeLabWorkspace();
        });
        upgradedLabInitWorkspace(); // AI run + scoring
    }

    

    async function labRunVariant(variant) {
        const prompt = $('#labPrompt' + variant)?.value?.trim();
        const input = $('#labInput')?.value?.trim();
        const outEl = $('#labOutput' + variant);
        const bodyEl = $('#labOutput' + variant + 'Body');
        if (!prompt) {
            toast('Add a prompt to Variant ' + variant + ' first', 'warning');
            return '';
        }

        if (outEl) outEl.hidden = false;
        if (bodyEl) bodyEl.textContent = '⏳ Running...';

        try {
            const sys = prompt;
            const usr = input || '(No test input provided — respond based on the prompt alone)';
            const out = await callAI(sys, usr, 1500);
            if (bodyEl) bodyEl.textContent = out;
            return out;
        } catch (err) {
            if (bodyEl) bodyEl.textContent = 'Error: ' + err.message;
            toast('Variant ' + variant + ' failed: ' + err.message, 'error');
            return '';
        }
    }

    
