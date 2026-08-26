/* Tutorial coachmark card — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    function _renderProgress() {
        var el = _el('tourProgress');
        if (!el) return;
        var dots = STEPS.map(function(_, i) {
            var cls = i < _step ? 'tour-dot done' : i === _step ? 'tour-dot active' : 'tour-dot';
            return '<div class="' + cls + '"></div>';
        }).join('');
        el.innerHTML = dots;
    }

    

    function _show() {
        var overlay = _el('tutorialOverlay');
        var card = _el('tutorialCard');
        if (overlay) overlay.classList.add('active');
        if (card) card.classList.add('active');
        document.body.style.overflow = 'hidden';
        _running = true;
    }

    
