/* Desktop bridge for the standalone Prompt Pack Builder.
   Loads before prompt-pack-builder.js and gives it file storage, the read only library, toasts and native Save As.
   Opened in a plain browser (no pywebview) it falls back to localStorage and hides Add from library. */
(function () {
    'use strict';

    const STORE_KEY = 'prompt-pack-builder.v1';
    const BRIDGE_WAIT_MS = 3000;
    window.PPB_STANDALONE = true;

    /* ---------- theme follows the system ---------- */
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const setTheme = () => document.documentElement.setAttribute('data-theme', mq && mq.matches ? 'dark' : 'light');
    setTheme();
    if (mq && mq.addEventListener) mq.addEventListener('change', setTheme);

    /* ---------- toasts ---------- */
    const ICONS = { success: 'check_circle', warning: 'warning', error: 'error', info: 'info' };
    function toast(msg, kind) {
        const k = ICONS[kind] ? kind : 'info';
        let box = document.querySelector('.pl-toasts');
        if (!box) {
            box = document.createElement('div');
            box.className = 'pl-toasts';
            box.setAttribute('role', 'status');
            box.setAttribute('aria-live', 'polite');
            document.body.appendChild(box);
        }
        const el = document.createElement('div');
        el.className = 'pl-toast pl-toast-' + k;
        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = ICONS[k];
        const text = document.createElement('span');
        text.className = 'pl-toast-msg';
        text.textContent = String(msg);
        el.append(icon, text);
        box.appendChild(el);
        setTimeout(() => el.remove(), k === 'error' ? 7000 : 3800);
    }
    window.PL_toast = toast;

    const api = () => (window.pywebview && window.pywebview.api) || null;

    /* ---------- native Save As ---------- */
    window.PL_saveBlob = function (blob, filename, okMsg) {
        const a = api();
        if (!a || !a.save_file) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.hidden = true;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 30000);
            if (okMsg) toast(okMsg, 'success');
            return Promise.resolve({ saved: true });
        }
        return new Promise(resolve => {
            const fr = new FileReader();
            fr.onerror = () => { toast('Save failed: could not read the file', 'error'); resolve({ saved: false }); };
            fr.onload = async () => {
                let r;
                try { r = await a.save_file(filename, String(fr.result).split(',')[1] || '', true); }
                catch (e) { r = { saved: false, error: String(e) }; }
                if (r && r.saved) toast('Saved to ' + r.path, 'success');
                else if (r && r.error) toast('Save failed: ' + r.error, 'error');
                resolve(r || { saved: false });
            };
            fr.readAsDataURL(blob);
        });
    };

    /* ---------- file storage behind a localStorage shaped object ---------- */
    function useFileStore(initialText) {
        const cache = {};
        if (typeof initialText === 'string') cache[STORE_KEY] = initialText;
        let chain = Promise.resolve();
        let warned = false;
        window.PPB_store = {
            getItem: key => (Object.prototype.hasOwnProperty.call(cache, key) ? cache[key] : null),
            setItem: (key, value) => {
                cache[key] = String(value);
                const text = cache[key];
                chain = chain.then(() => api().save_store(text)).then(r => {
                    if (r && r.saved) { warned = false; return; }
                    if (!warned) toast('Could not save your packs: ' + ((r && r.error) || 'unknown error'), 'error');
                    warned = true;
                }).catch(e => {
                    if (!warned) toast('Could not save your packs: ' + e, 'error');
                    warned = true;
                });
            }
        };
    }

    function waitForBridge() {
        return new Promise(resolve => {
            if (api()) return resolve(true);
            const done = ok => { clearTimeout(timer); window.removeEventListener('pywebviewready', onReady); resolve(ok); };
            const onReady = () => done(!!api());
            const timer = setTimeout(() => done(!!api()), BRIDGE_WAIT_MS);
            window.addEventListener('pywebviewready', onReady);
        });
    }

    async function boot() {
        const desktop = await waitForBridge();
        if (desktop) {
            try {
                const res = await api().load_store();
                useFileStore(res && res.ok ? res.text : null);
                if (res && res.warning) toast(res.warning + (res.kept ? '. A copy was kept as ' + res.kept : '') + '.', 'warning');
            } catch (e) {
                useFileStore(null);
                toast('Could not load your packs: ' + e, 'error');
            }
            let available = false;
            try { const s = await api().library_status(); available = !!(s && s.available); } catch (e) { available = false; }
            if (available) {
                window.PPB_loadLibrary = async () => {
                    const r = await api().list_library();
                    if (!r || !r.ok) throw new Error((r && r.error) || 'Library unavailable');
                    return r.prompts;
                };
            } else {
                document.body.classList.add('ppb-no-library');
            }
        } else {
            document.body.classList.add('ppb-no-library', 'ppb-browser-mode');
        }
        document.body.classList.remove('ppb-booting');
        if (typeof window.openPromptPackBuilderWorkspace === 'function') window.openPromptPackBuilderWorkspace();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
