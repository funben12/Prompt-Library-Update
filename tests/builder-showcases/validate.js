// Checks Builder Pro showcase workflows: shape, ports, layout, text rules and a full compile.
// Usage: node tests/builder-showcases/validate.js            (every showcase in static/builder-pro-showcases.js)
//        node tests/builder-showcases/validate.js draft.js   (draft files that set module.exports to one showcase)
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const noop = () => {};
const stub = () => new Proxy(function () {}, { get: (t, k) => k === 'classList' ? { add: noop, remove: noop, toggle: noop, contains: () => false } : k === 'style' ? {} : k === 'querySelectorAll' ? () => [] : k === 'querySelector' ? () => null : stub(), apply: () => stub(), set: () => true });
global.window = global;
global.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, createElement: stub, body: stub(), documentElement: stub() };
global.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
global.addEventListener = noop;
const quiet = console.log;
console.log = () => {};
require(path.join(root, 'static/builder-pro-engine.js'));
require(path.join(root, 'static/components-data.js'));
require(path.join(root, 'static/builder-pro.js'));
require(path.join(root, 'static/builder-pro-showcases.js'));
console.log = quiet;

const PB = window.PLBuilder, PE = PB.engine, BLOCKS = PE.BLOCKS;
const COL = 354, ROW = 190;
const outIds = t => { const b = BLOCKS[t]; return Array.isArray(b.outputs) ? b.outputs.map(p => p.id) : b.outputs === false ? [] : ['out']; };
const inIds = t => { const b = BLOCKS[t]; return b.inputs === true ? ['in'] : Array.isArray(b.inputs) ? b.inputs.map(p => p.id) : []; };
const isAgent = t => BLOCKS[t] && BLOCKS[t].category === 'agents';
const GROUPS = ['Teams at work', 'Prompt engineering', 'Meta prompting', 'Modular prompts', 'Templates'];
const DASH = /[‒–—―]|\s-\s/;

function strings(v, out = []) {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(x => strings(x, out));
    else if (v && typeof v === 'object') Object.values(v).forEach(x => strings(x, out));
    return out;
}

