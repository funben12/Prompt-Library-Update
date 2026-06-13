#!/usr/bin/env python3
"""Rebuild project from backup files, applying all session improvements."""
import sys, shutil, os
sys.stdout.reconfigure(encoding='utf-8')

BACKUP  = r'C:\Users\Eugene Phillips\Desktop\New folder\Backup'
PROJ    = r'C:\Users\Eugene Phillips\Desktop\Prompt Library Update\static'
APP_PY  = r'C:\Users\Eugene Phillips\Desktop\Prompt Library Update\app.py'

# ── STEP 1: read all source files ─────────────────────────────────────────

bk_js  = open(BACKUP + r'\app.js',      'r', encoding='utf-8').read()
bk_html= open(BACKUP + r'\index.html',  'r', encoding='utf-8').read()
bk_css = open(BACKUP + r'\app.css',     'r', encoding='utf-8').read()
cur_js = open(PROJ   + r'\app.js',      'r', encoding='utf-8').read()

# ── STEP 2: extract our expanded BLOCKS, FRAMEWORKS from current app.js ────

# Find expanded initComponentsWorkspace in current
iife_start = cur_js.find('(function initComponentsWorkspace')
iife_end   = cur_js.find('})();', iife_start + 100) + 5
cur_iife   = cur_js[iife_start:iife_end]

# Extract data blocks (convert const -> var to match backup style)
blks_s = cur_iife.find('const BLOCKS')
blks_e = cur_iife.find('];', blks_s) + 2
fws_s  = cur_iife.find('const FRAMEWORKS')
fws_e  = cur_iife.find('];', fws_s) + 2

our_blocks = cur_iife[blks_s:blks_e].replace('const BLOCKS', 'var BLOCKS', 1)
our_fw     = cur_iife[fws_s:fws_e].replace('const FRAMEWORKS', 'var FRAMEWORKS', 1)

# ── STEP 3: build enhanced CATEGORIES with icon+color (backup format) ──────

NEW_CATEGORIES = """var CATEGORIES = [
    { id: 'core',        label: 'Core Blocks',        icon: 'layers',          color: 'var(--accent)'   },
    { id: 'control',     label: 'Control Flow',        icon: 'call_split',      color: 'var(--c-orange)' },
    { id: 'guardrails',  label: 'Guardrails',          icon: 'security',        color: 'var(--c-red)'    },
    { id: 'persona',     label: 'Persona & Identity',  icon: 'person',          color: '#ec4899'         },
    { id: 'reasoning',   label: 'Reasoning',           icon: 'psychology',      color: 'var(--c-purple)' },
    { id: 'meta',        label: 'Meta Prompting',      icon: 'auto_fix_high',   color: 'var(--c-yellow)' },
    { id: 'prompt-eng',  label: 'Prompt Engineering',  icon: 'engineering',     color: '#06b6d4'         },
    { id: 'improvement', label: 'Prompt Improvement',  icon: 'trending_up',     color: '#10b981'         },
    { id: 'generation',  label: 'Prompt Generation',   icon: 'add_circle',      color: '#8b5cf6'         },
    { id: 'use-case',    label: 'Use Case Components', icon: 'cases',           color: '#f59e0b'         },
    { id: 'quality',     label: 'Prompt Quality',      icon: 'grade',           color: '#3b82f6'         },
    { id: 'output',      label: 'Output Formats',      icon: 'article',         color: 'var(--c-green)'  },
    { id: 'research',    label: 'Research & Analysis', icon: 'search',          color: 'var(--c-green)'  },
    { id: 'creative',    label: 'Creative Writing',    icon: 'brush',           color: '#f43f5e'         },
    { id: 'business',    label: 'Business & Strategy', icon: 'business',        color: 'var(--c-yellow)' },
    { id: 'coding',      label: 'Code & Dev',          icon: 'code',            color: '#10b981'         },
    { id: 'content',     label: 'Content & Copy',      icon: 'edit_note',       color: 'var(--c-pink)'   },
    { id: 'decision',    label: 'Decision Making',     icon: 'rule',            color: 'var(--c-orange)' },
    { id: 'iteration',   label: 'Iteration & Refinement', icon: 'refresh',     color: 'var(--c-purple)' },
];"""

# ── STEP 4: replace CATEGORIES, BLOCKS, FRAMEWORKS in backup's IIFE ────────

