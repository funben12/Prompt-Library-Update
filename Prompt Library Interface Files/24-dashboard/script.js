/* Dashboard — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    window.openDashboardWorkspace = function() {
        $('#dashboardWorkspace')?.classList.add('open');
        $$('.nav-item[data-view]').forEach(el =>
            el.classList.toggle('active', el.dataset.view === 'dashboard'));
        _refreshDashboard();
    };

    function closeDashboardWorkspace() {
        $('#dashboardWorkspace')?.classList.remove('open');
        $$('.nav-item[data-view]').forEach(el =>
            el.classList.toggle('active', el.dataset.view === 'library'));
    }

    

    function initDashboardWorkspace() {
        const ws = $('#dashboardWorkspace');
        if (!ws) return;

        $$('#dashboardWorkspace .dash-quick-tile[data-open]').forEach(btn => {
            btn.addEventListener('click', () => {
                const fn = btn.dataset.open;
                closeDashboardWorkspace();
                if (fn && typeof window[fn] === 'function') window[fn]();
            });
        });
        $('#dashSeeAllBtn')?.addEventListener('click', () => {
            closeDashboardWorkspace();
            window.openWorkspacesLauncher();
        });
        $('#dashGoLibraryBtn')?.addEventListener('click', () => {
            closeDashboardWorkspace();
            setView('library');
        });
        $('#closeDashboardBtn')?.addEventListener('click', closeDashboardWorkspace);
        ws.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeDashboardWorkspace();
        });
    }

    
