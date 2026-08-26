/* Agents / Roles workspace — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    async function updateRoleDropdown(selectedId) {
        const sel = $('#promptRole');
        if (!sel) return;
        try {
            const res = await fetch('/api/roles');
            const data = await res.json();
            const roles = Array.isArray(data) ? data : (data.roles || []);
            sel.innerHTML = '<option value="">No role</option>' +
                roles.map(r => `<option value="${r.id}">${escapeHtml(r.icon || '')} ${escapeHtml(r.name)}</option>`).join('');
            // Set selected value and sync hidden field immediately
            sel.value = selectedId ? String(selectedId) : '';
            const hid = $('#promptRoleId');
            if (hid) hid.value = sel.value;
            // Wire change once via onchange (avoids stacking listeners on repeated modal opens)
            sel.onchange = () => {
                const h = $('#promptRoleId');
                if (h) h.value = sel.value;
            };
        } catch (e) {
            console.warn('updateRoleDropdown error', e);
        }
    }
    


    /* ── Open / close ─────────────────────────────────────────────────────────── */
    window.openRolesWorkspace = async function() {
        const ws = $('#rolesWorkspace');
        if (!ws) return;
        ws.classList.add('open');
        document.body.style.overflow = 'hidden';
        await loadRoles();
    };

    function closeRolesWorkspace() {
        const ws = $('#rolesWorkspace');
        if (!ws) return;
        ws.classList.remove('open');
        document.body.style.overflow = '';
        _rolesState.activeId = null;
        _rolesState.dirty = false;
    }

    


    /* ── Render left-pane list ────────────────────────────────────────────────── */
    function renderRolesList() {
        const list = $('#rolesList');
        const empty = $('#rolesListEmpty');
        const search = $('#rolesSearch')?.value?.toLowerCase() || '';
        if (!list) return;

        let roles = _rolesState.roles;
        if (search) roles = roles.filter(r => r.name.toLowerCase().includes(search));

        if (!roles.length) {
            list.innerHTML = '';
            if (empty) empty.style.display = 'block';
            updateAgentBuilderStats();
            return;
        }
        if (empty) empty.style.display = 'none';

        list.innerHTML = roles.map(r => `
    <div class="role-list-item ${r.id === _rolesState.activeId ? 'active' : ''}"
         onclick="openRoleInEditor(${r.id})">
      <span class="role-item-icon">${escapeHtml(r.icon || '🤖')}</span>
      <span class="role-item-name">${escapeHtml(r.name)}</span>
      ${(r._useCount > 0) ? `<span class="role-item-count" title="Used by ${r._useCount} prompt${r._useCount !== 1 ? 's' : ''}">${r._useCount}</span>` : ''}
      <button class="role-item-fav ${r.is_favorite ? 'active' : ''} material-symbols-outlined"
              onclick="event.stopPropagation(); window.PL_toggleRoleFav(${r.id})"
              title="${r.is_favorite ? 'Remove favourite' : 'Mark as favourite'}"
              aria-label="Toggle favourite">
        ${r.is_favorite ? 'star' : 'star_border'}
      </button>
    </div>
  `).join('');

        updateAgentBuilderStats();
    }

    


    /* ── Open a role in the editor ────────────────────────────────────────────── */
    function openRoleInEditor(id) {
        const role = _rolesState.roles.find(r => r.id === id);
        if (!role) return;

        _rolesState.activeId = id;
        _rolesState.dirty = false;
        renderRolesList(); // refresh active state

        // Show form, hide empty state
        const empty = $('#rolesEditorEmpty');
        const form = $('#rolesEditorForm');
        if (empty) empty.style.display = 'none';
        if (form) form.style.display = 'flex';

        // Populate fields
        const set = (id, val) => {
            const el = $(id);
            if (el) el.value = val || '';
        };
        set('#roleNameInput', role.name);
        set('#rolePersonaInput', role.persona);
        set('#roleToneInput', role.tone);
        set('#roleExpertiseInput', role.expertise);
        set('#rolePromptStarter', role.prompt_starter || 'You are a');
        // roleTypeInput is the free-text suffix — no separate DB field, starter already includes it
        if ($('#roleTypeInput')) $('#roleTypeInput').value = '';
        set('#roleStyleInput', role.response_style || '');
        set('#roleAudienceInput', role.audience || '');
        set('#roleDomainInput', role.domain || '');
        set('#roleConstraintsInput', role.constraints || '');
        set('#roleOutputFormatInput', role.output_format || '');
        set('#roleTasksInput', role.tasks || '');
        set('#roleGoalInput', role.goal || '');
        set('#roleOutcomeInput', role.outcome || '');
        set('#roleInitInput', role.opening_message || '');
        set('#roleMemoryInput', role.persistent_context || '');
        set('#rolePersonaInput', role.persona || '');

        const iconBtn = $('#roleIconBtn');
        if (iconBtn) iconBtn.textContent = role.icon || '🎯';

        // Restore chips per group from saved values
        const _restoreChip = (groupSel, val) => {
            if (!val) return;
            const v = val.toLowerCase();
            $$(groupSel + ' .role-chip').forEach(c => c.classList.toggle('on', c.dataset.val === v));
        };
        _restoreChip('#roleStyleChips', role.response_style);
        _restoreChip('#roleDepthChips', role.depth);
        _restoreChip('#roleFormatModeChips', role.format_mode);
        _restoreChip('#roleProcTypeChips', role.interaction_mode);
        const savedFlags = Array.isArray(role.behaviour_flags) ? role.behaviour_flags : [];
        $$('#roleFlagChips .role-chip').forEach(c => c.classList.toggle('on', savedFlags.includes(c.dataset.val)));

        // Toolbar buttons state
        const delBtn = $('#rolesDeleteBtn');
        if (delBtn) delBtn.style.display = '';

        // Render knowledge base entries
        renderKbList(role.knowledge_base || []);

        // Render skills entries
        renderSkillList(role.skills || []);

        // Render example phrases
        const phrases = role.example_phrases || (role.example_phrase ? [{
            text: role.example_phrase
        }] : []);
        renderExampleList(phrases);

        updateRolePromptPreview();
    }

    


    /* ── Build Prompt — three formats ────────────────────────────────────────── */
    function buildRolePrompt(role, format) {
        const name = (role.name || '').trim();
        const starter = (role.prompt_starter || 'You are a').trim();
        const persona = (role.persona || '').trim();
        const tone = (role.tone || '').trim();
        const expertise = (role.expertise || '').trim();
        const respStyle = (role.response_style || '').trim();
        const audience = (role.audience || '').trim();
        const domain = (role.domain || '').trim();
        const constraints = (role.constraints || '').trim();
        const outFmt = (role.output_format || '').trim();
        const wfNotes = (role.workflow_notes || '').trim();
        const flags = role.behaviour_flags || [];
        const icon = (role.icon || '\U0001f3af');
        const complexity = (role.complexity || '').trim();
        const initInstr = (role.init_instr || '').trim();
        const memCtx = (role.mem_ctx || '').trim();
        const procType = (role.proc_type || '').trim();
        const examples = (role.example_phrases || (role.example_phrase ? [{
            text: role.example_phrase
        }] : [])).filter(e => e && e.text && e.text.trim());

        // Only include KB entries where include === true
        const includedKb = (role.knowledge_base || []).filter(e => e.include !== false);
        const skills = (role.skills || []).filter(e => e.name);

        // Human-readable flag labels
        const flagLabels = {
            no_hedging: 'Never hedge or qualify answers unnecessarily.',
            cite_sources: 'Always cite sources when referencing facts or data.',
            ask_clarify: 'Ask clarifying questions before proceeding when the request is ambiguous.',
            step_by_step: 'Break down complex tasks step by step.',
            no_preamble: 'Get straight to the point — no preamble or filler.',
            show_reasoning: 'Show your reasoning before giving a final answer.',
            use_examples: 'Use concrete examples to illustrate points.',
            stay_on_topic: 'Stay strictly on topic and redirect if the conversation drifts.',
        };

        if (format === 'structured') {
            const parts = [];
            const openingLine = name ? `${starter} ${name}${persona ? '' : '.'}` : '';
            if (openingLine) parts.push(`## Identity\n${icon} ${openingLine}`);
            if (persona) parts.push(`## Persona\n${persona}`);
            if (tone) parts.push(`## Tone\n${tone}`);
            if (expertise) parts.push(`## Expertise\n${expertise}`);
            if (respStyle) parts.push(`## Response Style\n${respStyle}`);
            if (audience || complexity) {
                const ctx = [audience && `Audience: ${audience}`, complexity && `Complexity: ${complexity}`].filter(Boolean).join('\n');
                parts.push(`## Context\n${ctx}`);
            }
            if (flags.length) {
                parts.push(`## Behavioural Rules\n${flags.map(f => '- ' + (flagLabels[f] || f)).join('\n')}`);
            }
            if (constraints) parts.push(`## Constraints\n${constraints}`);
            if (initInstr) parts.push(`## Initialization\n${initInstr}`);
            if (memCtx) parts.push(`## Memory & Context\n${memCtx}`);
            if (procType || outFmt || wfNotes) {
                const wf = [procType && `Process: ${procType}`, outFmt && `Output format: ${outFmt}`, wfNotes].filter(Boolean).join('\n');
                parts.push(`## Workflow\n${wf}`);
            }
            if (examples.length) parts.push(`## Example Phrases\n${examples.map(e => '"' + e.text.trim() + '"').join('\n')}`);
            if (skills.length) {
                const skBlock = skills.map(s => {
                    const lines = [];
                    if (s.name) lines.push(`### ${s.name}`);
                    if (s.description) lines.push(s.description);
                    if (s.example) lines.push(`*Example: ${s.example}*`);
                    return lines.join('\n');
                }).join('\n\n');
                parts.push(`## Skills\n${skBlock}`);
            }
            if (includedKb.length) {
                const kbBlock = includedKb.map(e => {
                    const lines = [];
                    if (e.name) lines.push(`### ${e.name}`);
                    if (e.when_to_use) lines.push(`*When to use: ${e.when_to_use}*`);
                    if (e.content) lines.push(e.content);
                    return lines.join('\n');
                }).join('\n\n');
                parts.push(`## Knowledge Base\n${kbBlock}`);
            }
            return parts.join('\n\n') || '';
        }

        if (format === 'xml') {
            const parts = [`<agent>`];
            if (name) parts.push(`  <name>${name}</name>`);
            if (starter) parts.push(`  <prompt_starter>${starter}</prompt_starter>`);
            if (persona) parts.push(`  <persona>${persona}</persona>`);
            if (tone) parts.push(`  <tone>${tone}</tone>`);
            if (expertise) parts.push(`  <expertise>${expertise}</expertise>`);
            if (respStyle) parts.push(`  <response_style>${respStyle}</response_style>`);
            if (audience) parts.push(`  <audience>${audience}</audience>`);
            if (complexity) parts.push(`  <complexity>${complexity}</complexity>`);
            if (flags.length) {
                parts.push(`  <behaviour_flags>`);
                flags.forEach(f => parts.push(`    <flag>${f}</flag>`));
                parts.push(`  </behaviour_flags>`);
            }
            if (constraints) parts.push(`  <constraints>${constraints}</constraints>`);
            if (initInstr) parts.push(`  <initialization>${initInstr}</initialization>`);
            if (memCtx) parts.push(`  <memory_context>${memCtx}</memory_context>`);
            if (procType) parts.push(`  <process_type>${procType}</process_type>`);
            if (outFmt) parts.push(`  <output_format>${outFmt}</output_format>`);
            if (wfNotes) parts.push(`  <workflow_notes>${wfNotes}</workflow_notes>`);
            if (examples.length) {
                examples.forEach(e => parts.push(`  <example_phrase>${e.text.trim()}</example_phrase>`));
            }
            if (skills.length) {
                parts.push(`  <skills>`);
                skills.forEach(s => {
                    parts.push(`    <skill>`);
                    if (s.name) parts.push(`      <name>${s.name}</name>`);
                    if (s.description) parts.push(`      <description>${s.description}</description>`);
                    if (s.example) parts.push(`      <example>${s.example}</example>`);
                    parts.push(`    </skill>`);
                });
                parts.push(`  </skills>`);
            }
            if (includedKb.length) {
                parts.push(`  <knowledge_base>`);
                includedKb.forEach(e => {
                    parts.push(`    <entry>`);
                    if (e.name) parts.push(`      <name>${e.name}</name>`);
                    if (e.when_to_use) parts.push(`      <when_to_use>${e.when_to_use}</when_to_use>`);
                    if (e.content) parts.push(`      <content>${e.content}</content>`);
                    parts.push(`    </entry>`);
                });
                parts.push(`  </knowledge_base>`);
            }
            parts.push(`</agent>`);
            return parts.join('\n');
        }

        if (format === 'prose') {
            const bits = [];
            if (name) bits.push(`${starter} ${name}.`);
            if (persona) bits.push(persona);
            if (tone) bits.push(`Tone: ${tone}.`);
            if (expertise) bits.push(`Areas of expertise: ${expertise}.`);
            if (respStyle) bits.push(`Response style: ${respStyle}.`);
            if (audience) bits.push(`Target audience: ${audience}.`);
            if (complexity) bits.push(`Complexity level: ${complexity}.`);
            if (flags.length) bits.push(flags.map(f => flagLabels[f] || f).join(' '));
            if (constraints) bits.push(`Constraints: ${constraints}`);
            if (initInstr) bits.push(`On start: ${initInstr}`);
            if (memCtx) bits.push(`Memory: ${memCtx}`);
            if (procType || outFmt) bits.push([procType && `Process: ${procType}`, outFmt && `Output: ${outFmt}`].filter(Boolean).join('. ') + '.');
            if (examples.length) bits.push(`Example${examples.length > 1 ? 's' : ''} of how you speak: ${examples.map(e => `"${e.text.trim()}"`).join(', ')}`);
            if (skills.length) {
                const skText = skills.map(s => {
                    let t = s.name;
                    if (s.description) t += `: ${s.description}`;
                    return t;
                }).join('; ');
                bits.push(`Skills: ${skText}.`);
            }
            if (includedKb.length) {
                const kbText = includedKb.map(e => {
                    let s = '';
                    if (e.name) s += `[${e.name}]`;
                    if (e.content) s += ` ${e.content}`;
                    return s.trim();
                }).filter(Boolean).join(' | ');
                if (kbText) bits.push(`Reference knowledge: ${kbText}`);
            }
            return bits.join(' ') || '';
        }

        return '';
    }

    


    /* ── Wire up Roles workspace events (called from init) ───────────────────── */
    function initRolesWorkspace() {
        // Nav button is wired in init() via the generic nav-item[data-view] handler.
        // No duplicate listener here — that caused openRolesWorkspace() to fire twice.

        // Config panel
        initConfigPanel();

        // ── Section nav tabs ────────────────────────────────────────────────────
        document.addEventListener('click', e => {
            const tab = e.target.closest('.role-nav-tab');
            if (!tab) return;
            const section = tab.dataset.section;
            if (!section) return;
            // Activate tab
            $$('.role-nav-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            // Show matching panel
            $$('.role-section-panel').forEach(p => p.classList.remove('active'));
            const panel = $(`#role-section-${section}`);
            if (panel) panel.classList.add('active');
            // Refresh preview when switching to preview tab
            if (section === 'preview') updateRolePromptPreview();
        });

        // Behaviour chips - single-select groups enforce exclusivity
        const SINGLE_SELECT_GROUPS = ['roleStyleChips', 'roleDepthChips', 'roleFormatModeChips', 'roleProcTypeChips'];
        document.addEventListener('click', e => {
            const chip = e.target.closest('.role-chip');
            if (!chip || !$('#rolesWorkspace')?.classList.contains('open')) return;
            const group = chip.closest('.role-chip-group');
            if (group && SINGLE_SELECT_GROUPS.includes(group.id)) {
                const wasOn = chip.classList.contains('on');
                group.querySelectorAll('.role-chip').forEach(c => c.classList.remove('on'));
                if (!wasOn) chip.classList.add('on');
            } else {
                chip.classList.toggle('on');
            }
            updateRolePromptPreview();
        });

        // ── Button wiring ───────────────────────────────────────────────────────
        const generateBtn = $('#rolesGenerateBtn');
        if (generateBtn) generateBtn.addEventListener('click', window.PL_generateRoleWithAI);
        const generateBtn2 = $('#rolesGenerateBtn2');
        if (generateBtn2) generateBtn2.addEventListener('click', window.PL_generateRoleWithAI);

        const closeBtn = $('#rolesCloseBtn');
        if (closeBtn) closeBtn.addEventListener('click', closeRolesWorkspace);

        const newBtn = $('#rolesNewBtn');
        if (newBtn) newBtn.addEventListener('click', window.PL_newRole);

        const saveBtn = $('#rolesSaveBtn');
        if (saveBtn) saveBtn.addEventListener('click', window.PL_saveRole);

        const dupBtn = $('#rolesDuplicateBtn');
        if (dupBtn) dupBtn.addEventListener('click', window.PL_duplicateRole);

        const delBtn = $('#rolesDeleteBtn');
        if (delBtn) delBtn.addEventListener('click', window.PL_deleteRole);

        // ── Search ──────────────────────────────────────────────────────────────
        const search = $('#rolesSearch');
        if (search) search.addEventListener('input', () => renderRolesList());

        // ── Live preview — all fields that affect the prompt ───────────────────
        const liveFields = [
            '#roleNameInput', '#rolePersonaInput', '#roleToneInput', '#roleExpertiseInput',
            '#rolePromptStarter', '#roleStyleInput', '#roleConstraintsInput',
            '#roleTasksInput', '#roleOutputFormatInput', '#roleAudienceInput',
            '#roleDomainInput',
        ];
        liveFields.forEach(sel => {
            const el = $(sel);
            if (el) el.addEventListener('input', updateRolePromptPreview);
            if (el && el.tagName === 'SELECT') el.addEventListener('change', updateRolePromptPreview);
        });

        const colPicker = $('#roleColourPicker');
        if (colPicker) colPicker.addEventListener('input', updateRolePromptPreview);

        // ── Icon picker ─────────────────────────────────────────────────────────
        const iconBtn = $('#roleIconBtn');
        if (iconBtn) {
            iconBtn.addEventListener('click', () => {
                const val = prompt('Enter an emoji for this agent:', iconBtn.textContent.trim());
                if (val && val.trim()) {
                    iconBtn.textContent = val.trim();
                    updateRolePromptPreview();
                }
            });
        }

        // ── Escape closes ───────────────────────────────────────────────────────
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && $('#rolesWorkspace')?.classList.contains('open')) {
                closeRolesWorkspace();
            }
        });
    }

    
