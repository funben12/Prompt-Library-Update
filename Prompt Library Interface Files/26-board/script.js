/* Prompt Board — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    const _boardCoverPalette = ['#0047ff', '#141414', '#4a4a4a', '#0038cc'];

    function _boardHashColor(id) {
        return _boardCoverPalette[Math.abs(Number(id) || 0) % _boardCoverPalette.length];
    }

    async function _boardLoadList(keepSelection) {
        const listEl = $('#boardList');
        if (listEl) listEl.innerHTML = '<div class="hint" style="padding:var(--sp-4);">⏳ Loading boards…</div>';
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

    function _boardRenderList() {
        const listEl = $('#boardList');
        if (!listEl) return;
        if (!_boardState.boards.length) {
            listEl.innerHTML = '<div class="hint" style="padding:var(--sp-4);">No boards yet. Create one below.</div>';
            return;
        }
        listEl.innerHTML = _boardState.boards.map(b =>
            '<div class="board-row' + (b.id === _boardState.activeId ? ' active' : '') + '" data-board-id="' + b.id + '">' +
                '<span class="board-row-cover" style="background:' + _boardHashColor(b.id) + '"><span class="material-symbols-outlined">dashboard_customize</span></span>' +
                '<span class="board-row-name">' + escapeHtml(b.name) + '</span>' +
                '<span class="board-row-count">' + b.pin_count + '</span>' +
                '<button class="board-row-del material-symbols-outlined" data-board-del="' + b.id + '" title="Delete board" aria-label="Delete board">delete</button>' +
            '</div>'
        ).join('');
        listEl.querySelectorAll('[data-board-id]').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('[data-board-del]')) return;
                _boardSelect(Number(row.dataset.boardId));
            });
        });
        listEl.querySelectorAll('[data-board-del]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = Number(btn.dataset.boardDel);
                const board = _boardState.boards.find(b => b.id === id);
                if (!confirm('Delete board "' + (board ? board.name : '') + '"? Pins are removed, prompts are not.')) return;
                try {
                    await api('/boards/' + id, { method: 'DELETE' });
                    if (_boardState.activeId === id) _boardState.activeId = null;
                    toast('Board deleted', 'success');
                    _boardLoadList(true);
                } catch {
                    toast('Could not delete board', 'error');
                }
            });
        });
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
        body.innerHTML = _boardState.pins.map(p => {
            const contentLen = (p.content || '').length;
            const mediaHeight = 64 + (Math.abs(p.id) * 37 + contentLen) % 96;
            return '<div class="board-pin-card" data-board-pin-id="' + p.id + '">' +
                '<div class="board-pin-media" style="height:' + mediaHeight + 'px;background:' + _boardHashColor(p.id) + '">' +
                    '<span class="material-symbols-outlined">bolt</span>' +
                    '<span class="board-pin-media-tag">Prompt</span>' +
                    '<button class="board-pin-save-pill" data-board-copy="' + p.id + '" title="Save / copy prompt">' +
                        '<span class="material-symbols-outlined" style="font-size:14px;">content_copy</span> Save' +
                    '</button>' +
                '</div>' +
                '<div class="board-pin-body-wrap">' +
                    '<span class="board-pin-title">' + escapeHtml(p.title || 'Untitled') + '</span>' +
                    '<span class="board-pin-desc">' + escapeHtml((p.description || '').slice(0, 90)) + '</span>' +
                    '<span class="board-pin-body">' + escapeHtml((p.content || '').slice(0, 220)) + '</span>' +
                '</div>' +
                '<button class="board-pin-remove material-symbols-outlined" data-board-unpin="' + p.id + '" title="Remove from board" aria-label="Remove from board">close</button>' +
            '</div>';
        }).join('');
        body.querySelectorAll('[data-board-pin-id]').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('[data-board-unpin]') || e.target.closest('[data-board-copy]')) return;
                const id = Number(card.dataset.boardPinId);
                const pin = _boardState.pins.find(p => p.id === id);
                if (pin) _boardOpenLightbox(pin);
            });
        });
        body.querySelectorAll('[data-board-copy]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.PL_useFromCard(Number(btn.dataset.boardCopy));
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

    function _boardCloseLightbox() {
        $('#boardPinLightbox').hidden = true;
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
            toast('Board saved', 'success');
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
        const floatSaveBtn = $('#boardFloatingSaveBtn');
        if (floatSaveBtn) floatSaveBtn.onclick = _boardSaveMeta;
    };

    function closeBoardWorkspace() {
        $('#boardWorkspace')?.classList.remove('open');
        document.body.style.overflow = '';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
    }
