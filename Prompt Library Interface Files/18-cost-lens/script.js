/* Cost Lens — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    function _costFmt(n) {
        if (n >= 1) return '$' + n.toFixed(2);
        if (n >= 0.01) return '$' + n.toFixed(3);
        return '$' + n.toFixed(5);
    }

    

    window.openCostWorkspace = function() {
        if (!state.isPremium) {
            showPremiumModal();
            return;
        }
        const ws = $('#costWorkspace');
        if (!ws) return;
        ws.classList.add('open');
        document.body.style.overflow = 'hidden';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'cost'));
        _wsFillPromptPicker('#costPicker');
        setTimeout(() => $('#costInput')?.focus(), 80);
    };

    function closeCostWorkspace() {
        $('#costWorkspace')?.classList.remove('open');
        document.body.style.overflow = '';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
    }

    
