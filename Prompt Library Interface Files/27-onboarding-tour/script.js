/* Onboarding tour overlay — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    window.PL_startOnboarding = function() {
        _step = 0;
        _closeTourWorkspaces();
        _closeTourDetail();
        _render(0);
        const overlay = _el('onboardingOverlay');
        if (overlay) overlay.classList.add('active');
    };

    window.PL_skipOnboarding = function() {
        localStorage.setItem(TOUR_KEY, '1');
        _closeTourWorkspaces();
        _closeTourDetail();
        const overlay = _el('onboardingOverlay');
        if (overlay) overlay.classList.remove('active');
    };

    window.initOnboarding = function() {
        // Auto-launch on first run only
        if (!localStorage.getItem(TOUR_KEY)) {
            setTimeout(function() {
                window.PL_startOnboarding && window.PL_startOnboarding();
            }, 800);
        }
    };
