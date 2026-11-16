/* Context Pack Builder workspace [PRO].
   Assembles modular context packages for a whole AI project, with source tracking, token estimates
   and platform specific output (files, structure and naming for each platform).
   Self contained: creates #contextPackBuilderWorkspace, keeps everything in localStorage
   (key context-pack-builder.v1), makes no network calls and needs no dependency.
   Exposes window.openContextPackBuilderWorkspace, window.PL_closeContextPackBuilder and window.__cpb (tests). */
(function () {
    'use strict';

    const KEY = 'context-pack-builder.v1';
    const ROOT_ID = 'contextPackBuilderWorkspace';
    const SCHEMA = 'prompt-library-context-pack';
    const SCHEMA_VERSION = 1;
    const MAX_FILE_BYTES = 2 * 1024 * 1024;

    const $ = (sel, el) => (el || document).querySelector(sel);
    const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const ms = (name, cls) => `<span class="material-symbols-outlined${cls ? ' ' + cls : ''}" aria-hidden="true">${name}</span>`;
    const toast = (msg, kind) => { if (window.PL_toast) window.PL_toast(msg, kind || 'info'); };
    const fmt = n => Number(n || 0).toLocaleString('en-GB');
    const uid = p => p + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 7);
    const pad = n => String(n).padStart(2, '0');
    const dateStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const today = () => dateStr(new Date());
    const validDate = s => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '');
    const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'untitled';
    const yq = s => '"' + String(s).replace(/[\r\n]+/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

    // Whole days between a stored date and today, or null when the date is missing.
    function daysAgo(s) {
        if (!validDate(s)) return null;
        const [y, m, d] = s.split('-').map(Number);
        const a = new Date(y, m - 1, d);
        const b = new Date();
        b.setHours(0, 0, 0, 0);
        return Math.round((b - a) / 86400000);
    }

    /* ---------- definitions ---------- */
    // Module types. The group decides where a module lands in a platform package.
    const TYPES = {
        project: { label: 'Project information', icon: 'info', group: 'instr', blurb: 'What the project is, who it is for, goals, audience and constraints.' },
        rules: { label: 'Rules', icon: 'gavel', group: 'instr', blurb: 'Standing instructions: tone, formats, do and do not, how to behave.' },
        background: { label: 'Background documents', icon: 'description', group: 'know', blurb: 'Longer documents the AI can read for context: briefs, specs, history.' },
        reference: { label: 'Reference materials', icon: 'menu_book', group: 'know', blurb: 'Facts to look up: glossaries, style guides, API notes, examples.' }
    };
    const TYPE_ORDER = ['project', 'rules', 'background', 'reference'];
    const KINDS = { me: 'Written by me', file: 'Local file', web: 'Web page', library: 'Library prompt', other: 'Other' };

    // Platform profiles. The figures are planning figures that stay editable per pack. They are approximate.
    const PLATFORMS = [
        {
            id: 'claude', name: 'Claude Project', icon: 'forum', ratio: 4, instr: 8000, know: 150000, maxFiles: null, fileTok: 40000,
            where: 'Paste CLAUDE.md into the project instructions (or keep it at the root of a Claude Code repository) and upload the knowledge files to the project knowledge.',
            basis: 'Planning figures chosen for this tool: instructions kept short, knowledge held well inside a context window of roughly 200,000 tokens so there is room left for the chat.',
            instrName: 'CLAUDE.md', listKnow: true, listTitle: 'Knowledge documents'
        },
        {
            id: 'chatgpt', name: 'ChatGPT Project or Custom GPT', icon: 'smart_toy', ratio: 4, instr: 2000, know: 500000, maxFiles: 20, fileTok: 40000,
            where: 'Paste instructions.md into the Instructions field and upload the knowledge files.',
            basis: 'The instructions field is commonly cited as about 8,000 characters, which is about 2,000 tokens here, and uploads as about 20 files. The knowledge total is a planning figure for this tool.',
            instrName: 'instructions.md', listKnow: true, listTitle: 'Knowledge files'
        },
        {
            id: 'gemini', name: 'Gemini Gem', icon: 'auto_awesome', ratio: 4, instr: 4000, know: 500000, maxFiles: 10, fileTok: 40000,
            where: 'Paste gem-instructions.md into the Gem instructions and attach the knowledge files.',
            basis: 'Gems are commonly cited as accepting about 10 knowledge files. The instruction and knowledge sizes are planning figures for this tool.',
            instrName: 'gem-instructions.md', listKnow: true, listTitle: 'Knowledge files'
        },
        {
            id: 'cursor', name: 'Cursor rules', icon: 'code', ratio: 4, instr: 3000, know: 60000, maxFiles: null, fileTok: 5000,
            where: 'Copy the .cursor folder into the root of the repository. 00-project.mdc always applies and the others are loaded when the agent decides they are relevant. Older Cursor versions read a single .cursorrules file instead.',
            basis: 'Planning figures chosen for this tool: always on rules stay short, and each rule file is kept to a few hundred lines.',
            instrName: '.cursor/rules/00-project.mdc', listKnow: false, listTitle: ''
        },
        {
            id: 'copilot', name: 'GitHub Copilot instructions', icon: 'terminal', ratio: 4, instr: 2000, know: 40000, maxFiles: null, fileTok: 20000,
            where: 'Copy .github/copilot-instructions.md and the docs/context folder into the repository root.',
            basis: 'Planning figures chosen for this tool: repository instructions work best when they stay brief, and the longer documents sit in docs/context.',
            instrName: '.github/copilot-instructions.md', listKnow: true, listTitle: 'Reference documents'
        },
        {
            id: 'generic', name: 'Generic Markdown', icon: 'article', ratio: 4, instr: null, know: null, maxFiles: null, fileTok: null,
            where: 'A README.md that holds the project information and rules and lists the other files, plus one Markdown file per document module. Use it with any tool.',
            basis: 'No platform limit is assumed. Enter budgets under Limits and splitting to see the bars.',
            instrName: 'README.md', listKnow: true, listTitle: 'Files in this pack'
        }
    ];
    const PLAT = {};
    PLATFORMS.forEach(p => { PLAT[p.id] = p; });
    const PROF_KEYS = ['ratio', 'instr', 'know', 'maxFiles', 'fileTok'];

    /* ---------- state ---------- */
    let store = null;
    let root = null;
    let saveTimer = 0;
    let outTimer = 0;
    let lastOut = null;
    let opener = null;
    let fileMode = null;
    let bank = null;
    let savedLabel = '';

    function newItem(o) {
        return Object.assign({ id: uid('i'), title: '', content: '', include: true, kind: 'me', srcName: '', srcLoc: '', added: today(), reviewed: '' }, o || {});
    }
    function newModule(type, name) {
        return { id: uid('m'), type, name: name || TYPES[type].label, items: [] };
    }
    function newPack(name) {
        const now = new Date().toISOString();
        return { id: uid('p'), name: name || 'Untitled pack', platform: 'claude', staleDays: 90, sourceNotes: true, prof: {}, modules: TYPE_ORDER.map(t => newModule(t)), created: now, updated: now };
    }
    const clampInt = (v, lo, hi, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };

    // Coerce anything (storage or an imported file) into a valid pack.
    function normalisePack(r, fresh) {
        r = r && typeof r === 'object' ? r : {};
        const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
        const seen = new Set();
        const keepId = (v, p) => {
            const id = !fresh && typeof v === 'string' && v && v.length < 80 && !seen.has(v) ? v : uid(p);
            seen.add(id);
            return id;
        };
        const now = new Date().toISOString();
        const pk = {
            id: keepId(r.id, 'p'),
            name: str(r.name, 120).trim() || 'Untitled pack',
            platform: PLAT[r.platform] ? r.platform : 'claude',
            staleDays: clampInt(r.staleDays, 1, 3650, 90),
            sourceNotes: r.sourceNotes !== false,
            prof: {},
            modules: [],
            created: str(r.created, 40) || now,
            updated: str(r.updated, 40) || now
        };
        if (r.prof && typeof r.prof === 'object') {
            PLATFORMS.forEach(p => {
                const o = r.prof[p.id];
                if (!o || typeof o !== 'object') return;
                const out = {};
                PROF_KEYS.forEach(k => {
                    if (!(k in o)) return;
                    const v = o[k];
                    if (v === null && k !== 'ratio') out[k] = null;
                    else if (typeof v === 'number' && v > 0 && Number.isFinite(v)) out[k] = k === 'ratio' ? Math.min(v, 20) : Math.round(v);
                });
                pk.prof[p.id] = out;
            });
        }
        (Array.isArray(r.modules) ? r.modules.slice(0, 200) : []).forEach(m => {
            if (!m || typeof m !== 'object') return;
            const type = TYPES[m.type] ? m.type : 'reference';
            const mod = { id: keepId(m.id, 'm'), type, name: str(m.name, 120).trim() || TYPES[type].label, items: [] };
            (Array.isArray(m.items) ? m.items.slice(0, 2000) : []).forEach(it => {
                if (!it || typeof it !== 'object') return;
                mod.items.push({
                    id: keepId(it.id, 'i'),
                    title: str(it.title, 200),
                    content: str(it.content, 2000000),
                    include: it.include !== false,
                    kind: KINDS[it.kind] ? it.kind : 'other',
                    srcName: str(it.srcName, 200),
                    srcLoc: str(it.srcLoc, 1000),
                    added: validDate(it.added) || today(),
                    reviewed: validDate(it.reviewed)
                });
            });
            pk.modules.push(mod);
        });
        return pk;
    }

    function loadStore() {
        let raw = null;
        try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
        const s = { v: 1, active: null, packs: [], ui: { open: {}, collapsed: {}, preview: {} } };
        if (raw && typeof raw === 'object') {
            (Array.isArray(raw.packs) ? raw.packs.slice(0, 100) : []).forEach(p => s.packs.push(normalisePack(p, false)));
            if (raw.ui && typeof raw.ui === 'object') {
                ['open', 'collapsed', 'preview'].forEach(k => { if (raw.ui[k] && typeof raw.ui[k] === 'object') s.ui[k] = raw.ui[k]; });
            }
            s.active = typeof raw.active === 'string' ? raw.active : null;
        }
        if (!s.packs.length) s.packs.push(newPack('My first pack'));
        if (!s.packs.some(p => p.id === s.active)) s.active = s.packs[0].id;
        return s;
    }

    let warnedStorage = false;
    function writeStore() {
        try {
            localStorage.setItem(KEY, JSON.stringify(store));
            savedLabel = 'Saved ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            const el = $('#cpb-saved', root);
            if (el) el.textContent = savedLabel;
        } catch (e) {
            if (!warnedStorage) { warnedStorage = true; toast('Context Pack Builder could not save to this device. Export the pack as JSON to keep it.', 'error'); }
        }
    }
    function save() {
        const pk = pack();
        if (pk) pk.updated = new Date().toISOString();
        clearTimeout(saveTimer);
        saveTimer = setTimeout(writeStore, 250);
    }
    function flushSave() {
        if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; writeStore(); }
    }

    const pack = () => (store ? store.packs.find(p => p.id === store.active) || store.packs[0] : null);
    function findItem(pk, id) {
        for (const m of pk.modules) {
            const i = m.items.findIndex(x => x.id === id);
            if (i > -1) return { m, it: m.items[i], i };
        }
        return null;
    }

    /* ---------- token estimates ---------- */
    // Characters divided by a ratio, rounded up. A rough guide, never an exact count.
    const estimate = (text, ratio) => (text ? Math.ceil(String(text).length / (ratio > 0 ? ratio : 4)) : 0);

    function profile(pk, platId) {
        const plat = PLAT[platId];
        const o = (pk.prof && pk.prof[platId]) || {};
        const pick = (k, def) => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : def);
        return { ratio: o.ratio > 0 ? o.ratio : plat.ratio, instr: pick('instr', plat.instr), know: pick('know', plat.know), maxFiles: pick('maxFiles', plat.maxFiles), fileTok: pick('fileTok', plat.fileTok) };
    }
    const itemText = it => (it.title ? it.title + '\n\n' : '') + it.content;
    const itemTokens = (it, ratio) => estimate(itemText(it), ratio);
    const moduleTokens = (m, ratio) => m.items.reduce((a, it) => a + (it.include ? itemTokens(it, ratio) : 0), 0);
    const packTokens = (pk, ratio) => pk.modules.reduce((a, m) => a + moduleTokens(m, ratio), 0);
    // Days since last review (or since added) when past the pack's limit, else 0.
    function staleDaysOf(pk, it) {
        const d = daysAgo(it.reviewed || it.added);
        return d != null && d > pk.staleDays ? d : 0;
    }
    const tokHtml = n => `<span class="cpb-mono">${fmt(n)}</span><span class="cpb-unit"> est. tokens</span>`;

    /* ---------- platform output ---------- */
    function sourceLine(it) {
        const bits = [KINDS[it.kind] || 'Other'];
        if (it.srcName) bits.push(it.srcName);
        let s = 'Source: ' + bits.join(', ');
        if (it.srcLoc) s += ` (${it.srcLoc})`;
        const rev = it.reviewed || it.added;
        if (rev) s += `. ${it.reviewed ? 'Last reviewed' : 'Added'} ${rev}`;
        return `*${s}.*`;
    }
    function section(it, lvl, withSrc) {
        let t = `${'#'.repeat(lvl)} ${it.title.trim() || 'Untitled item'}\n\n`;
        if (it.content.trim()) t += it.content.trim() + '\n';
        if (withSrc) t += `\n${sourceLine(it)}\n`;
        return t;
    }
    // Split long text on paragraph breaks so no chunk passes maxChars.
    function chunkText(text, maxChars) {
        const out = [];
        let cur = '';
        const flush = () => { if (cur) { out.push(cur); cur = ''; } };
        text.split(/\n{2,}/).forEach(para => {
            let p = para;
            while (p.length > maxChars) { flush(); out.push(p.slice(0, maxChars)); p = p.slice(maxChars); }
            if (cur && cur.length + p.length + 2 > maxChars) flush();
            cur = cur ? cur + '\n\n' + p : p;
        });
        flush();
        return out;
    }
    function wrapInstr(plat, pk, body, knowList) {
        const title = pk.name || 'Untitled pack';
        let t = '';
        if (plat.id === 'cursor') t += `---\ndescription: ${yq(title + ': project information and rules')}\nalwaysApply: true\n---\n\n`;
        t += `# ${title}\n\n`;
        if (body) t += body.trimEnd() + '\n';
        if (knowList.length && plat.listKnow) {
            t += `\n## ${plat.listTitle}\n\nConsult these when a task needs more detail than the sections above.\n\n`;
            t += knowList.map(k => `- \`${k.name}\`: ${k.label}`).join('\n') + '\n';
        }
        return t;
    }
    function wrapKnow(plat, pk, m, body, part, parts) {
        let t = '';
        if (plat.id === 'cursor') t += `---\ndescription: ${yq(`${m.name} for ${pk.name || 'this pack'}`)}\nalwaysApply: false\n---\n\n`;
        t += `# ${m.name}${parts > 1 ? ` (part ${part} of ${parts})` : ''}\n\n${body.trimEnd()}\n`;
        return t;
    }
    function knowName(plat, no, mod, part, parts) {
        const base = `${pad(no)}-${slug(mod.name)}${parts > 1 ? '-part-' + part : ''}`;
        if (plat.id === 'cursor') return `.cursor/rules/${base}.mdc`;
        if (plat.id === 'copilot') return `docs/context/${base}.md`;
        if (plat.id === 'generic') return `${base}.md`;
        return `knowledge/${base}.md`;
    }

    // Build the whole package for the pack's target platform, with what is cut or split under the limits.
    function build(pk) {
        const plat = PLAT[pk.platform] || PLATFORMS[0];
        const P = profile(pk, plat.id);
        const tk = s => estimate(s, P.ratio);
        const cut = [];
        const split = [];
        const instrMods = [];
        const knowMods = [];
        pk.modules.forEach(m => {
            const items = m.items.filter(it => it.include && (it.content.trim() || it.title.trim()));
            (TYPES[m.type].group === 'instr' ? instrMods : knowMods).push({ m, items });
        });

        // Knowledge first, because the instructions file lists the knowledge files by name.
        let knowDemand = 0;
        let knowUsed = 0;
        let knowOver = false;
        let no = 0;
        let knowFiles = [];
        knowMods.forEach(({ m, items }) => {
            const kept = [];
            items.forEach(it => {
                const text = section(it, 2, pk.sourceNotes);
                const t = tk(text);
                knowDemand += t;
                if (P.know != null && (knowOver || knowUsed + t > P.know)) {
                    knowOver = true;
                    cut.push({ title: it.title.trim() || 'Untitled item', module: m.name, tokens: t, reason: 'Over the knowledge budget' });
                    return;
                }
                knowUsed += t;
                kept.push({ it, text, t });
            });
            if (!kept.length) return;
            no += 1;
            // Pieces: an item that alone passes the per file size is cut on paragraph breaks.
            const pieces = [];
            kept.forEach(k => {
                if (P.fileTok && k.t > P.fileTok) {
                    chunkText(k.text, Math.max(200, Math.floor(P.fileTok * P.ratio))).forEach((c, ci) => pieces.push({ text: c, title: k.it.title.trim() || 'Untitled item', t: tk(c), cont: ci > 0 }));
                } else pieces.push({ text: k.text, title: k.it.title.trim() || 'Untitled item', t: k.t, cont: false });
            });
            const parts = [];
            let cur = [];
            let curT = 0;
            pieces.forEach(pc => {
                if (cur.length && P.fileTok && curT + pc.t > P.fileTok) { parts.push(cur); cur = []; curT = 0; }
                cur.push(pc);
                curT += pc.t;
            });
            if (cur.length) parts.push(cur);
            parts.forEach((pcs, pi) => {
                const body = pcs.map(pc => pc.text).join('\n');
                const text = wrapKnow(plat, pk, m, body, pi + 1, parts.length);
                knowFiles.push({ name: knowName(plat, no, m, pi + 1, parts.length), group: 'know', text, tokens: tk(text), module: m.name, items: pcs.map(pc => ({ title: pc.title, tokens: pc.t })), part: parts.length > 1 ? `Part ${pi + 1} of ${parts.length}` : '' });
            });
            if (parts.length > 1) split.push({ module: m.name, parts: parts.length, reason: `Over about ${fmt(P.fileTok)} est. tokens in one file` });
        });
        // File count limit: later files are cut whole.
        if (P.maxFiles != null && knowFiles.length > P.maxFiles) {
            knowFiles.slice(P.maxFiles).forEach(f => {
                const agg = {};
                f.items.forEach(i => { agg[i.title] = (agg[i.title] || 0) + i.tokens; });
                Object.keys(agg).forEach(title => cut.push({ title, module: f.module, tokens: agg[title], reason: `Past the file count, about ${P.maxFiles} files` }));
            });
            knowFiles = knowFiles.slice(0, P.maxFiles);
        }

        // Instructions: kept in pack order until the budget is full.
        const knowList = knowFiles.map(f => ({ name: f.name, label: f.module + (f.part ? ` (${f.part.toLowerCase()})` : '') }));
        const overhead = tk(wrapInstr(plat, pk, '', knowList));
        let instrDemand = 0;
        let used = overhead;
        let instrOver = false;
        const instrParts = [];
        instrMods.forEach(({ m, items }) => {
            const kept = [];
            items.forEach(it => {
                const text = section(it, 3, false);
                const t = tk(text);
                instrDemand += t;
                const head = kept.length ? 0 : tk(`## ${m.name}\n\n`);
                if (P.instr != null && (instrOver || used + t + head > P.instr)) {
                    instrOver = true;
                    cut.push({ title: it.title.trim() || 'Untitled item', module: m.name, tokens: t, reason: 'Over the instruction budget' });
                    return;
                }
                used += t + head;
                kept.push(text);
            });
            if (kept.length) instrParts.push(`## ${m.name}\n\n${kept.join('\n')}`);
        });

        const files = [];
        if (instrParts.length || knowFiles.length) {
            const text = wrapInstr(plat, pk, instrParts.join('\n'), knowList);
            files.push({ name: plat.instrName, group: 'instr', text, tokens: tk(text), module: 'Project information and rules', items: [], part: '' });
        }
        knowFiles.forEach(f => files.push(f));
        const keptTok = g => files.filter(f => f.group === g).reduce((a, f) => a + f.tokens, 0);
        return { plat, P, files, cut, split, instrDemand, knowDemand, instrKept: keptTok('instr'), knowKept: keptTok('know') };
    }

    function combinedMarkdown(pk) {
        const plat = PLAT[pk.platform] || PLATFORMS[0];
        const P = profile(pk, plat.id);
        let t = `# ${pk.name || 'Untitled pack'}\n\nContext pack for ${plat.name}. Built ${today()}. About ${fmt(packTokens(pk, P.ratio))} est. tokens (characters divided by ${P.ratio}, a rough estimate).\n`;
        pk.modules.forEach(m => {
            const items = m.items.filter(it => it.include && (it.content.trim() || it.title.trim()));
            if (!items.length) return;
            t += `\n## ${m.name}\n\n` + items.map(it => section(it, 3, pk.sourceNotes)).join('\n');
        });
        return t;
    }

    /* ---------- zip writer: stored (uncompressed), no dependency ---------- */
    const CRC_TABLE = (() => {
        const t = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
            t[n] = c >>> 0;
        }
        return t;
    })();
    function crc32(bytes) {
        let c = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }
    function zipBytes(files) {
        const enc = new TextEncoder();
        const now = new Date();
        const dt = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
        const dd = (((Math.max(now.getFullYear(), 1980) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
        const chunks = [];
        const central = [];
        let offset = 0;
        files.forEach(f => {
            const name = enc.encode(f.name);
            const data = enc.encode(f.text);
            const crc = crc32(data);
            const lh = new DataView(new ArrayBuffer(30));
            lh.setUint32(0, 0x04034b50, true);
            lh.setUint16(4, 20, true);
            lh.setUint16(6, 0x0800, true);
            lh.setUint16(8, 0, true);
            lh.setUint16(10, dt, true);
            lh.setUint16(12, dd, true);
            lh.setUint32(14, crc, true);
            lh.setUint32(18, data.length, true);
            lh.setUint32(22, data.length, true);
            lh.setUint16(26, name.length, true);
            lh.setUint16(28, 0, true);
            chunks.push(new Uint8Array(lh.buffer), name, data);
            const ch = new DataView(new ArrayBuffer(46));
            ch.setUint32(0, 0x02014b50, true);
            ch.setUint16(4, 20, true);
            ch.setUint16(6, 20, true);
            ch.setUint16(8, 0x0800, true);
            ch.setUint16(10, 0, true);
            ch.setUint16(12, dt, true);
            ch.setUint16(14, dd, true);
            ch.setUint32(16, crc, true);
            ch.setUint32(20, data.length, true);
            ch.setUint32(24, data.length, true);
            ch.setUint16(28, name.length, true);
            ch.setUint16(30, 0, true);
            ch.setUint16(32, 0, true);
            ch.setUint16(34, 0, true);
            ch.setUint16(36, 0, true);
            ch.setUint32(38, 0, true);
            ch.setUint32(42, offset, true);
            central.push(new Uint8Array(ch.buffer), name);
            offset += 30 + name.length + data.length;
        });
        const cdSize = central.reduce((a, c) => a + c.length, 0);
        const end = new DataView(new ArrayBuffer(22));
        end.setUint32(0, 0x06054b50, true);
        end.setUint16(4, 0, true);
        end.setUint16(6, 0, true);
        end.setUint16(8, files.length, true);
        end.setUint16(10, files.length, true);
        end.setUint32(12, cdSize, true);
        end.setUint32(16, offset, true);
        end.setUint16(20, 0, true);
        const all = [...chunks, ...central, new Uint8Array(end.buffer)];
        const out = new Uint8Array(all.reduce((a, c) => a + c.length, 0));
        let o = 0;
        all.forEach(c => { out.set(c, o); o += c.length; });
        return out;
    }

    /* ---------- downloads and clipboard ---------- */
    function download(name, data, type) {
        const blob = data instanceof Blob ? data : new Blob([data], { type: type || 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
    function copyText(text) {
        const fallback = () => {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            let ok = false;
            try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
            ta.remove();
            return ok;
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).then(() => true, () => fallback());
        }
        return Promise.resolve(fallback());
    }

    /* ---------- markup ---------- */
    const MARKUP = `
<div class="ws-header cpb-header">
  <div class="ws-header-left">
    ${ms('folder_zip', 'ws-header-icon')}
    <div>
      <h2 class="ws-title">Context Pack Builder</h2>
      <p class="ws-subtitle">Generate a complete context package for a specific AI platform</p>
    </div>
  </div>
  <div class="ws-header-actions">
    <span class="cpb-saved cpb-mono" id="cpb-saved" aria-hidden="true"></span>
    <button class="icon-btn" type="button" data-act="close" aria-label="Close Context Pack Builder">${ms('close')}</button>
  </div>
</div>
<div class="cpb-tabs" role="tablist" aria-label="Panels">
  <button type="button" role="tab" class="cpb-tab" data-act="tab" data-tab="packs" aria-selected="false">${ms('inventory_2')}<span>Packs</span></button>
  <button type="button" role="tab" class="cpb-tab" data-act="tab" data-tab="edit" aria-selected="true">${ms('edit_note')}<span>Editor</span></button>
  <button type="button" role="tab" class="cpb-tab" data-act="tab" data-tab="output" aria-selected="false">${ms('output')}<span>Output</span></button>
</div>
<div class="cpb-body">
  <aside class="cpb-rail" id="cpb-rail" aria-label="Saved packs"></aside>
  <section class="cpb-editor" id="cpb-editor" aria-label="Pack editor"></section>
  <section class="cpb-output" id="cpb-output" aria-label="Platform output"></section>
</div>
<input type="file" id="cpb-file" class="cpb-hidden" accept=".txt,.md,.markdown,.text,text/plain,text/markdown" tabindex="-1" aria-hidden="true">
<input type="file" id="cpb-import" class="cpb-hidden" accept=".json,application/json" tabindex="-1" aria-hidden="true">

<dialog class="cpb-dialog" id="cpb-confirm" aria-labelledby="cpb-confirm-title">
  <form method="dialog">
    <div class="cpb-dlg-head"><span class="cpb-dlg-title" id="cpb-confirm-title">Confirm</span></div>
    <div class="cpb-dlg-body"><p id="cpb-confirm-msg"></p></div>
    <div class="cpb-dlg-foot"><button class="btn btn-ghost" value="no">Keep it</button><button class="btn btn-danger" value="yes" id="cpb-confirm-yes">Delete</button></div>
  </form>
</dialog>

<dialog class="cpb-dialog cpb-dialog-wide" id="cpb-bank" aria-labelledby="cpb-bank-title">
  <div class="cpb-dlg-head"><span class="cpb-dlg-title" id="cpb-bank-title">Import from Context Bank</span><button class="icon-btn" type="button" data-act="bankClose" aria-label="Close">${ms('close')}</button></div>
  <div class="cpb-dlg-body">
    <p class="cpb-hint">Pick blocks to copy into the module. The Context Bank itself is not changed.</p>
    <input type="search" class="form-input" id="cpb-bank-q" data-f="bankQ" placeholder="Search blocks" aria-label="Search Context Bank blocks" autocomplete="off">
    <div class="cpb-bank-list" id="cpb-bank-list"></div>
  </div>
  <div class="cpb-dlg-foot"><button class="btn btn-ghost" type="button" data-act="bankClose">Cancel</button><button class="btn btn-accent" type="button" data-act="bankAdd" id="cpb-bank-add" disabled>Add selected</button></div>
</dialog>`;

    const optionsHtml = (map, sel) => Object.keys(map).map(k => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(typeof map[k] === 'string' ? map[k] : map[k].label)}</option>`).join('');

    function railHtml() {
        const items = store.packs.map(pk => {
            const p = profile(pk, pk.platform);
            const n = pk.modules.reduce((a, m) => a + m.items.length, 0);
            const on = pk.id === store.active;
            return `<button type="button" class="cpb-pack${on ? ' cpb-on' : ''}" data-act="selectPack" data-id="${esc(pk.id)}"${on ? ' aria-current="true"' : ''}>
        <span class="cpb-pack-name">${esc(pk.name)}</span>
        <span class="cpb-pack-plat">${esc(PLAT[pk.platform].name)}</span>
        <span class="cpb-pack-meta"><span><span class="cpb-mono">${fmt(n)}</span> ${n === 1 ? 'item' : 'items'}</span><span><span class="cpb-mono">${fmt(packTokens(pk, p.ratio))}</span> est. tokens</span></span>
      </button>`;
        }).join('');
        return `<div class="cpb-pane-head"><span class="cpb-label">Packs <span class="cpb-mono cpb-count">${store.packs.length}</span></span></div>
      <div class="cpb-pack-list">${items}</div>
      <div class="cpb-rail-foot">
        <button type="button" class="btn btn-primary" data-act="newPack">${ms('add')}<span>New pack</span></button>
        <button type="button" class="btn btn-ghost" data-act="importPack">${ms('upload_file')}<span>Import pack JSON</span></button>
      </div>`;
    }

    const isOpenItem = it => (it.id in store.ui.open ? !!store.ui.open[it.id] : !it.content && !it.title);

    function itemHtml(m, it, i, n) {
        const open = isOpenItem(it);
        const snippet = it.content.replace(/\s+/g, ' ').trim().slice(0, 110);
        const body = open ? `
      <div class="cpb-item-body">
        <textarea class="form-textarea cpb-content" data-f="content" rows="7" placeholder="Paste or type the text for this item" aria-label="Text of ${esc(it.title || 'this item')}">${esc(it.content)}</textarea>
        <div class="cpb-content-bar">
          <button type="button" class="btn btn-ghost cpb-btn-xs" data-act="loadFile">${ms('upload_file')}<span>Load a text or Markdown file</span></button>
          <span class="cpb-count"><span class="cpb-mono" data-chars="${esc(it.id)}">${fmt(it.content.length)}</span> characters</span>
        </div>
        <fieldset class="cpb-source">
          <legend class="cpb-label">Source tracking</legend>
          <div class="cpb-src-grid">
            <label class="cpb-field"><span>Source kind</span><select class="form-input" data-f="kind">${optionsHtml(KINDS, it.kind)}</select></label>
            <label class="cpb-field"><span>Source name</span><input class="form-input" data-f="srcName" value="${esc(it.srcName)}" placeholder="Document, page or prompt name" autocomplete="off"></label>
            <label class="cpb-field cpb-span2"><span>Location, as text only. It is never fetched.</span><input class="form-input" data-f="srcLoc" value="${esc(it.srcLoc)}" placeholder="Path or URL" autocomplete="off"></label>
            <label class="cpb-field"><span>Date added</span><input class="form-input cpb-mono" type="date" data-f="added" value="${esc(it.added)}"></label>
            <label class="cpb-field"><span>Last reviewed</span>
              <span class="cpb-inline"><input class="form-input cpb-mono" type="date" data-f="reviewed" value="${esc(it.reviewed)}"><button type="button" class="btn btn-ghost cpb-btn-xs" data-act="reviewedToday">Reviewed today</button></span>
            </label>
          </div>
        </fieldset>
      </div>` : (snippet ? `<p class="cpb-snip">${esc(snippet)}</p>` : '');
        return `<div class="cpb-item" data-item="${esc(it.id)}" data-open="${open}">
      <div class="cpb-item-head">
        <button type="button" class="cpb-chev" data-act="toggleItem" aria-expanded="${open}" aria-label="${open ? 'Collapse' : 'Expand'} ${esc(it.title || 'item')}">${ms(open ? 'expand_more' : 'chevron_right')}</button>
        <input class="form-input cpb-item-title" data-f="title" value="${esc(it.title)}" placeholder="Item title" aria-label="Item title" autocomplete="off">
        <span class="cpb-item-meta">
          <span class="cpb-stale-slot" data-stale-slot="${esc(it.id)}"></span>
          <span class="cpb-tok" data-tok-item="${esc(it.id)}"></span>
          <label class="cpb-switch" title="Include this item in the output"><input type="checkbox" data-f="include"${it.include ? ' checked' : ''} aria-label="Include ${esc(it.title || 'this item')} in the pack"><span class="cpb-switch-track" aria-hidden="true"></span><span class="cpb-switch-text">Include</span></label>
          <span class="cpb-tools">
            <button type="button" class="icon-btn" data-act="itemUp" aria-label="Move item up"${i === 0 ? ' disabled' : ''}>${ms('arrow_upward')}</button>
            <button type="button" class="icon-btn" data-act="itemDown" aria-label="Move item down"${i === n - 1 ? ' disabled' : ''}>${ms('arrow_downward')}</button>
            <button type="button" class="icon-btn danger" data-act="removeItem" aria-label="Remove item">${ms('delete')}</button>
          </span>
        </span>
      </div>${body}
    </div>`;
    }

    function moduleHtml(m, i, n) {
        const T = TYPES[m.type];
        const collapsed = !!store.ui.collapsed[m.id];
        const bankBtn = typeof window.PL_ctxList === 'function' ? `<button type="button" class="btn btn-ghost" data-act="fromBank">${ms('database')}<span>Import from Context Bank</span></button>` : '';
        const items = m.items.length
            ? m.items.map((it, k) => itemHtml(m, it, k, m.items.length)).join('')
            : `<div class="cpb-empty"><b>No items yet</b><span>Add an item, load text or Markdown files, or import blocks from the Context Bank.</span></div>`;
        return `<article class="cpb-mod" data-mod="${esc(m.id)}" data-type="${m.type}">
      <header class="cpb-mod-head">
        <button type="button" class="cpb-chev" data-act="toggleMod" aria-expanded="${!collapsed}" aria-label="${collapsed ? 'Expand' : 'Collapse'} ${esc(m.name)}">${ms(collapsed ? 'chevron_right' : 'expand_more')}</button>
        <span class="cpb-glyph" aria-hidden="true">${ms(T.icon)}</span>
        <input class="form-input cpb-mod-name" data-f="modName" value="${esc(m.name)}" aria-label="Module name" autocomplete="off">
        <span class="cpb-mod-meta">
          <span class="cpb-tok" data-tok-mod="${esc(m.id)}"></span>
          <span class="cpb-tools">
            <button type="button" class="icon-btn" data-act="modUp" aria-label="Move module up"${i === 0 ? ' disabled' : ''}>${ms('arrow_upward')}</button>
            <button type="button" class="icon-btn" data-act="modDown" aria-label="Move module down"${i === n - 1 ? ' disabled' : ''}>${ms('arrow_downward')}</button>
            <button type="button" class="icon-btn danger" data-act="removeModule" aria-label="Remove module">${ms('delete')}</button>
          </span>
        </span>
      </header>
      ${collapsed ? '' : `<div class="cpb-mod-body">
        <div class="cpb-mod-sub">
          <p class="cpb-hint">${esc(T.blurb)}</p>
          <label class="cpb-type-pick"><span class="cpb-label">Type</span><select class="form-input cpb-mod-type" data-f="modType" aria-label="Module type">${optionsHtml(TYPES, m.type)}</select></label>
        </div>
        <div class="cpb-items">${items}</div>
        <div class="cpb-mod-actions">
          <button type="button" class="btn" data-act="addItem">${ms('add')}<span>Add item</span></button>
          <button type="button" class="btn btn-ghost" data-act="addFiles">${ms('upload_file')}<span>Add text or Markdown files</span></button>
          ${bankBtn}
        </div>
      </div>`}
    </article>`;
    }

    function editorHtml() {
        const pk = pack();
        const P = profile(pk, pk.platform);
        return `<div class="cpb-packbar">
      <div class="cpb-packbar-row">
        <label class="cpb-field cpb-grow"><span class="cpb-label">Pack name</span><input class="form-input cpb-pack-title" data-f="packName" value="${esc(pk.name)}" autocomplete="off" aria-label="Pack name"></label>
        <button type="button" class="btn" data-act="duplicatePack">${ms('content_copy')}<span>Duplicate</span></button>
        <button type="button" class="btn btn-danger" data-act="deletePack">${ms('delete')}<span>Delete</span></button>
      </div>
      <div class="cpb-packbar-row cpb-settings">
        <label class="cpb-field"><span>Stale after, days</span><input class="form-input cpb-mono cpb-num" type="number" min="1" max="3650" step="1" data-f="staleDays" value="${pk.staleDays}"></label>
        <label class="cpb-field"><span>Characters per token for <b data-plat-name>${esc(PLAT[pk.platform].name)}</b></span><input class="form-input cpb-mono cpb-num" type="number" min="1" max="20" step="0.1" data-f="ratio" value="${P.ratio}"></label>
        <label class="cpb-check"><input type="checkbox" data-f="sourceNotes"${pk.sourceNotes ? ' checked' : ''}><span>Add source lines to knowledge files</span></label>
      </div>
      <div class="cpb-stats" aria-live="off">
        <span class="cpb-stat"><span class="cpb-label">Items</span><span class="cpb-mono" data-stat="items"></span></span>
        <span class="cpb-stat"><span class="cpb-label">Stale</span><span class="cpb-mono" data-stat="stale"></span></span>
        <span class="cpb-stat cpb-stat-wide"><span class="cpb-label">Whole pack</span><span data-stat="tokens"></span></span>
      </div>
      <p class="cpb-method" data-method></p>
    </div>
    <div class="cpb-modules">${pk.modules.map((m, i) => moduleHtml(m, i, pk.modules.length)).join('')}</div>
    <div class="cpb-addmod">
      <span class="cpb-label">Add a module</span>
      <div class="cpb-addmod-row">
        <select class="form-input" id="cpb-newtype" aria-label="Type of the new module">${optionsHtml(TYPES, 'background')}</select>
        <button type="button" class="btn" data-act="addModule">${ms('add')}<span>Add module</span></button>
      </div>
    </div>`;
    }

    function barHtml(label, demand, budget) {
        if (budget == null) return `<div class="cpb-bar-row"><div class="cpb-bar-head"><span class="cpb-label">${label}</span><span class="cpb-bar-status">No limit set</span><span class="cpb-mono cpb-bar-fig">${fmt(demand)}<span class="cpb-unit"> est. tokens</span></span></div></div>`;
        const pct = budget > 0 ? demand / budget : 0;
        const tone = pct > 1 ? 'over' : pct >= 0.8 ? 'near' : 'ok';
        const status = pct > 1 ? `Over by <span class="cpb-mono">${fmt(demand - budget)}</span>` : pct >= 0.8 ? 'Close to the limit' : 'Fits';
        return `<div class="cpb-bar-row" data-tone="${tone}">
      <div class="cpb-bar-head"><span class="cpb-label">${label}</span><span class="cpb-bar-status">${status}</span><span class="cpb-mono cpb-bar-fig">${fmt(demand)} / ${fmt(budget)}<span class="cpb-unit"> est. tokens</span></span></div>
      <div class="cpb-bar" role="meter" aria-label="${esc(label)} against the approximate limit" aria-valuemin="0" aria-valuemax="${budget}" aria-valuenow="${Math.min(demand, budget)}" aria-valuetext="${fmt(demand)} of about ${fmt(budget)} estimated tokens"><span class="cpb-bar-fill" style="width:${Math.min(100, Math.round(pct * 1000) / 10)}%"></span></div>
    </div>`;
    }

    function outputHtml() {
        const pk = pack();
        const out = build(pk);
        lastOut = out;
        const { plat, P } = out;
        const chips = PLATFORMS.map(p => `<button type="button" class="cpb-chip${p.id === pk.platform ? ' cpb-on' : ''}" data-act="selectPlatform" data-id="${p.id}" aria-pressed="${p.id === pk.platform}">${ms(p.icon)}<span>${esc(p.name)}</span></button>`).join('');
        const bars = [];
        bars.push(barHtml('Instructions', out.instrDemand, P.instr));
        bars.push(barHtml('Knowledge', out.knowDemand, P.know));
        if (P.instr != null && P.know != null) bars.push(barHtml('Whole package', out.instrDemand + out.knowDemand, P.instr + P.know));
        const num = (k, v, ph) => `<input class="form-input cpb-mono cpb-num" type="number" min="1" step="1" data-f="prof_${k}" value="${v == null ? '' : v}" placeholder="${ph}">`;
        const settings = `<details class="cpb-details" id="cpb-limits"${store.ui.limitsOpen ? ' open' : ''}>
      <summary><span class="cpb-label">Limits and splitting</span>${ms('expand_more')}</summary>
      <p class="cpb-hint">${esc(plat.basis)}</p>
      <div class="cpb-limit-grid">
        <label class="cpb-field"><span>Instruction budget, est. tokens</span>${num('instr', P.instr, 'No limit')}</label>
        <label class="cpb-field"><span>Knowledge budget, est. tokens</span>${num('know', P.know, 'No limit')}</label>
        <label class="cpb-field"><span>Most knowledge files</span>${num('maxFiles', P.maxFiles, 'No limit')}</label>
        <label class="cpb-field"><span>Split a file above, est. tokens</span>${num('fileTok', P.fileTok, 'No splitting')}</label>
      </div>
      <button type="button" class="btn btn-ghost cpb-btn-xs" data-act="resetProfile">Reset to platform defaults</button>
    </details>`;
        const files = out.files.length ? out.files.map(f => {
            const open = !!store.ui.preview[plat.id + ':' + f.name];
            const slash = f.name.lastIndexOf('/');
            const dir = slash > -1 ? f.name.slice(0, slash + 1) : '';
            const base = f.name.slice(slash + 1);
            return `<article class="cpb-file" data-file="${esc(f.name)}">
        <div class="cpb-file-head">
          <span class="cpb-file-name cpb-mono" title="${esc(f.name)}"><span class="cpb-dir">${esc(dir)}</span>${esc(base)}</span>
          <span class="cpb-tag" data-group="${f.group}">${f.group === 'instr' ? 'Instructions' : 'Knowledge'}</span>${f.part ? `<span class="cpb-tag cpb-tag-split">${esc(f.part)}</span>` : ''}
        </div>
        <div class="cpb-file-row">
          <span class="cpb-file-tok">${tokHtml(f.tokens)}</span>
          <span class="cpb-tools">
            <button type="button" class="btn cpb-btn-xs" data-act="copyFile">${ms('content_copy')}<span>Copy</span></button>
            <button type="button" class="btn btn-ghost cpb-btn-xs" data-act="downloadFile">${ms('download')}<span>Download</span></button>
            <button type="button" class="btn btn-ghost cpb-btn-xs" data-act="togglePreview" aria-expanded="${open}">${ms(open ? 'visibility_off' : 'visibility')}<span>${open ? 'Hide preview' : 'Preview'}</span></button>
          </span>
        </div>
        ${open ? `<pre class="cpb-preview cpb-mono" tabindex="0" aria-label="Preview of ${esc(f.name)}">${esc(f.text)}</pre>` : ''}
      </article>`;
        }).join('') : `<div class="cpb-empty"><b>Nothing to generate yet</b><span>Add items with text and keep them included. The files for ${esc(plat.name)} appear here as you type.</span></div>`;
        const notes = [];
        if (out.cut.length) {
            notes.push(`<div class="cpb-note cpb-note-cut"><div class="cpb-note-title">${ms('content_cut')}<b>Would be cut</b><span class="cpb-mono cpb-count">${out.cut.length}</span></div>
        <p class="cpb-hint">Items are kept in pack order until a limit is reached, so reorder or shorten to change what fits. These are left out of the files.</p>
        <ul>${out.cut.map(c => `<li><span class="cpb-cut-title">${esc(c.title)}</span><span class="cpb-cut-meta">${esc(c.module)}. ${esc(c.reason)}. <span class="cpb-mono">${fmt(c.tokens)}</span> est. tokens</span></li>`).join('')}</ul></div>`);
        }
        if (out.split.length) {
            notes.push(`<div class="cpb-note"><div class="cpb-note-title">${ms('call_split')}<b>Split into parts</b><span class="cpb-mono cpb-count">${out.split.length}</span></div>
        <ul>${out.split.map(s => `<li><span class="cpb-cut-title">${esc(s.module)}</span><span class="cpb-cut-meta"><span class="cpb-mono">${s.parts}</span> files. ${esc(s.reason)}</span></li>`).join('')}</ul></div>`);
        }
        return `<div class="cpb-pane-head cpb-out-head">
      <span class="cpb-label">Platform output</span>
      <div class="cpb-chips" role="group" aria-label="Target platform">${chips}</div>
      <p class="cpb-where"><b>Where it goes.</b> ${esc(plat.where)}</p>
    </div>
    <div class="cpb-out-scroll">
      <section class="cpb-budget" aria-label="Budget">
        ${bars.join('')}
        <p class="cpb-approx">${ms('info')}<span>Every limit here is approximate. Check the platform's current limits before you rely on them.</span></p>
        ${settings}
      </section>
      ${notes.join('')}
      <section class="cpb-files" aria-label="Generated files">
        <div class="cpb-files-head"><span class="cpb-label">Files <span class="cpb-mono cpb-count">${out.files.length}</span></span><span class="cpb-count">Kept <span class="cpb-mono">${fmt(out.instrKept + out.knowKept)}</span> est. tokens</span></div>
        ${files}
      </section>
    </div>
    <div class="cpb-out-foot">
      <button type="button" class="btn btn-accent" data-act="downloadZip"${out.files.length ? '' : ' disabled'}>${ms('folder_zip')}<span>Download .zip</span></button>
      <button type="button" class="btn" data-act="downloadCombined">${ms('markdown')}<span>Combined Markdown</span></button>
      <button type="button" class="btn" data-act="exportJson">${ms('data_object')}<span>Pack JSON</span></button>
    </div>`;
    }

    /* ---------- rendering ---------- */
    function renderRail() { $('#cpb-rail', root).innerHTML = railHtml(); }
    function renderEditor() {
        const el = $('#cpb-editor', root);
        const top = el.scrollTop;
        el.innerHTML = editorHtml();
        el.scrollTop = top;
        refreshStats();
    }
    function renderOutput() {
        const el = $('#cpb-output', root);
        const scroller = $('.cpb-out-scroll', el);
        const top = scroller ? scroller.scrollTop : 0;
        const topOuter = el.scrollTop;
        const active = document.activeElement && el.contains(document.activeElement) ? document.activeElement : null;
        const focusAct = active ? active.dataset.act : null;
        // The limits fields keep their own element while the rest is redrawn, so typing is never interrupted.
        const keep = active && active.dataset.f && active.dataset.f.startsWith('prof_') ? $('#cpb-limits', el) : null;
        el.innerHTML = outputHtml();
        if (keep) {
            const fresh = $('#cpb-limits', el);
            if (fresh) fresh.replaceWith(keep);
            keep.querySelector(`[data-f="${active.dataset.f}"]`).focus({ preventScroll: true });
        }
        const s = $('.cpb-out-scroll', el);
        if (s) s.scrollTop = top;
        el.scrollTop = topOuter;
        if (focusAct) { const f = $(`[data-act="${focusAct}"]`, el); if (f) f.focus({ preventScroll: true }); }
    }
    function renderAll() { renderRail(); renderEditor(); renderOutput(); }
    function scheduleOutput() {
        clearTimeout(outTimer);
        outTimer = setTimeout(() => { if (isOpen()) renderOutput(); }, 120);
    }

    // Update every estimate and stale flag in place, so typing never loses focus.
    function refreshStats() {
        const pk = pack();
        if (!pk || !root) return;
        const P = profile(pk, pk.platform);
        let items = 0;
        let incl = 0;
        let stale = 0;
        pk.modules.forEach(m => {
            m.items.forEach(it => {
                items += 1;
                if (it.include) incl += 1;
                const sd = staleDaysOf(pk, it);
                if (sd && it.include) stale += 1;
                const row = $(`[data-item="${CSS.escape(it.id)}"]`, root);
                if (!row) return;
                row.classList.toggle('cpb-off', !it.include);
                row.classList.toggle('cpb-is-stale', !!sd);
                const tk = $('[data-tok-item]', row);
                if (tk) tk.innerHTML = tokHtml(itemTokens(it, P.ratio));
                const sl = $('[data-stale-slot]', row);
                if (sl) sl.innerHTML = sd ? `<span class="cpb-badge" data-tone="warn" title="Not reviewed for ${sd} days. This pack flags items after ${pk.staleDays} days.">${ms('schedule')}<span>Stale, <span class="cpb-mono">${fmt(sd)}</span> days</span></span>` : '';
                const ch = $('[data-chars]', row);
                if (ch) ch.textContent = fmt(it.content.length);
            });
            const mt = $(`[data-tok-mod="${CSS.escape(m.id)}"]`, root);
            if (mt) mt.innerHTML = tokHtml(moduleTokens(m, P.ratio));
        });
        const set = (k, html) => { const e = $(`[data-stat="${k}"]`, root); if (e) e.innerHTML = html; };
        set('items', `${fmt(incl)}<span class="cpb-unit"> of ${fmt(items)} included</span>`);
        set('stale', stale ? `<span class="cpb-warn-text">${fmt(stale)}</span>` : '0');
        set('tokens', tokHtml(packTokens(pk, P.ratio)));
        const me = $('[data-method]', root);
        if (me) me.textContent = `Estimate method: characters divided by ${P.ratio} for ${PLAT[pk.platform].name}. These are rough guides to size things up, not exact token counts, and counts differ between models.`;
        const pn = $('[data-plat-name]', root);
        if (pn) pn.textContent = PLAT[pk.platform].name;
    }

    /* ---------- dialogs ---------- */
    function confirmDialog(title, msg, okLabel) {
        return new Promise(resolve => {
            const d = $('#cpb-confirm', root);
            $('#cpb-confirm-title', d).textContent = title;
            $('#cpb-confirm-msg', d).textContent = msg;
            $('#cpb-confirm-yes', d).textContent = okLabel || 'Delete';
            d.returnValue = '';
            d.addEventListener('close', () => resolve(d.returnValue === 'yes'), { once: true });
            d.showModal();
        });
    }

    function bankListHtml() {
        const q = bank.q.trim().toLowerCase();
        const rows = bank.blocks.filter(b => !q || (b.title + ' ' + b.category + ' ' + b.content).toLowerCase().includes(q));
        if (!rows.length) return `<div class="cpb-empty"><b>No blocks found</b><span>${bank.blocks.length ? 'Try a different search.' : 'The Context Bank is empty.'}</span></div>`;
        return rows.map(b => `<label class="cpb-bank-row"><input type="checkbox" data-bank="${esc(b.id)}"${bank.sel.has(b.id) ? ' checked' : ''}><span class="cpb-bank-text"><b>${esc(b.title)}</b><span>${esc(b.category)}. <span class="cpb-mono">${fmt(estimate(b.content, 4))}</span> est. tokens</span></span></label>`).join('');
    }
    function bankSync() {
        $('#cpb-bank-list', root).innerHTML = bankListHtml();
        const btn = $('#cpb-bank-add', root);
        btn.disabled = !bank.sel.size;
        btn.textContent = bank.sel.size ? `Add ${bank.sel.size} selected` : 'Add selected';
    }
    async function openBank(modId) {
        if (typeof window.PL_ctxList !== 'function') return toast('The Context Bank is not available here.', 'warning');
        let blocks;
        try { blocks = await window.PL_ctxList(); } catch (e) { return toast('The Context Bank could not be read.', 'error'); }
        if (!Array.isArray(blocks)) return toast('The Context Bank could not be read.', 'error');
        bank = { modId, blocks, sel: new Set(), q: '' };
        $('#cpb-bank-q', root).value = '';
        bankSync();
        $('#cpb-bank', root).showModal();
    }

    /* ---------- actions ---------- */
    function isOpen() { return !!root && root.classList.contains('open'); }
    const isNarrow = () => window.matchMedia('(max-width: 1000px)').matches;
    function setTab(tab) {
        root.dataset.tab = tab;
        $$('.cpb-tab', root).forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    }

    function touch() { save(); refreshStats(); scheduleOutput(); }

    function addItem(modId, extra) {
        const pk = pack();
        const m = pk.modules.find(x => x.id === modId);
        if (!m) return null;
        const it = newItem(extra);
        m.items.push(it);
        store.ui.open[it.id] = true;
        return it;
    }

    async function readTextFile(file) {
        if (file.size > MAX_FILE_BYTES) { toast(`${file.name} is larger than 2 MB, so it was skipped.`, 'warning'); return null; }
        try { return await file.text(); } catch (e) { toast(`${file.name} could not be read.`, 'error'); return null; }
    }
    // Files are read in the browser only. The browser gives only the file name, never the full path.
    async function handleFiles(files) {
        const mode = fileMode;
        fileMode = null;
        if (!mode || !files.length) return;
        const pk = pack();
        let added = 0;
        if (mode.kind === 'item') {
            const f = findItem(pk, mode.id);
            const file = files[0];
            if (!f || !file) return;
            const text = await readTextFile(file);
            if (text == null) return;
            if (f.it.content.trim() && !(await confirmDialog('Replace the text?', `Loading ${file.name} replaces the text now in this item.`, 'Replace'))) return;
            f.it.content = text;
            if (!f.it.title.trim()) f.it.title = file.name.replace(/\.[^.]+$/, '');
            Object.assign(f.it, { kind: 'file', srcName: file.name, srcLoc: file.name, added: f.it.added || today() });
            store.ui.open[f.it.id] = true;
            added = 1;
        } else {
            for (const file of Array.from(files)) {
                const text = await readTextFile(file);
                if (text == null) continue;
                const it = addItem(mode.id, { title: file.name.replace(/\.[^.]+$/, ''), content: text, kind: 'file', srcName: file.name, srcLoc: file.name });
                if (it) { store.ui.open[it.id] = false; added += 1; }
            }
        }
        if (added) { save(); renderAll(); toast(added === 1 ? 'File loaded' : `${added} files added`, 'success'); }
    }

    function exportPackJson() {
        const pk = pack();
        const data = { schema: SCHEMA, version: SCHEMA_VERSION, exported: new Date().toISOString(), pack: pk };
        download(`${slug(pk.name)}.context-pack.json`, JSON.stringify(data, null, 2), 'application/json');
        toast('Pack JSON exported', 'success');
    }
    function importPackJson(text) {
        let data;
        try { data = JSON.parse(text); } catch (e) { return toast('That file is not valid JSON.', 'error'); }
        if (!data || data.schema !== SCHEMA || !data.pack) return toast('That file is not a Context Pack Builder export.', 'error');
        if (!Number.isFinite(data.version) || data.version > SCHEMA_VERSION) return toast('That pack was made by a newer version of this tool.', 'error');
        const pk = normalisePack(data.pack, true);
        if (store.packs.some(p => p.name === pk.name)) pk.name += ' (imported)';
        store.packs.push(pk);
        store.active = pk.id;
        save();
        renderAll();
        if (isNarrow()) setTab('edit');
        toast(`Imported ${pk.name}`, 'success');
    }

    function moveIn(arr, i, d) {
        const j = i + d;
        if (j < 0 || j >= arr.length) return false;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        return true;
    }

    const actions = {
        close: () => closeWorkspace(),
        tab: el => setTab(el.dataset.tab),
        selectPack: el => {
            store.active = el.dataset.id;
            save();
            renderAll();
            if (isNarrow()) setTab('edit');
        },
        newPack: () => {
            const pk = newPack(`Pack ${store.packs.length + 1}`);
            store.packs.push(pk);
            store.active = pk.id;
            save();
            renderAll();
            if (isNarrow()) setTab('edit');
            const inp = $('[data-f="packName"]', root);
            if (inp) { inp.focus(); inp.select(); }
        },
        importPack: () => $('#cpb-import', root).click(),
        duplicatePack: () => {
            const pk = pack();
            const copy = normalisePack(JSON.parse(JSON.stringify(pk)), true);
            copy.name = `${pk.name} copy`;
            store.packs.splice(store.packs.indexOf(pk) + 1, 0, copy);
            store.active = copy.id;
            save();
            renderAll();
            toast('Pack duplicated', 'success');
        },
        deletePack: async () => {
            const pk = pack();
            if (!(await confirmDialog('Delete this pack?', `"${pk.name}" and everything in it is removed from this device. Export it as JSON first if you want to keep it.`, 'Delete pack'))) return;
            store.packs = store.packs.filter(p => p.id !== pk.id);
            if (!store.packs.length) store.packs.push(newPack('My first pack'));
            store.active = store.packs[0].id;
            save();
            renderAll();
            toast('Pack deleted');
        },
        addModule: () => {
            const type = $('#cpb-newtype', root).value;
            const m = newModule(TYPES[type] ? type : 'reference');
            pack().modules.push(m);
            save();
            renderAll();
            const el = $(`[data-mod="${CSS.escape(m.id)}"]`, root);
            if (el) { el.scrollIntoView({ block: 'nearest' }); const n = $('.cpb-mod-name', el); if (n) { n.focus(); n.select(); } }
        },
        removeModule: async el => {
            const pk = pack();
            const m = pk.modules.find(x => x.id === el.closest('[data-mod]').dataset.mod);
            if (!m) return;
            const msg = m.items.length ? `"${m.name}" and its ${m.items.length} item${m.items.length === 1 ? '' : 's'} are removed from this pack.` : `"${m.name}" is removed from this pack.`;
            if (!(await confirmDialog('Remove this module?', msg, 'Remove module'))) return;
            pk.modules = pk.modules.filter(x => x !== m);
            save();
            renderAll();
        },
        modUp: el => moduleMove(el, -1),
        modDown: el => moduleMove(el, 1),
        toggleMod: el => {
            const id = el.closest('[data-mod]').dataset.mod;
            store.ui.collapsed[id] = !store.ui.collapsed[id];
            save();
            renderEditor();
            const b = $(`[data-mod="${CSS.escape(id)}"] [data-act="toggleMod"]`, root);
            if (b) b.focus();
        },
        addItem: el => {
            const it = addItem(el.closest('[data-mod]').dataset.mod);
            if (!it) return;
            save();
            renderAll();
            const t = $(`[data-item="${CSS.escape(it.id)}"] [data-f="title"]`, root);
            if (t) { t.focus(); t.scrollIntoView({ block: 'nearest' }); }
        },
        addFiles: el => {
            fileMode = { kind: 'module', id: el.closest('[data-mod]').dataset.mod };
            const inp = $('#cpb-file', root);
            inp.multiple = true;
            inp.value = '';
            inp.click();
        },
        loadFile: el => {
            fileMode = { kind: 'item', id: el.closest('[data-item]').dataset.item };
            const inp = $('#cpb-file', root);
            inp.multiple = false;
            inp.value = '';
            inp.click();
        },
        fromBank: el => openBank(el.closest('[data-mod]').dataset.mod),
        bankClose: () => $('#cpb-bank', root).close(),
        bankAdd: () => {
            if (!bank || !bank.sel.size) return;
            let n = 0;
            bank.blocks.filter(b => bank.sel.has(b.id)).forEach(b => {
                const it = addItem(bank.modId, { title: b.title, content: b.content, kind: 'library', srcName: `Context Bank: ${b.title}`, srcLoc: `Context Bank block, ${b.category}` });
                if (it) { store.ui.open[it.id] = false; n += 1; }
            });
            $('#cpb-bank', root).close();
            bank = null;
            save();
            renderAll();
            toast(`${n} block${n === 1 ? '' : 's'} imported`, 'success');
        },
        toggleItem: el => {
            const it = findItem(pack(), el.closest('[data-item]').dataset.item);
            if (!it) return;
            store.ui.open[it.it.id] = !isOpenItem(it.it);
            save();
            renderEditor();
            const b = $(`[data-item="${CSS.escape(it.it.id)}"] [data-act="toggleItem"]`, root);
            if (b) b.focus();
        },
        itemUp: el => itemMove(el, -1),
        itemDown: el => itemMove(el, 1),
        removeItem: async el => {
            const pk = pack();
            const f = findItem(pk, el.closest('[data-item]').dataset.item);
            if (!f) return;
            if ((f.it.content.trim() || f.it.title.trim()) && !(await confirmDialog('Remove this item?', `"${f.it.title.trim() || 'Untitled item'}" is removed from this module.`, 'Remove item'))) return;
            f.m.items.splice(f.i, 1);
            save();
            renderAll();
        },
        reviewedToday: el => {
            const f = findItem(pack(), el.closest('[data-item]').dataset.item);
            if (!f) return;
            f.it.reviewed = today();
            const inp = $('[data-f="reviewed"]', el.closest('[data-item]'));
            if (inp) inp.value = f.it.reviewed;
            touch();
        },
        selectPlatform: el => {
            pack().platform = el.dataset.id;
            save();
            renderEditor();
            renderOutput();
        },
        resetProfile: () => {
            const pk = pack();
            delete pk.prof[pk.platform];
            save();
            renderEditor();
            renderOutput();
        },
        copyFile: async el => {
            const f = outFile(el);
            if (!f) return;
            const ok = await copyText(f.text);
            toast(ok ? `Copied ${f.name}` : 'Copy was blocked by the browser. Download the file instead.', ok ? 'success' : 'error');
        },
        downloadFile: el => {
            const f = outFile(el);
            if (!f) return;
            download(f.name.split('/').pop(), f.text, 'text/markdown;charset=utf-8');
        },
        togglePreview: el => {
            const f = outFile(el);
            if (!f) return;
            const k = lastOut.plat.id + ':' + f.name;
            store.ui.preview[k] = !store.ui.preview[k];
            save();
            renderOutput();
        },
        downloadZip: () => {
            const pk = pack();
            const out = lastOut || build(pk);
            if (!out.files.length) return toast('There are no files to zip yet.', 'warning');
            download(`${slug(pk.name)}-${out.plat.id}.zip`, new Blob([zipBytes(out.files)], { type: 'application/zip' }));
            toast(`Zip with ${out.files.length} file${out.files.length === 1 ? '' : 's'} downloaded`, 'success');
        },
        downloadCombined: () => {
            const pk = pack();
            download(`${slug(pk.name)}-combined.md`, combinedMarkdown(pk), 'text/markdown;charset=utf-8');
            toast('Combined Markdown downloaded', 'success');
        },
        exportJson: () => exportPackJson()
    };

    function outFile(el) {
        const name = el.closest('[data-file]').dataset.file;
        return lastOut && lastOut.files.find(f => f.name === name);
    }
    function moduleMove(el, d) {
        const pk = pack();
        const id = el.closest('[data-mod]').dataset.mod;
        const i = pk.modules.findIndex(m => m.id === id);
        if (!moveIn(pk.modules, i, d)) return;
        save();
        renderEditor();
        scheduleOutput();
        const b = $(`[data-mod="${CSS.escape(id)}"] [data-act="${d < 0 ? 'modUp' : 'modDown'}"]`, root);
        if (b && !b.disabled) b.focus();
    }
    function itemMove(el, d) {
        const id = el.closest('[data-item]').dataset.item;
        const f = findItem(pack(), id);
        if (!f || !moveIn(f.m.items, f.i, d)) return;
        save();
        renderEditor();
        scheduleOutput();
        const b = $(`[data-item="${CSS.escape(id)}"] [data-act="${d < 0 ? 'itemUp' : 'itemDown'}"]`, root);
        if (b && !b.disabled) b.focus();
    }

    function onInput(e) {
        const t = e.target;
        const f = t.dataset && t.dataset.f;
        if (!f) return;
        const pk = pack();
        if (f === 'bankQ') { if (bank) { bank.q = t.value; $('#cpb-bank-list', root).innerHTML = bankListHtml(); } return; }
        if (f === 'packName') {
            pk.name = t.value.slice(0, 120) || 'Untitled pack';
            renderRail();
            touch();
            return;
        }
        if (f === 'staleDays') {
            const n = Math.round(Number(t.value));
            if (n >= 1 && n <= 3650) { pk.staleDays = n; touch(); }
            return;
        }
        if (f === 'ratio') {
            const n = Number(t.value);
            if (n > 0 && n <= 20) {
                pk.prof[pk.platform] = Object.assign(pk.prof[pk.platform] || {}, { ratio: n });
                renderRail();
                touch();
            }
            return;
        }
        if (f === 'sourceNotes') { pk.sourceNotes = t.checked; touch(); return; }
        if (f.startsWith('prof_')) {
            const k = f.slice(5);
            const v = t.value.trim() === '' ? null : Math.round(Number(t.value));
            if (v !== null && !(v > 0)) return;
            pk.prof[pk.platform] = Object.assign(pk.prof[pk.platform] || {}, { [k]: v });
            save();
            scheduleOutput();
            return;
        }
        const modEl = t.closest('[data-mod]');
        const itemEl = t.closest('[data-item]');
        if (f === 'modName' && modEl) {
            const m = pk.modules.find(x => x.id === modEl.dataset.mod);
            if (m) { m.name = t.value.slice(0, 120); touch(); }
            return;
        }
        if (f === 'modType' && modEl) {
            const m = pk.modules.find(x => x.id === modEl.dataset.mod);
            if (m && TYPES[t.value]) { m.type = t.value; save(); renderEditor(); scheduleOutput(); }
            return;
        }
        if (itemEl) {
            const found = findItem(pk, itemEl.dataset.item);
            if (!found) return;
            const it = found.it;
            if (f === 'include') it.include = t.checked;
            else if (f === 'kind') { if (KINDS[t.value]) it.kind = t.value; }
            else if (f === 'added' || f === 'reviewed') it[f] = validDate(t.value);
            else if (f === 'title') it.title = t.value.slice(0, 200);
            else if (f === 'content') it.content = t.value;
            else if (f === 'srcName') it.srcName = t.value.slice(0, 200);
            else if (f === 'srcLoc') it.srcLoc = t.value.slice(0, 1000);
            touch();
        }
    }

    function onClick(e) {
        const el = e.target.closest('[data-act]');
        if (!el || el.disabled) return;
        const fn = actions[el.dataset.act];
        if (!fn) return;
        e.preventDefault();
        fn(el);
    }

    function onChange(e) {
        const t = e.target;
        if (t.id === 'cpb-file') { handleFiles(Array.from(t.files || [])); return; }
        if (t.id === 'cpb-import') {
            const file = t.files && t.files[0];
            t.value = '';
            if (!file) return;
            if (file.size > 5 * MAX_FILE_BYTES) return toast('That file is too large to be a pack.', 'error');
            file.text().then(importPackJson, () => toast('That file could not be read.', 'error'));
            return;
        }
        if (t.dataset && t.dataset.bank && bank) {
            if (t.checked) bank.sel.add(t.dataset.bank); else bank.sel.delete(t.dataset.bank);
            const btn = $('#cpb-bank-add', root);
            btn.disabled = !bank.sel.size;
            btn.textContent = bank.sel.size ? `Add ${bank.sel.size} selected` : 'Add selected';
        }
    }

    function onKeydown(e) {
        if (e.key !== 'Escape' || !isOpen()) return;
        if (e.target.closest && e.target.closest('dialog')) return;
        if (document.querySelector(`#${ROOT_ID} dialog[open]`)) return;
        closeWorkspace();
    }

    /* ---------- mount, open, close ---------- */
    function ensureRoot() {
        let el = document.getElementById(ROOT_ID);
        if (!el) {
            el = document.createElement('div');
            el.id = ROOT_ID;
            document.body.appendChild(el);
        }
        return el;
    }
    function mount() {
        root = ensureRoot();
        if (root.dataset.cpbMounted) return;
        root.dataset.cpbMounted = '1';
        root.setAttribute('role', 'region');
        root.setAttribute('aria-label', 'Context Pack Builder');
        root.tabIndex = -1;
        root.innerHTML = MARKUP;
        root.addEventListener('click', onClick);
        root.addEventListener('input', onInput);
        root.addEventListener('change', onChange);
        root.addEventListener('keydown', onKeydown);
        // The toggle event does not bubble, so it is caught on the way down.
        root.addEventListener('toggle', e => { if (e.target.id === 'cpb-limits') { store.ui.limitsOpen = e.target.open; save(); } }, true);
        window.addEventListener('pagehide', flushSave);
        setTab('edit');
        renderAll();
        if (savedLabel) $('#cpb-saved', root).textContent = savedLabel;
    }
    function ensure() {
        if (!store) store = loadStore();
        mount();
        return root;
    }

    function closeWorkspace() {
        if (!root) return;
        flushSave();
        $$('dialog[open]', root).forEach(d => d.close());
        root.classList.remove('open');
        document.querySelectorAll('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
        if (opener && document.contains(opener) && typeof opener.focus === 'function') opener.focus();
        opener = null;
    }

    window.openContextPackBuilderWorkspace = function () {
        if (!document.body.classList.contains('is-premium')) return toast('Context Pack Builder is a Pro feature', 'warning');
        const wasOpen = isOpen();
        if (!wasOpen) opener = document.activeElement;
        ensure();
        renderAll();
        root.classList.add('open');
        document.querySelectorAll('.nav-item[data-view]').forEach(el => el.classList.remove('active'));
        root.focus({ preventScroll: true });
    };
    window.PL_closeContextPackBuilder = closeWorkspace;
    Object.defineProperty(window, '__cpb', {
        configurable: true,
        get: () => ({ store, build, zipBytes, crc32, combinedMarkdown, estimate, profile, normalisePack, pack, newItem, render: renderAll, last: () => lastOut })
    });

    // Make sure the root element exists at load. The markup is built on first open.
    function init() { try { ensureRoot(); } catch (e) { console.warn('Context Pack Builder root failed:', e); } }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
