#!/usr/bin/env python3
# Three targeted changes:
# 1. Move 'meta' category to position 0 in CATEGORIES
# 2. Replace native confirm() clear-button with inline double-tap confirm
# 3. Add 12 new meta blocks (variant expanders + diagnostic blocks)
import sys

with open('static/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 1: Move meta to position 0 in CATEGORIES
# ─────────────────────────────────────────────────────────────────────────────
OLD_CATS = r"""  var CATEGORIES = [
    { id: 'core',       label: 'Core',                  icon: 'layers',            color: 'var(--accent)'   },
    { id: 'reasoning',  label: 'Reasoning',              icon: 'psychology',        color: 'var(--c-purple)' },
    { id: 'control',    label: 'Control Flow',           icon: 'call_split',        color: 'var(--c-orange)' },
    { id: 'output',     label: 'Output',                 icon: 'format_align_left', color: 'var(--c-blue)'   },
    { id: 'writing',    label: 'Writing & Comms',        icon: 'edit_note',         color: 'var(--c-pink)'   },
    { id: 'analysis',   label: 'Analysis & Research',    icon: 'analytics',         color: 'var(--c-green)'  },
    { id: 'meta',       label: 'Metaprompt',             icon: 'auto_fix_high',     color: 'var(--c-yellow)' },
    { id: 'guardrails', label: 'Guardrails',             icon: 'verified',          color: 'var(--c-red)'    },
    { id: 'agentic',    label: 'Agentic & AI',           icon: 'smart_toy',         color: '#06b6d4'         },
    { id: 'dialogue',   label: 'Dialogue & UX',          icon: 'chat',              color: '#8b5cf6'         },
    { id: 'creative',   label: 'Creative & Ideation',    icon: 'palette',           color: '#f43f5e'         },
    { id: 'coding',     label: 'Code & Technical',       icon: 'code',              color: '#10b981'         },
    { id: 'business',   label: 'Business & Strategy',    icon: 'business_center',   color: '#f59e0b'         },
    { id: 'data',       label: 'Data & Knowledge',       icon: 'database',          color: '#3b82f6'         },
    { id: 'personas',   label: 'Personas & Identity',    icon: 'face',              color: '#ec4899'         },
  ];"""

NEW_CATS = r"""  var CATEGORIES = [
    { id: 'meta',       label: 'Metaprompt',             icon: 'auto_fix_high',     color: 'var(--c-yellow)' },
    { id: 'core',       label: 'Core',                  icon: 'layers',            color: 'var(--accent)'   },
    { id: 'reasoning',  label: 'Reasoning',              icon: 'psychology',        color: 'var(--c-purple)' },
    { id: 'control',    label: 'Control Flow',           icon: 'call_split',        color: 'var(--c-orange)' },
    { id: 'output',     label: 'Output',                 icon: 'format_align_left', color: 'var(--c-blue)'   },
    { id: 'writing',    label: 'Writing & Comms',        icon: 'edit_note',         color: 'var(--c-pink)'   },
    { id: 'analysis',   label: 'Analysis & Research',    icon: 'analytics',         color: 'var(--c-green)'  },
    { id: 'guardrails', label: 'Guardrails',             icon: 'verified',          color: 'var(--c-red)'    },
    { id: 'agentic',    label: 'Agentic & AI',           icon: 'smart_toy',         color: '#06b6d4'         },
    { id: 'dialogue',   label: 'Dialogue & UX',          icon: 'chat',              color: '#8b5cf6'         },
    { id: 'creative',   label: 'Creative & Ideation',    icon: 'palette',           color: '#f43f5e'         },
    { id: 'coding',     label: 'Code & Technical',       icon: 'code',              color: '#10b981'         },
    { id: 'business',   label: 'Business & Strategy',    icon: 'business_center',   color: '#f59e0b'         },
    { id: 'data',       label: 'Data & Knowledge',       icon: 'database',          color: '#3b82f6'         },
    { id: 'personas',   label: 'Personas & Identity',    icon: 'face',              color: '#ec4899'         },
  ];"""

if OLD_CATS not in content:
    print('ERROR: CATEGORIES section not found (old text did not match)')
    sys.exit(1)
content = content.replace(OLD_CATS, NEW_CATS, 1)
print('CATEGORIES reordered.')

# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 2: Replace native confirm() on clear-canvas with inline double-tap
# ─────────────────────────────────────────────────────────────────────────────
OLD_CLEAR = r"""    if ($('#pcwClearBtn')) {
      $('#pcwClearBtn').addEventListener('click', function() {
        if (!_canvasBlocks.length) return;
        if (!confirm('Clear all blocks from the canvas?')) return;
        _canvasBlocks = [];
        renderCanvas();
      });
    }"""

NEW_CLEAR = r"""    if ($('#pcwClearBtn')) {
      var _pcwClearArmed = false, _pcwClearTimer = null;
      $('#pcwClearBtn').addEventListener('click', function() {
        if (!_canvasBlocks.length) return;
        var btn = this;
        if (_pcwClearArmed) {
          clearTimeout(_pcwClearTimer);
          _pcwClearArmed = false;
          btn.innerHTML = '<span class="material-symbols-outlined">restart_alt</span> Clear canvas';
          btn.style.cssText = '';
          _canvasBlocks = [];
          renderCanvas();
        } else {
          _pcwClearArmed = true;
          btn.innerHTML = '<span class="material-symbols-outlined">warning</span> Click again to clear';
          btn.style.color = 'var(--c-red,#ef4444)';
          btn.style.borderColor = 'var(--c-red,#ef4444)';
          _pcwClearTimer = setTimeout(function() {
            _pcwClearArmed = false;
            var b = $('#pcwClearBtn');
            if (b) { b.innerHTML = '<span class="material-symbols-outlined">restart_alt</span> Clear canvas'; b.style.cssText = ''; }
          }, 3000);
        }
      });
    }"""

if OLD_CLEAR not in content:
    print('ERROR: clear button section not found')
    sys.exit(1)
content = content.replace(OLD_CLEAR, NEW_CLEAR, 1)
print('Clear-button confirm() replaced with inline double-tap.')

# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 3: Add 12 new meta blocks before the FRAMEWORKS definition
# Insert after the last existing meta block (Prompt Formatter / AB Prompt Tester
# area) and before the first guardrails block.
# Anchor: the Output Formatter block is the last meta block.
# We insert NEW_META_BLOCKS right before the "// ── GUARDRAILS" comment.
# ─────────────────────────────────────────────────────────────────────────────
OLD_ANCHOR = "    // ── GUARDRAILS ────────────────────────────────────────────────────────────"

NEW_META_BLOCKS = r"""    // ── META (variant expanders & diagnostic tools) ─────────────────────────
    { cat: 'meta', icon: 'business_center',    label: 'Industry Adapter',       text: 'Take the following base prompt and generate 5 industry-specific versions, each tailored to the terminology, concerns, and context of that sector.\n\nBase prompt: [paste prompt here]\n\nVersion 1 — Healthcare / clinical:\n[prompt adapted for medical context — clinical language, patient safety, regulatory awareness]\n\nVersion 2 — Financial services / banking:\n[prompt adapted for finance — compliance, risk, regulatory framing]\n\nVersion 3 — Technology / SaaS:\n[prompt adapted for tech products — product thinking, engineering context, metrics]\n\nVersion 4 — Retail / e-commerce:\n[prompt adapted for consumer retail — conversion, CX, inventory, brand]\n\nVersion 5 — Professional services (legal / consulting):\n[prompt adapted for advisory context — structured argument, client framing, billable clarity]' },
    { cat: 'meta', icon: 'school',             label: 'Audience Level Adapter', text: 'Take the following base prompt and rewrite it for 4 different audience levels — same goal, different framing and vocabulary.\n\nBase prompt: [paste prompt here]\n\nVersion 1 — Complete beginner (no prior knowledge):\n[prompt using simple language, no jargon, lots of context and explanation]\n\nVersion 2 — Intermediate (some experience):\n[prompt assuming basic familiarity with core concepts]\n\nVersion 3 — Expert / practitioner:\n[prompt using precise technical vocabulary, assumes deep domain knowledge]\n\nVersion 4 — Executive (senior decision-maker, time-poor):\n[prompt optimised for brevity, bottom-line-up-front, actionable conclusions only]' },
    { cat: 'meta', icon: 'record_voice_over',  label: 'Tone Variants',          text: 'Take the following base prompt and rewrite it in 5 different tones. Keep all instructions identical — only tone changes.\n\nBase prompt: [paste prompt here]\n\nVersion 1 — Formal and authoritative:\n[rewritten with professional, precise, structured tone]\n\nVersion 2 — Conversational and warm:\n[rewritten with friendly, approachable, human tone]\n\nVersion 3 — Direct and blunt:\n[rewritten with no-fluff, imperative, no softening]\n\nVersion 4 — Empathetic and supportive:\n[rewritten with understanding, gentle, encouraging tone]\n\nVersion 5 — Energetic and motivational:\n[rewritten with enthusiasm, forward-momentum, inspiring language]' },
    { cat: 'meta', icon: 'grid_view',          label: 'Format Variants',        text: 'Take the following base prompt and rewrite it to produce 5 different output formats — same content goal, different structure.\n\nBase prompt: [paste prompt here]\n\nVersion 1 — Flowing prose paragraphs:\n[prompt requesting narrative written paragraphs]\n\nVersion 2 — Concise bullet points:\n[prompt requesting tight bullet-point lists]\n\nVersion 3 — Structured table:\n[prompt requesting tabular output with defined columns]\n\nVersion 4 — Numbered step-by-step:\n[prompt requesting sequential numbered steps]\n\nVersion 5 — JSON / structured data:\n[prompt requesting machine-readable structured output — specify schema]' },
    { cat: 'meta', icon: 'people',             label: 'Persona Variants',       text: 'Take the following base prompt and rewrite it as 5 different expert personas, each bringing a distinct viewpoint.\n\nBase prompt: [paste prompt here]\n\nVersion 1 — Sceptical data analyst:\n[prompt from evidence-first, show-me-the-numbers perspective]\n\nVersion 2 — Creative director:\n[prompt from imaginative, big-picture, aesthetic perspective]\n\nVersion 3 — Pragmatic operator:\n[prompt from practical, what-actually-works-in-the-real-world perspective]\n\nVersion 4 — Strategic advisor / consultant:\n[prompt from systems-thinking, trade-offs, long-term-impact perspective]\n\nVersion 5 — Devil\'s advocate:\n[prompt from challenger, find-every-flaw, prove-it perspective]' },
    { cat: 'meta', icon: 'straighten',         label: 'Length Variants',        text: 'Take the following base prompt and rewrite it in 3 depth modes — same goal, dramatically different scope.\n\nBase prompt: [paste prompt here]\n\nVersion 1 — Ultra-brief (1-3 sentences only):\n[prompt that forces a minimal, headline-level answer — no elaboration]\n\nVersion 2 — Standard (one focused page):\n[prompt asking for a complete but tight response — cover the key points, nothing more]\n\nVersion 3 — Comprehensive (exhaustive deep dive):\n[prompt requesting thorough treatment — all angles covered, evidence cited, edge cases addressed]' },
    { cat: 'meta', icon: 'model_training',     label: 'Model Variants',         text: 'Take the following base prompt and produce 4 model-specific versions, each adapted to the strengths and quirks of a different AI system.\n\nBase prompt: [paste prompt here]\n\nVersion 1 — Claude (Anthropic):\n[adapted: XML tags for structure, explicit role, step-by-step reasoning, prefers clear delimiters]\n\nVersion 2 — GPT-4 / ChatGPT (OpenAI):\n[adapted: system / user role split, clear objectives upfront, JSON output where relevant]\n\nVersion 3 — Gemini (Google):\n[adapted: structured format, factual grounding, multimodal context if applicable]\n\nVersion 4 — Open-source / local (Llama, Mistral):\n[adapted: shorter, explicit delimiters, minimal reliance on instruction-following finesse, no assumed world knowledge]' },
    { cat: 'meta', icon: 'tune',               label: 'Constraint Progressions', text: 'Take the following base prompt and produce 4 versions with increasing constraints — from open-ended to locked-down.\n\nBase prompt: [paste prompt here]\n\nVersion 1 — No constraints (fully open):\n[prompt with no restrictions — maximum freedom for the AI to decide approach and format]\n\nVersion 2 — Soft constraints (recommended guardrails):\n[prompt with suggested boundaries the AI can deviate from if genuinely needed]\n\nVersion 3 — Hard constraints (strict rules, no exceptions):\n[prompt with firm, non-negotiable limits on scope, format, and behaviour]\n\nVersion 4 — Maximum constraints (every parameter defined):\n[prompt with no ambiguity — role, format, length, tone, scope, and output all specified explicitly]' },
    { cat: 'meta', icon: 'science',            label: 'Prompting Strategy Variants', text: 'Take the following task and generate 5 versions using different prompting strategies.\n\nTask: [describe what you want the AI to do]\n\nVersion 1 — Direct instruction:\n[plain imperative prompt — no role, no context, just the task]\n\nVersion 2 — Role + task:\n[assign a relevant expert role before issuing the task]\n\nVersion 3 — Few-shot with examples:\n[show 2-3 input→output examples before issuing the actual task]\n\nVersion 4 — Chain-of-thought:\n[explicitly ask the AI to reason step-by-step before answering]\n\nVersion 5 — Structured with delimiters:\n[wrap role, context, task, and output format in labelled XML tags for maximum reliability]' },
    { cat: 'meta', icon: 'bug_report',         label: 'Anti-Pattern Detector',  text: 'Analyse the following prompt and identify every classic prompt engineering anti-pattern that is present.\n\nPrompt to analyse:\n[paste prompt here]\n\nAnti-patterns to check:\n1. Vague instruction ("explain", "analyse" with no specifics): [found / not found]\n2. Missing output format specification: [found / not found]\n3. No role or context provided: [found / not found]\n4. Conflicting instructions: [found / not found]\n5. Over-reliance on AI\'s judgment where specifics are needed: [found / not found]\n6. Negative-only instructions without positive alternatives: [found / not found]\n7. Too many tasks in one prompt: [found / not found]\n8. No success criteria defined: [found / not found]\n\nSeverity: [N/8 anti-patterns]\nRewritten prompt with all anti-patterns removed:\n[output]' },
    { cat: 'meta', icon: 'manage_search',      label: 'Prompt Anatomy',         text: 'Dissect the following prompt into its structural components. Identify what is present, what is missing, and how effective each part is.\n\nPrompt to dissect:\n[paste prompt here]\n\nAnatomy report:\n- Role / Persona: [present / missing] — Quality: [1-5] — "[quote]"\n- Context / Background: [present / missing] — Quality: [1-5] — "[quote]"\n- Task / Instruction: [present / missing] — Quality: [1-5] — "[quote]"\n- Output Format: [present / missing] — Quality: [1-5] — "[quote]"\n- Constraints: [present / missing] — Quality: [1-5] — "[quote]"\n- Examples: [present / missing] — Quality: [1-5]\n- Success Criteria: [present / missing] — Quality: [1-5]\n\nOverall effectiveness: [1-10]\nBiggest gap: [the single most impactful addition]\nQuick win: [one change to make right now]' },
    { cat: 'meta', icon: 'terminal',           label: 'System Prompt Debugger', text: 'Debug the following system prompt and identify why it might be producing inconsistent or unexpected outputs.\n\nSystem prompt:\n[paste system prompt here]\n\nSample bad output (what went wrong):\n[paste an example of the undesired response]\n\nDiagnosis:\n1. Instruction ambiguity: [instructions that could be interpreted multiple ways]\n2. Conflicting directives: [instructions that contradict each other]\n3. Missing edge case handling: [situations the prompt doesn\'t account for]\n4. Scope leakage: [where the AI is going outside its intended role]\n5. Format enforcement gaps: [where output structure is breaking down]\n\nFixed system prompt:\n[rewritten with all issues resolved]' },
    { cat: 'meta', icon: 'link',               label: 'Chain Connector',        text: 'Connect the following two standalone prompts into a coherent chain where Prompt 1\'s output feeds directly into Prompt 2.\n\nPrompt 1 (input stage):\n[paste first prompt]\n\nPrompt 2 (processing stage):\n[paste second prompt]\n\nChain connector:\n- Output of Prompt 1 stored as: [[stage_1_output]]\n- Prompt 2 modified to accept it:\n  [rewritten Prompt 2 with [[stage_1_output]] injected correctly]\n\nHandoff instruction between stages:\n[exact language to pass context from stage 1 to stage 2]\n\nFull connected chain:\n[complete multi-stage prompt ready to use]' },
    """ + "    // ── GUARDRAILS ────────────────────────────────────────────────────────────"

if OLD_ANCHOR not in content:
    print('ERROR: guardrails anchor not found')
    sys.exit(1)
content = content.replace(OLD_ANCHOR, NEW_META_BLOCKS, 1)
print('12 new meta blocks added.')

# ─────────────────────────────────────────────────────────────────────────────
# Write output
# ─────────────────────────────────────────────────────────────────────────────
with open('static/app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done. Verifying...')

with open('static/app.js', 'r', encoding='utf-8') as f:
    out = f.read()

blk  = out.count("{ cat: '")
fw   = out.count("{ badge: '")
print(f'Blocks: {blk}, Frameworks: {fw}')
