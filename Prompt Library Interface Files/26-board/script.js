/* Prompt Board — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    async function _boardLoadList(keepSelection) {
        const listEl = $('#boardList');
        if (listEl) listEl.innerHTML = '<div class="hint" style="padding:var(--sp-4);">\u23f3 Loading boards\u2026</div>';
        try {
            _boardState.boards = await api('/boards');
        } catch {
            _boardState.boards = [];
        }
        _boardRenderList();
        const stillExists = _boardState.boards.some(b => b.id === _boardState.activeId);
        if (keepSelection && stillExists) {
            _boardLoadDetail(_boardState.activeId);
        } else if (_boardState.boards.length) {
            _boardSelect(_boardState.boards[0].id);
        } else {
            _boardState.activeId = null;
            _boardRenderDetail();
        }
    }

    

    function _boardSelect(id) {
        _boardState.activeId = id;
        _boardRenderList();
        _boardLoadDetail(id);
    }

    

    function _boardRenderDetail() {
        const empty = $('#boardEmptyState');
        const detail = $('#boardDetailPane');
        const board = _boardState.boards.find(b => b.id === _boardState.activeId);
        if (!board) {
            if (empty) empty.style.display = 'flex';
            if (detail) detail.style.display = 'none';
            return;
        }
        if (empty) empty.style.display = 'none';
        if (detail) detail.style.display = 'flex';

        const nameInput = $('#boardNameInput');
        const descInput = $('#boardDescInput');
        if (nameInput && document.activeElement !== nameInput) nameInput.value = board.name;
        if (descInput && document.activeElement !== descInput) descInput.value = board.description || '';

        const body = $('#boardPinsBody');
        if (!body) return;
        if (!_boardState.pins.length) {
            body.innerHTML = '<div class="board-pins-empty hint">No prompts pinned yet. Pick one above and add it.</div>';
            return;
        }
        body.innerHTML = _boardState.pins.map(p =>
            '<div class="board-pin-card" data-board-pin-id="' + p.id + '">' +
                '<span class="board-pin-title">' + escapeHtml(p.title || 'Untitled') + '</span>' +
                '<span class="board-pin-desc">' + escapeHtml((p.description || '').slice(0, 90)) + '</span>' +
                '<button class="board-pin-remove material-symbols-outlined" data-board-unpin="' + p.id + '" title="Remove from board" aria-label="Remove from board">close</button>' +
            '</div>'
        ).join('');
        body.querySelectorAll('[data-board-pin-id]').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('[data-board-unpin]')) return;
                const id = Number(card.dataset.boardPinId);
                closeBoardWorkspace();
                setTimeout(() => openDetail(id), 150);
            });
        });
        body.querySelectorAll('[data-board-unpin]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const promptId = Number(btn.dataset.boardUnpin);
                try {
                    await api('/boards/' + _boardState.activeId + '/pins/' + promptId, { method: 'DELETE' });
                    _boardState.pins = _boardState.pins.filter(p => p.id !== promptId);
                    _boardRenderDetail();
                    _boardLoadList(true);
                } catch {
                    toast('Could not remove pin', 'error');
                }
            });
        });
    }

    

    async function _boardSaveMeta() {
        if (!_boardState.activeId) return;
        const name = ($('#boardNameInput')?.value || '').trim();
        const description = $('#boardDescInput')?.value || '';
        if (!name) return;
        try {
            await api('/boards/' + _boardState.activeId, { method: 'PUT', body: { name, description } });
            const board = _boardState.boards.find(b => b.id === _boardState.activeId);
            if (board) {
                board.name = name;
                board.description = description;
            }
            _boardRenderList();
        } catch {
            toast('Could not save board', 'error');
        }
    }

    

    window.openBoardWorkspace = function() {
        if (!state.isPremium) {
            showPremiumModal();
            return;
        }
        const ws = $('#boardWorkspace');
        if (!ws) return;
        ws.classList.add('open');
        document.body.style.overflow = 'hidden';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'board'));
        _boardLoadList(true);
        _wsFillPromptPicker('#boardPinPicker');
    };

    function closeBoardWorkspace() {
        $('#boardWorkspace')?.classList.remove('open');
        document.body.style.overflow = '';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
    }

    
