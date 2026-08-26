/* Workspaces launcher grid — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */


    /* Last three tools opened, most recent first. */
    function _launcherRecentList() {
        try {
            const raw = JSON.parse(localStorage.getItem('pl_ws_recent') || '[]');
            return Array.isArray(raw) ? raw : [];
        } catch (e) {
            return [];
        }
    }

    

    function _renderLauncherRecent() {
        const wrap = $('#launcherRecent');
        const row = $('#launcherRecentRow');
        if (!wrap || !row) return;
        const cards = _launcherRecentList()
            .map(fn => $(`#launcherGrid .launcher-card[data-open="${fn}"]`))
            .filter(Boolean)
            .slice(0, 3);
        if (!cards.length) {
            wrap.hidden = true;
            row.innerHTML = '';
            return;
        }
        row.innerHTML = cards.map(c => {
            const icon = c.querySelector('.launcher-card-icon')?.textContent.trim() || 'grid_view';
            const title = c.querySelector('.launcher-card-title')?.textContent.trim() || '';
            const isPro = c.dataset.premium === 'true';
            return `<button class="launcher-recent-card" data-open="${escapeAttr(c.dataset.open)}" data-premium="${isPro}">
            <span class="material-symbols-outlined">${escapeHtml(icon)}</span>
            <span class="launcher-recent-title">${escapeHtml(title)}</span>
            ${isPro ? '<span class="launcher-card-pro">PRO</span>' : ''}
          </button>`;
        }).join('');
        wrap.hidden = false;
    }

    

    function closeWorkspacesLauncher() {
        $('#workspacesLauncher')?.classList.remove('open');
        $$('.nav-item[data-view]').forEach(el =>
            el.classList.toggle('active', el.dataset.view === 'library'));
    }

    
