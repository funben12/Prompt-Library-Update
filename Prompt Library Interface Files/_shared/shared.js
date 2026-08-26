/* Global JS: helpers and functions used by 5+ views (or none specifically).
   Extracted from static/app.js. */

    const escapeHtml = (text) => {
        if (text == null) return '';
        const d = document.createElement('div');
        d.textContent = String(text);
        return d.innerHTML;
    };

    /* Tagged template helper for inline HTML construction with auto-escaping
       of ${...} interpolations. Use html`...` for safety. */
    const html = (strings, ...values) => {
        let out = '';
        strings.forEach((s, i) => {
            out += s;
            if (i < values.length) {
                const v = values[i];
                out += (v && v.__raw) ? v.value : escapeHtml(v);
            }
        });
        return out;
    };

    const raw = (value) => ({
        __raw: true,
        value: String(value)
    });

    function detectVariables(content) {
        if (!content) return [];
        const found = new Set();
        const patterns = [
            /\[\[(.+?)\]\]/g,
            /\{\{(.+?)\}\}/g,
            /\(\((.+?)\)\)/g,
        ];
        for (const re of patterns) {
            let m;
            re.lastIndex = 0;
            while ((m = re.exec(content)) !== null) {
                const v = m[1].trim();
                if (v && v.length < 100) found.add(v);
            }
        }
        return Array.from(found).sort((a, b) => a.localeCompare(b));
    }

    

    function replaceVariables(content, varMap) {
        let out = content;
        for (const [name, value] of Object.entries(varMap)) {
            const ev = escapeRegex(name);
            out = out
                .replace(new RegExp(`\\[\\[${ev}\\]\\]`, 'g'), value)
                .replace(new RegExp(`\\{\\{${ev}\\}\\}`, 'g'), value)
                .replace(new RegExp(`\\(\\(${ev}\\)\\)`, 'g'), value);
        }
        return out;
    }

    

    async function fetchRoleObj(roleId) {
        if (!roleId) return null;
        try {
            const r = await api(`/roles/${roleId}`);
            return (r && r.id) ? r : null;
        } catch {
            return null;
        }
    }

    

    function renderChips(content) {
        let out = escapeHtml(content);
        const vars = detectVariables(content);
        for (const v of vars) {
            const ev = escapeRegex(v);
            const chip = `<span class="var-chip">${escapeHtml(v)}</span>`;
            out = out
                .replace(new RegExp(`\\[\\[${ev}\\]\\]`, 'g'), chip)
                .replace(new RegExp(`\\{\\{${ev}\\}\\}`, 'g'), chip)
                .replace(new RegExp(`\\(\\(${ev}\\)\\)`, 'g'), chip);
        }
        return out;
    }

    

    function relativeTime(iso) {
        if (!iso) return '';
        const diff = Date.now() - new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'just now';
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        const d = Math.floor(h / 24);
        if (d < 7) return `${d}d ago`;
        return new Date(iso).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    

    function toTitleCase(str) {
        const words = str.trim().split(/\s+/);
        return words.map((word, i) => {
            const lower = word.toLowerCase();
            if (i !== 0 && i !== words.length - 1 && TITLE_CASE_MINOR_WORDS.has(lower)) {
                return lower;
            }
            return lower.replace(/^[a-z]/, c => c.toUpperCase());
        }).join(' ');
    }
    

    async function copyToClipboard(text) {
        if (!text || !text.trim()) {
            toast('Nothing to copy', 'warning');
            return false;
        }
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            return true;
        } catch (err) {
            console.error('clipboard:', err);
            toast('Could not copy to clipboard', 'error');
            return false;
        }
    }
    

    function createTagInput(containerId, knownValues = [], isCat = false) {
        const wrap = document.getElementById(containerId);
        if (!wrap) return;

        const instance = {
            tags: [],
            knownValues,
            isCat,
            dropdownIdx: -1,
            dropdownItems: [],
        };
        tagInputInstances[containerId] = instance;

        // Build inner DOM
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'tag-input-field';
        input.placeholder = wrap.dataset.placeholder || 'Add tag…';
        wrap.appendChild(input);

        const dropdown = document.createElement('div');
        dropdown.className = 'tag-dropdown';
        dropdown.style.display = 'none';
        wrap.appendChild(dropdown);

        function normalise(s) {
            return s.trim().toLowerCase();
        }

        function addTag(raw) {
            const text = raw.trim();
            if (!text) return;
            const norm = normalise(text);
            if (instance.tags.some(t => normalise(t) === norm)) return; // deduplicate
            instance.tags.push(text);
            renderChips();
            input.value = '';
            hideDropdown();
        }

        function removeTag(idx) {
            instance.tags.splice(idx, 1);
            renderChips();
        }

        function renderChips() {
            // Remove all existing chip elements
            wrap.querySelectorAll('.tag-chip-item').forEach(el => el.remove());
            // Insert chips before the input
            instance.tags.forEach((tag, i) => {
                const chip = document.createElement('span');
                chip.className = `tag-chip-item${isCat ? ' is-cat' : ''}`;
                chip.innerHTML = `${escapeHtml(tag)}<button type="button" class="tag-chip-x" title="Remove"><span class="material-symbols-outlined">close</span></button>`;
                chip.querySelector('.tag-chip-x').addEventListener('click', () => removeTag(i));
                wrap.insertBefore(chip, input);
            });
        }

        function showDropdown(query) {
            const q = query.trim().toLowerCase();
            const existing = new Set(instance.tags.map(t => t.toLowerCase()));
            let matches = instance.knownValues
                .filter(v => !existing.has(v.toLowerCase()) && (!q || v.toLowerCase().includes(q)));
            instance.dropdownItems = matches;
            instance.dropdownIdx = -1;

            if (!matches.length && !q) {
                hideDropdown();
                return;
            }

            let html = matches.slice(0, 12).map((v, i) => {
                const count = state.filters[isCat ? 'categories' : 'tags']
                    .find(x => x.value === v)?.count || '';
                return `<div class="tag-dropdown-item" data-idx="${i}">
        <span>${escapeHtml(v)}</span>
        ${count ? `<span class="td-count">${count}</span>` : ''}
      </div>`;
            }).join('');

            if (q && !matches.some(v => v.toLowerCase() === q)) {
                html += `<div class="tag-dropdown-item tag-dropdown-create" data-create="1">
        Create "<strong>${escapeHtml(q)}</strong>"
      </div>`;
            }

            dropdown.innerHTML = html;
            dropdown.style.display = html ? 'block' : 'none';
        }

        function hideDropdown() {
            dropdown.style.display = 'none';
            instance.dropdownIdx = -1;
            instance.dropdownItems = [];
        }

        function moveDrop(dir) {
            const items = dropdown.querySelectorAll('.tag-dropdown-item');
            if (!items.length) return;
            instance.dropdownIdx = Math.max(-1, Math.min(items.length - 1, instance.dropdownIdx + dir));
            items.forEach((el, i) => el.classList.toggle('kbd-active', i === instance.dropdownIdx));
        }

        function activateDrop() {
            const items = dropdown.querySelectorAll('.tag-dropdown-item');
            const active = items[instance.dropdownIdx];
            if (active) {
                if (active.dataset.create) {
                    addTag(input.value.trim());
                } else {
                    addTag(instance.dropdownItems[instance.dropdownIdx]);
                }
            } else if (input.value.trim()) {
                addTag(input.value.trim());
            }
        }

        input.addEventListener('input', () => showDropdown(input.value));
        input.addEventListener('focus', () => showDropdown(input.value));
        input.addEventListener('blur', () => setTimeout(hideDropdown, 160));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                if (dropdown.style.display !== 'none' && instance.dropdownIdx >= 0) {
                    activateDrop();
                } else {
                    addTag(input.value.trim());
                }
            } else if (e.key === 'Backspace' && !input.value && instance.tags.length) {
                e.preventDefault();
                removeTag(instance.tags.length - 1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveDrop(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveDrop(-1);
            } else if (e.key === 'Escape') {
                hideDropdown();
            }
        });

        dropdown.addEventListener('mousedown', (e) => {
            const item = e.target.closest('.tag-dropdown-item');
            if (!item) return;
            e.preventDefault();
            if (item.dataset.create) {
                addTag(input.value.trim());
            } else {
                const idx = parseInt(item.dataset.idx, 10);
                addTag(instance.dropdownItems[idx]);
            }
        });

        wrap.addEventListener('click', (e) => {
            if (!e.target.closest('.tag-chip-item')) input.focus();
        });

        instance.addTag = addTag;
        instance.setTags = (arr) => {
            instance.tags = [];
            wrap.querySelectorAll('.tag-chip-item').forEach(el => el.remove());
            (arr || []).forEach(t => addTag(t));
        };
        instance.getTags = () => instance.tags.slice();
        instance.reset = () => {
            instance.tags = [];
            wrap.querySelectorAll('.tag-chip-item').forEach(el => el.remove());
            input.value = '';
            hideDropdown();
        };
        instance.updateKnown = (vals) => {
            instance.knownValues = vals;
        };
    }

    

    function setTagInputValues(containerId, arr) {
        tagInputInstances[containerId]?.setTags(arr);
    }

    

    function updateTagInputKnown(containerId, vals) {
        tagInputInstances[containerId]?.updateKnown(vals);
    }

    

    async function loadAll() {
        try {
            await Promise.all([loadFolders(), loadPrompts(), loadFilterOptions()]);
            // Re-render folders now that prompts are loaded so counts are correct.
            // (loadFolders fires renderFolders() before state.prompts is populated.)
            renderFolders();
        } catch (err) {
            console.error('loadAll:', err);
        }
    }

    

    function getFilteredPrompts() {
        let list = state.prompts.slice();

        // View scope
        if (state.view === 'favorites') {
            list = list.filter(p => p.is_favorite);
        } else if (typeof state.view === 'number') {
            list = list.filter(p => p.folder_id === state.view);
        }

        // Filter pill
        if (state.filterPill) {
            const fp = state.filterPill;
            if (fp.type === 'fav') list = list.filter(p => p.is_favorite);
            else if (fp.type === 'rated') list = list.filter(p => (p.rating || 0) > 0);
            else if (fp.type === 'category') list = list.filter(p => (p.categories || []).includes(fp.value));
            else if (fp.type === 'tag') list = list.filter(p => (p.tags || []).includes(fp.value));
        }

        // Search
        const q = state.search.trim().toLowerCase();
        if (q) {
            list = list.filter(p =>
                (p.title || '').toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q) ||
                (p.content || '').toLowerCase().includes(q) ||
                (p.categories || []).some(c => c.toLowerCase().includes(q)) ||
                (p.tags || []).some(t => t.toLowerCase().includes(q))
            );
        }

        // Sort
        const cmp = {
            updated: (a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''),
            created: (a, b) => (b.created_at || '').localeCompare(a.created_at || ''),
            created_asc: (a, b) => (a.created_at || '').localeCompare(b.created_at || ''),
            title: (a, b) => (a.title || '').localeCompare(b.title || ''),
            title_desc: (a, b) => (b.title || '').localeCompare(a.title || ''),
            used: (a, b) => (b.use_count || 0) - (a.use_count || 0),
            used_asc: (a, b) => (a.use_count || 0) - (b.use_count || 0),
            rating: (a, b) => (b.rating || 0) - (a.rating || 0),
            favorites: (a, b) => (b.is_favorite || 0) - (a.is_favorite || 0),
            colour: (a, b) => (a.colour_label || 'zzz').localeCompare(b.colour_label || 'zzz'),
        } [state.sortBy] || ((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
        list.sort(cmp);

        return list;
    }

    

        const setText = (id, val) => {
            const el = $('#' + id);
            if (el) el.textContent = val;
        };

    function bulkSelectAll() {
        getFilteredPrompts().forEach(p => _bulkSelection.add(p.id));
        renderPrompts();
        renderBulkToolbar();
    }

    

    async function bulkMove(folderId) {
        if (!_bulkSelection.size) return;
        try {
            const result = await api('/prompts/bulk', {
                method: 'PATCH',
                body: { ids: Array.from(_bulkSelection), action: 'move_folder', folder_id: folderId }
            });
            if (result.failed > 0) toast(result.success + ' moved, ' + result.failed + ' failed', 'warning');
            else toast(result.success + ' prompt' + (result.success !== 1 ? 's' : '') + ' moved', 'success');
            bulkDeselectAll();
            await loadPrompts();
        } catch {
            toast('Bulk move failed', 'error');
        }
    }

    

    function renderEmptyState() {
        const isSearching = !!state.search.trim();
        if (isSearching) {
            return `
      <div class="empty">
        <div class="empty-eyebrow">No matches</div>
        <h2>Nothing found for &ldquo;<em>${escapeHtml(state.search)}</em>&rdquo;</h2>
        <p>Try a different word, or clear the search to see your full library.</p>
      </div>`;
        }
        if (state.view === 'favorites') {
            return `
      <div class="empty">
        <div class="empty-eyebrow">Favourites</div>
        <h2>You haven&rsquo;t starred anything <em>yet</em></h2>
        <p>Click the star icon on any prompt to keep your most-used ones close to hand.</p>
      </div>`;
        }
        return `
    <div class="empty">
      <div class="empty-shell">
        <div>
          <div class="empty-eyebrow">Library</div>
          <h2>A clean page, ready for your first <em>prompt</em>.</h2>
          <p>Save the prompts you actually use - the ones you keep rewriting in chat boxes - and they&rsquo;ll be one click away forever.</p>
          <div class="empty-actions">
            <button class="btn btn-accent" onclick="window.PL_openNewPromptModal()">
              <span class="material-symbols-outlined">add</span>
              Write your first prompt
            </button>
            <button class="btn" onclick="window.PL_loadStarters()">
              <span class="material-symbols-outlined">auto_awesome</span>
              Load starter set
            </button>
          </div>
        </div>
        <div class="empty-proof">
          <div class="empty-proof-item"><span class="material-symbols-outlined">edit_note</span><span>Draft, refine, and keep the prompts that become part of your working practice.</span></div>
          <div class="empty-proof-item"><span class="material-symbols-outlined">data_object</span><span>Use variables such as <code>[[client]]</code> so each prompt is ready to fill and copy.</span></div>
          <div class="empty-proof-item"><span class="material-symbols-outlined">archive</span><span>Organise by folder, tag, colour, rating, and usage without leaving your local machine.</span></div>
        </div>
      </div>
    </div>`;
    }

    

    function renderTagManager() {
        const list = $('#tagManagerList');
        if (!list) return;
        const all = [...(state.filters.tags || [])].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
        if (!all.length) {
            list.innerHTML = '<p class="tag-manager-empty">No tags yet -- tags you add to prompts show up here.</p>';
            return;
        }
        list.innerHTML = all.map(t =>
            '<div class="tag-manager-row" data-tag="' + escapeHtml(t.value) + '">' +
            '<span class="material-symbols-outlined tm-icon">tag</span>' +
            '<span class="tm-name">#' + escapeHtml(t.value) + '</span>' +
            '<span class="tm-count">' + t.count + '</span>' +
            '<button class="folder-mini-btn" data-tm-rename title="Rename or merge"><span class="material-symbols-outlined">edit</span></button>' +
            '<button class="folder-mini-btn danger" data-tm-delete title="Delete everywhere"><span class="material-symbols-outlined">delete</span></button>' +
            '</div>'
        ).join('');
    }

    

    // New shape:  { type: 'checkbox', default: 'Yes', options: ['Yes','No'] }
    // Star Rating (type: 'rating') needs no migration -- same numeric 1-5 value, only the widget changed.
    function _migrateLegacyVarMeta(meta) {
        const out = {};
        for (const v in meta) {
            const m = meta[v] || {};
            if (m.type === 'checkbox' && (!m.options || !m.options.length)) {
                const wasChecked = m.default === 'true' || m.default === 'Yes';
                out[v] = {
                    ...m,
                    options: ['Yes', 'No'],
                    default: wasChecked ? 'Yes' : ''
                };
            } else {
                out[v] = m;
            }
        }
        return out;
    }

    

    window._PL_addTagKey = function(evt, input) {
        if (evt.key !== 'Enter') return;
        evt.preventDefault();
        const val = input.value.trim();
        if (!val) return;
        const field = input.closest('.var-tags-field');
        const hidden = field.querySelector('.var-tags-hidden');
        const current = hidden.value ? hidden.value.split(',').map(s => s.trim()).filter(Boolean) : [];
        if (!current.includes(val)) current.push(val);
        hidden.value = current.join(', ');
        input.value = '';
        const chipsWrap = field.querySelector('.var-tags-chips');
        const chip = document.createElement('span');
        chip.className = 'chip active var-tag-chip';
        chip.innerHTML = escapeHtml(val) + '<span class="material-symbols-outlined" style="font-size:13px;cursor:pointer;" onclick="window._PL_removeTag(this)">close</span>';
        chipsWrap.appendChild(chip);
        hidden.dispatchEvent(new Event('input', {
            bubbles: true
        }));
    };

    window._PL_removeTag = function(closeIcon) {
        const chip = closeIcon.closest('.var-tag-chip');
        const field = chip.closest('.var-tags-field');
        const hidden = field.querySelector('.var-tags-hidden');
        const removedText = chip.textContent.trim();
        const current = hidden.value ? hidden.value.split(',').map(s => s.trim()).filter(Boolean) : [];
        const next = current.filter(t => t !== removedText);
        hidden.value = next.join(', ');
        chip.remove();
        hidden.dispatchEvent(new Event('input', {
            bubbles: true
        }));
    };

    window._PL_selectToggle = function(btn) {
        const group = btn.closest('.var-toggle-group');
        group.querySelectorAll('.var-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const hidden = group.querySelector('.var-toggle-hidden');
        hidden.value = btn.dataset.value;
        hidden.dispatchEvent(new Event('input', {
            bubbles: true
        }));
    };

    window._PL_selectStar = function(star) {
        const wrap = star.closest('.var-star-rating');
        const val = parseInt(star.dataset.value, 10);
        const hidden = wrap.querySelector('.var-star-hidden');
        hidden.value = String(val);
        wrap.querySelectorAll('.var-star').forEach(s => {
            const n = parseInt(s.dataset.value, 10);
            const filled = n <= val;
            s.textContent = filled ? 'star' : 'star_outline';
            s.classList.toggle('filled', filled);
            s.style.color = filled ? 'var(--accent)' : 'var(--ink-3)';
        });
        hidden.dispatchEvent(new Event('input', {
            bubbles: true
        }));
    };

    function switchDetailTab(name) {
        $$('.detail-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
        $$('.detail-tab-pane').forEach(p => p.classList.toggle('active', p.id === `tab-${name}`));
    }

    


    /* ── Start / init ─────────────────────────────────────────── */
    async function startChainRunner(chainIds) {
        _chainRunnerState = {
            ids: chainIds,
            step: 0,
            outputs: {},
            varMaps: {},
            roles: {}
        };
        await Promise.all(chainIds.map(async id => {
            const p = state.prompts.find(x => x.id === id);
            if (p && p.role_id) {
                try {
                    const res = await fetch('/api/roles/' + p.role_id);
                    const data = await res.json();
                    if (data && data.id) _chainRunnerState.roles[id] = data;
                } catch (_) {}
            }
        }));
        renderChainRunner();
        // Wire variable-save on any input change after render
        _chainWireInputs();
    }

    


    /* ── Jump back to a previous phase for editing ─────────────── */
    window.PL_goToPhase = function(phaseIdx) {
        _chainRunnerState.step = phaseIdx;
        renderChainRunner();
    };


    /* ── Export full chain — variables substituted, outputs chained ── */
    window.PL_exportFullChain = async function() {
        var st = _chainRunnerState;
        var divider = '\n\n' + '─'.repeat(50) + '\n\n';
        var parts = st.ids.map(function(id, i) {
            var p = state.prompts.find(function(x) {
                return x.id === id;
            });
            var title = p ? p.title : ('Prompt #' + id);
            var text = _chainGetFilled(i); // variables substituted
            var role = st.roles[id];
            text = prependRole(text, role, false);
            var section = '=== PHASE ' + (i + 1) + ': ' + title.toUpperCase() + ' ===\n\n' + text;
            if (st.outputs[i]) section += '\n\n--- AI Response (Phase ' + (i + 1) + ') ---\n' + st.outputs[i];
            return section;
        });
        var ok = await copyToClipboard(parts.join(divider));
        if (ok) toast('Full chain copied — variables filled, responses included', 'success');
    };


    /* Backward-compat aliases */
    window.PL_nextChainStep = function() {};

    window.PL_showOutputCapture = function() {};

    window.PL_captureAndNext = function() {};

    window.PL_skipCapture = function() {};

    function renderStars(root, value, onChange) {
        if (!root) return;
        root.innerHTML = '';
        for (let i = 1; i <= 5; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = i <= value ? 'on' : '';
            btn.innerHTML = '<span class="material-symbols-outlined">star</span>';
            btn.addEventListener('click', () => {
                const newVal = i === value ? 0 : i;
                renderStars(root, newVal, onChange);
                if (onChange) onChange(newVal);
            });
            root.appendChild(btn);
        }
    }

    

    async function toggleFav(id) {
        try {
            await api(`/prompts/${id}/favorite`, {
                method: 'POST'
            });
            const p = state.prompts.find(x => x.id === id);
            if (p) p.is_favorite = p.is_favorite ? 0 : 1;
            renderPrompts();
            updateCounts();
            if (state.detailId === id) {
                const fresh = await api(`/prompts/${id}`);
                renderDetailPanel(fresh);
            }
        } catch (err) {
            toast('Could not update favourite', 'error');
        }
    }

    

    function handleSinglePromptExport() {
        if (!state.detailId) return;
        const p = state.prompts.find(x => x.id === state.detailId);
        if (!p) return;
        const data = [{
            title: p.title,
            description: p.description,
            content: p.content,
            categories: p.categories,
            tags: p.tags,
            colour_label: p.colour_label,
            rating: p.rating,
            notes: p.notes,
            variable_meta: p.variable_meta,
        }];
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${p.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Prompt exported', 'success');
    }

    

    function openNewPromptModal() {
        $('#modalTitle').textContent = 'New prompt';
        $('#submitBtnText').textContent = 'Create prompt';
        $('#promptId').value = '';
        $('#promptForm').reset();
        $('#promptColour').value = '';
        $('#promptRating').value = '0';
        $('#promptChainIds').value = '[]';
        $('#promptChatTurns').value = '[]';

        // Reset colour swatches
        $$('.swatch').forEach(s => s.classList.toggle('active', s.dataset.colour === ''));

        // Reset tag chip inputs
        resetCategoryChips();
        // Collapse chip grid on modal open
        $('#categoryChipsWrap')?.classList.remove('expanded');
        const _ct = $('#catChipsToggle');
        const _cl = $('#catChipsToggleLabel');
        if (_ct) _ct.classList.remove('open');
        if (_cl) _cl.textContent = 'Show all categories';
        resetTagInput('tagsTagInput');

        // Reset varsbadge + previews
        $('#varsCountBadge').hidden = true;
        $('#editorPreview').innerHTML = '<span class="hint">Live preview...</span>';
        $('#varMetaList').innerHTML = '<p style="font-size: var(--fs-sm); color: var(--ink-3);">No variables yet. Use <code>[[name]]</code> in your prompt content.</p>';
        $('#chainList').innerHTML = '<p style="font-size: var(--fs-sm); color: var(--ink-3);">No steps yet.</p>';
        $('#chatTurnsList').innerHTML = '';
        renderStars($('#editorStars'), 0, (val) => {
            $('#promptRating').value = val;
        });

        // Reset advanced tab to variables, and prompt-block to system prompt
        switchEditorTab('variables');
        switchPromptBlockTab('system');

        // Clear chat turns display
        renderChatTurns([]);

        updateFolderDropdown();
        updateRoleDropdown(null);
        updateChainSelect(null);

        updateTokenCounter('');
        $('#promptModal').classList.add('active');
        refreshModalCategories(); // sync chips with DB categories
        setTimeout(() => $('#promptTitle').focus(), 50);
    }
    

    function openNewPromptInFolder(folderId) {
        openNewPromptModal();
        $('#promptFolder').value = folderId;
    }
    

    async function handlePromptSubmit(e) {
        e.preventDefault();
        const id = $('#promptId').value;
        // Free tier prompt limit
        if (!id && !state.isPremium && state.prompts.length >= FREE_LIMITS.prompts) {
            toast(`Free plan limit: ${FREE_LIMITS.prompts} prompts. Upgrade to Pro for unlimited.`, 'warning');
            showPremiumModal();
            return;
        }
        const data = {
            title: (() => { const t = $('#promptTitle').value.trim(); return isTitleCase(t) ? t : toTitleCase(t); })(),
            description: $('#promptDesc').value.trim(),
            content: $('#promptContent').value.trim(),
            categories: getChipCategories().join(','),
            tags: getTagInputValues('tagsTagInput').join(','),
            folder_id: $('#promptFolder').value || null,
            role_id: parseInt($('#promptRoleId').value || '0', 10) || null,
            colour_label: $('#promptColour').value || '',
            rating: parseInt($('#promptRating').value || '0', 10) || 0,
            notes: $('#promptNotes').value || '',
            variable_meta: collectVarMeta(),
            chain_ids: JSON.parse($('#promptChainIds').value || '[]'),
            chat_turns: JSON.parse($('#promptChatTurns').value || '[]'),
        };
        if (!data.title || !data.content) {
            toast('Title and content are required', 'warning');
            return;
        }
        // Free tier tag / category limits
        if (!state.isPremium) {
            const tagArr = data.tags ? data.tags.split(',').filter(Boolean) : [];
            const catArr = data.categories ? data.categories.split(',').filter(Boolean) : [];
            if (tagArr.length > FREE_LIMITS.tags) {
                toast(`Free plan: max ${FREE_LIMITS.tags} tags per prompt. Remove ${tagArr.length - FREE_LIMITS.tags} to save, or upgrade to Pro.`, 'warning');
                return;
            }
            if (catArr.length > FREE_LIMITS.categories) {
                toast(`Free plan: max ${FREE_LIMITS.categories} categories per prompt. Upgrade to Pro for unlimited.`, 'warning');
                return;
            }
        }
        try {
            const url = id ? `/prompts/${id}` : '/prompts';
            const method = id ? 'PUT' : 'POST';
            const result = await api(url, {
                method,
                body: data
            });
            closePromptModal();
            await loadPrompts();
            await loadFilterOptions();
            toast(id ? 'Prompt updated' : 'Prompt created', 'success');
            const targetId = id ? Number(id) : (result && result.id);
            if (targetId) openDetail(targetId);
        } catch (err) {
            console.error('save prompt:', err);
            toast('Could not save prompt', 'error');
        }
    }

    

    function bindColourSwatches() {
        const picker = $('#editorColourPicker');
        if (!picker) return;
        picker.addEventListener('click', (e) => {
            const sw = e.target.closest('.swatch');
            if (!sw) return;
            $$('.swatch', picker).forEach(s => s.classList.remove('active'));
            sw.classList.add('active');
            $('#promptColour').value = sw.dataset.colour;
        });
    }

    

    function renderVarMetaList(existing) {
        const content = $('#promptContent').value || '';
        const vars = detectVariables(content);
        const list = $('#varMetaList');
        if (!vars.length) {
            list.innerHTML = '<p style="font-size: var(--fs-sm); color: var(--ink-3);">No variables yet. Use <code>[[name]]</code> in your prompt content.</p>';
            return;
        }
        const OPTIONS_TYPES = ['dropdown', 'checkbox', 'togglegroup'];
        const meta = existing || collectVarMeta();
        list.innerHTML = vars.map(v => {
            const m = meta[v] || {};
            const type = m.type || 'text';
            const def = m.default || '';
            const size = m.size || 'medium';
            const visible = m.visible !== false;
            const opts = (m.options || []).join(', ');
            const needsOptions = OPTIONS_TYPES.includes(type);
            return `
      <div class="var-meta-row" data-var="${escapeAttr(v)}">
        <div class="var-meta-head">
          <span class="var-meta-name">${escapeHtml(v)}</span>
          <label class="visibility-toggle">
            <input type="checkbox" data-field="visible" ${visible ? 'checked' : ''} />
            <span class="material-symbols-outlined" style="font-size: 14px;">visibility</span>
            Show when filling
          </label>
        </div>
        <div class="var-meta-fields">
          <select data-field="type" onchange="window.PL_onVarTypeChange(this)">
            <optgroup label="Text">
            <option value="text"      ${type === 'text'      ? 'selected' : ''}>Text</option>
            <option value="paragraph" ${type === 'paragraph' ? 'selected' : ''}>Paragraph</option>
            <option value="markdown"  ${type === 'markdown'  ? 'selected' : ''}>Markdown</option>
            <option value="code"      ${type === 'code'      ? 'selected' : ''}>Code</option>
            <option value="password"  ${type === 'password'  ? 'selected' : ''}>Password</option>
            </optgroup>
            <optgroup label="Contact">
            <option value="email"     ${type === 'email'     ? 'selected' : ''}>Email</option>
            <option value="url"       ${type === 'url'       ? 'selected' : ''}>URL</option>
            <option value="phone"     ${type === 'phone'     ? 'selected' : ''}>Phone</option>
            </optgroup>
            <optgroup label="Input">
            <option value="number"     ${type === 'number'     ? 'selected' : ''}>Number</option>
            <option value="date"       ${type === 'date'       ? 'selected' : ''}>Date</option>
            <option value="time"       ${type === 'time'       ? 'selected' : ''}>Time</option>
            <option value="color"      ${type === 'color'      ? 'selected' : ''}>Color</option>
            <option value="currency"   ${type === 'currency'   ? 'selected' : ''}>Currency</option>
            <option value="percentage" ${type === 'percentage' ? 'selected' : ''}>Percentage</option>
            <option value="filepath"   ${type === 'filepath'   ? 'selected' : ''}>File Path</option>
            <option value="imageurl"   ${type === 'imageurl'   ? 'selected' : ''}>Image URL</option>
            </optgroup>
            <optgroup label="Choice">
            <option value="dropdown"    ${type === 'dropdown'    ? 'selected' : ''}>Dropdown</option>
            <option value="checkbox"    ${type === 'checkbox'    ? 'selected' : ''}>Checkbox List</option>
            <option value="tags"        ${type === 'tags'        ? 'selected' : ''}>Tags</option>
            <option value="togglegroup" ${type === 'togglegroup' ? 'selected' : ''}>Toggle Group</option>
            <option value="range"       ${type === 'range'       ? 'selected' : ''}>Range</option>
            </optgroup>
            <optgroup label="Advanced">
            <option value="slider"    ${type === 'slider'    ? 'selected' : ''}>Slider</option>
            <option value="rating"    ${type === 'rating'    ? 'selected' : ''}>Star Rating</option>
            </optgroup>
          </select>
          <input type="text" data-field="default" placeholder="Default value (optional)" value="${escapeAttr(def)}" />
        </div>
        <div class="paragraph-size" style="display: ${type === 'paragraph' ? 'flex' : 'none'}; gap: 8px; align-items: center; margin-top: 4px;">
          <span style="font-size: 11px; color: var(--ink-3);">Size:</span>
          <select data-field="size" style="font-size: 12px; padding: 4px 8px;">
            <option value="short"  ${size === 'short'  ? 'selected' : ''}>Short (3 rows)</option>
            <option value="medium" ${size === 'medium' ? 'selected' : ''}>Medium (6 rows)</option>
            <option value="tall"   ${size === 'tall'   ? 'selected' : ''}>Tall (10 rows)</option>
          </select>
        </div>
        <div class="dropdown-options" style="display: ${needsOptions ? 'block' : 'none'};">
          <textarea data-field="options" placeholder="Comma-separated options" rows="2"
                    style="width: 100%; padding: 6px 10px; font-size: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 4px; color: var(--ink); margin-top: 4px;">${escapeHtml(opts)}</textarea>
        </div>
      </div>`;
        }).join('');
    }
    

    function collectVarMeta() {
        const meta = {};
        $$('#varMetaList .var-meta-row').forEach(row => {
            const v = row.dataset.var;
            const type = row.querySelector('[data-field="type"]')?.value || 'text';
            const def = row.querySelector('[data-field="default"]')?.value || '';
            const visible = row.querySelector('[data-field="visible"]')?.checked !== false;
            const optsEl = row.querySelector('[data-field="options"]');
            const options = optsEl?.value ?
                optsEl.value.split(',').map(o => o.trim()).filter(Boolean) : [];
            const sizeEl = row.querySelector('[data-field="size"]');
            const entry = {
                type,
                default: def,
                visible,
                options
            };
            if (type === 'paragraph' && sizeEl) entry.size = sizeEl.value;
            meta[v] = entry;
        });
        return meta;
    }

    

    function _addChainStepById(id) {
        const ids = JSON.parse($('#promptChainIds').value || '[]');
        if (ids.includes(id)) {
            toast('Already in chain', 'info');
            return;
        }
        ids.push(id);
        $('#promptChainIds').value = JSON.stringify(ids);
        renderChainEditor(ids);
        const inp = $('#chainPromptSearch');
        const res = $('#chainSearchResults');
        if (inp) inp.value = '';
        if (res) {
            res.innerHTML = '';
            res.classList.remove('open');
        }
    }

    

    window.PL_removeChain = function(idx) {
        const ids = JSON.parse($('#promptChainIds').value || '[]');
        ids.splice(idx, 1);
        $('#promptChainIds').value = JSON.stringify(ids);
        renderChainEditor(ids);
    };

    function setChatTurns(turns) {
        $('#promptChatTurns').value = JSON.stringify(turns);
        renderChatTurns(turns);
    }
    

    window.PL_removeChatTurn = function(i) {
        const turns = getChatTurns();
        turns.splice(i, 1);
        setChatTurns(turns);
    };

    function addChatTurn() {
        const turns = getChatTurns();
        const role = turns.length === 0 ? 'system' : 'user';
        turns.push({
            role,
            content: ''
        });
        setChatTurns(turns);
    }

    

    function openNewFolderModal() {
        $('#folderModalTitle').textContent = 'New folder';
        $('#folderSubmitText').textContent = 'Create folder';
        $('#folderId').value = '';
        $('#folderForm').reset();
        $('#folderModal').classList.add('active');
        setTimeout(() => $('#folderName').focus(), 50);
    }

    

    function renameFolder(id, currentName) {
        $('#folderModalTitle').textContent = 'Rename folder';
        $('#folderSubmitText').textContent = 'Save';
        $('#folderId').value = id;
        $('#folderName').value = currentName;
        $('#folderModal').classList.add('active');
        setTimeout(() => $('#folderName').focus(), 50);
    }
    

    function openImportModal() {
        $('#importForm').reset();
        _importFmt = 'json';
        _switchImportFmt('json');
        $('#importModal').classList.add('active');
    }

    

    function _renderImportTemplate() {
        const box = $('#importTemplateBox');
        if (box) box.textContent = _IMPORT_TEMPLATE_TEXT;
    }

    

    window.PL_copyMarkdownTemplate = async function() {
        try {
            await navigator.clipboard.writeText(_MARKDOWN_TEMPLATE_TEXT);
            toast('Markdown template copied — paste into your AI and send your prompts', 'success');
        } catch {
            toast('Copy failed', 'error');
        }
    };

    function _switchImportFmt(fmt) {
        _importFmt = fmt;
        $$('.import-fmt-tab').forEach(t => t.classList.toggle('active', t.dataset.fmt === fmt));
        const panels = {
            json: '#importPanelJson',
            markdown: '#importPanelMarkdown',
            file: '#importPanelFile',
            template: '#importPanelTemplate'
        };
        Object.entries(panels).forEach(([f, sel]) => {
            const el = $(sel);
            if (el) el.style.display = f === fmt ? '' : 'none';
        });
        // Populate the template panel when shown
        if (fmt === 'template') _renderImportTemplate();
    }

    

    function parseMarkdownImport(md) {
        const prompts = [];
        // Split on horizontal rules that separate prompts
        const blocks = md.split(/\n---+\n/);
        for (const block of blocks) {
            const lines = block.split('\n');
            let title = '',
                description = '',
                content = '',
                categories = '',
                tags = '';
            let inCode = false;
            const contentLines = [];

            for (const line of lines) {
                if (/^#{1,2}\s+/.test(line) && !inCode) {
                    title = line.replace(/^#{1,2}\s+/, '').trim();
                } else if (/^\*[^*].*[^*]\*$/.test(line.trim()) && !inCode && !title === false) {
                    description = line.trim().replace(/^\*|\*$/g, '').trim();
                } else if (/^\*\*Categories:\*\*/.test(line) && !inCode) {
                    categories = line.replace(/^\*\*Categories:\*\*/, '').trim();
                } else if (/^\*\*Tags:\*\*/.test(line) && !inCode) {
                    tags = line.replace(/^\*\*Tags:\*\*/, '').trim();
                } else if (line.trim() === '```') {
                    inCode = !inCode;
                } else if (inCode) {
                    contentLines.push(line);
                }
            }
            content = contentLines.join('\n').trim();
            if (title && content) {
                prompts.push({
                    title,
                    description,
                    content,
                    categories,
                    tags
                });
            }
        }
        return prompts;
    }

    

    async function handleImport(e) {
        e.preventDefault();
        try {
            if (_importFmt === 'json') {
                const raw = $('#importContent').value.trim();
                let prompts;
                try {
                    prompts = JSON.parse(raw);
                    if (!Array.isArray(prompts)) throw new Error();
                } catch {
                    toast('Invalid JSON — paste an array of prompt objects', 'warning');
                    return;
                }
                await _doImport(prompts);

            } else if (_importFmt === 'markdown') {
                const raw = $('#importMdContent').value.trim();
                if (!raw) {
                    toast('Paste some Markdown to import', 'warning');
                    return;
                }
                const prompts = parseMarkdownImport(raw);
                await _doImport(prompts);

            } else if (_importFmt === 'file') {
                const fileInput = $('#importFileInput');
                const file = fileInput?.files?.[0];
                if (!file) {
                    toast('Choose a file first', 'warning');
                    return;
                }
                const text = await file.text();
                let prompts;
                if (file.name.endsWith('.json')) {
                    try {
                        prompts = JSON.parse(text);
                        if (!Array.isArray(prompts)) throw new Error();
                    } catch {
                        toast('Invalid JSON file', 'warning');
                        return;
                    }
                } else {
                    // Markdown file
                    prompts = parseMarkdownImport(text);
                }
                await _doImport(prompts);
            }
        } catch (err) {
            console.error('import error:', err);
            toast('Import failed — check the format', 'error');
        }
    }

    

    function closeExportModal() {
        $('#exportModal').classList.remove('active');
    }

    

    async function exportFormat(path, mime, ext) {
        if (!state.isPremium) {
            showPremiumModal();
            return;
        }
        try {
            const res = await fetch(API_BASE + path);
            if (!res.ok) throw new Error();
            const filename = `prompts-${new Date().toISOString().slice(0, 10)}.${ext}`;

            let content;
            if (mime === 'application/zip') {
                // Encode binary as base64 for JSON transport
                const buf = await res.arrayBuffer();
                const bytes = new Uint8Array(buf);
                let bin = '';
                bytes.forEach(b => {
                    bin += String.fromCharCode(b);
                });
                content = btoa(bin);
            } else {
                content = await res.text();
            }

            const saveRes = await fetch('/api/save-file', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filename,
                    content,
                    mime
                }),
            });
            const result = await saveRes.json();
            if (result.saved) {
                toast(`Saved to ${result.path}`, 'success');
                closeExportModal();
            } else if (result.error) {
                toast('Save failed: ' + result.error, 'error');
            }
        } catch (err) {
            toast('Could not export', 'error');
        }
    }

    

    window.PL_loadStarters = async function() {
        try {
            const result = await api('/starter-templates', {
                method: 'POST'
            });
            if (result.loaded) {
                await loadAll();
                toast(`Loaded ${result.loaded} starter prompts`, 'success');
            } else {
                toast('Library is not empty - starters skipped', 'info');
            }
        } catch (err) {
            toast('Could not load starters', 'error');
        }
    };

    function getVarTemplates() {
        return JSON.parse(localStorage.getItem('promptlib.varTemplates') || '[]');
    }

    

    function openVarTemplateModal() {
        if (!state.isPremium) {
            showPremiumModal();
            return;
        }
        const list = $('#varTemplateList');
        const templates = getVarTemplates();
        if (!templates.length) {
            list.innerHTML = '<p style="font-size: var(--fs-sm); color: var(--ink-3);">No saved templates yet.</p>';
        } else {
            list.innerHTML = templates.map((t, i) => `
      <button class="export-option" type="button" onclick="window.PL_loadVarTemplate(${i})">
        <span class="material-symbols-outlined">description</span>
        <div class="export-option-body">
          <div class="export-option-title">${escapeHtml(t.name)}</div>
          <div class="export-option-desc">${Object.keys(t.meta).length} variables</div>
        </div>
      </button>`).join('');
        }
        $('#varTemplateModal').classList.add('active');
    }

    

    window.PL_loadVarTemplate = function(idx) {
        const templates = getVarTemplates();
        const t = templates[idx];
        if (!t) return;
        // Apply meta to the existing var rows
        const content = $('#promptContent').value;
        let updated = content;
        Object.keys(t.meta).forEach(v => {
            if (!content.includes(`[[${v}]]`) && !content.includes(`{{${v}}}`) && !content.includes(`((${v}))`)) {
                updated += `\n[[${v}]]`;
            }
        });
        $('#promptContent').value = updated;
        updateEditorPreview();
        setTimeout(() => renderVarMetaList(t.meta), 50);
        closeVarTemplateModal();
        toast('Template loaded', 'success');
    };

    function openSaveTemplateModal() {
        if (!state.isPremium) {
            showPremiumModal();
            return;
        }
        $('#templateNameInput').value = '';
        $('#saveTemplateModal').classList.add('active');
    }

    

    function saveCurrentVarTemplate() {
        const name = $('#templateNameInput').value.trim();
        if (!name) {
            toast('Give the template a name', 'warning');
            return;
        }
        const meta = collectVarMeta();
        if (!Object.keys(meta).length) {
            toast('No variables to save', 'warning');
            return;
        }
        const templates = getVarTemplates();
        templates.push({
            name,
            meta
        });
        setVarTemplates(templates);
        closeSaveTemplateModal();
        toast('Template saved', 'success');
    }

    

    function loadTheme() {
        const saved = localStorage.getItem('promptlib.theme') || 'light';
        applyTheme(saved);
    }

    

    function showPremiumModal() {
        $('#licenceError').classList.remove('show');
        // Always start empty — never pre-fill a key, so 'press Enter' can't unlock.
        $('#licenceKeyInput').value = '';
        $('#premiumModal').classList.add('active');
    }

    

    // Validate a key against the backend and persist it. Returns true on success.
    // Shared by the premium modal and the Settings licence panel.
    async function _validateAndStoreKey(key) {
        const result = await api('/licence/validate', {
            method: 'POST',
            body: {
                key
            }
        });
        if (!result || !result.valid) return false;
        state.isPremium = true;
        state.licenceKey = key;
        await api('/settings/licence', {
            method: 'POST',
            body: {
                key
            }
        });
        applyPremiumState();
        return true;
    }

    

    async function loadStoredLicence() {
        try {
            const settings = await api('/settings');
            if (settings.licence) {
                const result = await api('/licence/check', {
                    method: 'POST',
                    body: {
                        key: settings.licence
                    }
                });
                if (result.valid) {
                    state.isPremium = true;
                    state.licenceKey = settings.licence;
                }
            }
        } catch (err) {
            console.warn('licence check failed:', err);
        }
        applyPremiumState();
    }

    

    async function openAnalytics() {
        if (!state.isPremium) {
            showPremiumModal();
            return;
        }
        const body = $('#analyticsBody');
        body.innerHTML = '<p style="text-align:center; color: var(--ink-3); padding: var(--sp-7);">Loading...</p>';
        $('#analyticsModal').classList.add('active');
        try {
            const data = await api('/analytics');
            body.innerHTML = renderAnalytics(data);
        } catch (err) {
            body.innerHTML = '<p style="text-align:center; color: var(--danger); padding: var(--sp-7);">Could not load analytics.</p>';
        }
    }

    

    function renderAnalytics(d) {
        // Backend (app.py /api/analytics) returns: summary, top_prompts, recent_prompts, daily_usage, rating_dist
        const s = d.summary || {};
        const top = d.top_prompts || [];
        const recent = d.recent_prompts || [];
        const daily = d.daily_usage || [];
        const ratings = d.rating_dist || [];

        const maxTop = Math.max(1, ...top.map(t => t.use_count || 0));
        const maxDaily = Math.max(1, ...daily.map(d => d.count || 0));

        const stats = [{
                label: 'Prompts',
                value: s.total_prompts || 0,
                icon: 'description'
            },
            {
                label: 'Total uses',
                value: s.total_uses || 0,
                icon: 'bolt'
            },
            {
                label: 'Favourites',
                value: s.total_favourites || 0,
                icon: 'star'
            },
            {
                label: 'Folders',
                value: s.total_folders || 0,
                icon: 'folder'
            },
            {
                label: 'Never used',
                value: s.never_used || 0,
                icon: 'unpublished'
            },
        ];

        const ratingTotal = ratings.reduce((a, r) => a + (r.count || 0), 0) || 1;
        const ratingBars = [5, 4, 3, 2, 1].map(stars => {
            const found = ratings.find(r => r.rating === stars);
            const cnt = found ? found.count : 0;
            const pct = Math.round((cnt / ratingTotal) * 100);
            return {
                stars,
                cnt,
                pct
            };
        });

        return `
    <!-- STATS BAR - bordered card row -->
    <div class="stats-bar">
      ${stats.map(st => `
        <div class="stats-bar-card">
          <span class="material-symbols-outlined stats-bar-icon">${st.icon}</span>
          <div class="stats-bar-value">${st.value.toLocaleString()}</div>
          <div class="stats-bar-label">${st.label}</div>
        </div>`).join('')}
    </div>

    <div class="stats-section">
      <div class="detail-section-label" style="margin-top:0">Most-used prompts</div>
      ${top.length === 0 ? '<p style="font-size: var(--fs-sm); color: var(--ink-3);">No usage tracked yet.</p>' :
        top.map(t => `
          <div class="bar-row">
            <div style="min-width:0">
              <div style="font-size: var(--fs-sm); color: var(--ink); margin-bottom: 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(t.title)}</div>
              <div class="bar-bg"><div class="bar-fill" style="width: ${Math.round(((t.use_count || 0) / maxTop) * 100)}%;"></div></div>
            </div>
            <div style="font-size: 12px; color: var(--ink-3); font-variant-numeric: tabular-nums; text-align: right;">${(t.use_count || 0).toLocaleString()} use${(t.use_count || 0) !== 1 ? 's' : ''}</div>
          </div>`).join('')
      }
    </div>

    ${daily.length > 0 ? `
      <div class="stats-section">
        <div class="detail-section-label">Last 30 days</div>
        <div class="daily-chart" style="display:flex; align-items:flex-end; gap:2px; height: 80px; padding: 8px 0; border-bottom: 1px solid var(--line);">
          ${daily.slice(-30).map(day => {
            const h = Math.max(2, Math.round((day.count / maxDaily) * 70));
            return `<div title="${escapeHtml(day.day)}: ${day.count} uses" style="flex:1; min-width:6px; height:${h}px; background:var(--accent); border-radius:2px; opacity:${0.4 + (day.count / maxDaily) * 0.6};"></div>`;
          }).join('')}
        </div>
        <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--ink-4); margin-top:4px; font-variant-numeric:tabular-nums;">
          <span>${daily[0]?.day || ''}</span>
          <span>${daily[daily.length - 1]?.day || ''}</span>
        </div>
      </div>` : ''
    }

    <div class="stats-section">
      <div class="detail-section-label">Rating distribution</div>
      ${ratingBars.map(rb => `
        <div class="bar-row">
          <div>
            <div style="font-size: var(--fs-sm); color: var(--ink); margin-bottom: 4px; display:flex; align-items:center; gap:4px;">
              <span style="color: var(--gold); letter-spacing: 1px;">${'\u2605'.repeat(rb.stars)}${'\u2606'.repeat(5 - rb.stars)}</span>
            </div>
            <div class="bar-bg"><div class="bar-fill" style="width: ${rb.pct}%; background: var(--gold);"></div></div>
          </div>
          <div style="font-size: 12px; color: var(--ink-3); font-variant-numeric: tabular-nums; text-align: right;">${rb.cnt}</div>
        </div>`).join('')
      }
    </div>

    ${recent.length > 0 ? `
      <div class="stats-section">
        <div class="detail-section-label">Recently used</div>
        <div class="top-list">
          ${recent.slice(0, 8).map(r => `
            <div class="top-list-item" onclick="window.PL_openDetail(${r.id})" style="cursor:pointer;">
              <span class="card-rule c-${r.colour_label || ''}" style="width:3px; height:18px; border-radius:2px;"></span>
              <span class="name">${escapeHtml(r.title)}</span>
              <span class="count">${(r.use_count || 0)} uses</span>
            </div>`).join('')}
        </div>
      </div>` : ''
    }`;
    }

    


    /** Workspace launch commands — every tool reachable from the palette. */
    function getWorkspaceCommands() {
        const table = [
            ['All Workspaces', 'grid_view', 'openWorkspacesLauncher', 'launcher tools browse grid'],
            ['Prompt Generator', 'bolt', 'openGenWorkspace', 'generate create task describe ai'],
            ['Prompt Optimizer', 'rocket_launch', 'openOptimizerWorkspace', 'optimize improve score quality'],
            ['Prompt Components', 'extension', 'openComponentsWorkspace', 'blocks drag drop builder frameworks'],
            ['Prompt Forge', 'construction', 'openForgeWorkspace', 'build structured framework rtf costar'],
            ['Prompt Lab', 'biotech', 'openLabWorkspace', 'ab test variants compare experiment'],
            ['Prompt Chain', 'account_tree', 'openChainWorkspace', 'pipeline multi step sequence'],
            ['Metaprompting', 'auto_fix_high', 'openMetaWorkspace', 'rewrite improve rough polish'],
            ['Context Bank', 'database', 'openContextBankWorkspace', 'context blocks reusable snippets'],
            ['Quick Fill', 'dynamic_form', 'openFillWorkspace', 'placeholders template variables fill'],
            ['Prompt Auditor', 'fact_check', 'openAuditWorkspace', 'audit rubric score check'],
            ['Diff Lens', 'compare', 'openDiffWorkspace', 'diff compare two prompts'],
            ['Cost Lens', 'calculate', 'openCostWorkspace', 'tokens cost estimate price'],
            ['Library Pulse', 'monitor_heart', 'openPulseWorkspace', 'health scan library quality'],
            ['Prompt X-Ray', 'visibility', 'openXrayWorkspace', 'deconstruct analyse parts anatomy'],
            ['Prompt Splicer', 'call_merge', 'openSpliceWorkspace', 'merge combine two prompts'],
            ['Agents', 'smart_toy', 'openRolesWorkspace', 'agents roles personas ai'],
            ['Playground', 'science', 'openPlaygroundWorkspace', 'playground sessions test freeform'],
        ];
        return table.map(([label, icon, fn, keywords]) => ({
            kind: 'workspace',
            icon,
            label,
            hint: 'Workspace',
            keywords: keywords + ' ' + label.toLowerCase() + ' open go workspace',
            action: () => {
                closeCmdPalette();
                if (typeof window[fn] === 'function') window[fn]();
            }
        }));
    }

    

    function activateCmdSelection() {
        if (!cmdItems.length) return;
        const item = cmdItems[cmdIndex];
        if (!item) return;
        if (item.kind === 'prompt') {
            closeCmdPalette();
            openDetail(item.prompt.id);
        } else {
            item.action();
        }
    }

    

    window.PL_filterByTag = function(value) {
        _escapeToLibrary();
        setFilterPill({
            type: 'tag',
            value
        });
        $$('[data-filter-tag]').forEach(el => {
            el.classList.toggle('active', el.dataset.filterTag === value);
        });
    };


    /* ── Read current form values into a role object ─────────────────────────── */
    function getRoleFromForm() {
        // Collect knowledge base entries from rendered cards
        const kbEntries = [];
        $$('.kb-entry-card').forEach(card => {
            kbEntries.push({
                name: card.querySelector('.kb-name-input')?.value?.trim() || '',
                when_to_use: card.querySelector('.kb-when-input')?.value?.trim() || '',
                content: card.querySelector('.kb-content-input')?.value?.trim() || '',
                include: card.querySelector('.kb-include-toggle')?.checked ?? true,
            });
        });
        // Collect skills entries from rendered cards
        const skillEntries = [];
        $$('.skill-card').forEach(card => {
            skillEntries.push({
                name: card.querySelector('.skill-name-input')?.value?.trim() || '',
                description: card.querySelector('.skill-desc-input')?.value?.trim() || '',
                example: card.querySelector('.skill-example-input')?.value?.trim() || '',
            });
        });
        // Collect active behaviour chips
        const activeFlags = [];
        $$('.role-chip.on').forEach(chip => {
            if (chip.dataset.val) activeFlags.push(chip.dataset.val);
        });

        const _chipVal = (sel) => $(sel + ' .role-chip.on')?.dataset?.val || '';
        const flagVals = [];
        $$('#roleFlagChips .role-chip.on').forEach(c => {
            if (c.dataset.val) flagVals.push(c.dataset.val);
        });

        return {
            name: $('#roleNameInput')?.value?.trim() || '',
            icon: $('#roleIconBtn')?.textContent?.trim() || '🤖',
            colour: $('#roleColourPicker')?.value || '#6366f1',
            prompt_starter: (($('#rolePromptStarter')?.value || 'You are a') + ' ' + ($('#roleTypeInput')?.value?.trim() || '')).trim(),
            persona: $('#rolePersonaInput')?.value || '',
            tone: $('#roleToneInput')?.value || '',
            expertise: $('#roleExpertiseInput')?.value || '',
            response_style: _chipVal('#roleStyleChips'),
            depth: _chipVal('#roleDepthChips'),
            format_mode: _chipVal('#roleFormatModeChips'),
            interaction_mode: _chipVal('#roleProcTypeChips'),
            behaviour_flags: flagVals,
            audience: $('#roleAudienceInput')?.value || '',
            domain: $('#roleDomainInput')?.value || '',
            constraints: $('#roleConstraintsInput')?.value || '',
            output_format: $('#roleOutputFormatInput')?.value || '',
            tasks: $('#roleTasksInput')?.value || '',
            goal: $('#roleGoalInput')?.value || '',
            outcome: $('#roleOutcomeInput')?.value || '',
            opening_message: $('#roleInitInput')?.value || '',
            persistent_context: $('#roleMemoryInput')?.value || '',
            example_phrases: _getExamplesFromDOM(),
            knowledge_base: kbEntries,
            skills: skillEntries,
        };
    }

    

    window.PL_addKbEntry = function() {
        const entries = _getKbFromDOM();
        entries.push({
            name: '',
            when_to_use: '',
            content: '',
            include: true
        });
        renderKbList(entries);
        // Focus the name input of the new card
        const cards = $$('.kb-entry-card');
        if (cards.length) cards[cards.length - 1].querySelector('.kb-name-input')?.focus();
    };

    window.PL_removeKbEntry = function(idx) {
        const entries = _getKbFromDOM();
        entries.splice(idx, 1);
        renderKbList(entries);
    };

    window.PL_toggleKbInclude = function(idx, checked) {
        // No re-render needed — checkbox state is live in the DOM
        // This function exists for future hook-ins (e.g. preview refresh)
    };

    function _getKbFromDOM() {
        const entries = [];
        $$('.kb-entry-card').forEach(card => {
            entries.push({
                name: card.querySelector('.kb-name-input')?.value || '',
                when_to_use: card.querySelector('.kb-when-input')?.value || '',
                content: card.querySelector('.kb-content-input')?.value || '',
                include: card.querySelector('.kb-include-toggle')?.checked ?? true,
            });
        });
        return entries;
    }

    

    function _getSkillsFromDOM() {
        const entries = [];
        $$('.skill-card').forEach(card => {
            entries.push({
                name: card.querySelector('.skill-name-input')?.value || '',
                description: card.querySelector('.skill-desc-input')?.value || '',
                example: card.querySelector('.skill-example-input')?.value || '',
            });
        });
        return entries;
    }

    


    /* ── Example Phrases multi-entry ─────────────────────────────────────────── */
    function renderExampleList(entries) {
        const container = $('#examplePhrasesList');
        if (!container) return;

        if (!entries || !entries.length) {
            container.innerHTML = '<p class="kb-empty">No example phrases yet. Click <em>Add</em> to begin.</p>';
            return;
        }

        container.innerHTML = entries.map((e, i) => `
    <div class="example-phrase-row" data-idx="${i}">
      <input type="text" class="form-input example-phrase-input" placeholder="e.g. Let me walk you through this step by step…"
             value="${(e.text || '').replace(/"/g, '&quot;')}"
             oninput="updateRolePromptPreview()" />
      <button type="button" class="icon-btn danger" onclick="window.PL_removeExamplePhrase(${i})"
              title="Remove phrase" aria-label="Remove phrase">
        <span class="material-symbols-outlined" style="font-size:16px;">close</span>
      </button>
    </div>
  `).join('');
    }

    

    window.PL_addExamplePhrase = function() {
        const current = _getExamplesFromDOM();
        current.push({
            text: ''
        });
        renderExampleList(current);
        // Focus the new input
        const inputs = $$('.example-phrase-input');
        if (inputs.length) inputs[inputs.length - 1].focus();
    };

    window.PL_removeExamplePhrase = function(idx) {
        const current = _getExamplesFromDOM();
        // re-read before remove since DOM is live
        const all = [];
        $$('.example-phrase-input').forEach(input => all.push({
            text: input.value.trim()
        }));
        all.splice(idx, 1);
        renderExampleList(all);
        updateRolePromptPreview();
    };

    window.PL_removeSkillEntry = function(idx) {
        const entries = _getSkillsFromDOM();
        entries.splice(idx, 1);
        renderSkillList(entries);
        updateRolePromptPreview();
    };


    /* ── Copy built prompt ────────────────────────────────────────────────────── */
    window.PL_copyBuiltPrompt = async function(format) {
        const role = getRoleFromForm();
        const text = buildRolePrompt(role, format);
        if (!text) {
            toast('Fill in some fields first', 'warn');
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            toast(`Copied as ${format}`, 'success');
        } catch {
            toast('Copy failed', 'error');
        }
    };


    /* ── Copy raw persona (system prompt) ────────────────────────────────────── */
    window.PL_copyRolePersona = async function(id) {
        const role = _rolesState.roles.find(r => r.id === id);
        if (!role?.persona) {
            toast('No persona text to copy', 'warn');
            return;
        }
        try {
            await navigator.clipboard.writeText(role.persona);
            toast('Persona copied', 'success');
        } catch {
            toast('Copy failed', 'error');
        }
    };


    /* ── Save ─────────────────────────────────────────────────────────────────── */
    window.PL_saveRole = async function() {
        const id = _rolesState.activeId;
        const body = getRoleFromForm();

        if (!body.name.trim()) {
            toast('Role needs a name', 'warn');
            return;
        }

        // Agents 3-day trial — starts on first save, locks after expiry unless Pro
        if (!id && !state.isPremium) {
            const TRIAL_KEY = 'agents_trial_start';
            const TRIAL_DAYS = 3;
            const stored = localStorage.getItem(TRIAL_KEY);
            const now = Date.now();
            if (!stored) {
                // First save — start the trial clock
                localStorage.setItem(TRIAL_KEY, String(now));
            } else {
                const elapsed = (now - Number(stored)) / (1000 * 60 * 60 * 24);
                if (elapsed >= TRIAL_DAYS) {
                    toast('Your 3-day Agents trial has ended. Upgrade to Pro to keep using Roles.', 'warning');
                    showPremiumModal();
                    return;
                }
            }
        }

        try {
            const url = id ? `/api/roles/${id}` : '/api/roles';
            const method = id ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error('Save failed');
            const saved = await res.json();
            if (!id) _rolesState.activeId = saved.id;
            _rolesState.dirty = false;
            toast('Role saved', 'success');
            await loadRoles(true);
        } catch (e) {
            toast('Save failed', 'error');
            console.error(e);
        }
    };


    /* ── New ──────────────────────────────────────────────────────────────────── */
    window.PL_newRole = function() {
        _rolesState.activeId = null;
        _rolesState.dirty = false;

        const empty = $('#rolesEditorEmpty');
        const form = $('#rolesEditorForm');
        if (empty) empty.style.display = 'none';
        if (form) form.style.display = 'flex';

        // Clear all fields
        ['#roleNameInput', '#rolePersonaInput', '#roleToneInput', '#roleExpertiseInput',
            '#roleConstraintsInput', '#roleInitInput', '#roleMemoryInput', '#roleTasksInput',
            '#roleGoalInput', '#roleOutcomeInput', '#roleAudienceInput', '#roleDomainInput',
            '#roleOutputFormatInput'
        ].forEach(sel => {
            const el = $(sel);
            if (el) el.value = '';
        });
        // Reset selects
        ['#rolePromptStarter'].forEach(sel => {
            const el = $(sel);
            if (el) el.selectedIndex = 0;
        });
        // Reset chips
        $$('.role-chip').forEach(c => c.classList.remove('on'));
        // Reset icon + colour
        const iconBtn = $('#roleIconBtn');
        if (iconBtn) iconBtn.textContent = '🤖';
        const colPicker = $('#roleColourPicker');
        if (colPicker) colPicker.value = '#6366f1';
        // Reset section tabs to Core
        $$('.role-nav-tab').forEach(t => t.classList.remove('active'));
        const coreTab = document.querySelector('.role-nav-tab[data-section="identity"]');
        if (coreTab) coreTab.classList.add('active');
        $$('.role-section-panel').forEach(p => p.classList.remove('active'));
        const corePanel = $('#role-section-identity');
        if (corePanel) corePanel.classList.add('active');

        renderRolesList(); // clear active highlight
        renderKbList([]);
        renderSkillList([]);
        renderExampleList([]);
        updateRolePromptPreview();
        $('#roleNameInput')?.focus();
    };

    window.PL_newRoleFromPreset = function(idx) {
        const p = ROLE_PRESETS[idx];
        if (!p) return;
        window.PL_newRole();
        const set = (sel, val) => {
            const el = $(sel);
            if (el) el.value = val || '';
        };
        set('#roleNameInput', p.name);
        set('#roleToneInput', p.tone);
        set('#roleExpertiseInput', p.expertise);
        set('#rolePersonaInput', p.persona);
        set('#roleGoalInput', p.goal);
        set('#roleTasksInput', p.tasks);
        const iconBtn = $('#roleIconBtn');
        if (iconBtn) iconBtn.textContent = p.icon;
        (p.flags || []).forEach(f => {
            const chip = document.querySelector('#roleFlagChips .role-chip[data-val="' + f + '"]');
            if (chip) chip.classList.add('on');
        });
        updateRolePromptPreview();
        toast('Preset loaded — tweak and save', 'success');
    };


    /* ── Delete ───────────────────────────────────────────────────────────────── */
    window.PL_deleteRole = async function() {
        const id = _rolesState.activeId;
        if (!id) return;

        const role = _rolesState.roles.find(r => r.id === id);
        if (!confirm(`Delete role "${role?.name || 'this role'}"? This cannot be undone.`)) return;

        try {
            await fetch(`/api/roles/${id}`, {
                method: 'DELETE'
            });
            _rolesState.activeId = null;
            toast('Role deleted', 'success');
            await loadRoles();
            // Show empty state
            const empty = $('#rolesEditorEmpty');
            const form = $('#rolesEditorForm');
            if (empty) empty.style.display = 'flex';
            if (form) form.style.display = 'none';
        } catch {
            toast('Delete failed', 'error');
        }
    };


    /* ── Duplicate ────────────────────────────────────────────────────────────── */
    window.PL_duplicateRole = async function() {
        const id = _rolesState.activeId;
        if (!id) return;
        try {
            const res = await fetch(`/api/roles/${id}/duplicate`, {
                method: 'POST'
            });
            const data = await res.json();
            toast('Role duplicated', 'success');
            await loadRoles();
            openRoleInEditor(data.id);
        } catch {
            toast('Duplicate failed', 'error');
        }
    };


    /* ── Toggle favourite ─────────────────────────────────────────────────────── */
    window.PL_toggleRoleFav = async function(id) {
        try {
            await fetch(`/api/roles/${id}/favorite`, {
                method: 'POST'
            });
            await loadRoles(_rolesState.activeId === id);
        } catch {
            toast('Could not update favourite', 'error');
        }
    };

    // Pull a JSON object out of an AI reply. Tolerates code fences, preamble
    // text, smart quotes and trailing commas. Throws with a usable reason.
    function _aiExtractJson(text) {
        let t = (text || '').trim();
        const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fenced && fenced[1].trim()) t = fenced[1].trim();
        const first = t.indexOf('{');
        const last = t.lastIndexOf('}');
        if (first === -1) throw new Error('AI reply contained no JSON — try again');
        if (last <= first) throw new Error('AI reply looks cut off — try again');
        t = t.slice(first, last + 1);
        try {
            return JSON.parse(t);
        } catch (e1) {
            const repaired = t
                .replace(/[“”]/g, '"')
                .replace(/[‘’]/g, "'")
                .replace(/,\s*([}\]])/g, '$1');
            try {
                return JSON.parse(repaired);
            } catch (e2) {
                throw new Error('AI returned invalid JSON (' + String(e2.message).slice(0, 60) + ') — try again');
            }
        }
    }

    

        const set = (id, val) => {
            const el = $(id);
            if (el) el.textContent = val;
        };

        function _pgClose() {
            if (_pg.dirty) _pgSaveAll(false);
            pgW().classList.remove('open');
            document.body.style.overflow = '';
        }

        

        async function _pgCreateSession() {
            const d = new Date();
            const title = 'Session ' + d.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: '2-digit'
            });
            const res = await fetch('/api/playground/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title
                })
            });
            const sess = await res.json();
            _pg.sessions.unshift(sess);
            _pgRenderSessionsList();
            await _pgSelectSession(sess.id);
        }

        

        async function _pgDeleteSession(id, e) {
            e.stopPropagation();
            if (!confirm('Delete this session? This cannot be undone.')) return;
            await fetch('/api/playground/sessions/' + id, {
                method: 'DELETE'
            });
            _pg.sessions = _pg.sessions.filter(s => s.id !== id);
            if (_pg.activeSessionId === id) {
                _pg.activeSessionId = null;
                _pg.dirty = false;
                _pgRenderCanvas(null);
            }
            _pgRenderSessionsList();
        }

        

        window._pgPanelField = function(slot, field, value) {
            if (!_pg.panels[slot]) _pg.panels[slot] = {};
            _pg.panels[slot][field] = value;
            _pg.dirty = true;
        };

        window._pgPanelContent = function(slot, value) {
            if (!_pg.panels[slot]) _pg.panels[slot] = {};
            _pg.panels[slot].content = value;
            _pg.dirty = true;
            const cc = document.getElementById('pgCharCount' + slot);
            if (cc) cc.textContent = value.length + ' chars';
        };

        window._pgSetScore = function(slot, score) {
            if (!_pg.panels[slot]) _pg.panels[slot] = {};
            _pg.panels[slot].score = (_pg.panels[slot].score === score) ? null : score;
            _pg.dirty = true;
            const footer = document.querySelector('.pg-panel[data-slot="' + slot + '"] .pg-score-stars');
            if (footer) {
                const newScore = _pg.panels[slot].score || 0;
                footer.innerHTML = [1, 2, 3, 4, 5].map(function(n) {
                    return '<span class="material-symbols-outlined pg-score-star' + (n <= newScore ? ' on' : '') + '" onclick="window._pgSetScore(' + slot + ',' + n + ')">star</span>';
                }).join('');
            }
        };


        // Mode toggle
        function _pgSetMode(n) {
            _pg.activePanels = n;
            document.querySelectorAll('.pg-mode-btn').forEach(function(b) {
                b.classList.toggle('active', parseInt(b.dataset.panels) === n);
            });
            if (_pg.activeSessionId) _pgRenderPanels();
        }

        


        // Utilities
        function _pgEsc(s) {
            return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        

    function _ctxLoad() {
        try {
            _ctxBlocks = JSON.parse(localStorage.getItem(CTX_LS_KEY) || '[]');
        } catch {
            _ctxBlocks = [];
        }
    }

    

    function _ctxUID() {
        return 'ctx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    }

    

    function _ctxSeedTemplates() {
        const seeded = localStorage.getItem('pl_ctx_seeded');
        if (seeded) return;
        _ctxBlocks = CTX_TEMPLATES.map((t, i) => ({
            id: 'tpl_' + i + '_' + Math.random().toString(36).slice(2, 6),
            title: t.title,
            category: t.category,
            content: t.content,
            created: new Date().toISOString(),
        }));
        _ctxSave();
        localStorage.setItem('pl_ctx_seeded', '1');
    }



    

    function _ctxNewBlock() {
        _ctxOpenBlock(null);
    }

    

    function _panelOpen(panelId, btnId) {
        ['#promptCtxPanel', '#promptComponentsPanel', '#promptSnippetsPanel'].forEach(sel => {
            const el = $(sel);
            if (el) el.classList.remove('open');
        });
        $$('.panel-toggle-btn').forEach(b => b.classList.remove('active'));
        $(panelId)?.classList.add('open');
        $(btnId)?.classList.add('active');
        if (panelId === '#promptCtxPanel') _ctxPanelRefresh();
        if (panelId === '#promptSnippetsPanel') _snipPanelRefresh();
    }

    

    function _ctxPanelRefresh() {
        const list = $('#ctxPanelList');
        if (!list) return;
        _ctxLoad();
        const query = ($('#ctxPanelSearch')?.value || '').toLowerCase();
        const catBtn = document.querySelector('#ctxPanelCats .chip.active');
        const cat = catBtn?.dataset?.cpf || 'all';

        let blocks = _ctxBlocks;
        if (cat !== 'all') blocks = blocks.filter(b => b.category === cat);
        if (query) blocks = blocks.filter(b =>
            (b.title || '').toLowerCase().includes(query) ||
            (b.content || '').toLowerCase().includes(query));

        if (!blocks.length) {
            list.innerHTML = '<div style="color:var(--ink-3);font-size:var(--fs-sm);padding:var(--sp-3);text-align:center;">No blocks found.<br>Create one in the Context Bank workspace.</div>';
            return;
        }

        list.innerHTML = blocks.map(b =>
            '<div class="ctx-panel-item" data-cpid="' + escapeAttr(b.id) + '" ' +
            'style="padding:8px var(--sp-3);cursor:pointer;border-bottom:1px solid var(--border,#374151);">' +
            '<div style="font-size:var(--fs-sm);font-weight:600;">' + escapeHtml(b.title) + '</div>' +
            '<div style="font-size:11px;color:var(--ink-3);">' + escapeHtml(b.category || 'Other') + '</div>' +
            '</div>'
        ).join('');

        list.querySelectorAll('[data-cpid]').forEach(item => {
            item.addEventListener('click', () => {
                const block = _ctxBlocks.find(b => b.id === item.dataset.cpid);
                if (!block) return;
                const ta = $('#promptContent');
                if (ta) {
                    const ins = '\n\n--- Context: ' + block.title + ' ---\n' + block.content + '\n';
                    const pos = ta.selectionStart ?? ta.value.length;
                    ta.value = ta.value.slice(0, pos) + ins + ta.value.slice(pos);
                    ta.selectionStart = ta.selectionEnd = pos + ins.length;
                    ta.dispatchEvent(new Event('input'));
                }
                toast('Context block inserted', 'success');
            });
        });
    }

    

    function initModalSidePanels() {
        // Context Bank panel toggle
        $('#ctxPanelToggleBtn')?.addEventListener('click', () => {
            if ($('#promptCtxPanel')?.classList.contains('open'))
                _panelClose('#promptCtxPanel', '#ctxPanelToggleBtn');
            else
                _panelOpen('#promptCtxPanel', '#ctxPanelToggleBtn');
        });

        // Components panel toggle
        $('#compPanelToggleBtn')?.addEventListener('click', () => {
            if ($('#promptComponentsPanel')?.classList.contains('open'))
                _panelClose('#promptComponentsPanel', '#compPanelToggleBtn');
            else {
                _panelOpen('#promptComponentsPanel', '#compPanelToggleBtn');
                _compPanelRender();
            }
        });

        // Snippets panel toggle
        $('#snipPanelToggleBtn')?.addEventListener('click', () => {
            if ($('#promptSnippetsPanel')?.classList.contains('open'))
                _panelClose('#promptSnippetsPanel', '#snipPanelToggleBtn');
            else
                _panelOpen('#promptSnippetsPanel', '#snipPanelToggleBtn');
        });

        // Close buttons
        $('#closeCtxPanel')?.addEventListener('click', () => _panelClose('#promptCtxPanel', '#ctxPanelToggleBtn'));
        $('#closeCompPanel')?.addEventListener('click', () => _panelClose('#promptComponentsPanel', '#compPanelToggleBtn'));
        $('#closeSnipPanel')?.addEventListener('click', () => _panelClose('#promptSnippetsPanel', '#snipPanelToggleBtn'));

        // Context panel search + category filter
        $('#ctxPanelSearch')?.addEventListener('input', _ctxPanelRefresh);

        $$('#ctxPanelCats .chip[data-cpf]').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('#ctxPanelCats .chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                _ctxPanelRefresh();
            });
        });

        // Snippets panel search + category filter
        $('#snipPanelSearch')?.addEventListener('input', _snipPanelRefresh);

        $$('#snipPanelCats .chip[data-cpf]').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('#snipPanelCats .chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                _snipPanelRefresh();
            });
        });

        $('#snipPanelSaveBtn')?.addEventListener('click', _snipPanelSaveNew);

        // Components panel search
        $('#compPanelSearch')?.addEventListener('input', _compPanelRender);

        // Save new block from panel
        $('#ctxPanelSaveBtn')?.addEventListener('click', _ctxPanelSaveNew);

        // Render components panel — search + category groups
        function _compPanelRender() {
            var body = document.getElementById('compPanelBody');
            var ta = $('#promptContent');
            if (!body) return;

            var blocks = window._pcwBLOCKS || [];
            var frameworks = window._pcwFRAMEWORKS || [];
            var categories = window._pcwCATEGORIES || [];
            var query = ($('#compPanelSearch')?.value || '').toLowerCase().trim();

            // Filter blocks by search query
            var filtered = query ?
                blocks.filter(function(b) {
                    return (b.label || '').toLowerCase().includes(query) ||
                        (b.cat || '').toLowerCase().includes(query);
                }) :
                blocks;

            // Group filtered blocks by category
            var grouped = {};
            filtered.forEach(function(b) {
                var catId = b.cat || 'core';
                if (!grouped[catId]) grouped[catId] = [];
                grouped[catId].push(b);
            });

            var html = '';

            if (!filtered.length) {
                html = '<div style="color:var(--ink-3);font-size:var(--fs-sm);padding:var(--sp-4);text-align:center;">No blocks match your search.</div>';
            } else {
                // Render in CATEGORIES order, then any extras
                var orderedCats = categories.filter(function(c) {
                    return grouped[c.id];
                });
                Object.keys(grouped).forEach(function(id) {
                    if (!orderedCats.find(function(c) {
                            return c.id === id;
                        }))
                        orderedCats.push({
                            id: id,
                            label: id,
                            icon: 'widgets',
                            color: 'var(--accent)'
                        });
                });

                orderedCats.forEach(function(cat) {
                    var entries = grouped[cat.id];
                    if (!entries) return;
                    html += '<div class="cp-cat-section">' +
                        '<div class="cp-cat-header" style="--cp-cat-color:' + cat.color + '">' +
                        '<span class="material-symbols-outlined cp-cat-icon">' + escapeHtml(cat.icon) + '</span>' +
                        '<span class="cp-cat-label">' + escapeHtml(cat.label) + '</span>' +
                        '<span class="cp-cat-count">' + entries.length + '</span>' +
                        '</div>' +
                        '<div class="cp-tile-grid">' +
                        entries.map(function(b) {
                            var idx = blocks.indexOf(b);
                            return '<div class="pcw-block-tile" data-comp-idx="' + idx + '" title="' + escapeAttr(b.label) + '">' +
                                '<span class="material-symbols-outlined">' + escapeHtml(b.icon) + '</span>' +
                                '<span class="pcw-block-tile-label">' + escapeHtml(b.label) + '</span>' +
                                '</div>';
                        }).join('') +
                        '</div>' +
                        '</div>';
                });
            }

            // Frameworks section always at bottom
            if (frameworks.length) {
                html += '<div class="cp-cat-section">' +
                    '<div class="cp-cat-header" style="--cp-cat-color:var(--ink-3)">' +
                    '<span class="material-symbols-outlined cp-cat-icon">schema</span>' +
                    '<span class="cp-cat-label">Frameworks</span>' +
                    '<span class="cp-cat-count">' + frameworks.length + '</span>' +
                    '</div>' +
                    '<div class="framework-list" style="padding:0 0 var(--sp-2);">' +
                    frameworks.map(function(f, i) {
                        return '<div class="pcw-fw-tile" data-fw-idx="' + i + '">' +
                            '<span class="pcw-fw-badge">' + escapeHtml(f.badge) + '</span>' +
                            '<div class="pcw-fw-info">' +
                            '<div class="pcw-fw-name">' + escapeHtml(f.name) + '</div>' +
                            '<div class="pcw-fw-desc">' + escapeHtml(f.desc) + '</div>' +
                            '</div>' +
                            '</div>';
                    }).join('') +
                    '</div>' +
                    '</div>';
            }

            body.innerHTML = html;

            // Wire block tile clicks
            body.querySelectorAll('[data-comp-idx]').forEach(function(tile) {
                tile.addEventListener('click', function() {
                    var block = blocks[parseInt(tile.dataset.compIdx, 10)];
                    if (!block || !ta) return;
                    var ins = (ta.value.trim() ? '\n\n' : '') + block.text;
                    var pos = ta.selectionStart != null ? ta.selectionStart : ta.value.length;
                    ta.value = ta.value.slice(0, pos) + ins + ta.value.slice(pos);
                    ta.selectionStart = ta.selectionEnd = pos + ins.length;
                    ta.dispatchEvent(new Event('input'));
                    toast(block.label + ' added', 'success');
                });
            });

            // Wire framework tile clicks
            body.querySelectorAll('[data-fw-idx]').forEach(function(tile) {
                tile.addEventListener('click', function() {
                    var fw = frameworks[parseInt(tile.dataset.fwIdx, 10)];
                    if (!fw || !ta) return;
                    var ins = (ta.value.trim() ? '\n\n' : '') + fw.text;
                    var pos = ta.selectionStart != null ? ta.selectionStart : ta.value.length;
                    ta.value = ta.value.slice(0, pos) + ins + ta.value.slice(pos);
                    ta.selectionStart = ta.selectionEnd = pos + ins.length;
                    ta.dispatchEvent(new Event('input'));
                    toast(fw.badge + ' framework added', 'success');
                });
            });
        }

        // Close panels when prompt modal closes
        const origClose = window.closePromptModal;
        if (typeof origClose === 'function') {
            window.closePromptModal = function() {
                _panelClose('#promptCtxPanel', '#ctxPanelToggleBtn');
                _panelClose('#promptComponentsPanel', '#compPanelToggleBtn');
                origClose();
            };
        }
    }



    

        function escH(s) {
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        


        /* ---- Render category rail (wide screens) ---- */
        function renderCatRail() {
            var rail = $('#pcwCatRail');
            if (!rail) return;
            var allCats = [{
                id: 'all',
                label: 'All categories',
                icon: 'apps',
                color: 'var(--accent)'
            }].concat(CATEGORIES);
            rail.innerHTML = allCats.map(function(c) {
                var active = _activeCat === c.id ? ' active' : '';
                return '<button type="button" class="pcw-rail-btn' + active + '" data-cat="' + c.id +
                    '" title="' + escH(c.label) + '" aria-label="' + escH(c.label) + '" style="--cat-color:' + c.color + '">' +
                    '<span class="material-symbols-outlined">' + c.icon + '</span></button>';
            }).join('');
            rail.querySelectorAll('.pcw-rail-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    _activeCat = btn.dataset.cat;
                    renderCatRail();
                    renderCatPills();
                    renderPalette($('#pcwPaletteSearch') ? $('#pcwPaletteSearch').value : '');
                    var label = document.getElementById('pcwActiveCatLabel');
                    if (label) label.textContent = btn.title;
                });
            });
        }

        


        /* ---- Assemble final prompt (spatial reading order) ---- */
        function assemblePrompt() {
            return _pcwOrdered().map(function(o) {
                return o.b.text.trim();
            }).filter(Boolean).join('\n\n');
        }

        

        function _galPush(view) {
            _galStack.push(view);
            _galRender();
        }

        


        /* ---- Cart ---- */
        function _galCartAdd(item) {
            _galCart.push(item);
            _galUpdateCart(true);
        }

        

        function _galItemFromBlock(b) {
            return {
                label: b.label,
                text: b.text,
                cat: b.cat,
                icon: b.icon
            };
        }

        

        function _galBlockCard(b, gi) {
            var blanks = countBlanks(b.text);
            var snippet = escH(String(b.text).replace(/\s+/g, ' ').slice(0, 150));
            return '<button type="button" class="pcw-gal-card" data-gal-block="' + gi + '" style="--cat-color:' + _pcwCatColor(b.cat) + '">' +
                '<span class="pcw-gal-card-top"><span class="material-symbols-outlined">' + b.icon + '</span>' +
                '<span class="pcw-gal-card-name">' + escH(b.label) + '</span>' +
                (blanks ? '<span class="pcw-blank-chip">' + blanks + '</span>' : '') +
                '<span class="pcw-gal-cart-add" data-cart-block="' + gi + '" title="Add to kit" role="button" aria-label="Add to kit">' +
                '<span class="material-symbols-outlined">library_add</span></span></span>' +
                '<span class="pcw-gal-card-snippet">' + snippet + '</span></button>';
        }

        

        function _aiCatalogue() {
            return CATEGORIES.map(function(c) {
                var labels = BLOCKS.filter(function(b) {
                    return b.cat === c.id;
                }).map(function(b) {
                    return b.label;
                });
                return c.label + ': ' + labels.join(' | ');
            }).join('\n');
        }

        

        function _aiValidateOption(raw) {
            var items = (raw.blocks || []).map(_aiFindBlock).filter(Boolean);
            var seen = {};
            items = items.filter(function(b) {
                if (seen[b.label]) return false;
                seen[b.label] = 1;
                return true;
            });
            if (items.length < 3) return null;
            return {
                approach: raw.approach || 'Option',
                restatement: raw.restatement || '',
                title: raw.title || '',
                items: items
            };
        }

        


        /* ---- Ghost cursor: the visible hand of the AI ---- */
        function _aiCursorEl() {
            var c = document.getElementById('pcwAiCursor');
            if (!c) {
                c = document.createElement('div');
                c.id = 'pcwAiCursor';
                c.innerHTML =
                    '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">' +
                    '<path d="M4 2 L4 20 L9 15.5 L12.5 22 L15 20.8 L11.6 14.4 L18 14 Z" fill="var(--accent)" stroke="#fff" stroke-width="1.4"/></svg>' +
                    '<span class="pcw-ai-cursor-tag">AI</span>';
                document.body.appendChild(c);
            }
            return c;
        }

        

        function _aiCursorHide() {
            var c = document.getElementById('pcwAiCursor');
            if (c) c.style.opacity = '0';
        }

        

        function _aiCursorToEl(el, ms) {
            var r = el.getBoundingClientRect();
            return _aiCursorMove(r.left + r.width / 2, r.top + Math.min(r.height / 2, 24), ms);
        }
        

        function _aiGhostGlide(fromEl, sx, sy, ms) {
            return new Promise(function(res) {
                var a = fromEl.getBoundingClientRect();
                var g = fromEl.cloneNode(true);
                g.classList.add('pcw-ai-ghost');
                g.style.cssText = 'position:fixed;left:' + a.left + 'px;top:' + a.top + 'px;width:' + a.width +
                    'px;margin:0;z-index:9998;pointer-events:none;box-shadow:0 14px 34px rgba(0,0,0,.25);' +
                    'transition:transform ' + ms + 'ms cubic-bezier(0.22, 1, 0.36, 1), opacity ' + ms + 'ms;';
                document.body.appendChild(g);
                requestAnimationFrame(function() {
                    g.style.transform = 'translate(' + (sx - a.left) + 'px,' + (sy - a.top) + 'px) scale(0.5)';
                    g.style.opacity = '0.35';
                });
                setTimeout(function() {
                    g.remove();
                    res();
                }, ms + 30);
            });
        }

        

        const setM = (id, val) => {
            const el = $('#' + id);
            if (el) el.textContent = val + '%';
        };

    function _optAddHistory(type, prompt, output, score) {
        _optState.history.unshift({
            id: Date.now(),
            type,
            prompt: prompt.substring(0, 80) + (prompt.length > 80 ? '...' : ''),
            output,
            score,
            timestamp: new Date().toLocaleTimeString()
        });
        if (_optState.history.length > 12) _optState.history.pop();
        _optRenderHistory();
    }

    


    // Fill a <select> with library prompts. Keeps first option as placeholder.
    async function _wsFillPromptPicker(selectSel) {
        const sel = $(selectSel);
        if (!sel) return;
        try {
            const data = await api('/prompts');
            const list = Array.isArray(data) ? data : (data.prompts || []);
            const first = sel.options[0] ? sel.options[0].outerHTML : '<option value="">Load from library…</option>';
            sel.innerHTML = first + list.map(p =>
                '<option value="' + escapeAttr(p.id) + '">' + escapeHtml(p.title || 'Untitled') + '</option>').join('');
            sel._promptCache = list;
        } catch {
            /* picker stays empty — paste still works */
        }
    }

    

    // _wsPickedPrompt() (not just an id) so a replace can carry over every
    // existing field via PUT — the backend's PUT expects a full prompt payload.
    async function _wsSaveOrReplace({ text, sourcePrompt, newTitle, description, tags, extraNote }) {
        if (sourcePrompt) {
            const replace = confirm(
                'Replace the original prompt "' + sourcePrompt.title + '" with this result?\n\n' +
                'Cancel to save as a new prompt instead.'
            );
            if (replace) {
                const priorNotes = sourcePrompt.notes || '';
                const notes = (extraNote && priorNotes.endsWith(extraNote))
                    ? priorNotes
                    : [priorNotes, extraNote].filter(Boolean).join('\n');
                const existingTags = Array.isArray(sourcePrompt.tags) ? sourcePrompt.tags.join(',') : (sourcePrompt.tags || '');
                const mergedTags = Array.from(new Set(
                    (existingTags ? existingTags + ',' + tags : tags)
                        .split(',')
                        .map(t => t.trim())
                        .filter(Boolean)
                )).join(',');
                try {
                    await api('/prompts/' + sourcePrompt.id, {
                        method: 'PUT',
                        body: {
                            ...sourcePrompt,
                            content: text,
                            notes,
                            tags: mergedTags,
                        }
                    });
                    await loadPrompts();
                    await loadFilterOptions();
                    toast('Updated: ' + sourcePrompt.title, 'success');
                    return { id: sourcePrompt.id, replaced: true };
                } catch {
                    toast('Could not update prompt', 'error');
                    return null;
                }
            }
        }
        try {
            const result = await api('/prompts', {
                method: 'POST',
                body: {
                    title: newTitle,
                    content: text,
                    description,
                    categories: 'Prompt Engineering',
                    tags,
                    notes: extraNote || '',
                }
            });
            await loadPrompts();
            await loadFilterOptions();
            toast('Saved: ' + newTitle, 'success');
            return { id: result?.id, replaced: false };
        } catch {
            toast('Could not save', 'error');
            return null;
        }
    }

    

    // Classify prompt lines into structural components. Offline, keyword-scored.
    // Returns { role, context, task, constraints, format, examples, other } — arrays of lines.
    function _wsSplitComponents(text) {
        const out = {
            role: [],
            context: [],
            task: [],
            constraints: [],
            format: [],
            examples: [],
            other: []
        };
        const RX = {
            role: /\b(you are|act as|act like|adopt the|persona of|role of|behave as|you're an?|assume the role)\b/i,
            constraints: /\b(don'?t|do not|never|avoid|must not|no more than|at most|at least|limit(?:ed)? to|only|exclude|without|refuse|forbidden|not allowed)\b/i,
            format: /\b(format|bullet|bulleted|numbered list|table|json|xml|yaml|markdown|heading|word count|words? max|paragraphs?|respond in|output.{0,12}(as|in)|structure your|tone[:\s]|begin with|end with|no preamble)\b/i,
            examples: /\b(example|e\.g\.|for instance|for example|such as|input:|output:|sample)\b/i,
            task: /\b(write|create|generate|analy[sz]e|summari[sz]e|list|explain|rewrite|classify|extract|translate|design|draft|produce|evaluate|compare|review|identify|describe|outline|build|compose|convert|improve|suggest|recommend|brainstorm|critique|answer|research)\b/i,
            context: /\b(context|background|given|about|we are|our company|the user|scenario|situation|currently|working on|audience|reader)\b/i,
        };
        const lines = (text || '').split(/\n+/).map(l => l.trim()).filter(Boolean);
        lines.forEach((line, i) => {
            // Score each bucket; first-line role bias, early-line context bias.
            const scores = {
                role: (RX.role.test(line) ? 3 : 0) + (i === 0 ? 1 : 0),
                constraints: RX.constraints.test(line) ? 2.5 : 0,
                format: RX.format.test(line) ? 2.5 : 0,
                examples: RX.examples.test(line) ? 2 : 0,
                task: (RX.task.test(line) ? 2 : 0),
                context: (RX.context.test(line) ? 1.5 : 0) + (i > 0 && i < 3 ? 0.5 : 0),
            };
            let best = 'other',
                bestScore = 1; // below 1 → other
            Object.keys(scores).forEach(k => {
                if (scores[k] > bestScore) {
                    best = k;
                    bestScore = scores[k];
                }
            });
            out[best].push(line);
        });
        return out;
    }

    

    function _qfMemory() {
        try {
            return JSON.parse(localStorage.getItem(QF_MEM_KEY) || '{}');
        } catch {
            return {};
        }
    }

    

    function _qfRemember(vals) {
        const mem = _qfMemory();
        Object.assign(mem, vals);
        const keys = Object.keys(mem);
        if (keys.length > 200) keys.slice(0, keys.length - 200).forEach(k => delete mem[k]);
        localStorage.setItem(QF_MEM_KEY, JSON.stringify(mem));
    }

    

    function _qfWords(name) {
        return (name || '')
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
            .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
            .split(/[^a-zA-Z0-9]+/)
            .map(w => w.toLowerCase())
            .filter(Boolean);
    }

    

    function _qfFieldControlHtml(v, idx, value) {
        const attrs = 'data-qf-idx="' + idx + '"';
        if (v.type === 'boolean') {
            const opts = ['', 'Yes', 'No'].map(o =>
                '<option value="' + o + '"' + (value === o ? ' selected' : '') + '>' + (o || '\u2014') + '</option>'
            ).join('');
            return '<select class="forge-input qf-var-input" ' + attrs + '>' + opts + '</select>';
        }
        if (v.type === 'number') {
            return '<input type="number" class="forge-input qf-var-input" ' + attrs +
                ' value="' + escapeAttr(value) + '" placeholder="' + escapeAttr(v.token) + '" />';
        }
        const rows = v.type === 'longtext' ? 3 : 1;
        return '<textarea class="forge-input qf-var-input" ' + attrs + ' rows="' + rows + '" placeholder="' +
            escapeAttr(v.token) + '">' + escapeHtml(value) + '</textarea>';
    }

    

    function _qfWireFieldInput(el) {
        const evt = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(evt, () => {
            if (el.tagName === 'TEXTAREA') {
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            }
            _qfRenderPreview();
        });
    }

    

    function _audScore(text) {
        const t = (text || '').trim();
        const lower = t.toLowerCase();
        const words = (t.match(/\S+/g) || []).length;
        const dims = {};
        const findings = [];

        // Role & persona
        const hasRole = /\b(you are|act as|act like|adopt|persona of|role of|behave as)\b/i.test(t);
        dims['Role & persona'] = hasRole ? 95 : 25;
        if (!hasRole) findings.push({
            sev: 'low',
            text: 'No role or persona set. Opening with "You are a…" anchors expertise and voice.'
        });

        // Task clarity
        const verbRx = /\b(write|create|generate|analy[sz]e|summari[sz]e|list|explain|rewrite|classify|extract|translate|design|draft|produce|evaluate|compare|review|identify|describe|outline|build|compose)\b/i;
        const hasVerb = verbRx.test(t);
        const hasQuant = /\b\d+\b|\b(one|two|three|four|five|ten)\b/i.test(t);
        dims['Task clarity'] = (hasVerb ? 55 : 15) + (hasQuant ? 25 : 5) + (words >= 8 ? 15 : 0);
        if (!hasVerb) findings.push({
            sev: 'high',
            text: 'No clear action verb found. State exactly what the AI should do (write, analyse, list…).'
        });
        if (words < 8) findings.push({
            sev: 'med',
            text: 'Very short prompt (' + words + ' words). Underspecified prompts produce generic output.'
        });

        // Context
        const hasCtx = /\b(context|background|given|about|audience|scenario|we are|the user|for a|aimed at)\b/i.test(t) || words > 60;
        dims['Context'] = hasCtx ? 80 : 30;
        if (!hasCtx) findings.push({
            sev: 'med',
            text: 'No background or audience context. Say who it is for and what situation it serves.'
        });

        // Constraints
        const hasCons = /\b(don'?t|do not|never|avoid|must|no more than|at most|at least|limit|only|exclude|without)\b/i.test(t);
        dims['Constraints'] = hasCons ? 85 : 35;
        if (!hasCons) findings.push({
            sev: 'low',
            text: 'No constraints. Boundaries ("no jargon", "max 200 words") sharpen results.'
        });

        // Output format
        const hasFmt = /\b(format|bullet|numbered|table|json|xml|markdown|heading|word count|words|paragraphs?|tone|respond in|structure)\b/i.test(t);
        dims['Output format'] = hasFmt ? 90 : 30;
        if (!hasFmt) findings.push({
            sev: 'med',
            text: 'No output format specified. Say how the answer should be structured.'
        });

        // Examples
        const hasEx = /\b(example|e\.g\.|for instance|for example|such as|input:|output:)\b/i.test(t);
        dims['Examples'] = hasEx ? 90 : 45;

        // Extra findings beyond the rubric
        const vagueHits = AUD_VAGUE.filter(w => new RegExp('\\b' + w.replace('.', '\\.') + '\\b', 'i').test(lower));
        if (vagueHits.length >= 2) findings.push({
            sev: 'med',
            text: 'Vague wording: ' + vagueHits.slice(0, 5).map(w => '“' + w + '”').join(', ') + '. Swap for concrete terms.'
        });
        const placeholders = _qfExtractVars(t);
        if (placeholders.length) findings.push({
            sev: 'high',
            text: placeholders.length + ' unfilled placeholder' + (placeholders.length > 1 ? 's' : '') + ' (' + placeholders.slice(0, 3).map(p => p.token).join(', ') + '…). Fill them in Quick Fill before running.'
        });
        if (words > 120 && !t.includes('\n')) findings.push({
            sev: 'med',
            text: 'Wall of text — ' + words + ' words with no line breaks. Split into sections or bullets.'
        });
        if (/\b(concise|brief|short)\b/i.test(t) && /\b(detailed|comprehensive|in-depth|thorough)\b/i.test(t)) {
            findings.push({
                sev: 'high',
                text: 'Conflicting instructions: asks for both concise and detailed output. Pick one or scope each.'
            });
        }
        if (/ignore (all |any )?(previous|prior|above) instructions/i.test(t)) {
            findings.push({
                sev: 'high',
                text: 'Contains "ignore previous instructions" — commonly flagged or misinterpreted by models.'
            });
        }

        const vals = Object.values(dims);
        const overall = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        return {
            overall,
            dims,
            findings,
            words,
            tokens: _wsEstTokens(t)
        };
    }

    

    function _snipLoad() {
        try {
            _snipBlocks = JSON.parse(localStorage.getItem(SNIP_LS_KEY) || '[]');
        } catch {
            _snipBlocks = [];
        }
    }

    

    function _snipUID() {
        return 'snip_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    }

    

    function _snipSeedTemplates() {
        const seeded = localStorage.getItem('pl_snip_seeded');
        if (seeded) return;
        _snipBlocks = SNIP_TEMPLATES.map((t, i) => ({
            id: 'tpl_' + i + '_' + Math.random().toString(36).slice(2, 6),
            title: t.title,
            category: t.category,
            content: t.content,
            created: new Date().toISOString(),
        }));
        _snipSave();
        localStorage.setItem('pl_snip_seeded', '1');
    }

    

    function _snipPanelSaveNew() {
        const title = ($('#snipPanelNewTitle')?.value || '').trim();
        const category = $('#snipPanelNewCat')?.value || 'Other';
        const content = ($('#snipPanelNewContent')?.value || '').trim();
        if (!title) {
            toast('Give the snippet a title', 'warning');
            return;
        }
        if (!content) {
            toast('Add content to the snippet', 'warning');
            return;
        }
        _snipLoad();
        _snipBlocks.unshift({
            id: _snipUID(),
            title,
            category,
            content,
            created: new Date().toISOString()
        });
        _snipSave();
        if ($('#snipPanelNewTitle')) $('#snipPanelNewTitle').value = '';
        if ($('#snipPanelNewContent')) $('#snipPanelNewContent').value = '';
        const details = $('#snipPanelAddDetails');
        if (details) details.open = false;
        _snipPanelRefresh();
        toast('Snippet saved', 'success');
    }



    


    // Repaint the Settings > Licence Key panel from state. Safe to call any time.
    function refreshLicencePanel() {
        const box = $('#licenceStatus');
        const text = $('#licenceStatusText');
        const btn = $('#licenceActivateBtn');
        const input = $('#settingsLicenceKeyInput');
        if (!box || !text || !btn || !input) return;

        if (state.isPremium) {
            box.style.borderLeftColor = 'var(--success)';
            text.textContent = 'Licensed \u2014 Pro features unlocked';
            text.style.color = 'var(--success)';
            input.value = _maskLicenceKey(state.licenceKey);
            input.disabled = true;
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined">check</span> Activated';
        } else {
            box.style.borderLeftColor = 'var(--ink-3)';
            text.textContent = 'Not licensed \u2014 enter your key to unlock Pro features';
            text.style.color = 'var(--ink-3)';
            input.disabled = false;
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined">vpn_key</span> Activate Licence';
        }
    }

    

        const run = async () => {
            if (btn.disabled) return;
            const key = input.value.trim();
            if (!key) {
                status.textContent = 'Enter a licence key';
                status.style.color = 'var(--ink-3)';
                input.focus();
                return;
            }
            btn.disabled = true;
            status.textContent = 'Checking\u2026';
            status.style.color = 'var(--ink-3)';
            try {
                if (await _validateAndStoreKey(key)) {
                    status.textContent = 'Pro unlocked \u2014 thank you!';
                    status.style.color = 'var(--success)';
                    toast('Pro unlocked - thank you!', 'success');
                    refreshLicencePanel();
                } else {
                    status.textContent = 'Invalid licence key';
                    status.style.color = 'var(--danger)';
                    btn.disabled = false;
                }
            } catch (e) {
                status.textContent = 'Invalid licence key';
                status.style.color = 'var(--danger)';
                btn.disabled = false;
            }
        };

    function _brSubstitute(text, values) {
        Object.keys(values).forEach(name => {
            const val = values[name];
            if (val === undefined || val === null) return;
            ['[[' + name + ']]', '{{' + name + '}}', '((' + name + '))'].forEach(tok => {
                text = text.split(tok).join(val);
            });
        });
        return text;
    }

    

    // A first line naming every detected variable makes the block CSV.
    // Otherwise one line = one value for the single variable, or one raw input.
    function _brParseRows(raw, vars) {
        const lines = (raw || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (!lines.length) return [];
        if (vars.length) {
            const header = _brSplitCsv(lines[0]);
            const isHeader = header.length === vars.length && header.every(h => vars.includes(h));
            if (isHeader) {
                return lines.slice(1).map(l => {
                    const cells = _brSplitCsv(l);
                    const row = {};
                    header.forEach((h, i) => { row[h] = cells[i] || ''; });
                    return row;
                });
            }
            const only = vars[0];
            return lines.map(l => ({ [only]: l }));
        }
        return lines.map(l => ({ __input: l }));
    }

    

    function _brCsv() {
        const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
        const cols = _brVars.length ? _brVars : ['input'];
        const head = ['#', ...cols, 'status', 'output'].map(cell).join(',');
        const body = _brResults.map((r, i) => {
            const row = _brRows[i] || {};
            const vals = _brVars.length ? _brVars.map(v => row[v]) : [row.__input];
            return [i + 1, ...vals, r.status, r.output].map(cell).join(',');
        });
        return [head, ...body].join('\n');
    }

    

    function getCategoryChipsEl() {
        return $('#categoryChips');
    }

    

    function getChipCategories() {
        try {
            return JSON.parse(getCategoryHiddenEl()?.value || '[]');
        } catch {
            return [];
        }
    }

    

    function resetCategoryChips() {
        const container = getCategoryChipsEl();
        if (!container) return;
        // Remove selected from presets
        container.querySelectorAll('.cat-chip').forEach(ch => ch.classList.remove('selected'));
        // Remove custom chips
        container.querySelectorAll('.cat-chip.custom-chip').forEach(ch => ch.remove());
        _syncHidden(container);
    }

    

    function _ensureChip(container, val) {
        if (!container.querySelector(`.cat-chip[data-cat="${CSS.escape(val)}"]`)) {
            _addCustomChip(container, val);
        }
    }

    

    function _toggleChip(chip, container) {
        const isSelected = chip.classList.contains('selected');
        const selectedCount = container.querySelectorAll('.cat-chip.selected').length;
        if (!isSelected && selectedCount >= MAX_CATS) {
            toast(`Maximum ${MAX_CATS} categories allowed`, 'warning');
            return;
        }
        chip.classList.toggle('selected');
        _syncHidden(container);
    }

    

        function addCustom() {
            const val = input?.value.trim();
            if (!val) return;
            if (container.querySelector(`.cat-chip[data-cat="${CSS.escape(val)}"]`)) {
                toast('Category already exists', 'info');
                input.value = '';
                return;
            }
            _addCustomChip(container, val);
            input.value = '';
            // Auto-select the new chip
            const newChip = container.querySelector(`.cat-chip[data-cat="${CSS.escape(val)}"]`);
            if (newChip) _toggleChip(newChip, container);
        }

        

    function switchPromptBlockTab(name) {
        $$('.prompt-block-tab').forEach(t => t.classList.toggle('active', t.dataset.ptab === name));
        $$('.prompt-block-pane').forEach(p => p.classList.toggle('active', p.id === `ptab-${name}`));
    }

    

    function initConversationButtons() {
        $('#addUserMsgBtn')?.addEventListener('click', () => {
            addChatTurnWithRole('user');
        });
        $('#addAssistantMsgBtn')?.addEventListener('click', () => {
            addChatTurnWithRole('assistant');
        });
    }

    

    async function callAI(systemPrompt, userMsg, maxTokens) {
        maxTokens = maxTokens || 1200;
        const provider = localStorage.getItem('pl_ai_provider') || 'openai';
        const apiKey = localStorage.getItem('pl_api_key_' + provider) || '';
        if (!apiKey) throw new Error('No API key — add one in Settings (⚙ bottom left)');

        if (provider === 'openai') {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'system',
                        content: systemPrompt
                    }, {
                        role: 'user',
                        content: userMsg
                    }],
                    max_tokens: maxTokens
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return (data.choices?.[0]?.message?.content || '').trim();

        } else if (provider === 'anthropic') {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-haiku-4-5-20251001',
                    system: systemPrompt,
                    messages: [{
                        role: 'user',
                        content: userMsg
                    }],
                    max_tokens: maxTokens
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
            return (data.content?.[0]?.text || '').trim();

        } else if (provider === 'gemini') {
            const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: systemPrompt + '\n\n' + userMsg
                        }]
                    }],
                    generationConfig: {
                        maxOutputTokens: 2000
                    }
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();

        } else if (provider === 'openrouter') {
            const model = localStorage.getItem('pl_openrouter_model') || 'openai/gpt-4o-mini';
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify({
                    model,
                    messages: [{
                        role: 'system',
                        content: systemPrompt
                    }, {
                        role: 'user',
                        content: userMsg
                    }],
                    max_tokens: maxTokens
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return (data.choices?.[0]?.message?.content || '').trim();
        }
        throw new Error('Unknown provider: ' + provider);
    }

    

    async function refreshModalCategories() {
        const container = $('#categoryChips');
        if (!container) return;

        // Get all categories from the loaded filter state
        const dbCats = (state.filters && state.filters.categories || []).map(c => c.value);

        // Preset list (always show these)
        const presets = ['Business', 'Writing', 'Programming', 'Design', 'Productivity',
            'Marketing', 'Research', 'Education', 'Analysis', 'Personal Growth',
            'Prompt Engineering'
        ];

        // Merge: presets first, then any DB cats not already in presets
        const all = [...new Set([...presets, ...dbCats])];

        // Preserve currently selected
        const selected = getChipCategories();

        // Re-render chips
        // Keep custom chips (user-added this session), remove preset chips and re-add merged list
        const customChips = [...container.querySelectorAll('.cat-chip.custom-chip')];
        container.querySelectorAll('.cat-chip:not(.custom-chip)').forEach(el => el.remove());

        // Add merged preset+db chips before custom chips
        all.forEach(cat => {
            if (container.querySelector(`.cat-chip[data-cat="${CSS.escape(cat)}"]`)) return;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'cat-chip';
            btn.dataset.cat = cat;
            btn.textContent = cat;
            btn.addEventListener('click', () => _toggleChip(btn, container));
            // Insert before first custom chip
            const firstCustom = container.querySelector('.cat-chip.custom-chip');
            if (firstCustom) container.insertBefore(btn, firstCustom);
            else container.appendChild(btn);
        });

        // Re-apply selections
        setChipCategories(selected);
    }



    

    async function runAutoTag() {
        const promptText = ($('#promptContent')?.value || '').trim();
        if (!promptText) {
            toast('Add your prompt content first', 'warning');
            return;
        }

        const btn = $('#autoTagBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;animation:spin 1s linear infinite">progress_activity</span> Tagging...';
        }

        try {
            // Gather existing vocabulary from state
            const existingCats = (state.filters.categories || []).map(c => c.value);
            const existingTags = (state.filters.tags || []).map(t => t.value);
            const existingFolders = (state.folders || []).map(f => f.name || f.title || '').filter(Boolean);

            const sys = 'You are a prompt library assistant. Your job is to tag a prompt using ONLY values from the lists provided. Return valid JSON only — no explanation, no markdown.';
            const usr = 'PROMPT:\n' + promptText.slice(0, 800) +
                '\n\nEXISTING CATEGORIES (pick 1-3 that fit best):\n' + (existingCats.length ? existingCats.join(', ') : 'none') +
                '\n\nEXISTING TAGS (pick 2-5 that fit best):\n' + (existingTags.length ? existingTags.join(', ') : 'none') +
                '\n\nEXISTING FOLDERS (pick 1 if relevant, else null):\n' + (existingFolders.length ? existingFolders.join(', ') : 'none') +
                '\n\nRespond with ONLY this JSON (no extra text):\n{"categories":["..."],"tags":["..."],"folder":"...or null"}';

            const response = await callAI(sys, usr, 300);

            // Parse — strip any accidental markdown fencing
            const clean = response.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();
            const result = JSON.parse(clean);

            // Apply categories — only values that exist in our list
            if (Array.isArray(result.categories) && result.categories.length) {
                const valid = result.categories.filter(c => existingCats.some(e => e.toLowerCase() === c.toLowerCase()));
                if (valid.length) setChipCategories(valid);
            }

            // Apply tags — only values that exist in our list
            if (Array.isArray(result.tags) && result.tags.length) {
                const valid = result.tags.filter(t => existingTags.some(e => e.toLowerCase() === t.toLowerCase()));
                if (valid.length) setTagInputValues('tagsTagInput', valid);
            }

            // Apply folder — only if it matches an existing folder name
            if (result.folder && result.folder !== 'null' && existingFolders.length) {
                const match = (state.folders || []).find(f =>
                    (f.name || f.title || '').toLowerCase() === result.folder.toLowerCase()
                );
                if (match) {
                    const sel = $('#promptFolder');
                    if (sel) sel.value = match.id;
                }
            }

            toast('Auto-tagged from your existing library', 'success');

        } catch (err) {
            // If AI not configured, give a clear message
            if (err.message && err.message.includes('No API key')) {
                toast('Add an API key in Settings first (⚙ bottom left)', 'error');
            } else {
                toast('Auto-tag failed: ' + err.message, 'error');
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">auto_fix_high</span> Auto-tag';
            }
        }
    }


    

    function runSmartTag() {
        const promptText = ($('#promptContent')?.value || '').trim().toLowerCase();
        if (!promptText) {
            toast('Write your prompt content first', 'warning');
            return;
        }

        const existingCats = (state.filters.categories || []).map(c => c.value);
        const existingTags = (state.filters.tags || []).map(t => t.value);

        if (!existingCats.length && !existingTags.length) {
            toast('No tags or categories in your library yet', 'warning');
            return;
        }

        // Tokenise prompt — words 3+ chars, remove stop words
        const stop = new Set(['the', 'and', 'for', 'that', 'with', 'this', 'your', 'from', 'will',
            'are', 'have', 'has', 'been', 'its', 'our', 'their', 'into', 'not', 'but', 'can', 'you',
            'all', 'any', 'each', 'more', 'also', 'when', 'how', 'what', 'which', 'then', 'than',
            'use', 'used', 'using', 'should', 'would', 'could', 'may', 'must', 'need', 'make', 'write',
            'give', 'list', 'help', 'provide', 'create', 'generate', 'output', 'response', 'based'
        ]);
        const words = promptText.match(/\b[a-z]{3,}\b/g) || [];
        const promptWords = new Set(words.filter(w => !stop.has(w)));

        function score(label) {
            const labelWords = label.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
            if (!labelWords.length) return 0;
            let hits = 0;
            labelWords.forEach(w => {
                if (promptWords.has(w)) hits++;
            });
            // Also check if any prompt word contains the label word (partial match)
            labelWords.forEach(w => {
                if (hits === 0 && promptText.includes(w)) hits += 0.5;
            });
            return hits / labelWords.length;
        }

        const topCats = existingCats
            .map(c => ({
                value: c,
                score: score(c)
            }))
            .filter(x => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(x => x.value);

        const topTags = existingTags
            .map(t => ({
                value: t,
                score: score(t)
            }))
            .filter(x => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(x => x.value);

        if (!topCats.length && !topTags.length) {
            toast('No strong keyword matches found — try AI tag for deeper analysis', 'info');
            return;
        }

        if (topCats.length) setChipCategories(topCats);
        if (topTags.length) setTagInputValues('tagsTagInput', topTags);

        const msg = [
            topCats.length ? topCats.length + ' categor' + (topCats.length > 1 ? 'ies' : 'y') : '',
            topTags.length ? topTags.length + ' tag' + (topTags.length > 1 ? 's' : '') : ''
        ].filter(Boolean).join(' + ');
        toast('Smart-tagged: ' + msg, 'success');
    }

    

    function updateTokenCounter(text) {
        const charCount = text ? text.length : 0;
        const charEl = $('#tokenCharCount');
        const avgEl = $('#tokenAvgCount');
        const listEl = $('#tokenModelList');
        if (!listEl) return;

        if (charEl) charEl.textContent = charCount.toLocaleString('en-GB');

        if (!text || charCount < 1) {
            if (avgEl) avgEl.textContent = '0';
            listEl.innerHTML = _TOKEN_MODELS.map(m => _tokenRow(m, 0)).join('');
            return;
        }

        const rows = _TOKEN_MODELS.map(m => {
            const est = Math.round(charCount / m.divisor);
            return {
                ...m,
                est
            };
        });

        const avg = Math.round(rows.reduce((s, r) => s + r.est, 0) / rows.length);
        if (avgEl) avgEl.textContent = avg.toLocaleString('en-GB');

        listEl.innerHTML = rows.map(r => _tokenRow(r, r.est)).join('');
    }

    

    function _el(id) {
        return document.getElementById(id);
    }

    

    function _closeTourWorkspaces() {
        WS_SELECTORS.forEach(function(sel) {
            const el = document.querySelector(sel);
            if (el && el.classList.contains('open')) el.classList.remove('open');
        });
        // Workspaces lock body scroll on open — always restore it.
        document.body.style.overflow = '';
        document.querySelectorAll('.nav-item[data-view]').forEach(function(el) {
            el.classList.toggle('active', el.dataset.view === 'library');
        });
    }

    

    // bounds are correct synchronously once .open lands — _spotlightOn forces the
    // reflow via getBoundingClientRect. No rAF (it throttles in background tabs).
    function _reconcileView(s, done) {
        const fnName = s.open ? OPEN_FNS[s.open] : null;
        if (fnName && typeof window[fnName] === 'function') {
            _closeTourDetail();
            const keep = '#' + s.open + 'Workspace';
            WS_SELECTORS.forEach(function(sel) {
                if (sel === keep) return;
                const el = document.querySelector(sel);
                if (el && el.classList.contains('open')) el.classList.remove('open');
            });
            try {
                window[fnName]();
            } catch (e) {}
            done();
            return;
        }
        if (s.openDetail) {
            // Library underneath stays in the DOM, so a prompt card is available.
            _closeTourWorkspaces();
            const guard = _step;
            const pr = _openTourDetail();
            // Spotlight only after the panel has slid in (0.35s) — and only if the user
            // hasn't moved on. getBoundingClientRect mid-slide gives the wrong rect.
            // If they did move on (fast clicks can resolve openDetail's fetch late),
            // close the now-stray panel instead of leaving it behind a later view.
            const settle = function() {
                if (_step === guard) {
                    done();
                } else {
                    _closeTourDetail();
                }
            };
            if (pr && typeof pr.then === 'function') {
                pr.then(function() {
                    setTimeout(settle, 380);
                }, function() {
                    setTimeout(settle, 380);
                });
            } else {
                setTimeout(settle, 420);
            }
            return;
        }
        _closeTourWorkspaces();
        _closeTourDetail();
        done();
    }

    

    window.PL_onboardNext = function() {
        if (_step < TOTAL - 1) {
            _step++;
            _render(_step);
        } else {
            window.PL_skipOnboarding();
        }
    };

    window.PL_onboardBack = function() {
        if (_step > 0) {
            _step--;
            _render(_step);
        }
    };

    function _formatDate(iso) {
        if (!iso) return '';
        try {
            return new Date(iso).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            return iso;
        }
    }

    

    function _positionHighlight(rect) {
        var h = _el('tutorialHighlight');
        if (!h) return;
        if (!rect) {
            h.classList.remove('active');
            h.style.width = '0';
            h.style.height = '0';
            h.style.top = '-9999px';
            h.style.left = '-9999px';
            return;
        }
        var pad = 6;
        h.style.top = (rect.top - pad) + 'px';
        h.style.left = (rect.left - pad) + 'px';
        h.style.width = (rect.width + pad * 2) + 'px';
        h.style.height = (rect.height + pad * 2) + 'px';
        h.classList.add('active');
    }

    

    window.PL_startTutorial = function() {
        _step = 0;
        _show();
        // Small delay so DOM is fully painted before positioning
        setTimeout(function() {
            _renderStep(0);
        }, 80);
    };

    window.PL_endTutorial = function() {
        _hide();
        localStorage.setItem('pl_tutorial_seen', '1');
    };

    window.PL_tutorialNext = function() {
        var step = STEPS[_step];
        if (step && step.isLast) {
            window.PL_endTutorial();
            return;
        }
        if (step && step.onNext) step.onNext();
        _step = Math.min(_step + 1, STEPS.length - 1);
        // Small delay if we just navigated to a new workspace
        setTimeout(function() {
            _renderStep(_step);
        }, 120);
    };

    window.PL_tutorialBack = function() {
        if (_step === 0) return;
        _step--;
        setTimeout(function() {
            _renderStep(_step);
        }, 60);
    };
