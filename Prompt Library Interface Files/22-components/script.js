/* Prompt Components — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

        function _pcwSaveDraft() {
            try {
                var t = $('#pcwTitleInput') ? $('#pcwTitleInput').value : '';
                localStorage.setItem('pl_pcw_draft', JSON.stringify({
                    blocks: _canvasBlocks,
                    title: t,
                    view: _canvasState
                }));
            } catch (e) {
                /* storage full — draft skipped */
            }
        }

        


        /* ---- Header stats + footer blanks chip ---- */
        function _pcwUpdateStats() {
            var text = assemblePrompt();
            var words = text ? text.split(/\s+/).filter(Boolean).length : 0;
            var tokens = Math.round(text.length / 4);
            var blanks = 0;
            _canvasBlocks.forEach(function(b) {
                blanks += countBlanks(b.text);
            });
            var stats = $('#pcwHeaderStats');
            if (stats) stats.textContent = _canvasBlocks.length + ' blocks · ' + words + ' words · ~' + tokens + ' tokens';
            var chip = $('#pcwBlanksChip');
            if (chip) {
                chip.hidden = _canvasBlocks.length === 0;
                chip.textContent = blanks ? blanks + ' blanks to fill' : 'All blanks filled';
                chip.classList.toggle('done', blanks === 0);
            }
        }

        

        // Expose expand/collapse all
        var _pcwAllExpanded = true;
        window._pcwToggleAllSections = function() {
            var sections = document.querySelectorAll('#pcwPaletteBody .pcw-palette-section');
            var icon = document.getElementById('pcwExpandIcon');
            _pcwAllExpanded = !_pcwAllExpanded;
            sections.forEach(function(s) {
                s.classList.toggle('collapsed', !_pcwAllExpanded);
                s.classList.remove('pcw-collapsed');
            });
            if (icon) icon.textContent = _pcwAllExpanded ? 'unfold_more' : 'unfold_less';
        };


        /* ---- Where a new block lands: near view centre, slightly staggered ---- */
        function _pcwNextPos() {
            var zone = $('#pcwDropZone');
            var vw = zone ? zone.clientWidth : 900,
                vh = zone ? zone.clientHeight : 600;
            var cx = (vw / 2 - _canvasState.panX) / _canvasState.zoom - 190;
            var cy = (vh / 2 - _canvasState.panY) / _canvasState.zoom - 110;
            var n = _canvasBlocks.length;
            return {
                x: cx + (n % 5) * 26,
                y: cy + (n % 5) * 26
            };
        }

        

        function _pcwFitView() {
            var zone = $('#pcwDropZone'),
                world = $('#pcwWorld');
            if (!zone || !world) return;
            var cards = Array.from(world.querySelectorAll('.pcw-canvas-block'));
            if (!cards.length) {
                _canvasState = {
                    zoom: 1,
                    panX: 40,
                    panY: 40
                };
                _pcwApplyView();
                _pcwSaveDraft();
                return;
            }
            var minX = Infinity,
                minY = Infinity,
                maxX = -Infinity,
                maxY = -Infinity;
            cards.forEach(function(el) {
                var x = parseFloat(el.style.left) || 0,
                    y = parseFloat(el.style.top) || 0;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x + el.offsetWidth);
                maxY = Math.max(maxY, y + el.offsetHeight);
            });
            var pad = 60;
            var w = maxX - minX + pad * 2,
                h = maxY - minY + pad * 2;
            var z = Math.min(zone.clientWidth / w, zone.clientHeight / h, 1.4);
            z = Math.max(0.25, Math.min(2, z));
            _canvasState.zoom = z;
            _canvasState.panX = (zone.clientWidth - (maxX - minX) * z) / 2 - minX * z;
            _canvasState.panY = (zone.clientHeight - (maxY - minY) * z) / 2 - minY * z;
            _pcwApplyView();
            _pcwSaveDraft();
        }
        


        /* ---- Render canvas (infinite freeform board) ---- */
        function renderCanvas() {
            var zone = $('#pcwDropZone');
            var hint = $('#pcwDropHint');
            var count = $('#pcwBlockCount');
            var world = $('#pcwWorld');
            if (!zone || !world) return;

            if (hint) hint.style.display = _canvasBlocks.length ? 'none' : 'flex';
            if (count) count.textContent = _canvasBlocks.length + ' block' + (_canvasBlocks.length !== 1 ? 's' : '');

            // Blocks without coordinates (old drafts, quick-starts, AI build) fall into a tidy column
            _canvasBlocks.forEach(function(b, i) {
                if (typeof b.x !== 'number' || typeof b.y !== 'number') {
                    b.x = 60;
                    b.y = 60 + i * (b.collapsed ? 64 : 240);
                }
            });

            world.innerHTML = '';
            var order = {};
            _pcwOrdered().forEach(function(o, pos) {
                order[o.i] = pos + 1;
            });

            _canvasBlocks.forEach(function(b, idx) {
                var card = document.createElement('div');
                card.className = 'pcw-canvas-block pcw-float' + (b.collapsed ? ' collapsed' : '');
                card.style.setProperty('--blk-color', _pcwCatColor(b.cat));
                card.style.left = (b.x || 0) + 'px';
                card.style.top = (b.y || 0) + 'px';
                card.dataset.canvasIdx = idx;
                var cardBlanks = countBlanks(b.text);
                var cardSnippet = escH(String(b.text).replace(/\s+/g, ' ').slice(0, 90));
                card.innerHTML =
                    '<div class="pcw-block-header" title="Drag to move — click to collapse">' +
                    '<span class="material-symbols-outlined pcw-block-drag-handle">drag_indicator</span>' +
                    '<span class="pcw-block-step" title="Assembly order: top to bottom, left to right">' + order[idx] + '</span>' +
                    '<span class="pcw-block-type-badge">' + escH(b.label) + '</span>' +
                    (cardBlanks ? '<span class="pcw-blank-chip" title="' + cardBlanks + ' unfilled placeholders">' + cardBlanks + '</span>' : '') +
                    '<span class="pcw-block-snippet">' + cardSnippet + '</span>' +
                    '<button type="button" class="pcw-block-collapse" aria-expanded="' + (!b.collapsed) + '" aria-label="Expand or collapse block">' +
                    '<span class="material-symbols-outlined">' + (b.collapsed ? 'expand_more' : 'expand_less') + '</span></button>' +
                    '<button type="button" class="pcw-block-remove" data-remove-idx="' + idx + '" aria-label="Remove block">' +
                    '<span class="material-symbols-outlined">close</span></button>' +
                    '</div>' +
                    '<div class="pcw-block-body"><textarea rows="4" data-block-idx="' + idx + '">' + escH(b.text) + '</textarea></div>';
                world.appendChild(card);

                var _ta = card.querySelector('textarea');
                if (!b.collapsed) {
                    _ta.style.height = 'auto';
                    _ta.style.height = Math.min(_ta.scrollHeight + 2, 420) + 'px';
                }
                _ta.addEventListener('input', function(e) {
                    _canvasBlocks[idx].text = e.target.value;
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight + 2, 420) + 'px';
                    _pcwSaveDraft();
                    _pcwUpdatePreview();
                    _pcwUpdateStats();
                });

                card.querySelector('.pcw-block-collapse').addEventListener('click', function() {
                    _canvasBlocks[idx].collapsed = !_canvasBlocks[idx].collapsed;
                    renderCanvas();
                });
                card.querySelector('.pcw-block-remove').addEventListener('click', function() {
                    _canvasBlocks.splice(idx, 1);
                    renderCanvas();
                });

                // Header drag moves the card; a sub-4px press is a collapse toggle
                var hdr = card.querySelector('.pcw-block-header');
                hdr.addEventListener('mousedown', function(e) {
                    if (e.button !== 0 || e.target.closest('button')) return;
                    e.preventDefault();
                    var startX = e.clientX,
                        startY = e.clientY;
                    var origX = _canvasBlocks[idx].x,
                        origY = _canvasBlocks[idx].y;
                    var moved = false;

                    function onMove(ev) {
                        if (!moved && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 4) {
                            moved = true;
                            card.classList.add('dragging');
                        }
                        if (moved) {
                            _canvasBlocks[idx].x = origX + (ev.clientX - startX) / _canvasState.zoom;
                            _canvasBlocks[idx].y = origY + (ev.clientY - startY) / _canvasState.zoom;
                            card.style.left = _canvasBlocks[idx].x + 'px';
                            card.style.top = _canvasBlocks[idx].y + 'px';
                        }
                    }

                    function onUp() {
                        document.removeEventListener('mousemove', onMove);
                        document.removeEventListener('mouseup', onUp);
                        card.classList.remove('dragging');
                        if (moved) {
                            renderCanvas();
                        } else {
                            _canvasBlocks[idx].collapsed = !_canvasBlocks[idx].collapsed;
                            renderCanvas();
                        }
                    }
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                });
            });

            _pcwApplyView();
            _pcwSaveDraft();
            _pcwUpdatePreview();
            _pcwUpdateStats();
        }

        

        function _pcwCatColor(cat) {
            var m = CATEGORIES.filter(function(c) {
                return c.id === cat;
            })[0];
            return m ? m.color : 'var(--accent)';
        }

        


        /* ---- Save to library ---- */
        async function saveToLibrary() {
            var title = ($('#pcwTitleInput') ? $('#pcwTitleInput').value : '').trim();
            if (!title) {
                toast('Add a title before saving', 'warning');
                if ($('#pcwTitleInput')) $('#pcwTitleInput').focus();
                return;
            }
            if (!_canvasBlocks.length) {
                toast('Canvas is empty — add some blocks first', 'warning');
                return;
            }
            var assembled = assemblePrompt();
            if (!assembled.trim()) {
                toast('All blocks are empty', 'warning');
                return;
            }
            try {
                var folderSel = $('#pcwFolderSelect');
                var tagsInp = $('#pcwTagsInput');
                var folderId = (folderSel && folderSel.value) ? parseInt(folderSel.value, 10) : null;
                var tags = tagsInp ? tagsInp.value.trim() : '';
                await api('/prompts', {
                    method: 'POST',
                    body: {
                        title: title,
                        content: assembled,
                        description: 'Built with Prompt Components',
                        tags: tags,
                        categories: '',
                        folder_id: folderId
                    }
                });
                toast('Saved to library', 'success');
                ['#pcwSaveBtnFooter'].forEach(function(sel) {
                    var btn = $(sel);
                    if (btn) {
                        btn.classList.add('save-success');
                        setTimeout(function() {
                            btn.classList.remove('save-success');
                        }, 700);
                    }
                });
                loadAll();
            } catch (err) {
                console.error('pcw save:', err);
                toast('Could not save: ' + (err.message || 'unknown error'), 'error');
            }
        }

        

        function _galOpen(view) {
            var g = $('#pcwGallery');
            if (!g) return;
            g.hidden = false;
            _galStack = [view || {
                mode: 'home'
            }];
            var s = $('#pcwGallerySearch');
            if (s) s.value = '';
            _galRender();
        }

        

        function _galUpdateCart(bump) {
            var chip = $('#pcwGalCartBtn');
            if (chip) {
                chip.innerHTML = '<span class="material-symbols-outlined">inventory_2</span> ' + _galCart.length;
                if (bump) {
                    chip.classList.remove('bump');
                    void chip.offsetWidth;
                    chip.classList.add('bump');
                }
            }
            var bar = $('#pcwGalCartBar');
            if (bar) {
                bar.hidden = _galCart.length === 0;
                var lbl = $('#pcwGalCartBarLabel');
                if (lbl) lbl.textContent = _galCart.length + ' component' + (_galCart.length !== 1 ? 's' : '') + ' in your kit';
            }
        }

        

        function _galRender() {
            var body = $('#pcwGalBody');
            if (!body) return;
            var v = _galStack[_galStack.length - 1] || {
                mode: 'home'
            };
            var back = $('#pcwGalBack');
            if (back) back.hidden = _galStack.length <= 1;
            _galUpdateCart();
            var title = $('#pcwGalTitle'),
                icon = $('#pcwGalIcon');

            if (v.mode === 'home') {
                if (title) title.textContent = 'Component Library';
                if (icon) icon.textContent = 'storefront';
                var cards = CATEGORIES.map(function(c) {
                    var n = BLOCKS.filter(function(b) {
                        return b.cat === c.id;
                    }).length;
                    return '<button type="button" class="pcw-dept-card" data-gal-cat="' + c.id + '" style="--cat-color:' + c.color + '">' +
                        '<span class="material-symbols-outlined">' + c.icon + '</span>' +
                        '<span class="pcw-dept-name">' + escH(c.label) + '</span>' +
                        '<span class="pcw-dept-desc">' + escH(c.desc || '') + '</span>' +
                        '<span class="pcw-dept-count">' + n + ' blocks</span></button>';
                }).join('');
                cards += '<button type="button" class="pcw-dept-card" data-gal-cat="__fw" style="--cat-color:var(--accent)">' +
                    '<span class="material-symbols-outlined">extension</span>' +
                    '<span class="pcw-dept-name">Frameworks</span>' +
                    '<span class="pcw-dept-desc">Complete ready-made prompt structures</span>' +
                    '<span class="pcw-dept-count">' + FRAMEWORKS.length + ' frameworks</span></button>';
                body.innerHTML = '<div class="pcw-dept-grid">' + cards + '</div>';

            } else if (v.mode === 'cat') {
                var cm = CATEGORIES.filter(function(c) {
                    return c.id === v.cat;
                })[0];
                if (title) title.textContent = cm ? cm.label : 'Category';
                if (icon) icon.textContent = cm ? cm.icon : 'category';
                var list = [];
                BLOCKS.forEach(function(b, gi) {
                    if (b.cat === v.cat) list.push(_galBlockCard(b, gi));
                });
                body.innerHTML = '<div class="pcw-gal-grid">' + list.join('') + '</div>';

            } else if (v.mode === 'fw') {
                if (title) title.textContent = 'Frameworks';
                if (icon) icon.textContent = 'extension';
                body.innerHTML = '<div class="pcw-gal-grid">' + FRAMEWORKS.map(function(f, fi) {
                    return _galFwCard(f, fi);
                }).join('') + '</div>';

            } else if (v.mode === 'search') {
                if (title) title.textContent = 'Search results';
                if (icon) icon.textContent = 'search';
                var q = v.q.toLowerCase();
                var bs = [];
                BLOCKS.forEach(function(b, gi) {
                    if (b.label.toLowerCase().indexOf(q) !== -1 || b.text.toLowerCase().indexOf(q) !== -1) bs.push(_galBlockCard(b, gi));
                });
                var fws = [];
                FRAMEWORKS.forEach(function(f, fi) {
                    if (f.badge.toLowerCase().indexOf(q) !== -1 || f.name.toLowerCase().indexOf(q) !== -1 ||
                        (f.desc || '').toLowerCase().indexOf(q) !== -1) fws.push(_galFwCard(f, fi));
                });
                body.innerHTML =
                    (bs.length ? '<div class="pcw-gal-section-label">Blocks (' + bs.length + ')</div><div class="pcw-gal-grid">' + bs.join('') + '</div>' : '') +
                    (fws.length ? '<div class="pcw-gal-section-label">Frameworks (' + fws.length + ')</div><div class="pcw-gal-grid">' + fws.join('') + '</div>' : '') +
                    (!bs.length && !fws.length ? '<div class="pcw-gal-empty">Nothing matches your search.</div>' : '');

            } else if (v.mode === 'cart') {
                if (title) title.textContent = 'Your kit';
                if (icon) icon.textContent = 'inventory_2';
                if (!_galCart.length) {
                    body.innerHTML = '<div class="pcw-gal-empty">Your kit is empty. Browse the departments and add components.</div>';
                } else {
                    var rows = _galCart.map(function(it, i) {
                        var col = it.cat ? _pcwCatColor(it.cat) : 'var(--accent)';
                        var snip = escH(String(it.text).replace(/\s+/g, ' ').slice(0, 110));
                        return '<div class="pcw-cart-row" style="--cat-color:' + col + '">' +
                            (it.badge ?
                                '<span class="pcw-fw-badge">' + escH(it.badge) + '</span>' :
                                '<span class="material-symbols-outlined pcw-cart-row-icon">' + (it.icon || 'extension') + '</span>') +
                            '<div class="pcw-cart-row-main">' +
                            '<div class="pcw-cart-row-name">' + escH(it.label) + '</div>' +
                            '<div class="pcw-cart-row-snippet">' + snip + '</div>' +
                            '</div>' +
                            '<button type="button" class="icon-btn pcw-cart-row-remove" data-cart-remove="' + i + '" aria-label="Remove from kit">' +
                            '<span class="material-symbols-outlined">close</span></button></div>';
                    }).join('');
                    body.innerHTML = '<div class="pcw-cart-list">' + rows + '</div>' +
                        '<div class="pcw-cart-actions">' +
                        '<button type="button" class="btn btn-accent" data-cart-checkout="1">' +
                        '<span class="material-symbols-outlined">arrow_forward</span> Add ' + _galCart.length +
                        ' component' + (_galCart.length !== 1 ? 's' : '') + ' to canvas</button></div>';
                }

            } else if (v.mode === 'preview') {
                var it = v.item;
                if (title) title.textContent = it.label || it.name || 'Component';
                if (icon) icon.textContent = it.icon || 'extension';
                var blanks = countBlanks(it.text);
                var words = it.text.trim() ? it.text.trim().split(/\s+/).length : 0;
                body.innerHTML =
                    '<div class="pcw-gal-preview" style="--cat-color:' + (it.cat ? _pcwCatColor(it.cat) : 'var(--accent)') + '">' +
                    '<div class="pcw-gal-preview-meta">' +
                    '<span class="pcw-block-type-badge" style="--blk-color:' + (it.cat ? _pcwCatColor(it.cat) : 'var(--accent)') + '">' + escH(it.badgeLabel || it.label || it.name) + '</span>' +
                    (blanks ?
                        '<span class="pcw-blank-chip">' + blanks + ' blanks to fill</span>' :
                        '<span class="pcw-blank-chip" style="color:var(--c-green,#22c55e);background:color-mix(in srgb, var(--c-green,#22c55e) 12%, transparent);">ready to use</span>') +
                    '<span class="pcw-gal-preview-words">' + words + ' words</span>' +
                    '</div>' +
                    '<pre class="pcw-gal-preview-text">' + escH(it.text) + '</pre>' +
                    '<div class="pcw-gal-preview-actions">' +
                    '<button type="button" class="btn btn-ghost" data-gal-backbtn="1"><span class="material-symbols-outlined">arrow_back</span> Keep browsing</button>' +
                    '<button type="button" class="btn btn-accent" data-gal-add="1"><span class="material-symbols-outlined">library_add</span> Add to kit</button>' +
                    '</div>' +
                    '</div>';
            }
            body.scrollTop = 0;
        }

        

        function _aiSetStep(step) {
            if ($('#pcwAiStepAsk')) $('#pcwAiStepAsk').hidden = step !== 'ask';
            if ($('#pcwAiStepConfirm')) $('#pcwAiStepConfirm').hidden = step !== 'confirm';
        }

        

        window.PL_openAiBuild = function() {
            var ov = $('#pcwAiOverlay');
            if (!ov) return;
            ov.hidden = false;
            _aiSetStep('ask');
            _aiStatus('');
            if ($('#pcwAiInput')) $('#pcwAiInput').focus();
        };

        function _aiClose() {
            var ov = $('#pcwAiOverlay');
            if (ov) ov.hidden = true;
        }

        

        async function _aiAsk() {
            var input = $('#pcwAiInput');
            var text = input ? input.value.trim() : '';
            if (text.length < 10) {
                _aiStatus('Describe the prompt in a little more detail first.', true);
                return;
            }
            var provider = localStorage.getItem('pl_ai_provider') || 'openai';
            if (!localStorage.getItem('pl_api_key_' + provider)) {
                _aiStatus('Add your API key in Settings (bottom left) first.', true);
                return;
            }
            var btn = $('#pcwAiAskBtn');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-outlined" style="animation:spin 1s linear infinite;font-size:15px;">progress_activity</span> Thinking of three builds…';
            }
            _aiStatus('');
            var systemPrompt = 'You help users assemble AI prompts from a fixed catalogue of building blocks.\n' +
                'Given the user\'s description, respond with ONLY a JSON object, no markdown fences, no preamble:\n' +
                '{\n  "options": [\n' +
                '    { "approach": "Lean & direct", "restatement": "...", "title": "...", "blocks": ["Exact Label"] },\n' +
                '    { "approach": "Structured & thorough", "restatement": "...", "title": "...", "blocks": ["Exact Label"] },\n' +
                '    { "approach": "Defensive & rigorous", "restatement": "...", "title": "...", "blocks": ["Exact Label"] }\n' +
                '  ]\n}\n' +
                'Rules:\n' +
                '- Provide exactly 3 options, each a genuinely different take: option 1 the leanest build that works, option 2 the most balanced structured build, option 3 the most rigorous defensive build (guardrails, evaluation).\n' +
                '- "restatement" repeats the user\'s goal back in your own words, 1-2 sentences, addressed to the user, adjusted to that option\'s angle.\n' +
                '- "title" is a short prompt title, max 8 words.\n' +
                '- Every entry in "blocks" MUST be an exact label copied from the catalogue below.\n' +
                '- Order blocks the way a well-structured prompt reads: identity or role first, then context, task, reasoning, constraints, and output format or guardrails last.\n' +
                '- Target size for the SELECTED level (apply to option 2; option 1 may go smaller, option 3 may go larger): ' +
                (_AI_LEVELS[_aiLevel] || _AI_LEVELS.intermediate) + '\n\n' +
                'CATALOGUE (category: labels separated by |):\n' + _aiCatalogue();
            try {
                var raw = await callAI(systemPrompt, text, 2000);
                var cleaned = raw.replace(/^```(json)?/i, '').replace(/```\s*$/, '').trim();
                var plan = JSON.parse(cleaned);
                var options = (plan.options || []).map(_aiValidateOption).filter(Boolean);
                if (!options.length) throw new Error('Could not match the suggestions to real blocks — try rephrasing.');
                _aiPlan = {
                    options: options,
                    chosen: 0
                };
                var wrap = $('#pcwAiOptions');
                if (wrap) {
                    wrap.innerHTML = options.map(function(o, i) {
                        return '<button type="button" class="pcw-ai-option" data-ai-option="' + i + '">' +
                            '<span class="pcw-ai-option-name">' + escH(o.approach) + '</span>' +
                            '<span class="pcw-ai-option-count">' + o.items.length + ' blocks</span>' +
                            '<span class="pcw-ai-option-title">' + escH(o.title) + '</span></button>';
                    }).join('');
                }
                var repBtn = $('#pcwAiReplaceBtn');
                if (repBtn) repBtn.hidden = _canvasBlocks.length === 0;
                _aiSelectOption(0);
                _aiSetStep('confirm');
            } catch (err) {
                console.error('AI build:', err);
                _aiStatus(err.message || 'Something went wrong — try again.', true);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<span class="material-symbols-outlined">auto_awesome</span> Read my request';
                }
            }
        }

        


        /* ---- Open / close ---- */
        window.openComponentsWorkspace = function() {
            $('#componentsWorkspace') && $('#componentsWorkspace').classList.add('open');
            $$('.nav-item[data-view]').forEach(function(el) {
                el.classList.toggle('active', el.dataset.view === 'components');
            });
            renderCatPills();
            renderCatRail();
            renderPalette('');
            renderCanvas();

            if (_canvasBlocks.length && window.innerWidth >= 1200) {
                var sheet0 = $('#pcwPreviewSheet');
                if (sheet0 && !sheet0.classList.contains('open')) {
                    sheet0.classList.add('open');
                    sheet0.setAttribute('aria-hidden', 'false');
                    _pcwUpdatePreview();
                }
            }

            if ($('#pcwTitleInput') && !$('#pcwTitleInput').value && _pcwDraftTitle) {
                $('#pcwTitleInput').value = _pcwDraftTitle;
            }
            var fsel = $('#pcwFolderSelect');
            if (fsel && state.folders) {
                var prevFolder = fsel.value;
                fsel.innerHTML = '<option value="">No folder</option>' + state.folders.map(function(f) {
                    return '<option value="' + f.id + '">' + escH(f.name) + '</option>';
                }).join('');
                fsel.value = prevFolder;
            }

            if ($('#componentsWorkspace') && $('#componentsWorkspace')._pcwWired) return;
            var ws = $('#componentsWorkspace');
            if (!ws) return;
            ws._pcwWired = true;

            // Search input
            if ($('#pcwPaletteSearch')) {
                $('#pcwPaletteSearch').addEventListener('input', function(e) {
                    renderPalette(e.target.value);
                });
            }

            if ($('#closeComponentsBtn')) $('#closeComponentsBtn').addEventListener('click', closeComponentsWorkspace);
            ws.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') closeComponentsWorkspace();
            });

            if ($('#pcwClearBtn')) {
                var _pcwClearArmed = false,
                    _pcwClearTimer = null;
                $('#pcwClearBtn').addEventListener('click', function() {
                    if (!_canvasBlocks.length) return;
                    var btn = this;
                    if (_pcwClearArmed) {
                        clearTimeout(_pcwClearTimer);
                        _pcwClearArmed = false;
                        btn.innerHTML = '<span class="material-symbols-outlined">restart_alt</span> Clear canvas';
                        btn.style.cssText = '';
                        _canvasBlocks = [];
                        renderCanvas();
                    } else {
                        _pcwClearArmed = true;
                        btn.innerHTML = '<span class="material-symbols-outlined">warning</span> Click again to clear';
                        btn.style.color = 'var(--c-red,#ef4444)';
                        btn.style.borderColor = 'var(--c-red,#ef4444)';
                        _pcwClearTimer = setTimeout(function() {
                            _pcwClearArmed = false;
                            var b = $('#pcwClearBtn');
                            if (b) {
                                b.innerHTML = '<span class="material-symbols-outlined">restart_alt</span> Clear canvas';
                                b.style.cssText = '';
                            }
                        }, 3000);
                    }
                });
            }
            if ($('#pcwSaveBtnFooter')) $('#pcwSaveBtnFooter').addEventListener('click', saveToLibrary);
            if ($('#pcwTitleInput')) $('#pcwTitleInput').addEventListener('input', _pcwSaveDraft);

            // Copy assembled button
            if ($('#pcwCopyBtn')) {
                $('#pcwCopyBtn').addEventListener('click', function() {
                    var text = assemblePrompt();
                    if (!text) {
                        toast('Canvas is empty', 'warning');
                        return;
                    }
                    var btn = $('#pcwCopyBtn');
                    navigator.clipboard && navigator.clipboard.writeText(text).then(function() {
                        toast('Prompt copied to clipboard', 'success');
                        if (btn) {
                            btn.classList.add('copied');
                            btn.querySelector('.material-symbols-outlined').textContent = 'check';
                            setTimeout(function() {
                                btn.classList.remove('copied');
                                btn.querySelector('.material-symbols-outlined').textContent = 'content_copy';
                            }, 1500);
                        }
                    });
                });
            }

            // Preview button — toggles the live assembled-prompt pane
            if ($('#pcwPreviewBtn')) {
                $('#pcwPreviewBtn').addEventListener('click', function() {
                    var sheet = $('#pcwPreviewSheet');
                    if (!sheet) return;
                    if (sheet.classList.contains('open')) {
                        sheet.classList.remove('open');
                        sheet.setAttribute('aria-hidden', 'true');
                        return;
                    }
                    sheet.classList.add('open');
                    sheet.setAttribute('aria-hidden', 'false');
                    _pcwUpdatePreview();
                });
            }

            // Preview sheet — copy button
            if ($('#pcwPreviewCopyBtn')) {
                $('#pcwPreviewCopyBtn').addEventListener('click', function() {
                    var text = $('#pcwPreviewText') ? $('#pcwPreviewText').textContent : '';
                    if (!text) return;
                    navigator.clipboard && navigator.clipboard.writeText(text).then(function() {
                        toast('Prompt copied to clipboard', 'success');
                        var btn = $('#pcwPreviewCopyBtn');
                        if (btn) {
                            btn.innerHTML = '<span class="material-symbols-outlined">check</span> Copied!';
                            setTimeout(function() {
                                btn.innerHTML = '<span class="material-symbols-outlined">content_copy</span> Copy to clipboard';
                            }, 1800);
                        }
                    });
                });
            }

            // Preview sheet — save button (pre-fills title if empty, triggers save)
            if ($('#pcwPreviewSaveBtn')) {
                $('#pcwPreviewSaveBtn').addEventListener('click', function() {
                    var sheet = $('#pcwPreviewSheet');
                    if (sheet) {
                        sheet.classList.remove('open');
                        sheet.setAttribute('aria-hidden', 'true');
                    }
                    saveToLibrary();
                });
            }

            // Preview sheet — close button + Escape
            function closePcwPreviewSheet() {
                var sheet = $('#pcwPreviewSheet');
                if (sheet) {
                    sheet.classList.remove('open');
                    sheet.setAttribute('aria-hidden', 'true');
                }
            }
            if ($('#pcwPreviewClose')) {
                $('#pcwPreviewClose').addEventListener('click', closePcwPreviewSheet);
            }
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && $('#pcwPreviewSheet') && $('#pcwPreviewSheet').classList.contains('open')) {
                    closePcwPreviewSheet();
                }
            });

            // Tile click: open preview modal or add directly
            ws.addEventListener('click', function(e) {
                var tile = e.target.closest('[data-pcw-block]');
                var fw = e.target.closest('[data-pcw-fw]');
                if (tile) {
                    var b = BLOCKS[parseInt(tile.dataset.pcwBlock, 10)];
                    if (b) {
                        if (typeof window.openPreviewModal === 'function') {
                            window.openPreviewModal({
                                icon: b.icon,
                                title: b.label,
                                text: b.text,
                                insertLabel: 'Add to Canvas',
                                onInsert: function(text) {
                                    addBlock(b.label, text, b.cat);
                                    wireDropZone();
                                }
                            });
                        } else {
                            addBlock(b.label, b.text, b.cat);
                            wireDropZone();
                        }
                    }
                } else if (fw) {
                    var f = FRAMEWORKS[parseInt(fw.dataset.pcwFw, 10)];
                    if (f) {
                        var fwText = f.text || (f.blocks ?
                            f.blocks.map(function(bl) {
                                var blk = BLOCKS.filter(function(x) {
                                    return x.label === bl;
                                })[0];
                                return blk ? blk.text : '';
                            }).join('\n\n') :
                            '');
                        if (typeof window.openPreviewModal === 'function') {
                            window.openPreviewModal({
                                badge: f.badge,
                                title: f.name,
                                text: fwText,
                                insertLabel: 'Add to Canvas',
                                onInsert: function(text) {
                                    addBlock(f.name, text);
                                    wireDropZone();
                                }
                            });
                        } else {
                            addFramework(f);
                            wireDropZone();
                        }
                    }
                }
            });

            // Palette drag
            ws.addEventListener('dragstart', function(e) {
                var tile = e.target.closest('[data-pcw-block]');
                var fw2 = e.target.closest('[data-pcw-fw]');
                if (tile) {
                    e.dataTransfer.setData('pcw-block', tile.dataset.pcwBlock);
                    e.dataTransfer.effectAllowed = 'copy';
                } else if (fw2) {
                    e.dataTransfer.setData('pcw-fw', fw2.dataset.pcwFw);
                    e.dataTransfer.effectAllowed = 'copy';
                }
            });

            // Infinite canvas: pan + zoom
            var zoneEl = $('#pcwDropZone');
            if (zoneEl) {
                zoneEl.addEventListener('mousedown', function(e) {
                    if (e.button !== 0) return;
                    if (e.target.closest('.pcw-canvas-block') || e.target.closest('.pcw-quickstarts') ||
                        e.target.closest('.pcw-view-tools') || e.target.closest('button')) return;
                    e.preventDefault();
                    var sx = e.clientX,
                        sy = e.clientY;
                    var ox = _canvasState.panX,
                        oy = _canvasState.panY;
                    zoneEl.classList.add('panning');

                    function onMove(ev) {
                        _canvasState.panX = ox + (ev.clientX - sx);
                        _canvasState.panY = oy + (ev.clientY - sy);
                        _pcwApplyView();
                    }

                    function onUp() {
                        document.removeEventListener('mousemove', onMove);
                        document.removeEventListener('mouseup', onUp);
                        zoneEl.classList.remove('panning');
                        _pcwSaveDraft();
                    }
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                });
                zoneEl.addEventListener('wheel', function(e) {
                    e.preventDefault();
                    if (e.ctrlKey) {
                        var rect = zoneEl.getBoundingClientRect();
                        var mx = e.clientX - rect.left,
                            my = e.clientY - rect.top;
                        var oldZ = _canvasState.zoom;
                        var z = Math.max(0.25, Math.min(2, oldZ * (e.deltaY < 0 ? 1.1 : 0.9)));
                        _canvasState.panX = mx - (mx - _canvasState.panX) * (z / oldZ);
                        _canvasState.panY = my - (my - _canvasState.panY) * (z / oldZ);
                        _canvasState.zoom = z;
                    } else if (e.shiftKey) {
                        _canvasState.panX -= e.deltaY;
                    } else {
                        _canvasState.panX -= e.deltaX;
                        _canvasState.panY -= e.deltaY;
                    }
                    _pcwApplyView();
                }, {
                    passive: false
                });
            }
            if ($('#pcwZoomInBtn')) $('#pcwZoomInBtn').addEventListener('click', function() {
                _canvasState.zoom = Math.min(2, _canvasState.zoom * 1.2);
                _pcwApplyView();
                _pcwSaveDraft();
            });
            if ($('#pcwZoomOutBtn')) $('#pcwZoomOutBtn').addEventListener('click', function() {
                _canvasState.zoom = Math.max(0.25, _canvasState.zoom / 1.2);
                _pcwApplyView();
                _pcwSaveDraft();
            });
            if ($('#pcwFitBtn')) $('#pcwFitBtn').addEventListener('click', _pcwFitView);

            // Component gallery wiring
            function _openGalleryHome() {
                _galOpen({
                    mode: 'home'
                });
            }
            if ($('#pcwBrowseBtn')) $('#pcwBrowseBtn').addEventListener('click', _openGalleryHome);
            if ($('#pcwBrowseBtnEmpty')) $('#pcwBrowseBtnEmpty').addEventListener('click', _openGalleryHome);
            if ($('#pcwGalClose')) $('#pcwGalClose').addEventListener('click', _galClose);
            if ($('#pcwGalBack')) $('#pcwGalBack').addEventListener('click', _galBack);

            function _galShowCart() {
                var top = _galStack[_galStack.length - 1];
                if (!top || top.mode !== 'cart') _galPush({
                    mode: 'cart'
                });
            }
            if ($('#pcwGalCartBtn')) $('#pcwGalCartBtn').addEventListener('click', _galShowCart);
            if ($('#pcwGalCartViewBtn')) $('#pcwGalCartViewBtn').addEventListener('click', _galShowCart);
            if ($('#pcwGalCartGoBtn')) $('#pcwGalCartGoBtn').addEventListener('click', _galCheckout);
            if ($('#pcwGallery')) {
                $('#pcwGallery').addEventListener('keydown', function(e) {
                    if (e.key === 'Escape') {
                        e.stopPropagation();
                        _galBack();
                    }
                });
            }
            if ($('#pcwGalBody')) {
                $('#pcwGalBody').addEventListener('click', function(e) {
                    var el;
                    if ((el = e.target.closest('[data-cart-block]'))) {
                        var cb = BLOCKS[parseInt(el.dataset.cartBlock, 10)];
                        if (cb) _galCartAdd(_galItemFromBlock(cb));
                    } else if ((el = e.target.closest('[data-cart-fw]'))) {
                        var cf = FRAMEWORKS[parseInt(el.dataset.cartFw, 10)];
                        if (cf) _galCartAdd(_galItemFromFw(cf));
                    } else if ((el = e.target.closest('[data-cart-remove]'))) {
                        _galCartRemove(parseInt(el.dataset.cartRemove, 10));
                    } else if (e.target.closest('[data-cart-checkout]')) {
                        _galCheckout();
                    } else if ((el = e.target.closest('[data-gal-cat]'))) {
                        var cid = el.dataset.galCat;
                        _galPush(cid === '__fw' ? {
                            mode: 'fw'
                        } : {
                            mode: 'cat',
                            cat: cid
                        });
                    } else if ((el = e.target.closest('[data-gal-block]'))) {
                        var gb = BLOCKS[parseInt(el.dataset.galBlock, 10)];
                        if (gb) _galPush({
                            mode: 'preview',
                            item: gb
                        });
                    } else if ((el = e.target.closest('[data-gal-fw]'))) {
                        var gf = FRAMEWORKS[parseInt(el.dataset.galFw, 10)];
                        if (gf) _galPush({
                            mode: 'preview',
                            item: {
                                label: gf.name,
                                name: gf.name,
                                icon: 'extension',
                                text: gf.text || '',
                                badgeLabel: gf.badge,
                                cat: null,
                                fw: true
                            }
                        });
                    } else if (e.target.closest('[data-gal-backbtn]')) {
                        _galBack();
                    } else if (e.target.closest('[data-gal-add]')) {
                        var v = _galStack[_galStack.length - 1];
                        if (v && v.mode === 'preview' && v.item) {
                            var it = v.item;
                            _galCartAdd({
                                label: it.label || it.name,
                                text: it.text,
                                cat: it.cat || null,
                                icon: it.icon,
                                badge: it.badgeLabel || it.badge
                            });
                            _galBack();
                        }
                    }
                });
            }
            if ($('#pcwGallerySearch')) {
                $('#pcwGallerySearch').addEventListener('input', function(e) {
                    var q = e.target.value.trim();
                    var top = _galStack[_galStack.length - 1];
                    if (q.length >= 2) {
                        if (top && top.mode === 'search') {
                            top.q = q;
                            _galRender();
                        } else _galPush({
                            mode: 'search',
                            q: q
                        });
                    } else if (top && top.mode === 'search') {
                        _galBack();
                    }
                });
            }

            // AI Build wiring
            if ($('#pcwAiBuildBtn')) {
                $('#pcwAiBuildBtn').addEventListener('click', function() {
                    if (!state.isPremium) {
                        showPremiumModal();
                        return;
                    }
                    window.PL_openAiBuild();
                });
            }
            if ($('#pcwAiClose')) $('#pcwAiClose').addEventListener('click', _aiClose);
            if ($('#pcwAiOverlay')) {
                $('#pcwAiOverlay').addEventListener('click', function(e) {
                    if (e.target === $('#pcwAiOverlay')) _aiClose();
                });
                $('#pcwAiOverlay').addEventListener('keydown', function(e) {
                    if (e.key === 'Escape') {
                        e.stopPropagation();
                        _aiClose();
                    }
                });
            }
            if ($('#pcwAiLevels')) {
                $('#pcwAiLevels').addEventListener('click', function(e) {
                    var lb = e.target.closest('.pcw-ai-depth-btn');
                    if (!lb) return;
                    _aiLevel = lb.dataset.level;
                    $('#pcwAiLevels').querySelectorAll('.pcw-ai-depth-btn').forEach(function(x) {
                        x.classList.toggle('active', x === lb);
                    });
                });
            }
            if ($('#pcwAiOptions')) {
                $('#pcwAiOptions').addEventListener('click', function(e) {
                    var oc = e.target.closest('[data-ai-option]');
                    if (oc) _aiSelectOption(parseInt(oc.dataset.aiOption, 10));
                });
            }
            if ($('#pcwAiAskBtn')) $('#pcwAiAskBtn').addEventListener('click', _aiAsk);
            if ($('#pcwAiBackBtn')) $('#pcwAiBackBtn').addEventListener('click', function() {
                _aiSetStep('ask');
            });
            if ($('#pcwAiGoBtn')) $('#pcwAiGoBtn').addEventListener('click', function() {
                _aiBuild(false);
            });
            if ($('#pcwAiReplaceBtn')) $('#pcwAiReplaceBtn').addEventListener('click', function() {
                _aiBuild(true);
            });
            if ($('#pcwAiToGenBtn')) $('#pcwAiToGenBtn').addEventListener('click', _aiToGenerator);
            if ($('#pcwAiSkip')) $('#pcwAiSkip').addEventListener('click', function() {
                _aiSkip = true;
            });

            // Quick-start recipes (empty-canvas buttons)
            ws.addEventListener('click', function(e) {
                var qs = e.target.closest('[data-qs]');
                if (!qs) return;
                if (qs.dataset.qs === 'frameworks') {
                    _galOpen({
                        mode: 'fw'
                    });
                    return;
                }
                var recipes = {
                    essential: ['Role', 'Context', 'Task', 'Output Format'],
                    reasoning: ['Role', 'Context', 'Task', 'Chain of Thought', 'Constraints', 'Output Format']
                };
                (recipes[qs.dataset.qs] || []).forEach(function(lbl) {
                    var b = BLOCKS.filter(function(x) {
                        return x.label === lbl;
                    })[0];
                    if (b) _canvasBlocks.push({
                        label: b.label,
                        text: b.text,
                        cat: b.cat,
                        collapsed: false
                    });
                });
                renderCanvas();
            });

            // Keyboard add: Enter or Space on a focused palette row
            ws.addEventListener('keydown', function(e) {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                var row = e.target.closest ? e.target.closest('[data-pcw-block],[data-pcw-fw]') : null;
                if (!row) return;
                e.preventDefault();
                row.click();
            });

            wireDropZone();
        };

        function closeComponentsWorkspace() {
            $('#componentsWorkspace') && $('#componentsWorkspace').classList.remove('open');
            $$('.nav-item[data-view]').forEach(function(el) {
                el.classList.toggle('active', el.dataset.view === 'library');
            });
        }
        
