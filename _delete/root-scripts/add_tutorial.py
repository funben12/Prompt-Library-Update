#!/usr/bin/env python3
"""Add beginner tutorial tour to Prompt Library Pro."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

html = open('static/index.html', 'r', encoding='utf-8').read()
css  = open('static/app.css',   'r', encoding='utf-8').read()
js   = open('static/app.js',    'r', encoding='utf-8').read()

# ══════════════════════════════════════════════════════════════════════════
# 1. ADD TUTORIAL BUTTON TO SIDEBAR FOOTER
# ══════════════════════════════════════════════════════════════════════════

OLD_FOOTER = '''      <button class="sidebar-footer-btn" id="configToggleBtn" title="API settings" aria-label="Open API settings">
        <span class="material-symbols-outlined">settings</span>
        <span>API settings</span>
      </button>
    </div>'''

NEW_FOOTER = '''      <button class="sidebar-footer-btn" id="configToggleBtn" title="API settings" aria-label="Open API settings">
        <span class="material-symbols-outlined">settings</span>
        <span>API settings</span>
      </button>
      <button class="sidebar-footer-btn" id="tutorialBtn" title="How to use Prompt Library" aria-label="Open tutorial" onclick="window.PL_startTutorial()">
        <span class="material-symbols-outlined">help_outline</span>
        <span>How to use</span>
      </button>
    </div>'''

if OLD_FOOTER in html:
    html = html.replace(OLD_FOOTER, NEW_FOOTER, 1)
    print('Added tutorial button to sidebar footer')
else:
    print('WARNING: sidebar footer not found exactly')

# ══════════════════════════════════════════════════════════════════════════
# 2. ADD TUTORIAL OVERLAY HTML (before toastContainer)
# ══════════════════════════════════════════════════════════════════════════

TUTORIAL_HTML = """<!-- Tutorial Overlay -->
<div id="tutorialOverlay" aria-hidden="true"></div>
<div id="tutorialHighlight" aria-hidden="true"></div>
<div id="tutorialCard" role="dialog" aria-label="Tutorial step" aria-modal="true">
  <div class="tour-progress" id="tourProgress"></div>
  <div class="tour-card-body">
    <div class="tour-icon" id="tourIcon"></div>
    <h3 class="tour-title" id="tourTitle"></h3>
    <div class="tour-body" id="tourBody"></div>
  </div>
  <div class="tour-footer">
    <button class="btn btn-ghost tour-skip" id="tourSkipBtn" onclick="window.PL_endTutorial()">Skip tour</button>
    <div class="tour-nav">
      <button class="btn btn-ghost tour-back" id="tourBackBtn" onclick="window.PL_tutorialBack()">
        <span class="material-symbols-outlined">arrow_back</span> Back
      </button>
      <button class="btn btn-accent tour-next" id="tourNextBtn" onclick="window.PL_tutorialNext()">
        Next <span class="material-symbols-outlined">arrow_forward</span>
      </button>
    </div>
  </div>
  <div class="tour-arrow" id="tourArrow"></div>
</div>

"""

html = html.replace('<div id="toastContainer"', TUTORIAL_HTML + '<div id="toastContainer"', 1)
print('Added tutorial overlay HTML')

# ══════════════════════════════════════════════════════════════════════════
# 3. ADD TUTORIAL CSS
# ══════════════════════════════════════════════════════════════════════════

TUTORIAL_CSS = """

/* ── Tutorial Tour ───────────────────────────────────────────────── */

#tutorialOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 9990;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

#tutorialOverlay.active {
  opacity: 1;
  pointer-events: all;
}

#tutorialHighlight {
  position: fixed;
  z-index: 9992;
  border-radius: 10px;
  pointer-events: none;
  transition: top 0.35s cubic-bezier(0.4,0,0.2,1),
              left 0.35s cubic-bezier(0.4,0,0.2,1),
              width 0.35s cubic-bezier(0.4,0,0.2,1),
              height 0.35s cubic-bezier(0.4,0,0.2,1),
              opacity 0.3s;
  opacity: 0;
  outline: 3px solid var(--accent);
  outline-offset: 4px;
  box-shadow: 0 0 0 9999px rgba(0,0,0,0.58);
}

