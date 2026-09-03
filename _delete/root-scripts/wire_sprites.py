#!/usr/bin/env python3
"""Wire sprites into BOOTSTRAP and add sprite CSS + settings wiring."""

# ── 1. app.js: add initSpritesSystem call + settings save handler ──────────

js = open('static/app.js', 'r', encoding='utf-8').read()

OLD_BOOTSTRAP_END = """  await Promise.all([loadStoredLicence(), loadAll()]);

   });"""

NEW_BOOTSTRAP_END = """  await Promise.all([loadStoredLicence(), loadAll()]);
  initSpriteCompanions();  // walk animation + settings wiring

   });"""

js = js.replace(OLD_BOOTSTRAP_END, NEW_BOOTSTRAP_END)

# Add initSpriteCompanions function before the BOOTSTRAP comment
SPRITE_COMPANIONS_FN = """
/* ============================================================================
   SPRITE COMPANIONS — Walk animation, settings save/load
   ============================================================================ */

function initSpriteCompanions() {
  // Walk animation: each sprite traverses the viewport on a staggered cycle
  const walkers = [
    { el: document.getElementById('spriteWalkerLisa'),  delay: 0,     dur: 22000, flip: false },
    { el: document.getElementById('spriteWalkerRiley'), delay: 7000,  dur: 25000, flip: true  },
    { el: document.getElementById('spriteWalkerRyan'),  delay: 14000, dur: 20000, flip: false },
  ];

  walkers.forEach(({ el, delay, dur, flip }) => {
    if (!el) return;
    let start = null;
    let direction = flip ? -1 : 1;

    function walk(ts) {
      if (!start) start = ts - delay;
      const elapsed = (ts - start) % dur;
      const progress = elapsed / dur;
      const vw = window.innerWidth;
      let x;
      if (progress < 0.5) {
        // walk right
        x = progress * 2 * vw;
        el.style.transform = 'scaleX(1)';
      } else {
        // walk left
        x = (1 - (progress - 0.5) * 2) * vw;
        el.style.transform = 'scaleX(-1)';
      }
      el.style.left = Math.round(x) + 'px';
      requestAnimationFrame(walk);
    }
    requestAnimationFrame(walk);
  });

  // Settings: load saved values into config panel inputs
  api('/api/sprite-settings').then(data => {
    const nameEl = document.getElementById('spriteNameInput');
    const profileEl = document.getElementById('spriteProfileInput');
    const keyEl = document.getElementById('spriteApiKeyInput');
    if (nameEl && data.sprite_user_name) nameEl.value = data.sprite_user_name;
    if (profileEl && data.sprite_user_profile) profileEl.value = data.sprite_user_profile;
    if (keyEl && data.sprite_api_key_set) {
      keyEl.placeholder = 'API key saved — paste to replace';
      // Store key in localStorage for sprite access check
      localStorage.setItem('pl_sprite_api_key', '1');
    }
  }).catch(() => {});

  // Settings: save handler
  const saveBtn = document.getElementById('spriteSettingsSaveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const name = (document.getElementById('spriteNameInput')?.value || '').trim();
      const profile = (document.getElementById('spriteProfileInput')?.value || '').trim();
      const key = (document.getElementById('spriteApiKeyInput')?.value || '').trim();
      const statusEl = document.getElementById('spriteSettingsStatus');
      try {
        await api('/api/sprite-settings', {
          method: 'POST',
          body: { sprite_user_name: name, sprite_user_profile: profile, sprite_api_key: key || undefined }
        });
        if (name) localStorage.setItem('pl_sprite_user_name', name);
        if (profile) localStorage.setItem('pl_sprite_user_profile', profile);
        if (key) localStorage.setItem('pl_sprite_api_key', '1');
        if (statusEl) { statusEl.textContent = 'Saved!'; setTimeout(() => { statusEl.textContent = ''; }, 2000); }
        toast('Companion settings saved.', 'success');
      } catch {
        if (statusEl) statusEl.textContent = 'Save failed.';
        toast('Failed to save companion settings.', 'error');
      }
    });
  }

  // Update trial badges via sprite system
  if (typeof window.initSpritesSystem === 'function') window.initSpritesSystem();
}

"""

BOOTSTRAP_COMMENT = """/* ============================================================================
   BOOTSTRAP"""

js = js.replace(BOOTSTRAP_COMMENT, SPRITE_COMPANIONS_FN + BOOTSTRAP_COMMENT)

open('static/app.js', 'w', encoding='utf-8').write(js)
print("app.js wired")

# ── 2. app.css: add sprite styles ─────────────────────────────────────────

css = open('static/app.css', 'r', encoding='utf-8').read()

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

/* Plan gift section */
.plan-gift-section {
  margin: var(--sp-6) 0 var(--sp-4);
  padding: var(--sp-5);
  background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.03));
  border: 1px solid rgba(99,102,241,0.2);
  border-radius: 12px;
  text-align: center;
}
"""

css = css + SPRITE_CSS
open('static/app.css', 'w', encoding='utf-8').write(css)
print("app.css updated")
