/* Prompt Playground — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */


        // Open / Close
        window.openPlaygroundWorkspace = async function() {
            pgW().classList.add('open');
            document.body.style.overflow = 'hidden';
            await _pgLoadSessions();
        };


        // Render canvas
        function _pgRenderCanvas(sessionData) {
            const toolbar = pgToolbar();
            const grid = pgPanelsGrid();
            if (!sessionData) {
                if (toolbar) toolbar.style.display = 'none';
                if (grid) grid.innerHTML = '<div class="pg-empty" id="pgEmptyState"><span class="material-symbols-outlined">science</span><h3>No session selected</h3><p>Create a new session to start drafting and comparing prompt variations side-by-side.</p><button class="btn btn-accent" onclick="window._pgCreateSession()"><span class="material-symbols-outlined">add</span> New session</button></div>';
                return;
            }
            if (toolbar) toolbar.style.display = 'flex';
            const titleEl = document.getElementById('pgSessionTitleInput');
            const noteEl = document.getElementById('pgSessionNoteInput');
            if (titleEl) titleEl.value = sessionData.title || '';
            if (noteEl) noteEl.value = sessionData.note || '';
            document.querySelectorAll('.pg-mode-btn').forEach(b => {
                b.classList.toggle('active', parseInt(b.dataset.panels) === _pg.activePanels);
            });
            _pgRenderPanels();
        }

        


        // Save
        async function _pgSaveAll(showToast) {
            if (showToast === undefined) showToast = true;
            if (!_pg.activeSessionId) return;
            try {
                const title = (document.getElementById('pgSessionTitleInput') || {}).value || 'Untitled session';
                const note = (document.getElementById('pgSessionNoteInput') || {}).value || '';
                await fetch('/api/playground/sessions/' + _pg.activeSessionId, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: title.trim(),
                        note: note.trim()
                    })
                });
                const panels = _pg.panels.slice(0, _pg.activePanels).map(function(p, slot) {
                    return {
                        slot: slot,
                        label: p.label || '',
                        content: p.content || '',
                        model_tag: p.model_tag || '',
                        output: p.output || '',
                        score: p.score,
                    };
                });
                await fetch('/api/playground/sessions/' + _pg.activeSessionId + '/panels', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        panels
                    })
                });
                _pg.dirty = false;
                const s = _pg.sessions.find(function(x) {
                    return x.id === _pg.activeSessionId;
                });
                if (s) {
                    s.title = title.trim();
                    s.note = note.trim();
                }
                _pgRenderSessionsList();
                if (showToast) toast('Session saved', 'success');
            } catch (e) {
                console.error('PG: save failed', e);
                if (showToast) toast('Failed to save session', 'error');
            }
        }

        


        // Init — wires up all static event listeners
        window.initPlaygroundWorkspace = function() {
            var closeBtn = document.getElementById('pgCloseBtn');
            if (closeBtn) closeBtn.addEventListener('click', _pgClose);

            var newBtn1 = document.getElementById('pgNewSessionBtn');
            if (newBtn1) newBtn1.addEventListener('click', _pgCreateSession);

            var saveBtn = document.getElementById('pgSaveAllBtn');
            if (saveBtn) saveBtn.addEventListener('click', function() {
                _pgSaveAll(true);
            });

            document.querySelectorAll('.pg-mode-btn').forEach(function(b) {
                b.addEventListener('click', function() {
                    _pgSetMode(parseInt(b.dataset.panels));
                });
            });

            var navBtn = document.getElementById('playgroundNavBtn');
            if (navBtn) navBtn.addEventListener('click', function() {
                window.openPlaygroundWorkspace();
            });

            var titleInput = document.getElementById('pgSessionTitleInput');
            if (titleInput) titleInput.addEventListener('blur', function() {
                if (_pg.activeSessionId && _pg.dirty) _pgSaveAll(false);
            });

            var noteInput = document.getElementById('pgSessionNoteInput');
            if (noteInput) noteInput.addEventListener('blur', function() {
                if (_pg.activeSessionId && _pg.dirty) _pgSaveAll(false);
            });
        };
