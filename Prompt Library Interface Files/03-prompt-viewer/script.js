/* Prompt viewer overlay — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    function _copyRaw(prompt) {
        if (!prompt) return;
        navigator.clipboard.writeText(prompt.content || '').then(function() {
            const btn = _el('pvCopyBtn');
            if (btn) {
                btn.textContent = 'Copied!';
                setTimeout(function() {
                    btn.innerHTML = '<span class="material-symbols-outlined">content_copy</span> Copy prompt';
                }, 1500);
            }
        }).catch(function() {});
    }

    

    window.PL_openViewer = function(id) {
        const prompt = _getPrompt(id);
        if (!prompt) return;
        _viewerId = id;

        const viewer = _el('promptViewer');
        const title = _el('pvTitle');
        const desc = _el('pvDesc');
        const block = _el('pvPromptBlock');
        const meta = _el('pvMetaStrip');
        const chips = _el('pvChips');

        if (title) title.textContent = prompt.title || '';
        if (desc) {
            if (prompt.description) {
                desc.textContent = prompt.description;
                desc.hidden = false;
            } else {
                desc.hidden = true;
            }
        }
        if (block) block.textContent = prompt.content || '';

        if (meta) {
            const parts = [];
            if (prompt.folder_name) parts.push('📁 ' + prompt.folder_name);
            if (prompt.created_at) parts.push('Created ' + _formatDate(prompt.created_at));
            if (prompt.usage_count) parts.push('Used ' + prompt.usage_count + 'x');
            meta.textContent = parts.join(' · ');
        }

        if (chips) {
            const tags = Array.isArray(prompt.tags) ? prompt.tags : (prompt.tags || '').split(',').filter(Boolean);
            chips.innerHTML = tags.map(function(t) {
                return '<span class="tag-chip" style="font-size:11px;padding:2px 8px">' + t.trim() + '</span>';
            }).join('');
        }

        _fillVarFields(prompt);

        // Wire copy buttons
        const copyBtn = _el('pvCopyBtn');
        const copyFilledBtn = _el('pvCopyFilledBtn');
        const editBtn = _el('pvEditBtn');
        if (copyBtn) {
            copyBtn.onclick = function() {
                _copyRaw(prompt);
            };
            copyBtn.innerHTML = '<span class="material-symbols-outlined">content_copy</span> Copy prompt';
        }
        if (copyFilledBtn) {
            copyFilledBtn.onclick = function() {
                _copyFilled(prompt);
            };
            copyFilledBtn.innerHTML = '<span class="material-symbols-outlined">done_all</span> Copy filled';
        }
        if (editBtn) {
            editBtn.onclick = function() {
                window.PL_closeViewer();
                if (window.openEditModal) window.openEditModal(id);
            };
        }

        if (viewer) viewer.classList.add('active');
    };

    window.PL_closeViewer = function() {
        _viewerId = null;
        const viewer = _el('promptViewer');
        if (viewer) viewer.classList.remove('active');
    };

    window.initPromptViewer = function() {
        const closeBtn = _el('pvCloseBtn');
        if (closeBtn) closeBtn.addEventListener('click', window.PL_closeViewer);

        document.addEventListener('keydown', function(e) {
            const viewer = _el('promptViewer');
            if (e.key === 'Escape' && viewer && viewer.classList.contains('active')) {
                window.PL_closeViewer();
            }
        });
    };
