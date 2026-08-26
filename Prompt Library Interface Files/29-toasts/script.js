/* Toast notifications — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    function toast(msg, kind = 'success') {
        const icons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };
        const root = $('#toastContainer');
        if (!root) return;
        const el = document.createElement('div');
        el.className = `toast ${kind}`;
        el.innerHTML = `<span class="material-symbols-outlined">${icons[kind] || 'info'}</span><span>${escapeHtml(msg)}</span>`;
        root.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(20px)';
            el.style.transition = 'all 200ms ease-out';
        }, 2700);
        setTimeout(() => el.remove(), 3000);
    }

    