function validate(sc) {
    const errors = [], warnings = [];
    const err = m => errors.push(m);
    ['id', 'title', 'tagline', 'about'].forEach(k => { if (!sc[k] || typeof sc[k] !== 'string') err(`missing text field: ${k}`); });
    if (!GROUPS.includes(sc.group)) err(`group must be one of: ${GROUPS.join(', ')}`);
    if (sc.title && sc.title.length > 34) err(`title longer than 34 characters (${sc.title.length})`);
    if (sc.tagline && sc.tagline.length > 120) err(`tagline longer than 120 characters (${sc.tagline.length})`);
    if (sc.about && sc.about.length > 420) err(`about longer than 420 characters (${sc.about.length})`);
    if (!Array.isArray(sc.chapters) || sc.chapters.length < 3 || sc.chapters.length > 7) { err('needs 3 to 7 chapters'); return { errors, warnings }; }
    strings({ ...sc }).forEach(s => { if (DASH.test(s)) err(`dash punctuation in: "${s.slice(0, 70)}"`); });

    const built = PB.showcaseBuild(sc);
    const keys = new Map(), cells = new Set();
    const nodes = [], edges = [];
    built.forEach((ch, ci) => {
        const label = `chapter ${ci + 1}`;
        if (!ch.title || ch.title.length > 36) err(`${label}: title missing or over 36 characters`);
        if (!ch.blurb || ch.blurb.length > 340) err(`${label}: blurb missing or over 340 characters`);
        if (ch.missing.length) err(`${label}: unknown block or Component Library record for key(s) ${ch.missing.join(', ')}`);
        if (ch.nodes.length < 2 || ch.nodes.length > 6) err(`${label}: needs 2 to 6 blocks (has ${ch.nodes.length})`);
        ch.nodes.forEach(n => {
            if (keys.has(n.k)) err(`${label}: duplicate key ${n.k}`);
            keys.set(n.k, n.type);
            const cell = n.col + ',' + n.row;
            if (cells.has(cell)) err(`${label}: ${n.k} sits on the same cell as another block (${cell})`);
            cells.add(cell);
            if (!(n.col >= 0 && n.col <= 9 && n.row >= 0 && n.row <= 5)) err(`${label}: ${n.k} is outside columns 0 to 9 or rows 0 to 5`);
            nodes.push({ id: n.k, type: n.type, x: n.x, y: n.y, config: n.config });
            // Text rules apply to what the showcase wrote, not to library records.
            const own = (sc.chapters[ci].nodes.find(x => x.k === n.k) || {});
            strings(own.set || {}).concat(own.comp ? strings(own.comp[2] || {}) : []).concat(own.title ? [own.title] : []).forEach(s => { if (DASH.test(s)) err(`${label}: dash punctuation in ${n.k}: "${s.slice(0, 60)}"`); });
            if (n.type.startsWith('component_')) {
                const left = (n.config.content.match(/\[\[[^\]\n]+\]\]|\[[^\[\]\n]+\]/g) || []).filter(x => x.replace(/[\[\]\s]/g, '') !== '' && x !== '[x]');
                if (left.length) err(`${label}: ${n.k} still has unfilled blanks ${left.join(' ')}`);
            }
        });
        ch.wires.forEach(w => {
            const [f, fp, t, tp] = w;
            if (!keys.has(f)) return err(`${label}: wire from unknown key ${f}`);
            if (!keys.has(t)) return err(`${label}: wire to unknown key ${t}`);
            if (!outIds(keys.get(f)).includes(fp)) err(`${label}: ${f} (${keys.get(f)}) has no output port "${fp}". It has: ${outIds(keys.get(f)).join(', ')}`);
            if (!inIds(keys.get(t)).includes(tp)) err(`${label}: ${t} (${keys.get(t)}) has no input port "${tp}". It has: ${inIds(keys.get(t)).join(', ')}`);
            edges.push({ id: `e${edges.length + 1}`, from: f, fromPort: fp, to: t, toPort: tp });
        });
    });
    // The resolver pushes overlapping blocks down, so check the finished layout is not absurdly tall.
    const lowest = Math.max(0, ...nodes.map(n => n.y));
    if (lowest > 1500) err(`layout: the lowest block starts ${lowest}px down. Spread blocks across more columns or rows so no column holds more than about 4 tall blocks`);
    if (nodes.length < 12 || nodes.length > 28) err(`needs 12 to 28 blocks in total (has ${nodes.length})`);
    const agents = [...new Set(nodes.map(n => n.type).filter(isAgent))];
    const comps = nodes.filter(n => n.type.startsWith('component_'));
    const cats = [...new Set(comps.map(n => n.config.source.cat))];
    if (agents.length < 6) err(`needs at least 6 different agent blocks (has ${agents.length})`);
    if (comps.length < 3 || cats.length < 3) err(`needs at least 3 Component Library blocks from 3 categories (has ${comps.length} from ${cats.length})`);

    let result = null;
    if (!errors.length) {
        const compileNodes = nodes.map(n => n.type.startsWith('component_') ? { ...n, config: { ...n.config, content: n.config.content } } : n);
        result = PE.compilePrompt(compileNodes, edges, { format: 'markdown', order: 'canonical', sample: false, title: sc.title });
        const covers = { role: ['role', 'system'], task: ['task', 'instructions'], output: ['output'] };
        const active = new Set(result.activeIds);
        const missing = result.missing.filter(m => !nodes.some(n => n.type.startsWith('component_') && active.has(n.id) && covers[m].includes(n.type.slice('component_'.length))));
        if (missing.length) err(`compile: prompt is missing ${missing.join(', ')}`);
        result.diagnostics.forEach(d => {
            if (d.level === 'error') err(`compile error ${d.code}: ${d.message}`);
            else if (d.level === 'warning') err(`compile warning ${d.code}: ${d.message}`);
        });
        const idle = nodes.filter(n => !active.has(n.id)).map(n => n.id);
        if (idle.length) err(`blocks left out of the prompt (not wired in): ${idle.join(', ')}`);
    }
    return { errors, warnings, stats: { blocks: nodes.length, wires: edges.length, chapters: built.length, agents, comps: comps.length, cats, chars: result ? result.text.length : 0 } };
}

const files = process.argv.slice(2);
const list = files.length ? files.map(f => require(path.resolve(f))) : PB.showcases;
let bad = 0;
const seenAgents = new Set();
list.forEach(sc => {
    const r = validate(sc);
    if (r.errors.length) { bad++; quiet(`FAIL ${sc.id || '(no id)'}`); r.errors.forEach(e => quiet('  - ' + e)); return; }
    r.stats.agents.forEach(a => seenAgents.add(a));
    quiet(`OK   ${sc.id}: ${r.stats.blocks} blocks, ${r.stats.wires} wires, ${r.stats.chapters} chapters, ${r.stats.agents.length} agent types, ${r.stats.comps} components from ${r.stats.cats.join('/')}, prompt ${r.stats.chars} chars`);
});
const allAgents = PE.LIBRARY.filter(b => b.category === 'agents').map(b => b.type);
if (!files.length) quiet(`Agent blocks never used: ${allAgents.filter(a => !seenAgents.has(a)).join(', ') || 'none'}`);
if (!list.length) quiet('No showcases found.');
process.exit(bad ? 1 : 0);