#tutorialHighlight.active {
  opacity: 1;
}

#tutorialCard {
  position: fixed;
  z-index: 9995;
  background: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.12);
  width: 340px;
  max-width: calc(100vw - 32px);
  padding: 0;
  display: none;
  flex-direction: column;
  overflow: visible;
  transition: top 0.35s cubic-bezier(0.4,0,0.2,1),
              left 0.35s cubic-bezier(0.4,0,0.2,1);
}

#tutorialCard.active {
  display: flex;
}

.tour-progress {
  display: flex;
  gap: 5px;
  padding: var(--sp-3) var(--sp-4) 0;
}

.tour-dot {
  flex: 1;
  height: 3px;
  border-radius: 99px;
  background: var(--surface-3);
  transition: background 0.3s;
}

.tour-dot.done   { background: var(--accent); }
.tour-dot.active { background: var(--accent); opacity: 0.5; }

.tour-card-body {
  padding: var(--sp-4) var(--sp-5) var(--sp-3);
}

.tour-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent), color-mix(in oklch, var(--accent) 70%, white));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  margin-bottom: var(--sp-3);
}

.tour-icon .material-symbols-outlined {
  font-size: 18px;
  color: #fff;
}

.tour-title {
  font-family: var(--ff-display);
  font-size: var(--fs-lg);
  font-weight: 400;
  letter-spacing: -0.02em;
  color: var(--ink-1);
  margin-bottom: var(--sp-2);
}

.tour-body {
  font-size: var(--fs-sm);
  color: var(--ink-2);
  line-height: 1.65;
}

.tour-body p { margin-bottom: var(--sp-2); }
.tour-body p:last-child { margin-bottom: 0; }

.tour-body ul {
  padding-left: var(--sp-4);
  margin: var(--sp-2) 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tour-body li { line-height: 1.5; }

/* Mini prompt diagram */
.tour-prompt-flow {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: var(--sp-3);
  padding: var(--sp-3);
  background: var(--surface-2);
  border-radius: 10px;
  border: 1px solid var(--border);
  flex-wrap: wrap;
  justify-content: center;
}

.tour-block-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}

.tour-block-chip .material-symbols-outlined { font-size: 13px; }
.tour-block-chip.role     { background: var(--accent); }
.tour-block-chip.task     { background: var(--c-orange); }
.tour-block-chip.format   { background: var(--c-blue); }

.tour-flow-plus, .tour-flow-arrow {
  font-size: 14px;
  color: var(--ink-3);
}

.tour-result-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: var(--surface-3);
  border: 1px solid var(--border);
  color: var(--ink-1);
}

.tour-result-chip .material-symbols-outlined { font-size: 13px; }

/* Tip boxes */
.tour-tip {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  border-left: 3px solid var(--accent);
  border-radius: 0 6px 6px 0;
  margin-top: var(--sp-3);
  font-size: 11px;
  color: var(--ink-2);
  line-height: 1.5;
}

.tour-tip .material-symbols-outlined { font-size: 14px; color: var(--accent); flex-shrink: 0; margin-top: 1px; }

/* Quick tip list (done screen) */
.tour-quick-tips {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: var(--sp-3);
}

.tour-quick-tip {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  background: var(--surface-2);
  border-radius: 8px;
  font-size: var(--fs-xs);
  color: var(--ink-2);
}

.tour-quick-tip .material-symbols-outlined {
  font-size: 16px;
  color: var(--accent);
  flex-shrink: 0;
}

.tour-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-3) var(--sp-4) var(--sp-4);
  border-top: 1px solid var(--border);
  gap: var(--sp-2);
}

.tour-skip {
  font-size: 12px;
  color: var(--ink-3);
  padding: 4px 8px;
}

