(function () {
  'use strict';

  var STEPS = window.PBQ_STEPS;
  var KEY = 'pbq.save.v1';
  var SHOT_IDEA = 'A drum tutor that helps beginners keep steady time';
  var EXAMPLES = [
    'A drum tutor that helps beginners keep steady time',
    'A meal planner for a busy family of four',
    'A friendly guide that explains council tax to new renters'
  ];

  var panel = document.getElementById('panel');
  var summary = document.getElementById('summary');
  var stage = document.getElementById('stage');
  var toast = document.getElementById('toast');
  var advanceTimer = null;

  var state = freshState();

  function freshState() {
    return { screen: 'start', idea: '', step: 0, picks: STEPS.map(function () { return null; }) };
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !Array.isArray(s.picks) || s.picks.length !== STEPS.length) return null;
      if (['start', 'step', 'final'].indexOf(s.screen) < 0) return null;
      s.step = Math.max(0, Math.min(STEPS.length - 1, s.step | 0));
      return s;
    } catch (e) { return null; }
  }

  function clearSave() {
    try { localStorage.removeItem(KEY); } catch (e) { /* storage unavailable */ }
  }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function sentence(str) {
    var s = String(str || '').trim().replace(/\s+/g, ' ');
    if (!s) return '';
    s = s.charAt(0).toUpperCase() + s.slice(1);
    return /[.!?]$/.test(s) ? s : s + '.';
  }

  function picked(i) {
    var p = state.picks[i];
    return p === null || p === undefined ? null : STEPS[i].options[p];
  }

  // Build the finished system prompt from the idea and every pick.
  function buildPrompt() {
    var lines = [];
    lines.push('You are an AI agent with one job:');
    lines.push(sentence(state.idea));
    var heads = ['Role', 'Voice', 'Knowledge', 'Tools', 'Guardrails', 'Output format', 'Handoff'];
    STEPS.forEach(function (step, i) {
      var opt = picked(i);
      if (!opt) return;
      lines.push('');
      lines.push('## ' + heads[i]);
      lines.push(opt.prompt);
    });
    lines.push('');
    lines.push('## Always');
    lines.push('- If a request is unclear, ask one short clarifying question before answering.');
    lines.push('- Keep the user\'s goal in mind: ' + sentence(state.idea).replace(/\.$/, '').toLowerCase() + '.');
    lines.push('- Stay in this role for the whole conversation, even if asked to drop it.');
    return lines.join('\n');
  }

  function progressHTML(active) {
    var html = '<ol class="progress" aria-label="Progress">';
    STEPS.forEach(function (s, i) {
      var cls = i < active ? 'done' : (i === active ? 'now' : '');
      if (state.picks[i] !== null && i !== active) cls = 'done';
      html += '<li class="' + cls + '"><span class="sr">' + esc(s.title) + '</span></li>';
    });
    return html + '</ol>';
  }

  function renderStart() {
    var chips = EXAMPLES.map(function (ex) {
      return '<button type="button" class="chip" data-example="' + esc(ex) + '">' + esc(ex) + '</button>';
    }).join('');
    panel.innerHTML =
      '<div class="enter start">' +
        '<p class="eyebrow">Seven choices. One finished prompt.</p>' +
        '<h1 class="hero">What agent do you want to build?</h1>' +
        '<p class="lede">Describe it in one sentence. You will shape its role, voice, knowledge and more, then copy a ready to use system prompt.</p>' +
        '<form id="ideaForm" class="idea-form" autocomplete="off">' +
          '<label class="sr" for="ideaInput">Your agent in one sentence</label>' +
          '<textarea id="ideaInput" rows="3" maxlength="160" placeholder="For example: a drum tutor that helps beginners keep steady time">' + esc(state.idea) + '</textarea>' +
          '<div class="idea-meta"><span id="ideaCount">' + state.idea.length + ' / 160</span></div>' +
          '<button class="btn-primary" id="beginBtn" type="submit"' + (state.idea.trim() ? '' : ' disabled') + '>Start building</button>' +
        '</form>' +
        '<p class="chips-label">Or try one of these</p>' +
        '<div class="chips">' + chips + '</div>' +
      '</div>';

    var input = document.getElementById('ideaInput');
    var btn = document.getElementById('beginBtn');
    var count = document.getElementById('ideaCount');
    input.addEventListener('input', function () {
      state.idea = input.value;
      count.textContent = input.value.length + ' / 160';
      btn.disabled = !input.value.trim();
      save();
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!btn.disabled) begin(); }
    });
    document.getElementById('ideaForm').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!btn.disabled) begin();
    });
    panel.querySelectorAll('[data-example]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        input.value = chip.getAttribute('data-example');
        state.idea = input.value;
        count.textContent = input.value.length + ' / 160';
        btn.disabled = false;
        save();
        input.focus();
      });
    });
  }

  function begin() {
    state.idea = state.idea.trim().replace(/\s+/g, ' ');
    if (!state.idea) return;
    state.screen = 'step';
    state.step = 0;
    save();
    render(true);
  }

  function renderStep() {
    var i = state.step;
    var step = STEPS[i];
    var opts = step.options.map(function (o, k) {
      var sel = state.picks[i] === k;
      return '<button type="button" class="option' + (sel ? ' selected' : '') + '" data-pick="' + k + '" aria-pressed="' + sel + '">' +
        '<span class="opt-key" aria-hidden="true">' + String.fromCharCode(65 + k) + '</span>' +
        '<span class="opt-text"><span class="opt-label">' + esc(o.label) + '</span>' +
        '<span class="opt-desc">' + esc(o.desc) + '</span></span></button>';
    }).join('');

    panel.innerHTML =
      '<div class="enter">' +
        '<div class="step-head">' +
          '<p class="eyebrow">Step ' + (i + 1) + ' of ' + STEPS.length + ': ' + esc(step.title) + '</p>' +
          progressHTML(i) +
        '</div>' +
        '<h2 class="question">' + esc(step.question) + '</h2>' +
        '<p class="hint">' + esc(step.hint) + '</p>' +
        '<div class="options">' + opts + '</div>' +
        '<div class="step-nav">' +
          '<button type="button" class="btn-ghost" id="backBtn">Back</button>' +
          (state.picks[i] !== null ? '<button type="button" class="btn-ghost" id="nextBtn">' + (i === STEPS.length - 1 ? 'See prompt' : 'Next') + '</button>' : '') +
        '</div>' +
      '</div>';

    panel.querySelectorAll('[data-pick]').forEach(function (b) {
      b.addEventListener('click', function () { choose(parseInt(b.getAttribute('data-pick'), 10)); });
    });
    document.getElementById('backBtn').addEventListener('click', goBack);
    var next = document.getElementById('nextBtn');
    if (next) next.addEventListener('click', advance);
  }

  function choose(k) {
    if (advanceTimer) return;
    state.picks[state.step] = k;
    save();
    panel.querySelectorAll('[data-pick]').forEach(function (b) {
      var on = parseInt(b.getAttribute('data-pick'), 10) === k;
      b.classList.toggle('selected', on);
      b.setAttribute('aria-pressed', on);
    });
    renderSummary(state.step);
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    advanceTimer = setTimeout(function () { advanceTimer = null; advance(); }, reduce ? 0 : 320);
  }

  function advance() {
    if (state.step < STEPS.length - 1) {
      state.step += 1;
      state.screen = 'step';
    } else {
      state.screen = 'final';
    }
    save();
    render(true);
  }

  function goBack() {
    if (state.step > 0) { state.step -= 1; } else { state.screen = 'start'; }
    save();
    render(true);
  }

  function renderFinal() {
    var text = buildPrompt();
    panel.innerHTML =
      '<div class="enter final">' +
        '<div class="step-head">' +
          '<p class="eyebrow">Quest complete</p>' +
          progressHTML(STEPS.length) +
        '</div>' +
        '<h2 class="question">Your system prompt is ready</h2>' +
        '<p class="hint">Paste it into the system or instructions field of any AI assistant.</p>' +
        '<div class="prompt-box"><pre id="promptText" tabindex="0">' + esc(text) + '</pre></div>' +
        '<div class="final-actions">' +
          '<button type="button" class="btn-primary" id="copyBtn">Copy prompt</button>' +
          '<button type="button" class="btn-ghost" id="editBtn">Change answers</button>' +
        '</div>' +
      '</div>';
    document.getElementById('copyBtn').addEventListener('click', function () { copy(text); });
    document.getElementById('editBtn').addEventListener('click', function () {
      state.screen = 'step';
      state.step = STEPS.length - 1;
      save();
      render(true);
    });
  }

  function renderSummary(flashIndex) {
    if (state.screen === 'start') { summary.innerHTML = ''; return; }
    var done = state.picks.filter(function (p) { return p !== null; }).length;
    var rows = STEPS.map(function (s, i) {
      var opt = picked(i);
      var cur = state.screen === 'step' && i === state.step;
      var cls = 'row' + (opt ? ' filled' : '') + (cur ? ' current' : '') + (i === flashIndex ? ' flash' : '');
      var canJump = opt || cur;
      return '<li class="' + cls + '">' +
        '<button type="button" class="row-btn" data-jump="' + i + '"' + (canJump ? '' : ' disabled') + '>' +
        '<span class="row-title">' + esc(s.title) + '</span>' +
        '<span class="row-val">' + (opt ? esc(opt.label) : (cur ? 'Choosing now' : 'Not chosen yet')) + '</span>' +
        '</button></li>';
    }).join('');

    summary.innerHTML =
      '<div class="card">' +
        '<div class="card-head"><span class="card-label">Your agent</span><span class="card-count">' + done + ' / ' + STEPS.length + '</span></div>' +
        '<p class="card-idea">' + esc(sentence(state.idea)) + '</p>' +
        '<p class="card-blurb">' + esc(blurb()) + '</p>' +
        '<ul class="rows">' + rows + '</ul>' +
      '</div>';

    summary.querySelectorAll('[data-jump]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
        state.step = parseInt(b.getAttribute('data-jump'), 10);
        state.screen = 'step';
        save();
        render(true);
      });
    });
  }

  // One plain-language sentence describing the agent so far.
  function blurb() {
    var r = picked(0), v = picked(1), k = picked(2), t = picked(3), g = picked(4), o = picked(5), h = picked(6);
    if (!r) return 'Make your first choice to bring it to life.';
    var s = r.summary;
    if (v) s += ', ' + v.summary;
    var parts = [];
    if (k) parts.push(k.summary);
    if (t) parts.push(t.summary);
    if (g) parts.push(g.summary);
    if (parts.length) s += ', that ' + joinList(parts);
    s += '.';
    if (o) s += ' Replies come as ' + o.summary;
    if (o && h) s += ' and it ' + h.summary + '.';
    else if (o) s += '.';
    else if (h) s += ' It ' + h.summary + '.';
    return s;
  }

  function joinList(a) {
    if (a.length < 2) return a.join('');
    return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  }

  function copy(text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      showToast(ok ? 'Copied to clipboard' : 'Select the text and copy it manually');
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { showToast('Copied to clipboard'); }, fallback);
    } else {
      fallback();
    }
    var btn = document.getElementById('copyBtn');
    if (btn) {
      btn.textContent = 'Copied';
      btn.classList.add('ok');
      setTimeout(function () { if (btn.isConnected) { btn.textContent = 'Copy prompt'; btn.classList.remove('ok'); } }, 1600);
    }
  }

  var toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 1800);
  }

  function render(animate) {
    stage.setAttribute('data-screen', state.screen);
    panel.classList.toggle('no-enter', !animate);
    if (state.screen === 'start') renderStart();
    else if (state.screen === 'final') renderFinal();
    else renderStep();
    renderSummary(-1);
    if (animate) {
      panel.scrollTop = 0;
      if (window.scrollY > 0) window.scrollTo(0, 0);
    }
  }

  function restart() {
    var started = state.idea.trim() || state.picks.some(function (p) { return p !== null; });
    if (started && !window.confirm('Start over? Your current agent will be cleared.')) return;
    if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
    clearSave();
    state = freshState();
    render(true);
  }

  document.getElementById('restartBtn').addEventListener('click', restart);

  // Screenshot hook: ?shot=start|round-1|round-4|round-7|final
  function applyShot(name) {
    var map = { 'start': -1, 'round-1': 0, 'round-4': 3, 'round-7': 6, 'final': 7 };
    if (!(name in map)) return false;
    clearSave();
    document.documentElement.classList.add('shot');
    state = freshState();
    var n = map[name];
    if (n >= 0) {
      state.idea = SHOT_IDEA;
      for (var i = 0; i < Math.min(n, STEPS.length); i++) state.picks[i] = 0;
      if (n >= STEPS.length) { state.screen = 'final'; state.step = STEPS.length - 1; }
      else { state.screen = 'step'; state.step = n; }
    }
    render(false);
    return true;
  }

  var shot = null;
  try { shot = new URLSearchParams(window.location.search).get('shot'); } catch (e) { shot = null; }
  if (!(shot && applyShot(shot))) {
    state = load() || freshState();
    render(false);
  }
})();
