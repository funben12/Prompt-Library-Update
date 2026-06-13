#!/usr/bin/env python3
"""Expand agent editor: remove Full Persona, add sections, fix nav indicator."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

html = open('static/index.html', 'r', encoding='utf-8').read()
css  = open('static/app.css',   'r', encoding='utf-8').read()

# ══════════════════════════════════════════════════════════════════════════
# 1. REMOVE FULL PERSONA — just that one form-group div
# ══════════════════════════════════════════════════════════════════════════

OLD_PERSONA = '''            <div class="form-group">
              <label class="form-label" for="rolePersonaInput">Full persona <span style="color:var(--ink-4);font-weight:400;">(system prompt — who the AI should be)</span></label>
              <textarea id="rolePersonaInput" class="form-input" rows="5" placeholder="You are a senior copywriter with 10 years of experience writing high-converting SaaS landing pages…"></textarea>
            </div>

            <div class="role-two-col">'''

NEW_PERSONA = '''            <div class="role-two-col">'''

if OLD_PERSONA in html:
    html = html.replace(OLD_PERSONA, NEW_PERSONA, 1)
    print('1. Removed Full Persona textarea')
else:
    print('WARN: Full Persona block not found exactly')

# ══════════════════════════════════════════════════════════════════════════
# 2. ADD GOALS & PURPOSE section after Identity & Voice (after Tone/Expertise row)
# ══════════════════════════════════════════════════════════════════════════

OLD_AFTER_IDENTITY = '''            <!-- ── BEHAVIOUR ──────────────────────────────────────── -->
            <div class="role-section-divider">
              <span class="material-symbols-outlined">tune</span>
              <span class="role-section-divider-label">Behaviour</span>
            </div>'''

NEW_AFTER_IDENTITY = '''            <!-- ── GOALS & PURPOSE ───────────────────────────────── -->
            <div class="role-section-divider">
              <span class="material-symbols-outlined">flag</span>
              <span class="role-section-divider-label">Goals & Purpose</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="roleGoalInput">Primary objective <span style="color:var(--ink-4);font-weight:400;">(what this agent is built to do)</span></label>
              <input type="text" id="roleGoalInput" class="form-input" placeholder="e.g. Convert cold leads into discovery calls with high-quality outreach copy" />
            </div>

            <div class="role-two-col">
              <div class="form-group">
                <label class="form-label" for="roleOutcomeInput">Success looks like</label>
                <input type="text" id="roleOutcomeInput" class="form-input" placeholder="e.g. Clear, concise output the user can send immediately" />
              </div>
              <div class="form-group">
                <label class="form-label" for="roleColourPicker">Agent colour</label>
                <div class="role-colour-row">
                  <input type="color" id="roleColourPicker" class="role-colour-input" value="#6366f1" />
                  <span class="role-colour-label" id="roleColourLabel">#6366f1</span>
                </div>
              </div>
            </div>

            <!-- ── BEHAVIOUR ──────────────────────────────────────── -->
            <div class="role-section-divider">
              <span class="material-symbols-outlined">tune</span>
              <span class="role-section-divider-label">Behaviour</span>
            </div>'''

if OLD_AFTER_IDENTITY in html:
    html = html.replace(OLD_AFTER_IDENTITY, NEW_AFTER_IDENTITY, 1)
    print('2. Added Goals & Purpose section')
else:
    print('WARN: Behaviour divider not found exactly')

# ══════════════════════════════════════════════════════════════════════════
# 3. EXPAND BEHAVIOUR section — add Behaviour Flags chip group after Constraints
# ══════════════════════════════════════════════════════════════════════════

OLD_CONSTRAINTS_END = '''            <div class="form-group">
              <label class="form-label" for="roleConstraintsInput">Constraints <span style="color:var(--ink-4);font-weight:400;">(what NOT to do)</span></label>
              <textarea id="roleConstraintsInput" class="form-input" rows="3" placeholder="Never use jargon. Don&#39;t write lists unless asked. Avoid passive voice…"></textarea>
            </div>

            <!-- ── CONTEXT ─────────────────────────────────────────── -->'''

NEW_CONSTRAINTS_END = '''            <div class="form-group">
              <label class="form-label" for="roleConstraintsInput">Constraints <span style="color:var(--ink-4);font-weight:400;">(what NOT to do)</span></label>
              <textarea id="roleConstraintsInput" class="form-input" rows="3" placeholder="Never use jargon. Don&#39;t write lists unless asked. Avoid passive voice…"></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Behaviour flags <span style="color:var(--ink-4);font-weight:400;">(toggle rules this agent always follows)</span></label>
              <div class="role-chip-group role-flag-chips" id="roleFlagChips">
                <button type="button" class="role-chip role-flag-chip" data-val="no_hedging">No hedging</button>
                <button type="button" class="role-chip role-flag-chip" data-val="cite_sources">Cite sources</button>
                <button type="button" class="role-chip role-flag-chip" data-val="ask_clarify">Ask to clarify</button>
                <button type="button" class="role-chip role-flag-chip" data-val="step_by_step">Step-by-step</button>
                <button type="button" class="role-chip role-flag-chip" data-val="no_preamble">No preamble</button>
                <button type="button" class="role-chip role-flag-chip" data-val="show_reasoning">Show reasoning</button>
                <button type="button" class="role-chip role-flag-chip" data-val="use_examples">Use examples</button>
                <button type="button" class="role-chip role-flag-chip" data-val="stay_on_topic">Stay on topic</button>
                <button type="button" class="role-chip role-flag-chip" data-val="structured_output">Structured output</button>
                <button type="button" class="role-chip role-flag-chip" data-val="no_repetition">No repetition</button>
              </div>
              <input type="hidden" id="roleFlagsInput" />
            </div>

            <!-- ── CONTEXT ─────────────────────────────────────────── -->'''

if OLD_CONSTRAINTS_END in html:
    html = html.replace(OLD_CONSTRAINTS_END, NEW_CONSTRAINTS_END, 1)
    print('3. Added Behaviour Flags chip group')
else:
    print('WARN: Constraints block end / Context divider not found exactly')

# ══════════════════════════════════════════════════════════════════════════
# 4. ADD OUTPUT CONTROL section after CONTEXT
# ══════════════════════════════════════════════════════════════════════════

OLD_AFTER_CONTEXT = '''            <!-- ── WORKFLOW ────────────────────────────────────────── -->
            <div class="role-section-divider">
              <span class="material-symbols-outlined">account_tree</span>
              <span class="role-section-divider-label">Workflow</span>
            </div>'''

NEW_AFTER_CONTEXT = '''            <!-- ── OUTPUT CONTROL ────────────────────────────────── -->
            <div class="role-section-divider">
              <span class="material-symbols-outlined">output</span>
              <span class="role-section-divider-label">Output Control</span>
            </div>

            <div class="form-group">
              <label class="form-label">Response depth</label>
              <div class="role-chip-group role-single-select" id="roleDepthChips">
                <button type="button" class="role-chip" data-val="quick">Quick</button>
                <button type="button" class="role-chip" data-val="balanced">Balanced</button>
                <button type="button" class="role-chip" data-val="deep_dive">Deep-dive</button>
                <button type="button" class="role-chip" data-val="adaptive">Adaptive</button>
              </div>
              <input type="hidden" id="roleComplexityInput" />
            </div>

            <div class="form-group">
              <label class="form-label">Format preference</label>
              <div class="role-chip-group role-single-select" id="roleFormatModeChips">
                <button type="button" class="role-chip" data-val="prose">Prose</button>
                <button type="button" class="role-chip" data-val="bullets">Bullet-heavy</button>
                <button type="button" class="role-chip" data-val="numbered">Numbered lists</button>
                <button type="button" class="role-chip" data-val="headers">Sections & headers</button>
                <button type="button" class="role-chip" data-val="code_blocks">Code blocks</button>
              </div>
              <input type="hidden" id="roleFormatModeInput" />
            </div>

            <div class="form-group">
              <label class="form-label" for="roleOutputFormatInput2">Custom output instructions <span style="color:var(--ink-4);font-weight:400;">(override format above)</span></label>
              <input type="text" id="roleOutputFormatInput2" class="form-input" placeholder="e.g. Always end with a numbered action list. Use bold for key terms." />
            </div>

            <!-- ── WORKFLOW ────────────────────────────────────────── -->
            <div class="role-section-divider">
              <span class="material-symbols-outlined">account_tree</span>
              <span class="role-section-divider-label">Workflow</span>
            </div>'''

if OLD_AFTER_CONTEXT in html:
    html = html.replace(OLD_AFTER_CONTEXT, NEW_AFTER_CONTEXT, 1)
    print('4. Added Output Control section')
else:
    print('WARN: Workflow divider not found exactly')

# ══════════════════════════════════════════════════════════════════════════
# 5. ADD ADVANCED section before Example Phrases
# ══════════════════════════════════════════════════════════════════════════

OLD_BEFORE_EXAMPLES = '''            <!-- ── EXAMPLE PHRASES ─────────────────────────────────── -->
            <div class="examples-section">'''

NEW_BEFORE_EXAMPLES = '''            <!-- ── ADVANCED ──────────────────────────────────────── -->
            <div class="role-section-divider">
              <span class="material-symbols-outlined">settings_suggest</span>
              <span class="role-section-divider-label">Advanced</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="roleInitInput">Opening message <span style="color:var(--ink-4);font-weight:400;">(what the agent says when first activated)</span></label>
              <input type="text" id="roleInitInput" class="form-input" placeholder="e.g. Hi! Share what you\'re working on and I\'ll help craft the perfect copy." />
            </div>

            <div class="form-group">
              <label class="form-label" for="roleMemoryInput">Persistent context <span style="color:var(--ink-4);font-weight:400;">(facts this agent always carries)</span></label>
              <textarea id="roleMemoryInput" class="form-input" rows="3" placeholder="e.g. This agent always assumes the user is a B2B founder selling to mid-market. Product names are always capitalised." ></textarea>
            </div>

            <div class="form-group">
              <label class="form-label" for="roleProcTypeInput">Interaction mode</label>
              <div class="role-chip-group role-single-select" id="roleProcTypeChips">
                <button type="button" class="role-chip" data-val="reactive">Reactive</button>
                <button type="button" class="role-chip" data-val="proactive">Proactive</button>
                <button type="button" class="role-chip" data-val="clarify_first">Clarify first</button>
                <button type="button" class="role-chip" data-val="auto_proceed">Auto-proceed</button>
              </div>
              <input type="hidden" id="roleProcTypeInput" />
            </div>

            <!-- ── EXAMPLE PHRASES ─────────────────────────────────── -->
            <div class="examples-section">'''

if OLD_BEFORE_EXAMPLES in html:
    html = html.replace(OLD_BEFORE_EXAMPLES, NEW_BEFORE_EXAMPLES, 1)
    print('5. Added Advanced section')
else:
    print('WARN: Example Phrases block not found exactly')

# ══════════════════════════════════════════════════════════════════════════
# 6. FIX NAV ACTIVE INDICATOR — move from left:6px to left:0 edge-aligned
# ══════════════════════════════════════════════════════════════════════════

OLD_NAV_PIP = '''.nav-item.active::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%) scaleY(1);
  width: 3px;
  height: 16px;
  background: var(--accent);
  border-radius: 2px;
  animation: pl-nav-pip 180ms var(--ease-out-expo) both;
}'''

NEW_NAV_PIP = '''.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 22px;
  background: var(--accent);
  border-radius: 0 2px 2px 0;
  animation: pl-nav-pip 180ms var(--ease-out-expo) both;
}'''

if OLD_NAV_PIP in css:
    css = css.replace(OLD_NAV_PIP, NEW_NAV_PIP, 1)
    print('6. Fixed nav active indicator (left:6px → left:0)')
else:
    print('WARN: Nav pip CSS not found exactly')

# ══════════════════════════════════════════════════════════════════════════
# 7. ADD CSS for new agent sections
# ══════════════════════════════════════════════════════════════════════════

AGENT_CSS = """

/* ── Agent editor — new sections ───────────────────────────────────────── */

/* Colour picker row */
.role-colour-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.role-colour-input {
  width: 40px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  background: transparent;
  cursor: pointer;
  padding: 2px;
}

.role-colour-label {
  font-size: var(--fs-xs);
  color: var(--ink-3);
  font-family: monospace;
}

/* Flag chips — toggle style (multi-select) */
.role-flag-chips .role-chip {
  border-style: dashed;
  opacity: 0.7;
}

.role-flag-chips .role-chip.on {
  border-style: solid;
  opacity: 1;
}

/* Single-select chip groups */
.role-single-select .role-chip.on {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

/* Output control + advanced section spacing */
.role-section-divider + .form-group {
  margin-top: var(--sp-3);
}
"""

css = css + AGENT_CSS
print('7. Added agent section CSS')

# ══════════════════════════════════════════════════════════════════════════
# 8. WRITE FILES
# ══════════════════════════════════════════════════════════════════════════

open('static/index.html', 'w', encoding='utf-8').write(html)
open('static/app.css',    'w', encoding='utf-8').write(css)

print()
print('=== Written ===')
print(f'index.html: {len(html)} chars')
print(f'app.css:    {len(css)} chars')
