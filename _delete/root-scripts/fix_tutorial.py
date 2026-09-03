#!/usr/bin/env python3
"""Fix tutorial JS bugs: wrong IDs, wrong function name, highlight bleed."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

js = open('static/app.js', 'r', encoding='utf-8').read()

# ─── Fix 1: wrong target on step 1 (Library) ─────────────────────────────────
OLD1 = "      target: '#promptListArea',"
NEW1 = "      target: '#promptsContainer',"

if OLD1 in js:
    js = js.replace(OLD1, NEW1, 1)
    print('Fix 1 OK: #promptListArea → #promptsContainer')
else:
    print('WARN: Fix 1 target not found')

# ─── Fix 2: wrong function call on step 2 onNext ─────────────────────────────
OLD2 = "        if (typeof openComponentsWorkspace === 'function') openComponentsWorkspace();"
NEW2 = "        setView('components');"

if OLD2 in js:
    js = js.replace(OLD2, NEW2, 1)
    print('Fix 2 OK: openComponentsWorkspace() → setView(\'components\')')
else:
    print('WARN: Fix 2 onNext not found')

# ─── Fix 3: zero out highlight dimensions when hiding, so box-shadow can't ───
# bleed from position 0,0 on "no target" steps.
OLD3 = """  function _positionHighlight(rect) {
    var h = _el('tutorialHighlight');
    if (!h) return;
    if (!rect) {
      h.classList.remove('active');
      return;
    }"""

NEW3 = """  function _positionHighlight(rect) {
    var h = _el('tutorialHighlight');
    if (!h) return;
    if (!rect) {
      h.classList.remove('active');
      h.style.width  = '0';
      h.style.height = '0';
      h.style.top    = '-9999px';
      h.style.left   = '-9999px';
      return;
    }"""

if OLD3 in js:
    js = js.replace(OLD3, NEW3, 1)
    print('Fix 3 OK: highlight zeroed out when no target')
else:
    print('WARN: Fix 3 _positionHighlight not found exactly')

open('static/app.js', 'w', encoding='utf-8').write(js)
print(f'\napp.js written: {len(js)} chars')
