#!/usr/bin/env python3
"""Add assembled-prompt preview sheet to PCW canvas and wire Preview button."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

html = open('static/index.html', 'r', encoding='utf-8').read()
css  = open('static/app.css',   'r', encoding='utf-8').read()
js   = open('static/app.js',    'r', encoding='utf-8').read()

# ══════════════════════════════════════════════════════════════════════════
# 1. INSERT preview sheet HTML inside .pcw-canvas, after .pcw-canvas-inner
# ══════════════════════════════════════════════════════════════════════════

OLD_CANVAS = '''      <div class="pcw-footer">'''

NEW_CANVAS = '''      <!-- Assembled prompt preview sheet (slides up on Preview click) -->
      <div class="pcw-preview-sheet" id="pcwPreviewSheet" aria-hidden="true">
        <div class="pcw-preview-sheet-header">
          <span class="material-symbols-outlined" style="color:var(--accent);font-size:18px;">auto_awesome</span>
          <span class="pcw-preview-sheet-title">Assembled Prompt</span>
          <span class="pcw-preview-sheet-count" id="pcwPreviewWordCount"></span>
          <button class="icon-btn pcw-preview-close" id="pcwPreviewClose" title="Close preview" aria-label="Close preview">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="pcw-preview-sheet-body">
          <pre class="pcw-preview-text" id="pcwPreviewText"></pre>
        </div>
        <div class="pcw-preview-sheet-footer">
          <button class="btn btn-ghost" id="pcwPreviewCopyBtn">
            <span class="material-symbols-outlined">content_copy</span> Copy to clipboard
          </button>
          <button class="btn btn-accent" id="pcwPreviewSaveBtn">
            <span class="material-symbols-outlined">save</span> Save to library
          </button>
        </div>
      </div>

      <div class="pcw-footer">'''

if OLD_CANVAS in html:
    html = html.replace(OLD_CANVAS, NEW_CANVAS, 1)
    print('1. Added pcwPreviewSheet HTML')
else:
    print('WARN: .pcw-footer not found')

# ══════════════════════════════════════════════════════════════════════════
# 2. REPLACE pcwPreviewBtn handler in JS
# ══════════════════════════════════════════════════════════════════════════

OLD_HANDLER = """    // Preview button (kept for backward compat — also copies)
    if ($('#pcwPreviewBtn')) {
      $('#pcwPreviewBtn').addEventListener('click', function() {
        var text = assemblePrompt();
        if (!text) { toast('Canvas is empty', 'warning'); return; }
        navigator.clipboard && navigator.clipboard.writeText(text).then(function() {
          toast('Assembled prompt copied to clipboard', 'success');
        });
      });
    }"""

NEW_HANDLER = """    // Preview button — opens the assembled-prompt preview sheet
    if ($('#pcwPreviewBtn')) {
      $('#pcwPreviewBtn').addEventListener('click', function() {
        var text = assemblePrompt();
        if (!text) { toast('Canvas is empty — add some blocks first', 'warning'); return; }
        var sheet    = $('#pcwPreviewSheet');
        var textEl   = $('#pcwPreviewText');
        var countEl  = $('#pcwPreviewWordCount');
        if (!sheet || !textEl) return;
        textEl.textContent = text;
        var words = text.trim().split(/\\s+/).filter(Boolean).length;
        var chars = text.length;
        if (countEl) countEl.textContent = words + ' words · ' + chars + ' chars';
        sheet.classList.add('open');
        sheet.setAttribute('aria-hidden', 'false');
      });
    }

    // Preview sheet — copy button
    if ($('#pcwPreviewCopyBtn')) {
      $('#pcwPreviewCopyBtn').addEventListener('click', function() {
        var text = $('#pcwPreviewText') ? $('#pcwPreviewText').textContent : '';
        if (!text) return;
        navigator.clipboard && navigator.clipboard.writeText(text).then(function() {
          toast('Prompt copied to clipboard', 'success');
          var btn = $('#pcwPreviewCopyBtn');
          if (btn) {
            btn.innerHTML = '<span class=\"material-symbols-outlined\">check</span> Copied!';
            setTimeout(function() {
              btn.innerHTML = '<span class=\"material-symbols-outlined\">content_copy</span> Copy to clipboard';
            }, 1800);
          }
        });
      });
    }

    // Preview sheet — save button (pre-fills title if empty, triggers save)
    if ($('#pcwPreviewSaveBtn')) {
      $('#pcwPreviewSaveBtn').addEventListener('click', function() {
        var sheet = $('#pcwPreviewSheet');
        if (sheet) { sheet.classList.remove('open'); sheet.setAttribute('aria-hidden','true'); }
        saveToLibrary();
      });
    }

    // Preview sheet — close button + Escape
    function closePcwPreviewSheet() {
      var sheet = $('#pcwPreviewSheet');
      if (sheet) { sheet.classList.remove('open'); sheet.setAttribute('aria-hidden','true'); }
    }
    if ($('#pcwPreviewClose')) {
      $('#pcwPreviewClose').addEventListener('click', closePcwPreviewSheet);
    }
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && $('#pcwPreviewSheet') && $('#pcwPreviewSheet').classList.contains('open')) {
        closePcwPreviewSheet();
      }
    });"""

if OLD_HANDLER in js:
    js = js.replace(OLD_HANDLER, NEW_HANDLER, 1)
    print('2. Replaced pcwPreviewBtn handler')
else:
    print('WARN: pcwPreviewBtn handler not found exactly')

# ══════════════════════════════════════════════════════════════════════════
# 3. ADD CSS for preview sheet
# ══════════════════════════════════════════════════════════════════════════

PREVIEW_CSS = """

/* ── PCW Assembled Prompt Preview Sheet ─────────────────────────────────── */

.pcw-preview-sheet {
  position: absolute;
  inset: 0;
  background: var(--surface-1);
  z-index: 20;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  border-top: 1px solid var(--border);
  border-radius: var(--r-lg) var(--r-lg) 0 0;
}

.pcw-preview-sheet.open {
  transform: translateY(0);
}

.pcw-preview-sheet-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.pcw-preview-sheet-title {
  font-family: var(--ff-display);
  font-size: var(--fs-base);
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--ink-1);
}

.pcw-preview-sheet-count {
  font-size: var(--fs-xs);
  color: var(--ink-3);
  margin-left: var(--sp-2);
}

.pcw-preview-close {
  margin-left: auto;
}

.pcw-preview-sheet-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--sp-4) var(--sp-5);
}

.pcw-preview-text {
  font-family: var(--ff-mono, 'Fira Code', monospace);
  font-size: var(--fs-sm);
  line-height: 1.75;
  color: var(--ink-1);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  background: transparent;
}

.pcw-preview-sheet-footer {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

/* Make .pcw-canvas position:relative so the sheet overlays it */
.pcw-canvas {
  position: relative;
  overflow: hidden;
}
"""

# Check for duplicate first
if 'pcw-preview-sheet' in css:
    print('WARN: pcw-preview-sheet CSS already exists, skipping')
else:
    css = css + PREVIEW_CSS
    print('3. Added preview sheet CSS')

# ══════════════════════════════════════════════════════════════════════════
# 4. WRITE FILES
# ══════════════════════════════════════════════════════════════════════════

open('static/index.html', 'w', encoding='utf-8').write(html)
open('static/app.css',    'w', encoding='utf-8').write(css)
open('static/app.js',     'w', encoding='utf-8').write(js)

print()
print('=== Written ===')
print(f'index.html: {len(html)} chars')
print(f'app.css:    {len(css)} chars')
print(f'app.js:     {len(js)} chars')
