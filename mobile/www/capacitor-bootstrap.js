/* ============================================================================
   CAPACITOR NATIVE BOOTSTRAP — mobile build only.
   Wires the Android hardware/gesture back button to the app's existing
   Escape-key handling (every overlay/workspace/modal already listens for
   Escape to close itself — see _escapeToLibrary and friends in app.js).
   No-ops entirely outside a Capacitor WebView (e.g. the Playwright/browser
   checks used to verify this build), since window.Capacitor won't exist there.
   ============================================================================ */
(function () {
    'use strict';
    var CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (!CapApp) return;

    function showExitToast() {
        var el = document.getElementById('mobileExitToast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'mobileExitToast';
            el.textContent = 'Press back again to exit';
            document.body.appendChild(el);
        }
        el.classList.add('is-visible');
        clearTimeout(showExitToast._t);
        showExitToast._t = setTimeout(function () { el.classList.remove('is-visible'); }, 2000);
    }

    function hasOpenOverlay() {
        return !!document.querySelector(
            '.modal-overlay.active, #detailPanel.open, #cmdPalette.active, ' +
            '#onboardingOverlay.active, #promptViewer.pv-open, [id$="Workspace"].open'
        );
    }

    var lastBackPress = 0;
    CapApp.addListener('backButton', function () {
        var drawerOpen = document.body.classList.contains('sidebar-hidden') &&
            window.matchMedia('(max-width: 760px)').matches;
        if (hasOpenOverlay() || drawerOpen) {
            if (drawerOpen) document.body.classList.remove('sidebar-hidden');
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
            return;
        }
        var now = Date.now();
        if (now - lastBackPress < 2000) {
            CapApp.exitApp();
        } else {
            lastBackPress = now;
            showExitToast();
        }
    });
})();
