#!/usr/bin/env python3
"""Add sprite HTML to index.html and sprite-chat endpoint to app.py."""
import re

# ── 1. index.html changes ──────────────────────────────────────────────────

html = open('static/index.html', 'r', encoding='utf-8').read()

# A) Add Companions section to config panel
# Insert after configStatus div closing tag and before the </div></div> that closes panel body
companions_settings = """      <hr style="border:none;border-top:1px solid var(--border);margin:var(--sp-4) 0;" />
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

html = html.replace(
    '<div id="configStatus" style="font-size:11px;color:var(--ink-3);text-align:center;min-height:16px;"></div>\n    </div>\n  </div>',
    '<div id="configStatus" style="font-size:11px;color:var(--ink-3);text-align:center;min-height:16px;"></div>\n' + companions_settings + '\n    </div>\n  </div>'
)

# B) Add "My Gift to You" section to premiumModal — insert before closePremiumModal button
gift_section = """      <div class="plan-gift-section" style="margin:var(--sp-6) 0 var(--sp-4);padding:var(--sp-5);background:linear-gradient(135deg,rgba(var(--accent-rgb,99,102,241),0.08),rgba(var(--accent-rgb,99,102,241),0.03));border:1px solid rgba(var(--accent-rgb,99,102,241),0.2);border-radius:12px;text-align:center;">
        <div style="font-size:2rem;margin-bottom:var(--sp-2);">🎁</div>
        <h3 style="font-family:var(--ff-display);font-size:var(--fs-lg);font-weight:400;margin-bottom:var(--sp-2);">My Gift to You</h3>
        <p style="font-size:var(--fs-sm);font-weight:600;margin-bottom:var(--sp-1);">Lisa, Riley &amp; Ryan — Your AI Companions</p>
        <p style="font-size:var(--fs-xs);color:var(--ink-3);margin-bottom:var(--sp-3);line-height:1.6;">Three sprite companions walk your library ready to help. Try them free for 14 days — no API key needed. After your trial, unlock unlimited chat with your own Claude API key.</p>
        <div style="display:flex;justify-content:center;gap:var(--sp-4);flex-wrap:wrap;font-size:var(--fs-xs);">
          <span>🧠 <strong>Lisa</strong> — Prompt precision</span>
          <span>🎨 <strong>Riley</strong> — Creative strategy</span>
          <span>📊 <strong>Ryan</strong> — Business &amp; ROI</span>
        </div>
      </div>
      """

html = html.replace(
    '<button class="btn btn-ghost" style="width:100%;margin-top:var(--sp-4);" onclick="closePremiumModal()">Close</button>',
    gift_section + '<button class="btn btn-ghost" style="width:100%;margin-top:var(--sp-4);" onclick="closePremiumModal()">Close</button>'
)

# C) Add spritesContainer and spriteChatModal before toastContainer
sprite_html = """<!-- Sprite Companions -->
<div id="spritesContainer" style="position:fixed;bottom:20px;left:0;width:100%;pointer-events:none;z-index:900;display:flex;align-items:flex-end;gap:0;">
  <div class="sprite-walker" id="spriteWalkerLisa" data-sprite="lisa" style="pointer-events:all;cursor:pointer;position:absolute;bottom:0;user-select:none;" onclick="window.PL_spriteClick('lisa')">
    <div class="sprite-body">
      <span class="sprite-emoji">🧠</span>
      <div class="sprite-label">Lisa<span id="lisaTrialBadge" class="sprite-trial-badge"></span></div>
    </div>
  </div>
  <div class="sprite-walker" id="spriteWalkerRiley" data-sprite="riley" style="pointer-events:all;cursor:pointer;position:absolute;bottom:0;user-select:none;" onclick="window.PL_spriteClick('riley')">
    <div class="sprite-body">
      <span class="sprite-emoji">🎨</span>
      <div class="sprite-label">Riley<span id="rileyTrialBadge" class="sprite-trial-badge"></span></div>
    </div>
  </div>
  <div class="sprite-walker" id="spriteWalkerRyan" data-sprite="ryan" style="pointer-events:all;cursor:pointer;position:absolute;bottom:0;user-select:none;" onclick="window.PL_spriteClick('ryan')">
    <div class="sprite-body">
      <span class="sprite-emoji">📊</span>
      <div class="sprite-label">Ryan<span id="ryanTrialBadge" class="sprite-trial-badge"></span></div>
    </div>
  </div>
</div>

<!-- Sprite Chat Modal -->
<div id="spriteChatModal" role="dialog" aria-modal="true" aria-label="Sprite chat">
  <div class="sprite-chat-panel">
    <div class="sprite-chat-header">
      <div class="sprite-chat-avatar">
        <span id="spriteChatEmoji" style="font-size:2rem;">🧠</span>
      </div>
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

