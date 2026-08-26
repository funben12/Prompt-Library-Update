/* Prompt Forge — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    window.openForgeWorkspace = function() {
        $('#forgeWorkspace')?.classList.add('open');
        $$('.nav-item[data-view]').forEach(el =>
            el.classList.toggle('active', el.dataset.view === 'forge'));
        setTimeout(() => $('#forgeFields textarea')?.focus(), 80);
    };

    function closeForgeWorkspace() {
        $('#forgeWorkspace')?.classList.remove('open');
        $$('.nav-item[data-view]').forEach(el =>
            el.classList.toggle('active', el.dataset.view === 'library'));
    }

    

    function assembleForgePrompt() {
        const fw = state.forgeFramework || 'custom';
        const fmt = state.forgeOutputFormat || 'markdown';
        const def = FORGE_FRAMEWORKS[fw];
        if (!def) return '';

        const tone = ($('#forgeToneSelect')?.value || '').trim();
        const sections = [];

        def.fields.forEach(f => {
            const val = ($(`#${f.id}`)?.value || '').trim();
            if (val) sections.push({
                label: f.label,
                value: val
            });
        });

        const hasToneField = def.fields.some(f => f.label.toLowerCase() === 'tone');
        if (tone && !hasToneField) sections.push({
            label: 'Tone',
            value: tone
        });

        if (!sections.length) return '';

        if (fmt === 'markdown') {
            return sections.map(s => `## ${s.label}\n${s.value}`).join('\n\n');
        }
        if (fmt === 'plain') {
            return sections.map(s => s.value).join('\n\n');
        }
        if (fmt === 'xml') {
            const tag = l => l.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
            return sections.map(s => `<${tag(s.label)}>\n${s.value}\n</${tag(s.label)}>`).join('\n\n');
        }
        return '';
    }

    

    function updateForgeOutput() {
        const out = $('#forgeOutput');
        const charCount = $('#forgeCharCount');
        const tokenCount = $('#forgeTokenCount');
        const qualityBar = $('#forgeQualityBar');
        const qualityLabel = $('#forgeQualityLabel');
        if (!out) return;

        const assembled = assembleForgePrompt();
        if (!assembled) {
            out.innerHTML = '<span class="hint">Fill in the fields on the left — your assembled prompt appears here live.</span>';
            if (charCount) charCount.textContent = '0 chars';
            if (tokenCount) tokenCount.textContent = '~0 tokens';
            if (qualityBar) {
                qualityBar.style.width = '0%';
                qualityBar.className = 'forge-quality-bar';
            }
            if (qualityLabel) qualityLabel.textContent = 'Completeness: 0%';
            return;
        }

        out.textContent = assembled;
        if (charCount) charCount.textContent = assembled.length.toLocaleString() + ' chars';
        if (tokenCount) tokenCount.textContent = '~' + Math.round(assembled.length / 4).toLocaleString() + ' tokens';

        const pct = getForgeCompleteness();
        if (qualityBar) {
            qualityBar.style.width = pct + '%';
            qualityBar.className = 'forge-quality-bar' + (pct >= 75 ? ' forge-quality-bar--high' : pct >= 40 ? ' forge-quality-bar--mid' : '');
        }
        if (qualityLabel) qualityLabel.textContent = 'Completeness: ' + pct + '%';
    }

    
