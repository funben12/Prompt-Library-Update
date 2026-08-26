/* Prompt Auditor — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    window.openAuditWorkspace = function() {
        if (!state.isPremium) {
            showPremiumModal();
            return;
        }
        const ws = $('#auditWorkspace');
        if (!ws) return;
        ws.classList.add('open');
        document.body.style.overflow = 'hidden';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'audit'));
        _wsFillPromptPicker('#audPicker');
        setTimeout(() => $('#audInput')?.focus(), 80);
    };

    function closeAuditWorkspace() {
        $('#auditWorkspace')?.classList.remove('open');
        document.body.style.overflow = '';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
    }

    