html = html.replace(
    '<div id="toastContainer" aria-live="polite" aria-atomic="true"></div>',
    sprite_html + '<div id="toastContainer" aria-live="polite" aria-atomic="true"></div>'
)

open('static/index.html', 'w', encoding='utf-8').write(html)
print("index.html updated")

# ── 2. app.py: add /api/sprite-chat endpoint ──────────────────────────────

py = open('app.py', 'r', encoding='utf-8').read()

sprite_endpoint = '''

# ── Sprite Companion Chat ─────────────────────────────────────────────────

@app.route('/api/sprite-chat', methods=['POST'])
def sprite_chat():
    """Proxy sprite chat to Claude API using user\'s stored API key."""
    import urllib.request
    import json as _json

    data = request.get_json(force=True)
    sprite = data.get('sprite', 'lisa')
    user_message = (data.get('user_message') or '').strip()
    chat_history = data.get('chat_history') or []
    user_name = (data.get('user_name') or 'friend').strip()
    user_profile = (data.get('user_profile') or '').strip()

    if not user_message:
        return jsonify({'error': 'Empty message'}), 400

    # Get API key from settings
    db = get_db()
    key_row = db.execute("SELECT value FROM settings WHERE key='sprite_api_key'").fetchone()
    api_key = key_row['value'] if key_row else None

    # Allow trial: if no key, still try but return friendly error
    if not api_key:
        return jsonify({'assistant_message': "I don\'t have an API key yet! Go to Settings > Companions and add your Claude API key to chat with me."}), 200

    SPRITE_PROMPTS = {
        'lisa': 'You are Lisa, a meticulous prompt engineer. Your expertise is in helping users structure prompts with precision, clarity, and technical accuracy. Be encouraging and precise. Keep responses concise — 2-4 sentences max.',
        'riley': 'You are Riley, a creative strategist. Your strength is challenging assumptions and suggesting novel angles. Be playful and thought-provoking. Keep responses concise — 2-4 sentences max.',
        'ryan': 'You are Ryan, a business-minded strategist focused on outcomes and ROI. Be direct and results-oriented. Keep responses concise — 2-4 sentences max.',
    }

    system = SPRITE_PROMPTS.get(sprite, SPRITE_PROMPTS['lisa'])
    if user_name and user_name != 'friend':
        system += f" The user\'s name is {user_name}."
    if user_profile:
        system += f" Context about them: {user_profile}"

    # Build messages list (last 6 turns from history)
    messages = []
    for turn in chat_history[-6:]:
        if turn.get('role') in ('user', 'assistant') and turn.get('content'):
            messages.append({'role': turn['role'], 'content': turn['content']})
    messages.append({'role': 'user', 'content': user_message})

    payload = _json.dumps({
        'model': 'claude-haiku-4-5-20251001',
        'max_tokens': 512,
        'system': system,
        'messages': messages
    }).encode('utf-8')

    req = urllib.request.Request(
        'https://api.anthropic.com/v1/messages',
        data=payload,
        headers={
            'x-api-key': api_key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = _json.loads(resp.read().decode('utf-8'))
        assistant_message = result.get('content', [{}])[0].get('text', 'No response')
        return jsonify({'assistant_message': assistant_message})
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        return jsonify({'error': f'API error {e.code}', 'detail': body}), 502
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/sprite-settings', methods=['POST'])
def save_sprite_settings():
    """Save companion settings (name, profile, API key) to settings table."""
    data = request.get_json(force=True)
    db = get_db()
    for key in ('sprite_user_name', 'sprite_user_profile', 'sprite_api_key'):
        value = data.get(key)
        if value is not None:
            db.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                (key, value)
            )
    db.commit()
    return jsonify({'ok': True})


@app.route('/api/sprite-settings', methods=['GET'])
def get_sprite_settings():
    """Return saved companion settings (API key redacted)."""
    db = get_db()
    rows = db.execute(
        "SELECT key, value FROM settings WHERE key IN (\'sprite_user_name\', \'sprite_user_profile\', \'sprite_api_key\')"
    ).fetchall()
    result = {r['key']: r['value'] for r in rows}
    if 'sprite_api_key' in result and result['sprite_api_key']:
        result['sprite_api_key'] = '••••••••'
        result['sprite_api_key_set'] = True
    return jsonify(result)
'''

py = py + sprite_endpoint
open('app.py', 'w', encoding='utf-8').write(py)
print("app.py updated")

print("Done. Run update_hash.py if app.js was changed (it wasn't here).")
