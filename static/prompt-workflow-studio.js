/* Prompt Workflow Studio: turn a collection of prompts into a documented, reusable workflow.
   Self contained. Every id and class is prefixed pws- and lives inside #promptWorkflowStudioWorkspace.
   Nothing here runs a prompt against an AI. Saved state is localStorage only (prompt-workflow-studio.v1). */
(function () {
    'use strict';
    const ROOT_ID = 'promptWorkflowStudioWorkspace';
    const STORE = 'prompt-workflow-studio.v1';
    const SCHEMA = 'prompt-workflow-studio';
    const VERSION = 1;
    const GRID = 16;
    const NODE_W = 208;
    const MAX_NODES = 200;
    const MIN_Z = 0.3, MAX_Z = 1.8;
    const TYPES = ['text', 'list', 'number', 'json'];
    const LABELS = ['always', 'pass', 'fail'];

    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const ms = (name, cls = '') => `<span class="material-symbols-outlined${cls ? ' ' + cls : ''}" aria-hidden="true">${name}</span>`;
    const toast = (msg, kind = 'info') => { if (window.PL_toast) window.PL_toast(msg, kind); };
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const snap = v => Math.round(v / GRID) * GRID;
    let idSeq = 0;
    const rid = p => `${p}_${Date.now().toString(36)}${(idSeq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

    // Colour tokens per node kind, all taken from the app palette.
    const KINDS = {
        input: { label: 'Input', icon: 'login', c: '--c-green', soft: '--c-green-soft', hint: 'A start variable the workflow asks for' },
        context: { label: 'Context', icon: 'menu_book', c: '--c-blue', soft: '--c-blue-soft', hint: 'Background text or a reference' },
        prompt: { label: 'Prompt', icon: 'chat', c: '--accent', soft: '--accent-soft', hint: 'One prompt run as a stage' },
        validation: { label: 'Validation', icon: 'rule', c: '--c-orange', soft: '--c-orange-soft', hint: 'Rules the output must meet' },
        verification: { label: 'Verification', icon: 'verified', c: '--c-purple', soft: '--c-purple-soft', hint: 'A check a person or a second prompt makes' },
        recovery: { label: 'Recovery', icon: 'healing', c: '--c-red', soft: '--c-red-soft', hint: 'What to do when a stage fails' },
        output: { label: 'Output', icon: 'logout', c: '--c-indigo', soft: '--c-indigo-soft', hint: 'The workflow result' }
    };
    const KIND_ORDER = ['prompt', 'input', 'context', 'validation', 'verification', 'recovery', 'output'];
    const isCheck = k => k === 'validation' || k === 'verification';

    /* ---------- text helpers ---------- */
    const s = (v, max = 8000) => (typeof v === 'string' ? v.slice(0, max) : v == null ? '' : String(v).slice(0, max));
    const num = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? clamp(Math.round(v), lo, hi) : d; };
    const oneOf = (v, list, d) => (list.includes(v) ? v : d);
    const lines = (v, max = 40) => (Array.isArray(v) ? v : []).map(x => s(x, 300).trim()).filter(Boolean).slice(0, max);
    const ioList = (v, withReq) => {
        const seen = new Set();
        return (Array.isArray(v) ? v : []).slice(0, 30).map(x => {
            const o = { name: s(x && x.name, 60).trim(), type: oneOf(x && x.type, TYPES, 'text') };
            if (withReq) o.required = !(x && x.required === false);
            return o;
        }).filter(o => o.name && !seen.has(o.name) && seen.add(o.name));
    };

    // Variables written as [[name]], {{name}} or ((name)), the same three forms the library uses.
    function detectVars(text) {
        const found = [];
        const re = /\[\[(.+?)\]\]|\{\{(.+?)\}\}|\(\((.+?)\)\)/g;
        let m;
        while ((m = re.exec(String(text || ''))) !== null) {
            const v = (m[1] || m[2] || m[3] || '').trim();
            if (v && v.length < 60 && !/\n/.test(v) && !found.includes(v)) found.push(v);
        }
        return found;
    }
    // A line such as "Output: outline, key points" names the outputs a prompt hands on.
    function detectOutputs(text) {
        const found = [];
        const re = /^\s*(?:expected\s+)?(?:outputs?|returns?|produces?|deliverables?)\s*:\s*(.+)$/gim;
        let m;
        while ((m = re.exec(String(text || ''))) !== null) {
            m[1].split(/[,;]|\band\b/i).forEach(part => {
                const name = part.replace(/[\[\]{}()]/g, '').replace(/[.]+$/, '').trim();
                if (name && name.length <= 40 && name.split(/\s+/).length <= 4 && !found.includes(name)) found.push(name);
            });
        }
        return found;
    }
    function guessType(name, meta) {
        const t = meta && meta[name] && meta[name].type;
        if (t === 'number') return 'number';
        if (/(list|items|bullets|points|steps|tags|options)$/i.test(name)) return 'list';
        if (/(count|number|num|total|amount|score|limit|age|year|length)$/i.test(name)) return 'number';
        if (/(json|schema|payload|object)$/i.test(name)) return 'json';
        return 'text';
    }

    /* ---------- model ---------- */
    function blankNode(kind, x, y) {
        const base = { id: rid('n'), kind, x: snap(x || 0), y: snap(y || 0), title: KINDS[kind].label };
        switch (kind) {
            case 'prompt': return { ...base, title: 'New prompt', source: 'typed', promptId: null, text: '', inputs: [], outputs: [{ name: 'result', type: 'text' }], dismissed: [] };
            case 'context': return { ...base, mode: 'text', text: '', ref: '' };
            case 'validation': return { ...base, title: 'Validation checkpoint', rules: [], pass: 'all', threshold: 1, retryLimit: 0 };
            case 'verification': return { ...base, title: 'Verification checkpoint', performer: 'person', checker: '', checkerId: null, checklist: [], retryLimit: 0 };
            case 'recovery': return { ...base, title: 'Recovery step', strategy: 'retry', instruction: '', fallback: '', fallbackId: null, escalate: '', retryLimit: 2 };
            case 'input': return { ...base, title: 'Workflow input', name: 'input', type: 'text', description: '', example: '' };
            default: return { ...base, title: 'Workflow output', name: 'result', type: 'text', description: '' };
        }
    }
    function newWorkflow(name) {
        const t = Date.now();
        return { id: rid('wf'), name: name || 'Untitled workflow', purpose: '', nodes: [], edges: [], view: { x: 40, y: 56, z: 1 }, created: t, updated: t };
    }

    // Everything read from storage or a file passes through here, so the rest of the code can trust the shape.
    function cleanNode(r) {
        if (!r || typeof r !== 'object' || !KINDS[r.kind]) return null;
        const n = blankNode(r.kind, 0, 0);
        n.id = /^[\w-]{1,60}$/.test(s(r.id, 70)) ? r.id : n.id;
        n.x = clamp(Math.round(Number(r.x) || 0), -20000, 20000);
        n.y = clamp(Math.round(Number(r.y) || 0), -20000, 20000);
        n.title = s(r.title, 120) || n.title;
        const k = r.kind;
        if (k === 'prompt') {
            n.source = oneOf(r.source, ['library', 'typed'], 'typed');
            n.promptId = Number.isFinite(Number(r.promptId)) && r.promptId !== null ? Number(r.promptId) : null;
            n.text = s(r.text, 40000);
            n.inputs = ioList(r.inputs, true);
            n.outputs = ioList(r.outputs, false);
            n.dismissed = lines(r.dismissed, 30);
        } else if (k === 'context') {
            n.mode = oneOf(r.mode, ['text', 'reference'], 'text');
            n.text = s(r.text, 40000);
            n.ref = s(r.ref, 500);
        } else if (k === 'validation') {
            n.rules = lines(r.rules);
            n.pass = oneOf(r.pass, ['all', 'any', 'threshold'], 'all');
            n.threshold = num(r.threshold, 1, 40, 1);
            n.retryLimit = num(r.retryLimit, 0, 20, 0);
        } else if (k === 'verification') {
            n.performer = oneOf(r.performer, ['person', 'prompt'], 'person');
            n.checker = s(r.checker, 40000);
            n.checkerId = Number.isFinite(Number(r.checkerId)) && r.checkerId !== null ? Number(r.checkerId) : null;
            n.checklist = lines(r.checklist);
            n.retryLimit = num(r.retryLimit, 0, 20, 0);
        } else if (k === 'recovery') {
            n.strategy = oneOf(r.strategy, ['retry', 'fallback', 'escalate'], 'retry');
            n.instruction = s(r.instruction, 4000);
            n.fallback = s(r.fallback, 40000);
            n.fallbackId = Number.isFinite(Number(r.fallbackId)) && r.fallbackId !== null ? Number(r.fallbackId) : null;
            n.escalate = s(r.escalate, 300);
            n.retryLimit = num(r.retryLimit, 0, 20, 2);
        } else {
            n.name = s(r.name, 60).trim() || n.name;
            n.type = oneOf(r.type, TYPES, 'text');
            n.description = s(r.description, 1000);
            if (k === 'input') n.example = s(r.example, 1000);
        }
        return n;
    }
    function cleanWorkflow(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const nodes = [], seen = new Set();
        (Array.isArray(raw.nodes) ? raw.nodes : []).slice(0, MAX_NODES).forEach(r => {
            const n = cleanNode(r);
            if (!n || seen.has(n.id)) return;
            seen.add(n.id);
            nodes.push(n);
        });
        const edges = [], keys = new Set();
        (Array.isArray(raw.edges) ? raw.edges : []).slice(0, MAX_NODES * 4).forEach(r => {
            if (!r || !seen.has(r.from) || !seen.has(r.to) || r.from === r.to) return;
            const e = {
                id: /^[\w-]{1,60}$/.test(s(r.id, 70)) ? r.id : rid('e'), from: r.from, to: r.to,
                label: oneOf(r.label, LABELS, 'always'),
                map: (Array.isArray(r.map) ? r.map : []).slice(0, 30).map(m => ({ out: s(m && m.out, 60), in: s(m && m.in, 60) })).filter(m => m.out && m.in)
            };
            const key = `${e.from}|${e.to}|${e.label}`;
            if (keys.has(key)) return;
            keys.add(key);
            edges.push(e);
        });
        const v = raw.view || {};
        return {
            id: /^[\w-]{1,60}$/.test(s(raw.id, 70)) ? raw.id : rid('wf'),
            name: s(raw.name, 120).trim() || 'Untitled workflow',
            purpose: s(raw.purpose, 4000),
            nodes, edges,
            view: { x: clamp(Number(v.x) || 40, -50000, 50000), y: clamp(Number(v.y) || 56, -50000, 50000), z: clamp(Number(v.z) || 1, MIN_Z, MAX_Z) },
            created: Number(raw.created) || Date.now(), updated: Number(raw.updated) || Date.now()
        };
    }

    /* ---------- graph reading ---------- */
    const byId = (wf, id) => wf.nodes.find(n => n.id === id);
    const outsOf = (wf, id) => wf.edges.filter(e => e.from === id);
    const insOf = (wf, id) => wf.edges.filter(e => e.to === id);
    const pos = (a, b) => a.x - b.x || a.y - b.y;
    const inputsOf = n => (n.kind === 'prompt' ? n.inputs : n.kind === 'output' && n.name ? [{ name: n.name, type: n.type, required: true }] : []);
    const typeOk = (outT, inT) => outT === inT || inT === 'text';
    const nameOf = n => n.title || KINDS[n.kind].label;

    // Names a node can hand on. Checks and recovery steps pass through whatever reaches them.
    function producedBy(wf, id, seen) {
        seen = seen || new Set();
        if (seen.has(id)) return [];
        seen.add(id);
        const n = byId(wf, id);
        if (!n) return [];
        if (n.kind === 'prompt') return n.outputs.map(o => ({ name: o.name, type: o.type, from: id }));
        if (n.kind === 'input') return n.name ? [{ name: n.name, type: n.type, from: id }] : [];
        if (n.kind === 'context') return [{ name: 'context', type: 'text', from: id }];
        if (n.kind === 'output') return [];
        const list = [];
        insOf(wf, id).forEach(e => producedBy(wf, e.from, seen).forEach(o => { if (!list.some(x => x.name === o.name)) list.push(o); }));
        return list;
    }
    function autoMap(wf, e) {
        const t = byId(wf, e.to);
        if (!t) return 0;
        const src = producedBy(wf, e.from);
        const taken = new Set();
        insOf(wf, t.id).forEach(x => x.map.forEach(m => taken.add(m.in)));
        let added = 0;
        inputsOf(t).forEach(i => {
            if (taken.has(i.name)) return;
            let o = src.find(x => norm(x.name) === norm(i.name));
            if (!o && t.kind === 'output') o = src.find(x => x.name === 'result') || src[0];
            if (o) { e.map.push({ out: o.name, in: i.name }); taken.add(i.name); added++; }
        });
        return added;
    }
    function reaches(wf, startId, kind) {
        const seen = new Set(), q = [startId];
        while (q.length) {
            const id = q.shift();
            if (seen.has(id)) continue;
            seen.add(id);
            const n = byId(wf, id);
            if (n && n.kind === kind) return true;
            outsOf(wf, id).forEach(e => q.push(e.to));
        }
        return false;
    }
    function recoveryReached(wf, startId) {
        const seen = new Set(), q = [startId], found = [];
        while (q.length) {
            const id = q.shift();
            if (seen.has(id)) continue;
            seen.add(id);
            const n = byId(wf, id);
            if (n && n.kind === 'recovery') found.push(n);
            outsOf(wf, id).forEach(e => q.push(e.to));
        }
        return found;
    }
    // Strongly connected groups of size two or more are loops.
    function findCycles(wf) {
        const idx = {}, low = {}, on = {}, st = [], out = [];
        let i = 0;
        const walk = v => {
            idx[v] = low[v] = i++;
            st.push(v);
            on[v] = true;
            outsOf(wf, v).forEach(e => {
                const w = e.to;
                if (idx[w] === undefined) { walk(w); low[v] = Math.min(low[v], low[w]); } else if (on[w]) low[v] = Math.min(low[v], idx[w]);
            });
            if (low[v] === idx[v]) {
                const comp = [];
                let w;
                do { w = st.pop(); on[w] = false; comp.push(w); } while (w !== v);
                if (comp.length > 1) out.push(comp);
            }
        };
        wf.nodes.forEach(n => { if (idx[n.id] === undefined) walk(n.id); });
        return out;
    }
    // Reading order: a topological order, pass branches before fail branches, left to right then top to bottom.
    function orderNodes(wf) {
        const state = {}, out = [];
        const kids = n => {
            const edges = outsOf(wf, n.id);
            const pick = list => list.map(e => byId(wf, e.to)).filter(Boolean).sort((a, b) => pos(b, a));
            return [...pick(edges.filter(e => e.label === 'fail')), ...pick(edges.filter(e => e.label !== 'fail'))];
        };
        const dfs = n => {
            state[n.id] = 1;
            kids(n).forEach(c => { if (!state[c.id]) dfs(c); });
            out.push(n);
        };
        const sorted = [...wf.nodes].sort((a, b) => pos(b, a));
        sorted.filter(n => !insOf(wf, n.id).length).forEach(n => { if (!state[n.id]) dfs(n); });
        sorted.forEach(n => { if (!state[n.id]) dfs(n); });
        return out.reverse();
    }

    /* ---------- health ---------- */
    function analyse(wf) {
        const items = [], byNode = {}, byEdge = {};
        const add = it => {
            items.push(it);
            if (it.level === 'warning') {
                if (it.nodeId) byNode[it.nodeId] = (byNode[it.nodeId] || 0) + 1;
                if (it.edgeId) byEdge[it.edgeId] = (byEdge[it.edgeId] || 0) + 1;
            }
        };
        const many = wf.nodes.length > 1;
        wf.nodes.forEach(n => {
            const ins = insOf(wf, n.id), outs = outsOf(wf, n.id), nm = nameOf(n);
            if (many && !ins.length && !outs.length) add({ level: 'warning', nodeId: n.id, text: `${nm} is not connected to anything.` });
            if (n.kind === 'prompt') {
                if (!n.text.trim()) add({ level: 'warning', nodeId: n.id, text: `${nm} has no prompt text yet.` });
                n.inputs.filter(i => i.required).forEach(i => {
                    if (ins.some(e => e.map.some(m => m.in === i.name))) return;
                    const pool = [];
                    ins.forEach(e => producedBy(wf, e.from).forEach(o => pool.push({ o, e })));
                    const used = new Set();
                    ins.forEach(e => e.map.forEach(m => used.add(`${e.id}|${m.out}`)));
                    const pick = pool.find(x => norm(x.o.name) === norm(i.name)) || pool.find(x => x.o.name === 'result' && !used.has(`${x.e.id}|result`));
                    const it = { level: 'warning', nodeId: n.id, text: `${nm} needs "${i.name}" but nothing is mapped to it.` };
                    if (pick) it.fix = { act: 'mapInput', nodeId: n.id, edgeId: pick.e.id, out: pick.o.name, input: i.name, label: `Map ${pick.o.name} to ${i.name}` };
                    else it.fix = { act: 'addInputNode', nodeId: n.id, input: i.name, label: `Add an Input node for ${i.name}` };
                    add(it);
                });
            }
            if (isCheck(n.kind)) {
                const word = n.kind === 'validation' ? 'validation checkpoint' : 'verification checkpoint';
                const fails = outs.filter(e => e.label === 'fail');
                if (!fails.length) add({ level: 'warning', nodeId: n.id, text: `${nm} has no failure path, so nothing happens when the ${word} fails.`, fix: { act: 'addRecovery', nodeId: n.id, label: 'Add a recovery step' } });
                else if (!fails.some(e => reaches(wf, e.to, 'recovery'))) add({ level: 'warning', nodeId: n.id, text: `The failure path from ${nm} never reaches a recovery step.`, fix: { act: 'addRecovery', nodeId: n.id, label: 'Add a recovery step' } });
                if (n.kind === 'validation' && !n.rules.length) add({ level: 'warning', nodeId: n.id, text: `${nm} has no rules to check.` });
                if (n.kind === 'verification' && !n.checklist.length) add({ level: 'warning', nodeId: n.id, text: `${nm} has an empty checklist.` });
                if (n.kind === 'verification' && n.performer === 'prompt' && !n.checker.trim()) add({ level: 'warning', nodeId: n.id, text: `${nm} is set to a second prompt but has no checking prompt.` });
            }
            if (n.kind === 'recovery') {
                if (n.strategy === 'fallback' && !n.fallback.trim()) add({ level: 'warning', nodeId: n.id, text: `${nm} uses a fallback prompt but none is written.` });
                if (n.strategy === 'retry' && !n.retryLimit) add({ level: 'warning', nodeId: n.id, text: `${nm} retries with no limit set.`, fix: { act: 'setRetry', nodeId: n.id, label: 'Set a limit of 2' } });
                if (!n.instruction.trim()) add({ level: 'info', nodeId: n.id, text: `${nm} does not say what to change on a retry.` });
            }
        });
        wf.edges.forEach(e => {
            const t = byId(wf, e.to), f = byId(wf, e.from);
            if (!t || !f) return;
            const src = producedBy(wf, e.from), ins = inputsOf(t);
            e.map.forEach(m => {
                const o = src.find(x => x.name === m.out), i = ins.find(x => x.name === m.in);
                if (!o) add({ level: 'warning', edgeId: e.id, nodeId: t.id, text: `${nameOf(t)} maps "${m.out}", which ${nameOf(f)} does not provide.` });
                else if (!i) add({ level: 'warning', edgeId: e.id, nodeId: t.id, text: `${nameOf(t)} has no input called "${m.in}" any more.` });
                else if (!typeOk(o.type, i.type)) add({ level: 'warning', edgeId: e.id, nodeId: t.id, text: `${m.out} is ${o.type} but ${m.in} expects ${i.type}.` });
            });
        });
        findCycles(wf).forEach(comp => {
            const nodes = comp.map(id => byId(wf, id)).filter(Boolean);
            if (nodes.some(n => n.retryLimit > 0)) return;
            const anchor = nodes.find(n => n.kind === 'recovery') || nodes.find(n => isCheck(n.kind));
            const it = { level: 'warning', nodeId: (anchor || nodes[0]).id, text: `A loop through ${nodes.map(nameOf).slice(0, 3).join(', ')}${nodes.length > 3 ? ' and more' : ''} has no retry limit.` };
            if (anchor) it.fix = { act: 'setRetry', nodeId: anchor.id, label: 'Set a limit of 3', value: 3 };
            add(it);
        });
        if (wf.nodes.length && !wf.nodes.some(n => n.kind === 'output')) add({ level: 'info', text: 'There is no Output node, so the workflow result is not defined.', fix: { act: 'addOutput', label: 'Add an Output node' } });
        const order = { warning: 0, info: 1 };
        items.sort((a, b) => order[a.level] - order[b.level]);
        return { items, byNode, byEdge, warnCount: items.filter(i => i.level === 'warning').length, infoCount: items.filter(i => i.level === 'info').length };
    }

    /* ---------- documentation ---------- */
    const STRATEGY = { retry: 'Retry with an edit', fallback: 'Use a fallback prompt', escalate: 'Escalate to a person' };
    const PASS = n => (n.pass === 'any' ? 'Any one rule passing is enough.' : n.pass === 'threshold' ? `At least ${n.threshold} of ${n.rules.length} rules must pass.` : 'Every rule must pass.');
    const fmtDate = t => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    function docModel(wf) {
        const order = orderNodes(wf);
        const stages = order.filter(n => ['prompt', 'validation', 'verification', 'recovery'].includes(n.kind));
        const numOf = {};
        stages.forEach((n, i) => { numOf[n.id] = i + 1; });
        const label = id => {
            const n = byId(wf, id);
            if (!n) return '';
            if (n.kind === 'input') return `workflow input ${n.name}`;
            return numOf[id] ? `Stage ${numOf[id]}, ${n.title}` : n.title;
        };
        const sourceOf = (n, input) => {
            for (const e of insOf(wf, n.id)) {
                const m = e.map.find(x => x.in === input);
                if (!m) continue;
                const o = producedBy(wf, e.from).find(x => x.name === m.out);
                const pid = o ? o.from : e.from;
                const pn = byId(wf, pid);
                return pn && pn.kind === 'input' ? `workflow input ${pn.name}` : `${label(pid)} (${m.out})`;
            }
            return null;
        };
        const contextFor = n => insOf(wf, n.id).map(e => byId(wf, e.from)).filter(x => x && x.kind === 'context');
        const compiled = n => {
            if (n.kind === 'prompt') {
                const parts = contextFor(n).map(c => `Context: ${c.title}\n${c.mode === 'reference' ? `Reference: ${c.ref}${c.text ? '\n' + c.text : ''}` : c.text}`.trim());
                parts.push(n.text.trim() || '(No prompt text written yet.)');
                return parts.join('\n\n');
            }
            if (n.kind === 'validation') {
                return [`Check the output of the previous stage against these rules.`, '', 'Rules:', ...(n.rules.length ? n.rules.map((r, i) => `${i + 1}. ${r}`) : ['(No rules written yet.)']), '', PASS(n), 'Reply with PASS or FAIL, then one line per rule saying why.'].join('\n');
            }
            if (n.kind === 'verification') {
                const list = n.checklist.length ? n.checklist.map((r, i) => `${i + 1}. ${r}`) : ['(No checklist written yet.)'];
                return n.performer === 'prompt'
                    ? [n.checker.trim() || '(No checking prompt written yet.)', '', 'Checklist:', ...list].join('\n')
                    : ['A person checks the output against this list.', '', ...list].join('\n');
            }
            if (n.kind === 'recovery') {
                return [`Strategy: ${STRATEGY[n.strategy]}.`, n.instruction.trim(), n.strategy === 'retry' ? `Retry up to ${n.retryLimit || 'a set number of'} times.` : '', n.strategy === 'fallback' ? `Fallback prompt:\n${n.fallback.trim() || '(Not written yet.)'}` : '', n.strategy === 'escalate' ? `Escalate to: ${n.escalate || '(not named yet)'}.` : ''].filter(Boolean).join('\n');
            }
            return '';
        };
        const rows = stages.map(n => {
            const row = { n, num: numOf[n.id], kind: KINDS[n.kind].label, title: n.title, inputs: [], outputs: [], checks: [], fail: [], text: compiled(n), context: [] };
            if (n.kind === 'prompt') {
                row.inputs = n.inputs.map(i => `${i.name} (${i.type}), ${sourceOf(n, i.name) ? 'from ' + sourceOf(n, i.name) : 'source not mapped'}`);
                row.outputs = n.outputs.map(o => `${o.name} (${o.type})`);
                row.context = contextFor(n).map(c => c.title);
                outsOf(wf, n.id).map(e => byId(wf, e.to)).filter(x => x && isCheck(x.kind)).forEach(c => {
                    row.checks.push(`Stage ${numOf[c.id]}, ${c.title}`);
                    outsOf(wf, c.id).filter(e => e.label === 'fail').forEach(e => recoveryReached(wf, e.to).forEach(r => { const t = `Stage ${numOf[r.id]}, ${r.title}`; if (!row.fail.includes(t)) row.fail.push(t); }));
                });
            } else if (isCheck(n.kind)) {
                const through = producedBy(wf, n.id).map(o => `${o.name} (${o.type})`);
                row.inputs = through.length ? through.map(t => `${t}, passes through`) : [];
                row.outputs = through;
                row.checks = n.kind === 'validation' ? [...n.rules, PASS(n)] : [`${n.performer === 'person' ? 'A person checks' : 'A second prompt checks'}:`, ...n.checklist];
                const fails = outsOf(wf, n.id).filter(e => e.label === 'fail');
                fails.forEach(e => {
                    const rec = recoveryReached(wf, e.to);
                    if (rec.length) rec.forEach(r => row.fail.push(`Stage ${numOf[r.id]}, ${r.title}`));
                    else { const t = byId(wf, e.to); if (t) row.fail.push(label(t.id) || t.title); }
                });
                if (n.retryLimit) row.fail.push(`Retry limit ${n.retryLimit}`);
            } else {
                row.fail = [STRATEGY[n.strategy], ...(n.instruction.trim() ? [n.instruction.trim()] : []), ...(n.retryLimit && n.strategy === 'retry' ? [`Retry limit ${n.retryLimit}`] : [])];
            }
            return row;
        });
        const inputs = order.filter(n => n.kind === 'input');
        const outputs = order.filter(n => n.kind === 'output');
        const contexts = order.filter(n => n.kind === 'context').map(c => ({ n: c, used: outsOf(wf, c.id).map(e => byId(wf, e.to)).filter(Boolean).map(t => label(t.id) || t.title) }));
        const checkCount = rows.filter(r => isCheck(r.n.kind)).length;
        const recCount = rows.filter(r => r.n.kind === 'recovery').length;
        return { wf, rows, inputs, outputs, contexts, checkCount, recCount, numOf, label };
    }

    // Documentation as plain blocks, drawn as Markdown or HTML by the two writers below.
    function docBlocks(wf) {
        const m = docModel(wf), b = [];
        const workStages = m.rows.filter(r => r.n.kind === 'prompt');
        const purpose = wf.purpose.trim() || (workStages.length
            ? `A reusable workflow of ${plural(workStages.length, 'prompt stage')}${m.inputs.length ? ' that takes ' + m.inputs.map(i => i.name).join(', ') : ''}${m.outputs.length ? ' and produces ' + m.outputs.map(o => o.name).join(', ') : ''}.`
            : 'No stages have been added yet.');
        b.push({ t: 'h1', x: wf.name });
        b.push({ t: 'meta', x: `${plural(workStages.length, 'prompt stage')}, ${plural(m.checkCount, 'check')}, ${plural(m.recCount, 'recovery step')}. Updated ${fmtDate(wf.updated)}.` });
        b.push({ t: 'h2', x: 'Purpose' }, { t: 'p', x: purpose });
        const steps = [];
        steps.push(m.inputs.length ? `Gather the workflow inputs: ${m.inputs.map(i => i.name).join(', ')}.` : 'This workflow needs no start inputs.');
        steps.push('Work through the stages in order. Copy each compiled prompt, fill in its variables as listed, and run it in the AI tool of your choice. Nothing runs inside this studio.');
        steps.push('At each check, test the output against its rules or checklist. If it passes, go to the next stage.');
        steps.push('If a check fails, follow the recovery step for that stage, and stop at its retry limit.');
        steps.push(m.outputs.length ? `Collect the workflow output: ${m.outputs.map(o => o.name).join(', ')}.` : 'Collect the final stage output as the result.');
        b.push({ t: 'h2', x: 'How to run it' }, { t: 'ol', x: steps });
        if (m.inputs.length) b.push({ t: 'h2', x: 'Workflow inputs' }, { t: 'table', head: ['Name', 'Type', 'Description', 'Example'], rows: m.inputs.map(i => [i.name, i.type, i.description || 'None given', i.example || 'None given']) });
        if (m.contexts.length) b.push({ t: 'h2', x: 'Context' }, { t: 'table', head: ['Context', 'What it holds', 'Used by'], rows: m.contexts.map(c => [c.n.title, c.n.mode === 'reference' ? `Reference: ${c.n.ref || 'not set'}` : (c.n.text.trim().slice(0, 140) || 'Empty'), c.used.length ? c.used : ['Nothing yet']]) });
        if (m.rows.length) {
            b.push({ t: 'h2', x: 'Stage by stage' }, {
                t: 'table', head: ['Stage', 'Type', 'Inputs', 'Outputs', 'Checks', 'If it fails'],
                rows: m.rows.map(r => [`${r.num}. ${r.title}`, r.kind, r.inputs.length ? r.inputs : ['None'], r.outputs.length ? r.outputs : ['None'], r.checks.length ? r.checks : ['None'], r.fail.length ? r.fail : ['None']])
            });
            b.push({ t: 'h2', x: 'Compiled prompt text per stage' });
            m.rows.forEach(r => {
                b.push({ t: 'h3', x: `Stage ${r.num}: ${r.title}` });
                const meta = [r.kind];
                if (r.context.length) meta.push(`Context: ${r.context.join(', ')}`);
                b.push({ t: 'meta', x: meta.join('. ') + '.' });
                b.push({ t: 'code', x: r.text || '(Nothing to show.)' });
            });
        }
        if (m.outputs.length) b.push({ t: 'h2', x: 'Workflow output' }, { t: 'table', head: ['Name', 'Type', 'Description', 'Comes from'], rows: m.outputs.map(o => [o.name, o.type, o.description || 'None given', insOf(wf, o.id).map(e => { const mp = e.map.find(x => x.in === o.name); return mp ? `${m.label(e.from)} (${mp.out})` : m.label(e.from); }).join('; ') || 'Not connected']) });
        const run = [];
        if (m.inputs.length) run.push(`Have these ready: ${m.inputs.map(i => i.name).join(', ')}.`);
        m.rows.forEach(r => {
            if (r.n.kind === 'prompt') run.push(`Run Stage ${r.num}: ${r.title}.${r.n.inputs.length ? ' Fill in ' + r.n.inputs.map(i => i.name).join(', ') + '.' : ''}`);
            else if (r.n.kind === 'recovery') run.push(`If a check fails, follow Stage ${r.num}: ${r.title} (${STRATEGY[r.n.strategy].toLowerCase()}).`);
            else r.checks.filter((x, i) => !(r.n.kind === 'validation' && i === r.checks.length - 1)).forEach(c => { if (!/:$/.test(c)) run.push(`Stage ${r.num} check: ${c}`); });
        });
        run.push(m.outputs.length ? `Confirm the output: ${m.outputs.map(o => o.name).join(', ')}.` : 'Confirm the final output is usable.');
        b.push({ t: 'h2', x: 'Run checklist' }, { t: 'check', x: run });
        return b;
    }
    const mdCell = v => (Array.isArray(v) ? v.join('<br>') : String(v)).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
    function docMarkdown(wf) {
        return docBlocks(wf).map(b => {
            switch (b.t) {
                case 'h1': return `# ${b.x}\n`;
                case 'h2': return `\n## ${b.x}\n`;
                case 'h3': return `\n### ${b.x}\n`;
                case 'meta': case 'p': return `${b.x}\n`;
                case 'ol': return b.x.map((x, i) => `${i + 1}. ${x}`).join('\n') + '\n';
                case 'check': return b.x.map(x => `- [ ] ${x}`).join('\n') + '\n';
                case 'table': return `| ${b.head.join(' | ')} |\n| ${b.head.map(() => '---').join(' | ')} |\n` + b.rows.map(r => `| ${r.map(mdCell).join(' | ')} |`).join('\n') + '\n';
                case 'code': { let f = '```'; while (b.x.includes(f)) f += '`'; return `${f}text\n${b.x}\n${f}\n`; }
                default: return '';
            }
        }).join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
    }
    const htmlCell = v => (Array.isArray(v) ? v.map(esc).join('<br>') : esc(v));
    function docHtmlBody(wf) {
        return docBlocks(wf).map(b => {
            switch (b.t) {
                case 'h1': return `<h1>${esc(b.x)}</h1>`;
                case 'h2': return `<h2>${esc(b.x)}</h2>`;
                case 'h3': return `<h3>${esc(b.x)}</h3>`;
                case 'meta': return `<p class="meta">${esc(b.x)}</p>`;
                case 'p': return `<p>${esc(b.x)}</p>`;
                case 'ol': return `<ol>${b.x.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`;
                case 'check': return `<ul class="checks">${b.x.map(x => `<li><span class="box" aria-hidden="true"></span><span>${esc(x)}</span></li>`).join('')}</ul>`;
                case 'table': return `<div class="scroll"><table><thead><tr>${b.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${htmlCell(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
                case 'code': return `<pre>${esc(b.x)}</pre>`;
                default: return '';
            }
        }).join('\n');
    }
    // A single file with its own styles and no external requests.
    const EXPORT_CSS = `:root{color-scheme:light dark;--bg:oklch(97% 0.006 70);--ink:oklch(20% 0.03 260);--ink2:oklch(40% 0.02 260);--line:oklch(86% 0.012 70);--wash:oklch(94% 0.01 70);--accent:oklch(38% 0.14 190)}
@media (prefers-color-scheme:dark){:root{--bg:oklch(18% 0.012 70);--ink:oklch(93% 0.012 260);--ink2:oklch(74% 0.012 260);--line:oklch(32% 0.014 70);--wash:oklch(23% 0.014 70);--accent:oklch(74% 0.13 190)}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:980px;margin:0 auto;padding:32px 20px 64px}h1{font:600 2rem/1.2 Georgia,"Iowan Old Style",serif;margin:0 0 4px}
h2{font-size:.78rem;letter-spacing:.07em;text-transform:uppercase;color:var(--ink2);margin:40px 0 12px;border-bottom:1px solid var(--line);padding-bottom:6px}h3{font-size:1.05rem;margin:24px 0 4px}
.meta{color:var(--ink2);font-size:.9rem;margin:2px 0 8px}.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:.9rem}
th,td{text-align:left;vertical-align:top;border:1px solid var(--line);padding:8px 10px}th{background:var(--wash);font-size:.8rem}
pre{background:var(--wash);border:1px solid var(--line);border-radius:8px;padding:12px 14px;white-space:pre-wrap;word-break:break-word;font:.85rem/1.55 ui-monospace,Menlo,Consolas,monospace;margin:8px 0}
.checks{list-style:none;padding:0}.checks li{display:flex;gap:10px;padding:5px 0}.box{flex:none;width:16px;height:16px;margin-top:4px;border:1.5px solid var(--ink2);border-radius:4px}
@media print{body{background:white;color:black}}`;
    function docHtml(wf) {
        return `<!doctype html>\n<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(wf.name)}</title><style>${EXPORT_CSS}</style></head><body><main>\n${docHtmlBody(wf)}\n</main></body></html>\n`;
    }

    /* ---------- layout and generation ---------- */
    // Layered left to right layout: a column per step of depth, columns centred on each other.
    function layoutWorkflow(wf, heightOf) {
        if (!wf.nodes.length) return;
        const all = orderNodes(wf), idx = {}, layer = {};
        // Recovery steps that only receive fail paths sit in their own row below the chain.
        const lane = all.filter(n => n.kind === 'recovery' && insOf(wf, n.id).length && insOf(wf, n.id).every(e => e.label === 'fail'));
        const order = all.filter(n => !lane.includes(n));
        if (!order.length) return;
        order.forEach((n, i) => { idx[n.id] = i; layer[n.id] = 0; });
        order.forEach(n => outsOf(wf, n.id).forEach(e => { if (idx[e.to] > idx[n.id]) layer[e.to] = Math.max(layer[e.to], layer[n.id] + 1); }));
        // Sources sit one column before what they feed.
        wf.nodes.filter(n => (n.kind === 'context' || n.kind === 'input') && !insOf(wf, n.id).length).forEach(n => {
            const ls = outsOf(wf, n.id).filter(e => idx[e.to] > idx[n.id]).map(e => layer[e.to]);
            if (ls.length) layer[n.id] = Math.max(0, Math.min(...ls) - 1);
        });
        const cols = {};
        order.forEach(n => { (cols[layer[n.id]] = cols[layer[n.id]] || []).push(n); });
        const keys = Object.keys(cols).map(Number).sort((a, b) => a - b);
        const GAP_X = 64, GAP_Y = 32, TOP = 48;
        const totals = keys.map(k => cols[k].reduce((t, n) => t + heightOf(n) + GAP_Y, -GAP_Y));
        const tallest = Math.max(...totals);
        const centre = {};
        keys.forEach((k, ki) => {
            const list = cols[k];
            const mean = n => {
                const ys = insOf(wf, n.id).map(e => centre[e.from]).filter(v => v !== undefined);
                return (ys.length ? ys.reduce((p, c) => p + c, 0) / ys.length : 1e6) + (n.kind === 'recovery' ? 0.5 : 0);
            };
            if (ki) list.sort((a, b) => mean(a) - mean(b)); else list.sort(pos);
            let y = TOP + (tallest - totals[ki]) / 2;
            list.forEach(n => {
                const h = heightOf(n);
                n.x = 48 + ki * (NODE_W + GAP_X);
                n.y = snap(y);
                centre[n.id] = y + h / 2;
                y += h + GAP_Y;
            });
        });
        let bottom = Math.max(...order.map(n => n.y + heightOf(n)));
        let nextX = -Infinity;
        // One column to the right of its rightmost source, so every fail path runs forward and down.
        lane.map(n => ({ n, x: Math.max(...insOf(wf, n.id).map(e => byId(wf, e.from)).filter(Boolean).map(c => c.x)) + NODE_W + GAP_X })).sort((a, b) => a.x - b.x).forEach(({ n, x }) => {
            n.x = snap(Math.max(x, nextX));
            n.y = snap(bottom + 88);
            nextX = n.x + NODE_W + 48;
        });
    }

    // Builds a whole workflow from an ordered list of library prompts. Nothing is saved here.
    function generateWorkflow(list, opts) {
        const wf = newWorkflow();
        const add = n => { wf.nodes.push(n); return n; };
        const link = (a, b, label) => {
            const e = { id: rid('e'), from: a.id, to: b.id, label, map: [] };
            wf.edges.push(e);
            autoMap(wf, e);
            return e;
        };
        let tail = null, tailLabel = 'always';
        const checks = [];
        list.forEach((p, i) => {
            const st = add(blankNode('prompt'));
            st.title = s(p.title, 120).trim() || `Stage ${i + 1}`;
            st.source = 'library';
            st.promptId = Number.isFinite(Number(p.id)) ? Number(p.id) : null;
            st.text = s(p.content, 40000);
            st.inputs = detectVars(st.text).slice(0, 30).map(name => ({ name, type: guessType(name, p.variable_meta), required: true }));
            const outs = detectOutputs(st.text).slice(0, 10);
            st.outputs = outs.length ? outs.map(name => ({ name, type: guessType(name) })) : [{ name: 'result', type: 'text' }];
            if (i === 0) {
                st.inputs.forEach(inp => {
                    const n = add(blankNode('input'));
                    n.title = inp.name;
                    n.name = inp.name;
                    n.type = inp.type;
                    link(n, st, 'always');
                });
            } else link(tail, st, tailLabel);
            if (opts.validation) {
                const v = add(blankNode('validation'));
                v.title = `Check ${st.title}`.slice(0, 70);
                v.rules = [
                    `The output is complete and does what "${st.title}" asks.`,
                    outs.length ? `The output includes ${outs.join(', ')}.` : (i === list.length - 1 ? 'The output is ready to hand over as the workflow result.' : 'The output can be used as the input of the next stage.'),
                    'No placeholders or variables are left unfilled.'
                ];
                link(st, v, 'always');
                checks.push(v);
                tail = v;
                tailLabel = 'pass';
            } else { tail = st; tailLabel = 'always'; }
        });
        const last = wf.nodes.filter(n => n.kind === 'prompt').pop();
        const out = add(blankNode('output'));
        out.name = last.outputs[0].name;
        out.type = last.outputs[0].type;
        link(tail, out, tailLabel);
        if (opts.validation && opts.recovery && checks.length) {
            const r = add(blankNode('recovery'));
            r.title = 'Recovery step';
            r.strategy = 'retry';
            r.retryLimit = 2;
            r.instruction = 'Run the failing stage again with a corrected prompt that names what the check found wrong. If it still fails at the retry limit, hand the stage to a person.';
            checks.forEach(v => link(v, r, 'fail'));
        }
        const titles = list.map(p => s(p.title, 80).trim() || 'Untitled prompt');
        wf.name = (titles.length === 1 ? `${titles[0]} workflow` : titles.slice(0, 3).join(' then ') + (titles.length > 3 ? ' and more' : '')).slice(0, 100);
        wf.purpose = `Runs ${plural(list.length, 'library prompt')} in order: ${titles.join(', ')}.`;
        layoutWorkflow(wf, n => (n.kind === 'prompt' ? 150 : 112));
        return wf;
    }

    /* ---------- markup ---------- */
    const MARKUP = `
<div class="ws-header pws-header">
  <div class="ws-header-left">
    ${ms('conversion_path', 'ws-header-icon')}
    <div>
      <h2 class="ws-title">Prompt Workflow Studio</h2>
      <p class="ws-subtitle">Turn a collection of prompts into a documented, reusable workflow</p>
    </div>
  </div>
  <div class="ws-header-actions pws-header-actions">
    <input id="pws-name" class="form-input pws-name-input" aria-label="Workflow name" placeholder="Untitled workflow" autocomplete="off" maxlength="120">
    <span class="pws-save pws-mono" id="pws-save">Saved</span>
    <details class="pws-menu" id="pws-export-menu">
      <summary class="btn" aria-label="Export and import">${ms('ios_share')}<span class="pws-btn-label">Export</span>${ms('expand_more')}</summary>
      <div class="pws-menu-list" role="menu">
        <button class="pws-menu-item" role="menuitem" data-act="exportMd">${ms('markdown')}<span>Documentation as Markdown</span></button>
        <button class="pws-menu-item" role="menuitem" data-act="exportHtml">${ms('html')}<span>Documentation as a web page</span></button>
        <button class="pws-menu-item" role="menuitem" data-act="exportJson">${ms('data_object')}<span>Workflow as JSON</span></button>
        <div class="pws-menu-sep"></div>
        <button class="pws-menu-item" role="menuitem" data-act="importJson">${ms('upload')}<span>Import a workflow (JSON)</span></button>
      </div>
    </details>
    <button class="icon-btn" data-act="close" aria-label="Close Prompt Workflow Studio">${ms('close')}</button>
  </div>
</div>
<div class="pws-mobilebar">
  <button class="pws-mobile-wf" data-act="openRail" aria-label="Choose a workflow">${ms('folder_open')}<span class="pws-mobile-name" id="pws-mobile-name"></span>${ms('expand_more')}</button>
  <span class="pws-badge" id="pws-badge-mobile" data-act="tabHealth" role="button" tabindex="0"></span>
</div>
<div class="ws-body pws-body">
  <aside class="pws-rail" id="pws-rail" aria-label="Saved workflows">
    <div class="pws-rail-head">
      <span class="pws-label">Workflows <span class="pws-mono pws-count" id="pws-wf-count"></span></span>
      <span class="pws-rail-tools">
        <button class="btn btn-accent pws-btn-sm" data-act="newWf">${ms('add')}<span>New</span></button>
        <button class="icon-btn pws-sheet-close" data-act="closeRail" aria-label="Close the workflow list">${ms('close')}</button>
      </span>
    </div>
    <ul class="pws-wf-list" id="pws-wf-list"></ul>
  </aside>
  <div class="pws-main">
    <div class="pws-tabbar">
      <button class="icon-btn pws-rail-toggle" data-act="toggleRail" id="pws-rail-toggle" aria-controls="pws-rail" aria-expanded="true" aria-label="Hide the workflow list">${ms('left_panel_close')}</button>
      <div class="pws-tabs" role="tablist" aria-label="Workspace views" id="pws-tabs">
        <button class="pws-tab pws-tab-m" role="tab" id="pws-tab-stages" aria-controls="pws-pane-stages" data-tab="stages">Stages <small class="pws-mono" id="pws-count-stages"></small></button>
        <button class="pws-tab" role="tab" id="pws-tab-canvas" aria-controls="pws-pane-canvas" data-tab="canvas">Canvas</button>
        <button class="pws-tab" role="tab" id="pws-tab-docs" aria-controls="pws-pane-docs" data-tab="docs">Documentation</button>
        <button class="pws-tab pws-tab-m" role="tab" id="pws-tab-health" aria-controls="pws-pane-health" data-tab="health">Health <small class="pws-mono" id="pws-count-health"></small></button>
      </div>
      <span class="pws-badge pws-badge-desktop" id="pws-badge" data-act="tabHealth" role="button" tabindex="0"></span>
    </div>

    <section class="pws-pane pws-pane-stages" id="pws-pane-stages" role="tabpanel" aria-labelledby="pws-tab-stages">
      <div class="pws-stages-tools">
        <label class="pws-addsel"><span class="pws-label">Add a stage</span>
          <select class="form-input" id="pws-add-select" aria-label="Add a stage">
            <option value="">Choose a type</option>
            ${KIND_ORDER.map(k => `<option value="${k}">${KINDS[k].label}</option>`).join('')}
          </select>
        </label>
        <button class="btn btn-accent" data-act="fromPrompts">${ms('auto_awesome')}<span>From prompts</span></button>
      </div>
      <ol class="pws-stage-list" id="pws-stage-list"></ol>
    </section>

    <section class="pws-pane pws-pane-canvas" id="pws-pane-canvas" role="tabpanel" aria-labelledby="pws-tab-canvas">
      <div class="pws-canvas" id="pws-canvas" role="region" aria-label="Workflow canvas. Arrow keys move the focused stage, Delete removes it." tabindex="0">
        <div id="pws-viewport">
          <svg id="pws-grid" aria-hidden="true"><defs><pattern id="pws-dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1"></circle></pattern></defs><rect x="-12000" y="-12000" width="24000" height="24000" fill="url(#pws-dots)"></rect></svg>
          <div id="pws-nodes"></div>
          <svg id="pws-wires" aria-hidden="false" role="group" aria-label="Connections">
            <defs>
              ${['always', 'pass', 'fail', 'sel'].map(k => `<marker id="pws-arr-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 1 L10 5 L0 9 z"></path></marker>`).join('')}
            </defs>
            <g id="pws-wire-layer"></g>
            <path id="pws-temp" d="" hidden></path>
          </svg>
        </div>
        <div class="pws-float pws-float-tl">
          <details class="pws-menu pws-add-menu" id="pws-add-menu">
            <summary class="btn btn-accent">${ms('add')}<span>Add</span></summary>
            <div class="pws-menu-list pws-menu-left" role="menu">
              <button class="pws-menu-item" role="menuitem" data-add="prompt-lib">${ms('library_books')}<span>Prompt from the library</span></button>
              ${KIND_ORDER.map(k => `<button class="pws-menu-item" role="menuitem" data-add="${k}">${ms(KINDS[k].icon)}<span>${k === 'prompt' ? 'Prompt, typed' : KINDS[k].label}</span></button>`).join('')}
            </div>
          </details>
          <button class="btn" data-act="fromPrompts">${ms('auto_awesome')}<span>From prompts</span></button>
          <button class="btn" data-act="tidy" title="Lay the stages out left to right">${ms('auto_awesome_mosaic')}<span class="pws-btn-label">Tidy</span></button>
        </div>
        <div class="pws-float pws-float-bl" aria-hidden="true"><span>Stages <b class="pws-mono" id="pws-stat-nodes">0</b></span><span>Links <b class="pws-mono" id="pws-stat-edges">0</b></span></div>
        <div class="pws-float pws-float-br">
          <button class="icon-btn" data-act="zoomOut" aria-label="Zoom out">${ms('remove')}</button>
          <span class="pws-mono" id="pws-zoom" aria-live="off">100%</span>
          <button class="icon-btn" data-act="zoomIn" aria-label="Zoom in">${ms('add')}</button>
          <button class="btn btn-ghost pws-btn-sm" data-act="fit">Fit</button>
        </div>
        <div class="pws-empty" id="pws-empty" hidden>
          <span class="pws-empty-icon">${ms('conversion_path')}</span>
          <b>Start with your prompts</b>
          <p>Pick several prompts from your library and the studio lays out a workflow with inputs, checks and a recovery step. Or add stages one at a time.</p>
          <span class="pws-empty-actions"><button class="btn btn-accent" data-act="fromPrompts">${ms('auto_awesome')}<span>From prompts</span></button><button class="btn" data-add="prompt-lib">${ms('library_books')}<span>Add a library prompt</span></button></span>
        </div>
      </div>
    </section>

    <section class="pws-pane pws-pane-docs" id="pws-pane-docs" role="tabpanel" aria-labelledby="pws-tab-docs">
      <div class="pws-doc-tools">
        <span class="pws-label">Live documentation</span>
        <span class="pws-doc-actions">
          <button class="btn pws-btn-sm" data-act="copyMd">${ms('content_copy')}<span>Copy Markdown</span></button>
          <button class="btn pws-btn-sm" data-act="exportMd">${ms('download')}<span>Markdown</span></button>
          <button class="btn pws-btn-sm" data-act="exportHtml">${ms('download')}<span>Web page</span></button>
        </span>
      </div>
      <div class="pws-doc-scroll"><article class="pws-doc" id="pws-doc" aria-label="Workflow documentation"></article></div>
    </section>

    <section class="pws-pane pws-pane-health" id="pws-pane-health" role="tabpanel" aria-labelledby="pws-tab-health">
      <div class="pws-health-host" data-health-host></div>
    </section>
  </div>

  <aside class="pws-side" id="pws-side" aria-label="Details">
    <div class="pws-side-tabs" role="tablist" aria-label="Panel" id="pws-side-tabs">
      <button class="pws-tab" role="tab" id="pws-rtab-inspect" data-rtab="inspect" aria-controls="pws-inspector">Inspector</button>
      <button class="pws-tab" role="tab" id="pws-rtab-health" data-rtab="health" aria-controls="pws-health-side">Health <small class="pws-mono" id="pws-count-health-side"></small></button>
    </div>
    <div class="pws-side-panel" id="pws-inspector" role="tabpanel" aria-labelledby="pws-rtab-inspect"></div>
    <div class="pws-side-panel" id="pws-health-side" role="tabpanel" aria-labelledby="pws-rtab-health" hidden><div class="pws-health-host" data-health-host></div></div>
  </aside>
  <div class="pws-backdrop" id="pws-backdrop" data-act="closeSheets"></div>
</div>

<dialog class="pws-dialog pws-dialog-wide" id="pws-pick-dialog" aria-labelledby="pws-pick-title" aria-modal="true">
  <div class="pws-dlg-head"><span class="pws-dlg-title" id="pws-pick-title">Choose a prompt</span><button class="icon-btn" data-close aria-label="Close">${ms('close')}</button></div>
  <div class="pws-dlg-body pws-pick-body" id="pws-pick-body">
    <div class="pws-pick-left">
      <input class="form-input" id="pws-pick-search" type="search" placeholder="Search the library" aria-label="Search the library" autocomplete="off">
      <p class="pws-pick-status pws-mono" id="pws-pick-status" role="status"></p>
      <div class="pws-pick-list" id="pws-pick-list"></div>
    </div>
    <div class="pws-pick-right" id="pws-pick-right">
      <span class="pws-label">Workflow order <span class="pws-mono pws-count" id="pws-pick-count">0</span></span>
      <ol class="pws-pick-order" id="pws-pick-order"></ol>
      <div class="pws-pick-opts">
        <label class="pws-check"><input type="checkbox" id="pws-opt-val" checked><span>Add a validation checkpoint after each stage</span></label>
        <label class="pws-check"><input type="checkbox" id="pws-opt-rec" checked><span>Add one recovery step at the end</span></label>
      </div>
    </div>
  </div>
  <div class="pws-dlg-foot"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-accent" id="pws-pick-go" disabled>${ms('auto_awesome')}<span>Generate workflow</span></button></div>
</dialog>

<dialog class="pws-dialog" id="pws-text-dialog" aria-labelledby="pws-text-title" aria-modal="true">
  <div class="pws-dlg-head"><span class="pws-dlg-title" id="pws-text-title"></span><button class="icon-btn" data-close aria-label="Close">${ms('close')}</button></div>
  <div class="pws-dlg-body">
    <p id="pws-text-desc"></p>
    <input class="form-input" id="pws-text-input" aria-label="Name" autocomplete="off" maxlength="120">
    <textarea class="form-textarea pws-mono" id="pws-text-area" rows="12" spellcheck="false" aria-label="Workflow JSON"></textarea>
    <p class="pws-error" id="pws-text-error" role="alert" hidden></p>
  </div>
  <input type="file" id="pws-text-file" accept=".json,application/json" hidden>
  <div class="pws-dlg-foot"><button class="btn pws-push-left" id="pws-text-pick">Choose a file</button><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-accent" id="pws-text-go">OK</button></div>
</dialog>

<dialog class="pws-dialog" id="pws-confirm-dialog" aria-labelledby="pws-confirm-title" aria-modal="true">
  <div class="pws-dlg-head"><span class="pws-dlg-title" id="pws-confirm-title"></span></div>
  <div class="pws-dlg-body"><p id="pws-confirm-body"></p></div>
  <div class="pws-dlg-foot"><button class="btn btn-ghost" data-close id="pws-confirm-no">Keep it</button><button class="btn btn-danger" id="pws-confirm-yes">Delete</button></div>
</dialog>`;

    let api = null;

    function mount(root) {
        root.innerHTML = MARKUP;
        const $ = (sel, r = root) => r.querySelector(sel);
        const $$ = (sel, r = root) => [...r.querySelectorAll(sel)];
        const isOpen = () => root.classList.contains('open');
        const mq = window.matchMedia('(max-width: 820px)');
        const isMobile = () => mq.matches;
        const els = { canvas: $('#pws-canvas'), viewport: $('#pws-viewport'), nodes: $('#pws-nodes'), wires: $('#pws-wire-layer'), temp: $('#pws-temp'), side: $('#pws-side'), inspector: $('#pws-inspector'), rail: $('#pws-rail') };

        /* ---------- state and storage ---------- */
        const store = { activeId: null, workflows: [] };
        const S = { sel: null, tab: 'canvas', rtab: 'inspect', health: null, docStale: true, railOpen: true };
        try {
            const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
            if (raw && Array.isArray(raw.workflows)) {
                store.workflows = raw.workflows.map(cleanWorkflow).filter(Boolean).slice(0, 100);
                store.activeId = raw.activeId;
            }
        } catch (e) { /* unreadable storage starts clean */ }
        if (!store.workflows.length) store.workflows.push(newWorkflow());
        if (!store.workflows.some(w => w.id === store.activeId)) store.activeId = store.workflows[0].id;
        const wf = () => store.workflows.find(w => w.id === store.activeId);
        const node = id => wf().nodes.find(n => n.id === id);
        const edge = id => wf().edges.find(e => e.id === id);
        const nodeEl = id => $(`#pws-node-${CSS.escape(id)}`);
        S.health = analyse(wf());

        let saveT = 0, saveWarned = false;
        const setSave = t => { $('#pws-save').textContent = t; };
        function flush() {
            clearTimeout(saveT);
            saveT = 0;
            try {
                localStorage.setItem(STORE, JSON.stringify({ v: VERSION, activeId: store.activeId, workflows: store.workflows }));
                setSave('Saved');
                saveWarned = false;
            } catch (e) {
                setSave('Not saved');
                if (!saveWarned) { saveWarned = true; toast('This browser would not save the workflow. Export it as JSON to keep a copy.', 'error'); }
            }
        }
        function changed(touch = true) {
            if (touch) wf().updated = Date.now();
            setSave('Saving');
            clearTimeout(saveT);
            saveT = setTimeout(flush, 300);
        }

        /* ---------- rendering ---------- */
        const clip = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
        const kindStyle = k => `--pws-k:var(${KINDS[k].c});--pws-ks:var(${KINDS[k].soft})`;
        const unmapped = n => (n.kind === 'prompt' ? n.inputs.filter(i => i.required && !insOf(wf(), n.id).some(e => e.map.some(m => m.in === i.name))).map(i => i.name) : []);
        const passShort = n => (n.pass === 'any' ? 'any one passes' : n.pass === 'threshold' ? `at least ${n.threshold} pass` : 'all must pass');

        function nodeBody(n) {
            if (n.kind === 'prompt') {
                const miss = new Set(unmapped(n));
                const ins = n.inputs.length ? n.inputs.map(i => `<span${miss.has(i.name) ? ' class="pws-miss" title="Nothing is mapped to this input"' : ''}>${esc(i.name)}</span>`).join(', ') : 'none';
                return `<p class="pws-node-text">${esc(clip(n.text, 120) || 'No prompt text yet')}</p>
                    <div class="pws-io"><span class="pws-io-k">In</span><span class="pws-io-v pws-mono">${ins}</span></div>
                    <div class="pws-io"><span class="pws-io-k">Out</span><span class="pws-io-v pws-mono">${esc(n.outputs.map(o => o.name).join(', ') || 'none')}</span></div>`;
            }
            if (n.kind === 'context') return `<p class="pws-node-text">${esc(n.mode === 'reference' ? clip(n.ref, 100) || 'No reference yet' : clip(n.text, 120) || 'No context yet')}</p>`;
            if (n.kind === 'validation') return `<p class="pws-node-text"><b class="pws-mono">${n.rules.length}</b> ${n.rules.length === 1 ? 'rule' : 'rules'}, ${passShort(n)}</p>${n.retryLimit ? `<div class="pws-io"><span class="pws-io-k">Limit</span><span class="pws-io-v pws-mono">${n.retryLimit}</span></div>` : ''}`;
            if (n.kind === 'verification') return `<p class="pws-node-text">${n.performer === 'person' ? 'A person checks' : 'A second prompt checks'}, <b class="pws-mono">${n.checklist.length}</b> ${n.checklist.length === 1 ? 'item' : 'items'}</p>`;
            if (n.kind === 'recovery') return `<p class="pws-node-text">${esc(STRATEGY[n.strategy])}</p>${n.retryLimit ? `<div class="pws-io"><span class="pws-io-k">Limit</span><span class="pws-io-v pws-mono">${n.retryLimit}</span></div>` : ''}`;
            return `<div class="pws-io"><span class="pws-io-k">${n.kind === 'input' ? 'Var' : 'Out'}</span><span class="pws-io-v pws-mono">${esc(n.name)}</span><span class="pws-type pws-mono">${esc(n.type)}</span></div>${n.description ? `<p class="pws-node-text">${esc(clip(n.description, 90))}</p>` : ''}`;
        }
        function nodeHtml(n) {
            const k = KINDS[n.kind];
            const flags = S.health.byNode[n.id] || 0;
            const hasIn = n.kind !== 'input' && n.kind !== 'context';
            let outs = '';
            if (isCheck(n.kind)) outs = `<div class="pws-outs"><div class="pws-outrow"><span>Pass</span><span class="pws-port pws-port-out" data-dir="out" data-label="pass" title="Drag to connect the pass path"></span></div><div class="pws-outrow"><span>Fail</span><span class="pws-port pws-port-out" data-dir="out" data-label="fail" title="Drag to connect the fail path"></span></div></div>`;
            else if (n.kind !== 'output') outs = `<span class="pws-port pws-port-out pws-port-top" data-dir="out" data-label="always" title="Drag to connect"></span>`;
            const label = `${k.label}: ${nameOf(n)}${flags ? `. ${plural(flags, 'problem')}` : ''}`;
            return `<div class="pws-node" id="pws-node-${n.id}" data-id="${n.id}" data-kind="${n.kind}" tabindex="0" role="group" aria-roledescription="workflow stage" aria-label="${esc(label)}" ${S.sel && S.sel.t === 'node' && S.sel.id === n.id ? 'data-selected' : ''} style="left:${n.x}px;top:${n.y}px;${kindStyle(n.kind)}">
                ${hasIn ? `<span class="pws-port pws-port-in pws-port-top" data-dir="in" aria-hidden="true"></span>` : ''}
                <div class="pws-node-head">
                    <span class="pws-kglyph">${ms(k.icon)}</span>
                    <div class="pws-node-meta"><span class="pws-klabel">${k.label}</span><span class="pws-node-title">${esc(nameOf(n))}</span></div>
                    ${flags ? `<span class="pws-flag pws-mono" title="${plural(flags, 'problem')}">${flags}</span>` : ''}
                </div>
                <div class="pws-node-body">${nodeBody(n)}</div>
                ${outs}
            </div>`;
        }
        function renderNodes() {
            const a = document.activeElement;
            const keep = a && root.contains(a) && a.classList.contains('pws-node') ? a.dataset.id : null;
            els.nodes.innerHTML = [...wf().nodes].sort((a, b) => Math.round(a.x / 120) - Math.round(b.x / 120) || a.y - b.y || a.x - b.x).map(nodeHtml).join('');
            if (keep) { const el = nodeEl(keep); if (el) el.focus({ preventScroll: true }); }
            $('#pws-empty').hidden = wf().nodes.length > 0;
            $('#pws-stat-nodes').textContent = wf().nodes.length;
            $('#pws-stat-edges').textContent = wf().edges.length;
        }

        // Port positions come from layout offsets, so they ignore zoom.
        function portPoint(id, dir, label) {
            const n = node(id), el = nodeEl(id);
            if (!n) return null;
            const w = el && el.offsetWidth ? el.offsetWidth : NODE_W;
            const fallback = { x: n.x + (dir === 'out' ? w : 0), y: n.y + 24 };
            if (!el || !el.offsetParent) return fallback;
            let p = null;
            if (dir === 'out') p = el.querySelector(`.pws-port[data-dir="out"][data-label="${label}"]`) || el.querySelector('.pws-port[data-dir="out"]');
            else p = el.querySelector('.pws-port[data-dir="in"]');
            if (!p) return fallback;
            let x = 0, y = 0, cur = p;
            while (cur && cur !== el) { x += cur.offsetLeft; y += cur.offsetTop; cur = cur.offsetParent; }
            return { x: n.x + x + p.offsetWidth / 2, y: n.y + y + p.offsetHeight / 2 };
        }
        const curve = (a, b) => {
            const dx = Math.max(Math.abs(b.x - a.x) * 0.5, 56);
            return `M${a.x} ${a.y} C${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
        };
        function renderWires() {
            const a = document.activeElement;
            const keep = a && root.contains(a) && a.classList.contains('pws-edge') ? a.dataset.edge : null;
            els.wires.innerHTML = wf().edges.map(e => {
                const p = portPoint(e.from, 'out', e.label), q = portPoint(e.to, 'in');
                if (!p || !q) return '';
                const d = curve(p, q);
                const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
                const w = e.label.length * 6.6 + 16;
                const sel = S.sel && S.sel.t === 'edge' && S.sel.id === e.id;
                const bad = S.health.byEdge[e.id];
                const from = node(e.from), to = node(e.to);
                const lab = `Connection from ${nameOf(from)} to ${nameOf(to)}, ${e.label}${bad ? `, ${plural(bad, 'problem')}` : ''}`;
                return `<g class="pws-edge" data-edge="${e.id}" data-label="${e.label}" ${sel ? 'data-selected' : ''} ${bad ? 'data-bad' : ''} tabindex="0" role="button" aria-label="${esc(lab)}">
                    <path class="pws-edge-hit" d="${d}"/>
                    <path class="pws-edge-line" d="${d}" marker-end="url(#pws-arr-${sel ? 'sel' : e.label})"/>
                    <g class="pws-edge-tag" transform="translate(${mx} ${my})"><rect x="${-w / 2}" y="-10" width="${w}" height="20" rx="10"/><text y="3.8" text-anchor="middle">${esc(e.label)}</text></g>
                    ${bad ? `<g class="pws-edge-warn" transform="translate(${mx + w / 2 + 10} ${my})"><circle r="8"/><text y="3.8" text-anchor="middle">!</text></g>` : ''}
                </g>`;
            }).join('');
            if (keep) { const el = $(`.pws-edge[data-edge="${CSS.escape(keep)}"]`); if (el) el.focus({ preventScroll: true }); }
        }
        function applyView() {
            const v = wf().view;
            els.viewport.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.z})`;
            $('#pws-zoom').textContent = Math.round(v.z * 100) + '%';
        }

        function renderHealth() {
            const h = S.health;
            const sum = h.warnCount ? `<p class="pws-health-sum" data-tone="warn">${ms('error')}<span><b class="pws-mono">${h.warnCount}</b> ${h.warnCount === 1 ? 'problem' : 'problems'} to look at${h.infoCount ? `, <b class="pws-mono">${h.infoCount}</b> ${h.infoCount === 1 ? 'note' : 'notes'}` : ''}</span></p>`
                : `<p class="pws-health-sum" data-tone="ok">${ms('check_circle')}<span>${wf().nodes.length ? 'No problems found.' : 'Add stages and the checks run here.'}${h.infoCount ? ` <b class="pws-mono">${h.infoCount}</b> ${h.infoCount === 1 ? 'note' : 'notes'}.` : ''}</span></p>`;
            const list = h.items.map((it, i) => `<li class="pws-hitem" data-level="${it.level}">
                <button class="pws-hbtn" data-focus="${i}">${ms(it.level === 'warning' ? 'warning' : 'info')}<span class="pws-htext">${esc(it.text)}</span></button>
                ${it.fix ? `<button class="btn pws-btn-sm pws-hfix" data-fix="${i}">${esc(it.fix.label)}</button>` : ''}
            </li>`).join('');
            const html = `${sum}<ul class="pws-health-list">${list}</ul>`;
            $$('[data-health-host]').forEach(el => { el.innerHTML = html; });
            const badge = h.warnCount ? `${ms('error')}<span><b class="pws-mono">${h.warnCount}</b> to fix</span>` : `${ms('check_circle')}<span>Healthy</span>`;
            ['#pws-badge', '#pws-badge-mobile'].forEach(sel => { const b = $(sel); b.innerHTML = badge; b.dataset.tone = h.warnCount ? 'warn' : 'ok'; b.setAttribute('aria-label', h.warnCount ? `${plural(h.warnCount, 'problem')}. Open the health list.` : 'No problems. Open the health list.'); });
            ['#pws-count-health', '#pws-count-health-side'].forEach(sel => { $(sel).textContent = h.warnCount || ''; });
        }

        function renderStages() {
            const w = wf(), order = orderNodes(w);
            const nums = docModel(w).numOf;
            $('#pws-count-stages').textContent = w.nodes.length || '';
            $('#pws-stage-list').innerHTML = order.length ? order.map(n => {
                const k = KINDS[n.kind], flags = S.health.byNode[n.id] || 0;
                const next = outsOf(w, n.id).map(e => `${e.label}: ${nameOf(node(e.to) || {})}`);
                const sel = S.sel && S.sel.t === 'node' && S.sel.id === n.id;
                return `<li><button class="pws-stage" data-stage="${n.id}" ${sel ? 'aria-current="true"' : ''} style="${kindStyle(n.kind)}">
                    <span class="pws-stage-num pws-mono">${nums[n.id] || ''}</span>
                    <span class="pws-kglyph">${ms(k.icon)}</span>
                    <span class="pws-stage-text"><span class="pws-klabel">${k.label}</span><b>${esc(nameOf(n))}</b>${next.length ? `<span class="pws-stage-next">${esc(clip(next.join(', '), 90))}</span>` : ''}</span>
                    ${flags ? `<span class="pws-flag pws-mono" title="${plural(flags, 'problem')}">${flags}</span>` : ''}
                    ${ms('chevron_right', 'pws-stage-go')}
                </button></li>`;
            }).join('') : `<li class="pws-empty-row"><b>No stages yet</b>Use From prompts to build a workflow from your library, or add a stage above.</li>`;
        }

        let docT = 0;
        function renderDoc() {
            clearTimeout(docT);
            S.docStale = false;
            $('#pws-doc').innerHTML = docHtmlBody(wf());
        }
        function docDirty() {
            S.docStale = true;
            if (S.tab !== 'docs') return;
            clearTimeout(docT);
            docT = setTimeout(renderDoc, 160);
        }

        function renderRail() {
            $('#pws-wf-count').textContent = store.workflows.length;
            $('#pws-wf-list').innerHTML = store.workflows.map(w => {
                const stages = w.nodes.filter(n => n.kind === 'prompt').length;
                const checks = w.nodes.filter(n => isCheck(n.kind)).length;
                const active = w.id === store.activeId;
                return `<li class="pws-wf" ${active ? 'data-active' : ''}>
                    <button class="pws-wf-main" data-wf="${w.id}" ${active ? 'aria-current="true"' : ''}>
                        <span class="pws-wf-name">${esc(w.name)}</span>
                        <span class="pws-wf-meta"><span><b class="pws-mono">${stages}</b> ${stages === 1 ? 'prompt' : 'prompts'}</span><span><b class="pws-mono">${checks}</b> ${checks === 1 ? 'check' : 'checks'}</span></span>
                    </button>
                    <span class="pws-wf-acts">
                        <button class="icon-btn pws-icon-sm" data-wf-act="rename" data-wf="${w.id}" aria-label="Rename ${esc(w.name)}" title="Rename">${ms('edit')}</button>
                        <button class="icon-btn pws-icon-sm" data-wf-act="duplicate" data-wf="${w.id}" aria-label="Duplicate ${esc(w.name)}" title="Duplicate">${ms('content_copy')}</button>
                        <button class="icon-btn pws-icon-sm" data-wf-act="delete" data-wf="${w.id}" aria-label="Delete ${esc(w.name)}" title="Delete">${ms('delete')}</button>
                    </span>
                </li>`;
            }).join('');
            const n = wf().name;
            const nm = $('#pws-name');
            if (document.activeElement !== nm) nm.value = n;
            $('#pws-mobile-name').textContent = n || 'Untitled workflow';
        }

        // Everything that changes the graph comes through here.
        function refresh({ inspector = false, nodes = true, touch = true } = {}) {
            S.health = analyse(wf());
            if (nodes) renderNodes();
            renderWires();
            renderHealth();
            renderStages();
            if (!els.rail.contains(document.activeElement)) renderRail();
            if (inspector) renderInspector();
            docDirty();
            changed(touch);
        }
        let raf = 0;
        const refreshSoon = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => refresh()); };

        /* ---------- inspector ---------- */
        const opt = (list, cur) => list.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(l)}</option>`).join('');
        const typeOpts = cur => opt(TYPES.map(t => [t, t]), cur);
        const field = (id, label, control, hint) => `<div class="pws-field"><label for="${id}">${esc(label)}</label>${control}${hint ? `<p class="pws-hint">${esc(hint)}</p>` : ''}</div>`;
        const textIn = (key, val, extra = '') => `<input class="form-input" id="pws-f-${key}" data-f="${key}" value="${esc(val)}" autocomplete="off" ${extra}>`;
        const areaIn = (key, val, rows = 4, extra = '') => `<textarea class="form-textarea" id="pws-f-${key}" data-f="${key}" rows="${rows}" ${extra}>${esc(val)}</textarea>`;
        const numIn = (key, val, min, max) => `<input class="form-input pws-mono" id="pws-f-${key}" data-f="${key}" data-num type="number" min="${min}" max="${max}" value="${esc(val)}">`;
        function ioRows(n, which) {
            const list = n[which];
            const head = which === 'inputs' ? 'Inputs' : 'Outputs';
            const rows = list.map((o, i) => `<div class="pws-io-row" ${which === 'inputs' ? 'data-req' : ''}>
                <input class="form-input pws-mono" data-io="${which}" data-i="${i}" data-k="name" value="${esc(o.name)}" aria-label="${head.slice(0, -1)} ${i + 1} name" autocomplete="off">
                <select class="form-input" data-io="${which}" data-i="${i}" data-k="type" aria-label="${head.slice(0, -1)} ${i + 1} type">${typeOpts(o.type)}</select>
                ${which === 'inputs' ? `<label class="pws-reqbox" title="Required"><input type="checkbox" data-io="${which}" data-i="${i}" data-k="required" ${o.required ? 'checked' : ''} aria-label="Input ${i + 1} is required"><span>Req</span></label>` : ''}
                <button class="icon-btn pws-icon-sm" data-act="ioDel" data-io="${which}" data-i="${i}" aria-label="Remove ${esc(o.name)}">${ms('close')}</button>
            </div>`).join('');
            return `<div class="pws-sect"><div class="pws-sect-head"><span class="pws-label">${head} <span class="pws-mono pws-count">${list.length}</span></span>
                <span><button class="btn btn-ghost pws-btn-xs" data-act="ioDetect" data-io="${which}">Detect</button><button class="btn btn-ghost pws-btn-xs" data-act="ioAdd" data-io="${which}">${ms('add')}<span>Add</span></button></span></div>
                ${rows || `<p class="pws-hint">${which === 'inputs' ? 'No inputs. Variables written as [[name]], {{name}} or ((name)) are found by Detect.' : 'No outputs listed.'}</p>`}</div>`;
        }
        const failTarget = n => { const e = outsOf(wf(), n.id).find(x => x.label === 'fail'); return e ? e.to : ''; };
        function targetOptions(n, cur, blank) {
            const list = wf().nodes.filter(t => t.id !== n.id && t.kind !== 'input' && t.kind !== 'context').sort(pos);
            return `<option value="">${esc(blank)}</option>` + list.map(t => `<option value="${t.id}" ${t.id === cur ? 'selected' : ''}>${esc(KINDS[t.kind].label + ': ' + nameOf(t))}</option>`).join('');
        }
        function connectionsHtml(n) {
            const w = wf();
            const outs = outsOf(w, n.id), ins = insOf(w, n.id);
            const can = n.kind !== 'output';
            const outRows = outs.map(e => `<div class="pws-conn-row">
                <select class="form-input" data-conn="label" data-e="${e.id}" aria-label="Path label">${opt(LABELS.map(l => [l, l]), e.label)}</select>
                <span class="pws-conn-to">to</span>
                <select class="form-input" data-conn="target" data-e="${e.id}" aria-label="Goes to">${targetOptions(n, e.to, 'Choose')}</select>
                <button class="icon-btn pws-icon-sm" data-act="delEdge" data-e="${e.id}" aria-label="Remove this connection">${ms('close')}</button>
                <button class="btn btn-ghost pws-btn-xs pws-conn-open" data-select-edge="${e.id}">Edit mapping</button>
            </div>`).join('');
            const inRows = ins.map(e => `<button class="pws-link-row" data-select-edge="${e.id}"><span class="pws-chip pws-mono">${esc(e.label)}</span><span>from ${esc(nameOf(node(e.from) || {}))}</span>${ms('chevron_right')}</button>`).join('');
            return `<div class="pws-sect"><div class="pws-sect-head"><span class="pws-label">Next steps <span class="pws-mono pws-count">${outs.length}</span></span></div>
                ${can ? `${outRows || '<p class="pws-hint">Nothing follows this stage yet.</p>'}
                <div class="pws-conn-add"><select class="form-input" id="pws-conn-new" aria-label="Connect to">${targetOptions(n, '', 'Connect to a stage')}</select>
                <select class="form-input" id="pws-conn-label" aria-label="Path label">${opt((isCheck(n.kind) ? ['pass', 'fail', 'always'] : ['always', 'pass', 'fail']).map(l => [l, l]), isCheck(n.kind) ? (outs.some(e => e.label === 'pass') ? 'fail' : 'pass') : 'always')}</select>
                <button class="btn pws-btn-sm" data-act="connectNew">Connect</button></div>` : '<p class="pws-hint">An Output node ends the workflow.</p>'}
                ${ins.length ? `<span class="pws-label pws-sub">Comes from</span>${inRows}` : ''}</div>`;
        }
        function nodeFields(n) {
            const lib = (key, what) => `<button class="btn pws-btn-sm" data-act="pickFor" data-key="${key}">${ms('library_books')}<span>${what}</span></button>`;
            switch (n.kind) {
                case 'prompt': return `
                    <div class="pws-linked ${n.source === 'library' && n.promptId !== null ? '' : 'pws-muted'}">${n.source === 'library' && n.promptId !== null
                        ? `${ms('link')}<span>Library prompt <b class="pws-mono">#${n.promptId}</b></span><button class="btn btn-ghost pws-btn-xs" data-act="refreshLib">Refresh from library</button><button class="btn btn-ghost pws-btn-xs" data-act="unlink">Unlink</button>`
                        : `${ms('edit_note')}<span>Typed in this workflow</span>`}</div>
                    <div class="pws-field-row">${lib('text', 'Choose from library')}</div>
                    ${field('pws-f-text', 'Prompt text', areaIn('text', n.text, 9, 'placeholder="Write the prompt. Variables such as [[topic]] become inputs."'))}
                    <div id="pws-io-wrap">${ioRows(n, 'inputs')}${ioRows(n, 'outputs')}</div>`;
                case 'context': return `
                    ${field('pws-f-mode', 'Kind of context', `<select class="form-input" id="pws-f-mode" data-f="mode">${opt([['text', 'Text'], ['reference', 'Reference']], n.mode)}</select>`)}
                    ${n.mode === 'reference' ? field('pws-f-ref', 'Reference', textIn('ref', n.ref, 'placeholder="A document, link or file name"'), 'Named in the documentation. Nothing is fetched.') : ''}
                    ${field('pws-f-text', n.mode === 'reference' ? 'Notes about it' : 'Context text', areaIn('text', n.text, 7))}`;
                case 'validation': return `
                    ${field('pws-f-rules', 'Rules, one per line', areaIn('rules', n.rules.join('\n'), 6, 'data-lines placeholder="The output is under 200 words"'))}
                    ${field('pws-f-pass', 'Pass condition', `<select class="form-input" id="pws-f-pass" data-f="pass">${opt([['all', 'Every rule passes'], ['any', 'Any one rule passes'], ['threshold', 'At least a set number pass']], n.pass)}</select>`)}
                    ${n.pass === 'threshold' ? field('pws-f-threshold', 'Rules that must pass', numIn('threshold', n.threshold, 1, 40)) : ''}
                    ${field('pws-f-onfail', 'On fail goes to', `<select class="form-input" id="pws-f-onfail" data-onfail>${targetOptions(n, failTarget(n), 'No failure path')}</select>`)}
                    ${field('pws-f-retryLimit', 'Retry limit', numIn('retryLimit', n.retryLimit, 0, 20), 'Needed when the fail path loops back. Zero means none.')}`;
                case 'verification': return `
                    ${field('pws-f-performer', 'Checked by', `<select class="form-input" id="pws-f-performer" data-f="performer">${opt([['person', 'A person'], ['prompt', 'A second prompt']], n.performer)}</select>`)}
                    ${n.performer === 'prompt' ? `<div class="pws-field-row">${lib('checker', 'Choose from library')}</div>${field('pws-f-checker', 'Checking prompt', areaIn('checker', n.checker, 6))}` : ''}
                    ${field('pws-f-checklist', 'Checklist, one item per line', areaIn('checklist', n.checklist.join('\n'), 5, 'data-lines placeholder="Facts match the source"'))}
                    ${field('pws-f-onfail', 'On fail goes to', `<select class="form-input" id="pws-f-onfail" data-onfail>${targetOptions(n, failTarget(n), 'No failure path')}</select>`)}
                    ${field('pws-f-retryLimit', 'Retry limit', numIn('retryLimit', n.retryLimit, 0, 20))}`;
                case 'recovery': return `
                    ${field('pws-f-strategy', 'Strategy', `<select class="form-input" id="pws-f-strategy" data-f="strategy">${opt(Object.entries(STRATEGY), n.strategy)}</select>`)}
                    ${field('pws-f-instruction', 'What to do', areaIn('instruction', n.instruction, 4, 'placeholder="Say what to change on the retry"'))}
                    ${n.strategy === 'fallback' ? `<div class="pws-field-row">${lib('fallback', 'Choose from library')}</div>${field('pws-f-fallback', 'Fallback prompt', areaIn('fallback', n.fallback, 6))}` : ''}
                    ${n.strategy === 'escalate' ? field('pws-f-escalate', 'Escalate to', textIn('escalate', n.escalate, 'placeholder="A person or team"')) : ''}
                    ${field('pws-f-retryLimit', 'Retry limit', numIn('retryLimit', n.retryLimit, 0, 20))}`;
                case 'input': return `
                    ${field('pws-f-name', 'Variable name', `<input class="form-input pws-mono" id="pws-f-name" data-f="name" value="${esc(n.name)}" autocomplete="off">`)}
                    ${field('pws-f-type', 'Type', `<select class="form-input" id="pws-f-type" data-f="type">${typeOpts(n.type)}</select>`)}
                    ${field('pws-f-description', 'Description', areaIn('description', n.description, 3))}
                    ${field('pws-f-example', 'Example value', textIn('example', n.example))}`;
                default: return `
                    ${field('pws-f-name', 'Result name', textIn('name', n.name))}
                    ${field('pws-f-type', 'Type', `<select class="form-input" id="pws-f-type" data-f="type">${typeOpts(n.type)}</select>`)}
                    ${field('pws-f-description', 'Description', areaIn('description', n.description, 3))}`;
            }
        }
        function inspectorHead(icon, label, hint, style) {
            return `<div class="pws-insp-head" style="${style || ''}"><span class="pws-kglyph">${ms(icon)}</span><div class="pws-insp-meta"><span class="pws-label">${esc(label)}</span><div class="pws-insp-hint">${esc(hint)}</div></div><button class="icon-btn pws-sheet-close" data-act="closeSheet" aria-label="Close details">${ms('close')}</button></div>`;
        }
        function edgeHtml(e) {
            const w = wf(), f = node(e.from), t = node(e.to);
            const src = producedBy(w, e.from), ins = inputsOf(t);
            const rows = e.map.map((m, i) => {
                const o = src.find(x => x.name === m.out), inp = ins.find(x => x.name === m.in);
                const outOpts = [...src.map(x => [x.name, `${x.name} (${x.type})`])];
                if (!o) outOpts.unshift([m.out, `${m.out} (missing)`]);
                const inOpts = ins.map(x => [x.name, `${x.name} (${x.type})`]);
                if (!inp) inOpts.unshift([m.in, `${m.in} (missing)`]);
                const bad = !o || !inp || !typeOk(o.type, inp.type);
                return `<div class="pws-map-row" ${bad ? 'data-bad' : ''}>
                    <select class="form-input" data-map="out" data-i="${i}" aria-label="Output to map">${opt(outOpts, m.out)}</select>
                    <span class="pws-conn-to">to</span>
                    <select class="form-input" data-map="in" data-i="${i}" aria-label="Input to fill">${opt(inOpts, m.in)}</select>
                    <button class="icon-btn pws-icon-sm" data-act="mapDel" data-i="${i}" aria-label="Remove this mapping">${ms('close')}</button>
                </div>`;
            }).join('');
            const problems = S.health.items.filter(it => it.edgeId === e.id);
            return `${inspectorHead('timeline', 'Connection', `${nameOf(f)} to ${nameOf(t)}`)}
                <div class="pws-insp-body">
                    ${field('pws-f-elabel', 'Path label', `<select class="form-input" id="pws-f-elabel" data-edge-label>${opt(LABELS.map(l => [l, l]), e.label)}</select>`, 'Pass and fail come from checks. Always follows every time.')}
                    <div class="pws-sect"><div class="pws-sect-head"><span class="pws-label">Data mapping <span class="pws-mono pws-count">${e.map.length}</span></span>
                        ${ins.length ? `<span><button class="btn btn-ghost pws-btn-xs" data-act="mapAuto">Map by name</button><button class="btn btn-ghost pws-btn-xs" data-act="mapAdd" ${src.length ? '' : 'disabled'}>${ms('add')}<span>Add</span></button></span>` : ''}</div>
                        ${ins.length ? (rows || '<p class="pws-hint">Nothing mapped. Choose which output fills which input.</p>') : `<p class="pws-hint">${esc(nameOf(t))} takes no named inputs, so the whole result passes through.</p>`}
                    </div>
                    ${problems.length ? `<div class="pws-sect"><span class="pws-label">Problems</span>${problems.map(p => `<p class="pws-problem">${ms('warning')}<span>${esc(p.text)}</span></p>`).join('')}</div>` : ''}
                </div>
                <div class="pws-insp-foot"><button class="btn btn-danger" data-act="delEdge" data-e="${e.id}">Delete connection</button></div>`;
        }
        function renderInspector() {
            const box = els.inspector, w = wf();
            const sel = S.sel;
            const n = sel && sel.t === 'node' ? node(sel.id) : null, e = sel && sel.t === 'edge' ? edge(sel.id) : null;
            if (n) {
                const k = KINDS[n.kind];
                box.innerHTML = `${inspectorHead(k.icon, k.label, k.hint, kindStyle(n.kind))}
                    <div class="pws-insp-body">
                        ${field('pws-f-title', n.kind === 'input' || n.kind === 'output' ? 'Label on the canvas' : 'Name', textIn('title', n.title))}
                        ${nodeFields(n)}
                        ${connectionsHtml(n)}
                    </div>
                    <div class="pws-insp-foot"><button class="btn" data-act="dupNode">${ms('content_copy')}<span>Duplicate</span></button><button class="btn btn-danger" data-act="delNode" data-id="${n.id}">${ms('delete')}<span>Delete</span></button></div>`;
            } else if (e) {
                box.innerHTML = edgeHtml(e);
            } else {
                const stats = [['Prompts', w.nodes.filter(x => x.kind === 'prompt').length], ['Checks', w.nodes.filter(x => isCheck(x.kind)).length], ['Recovery', w.nodes.filter(x => x.kind === 'recovery').length], ['Links', w.edges.length]];
                box.innerHTML = `${inspectorHead('conversion_path', 'Workflow', 'Settings for the whole workflow')}
                    <div class="pws-insp-body">
                        ${field('pws-f-wname', 'Workflow name', `<input class="form-input" id="pws-f-wname" data-wf-f="name" value="${esc(w.name)}" maxlength="120" autocomplete="off">`)}
                        ${field('pws-f-wpurpose', 'Purpose', `<textarea class="form-textarea" id="pws-f-wpurpose" data-wf-f="purpose" rows="5" placeholder="What this workflow is for and when to use it. It opens the documentation.">${esc(w.purpose)}</textarea>`)}
                        <div class="pws-stats">${stats.map(([l, v]) => `<div><b class="pws-mono">${v}</b><span>${l}</span></div>`).join('')}</div>
                        <div class="pws-sect"><span class="pws-label">Keyboard</span>
                            <dl class="pws-keys"><dt class="pws-mono">Tab</dt><dd>Move between stages and connections</dd><dt class="pws-mono">Arrows</dt><dd>Move the focused stage</dd><dt class="pws-mono">Shift Arrows</dt><dd>Move four grid steps</dd><dt class="pws-mono">Enter</dt><dd>Select the focused item</dd><dt class="pws-mono">Delete</dt><dd>Remove it, after a confirmation</dd></dl></div>
                    </div>`;
            }
        }

        /* ---------- selection and view ---------- */
        const sheetOpen = () => root.dataset.sheet === 'open';
        let sheetOpener = null, sheetAt = 0;
        function openSheet(opener) {
            if (!isMobile()) return;
            sheetOpener = opener || document.activeElement;
            sheetAt = Date.now();
            root.dataset.sheet = 'open';
            els.side.setAttribute('role', 'dialog');
            els.side.setAttribute('aria-modal', 'true');
            requestAnimationFrame(() => { const f = els.side.querySelector('.pws-sheet-close'); if (f) f.focus(); });
        }
        function closeSheet() {
            if (!sheetOpen()) return;
            delete root.dataset.sheet;
            els.side.removeAttribute('role');
            els.side.removeAttribute('aria-modal');
            const o = sheetOpener;
            sheetOpener = null;
            if (o && root.contains(o) && o.isConnected) o.focus({ preventScroll: true });
        }
        function select(sel, { sheet = false, opener } = {}) {
            S.sel = sel;
            $$('.pws-node').forEach(el => el.toggleAttribute('data-selected', !!sel && sel.t === 'node' && el.dataset.id === sel.id));
            renderWires();
            renderInspector();
            renderStages();
            if (sel && !isMobile()) setRtab('inspect');
            if (sel && sheet) openSheet(opener);
            if (!sel) closeSheet();
        }
        function setRtab(t) {
            S.rtab = t;
            root.dataset.rtab = t;
            $$('#pws-side-tabs [data-rtab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.rtab === t)));
            $('#pws-inspector').hidden = t !== 'inspect';
            $('#pws-health-side').hidden = t !== 'health';
        }
        function setTab(t) {
            if (!isMobile()) {
                if (t === 'health') { setRtab('health'); t = S.tab === 'docs' ? 'docs' : 'canvas'; }
                if (t === 'stages') t = 'canvas';
            }
            S.tab = t;
            root.dataset.tab = t;
            $$('#pws-tabs [data-tab]').forEach(b => { const on = b.dataset.tab === t; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
            if (t === 'canvas') requestAnimationFrame(() => { if (S.needFit) fit(S.needFit); renderWires(); });
            if (t === 'docs' && S.docStale) renderDoc();
        }
        function viewCentre() {
            const r = els.canvas.getBoundingClientRect(), v = wf().view;
            return { x: ((r.width || 700) / 2 - v.x) / v.z, y: ((r.height || 500) / 2 - v.y) / v.z };
        }
        const measure = n => { const el = nodeEl(n.id); return el && el.offsetHeight ? el.offsetHeight : (n.kind === 'prompt' ? 150 : 112); };
        function fit(floor = MIN_Z) {
            const w = wf();
            const r = els.canvas.getBoundingClientRect();
            if (!r.width) { S.needFit = floor; return; }
            S.needFit = false;
            if (!w.nodes.length) { w.view = { x: 40, y: 56, z: 1 }; return applyView(); }
            const xs = w.nodes.map(n => n.x), ys = w.nodes.map(n => n.y);
            const minX = Math.min(...xs), minY = Math.min(...ys);
            const bw = Math.max(...w.nodes.map(n => n.x + NODE_W)) - minX;
            const bh = Math.max(...w.nodes.map(n => n.y + measure(n))) - minY;
            const padX = 48, top = 76, bottom = 64;
            const z = clamp(Math.min((r.width - padX * 2) / bw, (r.height - top - bottom) / bh), floor, 1);
            w.view = { z, x: Math.max(padX, (r.width - bw * z) / 2) - minX * z, y: top + Math.max(0, (r.height - top - bottom - bh * z) / 2) - minY * z };
            applyView();
            changed(false);
        }
        function zoomBy(delta, cx, cy) {
            const r = els.canvas.getBoundingClientRect(), v = wf().view;
            cx = cx ?? r.width / 2;
            cy = cy ?? r.height / 2;
            const z = clamp(+(v.z + delta).toFixed(2), MIN_Z, MAX_Z);
            const k = z / v.z;
            v.x = cx - (cx - v.x) * k;
            v.y = cy - (cy - v.y) * k;
            v.z = z;
            applyView();
            changed();
        }
        function centreOn(id) {
            const n = node(id), r = els.canvas.getBoundingClientRect(), v = wf().view;
            if (!n || !r.width) return;
            v.x = r.width / 2 - (n.x + NODE_W / 2) * v.z;
            v.y = r.height / 2 - (n.y + measure(n) / 2) * v.z;
            els.viewport.classList.add('pws-gliding');
            applyView();
            setTimeout(() => els.viewport.classList.remove('pws-gliding'), 260);
        }
        function tidy(quiet) {
            if (!wf().nodes.length) return;
            layoutWorkflow(wf(), measure);
            refresh();
            fit(0.5);
            if (!quiet) toast('Stages laid out left to right', 'success');
        }

        /* ---------- graph actions ---------- */
        const fixSel = () => {
            if (!S.sel) return;
            if (S.sel.t === 'node' && !node(S.sel.id)) S.sel = null;
            if (S.sel && S.sel.t === 'edge' && !edge(S.sel.id)) S.sel = null;
        };
        function freeSpot(x, y, h) {
            let guard = 0;
            const hit = () => wf().nodes.some(n => x < n.x + NODE_W + 24 && x + NODE_W + 24 > n.x && y < n.y + measure(n) + 24 && y + h + 24 > n.y);
            while (hit() && guard++ < 30) y += 48;
            return { x: snap(x), y: snap(y) };
        }
        function addNode(kind, over, at) {
            const w = wf();
            if (w.nodes.length >= MAX_NODES) { toast(`A workflow holds up to ${MAX_NODES} stages. Split it into two workflows.`, 'warning'); return null; }
            const c = at || viewCentre();
            const k = w.nodes.length % 6;
            const spot = freeSpot(c.x - NODE_W / 2 + k * GRID, c.y - 50 + k * GRID, 110);
            const n = Object.assign(blankNode(kind, spot.x, spot.y), over || {});
            w.nodes.push(n);
            S.sel = { t: 'node', id: n.id };
            refresh({ inspector: true });
            if (isMobile()) openSheet(document.activeElement); else { const el = nodeEl(n.id); if (el) el.focus({ preventScroll: true }); }
            return n;
        }
        function removeNode(id) {
            const w = wf();
            w.nodes = w.nodes.filter(n => n.id !== id);
            w.edges = w.edges.filter(e => e.from !== id && e.to !== id);
            fixSel();
            if (!S.sel) closeSheet();
            refresh({ inspector: true });
            toast('Stage deleted');
        }
        function removeEdge(id) {
            const w = wf();
            w.edges = w.edges.filter(e => e.id !== id);
            fixSel();
            if (!S.sel) closeSheet();
            refresh({ inspector: true });
            toast('Connection deleted');
        }
        function connect(fromId, toId, label, quiet) {
            const w = wf(), a = node(fromId), b = node(toId);
            if (!a || !b || a.id === b.id) return null;
            if (a.kind === 'output') { toast('An Output node ends the workflow, so nothing can follow it', 'warning'); return null; }
            if (b.kind === 'input' || b.kind === 'context') { toast(`${KINDS[b.kind].label} nodes only feed other stages, so nothing connects into them`, 'warning'); return null; }
            label = oneOf(label, LABELS, 'always');
            if (w.edges.some(e => e.from === a.id && e.to === b.id && e.label === label)) { toast('That connection already exists', 'warning'); return null; }
            const e = { id: rid('e'), from: a.id, to: b.id, label, map: [] };
            w.edges.push(e);
            const mapped = autoMap(w, e);
            refresh({ inspector: true });
            if (!quiet) toast(`Connected ${nameOf(a)} to ${nameOf(b)}${mapped ? `, ${plural(mapped, 'input')} mapped by name` : ''}`, 'success');
            return e;
        }
        function setFailTarget(id, targetId) {
            const w = wf();
            w.edges = w.edges.filter(e => !(e.from === id && e.label === 'fail'));
            if (targetId) connect(id, targetId, 'fail', true); else refresh({ inspector: true });
        }
        // Moving an input or output name updates every mapping that points at it.
        function renameIO(nodeId, side, from, to) {
            const w = wf();
            if (!from || !to || from === to) return;
            if (side === 'out') {
                w.edges.forEach(e => { if (e.map.some(m => m.out === from) && producedBy(w, e.from).some(o => o.from === nodeId && o.name === from)) e.map.forEach(m => { if (m.out === from) m.out = to; }); });
            } else insOf(w, nodeId).forEach(e => e.map.forEach(m => { if (m.in === from) m.in = to; }));
        }
        function runFix(fix) {
            const w = wf();
            if (fix.act === 'mapInput') {
                const e = edge(fix.edgeId);
                if (e && !e.map.some(m => m.in === fix.input)) e.map.push({ out: fix.out, in: fix.input });
            } else if (fix.act === 'addRecovery') {
                const n = node(fix.nodeId);
                if (!n) return;
                const spot = freeSpot(n.x, n.y + measure(n) + 64, 112);
                const r = blankNode('recovery', spot.x, spot.y);
                r.instruction = 'Run the failing stage again with a corrected prompt that names what the check found wrong. If it still fails at the retry limit, hand the stage to a person.';
                w.nodes.push(r);
                w.edges = w.edges.filter(e => !(e.from === n.id && e.label === 'fail'));
                w.edges.push({ id: rid('e'), from: n.id, to: r.id, label: 'fail', map: [] });
            } else if (fix.act === 'addInputNode') {
                const n = node(fix.nodeId);
                if (!n) return;
                const spec = n.inputs.find(i => i.name === fix.input) || { name: fix.input, type: 'text' };
                const spot = freeSpot(n.x - NODE_W - 72, n.y, 100);
                const inp = blankNode('input', spot.x, spot.y);
                inp.title = spec.name; inp.name = spec.name; inp.type = spec.type;
                w.nodes.push(inp);
                const e = { id: rid('e'), from: inp.id, to: n.id, label: 'always', map: [] };
                w.edges.push(e);
                autoMap(w, e);
            } else if (fix.act === 'addOutput') {
                const order = orderNodes(w).filter(n => !['output', 'recovery', 'context', 'input'].includes(n.kind));
                const last = [...order].reverse().find(n => !outsOf(w, n.id).some(e => e.label !== 'fail')) || order[order.length - 1];
                const right = Math.max(0, ...w.nodes.map(n => n.x + NODE_W)) + 72;
                const o = blankNode('output', right, last ? last.y : 0);
                w.nodes.push(o);
                if (last) { const e = { id: rid('e'), from: last.id, to: o.id, label: isCheck(last.kind) ? 'pass' : 'always', map: [] }; w.edges.push(e); autoMap(w, e); }
            } else if (fix.act === 'setRetry') {
                const n = node(fix.nodeId);
                if (n) n.retryLimit = fix.value || 2;
            }
            refresh({ inspector: true });
            toast(`Done: ${fix.label}`, 'success');
        }

        /* ---------- dialogs ---------- */
        let confirmCb = null, textMode = null, textCtx = null;
        function askConfirm({ title, body, yes = 'Delete', onYes }) {
            $('#pws-confirm-title').textContent = title;
            $('#pws-confirm-body').textContent = body;
            $('#pws-confirm-yes').textContent = yes;
            confirmCb = onYes;
            $('#pws-confirm-dialog').showModal();
            $('#pws-confirm-no').focus();
        }
        $('#pws-confirm-yes').addEventListener('click', () => { const cb = confirmCb; confirmCb = null; $('#pws-confirm-dialog').close(); if (cb) cb(); });
        const askDeleteNode = id => {
            const n = node(id);
            if (!n) return;
            const c = wf().edges.filter(e => e.from === id || e.to === id).length;
            askConfirm({ title: `Delete ${nameOf(n)}?`, body: c ? `Its ${plural(c, 'connection')} will be removed too. This cannot be undone.` : 'This cannot be undone.', yes: 'Delete stage', onYes: () => removeNode(id) });
        };
        const askDeleteEdge = id => {
            const e = edge(id);
            if (!e) return;
            askConfirm({ title: 'Delete this connection?', body: `${nameOf(node(e.from) || {})} will no longer lead to ${nameOf(node(e.to) || {})}, and its data mapping is lost.`, yes: 'Delete connection', onYes: () => removeEdge(id) });
        };
        function openText(mode, ctx) {
            textMode = mode;
            textCtx = ctx || null;
            const rename = mode === 'rename';
            $('#pws-text-title').textContent = rename ? 'Rename workflow' : 'Import a workflow';
            $('#pws-text-desc').textContent = rename ? '' : 'Paste the JSON of a workflow exported from this studio, or choose the file. It is added as a new workflow and nothing is overwritten.';
            $('#pws-text-desc').hidden = rename;
            $('#pws-text-input').hidden = !rename;
            $('#pws-text-area').hidden = rename;
            $('#pws-text-pick').hidden = rename;
            $('#pws-text-input').value = rename ? (ctx && ctx.name) || '' : '';
            $('#pws-text-area').value = '';
            $('#pws-text-error').hidden = true;
            $('#pws-text-go').textContent = rename ? 'Save name' : 'Import workflow';
            $('#pws-text-dialog').showModal();
            (rename ? $('#pws-text-input') : $('#pws-text-area')).focus();
        }
        function importWorkflow(text) {
            let raw;
            try { raw = JSON.parse(text); } catch (e) { throw new Error('That is not valid JSON.'); }
            if (!raw || raw.schema !== SCHEMA) throw new Error('This is not a Prompt Workflow Studio export.');
            if (!Number.isInteger(raw.version) || raw.version < 1 || raw.version > VERSION) throw new Error(`This file is version ${s(raw.version, 10)}, which this studio cannot read.`);
            const clean = cleanWorkflow(raw.workflow);
            if (!clean) throw new Error('The file holds no workflow.');
            clean.id = rid('wf');
            clean.updated = Date.now();
            return clean;
        }
        $('#pws-text-go').addEventListener('click', () => {
            const err = $('#pws-text-error');
            err.hidden = true;
            if (textMode === 'rename') {
                const v = $('#pws-text-input').value.trim();
                if (!v) { err.textContent = 'Give the workflow a name.'; err.hidden = false; return; }
                const w = store.workflows.find(x => x.id === (textCtx && textCtx.id));
                if (w) { w.name = v.slice(0, 120); w.updated = Date.now(); }
                $('#pws-text-dialog').close();
                refresh();
                renderRail();
                return;
            }
            try {
                const w = importWorkflow($('#pws-text-area').value.trim());
                if (store.workflows.length >= 100) throw new Error('You can keep up to 100 workflows. Delete one first.');
                store.workflows.push(w);
                $('#pws-text-dialog').close();
                switchTo(w.id);
                toast(`Imported ${w.name}`, 'success');
            } catch (e) { err.textContent = e.message; err.hidden = false; }
        });
        $('#pws-text-input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#pws-text-go').click(); } });
        $('#pws-text-pick').addEventListener('click', () => $('#pws-text-file').click());
        $('#pws-text-file').addEventListener('change', async e => {
            const f = e.target.files[0];
            if (!f) return;
            $('#pws-text-area').value = await f.text();
            $('#pws-text-error').hidden = true;
            e.target.value = '';
        });

        /* ---------- library picker and From prompts ---------- */
        let lib = null;
        const pick = { mode: 'single', cb: null, q: '', order: [], loading: false, err: '' };
        async function loadLib(force) {
            if (lib && !force) return lib;
            const r = await fetch('/api/prompts');
            if (!r.ok) throw new Error('The library did not answer');
            const j = await r.json();
            if (!Array.isArray(j)) throw new Error('The library list was not readable');
            lib = j.map(p => ({
                id: Number(p.id), title: s(p.title, 200).trim() || 'Untitled prompt', content: s(p.content, 40000), description: s(p.description, 400),
                tags: (Array.isArray(p.tags) ? p.tags : []).map(t => s(t, 40)).filter(Boolean), variable_meta: p.variable_meta && typeof p.variable_meta === 'object' ? p.variable_meta : {}
            })).filter(p => Number.isFinite(p.id)).map(p => ({ ...p, vars: detectVars(p.content).length, hay: `${p.title} ${p.description} ${p.tags.join(' ')}`.toLowerCase() }));
            return lib;
        }
        const libById = id => (lib || []).find(p => p.id === id);
        function renderPick() {
            const list = lib || [];
            const q = pick.q.trim().toLowerCase();
            const hits = q ? list.filter(p => p.hay.includes(q)) : list;
            const shown = hits.slice(0, 150);
            const multi = pick.mode === 'multi';
            $('#pws-pick-status').textContent = pick.loading || pick.err ? '' : `${hits.length} of ${list.length} prompts${hits.length > shown.length ? `, showing ${shown.length}` : ''}`;
            $('#pws-pick-list').innerHTML = pick.loading ? '<p class="pws-pick-empty">Loading the library</p>'
                : pick.err ? `<p class="pws-pick-empty">${esc(pick.err)}. You can still type a prompt into a stage by hand.</p>`
                : !list.length ? '<p class="pws-pick-empty">The library has no prompts yet.</p>'
                : shown.length ? shown.map(p => {
                    const at = pick.order.indexOf(p.id);
                    return `<button class="pws-pick-item" data-pick="${p.id}" ${multi ? `aria-pressed="${at >= 0}"` : ''}>
                        ${multi ? `<span class="pws-pick-mark pws-mono">${at >= 0 ? at + 1 : ''}</span>` : ''}
                        <span class="pws-pick-text"><b>${esc(p.title)}</b><span>${esc(clip(p.description || p.content, 110))}</span></span>
                        <span class="pws-pick-meta pws-mono">${plural(p.vars, 'variable')}</span>
                    </button>`;
                }).join('') : '<p class="pws-pick-empty">No prompts match that search.</p>';
            if (multi) {
                $('#pws-pick-count').textContent = pick.order.length;
                $('#pws-pick-order').innerHTML = pick.order.length ? pick.order.map((id, i) => {
                    const p = libById(id);
                    const t = p ? p.title : 'Prompt';
                    return `<li class="pws-order-item"><span class="pws-mono pws-order-n">${i + 1}</span><span class="pws-order-t">${esc(t)}</span>
                        <span class="pws-order-btns"><button class="icon-btn pws-icon-sm" data-pick-move="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move ${esc(t)} earlier">${ms('keyboard_arrow_up')}</button>
                        <button class="icon-btn pws-icon-sm" data-pick-move="${i}" data-dir="1" ${i === pick.order.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(t)} later">${ms('keyboard_arrow_down')}</button>
                        <button class="icon-btn pws-icon-sm" data-pick-rm="${i}" aria-label="Remove ${esc(t)}">${ms('close')}</button></span></li>`;
                }).join('') : '<li class="pws-pick-empty">Select prompts on the left. They run in the order shown here.</li>';
                $('#pws-pick-go').disabled = !pick.order.length;
            }
        }
        function openPicker(mode, cb) {
            Object.assign(pick, { mode, cb, q: '', order: [], loading: !lib, err: '' });
            const multi = mode === 'multi';
            $('#pws-pick-body').dataset.mode = mode;
            $('#pws-pick-title').textContent = multi ? 'Generate a workflow from prompts' : 'Choose a library prompt';
            $('#pws-pick-right').hidden = !multi;
            $('#pws-pick-go').hidden = !multi;
            $('#pws-pick-search').value = '';
            $('#pws-opt-rec').disabled = !$('#pws-opt-val').checked;
            $('#pws-pick-dialog').showModal();
            renderPick();
            $('#pws-pick-search').focus();
            if (!lib) loadLib().then(() => { pick.loading = false; renderPick(); }).catch(e => { pick.loading = false; pick.err = e && e.message ? e.message : 'The library could not be read'; renderPick(); });
        }
        function promptFields(p) {
            const outs = detectOutputs(p.content).slice(0, 10);
            return {
                title: p.title, source: 'library', promptId: p.id, text: p.content,
                inputs: detectVars(p.content).slice(0, 30).map(name => ({ name, type: guessType(name, p.variable_meta), required: true })),
                outputs: outs.length ? outs.map(name => ({ name, type: guessType(name) })) : [{ name: 'result', type: 'text' }]
            };
        }
        $('#pws-pick-go').addEventListener('click', () => {
            const chosen = pick.order.map(libById).filter(Boolean);
            if (!chosen.length) return;
            const val = $('#pws-opt-val').checked;
            if (store.workflows.length >= 100) return toast('You can keep up to 100 workflows. Delete one first.', 'warning');
            const g = generateWorkflow(chosen, { validation: val, recovery: val && $('#pws-opt-rec').checked });
            store.workflows.push(g);
            $('#pws-pick-dialog').close();
            switchTo(g.id, { layout: true });
            const unm = S.health.items.filter(i => i.text.includes('nothing is mapped')).length;
            toast(`Built ${g.name}: ${plural(chosen.length, 'stage')}${unm ? `, ${plural(unm, 'input')} still to map` : ''}`, unm ? 'warning' : 'success');
            setTab('canvas');
        });

        /* ---------- files ---------- */
        const slug = t => String(t || 'workflow').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workflow';
        function download(name, text, mime, okMsg) {
            if (window.PL_saveBlob) return window.PL_saveBlob(new Blob([text], { type: mime + ';charset=utf-8' }), name, okMsg);
            const a = document.createElement('a');
            const url = URL.createObjectURL(new Blob([text], { type: mime + ';charset=utf-8' }));
            a.href = url;
            a.download = name;
            root.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1500);
        }
        async function copyText(text) {
            try { await navigator.clipboard.writeText(text); } catch (e) {
                const t = document.createElement('textarea');
                t.value = text;
                t.style.cssText = 'position:fixed;opacity:0';
                document.body.appendChild(t);
                t.select();
                document.execCommand('copy');
                t.remove();
            }
        }
        const needStages = () => { if (!wf().nodes.length) { toast('Add some stages first, then there is something to document', 'warning'); return true; } return false; };

        /* ---------- workflows ---------- */
        function switchTo(id, { layout = false } = {}) {
            store.activeId = id;
            S.sel = null;
            closeSheet();
            closeRail();
            applyView();
            refresh({ inspector: true, touch: false });
            if (layout) { layoutWorkflow(wf(), measure); refresh({ inspector: true }); fit(0.5); }
            renderRail();
            if (S.tab === 'docs') renderDoc();
            flush();
        }
        const dup = id => {
            const w = store.workflows.find(x => x.id === id);
            if (!w) return;
            if (store.workflows.length >= 100) return toast('You can keep up to 100 workflows. Delete one first.', 'warning');
            const c = cleanWorkflow(JSON.parse(JSON.stringify(w)));
            c.id = rid('wf');
            c.name = `${w.name} copy`.slice(0, 120);
            c.created = c.updated = Date.now();
            store.workflows.splice(store.workflows.indexOf(w) + 1, 0, c);
            switchTo(c.id);
            toast(`Duplicated as ${c.name}`, 'success');
        };
        const delWf = id => {
            const w = store.workflows.find(x => x.id === id);
            if (!w) return;
            askConfirm({
                title: `Delete ${w.name}?`, body: `Its ${plural(w.nodes.length, 'stage')} and ${plural(w.edges.length, 'connection')} are removed from this browser. Export it first if you may want it back.`, yes: 'Delete workflow',
                onYes: () => {
                    store.workflows = store.workflows.filter(x => x.id !== id);
                    if (!store.workflows.length) store.workflows.push(newWorkflow());
                    if (store.activeId === id) switchTo(store.workflows[0].id); else { renderRail(); flush(); }
                    toast('Workflow deleted');
                }
            });
        };

        /* ---------- rail and sheets ---------- */
        function applyRail() {
            root.toggleAttribute('data-rail-closed', !S.railOpen);
            const b = $('#pws-rail-toggle');
            b.setAttribute('aria-expanded', String(S.railOpen));
            b.setAttribute('aria-label', S.railOpen ? 'Hide the workflow list' : 'Show the workflow list');
            b.title = b.getAttribute('aria-label');
            b.firstElementChild.textContent = S.railOpen ? 'left_panel_close' : 'left_panel_open';
        }
        let railOpener = null;
        function openRail() {
            if (!isMobile()) { S.railOpen = true; applyRail(); return; }
            railOpener = document.activeElement;
            sheetAt = Date.now();
            root.dataset.rail = 'open';
            els.rail.setAttribute('role', 'dialog');
            els.rail.setAttribute('aria-modal', 'true');
            requestAnimationFrame(() => { const f = $('.pws-wf-main[aria-current]') || $('.pws-wf-main'); if (f) f.focus(); });
        }
        function closeRail() {
            if (root.dataset.rail !== 'open') return;
            delete root.dataset.rail;
            els.rail.removeAttribute('role');
            els.rail.removeAttribute('aria-modal');
            if (railOpener && railOpener.isConnected) railOpener.focus({ preventScroll: true });
            railOpener = null;
        }

        /* ---------- actions ---------- */
        const focusItem = it => {
            if (it.edgeId) select({ t: 'edge', id: it.edgeId }, { sheet: true });
            else if (it.nodeId) select({ t: 'node', id: it.nodeId }, { sheet: true });
            else return;
            if (!isMobile() && S.tab === 'docs') setTab('canvas');
            if (it.nodeId && !isMobile()) requestAnimationFrame(() => centreOn(it.nodeId));
        };
        const actions = {
            close: () => window.PL_closePromptWorkflowStudio(),
            newWf: () => { const w = newWorkflow(`Workflow ${store.workflows.length + 1}`); store.workflows.push(w); switchTo(w.id); toast('New workflow created', 'success'); },
            toggleRail: () => { if (isMobile()) return openRail(); S.railOpen = !S.railOpen; applyRail(); },
            openRail, closeRail,
            closeSheet: () => { if (S.sel && !isMobile()) select(null); closeSheet(); },
            // The click that follows a tap on a node lands on the new backdrop, so it is ignored briefly.
            closeSheets: () => { if (Date.now() - sheetAt < 450) return; closeSheet(); closeRail(); },
            tabHealth: () => setTab('health'),
            fromPrompts: () => openPicker('multi'),
            tidy: () => tidy(),
            fit: () => fit(),
            zoomIn: () => zoomBy(0.1),
            zoomOut: () => zoomBy(-0.1),
            exportMd: () => { if (needStages()) return; download(`${slug(wf().name)}.md`, docMarkdown(wf()), 'text/markdown', 'Documentation saved as Markdown'); },
            exportHtml: () => { if (needStages()) return; download(`${slug(wf().name)}.html`, docHtml(wf()), 'text/html', 'Documentation saved as a web page'); },
            exportJson: () => { download(`${slug(wf().name)}.workflow.json`, JSON.stringify({ schema: SCHEMA, version: VERSION, exported: new Date().toISOString(), workflow: wf() }, null, 2), 'application/json', 'Workflow saved as JSON'); },
            importJson: () => openText('import'),
            copyMd: async () => { if (needStages()) return; await copyText(docMarkdown(wf())); toast('Documentation copied as Markdown', 'success'); },
            delNode: t => askDeleteNode(t.dataset.id),
            delEdge: t => askDeleteEdge(t.dataset.e),
            dupNode: () => {
                const n = S.sel && S.sel.t === 'node' && node(S.sel.id);
                if (!n || wf().nodes.length >= MAX_NODES) return;
                const c = cleanNode(JSON.parse(JSON.stringify(n)));
                c.id = rid('n');
                c.title = `${n.title} copy`.slice(0, 120);
                const spot = freeSpot(n.x + 32, n.y + 32, measure(n));
                c.x = spot.x; c.y = spot.y;
                wf().nodes.push(c);
                S.sel = { t: 'node', id: c.id };
                refresh({ inspector: true });
                toast('Stage duplicated', 'success');
            },
            connectNew: () => {
                const n = S.sel && S.sel.t === 'node' && node(S.sel.id);
                const to = $('#pws-conn-new').value;
                if (!n) return;
                if (!to) return toast('Choose which stage it connects to', 'warning');
                connect(n.id, to, $('#pws-conn-label').value);
            },
            ioAdd: t => {
                const n = node(S.sel.id), which = t.dataset.io;
                let i = 1;
                while (n[which].some(o => o.name === (which === 'inputs' ? `input_${i}` : `output_${i}`))) i++;
                n[which].push(which === 'inputs' ? { name: `input_${i}`, type: 'text', required: true } : { name: `output_${i}`, type: 'text' });
                refresh({ inspector: true });
            },
            ioDel: t => {
                const n = node(S.sel.id), which = t.dataset.io;
                const gone = n[which].splice(Number(t.dataset.i), 1)[0];
                if (which === 'inputs' && gone && !n.dismissed.includes(gone.name)) n.dismissed = [...n.dismissed, gone.name].slice(-30);
                refresh({ inspector: true });
            },
            ioDetect: t => {
                const n = node(S.sel.id), which = t.dataset.io;
                const found = which === 'inputs' ? detectVars(n.text) : detectOutputs(n.text);
                n.dismissed = n.dismissed.filter(d => !found.includes(d));
                const added = found.filter(name => !n[which].some(o => o.name === name));
                added.forEach(name => n[which].push(which === 'inputs' ? { name, type: guessType(name), required: true } : { name, type: guessType(name) }));
                refresh({ inspector: true });
                toast(added.length ? `Added ${plural(added.length, which === 'inputs' ? 'input' : 'output')}` : `No new ${which} found in the text`, added.length ? 'success' : 'info');
            },
            pickFor: t => {
                const key = t.dataset.key, id = S.sel.id;
                openPicker('single', p => {
                    const n = node(id);
                    if (!n) return;
                    if (key === 'text') { const keepTitle = n.title && n.title !== 'New prompt'; Object.assign(n, promptFields(p)); if (keepTitle) n.title = n.title; } else if (key === 'checker') { n.checker = p.content; n.checkerId = p.id; } else { n.fallback = p.content; n.fallbackId = p.id; }
                    refresh({ inspector: true });
                    toast(`Used ${p.title}`, 'success');
                });
            },
            unlink: () => { const n = node(S.sel.id); n.source = 'typed'; n.promptId = null; refresh({ inspector: true }); },
            refreshLib: async () => {
                const id = S.sel.id;
                try { await loadLib(true); } catch (e) { return toast('The library could not be read, so nothing was refreshed', 'error'); }
                const n = node(id), p = n && libById(n.promptId);
                if (!p) return toast('That prompt is no longer in the library', 'warning');
                n.text = p.content;
                detectVars(p.content).forEach(name => { if (!n.inputs.some(i => i.name === name)) n.inputs.push({ name, type: guessType(name, p.variable_meta), required: true }); });
                refresh({ inspector: true });
                toast('Prompt text refreshed from the library', 'success');
            },
            mapAdd: () => {
                const e = edge(S.sel.id), src = producedBy(wf(), e.from), ins = inputsOf(node(e.to));
                if (!src.length || !ins.length) return;
                const free = ins.find(i => !e.map.some(m => m.in === i.name)) || ins[0];
                const o = src.find(x => norm(x.name) === norm(free.name)) || src[0];
                e.map.push({ out: o.name, in: free.name });
                refresh({ inspector: true });
            },
            mapDel: t => { edge(S.sel.id).map.splice(Number(t.dataset.i), 1); refresh({ inspector: true }); },
            mapAuto: () => {
                const n = autoMap(wf(), edge(S.sel.id));
                refresh({ inspector: true });
                toast(n ? `Mapped ${plural(n, 'input')} by name` : 'No more names match. Map the rest by hand.', n ? 'success' : 'info');
            }
        };

        root.addEventListener('click', e => {
            $$('.pws-menu[open]').forEach(m => { if (!m.contains(e.target)) m.open = false; });
            const t = e.target.closest('[data-add],[data-act],[data-wf-act],[data-wf],[data-tab],[data-rtab],[data-stage],[data-focus],[data-fix],[data-select-edge],[data-close],[data-pick],[data-pick-move],[data-pick-rm],.pws-edge');
            if (!t) return;
            const menu = t.closest('.pws-menu');
            if (menu && t.classList.contains('pws-menu-item')) menu.open = false;
            if (t.classList.contains('pws-edge')) return select({ t: 'edge', id: t.dataset.edge }, { sheet: true, opener: t });
            if (t.dataset.close !== undefined) return t.closest('dialog').close();
            if (t.dataset.add) {
                if (t.dataset.add === 'prompt-lib') return openPicker('single', p => { addNode('prompt', promptFields(p)); });
                return addNode(t.dataset.add);
            }
            if (t.dataset.wfAct) {
                const id = t.dataset.wf;
                if (t.dataset.wfAct === 'rename') return openText('rename', { id, name: (store.workflows.find(w => w.id === id) || {}).name });
                if (t.dataset.wfAct === 'duplicate') return dup(id);
                return delWf(id);
            }
            if (t.dataset.wf) return switchTo(t.dataset.wf);
            if (t.dataset.act) return actions[t.dataset.act] && actions[t.dataset.act](t);
            if (t.dataset.tab) return setTab(t.dataset.tab);
            if (t.dataset.rtab) return setRtab(t.dataset.rtab);
            if (t.dataset.stage) { const n = node(t.dataset.stage); select({ t: 'node', id: t.dataset.stage }, { sheet: true, opener: t }); if (n && !isMobile()) centreOn(n.id); return; }
            if (t.dataset.focus !== undefined) return focusItem(S.health.items[Number(t.dataset.focus)] || {});
            if (t.dataset.fix !== undefined) { const it = S.health.items[Number(t.dataset.fix)]; return it && it.fix && runFix(it.fix); }
            if (t.dataset.selectEdge) return select({ t: 'edge', id: t.dataset.selectEdge });
            if (t.dataset.pick) {
                const p = libById(Number(t.dataset.pick));
                if (!p) return;
                if (pick.mode === 'single') { const cb = pick.cb; $('#pws-pick-dialog').close(); if (cb) cb(p); return; }
                const at = pick.order.indexOf(p.id);
                if (at >= 0) pick.order.splice(at, 1); else if (pick.order.length < 24) pick.order.push(p.id); else toast('A generated workflow takes up to 24 prompts', 'warning');
                return renderPick();
            }
            if (t.dataset.pickMove !== undefined) { const i = Number(t.dataset.pickMove), j = i + Number(t.dataset.dir); if (pick.order[j] !== undefined) { [pick.order[i], pick.order[j]] = [pick.order[j], pick.order[i]]; renderPick(); const b = $(`[data-pick-move="${j}"][data-dir="${t.dataset.dir}"]`); if (b) b.focus(); } return; }
            if (t.dataset.pickRm !== undefined) { pick.order.splice(Number(t.dataset.pickRm), 1); return renderPick(); }
        });
        // The health and mobile badges are spans, so Enter and Space need to work on them.
        root.addEventListener('keydown', e => {
            if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.pws-badge[role="button"]')) { e.preventDefault(); actions.tabHealth(); }
        });

        function setNodeField(n, key, value) {
            if (n.kind === 'input' && key === 'name' || n.kind === 'output' && key === 'name') {
                const v = s(value, 60);
                if (n.kind === 'input') renameIO(n.id, 'out', n.name, v); else renameIO(n.id, 'in', n.name, v);
                n.name = v;
            } else n[key] = value;
        }
        // While a prompt is typed, variables it mentions become inputs unless the user removed them.
        let detT = 0;
        function autoDetect(id) {
            const n = node(id);
            if (!n || n.kind !== 'prompt' || !S.sel || S.sel.id !== id) return;
            let changedIO = false;
            detectVars(n.text).slice(0, 30).forEach(name => {
                if (n.inputs.length < 30 && !n.inputs.some(i => i.name === name) && !n.dismissed.includes(name)) { n.inputs.push({ name, type: guessType(name), required: true }); changedIO = true; }
            });
            const outs = detectOutputs(n.text).slice(0, 10);
            const untouched = n.outputs.length === 1 && n.outputs[0].name === 'result';
            if (outs.length && untouched) { n.outputs = outs.map(name => ({ name, type: guessType(name) })); changedIO = true; }
            if (!changedIO) return;
            const wrap = $('#pws-io-wrap');
            if (wrap) wrap.innerHTML = ioRows(n, 'inputs') + ioRows(n, 'outputs');
            refresh();
        }
        root.addEventListener('input', e => {
            const t = e.target;
            if (t.dataset.f === 'text' && S.sel && S.sel.t === 'node') { clearTimeout(detT); const id = S.sel.id; detT = setTimeout(() => autoDetect(id), 600); }
            if (t.id === 'pws-name') { wf().name = t.value; $('#pws-mobile-name').textContent = t.value || 'Untitled workflow'; renderRail(); docDirty(); changed(); return; }
            if (t.dataset.wfF) { wf()[t.dataset.wfF] = t.value; if (t.dataset.wfF === 'name') { renderRail(); $('#pws-name').value = t.value; } docDirty(); changed(); return; }
            if (t.id === 'pws-pick-search') { pick.q = t.value; return renderPick(); }
            if (t.dataset.io !== undefined && t.dataset.k === 'name') {
                const n = node(S.sel.id), o = n[t.dataset.io][Number(t.dataset.i)];
                if (!o) return;
                const v = s(t.value, 60).trim();
                if (v) { renameIO(n.id, t.dataset.io === 'inputs' ? 'in' : 'out', o.name, v); o.name = v; }
                return refreshSoon();
            }
            if (t.dataset.f && S.sel && S.sel.t === 'node') {
                const n = node(S.sel.id);
                if (!n) return;
                let v = t.value;
                if (t.hasAttribute('data-num')) v = num(v, Number(t.min), Number(t.max), 0);
                else if (t.hasAttribute('data-lines')) v = lines(v.split('\n'), 40);
                setNodeField(n, t.dataset.f, v);
                refreshSoon();
            }
        });
        root.addEventListener('change', e => {
            const t = e.target;
            if (t.id === 'pws-add-select') { const k = t.value; t.value = ''; if (k) addNode(k); return; }
            if (t.id === 'pws-opt-val') { $('#pws-opt-rec').disabled = !t.checked; return; }
            if (t.dataset.io !== undefined && (t.dataset.k === 'type' || t.dataset.k === 'required')) {
                const n = node(S.sel.id), o = n[t.dataset.io][Number(t.dataset.i)];
                if (!o) return;
                if (t.dataset.k === 'type') o.type = oneOf(t.value, TYPES, 'text'); else o.required = t.checked;
                return refresh({ inspector: true });
            }
            if (t.hasAttribute('data-onfail')) return setFailTarget(S.sel.id, t.value);
            if (t.hasAttribute('data-edge-label')) {
                const ed = edge(S.sel.id), v = oneOf(t.value, LABELS, 'always');
                if (wf().edges.some(x => x !== ed && x.from === ed.from && x.to === ed.to && x.label === v)) { toast('That connection already exists with this label', 'warning'); t.value = ed.label; return; }
                ed.label = v;
                return refresh({ inspector: true });
            }
            if (t.dataset.conn) {
                const ed = edge(t.dataset.e);
                if (!ed) return;
                if (t.dataset.conn === 'label') {
                    const v = oneOf(t.value, LABELS, 'always');
                    if (wf().edges.some(x => x !== ed && x.from === ed.from && x.to === ed.to && x.label === v)) { toast('That connection already exists with this label', 'warning'); return renderInspector(); }
                    ed.label = v;
                } else if (t.value) {
                    if (wf().edges.some(x => x !== ed && x.from === ed.from && x.to === t.value && x.label === ed.label)) { toast('That connection already exists', 'warning'); return renderInspector(); }
                    ed.to = t.value;
                    ed.map = [];
                    autoMap(wf(), ed);
                }
                return refresh({ inspector: true });
            }
            if (t.dataset.map) {
                const ed = edge(S.sel.id), m = ed && ed.map[Number(t.dataset.i)];
                if (!m) return;
                m[t.dataset.map] = t.value;
                return refresh({ inspector: true });
            }
            if (t.dataset.f && S.sel && S.sel.t === 'node' && t.tagName === 'SELECT') {
                const n = node(S.sel.id);
                n[t.dataset.f] = t.value;
                if (t.dataset.f === 'type' && (n.kind === 'input' || n.kind === 'output')) n.type = oneOf(t.value, TYPES, 'text');
                refresh({ inspector: true });
            }
        });

        /* ---------- canvas pointer handling ---------- */
        let drag = null;
        const ptrs = new Map();
        const toCanvas = ev => { const r = els.canvas.getBoundingClientRect(), v = wf().view; return { x: (ev.clientX - r.left - v.x) / v.z, y: (ev.clientY - r.top - v.y) / v.z }; };
        let wireRaf = 0;
        const wiresSoon = () => { if (wireRaf) return; wireRaf = requestAnimationFrame(() => { wireRaf = 0; renderWires(); }); };
        function zoomTo(z, cx, cy) {
            const v = wf().view;
            z = clamp(z, MIN_Z, MAX_Z);
            const k = z / v.z;
            v.x = cx - (cx - v.x) * k;
            v.y = cy - (cy - v.y) * k;
            v.z = z;
            applyView();
        }
        els.canvas.addEventListener('pointerdown', e => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (e.target.closest('.pws-float, .pws-empty, .pws-edge')) return;
            ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (ptrs.size === 2) {
                const [a, b] = [...ptrs.values()];
                drag = { mode: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: wf().view.z, moved: true };
                return;
            }
            if (ptrs.size > 2) return;
            const port = e.target.closest('.pws-port[data-dir="out"]');
            const nEl = e.target.closest('.pws-node');
            const v = wf().view;
            try { els.canvas.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
            if (port && nEl && !isMobile()) {
                drag = { mode: 'wire', from: nEl.dataset.id, label: port.dataset.label, sx: e.clientX, sy: e.clientY, moved: false };
                e.preventDefault();
            } else if (nEl && !isMobile()) {
                const n = node(nEl.dataset.id);
                drag = { mode: 'node', id: n.id, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y, moved: false };
                if (!S.sel || S.sel.t !== 'node' || S.sel.id !== n.id) select({ t: 'node', id: n.id });
                if (!isMobile()) setRtab('inspect');
            } else drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, ox: v.x, oy: v.y, moved: false, tap: nEl ? nEl.dataset.id : null };
        });
        els.canvas.addEventListener('pointermove', e => {
            if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (!drag) return;
            if (drag.mode === 'pinch') {
                if (ptrs.size < 2) return;
                const [a, b] = [...ptrs.values()], r = els.canvas.getBoundingClientRect();
                zoomTo(drag.z0 * (Math.hypot(a.x - b.x, a.y - b.y) / drag.d0), (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
                return;
            }
            const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
            if (!drag.moved && Math.hypot(dx, dy) > 4) { drag.moved = true; if (drag.mode === 'pan') els.canvas.classList.add('pws-panning'); }
            if (!drag.moved) return;
            const v = wf().view;
            if (drag.mode === 'pan') { v.x = drag.ox + dx; v.y = drag.oy + dy; applyView(); }
            else if (drag.mode === 'node') {
                const n = node(drag.id), el = nodeEl(drag.id);
                n.x = snap(drag.ox + dx / v.z);
                n.y = snap(drag.oy + dy / v.z);
                el.style.left = n.x + 'px';
                el.style.top = n.y + 'px';
                wiresSoon();
            } else if (drag.mode === 'wire') {
                const a = portPoint(drag.from, 'out', drag.label), b = toCanvas(e);
                els.temp.hidden = false;
                els.temp.setAttribute('d', curve(a, b));
                const over = document.elementFromPoint(e.clientX, e.clientY);
                const tn = over && over.closest('.pws-node');
                $$('.pws-node[data-drop]').forEach(x => { if (x !== tn) x.removeAttribute('data-drop'); });
                if (tn && root.contains(tn) && tn.dataset.id !== drag.from) { const k = node(tn.dataset.id).kind; if (k !== 'input' && k !== 'context') tn.setAttribute('data-drop', ''); }
            }
        });
        const endDrag = e => {
            ptrs.delete(e.pointerId);
            if (!drag) return;
            if (drag.mode === 'pinch') { if (ptrs.size < 2) { drag = null; changed(false); } return; }
            const d = drag;
            drag = null;
            els.canvas.classList.remove('pws-panning');
            $$('.pws-node[data-drop]').forEach(x => x.removeAttribute('data-drop'));
            if (d.mode === 'wire') {
                els.temp.hidden = true;
                if (e.type === 'pointerup' && d.moved) {
                    const el = document.elementFromPoint(e.clientX, e.clientY), tn = el && el.closest('.pws-node');
                    if (tn && root.contains(tn) && tn.dataset.id !== d.from) connect(d.from, tn.dataset.id, d.label);
                }
            } else if (d.mode === 'node') {
                if (d.moved) { renderWires(); renderStages(); docDirty(); changed(); }
            } else if (d.mode === 'pan') {
                if (d.moved) changed(false);
                else if (d.tap) select({ t: 'node', id: d.tap }, { sheet: true, opener: nodeEl(d.tap) });
                else if (S.sel) select(null);
            }
        };
        els.canvas.addEventListener('pointerup', endDrag);
        els.canvas.addEventListener('pointercancel', endDrag);
        els.canvas.addEventListener('wheel', e => {
            e.preventDefault();
            const r = els.canvas.getBoundingClientRect();
            zoomBy(e.deltaY < 0 ? 0.06 : -0.06, e.clientX - r.left, e.clientY - r.top);
        }, { passive: false });

        /* ---------- keyboard ---------- */
        function trap(e, container) {
            const f = $$('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]', container).filter(x => x.offsetParent !== null);
            if (!f.length) return;
            const first = f[0], last = f[f.length - 1];
            if (!container.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
            else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
        root.addEventListener('keydown', e => {
            const t = e.target;
            if (e.key === 'Tab' && isMobile()) {
                if (sheetOpen()) return trap(e, els.side);
                if (root.dataset.rail === 'open') return trap(e, els.rail);
            }
            const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
            if (t.matches && t.matches('#pws-tabs [role="tab"], #pws-side-tabs [role="tab"]') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                const tabs = $$('[role="tab"]', t.parentElement).filter(x => x.offsetParent !== null);
                const next = tabs[(tabs.indexOf(t) + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
                e.preventDefault();
                next.focus();
                next.click();
                return;
            }
            if (!typing && t.classList && t.classList.contains('pws-node')) {
                const n = node(t.dataset.id);
                const step = e.shiftKey ? GRID * 4 : GRID;
                const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
                if (n && mv && !isMobile()) {
                    e.preventDefault();
                    n.x = snap(n.x) + mv[0];
                    n.y = snap(n.y) + mv[1];
                    t.style.left = n.x + 'px';
                    t.style.top = n.y + 'px';
                    renderWires();
                    renderStages();
                    docDirty();
                    changed();
                    return;
                }
                if (n && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select({ t: 'node', id: n.id }, { sheet: true, opener: t }); return; }
                if (n && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); askDeleteNode(n.id); return; }
            }
            if (!typing && t.classList && t.classList.contains('pws-edge') || (!typing && t.closest && t.closest('.pws-edge') === t)) {
                const id = t.dataset.edge;
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select({ t: 'edge', id }, { sheet: true, opener: t }); return; }
                if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); askDeleteEdge(id); return; }
            }
            if (t === els.canvas && e.key.startsWith('Arrow')) {
                const v = wf().view, d = { ArrowLeft: [48, 0], ArrowRight: [-48, 0], ArrowUp: [0, 48], ArrowDown: [0, -48] }[e.key];
                e.preventDefault();
                v.x += d[0];
                v.y += d[1];
                applyView();
                return;
            }
            if (e.key === 'Escape') {
                if ($('dialog[open]')) return;
                const menus = $$('.pws-menu[open]');
                if (menus.length) { menus.forEach(m => { m.open = false; }); e.preventDefault(); return; }
                if (sheetOpen()) { closeSheet(); return; }
                if (root.dataset.rail === 'open') { closeRail(); return; }
                if (typing) { t.blur(); return; }
                if (S.sel) { select(null); return; }
                window.PL_closePromptWorkflowStudio();
            }
        });
        // Only acts while the studio is open and focus has fallen back to the page.
        document.addEventListener('keydown', e => {
            if (!isOpen()) return;
            if (e.key === 'Escape' && e.target === document.body && !$('dialog[open]')) window.PL_closePromptWorkflowStudio();
        });
        $('#pws-pick-dialog').addEventListener('close', () => { pick.cb = null; });
        $$('dialog', root).forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

        const onBreak = () => {
            closeSheet();
            closeRail();
            if (!isMobile() && (S.tab === 'stages' || S.tab === 'health')) setTab('canvas'); else if (isMobile() && S.tab === 'canvas' && !shownOnce) setTab('stages'); else setTab(S.tab);
            if (isOpen()) requestAnimationFrame(renderWires);
        };
        if (mq.addEventListener) mq.addEventListener('change', onBreak);
        window.addEventListener('resize', () => { if (isOpen()) requestAnimationFrame(renderWires); });
        window.addEventListener('pagehide', flush);

        /* ---------- show and hide ---------- */
        let shownOnce = false, opener = null;
        function show() {
            opener = document.activeElement;
            if (!shownOnce) {
                shownOnce = true;
                S.railOpen = window.innerWidth >= 1100;
                S.tab = isMobile() ? 'stages' : 'canvas';
            }
            applyRail();
            setRtab(S.rtab);
            setTab(S.tab);
            applyView();
            refresh({ inspector: true, touch: false });
            renderRail();
            requestAnimationFrame(() => {
                renderNodes();
                renderWires();
                if (S.needFit) fit(S.needFit);
                const f = isMobile() ? $('#pws-tab-stages') : $('#pws-tab-canvas');
                if (f) f.focus({ preventScroll: true });
            });
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (isOpen()) renderWires(); });
        }
        function hide() {
            $$('dialog[open]').forEach(d => d.close());
            $$('.pws-menu[open]').forEach(m => { m.open = false; });
            closeSheet();
            closeRail();
            flush();
            const o = opener;
            opener = null;
            return o;
        }

        return {
            store, S, wf, show, hide, refresh, select, connect, addNode, generateWorkflow, analyse, docMarkdown, docHtml, importWorkflow,
            tidy, fit, switchTo, setTab, node, edge, flush, layoutWorkflow, orderNodes, producedBy, autoMap, loadLib
        };
    }

    /* ---------- public entry points ---------- */
    function ensureRoot() {
        let r = document.getElementById(ROOT_ID);
        if (!r && document.body) {
            r = document.createElement('div');
            r.id = ROOT_ID;
            document.body.appendChild(r);
        }
        return r;
    }
    function ensure() {
        const r = ensureRoot();
        if (!r) return null;
        if (!api) {
            r.setAttribute('role', 'region');
            r.setAttribute('aria-label', 'Prompt Workflow Studio');
            api = mount(r);
        }
        return r;
    }
    function closeStudio() {
        const r = document.getElementById(ROOT_ID);
        if (!r || !r.classList.contains('open')) return;
        const o = api ? api.hide() : null;
        r.classList.remove('open');
        document.querySelectorAll('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === 'library'));
        if (o && o.isConnected && !r.contains(o)) o.focus({ preventScroll: true });
    }
    window.openPromptWorkflowStudioWorkspace = function () {
        if (!document.body.classList.contains('is-premium')) return toast('Prompt Workflow Studio is a Pro feature', 'warning');
        const r = ensure();
        if (!r) return;
        r.classList.add('open');
        document.querySelectorAll('.nav-item[data-view]').forEach(el => el.classList.remove('active'));
        api.show();
    };
    window.PL_closePromptWorkflowStudio = closeStudio;
    Object.defineProperty(window, '__pws', { configurable: true, get: () => api });

    if (document.body) ensureRoot();
    else document.addEventListener('DOMContentLoaded', ensureRoot);
})();
