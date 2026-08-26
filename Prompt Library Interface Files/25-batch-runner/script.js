/* Batch Runner — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    function _brSyncSource() {
        const src = $('#brSource')?.value || '';
        _brVars = detectVariables(src);
        const chip = $('#brVarChip');
        if (chip) {
            chip.textContent = _brVars.length;
            chip.title = _brVars.length ? _brVars.join(', ') : 'No variables detected';
        }
        const hint = $('#brModeHint');
        if (hint) {
            if (!src.trim()) hint.textContent = 'Pick a prompt or paste one to begin.';
            else if (!_brVars.length) hint.textContent = 'No variables found - each line is appended to the prompt as its input.';
            else if (_brVars.length === 1) hint.textContent = `One variable (${_brVars[0]}) - each line fills it.`;
            else hint.textContent = `${_brVars.length} variables - first line must be a CSV header: ${_brVars.join(', ')}`;
        }
        _brSyncRows();
    }

    

    function _brRenderResults() {
        const body = $('#brResultsBody');
        const wrap = $('#brResultsWrap');
        const empty = $('#brResultsEmpty');
        if (!body || !wrap || !empty) return;
        if (!_brResults.length) {
            wrap.hidden = true;
            empty.hidden = false;
            return;
        }
        wrap.hidden = false;
        empty.hidden = true;
        body.innerHTML = _brResults.map((r, i) => {
            const row = _brRows[i] || {};
            const label = row.__input !== undefined
                ? row.__input
                : Object.keys(row).map(k => `${k}: ${row[k]}`).join(', ');
            const status = r.status === 'done' ? '<span class="br-pill ok">done</span>'
                : r.status === 'error' ? '<span class="br-pill err">failed</span>'
                : r.status === 'running' ? '<span class="br-pill run">running</span>'
                : '<span class="br-pill">queued</span>';
            const save = r.status === 'done'
                ? `<button class="btn btn-ghost btn-sm" onclick="window.PL_brSaveRow(${i})">Save</button>`
                : '';
            return `<tr>
        <td class="br-idx">${i + 1}</td>
        <td class="br-in" title="${escapeAttr(label)}">${escapeHtml(label.slice(0, 90))}</td>
        <td>${status}</td>
        <td class="br-out">${escapeHtml(r.output || '')}</td>
        <td class="br-row-actions">${save}</td>
      </tr>`;
        }).join('');
        const done = _brResults.filter(r => r.status === 'done').length;
        const failed = _brResults.filter(r => r.status === 'error').length;
        const prog = $('#brProgress');
        if (prog) prog.textContent = `${done} done${failed ? `, ${failed} failed` : ''} of ${_brResults.length}`;
    }

    

    function _brRestore() {
        try {
            const saved = JSON.parse(localStorage.getItem('pl_br_last') || 'null');
            if (!saved) return;
            if ($('#brSource') && saved.source) $('#brSource').value = saved.source;
            if ($('#brRows') && saved.rows) $('#brRows').value = saved.rows;
        } catch (e) { /* ignore malformed */ }
    }

    

    window.openBatchWorkspace = function() {
        if (!state.isPremium) {
            showPremiumModal();
            return;
        }
        const ws = $('#batchWorkspace');
        if (!ws) return;
        ws.classList.add('open');
        document.body.style.overflow = 'hidden';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'batch'));
        _wsFillPromptPicker('#brPicker');
        _brRestore();
        _brSyncSource();
        _brRenderResults();
    };

    function closeBatchWorkspace() {
        $('#batchWorkspace')?.classList.remove('open');
        document.body.style.overflow = '';
        $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
    }

    
