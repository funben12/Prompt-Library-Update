/* Library main view (toolbar, grid, list, folders) — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    async function api(path, opts = {}) {
        const url = API_BASE + path;
        const init = {
            headers: {
                'Content-Type': 'application/json'
            },
            ...opts,
        };
        if (init.body && typeof init.body !== 'string') {
            init.body = JSON.stringify(init.body);
        }
        const res = await fetch(url, init);
        if (!res.ok) {
            let detail = '';
            try {
                detail = (await res.json()).error || '';
            } catch {}
            throw new Error(`API ${res.status}: ${detail || res.statusText}`);
        }
        if (res.status === 204) return null;
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) return res.json();
        return res.text();
    }

    

    async function loadFolders() {
        try {
            state.folders = await api('/folders');
            renderFolders();
            updateFolderDropdown();
        } catch (err) {
            console.error('loadFolders:', err);
        }
    }

    

    function setView(view) {
        state.view = view;
        state.filterPill = null; // clear any active pill
        state.search = '';
        state.detailId = null;
        closeDetailPanel();

        // Sidebar nav active state
        $$('.nav-item[data-view]').forEach(el => {
            el.classList.toggle('active', String(el.dataset.view) === String(view));
        });
        $$('.folder-item').forEach(el => {
            el.classList.toggle('active', Number(el.dataset.folderId) === view);
        });
        $$('.filter-list-item, [data-filter-cat], [data-filter-tag]').forEach(el => el.classList.remove('active'));

        // Header
        const titleEl = $('#viewTitle');
        const bcEl = $('#breadcrumb');
        const fvaEl = $('#folderViewActions');

        if (view === 'library') {
            titleEl.textContent = 'Library';
            bcEl.innerHTML = '';
            fvaEl.style.display = 'none';
        } else if (view === 'favorites') {
            titleEl.textContent = 'Favourites';
            bcEl.innerHTML = '<span>Library</span>';
            fvaEl.style.display = 'none';
        } else {
            const folder = state.folders.find(f => f.id === view);
            const name = folder ? folder.name : 'Folder';
            titleEl.textContent = name;
            bcEl.innerHTML = `<span>Folders</span><span class="bc-sep material-symbols-outlined">chevron_right</span><span>${escapeHtml(name)}</span>`;
            fvaEl.style.display = 'flex';
            const safeName = JSON.stringify(name).replace(/'/g, "&#39;");
            fvaEl.innerHTML = `
      <button class="btn btn-ghost" onclick="window.PL_openNewPromptInFolder(${view})">
        <span class="material-symbols-outlined">add</span> New in folder
      </button>
      <button class="btn btn-ghost" onclick='window.PL_renameFolder(${view}, ${safeName})'>
        <span class="material-symbols-outlined">edit</span> Rename
      </button>
      <button class="btn btn-ghost btn-danger" onclick="window.PL_deleteFolder(${view})">
        <span class="material-symbols-outlined">delete</span> Delete folder
      </button>`;
        }

        // Reset search input
        const si = $('#searchInput');
        if (si) si.value = '';

        // Update active filter pill
        refreshActivePill();
        renderPrompts();
        updateCounts();
    }

    

    function clearFilterPill() {
        state.filterPill = null;
        refreshActivePill();
        $('#filterFavChip').classList.remove('active');
        $('#filterRatedChip').classList.remove('active');
        $$('.filter-list-item, [data-filter-cat], [data-filter-tag]').forEach(el => el.classList.remove('active'));
        renderPrompts();
        updateCounts();
    }
    

    function refreshActivePill() {
        if (window._syncFilterCount) window._syncFilterCount();
        const pill = $('#activeFilterPill');
        const lbl = $('#activeFilterLabel');
        if (!pill || !lbl) return;
        if (!state.filterPill) {
            pill.hidden = true;
            return;
        }
        const fp = state.filterPill;
        let text = '';
        if (fp.type === 'fav') text = 'Favourites only';
        else if (fp.type === 'rated') text = 'Rated only';
        else if (fp.type === 'category') text = `Category: ${fp.value}`;
        else if (fp.type === 'tag') text = `Tag: #${fp.value}`;
        lbl.textContent = text;
        pill.hidden = false;
    }
    

    function renderPrompts() {
        const container = $('#promptsContainer');
        if (!container) return;

        container.classList.remove('list-view', 'grid-view');
        container.classList.add(state.viewMode === 'grid' ? 'grid-view' : 'list-view');

        const list = getFilteredPrompts();

        if (!list.length) {
            container.innerHTML = renderEmptyState();
            return;
        }

        if (state.groupByFolder && state.view !== 'favorites' && typeof state.view !== 'number') {
            container.innerHTML = renderGroupedByFolder(list);
        } else {
            container.innerHTML = list.map(renderPromptCard).join('');
        }
    }

    

    function renderBulkToolbar() {
        const bar = $('#bulkToolbar');
        if (!bar) return;
        const count = _bulkSelection.size;
        bar.hidden = count === 0;
        const countEl = $('#bulkCount');
        if (countEl) countEl.textContent = count + ' selected';

        const tagSel = $('#bulkTagSelect');
        if (tagSel) {
            const existing = (state.filters.tags || []).map(t =>
                '<option value="' + escapeAttr(t.value) + '">' + escapeHtml(t.value) + '</option>').join('');
            tagSel.innerHTML = '<option value="">Add tag…</option>' + existing +
                '<option value="__new__">+ New tag…</option>';
        }
        const folderSel = $('#bulkFolderSelect');
        if (folderSel) {
            const options = state.folders.map(f =>
                '<option value="' + f.id + '">' + escapeHtml(f.name) + '</option>').join('');
            folderSel.innerHTML = '<option value="">Move to folder…</option>' + options +
                '<option value="__none__">No folder</option>';
        }
    }

    

    function renderPromptCard(p) {
        const allCats = p.categories || [];
        const allTags = p.tags || [];
        const cats = allCats.slice(0, 2);
        const tags = allTags.slice(0, 2);
        const moreMeta = (allCats.length - cats.length) + (allTags.length - tags.length);
        const desc = (p.description || (p.content || '').slice(0, 120) + ((p.content || '').length > 120 ? '...' : '')) || '';
        const folder = state.folders.find(f => f.id === p.folder_id);
        const colour = p.colour_label ? `c-${p.colour_label}` : '';
        const isFav = !!p.is_favorite;
        const rating = p.rating || 0;
        const varCount = (p.variables || detectVariables(p.content)).length;
        const updated = relativeTime(p.updated_at || p.created_at);
        const active = p.id === state.detailId ? 'active' : '';

        const tagPills = [
            ...cats.map(c => `<span class="card-tag cat">${escapeHtml(c)}</span>`),
            ...tags.map(t => `<span class="card-tag">#${escapeHtml(t)}</span>`),
            moreMeta > 0 ? `<span class="card-tag more">+${moreMeta}</span>` : '',
        ].join('');

        // Join with separators so an absent trailing item cannot orphan a dot.
        const metaBits = [];
        if (varCount > 0) metaBits.push(`<span class="card-meta-item"><span class="material-symbols-outlined">token</span>${varCount} variable${varCount !== 1 ? 's' : ''}</span>`);
        if (folder) metaBits.push(`<span class="card-meta-item">${escapeHtml(folder.name)}</span>`);
        if (updated) metaBits.push(`<span class="card-meta-item">${escapeHtml(updated)}</span>`);
        const metaRow = metaBits.join('<span class="card-meta-sep">&middot;</span>');

        return `
    <article class="prompt-card ${active}" onclick="window.PL_openDetail(${p.id})" data-id="${p.id}">
      <div class="card-rule ${colour}"></div>
      <div class="card-body">
        <div class="card-title-row">
          <input type="checkbox" class="card-select" onclick="event.stopPropagation()" onchange="window.PL_toggleBulkSelect(${p.id})" ${_bulkSelection.has(p.id) ? 'checked' : ''} aria-label="Select ${escapeAttr(p.title)}" />
          <h3 class="card-title">${escapeHtml(p.title)}</h3>
          ${isFav ? '<span class="card-fav material-symbols-outlined">star</span>' : ''}
          ${rating > 0 ? `<span class="card-rating">${'\u2605'.repeat(rating)}${'\u2606'.repeat(5 - rating)}</span>` : ''}
        </div>
        ${desc ? `<p class="card-desc">${escapeHtml(desc)}</p>` : ''}
        <div class="card-meta">${metaRow}</div>
        ${tagPills ? `<div class="card-tags" style="margin-top: 4px;">${tagPills}</div>` : ''}
      </div>
      <div class="card-actions" onclick="event.stopPropagation()">
        <button class="icon-btn ${isFav ? 'fav-on' : ''}" onclick="window.PL_toggleFav(${p.id})" title="${isFav ? 'Remove from favourites' : 'Add to favourites'}">
          <span class="material-symbols-outlined">star</span>
        </button>
        <button class="icon-btn" onclick="window.PL_useFromCard(${p.id})" title="Copy to clipboard">
          <span class="material-symbols-outlined">content_copy</span>
        </button>
        <button class="icon-btn" onclick="window.PL_editPrompt(${p.id})" title="Edit">
          <span class="material-symbols-outlined">edit</span>
        </button>
        <button class="icon-btn danger" onclick="window.PL_deletePrompt(${p.id})" title="Delete">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </article>`;
    }

    

    async function openDetail(id) {
        try {
            const p = await api(`/prompts/${id}`);
            state.detailId = id;
            renderDetailPanel(p);
            $('#detailPanel').classList.add('open');
            $('#detailPanel').setAttribute('aria-hidden', 'false');

            // Highlight active card
            $$('.prompt-card').forEach(el => {
                el.classList.toggle('active', Number(el.dataset.id) === id);
            });
        } catch (err) {
            console.error('openDetail:', err);
            toast('Could not load prompt', 'error');
        }
    }

    

    function renderDetailPanel(p) {
        _currentDetailPrompt = p;
        const vars = p.variables || detectVariables(p.content);
        const cats = (p.categories || []).filter(Boolean);
        const tags = (p.tags || []).filter(Boolean);
        const folder = state.folders.find(f => f.id === p.folder_id);

        // Favourite button
        const favBtn = $('#panelFavBtn');
        const favIcon = favBtn.querySelector('.material-symbols-outlined');
        favBtn.classList.toggle('fav-on', !!p.is_favorite);
        favIcon.textContent = p.is_favorite ? 'star' : 'star_border';
        favIcon.style.fontVariationSettings = p.is_favorite ? '"FILL" 1' : '"FILL" 0';
        favIcon.style.color = p.is_favorite ? 'var(--gold)' : '';

        // Chips (categories + tags)
        $('#detailChips').innerHTML =
            cats.map(c => `<span class="card-tag cat">${escapeHtml(c)}</span>`).join('') +
            tags.map(t => `<span class="card-tag">#${escapeHtml(t)}</span>`).join('');

        $('#detailTitle').textContent = p.title || '';
        const descEl = $('#detailDesc');
        descEl.textContent = p.description || '';
        descEl.style.display = p.description ? '' : 'none';

        // Variable badge
        const varBadge = $('#detailVarBadge');
        if (vars.length > 0) {
            varBadge.hidden = false;
            $('#detailVarCount').textContent = `${vars.length} variable${vars.length !== 1 ? 's' : ''}`;
        } else {
            varBadge.hidden = true;
        }

        // Body with chip highlights
        $('#detailPromptText').innerHTML = renderChips(p.content || '');

        // Variable fill section
        const useSec = $('#usePromptSection');
        if (vars.length > 0) {
            useSec.hidden = false;
            renderVariableFields(vars, _migrateLegacyVarMeta(p.variable_meta || {}));
        } else {
            useSec.hidden = true;
            $('#variableFields').innerHTML = '';
        }

        // Meta
        $('#metaCreated').textContent = p.created_at ? formatDate(p.created_at) : '-';
        $('#metaUseCount').textContent = (p.use_count || 0).toLocaleString();
        $('#metaFolder').textContent = folder ? folder.name : '-';
        $('#metaLastUsed').textContent = p.last_used ? relativeTime(p.last_used) : 'Never';

        // Notes & rating tab
        $('#detailNotes').value = p.notes || '';
        renderStars($('#detailRatingStars'), p.rating || 0, (val) => savePromptRating(p.id, val));

        // Chain tab
        renderDetailChain(p.chain_ids || []);

        // History tab
        loadAndRenderHistory(p.id);

        // Assigned role chip (async — fetched separately so render stays sync)
        renderDetailRole(p.role_id);

        // Reset to Prompt tab on open
        switchDetailTab('prompt');
    }

    

    function _updateVarLivePreview() {
        const p = _currentDetailPrompt;
        const previewWrap = $('#varPreviewWrap');
        const previewBox = $('#varPreviewBox');
        const progressFill = $('#varFillProgressFill');
        const progressLabel = $('#varFillProgress');

        const fields = $$('#variableFields .var-input, #variableFields .var-select, #variableFields .var-checkbox');
        if (!fields.length) {
            if (previewWrap) previewWrap.hidden = true;
            return;
        }

        // Collect current values and update filled-state on each card
        let filledCount = 0;
        const map = {};
        fields.forEach(inp => {
            const v = inp.dataset.var;
            const val = inp.type === 'checkbox' ? (inp.checked ? 'Yes' : 'No') : inp.value.trim();
            map[v] = val;
            const card = inp.closest('.var-field');
            if (card) card.classList.toggle('is-filled', val.length > 0);
            if (val.length > 0) filledCount++;
        });

        // Progress bar
        const total = fields.length;
        const pct = total > 0 ? Math.round((filledCount / total) * 100) : 0;
        if (progressFill) progressFill.style.width = pct + '%';
        if (progressLabel) progressLabel.textContent = filledCount === total ?
            (total === 1 ? '1 filled ✓' : `All ${total} filled ✓`) :
            `${filledCount} / ${total}`;

        // Live preview
        if (!p || !previewWrap || !previewBox) return;
        const raw = p.content || '';
        // Build preview: replace filled vars with styled span, unfilled stay as chip
        let preview = escapeHtml(raw);
        const vars = detectVariables(raw);
        for (const v of vars) {
            const ev = escapeRegex(v);
            const val = (map[v] || '').trim();
            const replacement = val ?
                `<span class="var-preview-slot">${escapeHtml(val)}</span>` :
                `<span class="var-chip">${escapeHtml(v)}</span>`;
            preview = preview
                .replace(new RegExp(`\\[\\[${ev}\\]\\]`, 'g'), replacement)
                .replace(new RegExp(`\\{\\{${ev}\\}\\}`, 'g'), replacement)
                .replace(new RegExp(`\\(\\(${ev}\\)\\)`, 'g'), replacement);
        }
        previewWrap.hidden = false;
        previewBox.innerHTML = preview;
    }

    


    /* ── Advance to next phase (save output from textarea first) ── */
    window.PL_advanceChain = function(phaseIdx) {
        // Save output from textarea if present
        var ta = $('#chainRunnerWrap .chain-output-ta[data-phase="' + phaseIdx + '"]');
        if (ta) _chainRunnerState.outputs[phaseIdx] = ta.value.trim();
        _chainSavePhaseVars(phaseIdx);
        _chainRunnerState.step = phaseIdx + 1;
        renderChainRunner();
        toast('Phase ' + (_chainRunnerState.step + 1) + ' ready', 'info');
    };


    /* ── Finish — show summary with full chain export ─────────── */
    window.PL_finishChain = function() {
        var st = _chainRunnerState;
        var wrap = $('#chainRunnerWrap');
        if (!wrap) return;

        // Save last phase output from textarea
        var lastIdx = st.ids.length - 1;
        var ta = $('#chainRunnerWrap .chain-output-ta[data-phase="' + lastIdx + '"]');
        if (ta) st.outputs[lastIdx] = ta.value.trim();
        _chainSavePhaseVars(lastIdx);

        var phaseSummary = st.ids.map(function(id, i) {
            var p = state.prompts.find(function(x) {
                return x.id === id;
            });
            var title = p ? p.title : ('Prompt #' + id);
            var out = st.outputs[i] || '';
            var preview = out ?
                '<div class="chain-output-preview">' + escapeHtml(out.slice(0, 200)) + (out.length > 200 ? '…' : '') + '</div>' :
                '';
            return '<div class="chain-phase-summary">' +
                '<div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-2);">' +
                '<div class="chain-step-num-badge done">✓</div>' +
                '<div>' +
                '<div style="font-weight:600;font-size:var(--fs-sm);">Phase ' + (i + 1) + ': ' + escapeHtml(title) + '</div>' +
                '<div style="font-size:11px;color:' + (out ? 'var(--success)' : 'var(--ink-3)') + ';">' + (out ? 'AI response captured' : 'No response captured') + '</div>' +
                '</div></div>' +
                preview +
                '</div>';
        }).join('');

        wrap.innerHTML = '<div class="chain-runner">' +
            '<div class="chain-runner-header" style="background:var(--success-soft);">' +
            '<span style="color:var(--success);"><span class="material-symbols-outlined" style="font-size:15px;vertical-align:-3px;">check_circle</span> Chain complete — ' + st.ids.length + ' phase' + (st.ids.length !== 1 ? 's' : '') + '</span>' +
            '<button class="btn btn-ghost" style="padding:4px 8px;font-size:12px;" onclick="window.PL_stopChain()">Close</button>' +
            '</div>' +
            phaseSummary +
            '<div class="chain-runner-actions">' +
            '<button class="btn btn-accent" onclick="window.PL_exportFullChain()" style="flex:1;justify-content:center;">' +
            '<span class="material-symbols-outlined">content_copy</span> Copy full chain' +
            '</button>' +
            '<button class="btn btn-ghost" onclick="window.PL_stopChain()" style="padding:6px 14px;">Done</button>' +
            '</div></div>';
    };


    /* ── Stop / reset ─────────────────────────────────────────── */
    window.PL_stopChain = function() {
        _chainRunnerState = {
            ids: [],
            step: 0,
            outputs: {},
            varMaps: {},
            roles: {}
        };
        var wrap = $('#chainRunnerWrap');
        var runBtn = $('#runChainBtn');
        if (wrap) wrap.style.display = 'none';
        if (runBtn) runBtn.style.display = 'flex';
    };

    async function loadAndRenderHistory(promptId) {
        if (!state.isPremium) {
            $('#versionList').innerHTML = '<p style="font-size: var(--fs-sm); color: var(--ink-3);">Version history is a Pro feature.</p>';
            $('#versionEmpty').classList.add('hidden');
            return;
        }
        try {
            const versions = await api(`/prompts/${promptId}/versions`);
            const list = $('#versionList');
            const empty = $('#versionEmpty');
            if (!versions.length) {
                list.innerHTML = '';
                empty.classList.remove('hidden');
                return;
            }
            empty.classList.add('hidden');
            list.innerHTML = versions.map(v => `
      <div class="version-item" onclick="window.PL_restoreVersion(${promptId}, ${v.id})">
        <span class="material-symbols-outlined" style="color: var(--ink-3);">history</span>
        <div class="version-meta">
          <div class="version-title">${escapeHtml(v.title || 'Untitled')}</div>
          <div class="version-time">${relativeTime(v.saved_at)}</div>
        </div>
        <span class="material-symbols-outlined" style="color: var(--accent); font-size: 16px;">restore</span>
      </div>`).join('');
        } catch (err) {
            console.error('loadHistory:', err);
        }
    }

    

    async function useFromCard(id) {
        try {
            const p = await api(`/prompts/${id}`);
            const vars = detectVariables(p.content);
            const meta = p.variable_meta || {};
            const visible = vars.filter(v => (meta[v] || {}).visible !== false);
            if (visible.length > 0) {
                // Open detail to fill variables
                await openDetail(id);
                setTimeout(() => {
                    const first = $('#variableFields .var-input, #variableFields .var-select');
                    if (first) first.focus();
                }, 360);
                toast(`Fill ${visible.length} variable${visible.length !== 1 ? 's' : ''}, then copy`, 'info');
            } else {
                const role = await fetchRoleObj(p.role_id);
                const text = prependRole(p.content, role, false);
                const ok = await copyToClipboard(text);
                if (ok) {
                    api(`/prompts/${id}/use`, {
                        method: 'POST'
                    }).catch(() => {});
                    toast(role ? 'Copied with role' : 'Copied to clipboard', 'success');
                }
            }
        } catch (err) {
            toast('Could not load prompt', 'error');
        }
    }

    

    async function saveNotesAndRating() {
        if (!state.detailId) return;
        try {
            const p = await api(`/prompts/${state.detailId}`);
            const notes = $('#detailNotes').value;
            await api(`/prompts/${state.detailId}`, {
                method: 'PUT',
                body: {
                    title: p.title,
                    content: p.content,
                    description: p.description,
                    categories: (p.categories || []).join(','),
                    tags: (p.tags || []).join(','),
                    folder_id: p.folder_id,
                    colour_label: p.colour_label,
                    rating: p.rating,
                    notes,
                    variable_meta: p.variable_meta || {},
                    chain_ids: p.chain_ids || [],
                    chat_turns: p.chat_turns || [],
                },
            });
            toast('Notes saved', 'success');
        } catch (err) {
            toast('Could not save notes', 'error');
        }
    }
    

    function closePromptModal() {
        $('#promptModal').classList.remove('active');
    }

    

    function switchEditorTab(name) {
        // 'content' was the old system-prompt pane, now always visible as prompt-block.
        // Remap to 'variables' so advanced tabs still default to something sensible.
        const target = name === 'content' ? 'variables' : name;
        $$('.editor-tab').forEach(t => t.classList.toggle('active', t.dataset.pane === target));
        $$('.editor-pane').forEach(p => p.classList.toggle('active', p.id === `pane-${target}`));
    }

    

    function renderChatTurns(turns) {
        const wrap = $('#chatTurnsList');
        if (!turns.length) {
            wrap.innerHTML = '<p style="font-size: var(--fs-sm); color: var(--ink-3); margin-bottom: var(--sp-3);">No messages yet. Use the buttons below to add user or assistant messages.</p>';
            return;
        }
        wrap.innerHTML = turns.map((t, i) => `
    <div class="chat-turn" data-idx="${i}">
      <select onchange="window.PL_updateChatTurn(${i}, 'role', this.value)" class="form-input">
        <option value="system"    ${t.role === 'system'    ? 'selected' : ''}>System</option>
        <option value="user"      ${t.role === 'user'      ? 'selected' : ''}>User</option>
        <option value="assistant" ${t.role === 'assistant' ? 'selected' : ''}>Assistant</option>
      </select>
      <textarea class="form-textarea" rows="2" placeholder="Message content..." oninput="window.PL_updateChatTurn(${i}, 'content', this.value)">${escapeHtml(t.content || '')}</textarea>
      <button type="button" class="icon-btn danger" onclick="window.PL_removeChatTurn(${i})"><span class="material-symbols-outlined">close</span></button>
    </div>
  `).join('');
    }

    


    // Shared helper: always escape folder/workspace views before applying a filter pill
    function _escapeToLibrary() {
        // Close any open workspaces
        ['#forgeWorkspace', '#labWorkspace', '#rolesWorkspace', '#playgroundWorkspace',
            '#chainWorkspace', '#metaWorkspace', '#contextBankWorkspace', '#componentsWorkspace',
            '#optimizerWorkspace', '#genWorkspace', '#dashboardWorkspace', '#workspacesLauncher', '#fillWorkspace', '#auditWorkspace', '#diffWorkspace',
            '#costWorkspace', '#pulseWorkspace', '#xrayWorkspace', '#spliceWorkspace',
            '#batchWorkspace', '#boardWorkspace',
        ].forEach(sel => {
            const el = $(sel);
            if (el && el.classList.contains('open')) el.classList.remove('open');
        });
        state.view = 'library';
        state.search = '';
        state.detailId = null;
        closeDetailPanel();
        $$('.nav-item[data-view]').forEach(el =>
            el.classList.toggle('active', el.dataset.view === 'library'));
        $$('.folder-item').forEach(el => el.classList.remove('active'));
        const titleEl = $('#viewTitle');
        if (titleEl) titleEl.textContent = 'Library';
        const bcEl = $('#breadcrumb');
        if (bcEl) bcEl.innerHTML = '';
        const fvaEl = $('#folderViewActions');
        if (fvaEl) fvaEl.style.display = 'none';
    }

    

    function init() {
        loadTheme();
        $('#themeToggleBtn')?.addEventListener('click', toggleTheme);

        document.addEventListener('click', (e) => {
            const locked = e.target.closest('[data-premium="true"].premium-locked');
            if (!locked || state.isPremium) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            showPremiumModal();
        }, true);

        $$('.nav-item[data-view]').forEach(el => {
            el.addEventListener('click', () => {
                const v = el.dataset.view;
                if (v === 'analytics') {
                    openAnalytics();
                    return;
                }
                if (v === 'roles') {
                    window.openRolesWorkspace();
                    return;
                }
                if (v === 'playground') {
                    window.openPlaygroundWorkspace();
                    return;
                }
                if (v === 'forge') {
                    window.openForgeWorkspace();
                    return;
                }
                if (v === 'lab') {
                    window.openLabWorkspace();
                    return;
                }
                if (v === 'chain') {
                    window.openChainWorkspace();
                    return;
                }
                if (v === 'meta') {
                    window.openMetaWorkspace();
                    return;
                }
                if (v === 'contextBank') {
                    window.openContextBankWorkspace();
                    return;
                }
                if (v === 'components') {
                    window.openComponentsWorkspace();
                    return;
                }
                if (v === 'optimizer') {
                    window.openOptimizerWorkspace();
                    return;
                }
                if (v === 'generate') {
                    window.openGenWorkspace();
                    return;
                }
                if (v === 'workspaces') {
                    window.openWorkspacesLauncher();
                    return;
                }
                if (v === 'fill') {
                    window.openFillWorkspace();
                    return;
                }
                if (v === 'audit') {
                    window.openAuditWorkspace();
                    return;
                }
                if (v === 'diff') {
                    window.openDiffWorkspace();
                    return;
                }
                if (v === 'batch') {
                    window.openBatchWorkspace();
                    return;
                }
                if (v === 'cost') {
                    window.openCostWorkspace();
                    return;
                }
                if (v === 'pulse') {
                    window.openPulseWorkspace();
                    return;
                }
                if (v === 'xray') {
                    window.openXrayWorkspace();
                    return;
                }
                if (v === 'splice') {
                    window.openSpliceWorkspace();
                    return;
                }
                if (v === 'board') {
                    window.openBoardWorkspace();
                    return;
                }
                const stringViews = ['library', 'favorites'];
                setView(stringViews.includes(v) ? v : Number(v));
            });
        });

        $$('.nav-section-label[data-toggle]').forEach(label => {
            const name = label.dataset.toggle;
            const section = $(`#${name}-content`);
            const chev = label.querySelector('.chev');

            // Apply initial state from aria-expanded attribute
            if (label.getAttribute('aria-expanded') === 'false' && section) {
                section.classList.add('collapsed');
                if (chev) chev.style.transform = 'rotate(-90deg)';
            }

            label.addEventListener('click', (e) => {
                if (e.target.closest('.nav-icon-btn')) return;
                if (!section) return;
                const collapsed = section.classList.toggle('collapsed');
                if (chev) chev.style.transform = collapsed ? 'rotate(-90deg)' : '';
                label.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            });
        });

        $('#sidebarToggleBtn')?.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-hidden');
        });

        $('#newPromptBtn')?.addEventListener('click', openNewPromptModal);
        $('#surpriseMeBtn')?.addEventListener('click', handleSurpriseMe);
        $('#newFolderBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            openNewFolderModal();
        });

        $('#closePromptModal')?.addEventListener('click', closePromptModal);
        $('#autoTagBtn')?.addEventListener('click', runAutoTag);
        $('#tagSearchInput')?.addEventListener('input', e => {
            _tagSearchQ = e.target.value;
            renderSidebarFilters();
        });
        $('#smartTagBtn')?.addEventListener('click', runSmartTag);
        $('#cancelPromptBtn')?.addEventListener('click', closePromptModal);
        $('#promptForm')?.addEventListener('submit', handlePromptSubmit);
        $('#promptModal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closePromptModal();
        });
        $('#promptContent')?.addEventListener('input', updateEditorPreview);
        $('#promptContent')?.addEventListener('input', () => updatePromptScore($('#promptContent')?.value || ''));
        $('#promptContent')?.addEventListener('input', () => updateTokenCounter($('#promptContent')?.value || ''));

        $$('.editor-tab').forEach(t => {
            t.addEventListener('click', () => {
                if (t.classList.contains('premium-locked') && !state.isPremium) {
                    showPremiumModal();
                    return;
                }
                switchEditorTab(t.dataset.pane);
            });
        });

        bindColourSwatches();

        $('#closeFolderModal')?.addEventListener('click', closeFolderModal);
        $('#cancelFolderBtn')?.addEventListener('click', closeFolderModal);
        $('#folderForm')?.addEventListener('submit', handleFolderSubmit);
        $('#folderModal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeFolderModal();
        });

        $('#closeDetailPanel')?.addEventListener('click', closeDetailPanel);
        $('#panelFavBtn')?.addEventListener('click', () => state.detailId && toggleFav(state.detailId));
        $('#panelEditBtn')?.addEventListener('click', () => state.detailId && editPrompt(state.detailId));
        $('#panelDeleteBtn')?.addEventListener('click', () => state.detailId && deletePromptById(state.detailId));
        $('#panelDuplicateBtn')?.addEventListener('click', () => state.detailId && duplicatePrompt(state.detailId));
        $('#copyToClipboardBtn')?.addEventListener('click', handleCopyWithVariables);
        $('#varCopyFilledBtn')?.addEventListener('click', handleCopyWithVariables);
        $('#footerExportBtn')?.addEventListener('click', handleSinglePromptExport);
        $('#footerMdBtn')?.addEventListener('click', () => {
            if (!state.isPremium) {
                showPremiumModal();
                return;
            }
            if (!state.detailId) return;
            const p = state.prompts.find(x => x.id === state.detailId);
            if (!p) return;
            const md = `# ${p.title}\n\n${p.description ? p.description + '\n\n' : ''}${p.content}\n`;
            const blob = new Blob([md], {
                type: 'text/markdown'
            });
            triggerDownload(blob, `${p.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`);
            toast('Markdown exported', 'success');
        });
        $('#saveNotesBtn')?.addEventListener('click', saveNotesAndRating);

        $$('.detail-tab').forEach(t => {
            t.addEventListener('click', () => {
                if (t.classList.contains('premium-locked') && !state.isPremium) {
                    showPremiumModal();
                    return;
                }
                switchDetailTab(t.dataset.tab);
            });
        });

        $('#searchInput')?.addEventListener('input', (e) => {
            state.search = e.target.value;
            renderPrompts();
            updateCounts();
        });

        $('#filterFavChip')?.addEventListener('click', () => {
            const isActive = $('#filterFavChip').classList.toggle('active');
            if (isActive) setFilterPill({
                type: 'fav'
            });
            else clearFilterPill();
        });
        $('#filterRatedChip')?.addEventListener('click', () => {
            if (!state.isPremium) {
                showPremiumModal();
                return;
            }
            const isActive = $('#filterRatedChip').classList.toggle('active');
            if (isActive) setFilterPill({
                type: 'rated'
            });
            else clearFilterPill();
        });
        $('#activeFilterPill')?.addEventListener('click', clearFilterPill);

        // Filters popover. The chip badge keeps active state visible while closed.
        const filtersPop = $('#filtersPop');
        const filtersBtn = $('#filtersBtn');

        function _syncFilterCount() {
            const n = ['#filterFavChip', '#filterRatedChip']
                .filter(sel => $(sel)?.classList.contains('active')).length;
            const badge = $('#filtersCount');
            if (badge) {
                badge.textContent = n;
                badge.hidden = n === 0;
            }
            filtersBtn?.classList.toggle('active', n > 0);
        }
        window._syncFilterCount = _syncFilterCount;

        function _closeFiltersPop() {
            if (!filtersPop) return;
            filtersPop.hidden = true;
            filtersBtn?.setAttribute('aria-expanded', 'false');
        }

        filtersBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!filtersPop) return;
            const opening = filtersPop.hidden;
            filtersPop.hidden = !opening;
            filtersBtn.setAttribute('aria-expanded', String(opening));
        });
        filtersPop?.addEventListener('click', e => e.stopPropagation());
        document.addEventListener('click', _closeFiltersPop);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') _closeFiltersPop();
        });
        _syncFilterCount();

        $('#sortSelect')?.addEventListener('change', (e) => {
            state.sortBy = e.target.value;
            renderPrompts();
        });

        $$('#viewToggle button').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('#viewToggle button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.viewMode = btn.dataset.mode;
                renderPrompts();
            });
        });

        $('#groupFolderBtn')?.addEventListener('click', () => {
            state.groupByFolder = !state.groupByFolder;
            $('#groupFolderBtn').classList.toggle('active', state.groupByFolder);
            renderPrompts();
        });

        $('#bulkSelectAllCheckbox')?.addEventListener('change', (e) => {
            if (e.target.checked) bulkSelectAll();
            else bulkDeselectAll();
        });

        $('#bulkTagSelect')?.addEventListener('change', (e) => {
            const val = e.target.value;
            e.target.value = '';
            if (val === '__new__') {
                const tag = (prompt('New tag name:') || '').trim();
                if (tag) bulkAddTag(tag);
            } else if (val) {
                bulkAddTag(val);
            }
        });

        $('#bulkFolderSelect')?.addEventListener('change', (e) => {
            const val = e.target.value;
            e.target.value = '';
            if (val === '__none__') bulkMove(null);
            else if (val) bulkMove(parseInt(val, 10));
        });

        $('#bulkDeleteBtn')?.addEventListener('click', bulkDelete);
        $('#bulkClearBtn')?.addEventListener('click', bulkDeselectAll);

        // Run chain
        $('#runChainBtn')?.addEventListener('click', () => {
            const p = state.prompts.find(x => x.id === state.detailId);
            const chainIds = p?.chain_ids || [];
            if (chainIds.length) startChainRunner(chainIds);
        });

        $('#importBtn')?.addEventListener('click', openImportModal);
        $('#closeImportModal')?.addEventListener('click', closeImportModal);
        $('#cancelImportBtn')?.addEventListener('click', closeImportModal);
        $('#importForm')?.addEventListener('submit', handleImport);
        $('#importModal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeImportModal();
        });
        // Import format tabs
        $$('.import-fmt-tab').forEach(tab => {
            tab.addEventListener('click', () => _switchImportFmt(tab.dataset.fmt));
        });

        $('#exportBtn')?.addEventListener('click', openExportModal);
        $('#closeExportModal')?.addEventListener('click', closeExportModal);
        $('#exportModal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeExportModal();
        });
        $('#exportJsonBtn')?.addEventListener('click', exportJson);
        $('#exportMdBtn')?.addEventListener('click', () => exportFormat('/export/markdown', 'text/markdown', 'md'));
        $('#exportCsvBtn')?.addEventListener('click', () => exportFormat('/export/csv', 'text/csv', 'csv'));
        $('#exportBulkBtn')?.addEventListener('click', () => exportFormat('/export/bulk', 'application/zip', 'zip'));

        $('#loadVarTemplateBtn')?.addEventListener('click', openVarTemplateModal);
        $('#saveVarTemplateBtn')?.addEventListener('click', openSaveTemplateModal);
        $('#closeVarTemplateModal')?.addEventListener('click', closeVarTemplateModal);
        $('#cancelVarTemplateBtn')?.addEventListener('click', closeVarTemplateModal);
        $('#closeSaveTemplateModal')?.addEventListener('click', closeSaveTemplateModal);
        $('#cancelSaveTemplateBtn')?.addEventListener('click', closeSaveTemplateModal);
        $('#confirmSaveTemplateBtn')?.addEventListener('click', saveCurrentVarTemplate);

        $('#chainAddStepBtn')?.addEventListener('click', addChainStep);

        // Chain prompt search (in prompt editor modal)
        const chainSearch = $('#chainPromptSearch');
        if (chainSearch) {
            chainSearch.addEventListener('input', (e) => _renderChainSearchResults(e.target.value));
            chainSearch.addEventListener('focus', (e) => _renderChainSearchResults(e.target.value));
            chainSearch.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const res = $('#chainSearchResults');
                    if (res) {
                        res.innerHTML = '';
                        res.classList.remove('open');
                    }
                    chainSearch.blur();
                }
            });
        }
        // Delegate clicks inside results to add the selected prompt
        $('#chainSearchResults')?.addEventListener('click', (e) => {
            const item = e.target.closest('.chain-search-result[data-id]');
            if (item) _addChainStepById(parseInt(item.dataset.id, 10));
        });
        // Click outside closes results
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.chain-search-wrap')) {
                const res = $('#chainSearchResults');
                if (res) {
                    res.classList.remove('open');
                }
            }
        });
        $('#addUserMsgBtn')?.addEventListener('click', () => addChatTurnWithRole('user'));
        $('#addAssistantMsgBtn')?.addEventListener('click', () => addChatTurnWithRole('assistant'));

        $('#licenceBtn')?.addEventListener('click', showPremiumModal);
        $('#closePremiumModal')?.addEventListener('click', closePremiumModal);
        $('#premiumModal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closePremiumModal();
        });
        $('#activateLicenceBtn')?.addEventListener('click', activateLicence);
        $('#licenceKeyInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                activateLicence();
            }
        });

        $('#closeAnalyticsModal')?.addEventListener('click', closeAnalytics);
        $('#analyticsModal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeAnalytics();
        });

        $('#cmdBtn')?.addEventListener('click', openCmdPalette);
        $('#cmdPalette')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeCmdPalette();
        });
        $('#cmdInput')?.addEventListener('input', (e) => renderCmdResults(e.target.value));
        $('#cmdInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveCmdSelection(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveCmdSelection(-1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                activateCmdSelection();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeCmdPalette();
            }
        });
        $('#cmdResults')?.addEventListener('click', (e) => {
            const r = e.target.closest('.cmd-result');
            if (!r) return;
            const idx = Number(r.dataset.idx);
            cmdIndex = idx;
            activateCmdSelection();
        });

        document.addEventListener('keydown', (e) => {
            const tag = e.target.tagName;
            const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                const isOpen = $('#cmdPalette').classList.contains('active');
                isOpen ? closeCmdPalette() : openCmdPalette();
                return;
            }

            if (e.key === 'Escape') {
                if ($('#cmdPalette').classList.contains('active')) {
                    closeCmdPalette();
                    return;
                }
                const openModal = $$('.modal-overlay.active')[0];
                if (openModal) {
                    openModal.classList.remove('active');
                    return;
                }
                if ($('#detailPanel').classList.contains('open')) {
                    closeDetailPanel();
                    return;
                }
            }

            if (isTyping) return;

            if (e.key === '/') {
                e.preventDefault();
                $('#searchInput')?.focus();
                return;
            }
            if (e.key.toLowerCase() === 'n') {
                e.preventDefault();
                openNewPromptModal();
                return;
            }
        });

        const container = $('#promptsContainer');
        if (container) {
            container.innerHTML = `<div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div>`;
        }
    }



    

    function handleSurpriseMe() {
        let pool = state.prompts ? [...state.prompts] : [];
        if (!pool.length) {
            toast('No prompts in your library yet', 'info');
            return;
        }
        // Prefer the currently filtered/visible set if it's smaller
        const filtered = pool.filter(p => {
            if (state.filterPill) {
                const fp = state.filterPill;
                if (fp.type === 'fav' && !p.is_favorite) return false;
                if (fp.type === 'rated' && !(p.rating > 0)) return false;
                if (fp.type === 'category' && !(p.categories || []).includes(fp.value)) return false;
                if (fp.type === 'tag' && !(p.tags || []).includes(fp.value)) return false;
            }
            if (state.search) {
                const q = state.search.trim().toLowerCase();
                if (!(p.title || '').toLowerCase().includes(q) &&
                    !(p.description || '').toLowerCase().includes(q)) return false;
            }
            if (state.folderFilter) {
                if (fp?.folder_id !== state.folderFilter) return false;
            }
            return true;
        });

        const source = filtered.length ? filtered : pool;
        // Avoid showing the same prompt twice in a row
        const others = source.filter(p => p.id !== state.detailId);
        const chosen = (others.length ? others : source)[Math.floor(Math.random() * (others.length || source.length))];
        if (!chosen) return;

        // Switch to library view and open the detail panel
        if (state.view !== 'library') {
            state.view = 'library';
            $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
            const titleEl = $('#viewTitle');
            if (titleEl) titleEl.textContent = 'Library';
        }
        openDetail(chosen.id);

        // Brief flash on the card so the user can spot it
        setTimeout(() => {
            const card = $(`.prompt-card[data-id="${chosen.id}"]`);
            if (card) {
                card.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
                card.classList.add('surprise-flash');
                setTimeout(() => card.classList.remove('surprise-flash'), 800);
            }
        }, 120);
    }
    

    function updatePromptScore(text) {
        const container = $('#scoreDimensions');
        const totalEl = $('#scoreTotalNum');
        const ringEl = $('#scoreRingFill');
        const taglineEl = $('#scoreTagline');
        if (!container) return;

        if (!text || text.length < 10) {
            if (totalEl) totalEl.textContent = '—';
            if (ringEl) ringEl.style.strokeDashoffset = '113';
            if (taglineEl) taglineEl.textContent = 'Write a prompt to see your score.';
            container.innerHTML = '';
            return;
        }

        const results = _SCORE_DIMS.map(d => ({
            ...d,
            val: d.score(text)
        }));
        const total = Math.round(results.reduce((sum, r) => sum + r.val, 0) / results.length);

        // Update ring
        if (ringEl) {
            const offset = 113 - (113 * total / 100);
            ringEl.style.strokeDashoffset = offset;
            ringEl.style.stroke = total >= 70 ? 'var(--success)' : total >= 45 ? 'var(--warn)' : 'var(--danger)';
        }
        if (totalEl) totalEl.textContent = total;
        if (taglineEl) {
            taglineEl.textContent = total >= 80 ? 'Excellent prompt structure.' :
                total >= 60 ? 'Good — a few improvements available.' :
                total >= 40 ? 'Room to improve — check the tips below.' :
                'Needs work — the tips below will help.';
        }

        container.innerHTML = results.map(r => {
            const cls = r.val >= 70 ? 'good' : r.val >= 40 ? 'ok' : 'poor';
            const tip = r.tip(r.val);
            return '<div class="score-dim">' +
                '<span class="score-dim-label">' + r.label + '</span>' +
                '<div class="score-bar-wrap"><div class="score-bar ' + cls + '" style="width:' + r.val + '%"></div></div>' +
                '<span class="score-dim-val">' + r.val + '</span>' +
                (r.val < 70 ? '<span class="score-dim-tip">' + tip + '</span>' : '') +
                '</div>';
        }).join('');
    }


    

    function _closeTourDetail() {
        const dp = document.getElementById('detailPanel');
        if (dp) {
            dp.classList.remove('open');
            dp.setAttribute('aria-hidden', 'true');
        }
        document.querySelectorAll('.prompt-card.active').forEach(function(el) {
            el.classList.remove('active');
        });
    }

    

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
