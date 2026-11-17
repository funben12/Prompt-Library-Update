/* Prompt Pack Builder workspace: bundle prompts into a pack and export it for your community.
   Self contained: builds its own root element, owns every id and class (prefix ppb) and stores packs in localStorage only.
   Prompts from the library are read through GET /api/prompts and are never changed. No database, no schema change. */
(function () {
    'use strict';

    const STORE_KEY = 'prompt-pack-builder.v1';
    const SCHEMA = 'prompt-pack';
    const SCHEMA_VERSION = 1;
    const MAX_PACKS = 50;
    const MAX_PROMPTS = 200;
    const MAX_TAGS = 12;
    const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
    const PICKER_LIMIT = 60;

    const FORMATS = {
        markdown: { label: 'Markdown', ext: 'md', mime: 'text/markdown' },
        text: { label: 'Plain text', ext: 'txt', mime: 'text/plain' },
        json: { label: 'JSON', ext: 'json', mime: 'application/json' },
        html: { label: 'Web page', ext: 'html', mime: 'text/html' }
    };

    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const ms = (name, cls) => '<span class="material-symbols-outlined' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + name + '</span>';
    const toast = (msg, kind) => { if (window.PL_toast) window.PL_toast(msg, kind || 'info'); };
    const rid = prefix => prefix + '_' + (window.crypto && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 12) : Math.random().toString(36).slice(2, 14));
    const str = (v, max) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, max || 100000);
    const VAR_RE = /\[\[[^\]\n]+\]\]|\{\{[^}\n]+\}\}|\(\([^)\n]+\)\)/g;
    const countVars = text => new Set(String(text || '').match(VAR_RE) || []).size;
    const nf = n => Number(n).toLocaleString('en-GB');

    /* ---------- storage ---------- */
    function blankPack() {
        const now = Date.now();
        return { id: rid('pk'), title: '', description: '', author: '', version: '1.0.0', licence: '', tags: [], prompts: [], created: now, updated: now };
    }
    function cleanTags(list) {
        const seen = new Set();
        const out = [];
        (Array.isArray(list) ? list : []).forEach(t => {
            const v = str(t, 40).replace(/\s+/g, ' ').trim();
            if (v && !seen.has(v.toLowerCase()) && out.length < MAX_TAGS) { seen.add(v.toLowerCase()); out.push(v); }
        });
        return out;
    }
    function cleanPrompt(x) {
        const o = x && typeof x === 'object' ? x : {};
        return {
            uid: rid('pr'),
            title: str(o.title, 300),
            body: str(o.body, 60000),
            note: str(o.note, 1000),
            source: o.source === 'library' ? 'library' : 'custom',
            libraryId: o.libraryId == null ? null : o.libraryId
        };
    }
    function cleanPack(p) {
        const o = p && typeof p === 'object' ? p : {};
        const now = Date.now();
        return {
            id: typeof o.id === 'string' && o.id ? o.id : rid('pk'),
            title: str(o.title, 200),
            description: str(o.description, 5000),
            author: str(o.author, 200),
            version: str(o.version, 40),
            licence: str(o.licence, 5000),
            tags: cleanTags(o.tags),
            prompts: (Array.isArray(o.prompts) ? o.prompts : []).slice(0, MAX_PROMPTS).map(x => {
                const c = cleanPrompt(x);
                if (x && typeof x.uid === 'string' && x.uid) c.uid = x.uid;
                return c;
            }),
            created: Number(o.created) || now,
            updated: Number(o.updated) || now
        };
    }
    function loadStore() {
        try {
            const raw = localStorage.getItem(STORE_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                const packs = (Array.isArray(d.packs) ? d.packs : []).slice(0, MAX_PACKS).map(cleanPack);
                const active = packs.some(p => p.id === d.activeId) ? d.activeId : (packs[0] ? packs[0].id : null);
                return { v: 1, activeId: active, packs };
            }
        } catch (e) { /* unreadable storage starts clean */ }
        return { v: 1, activeId: null, packs: [] };
    }

    /* ---------- export builders ---------- */
    function oneLine(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
    function tidy(p) {
        return {
            title: oneLine(p.title),
            description: String(p.description || '').trim(),
            author: oneLine(p.author),
            version: oneLine(p.version),
            licence: String(p.licence || '').trim(),
            tags: p.tags.slice(),
            prompts: p.prompts.map((x, i) => ({
                title: oneLine(x.title) || 'Prompt ' + (i + 1),
                body: String(x.body || '').replace(/\s+$/, ''),
                note: String(x.note || '').trim()
            }))
        };
    }
    function fenceFor(body) {
        const runs = String(body).match(/`+/g) || [];
        return '`'.repeat(Math.max(3, Math.max(0, ...runs.map(r => r.length)) + 1));
    }
    function buildMarkdown(p) {
        const t = tidy(p);
        const out = ['# ' + (t.title || 'Untitled pack'), ''];
        if (t.description) out.push(t.description, '');
        const meta = [];
        if (t.author) meta.push('* Author: ' + t.author);
        if (t.version) meta.push('* Version: ' + t.version);
        if (t.tags.length) meta.push('* Tags: ' + t.tags.join(', '));
        meta.push('* Prompts: ' + t.prompts.length);
        out.push(meta.join('\n'), '');
        if (t.licence) out.push('## Licence and usage', '', t.licence, '');
        if (t.prompts.length) {
            out.push('## Contents', '');
            t.prompts.forEach((x, i) => out.push((i + 1) + '. ' + x.title));
            out.push('');
        }
        t.prompts.forEach((x, i) => {
            out.push('## ' + (i + 1) + '. ' + x.title, '');
            if (x.note) out.push('Usage: ' + x.note.replace(/\s*\n\s*/g, ' '), '');
            const f = fenceFor(x.body);
            out.push(f + 'text', x.body, f, '');
        });
        return out.join('\n').replace(/\n+$/, '') + '\n';
    }
    function buildText(p) {
        const t = tidy(p);
        const title = t.title || 'Untitled pack';
        const out = [title.toUpperCase(), '='.repeat(Math.min(title.length, 72)), ''];
        if (t.description) out.push(t.description, '');
        if (t.author) out.push('Author: ' + t.author);
        if (t.version) out.push('Version: ' + t.version);
        if (t.tags.length) out.push('Tags: ' + t.tags.join(', '));
        out.push('Prompts: ' + t.prompts.length, '');
        if (t.licence) out.push('LICENCE AND USAGE', t.licence, '');
        t.prompts.forEach((x, i) => {
            out.push('='.repeat(72), (i + 1) + '. ' + x.title);
            if (x.note) out.push('Usage: ' + x.note.replace(/\s*\n\s*/g, ' '));
            out.push('', x.body, '');
        });
        return out.join('\n').replace(/\n+$/, '') + '\n';
    }
    function buildJson(p) {
        const t = tidy(p);
        const doc = {
            schema: SCHEMA,
            schemaVersion: SCHEMA_VERSION,
            generator: 'Prompt Library Pro, Prompt Pack Builder',
            exportedAt: new Date(p.updated || Date.now()).toISOString(),
            pack: {
                title: t.title,
                description: t.description,
                author: t.author,
                version: t.version,
                licence: t.licence,
                tags: t.tags,
                prompts: p.prompts.map((x, i) => ({
                    title: oneLine(x.title) || 'Prompt ' + (i + 1),
                    body: String(x.body || ''),
                    note: String(x.note || '').trim()
                }))
            }
        };
        return JSON.stringify(doc, null, 2) + '\n';
    }
    // The exported page keeps its own tiny script for the copy buttons and makes no network request.
    const PAGE_CSS = [
        ':root{color-scheme:light dark;--bg:oklch(96% 0.008 70);--card:oklch(99% 0.004 70);--line:oklch(86% 0.014 70);--ink:oklch(20% 0.04 260);--ink2:oklch(38% 0.03 260);--ink3:oklch(48% 0.02 260);--accent:oklch(38% 0.14 190);--soft:oklch(93% 0.05 190)}',
        '@media(prefers-color-scheme:dark){:root{--bg:oklch(17% 0.012 70);--card:oklch(21% 0.014 70);--line:oklch(31% 0.016 70);--ink:oklch(94% 0.015 260);--ink2:oklch(82% 0.015 260);--ink3:oklch(68% 0.012 260);--accent:oklch(74% 0.14 190);--soft:oklch(27% 0.08 190)}}',
        '*{box-sizing:border-box}',
        'body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
        'main{max-width:760px;margin:0 auto;padding:32px 16px 64px}',
        'h1{font:600 clamp(1.7rem,5vw,2.4rem)/1.15 Georgia,"Iowan Old Style",serif;letter-spacing:-0.02em;margin:0 0 12px}',
        '.lead{color:var(--ink2);margin:0 0 16px;white-space:pre-wrap}',
        '.meta{display:flex;flex-wrap:wrap;gap:8px 20px;margin:0 0 16px;padding:0;list-style:none;color:var(--ink3);font-size:14px}',
        '.meta b{color:var(--ink2);font-weight:600}',
        '.tags{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 20px;padding:0;list-style:none}',
        '.tags li{background:var(--soft);color:var(--accent);border-radius:999px;padding:2px 10px;font-size:13px;font-weight:600}',
        '.licence{border:1px solid var(--line);border-radius:10px;background:var(--card);padding:12px 16px;margin:0 0 28px;color:var(--ink2);font-size:14px;white-space:pre-wrap}',
        '.licence h2{font-size:12px;letter-spacing:.07em;text-transform:uppercase;margin:0 0 6px;color:var(--ink3)}',
        '.prompt{border:1px solid var(--line);border-radius:12px;background:var(--card);padding:16px;margin:0 0 16px}',
        '.head{display:flex;align-items:flex-start;gap:12px}',
        '.num{font:600 13px ui-monospace,Menlo,Consolas,monospace;color:var(--ink3);padding-top:5px}',
        '.head h2{flex:1;font-size:18px;line-height:1.3;margin:0;min-width:0;overflow-wrap:anywhere}',
        '.copy{flex:none;min-height:44px;padding:0 14px;border-radius:8px;border:1px solid var(--accent);background:var(--accent);color:var(--bg);font:600 14px system-ui,sans-serif;cursor:pointer}',
        '.copy:focus-visible{outline:3px solid var(--accent);outline-offset:2px}',
        '.copy.done{background:transparent;color:var(--accent)}',
        '.note{margin:8px 0 0;color:var(--ink2);font-size:14px}',
        'pre{margin:12px 0 0;padding:12px;border-radius:8px;background:var(--bg);border:1px solid var(--line);font:13px/1.55 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}',
        '@media(max-width:480px){.head{flex-wrap:wrap}.copy{width:100%}}'
    ].join('');
    const PAGE_JS = "(function(){function fb(t){var a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(e){}a.remove()}" +
        "document.addEventListener('click',function(ev){var b=ev.target.closest('[data-copy]');if(!b)return;var el=document.getElementById(b.getAttribute('data-copy'));if(!el)return;var t=el.textContent;" +
        "var ok=function(){var o=b.textContent;b.textContent='Copied';b.classList.add('done');setTimeout(function(){b.textContent=o;b.classList.remove('done')},1600)};" +
        "if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(ok,function(){fb(t);ok()})}else{fb(t);ok()}})})();";
    function buildHtml(p) {
        const t = tidy(p);
        const title = t.title || 'Untitled pack';
        const meta = [];
        if (t.author) meta.push('<li><b>Author</b> ' + esc(t.author) + '</li>');
        if (t.version) meta.push('<li><b>Version</b> ' + esc(t.version) + '</li>');
        meta.push('<li><b>Prompts</b> ' + t.prompts.length + '</li>');
        const cards = t.prompts.map((x, i) =>
            '<article class="prompt" id="p' + (i + 1) + '"><div class="head"><span class="num">' + String(i + 1).padStart(2, '0') + '</span><h2>' + esc(x.title) +
            '</h2><button class="copy" type="button" data-copy="b' + (i + 1) + '">Copy prompt</button></div>' +
            (x.note ? '<p class="note">' + esc(x.note) + '</p>' : '') +
            '<pre id="b' + (i + 1) + '">' + esc(x.body) + '</pre></article>').join('\n');
        return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + esc(title) + '</title>\n<style>' + PAGE_CSS + '</style>\n</head>\n<body>\n<main>\n<h1>' + esc(title) + '</h1>\n' +
            (t.description ? '<p class="lead">' + esc(t.description) + '</p>\n' : '') +
            '<ul class="meta">' + meta.join('') + '</ul>\n' +
            (t.tags.length ? '<ul class="tags">' + t.tags.map(g => '<li>' + esc(g) + '</li>').join('') + '</ul>\n' : '') +
            (t.licence ? '<section class="licence"><h2>Licence and usage</h2>' + esc(t.licence) + '</section>\n' : '') +
            cards + '\n</main>\n<script>' + PAGE_JS + '<' + '/script>\n</body>\n</html>\n';
    }
    const BUILDERS = { markdown: buildMarkdown, text: buildText, json: buildJson, html: buildHtml };

    /* ---------- import ---------- */
    function parsePackJson(text) {
        let doc;
        try { doc = JSON.parse(text); } catch (e) { return { error: 'That file is not valid JSON.' }; }
        if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return { error: 'That file is not a prompt pack.' };
        if (doc.schema !== SCHEMA) return { error: 'That file is not a Prompt Pack Builder export. It has no "' + SCHEMA + '" schema field.' };
        if (typeof doc.schemaVersion !== 'number') return { error: 'The pack has no schema version, so it cannot be read safely.' };
        if (doc.schemaVersion > SCHEMA_VERSION) return { error: 'This pack uses schema version ' + doc.schemaVersion + ', which is newer than this app reads (version ' + SCHEMA_VERSION + ').' };
        const src = doc.pack;
        if (!src || typeof src !== 'object' || !Array.isArray(src.prompts)) return { error: 'The pack has no prompt list.' };
        let skipped = 0;
        const prompts = [];
        src.prompts.forEach(x => {
            if (!x || typeof x !== 'object') { skipped++; return; }
            if (prompts.length >= MAX_PROMPTS) { skipped++; return; }
            prompts.push({ title: x.title, body: x.body, note: x.note, source: 'custom' });
        });
        const pack = cleanPack({ title: src.title, description: src.description, author: src.author, version: src.version, licence: src.licence, tags: src.tags, prompts });
        pack.id = rid('pk');
        pack.created = pack.updated = Date.now();
        return { pack, skipped };
    }

    /* ---------- the workspace ---------- */
    let root = null;
    let mounted = false;
    let opener = null;
    let saveTimer = 0;
    let previewTimer = 0;
    let bannerTimer = 0;
    let storageOk = true;
    let store = { v: 1, activeId: null, packs: [] };
    const ui = {
        pane: 'edit', fmt: 'markdown', confirmPrompt: null, confirmPack: null, renaming: null, attempted: false,
        library: null, libState: 'idle', libQuery: '', dragUid: null, dropUid: null, dropAfter: false, saved: 'saved'
    };

    const isOpen = () => !!root && root.classList.contains('open');
    const $ = (sel, scope) => (scope || root).querySelector(sel);
    const $$ = (sel, scope) => Array.from((scope || root).querySelectorAll(sel));
    const activePack = () => store.packs.find(p => p.id === store.activeId) || null;
    const promptByUid = (p, uid) => p.prompts.find(x => x.uid === uid) || null;

    function saveNow() {
        clearTimeout(saveTimer);
        saveTimer = 0;
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(store));
            storageOk = true;
            ui.saved = 'saved';
        } catch (e) {
            storageOk = false;
            ui.saved = 'failed';
        }
        renderSaveState();
    }
    function queueSave() {
        ui.saved = 'saving';
        renderSaveState();
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveNow, 300);
    }
    function touch(p) {
        p.updated = Date.now();
        queueSave();
    }
    function renderSaveState() {
        if (!root) return;
        const el = $('#ppb-save');
        if (!el) return;
        el.classList.toggle('ppb-save-bad', ui.saved === 'failed');
        el.textContent = ui.saved === 'saving' ? 'Saving' : ui.saved === 'failed' ? 'Not saved, browser storage is unavailable' : 'All changes saved';
    }
    function ago(ts) {
        const s = Math.max(0, (Date.now() - ts) / 1000);
        if (s < 45) return 'just now';
        if (s < 3600) return Math.round(s / 60) + ' min ago';
        if (s < 86400) return Math.round(s / 3600) + ' h ago';
        if (s < 86400 * 14) return Math.round(s / 86400) + ' d ago';
        return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    function live(msg) {
        const el = $('#ppb-live');
        if (el) { el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 30); }
    }
    function showBanner(msg, kind) {
        const b = $('#ppb-banner');
        if (!b) return;
        clearTimeout(bannerTimer);
        b.className = 'ppb-banner ppb-banner-' + (kind || 'ok');
        b.innerHTML = ms(kind === 'error' ? 'error' : 'check_circle') + '<span class="ppb-banner-text">' + esc(msg) + '</span><button class="icon-btn ppb-banner-x" data-act="dismissBanner" aria-label="Dismiss message">' + ms('close') + '</button>';
        b.hidden = false;
        if (kind !== 'error') bannerTimer = setTimeout(() => { b.hidden = true; }, 9000);
    }

    /* ---------- markup ---------- */
    const MARKUP = `
<div class="ws-header ppb-header">
  <div class="ws-header-left">
    ${ms('inventory_2', 'ws-header-icon')}
    <div>
      <h2 class="ws-title">Prompt Pack Builder</h2>
      <p class="ws-subtitle">Bundle prompts into a pack and export it for your community</p>
    </div>
  </div>
  <div class="ws-header-actions">
    <button class="btn" type="button" data-act="import" aria-label="Import pack">${ms('upload')}<span>Import pack</span></button>
    <input type="file" id="ppb-file" accept=".json,application/json" hidden>
    <button class="icon-btn" type="button" data-act="close" aria-label="Close Prompt Pack Builder">${ms('close')}</button>
  </div>
</div>
<div class="ppb-banner" id="ppb-banner" role="status" hidden></div>
<div class="ppb-tabs" id="ppb-pane-tabs" role="tablist" aria-label="Pack builder areas">
  <button class="ppb-tab" type="button" role="tab" id="ppb-tab-rail" data-act="pane" data-pane="rail" aria-controls="ppb-rail">Packs <span class="ppb-mono ppb-count" id="ppb-tab-packs-n">0</span></button>
  <button class="ppb-tab" type="button" role="tab" id="ppb-tab-edit" data-act="pane" data-pane="edit" aria-controls="ppb-editor">Edit</button>
  <button class="ppb-tab" type="button" role="tab" id="ppb-tab-preview" data-act="pane" data-pane="preview" aria-controls="ppb-preview">Preview and export <span class="ppb-mono ppb-count" id="ppb-tab-issues"></span></button>
</div>
<div class="ws-body ppb-body">
  <aside class="ppb-pane ppb-rail" id="ppb-rail" role="tabpanel" aria-labelledby="ppb-tab-rail" aria-label="Saved packs">
    <div class="ppb-pane-head">
      <span class="ppb-label">Saved packs <span class="ppb-mono ppb-count" id="ppb-pack-n">0</span></span>
      <button class="btn btn-accent ppb-btn-sm" type="button" data-act="newPack">${ms('add')}<span>New pack</span></button>
    </div>
    <ul class="ppb-pack-list" id="ppb-pack-list"></ul>
  </aside>

  <section class="ppb-pane ppb-editor" id="ppb-editor" role="tabpanel" aria-labelledby="ppb-tab-edit" aria-label="Pack editor">
    <div class="ppb-scroll">
      <div class="ppb-empty" id="ppb-empty" hidden>
        ${ms('inventory_2', 'ppb-empty-icon')}
        <h3 class="ppb-empty-title">No pack open</h3>
        <p>Create a pack to start bundling prompts, or import a pack JSON to keep editing one.</p>
        <div class="ppb-empty-actions">
          <button class="btn btn-accent" type="button" data-act="newPack">${ms('add')}<span>New pack</span></button>
          <button class="btn" type="button" data-act="import">${ms('upload')}<span>Import pack</span></button>
        </div>
      </div>
      <div class="ppb-inner" id="ppb-edit-body" hidden>
        <section class="ppb-section" aria-labelledby="ppb-h-details">
          <div class="ppb-section-head">
            <h3 class="ppb-label" id="ppb-h-details">Pack details</h3>
            <span class="ppb-save" id="ppb-save" role="status" aria-live="polite">All changes saved</span>
          </div>
          <div class="ppb-field ppb-field-title">
            <label class="ppb-field-label" for="ppb-f-title">Title</label>
            <input class="ppb-title-input" id="ppb-f-title" data-field="title" maxlength="200" placeholder="Untitled pack" autocomplete="off">
          </div>
          <div class="ppb-field">
            <label class="ppb-field-label" for="ppb-f-description">Description</label>
            <textarea class="form-textarea" id="ppb-f-description" data-field="description" rows="3" maxlength="5000" placeholder="What this pack is for and who it helps"></textarea>
          </div>
          <div class="ppb-row">
            <div class="ppb-field">
              <label class="ppb-field-label" for="ppb-f-author">Author</label>
              <input class="form-input" id="ppb-f-author" data-field="author" maxlength="200" autocomplete="off" placeholder="Your name or community">
            </div>
            <div class="ppb-field">
              <label class="ppb-field-label" for="ppb-f-version">Version</label>
              <input class="form-input ppb-mono" id="ppb-f-version" data-field="version" maxlength="40" autocomplete="off" placeholder="1.0.0">
            </div>
          </div>
          <div class="ppb-field">
            <label class="ppb-field-label" for="ppb-f-licence">Licence or usage note</label>
            <textarea class="form-textarea" id="ppb-f-licence" data-field="licence" rows="2" maxlength="5000" placeholder="For example: free to use and adapt, credit the author"></textarea>
          </div>
          <div class="ppb-field">
            <label class="ppb-field-label" for="ppb-f-tags">Tags <span class="ppb-mono ppb-count" id="ppb-tag-n"></span></label>
            <div class="ppb-tagbox" id="ppb-tagbox">
              <span class="ppb-tag-chips" id="ppb-tag-chips"></span>
              <input id="ppb-f-tags" class="ppb-tag-input" autocomplete="off" maxlength="40" placeholder="Add a tag and press Enter">
            </div>
          </div>
        </section>

        <section class="ppb-section" aria-labelledby="ppb-h-prompts">
          <div class="ppb-section-head ppb-section-head-wrap">
            <h3 class="ppb-label" id="ppb-h-prompts">Prompts <span class="ppb-mono ppb-count" id="ppb-prompt-n">0</span></h3>
            <div class="ppb-section-actions">
              <button class="btn" type="button" id="ppb-add-library" data-act="addFromLibrary">${ms('library_books')}<span>Add from library</span></button>
              <button class="btn btn-accent" type="button" id="ppb-add-new" data-act="writeNew">${ms('edit_note')}<span>Write new prompt</span></button>
            </div>
          </div>
          <ol class="ppb-prompt-list" id="ppb-prompts"></ol>
        </section>
      </div>
    </div>
  </section>

  <aside class="ppb-pane ppb-preview" id="ppb-preview" role="tabpanel" aria-labelledby="ppb-tab-preview" aria-label="Live preview and export">
    <div class="ppb-pane-head ppb-preview-head">
      <span class="ppb-label">Live preview</span>
      <div class="ppb-fmts" role="tablist" aria-label="Preview format" id="ppb-fmts">
        ${Object.keys(FORMATS).map(k => `<button class="ppb-fmt" type="button" role="tab" data-act="fmt" data-fmt="${k}" id="ppb-fmt-${k}" aria-controls="ppb-preview-body">${FORMATS[k].label}</button>`).join('')}
      </div>
    </div>
    <div class="ppb-preview-body" id="ppb-preview-body" role="tabpanel" tabindex="-1"></div>
    <div class="ppb-export" id="ppb-export" hidden>
      <div class="ppb-checks" id="ppb-checks" tabindex="-1"></div>
      <div class="ppb-export-head"><span class="ppb-label">Export</span><span class="ppb-mono ppb-count" id="ppb-export-size"></span></div>
      <div class="ppb-export-grid">
        ${Object.keys(FORMATS).map(k => `<button class="btn" type="button" data-act="export" data-fmt="${k}">${ms('download')}<span class="ppb-btn-label">${FORMATS[k].label}</span><span class="ppb-mono ppb-ext">.${FORMATS[k].ext}</span></button>`).join('')}
      </div>
      <button class="btn btn-accent ppb-copy-md" type="button" data-act="copyMd">${ms('content_copy')}<span>Copy Markdown</span></button>
    </div>
  </aside>
</div>
<div class="ppb-sr" id="ppb-live" aria-live="polite"></div>

<dialog class="ppb-dialog" id="ppb-picker" aria-labelledby="ppb-picker-title">
  <div class="ppb-dlg-head">
    <h3 class="ppb-dlg-title" id="ppb-picker-title">Add prompts from your library</h3>
    <button class="icon-btn" type="button" data-act="closePicker" aria-label="Close the library picker">${ms('close')}</button>
  </div>
  <div class="ppb-dlg-search">
    <input type="search" class="form-input" id="ppb-picker-search" placeholder="Search your prompts by title, text or tag" aria-label="Search your library" autocomplete="off">
    <p class="ppb-picker-status ppb-mono" id="ppb-picker-status" role="status" aria-live="polite"></p>
  </div>
  <ul class="ppb-picker-list" id="ppb-picker-list"></ul>
  <div class="ppb-dlg-foot">
    <span class="ppb-count ppb-mono" id="ppb-picker-added"></span>
    <button class="btn btn-accent" type="button" data-act="closePicker">Done</button>
  </div>
</dialog>`;

    /* ---------- rail ---------- */
    function renderRail() {
        const list = $('#ppb-pack-list');
        $('#ppb-pack-n').textContent = store.packs.length;
        $('#ppb-tab-packs-n').textContent = store.packs.length;
        if (!store.packs.length) {
            list.innerHTML = '<li class="ppb-rail-empty">No saved packs yet. Create one or import a pack file.</li>';
            return;
        }
        list.innerHTML = store.packs.map(p => {
            const name = p.title.trim() || 'Untitled pack';
            const active = p.id === store.activeId;
            const meta = '<span class="ppb-mono">' + nf(p.prompts.length) + '</span> ' + (p.prompts.length === 1 ? 'prompt' : 'prompts') + ' · ' + esc(ago(p.updated));
            if (ui.confirmPack === p.id) {
                return '<li class="ppb-pack ppb-pack-confirm" data-id="' + esc(p.id) + '"><p class="ppb-confirm-text">Delete <b>' + esc(name) + '</b>? This cannot be undone.</p>' +
                    '<div class="ppb-confirm-actions"><button class="btn btn-danger ppb-btn-sm" type="button" data-act="deletePack">' + ms('delete') + '<span>Delete pack</span></button>' +
                    '<button class="btn ppb-btn-sm" type="button" data-act="cancelConfirm">Keep it</button></div></li>';
            }
            if (ui.renaming === p.id) {
                return '<li class="ppb-pack' + (active ? ' ppb-pack-active' : '') + '" data-id="' + esc(p.id) + '"><input class="form-input ppb-rename" id="ppb-rename" value="' + esc(p.title) + '" maxlength="200" placeholder="Untitled pack" aria-label="Rename pack"></li>';
            }
            return '<li class="ppb-pack' + (active ? ' ppb-pack-active' : '') + '" data-id="' + esc(p.id) + '">' +
                '<button class="ppb-pack-main" type="button" data-act="selectPack"' + (active ? ' aria-current="true"' : '') + '><span class="ppb-pack-name' + (p.title.trim() ? '' : ' ppb-muted') + '">' + esc(name) + '</span><span class="ppb-pack-meta">' + meta + '</span></button>' +
                '<span class="ppb-pack-actions"><button class="icon-btn ppb-icon-sm" type="button" data-act="renamePack" aria-label="Rename ' + esc(name) + '" title="Rename">' + ms('edit') + '</button>' +
                '<button class="icon-btn ppb-icon-sm" type="button" data-act="askDeletePack" aria-label="Delete ' + esc(name) + '" title="Delete">' + ms('delete') + '</button></span></li>';
        }).join('');
    }

    /* ---------- editor ---------- */
    function renderTags(p) {
        $('#ppb-tag-chips').innerHTML = p.tags.map(t => '<span class="ppb-chip">' + esc(t) + '<button type="button" data-act="removeTag" data-tag="' + esc(t) + '" aria-label="Remove tag ' + esc(t) + '">' + ms('close') + '</button></span>').join('');
        $('#ppb-tag-n').textContent = p.tags.length + ' of ' + MAX_TAGS;
    }
    function loadFields(p) {
        $$('[data-field]').forEach(el => { el.value = p[el.dataset.field] || ''; });
        renderTags(p);
    }
    function cardHtml(x, i, total, p) {
        const bodyEmpty = !x.body.trim();
        const flag = ui.attempted && bodyEmpty;
        const n = String(i + 1).padStart(2, '0');
        const name = x.title.trim() || 'Prompt ' + (i + 1);
        const confirm = ui.confirmPrompt === x.uid;
        return '<li class="ppb-card' + (flag ? ' ppb-card-flag' : '') + '" data-uid="' + esc(x.uid) + '">' +
            '<div class="ppb-card-head">' +
            '<span class="ppb-grip" role="button" tabindex="0" draggable="true" data-grip aria-label="Reorder ' + esc(name) + ', position ' + (i + 1) + ' of ' + total + '. Drag, or use the arrow keys." title="Drag to reorder">' + ms('drag_indicator') + '</span>' +
            '<span class="ppb-num ppb-mono">' + n + '</span>' +
            '<input class="form-input ppb-card-title" data-card="title" value="' + esc(x.title) + '" maxlength="300" placeholder="Prompt title" aria-label="Title of prompt ' + (i + 1) + '" autocomplete="off">' +
            '<div class="ppb-card-actions">' +
            '<button class="icon-btn ppb-icon-sm" type="button" data-act="up" aria-label="Move ' + esc(name) + ' up"' + (i === 0 ? ' disabled' : '') + '>' + ms('arrow_upward') + '</button>' +
            '<button class="icon-btn ppb-icon-sm" type="button" data-act="down" aria-label="Move ' + esc(name) + ' down"' + (i === total - 1 ? ' disabled' : '') + '>' + ms('arrow_downward') + '</button>' +
            '<button class="icon-btn ppb-icon-sm" type="button" data-act="dup" aria-label="Duplicate ' + esc(name) + '" title="Duplicate"' + (total >= MAX_PROMPTS ? ' disabled' : '') + '>' + ms('content_copy') + '</button>' +
            '<button class="icon-btn ppb-icon-sm" type="button" data-act="askRemove" aria-label="Remove ' + esc(name) + '" title="Remove">' + ms('delete') + '</button>' +
            '</div></div>' +
            (confirm ? '<div class="ppb-confirm" role="group" aria-label="Confirm removal"><p class="ppb-confirm-text">Remove <b>' + esc(name) + '</b> from this pack?</p><div class="ppb-confirm-actions"><button class="btn btn-danger ppb-btn-sm" type="button" data-act="remove">' + ms('delete') + '<span>Remove prompt</span></button><button class="btn ppb-btn-sm" type="button" data-act="cancelConfirm">Keep it</button></div></div>' : '') +
            '<textarea class="form-textarea ppb-card-body" data-card="body" rows="6" maxlength="60000" placeholder="Write the prompt here. Variables like [[name]], {{name}} and ((name)) are kept exactly as typed." aria-label="Body of prompt ' + (i + 1) + '"' + (flag ? ' aria-invalid="true"' : '') + '>' + esc(x.body) + '</textarea>' +
            '<p class="ppb-card-error" data-role="error"' + (flag ? '' : ' hidden') + '>' + ms('error') + '<span>This prompt has no body. Add text or remove it before exporting.</span></p>' +
            '<input class="form-input ppb-card-note" data-card="note" value="' + esc(x.note) + '" maxlength="1000" placeholder="Short usage note (optional)" aria-label="Usage note for prompt ' + (i + 1) + '" autocomplete="off">' +
            '<div class="ppb-card-meta"><span class="ppb-src">' + (x.source === 'library' ? ms('library_books') + 'From your library' : ms('edit_note') + 'Written here') + '</span>' +
            '<span class="ppb-mono" data-role="meta">' + metaText(x.body) + '</span></div></li>';
    }
    function metaText(body) {
        const v = countVars(body);
        return nf(String(body).length) + ' characters · ' + v + (v === 1 ? ' variable' : ' variables');
    }
    function renderPrompts(focus) {
        const p = activePack();
        if (!p) return;
        const list = $('#ppb-prompts');
        $('#ppb-prompt-n').textContent = p.prompts.length;
        if (!p.prompts.length) {
            list.innerHTML = '<li class="ppb-prompts-empty">' + ms('format_list_bulleted_add') + '<p>This pack has no prompts yet. Add some from your library or write a new one.</p></li>';
            return;
        }
        list.innerHTML = p.prompts.map((x, i) => cardHtml(x, i, p.prompts.length, p)).join('');
        if (focus) {
            const el = $(focus);
            if (el && !el.disabled) el.focus();
            else {
                const uid = (focus.match(/data-uid="([^"]+)"/) || [])[1];
                const alt = uid && $('[data-uid="' + uid + '"] .ppb-grip');
                if (alt) alt.focus();
            }
        }
    }
    function renderEditor() {
        const p = activePack();
        $('#ppb-empty').hidden = !!p;
        $('#ppb-edit-body').hidden = !p;
        if (!p) return;
        loadFields(p);
        renderPrompts();
        renderSaveState();
    }

    /* ---------- validation and preview ---------- */
    function validate(p) {
        const issues = [];
        if (!p.title.trim()) issues.push({ level: 'error', text: 'Add a pack title.', target: 'title' });
        if (!p.prompts.length) issues.push({ level: 'error', text: 'Add at least one prompt.', target: 'add' });
        p.prompts.forEach((x, i) => { if (!x.body.trim()) issues.push({ level: 'error', text: 'Prompt ' + (i + 1) + ' has an empty body.', target: 'prompt', uid: x.uid }); });
        p.prompts.forEach((x, i) => { if (!x.title.trim()) issues.push({ level: 'warn', text: 'Prompt ' + (i + 1) + ' has no title. It will be exported as Prompt ' + (i + 1) + '.', target: 'prompt', uid: x.uid, field: 'title' }); });
        return issues;
    }
    function renderChecks() {
        const p = activePack();
        const box = $('#ppb-checks');
        const wrap = $('#ppb-export');
        wrap.hidden = !p;
        if (!p) { $('#ppb-tab-issues').textContent = ''; return; }
        const issues = validate(p);
        const errors = issues.filter(i => i.level === 'error');
        const tabN = $('#ppb-tab-issues');
        tabN.textContent = errors.length ? errors.length : '';
        tabN.classList.toggle('ppb-count-bad', errors.length > 0);
        if (!errors.length) ui.attempted = false;
        let html = errors.length
            ? '<p class="ppb-check-head ppb-check-bad">' + ms('error') + '<span>' + errors.length + (errors.length === 1 ? ' thing' : ' things') + ' to fix before exporting</span></p>'
            : '<p class="ppb-check-head ppb-check-ok">' + ms('check_circle') + '<span>Ready to export</span></p>';
        if (issues.length) {
            html += '<ul class="ppb-check-list">' + issues.map((it, n) =>
                '<li><button class="ppb-check-item ppb-check-' + it.level + '" type="button" data-act="gotoIssue" data-n="' + n + '">' + ms(it.level === 'error' ? 'error' : 'warning') + '<span>' + esc(it.text) + '</span>' + ms('arrow_forward', 'ppb-check-go') + '</button></li>').join('') + '</ul>';
        }
        box.innerHTML = html;
        box._issues = issues;
        $$('[data-act="export"], [data-act="copyMd"]').forEach(b => b.setAttribute('aria-disabled', errors.length ? 'true' : 'false'));
    }
    function renderPreview() {
        clearTimeout(previewTimer);
        const p = activePack();
        const body = $('#ppb-preview-body');
        $$('.ppb-fmt').forEach(b => { const on = b.dataset.fmt === ui.fmt; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
        body.setAttribute('aria-labelledby', 'ppb-fmt-' + ui.fmt);
        if (!p) {
            body.innerHTML = '<div class="ppb-preview-empty">' + ms('preview') + '<p>Open a pack to see how it will look when exported.</p></div>';
            renderChecks();
            return;
        }
        const out = BUILDERS[ui.fmt](p);
        if (ui.fmt === 'html') {
            let frame = $('iframe', body);
            if (!frame) {
                body.innerHTML = '<iframe class="ppb-frame" title="Preview of the exported web page" sandbox="allow-scripts"></iframe>';
                frame = $('iframe', body);
            }
            frame.srcdoc = out;
        } else {
            let pre = $('pre', body);
            if (!pre) {
                body.innerHTML = '<pre class="ppb-code" tabindex="0"></pre>';
                pre = $('pre', body);
            }
            pre.textContent = out;
        }
        $('#ppb-export-size').textContent = nf(out.length) + ' characters';
        renderChecks();
    }
    function queuePreview() {
        clearTimeout(previewTimer);
        previewTimer = setTimeout(renderPreview, 140);
    }
    function renderAll() {
        renderRail();
        renderEditor();
        renderPreview();
        applyPane();
    }
    function applyPane() {
        root.dataset.ppbPane = ui.pane;
        $$('#ppb-pane-tabs .ppb-tab').forEach(b => { const on = b.dataset.pane === ui.pane; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    }
    // Called after any edit that changes the pack text, without rebuilding the form under the cursor.
    function changed(p, structural) {
        touch(p);
        renderRailSoft();
        if (structural) renderPreview(); else queuePreview();
        if (ui.attempted) { clearTimeout(previewTimer); renderChecks(); refreshFlags(p); }
    }
    function renderRailSoft() {
        if (ui.renaming) return;
        renderRail();
    }
    function refreshFlags(p) {
        $$('.ppb-card').forEach(li => {
            const x = promptByUid(p, li.dataset.uid);
            if (!x) return;
            const flag = ui.attempted && !x.body.trim();
            li.classList.toggle('ppb-card-flag', flag);
            const err = $('[data-role="error"]', li);
            if (err) err.hidden = !flag;
            const ta = $('.ppb-card-body', li);
            if (ta) { if (flag) ta.setAttribute('aria-invalid', 'true'); else ta.removeAttribute('aria-invalid'); }
        });
    }

    /* ---------- pack actions ---------- */
    function newPack() {
        if (store.packs.length >= MAX_PACKS) return toast('You can keep up to ' + MAX_PACKS + ' packs. Delete one first.', 'warning');
        const p = blankPack();
        store.packs.unshift(p);
        store.activeId = p.id;
        ui.attempted = false; ui.confirmPrompt = null; ui.confirmPack = null; ui.renaming = null;
        ui.pane = 'edit';
        saveNow();
        renderAll();
        const t = $('#ppb-f-title');
        if (t) t.focus();
    }
    function selectPack(id) {
        if (!store.packs.some(p => p.id === id)) return;
        store.activeId = id;
        ui.attempted = false; ui.confirmPrompt = null; ui.confirmPack = null; ui.renaming = null;
        ui.pane = 'edit';
        saveNow();
        renderAll();
    }
    function deletePack(id) {
        const i = store.packs.findIndex(p => p.id === id);
        if (i < 0) return;
        const name = store.packs[i].title.trim() || 'Untitled pack';
        store.packs.splice(i, 1);
        ui.confirmPack = null;
        if (store.activeId === id) {
            const next = store.packs[Math.min(i, store.packs.length - 1)];
            store.activeId = next ? next.id : null;
            ui.attempted = false; ui.confirmPrompt = null;
        }
        saveNow();
        renderAll();
        toast('Deleted ' + name, 'info');
        const f = $('.ppb-pack-main') || $('[data-act="newPack"]');
        if (f) f.focus();
    }
    function commitRename(id, value) {
        if (ui.renaming !== id) return;
        ui.renaming = null;
        const p = store.packs.find(x => x.id === id);
        if (p && value !== p.title) {
            p.title = value.trim().slice(0, 200);
            touch(p);
            if (p.id === store.activeId) { const t = $('#ppb-f-title'); if (t) t.value = p.title; }
        }
        renderRail();
        renderPreview();
        const b = $('[data-id="' + id + '"] .ppb-pack-main');
        if (b) b.focus();
    }

    /* ---------- prompt actions ---------- */
    function addPrompt(entry, focusNew) {
        const p = activePack();
        if (!p) return false;
        if (p.prompts.length >= MAX_PROMPTS) { toast('A pack can hold up to ' + MAX_PROMPTS + ' prompts.', 'warning'); return false; }
        const x = Object.assign(cleanPrompt(entry), { uid: rid('pr') });
        p.prompts.push(x);
        changed(p, true);
        renderPrompts(focusNew ? '[data-uid="' + x.uid + '"] .ppb-card-title' : null);
        if (focusNew) {
            const li = $('[data-uid="' + x.uid + '"]');
            if (li) li.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        return true;
    }
    function movePrompt(uid, to, focusAct) {
        const p = activePack();
        if (!p) return;
        const from = p.prompts.findIndex(x => x.uid === uid);
        if (from < 0 || to < 0 || to >= p.prompts.length || to === from) return;
        const x = p.prompts.splice(from, 1)[0];
        p.prompts.splice(to, 0, x);
        changed(p, true);
        ui.confirmPrompt = null;
        renderPrompts('[data-uid="' + uid + '"] ' + (focusAct || '.ppb-grip'));
        live((x.title.trim() || 'Prompt') + ' moved to position ' + (to + 1) + ' of ' + p.prompts.length);
    }
    function duplicatePrompt(uid) {
        const p = activePack();
        if (!p || p.prompts.length >= MAX_PROMPTS) return;
        const i = p.prompts.findIndex(x => x.uid === uid);
        if (i < 0) return;
        const src = p.prompts[i];
        const copy = Object.assign({}, src, { uid: rid('pr'), title: src.title.trim() ? src.title + ' copy' : '' });
        p.prompts.splice(i + 1, 0, copy);
        changed(p, true);
        renderPrompts('[data-uid="' + copy.uid + '"] .ppb-card-title');
        live('Duplicated. The copy is prompt ' + (i + 2) + ' of ' + p.prompts.length);
    }
    function removePrompt(uid) {
        const p = activePack();
        if (!p) return;
        const i = p.prompts.findIndex(x => x.uid === uid);
        if (i < 0) return;
        p.prompts.splice(i, 1);
        ui.confirmPrompt = null;
        changed(p, true);
        const next = p.prompts[Math.min(i, p.prompts.length - 1)];
        renderPrompts(next ? '[data-uid="' + next.uid + '"] .ppb-grip' : null);
        if (!next) { const b = $('#ppb-add-new'); if (b) b.focus(); }
        live('Prompt removed. ' + p.prompts.length + ' left in the pack.');
    }
    function dropMove(dragUid, overUid, after) {
        const p = activePack();
        if (!p || dragUid === overUid) return;
        const from = p.prompts.findIndex(x => x.uid === dragUid);
        let to = p.prompts.findIndex(x => x.uid === overUid);
        if (from < 0 || to < 0) return;
        if (after) to += 1;
        if (from < to) to -= 1;
        movePrompt(dragUid, to, '.ppb-grip');
    }

    /* ---------- tags ---------- */
    function addTags(raw) {
        const p = activePack();
        if (!p) return false;
        const parts = String(raw).split(',').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
        let added = false;
        parts.forEach(t => {
            if (p.tags.length >= MAX_TAGS) return;
            if (p.tags.some(x => x.toLowerCase() === t.toLowerCase())) return;
            p.tags.push(t.slice(0, 40));
            added = true;
        });
        if (parts.length && p.tags.length >= MAX_TAGS && !added) toast('A pack can have up to ' + MAX_TAGS + ' tags.', 'warning');
        if (added) { renderTags(p); changed(p, true); }
        return added;
    }

    /* ---------- library picker ---------- */
    function pickerOpen() { const d = $('#ppb-picker'); return !!d && d.open; }
    function openPicker() {
        const p = activePack();
        if (!p) return;
        const d = $('#ppb-picker');
        ui.libQuery = '';
        $('#ppb-picker-search').value = '';
        updateAddedCount();
        if (!d.open) d.showModal();
        loadLibrary();
        $('#ppb-picker-search').focus();
    }
    function closePicker() {
        const d = $('#ppb-picker');
        if (d && d.open) d.close();
    }
    async function loadLibrary() {
        ui.libState = 'loading';
        renderPicker();
        try {
            const res = await fetch('/api/prompts', { cache: 'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            ui.library = (Array.isArray(data) ? data : []).filter(x => x && typeof x.content === 'string');
            ui.libState = 'ready';
        } catch (e) {
            ui.library = null;
            ui.libState = 'error';
        }
        if (pickerOpen()) renderPicker();
    }
    function libraryMatches() {
        const q = ui.libQuery.trim().toLowerCase();
        const all = ui.library || [];
        if (!q) return all;
        const words = q.split(/\s+/);
        return all.filter(x => {
            const hay = ((x.title || '') + ' ' + (x.content || '') + ' ' + (x.description || '') + ' ' + (Array.isArray(x.tags) ? x.tags.join(' ') : '')).toLowerCase();
            return words.every(w => hay.includes(w));
        });
    }
    function inPackCount(libId) {
        const p = activePack();
        return p ? p.prompts.filter(x => x.source === 'library' && x.libraryId === libId).length : 0;
    }
    function updateAddedCount() {
        const p = activePack();
        const el = $('#ppb-picker-added');
        if (el && p) el.textContent = nf(p.prompts.length) + (p.prompts.length === 1 ? ' prompt' : ' prompts') + ' in this pack';
    }
    function pickBtn(id) {
        const n = inPackCount(id);
        return (n ? '<span class="ppb-in-pack ppb-mono">' + ms('check') + 'In pack ' + n + '</span>' : '') +
            '<button class="btn ppb-btn-sm" type="button" data-act="pickAdd" data-id="' + esc(id) + '">' + ms('add') + '<span>' + (n ? 'Add again' : 'Add') + '</span></button>';
    }
    function renderPicker() {
        const list = $('#ppb-picker-list');
        const status = $('#ppb-picker-status');
        if (ui.libState === 'loading') {
            status.textContent = 'Loading your library';
            list.innerHTML = '<li class="ppb-picker-note">Loading your library</li>';
            return;
        }
        if (ui.libState === 'error') {
            status.textContent = '';
            list.innerHTML = '<li class="ppb-picker-note ppb-picker-error">' + ms('error') + '<p>Could not load your library. Check that the app is running, then try again.</p><button class="btn" type="button" data-act="retryLibrary">' + ms('refresh') + '<span>Try again</span></button></li>';
            return;
        }
        const matches = libraryMatches();
        const shown = matches.slice(0, PICKER_LIMIT);
        const total = (ui.library || []).length;
        if (!total) {
            status.textContent = '0 prompts';
            list.innerHTML = '<li class="ppb-picker-note">Your library has no prompts yet. Use Write new prompt to create one inside this pack.</li>';
            return;
        }
        status.textContent = matches.length > shown.length
            ? 'Showing ' + nf(shown.length) + ' of ' + nf(matches.length) + ' matches. Refine the search to narrow the list.'
            : nf(matches.length) + (matches.length === 1 ? ' prompt' : ' prompts');
        if (!shown.length) {
            list.innerHTML = '<li class="ppb-picker-note">No prompts match that search.</li>';
            return;
        }
        list.innerHTML = shown.map(x => {
            const snippet = String(x.content).replace(/\s+/g, ' ').trim().slice(0, 150);
            const tags = (Array.isArray(x.tags) ? x.tags : []).slice(0, 3).map(t => '<span class="ppb-chip ppb-chip-quiet">' + esc(t) + '</span>').join('');
            return '<li class="ppb-pick" data-lib="' + esc(x.id) + '"><div class="ppb-pick-main"><span class="ppb-pick-title">' + esc(x.title || 'Untitled') + '</span><span class="ppb-pick-snippet">' + esc(snippet) + '</span>' + (tags ? '<span class="ppb-pick-tags">' + tags + '</span>' : '') + '</div><div class="ppb-pick-act">' + pickBtn(x.id) + '</div></li>';
        }).join('');
    }
    function pickAdd(id, btn) {
        const lib = (ui.library || []).find(x => String(x.id) === String(id));
        if (!lib) return;
        const ok = addPrompt({ title: lib.title || '', body: lib.content, note: lib.description || '', source: 'library', libraryId: lib.id }, false);
        if (!ok) return;
        const li = btn.closest('.ppb-pick');
        if (li) {
            const act = $('.ppb-pick-act', li);
            act.innerHTML = pickBtn(lib.id);
            const again = $('button', act);
            if (again) again.focus();
        }
        updateAddedCount();
        live('Added ' + (lib.title || 'prompt') + ' to the pack');
    }

    /* ---------- export and import ---------- */
    function slug(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'prompt-pack'; }
    function fileName(p, fmt) {
        const v = oneLine(p.version);
        return slug(p.title) + (v ? '-v' + slug(v) : '') + '.' + FORMATS[fmt].ext;
    }
    function download(name, text, mime, okMsg) {
        const blob = new Blob([text], { type: mime + ';charset=utf-8' });
        if (window.PL_saveBlob) return window.PL_saveBlob(blob, name, okMsg);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.rel = 'noopener';
        a.hidden = true;
        root.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
    function blockedByChecks(p) {
        const errors = validate(p).filter(i => i.level === 'error');
        if (!errors.length) return false;
        ui.attempted = true;
        renderChecks();
        refreshFlags(p);
        toast('Fix the issues listed under Export first', 'warning');
        const c = $('#ppb-checks');
        if (c) c.focus();
        return true;
    }
    function doExport(fmt) {
        const p = activePack();
        if (!p || !FORMATS[fmt] || blockedByChecks(p)) return;
        download(fileName(p, fmt), BUILDERS[fmt](p), FORMATS[fmt].mime, 'Exported ' + FORMATS[fmt].label);
    }
    async function copyMarkdown() {
        const p = activePack();
        if (!p || blockedByChecks(p)) return;
        const text = buildMarkdown(p);
        let ok = false;
        try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.setAttribute('readonly', '');
                ta.className = 'ppb-sr';
                root.appendChild(ta);
                ta.select();
                ok = document.execCommand('copy');
                ta.remove();
            } catch (e2) { ok = false; }
        }
        toast(ok ? 'Markdown copied to the clipboard' : 'Could not copy. Use the Markdown download instead.', ok ? 'success' : 'error');
    }
    function importFile(file) {
        if (!file) return;
        if (file.size > MAX_IMPORT_BYTES) return showBanner('That file is larger than 2 MB, so it was not imported.', 'error');
        const reader = new FileReader();
        reader.onerror = () => showBanner('The file could not be read.', 'error');
        reader.onload = () => {
            const res = parsePackJson(String(reader.result || ''));
            if (res.error) { showBanner('Import failed. ' + res.error, 'error'); toast('Import failed', 'error'); return; }
            if (store.packs.length >= MAX_PACKS) return showBanner('You already have ' + MAX_PACKS + ' packs. Delete one before importing.', 'error');
            store.packs.unshift(res.pack);
            store.activeId = res.pack.id;
            ui.attempted = false; ui.confirmPrompt = null; ui.confirmPack = null; ui.renaming = null;
            ui.pane = 'edit';
            saveNow();
            renderAll();
            const n = res.pack.prompts.length;
            showBanner('Imported ' + (res.pack.title || 'Untitled pack') + ' with ' + n + (n === 1 ? ' prompt' : ' prompts') + (res.skipped ? '. ' + res.skipped + ' entries were skipped.' : '.'), 'ok');
            toast('Pack imported', 'success');
        };
        reader.readAsText(file);
    }

    /* ---------- events ---------- */
    const actions = {
        close: () => closeWorkspace(),
        import: () => { const f = $('#ppb-file'); f.value = ''; f.click(); },
        newPack,
        selectPack: t => selectPack(t.closest('[data-id]').dataset.id),
        renamePack: t => { ui.renaming = t.closest('[data-id]').dataset.id; ui.confirmPack = null; renderRail(); const i = $('#ppb-rename'); if (i) { i.focus(); i.select(); } },
        askDeletePack: t => { ui.confirmPack = t.closest('[data-id]').dataset.id; ui.renaming = null; renderRail(); const b = $('.ppb-pack-confirm [data-act="cancelConfirm"]'); if (b) b.focus(); },
        deletePack: t => deletePack(t.closest('[data-id]').dataset.id),
        cancelConfirm: () => cancelConfirm(true),
        pane: t => { ui.pane = t.dataset.pane; applyPane(); },
        fmt: t => { ui.fmt = t.dataset.fmt; renderPreview(); },
        addFromLibrary: openPicker,
        writeNew: () => addPrompt({ source: 'custom' }, true),
        closePicker,
        retryLibrary: loadLibrary,
        pickAdd: t => pickAdd(t.dataset.id, t),
        up: t => { const uid = t.closest('[data-uid]').dataset.uid; const p = activePack(); const i = p.prompts.findIndex(x => x.uid === uid); movePrompt(uid, i - 1, '[data-act="up"]'); },
        down: t => { const uid = t.closest('[data-uid]').dataset.uid; const p = activePack(); const i = p.prompts.findIndex(x => x.uid === uid); movePrompt(uid, i + 1, '[data-act="down"]'); },
        dup: t => duplicatePrompt(t.closest('[data-uid]').dataset.uid),
        askRemove: t => { ui.confirmPrompt = t.closest('[data-uid]').dataset.uid; renderPrompts('[data-uid="' + ui.confirmPrompt + '"] [data-act="cancelConfirm"]'); },
        remove: t => removePrompt(t.closest('[data-uid]').dataset.uid),
        removeTag: t => { const p = activePack(); if (!p) return; p.tags = p.tags.filter(x => x !== t.dataset.tag); renderTags(p); changed(p, true); $('#ppb-f-tags').focus(); },
        export: t => doExport(t.dataset.fmt),
        copyMd: copyMarkdown,
        dismissBanner: () => { $('#ppb-banner').hidden = true; },
        gotoIssue: t => gotoIssue(t)
    };
    function cancelConfirm(refocus) {
        const pr = ui.confirmPrompt, pk = ui.confirmPack;
        ui.confirmPrompt = null;
        ui.confirmPack = null;
        if (pk) { renderRail(); const b = $('[data-id="' + pk + '"] .ppb-pack-main'); if (refocus && b) b.focus(); }
        if (pr) { renderPrompts(refocus ? '[data-uid="' + pr + '"] [data-act="askRemove"]' : null); }
    }
    function gotoIssue(t) {
        const issues = $('#ppb-checks')._issues || [];
        const it = issues[Number(t.dataset.n)];
        const p = activePack();
        if (!it || !p) return;
        ui.pane = 'edit';
        applyPane();
        let el = null;
        if (it.target === 'title') el = $('#ppb-f-title');
        else if (it.target === 'add') el = $('#ppb-add-new');
        else if (it.target === 'prompt') {
            const li = $('[data-uid="' + it.uid + '"]');
            el = li && $(it.field === 'title' ? '.ppb-card-title' : '.ppb-card-body', li);
        }
        if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    }

    function bind() {
        root.addEventListener('click', e => {
            const t = e.target.closest('[data-act]');
            if (!t || !root.contains(t)) return;
            if (t.disabled) return;
            const fn = actions[t.dataset.act];
            if (fn) fn(t, e);
        });
        root.addEventListener('input', e => {
            const el = e.target;
            const p = activePack();
            if (!p) return;
            if (el.dataset && el.dataset.field) {
                p[el.dataset.field] = el.value;
                changed(p, false);
            } else if (el.dataset && el.dataset.card) {
                const x = promptByUid(p, el.closest('[data-uid]').dataset.uid);
                if (!x) return;
                x[el.dataset.card] = el.value;
                if (el.dataset.card === 'body') { const m = $('[data-role="meta"]', el.closest('.ppb-card')); if (m) m.textContent = metaText(x.body); }
                changed(p, false);
            } else if (el.id === 'ppb-f-tags' && /[,\n]/.test(el.value)) {
                addTags(el.value);
                el.value = '';
            } else if (el.id === 'ppb-picker-search') {
                ui.libQuery = el.value;
                clearTimeout(el._t);
                el._t = setTimeout(renderPicker, 120);
            }
        });
        root.addEventListener('mousedown', e => {
            const box = e.target.closest('#ppb-tagbox');
            if (box && !e.target.closest('button') && e.target.id !== 'ppb-f-tags') { e.preventDefault(); $('#ppb-f-tags').focus(); }
        });
        root.addEventListener('change', e => {
            if (e.target.id === 'ppb-file') importFile(e.target.files && e.target.files[0]);
        });
        root.addEventListener('keydown', e => {
            const el = e.target;
            if (el.id === 'ppb-f-tags') {
                if (e.key === 'Enter') { e.preventDefault(); if (el.value.trim()) { addTags(el.value); el.value = ''; } }
                else if (e.key === 'Backspace' && !el.value) {
                    const p = activePack();
                    if (p && p.tags.length) { p.tags.pop(); renderTags(p); changed(p, true); }
                }
            } else if (el.id === 'ppb-rename') {
                const id = el.closest('[data-id]').dataset.id;
                if (e.key === 'Enter') { e.preventDefault(); commitRename(id, el.value); }
                else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); ui.renaming = null; renderRail(); const b = $('[data-id="' + id + '"] .ppb-pack-main'); if (b) b.focus(); }
            } else if (el.hasAttribute && el.hasAttribute('data-grip')) {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const uid = el.closest('[data-uid]').dataset.uid;
                    const p = activePack();
                    const i = p.prompts.findIndex(x => x.uid === uid);
                    movePrompt(uid, i + (e.key === 'ArrowUp' ? -1 : 1), '.ppb-grip');
                }
            } else if (e.target.closest && e.target.closest('[role="tablist"]') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
                const tabs = $$('[role="tab"]', e.target.closest('[role="tablist"]')).filter(b => b.offsetParent !== null);
                const i = tabs.indexOf(e.target);
                if (i < 0) return;
                e.preventDefault();
                const nx = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
                nx.focus();
                nx.click();
            }
        });
        root.addEventListener('focusout', e => {
            const el = e.target;
            if (el.id === 'ppb-rename') commitRename(el.closest('[data-id]').dataset.id, el.value);
            else if (el.id === 'ppb-f-tags' && el.value.trim()) { addTags(el.value); el.value = ''; }
        });
        // Drag to reorder. Only the grip is draggable, so text selection in the fields stays normal.
        root.addEventListener('dragstart', e => {
            const g = e.target.closest && e.target.closest('[data-grip]');
            const li = g && g.closest('.ppb-card');
            if (!li) return;
            ui.dragUid = li.dataset.uid;
            e.dataTransfer.effectAllowed = 'move';
            try { e.dataTransfer.setData('text/plain', ui.dragUid); e.dataTransfer.setDragImage(li, 24, 24); } catch (x) { /* some engines refuse */ }
            setTimeout(() => li.classList.add('ppb-dragging'), 0);
        });
        root.addEventListener('dragover', e => {
            if (!ui.dragUid) return;
            const li = e.target.closest && e.target.closest('.ppb-card');
            if (!li) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            $$('.ppb-drop-before, .ppb-drop-after').forEach(n => n.classList.remove('ppb-drop-before', 'ppb-drop-after'));
            if (li.dataset.uid === ui.dragUid) { ui.dropUid = null; return; }
            const r = li.getBoundingClientRect();
            ui.dropUid = li.dataset.uid;
            ui.dropAfter = e.clientY > r.top + r.height / 2;
            li.classList.add(ui.dropAfter ? 'ppb-drop-after' : 'ppb-drop-before');
        });
        root.addEventListener('drop', e => {
            if (!ui.dragUid) return;
            e.preventDefault();
            const from = ui.dragUid, over = ui.dropUid, after = ui.dropAfter;
            endDrag();
            if (over) dropMove(from, over, after);
        });
        root.addEventListener('dragend', endDrag);
    }
    function endDrag() {
        ui.dragUid = null;
        ui.dropUid = null;
        $$('.ppb-dragging, .ppb-drop-before, .ppb-drop-after').forEach(n => n.classList.remove('ppb-dragging', 'ppb-drop-before', 'ppb-drop-after'));
    }

    function mount() {
        if (mounted) return;
        store = loadStore();
        root.innerHTML = MARKUP;
        mounted = true;
        bind();
    }

    /* ---------- open and close ---------- */
    function closeWorkspace() {
        if (!root) return;
        if (saveTimer) saveNow();
        closePicker();
        root.classList.remove('open');
        document.querySelectorAll('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
        if (opener && opener.isConnected && typeof opener.focus === 'function') { try { opener.focus(); } catch (e) { /* ignore */ } }
        opener = null;
    }
    function ensureRoot() {
        root = document.getElementById('promptPackBuilderWorkspace');
        if (!root) {
            root = document.createElement('div');
            root.id = 'promptPackBuilderWorkspace';
            root.setAttribute('role', 'region');
            root.setAttribute('aria-label', 'Prompt Pack Builder');
            document.body.appendChild(root);
        }
        return root;
    }
    window.openPromptPackBuilderWorkspace = function () {
        if (!document.body.classList.contains('is-premium')) return toast('Prompt Pack Builder is a Pro feature', 'warning');
        ensureRoot();
        mount();
        opener = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
        ui.attempted = false; ui.confirmPrompt = null; ui.confirmPack = null; ui.renaming = null;
        ui.pane = 'edit';
        root.classList.add('open');
        document.querySelectorAll('.nav-item[data-view]').forEach(el => el.classList.remove('active'));
        renderAll();
        root.setAttribute('tabindex', '-1');
        root.focus({ preventScroll: true });
    };
    window.PL_closePromptPackBuilder = closeWorkspace;
    Object.defineProperty(window, '__ppb', { configurable: true, get: () => ({ store, ui, build: BUILDERS, validate, parsePackJson }) });

    // Escape steps back out: confirmation, then field focus, then the workspace. It ignores everything while closed.
    document.addEventListener('keydown', e => {
        if (!isOpen() || e.key !== 'Escape') return;
        if (pickerOpen()) return;
        if (e.target !== document.body && !root.contains(e.target)) return;
        if (ui.confirmPrompt || ui.confirmPack) { cancelConfirm(true); return; }
        if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { e.target.blur(); return; }
        closeWorkspace();
    });
    window.addEventListener('pagehide', () => { if (saveTimer) saveNow(); });

    // The root exists from load so index.html needs no markup. Its contents are built on first open.
    function init() { try { ensureRoot(); } catch (e) { console.warn('Prompt Pack Builder could not create its root:', e); } }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
