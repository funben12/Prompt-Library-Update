/* Context Bank — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */


    // ── List render ──────────────────────────────────────────────────────────────
    function _ctxRenderList() {
        const list = $('#ctxList');
        const empty = $('#ctxEmptyHint');
        if (!list) return;

        const query = ($('#ctxSearch')?.value || '').toLowerCase();
        let filtered = _ctxBlocks.slice();
        if (_ctxFilter !== 'all') filtered = filtered.filter(b => b.category === _ctxFilter);
        if (query) filtered = filtered.filter(b =>
            (b.title || '').toLowerCase().includes(query) ||
            (b.content || '').toLowerCase().includes(query)
        );

        _ctxUpdateStats();

        if (!filtered.length) {
            list.innerHTML = '';
            if (empty) empty.style.display = '';
            return;
        }
        if (empty) empty.style.display = 'none';

        list.innerHTML = filtered.map(b => {
            const active = b.id === _ctxActiveId ? ' active' : '';
            const preview = (b.content || '').slice(0, 80).replace(/</g, '&lt;');
            return '<div class="ctx-block-item' + active + '" data-ctx-id="' + escapeAttr(b.id) + '">' +
                '<div class="ctx-block-item-header">' +
                '<span class="ctx-block-item-title">' + escapeHtml(b.title || 'Untitled') + '</span>' +
                '<span class="ctx-cat-tag">' + escapeHtml(b.category || 'Other') + '</span>' +
                '</div>' +
                '<div class="ctx-block-item-preview">' + preview + (b.content && b.content.length > 80 ? '…' : '') + '</div>' +
                '</div>';
        }).join('');

        list.querySelectorAll('[data-ctx-id]').forEach(item => {
            item.addEventListener('click', () => _ctxOpenBlock(item.dataset.ctxId));
        });
    }

    

    function _ctxDeleteBlock() {
        if (!_ctxActiveId) return;
        _ctxBlocks = _ctxBlocks.filter(b => b.id !== _ctxActiveId);
        _ctxSave();
        _ctxActiveId = null;

        // Return to empty editor state
        const form = $('#ctxEditorForm');
        const empty = $('#ctxEditorEmpty');
        if (form) form.hidden = true;
        if (empty) empty.style.display = '';
        _ctxRenderList();
    }

    


    // ── Workspace open/close ─────────────────────────────────────────────────────
    window.openContextBankWorkspace = function() {
        _ctxSeedTemplates();
        _ctxLoad();
        const ws = $('#contextBankWorkspace');
        if (!ws) return;
        ws.classList.add('open');
        document.body.style.overflow = 'hidden';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'contextBank'));
        _ctxFilter = 'all';
        $$('[data-ctx-filter]').forEach(b => b.classList.toggle('active', b.dataset.ctxFilter === 'all'));
        _ctxActiveId = null;
        const form = $('#ctxEditorForm');
        const empty = $('#ctxEditorEmpty');
        if (form) form.hidden = true;
        if (empty) empty.style.display = '';
        _ctxRenderList();
    };

    function _ctxClose() {
        const ws = $('#contextBankWorkspace');
        if (!ws) return;
        ws.classList.remove('open');
        document.body.style.overflow = '';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
    }

    

    function initContextBankWorkspace() {
        $('#closeContextBankBtn')?.addEventListener('click', _ctxClose);
        $('#ctxNewBtn')?.addEventListener('click', _ctxNewBlock);
        $('#ctxSaveBtn')?.addEventListener('click', _ctxSaveBlock);
        $('#ctxDeleteBtn')?.addEventListener('click', _ctxDeleteBlock);
        $('#ctxCopyBtn')?.addEventListener('click', _ctxCopyBlock);
        $('#ctxSearch')?.addEventListener('input', _ctxRenderList);

        $$('[data-ctx-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                _ctxFilter = btn.dataset.ctxFilter;
                $$('[data-ctx-filter]').forEach(b => b.classList.toggle('active', b === btn));
                _ctxRenderList();
            });
        });

        const ws = $('#contextBankWorkspace');
        if (ws) ws.addEventListener('keydown', e => {
            if (e.key === 'Escape') _ctxClose();
        });
    }

    
