#!/usr/bin/env python3
# Generates _pcw_frameworks.txt and _pcw_logic.txt

def js_str(s):
    return s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n')

frameworks = [
    ("5W2H","Who, What, When, Where, Why, How, How Much","Complete situation analysis","Who: [involved]\nWhat: [happening]\nWhen: [timeline]\nWhere: [location]\nWhy: [reason]\nHow: [method]\nHow much: [cost/scale]"),
    ("ACQUIRE","Awareness, Consideration, Query, Intent, Retention, Expansion","Customer journey","Awareness: [discovery]\nConsideration: [evaluation]\nQuery: [questions they ask]\nIntent: [decision drivers]\nRetention: [why they stay]\nExpansion: [how they grow]"),
    ("AIDA","Attention, Interest, Desire, Action","Classic copywriting","Attention: [hook]\nInterest: [relevance/curiosity]\nDesire: [benefits not features]\nAction: [clear CTA]"),
    ("APE","Action, Purpose, Expectation","Fast clarity","Action: [what to do]\nPurpose: [why]\nExpectation: [good result looks like]"),
    ("BAB","Before, After, Bridge","Transformation narrative","Before: [painful situation]\nAfter: [desired state]\nBridge: [how you get there]"),
    ("CARE","Context, Action, Result, Example","Outcome-led","Context: [background]\nAction: [what was done]\nResult: [outcome]\nExample: [illustration]"),
    ("CLEAR","Context, Length, Examples, Audience, Role","Comprehensive setup","Context: [background + why]\nLength: [word count/format]\nExamples: [sample I/O]\nAudience: [who reads]\nRole: [who AI should be]"),
    ("CO-STAR","Context, Objective, Style, Tone, Audience, Response","Comprehensive","Context: [background]\nObjective: [goal]\nStyle: [format]\nTone: [voice]\nAudience: [who]\nResponse: [length/format]"),
    ("COSTAR+","CO-STAR + Constraints","With guardrails","Context:\nObjective:\nStyle:\nTone:\nAudience:\nResponse:\nConstraints: [what not to do]"),
    ("CREATE","Character, Request, Examples, Adjustments, Type, Extras","Rich prompt building","Character: [AI identity]\nRequest: [what you need]\nExamples: [illustrate task]\nAdjustments: [calibrate]\nType: [format]\nExtras: [context]"),
    ("CSI+FBI","Context, Specific, Instruction + Format, Blueprint, Identity","Eugene's dual-block","-- CSI --\nContext: [situation]\nSpecific: [focus]\nInstruction: [action]\n-- FBI --\nFormat: [output]\nBlueprint: [pattern]\nIdentity: [role]"),
    ("DECIDE","Define, Establish, Consider, Identify, Develop, Evaluate","Decision framework","Define: [decision]\nEstablish: [success criteria]\nConsider: [options]\nIdentify: [risks]\nDevelop: [best option plan]\nEvaluate: [review and commit]"),
    ("DEFINE","Describe, Explain, Frame, Illustrate, Narrow, Exemplify","Concept clarification","Describe: [what]\nExplain: [how/why]\nFrame: [context]\nIllustrate: [analogy]\nNarrow: [scope]\nExemplify: [example]"),
    ("GRADE","Goal, Role, Audience, Details, Examples","Structured generation","Goal: [achieve]\nRole: [AI persona]\nAudience: [who reads]\nDetails: [requirements]\nExamples: [reference outputs]"),
    ("GROW","Goal, Reality, Options, Way Forward","Coaching framework","Goal: [desired state]\nReality: [current]\nOptions: [paths forward]\nWay Forward: [committed next step]"),
    ("GRWC","Goal, Return Format, Warnings, Context","Brain dump","Goal: [result]\nReturn Format: [structure]\nWarnings: [constraints]\nContext: [background]"),
    ("HERO","Hook, Explain, Result, Offer","Pitch and proposal","Hook: [attention grabber]\nExplain: [what you do]\nResult: [outcome you deliver]\nOffer: [specific ask/CTA]"),
    ("IMPACT","Identify, Message, Plan, Action, Communicate, Track","Change management","Identify: [change needed]\nMessage: [communication]\nPlan: [steps]\nAction: [who does what]\nCommunicate: [announce]\nTrack: [metrics]"),
    ("LOGIC","Lead, Observe, Give evidence, Interpret, Conclude","Argument structure","Lead: [claim upfront]\nObserve: [evidence seen]\nGive evidence: [data]\nInterpret: [what it means]\nConclude: [recommendation]"),
    ("MECE","Mutually Exclusive, Collectively Exhaustive","Exhaustive categorisation","Categories must be:\nME: no overlap\nCE: all possibilities covered\n\nApplied to: [topic]\nCategories: [list with ME/CE check]"),
    ("META","Meta-Prompt Template","Generates prompts","You are a world-class prompt engineer.\nTask: Write a prompt for: [use case]\nModel: [target]\nOutput: [format]\nRequirements: [what prompt must achieve]"),
    ("OKR","Objective, Key Results","Goal-setting","Objective: [inspiring goal]\nKey Results:\n1. [measurable outcome]\n2. [measurable outcome]\n3. [measurable outcome]\nInitiatives: [what to do]"),
    ("OSCAR","Objective, Situation, Choices, Action, Review","Problem-solving","Objective: [success]\nSituation: [current]\nChoices: [options]\nAction: [chosen path]\nReview: [evaluate results]"),
    ("PACE","Problem, Action, Context, Effect","Root cause to outcome","Problem: [what is wrong]\nAction: [what was done]\nContext: [why it matters]\nEffect: [expected outcome]"),
    ("PARA","Purpose, Audience, Reasoning, Action","Communication","Purpose: [why this exists]\nAudience: [who]\nReasoning: [logic/evidence]\nAction: [what reader should do]"),
    ("PAS","Problem, Agitate, Solution","Persuasion","Problem: [pain they face]\nAgitate: [make it vivid/urgent]\nSolution: [your answer]"),
    ("PREP","Point, Reason, Example, Point","Argumentation","Point: [claim]\nReason: [why true]\nExample: [evidence]\nPoint: [restate with conviction]"),
    ("RAFT","Role, Audience, Format, Topic","Writing framework","Role: [who writes]\nAudience: [who reads]\nFormat: [doc type]\nTopic: [what to write]"),
    ("RISEN","Role, Instructions, Steps, End Goal, Narrowing","Multi-step","Role: [AI identity]\nInstructions: [rules]\nSteps: [ordered actions]\nEnd goal: [deliverable]\nNarrowing: [scope constraints]"),
    ("RODES","Role, Objective, Details, Example, Steps","Role-based","Role: [who]\nObjective: [goal]\nDetails: [context]\nExample: [sample]\nSteps: [process]"),
    ("ROSES","Role, Objective, Scenario, Expected Solution, Steps","With scenario","Role: [AI]\nObjective: [goal]\nScenario: [context]\nExpected: [good output]\nSteps: [process]"),
    ("RTF","Role, Task, Format","Simplest","Role: [who AI should be]\nTask: [what to do]\nFormat: [output structure]"),
    ("SCQA","Situation, Complication, Question, Answer","McKinsey","Situation: [shared facts]\nComplication: [what changed]\nQuestion: [what we need]\nAnswer: [recommendation]"),
    ("SCOPE","Situation, Context, Objective, Plan, Execution","Project planning","Situation: [current]\nContext: [background]\nObjective: [goal]\nPlan: [approach]\nExecution: [actions + owners]"),
    ("SMART","Specific, Measurable, Achievable, Relevant, Time-bound","Goal definition","Specific: [exactly what]\nMeasurable: [how quantified]\nAchievable: [why realistic]\nRelevant: [why matters]\nTime-bound: [deadline]"),
    ("SOAR","Strengths, Opportunities, Aspirations, Results","Appreciative inquiry","Strengths: [what we do well]\nOpportunities: [possibilities]\nAspirations: [what to become]\nResults: [metrics to target]"),
    ("STAR","Situation, Task, Action, Result","Narrative","Situation: [context]\nTask: [what needed doing]\nAction: [what was done]\nResult: [outcome]"),
    ("TAGS","Task, Action, Goal, Setting","Compact framing","Task: [what]\nAction: [steps]\nGoal: [outcome]\nSetting: [context/constraints]"),
    ("THINK","Topic, How, Insights, Next, Key takeaways","Analytical structure","Topic: [subject]\nHow: [methodology]\nInsights: [what revealed]\nNext: [recommended actions]\nKey takeaways: [3 bullets]"),
    ("TRACE","Task, Reasoning, Action, Constraints, Evaluation","Reasoning chain","Task: [accomplish]\nReasoning: [think before acting]\nAction: [do]\nConstraints: [limits]\nEvaluation: [judge success]"),
    ("ToT","Tree of Thought","Multi-path","Path A: [approach] -> [result]\nPath B: [approach] -> [result]\nPath C: [approach] -> [result]\nBest: [chosen + why]"),
    ("VALUE","Validate, Assess, Launch, Understand, Evaluate","Product cycle","Validate: [problem is real]\nAssess: [solutions]\nLaunch: [ship]\nUnderstand: [feedback]\nEvaluate: [measure]"),
    ("VISION","Vision, Insight, Strategy, Initiatives, Outcomes, Numbers","Strategy cascade","Vision: [where going]\nInsight: [why now]\nStrategy: [how compete]\nInitiatives: [key bets]\nOutcomes: [success]\nNumbers: [metrics]"),
    ("WRAP","Why, Reality, Alternatives, Path forward","Change communication","Why: [reason for change]\nReality: [current state]\nAlternatives: [options considered]\nPath forward: [decision + why]"),
]

