/* Prompt Builder Pro workspace: the interface.
   Ported from 12-11-2026-prompt-builder-pro-agent-teams.html. Engine and templates are in builder-pro-engine.js.
   Every id and class is prefixed pbp- and lives inside #builderProWorkspace. Loaded at boot, markup built once. */
(function () {
    'use strict';
    const PB = window.PLBuilder;
    if (!PB) return;
    const PE = PB.engine, TEMPLATES = PB.templates;
    const { BLOCKS, LIBRARY, CATEGORIES } = PE;
    const STORE = 'prompt-builder-pro.v5';
    const NODE_W = 264;
    const MAX_NODES = 500;
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const ms = (name, cls = '') => `<span class="material-symbols-outlined${cls ? ' ' + cls : ''}" aria-hidden="true">${name}</span>`;
    const toast = (msg, kind = 'info') => { if (window.PL_toast) window.PL_toast(msg, kind); };

    // Material Symbols name for each block type.
    const ICONS = {
        role: 'person', system: 'terminal', context: 'explore', audience: 'groups', task: 'task_alt',
        instructions: 'format_list_numbered', tone: 'graphic_eq', constraints: 'shield', fewshot: 'collections_bookmark',
        output: 'output', success: 'flag', objective: 'adjust', deliverable: 'inventory_2', scope: 'crop_free',
        stakeholders: 'diversity_3', definition_of_done: 'checklist', priority: 'priority_high', style_guide: 'style',
        glossary: 'menu_book',
        variable: 'data_object', user_input: 'keyboard', rag_source: 'library_books', user_profile: 'account_circle',
        project_info: 'work', structured_dataset: 'table_chart', metadata: 'sell', assumptions: 'rule', unknowns: 'help',
        requirements: 'assignment', dependencies: 'account_tree', input_parameters: 'tune', data_schema: 'schema',
        ifelse: 'alt_route', switch: 'call_split', loop: 'loop', parallel: 'fork_right', merge: 'merge', retry: 'replay',
        fallback: 'undo', priority_router: 'low_priority', gate: 'verified_user', pipeline: 'linear_scale',
        meta_clarify: 'contact_support', meta_reasoning: 'psychology', meta_optimizer: 'auto_fix_high',
        meta_generator: 'auto_awesome', meta_selfcheck: 'rate_review', meta_rubric: 'grading',
        meta_uncertainty: 'question_mark', role_stack: 'layers', behavior_rules: 'gavel', decision_framework: 'balance',
        reasoning_framework: 'lightbulb', instruction_hierarchy: 'sort', qa_checklist: 'playlist_add_check',
        output_controller: 'display_settings', self_evaluator: 'self_improvement', adaptability: 'dynamic_feed',
        multi_agent: 'hub', agent_lead: 'supervisor_account', agent_router: 'route', agent_planner: 'event_note',
        agent_researcher: 'travel_explore', agent_analyst: 'analytics', agent_specialist: 'engineering',
        agent_writer: 'edit_note', agent_editor: 'spellcheck', agent_critic: 'reviews', agent_fact_checker: 'fact_check',
        agent_advocate: 'thumbs_up_down', agent_judge: 'gavel', agent_vote: 'how_to_vote', agent_aggregator: 'join_inner',
        agent_handoff: 'swap_horiz', agent_memory: 'sticky_note_2', agent_human: 'pan_tool', feedback: 'feedback',
        research_plan: 'science', source_evaluation: 'verified', citation_style: 'format_quote', fact_check: 'plagiarism',
        synthesis: 'merge_type',
        creative_brief: 'brush', narrative_structure: 'auto_stories', voice_style: 'record_voice_over', imagery: 'image',
        tone_shift: 'swap_vert',
        coding_standards: 'code', architecture_guidance: 'architecture', testing_strategy: 'checklist_rtl',
        debugging_protocol: 'bug_report', code_review: 'integration_instructions', security_review: 'security',
        analysis_framework: 'insights', data_interpretation: 'query_stats', statistical_rigor: 'functions',
        scenario_analysis: 'timeline', risk_assessment: 'warning',
        formatting_rules: 'format_align_left', explanation_level: 'school', audience_adaptation: 'campaign',
        summarization: 'summarize', translation: 'translate',
        ethical_rails: 'health_and_safety', pii_protection: 'privacy_tip', refusal_policy: 'block', bias_check: 'scale',
        compliance: 'policy',
        rubric_scoring: 'scoreboard', feedback_format: 'comment', quality_metrics: 'speed', ab_testing: 'compare_arrows'
    };
    const iconName = v => (/^[a-z0-9_]+$/.test(String(v || '')) ? v : '');
    const glyph = (type, n) => `<span class="pbp-glyph material-symbols-outlined" aria-hidden="true">${iconName(n && n.config && n.config.source && n.config.source.icon) || ICONS[type] || 'widgets'}</span>`;

    /* ---------- Component Library link ----------
       Records from the Prompt Components dataset become a generic block. The dataset is read
       through the existing gallery and is never copied or changed. One block type per prompt
       section, so moving a component to another section is a change of type. */
    const WORKSHOP_STORE = 'prompt-builder-pro.workshop.v1';
    const COMPONENT = 'component_';
    const COMPONENT_SECTIONS = ['system', 'role', 'audience', 'context', 'knowledge', 'task', 'instructions', 'approach', 'examples', 'constraints', 'tone', 'output', 'quality', 'success'];
    const sectionTitle = id => (PE.SECTIONS.find(x => x.id === id) || {}).title || id;
    COMPONENT_SECTIONS.forEach(id => {
        BLOCKS[COMPONENT + id] = {
            inputs: true, outputs: BLOCKS.context.outputs, type: COMPONENT + id,
            label: 'Component', hint: 'From the Component Library', category: 'component', glyph: '', section: id,
            fields: [{ key: 'content', label: 'Text', type: 'textarea', rows: 9, placeholder: '' }],
            defaults: { title: 'Component', content: '' },
            about: 'A component from the Component Library. It is printed under the prompt section chosen below.',
            use: ['Fill in the [blanks] in the text.', 'Change the prompt section if the guess is wrong.', 'Wire it into any block, including an agent input.']
        };
    });
    const isComponent = n => !!n && String(n.type).startsWith(COMPONENT);
    const sectionOf = n => String(n.type).slice(COMPONENT.length);

    // Label first, then category. The user can change the section in the block settings.
    const SECTION_BY_LABEL = [
        [/\bsystem\b/, 'system'],
        [/\b(role|persona|identity|act as)\b/, 'role'],
        [/\b(audience|reader|readers|recipient)\b/, 'audience'],
        [/\b(context|background|scenario|situation)\b/, 'context'],
        [/\b(examples?|few.shot|samples?)\b/, 'examples'],
        [/\b(constraints?|rules?|guardrails?|limits?|boundar(y|ies)|restrictions?|safety|avoid|never)\b/, 'constraints'],
        [/\b(tone|style|voice|register)\b/, 'tone'],
        [/\b(output|format|structure|template|schema|layout|length)\b/, 'output'],
        [/\b(success|criteria|definition of done)\b/, 'success'],
        [/\b(checks?|verify|verification|review|critique|quality|validat(e|ion)|self.check)\b/, 'quality'],
        [/\b(task|goal|objective|request)\b/, 'task'],
        [/\b(steps?|instructions?|process|procedure)\b/, 'instructions'],
        [/\b(reason(ing)?|think(ing)?|chain|approach|method|methods|strategy)\b/, 'approach'],
        [/\b(knowledge|references?|sources?|facts)\b/, 'knowledge']
    ];
    const SECTION_BY_CAT = {
        core: 'instructions', reasoning: 'approach', analysis: 'approach', ideation: 'approach',
        control: 'instructions', agentic: 'instructions', meta: 'instructions',
        output: 'output', guardrails: 'constraints', personas: 'role'
    };
    function guessSection(item) {
        const label = String(item.label || '').toLowerCase();
        const hit = SECTION_BY_LABEL.find(([re]) => re.test(label));
        if (hit) return hit[1];
        return SECTION_BY_CAT[item.cat] || 'task';
    }
    // A record that opens with its own label, or its section heading, would print that word twice.
    function stripOwnLabel(n) {
        const text = String(n.config.content || '');
        const names = [n.config.source && n.config.source.label, n.config.title, sectionTitle(sectionOf(n)), sectionOf(n)]
            .filter(Boolean).map(x => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const cut = text.replace(new RegExp('^\\s*(?:' + names.join('|') + ')\\s*:\\s*', 'i'), '');
        return cut.trim() ? cut : text;
    }
    const categoryName = item => item.badge || !item.cat ? 'Framework' : ((window._pcwCATEGORIES || []).find(c => c.id === item.cat) || {}).label || item.cat;

    const MARKUP = `
<div class="ws-header pbp-header">
  <div class="ws-header-left">
    ${ms('schema', 'ws-header-icon')}
    <div>
      <h2 class="ws-title">Prompt Builder Pro</h2>
      <p class="ws-subtitle">Wire blocks and agent teams into one compiled prompt.</p>
    </div>
  </div>
  <div class="ws-header-actions">
    <input id="pbp-workflow-title" class="form-input pbp-title-input" aria-label="Workflow title" placeholder="Untitled prompt" autocomplete="off">
    <select id="pbp-template-select" class="form-input pbp-template-select" aria-label="Load a template"></select>
    <button class="btn btn-ghost" data-act="openGuide" title="Agent blocks, team shapes and how loops work">${ms('help')}<span>Guide</span></button>
    <details class="pbp-menu" id="pbp-workflow-menu">
      <summary class="btn"><span>Workflow</span>${ms('expand_more')}</summary>
      <div class="pbp-menu-list" role="menu">
        <button class="pbp-menu-item" role="menuitem" data-act="autoLayout">${ms('auto_awesome_mosaic')}<span>Tidy layout</span></button>
        <button class="pbp-menu-item" role="menuitem" data-act="autoWire">${ms('cable')}<span>Wire loose blocks</span></button>
        <div class="pbp-menu-sep"></div>
        <button class="pbp-menu-item" role="menuitem" data-act="importJson">${ms('upload')}<span>Import a prompt (Markdown)</span></button>
        <button class="pbp-menu-item" role="menuitem" data-act="exportMd">${ms('download')}<span>Export prompt (Markdown)</span></button>
        <button class="pbp-menu-item" role="menuitem" data-act="exportJson">${ms('data_object')}<span>Export backup (JSON)</span></button>
        <div class="pbp-menu-sep"></div>
        <button class="pbp-menu-item pbp-menu-danger" role="menuitem" data-act="clear">${ms('delete')}<span>Clear canvas</span></button>
      </div>
    </details>
    <button class="btn btn-accent" id="pbp-copy-top" data-act="copy">${ms('content_copy')}<span class="pbp-btn-label">Copy prompt</span></button>
    <button class="icon-btn" data-act="close" aria-label="Close Prompt Builder Pro">${ms('close')}</button>
  </div>
</div>

<div class="ws-body pbp-body">
  <aside class="pbp-pane pbp-pane-left" aria-label="Workshop and block library">
    <section class="pbp-workshop" aria-label="Workshop">
      <div class="pbp-pane-head-row">
        <span class="pbp-label">Workshop <span class="pbp-mono pbp-count" id="pbp-ws-count">0</span></span>
        <button class="btn pbp-btn-xs" data-act="openLibrary" title="Browse the Component Library">${ms('storefront')}<span>Open library</span></button>
      </div>
      <div class="pbp-ws-list" id="pbp-ws-list"></div>
    </section>
    <div class="pbp-pane-head">
      <div class="pbp-pane-head-row"><span class="pbp-label">Block library</span><span class="pbp-mono pbp-count" id="pbp-lib-count"></span></div>
      <input id="pbp-block-search" class="form-input" type="search" placeholder="Search blocks" aria-label="Search blocks" autocomplete="off">
      <div class="pbp-chips" id="pbp-cat-chips" role="group" aria-label="Filter by category"></div>
    </div>
    <div class="pbp-library" id="pbp-library"></div>
  </aside>

  <div class="pbp-canvas" id="pbp-canvas" role="region" aria-label="Workflow canvas">
    <div id="pbp-viewport">
      <svg id="pbp-wires" aria-hidden="true">
        <g id="pbp-wire-layer"></g>
        <path id="pbp-temp-wire" d="" hidden></path>
      </svg>
      <div id="pbp-nodes"></div>
    </div>
    <div class="pbp-float pbp-float-tl" id="pbp-flow-status" role="status"></div>
    <div class="pbp-float pbp-float-bl"><span>Blocks <b class="pbp-mono" id="pbp-stat-nodes">0</b></span><span>Wires <b class="pbp-mono" id="pbp-stat-wires">0</b></span><span>Tokens <b class="pbp-mono" id="pbp-stat-tokens">0</b></span></div>
    <div class="pbp-float pbp-float-br">
      <button class="icon-btn" data-act="zoomOut" aria-label="Zoom out">${ms('remove')}</button>
      <span class="pbp-mono" id="pbp-zoom-level">100%</span>
      <button class="icon-btn" data-act="zoomIn" aria-label="Zoom in">${ms('add')}</button>
      <button class="btn btn-ghost pbp-btn-xs" data-act="fit">Fit</button>
    </div>
    <section class="pbp-inspector" id="pbp-inspector" aria-label="Block settings" hidden></section>
  </div>

  <aside class="pbp-pane pbp-pane-right" aria-label="Live prompt">
    <div class="pbp-pane-head">
      <div class="pbp-pane-head-row">
        <div class="pbp-tabs" role="tablist" id="pbp-right-tabs">
          <button class="pbp-tab" role="tab" data-tab="prompt" aria-selected="true">Prompt</button>
          <button class="pbp-tab" role="tab" data-tab="checks" aria-selected="false">Checks<small id="pbp-check-count"></small></button>
          <button class="pbp-tab" role="tab" data-tab="trace" aria-selected="false">Trace</button>
        </div>
        <span class="pbp-badge" id="pbp-health" role="status"></span>
      </div>
      <div class="pbp-toolbar" id="pbp-prompt-toolbar">
        <div class="pbp-tabs" role="group" aria-label="Output format" id="pbp-format-tabs">
          <button class="pbp-tab" data-format="markdown" aria-pressed="true">Markdown</button>
          <button class="pbp-tab" data-format="xml" aria-pressed="false">XML</button>
          <button class="pbp-tab" data-format="json" aria-pressed="false">Messages</button>
        </div>
        <div class="pbp-toggles">
          <label class="pbp-toggle">Sample values<button class="pbp-switch" role="switch" id="pbp-sample-switch" aria-checked="false" aria-label="Fill variables with sample values"></button></label>
          <label class="pbp-toggle">Follow wire order<button class="pbp-switch" role="switch" id="pbp-order-switch" aria-checked="false" aria-label="Order sections by wiring instead of the standard prompt structure"></button></label>
        </div>
      </div>
    </div>
    <div class="pbp-tabpanel" id="pbp-panel-prompt" role="tabpanel">
      <div class="pbp-suggest" id="pbp-suggest"></div>
      <div id="pbp-doc-wrap"></div>
    </div>
    <div class="pbp-tabpanel" id="pbp-panel-checks" role="tabpanel" hidden>
      <ul class="pbp-checks" id="pbp-checks"></ul>
    </div>
    <div class="pbp-tabpanel" id="pbp-panel-trace" role="tabpanel" hidden>
      <div class="pbp-trace-bar">
        <select class="form-input" id="pbp-trace-mode" aria-label="Which If / Else branch to follow">
          <option value="true">Follow the True branch</option>
          <option value="false">Follow the False branch</option>
          <option value="both">Follow every branch</option>
        </select>
        <button class="btn btn-sm" data-act="trace" id="pbp-trace-run">Run trace</button>
      </div>
      <div id="pbp-trace-log">
        <div class="pbp-empty"><b>Step through the flow</b>Run a trace to watch each wired block light up in the order the prompt uses it.</div>
      </div>
    </div>
    <div class="pbp-pane-foot">
      <span><b class="pbp-mono" id="pbp-count-tokens">0</b> tokens, <b class="pbp-mono" id="pbp-count-chars">0</b> chars</span>
      <span class="pbp-foot-actions">
        <button class="btn btn-ghost pbp-btn-xs" data-act="downloadTxt">.txt</button>
        <button class="btn btn-ghost pbp-btn-xs" data-act="downloadJson">.json</button>
        <button class="btn pbp-btn-xs" data-act="copy" id="pbp-copy-foot"><span class="pbp-btn-label">Copy</span></button>
      </span>
    </div>
  </aside>
</div>

<dialog class="pbp-dialog" id="pbp-json-dialog" aria-labelledby="pbp-json-title">
  <div class="pbp-dlg-head"><span class="pbp-dlg-title" id="pbp-json-title">Export workflow</span><button class="icon-btn" data-close aria-label="Close">${ms('close')}</button></div>
  <div class="pbp-dlg-body">
    <p id="pbp-json-desc"></p>
    <textarea id="pbp-json-text" class="form-textarea pbp-mono pbp-json-text" rows="14" spellcheck="false" aria-label="Workflow JSON"></textarea>
    <p id="pbp-json-error" class="pbp-danger-text" role="alert" hidden></p>
  </div>
  <input type="file" id="pbp-json-file" accept=".md,.markdown,.txt,.xml,.json,text/markdown,text/plain,application/json" hidden>
  <div class="pbp-dlg-foot"><button class="btn pbp-push-left" id="pbp-json-pick">Choose a file</button><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-accent" id="pbp-json-action">Copy JSON</button></div>
</dialog>

<dialog class="pbp-dialog" id="pbp-confirm-dialog" aria-labelledby="pbp-confirm-title">
  <div class="pbp-dlg-head"><span class="pbp-dlg-title" id="pbp-confirm-title">Clear the canvas?</span></div>
  <div class="pbp-dlg-body"><p>Every block and wire is removed. Export the workflow first if you want to keep it.</p></div>
  <div class="pbp-dlg-foot"><button class="btn btn-ghost" data-close>Keep working</button><button class="btn btn-danger" id="pbp-confirm-yes">Clear canvas</button></div>
</dialog>

<dialog class="pbp-dialog pbp-dialog-wide" id="pbp-guide-dialog" aria-labelledby="pbp-guide-title">
  <div class="pbp-dlg-head"><span class="pbp-dlg-title" id="pbp-guide-title">Building agent teams</span><button class="icon-btn" data-close aria-label="Close">${ms('close')}</button></div>
  <div class="pbp-guide-body">
    <h3>Start here</h3>
    <table class="pbp-faq"><tbody>
      <tr><td>What is an agent block?</td><td>One team member with one job: a Planner plans, a Writer writes, a Critic reviews. Each agent is its own block.</td></tr>
      <tr><td>What is the least I need?</td><td>Two agents and one wire between them, for example Writer into Critic. That is already a team.</td></tr>
      <tr><td>Do I need a Conductor?</td><td>No. It is optional. Use it when you want one block that briefs four agents from a single task.</td></tr>
      <tr><td>If I add a Conductor, do I still need the agent blocks?</td><td>Yes. A Conductor only hands out work. Select it and press "Add its agents and wire them" to get all four in one go.</td></tr>
      <tr><td>Conductor, Team Lead or Router?</td><td>Conductor briefs a fixed four. Team Lead splits a job across any three agents you choose. Router sends each request to one agent only. Use one at most.</td></tr>
      <tr><td>Does anything actually run?</td><td>No. The builder writes a prompt. The AI you paste it into plays every agent in order, which is why the prompt spells out who hands what to whom.</td></tr>
    </tbody></table>

    <h3>What a team does</h3>
    <p>A team splits one job across specialised agents. Each agent has one job, its own rules, and labelled inputs and outputs. You wire an output of one agent into an input of the next, and the builder writes that wiring into the prompt: every agent's entry says who it receives from and who it hands to.</p>
    <div class="pbp-guide-callout"><strong>Any block can join in.</strong> Core, data and logic blocks wire into agent inputs like any other block. A Style Guide can feed an Editor, a Quality Rubric can feed a Critic, and a Knowledge Source can feed a Researcher.</div>

    <h3>Team shapes you can load</h3>
    <p>Each card is a working tree. Load one, read the compiled prompt on the right, then swap agents in and out.</p>
    <div class="pbp-patterns" id="pbp-guide-patterns"></div>

    <h3>The agent blocks</h3>
    <p>Agents and reviewers do the work. Coordinators are optional and only hand it out. Select any block on the canvas to see its description and three things you can do with it.</p>
    <div id="pbp-guide-agents"></div>

    <h3>Loops</h3>
    <ul>
      <li><strong>A loop is allowed when the return wire goes into a Feedback or Reports input.</strong> Those wires are drawn dotted and the prompt gains a "Revision loop" or "Reporting line" entry.</li>
      <li><strong>Any other circular link is treated as a mistake.</strong> It is drawn red and blocks the Ready badge.</li>
      <li><strong>Loops run for 2 rounds unless you say otherwise.</strong> Put a Feedback block on the return wire and set Max rounds to change it.</li>
    </ul>

    <h3>Rules of thumb</h3>
    <ul>
      <li><strong>Wire the task into more than one agent.</strong> The Writer and the Critic both need the original task, not only the plan.</li>
      <li><strong>Give the Critic the plan.</strong> Without it the Critic cannot tell whether the draft followed the plan.</li>
      <li><strong>Check facts before polishing.</strong> Fact-Checker first, Editor last.</li>
      <li><strong>End on an Output Format block.</strong> The team needs to know what the finished deliverable looks like.</li>
      <li><strong>Drag wires from either side.</strong> Start from an output or an input and the builder works out the direction.</li>
    </ul>
  </div>
  <div class="pbp-dlg-foot"><button class="btn" id="pbp-guide-load-example">Load the Writer and Critic loop</button><button class="btn btn-ghost" data-close>Close</button></div>
</dialog>`;

    let api = null;

    // Builds the markup once and wires every listener to the workspace root.
    function mount(root) {
        root.innerHTML = MARKUP;
        const $ = (s, r = root) => r.querySelector(s);
        const $$ = (s, r = root) => [...r.querySelectorAll(s)];
        const isOpen = () => root.classList.contains('open');

        const state = {
            title: '', nodes: [], edges: [], selected: null,
            format: 'markdown', order: 'canonical', sample: false,
            pan: { x: 24, y: 72 }, zoom: .85, nextId: 1,
            tab: 'prompt', cat: 'all', query: ''
        };
        let result = PE.compilePrompt([], [], state);
        let importNotes = [];
        let workshop = [];
        const els = {
            canvas: $('#pbp-canvas'), viewport: $('#pbp-viewport'), nodes: $('#pbp-nodes'),
            wires: $('#pbp-wire-layer'), temp: $('#pbp-temp-wire'), inspector: $('#pbp-inspector')
        };
        const node = id => state.nodes.find(n => n.id === id);
        const nodeEl = id => $(`#pbp-node-${CSS.escape(id)}`);
        const uid = p => `${p}_${Date.now().toString(36)}${(state.nextId++).toString(36)}`;

        /* ---------- persistence ---------- */
        function save() {
            try {
                localStorage.setItem(STORE, JSON.stringify({
                    title: state.title, nodes: state.nodes, edges: state.edges,
                    format: state.format, order: state.order, sample: state.sample
                }));
            } catch (e) { /* storage full or blocked, the canvas still works */ }
        }
        function restore() {
            try {
                const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
                if (!raw || !Array.isArray(raw.nodes) || !raw.nodes.length) return false;
                const clean = PE.sanitizeGraph(raw.nodes, raw.edges || []);
                Object.assign(state, {
                    title: raw.title || '',
                    nodes: clean.nodes, edges: clean.edges,
                    format: raw.format || 'markdown',
                    order: raw.order || 'canonical',
                    sample: !!raw.sample
                });
                return true;
            } catch (e) { return false; }
        }

        /* ---------- library ---------- */
        function renderChips() {
            $('#pbp-cat-chips').innerHTML = [{ id: 'all', label: 'All' }, ...CATEGORIES.map(c => ({ id: c.id, label: c.label.split(' ')[0] }))]
                .map(c => `<button class="pbp-tab" data-cat-chip="${c.id}" aria-pressed="${state.cat === c.id}">${c.label}</button>`).join('');
        }
        function renderLibrary() {
            const q = state.query.trim().toLowerCase();
            const match = b => (state.cat === 'all' || b.category === state.cat) && (!q || `${b.label} ${b.hint} ${b.category}`.toLowerCase().includes(q));
            const shown = LIBRARY.filter(match);
            $('#pbp-lib-count').textContent = `${shown.length} of ${LIBRARY.length}`;
            const KINDS = [
                ['worker', 'Agents', 'These do the work. A team is two or more of them wired together.'],
                ['reviewer', 'Reviewers', 'These check the work, then send it back or decide.'],
                ['coordinator', 'Coordinators, optional', 'These hand out work to agents you add. Use one at most, or none.'],
                ['plumbing', 'Team extras', 'Merge results, pass notes, pause for a person, limit a loop.']
            ];
            const item = b => `
                <button class="pbp-lib-item" draggable="true" data-add="${b.type}" data-cat="${b.category}" title="${esc(b.about || 'Add ' + b.label)}">
                    ${glyph(b.type)}
                    <span class="pbp-lib-text"><b>${esc(b.label)}</b><span>${esc(b.hint)}</span></span>
                    ${ms('add', 'pbp-lib-add')}
                </button>`;
            const groups = CATEGORIES.map(c => {
                const list = shown.filter(b => b.category === c.id);
                if (c.id === 'agents' && list.length) return `<div class="pbp-lib-group pbp-label"><span>${c.label}</span></div>
                    <div class="pbp-lib-intro"><b>New to agent teams?</b> Agents are separate blocks that you wire together. Coordinators are optional. The quickest start is a ready-made team.<span><button class="btn pbp-btn-xs" data-act="openGuide">Show me the teams</button></span></div>`
                    + KINDS.map(([k, name, line]) => { const sub = list.filter(b => b.kind === k); return sub.length ? `<div class="pbp-lib-sub"><b>${name}</b>${line}</div>` + sub.map(item).join('') : ''; }).join('');
                return list.length ? `<div class="pbp-lib-group pbp-label"><span>${c.label}</span></div>` + list.map(item).join('') : '';
            }).join('');
            $('#pbp-library').innerHTML = shown.length ? groups : `<div class="pbp-empty"><b>No blocks match</b>Try a shorter search, or switch the filter back to All.</div>`;
        }

        /* ---------- nodes ---------- */
        function summary(n) {
            const c = n.config || {};
            if (n.type === 'variable') return `{{${PE.varNameOf(n)}}}\n${c.content || ''}`;
            if (n.type === 'user_input') return `Asked: ${c.prompt || ''}\n${c.defaultValue || ''}`;
            if (n.type === 'rag_source') return `{{${PE.varNameOf(n)}}}\n${c.content || ''}`;
            if (n.type === 'ifelse') return `If ${c.condition || '...'}`;
            if (n.type === 'switch') return `Route by ${c.condition || '...'}`;
            if (n.type === 'loop') return `Up to ${c.maxIterations || 3} passes, until ${c.exitCondition || '...'}`;
            if (n.type === 'feedback') return `${c.purpose || 'Revision'}, up to ${c.maxRounds || 2} round${Number(c.maxRounds || 2) === 1 ? '' : 's'}\n${c.content || ''}`;
            if (n.type === 'agent_specialist') return `${c.specialty || 'Specialist'}\n${c.content || ''}`;
            return c.content || (n.type === 'role' ? c.personaPreset : '') || 'Empty. Select to add text.';
        }
        function portName(n, p) {
            if (n.type === 'switch' && p.id === 'caseA') return n.config.caseALabel || p.label;
            if (n.type === 'switch' && p.id === 'caseB') return n.config.caseBLabel || p.label;
            return p.label;
        }
        const inputsOf = type => {
            const raw = BLOCKS[type].inputs;
            return raw === true ? [{ id: 'in', label: 'In' }] : Array.isArray(raw) ? raw : [];
        };

        function renderNodes() {
            const unwired = new Set(result.unwiredIds);
            const cyc = new Set(result.cycleNodeIds);
            els.nodes.innerHTML = state.nodes.map(n => {
                const d = BLOCKS[n.type];
                const st = cyc.has(n.id) ? 'cycle' : unwired.has(n.id) ? 'unwired' : '';
                const multiOut = d.outputs.length > 1;
                const inputList = inputsOf(n.type);
                const multiIn = inputList.length > 1;
                const singleIn = d.inputs && !multiIn;
                const inHtml = multiIn
                    ? `<div class="pbp-node-ports-in">${inputList.map(p => `<div class="pbp-port-row-in"><span class="pbp-port" data-port="${p.id}" data-dir="in" title="Drop a wire here"></span><span>${esc(p.label)}</span></div>`).join('')}</div>`
                    : singleIn ? `<span class="pbp-port pbp-port-in" data-port="${inputList[0].id}" data-dir="in" title="Input"></span>` : '';
                return `<div class="pbp-node" id="pbp-node-${n.id}" data-id="${n.id}" data-cat="${d.category}" ${st ? `data-state="${st}"` : ''} ${state.selected === n.id ? 'data-selected' : ''} style="left:${n.x}px;top:${n.y}px">
                    ${multiOut ? '' : `<span class="pbp-port pbp-port-out" data-port="${d.outputs[0].id}" data-dir="out" title="Drag to connect"></span>`}
                    ${inHtml}
                    <div class="pbp-node-head" data-drag>
                        ${glyph(n.type, n)}
                        <div class="pbp-node-meta"><div class="pbp-node-title">${esc(PE.titleOf(n))}</div><div class="pbp-node-type">${esc(isComponent(n) ? 'Component, ' + sectionTitle(sectionOf(n)) : d.label)}</div></div>
                        <button class="pbp-node-x" data-del="${n.id}" aria-label="Delete ${esc(PE.titleOf(n))}">${ms('close')}</button>
                    </div>
                    <p class="pbp-node-body">${esc(summary(n))}</p>
                    ${st === 'unwired' ? `<p class="pbp-node-flag">Not wired in, left out of the prompt</p>` : st === 'cycle' ? `<p class="pbp-node-flag">Circular link, remove a red wire</p>` : ''}
                    ${multiOut ? `<div class="pbp-node-ports">${d.outputs.map(p => `<div class="pbp-port-row"><span>${esc(portName(n, p))}</span><span class="pbp-port" data-port="${p.id}" data-dir="out" title="Drag to connect"></span></div>`).join('')}</div>` : ''}
                </div>`;
            }).join('');
        }

        function portPoint(id, port, dir) {
            const el = nodeEl(id);
            const n = node(id);
            if (!el || !n) return null;
            const p = el.querySelector(`.pbp-port[data-dir="${dir}"][data-port="${port}"]`);
            if (!p) return { x: n.x + (dir === 'out' ? NODE_W : 0), y: n.y + 26 };
            const a = el.getBoundingClientRect(), b = p.getBoundingClientRect();
            return {
                x: n.x + (b.left - a.left + b.width / 2) / state.zoom,
                y: n.y + (b.top - a.top + b.height / 2) / state.zoom
            };
        }
        const curve = (a, b) => {
            const dx = Math.max(Math.abs(b.x - a.x) * .5, 56);
            return `M${a.x} ${a.y} C${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
        };

        function renderWires() {
            const cyc = new Set(result.cycleEdgeIds);
            const loop = new Set(result.loopEdgeIds);
            els.wires.innerHTML = state.edges.map(e => {
                const a = portPoint(e.from, e.fromPort, 'out');
                const b = portPoint(e.to, e.toPort || 'in', 'in');
                const src = node(e.from);
                if (!a || !b || !src) return '';
                const d = curve(a, b);
                const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
                const port = BLOCKS[src.type].outputs.find(p => p.id === e.fromPort);
                let tag = BLOCKS[src.type].outputs.length > 1 && port ? portName(src, port) : '';
                if (tag.length > 20) tag = tag.slice(0, 19) + '…';
                const w = tag.length * 6.2 + 16;
                const hot = state.selected && (e.from === state.selected || e.to === state.selected);
                return `<g class="pbp-wire${hot ? ' pbp-is-hot' : ''}${cyc.has(e.id) ? ' pbp-is-cycle' : ''}${loop.has(e.id) ? ' pbp-is-loop' : ''}" data-edge="${e.id}">
                    <title>Click to remove this wire</title><path class="pbp-wire-hit" d="${d}"/><path class="pbp-wire-line" d="${d}"/>
                    ${tag ? `<g class="pbp-wire-tag" transform="translate(${mx} ${my})"><rect x="${-w / 2}" y="-10" width="${w}" height="20" rx="6"/><text y="3.5" text-anchor="middle">${esc(tag)}</text></g>` : ''}
                    <g class="pbp-wire-x" transform="translate(${mx + (tag ? w / 2 + 12 : 0)} ${my})"><circle r="8"/><path d="M-3 -3 3 3M3 -3 -3 3"/></g>
                </g>`;
            }).join('');
        }

        /* ---------- prompt preview ---------- */
        function markVars(text) {
            const defined = new Set(state.nodes.filter(n => n.type === 'variable' || n.type === 'rag_source').map(PE.varNameOf));
            state.nodes.filter(n => n.type === 'user_input').forEach(n => {
                const v = String(n.config.inputName || '').replace(/[{}\s]/g, '');
                if (v) defined.add(v);
            });
            return esc(text).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (m, v) => `<span class="pbp-var"${defined.has(v) ? '' : ' data-undefined title="No Input block defines this"'}>${m}</span>`);
        }

        function renderPrompt() {
            const wrap = $('#pbp-doc-wrap');
            const names = { role: 'Persona Role', task: 'Task Instruction', output: 'Output Format' };
            $('#pbp-suggest').innerHTML = result.missing.length ? `<span>Most prompts also have</span>` + result.missing.map(t => `<button data-add="${t}">+ ${names[t]}</button>`).join('') : '';
            if (!result.sections.length) {
                wrap.innerHTML = state.nodes.length
                    ? `<div class="pbp-empty"><b>Nothing is wired yet</b>Drag from the dot on the right of one block to another, or let the builder connect them for you.<br><br><button class="btn btn-sm" data-act="autoWire">Wire loose blocks</button></div>`
                    : `<div class="pbp-empty"><b>Your prompt appears here</b>Add a block from the library, or load a template to start from a working flow.</div>`;
            } else if (state.format === 'json') {
                wrap.innerHTML = `<div class="pbp-doc"><pre>${markVars(result.text)}</pre></div>`;
            } else {
                wrap.innerHTML = `<div class="pbp-doc">${result.sections.map(s => `
                    <div class="pbp-sec" ${s.id === 'inputs' || (s.id === 'workflow' && s.parts.length > 1) ? 'data-tight' : ''} ${s.id === 'agents' ? 'data-team' : ''}>
                        <div class="pbp-sec-open">${esc(s.open)}</div>
                        ${s.lead ? `<div class="pbp-sec-lead">${esc(s.lead)}</div>` : ''}
                        ${s.parts.map(p => `<div class="pbp-part" tabindex="0" role="button" data-node="${p.nodeId}" data-nodes="${p.nodeIds.join(' ')}" ${p.nodeIds.includes(state.selected) ? 'data-selected' : ''}>${markVars(p.text)}</div>`).join('')}
                        ${s.close ? `<div class="pbp-sec-close">${esc(s.close)}</div>` : ''}
                    </div>`).join('')}</div>`;
            }
            $('#pbp-count-tokens').textContent = result.tokens.toLocaleString('en-GB');
            $('#pbp-count-chars').textContent = result.chars.toLocaleString('en-GB');
            $('#pbp-stat-tokens').textContent = result.tokens.toLocaleString('en-GB');
        }

        function renderChecks() {
            const issues = result.diagnostics.filter(d => d.level !== 'info');
            const errors = issues.filter(d => d.level === 'error').length;
            const h = $('#pbp-health');
            if (!result.sections.length) {
                h.dataset.tone = '';
                h.innerHTML = '<i></i>No prompt yet';
            } else if (errors) {
                h.dataset.tone = 'error';
                h.innerHTML = `<i></i>${errors} blocking`;
            } else if (issues.length || result.missing.includes('task')) {
                h.dataset.tone = 'warn';
                h.innerHTML = `<i></i>${issues.length + (result.missing.includes('task') ? 1 : 0)} to review`;
            } else {
                h.dataset.tone = 'ok';
                h.innerHTML = '<i></i>Ready to copy';
            }
            $('#pbp-check-count').textContent = issues.length ? issues.length : '';
            const rows = result.diagnostics.map(d => `<li><button class="pbp-check" data-level="${d.level}" ${d.nodeId ? `data-goto="${d.nodeId}"` : ''}><i></i><span>${esc(d.message)}</span></button></li>`);
            importNotes.forEach(m => rows.push(`<li><div class="pbp-check pbp-check-static" data-level="info"><i></i><span>Import: ${esc(m)}</span></div></li>`));
            if (result.missing.includes('task')) rows.unshift(`<li><button class="pbp-check" data-level="warning" data-add="task"><i></i><span>There is no Task Instruction in the flow, so the model is never told what to do. Select to add one.</span></button></li>`);
            $('#pbp-checks').innerHTML = rows.length ? rows.join('') : `<li><div class="pbp-check pbp-check-static" data-level="ok"><i></i><span>${result.sections.length ? 'No issues found. Every wired block compiles and every variable is defined.' : 'Checks run as soon as blocks are wired together.'}</span></div></li>`;
        }

        function renderStatus() {
            const a = result.activeIds.length, u = result.unwiredIds.length;
            $('#pbp-flow-status').innerHTML = `<span><b class="pbp-mono">${a}</b> in prompt</span>${u ? `<span class="pbp-warn-text"><b class="pbp-mono">${u}</b> not wired</span><button class="btn btn-ghost pbp-btn-xs" data-act="autoWire">Wire in</button>` : ''}${result.loopCount ? `<span class="pbp-accent-text"><b class="pbp-mono">${result.loopCount}</b> loop${result.loopCount === 1 ? '' : 's'}</span>` : ''}${result.cycleNodeIds.length ? `<span class="pbp-danger-text">Circular link</span>` : ''}`;
            $('#pbp-stat-nodes').textContent = state.nodes.length;
            $('#pbp-stat-wires').textContent = state.edges.length;
        }

        /* ---------- inspector ---------- */
        function renderInspector() {
            const n = node(state.selected);
            const box = els.inspector;
            if (!n) { box.hidden = true; box.innerHTML = ''; return; }
            const d = BLOCKS[n.type];
            box.hidden = false;
            box.dataset.cat = d.category;
            const fields = d.fields.map(f => {
                const v = n.config[f.key] ?? '';
                const id = `pbp-f-${f.key}`;
                const attr = `id="${id}" data-field="${f.key}" ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''}`;
                const ctl = f.type === 'textarea'
                    ? `<textarea class="form-textarea" rows="${f.rows || 4}" ${attr}>${esc(v)}</textarea>`
                    : f.type === 'select'
                        ? `<select class="form-input" ${attr}>${[...new Set([...(f.options || []), ...(v ? [v] : [])])].map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
                        : `<input class="form-input${f.mono ? ' pbp-mono' : ''}" type="${f.type === 'number' ? 'number' : 'text'}" ${f.min ? `min="${f.min}"` : ''} ${f.max ? `max="${f.max}"` : ''} value="${esc(v)}" ${attr} autocomplete="off">`;
                return `<div class="pbp-field"><label for="${id}">${esc(f.label)}</label>${ctl}</div>`;
            }).join('');
            const missing = d.kind === 'coordinator' ? missingAgents(n).length : 0;
            box.innerHTML = `
                <div class="pbp-insp-head">
                    ${glyph(n.type, n)}
                    <div class="pbp-node-meta"><div class="pbp-node-title">${esc(d.label)}</div><div class="pbp-insp-hint">${esc(isComponent(n) && n.config.source ? 'From ' + categoryName(n.config.source) : d.hint)}</div></div>
                    <button class="icon-btn" data-act="deselect" aria-label="Close settings">${ms('close')}</button>
                </div>
                <div class="pbp-insp-body">
                    ${d.about ? `<div class="pbp-about"><p>${esc(d.about)}</p><span class="pbp-label">What you can do with it</span><ul>${(d.use || []).map(u => `<li>${esc(u)}</li>`).join('')}</ul></div>` : ''}
                    ${missing ? `<button class="btn btn-accent btn-sm" data-act="addAgents">Add its ${missing === 1 ? 'missing agent' : missing + ' agents'} and wire them</button>` : ''}
                    ${Array.isArray(d.inputs) ? `<div class="pbp-ports"><div><span class="pbp-label">Takes in</span>${d.inputs.map(p => `<span>${esc(p.label)}</span>`).join('')}</div><div><span class="pbp-label">Hands out</span>${d.outputs.map(p => `<span>${esc(p.label)}</span>`).join('')}</div></div>` : ''}
                    <div class="pbp-field"><label for="pbp-f-title">Block name</label><input class="form-input" id="pbp-f-title" data-field="title" value="${esc(n.config.title || '')}" autocomplete="off"></div>
                    ${isComponent(n) ? `<div class="pbp-field"><label for="pbp-f-section">Prompt section</label><select class="form-input" id="pbp-f-section" data-section>${COMPONENT_SECTIONS.map(id => `<option value="${id}" ${id === sectionOf(n) ? 'selected' : ''}>${esc(sectionTitle(id))}</option>`).join('')}</select></div>` : ''}
                    ${fields}
                    <button class="btn btn-ghost pbp-btn-xs pbp-start" data-act="resetText">Restore default text</button>
                </div>
                <div class="pbp-insp-foot"><button class="btn btn-sm" data-act="duplicate">Duplicate</button><button class="btn btn-danger btn-sm" data-act="deleteSelected">Delete</button></div>`;
        }

        // Which agent each coordinator output expects: [block type, input port, block name].
        const SPAWN = {
            multi_agent: { planner: ['agent_planner', 'task'], researcher: ['agent_researcher', 'task'], writer: ['agent_writer', 'task'], critic: ['agent_critic', 'task'] },
            agent_router: { to_planner: ['agent_planner', 'task'], to_researcher: ['agent_researcher', 'task'], to_writer: ['agent_writer', 'task'], to_critic: ['agent_critic', 'task'], fallback: ['meta_clarify', 'in'] },
            agent_lead: { worker_a: ['agent_specialist', 'task', 'Specialist A'], worker_b: ['agent_specialist', 'task', 'Specialist B'], worker_c: ['agent_specialist', 'task', 'Specialist C'] }
        };
        function missingAgents(n) {
            return Object.keys(SPAWN[n.type] || {}).filter(port => !state.edges.some(e => e.from === n.id && e.fromPort === port));
        }
        function addAgents() {
            const n = node(state.selected);
            if (!n) return;
            const ports = missingAgents(n);
            ports.forEach((port, i) => {
                const [type, toPort, name] = SPAWN[n.type][port];
                const made = { id: uid('node'), type, x: n.x + 360, y: n.y + i * 220, config: JSON.parse(JSON.stringify(BLOCKS[type].defaults)) };
                if (name) made.config.title = name;
                state.nodes.push(made);
                state.edges.push({ id: uid('edge'), from: n.id, fromPort: port, to: made.id, toPort });
            });
            render();
            autoLayout(true);
            toast(`${ports.length} agent${ports.length === 1 ? '' : 's'} added and wired. Now wire their outputs to each other.`, 'success');
        }

        /* ---------- render pipeline ---------- */
        // Components are compiled from a copy, so the stored text is never changed.
        const compileNodes = () => state.nodes.map(n => isComponent(n) ? { ...n, config: { ...n.config, content: stripOwnLabel(n) } } : n);
        function compile() {
            result = PE.compilePrompt(compileNodes(), state.edges, {
                format: state.format, order: state.order, sample: state.sample, title: state.title
            });
            // A component in the Role, Task or Output section counts as that part of the prompt.
            const covers = { role: ['role', 'system'], task: ['task', 'instructions'], output: ['output'] };
            const active = new Set(result.activeIds);
            result.missing = result.missing.filter(m => !state.nodes.some(n => isComponent(n) && active.has(n.id) && covers[m].includes(sectionOf(n))));
        }
        function render({ inspector = true } = {}) {
            compile();
            renderNodes();
            renderWires();
            renderPrompt();
            renderChecks();
            renderStatus();
            if (inspector) renderInspector();
            save();
        }
        let raf = 0;
        const renderSoon = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => render({ inspector: false }));
        };

        function applyView() {
            els.viewport.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`;
            $('#pbp-zoom-level').textContent = Math.round(state.zoom * 100) + '%';
        }
        function select(id, { reveal = false } = {}) {
            state.selected = id;
            $$('.pbp-node').forEach(el => el.toggleAttribute('data-selected', el.dataset.id === id));
            $$('.pbp-part').forEach(el => el.toggleAttribute('data-selected', !!id && el.dataset.nodes.split(' ').includes(id)));
            renderWires();
            renderInspector();
            if (id && !reveal) clearOfInspector(id);
            if (reveal && id) {
                const n = node(id), r = els.canvas.getBoundingClientRect();
                state.pan = { x: r.width / 2 - (n.x + NODE_W / 2) * state.zoom, y: r.height / 2 - (n.y + 70) * state.zoom };
                applyView();
            }
        }
        function clearOfInspector(id) {
            const el = nodeEl(id);
            if (!el || els.inspector.hidden) return;
            const a = el.getBoundingClientRect(), b = els.inspector.getBoundingClientRect();
            if (a.right > b.left - 16 && a.top < b.bottom && a.bottom > b.top) {
                state.pan.x -= a.right - b.left + 24;
                els.viewport.classList.add('pbp-is-gliding');
                applyView();
                setTimeout(() => els.viewport.classList.remove('pbp-is-gliding'), 220);
            }
        }
        function light(ids, on) {
            ids.forEach(id => {
                const el = nodeEl(id);
                if (el) el.toggleAttribute('data-lit', on);
            });
            $$('.pbp-part').forEach(el => {
                if (ids.some(id => el.dataset.nodes.split(' ').includes(id))) el.toggleAttribute('data-lit', on);
            });
        }
        function setTab(t) {
            state.tab = t;
            $$('#pbp-right-tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t));
            ['prompt', 'checks', 'trace'].forEach(p => { $(`#pbp-panel-${p}`).hidden = p !== t; });
            $('#pbp-prompt-toolbar').hidden = t !== 'prompt';
        }

        /* ---------- workshop: components picked in the Component Library ---------- */
        const wsKey = it => `${it.badge || ''}|${it.cat || ''}|${it.label}|${it.text}`;
        function saveWorkshop() {
            try { localStorage.setItem(WORKSHOP_STORE, JSON.stringify(workshop)); } catch (e) { /* the list still works for this session */ }
        }
        function loadWorkshop() {
            try {
                const raw = JSON.parse(localStorage.getItem(WORKSHOP_STORE) || '[]');
                workshop = (Array.isArray(raw) ? raw : []).filter(it => it && typeof it.label === 'string' && typeof it.text === 'string')
                    .map(it => ({ label: it.label, text: it.text, cat: it.cat || null, icon: iconName(it.icon) || 'extension', badge: it.badge || '' }));
            } catch (e) { workshop = []; }
        }
        function renderWorkshop() {
            $('#pbp-ws-count').textContent = workshop.length;
            $('#pbp-ws-list').innerHTML = workshop.length ? workshop.map((it, i) => `
                <div class="pbp-ws-item" draggable="true" data-ws="${i}" title="${esc(String(it.text).replace(/\s+/g, ' ').slice(0, 220))}">
                    <span class="pbp-glyph material-symbols-outlined" aria-hidden="true">${it.icon}</span>
                    <span class="pbp-lib-text"><b>${esc(it.label)}</b><span>${esc(categoryName(it))}</span></span>
                    <button class="pbp-ws-btn" data-ws-add="${i}" aria-label="Add ${esc(it.label)} to canvas" title="Add to canvas">${ms('add')}</button>
                    <button class="pbp-ws-btn pbp-ws-remove" data-ws-remove="${i}" aria-label="Remove ${esc(it.label)} from Workshop" title="Remove from Workshop">${ms('close')}</button>
                </div>`).join('') : `
                <div class="pbp-ws-empty">
                    <b>Your Workshop is empty</b>
                    <ol><li><span class="pbp-mono">1</span>Browse the Component Library.</li><li><span class="pbp-mono">2</span>Select the components you want.</li><li><span class="pbp-mono">3</span>Add them here, then drag each one onto the canvas.</li></ol>
                </div>`;
        }
        function addToWorkshop(kit) {
            const have = new Set(workshop.map(wsKey));
            let added = 0, skipped = 0;
            (kit || []).forEach(raw => {
                const it = { label: String(raw.label || 'Component'), text: String(raw.text || ''), cat: raw.cat || null, icon: iconName(raw.icon) || 'extension', badge: raw.badge || '' };
                if (have.has(wsKey(it))) { skipped++; return; }
                have.add(wsKey(it));
                workshop.push(it);
                added++;
            });
            saveWorkshop();
            renderWorkshop();
            const dup = skipped ? ` ${skipped} already there, skipped.` : '';
            toast(added ? `${added} component${added === 1 ? '' : 's'} added to the Workshop.${dup}` : `Nothing new.${dup}`, added ? 'success' : 'info');
        }
        function removeFromWorkshop(i) {
            workshop.splice(i, 1);
            saveWorkshop();
            renderWorkshop();
        }
        // The Workshop item stays where it is. The canvas gets its own block built from the record.
        function addComponent(it, x, y) {
            if (!it) return;
            const before = state.nodes.length;
            addNode(COMPONENT + guessSection(it), x, y);
            const n = node(state.selected);
            if (!n || state.nodes.length === before) return;
            n.config = { title: it.label, content: it.text, original: it.text, source: { label: it.label, cat: it.cat, icon: it.icon, badge: it.badge } };
            render();
        }

        // Borrow the gallery that Prompt Components owns. It goes back the moment it closes.
        let galleryHome = null, galleryWatch = null;
        const libraryOpen = () => !!galleryHome;
        function returnGallery() {
            if (!galleryHome) return;
            const gal = document.getElementById('pcwGallery');
            galleryWatch.disconnect();
            if (gal) {
                gal.hidden = true;
                galleryHome.parent.insertBefore(gal, galleryHome.next);
            }
            galleryHome = null;
            window.PL_galleryBorrow(null);
        }
        function openLibrary() {
            if (libraryOpen()) return;
            const gal = document.getElementById('pcwGallery');
            const owner = document.getElementById('componentsWorkspace');
            if (!gal || !owner || !window.PL_galleryBorrow || !window.PL_openComponentGallery || !window.openComponentsWorkspace) return toast('The Component Library is not available.', 'error');
            if (!Array.isArray(window._pcwBLOCKS) || !window._pcwBLOCKS.length) return toast('The component dataset could not be read.', 'error');
            // The gallery wires its buttons the first time Prompt Components opens. Do that once, unseen.
            if (!owner._pcwWired) {
                window.openComponentsWorkspace();
                owner.classList.remove('open');
                document.querySelectorAll('.nav-item[data-view]').forEach(el => el.classList.remove('active'));
            }
            galleryHome = { parent: gal.parentNode, next: gal.nextSibling };
            root.appendChild(gal);
            window.PL_galleryBorrow({ label: 'Workshop', onCheckout: kit => { addToWorkshop(kit); gal.hidden = true; } });
            window.PL_openComponentGallery({ mode: 'home' });
            galleryWatch = new MutationObserver(() => { if (gal.hidden || !isOpen()) returnGallery(); });
            galleryWatch.observe(gal, { attributes: true, attributeFilter: ['hidden'] });
            galleryWatch.observe(root, { attributes: true, attributeFilter: ['class'] });
        }

        /* ---------- graph actions ---------- */
        function addNode(type, x, y) {
            const d = BLOCKS[type];
            if (!d) return;
            if (state.nodes.length >= MAX_NODES) {
                toast(`Maximum ${MAX_NODES} blocks per workflow. Split into separate workflows for larger systems.`, 'warning');
                return;
            }
            const r = els.canvas.getBoundingClientRect();
            if (x === undefined) {
                const k = state.nodes.length % 5;
                x = (r.width / 2 - state.pan.x) / state.zoom - NODE_W / 2 + k * 24;
                y = (r.height / 2 - state.pan.y) / state.zoom - 80 + k * 24;
            }
            const n = {
                id: uid('node'), type,
                x: Math.round(x / 8) * 8, y: Math.round(y / 8) * 8,
                config: JSON.parse(JSON.stringify(d.defaults))
            };
            state.nodes.push(n);
            state.selected = n.id;
            render();
        }
        function removeNode(id) {
            state.nodes = state.nodes.filter(n => n.id !== id);
            state.edges = state.edges.filter(e => e.from !== id && e.to !== id);
            if (state.selected === id) state.selected = null;
            render();
        }
        function connect(from, port, to, toPort = 'in') {
            const a = node(from), b = node(to);
            if (!a || !b) return;
            if (from === to) return toast('A block cannot connect to itself', 'warning');
            if (!BLOCKS[b.type].inputs) return toast(`${BLOCKS[b.type].label} has no input, it only feeds other blocks`, 'warning');
            if (!inputsOf(b.type).some(p => p.id === toPort)) return toast(`That block has no input port called "${toPort}"`, 'warning');
            if (state.edges.some(e => e.from === from && e.fromPort === port && e.to === to && (e.toPort || 'in') === toPort)) return toast('That wire already exists', 'warning');
            state.edges.push({ id: uid('edge'), from, fromPort: port, to, toPort });
            render({ inspector: false });
            const newest = state.edges[state.edges.length - 1].id;
            if (result.cycleEdgeIds.includes(newest)) toast('Connected, but this creates a circular link. Return wires belong in a Feedback or Reports input.', 'warning');
            else if (result.loopEdgeIds.includes(newest)) toast('Connected. Loop closed.', 'success');
        }
        function autoWire() {
            const g = PE.analyzeGraph(state.nodes, state.edges);
            const byPos = (a, b) => a.x - b.x || a.y - b.y;
            const loose = [...g.unwired].sort(byPos);
            if (!loose.length) return toast('Every block is already wired in');
            const link = (a, b) => state.edges.push({ id: uid('edge'), from: a.id, fromPort: BLOCKS[a.type].outputs[0].id, to: b.id, toPort: 'in' });
            let tail = [...g.ordered].reverse().find(n => BLOCKS[n.type].outputs.length === 1 && !g.outEdges[n.id].length) || g.ordered[g.ordered.length - 1];
            const head = g.ordered.find(n => BLOCKS[n.type].inputs);
            let count = 0;
            const sources = loose.filter(n => !BLOCKS[n.type].inputs);
            const rest = loose.filter(n => BLOCKS[n.type].inputs);
            rest.forEach(n => { if (tail) { link(tail, n); count++; } tail = n; });
            const firstTarget = head || rest[0];
            sources.forEach(n => { if (firstTarget) { link(n, firstTarget); count++; } });
            render({ inspector: false });
            toast(count ? `Wired in ${count} block${count === 1 ? '' : 's'}` : 'Add another block to connect to', count ? 'success' : 'info');
        }
        const heightOf = n => nodeEl(n.id)?.offsetHeight || 168;
        function autoLayout(quiet) {
            if (!state.nodes.length) return;
            const g = PE.analyzeGraph(state.nodes, state.edges);
            const live = e => !g.deadEdgeIds.has(e.id);
            const layer = {};
            g.ordered.forEach(n => {
                layer[n.id] = Math.max(0, ...g.inEdges[n.id].filter(e => live(e) && layer[e.from] !== undefined).map(e => layer[e.from] + 1));
            });
            const cols = {};
            g.ordered.forEach(n => (cols[layer[n.id]] = cols[layer[n.id]] || []).push(n));
            const GAP_X = 96, GAP_Y = 40, TOP = 80;
            const centre = {};
            const keys = Object.keys(cols).map(Number).sort((a, b) => a - b);
            const totals = keys.map(l => cols[l].reduce((sum, n) => sum + heightOf(n) + GAP_Y, -GAP_Y));
            const tallest = Math.max(0, ...totals);
            keys.forEach((l, k) => {
                const list = cols[l];
                // Order each column by where its inputs sit in the column before, so wires cross less.
                if (k) list.sort((a, b) => {
                    const mean = n => { const ys = g.inEdges[n.id].filter(live).map(e => centre[e.from]).filter(v => v !== undefined); return ys.length ? ys.reduce((p, c) => p + c, 0) / ys.length : 1e9; };
                    return mean(a) - mean(b);
                });
                let y = TOP + (tallest - totals[k]) / 2;
                list.forEach(n => {
                    const h = heightOf(n);
                    n.x = 40 + l * (NODE_W + GAP_X);
                    n.y = Math.round(y / 8) * 8;
                    centre[n.id] = y + h / 2;
                    y += h + GAP_Y;
                });
            });
            g.unwired.forEach((n, i) => {
                n.x = 40 + i * (NODE_W + GAP_X);
                n.y = Math.round((TOP + tallest + 80) / 8) * 8;
            });
            render({ inspector: false });
            fit();
        }
        function fit() {
            if (!state.nodes.length) {
                state.pan = { x: 24, y: 72 };
                state.zoom = 1;
                return applyView();
            }
            const r = els.canvas.getBoundingClientRect();
            const pad = 40, top = 64;
            const xs = state.nodes.map(n => n.x), ys = state.nodes.map(n => n.y);
            const minX = Math.min(...xs), minY = Math.min(...ys);
            const w = Math.max(...xs) + NODE_W - minX;
            const h = Math.max(...state.nodes.map(n => n.y + heightOf(n))) - minY;
            state.zoom = Math.min(1, Math.max(.35, Math.min((r.width - pad * 2) / w, (r.height - top - pad) / h)));
            const fw = w * state.zoom, fh = h * state.zoom;
            state.pan = {
                x: (fw > r.width - pad * 2 ? pad : (r.width - fw) / 2) - minX * state.zoom,
                y: (fh > r.height - top - pad ? top : top + (r.height - top - pad - fh) / 2) - minY * state.zoom
            };
            applyView();
        }
        function zoomBy(delta, cx, cy) {
            const r = els.canvas.getBoundingClientRect();
            cx = cx ?? r.width / 2;
            cy = cy ?? r.height / 2;
            const z = Math.min(1.6, Math.max(.35, +(state.zoom + delta).toFixed(2)));
            const k = z / state.zoom;
            state.pan = { x: cx - (cx - state.pan.x) * k, y: cy - (cy - state.pan.y) * k };
            state.zoom = z;
            applyView();
        }
        function loadTemplate(key, quiet) {
            const t = TEMPLATES[key];
            if (!t) return;
            importNotes = [];
            Object.assign(state, {
                title: t.title,
                nodes: JSON.parse(JSON.stringify(t.nodes)),
                edges: JSON.parse(JSON.stringify(t.edges)),
                selected: null
            });
            $('#pbp-workflow-title').value = t.title;
            render();
            // Templates saved without positions are laid out from their wiring on load.
            if (state.nodes.every(n => !n.x && !n.y)) autoLayout(true);
            else fit();
            if (quiet !== true) toast(`Loaded ${t.title}`, 'success');
        }

        /* ---------- clipboard, files ---------- */
        async function copyText(text) {
            try {
                await navigator.clipboard.writeText(text);
            } catch (e) {
                const t = document.createElement('textarea');
                t.value = text;
                t.style.position = 'fixed';
                t.style.opacity = '0';
                document.body.appendChild(t);
                t.select();
                document.execCommand('copy');
                t.remove();
            }
        }
        async function copyPrompt(btn) {
            if (!result.text.trim()) return toast('Wire some blocks together first', 'warning');
            await copyText(result.text);
            const issues = result.diagnostics.filter(d => d.level !== 'info').length;
            toast(issues ? `Copied, with ${issues} open check${issues === 1 ? '' : 's'}` : 'Prompt copied', 'success');
            const label = btn && btn.querySelector('.pbp-btn-label');
            if (label && !label.dataset.old) {
                label.dataset.old = label.textContent;
                label.textContent = 'Copied';
                setTimeout(() => { label.textContent = label.dataset.old; delete label.dataset.old; }, 1400);
            }
        }
        function download(ext) {
            if (!result.text.trim()) return toast('Wire some blocks together first', 'warning');
            const slug = (state.title || 'prompt').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'prompt';
            const text = ext === 'json' ? PE.compilePrompt(compileNodes(), state.edges, { ...state, format: 'json' }).text : result.text;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
            a.download = `${slug}.${ext}`;
            a.click();
            URL.revokeObjectURL(a.href);
            toast(`Saved ${slug}.${ext}`, 'success');
        }
        let jsonMode = 'export';
        const MD_EXAMPLE = `## Role\nYou are a senior support agent for a software company.\n\n## Task\nAnswer {{customer_message}} in under 120 words.\n\n## Constraints\n- Never promise a refund.\n\n## Output format\nPlain text, no headings.`;

        function openJson(mode) {
            jsonMode = mode;
            $('#pbp-json-error').hidden = true;
            $('#pbp-json-title').textContent = mode === 'export' ? 'Export backup' : 'Import a prompt';
            $('#pbp-json-desc').textContent = mode === 'export'
                ? 'This is the full canvas: every block, its settings, its position and its wires. Keep it as a backup. To share the prompt itself, use Export prompt (Markdown).'
                : 'Paste a prompt written in Markdown. Each heading becomes a block, wired in the order you wrote them. XML tags and a JSON backup work too.';
            $('#pbp-json-text').value = mode === 'export' ? JSON.stringify({ title: state.title, nodes: state.nodes, edges: state.edges }, null, 2) : '';
            $('#pbp-json-text').placeholder = MD_EXAMPLE;
            $('#pbp-json-action').textContent = mode === 'export' ? 'Copy JSON' : 'Build blocks';
            $('#pbp-json-pick').hidden = mode === 'export';
            $('#pbp-json-dialog').showModal();
        }
        function importText(text) {
            const src = text.trim();
            if (!src) throw new Error('blank');
            if (src[0] === '{') {
                let raw;
                try { raw = JSON.parse(src); } catch (e) { throw new Error('json'); }
                if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) throw new Error('shape');
                const clean = PE.sanitizeGraph(raw.nodes.map(n => ({
                    ...n, x: +n.x || 0, y: +n.y || 0, config: n.config || {}
                })), raw.edges);
                if (!clean.nodes.length) throw new Error('empty');
                return {
                    title: raw.title || 'Imported workflow',
                    nodes: clean.nodes, edges: clean.edges,
                    notes: clean.dropped ? [`${clean.dropped} broken item${clean.dropped === 1 ? ' was' : 's were'} skipped.`] : []
                };
            }
            const parsed = PE.parsePromptText(src);
            if (!parsed.nodes.length) throw new Error('empty');
            const ids = new Map(parsed.nodes.map(n => [n.id, uid('node')]));
            return {
                title: parsed.title || 'Imported prompt',
                notes: parsed.notes,
                nodes: parsed.nodes.map(n => ({ ...n, id: ids.get(n.id) })),
                edges: parsed.edges.map(e => ({ ...e, id: uid('edge'), from: ids.get(e.from), to: ids.get(e.to) }))
            };
        }
        async function jsonAction() {
            if (jsonMode === 'export') {
                await copyText($('#pbp-json-text').value);
                $('#pbp-json-dialog').close();
                return toast('Backup JSON copied', 'success');
            }
            const err = $('#pbp-json-error');
            try {
                const got = importText($('#pbp-json-text').value);
                Object.assign(state, { title: got.title, nodes: got.nodes, edges: got.edges, selected: null });
                $('#pbp-workflow-title').value = state.title;
                $('#pbp-json-dialog').close();
                render();
                fit();
                importNotes = got.notes;
                renderChecks();
                toast(`${got.nodes.length} block${got.nodes.length === 1 ? '' : 's'} built${got.notes.length ? `. ${got.notes.length} note${got.notes.length === 1 ? '' : 's'} in Checks.` : ''}`, 'success');
            } catch (e) {
                err.hidden = false;
                err.textContent = {
                    blank: 'Paste a prompt first, or choose a file.',
                    json: 'That looks like JSON but it does not parse. Check for a missing bracket or comma.',
                    shape: 'That JSON needs a "nodes" list and an "edges" list.',
                    empty: 'No sections with text were found. Add a heading such as "## Task" with a line under it.'
                }[e.message] || 'That could not be read.';
            }
        }

        /* ---------- trace ---------- */
        let tracing = false;
        async function runTrace() {
            if (tracing) return;
            const log = $('#pbp-trace-log');
            const g = PE.analyzeGraph(state.nodes, state.edges);
            if (!g.ordered.length) {
                log.innerHTML = `<div class="pbp-empty"><b>Nothing to trace</b>Wire at least two blocks together first.</div>`;
                return;
            }
            tracing = true;
            $('#pbp-trace-run').disabled = true;
            log.innerHTML = '';
            const mode = $('#pbp-trace-mode').value;
            const skip = new Set();
            const drop = id => {
                if (skip.has(id)) return;
                skip.add(id);
                g.outEdges[id].forEach(e => {
                    if (g.inEdges[e.to].every(i => skip.has(i.from))) drop(e.to);
                });
            };
            if (mode !== 'both') g.ordered.filter(n => n.type === 'ifelse').forEach(n => {
                g.outEdges[n.id].filter(e => e.fromPort !== mode).forEach(e => {
                    if (g.inEdges[e.to].length === 1) drop(e.to);
                });
            });
            const steps = g.ordered.filter(n => !skip.has(n.id));
            for (let i = 0; i < steps.length; i++) {
                const n = steps[i];
                const el = nodeEl(n.id);
                el && el.setAttribute('data-lit', '');
                $$('.pbp-wire').forEach(w => {
                    const e = state.edges.find(x => x.id === w.dataset.edge);
                    w.classList.toggle('pbp-is-trace', !!e && e.to === n.id && !skip.has(e.from));
                });
                log.insertAdjacentHTML('beforeend', `<div class="pbp-trace-step"><span class="pbp-mono">${String(i + 1).padStart(2, '0')}</span><span><b>${esc(PE.titleOf(n))}</b><span>${esc(summary(n).replace(/\n/g, ' '))}</span></span></div>`);
                log.parentElement.scrollTop = log.parentElement.scrollHeight;
                await new Promise(r => setTimeout(r, 480));
                el && el.removeAttribute('data-lit');
            }
            $$('.pbp-wire').forEach(w => w.classList.remove('pbp-is-trace'));
            if (g.unwired.length) log.insertAdjacentHTML('beforeend', `<div class="pbp-trace-step pbp-warn-text"><span class="pbp-mono"></span><span>Skipped ${g.unwired.length} block${g.unwired.length === 1 ? '' : 's'} that are not wired in.</span></div>`);
            tracing = false;
            $('#pbp-trace-run').disabled = false;
        }

        /* ---------- pointer interactions (wires drag from either side) ---------- */
        let drag = null;
        const toCanvas = e => {
            const r = els.canvas.getBoundingClientRect();
            return {
                x: (e.clientX - r.left - state.pan.x) / state.zoom,
                y: (e.clientY - r.top - state.pan.y) / state.zoom
            };
        };
        els.canvas.addEventListener('pointerdown', e => {
            if (e.button > 0 || e.target.closest('.pbp-float, .pbp-inspector, button')) return;
            const portOut = e.target.closest('.pbp-port[data-dir=out]');
            const portIn = e.target.closest('.pbp-port[data-dir=in]');
            const overNode = e.target.closest('.pbp-node');
            const wire = e.target.closest('.pbp-wire');
            if (portOut) {
                drag = { mode: 'wire', dir: 'out', from: overNode.dataset.id, port: portOut.dataset.port };
                portOut.setAttribute('data-on', '');
            } else if (portIn) {
                drag = { mode: 'wire', dir: 'in', from: overNode.dataset.id, port: portIn.dataset.port };
                portIn.setAttribute('data-on', '');
            } else if (overNode) {
                const n = node(overNode.dataset.id);
                if (state.selected !== n.id) select(n.id);
                drag = { mode: 'node', id: n.id, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y, moved: false };
            } else if (wire) return;
            else {
                drag = { mode: 'pan', sx: e.clientX - state.pan.x, sy: e.clientY - state.pan.y, moved: false };
            }
            els.canvas.setPointerCapture(e.pointerId);
            e.preventDefault();
            if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
        });

        els.canvas.addEventListener('pointermove', e => {
            if (!drag) return;
            if (drag.mode === 'pan') {
                state.pan = { x: e.clientX - drag.sx, y: e.clientY - drag.sy };
                drag.moved = true;
                els.canvas.classList.add('pbp-is-panning');
                applyView();
            } else if (drag.mode === 'node') {
                const n = node(drag.id);
                if (!n) return;
                const dx = (e.clientX - drag.sx) / state.zoom;
                const dy = (e.clientY - drag.sy) / state.zoom;
                if (!drag.moved && Math.hypot(dx, dy) < 3) return;
                drag.moved = true;
                n.x = Math.round(drag.ox + dx);
                n.y = Math.round(drag.oy + dy);
                const el = nodeEl(n.id);
                el.style.left = n.x + 'px';
                el.style.top = n.y + 'px';
                renderWires();
            } else if (drag.mode === 'wire') {
                const cursor = toCanvas(e);
                const anchor = portPoint(drag.from, drag.port, drag.dir);
                if (!anchor) return;
                els.temp.hidden = false;
                els.temp.setAttribute('d', drag.dir === 'out' ? curve(anchor, cursor) : curve(cursor, anchor));

                const el = document.elementFromPoint(e.clientX, e.clientY);
                const overNode = el?.closest('.pbp-node');
                const wantDir = drag.dir === 'out' ? 'in' : 'out';
                const overPort = el?.closest(`.pbp-port[data-dir=${wantDir}]`);
                $$('.pbp-node[data-drop]').forEach(n => n.removeAttribute('data-drop'));
                $$('.pbp-port[data-on]').forEach(p => { if (p !== e.target) p.removeAttribute('data-on'); });

                if (overNode && overNode.dataset.id !== drag.from) {
                    const t = node(overNode.dataset.id);
                    const compatible = drag.dir === 'out' ? !!BLOCKS[t.type].inputs : BLOCKS[t.type].outputs.length > 0;
                    if (compatible) {
                        overNode.setAttribute('data-drop', '');
                        (overPort || overNode.querySelector(`.pbp-port[data-dir=${wantDir}]`))?.setAttribute('data-on', '');
                    }
                }
            }
        });

        const endDrag = e => {
            if (!drag) return;
            const d = drag;
            drag = null;
            els.canvas.classList.remove('pbp-is-panning');
            if (d.mode === 'wire') {
                els.temp.hidden = true;
                $$('[data-on]').forEach(p => p.removeAttribute('data-on'));
                $$('.pbp-node[data-drop]').forEach(n => n.removeAttribute('data-drop'));
                if (e.type !== 'pointerup') return;
                const el = document.elementFromPoint(e.clientX, e.clientY);
                const overNode = el?.closest('.pbp-node');
                if (!overNode || !root.contains(overNode)) return;
                const t = node(overNode.dataset.id);
                if (d.dir === 'out') {
                    const overPort = el?.closest('.pbp-port[data-dir=in]');
                    const toPort = overPort?.dataset.port || inputsOf(t.type)[0]?.id || 'in';
                    connect(d.from, d.port, overNode.dataset.id, toPort);
                } else {
                    const overPort = el?.closest('.pbp-port[data-dir=out]');
                    if (!BLOCKS[t.type].outputs.length) return;
                    const fromPort = overPort?.dataset.port || BLOCKS[t.type].outputs[0].id;
                    connect(overNode.dataset.id, fromPort, d.from, d.port);
                }
            } else if (d.mode === 'node' && d.moved) {
                const n = node(d.id);
                n.x = Math.round(n.x / 8) * 8;
                n.y = Math.round(n.y / 8) * 8;
                render({ inspector: false });
            } else if (d.mode === 'pan' && !d.moved && state.selected) select(null);
        };
        els.canvas.addEventListener('pointerup', endDrag);
        els.canvas.addEventListener('pointercancel', endDrag);

        els.canvas.addEventListener('wheel', e => {
            if (e.target.closest('.pbp-inspector')) return;
            e.preventDefault();
            const r = els.canvas.getBoundingClientRect();
            zoomBy(e.deltaY < 0 ? .06 : -.06, e.clientX - r.left, e.clientY - r.top);
        }, { passive: false });

        els.canvas.addEventListener('dragover', e => e.preventDefault());
        els.canvas.addEventListener('drop', e => {
            e.preventDefault();
            const t = e.dataTransfer.getData('text/plain');
            const p = toCanvas(e);
            if (t.startsWith('workshop:')) addComponent(workshop[+t.slice(9)], p.x - NODE_W / 2, p.y - 24);
            else if (BLOCKS[t]) addNode(t, p.x - NODE_W / 2, p.y - 24);
        });
        els.canvas.addEventListener('pointerover', e => {
            const n = e.target.closest('.pbp-node');
            if (n && !drag) light([n.dataset.id], true);
        });
        els.canvas.addEventListener('pointerout', e => {
            const n = e.target.closest('.pbp-node');
            if (n && !tracing) light([n.dataset.id], false);
        });

        /* ---------- delegated UI events, all on the workspace root ---------- */
        const actions = {
            autoLayout: () => autoLayout(), autoWire, fit, trace: runTrace, addAgents,
            close: () => closeWorkspace(),
            openLibrary,
            importJson: () => openJson('import'),
            exportJson: () => openJson('export'),
            exportMd: () => {
                const keep = state.format;
                state.format = 'markdown';
                compile();
                download('md');
                state.format = keep;
                compile();
            },
            clear: () => (state.nodes.length ? $('#pbp-confirm-dialog').showModal() : toast('The canvas is already empty')),
            copy: btn => copyPrompt(btn),
            downloadTxt: () => download(state.format === 'markdown' ? 'md' : 'txt'),
            downloadJson: () => download('json'),
            zoomIn: () => zoomBy(.1),
            zoomOut: () => zoomBy(-.1),
            deselect: () => select(null),
            deleteSelected: () => state.selected && removeNode(state.selected),
            duplicate: () => {
                const n = node(state.selected);
                if (!n) return;
                const c = { ...JSON.parse(JSON.stringify(n)), id: uid('node'), x: n.x + 32, y: n.y + 32 };
                state.nodes.push(c);
                state.selected = c.id;
                render();
            },
            resetText: () => {
                const n = node(state.selected);
                if (!n) return;
                if (isComponent(n)) n.config = { ...n.config, content: n.config.original || '' };
                else n.config = { ...JSON.parse(JSON.stringify(BLOCKS[n.type].defaults)), title: n.config.title };
                render();
                toast('Default text restored', 'success');
            },
            openGuide: () => { $('#pbp-guide-dialog').showModal(); $('.pbp-guide-body').scrollTop = 0; }
        };

        root.addEventListener('click', e => {
            const menu = $('#pbp-workflow-menu');
            if (menu.open && !e.target.closest('#pbp-workflow-menu summary')) menu.open = false;
            if (libraryOpen() && e.target.closest('#pcwGallery')) return;
            const t = e.target.closest('[data-ws-add], [data-ws-remove], [data-template], [data-act], [data-add], [data-del], [data-goto], [data-edge], [data-tab], [data-format], [data-cat-chip], [data-close], .pbp-part, .pbp-node-body');
            if (!t) return;
            if (t.dataset.wsAdd) return addComponent(workshop[+t.dataset.wsAdd]);
            if (t.dataset.wsRemove) return removeFromWorkshop(+t.dataset.wsRemove);
            if (t.dataset.template) { t.closest('dialog')?.close(); return loadTemplate(t.dataset.template); }
            if (t.dataset.act) return actions[t.dataset.act]?.(t);
            if (t.dataset.add) return addNode(t.dataset.add);
            if (t.dataset.del) return removeNode(t.dataset.del);
            if (t.dataset.goto) return select(t.dataset.goto, { reveal: true });
            if (t.dataset.edge) {
                state.edges = state.edges.filter(x => x.id !== t.dataset.edge);
                return render({ inspector: false });
            }
            if (t.dataset.tab) return setTab(t.dataset.tab);
            if (t.dataset.format) {
                state.format = t.dataset.format;
                $$('[data-format]').forEach(b => b.setAttribute('aria-pressed', b === t));
                return render({ inspector: false });
            }
            if (t.dataset.catChip) {
                state.cat = t.dataset.catChip;
                renderChips();
                return renderLibrary();
            }
            if (t.hasAttribute('data-close')) return t.closest('dialog').close();
            if (t.classList.contains('pbp-part')) return select(t.dataset.node);
        });

        root.addEventListener('input', e => {
            const t = e.target;
            if (t.dataset.field && state.selected) {
                const n = node(state.selected);
                n.config[t.dataset.field] = t.type === 'number' ? Number(t.value) : t.value;
                return renderSoon();
            }
            if (t.id === 'pbp-workflow-title') { state.title = t.value; return renderSoon(); }
            if (t.id === 'pbp-block-search') { state.query = t.value; return renderLibrary(); }
        });

        root.addEventListener('change', e => {
            if (e.target.id === 'pbp-template-select') {
                loadTemplate(e.target.value);
                e.target.value = '';
            }
            // Moving a component to another prompt section keeps its wires, every section shares the same ports.
            if (e.target.hasAttribute('data-section') && isComponent(node(state.selected))) {
                node(state.selected).type = COMPONENT + e.target.value;
                render();
            }
        });

        root.addEventListener('dragstart', e => {
            const w = e.target.closest?.('[data-ws]');
            if (w) return e.dataTransfer.setData('text/plain', 'workshop:' + w.dataset.ws);
            const t = e.target.closest?.('[data-add]');
            if (t) e.dataTransfer.setData('text/plain', t.dataset.add);
        });

        // Keys only act while this workspace is open and nothing else has focus.
        document.addEventListener('keydown', e => {
            if (!isOpen()) return;
            if (e.target !== document.body && !root.contains(e.target)) return;
            // While the library covers the workspace, keys belong to it. Escape with no focus closes it.
            if (libraryOpen()) {
                if (e.key === 'Escape') returnGallery();
                return;
            }
            const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
            if (e.key === 'Enter' && e.target.classList?.contains('pbp-part')) return select(e.target.dataset.node);
            if ($('dialog[open]')) return;
            if (e.key === 'Escape') {
                const menu = $('#pbp-workflow-menu');
                if (menu.open) menu.open = false;
                else if (state.selected) select(null);
                else if (typing) e.target.blur();
                else closeWorkspace();
                return;
            }
            if (typing) return;
            if ((e.key === 'Delete' || e.key === 'Backspace') && state.selected) {
                e.preventDefault();
                removeNode(state.selected);
            }
        });

        $('#pbp-doc-wrap').addEventListener('pointerover', e => {
            const p = e.target.closest('.pbp-part');
            if (p) light(p.dataset.nodes.split(' '), true);
        });
        $('#pbp-doc-wrap').addEventListener('pointerout', e => {
            const p = e.target.closest('.pbp-part');
            if (p) light(p.dataset.nodes.split(' '), false);
        });

        for (const [id, key, on, off] of [
            ['pbp-sample-switch', 'sample', true, false],
            ['pbp-order-switch', 'order', 'wire', 'canonical']
        ]) {
            $('#' + id).addEventListener('click', e => {
                e.preventDefault();
                const v = state[key] === on ? off : on;
                state[key] = v;
                e.currentTarget.setAttribute('aria-checked', v === on);
                render({ inspector: false });
            });
        }

        $('#pbp-json-action').addEventListener('click', jsonAction);
        $('#pbp-json-pick').addEventListener('click', () => $('#pbp-json-file').click());
        $('#pbp-json-file').addEventListener('change', async e => {
            const f = e.target.files[0];
            if (!f) return;
            $('#pbp-json-text').value = await f.text();
            $('#pbp-json-error').hidden = true;
            e.target.value = '';
        });
        $('#pbp-confirm-yes').addEventListener('click', () => {
            importNotes = [];
            state.nodes = [];
            state.edges = [];
            state.selected = null;
            $('#pbp-confirm-dialog').close();
            render();
            toast('Canvas cleared');
        });
        $('#pbp-guide-load-example').addEventListener('click', () => {
            loadTemplate('plannerWriterCritic');
            $('#pbp-guide-dialog').close();
        });

        window.addEventListener('resize', () => { if (isOpen()) requestAnimationFrame(renderWires); });

        /* ---------- static content ---------- */
        const optionsFor = group => Object.entries(TEMPLATES).filter(([, t]) => (t.group || 'prompt') === group).map(([k, t]) => `<option value="${k}">${esc(t.title.replace(/^Team: /, ''))}</option>`).join('');
        $('#pbp-template-select').innerHTML = `<option value="" disabled selected>Templates</option><optgroup label="Prompt patterns">${optionsFor('prompt')}</optgroup><optgroup label="Agent teams">${optionsFor('agents')}</optgroup>`;
        $('#pbp-guide-patterns').innerHTML = Object.entries(TEMPLATES).filter(([, t]) => t.group === 'agents').map(([k, t]) => `
            <div class="pbp-pattern"><b>${esc(t.title.replace(/^Team: /, ''))}</b><p>${esc(t.about)}</p><pre>${esc(t.shape)}</pre>
            <button class="btn pbp-btn-xs" data-template="${k}">Load this team</button></div>`).join('');
        $('#pbp-guide-agents').innerHTML = `<table><thead><tr><th>Block</th><th>What it is for</th><th>Takes in</th><th>Hands out</th></tr></thead><tbody>${
            ['worker', 'reviewer', 'coordinator', 'plumbing'].flatMap(k => LIBRARY.filter(b => b.category === 'agents' && b.kind === k)).map(b => `<tr><td>${esc(b.label)}</td><td>${esc(b.about)}</td><td>${b.inputs.map(p => esc(p.label)).join(', ')}</td><td>${b.outputs.map(p => esc(p.label)).join(', ')}</td></tr>`).join('')
        }</tbody></table>`;
        renderChips();
        renderLibrary();
        loadWorkshop();
        renderWorkshop();
        setTab('prompt');
        const restored = restore();
        if (restored) {
            $('#pbp-workflow-title').value = state.title;
            $$('[data-format]').forEach(b => b.setAttribute('aria-pressed', b.dataset.format === state.format));
            $('#pbp-sample-switch').setAttribute('aria-checked', state.sample);
            $('#pbp-order-switch').setAttribute('aria-checked', state.order === 'wire');
        }

        // The canvas measures the DOM, so the first paint waits until the workspace is on screen.
        let painted = false;
        function show() {
            if (!painted) {
                painted = true;
                if (restored) { render(); fit(); }
                else loadTemplate('default', true);
                document.fonts?.ready.then(() => { if (isOpen()) renderWires(); });
            } else {
                renderWires();
            }
        }
        function closeDialogs() {
            returnGallery();
            $$('dialog[open]').forEach(d => d.close());
            $('#pbp-workflow-menu').open = false;
        }

        return { state, get result() { return result; }, get workshop() { return workshop; }, render, connect, addNode, loadTemplate, select, show, closeDialogs };
    }

    function ensure() {
        const root = document.getElementById('builderProWorkspace');
        if (!root) return null;
        if (!api) api = mount(root);
        return root;
    }

    function closeWorkspace() {
        const root = document.getElementById('builderProWorkspace');
        if (!root) return;
        if (api) api.closeDialogs();
        root.classList.remove('open');
        document.querySelectorAll('.nav-item[data-view]').forEach(el =>
            el.classList.toggle('active', el.dataset.view === 'library'));
    }

    window.openBuilderProWorkspace = function () {
        if (!document.body.classList.contains('is-premium')) return toast('Prompt Builder Pro is a Pro feature', 'warning');
        const root = ensure();
        if (!root) return;
        root.classList.add('open');
        document.querySelectorAll('.nav-item[data-view]').forEach(el => el.classList.remove('active'));
        api.show();
    };
    window.PL_closeBuilderPro = closeWorkspace;
    Object.defineProperty(window, '__pb', { configurable: true, get: () => api });

    // Build the hidden markup once the page is idle, so the first open only has to paint.
    function initBuilderProWorkspace() {
        const idle = window.requestIdleCallback || (fn => setTimeout(fn, 400));
        idle(() => { try { ensure(); } catch (e) { console.warn('Prompt Builder Pro failed to build:', e); } });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBuilderProWorkspace);
    else initBuilderProWorkspace();
})();
