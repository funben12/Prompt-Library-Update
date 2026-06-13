#!/usr/bin/env python3
"""
Full update script:
1. Remove all sprite code
2. Replace component workspace data with user's new blocks
3. Expand colour picker
4. Add Expand/Collapse All + Category dropdown QoL features
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

# ─── Read files ────────────────────────────────────────────────────────────

js   = open('static/app.js',    'r', encoding='utf-8').read()
html = open('static/index.html','r', encoding='utf-8').read()
css  = open('static/app.css',   'r', encoding='utf-8').read()
py   = open('app.py',           'r', encoding='utf-8').read()
user_js = open(r'C:\Users\Eugene Phillips\Desktop\New folder\New Editions\Components Workspace Update.js',
               'r', encoding='utf-8').read()

print(f'Starting: js={len(js)} html={len(html)} css={len(css)}')

# ══════════════════════════════════════════════════════════════════════════
# STEP 1 — REMOVE ALL SPRITE CODE FROM APP.JS
# ══════════════════════════════════════════════════════════════════════════

# Remove sprite IIFE
sp_iife_start = js.find('/* ====================================================\n   SPRITE COMPANION SYSTEM')
if sp_iife_start == -1:
    sp_iife_start = js.find('/* ================\n   SPRITE COMPANION')

# Also try the marker comment used in rebuild_from_backup.py
if sp_iife_start == -1:
    sp_iife_start = js.find('(function initSpritesSystem(')
    if sp_iife_start != -1:
        # Go back to find the section comment before it
        comment_search = js.rfind('\n/* =', 0, sp_iife_start)
        if comment_search != -1:
            sp_iife_start = comment_search

if sp_iife_start != -1:
    # Find end of sprite IIFE section
    sp_iife_end = js.find('})();', js.find('(function initSpritesSystem', sp_iife_start)) + 5
    # Include trailing newlines
    while sp_iife_end < len(js) and js[sp_iife_end] in '\n\r':
        sp_iife_end += 1
    js = js[:sp_iife_start] + js[sp_iife_end:]
    print('Removed sprite IIFE')
else:
    print('WARNING: sprite IIFE not found')

# Remove initSpriteCompanions function
companions_start = js.find('/* ============================================================================\n   SPRITE COMPANIONS — Walk animation')
if companions_start == -1:
    companions_start = js.find('function initSpriteCompanions()')
    if companions_start != -1:
        # Go back to find section comment
        comment_search = js.rfind('\n/* ', 0, companions_start)
        if comment_search != -1:
            companions_start = comment_search + 1

if companions_start != -1:
    # Find end of the function — next /* ===== comment
    companions_end = js.find('\n/* =', companions_start + 100)
    if companions_end == -1:
        companions_end = js.find('\ndocument.addEventListener', companions_start)
    if companions_end != -1:
        js = js[:companions_start] + js[companions_end:]
        print('Removed initSpriteCompanions function')
    else:
        print('WARNING: could not find end of initSpriteCompanions')
else:
    print('WARNING: initSpriteCompanions not found')

# Remove BOOTSTRAP wire
js = js.replace('  initSpriteCompanions();\n', '')
print('Removed BOOTSTRAP wire')

# ══════════════════════════════════════════════════════════════════════════
# STEP 2 — REMOVE SPRITE HTML FROM INDEX.HTML
# ══════════════════════════════════════════════════════════════════════════

# Remove sprite container + chat modal block
sprite_html_start = html.find('<!-- Sprite Companions -->')
if sprite_html_start != -1:
    # Find end — up to and including spriteChatModal's closing </div>
    sprite_html_end = html.find('\n\n', html.find('</div>\n</div>', html.find('sprite-chat-footer')))
    if sprite_html_end == -1:
        sprite_html_end = html.find('<div id="toastContainer"')
    if sprite_html_end != -1:
        html = html[:sprite_html_start] + html[sprite_html_end:]
        print('Removed sprite HTML block')
    else:
        print('WARNING: could not find end of sprite HTML')
else:
    print('INFO: sprite HTML not found (already removed)')

# Remove companions settings from config panel
companions_cfg_start = html.find('      <hr style="border:none;border-top:1px solid var(--border);margin:var(--sp-4) 0;" />\n      <div class="config-section-label">Companions</div>')
if companions_cfg_start != -1:
    companions_cfg_end = html.find('    </div>\n  </div>', companions_cfg_start)
    if companions_cfg_end != -1:
        companions_cfg_end += len('    </div>\n  </div>')
        # Re-add the closing divs (config panel body close)
        html = html[:companions_cfg_start] + '    </div>\n  </div>' + html[companions_cfg_end:]
        print('Removed companions settings from config panel')
    else:
        print('WARNING: could not find end of companions config section')
else:
    print('INFO: companions config section not found')

# Remove gift section from premiumModal
gift_start = html.find('      <div class="plan-gift-section"')
if gift_start != -1:
    gift_end = html.find('</div>\n      ', gift_start)
    if gift_end != -1:
        gift_end += len('</div>\n      ')
        html = html[:gift_start] + '      ' + html[gift_end:]
        print('Removed gift section from premiumModal')
else:
    print('INFO: gift section not found')

# ══════════════════════════════════════════════════════════════════════════
# STEP 3 — REMOVE SPRITE CSS
# ══════════════════════════════════════════════════════════════════════════

sprite_css_start = css.find('\n/* ── Sprite Companions')
if sprite_css_start != -1:
    css = css[:sprite_css_start]
    print('Removed sprite CSS')
else:
    print('INFO: sprite CSS not found')

# ══════════════════════════════════════════════════════════════════════════
# STEP 4 — REMOVE SPRITE ENDPOINTS FROM APP.PY
# ══════════════════════════════════════════════════════════════════════════

sprite_py_start = py.find('\n# ── Sprite Companion Chat')
if sprite_py_start != -1:
    py = py[:sprite_py_start]
    print('Removed sprite endpoints from app.py')
else:
    print('INFO: sprite endpoints not found in app.py')

# ══════════════════════════════════════════════════════════════════════════
# STEP 5 — REPLACE COMPONENT WORKSPACE DATA
# ══════════════════════════════════════════════════════════════════════════

# Extract CATEGORIES, BLOCKS, FRAMEWORKS from user's file
# User file starts with the IIFE wrapper, contains data only

# Find CATEGORIES in user file
u_cats_s = user_js.find('var CATEGORIES = [')
u_cats_e = user_js.find('];\n', u_cats_s) + 3
u_blocks_s = user_js.find('var BLOCKS = [', u_cats_e)
u_blocks_e = user_js.find('];\n', u_blocks_s) + 3
if u_blocks_e <= 3:
    u_blocks_e = user_js.find('];\n  var FRAMEWORKS', u_blocks_s) + 3

u_fw_s = user_js.find('var FRAMEWORKS = [', u_blocks_e)
u_fw_e = len(user_js)  # goes to end

user_cats   = user_js[u_cats_s:u_cats_e].strip()
user_blocks = user_js[u_blocks_s:u_blocks_e].strip()
user_fw     = user_js[u_fw_s:u_fw_e].strip()
# Ensure frameworks ends with ];
if not user_fw.rstrip().endswith('];'):
    user_fw = user_fw.rstrip().rstrip(',') + '\n  ];'

print(f'User data: cats={len(user_cats)} blocks={len(user_blocks)} fw={len(user_fw)} chars')

# Find boundaries in current app.js IIFE
iife_start = js.find('(function initComponentsWorkspace')
iife_end   = js.find('})();', iife_start + 100) + 5
iife       = js[iife_start:iife_end]

cats_s = iife.find('var CATEGORIES = [')
cats_e = iife.find('];', cats_s) + 2
blk_s  = iife.find('var BLOCKS = [', cats_e)
blk_e  = iife.find('];', blk_s) + 2
fw_s   = iife.find('var FRAMEWORKS = [', blk_e)
fw_e   = iife.find('];', fw_s) + 2

print(f'Current IIFE data positions: cats={cats_s}-{cats_e} blocks={blk_s}-{blk_e} fw={fw_s}-{fw_e}')

new_iife = (
    iife[:cats_s] +
    user_cats + '\n' +
    iife[cats_e:blk_s] +
    user_blocks + '\n' +
    iife[blk_e:fw_s] +
    user_fw + '\n' +
    iife[fw_e:]
)

js = js[:iife_start] + new_iife + js[iife_end:]
print(f'Component workspace data replaced. app.js now {len(js)} chars')

# ══════════════════════════════════════════════════════════════════════════
# STEP 6 — QoL: CATEGORY DROPDOWN + EXPAND/COLLAPSE ALL
# ══════════════════════════════════════════════════════════════════════════

# A) Update HTML: replace #pcwCatPills div with dropdown + expand button
OLD_CAT_DIV = '      <div class="pcw-cat-pills" id="pcwCatPills"><!-- injected by JS --></div>'
NEW_CAT_UI = '''      <div class="pcw-cat-toolbar">
        <div class="pcw-cat-dropdown-wrap">
          <button class="pcw-cat-dropdown-btn" id="pcwCatDropdownBtn" onclick="window._pcwToggleCatDropdown()">
            <span class="material-symbols-outlined" style="font-size:14px;">filter_list</span>
            <span id="pcwActiveCatLabel">All</span>
            <span class="material-symbols-outlined pcw-cat-chevron" id="pcwCatChevron">expand_more</span>
          </button>
          <div class="pcw-cat-dropdown" id="pcwCatDropdown">
            <div class="pcw-cat-pills" id="pcwCatPills"><!-- injected by JS --></div>
          </div>
        </div>
        <button class="pcw-expand-all-btn" id="pcwExpandAllBtn" onclick="window._pcwToggleAllSections()" title="Expand / Collapse all">
          <span class="material-symbols-outlined" id="pcwExpandIcon">unfold_more</span>
        </button>
      </div>'''

if OLD_CAT_DIV in html:
    html = html.replace(OLD_CAT_DIV, NEW_CAT_UI, 1)
    print('Updated cat pills to dropdown + expand/collapse button')
else:
    print('WARNING: pcwCatPills div not found in HTML')

# B) Update renderCatPills in JS to also update the dropdown button label
OLD_RENDER_CATS = '''    container.querySelectorAll('.pcw-cat-pill').forEach(function(pill) {
      pill.addEventListener('click', function() {
        _activeCat = pill.dataset.cat;
        renderCatPills();
        renderPalette($('#pcwPaletteSearch') ? $('#pcwPaletteSearch').value : '');
      });
    });
  }'''

NEW_RENDER_CATS = '''    container.querySelectorAll('.pcw-cat-pill').forEach(function(pill) {
      pill.addEventListener('click', function() {
        _activeCat = pill.dataset.cat;
        renderCatPills();
        renderPalette($('#pcwPaletteSearch') ? $('#pcwPaletteSearch').value : '');
        // Update dropdown label and close dropdown
        var label = document.getElementById('pcwActiveCatLabel');
        var dropdown = document.getElementById('pcwCatDropdown');
        var chevron = document.getElementById('pcwCatChevron');
        if (label) label.textContent = pill.textContent.trim();
        if (dropdown) dropdown.classList.remove('open');
        if (chevron) chevron.textContent = 'expand_more';
      });
    });
  }

  // Expose dropdown toggle
  window._pcwToggleCatDropdown = function() {
    var dropdown = document.getElementById('pcwCatDropdown');
    var chevron  = document.getElementById('pcwCatChevron');
    if (!dropdown) return;
    dropdown.classList.toggle('open');
    if (chevron) chevron.textContent = dropdown.classList.contains('open') ? 'expand_less' : 'expand_more';
  };

  // Expose expand/collapse all
  var _pcwAllExpanded = true;
  window._pcwToggleAllSections = function() {
    var sections = document.querySelectorAll('#pcwPaletteBody .pcw-palette-section');
    var icon = document.getElementById('pcwExpandIcon');
    _pcwAllExpanded = !_pcwAllExpanded;
    sections.forEach(function(s) { s.classList.toggle('pcw-collapsed', !_pcwAllExpanded); });
    if (icon) icon.textContent = _pcwAllExpanded ? 'unfold_more' : 'unfold_less';
  };'''

if OLD_RENDER_CATS in js:
    js = js.replace(OLD_RENDER_CATS, NEW_RENDER_CATS, 1)
    print('Updated renderCatPills with dropdown + expand/collapse handlers')
else:
    print('WARNING: renderCatPills click handler not found exactly — trying partial match')
    # Try finding just the closing of the forEach
    idx = js.find("_activeCat = pill.dataset.cat;\n        renderCatPills();\n        renderPalette")
    if idx != -1:
        print(f'  Found at char {idx}, manual inspect needed')
    else:
        print('  Not found at all')

# C) Add collapse behaviour to pcw-palette-section-header click in JS
# The backup wires data-toggle-section in openComponentsWorkspace
# Check if it exists
if 'data-toggle-section' in js and 'pcw-collapsed' not in js:
    # Add collapsed handling
    OLD_TOGGLE = "$$('[data-toggle-section]', palette).forEach(function(hdr) {"
    NEW_TOGGLE = "$$('[data-toggle-section]', palette).forEach(function(hdr) {\n      hdr.addEventListener('click', function() {\n        var sec = document.getElementById(hdr.dataset.toggleSection);\n        if (sec) { sec.classList.toggle('pcw-collapsed'); }\n      });"
    # This is already there in backup, just ensure collapsed CSS exists
    print('data-toggle-section wiring already in JS (backup)')

# ══════════════════════════════════════════════════════════════════════════
# STEP 7 — EXPAND COLOUR PICKER IN HTML
# ══════════════════════════════════════════════════════════════════════════

OLD_SWATCHES = '''              <div class="swatch none active" data-colour="" title="None"></div>
              <div class="swatch c-red"    data-colour="red"    title="Red"></div>
              <div class="swatch c-orange" data-colour="orange" title="Orange"></div>
              <div class="swatch c-yellow" data-colour="yellow" title="Yellow"></div>
              <div class="swatch c-green"  data-colour="green"  title="Green"></div>
              <div class="swatch c-teal"   data-colour="teal"   title="Teal"></div>
              <div class="swatch c-blue"   data-colour="blue"   title="Blue"></div>
              <div class="swatch c-purple" data-colour="purple" title="Purple"></div>
              <div class="swatch c-pink"   data-colour="pink"   title="Pink"></div>'''

NEW_SWATCHES = '''              <div class="swatch none active"     data-colour=""        title="None"></div>
              <div class="swatch c-red"          data-colour="red"      title="Red"></div>
              <div class="swatch c-orange"       data-colour="orange"   title="Orange"></div>
              <div class="swatch c-amber"        data-colour="amber"    title="Amber"></div>
              <div class="swatch c-yellow"       data-colour="yellow"   title="Yellow"></div>
              <div class="swatch c-lime"         data-colour="lime"     title="Lime"></div>
              <div class="swatch c-green"        data-colour="green"    title="Green"></div>
              <div class="swatch c-teal"         data-colour="teal"     title="Teal"></div>
              <div class="swatch c-cyan"         data-colour="cyan"     title="Cyan"></div>
              <div class="swatch c-blue"         data-colour="blue"     title="Blue"></div>
              <div class="swatch c-indigo"       data-colour="indigo"   title="Indigo"></div>
              <div class="swatch c-violet"       data-colour="violet"   title="Violet"></div>
              <div class="swatch c-purple"       data-colour="purple"   title="Purple"></div>
              <div class="swatch c-magenta"      data-colour="magenta"  title="Magenta"></div>
              <div class="swatch c-fuchsia"      data-colour="fuchsia"  title="Fuchsia"></div>
              <div class="swatch c-pink"         data-colour="pink"     title="Pink"></div>
              <div class="swatch c-rose"         data-colour="rose"     title="Rose"></div>
              <div class="swatch c-lavender"     data-colour="lavender" title="Lavender"></div>'''

if OLD_SWATCHES in html:
    html = html.replace(OLD_SWATCHES, NEW_SWATCHES, 1)
    print('Expanded colour picker swatches')
else:
    print('WARNING: colour picker swatches not found exactly')

# ══════════════════════════════════════════════════════════════════════════
# STEP 8 — ADD NEW COLOUR CSS VARIABLES + SWATCH CLASSES
# ══════════════════════════════════════════════════════════════════════════

# Add new CSS variables after --c-pink
OLD_COLOR_VARS = '    --c-pink:   oklch(63% 0.16 350);'
NEW_COLOR_VARS = '''    --c-pink:   oklch(63% 0.16 350);
    --c-amber:    oklch(75% 0.14 68);
    --c-lime:     oklch(72% 0.17 125);
    --c-cyan:     oklch(68% 0.12 205);
    --c-indigo:   oklch(50% 0.17 270);
    --c-violet:   oklch(55% 0.18 305);
    --c-magenta:  oklch(60% 0.19 330);
    --c-fuchsia:  oklch(58% 0.21 316);
    --c-rose:     oklch(62% 0.18 10);
    --c-lavender: oklch(72% 0.09 290);'''

css = css.replace(OLD_COLOR_VARS, NEW_COLOR_VARS, 1)

# Check dark mode too — add there as well
dark_idx = css.find('[data-theme="dark"]')
if dark_idx != -1:
    dark_pink_idx = css.find('--c-pink:', dark_idx)
    if dark_pink_idx != -1:
        dark_end = css.find('\n', dark_pink_idx) + 1
        DARK_EXTRAS = '''    --c-amber:    oklch(78% 0.14 68);
    --c-lime:     oklch(75% 0.17 125);
    --c-cyan:     oklch(72% 0.12 205);
    --c-indigo:   oklch(58% 0.17 270);
    --c-violet:   oklch(62% 0.18 305);
    --c-magenta:  oklch(65% 0.19 330);
    --c-fuchsia:  oklch(63% 0.21 316);
    --c-rose:     oklch(67% 0.18 10);
    --c-lavender: oklch(78% 0.09 290);\n'''
        css = css[:dark_end] + DARK_EXTRAS + css[dark_end:]

# Add new swatch CSS after .swatch.c-pink
OLD_SWATCH_CSS = '  .swatch.c-pink   { background: var(--c-pink); }'
NEW_SWATCH_CSS = '''  .swatch.c-pink     { background: var(--c-pink); }
  .swatch.c-amber    { background: var(--c-amber); }
  .swatch.c-lime     { background: var(--c-lime); }
  .swatch.c-cyan     { background: var(--c-cyan); }
  .swatch.c-indigo   { background: var(--c-indigo); }
  .swatch.c-violet   { background: var(--c-violet); }
  .swatch.c-magenta  { background: var(--c-magenta); }
  .swatch.c-fuchsia  { background: var(--c-fuchsia); }
  .swatch.c-rose     { background: var(--c-rose); }
  .swatch.c-lavender { background: var(--c-lavender); }'''

css = css.replace(OLD_SWATCH_CSS, NEW_SWATCH_CSS, 1)
print('Added new colour CSS variables and swatch classes')

# ══════════════════════════════════════════════════════════════════════════
# STEP 9 — ADD QoL CSS (dropdown + expand button + section collapse)
# ══════════════════════════════════════════════════════════════════════════

QOL_CSS = """