# Find IIFE in backup
bk_iife_start = bk_js.find('(function initComponentsWorkspace')
bk_iife_end   = bk_js.find('})();', bk_iife_start + 100) + 5
bk_iife       = bk_js[bk_iife_start:bk_iife_end]

# Find replacement boundaries in backup IIFE
cats_s = bk_iife.find('var CATEGORIES = [')
cats_e = bk_iife.find('];', cats_s) + 2
blk_s  = bk_iife.find('var BLOCKS = [')
blk_e  = bk_iife.find('];', blk_s) + 2
fw_s   = bk_iife.find('var FRAMEWORKS = [')
fw_e   = bk_iife.find('];', fw_s) + 2

# Build new IIFE by replacing each section
new_iife = (
    bk_iife[:cats_s] +
    NEW_CATEGORIES +
    bk_iife[cats_e:blk_s] +
    our_blocks +
    bk_iife[blk_e:fw_s] +
    our_fw +
    bk_iife[fw_e:]
)

# Splice back into backup app.js
new_js = bk_js[:bk_iife_start] + new_iife + bk_js[bk_iife_end:]

print(f'Backup app.js: {len(bk_js)} -> {len(new_js)} chars after component expansion')

# ── STEP 5: add initSpritesSystem IIFE from current app.js ─────────────────

# Extract sprite IIFE from current app.js
sp_start = cur_js.find('(function initSpritesSystem(')
sp_end   = cur_js.find('})();', sp_start) + 5
sprite_iife = cur_js[sp_start:sp_end]

# Insert after the component workspace IIFE in new_js
# Find end of component workspace IIFE
comp_end_in_new = new_js.find('})();', new_js.find('(function initComponentsWorkspace')) + 5
new_js = new_js[:comp_end_in_new] + '\n\n\n/* ====================================================\n   SPRITE COMPANION SYSTEM\n   ==================================================== */\n\n' + sprite_iife + new_js[comp_end_in_new:]

print(f'After adding sprite IIFE: {len(new_js)} chars')

# ── STEP 6: add initSpriteCompanions + wire BOOTSTRAP ──────────────────────

SPRITE_COMPANIONS_FN = """
/* ============================================================================
   SPRITE COMPANIONS — Walk animation, settings save/load
   ============================================================================ */

function initSpriteCompanions() {
  var walkers = [
    { el: document.getElementById('spriteWalkerLisa'),  delay: 0,     dur: 22000 },
    { el: document.getElementById('spriteWalkerRiley'), delay: 7000,  dur: 25000 },
    { el: document.getElementById('spriteWalkerRyan'),  delay: 14000, dur: 20000 },
  ];

  walkers.forEach(function(w) {
    if (!w.el) return;
    var start = null;
    function walk(ts) {
      if (!start) start = ts - w.delay;
      var elapsed = (ts - start) % w.dur;
      var progress = elapsed / w.dur;
      var vw = window.innerWidth;
      var x;
      if (progress < 0.5) {
        x = progress * 2 * vw;
        w.el.style.transform = 'scaleX(1)';
      } else {
        x = (1 - (progress - 0.5) * 2) * vw;
        w.el.style.transform = 'scaleX(-1)';
      }
      w.el.style.left = Math.round(x) + 'px';
      requestAnimationFrame(walk);
    }
    requestAnimationFrame(walk);
  });

  api('/api/sprite-settings').then(function(data) {
    var nameEl    = document.getElementById('spriteNameInput');
    var profileEl = document.getElementById('spriteProfileInput');
    var keyEl     = document.getElementById('spriteApiKeyInput');
    if (nameEl    && data.sprite_user_name)    nameEl.value = data.sprite_user_name;
    if (profileEl && data.sprite_user_profile) profileEl.value = data.sprite_user_profile;
    if (keyEl     && data.sprite_api_key_set)  {
      keyEl.placeholder = 'API key saved — paste to replace';
      localStorage.setItem('pl_sprite_api_key', '1');
    }
  }).catch(function() {});

  var saveBtn = document.getElementById('spriteSettingsSaveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      var name    = (document.getElementById('spriteNameInput')    ? document.getElementById('spriteNameInput').value    : '').trim();
      var profile = (document.getElementById('spriteProfileInput') ? document.getElementById('spriteProfileInput').value : '').trim();
      var key     = (document.getElementById('spriteApiKeyInput')  ? document.getElementById('spriteApiKeyInput').value  : '').trim();
      var statusEl = document.getElementById('spriteSettingsStatus');
      var body = { sprite_user_name: name, sprite_user_profile: profile };
      if (key) body.sprite_api_key = key;
      api('/api/sprite-settings', { method: 'POST', body: body }).then(function() {
        if (name) localStorage.setItem('pl_sprite_user_name', name);
        if (profile) localStorage.setItem('pl_sprite_user_profile', profile);
        if (key) localStorage.setItem('pl_sprite_api_key', '1');
        if (statusEl) { statusEl.textContent = 'Saved!'; setTimeout(function() { statusEl.textContent = ''; }, 2000); }
        toast('Companion settings saved.', 'success');
      }).catch(function() {
        if (statusEl) statusEl.textContent = 'Save failed.';
        toast('Failed to save companion settings.', 'error');
      });
    });
  }

  if (typeof window.initSpritesSystem === 'function') window.initSpritesSystem();
}

"""

