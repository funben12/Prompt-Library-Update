/* Skill Foundry workspace: build a Claude skill by hand, review it, export it as a ready to use ZIP.
   Self contained: builds its own root element, owns every id and class (prefix sf) and reads the review rules from skill-foundry-review.js.
   Skills are kept in localStorage and also in the database settings table through /api/skill-foundry, because WebView localStorage can reset.
   Backups are Markdown. The AI review is optional and goes through window.PL_ai only, so no key is read here. No schema change. */
(function () {
    'use strict';

    const STORE_KEY = 'skill-foundry.v1';
    const API = '/api/skill-foundry';
    const MAX_SKILLS = 50, MAX_NODES = 300, MAX_DEPTH = 8, MAX_FILE = 1000000, MAX_ZIP_TOTAL = 5000000, MAX_ZIP_ENTRIES = 500, MAX_IMPORT_BYTES = 8000000;
    const FOLDERS = ['references', 'resources', 'examples', 'templates'];

    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const ms = (name, cls) => '<span class="material-symbols-outlined' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + name + '</span>';
    const toast = (msg, kind) => { if (window.PL_toast) window.PL_toast(msg, kind || 'info'); };
    const rid = () => 'sk_' + (window.crypto && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 12) : Math.random().toString(36).slice(2, 14));
    const str = (v, max) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, max || 100000);
    const slugify = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'new-skill';
    const R = () => window.PLSkillReview;

    const STARTER = '---\nname: example-skill\ndescription: Describe what this skill does and when Claude should use it.\n---\n\n# Example Skill\n\n## Purpose\nDescribe the job this skill performs.\n\n## Instructions\n1. Explain the first action.\n2. Explain the next action.\n3. Define the expected result.\n\n## Working rules\n- State the constraints the skill must follow.\n- Explain how to handle missing information.\n\n## Output format\nDescribe the structure of the response or deliverable.\n';

    /* ---------- tree helpers ---------- */
    const file = (name, content) => ({ type: 'file', name, content: content || '' });
    const folder = (name, children) => ({ type: 'folder', name, children: children || [] });
    function find(tree, path) {
        let list = tree, node = null;
        for (const part of String(path).split('/')) {
            node = list.find(n => n.name === part);
            if (!node) return null;
            list = node.children || [];
        }
        return node;
    }
    function parentOf(tree, path) {
        const parts = String(path).split('/'); const name = parts.pop(); let list = tree;
        for (const p of parts) { const f = list.find(n => n.name === p && n.type === 'folder'); if (!f) return null; list = f.children; }
        return { list, name };
    }
    function walk(nodes, prefix, out, depth) {
        out = out || []; prefix = prefix || ''; depth = depth || 0;
        nodes.forEach(n => {
            const path = prefix ? prefix + '/' + n.name : n.name;
            out.push({ node: n, path, depth });
            if (n.type === 'folder') walk(n.children, path, out, depth + 1);
        });
        return out;
    }
    const flatFiles = skill => walk(skill.tree).filter(x => x.node.type === 'file').map(x => ({ path: x.path, content: x.node.content }));
    const skillView = skill => ({ name: skill.name, slug: skill.slug, files: flatFiles(skill) });
    const safeName = n => typeof n === 'string' && n.length > 0 && n.length <= 120 && !/[\/\\\0]/.test(n) && n !== '.' && n !== '..';
    const safePath = p => typeof p === 'string' && p.length > 0 && p.length <= 400 && !/^[a-zA-Z]:/.test(p) && p.split('/').every(safeName);

    function cleanTree(list, depth, counter) {
        counter = counter || { n: 0 }; depth = depth || 0;
        const out = [], seen = new Set();
        (Array.isArray(list) ? list : []).forEach(n => {
            if (!n || typeof n !== 'object' || !safeName(n.name) || seen.has(n.name)) return;
            if (++counter.n > MAX_NODES) throw new Error('A skill can hold at most ' + MAX_NODES + ' files and folders');
            seen.add(n.name);
            if (n.type === 'folder') { if (depth < MAX_DEPTH) out.push(folder(n.name, cleanTree(n.children, depth + 1, counter))); }
            else out.push(file(n.name, str(n.content, MAX_FILE)));
        });
        return out;
    }
    function cleanSkill(o) {
        o = o && typeof o === 'object' ? o : {};
        const name = str(o.name, 100).trim() || 'Untitled skill';
        return { id: rid(), name, description: str(o.description, 1024), slug: slugify(o.slug || name), created: str(o.created, 40) || new Date().toISOString(), tree: cleanTree(o.tree) };
    }
    // Entries are { path, dir, content }. Parents are created as needed.
    function treeFromEntries(entries) {
        const root = [], counter = { n: 0 };
        entries.forEach(e => {
            if (!safePath(e.path)) throw new Error('The file path "' + String(e.path).slice(0, 60) + '" is not safe');
            const parts = e.path.split('/'); let list = root;
            parts.forEach((name, i) => {
                const last = i === parts.length - 1;
                if (last && !e.dir) {
                    const ex = list.find(n => n.name === name);
                    if (ex && ex.type === 'folder') throw new Error('A file and a folder share the name ' + e.path);
                    if (ex) ex.content = e.content; else { if (++counter.n > MAX_NODES) throw new Error('A skill can hold at most ' + MAX_NODES + ' files and folders'); list.push(file(name, e.content)); }
                } else {
                    let f = list.find(n => n.name === name);
                    if (f && f.type !== 'folder') throw new Error('A file and a folder share the name ' + parts.slice(0, i + 1).join('/'));
                    if (!f) { if (++counter.n > MAX_NODES) throw new Error('A skill can hold at most ' + MAX_NODES + ' files and folders'); f = folder(name); list.push(f); }
                    list = f.children;
                }
            });
        });
        return root;
    }

    /* ---------- storage ---------- */
    function blankStore() { return { v: 1, updated: 0, currentId: null, skills: [] }; }
    function cleanStore(o) {
        const s = blankStore();
        if (!o || typeof o !== 'object' || !Array.isArray(o.skills)) return s;
        s.updated = Number(o.updated) || 0;
        o.skills.slice(0, MAX_SKILLS).forEach(x => { try { const c = cleanSkill(x); c.id = str(x && x.id, 40) || c.id; s.skills.push(c); } catch (e) { /* skip a damaged skill */ } });
        s.currentId = s.skills.some(k => k.id === o.currentId) ? o.currentId : (s.skills[0] ? s.skills[0].id : null);
        return s;
    }
    let store = blankStore();
    let saveTimer = null, localOk = true;
    const ui = { open: false, sel: null, file: null, preview: false, modal: null, save: 'saved', review: null, ai: { status: 'idle', findings: [], summary: '', error: '', stamp: 0 }, reviewTimer: null };
    let root = null, mounted = false, opener = null;

    function loadLocal() {
        try { store = cleanStore(JSON.parse(localStorage.getItem(STORE_KEY) || 'null')); } catch (e) { store = blankStore(); }
    }
    function setSave(state) { ui.save = state; const el = root && root.querySelector('#sf-save'); if (el) paintSave(el); }
    function paintSave(el) {
        const map = { saved: ['check_circle', 'Saved'], saving: ['sync', 'Saving'], local: ['warning', 'Saved on this device only. Make a backup.'], failed: ['error', 'Not saved. Make a backup now.'] };
        const m = map[ui.save] || map.saved;
        el.className = 'sf-save sf-save-' + ui.save;
        el.innerHTML = ms(m[0]) + '<span>' + esc(m[1]) + '</span>';
    }
    function touch() {
        store.updated = Date.now();
        setSave('saving');
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveNow, 400);
    }
    function saveNow() {
        saveTimer = null;
        const json = JSON.stringify(store);
        localOk = true;
        try { localStorage.setItem(STORE_KEY, json); } catch (e) { localOk = false; }
        fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: json }) })
            .then(r => { if (!r.ok) throw new Error('save failed'); setSave('saved'); })
            .catch(() => { setSave(localOk ? 'local' : 'failed'); toast(localOk ? 'Skill Foundry could not reach the database. Your work is kept on this device. Make a backup.' : 'Skill Foundry could not save. Make a backup now.', 'warning'); });
    }
    // The database copy wins when it is newer. If it has nothing, this device's copy is pushed up.
    function hydrate() {
        fetch(API).then(r => (r.ok ? r.json() : Promise.reject(new Error('load failed')))).then(d => {
            let remote = null;
            try { remote = d && d.data ? cleanStore(JSON.parse(d.data)) : null; } catch (e) { remote = null; }
            if (remote && remote.updated > store.updated) {
                store = remote;
                try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* database copy still holds */ }
                if (ui.open) { openFirstFile(); renderAll(); }
            } else if (store.skills.length && (!remote || remote.updated < store.updated)) saveNow();
        }).catch(() => { setSave('local'); });
    }

    const cur = () => store.skills.find(s => s.id === store.currentId) || null;
    function openFirstFile() {
        const s = cur();
        ui.preview = false; ui.sel = null;
        ui.file = s && find(s.tree, 'SKILL.md') ? 'SKILL.md' : null;
        if (s && !ui.file) { const f = walk(s.tree).find(x => x.node.type === 'file'); ui.file = f ? f.path : null; }
        ui.sel = ui.file;
        ui.ai = { status: 'idle', findings: [], summary: '', error: '', stamp: 0 };
    }

    /* ---------- creating, importing ---------- */
    function newSkill(name, description) {
        if (store.skills.length >= MAX_SKILLS) { toast('You have reached the limit of ' + MAX_SKILLS + ' skills', 'warning'); return false; }
        const slug = slugify(name);
        const desc = description || 'Describe what this skill does and when Claude should use it.';
        const s = {
            id: rid(), name, description: description || '', slug, created: new Date().toISOString(),
            tree: [file('SKILL.md', STARTER.replace('example-skill', slug).replace('Describe what this skill does and when Claude should use it.', desc)),
                file('README.md', '# ' + name + '\n\n' + (description || '') + '\n\nThis folder contains the source files for this skill.\n')]
                .concat(FOLDERS.map(f => folder(f)))
        };
        store.skills.push(s); store.currentId = s.id;
        touch(); openFirstFile(); renderAll();
        toast('Skill created. Start with SKILL.md.', 'success');
        return true;
    }
    function uniqueSlug(slug) {
        let s = slug, i = 2;
        while (store.skills.some(k => k.slug === s)) s = (slug + '-' + i++).slice(0, 64);
        return s;
    }
    function addSkills(list) {
        let added = 0;
        list.forEach(s => {
            if (store.skills.length >= MAX_SKILLS) return;
            s.slug = uniqueSlug(s.slug); store.skills.push(s); store.currentId = s.id; added++;
        });
        if (added) { touch(); openFirstFile(); renderAll(); }
        return added;
    }

    /* ---------- frontmatter and export ---------- */
    function metaErrors(s) {
        const node = find(s.tree, 'SKILL.md');
        if (!node || node.type !== 'file') return ['SKILL.md is missing.'];
        const fm = R().parseFrontmatter(node.content), e = [];
        if (!fm.ok) return ['YAML frontmatter is missing or malformed.'];
        const name = fm.fields.name, desc = fm.fields.description;
        if (!name) e.push('The name field is required.');
        else {
            if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) e.push('The skill name should use lowercase letters, numbers and single hyphens.');
            if (name.length > 64) e.push('The skill name must be 64 characters or fewer.');
        }
        if (!desc) e.push('The description field is required.');
        else if (desc.length > 1024) e.push('The description must be 1024 characters or fewer.');
        return e;
    }

    const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
    function crc32(b) { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
    const u16 = v => [v & 255, (v >>> 8) & 255];
    const u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
    function cat(chunks) { const out = new Uint8Array(chunks.reduce((a, b) => a + b.length, 0)); let o = 0; chunks.forEach(b => { out.set(b, o); o += b.length; }); return out; }
    function makeZip(entries) {
        const enc = new TextEncoder(), local = [], central = [], d = new Date();
        const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
        const date = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
        let offset = 0;
        entries.forEach(e => {
            const name = enc.encode(e.path), data = enc.encode(e.content || ''), crc = crc32(data);
            const lh = new Uint8Array([].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(time), u16(date), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), Array.from(name)));
            local.push(lh, data);
            central.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(time), u16(date), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(e.path.endsWith('/') ? 0x10 : 0), u32(offset), Array.from(name))));
            offset += lh.length + data.length;
        });
        const cd = cat(central);
        const end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(cd.length), u32(offset), u16(0)));
        return new Blob([cat(local.concat([cd, end]))], { type: 'application/zip' });
    }
    async function parseZip(buffer) {
        const view = new DataView(buffer), bytes = new Uint8Array(buffer);
        const r16 = p => { if (p < 0 || p + 2 > bytes.length) throw new Error('The ZIP file is truncated'); return view.getUint16(p, true); };
        const r32 = p => { if (p < 0 || p + 4 > bytes.length) throw new Error('The ZIP file is truncated'); return view.getUint32(p, true); };
        let end = -1;
        for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65558); p--) if (r32(p) === 0x06054b50) { end = p; break; }
        if (end < 0) throw new Error('This is not a ZIP file');
        const count = r16(end + 10); let cursor = r32(end + 16);
        if (count > MAX_ZIP_ENTRIES) throw new Error('The ZIP holds too many files');
        const dec = new TextDecoder('utf-8', { fatal: true }), entries = []; let total = 0, skipped = 0;
        for (let i = 0; i < count; i++) {
            if (r32(cursor) !== 0x02014b50) throw new Error('The ZIP directory is damaged');
            const flags = r16(cursor + 8), method = r16(cursor + 10), csize = r32(cursor + 20), usize = r32(cursor + 24), nl = r16(cursor + 28), xl = r16(cursor + 30), cl = r16(cursor + 32), lo = r32(cursor + 42);
            if (flags & 1) throw new Error('Password protected ZIP files are not supported');
            let path = new TextDecoder().decode(bytes.slice(cursor + 46, cursor + 46 + nl));
            cursor += 46 + nl + xl + cl;
            if (path.startsWith('__MACOSX/') || /(^|\/)\.DS_Store$/.test(path)) continue;
            if (path.endsWith('/')) { entries.push({ path: path.slice(0, -1), dir: true, content: '' }); continue; }
            if (method !== 0 && method !== 8) throw new Error('Unsupported ZIP compression method ' + method);
            total += usize;
            if (total > MAX_ZIP_TOTAL || usize > MAX_FILE) throw new Error('The ZIP is too large to import');
            const ds = lo + 30 + r16(lo + 26) + r16(lo + 28), de = ds + csize;
            if (de > bytes.length) throw new Error('A ZIP entry is truncated');
            let data = bytes.slice(ds, de);
            if (method === 8) {
                if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot read compressed ZIP files');
                data = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
                if (data.length > MAX_FILE) throw new Error('A file inside the ZIP is too large');
            }
            try { if (data.indexOf(0) >= 0) throw new Error('binary'); entries.push({ path, dir: false, content: dec.decode(data) }); } catch (e) { skipped++; }
        }
        return { entries, skipped };
    }
    function skillFromZip(parsed, fileName) {
        let entries = parsed.entries;
        if (!entries.length) throw new Error('No files found in the ZIP');
        const hasRoot = entries.some(e => e.path === 'SKILL.md');
        let prefix = '';
        if (!hasRoot) {
            const first = entries[0].path.split('/')[0];
            if (entries.every(e => e.path === first || e.path.startsWith(first + '/'))) prefix = first;
        }
        entries = entries.map(e => ({ path: prefix ? e.path.slice(prefix.length + 1) : e.path, dir: e.dir, content: e.content })).filter(e => e.path);
        const tree = treeFromEntries(entries);
        const md = tree.find(n => n.name === 'SKILL.md' && n.type === 'file');
        if (!md) throw new Error('The ZIP must contain SKILL.md at its root');
        const fm = R().parseFrontmatter(md.content);
        const name = prefix || fm.fields.name || fileName.replace(/\.zip$/i, '') || 'imported-skill';
        return { id: rid(), name: str(name, 100), description: str(fm.fields.description || 'Imported skill', 1024), slug: slugify(prefix || fm.fields.name || name), created: new Date().toISOString(), tree };
    }

    /* ---------- Markdown backup ---------- */
    const oneLine = s => String(s || '').replace(/\s+/g, ' ').trim();
    function fenceFor(text) { let n = 3; (String(text).match(/`{3,}/g) || []).forEach(m => { if (m.length >= n) n = m.length + 1; }); return '`'.repeat(n); }
    function buildBackup() {
        const L = ['# Skill Foundry backup', '', '<!-- skill-foundry-backup:v1 -->', '',
            'Created: ' + new Date().toISOString(), 'Skills: ' + store.skills.length, '',
            'Restore this file with Import in Skill Foundry. Edit file contents inside the code fences only.', ''];
        store.skills.forEach(s => {
            L.push('---', '', '## Skill: ' + oneLine(s.name), '',
                '- slug: ' + JSON.stringify(s.slug), '- name: ' + JSON.stringify(s.name), '- description: ' + JSON.stringify(s.description), '- created: ' + JSON.stringify(s.created), '');
            walk(s.tree).forEach(x => {
                if (x.node.type === 'folder') L.push('### Folder: ' + x.path, '');
                else { const f = fenceFor(x.node.content); L.push('### File: ' + x.path, '', f + 'text', x.node.content, f, ''); }
            });
        });
        return L.join('\n');
    }
    function parseBackup(text) {
        const lines = String(text).split(/\r?\n/);
        if (!lines.some(l => l.indexOf('skill-foundry-backup:v1') >= 0)) throw new Error('This is not a Skill Foundry backup');
        const skills = []; let cur = null, pending = null, fence = null, buf = [], pendingPath = null;
        const finish = () => { if (!cur) return; cur.tree = treeFromEntries(cur.entries); delete cur.entries; skills.push(cleanSkill(cur)); };
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (fence) {
                if (line === fence) { cur.entries.push({ path: pendingPath, dir: false, content: buf.join('\n') }); fence = null; buf = []; pendingPath = null; }
                else buf.push(line);
                continue;
            }
            let m;
            if ((m = /^## Skill: (.*)$/.exec(line))) { finish(); cur = { name: m[1], entries: [], meta: true }; continue; }
            if (!cur) continue;
            if (cur.meta && (m = /^- (slug|name|description|created): (.*)$/.exec(line))) { try { cur[m[1]] = JSON.parse(m[2]); } catch (e) { throw new Error('A skill header is damaged near line ' + (i + 1)); } continue; }
            if ((m = /^### Folder: (.+)$/.exec(line))) { cur.meta = false; cur.entries.push({ path: m[1], dir: true, content: '' }); continue; }
            if ((m = /^### File: (.+)$/.exec(line))) { cur.meta = false; pendingPath = m[1]; pending = true; continue; }
            if (pending && (m = /^(`{3,})text\s*$/.exec(line))) { fence = m[1]; buf = []; pending = false; }
        }
        if (fence) throw new Error('A code block in the backup is not closed');
        finish();
        if (!skills.length) throw new Error('No skills found in the backup');
        return skills;
    }
    function legacyJson(data) {
        if (!data || data.format !== 'skill-foundry-backup' || !Array.isArray(data.projects)) throw new Error('This is not a Skill Foundry backup');
        return data.projects.slice(0, MAX_SKILLS).map(p => cleanSkill(p));
    }

    /* ---------- saving files out ---------- */
    function saveOut(blob, name, okMsg) {
        if (window.PL_saveBlob) return window.PL_saveBlob(blob, name, okMsg);
        const url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = name; a.hidden = true; root.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        if (okMsg) toast(okMsg, 'success');
        return Promise.resolve({ saved: true });
    }
    function dateStamp() { const d = new Date(), p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '-' + p(d.getMonth() + 1) + '-' + d.getFullYear(); }
    function doBackup() {
        if (!store.skills.length) { toast('There is nothing to back up yet', 'info'); return; }
        saveOut(new Blob([buildBackup()], { type: 'text/markdown;charset=utf-8' }), dateStamp() + '-skill-foundry-backup.md', 'Backup saved');
    }
    function doExportNow(s) {
        const entries = [];
        walk(s.tree).forEach(x => {
            if (x.node.type === 'folder') { if (!x.node.children.length) entries.push({ path: s.slug + '/' + x.path + '/', content: '' }); }
            else entries.push({ path: s.slug + '/' + x.path, content: x.node.content });
        });
        saveOut(makeZip(entries), s.slug + '.zip', 'Skill exported as ' + s.slug + '.zip');
    }
    function startExport() {
        const s = cur(); if (!s) return;
        flushSave();
        const errs = metaErrors(s);
        if (errs.length) {
            openModal({ eyebrow: 'Validation required', title: 'Fix the skill details first', confirmLabel: 'Open SKILL.md',
                body: '<p>Export needs valid frontmatter in SKILL.md.</p><ul class="sf-list">' + errs.map(e => '<li>' + esc(e) + '</li>').join('') + '</ul><pre class="sf-code">---\nname: my-skill\ndescription: What it does and when to use it.\n---</pre>',
                onConfirm: () => { closeModal(); selectFile('SKILL.md'); } });
            return;
        }
        const res = R().run(skillView(s)), highs = res.findings.filter(f => f.severity === 'high');
        if (highs.length) {
            openModal({ eyebrow: 'Review found problems', title: highs.length + ' high priority finding' + (highs.length === 1 ? '' : 's'), confirmLabel: 'Export anyway', cancelLabel: 'Review first',
                body: '<p>The review found serious problems. Fix them before sharing this skill.</p><ul class="sf-list">' + highs.slice(0, 6).map(f => '<li>' + esc(f.title) + (f.file ? ' <span class="sf-dim">' + esc(f.file) + '</span>' : '') + '</li>').join('') + (highs.length > 6 ? '<li class="sf-dim">and ' + (highs.length - 6) + ' more</li>' : '') + '</ul>',
                onConfirm: () => { closeModal(); doExportNow(s); }, onCancel: () => { closeModal(); runReview(); const p = root.querySelector('#sf-review'); if (p) p.focus(); } });
            return;
        }
        doExportNow(s);
    }
    function flushSave() { if (saveTimer) { clearTimeout(saveTimer); saveNow(); } }

    /* ---------- review ---------- */
    function runReview() {
        const s = cur(); ui.review = s ? R().run(skillView(s)) : null;
        renderReview();
    }
    function scheduleReview() { clearTimeout(ui.reviewTimer); ui.reviewTimer = setTimeout(runReview, 700); }
    function aiReady() {
        const ai = window.PL_ai, info = ai && ai.info ? ai.info() : null;
        return info && info.hasKey ? info : null;
    }
    async function runAI() {
        const s = cur(); if (!s) return;
        const info = aiReady();
        if (!info) { ui.ai = { status: 'error', findings: [], summary: '', error: 'No AI key is set. Add one in Settings to use the AI review. The offline review above is complete without it.', stamp: 0 }; renderReview(); return; }
        const req = R().buildAIRequest(skillView(s));
        ui.ai = { status: 'running', findings: [], summary: '', error: '', stamp: store.updated };
        renderReview();
        try {
            const parsed = R().parseAIReply(await window.PL_ai.ask(req.system, req.user, req.maxTokens));
            ui.ai = { status: 'done', findings: parsed.findings, summary: parsed.summary, error: '', stamp: store.updated, skillId: s.id, cut: req.truncated };
        } catch (e) {
            ui.ai = { status: 'error', findings: [], summary: '', error: 'The AI review was unavailable: ' + (e && e.message ? e.message : 'unknown error') + '. The offline review above is unaffected.', stamp: 0 };
        }
        renderReview();
    }

    /* ---------- modal ---------- */
    function openModal(cfg) { ui.modal = cfg; renderModal(); const f = root.querySelector('#sf-modal input, #sf-modal textarea, #sf-modal .btn-accent, #sf-modal .sf-btn-danger'); if (f) setTimeout(() => f.focus(), 30); }
    function closeModal() { ui.modal = null; renderModal(); }
    function renderModal() {
        const host = root.querySelector('#sf-modal'), m = ui.modal;
        if (!m) { host.hidden = true; host.innerHTML = ''; return; }
        host.hidden = false;
        host.innerHTML = '<div class="sf-backdrop" data-act="modalBackdrop"><section class="sf-modal" role="dialog" aria-modal="true" aria-labelledby="sf-modal-title">' +
            '<div class="sf-modal-top"><div><div class="sf-label">' + esc(m.eyebrow || '') + '</div><h3 id="sf-modal-title">' + esc(m.title) + '</h3></div><button class="icon-btn" data-act="modalCancel" aria-label="Close">' + ms('close') + '</button></div>' +
            '<div class="sf-modal-body">' + m.body + '</div>' +
            '<div class="sf-modal-actions"><button class="btn btn-ghost" data-act="modalCancel">' + esc(m.cancelLabel || 'Cancel') + '</button>' +
            (m.confirmLabel ? '<button class="btn ' + (m.danger ? 'sf-btn-danger' : 'btn-accent') + '" data-act="modalConfirm">' + esc(m.confirmLabel) + '</button>' : '') + '</div></section></div>';
    }
    const val = id => { const el = root.querySelector('#' + id); return el ? el.value : ''; };

    function dlgNewSkill() {
        openModal({ eyebrow: 'New skill', title: 'Create a skill', confirmLabel: 'Create skill',
            body: '<label class="sf-field"><span>SKILL NAME</span><input id="sf-new-name" class="form-input" maxlength="64" placeholder="e.g. research-assistant" autocomplete="off"></label>' +
                '<label class="sf-field"><span>WHAT DOES IT DO?</span><textarea id="sf-new-desc" class="form-textarea" maxlength="1024" placeholder="Describe the skill and when Claude should use it."></textarea></label>',
            onConfirm: () => { const n = val('sf-new-name').trim(); if (!n) { root.querySelector('#sf-new-name').focus(); return; } if (newSkill(n, val('sf-new-desc').trim())) closeModal(); } });
    }
    function dlgAdd(type) {
        const s = cur(); if (!s) return;
        const isF = type === 'folder';
        const folders = walk(s.tree).filter(x => x.node.type === 'folder');
        const selNode = ui.sel ? find(s.tree, ui.sel) : null;
        const def = selNode ? (selNode.type === 'folder' ? ui.sel : (ui.sel.includes('/') ? ui.sel.slice(0, ui.sel.lastIndexOf('/')) : '')) : '';
        openModal({ eyebrow: isF ? 'Folder structure' : 'New file', title: isF ? 'Create a folder' : 'Create a file', confirmLabel: 'Add ' + (isF ? 'folder' : 'file'),
            body: '<label class="sf-field"><span>' + (isF ? 'FOLDER' : 'FILE') + ' NAME</span><input id="sf-item-name" class="form-input" maxlength="120" placeholder="' + (isF ? 'e.g. workflows' : 'e.g. guide.md') + '" autocomplete="off"></label>' +
                '<label class="sf-field"><span>LOCATION</span><select id="sf-item-parent" class="form-input"><option value="">Skill root</option>' + folders.map(x => '<option value="' + esc(x.path) + '"' + (x.path === def ? ' selected' : '') + '>' + esc(x.path) + '</option>').join('') + '</select></label>' +
                (isF ? '' : '<label class="sf-field"><span>STARTING CONTENT</span><select id="sf-item-start" class="form-input"><option value="blank">Blank file</option><option value="markdown">Markdown heading</option><option value="template">Instruction template</option></select></label>'),
            onConfirm: () => {
                const name = val('sf-item-name').trim(), pp = val('sf-item-parent');
                if (!safeName(name)) { toast('Use a name without slashes', 'warning'); return; }
                const parent = pp ? find(s.tree, pp) : null, list = parent ? parent.children : s.tree;
                if (list.some(x => x.name === name)) { toast('An item with that name already exists here', 'warning'); return; }
                if (walk(s.tree).length >= MAX_NODES) { toast('A skill can hold at most ' + MAX_NODES + ' files and folders', 'warning'); return; }
                let content = '';
                if (!isF) { const st = val('sf-item-start'); content = st === 'markdown' ? '# ' + name.replace(/\.[^.]+$/, '') + '\n\n' : st === 'template' ? '## Purpose\n\n## Instructions\n\n## Constraints\n\n## Output format\n\n' : ''; }
                list.push(isF ? folder(name) : file(name, content));
                const path = pp ? pp + '/' + name : name;
                touch(); closeModal();
                if (isF) { ui.sel = path; renderTree(); } else selectFile(path);
                toast((isF ? 'Folder' : 'File') + ' added', 'success'); scheduleReview();
            } });
    }
    function dlgSettings() {
        const s = cur(); if (!s) return;
        openModal({ eyebrow: 'Skill details', title: 'Skill settings', confirmLabel: 'Save settings',
            body: '<label class="sf-field"><span>DISPLAY NAME</span><input id="sf-set-name" class="form-input" maxlength="100" value="' + esc(s.name) + '"></label>' +
                '<label class="sf-field"><span>DESCRIPTION</span><textarea id="sf-set-desc" class="form-textarea" maxlength="1024">' + esc(s.description) + '</textarea></label>' +
                '<label class="sf-field"><span>EXPORT FOLDER NAME</span><input id="sf-set-slug" class="form-input" maxlength="64" value="' + esc(s.slug) + '"></label>' +
                '<p class="sf-hint">The name in the SKILL.md frontmatter is checked separately. Keep it lowercase with hyphens between words.</p>' +
                '<button class="btn sf-btn-danger sf-start" data-act="askDeleteSkill">' + ms('delete') + '<span>Delete this skill</span></button>',
            onConfirm: () => { s.name = val('sf-set-name').trim() || s.name; s.description = val('sf-set-desc').trim(); s.slug = slugify(val('sf-set-slug') || s.slug); touch(); closeModal(); renderAll(); scheduleReview(); } });
    }
    function dlgDeleteSkill() {
        const s = cur(); if (!s) return;
        openModal({ eyebrow: 'Confirm delete', title: 'Delete this skill?', confirmLabel: 'Delete skill', danger: true,
            body: '<p>This permanently removes <strong>' + esc(s.name) + '</strong> and all of its files from Skill Foundry. Make a backup first if you may want it back.</p>',
            onConfirm: () => { store.skills = store.skills.filter(k => k.id !== s.id); store.currentId = store.skills[0] ? store.skills[0].id : null; touch(); closeModal(); openFirstFile(); renderAll(); toast('Skill deleted', 'success'); } });
    }
    function dlgDeleteItem() {
        const s = cur(); if (!s || !ui.sel) return;
        const path = ui.sel;
        if (path === 'SKILL.md') { toast('Keep SKILL.md in the skill root', 'info'); return; }
        const node = find(s.tree, path); if (!node) return;
        openModal({ eyebrow: 'Confirm delete', title: 'Delete this ' + node.type + '?', confirmLabel: 'Delete', danger: true,
            body: '<p>This permanently removes <strong>' + esc(path) + '</strong>' + (node.type === 'folder' && node.children.length ? ' and everything inside it' : '') + ' from this skill. It cannot be undone unless you have a backup.</p>',
            onConfirm: () => { const p = parentOf(s.tree, path); if (p) { const i = p.list.findIndex(n => n.name === p.name); if (i >= 0) p.list.splice(i, 1); } if (ui.file && (ui.file === path || ui.file.startsWith(path + '/'))) ui.file = null; ui.sel = null; touch(); closeModal(); renderAll(); scheduleReview(); toast('Item deleted', 'success'); } });
    }

    /* ---------- rendering ---------- */
    function markdownToHTML(md) {
        let s = esc(md).replace(/^---\n[\s\S]*?\n---\n?/, '');
        s = s.replace(/```([\s\S]*?)```/g, (_, c) => '<pre><code>' + c + '</code></pre>');
        s = s.replace(/^### (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>').replace(/^&gt; (.*)$/gm, '<blockquote>$1</blockquote>')
            .replace(/^[-*] (.*)$/gm, '<li>$1</li>').replace(/(<li>.*<\/li>\n?)+/g, m => '<ul>' + m + '</ul>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
        return '<p>' + s + '</p>';
    }
    function renderHeader() {
        const sel = root.querySelector('#sf-skill-select'), has = store.skills.length > 0;
        sel.innerHTML = has ? store.skills.map(s => '<option value="' + esc(s.id) + '"' + (s.id === store.currentId ? ' selected' : '') + '>' + esc(s.name) + '</option>').join('') : '<option value="">No skills yet</option>';
        sel.disabled = !has;
        root.querySelectorAll('[data-needs-skill]').forEach(b => { b.disabled = !has; });
        paintSave(root.querySelector('#sf-save'));
    }
    function renderTree() {
        const s = cur(), el = root.querySelector('#sf-tree');
        if (!s) { el.innerHTML = ''; return; }
        el.innerHTML = walk(s.tree).map(x => {
            const on = ui.sel === x.path;
            return '<button type="button" class="sf-tree-item' + (on ? ' selected' : '') + '" style="padding-left:calc(var(--sp-3) + ' + (x.depth * 14) + 'px)" data-act="pick" data-path="' + esc(x.path) + '" data-type="' + x.node.type + '" title="' + esc(x.path) + '">' +
                ms(x.node.type === 'folder' ? 'folder' : 'description', 'sf-tree-icon') + '<span class="sf-tree-name">' + esc(x.node.name) + '</span></button>';
        }).join('');
        root.querySelector('#sf-file-count').textContent = walk(s.tree).filter(x => x.node.type === 'file').length + ' files';
        const del = root.querySelector('[data-act="deleteItem"]'); if (del) del.disabled = !ui.sel || ui.sel === 'SKILL.md';
    }
    function renderTitle() {
        const s = cur();
        root.querySelector('#sf-skill-title').textContent = s ? s.name : '';
        root.querySelector('#sf-skill-desc').textContent = s ? (s.description || 'Add a description in Skill settings.') : '';
    }
    function renderEditor() {
        const s = cur(), node = s && ui.file ? find(s.tree, ui.file) : null;
        const ed = root.querySelector('#sf-editor'), pv = root.querySelector('#sf-preview'), empty = root.querySelector('#sf-editor-empty'), area = root.querySelector('#sf-editor-area');
        const isFile = node && node.type === 'file';
        empty.hidden = !!isFile; area.hidden = !isFile;
        root.querySelector('#sf-path').textContent = isFile ? ui.file : 'Select a file to begin';
        root.querySelector('[data-act="preview"]').disabled = !isFile;
        if (!isFile) return;
        ed.value = node.content;
        ed.hidden = ui.preview; pv.hidden = !ui.preview;
        if (ui.preview) pv.innerHTML = /\.(md|markdown)$/i.test(ui.file) ? markdownToHTML(node.content) : '<pre>' + esc(node.content) + '</pre>';
        root.querySelector('#sf-mode').textContent = ui.preview ? 'PREVIEW' : (/\.(md|markdown)$/i.test(ui.file) ? 'MARKDOWN' : 'TEXT');
        root.querySelector('[data-act="preview"]').innerHTML = ms(ui.preview ? 'edit' : 'visibility');
        countWords();
    }
    function countWords() { const ed = root.querySelector('#sf-editor'); root.querySelector('#sf-words').textContent = (ed.value.trim() ? ed.value.trim().split(/\s+/).length : 0) + ' words'; }
    const SEV_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };
    function findingHtml(f) {
        return '<article class="sf-finding sf-sev-' + f.severity + '"><div class="sf-f-top"><span class="sf-sev">' + SEV_LABEL[f.severity] + '</span><span class="sf-f-title">' + esc(f.title) + '</span>' + (f.source === 'ai' ? '<span class="sf-ai-tag">AI</span>' : '') + '</div>' +
            (f.file ? '<button type="button" class="sf-f-loc" data-act="jump" data-path="' + esc(f.file) + '" data-line="' + (f.line || 0) + '">' + esc(f.file) + (f.line ? ':' + f.line : '') + '</button>' : '') +
            (f.detail ? '<p class="sf-f-detail">' + esc(f.detail) + '</p>' : '') + (f.excerpt ? '<pre class="sf-f-ex">' + esc(f.excerpt) + '</pre>' : '') +
            (f.fix ? '<p class="sf-f-fix"><strong>Fix:</strong> ' + esc(f.fix) + '</p>' : '') + '</article>';
    }
    function renderReview() {
        const s = cur(), host = root.querySelector('#sf-review');
        if (!s) { host.innerHTML = ''; return; }
        if (!ui.review) ui.review = R().run(skillView(s));
        const rv = ui.review, ai = ui.ai, stale = ai.status === 'done' && ai.stamp < store.updated;
        const aiFindings = ai.status === 'done' ? ai.findings : [];
        const all = rv.findings.concat(aiFindings).sort((a, b) => ({ high: 3, medium: 2, low: 1 }[b.severity] - { high: 3, medium: 2, low: 1 }[a.severity]));
        const sec = all.filter(f => f.category === 'security'), weak = all.filter(f => f.category === 'weakness');
        const verdict = rv.verdict === 'clear' && !aiFindings.length ? ['check_circle', 'No problems found', 'sf-v-clear'] : rv.counts.high || aiFindings.some(f => f.severity === 'high') ? ['error', 'Needs attention before export', 'sf-v-bad'] : ['info', 'Minor points to consider', 'sf-v-fair'];
        const info = aiReady();
        let aiBlock = '';
        if (ai.status === 'confirm') aiBlock = '<div class="sf-ai-box"><p>This sends the text of every file in this skill to <strong>' + esc(info ? info.provider : 'your AI provider') + '</strong>' + (info && info.model ? ' (' + esc(info.model) + ')' : '') + '. Do not run it on anything private.</p><div class="sf-row"><button class="btn btn-accent" data-act="aiGo">Send and review</button><button class="btn btn-ghost" data-act="aiCancel">Cancel</button></div></div>';
        else if (ai.status === 'running') aiBlock = '<div class="sf-ai-box" role="status">' + ms('sync', 'sf-spin') + '<span>The AI is reading the skill...</span></div>';
        else if (ai.status === 'error') aiBlock = '<div class="sf-ai-box sf-ai-error" role="alert">' + ms('error') + '<span>' + esc(ai.error) + '</span></div>';
        else if (ai.status === 'done') aiBlock = '<div class="sf-ai-box">' + (ai.summary ? '<p>' + esc(ai.summary) + '</p>' : '') + (stale ? '<p class="sf-warn">The skill has changed since this AI review. Run it again for a current result.</p>' : '') + (ai.cut ? '<p class="sf-dim">Some long files were shortened before sending.</p>' : '') + (aiFindings.length ? '' : '<p>The AI found nothing more to add.</p>') + '</div>';
        host.innerHTML =
            '<div class="sf-review-head"><div><div class="sf-label">REVIEW</div><div class="sf-verdict ' + verdict[2] + '">' + ms(verdict[0]) + '<span>' + verdict[1] + '</span></div></div>' +
            '<div class="sf-counts"><span><b>' + rv.counts.security + '</b> security</span><span><b>' + rv.counts.weakness + '</b> weaknesses</span><span class="sf-dim">' + rv.files + ' files checked</span></div></div>' +
            '<div class="sf-review-actions"><button class="btn btn-ghost" data-act="runReview">' + ms('refresh') + '<span>Run again</span></button>' +
            '<button class="btn" data-act="ai" ' + (info ? '' : 'disabled title="Add an AI key in Settings to use the AI review"') + '>' + ms('auto_awesome') + '<span>AI review</span></button></div>' +
            (info ? '' : '<p class="sf-hint">The offline review needs nothing. The AI review is optional and needs an API key in Settings.</p>') + aiBlock +
            '<div class="sf-review-scroll">' +
            '<h4 class="sf-sec-title">' + ms('shield') + 'Security <span>' + sec.length + '</span></h4>' + (sec.length ? sec.map(findingHtml).join('') : '<p class="sf-none">Nothing found.</p>') +
            '<h4 class="sf-sec-title">' + ms('rule') + 'Weaknesses <span>' + weak.length + '</span></h4>' + (weak.length ? weak.map(findingHtml).join('') : '<p class="sf-none">Nothing found.</p>') + '</div>';
    }
    function renderAll() {
        if (!mounted) return;
        const has = store.skills.length > 0;
        root.querySelector('#sf-empty').hidden = has;
        root.querySelector('#sf-main').hidden = !has;
        renderHeader();
        if (!has) return;
        renderTitle(); renderTree(); renderEditor(); ui.review = null; renderReview();
    }

    function selectFile(path) {
        const s = cur(), n = s && find(s.tree, path);
        if (!n) return;
        if (n.type === 'folder') { ui.sel = path; renderTree(); return; }
        ui.file = path; ui.sel = path; ui.preview = false;
        renderTree(); renderEditor();
    }
    function jump(path, line) {
        selectFile(path);
        const ed = root.querySelector('#sf-editor');
        if (!line || ui.preview) return;
        const parts = ed.value.split('\n'); let pos = 0;
        for (let i = 0; i < Math.min(line - 1, parts.length); i++) pos += parts[i].length + 1;
        ed.focus(); ed.setSelectionRange(pos, pos + (parts[line - 1] || '').length);
        ed.scrollTop = Math.max(0, (line - 4) * 24);
    }

    /* ---------- events ---------- */
    function onClick(e) {
        const t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
        const act = t.dataset.act;
        switch (act) {
            case 'close': closeWorkspace(); break;
            case 'newSkill': dlgNewSkill(); break;
            case 'import': root.querySelector('#sf-import').click(); break;
            case 'backup': doBackup(); break;
            case 'export': startExport(); break;
            case 'settings': dlgSettings(); break;
            case 'askDeleteSkill': dlgDeleteSkill(); break;
            case 'addFile': dlgAdd('file'); break;
            case 'addFolder': dlgAdd('folder'); break;
            case 'deleteItem': dlgDeleteItem(); break;
            case 'preview': ui.preview = !ui.preview; renderEditor(); break;
            case 'pick': selectFile(t.dataset.path); break;
            case 'jump': jump(t.dataset.path, Number(t.dataset.line) || 0); break;
            case 'reviewNow': runReview(); { const p = root.querySelector('#sf-review'); if (p) p.focus(); } break;
            case 'runReview': runReview(); break;
            case 'ai': if (!aiReady()) { runAI(); } else { ui.ai = Object.assign({}, ui.ai, { status: 'confirm' }); renderReview(); } break;
            case 'aiGo': runAI(); break;
            case 'aiCancel': ui.ai = { status: 'idle', findings: [], summary: '', error: '', stamp: 0 }; renderReview(); break;
            case 'openSkillMd': selectFile('SKILL.md'); break;
            case 'modalConfirm': if (ui.modal && ui.modal.onConfirm) ui.modal.onConfirm(); break;
            case 'modalCancel': { const m = ui.modal; if (m && m.onCancel) m.onCancel(); else closeModal(); break; }
            case 'modalBackdrop': if (e.target === t) closeModal(); break;
            default: break;
        }
    }
    function onChange(e) {
        if (e.target.id === 'sf-skill-select') {
            if (!e.target.value) return;
            store.currentId = e.target.value; touch(); openFirstFile(); renderAll();
        } else if (e.target.id === 'sf-import') {
            const f = e.target.files && e.target.files[0]; e.target.value = '';
            if (f) importFile(f);
        }
    }
    function onInput(e) {
        if (e.target.id !== 'sf-editor') return;
        const s = cur(), n = s && ui.file && find(s.tree, ui.file);
        if (!n || n.type !== 'file') return;
        n.content = e.target.value; countWords(); touch(); scheduleReview();
    }
    async function importFile(f) {
        try {
            if (f.size > MAX_IMPORT_BYTES) throw new Error('That file is too large to import');
            const name = f.name.toLowerCase(); let list;
            if (name.endsWith('.zip')) {
                const parsed = await parseZip(await f.arrayBuffer());
                list = [skillFromZip(parsed, f.name)];
                if (parsed.skipped) toast(parsed.skipped + ' non text file' + (parsed.skipped === 1 ? ' was' : 's were') + ' left out of the import', 'info');
            } else if (name.endsWith('.md') || name.endsWith('.markdown') || name.endsWith('.txt')) list = parseBackup(await f.text());
            else if (name.endsWith('.json')) list = legacyJson(JSON.parse(await f.text()));
            else throw new Error('Import a skill ZIP, or a Skill Foundry backup (.md)');
            const n = addSkills(list);
            toast(n ? (name.endsWith('.zip') ? 'Skill imported' : n + ' skill' + (n === 1 ? '' : 's') + ' restored') : 'Nothing was imported', n ? 'success' : 'warning');
        } catch (err) { toast('Import failed: ' + (err && err.message ? err.message : 'unknown error'), 'error'); }
    }
    function onKey(e) {
        if (!ui.open || e.key !== 'Escape') return;
        if (ui.modal) { e.preventDefault(); e.stopPropagation(); const m = ui.modal; if (m.onCancel) m.onCancel(); else closeModal(); return; }
        if (e.target !== document.body && !root.contains(e.target)) return;
        if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { e.target.blur(); return; }
        closeWorkspace();
    }

    /* ---------- open and close ---------- */
    const MARKUP = '' +
        '<div class="ws-header sf-header"><div class="ws-header-left">' + ms('handyman', 'ws-header-icon') +
        '<div><h2 class="ws-title">Skill Foundry</h2><p class="ws-subtitle">Build a skill by hand, review it, export it ready to use.</p></div></div>' +
        '<div class="ws-header-actions"><span class="sf-save" id="sf-save" role="status"></span>' +
        '<select id="sf-skill-select" class="form-input sf-skill-select" aria-label="Choose a skill"></select>' +
        '<button class="btn" data-act="newSkill">' + ms('add') + '<span>New skill</span></button>' +
        '<button class="btn btn-ghost" data-act="import" title="Import a skill ZIP or a Skill Foundry backup">' + ms('upload_file') + '<span>Import</span></button>' +
        '<button class="btn btn-ghost" data-act="backup" title="Save every skill as one Markdown file">' + ms('inventory_2') + '<span>Backup</span></button>' +
        '<button class="btn" data-act="reviewNow" data-needs-skill>' + ms('verified_user') + '<span>Review</span></button>' +
        '<button class="btn btn-accent" data-act="export" data-needs-skill>' + ms('download') + '<span>Export</span></button>' +
        '<button class="icon-btn" data-act="close" aria-label="Close Skill Foundry" title="Close">' + ms('close') + '</button></div></div>' +
        '<div class="ws-body sf-body">' +
        '<div class="sf-empty" id="sf-empty" hidden><div class="sf-label">YOUR SKILL WORKSHOP</div><h3>Build skills with intention.</h3><p>Create a Claude skill by hand. Write the instructions, add your supporting files, let the reviewer check for weaknesses and security problems, then export a clean folder.</p>' +
        '<div class="sf-row"><button class="btn btn-accent" data-act="newSkill">' + ms('add') + '<span>Create your first skill</span></button><button class="btn btn-ghost" data-act="import">' + ms('upload_file') + '<span>Import a skill or backup</span></button></div></div>' +
        '<div class="sf-main" id="sf-main" hidden>' +
        '<div class="sf-titlebar"><div><div class="sf-label">SKILL</div><h3 id="sf-skill-title"></h3><p id="sf-skill-desc"></p></div><button class="btn btn-ghost" data-act="settings" data-needs-skill>' + ms('tune') + '<span>Skill settings</span></button></div>' +
        '<div class="sf-grid">' +
        '<section class="sf-files" aria-label="Skill files"><div class="sf-panel-head"><div><div class="sf-label">SKILL FILES</div><div class="sf-dim" id="sf-file-count"></div></div><button class="icon-btn" data-act="addFile" aria-label="New file" title="New file">' + ms('add') + '</button></div>' +
        '<div class="sf-tree" id="sf-tree"></div>' +
        '<div class="sf-tree-foot"><button class="btn btn-ghost sf-btn-xs" data-act="addFile">' + ms('note_add') + '<span>File</span></button><button class="btn btn-ghost sf-btn-xs" data-act="addFolder">' + ms('create_new_folder') + '<span>Folder</span></button><button class="btn btn-ghost sf-btn-xs sf-push" data-act="deleteItem">' + ms('delete') + '<span>Delete</span></button></div></section>' +
        '<section class="sf-editor-panel" aria-label="Editor"><div class="sf-panel-head"><div class="sf-path" id="sf-path"></div><div class="sf-tools"><span class="sf-dim" id="sf-mode"></span><button class="icon-btn" data-act="preview" aria-label="Toggle preview" title="Preview">' + ms('visibility') + '</button></div></div>' +
        '<div class="sf-editor-empty" id="sf-editor-empty"><h3>Your workspace is ready</h3><p>Select a file on the left, or add a new one to start writing.</p><button class="btn" data-act="openSkillMd">Open SKILL.md</button></div>' +
        '<div class="sf-editor-area" id="sf-editor-area" hidden><textarea id="sf-editor" class="sf-textarea" spellcheck="false" aria-label="File content" placeholder="Start writing..."></textarea><div class="sf-preview" id="sf-preview" hidden></div><div class="sf-editor-foot"><span id="sf-words"></span><span>Changes save automatically</span></div></div></section>' +
        '<aside class="sf-review" id="sf-review" tabindex="-1" aria-label="Skill review"></aside>' +
        '</div></div></div>' +
        '<div id="sf-modal" hidden></div><input type="file" id="sf-import" accept=".zip,.md,.markdown,.txt,.json" hidden>';

    function ensureRoot() {
        root = document.getElementById('skillFoundryWorkspace');
        if (!root) {
            root = document.createElement('div');
            root.id = 'skillFoundryWorkspace';
            root.setAttribute('role', 'region');
            root.setAttribute('aria-label', 'Skill Foundry');
            document.body.appendChild(root);
        }
        return root;
    }
    function mount() {
        if (mounted) return;
        root.innerHTML = MARKUP;
        root.addEventListener('click', onClick);
        root.addEventListener('change', onChange);
        root.addEventListener('input', onInput);
        mounted = true;
    }
    function closeWorkspace() {
        if (!root) return;
        flushSave();
        ui.open = false; ui.modal = null; renderModal();
        root.classList.remove('open');
        document.querySelectorAll('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
        if (opener && opener.isConnected && typeof opener.focus === 'function') { try { opener.focus(); } catch (e) { /* ignore */ } }
        opener = null;
    }
    window.openSkillFoundryWorkspace = function () {
        ensureRoot(); mount();
        opener = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
        ui.open = true;
        if (!ui.file) openFirstFile();
        root.classList.add('open');
        document.querySelectorAll('.nav-item[data-view]').forEach(el => el.classList.remove('active'));
        renderAll();
        root.setAttribute('tabindex', '-1');
        root.focus({ preventScroll: true });
    };
    window.PL_closeSkillFoundry = closeWorkspace;
    Object.defineProperty(window, '__sf', { configurable: true, get: () => ({ store, ui, buildBackup, parseBackup, makeZip, parseZip, cleanStore }) });

    document.addEventListener('keydown', onKey);
    window.addEventListener('pagehide', () => { if (saveTimer) saveNow(); });

    // Skills load at start so the first open is instant. The root is built on first open.
    function init() { try { loadLocal(); hydrate(); } catch (e) { console.warn('Skill Foundry could not load its skills:', e); } }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
