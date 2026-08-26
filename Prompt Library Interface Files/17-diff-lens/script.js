/* Diff Lens — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */


    // Token-level LCS diff. Returns array of {op: 'eq'|'del'|'ins', text}.
    function _diffTokens(a, b) {
        const at = a.match(/\S+|\s+/g) || [];
        const bt = b.match(/\S+|\s+/g) || [];
        const CAP = 3000;
        if (at.length > CAP || bt.length > CAP) return null; // too large for O(n·m)
        const n = at.length,
            m = bt.length;
        // LCS table (single-int rows to keep memory sane)
        const dp = Array.from({
            length: n + 1
        }, () => new Uint16Array(m + 1));
        for (let i = n - 1; i >= 0; i--) {
            for (let j = m - 1; j >= 0; j--) {
                dp[i][j] = at[i] === bt[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
            }
        }
        const ops = [];
        let i = 0,
            j = 0;
        while (i < n && j < m) {
            if (at[i] === bt[j]) {
                ops.push({
                    op: 'eq',
                    text: at[i]
                });
                i++;
                j++;
            } else if (dp[i + 1][j] >= dp[i][j + 1]) {
                ops.push({
                    op: 'del',
                    text: at[i]
                });
                i++;
            } else {
                ops.push({
                    op: 'ins',
                    text: bt[j]
                });
                j++;
            }
        }
        while (i < n) {
            ops.push({
                op: 'del',
                text: at[i++]
            });
        }
        while (j < m) {
            ops.push({
                op: 'ins',
                text: bt[j++]
            });
        }
        return ops;
    }

    

    window.openDiffWorkspace = function() {
        const ws = $('#diffWorkspace');
        if (!ws) return;
        ws.classList.add('open');
        document.body.style.overflow = 'hidden';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'diff'));
        _wsFillPromptPicker('#diffPickerA');
        _wsFillPromptPicker('#diffPickerB');
        setTimeout(() => $('#diffInputA')?.focus(), 80);
    };

    function closeDiffWorkspace() {
        $('#diffWorkspace')?.classList.remove('open');
        document.body.style.overflow = '';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
    }

    
