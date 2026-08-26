/* Command palette — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    function openCmdPalette() {
        if (!state.isPremium) {
            showPremiumModal();
            return;
        }
        $('#cmdPalette').classList.add('active');
        $('#cmdInput').value = '';
        cmdIndex = 0;
        renderCmdResults('');
        setTimeout(() => $('#cmdInput').focus(), 50);
    }

    

    function renderCmdResults(query) {
        const q = query.trim().toLowerCase();
        const actions = getCommandActions();
        const workspaces = getWorkspaceCommands();

        const matchCmd = list => q ?
            list.filter(a =>
                a.label.toLowerCase().includes(q) ||
                a.keywords.toLowerCase().includes(q)
            ) :
            list;

        const matchedActions = matchCmd(actions);
        const matchedWorkspaces = matchCmd(workspaces);

        const matchedPrompts = q ?
            state.prompts.filter(p =>
                (p.title || '').toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q) ||
                (p.content || '').toLowerCase().includes(q)
            ).slice(0, 12) :
            state.prompts
            .slice()
            .sort((a, b) => (b.use_count || 0) - (a.use_count || 0))
            .slice(0, 6);

        const promptItems = matchedPrompts.map(p => ({
            kind: 'prompt',
            prompt: p
        }));

        // With a query: commands first (people type verbs), then workspaces, then prompts.
        // Without: prompts (most-used) first, then workspaces, then commands.
        const items = q ? [...matchedActions, ...matchedWorkspaces, ...promptItems] : [...promptItems, ...matchedWorkspaces, ...matchedActions];

        cmdItems = items;
        cmdIndex = 0;

        const root = $('#cmdResults');
        if (!items.length) {
            root.innerHTML = '<div class="cmd-empty">No matches. Try “new”, “optimizer”, or “export”.</div>';
            return;
        }

        const sectionNames = {
            action: 'Commands',
            workspace: 'Workspaces',
            prompt: 'Prompts'
        };
        let lastKind = '';
        let html = '';
        items.forEach((item, i) => {
            if (item.kind !== lastKind) {
                html += `<div class="cmd-section-label">${sectionNames[item.kind]}</div>`;
                lastKind = item.kind;
            }
            if (item.kind === 'prompt') {
                const p = item.prompt;
                const desc = (p.description || p.content || '').replace(/\s+/g, ' ').slice(0, 90);
                const cat = (p.categories || [])[0] || '';
                html += `
        <div class="cmd-result cmd-result-rich ${i === 0 ? 'active' : ''}" data-idx="${i}">
          <span class="cmd-icon-tile"><span class="material-symbols-outlined">description</span></span>
          <span class="cmd-result-main">
            <span class="name">${escapeHtml(p.title)}</span>
            ${desc ? `<span class="cmd-result-desc">${escapeHtml(desc)}</span>` : ''}
          </span>
          ${cat ? `<span class="cmd-result-chip">${escapeHtml(cat)}</span>` : ''}
          <span class="hint">${(p.use_count || 0)} uses</span>
        </div>`;
            } else {
                html += `
        <div class="cmd-result ${i === 0 ? 'active' : ''}" data-idx="${i}">
          <span class="cmd-icon-tile"><span class="material-symbols-outlined">${item.icon}</span></span>
          <span class="name">${escapeHtml(item.label)}</span>
          ${item.hint ? `<span class="hint">${escapeHtml(item.hint)}</span>` : ''}
        </div>`;
            }
        });
        root.innerHTML = html;
    }

    


        /* ---- Render palette (category accordions) ---- */
        function renderPalette(query) {
            var body = $('#pcwPaletteBody');
            if (!body) return;
            var q = (query || '').trim().toLowerCase();

            var filtered = BLOCKS.filter(function(b) {
                var matchesCat = _activeCat === 'all' || b.cat === _activeCat;
                var matchesQ = !q || b.label.toLowerCase().indexOf(q) !== -1 || b.text.toLowerCase().indexOf(q) !== -1;
                return matchesCat && matchesQ;
            });

            var filteredFw = FRAMEWORKS.filter(function(f) {
                return !q || f.badge.toLowerCase().indexOf(q) !== -1 ||
                    f.name.toLowerCase().indexOf(q) !== -1 ||
                    f.desc.toLowerCase().indexOf(q) !== -1;
            });

            var search = $('#pcwPaletteSearch');

            if (filtered.length === 0 && filteredFw.length === 0) {
                body.innerHTML = '<div class="pcw-drop-hint" style="padding:var(--sp-5);flex:1">' +
                    '<span class="material-symbols-outlined" style="font-size:32px;opacity:.4">search_off</span>' +
                    '<p>No blocks match &ldquo;' + escH(q) + '&rdquo;</p></div>';
                if (search) search.classList.add('no-results');
                return;
            }
            if (search) search.classList.remove('no-results');

            var catOrder = CATEGORIES.map(function(c) {
                return c.id;
            });
            var groups = {};
            filtered.forEach(function(b) {
                if (!groups[b.cat]) groups[b.cat] = [];
                groups[b.cat].push(b);
            });

            var html = '';

            catOrder.forEach(function(catId) {
                if (!groups[catId] || groups[catId].length === 0) return;
                var catMeta = CATEGORIES.filter(function(c) {
                    return c.id === catId;
                })[0];
                var blocks = groups[catId];
                var sectionId = 'pcwCat_' + catId;

                html += '<div class="pcw-palette-section" id="' + sectionId + '" data-cat="' + catId +
                    '" style="--cat-color:' + catMeta.color + '">' +
                    '<div class="pcw-palette-section-header" data-toggle-section="' + sectionId + '">' +
                    '<span class="material-symbols-outlined pcw-cat-icon">' + catMeta.icon + '</span>' +
                    '<span class="pcw-palette-label">' + escH(catMeta.label) + '</span>' +
                    '<span class="pcw-palette-count">' + blocks.length + '</span>' +
                    '<span class="material-symbols-outlined pcw-section-chevron">expand_more</span>' +
                    '</div><div class="pcw-block-grid">';

                blocks.forEach(function(b, i) {
                    var globalIdx = BLOCKS.indexOf(b);
                    var blanks = countBlanks(b.text);
                    var snippet = escH(String(b.text).replace(/\s+/g, ' ').slice(0, 110));
                    html += '<div class="pcw-block-tile" role="button" tabindex="0" draggable="true" data-pcw-block="' + globalIdx +
                        '" data-cat="' + b.cat + '" title="Drag or click to add" style="--cat-color:' + _pcwCatColor(b.cat) +
                        ';animation-delay:' + (Math.min(i, 14) * 14) + 'ms">' +
                        '<span class="material-symbols-outlined pcw-row-icon">' + b.icon + '</span>' +
                        '<div class="pcw-row-main">' +
                        '<div class="pcw-row-top">' +
                        '<span class="pcw-block-tile-label">' + escH(b.label) + '</span>' +
                        (blanks ? '<span class="pcw-blank-chip" aria-label="' + blanks + ' placeholders">' + blanks + '</span>' : '') +
                        '</div>' +
                        '<div class="pcw-row-snippet">' + snippet + '</div>' +
                        '</div>' +
                        '<span class="material-symbols-outlined pcw-row-add" aria-hidden="true">add</span></div>';
                });
                html += '</div></div>';
            });

            // Frameworks section (show when All or no specific cat selected)
            if (filteredFw.length > 0) {
                html += '<div class="pcw-palette-section" id="pcwFwSection" data-cat="frameworks">' +
                    '<div class="pcw-palette-section-header" data-toggle-section="pcwFwSection">' +
                    '<span class="material-symbols-outlined pcw-cat-icon">extension</span>' +
                    '<span class="pcw-palette-label">Frameworks</span>' +
                    '<span class="pcw-palette-count">' + filteredFw.length + '</span>' +
                    '<span class="material-symbols-outlined pcw-section-chevron">expand_more</span>' +
                    '</div><div class="pcw-fw-list" id="pcwFwList">';
                filteredFw.forEach(function(f) {
                    var fwIdx = FRAMEWORKS.indexOf(f);
                    html += '<div class="pcw-fw-tile" draggable="true" data-pcw-fw="' + fwIdx +
                        '" title="Drag or click to add framework"><span class="pcw-fw-badge">' + escH(f.badge) +
                        '</span><div class="pcw-fw-info"><div class="pcw-fw-name">' + escH(f.name) +
                        '</div><div class="pcw-fw-desc">' + escH(f.desc) + '</div></div></div>';
                });
                html += '</div></div>';
            }

            body.innerHTML = html;

            // Wire collapse toggles
            body.querySelectorAll('[data-toggle-section]').forEach(function(hdr) {
                hdr.addEventListener('click', function() {
                    var secId = hdr.dataset.toggleSection;
                    var sec = document.getElementById(secId) || hdr.closest('.pcw-palette-section');
                    if (sec) sec.classList.toggle('collapsed');
                });
            });
        }

        