BOOTSTRAP_COMMENT = """/* ============================================================================
   BOOTSTRAP"""
new_js = new_js.replace(BOOTSTRAP_COMMENT, SPRITE_COMPANIONS_FN + BOOTSTRAP_COMMENT)

# Wire initSpriteCompanions into BOOTSTRAP
OLD_BOOTSTRAP_CALL = "  await Promise.all([loadStoredLicence(), loadAll()]);\n\n   });"
NEW_BOOTSTRAP_CALL = "  await Promise.all([loadStoredLicence(), loadAll()]);\n  initSpriteCompanions();\n\n   });"
if OLD_BOOTSTRAP_CALL in new_js:
    new_js = new_js.replace(OLD_BOOTSTRAP_CALL, NEW_BOOTSTRAP_CALL)
    print('BOOTSTRAP wired')
else:
    # Try alternate ending
    OLD2 = "  await Promise.all([loadStoredLicence(), loadAll()]);\n\n});"
    NEW2 = "  await Promise.all([loadStoredLicence(), loadAll()]);\n  initSpriteCompanions();\n\n});"
    if OLD2 in new_js:
        new_js = new_js.replace(OLD2, NEW2)
        print('BOOTSTRAP wired (alt)')
    else:
        print('WARNING: could not find BOOTSTRAP call to wire — search manually')

print(f'Final app.js size: {len(new_js)} chars')

# ── STEP 7: add sprite HTML to backup index.html ────────────────────────────

html = bk_html

# A) Companions settings section in config panel
COMPANIONS_SETTINGS = """      <hr style="border:none;border-top:1px solid var(--border);margin:var(--sp-4) 0;" />
      <div class="config-section-label">Companions</div>
      <label style="font-size:11px;color:var(--ink-4);display:block;margin-bottom:4px;">Your name (sprites will use this)</label>
      <input type="text" id="spriteNameInput" class="form-input" placeholder="Your name..." autocomplete="off" style="margin-bottom:var(--sp-3);" />
      <label style="font-size:11px;color:var(--ink-4);display:block;margin-bottom:4px;">About you (helps sprites understand your context)</label>
      <textarea id="spriteProfileInput" class="form-input" placeholder="e.g. I'm a product manager focused on B2B SaaS..." rows="3" style="resize:vertical;margin-bottom:var(--sp-3);"></textarea>
      <label style="font-size:11px;color:var(--ink-4);display:block;margin-bottom:4px;">Claude API Key (for sprite chat)</label>
      <input type="password" id="spriteApiKeyInput" class="form-input" placeholder="sk-ant-..." autocomplete="off" style="margin-bottom:4px;" />
      <p style="font-size:10px;color:var(--ink-4);margin:0 0 var(--sp-3);">Stored locally. Used only for sprite chat. Never shared.</p>
      <button type="button" class="btn btn-ghost" id="spriteSettingsSaveBtn" style="width:100%;margin-bottom:var(--sp-2);">
        <span class="material-symbols-outlined">save</span> Save companion settings
      </button>
      <div id="spriteSettingsStatus" style="font-size:11px;color:var(--ink-3);text-align:center;min-height:16px;"></div>"""

CONFIG_STATUS_DIV = '<div id="configStatus" style="font-size:11px;color:var(--ink-3);text-align:center;min-height:16px;"></div>'
if CONFIG_STATUS_DIV in html:
    # Find the closing </div></div> after configStatus (closes panel body and panel)
    idx = html.find(CONFIG_STATUS_DIV)
    close_idx = html.find('</div>\n  </div>', idx)
    if close_idx == -1:
        close_idx = html.find('</div>\n</div>', idx)
    if close_idx != -1:
        # Insert companions section before the close
        html = html[:close_idx] + '\n' + COMPANIONS_SETTINGS + '\n    ' + html[close_idx:]
        print('Config panel companions section added')
    else:
        print('WARNING: could not find config panel close to inject companions')