/* ── PCW Category Dropdown ─────────────────────────────────────── */

.pcw-cat-toolbar {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3) 0;
}

.pcw-cat-dropdown-wrap {
  position: relative;
  flex: 1;
}

.pcw-cat-dropdown-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: var(--fs-sm);
  color: var(--ink-1);
  cursor: pointer;
  text-align: left;
  transition: border-color var(--t-fast), background var(--t-fast);
}

.pcw-cat-dropdown-btn:hover {
  border-color: var(--accent);
  background: var(--surface-3);
}

.pcw-cat-chevron {
  margin-left: auto;
  font-size: 16px !important;
  color: var(--ink-3);
  transition: transform 0.2s;
}

.pcw-cat-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow-md);
  z-index: 200;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.25s ease, opacity 0.2s;
  opacity: 0;
}

.pcw-cat-dropdown.open {
  max-height: 320px;
  opacity: 1;
  overflow-y: auto;
}

.pcw-cat-dropdown .pcw-cat-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: var(--sp-3);
}

.pcw-expand-all-btn {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--ink-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color var(--t-fast), color var(--t-fast);
}

.pcw-expand-all-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* Collapsed palette sections */
.pcw-palette-section.pcw-collapsed > *:not(.pcw-palette-section-header) {
  display: none;
}

.pcw-palette-section.pcw-collapsed .pcw-palette-section-header {
  border-bottom: none;
}
"""

css = css + QOL_CSS
print('Added QoL CSS (dropdown + expand/collapse)')

# ══════════════════════════════════════════════════════════════════════════
# STEP 10 — WRITE ALL FILES
# ══════════════════════════════════════════════════════════════════════════

open('static/app.js',    'w', encoding='utf-8').write(js)
open('static/index.html','w', encoding='utf-8').write(html)
open('static/app.css',   'w', encoding='utf-8').write(css)
open('app.py',           'w', encoding='utf-8').write(py)

print()
print('=== Written ===')
print(f'app.js:     {len(js)} chars')
print(f'index.html: {len(html)} chars')
print(f'app.css:    {len(css)} chars')
print(f'app.py:     {len(py)} chars')
