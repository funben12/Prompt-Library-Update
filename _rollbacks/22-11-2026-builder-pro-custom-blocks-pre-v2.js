/* Prompt Builder Pro: Block Studio and Your Blocks.
   Users design their own blocks: inputs, outputs, settings, instructions, and whole agent or team blocks.
   Saved blocks live in the database (component_blocks, category "yours") so they also appear in the Component Library.
   This file loads right after the engine and before builder-pro.js. It only extends the engine's shared BLOCKS, LIBRARY
   and CATEGORIES objects and never assigns to the engine's exports. */
(function () {
    "use strict";
    const PB = window.PLBuilder;
    if (!PB || window.PLBlockStudio) return;
    const PE = PB.engine, BLOCKS = PE.BLOCKS, LIBRARY = PE.LIBRARY, CATEGORIES = PE.CATEGORIES;
    const CACHE = "prompt-builder-pro.custom-blocks.v2", LEGACY = "prompt-builder-pro.custom-blocks.v1", PREFIX = "user_block_";
    const TOKEN = /\{\{\s*(input|output|setting)\s*:\s*([\w.-]+)\s*\}\}/g;

    const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const slug = s => String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32);
    const toast = (m, k) => { if (window.PL_toast) window.PL_toast(m, k || "info"); };
    const clone = o => JSON.parse(JSON.stringify(o));
    const ms = (name, cls) => `<span class="material-symbols-outlined${cls ? " " + cls : ""}" aria-hidden="true">${name}</span>`;
    const listOf = a => a.length > 1 ? a.slice(0, -1).join(", ") + " and " + a[a.length - 1] : a[0] || "";

    const PORT_TYPES = [["text", "Text"], ["prompt", "Prompt"], ["list", "List"], ["json", "Data (JSON)"], ["number", "Number"], ["flag", "Yes or no"]];
    const SETTING_TYPES = [["text", "Short text"], ["textarea", "Long text"], ["number", "Number"], ["select", "Dropdown"]];
    const ROLES = [
        { id: "standard", name: "Standard block", icon: "widgets", line: "Adds its text to a section of the prompt, like a role or a rule." },
        { id: "worker", name: "Agent", icon: "smart_toy", line: "One team member with one job. Wire it to other agents." },
        { id: "reviewer", name: "Reviewer", icon: "fact_check", line: "Checks work, then sends it back or decides." },
        { id: "coordinator", name: "Team coordinator", icon: "hub", line: "Briefs a team of agents you choose, one per output." }
    ];
    const ICON_SET = ["widgets", "smart_toy", "psychology", "travel_explore", "edit_note", "fact_check", "balance", "hub", "forum", "rule", "bolt", "lightbulb", "shield", "translate", "code", "analytics", "inventory_2", "support_agent", "auto_awesome", "tune"];
    const SECTIONS = PE.SECTIONS.filter(s => s.id !== "agents");
    const SECTION_IDS = SECTIONS.map(s => s.id);

    /* ---------------- definitions ---------------- */
    let defs = [];
    let plainRows = [];
    const typeLabel = t => (PORT_TYPES.find(x => x[0] === t) || PORT_TYPES[0])[1];

    function uniqueIds(list) {
        const seen = new Set();
        list.forEach(item => {
            let id = item.id || "item", n = 2;
            while (seen.has(id)) id = (item.id || "item") + "_" + n++;
            item.id = id;
            seen.add(id);
        });
        return list;
    }
    function portsOf(list) {
        return uniqueIds((Array.isArray(list) ? list : []).map(p => {
            const label = String(p && p.label || "").trim().slice(0, 40);
            if (!label) return null;
            return { id: slug(p.id || label) || "port", label, type: PORT_TYPES.some(t => t[0] === p.type) ? p.type : "text", desc: String(p.desc || "").trim().slice(0, 160) };
        }).filter(Boolean));
    }
    function settingsOf(list) {
        return uniqueIds((Array.isArray(list) ? list : []).map(s => {
            const label = String(s && s.label || "").trim().slice(0, 40);
            if (!label) return null;
            const type = SETTING_TYPES.some(t => t[0] === s.type) ? s.type : "text";
            const options = type === "select" ? (Array.isArray(s.options) ? s.options : String(s.options || "").split(",")).map(o => String(o).trim()).filter(Boolean).slice(0, 24) : [];
            let def = s.defaultValue == null ? "" : String(s.defaultValue);
            if (type === "select" && options.length && !options.includes(def)) def = options[0];
            return { id: slug(s.id || label) || "setting", label, type, defaultValue: def, options };
        }).filter(Boolean));
    }
    // Any saved shape (older versions included) comes back as one clean definition, or null.
    function normalise(raw) {
        if (!raw || typeof raw !== "object") return null;
        const label = String(raw.label || "").trim().slice(0, 60);
        if (!label) return null;
        const role = ROLES.some(r => r.id === raw.role) ? raw.role : raw.category === "agents" ? "worker" : "standard";
        const d = {
            schema: 2, kind: "builder-block", type: String(raw.type || ""), label,
            hint: String(raw.hint || "").trim().slice(0, 120), about: String(raw.about || "").trim().slice(0, 400),
            icon: ICON_SET.includes(raw.icon) ? raw.icon : role === "standard" ? "widgets" : "smart_toy",
            role, section: SECTION_IDS.includes(raw.section) ? raw.section : "instructions",
            inputs: portsOf(raw.inputs), outputs: portsOf(raw.outputs), settings: settingsOf(raw.settings),
            template: String(raw.template != null ? raw.template : "").slice(0, 8000), roster: {}
        };
        if (!/^[A-Za-z0-9_]+$/.test(d.type)) d.type = PREFIX + (slug(label) || "block") + "_" + Date.now().toString(36);
        if (role === "coordinator" && raw.roster && typeof raw.roster === "object") {
            d.outputs.forEach(o => { if (typeof raw.roster[o.id] === "string" && raw.roster[o.id]) d.roster[o.id] = raw.roster[o.id]; });
        }
        if (raw.dbId) d.dbId = raw.dbId;
        return d;
    }

    function toBlock(d) {
        const agent = d.role !== "standard";
        const fields = [{ key: "content", label: agent ? "Agent instructions" : "Instructions", type: "textarea", rows: 8, placeholder: "" }];
        const defaults = { title: d.label, content: d.template };
        d.settings.forEach(s => {
            fields.push({ key: "setting_" + s.id, label: s.label, type: s.type, options: s.options, rows: 3, placeholder: "" });
            defaults["setting_" + s.id] = s.type === "number" && s.defaultValue !== "" && !isNaN(Number(s.defaultValue)) ? Number(s.defaultValue) : s.defaultValue;
        });
        const ins = d.inputs.map(p => ({ id: p.id, label: p.label, type: p.type, desc: p.desc }));
        const outs = d.outputs.map(p => ({ id: p.id, label: p.label, type: p.type, desc: p.desc }));
        const roleName = (ROLES.find(r => r.id === d.role) || ROLES[0]).name.toLowerCase();
        return {
            type: d.type, label: d.label, hint: d.hint || "Your own " + roleName,
            about: d.about || `Your own ${roleName}. ${ins.length ? "It takes in " + listOf(ins.map(p => p.label)) + "." : "It has no inputs, so it only feeds other blocks."} ${outs.length ? "It hands out " + listOf(outs.map(p => p.label)) + "." : ""}`.trim(),
            use: [
                ins.length ? "Wire into: " + ins.map(p => p.label + (p.desc ? " (" + p.desc + ")" : "")).join("; ") + "." : "Wire its output into any block that needs it.",
                "Fill in the settings below to change how it behaves. Each copy on the canvas keeps its own settings.",
                "Use the pencil in Your Blocks to change the design. Copies already on the canvas keep their own text."
            ],
            category: agent ? "agents" : "yours", kind: agent ? d.role : "custom", glyph: "", section: agent ? "agents" : d.section,
            inputs: ins.length ? ins : false, outputs: outs.length ? outs : [{ id: "out", label: "Next" }],
            fields, defaults, customBlock: true, icon: d.icon, def: d
        };
    }

    function register(raw) {
        const d = normalise(raw);
        if (!d) return null;
        const b = toBlock(d);
        BLOCKS[d.type] = b;
        const i = LIBRARY.findIndex(x => x.type === d.type);
        if (i < 0) LIBRARY.push(b); else LIBRARY[i] = b;
        const k = defs.findIndex(x => x.type === d.type);
        if (k < 0) defs.push(d); else defs[k] = d;
        syncSpawn();
        return d;
    }
    function unregister(type) {
        delete BLOCKS[type];
        const i = LIBRARY.findIndex(x => x.type === type);
        if (i >= 0) LIBRARY.splice(i, 1);
        defs = defs.filter(x => x.type !== type);
        syncSpawn();
    }
    if (!CATEGORIES.some(c => c.id === "yours")) CATEGORIES.unshift({ id: "yours", label: "Your Blocks", chip: "Yours" });

    // A team coordinator lists the agent each output briefs, so "Add its agents and wire them" works for it too.
    function syncSpawn() {
        const spawn = window.PLBuilderSpawn = window.PLBuilderSpawn || {};
        defs.forEach(d => {
            delete spawn[d.type];
            if (d.role !== "coordinator") return;
            const map = {};
            d.outputs.forEach(o => {
                const t = d.roster && d.roster[o.id];
                if (!t || !BLOCKS[t] || t === d.type) return;
                const ins = BLOCKS[t].inputs;
                map[o.id] = [t, Array.isArray(ins) && ins[0] ? ins[0].id : "in"];
            });
            if (Object.keys(map).length) spawn[d.type] = map;
        });
    }

    /* ---------------- compiling ---------------- */
    // Tokens are resolved on a copy of the nodes, so the text stored on the canvas never changes.
    function resolve(d, config, edges) {
        const c = config || {};
        return String(c.content == null ? "" : c.content).replace(TOKEN, (m, kind, key) => {
            if (kind === "setting") {
                const s = d.settings.find(x => x.id === key);
                if (!s) return m;
                const v = c["setting_" + key];
                return String(v === undefined || v === "" ? s.defaultValue : v);
            }
            if (kind === "input") {
                const p = d.inputs.find(x => x.id === key);
                if (!p) return m;
                const from = (edges || []).filter(e => e.__to === key).map(e => e.__from);
                return from.length ? `the "${p.label}" supplied by ${listOf([...new Set(from)])}` : `the "${p.label}" (nothing is connected to it yet)`;
            }
            const p = d.outputs.find(x => x.id === key);
            return p ? `"${p.label}"` : m;
        });
    }
    function prepare(nodes, edges) {
        const byId = new Map(nodes.map(n => [n.id, n]));
        return nodes.map(n => {
            const b = BLOCKS[n.type];
            if (!b || !b.customBlock) return n;
            const mine = (edges || []).filter(e => e.to === n.id).map(e => {
                const src = byId.get(e.from);
                return { __to: e.toPort || "in", __from: src ? PE.titleOf(src) : "" };
            }).filter(e => e.__from);
            const content = resolve(b.def, n.config, mine);
            return Object.assign({}, n, { config: Object.assign({}, n.config, { content }) });
        });
    }
    // Component Library text: tokens become [blanks], the same convention the library already uses.
    function plainBody(d) {
        return d.template.replace(TOKEN, (m, kind, key) => {
            const list = kind === "input" ? d.inputs : kind === "output" ? d.outputs : d.settings;
            const p = list.find(x => x.id === key);
            if (!p) return m;
            return kind === "setting" && p.defaultValue ? p.defaultValue : "[" + p.label + "]";
        }).trim();
    }

    /* ---------------- storage ---------------- */
    function readCache() {
        try {
            const raw = JSON.parse(localStorage.getItem(CACHE) || localStorage.getItem(LEGACY) || "[]");
            return Array.isArray(raw) ? raw : [];
        } catch (e) { return []; }
    }
    function writeCache() {
        try { localStorage.setItem(CACHE, JSON.stringify(defs)); } catch (e) { /* the database copy still holds */ }
    }
    const http = (url, opt) => fetch(url, Object.assign({ credentials: "same-origin", headers: { "Content-Type": "application/json" } }, opt));
    function payload(d) {
        const def = clone(d);
        delete def.dbId;
        return { name: d.label, category: "yours", body: plainBody(d) || d.label, description: d.hint || "", definition: def };
    }
    async function dbSave(d) {
        const res = d.dbId
            ? await http("/api/components/" + d.dbId, { method: "PUT", body: JSON.stringify(payload(d)) })
            : await http("/api/components", { method: "POST", body: JSON.stringify(payload(d)) });
        if (!res.ok) throw new Error("save " + res.status);
        const row = await res.json();
        d.dbId = row.id;
        return row;
    }
    async function dbDelete(d) {
        if (!d.dbId) return;
        const res = await http("/api/components/" + d.dbId, { method: "DELETE" });
        if (!res.ok) throw new Error("delete " + res.status);
    }
    // The Component Library lists what is in Your Blocks, so it needs the plain text version of each block.
    function publish() {
        const rows = defs.map(d => ({ label: d.label, text: plainBody(d) || d.label, icon: d.icon, def: d.type })).concat(plainRows);
        window.__plYoursRows = rows;
        if (typeof window.PL_setYourBlocks === "function") window.PL_setYourBlocks(rows);
    }
    function refreshHost() {
        const host = window.__pb;
        return host && host.refreshBlocks ? host.refreshBlocks() : 0;
    }

    async function load() {
        let rows = null;
        try {
            const res = await http("/api/components");
            if (res.ok) rows = await res.json();
        } catch (e) { /* offline: the cached copy is used */ }
        if (!Array.isArray(rows)) return false;
        const local = defs.slice();
        const fromDb = [];
        plainRows = [];
        rows.forEach(r => {
            const def = r.definition;
            if (def && def.kind === "builder-block" && def.type) fromDb.push(Object.assign({}, def, { dbId: r.id }));
            else plainRows.push({ label: r.name, text: r.body, icon: "widgets", def: "" });
        });
        fromDb.forEach(register);
        const known = new Set(fromDb.map(d => d.type));
        // Blocks that exist only on this device (an older version, or saved while the database was unreachable) move into the database.
        for (const d of local) {
            if (known.has(d.type)) continue;
            const copy = Object.assign({}, d, { dbId: undefined });
            try { await dbSave(copy); register(copy); } catch (e) { register(d); }
        }
        writeCache();
        publish();
        return true;
    }

    // Cached blocks register at once, so a saved flow never loses its custom blocks while the database is read.
    readCache().forEach(register);
    const ready = Promise.race([
        load().catch(() => false),
        new Promise(resolveTimer => setTimeout(() => resolveTimer(false), 4000))
    ]).then(ok => { if (ok) refreshHost(); publish(); return ok; });

    /* ---------------- starters ---------------- */
    const STARTERS = [
        {
            id: "blank", name: "Blank block", icon: "widgets", line: "A standard block with one input and one output.",
            def: { role: "standard", icon: "widgets", section: "instructions", inputs: [{ label: "Context in" }], outputs: [{ label: "Next" }], settings: [], template: "" }
        },
        {
            id: "agent", name: "Agent", icon: "smart_toy", line: "A specialist with a task in and a result out.",
            def: {
                role: "worker", icon: "smart_toy", label: "", hint: "",
                inputs: [{ id: "task", label: "Task in", desc: "What the agent has to do" }, { id: "context", label: "Context in", desc: "Background it may use" }],
                outputs: [{ label: "Result" }, { label: "Notes", desc: "Assumptions and open questions" }],
                settings: [{ label: "Specialism", type: "text", defaultValue: "domain expert" }],
                template: "Work as a {{setting:specialism}}. Use only {{input:task}} and {{input:context}}. Give a clear {{output:result}} first, then your {{output:notes}}: any assumption you made and anything you could not answer."
            }
        },
        {
            id: "reviewer", name: "Reviewer", icon: "fact_check", line: "Checks work against criteria and sends feedback.",
            def: {
                role: "reviewer", icon: "fact_check",
                inputs: [{ label: "Work in", desc: "The draft to check" }, { label: "Criteria", desc: "What good looks like" }],
                outputs: [{ label: "Verdict" }, { label: "Feedback", desc: "What to change" }],
                settings: [{ label: "Strictness", type: "select", options: ["lenient", "balanced", "strict"], defaultValue: "balanced" }],
                template: "Check {{input:work_in}} against {{input:criteria}}. Be {{setting:strictness}}. Give a {{output:verdict}} of pass or revise, then list each issue in {{output:feedback}} with one concrete fix."
            }
        },
        {
            id: "team", name: "Team coordinator", icon: "hub", line: "Briefs a Planner, Researcher, Writer and Critic, one per output.",
            def: {
                role: "coordinator", icon: "hub",
                inputs: [{ label: "Task in" }, { label: "Context in" }],
                outputs: [{ label: "Planner brief" }, { label: "Researcher brief" }, { label: "Writer brief" }, { label: "Review brief" }],
                roster: { planner_brief: "agent_planner", researcher_brief: "agent_researcher", writer_brief: "agent_writer", review_brief: "agent_critic" },
                settings: [{ label: "Rounds", type: "number", defaultValue: "2" }],
                template: "Run this team for up to {{setting:rounds}} rounds. Give each agent only the part of {{input:task_in}} it needs. Brief the Planner first, then the Researcher, then the Writer, and finish with the Critic."
            }
        }
    ];

    /* ---------------- studio ---------------- */
    let root = null, S = null, opener = null, discardTimer = null, deleteTimer = null;
    const $ = (sel, r) => (r || root).querySelector(sel);
    const $$ = (sel, r) => [...(r || root).querySelectorAll(sel)];
    const isOpen = () => !!root && !root.hidden;

    // lock = keys are pinned, as they are on a saved block (tokens and wires depend on them). New blocks let a key follow its name until it is edited.
    function working(def, lock) {
        const d = clone(def);
        const wrap = (list, withAgent) => (list || []).map(p => {
            const item = Object.assign({}, p, { _k: lock || p.id !== slug(p.label) });
            if (withAgent) item.agent = (def.roster || {})[p.id] || "";
            return item;
        });
        d.inputs = wrap(d.inputs); d.outputs = wrap(d.outputs, true);
        d.settings = (d.settings || []).map(s => Object.assign({}, s, { _k: lock || s.id !== slug(s.label), optionsText: (s.options || []).join(", ") }));
        return d;
    }
    function fresh(starterId) {
        const st = STARTERS.find(x => x.id === starterId) || STARTERS[0];
        const base = Object.assign({ label: "", hint: "", about: "", icon: "widgets", role: "standard", section: "instructions", inputs: [], outputs: [], settings: [], template: "", roster: {} }, clone(st.def));
        base.inputs = base.inputs.map(p => Object.assign({ type: "text", desc: "" }, p, { id: slug(p.id || p.label) }));
        base.outputs = base.outputs.map(p => Object.assign({ type: "text", desc: "" }, p, { id: slug(p.id || p.label) }));
        base.settings = base.settings.map(s => Object.assign({ type: "text", defaultValue: "", options: [] }, s, { id: slug(s.id || s.label) }));
        const w = working(base, false);
        w.outputs.forEach(o => { o.agent = base.roster[o.id] || ""; });
        return w;
    }
    function collect(preview) {
        const d = S.def;
        const raw = {
            type: S.mode === "edit" ? S.type : "", label: d.label || (preview ? "Untitled block" : ""), hint: d.hint, about: d.about, icon: d.icon, role: d.role, section: d.section,
            template: d.template, dbId: S.dbId,
            inputs: d.inputs.map(p => ({ id: p.id, label: p.label, type: p.type, desc: p.desc })),
            outputs: d.outputs.map(p => ({ id: p.id, label: p.label, type: p.type, desc: p.desc })),
            settings: d.settings.map(s => ({ id: s.id, label: s.label, type: s.type, defaultValue: s.defaultValue, options: s.optionsText })),
            roster: {}
        };
        if (d.role === "coordinator") d.outputs.forEach(o => { if (o.agent && String(o.label).trim()) raw.roster[slug(o.id || o.label)] = o.agent; });
        return normalise(raw);
    }
    function validate() {
        const d = S.def, errors = [], warns = [], infos = [];
        if (!d.label.trim()) errors.push("Give the block a name.");
        [["inputs", "input"], ["outputs", "output"], ["settings", "setting"]].forEach(([k, name]) => {
            const seen = new Set();
            d[k].filter(p => String(p.label).trim()).forEach(p => {
                const id = slug(p.id || p.label);
                if (seen.has(id)) errors.push(`Two ${name}s share the key "${id}". Keys must be different.`);
                seen.add(id);
            });
        });
        d.settings.filter(s => String(s.label).trim() && s.type === "select").forEach(s => {
            if (String(s.optionsText || "").split(",").map(x => x.trim()).filter(Boolean).length < 2) errors.push(`The dropdown "${s.label}" needs at least two options, separated by commas.`);
        });
        const keys = { input: new Set(d.inputs.filter(p => String(p.label).trim()).map(p => slug(p.id || p.label))), output: new Set(d.outputs.filter(p => String(p.label).trim()).map(p => slug(p.id || p.label))), setting: new Set(d.settings.filter(p => String(p.label).trim()).map(p => slug(p.id || p.label))) };
        const used = new Set();
        let m; const re = new RegExp(TOKEN.source, "g");
        while ((m = re.exec(d.template))) {
            used.add(m[1] + ":" + m[2]);
            if (!keys[m[1]].has(m[2])) warns.push(`${m[0]} does not match any ${m[1]} key, so it will print as written.`);
        }
        if (!d.template.trim()) warns.push("There are no instructions yet, so this block would print nothing.");
        if (d.role !== "standard" && !keys.input.size) warns.push("This agent has no inputs, so nothing can brief it.");
        if (d.role !== "standard" && !keys.output.size) infos.push("With no outputs the block gets one output called Next.");
        if (d.role === "coordinator" && !d.outputs.some(o => o.agent)) infos.push("Choose an agent for each output to enable Add its agents and wire them.");
        [...keys.input].filter(k => !used.has("input:" + k)).slice(0, 3).forEach(k => infos.push(`The input "${k}" is not used in the instructions. That is fine if you only want it as a connection.`));
        return { errors, warns, infos };
    }

    function build() {
        root = document.createElement("div");
        root.id = "pbp-block-studio";
        root.className = "pbp-st";
        root.hidden = true;
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-modal", "true");
        root.setAttribute("aria-labelledby", "pbp-st-title");
        root.innerHTML = `
        <div class="pbp-st-shell">
            <header class="pbp-st-top">
                <div class="pbp-st-crumb">${ms("widgets")}<span class="pbp-st-eyebrow">Prompt Builder Pro</span><span class="pbp-st-sep">/</span><span>Block studio</span></div>
                <div class="pbp-st-top-actions">
                    <button type="button" class="btn" data-st="cancel" id="pbp-st-cancel">Cancel</button>
                    <button type="button" class="btn btn-accent" data-st="save" id="pbp-st-save">${ms("save")}<span>Save to Your Blocks</span></button>
                </div>
            </header>
            <div class="pbp-st-body">
                <div class="pbp-st-form" id="pbp-st-form">
                    <div class="pbp-st-head"><span class="pbp-st-label" id="pbp-st-mode">New block</span><h2 id="pbp-st-title">Design your own block</h2><p id="pbp-st-sub">Decide what it takes in, what it hands out and what it tells the model. Once saved it sits at the top of the block library and in the Component Library under Your Blocks.</p></div>
                    <section class="pbp-st-card pbp-st-starters" id="pbp-st-starters" aria-label="Starting point"><div class="pbp-st-card-head"><b>Start from</b><span>Pick the nearest shape. Every part can be changed.</span></div><div class="pbp-st-starter-grid" id="pbp-st-starter-grid"></div></section>
                    <section class="pbp-st-card" aria-label="Identity">
                        <div class="pbp-st-card-head"><b>What it is</b><span>Name it, say what it does, choose how it behaves in a prompt.</span></div>
                        <div class="pbp-st-grid2">
                            <div class="pbp-st-field"><label for="pbp-st-name">Block name</label><input class="form-input" id="pbp-st-name" data-top="label" maxlength="60" autocomplete="off" placeholder="Fact Checker"></div>
                            <div class="pbp-st-field"><label for="pbp-st-hint">Short description</label><input class="form-input" id="pbp-st-hint" data-top="hint" maxlength="120" autocomplete="off" placeholder="Checks each claim against the sources"></div>
                        </div>
                        <div class="pbp-st-field"><span class="pbp-st-flabel">Kind of block</span><div class="pbp-st-roles" id="pbp-st-roles" role="radiogroup" aria-label="Kind of block"></div></div>
                        <div class="pbp-st-grid2">
                            <div class="pbp-st-field" id="pbp-st-section-field"><label for="pbp-st-section">Prompt section</label><select class="form-input" id="pbp-st-section" data-top="section">${SECTIONS.map(s => `<option value="${s.id}">${esc(s.title)}</option>`).join("")}</select></div>
                            <div class="pbp-st-field"><span class="pbp-st-flabel">Icon</span><div class="pbp-st-icons" id="pbp-st-icons" role="group" aria-label="Icon"></div></div>
                        </div>
                    </section>
                    <section class="pbp-st-card" aria-label="Inputs"><div class="pbp-st-card-head"><b>Inputs</b><span>What this block takes in. Each one becomes a connection point on its left.</span><button type="button" class="btn pbp-btn-xs" data-st="add" data-kind="inputs">${ms("add")}<span>Add input</span></button></div><div class="pbp-st-rows" id="pbp-st-inputs"></div></section>
                    <section class="pbp-st-card" aria-label="Outputs"><div class="pbp-st-card-head"><b>Outputs</b><span id="pbp-st-out-sub">What this block hands to the next one. Each becomes a connection point on its right.</span><button type="button" class="btn pbp-btn-xs" data-st="add" data-kind="outputs">${ms("add")}<span>Add output</span></button></div><div class="pbp-st-rows" id="pbp-st-outputs"></div></section>
                    <section class="pbp-st-card" aria-label="Settings"><div class="pbp-st-card-head"><b>Settings</b><span>Controls the user adjusts on each copy, such as a tone or a number of rounds.</span><button type="button" class="btn pbp-btn-xs" data-st="add" data-kind="settings">${ms("add")}<span>Add setting</span></button></div><div class="pbp-st-rows" id="pbp-st-settings"></div></section>
                    <section class="pbp-st-card" aria-label="Instructions">
                        <div class="pbp-st-card-head"><b>Instructions</b><span>The text this block adds to the compiled prompt. Select a chip to insert a token.</span></div>
                        <div class="pbp-st-tokens" id="pbp-st-tokens" aria-label="Insert a token"></div>
                        <textarea class="form-textarea pbp-st-template" id="pbp-st-template" data-top="template" rows="9" spellcheck="false" placeholder="Describe what this block does. Use {{input:key}}, {{setting:key}} and {{output:key}} to refer to its parts."></textarea>
                    </section>
                </div>
                <aside class="pbp-st-side" aria-label="Live preview">
                    <div class="pbp-st-side-inner">
                        <span class="pbp-st-label">Live preview</span>
                        <div id="pbp-st-node"></div>
                        <span class="pbp-st-label">Compiled text, not yet wired</span>
                        <pre class="pbp-st-out" id="pbp-st-out"></pre>
                        <span class="pbp-st-label">Checks</span>
                        <ul class="pbp-st-checks" id="pbp-st-checks"></ul>
                        <div class="pbp-st-danger" id="pbp-st-danger" hidden><span class="pbp-st-label">Remove this block</span><p id="pbp-st-usage"></p><button type="button" class="btn btn-danger btn-sm" data-st="delete" id="pbp-st-delete">${ms("delete")}<span>Delete block</span></button></div>
                    </div>
                </aside>
            </div>
        </div>`;
        document.body.appendChild(root);
        root.addEventListener("click", onClick);
        root.addEventListener("input", onInput);
        root.addEventListener("change", onInput);
        root.addEventListener("keydown", onKey);
    }

    function rowHtml(kind, p, i) {
        const dt = (f, label, html, cls) => `<div class="pbp-st-field ${cls || ""}"><label>${label}</label>${html}</div>`;
        const inp = (f, v, extra) => `<input class="form-input" data-f="${f}" value="${esc(v)}" autocomplete="off" ${extra || ""}>`;
        if (kind === "settings") {
            const sel = `<select class="form-input" data-f="type">${SETTING_TYPES.map(t => `<option value="${t[0]}" ${p.type === t[0] ? "selected" : ""}>${t[1]}</option>`).join("")}</select>`;
            return `<div class="pbp-st-row pbp-st-row-setting" data-kind="settings" data-i="${i}">
                ${dt("label", "Name", inp("label", p.label, 'maxlength="40" placeholder="Number of rounds" aria-label="Setting name"'), "pbp-st-c-name")}
                ${dt("id", "Key", inp("id", p.id, 'maxlength="32" placeholder="rounds" aria-label="Setting key"').replace('class="form-input"', 'class="form-input pbp-mono"'), "pbp-st-c-key")}
                ${dt("type", "Type", sel, "pbp-st-c-type")}
                ${dt("defaultValue", "Default", inp("defaultValue", p.defaultValue, 'maxlength="200" aria-label="Default value"'), "pbp-st-c-def")}
                ${p.type === "select" ? dt("optionsText", "Options, comma separated", inp("optionsText", p.optionsText, 'placeholder="short, medium, long" aria-label="Dropdown options"'), "pbp-st-c-wide") : ""}
                <button type="button" class="pbp-st-x" data-st="remove" aria-label="Remove setting">${ms("close")}</button>
            </div>`;
        }
        const sel = `<select class="form-input" data-f="type">${PORT_TYPES.map(t => `<option value="${t[0]}" ${p.type === t[0] ? "selected" : ""}>${t[1]}</option>`).join("")}</select>`;
        const agents = kind === "outputs" && S.def.role === "coordinator" ? `<div class="pbp-st-field pbp-st-c-wide"><label>Briefs this agent</label><select class="form-input" data-f="agent"><option value="">None, leave it open</option>${agentChoices().map(b => `<option value="${b.type}" ${p.agent === b.type ? "selected" : ""}>${esc(b.label)}</option>`).join("")}</select></div>` : "";
        const one = kind === "inputs" ? "input" : "output";
        return `<div class="pbp-st-row" data-kind="${kind}" data-i="${i}">
            ${dt("label", "Name", inp("label", p.label, `maxlength="40" placeholder="${kind === "inputs" ? "Task brief" : "Final result"}" aria-label="${one} name"`), "pbp-st-c-name")}
            ${dt("id", "Key", inp("id", p.id, `maxlength="32" placeholder="${kind === "inputs" ? "task_brief" : "final_result"}" aria-label="${one} key"`).replace('class="form-input"', 'class="form-input pbp-mono"'), "pbp-st-c-key")}
            ${dt("type", "Type", sel, "pbp-st-c-type")}
            ${dt("desc", "What goes here", inp("desc", p.desc, `maxlength="160" placeholder="${kind === "inputs" ? "The job to be done" : "What this hands on"}" aria-label="${one} description"`), "pbp-st-c-wide")}
            ${agents}
            <button type="button" class="pbp-st-x" data-st="remove" aria-label="Remove ${one}">${ms("close")}</button>
        </div>`;
    }
    function agentChoices() {
        return LIBRARY.filter(b => b.category === "agents" && b.type !== S.type).sort((a, b) => String(a.label).localeCompare(String(b.label)));
    }
    const emptyRow = kind => kind === "settings" ? { label: "", id: "", type: "text", defaultValue: "", options: [], optionsText: "", _k: false } : { label: "", id: "", type: "text", desc: "", agent: "", _k: false };

    function renderLists() {
        ["inputs", "outputs", "settings"].forEach(k => {
            const box = $("#pbp-st-" + k);
            const list = S.def[k];
            box.innerHTML = list.length ? list.map((p, i) => rowHtml(k, p, i)).join("") : `<p class="pbp-st-none">${k === "inputs" ? "No inputs. The block only feeds other blocks." : k === "outputs" ? "No outputs. It will get a single output called Next." : "No settings. Every copy behaves the same."}</p>`;
        });
        $("#pbp-st-out-sub").textContent = S.def.role === "coordinator" ? "Each output is a brief for one agent. Choose the agent it briefs and the studio can add and wire the team for you." : "What this block hands to the next one. Each becomes a connection point on its right.";
        renderTokens();
    }
    function renderTop() {
        const d = S.def;
        $("#pbp-st-name").value = d.label;
        $("#pbp-st-hint").value = d.hint;
        $("#pbp-st-section").value = d.section;
        $("#pbp-st-template").value = d.template;
        $("#pbp-st-roles").innerHTML = ROLES.map(r => `<button type="button" role="radio" class="pbp-st-role" data-st="role" data-role="${r.id}" aria-checked="${d.role === r.id}">${ms(r.icon)}<b>${r.name}</b><span>${r.line}</span></button>`).join("");
        $("#pbp-st-icons").innerHTML = ICON_SET.map(n => `<button type="button" class="pbp-st-icon" data-st="icon" data-icon="${n}" aria-pressed="${d.icon === n}" aria-label="${n.replace(/_/g, " ")}">${ms(n)}</button>`).join("");
        $("#pbp-st-section-field").hidden = d.role !== "standard";
    }
    function renderTokens() {
        const d = S.def, chips = [];
        d.inputs.filter(p => String(p.label).trim()).forEach(p => chips.push(["input", slug(p.id || p.label), p.label]));
        d.outputs.filter(p => String(p.label).trim()).forEach(p => chips.push(["output", slug(p.id || p.label), p.label]));
        d.settings.filter(p => String(p.label).trim()).forEach(p => chips.push(["setting", slug(p.id || p.label), p.label]));
        $("#pbp-st-tokens").innerHTML = chips.length ? chips.map(([k, id, label]) => `<button type="button" class="pbp-st-chip" data-st="token" data-token="{{${k}:${id}}}" data-kind="${k}" title="Insert {{${k}:${id}}}"><i>${k}</i>${esc(label)}</button>`).join("") : `<span class="pbp-st-none">Add an input, output or setting to get tokens you can insert here.</span>`;
    }
    function renderStarters() {
        $("#pbp-st-starters").hidden = S.mode === "edit";
        $("#pbp-st-starter-grid").innerHTML = STARTERS.map(s => `<button type="button" class="pbp-st-starter" data-st="starter" data-starter="${s.id}">${ms(s.icon)}<b>${s.name}</b><span>${s.line}</span></button>`).join("");
    }
    function renderPreview() {
        const d = S.def;
        const clean = collect(true);
        const role = (ROLES.find(r => r.id === d.role) || ROLES[0]).name;
        const ins = (clean ? clean.inputs : []), outs = (clean ? clean.outputs : []);
        const named = list => list.map(p => `<div class="pbp-st-port"><span class="pbp-st-dot"></span><span>${esc(p.label)}</span>${p.type !== "text" ? `<i>${typeLabel(p.type)}</i>` : ""}</div>`).join("");
        $("#pbp-st-node").innerHTML = `<div class="pbp-st-nodecard" data-agent="${d.role !== "standard"}">
            <div class="pbp-st-nodehead"><span class="pbp-st-glyph">${ms(d.icon)}</span><div><b>${esc(d.label.trim() || "Untitled block")}</b><span>${esc(role)}${d.role === "standard" ? ", " + esc((SECTIONS.find(s => s.id === d.section) || {}).title || "") : ""}</span></div></div>
            ${d.hint.trim() ? `<p class="pbp-st-nodehint">${esc(d.hint.trim())}</p>` : ""}
            <div class="pbp-st-nodeports"><div>${ins.length ? named(ins) : `<span class="pbp-st-none">No inputs</span>`}</div><div class="pbp-st-out-col">${outs.length ? named(outs) : `<span class="pbp-st-none">Next</span>`}</div></div>
            ${clean && clean.settings.length ? `<div class="pbp-st-nodeset">${clean.settings.map(s => `<span>${esc(s.label)}: <b>${esc(s.defaultValue || "-")}</b></span>`).join("")}</div>` : ""}
        </div>`;
        if (clean) {
            const cfg = { content: clean.template };
            clean.settings.forEach(s => { cfg["setting_" + s.id] = s.defaultValue; });
            $("#pbp-st-out").textContent = resolve(clean, cfg, []).trim() || "Nothing yet. Write the instructions on the left.";
        } else $("#pbp-st-out").textContent = "Nothing yet.";
        const v = validate();
        const items = [...v.errors.map(t => ["error", t]), ...v.warns.map(t => ["warn", t]), ...v.infos.map(t => ["info", t])];
        $("#pbp-st-checks").innerHTML = items.length ? items.map(([k, t]) => `<li data-level="${k}">${ms(k === "error" ? "error" : k === "warn" ? "warning" : "info")}<span>${esc(t)}</span></li>`).join("") : `<li data-level="ok">${ms("check_circle")}<span>No problems found.</span></li>`;
    }
    function renderAll() { renderTop(); renderStarters(); renderLists(); renderPreview(); }

    function setDirty() { S.dirty = true; }
    function onInput(e) {
        const t = e.target;
        if (t.dataset.top) {
            S.def[t.dataset.top] = t.value;
            setDirty();
            if (t.dataset.top === "template") { renderPreview(); return; }
            renderPreview();
            return;
        }
        const row = t.closest && t.closest(".pbp-st-row");
        if (row && t.dataset.f) {
            const list = S.def[row.dataset.kind], item = list[+row.dataset.i], f = t.dataset.f;
            if (!item) return;
            if (f === "id") {
                item.id = t.value.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 32);
                item._k = true;
            } else {
                item[f] = t.value;
                if (f === "label" && !item._k) {
                    item.id = slug(t.value);
                    const key = row.querySelector('[data-f="id"]');
                    if (key) key.value = item.id;
                }
            }
            setDirty();
            if (f === "type" && row.dataset.kind === "settings") { renderLists(); }
            else if (f === "label" || f === "id") renderTokens();
            renderPreview();
        }
    }
    function insertToken(token) {
        const ta = $("#pbp-st-template");
        const a = ta.selectionStart == null ? ta.value.length : ta.selectionStart, b = ta.selectionEnd == null ? a : ta.selectionEnd;
        ta.value = ta.value.slice(0, a) + token + ta.value.slice(b);
        const at = a + token.length;
        ta.focus();
        ta.setSelectionRange(at, at);
        S.def.template = ta.value;
        setDirty();
        renderPreview();
    }
    function onClick(e) {
        const t = e.target.closest("[data-st]");
        if (!t) return;
        const act = t.dataset.st;
        if (act === "cancel") return cancel();
        if (act === "save") return save();
        if (act === "delete") return confirmDelete();
        if (act === "token") return insertToken(t.dataset.token);
        if (act === "icon") { S.def.icon = t.dataset.icon; setDirty(); renderTop(); return renderPreview(); }
        if (act === "role") {
            S.def.role = t.dataset.role;
            if (S.def.role !== "standard" && S.def.icon === "widgets") S.def.icon = ROLES.find(r => r.id === S.def.role).icon;
            setDirty();
            renderTop(); renderLists(); return renderPreview();
        }
        if (act === "starter") {
            const keep = { label: S.def.label, hint: S.def.hint };
            S.def = fresh(t.dataset.starter);
            S.def.label = S.def.label || keep.label; S.def.hint = S.def.hint || keep.hint;
            setDirty();
            renderAll();
            return $("#pbp-st-name").focus();
        }
        if (act === "add") {
            const k = t.dataset.kind;
            S.def[k].push(emptyRow(k));
            setDirty();
            renderLists();
            const last = $$(`#pbp-st-${k} .pbp-st-row`).pop();
            if (last) last.querySelector("input").focus();
            return renderPreview();
        }
        if (act === "remove") {
            const row = t.closest(".pbp-st-row");
            S.def[row.dataset.kind].splice(+row.dataset.i, 1);
            setDirty();
            renderLists();
            return renderPreview();
        }
    }
    function onKey(e) {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancel(); }
        else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
    }

    function open(type) {
        if (!root) build();
        const def = type ? defs.find(d => d.type === type) : null;
        if (type && !def) return toast("That block could not be found.", "error");
        opener = document.activeElement;
        S = { mode: def ? "edit" : "create", type: def ? def.type : "", dbId: def ? def.dbId : undefined, dirty: false, def: def ? working(def, true) : fresh("blank") };
        clearTimeout(discardTimer); clearTimeout(deleteTimer);
        $("#pbp-st-cancel").textContent = "Cancel";
        $("#pbp-st-delete").querySelector("span:last-child").textContent = "Delete block";
        $("#pbp-st-mode").textContent = def ? "Edit block" : "New block";
        $("#pbp-st-title").textContent = def ? def.label : "Design your own block";
        $("#pbp-st-sub").textContent = def ? "Changes apply to the block library and to new copies. Copies already on the canvas keep their own text and settings." : "Decide what it takes in, what it hands out and what it tells the model. Once saved it sits at the top of the block library and in the Component Library under Your Blocks.";
        const danger = $("#pbp-st-danger");
        danger.hidden = !def;
        if (def) {
            const used = window.__pb && window.__pb.usageOf ? window.__pb.usageOf(def.type) : 0;
            $("#pbp-st-usage").textContent = used ? `${used} cop${used === 1 ? "y is" : "ies are"} on the canvas now. Deleting removes ${used === 1 ? "it" : "them"} from the canvas too.` : "Deleting removes it from Your Blocks and from the Component Library. Saved flows that use it lose those blocks.";
        }
        renderAll();
        root.hidden = false;
        document.body.classList.add("pbp-st-lock");
        $("#pbp-st-form").scrollTop = 0;
        $("#pbp-st-name").focus();
    }
    function close() {
        if (!root) return;
        root.hidden = true;
        document.body.classList.remove("pbp-st-lock");
        clearTimeout(discardTimer); clearTimeout(deleteTimer);
        if (opener && opener.isConnected && opener.focus) opener.focus({ preventScroll: true });
        opener = null; S = null;
    }
    function cancel() {
        if (S && S.dirty && !S.discard) {
            S.discard = true;
            const b = $("#pbp-st-cancel");
            b.textContent = "Discard changes?";
            discardTimer = setTimeout(() => { if (S) { S.discard = false; b.textContent = "Cancel"; } }, 4000);
            return;
        }
        close();
    }
    async function save() {
        const v = validate();
        if (v.errors.length) {
            toast(v.errors[0], "warning");
            const bad = v.errors[0].startsWith("Give") ? $("#pbp-st-name") : null;
            if (bad) bad.focus();
            return;
        }
        const def = collect();
        if (!def) return toast("Give the block a name.", "warning");
        const prev = defs.find(d => d.type === def.type);
        if (prev && prev.dbId) def.dbId = prev.dbId;
        const btn = $("#pbp-st-save");
        btn.disabled = true;
        let synced = true;
        try { await dbSave(def); } catch (e) { synced = false; console.warn("Block Studio: the database save failed.", e); }
        register(def);
        writeCache();
        publish();
        const edit = S.mode === "edit";
        btn.disabled = false;
        close();
        const lost = refreshHost();
        if (!synced) toast("Saved on this device only. The database could not be reached, so it will sync the next time Prompt Builder Pro opens.", "warning");
        else toast(edit ? `${def.label} updated.` : `${def.label} saved to Your Blocks.`, "success");
        if (lost) toast(`${lost} item${lost === 1 ? "" : "s"} on the canvas used ports that no longer exist and ${lost === 1 ? "was" : "were"} removed.`, "info");
    }
    function confirmDelete() {
        const b = $("#pbp-st-delete"), label = b.querySelector("span:last-child");
        if (!S.confirmDelete) {
            S.confirmDelete = true;
            label.textContent = "Press again to delete";
            deleteTimer = setTimeout(() => { if (S) { S.confirmDelete = false; label.textContent = "Delete block"; } }, 4000);
            return;
        }
        remove();
    }
    async function remove() {
        const d = defs.find(x => x.type === S.type);
        if (!d) return close();
        try { await dbDelete(d); } catch (e) { return toast("The database could not delete this block. Nothing was removed.", "error"); }
        const name = d.label;
        unregister(d.type);
        writeCache();
        publish();
        close();
        refreshHost();
        toast(`${name} deleted.`, "success");
    }

    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && isOpen() && !root.contains(e.target)) cancel();
    });

    window.PLBlockStudio = {
        open: type => { try { open(type || null); } catch (err) { console.error("Block Studio failed to open:", err); toast("The block studio could not open. Check the application console for details.", "error"); } },
        close, isOpen, prepare, ready,
        list: () => defs.map(d => clone(d)),
        reload: () => load().then(ok => { if (ok) refreshHost(); return ok; })
    };
})();
