/* Sidebar / primary navigation — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    function renderSidebarFilters() {
        const cats = $('#categoriesList');
        const tags = $('#tagsList');
        if (cats) {
            const catCountEl = $('#categoriesSectionCount');
            if (catCountEl) catCountEl.textContent = state.filters.categories.length || '';
            if (!state.filters.categories.length) {
                cats.innerHTML = '<p class="filter-list-empty">None yet</p>';
            } else {
                const sortedCats = [...state.filters.categories].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
                cats.innerHTML = sortedCats.map(c =>
                    '<div class="filter-list-item" data-filter-cat="' + escapeHtml(c.value) + '">' +
                    '<span class="material-symbols-outlined">category</span>' +
                    '<span>' + escapeHtml(c.value) + '</span>' +
                    '<span class="filter-count">' + c.count + '</span>' +
                    '</div>'
                ).join('');
                cats.querySelectorAll('[data-filter-cat]').forEach(el => {
                    el.addEventListener('click', () => window.PL_filterByCategory(el.dataset.filterCat));
                });
            }
        }
        if (tags) {
            const all = [...(state.filters.tags || [])].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
            const tagCountEl = $('#tagsSectionCount');
            if (tagCountEl) tagCountEl.textContent = all.length || '';
            const wrap = $('#tagSearchWrap');
            if (wrap) wrap.hidden = all.length <= 8;
            if (!all.length) {
                tags.innerHTML = '<p class="filter-list-empty">None yet</p>';
            } else {
                const q = (_tagSearchQ || '').trim().toLowerCase();
                const filtered = q ? all.filter(t => t.value.toLowerCase().includes(q)) : all;
                const LIMIT = 15;
                const showAll = _tagsExpanded || !!q;
                const shown = showAll ? filtered : filtered.slice(0, LIMIT);
                const hiddenCount = filtered.length - shown.length;
                let html = '<div class="tag-cloud">' + shown.map(t =>
                    '<button type="button" class="tag-pill" data-filter-tag="' + escapeHtml(t.value) + '">' +
                    '#' + escapeHtml(t.value) +
                    '<span class="tag-pill-count">' + t.count + '</span>' +
                    '</button>'
                ).join('') + '</div>';
                if (q && !filtered.length) {
                    html += '<p class="filter-list-empty">No tags match</p>';
                } else if (hiddenCount > 0) {
                    html += '<button type="button" class="tag-more-btn" id="tagMoreBtn">Show all ' + filtered.length + ' tags</button>';
                } else if (_tagsExpanded && !q && all.length > LIMIT) {
                    html += '<button type="button" class="tag-more-btn" id="tagMoreBtn">Show less</button>';
                }
                tags.innerHTML = html;
                tags.querySelectorAll('[data-filter-tag]').forEach(el => {
                    el.addEventListener('click', () => window.PL_filterByTag(el.dataset.filterTag));
                });
                $('#tagMoreBtn')?.addEventListener('click', () => {
                    _tagsExpanded = !_tagsExpanded;
                    renderSidebarFilters();
                });
            }
        }
        // Keep tag-input autocomplete lists fresh
        // category chips are static presets -- no known-values update needed
        updateTagInputKnown('tagsTagInput', (state.filters.tags || []).map(t => t.value));
    }

    

    function initTagManager() {
        const openBtn = $('#tagManagerBtn');
        const modal = $('#tagManagerModal');
        if (!openBtn || !modal) return;
        openBtn.addEventListener('click', e => {
            e.stopPropagation();
            renderTagManager();
            modal.classList.add('active');
        });
        const close = () => modal.classList.remove('active');
        $('#closeTagManagerBtn')?.addEventListener('click', close);
        $('#tagManagerDoneBtn')?.addEventListener('click', close);
        modal.addEventListener('click', e => {
            if (e.target === modal) close();
        });
        $('#tagManagerList')?.addEventListener('click', async e => {
            const row = e.target.closest('.tag-manager-row');
            if (!row) return;
            const tag = row.dataset.tag;
            if (e.target.closest('[data-tm-delete]')) {
                if (!confirm('Remove #' + tag + ' from every prompt?')) return;
                const n = await tagManagerAction(tag, '');
                if (n !== null) toast('Removed #' + tag + ' from ' + n + ' prompt' + (n === 1 ? '' : 's'), 'success');
                return;
            }
            if (e.target.closest('[data-tm-rename]')) {
                const next = prompt('Rename #' + tag + ' to:', tag);
                if (next === null) return;
                const clean = next.trim().replace(/^#+/, '').replace(/,/g, ' ').trim();
                if (!clean || clean === tag) return;
                const exists = (state.filters.tags || []).some(t =>
                    t.value.toLowerCase() === clean.toLowerCase() && t.value.toLowerCase() !== tag.toLowerCase());
                if (exists && !confirm('#' + clean + ' already exists -- merge #' + tag + ' into it?')) return;
                const n = await tagManagerAction(tag, clean);
                if (n !== null) toast((exists ? 'Merged into #' : 'Renamed to #') + clean + ' (' + n + ' prompt' + (n === 1 ? '' : 's') + ')', 'success');
            }
        });
    }

    

    async function handleFolderSubmit(e) {
        e.preventDefault();
        const id = $('#folderId').value;
        const name = $('#folderName').value.trim();
        if (!name) return;
        // Free tier folder limit
        if (!id && !state.isPremium) {
            const folderCount = document.querySelectorAll('#foldersList .folder-item').length;
            if (folderCount >= FREE_LIMITS.folders) {
                toast(`Free plan limit: ${FREE_LIMITS.folders} folders. Upgrade to Pro for unlimited.`, 'warning');
                showPremiumModal();
                return;
            }
        }
        try {
            const url = id ? `/folders/${id}` : '/folders';
            const method = id ? 'PUT' : 'POST';
            await api(url, {
                method,
                body: {
                    name
                }
            });
            closeFolderModal();
            await loadFolders();
            await loadPrompts();
            toast(id ? 'Folder renamed' : 'Folder created', 'success');
        } catch (err) {
            toast('Could not save folder', 'error');
        }
    }

    

    window.createFolderInline = function() {
        const name = prompt('Folder name:');
        if (!name || !name.trim()) return;
        // Free tier folder limit
        if (!state.isPremium) {
            const folderCount = document.querySelectorAll('#foldersList .folder-item').length;
            if (folderCount >= FREE_LIMITS.folders) {
                toast(`Free plan limit: ${FREE_LIMITS.folders} folders. Upgrade to Pro for unlimited.`, 'warning');
                showPremiumModal();
                return;
            }
        }
        api('/folders', {
            method: 'POST',
            body: {
                name: name.trim()
            }
        }).then(async (folder) => {
            await loadFolders();
            if (folder && folder.id) $('#promptFolder').value = folder.id;
            toast('Folder created', 'success');
        }).catch(() => toast('Could not create folder', 'error'));
    };

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        state.theme = theme;
        localStorage.setItem('promptlib.theme', theme);
        const icon = $('#themeIcon');
        const label = $('#themeLabel');
        if (icon) icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
        if (label) label.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    }

    