else:
    print('WARNING: configStatus div not found')

# B) "My Gift to You" section in premiumModal — before closePremiumModal button
GIFT_SECTION = """      <div class="plan-gift-section" style="margin:var(--sp-6) 0 var(--sp-4);padding:var(--sp-5);background:linear-gradient(135deg,rgba(99,102,241,0.08),rgba(99,102,241,0.03));border:1px solid rgba(99,102,241,0.2);border-radius:12px;text-align:center;">
        <div style="font-size:2rem;margin-bottom:var(--sp-2);">\U0001f381</div>
        <h3 style="font-family:var(--ff-display);font-size:var(--fs-lg);font-weight:400;margin-bottom:var(--sp-2);">My Gift to You</h3>
        <p style="font-size:var(--fs-sm);font-weight:600;margin-bottom:var(--sp-1);">Lisa, Riley &amp; Ryan — Your AI Companions</p>
        <p style="font-size:var(--fs-xs);color:var(--ink-3);margin-bottom:var(--sp-3);line-height:1.6;">Three sprite companions walk your library ready to help. Try them free for 14 days — no API key needed. After your trial, unlock unlimited chat with your own Claude API key.</p>
        <div style="display:flex;justify-content:center;gap:var(--sp-4);flex-wrap:wrap;font-size:var(--fs-xs);">
          <span>\U0001f9e0 <strong>Lisa</strong> — Prompt precision</span>
          <span>\U0001f3a8 <strong>Riley</strong> — Creative strategy</span>
          <span>\U0001f4ca <strong>Ryan</strong> — Business &amp; ROI</span>
        </div>
      </div>
      """

CLOSE_PREMIUM_BTN = 'onclick="closePremiumModal()">Close</button>'
if CLOSE_PREMIUM_BTN in html:
    html = html.replace(CLOSE_PREMIUM_BTN, GIFT_SECTION + CLOSE_PREMIUM_BTN, 1)
    print('Gift section added to premiumModal')
else:
    print('WARNING: closePremiumModal button not found')

# C) Sprite walkers + chat modal — insert before toastContainer
SPRITE_HTML = """<!-- Sprite Companions -->
<div id="spritesContainer" style="position:fixed;bottom:20px;left:0;width:100%;pointer-events:none;z-index:900;">
  <div class="sprite-walker" id="spriteWalkerLisa"  style="pointer-events:all;cursor:pointer;position:absolute;bottom:0;" onclick="window.PL_spriteClick('lisa')">
    <div class="sprite-body">
      <span class="sprite-emoji">\U0001f9e0</span>
      <div class="sprite-label">Lisa<span id="lisaTrialBadge" class="sprite-trial-badge"></span></div>
    </div>
  </div>
  <div class="sprite-walker" id="spriteWalkerRiley" style="pointer-events:all;cursor:pointer;position:absolute;bottom:0;" onclick="window.PL_spriteClick('riley')">
    <div class="sprite-body">
      <span class="sprite-emoji">\U0001f3a8</span>
      <div class="sprite-label">Riley<span id="rileyTrialBadge" class="sprite-trial-badge"></span></div>
    </div>
  </div>
  <div class="sprite-walker" id="spriteWalkerRyan"  style="pointer-events:all;cursor:pointer;position:absolute;bottom:0;" onclick="window.PL_spriteClick('ryan')">
    <div class="sprite-body">
      <span class="sprite-emoji">\U0001f4ca</span>
      <div class="sprite-label">Ryan<span id="ryanTrialBadge" class="sprite-trial-badge"></span></div>
    </div>
  </div>
</div>

<!-- Sprite Chat Modal -->
<div id="spriteChatModal" role="dialog" aria-modal="true" aria-label="Sprite chat">
  <div class="sprite-chat-panel">
    <div class="sprite-chat-header">
      <div class="sprite-chat-avatar"><span id="spriteChatEmoji" style="font-size:2rem;">\U0001f9e0</span></div>
      <div class="sprite-chat-info">
        <div class="sprite-chat-name" id="spriteChatName">Lisa</div>
        <div class="sprite-chat-role" id="spriteChatRole">Prompt Engineer</div>
      </div>
      <button class="icon-btn" onclick="window.PL_closeSpriteChat()" aria-label="Close chat" style="margin-left:auto;">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
    <div class="sprite-chat-history" id="spriteChatHistory"></div>
    <div class="sprite-chat-footer">
      <input type="text" id="spriteChatInput" class="sprite-chat-input" placeholder="Ask me anything..." autocomplete="off"
             onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.PL_sendSpriteMessage();}" />
      <button class="btn btn-accent btn-sm" id="spriteChatSendBtn" onclick="window.PL_sendSpriteMessage()">
        <span class="material-symbols-outlined">send</span>
      </button>
    </div>
  </div>
</div>

"""