f = open('_pcw_frameworks.txt', 'w', encoding='utf-8')
f.write("  const FRAMEWORKS = [\n")
for i, (badge, name, desc, text) in enumerate(frameworks):
    comma = ',' if i < len(frameworks)-1 else ''
    f.write("    { badge:'%s', name:'%s', desc:'%s', text:'%s' }%s\n" % (
        js_str(badge), js_str(name), js_str(desc), js_str(text), comma))
f.write("  ];\n\n")
f.close()
print("Frameworks written:", len(frameworks))

# Write the logic/runtime part of the IIFE
logic = r"""  let _canvasBlocks = [];
  window._pcwBLOCKS = BLOCKS;
  window._pcwFRAMEWORKS = FRAMEWORKS;
  window._pcwCATEGORIES = CATEGORIES;

  let _dragSrcIdx = null;

  function escH(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function renderCatPills() {
    let pills = document.getElementById('pcwCatPills');
    if (!pills) {
      const palette = document.querySelector('#componentsWorkspace .pcw-palette');
      if (!palette) return;
      pills = document.createElement('div');
      pills.id = 'pcwCatPills';
      pills.className = 'pcw-cat-pills';
      const blockSection = document.getElementById('pcwBlockSection');
      palette.insertBefore(pills, blockSection);
    }
    pills.innerHTML = CATEGORIES.map(function(c) {
      return '<button type="button" class="pcw-cat-pill' + (_activeCat === c.id ? ' active' : '') + '" data-cat="' + c.id + '">' + escH(c.label) + '</button>';
    }).join('');
    pills.querySelectorAll('.pcw-cat-pill').forEach(function(btn) {
      btn.addEventListener('click', function() {
        _activeCat = btn.dataset.cat;
        pills.querySelectorAll('.pcw-cat-pill').forEach(function(p) { p.classList.remove('active'); });
        btn.classList.add('active');
        const searchEl = document.getElementById('pcwPaletteSearch');
        renderPalette(searchEl ? searchEl.value : '');
      });
    });
  }

  function renderPalette(searchQuery) {
    const grid = document.getElementById('pcwBlockGrid');
    const fw = document.getElementById('pcwFwList');
    if (!grid || !fw) return;

    const q = (searchQuery || '').toLowerCase().trim();

    const filtered = BLOCKS.filter(function(b) {
      const catMatch = _activeCat === 'all' || b.cat === _activeCat;
      const searchMatch = !q || b.label.toLowerCase().indexOf(q) !== -1 || b.text.toLowerCase().indexOf(q) !== -1;
      return catMatch && searchMatch;
    });

    grid.innerHTML = filtered.map(function(b) {
      const origIdx = BLOCKS.indexOf(b);
      return '<div class="pcw-block-tile" draggable="true" data-pcw-block="' + origIdx + '" title="' + escH(b.label) + '" style="animation-delay:' + ((origIdx % 30) * 18) + 'ms"><span class="material-symbols-outlined">' + b.icon + '</span><span class="pcw-block-tile-label">' + escH(b.label) + '</span></div>';
    }).join('');

    const fwFiltered = FRAMEWORKS.filter(function(f) {
      return !q || f.badge.toLowerCase().indexOf(q) !== -1 || f.name.toLowerCase().indexOf(q) !== -1 || f.desc.toLowerCase().indexOf(q) !== -1;
    });

    fw.innerHTML = fwFiltered.map(function(f) {
      const origIdx = FRAMEWORKS.indexOf(f);
      return '<div class="pcw-fw-tile" draggable="true" data-pcw-fw="' + origIdx + '" title="' + escH(f.name) + '"><span class="pcw-fw-badge">' + escH(f.badge) + '</span><div class="pcw-fw-info"><div class="pcw-fw-name">' + escH(f.name) + '</div><div class="pcw-fw-desc">' + escH(f.desc) + '</div></div></div>';
    }).join('');

    const bc2 = document.getElementById('pcwBlockCount2');
    if (bc2) bc2.textContent = filtered.length;
    const fwc = document.getElementById('pcwFwCount');
    if (fwc) fwc.textContent = fwFiltered.length;
  }

  function renderCanvas() {
    const zone = document.getElementById('pcwDropZone');
    const hint = document.getElementById('pcwDropHint');
    const count = document.getElementById('pcwBlockCount');
    if (!zone) return;

    if (hint) hint.style.display = _canvasBlocks.length ? 'none' : 'flex';
    if (count) count.textContent = _canvasBlocks.length + ' block' + (_canvasBlocks.length !== 1 ? 's' : '');

    Array.from(zone.querySelectorAll('.pcw-canvas-block')).forEach(function(el) { el.remove(); });

    _canvasBlocks.forEach(function(b, idx) {
      const card = document.createElement('div');
      card.className = 'pcw-canvas-block';
      card.draggable = true;
      card.dataset.canvasIdx = idx;
      card.innerHTML = '<div class="pcw-block-header" title="Drag to reorder"><span class="material-symbols-outlined pcw-block-drag-handle">drag_indicator</span><span class="pcw-block-type-badge">' + escH(b.label) + '</span><div class="pcw-block-order-btns"><button type="button" class="pcw-block-reorder-btn" data-move="up" aria-label="Move up"' + (idx === 0 ? ' disabled' : '') + '><span class="material-symbols-outlined">keyboard_arrow_up</span></button><button type="button" class="pcw-block-reorder-btn" data-move="down" aria-label="Move down"' + (idx === _canvasBlocks.length - 1 ? ' disabled' : '') + '><span class="material-symbols-outlined">keyboard_arrow_down</span></button></div><button type="button" class="pcw-block-remove" data-remove-idx="' + idx + '" aria-label="Remove block"><span class="material-symbols-outlined">close</span></button></div><div class="pcw-block-body"><textarea rows="4" data-block-idx="' + idx + '">' + escH(b.text) + '</textarea></div>';
      zone.appendChild(card);

      card.querySelector('textarea').addEventListener('input', function(e) {
        _canvasBlocks[idx].text = e.target.value;
      });

      card.querySelector('.pcw-block-remove').addEventListener('click', function() {
        _canvasBlocks.splice(idx, 1);
        renderCanvas();
      });

      card.querySelectorAll('.pcw-block-reorder-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          const dir = btn.dataset.move;
          if (dir === 'up' && idx > 0) {
            const moved = _canvasBlocks.splice(idx, 1)[0];
            _canvasBlocks.splice(idx - 1, 0, moved);
            renderCanvas();
          } else if (dir === 'down' && idx < _canvasBlocks.length - 1) {
            const moved = _canvasBlocks.splice(idx, 1)[0];
            _canvasBlocks.splice(idx + 1, 0, moved);
            renderCanvas();
          }
        });
      });

      card.addEventListener('dragstart', function(e) {
        _dragSrcIdx = idx;
        card.classList.add('drag-source');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'canvas-' + idx);
        e.stopPropagation();
      });
      card.addEventListener('dragend', function() {
        card.classList.remove('drag-source');
        _dragSrcIdx = null;
      });
      card.addEventListener('dragover', function(e) {
        if (_dragSrcIdx === null || _dragSrcIdx === idx) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
      });
      card.addEventListener('drop', function(e) {
        if (_dragSrcIdx === null || _dragSrcIdx === idx) return;
        e.preventDefault();
        e.stopPropagation();
        const moved = _canvasBlocks.splice(_dragSrcIdx, 1)[0];
        _canvasBlocks.splice(idx, 0, moved);
        renderCanvas();
      });
    });
  }

  function addBlock(label, text) {
    _canvasBlocks.push({ label: label, text: text });
    renderCanvas();
  }

  function addFramework(fw) {
    if (fw.blocks) {
      fw.blocks.forEach(function(blockLabel) {
        const b = BLOCKS.find(function(x) { return x.label === blockLabel; });
        if (b) addBlock(b.label, b.text);
      });
    } else if (fw.text) {
      addBlock(fw.name, fw.text);
    }
  }

  function assemblePrompt() {
    return _canvasBlocks.map(function(b) { return b.text.trim(); }).filter(Boolean).join('\n\n');
  }

  async function saveToLibrary() {
    const titleEl = document.getElementById('pcwTitleInput');
    const title = (titleEl ? titleEl.value : '').trim();
    if (!title) {
      toast('Add a title before saving', 'warning');
      if (titleEl) titleEl.focus();
      return;
    }
    if (!_canvasBlocks.length) { toast('Canvas is empty', 'warning'); return; }
    const assembled = assemblePrompt();
    if (!assembled.trim()) { toast('All blocks are empty', 'warning'); return; }
    try {
      await api('/prompts', { method: 'POST', body: { title: title, content: assembled, description: 'Built with Prompt Components', tags: '', categories: '', folder_id: null } });
      toast('Saved to library', 'success');
      ['#pcwSaveBtn', '#pcwSaveBtnFooter'].forEach(function(sel) {
        const btn = $(sel);
        if (btn) { btn.classList.add('save-success'); setTimeout(function() { btn.classList.remove('save-success'); }, 700); }
      });
      loadAll();
    } catch(err) {
      console.error('pcw save:', err);
      toast('Could not save: ' + (err.message || 'unknown error'), 'error');
    }
  }

  function wireDropZone() {
    const zone = document.getElementById('pcwDropZone');
    if (!zone || zone._pcwWired) return;
    zone._pcwWired = true;

    zone.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      zone.classList.add('drag-active');
    });
    zone.addEventListener('dragleave', function(e) {
      if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-active');
    });
    zone.addEventListener('drop', function(e) {
      zone.classList.remove('drag-active');
      const blockIdx = e.dataTransfer.getData('pcw-block');
      const fwIdx = e.dataTransfer.getData('pcw-fw');
      if (blockIdx !== '') {
        const b = BLOCKS[parseInt(blockIdx, 10)];
        if (b) addBlock(b.label, b.text);
      } else if (fwIdx !== '') {
        const f = FRAMEWORKS[parseInt(fwIdx, 10)];
        if (f) addFramework(f);
      }
    });
  }

  window.openComponentsWorkspace = function() {
    const wsEl = document.getElementById('componentsWorkspace');
    if (wsEl) wsEl.classList.add('open');
    document.querySelectorAll('.nav-item[data-view]').forEach(function(el) {
      el.classList.toggle('active', el.dataset.view === 'components');
    });
    renderCatPills();
    renderPalette('');
    renderCanvas();

    const ws = document.getElementById('componentsWorkspace');
    if (!ws || ws._pcwWired) return;
    ws._pcwWired = true;

    const searchEl = document.getElementById('pcwPaletteSearch');
    if (searchEl) searchEl.addEventListener('input', function(e) { renderPalette(e.target.value); });

    document.querySelectorAll('[data-toggle-section]').forEach(function(hdr) {
      hdr.addEventListener('click', function() {
        const sec = document.getElementById(hdr.dataset.toggleSection);
        if (sec) sec.classList.toggle('collapsed');
      });
    });

    const closeBtn = document.getElementById('closeComponentsBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeComponentsWorkspace);
    ws.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeComponentsWorkspace(); });

    const clearBtn = document.getElementById('pcwClearBtn');
    if (clearBtn) clearBtn.addEventListener('click', function() { _canvasBlocks = []; renderCanvas(); });
    const saveBtn = document.getElementById('pcwSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveToLibrary);
    const saveBtnF = document.getElementById('pcwSaveBtnFooter');
    if (saveBtnF) saveBtnF.addEventListener('click', saveToLibrary);

    const prevBtn = document.getElementById('pcwPreviewBtn');
    if (prevBtn) prevBtn.addEventListener('click', function() {
      const text = assemblePrompt();
      if (!text) { toast('Canvas is empty', 'warning'); return; }
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() { toast('Assembled prompt copied to clipboard', 'success'); });
      }
    });

    ws.addEventListener('click', function(e) {
      const tile = e.target.closest('[data-pcw-block]');
      const fw = e.target.closest('[data-pcw-fw]');
      if (tile) {
        const b = BLOCKS[parseInt(tile.dataset.pcwBlock, 10)];
        if (b) {
          if (typeof window.openPreviewModal === 'function') {
            window.openPreviewModal({ icon: b.icon, title: b.label, text: b.text, insertLabel: 'Add to Canvas', onInsert: function(text) { addBlock(b.label, text); wireDropZone(); } });
          } else { addBlock(b.label, b.text); wireDropZone(); }
        }
      } else if (fw) {
        const f = FRAMEWORKS[parseInt(fw.dataset.pcwFw, 10)];
        if (f) {
          const fwText = f.text || (f.blocks ? f.blocks.map(function(bl) { const blk = BLOCKS.find(function(x) { return x.label === bl; }); return blk ? blk.text : ''; }).join('\n\n') : '');
          if (typeof window.openPreviewModal === 'function') {
            window.openPreviewModal({ badge: f.badge, title: f.name, text: fwText, insertLabel: 'Add to Canvas', onInsert: function(text) { addBlock(f.name, text); wireDropZone(); } });
          } else { addFramework(f); wireDropZone(); }
        }
      }
    });

    ws.addEventListener('dragstart', function(e) {
      const tile = e.target.closest('[data-pcw-block]');
      const fw = e.target.closest('[data-pcw-fw]');
      if (tile) {
        e.dataTransfer.setData('pcw-block', tile.dataset.pcwBlock);
        e.dataTransfer.effectAllowed = 'copy';
      } else if (fw) {
        e.dataTransfer.setData('pcw-fw', fw.dataset.pcwFw);
        e.dataTransfer.effectAllowed = 'copy';
      }
    });

    wireDropZone();
  };

  function closeComponentsWorkspace() {
    const ws = document.getElementById('componentsWorkspace');
    if (ws) ws.classList.remove('open');
    document.querySelectorAll('.nav-item[data-view]').forEach(function(el) {
      el.classList.toggle('active', el.dataset.view === 'library');
    });
  }
  window.closeComponentsWorkspace = closeComponentsWorkspace;
})();"""

with open('_pcw_logic.txt', 'w', encoding='utf-8') as f:
    f.write(logic)
print("Logic written")