.tour-nav {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.tour-back {
  font-size: var(--fs-sm);
  padding: 6px 12px;
}

.tour-next {
  font-size: var(--fs-sm);
  padding: 6px 14px;
}

/* Arrow pointer */
.tour-arrow {
  position: absolute;
  width: 12px;
  height: 12px;
  background: var(--surface-1);
  border: 1px solid var(--border);
  transform: rotate(45deg);
  z-index: 9994;
  display: none;
}

.tour-arrow.left   { left: -7px;  top: 50%;  transform: translateY(-50%) rotate(45deg);  border-right: none; border-top: none; }
.tour-arrow.right  { right: -7px; top: 50%;  transform: translateY(-50%) rotate(45deg);  border-left: none; border-bottom: none; }
.tour-arrow.top    { top: -7px;   left: 50%; transform: translateX(-50%) rotate(45deg); border-right: none; border-bottom: none; }
.tour-arrow.bottom { bottom: -7px; left: 50%; transform: translateX(-50%) rotate(45deg); border-left: none; border-top: none; }
"""

css = css + TUTORIAL_CSS
print('Added tutorial CSS')

# ══════════════════════════════════════════════════════════════════════════
# 4. ADD TUTORIAL JS IIFE
# ══════════════════════════════════════════════════════════════════════════

TUTORIAL_JS = r"""

/* ============================================================================
   TUTORIAL TOUR — Beginner guide, Components-focused
   ============================================================================ */

(function initTutorial() {

  var STEPS = [
    // 0 — Welcome (centred, no target)
    {
      target: null,
      icon: 'waving_hand',
      title: 'Welcome to Prompt Library',
      html: '<p>This quick tour shows you how to build powerful AI prompts — in about 2 minutes.</p>' +
            '<div class="tour-prompt-flow">' +
              '<div class="tour-block-chip role"><span class="material-symbols-outlined">person</span>Role</div>' +
              '<span class="tour-flow-plus material-symbols-outlined">add</span>' +
              '<div class="tour-block-chip task"><span class="material-symbols-outlined">task_alt</span>Task</div>' +
              '<span class="tour-flow-plus material-symbols-outlined">add</span>' +
              '<div class="tour-block-chip format"><span class="material-symbols-outlined">format_align_left</span>Format</div>' +
              '<span class="tour-flow-arrow material-symbols-outlined">arrow_forward</span>' +
              '<div class="tour-result-chip"><span class="material-symbols-outlined">description</span>Your Prompt</div>' +
            '</div>' +
            '<div class="tour-tip"><span class="material-symbols-outlined">info</span>You can re-open this tour at any time from the <strong>How to use</strong> button in the sidebar.</div>',
      position: 'center'
    },
    // 1 — The Library
    {
      target: '#promptListArea',
      icon: 'library_books',
      title: 'Your Prompt Library',
      html: '<p>Every prompt you create lives here. Click any prompt to view it, copy the text, or edit it.</p>' +
            '<p>Use the sidebar to filter by folder, tags, or categories. The search bar finds prompts instantly.</p>' +
            '<div class="tour-tip"><span class="material-symbols-outlined">info</span>Start with the <strong>Starter Prompts</strong> already in your library to see what a finished prompt looks like.</div>',
      position: 'right'
    },
    // 2 — Components nav button
    {
      target: '.nav-item[data-view="components"]',
      icon: 'extension',
      title: 'The Component Builder',
      html: '<p>This is the main event. The <strong>Component Builder</strong> lets you assemble prompts from reusable building blocks — like LEGO bricks for AI.</p>' +
            '<p>Instead of writing prompts from scratch, you pick pre-written blocks and combine them. Faster, more consistent, and easier to improve over time.</p>',
      position: 'right',
      onNext: function() {
        // Navigate to components workspace before advancing
        if (typeof openComponentsWorkspace === 'function') openComponentsWorkspace();
      }
    },
    // 3 — Category dropdown
    {
      target: '#pcwCatDropdownBtn',
      icon: 'filter_list',
      title: 'Filter by Category',
      html: '<p>Every block is organised into categories. Click this button to open the category filter and pick what type of block you need:</p>' +
            '<ul>' +
              '<li><strong>Core</strong> — Role, Task, Context, Goal</li>' +
              '<li><strong>Output</strong> — Format, Length, JSON, Step-by-step</li>' +
              '<li><strong>Reasoning</strong> — Chain of Thought, First Principles</li>' +
              '<li><strong>Guardrails</strong> — Scope lock, Anti-hallucination</li>' +
              '<li><strong>…and 11 more categories</strong></li>' +
            '</ul>',
      position: 'right'
    },
    // 4 — Palette / block list
    {
      target: '#pcwPaletteBody',
      icon: 'widgets',
      title: 'Click Any Block to Add It',
      html: '<p>Each card in this panel is a prompt building block. <strong>Click once</strong> to add it to your canvas.</p>' +
            '<p>Try this order for a solid first prompt:</p>' +
            '<div class="tour-prompt-flow" style="margin-top:0">' +
              '<div class="tour-block-chip role"><span class="material-symbols-outlined">person</span>1. Role</div>' +
              '<span class="tour-flow-plus material-symbols-outlined">add</span>' +
              '<div class="tour-block-chip task"><span class="material-symbols-outlined">task_alt</span>2. Task</div>' +
              '<span class="tour-flow-plus material-symbols-outlined">add</span>' +
              '<div class="tour-block-chip format"><span class="material-symbols-outlined">format_align_left</span>3. Format</div>' +
            '</div>' +
            '<div class="tour-tip"><span class="material-symbols-outlined">info</span>Use the <strong>Expand / Collapse All</strong> button next to the category dropdown to scan the full block library at a glance.</div>',
      position: 'right'
    },
    // 5 — Canvas
    {
      target: '#pcwDropZone',
      icon: 'space_dashboard',
      title: 'Your Prompt Canvas',
      html: '<p>When you click a block, it lands here on the canvas. Your blocks stack up <strong>top to bottom</strong> — and that order matters, because the AI reads your prompt in sequence.</p>' +
            '<p><strong>Drag any block</strong> up or down to reorder it. <strong>Click the ✕</strong> to remove a block you don\'t need.</p>' +
            '<div class="tour-tip"><span class="material-symbols-outlined">info</span>A good rule: put Role and Context at the top, then Task in the middle, then Output Format at the bottom.</div>',
      position: 'left'
    },
    // 6 — Preview button
    {
      target: '#pcwPreviewBtn',
      icon: 'visibility',
      title: 'Preview Your Assembled Prompt',
      html: '<p>Once you\'ve added a few blocks, click <strong>Preview</strong> to see them merged into a single piece of text.</p>' +
            '<p>This is exactly what gets sent to the AI — you\'ll see how your blocks flow together and spot anything that needs adjusting before you save.</p>',
      position: 'top'
    },
    // 7 — Title + save
    {
      target: '#pcwTitleInput',
      icon: 'save',
      title: 'Name It and Save It',
      html: '<p>Type a clear, descriptive name for your prompt here — something that tells you exactly what it does when you see it in your library.</p>' +
            '<p>Then click <strong>Save to Library</strong>. Your prompt is saved instantly and appears in the library, ready to copy and use in any AI tool.</p>' +
            '<div class="tour-tip"><span class="material-symbols-outlined">info</span>Good names are specific: <em>"Blog intro — SaaS product"</em> is better than <em>"Blog post"</em>.</div>',
      position: 'top'
    },
    // 8 — Done
    {
      target: null,
      icon: 'rocket_launch',
      title: "You're ready to build",
      html: '<p>That\'s everything you need to know. Here\'s a quick cheat sheet:</p>' +
            '<div class="tour-quick-tips">' +
              '<div class="tour-quick-tip"><span class="material-symbols-outlined">filter_list</span><span>Use the <strong>Category dropdown</strong> to find the right type of block fast</span></div>' +
              '<div class="tour-quick-tip"><span class="material-symbols-outlined">unfold_more</span><span><strong>Expand/Collapse All</strong> to scan the full block library at once</span></div>' +
              '<div class="tour-quick-tip"><span class="material-symbols-outlined">drag_indicator</span><span><strong>Drag blocks</strong> to reorder them — sequence matters</span></div>' +
              '<div class="tour-quick-tip"><span class="material-symbols-outlined">visibility</span><span><strong>Preview</strong> before saving to check how your prompt reads</span></div>' +
              '<div class="tour-quick-tip"><span class="material-symbols-outlined">help_outline</span><span>Reopen this tour from <strong>How to use</strong> in the sidebar</span></div>' +
            '</div>',
      position: 'center',
      isLast: true
    }
  ];

  var _step = 0;
  var _running = false;
  var _raf = null;

  function _el(id) { return document.getElementById(id); }

  function _getRect(selector) {
    if (!selector) return null;
    var el = document.querySelector(selector);
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return (r.width === 0 && r.height === 0) ? null : r;
  }

  function _positionHighlight(rect) {
    var h = _el('tutorialHighlight');
    if (!h) return;
    if (!rect) {
      h.classList.remove('active');
      return;
    }
    var pad = 6;
    h.style.top    = (rect.top    - pad) + 'px';
    h.style.left   = (rect.left   - pad) + 'px';
    h.style.width  = (rect.width  + pad*2) + 'px';
    h.style.height = (rect.height + pad*2) + 'px';
    h.classList.add('active');
  }

  function _positionCard(rect, position) {
    var card   = _el('tutorialCard');
    var arrow  = _el('tourArrow');
    if (!card) return;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var cw = 340;
    var GAP = 18;

    // Reset arrow
    if (arrow) { arrow.style.display = 'none'; arrow.className = 'tour-arrow'; }

    if (!rect || position === 'center') {
      // Centred
      card.style.top  = ((vh - card.offsetHeight) / 2) + 'px';
      card.style.left = ((vw - cw) / 2) + 'px';
      return;
    }

    var ch = card.offsetHeight || 300;
    var top, left;

    if (position === 'right') {
      left = Math.min(rect.right + GAP, vw - cw - 8);
      top  = Math.max(8, Math.min(rect.top + (rect.height/2) - (ch/2), vh - ch - 8));
      if (arrow) { arrow.style.display = 'block'; arrow.style.top = (Math.min(rect.top + rect.height/2, top + ch - 20) - top) + 'px'; arrow.classList.add('left'); }
    } else if (position === 'left') {
      left = Math.max(8, rect.left - cw - GAP);
      top  = Math.max(8, Math.min(rect.top + (rect.height/2) - (ch/2), vh - ch - 8));
      if (arrow) { arrow.style.display = 'block'; arrow.style.top = (Math.min(rect.top + rect.height/2, top + ch - 20) - top) + 'px'; arrow.classList.add('right'); }
    } else if (position === 'top') {
      top  = Math.max(8, rect.top - ch - GAP);
      left = Math.max(8, Math.min(rect.left + (rect.width/2) - (cw/2), vw - cw - 8));
      if (arrow) { arrow.style.display = 'block'; arrow.style.left = (rect.left + rect.width/2 - left - 6) + 'px'; arrow.classList.add('bottom'); }
    } else { // bottom
      top  = Math.min(rect.bottom + GAP, vh - ch - 8);
      left = Math.max(8, Math.min(rect.left + (rect.width/2) - (cw/2), vw - cw - 8));
      if (arrow) { arrow.style.display = 'block'; arrow.style.left = (rect.left + rect.width/2 - left - 6) + 'px'; arrow.classList.add('top'); }
    }

    card.style.top  = Math.max(8, top)  + 'px';
    card.style.left = Math.max(8, left) + 'px';
  }

  function _renderProgress() {
    var el = _el('tourProgress');
    if (!el) return;
    var dots = STEPS.map(function(_, i) {
      var cls = i < _step ? 'tour-dot done' : i === _step ? 'tour-dot active' : 'tour-dot';
      return '<div class="' + cls + '"></div>';
    }).join('');
    el.innerHTML = dots;
  }

  function _renderStep(n) {
    var step = STEPS[n];
    if (!step) return;

    var iconEl  = _el('tourIcon');
    var titleEl = _el('tourTitle');
    var bodyEl  = _el('tourBody');
    var skipBtn = _el('tourSkipBtn');
    var backBtn = _el('tourBackBtn');
    var nextBtn = _el('tourNextBtn');

    if (iconEl)  iconEl.innerHTML  = '<span class="material-symbols-outlined">' + step.icon + '</span>';
    if (titleEl) titleEl.textContent = step.title;
    if (bodyEl)  bodyEl.innerHTML  = step.html;
    if (skipBtn) skipBtn.style.display = step.isLast ? 'none' : '';
    if (backBtn) backBtn.style.display = n === 0 ? 'none' : '';
    if (nextBtn) nextBtn.innerHTML = step.isLast
      ? '<span class="material-symbols-outlined">check</span> Done'
      : 'Next <span class="material-symbols-outlined">arrow_forward</span>';

    _renderProgress();

    var rect = _getRect(step.target);
    _positionHighlight(rect);

    // Wait a tick for card height to settle, then position
    requestAnimationFrame(function() {
      _positionCard(rect, step.position);
    });
  }

  function _show() {
    var overlay = _el('tutorialOverlay');
    var card    = _el('tutorialCard');
    if (overlay) overlay.classList.add('active');
    if (card)    card.classList.add('active');
    document.body.style.overflow = 'hidden';
    _running = true;
  }

  function _hide() {
    var overlay  = _el('tutorialOverlay');
    var card     = _el('tutorialCard');
    var highlight= _el('tutorialHighlight');
    if (overlay)   overlay.classList.remove('active');
    if (card)      card.classList.remove('active');
    if (highlight) highlight.classList.remove('active');
    document.body.style.overflow = '';
    _running = false;
  }

  window.PL_startTutorial = function() {
    _step = 0;
    _show();
    // Small delay so DOM is fully painted before positioning
    setTimeout(function() { _renderStep(0); }, 80);
  };

  window.PL_endTutorial = function() {
    _hide();
    localStorage.setItem('pl_tutorial_seen', '1');
  };

  window.PL_tutorialNext = function() {
    var step = STEPS[_step];
    if (step && step.isLast) { window.PL_endTutorial(); return; }
    if (step && step.onNext) step.onNext();
    _step = Math.min(_step + 1, STEPS.length - 1);
    // Small delay if we just navigated to a new workspace
    setTimeout(function() { _renderStep(_step); }, 120);
  };

  window.PL_tutorialBack = function() {
    if (_step === 0) return;
    _step--;
    setTimeout(function() { _renderStep(_step); }, 60);
  };

  // Close on overlay click (allows continuing without completing)
  document.addEventListener('click', function(e) {
    if (_running && e.target && e.target.id === 'tutorialOverlay') {
      window.PL_endTutorial();
    }
  });

  // Re-position on resize
  window.addEventListener('resize', function() {
    if (!_running) return;
    var step = STEPS[_step];
    if (!step) return;
    var rect = _getRect(step.target);
    _positionHighlight(rect);
    requestAnimationFrame(function() { _positionCard(rect, step.position); });
  });

  // Auto-show on first launch (delay so app finishes loading)
  if (!localStorage.getItem('pl_tutorial_seen')) {
    setTimeout(window.PL_startTutorial, 1400);
  }

})();

"""

# Append after the last })(); in app.js (end of file)
js = js + TUTORIAL_JS
print('Added tutorial JS IIFE')

# ══════════════════════════════════════════════════════════════════════════
# 5. WRITE FILES
# ══════════════════════════════════════════════════════════════════════════

open('static/app.js',     'w', encoding='utf-8').write(js)
open('static/index.html', 'w', encoding='utf-8').write(html)
open('static/app.css',    'w', encoding='utf-8').write(css)

print()
print('=== Written ===')
print(f'app.js:     {len(js)} chars')
print(f'index.html: {len(html)} chars')
print(f'app.css:    {len(css)} chars')