TOAST_DIV = '<div id="toastContainer"'
if TOAST_DIV in html:
    html = html.replace(TOAST_DIV, SPRITE_HTML + TOAST_DIV, 1)
    print('Sprite HTML added before toastContainer')
else:
    print('WARNING: toastContainer not found')

# ── STEP 8: add sprite CSS to backup app.css ─────────────────────────────

SPRITE_CSS = """

/* ── Sprite Companions ─────────────────────────────────────────── */

#spritesContainer {
  position: fixed;
  bottom: 16px;
  left: 0;
  width: 100%;
  height: 70px;
  pointer-events: none;
  z-index: 900;
}

.sprite-walker {
  position: absolute;
  bottom: 0;
  pointer-events: all;
  cursor: pointer;
  user-select: none;
}

.sprite-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  animation: spriteBounce 0.5s ease-in-out infinite alternate;
}

.sprite-emoji {
  font-size: 2rem;
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

.sprite-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--ink-2);
  background: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: 99px;
  padding: 1px 6px;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.sprite-trial-badge {
  font-size: 9px;
  color: var(--accent);
  font-weight: 700;
}

@keyframes spriteBounce {
  from { transform: translateY(0); }
  to   { transform: translateY(-4px); }
}

/* Sprite chat modal */

#spriteChatModal {
  position: fixed;
  bottom: 0;
  right: var(--sp-4);
  width: 360px;
  max-width: calc(100vw - var(--sp-8));
  background: var(--surface-1);
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 24px rgba(0,0,0,0.15);
  z-index: 1050;
  transform: translateY(110%);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

#spriteChatModal.open {
  transform: translateY(0);
}

.sprite-chat-panel {
  display: flex;
  flex-direction: column;
  height: 480px;
  max-height: 70vh;
}

.sprite-chat-header {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
  flex-shrink: 0;
}

.sprite-chat-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--surface-3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.sprite-chat-name {
  font-weight: 600;
  font-size: var(--fs-sm);
  color: var(--ink-1);
}

.sprite-chat-role {
  font-size: 11px;
  color: var(--ink-3);
}

.sprite-chat-history {
  flex: 1;
  overflow-y: auto;
  padding: var(--sp-3) var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.sprite-chat-msg {
  display: flex;
}

.sprite-chat-msg.user {
  justify-content: flex-end;
}

.sprite-chat-msg.assistant {
  justify-content: flex-start;
}

.sprite-chat-bubble {
  max-width: 80%;
  padding: var(--sp-2) var(--sp-3);
  border-radius: 12px;
  font-size: var(--fs-sm);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.sprite-chat-msg.user .sprite-chat-bubble {
  background: var(--accent);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.sprite-chat-msg.assistant .sprite-chat-bubble {
  background: var(--surface-3);
  color: var(--ink-1);
  border-bottom-left-radius: 4px;
}

.sprite-chat-footer {
  display: flex;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border-top: 1px solid var(--border);
  background: var(--surface-2);
  flex-shrink: 0;
}

.sprite-chat-input {
  flex: 1;
  background: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: var(--sp-2) var(--sp-3);
  font-size: var(--fs-sm);
  color: var(--ink-1);
  outline: none;
}

.sprite-chat-input:focus {
  border-color: var(--accent);
}
"""

new_css = bk_css + SPRITE_CSS

# ── STEP 9: write all files ─────────────────────────────────────────────────

open(PROJ + r'\app.js',     'w', encoding='utf-8').write(new_js)
open(PROJ + r'\index.html', 'w', encoding='utf-8').write(html)
open(PROJ + r'\app.css',    'w', encoding='utf-8').write(new_css)

print()
print('=== Files written ===')
print(f'app.js:     {len(new_js)} chars')
print(f'index.html: {len(html)} chars')
print(f'app.css:    {len(new_css)} chars')
