/* Randomiser motion for the desktop app.
   This file is the desktop's PL_MOTION layer. The shared vartypes-3d.js (copied byte for byte from the phone app,
   AI-App-Factory apps/app-003-prompt-library-mobile/source/app/src/main/assets/vartypes-3d.js) plugs into it and draws
   the real 3D dice, the card deck that cuts, riffles and deals, and the slot machine drums for Random pick and
   Random number. This file keeps a text reel for those two as the fallback, and adds "Randomiser motion" to Settings.

   RANDOMISER MOTION CONTRACT (keep in step with the phone's vartypes-motion.js):
   1. The result is chosen first, with rand(), from the system's secure random source. The animation only reveals it.
   2. How much motion plays is the app's own setting, mode(): 'full' (default), 'short' or 'off'. It is NOT gated on
      prefers-reduced-motion. That gate is what kept turning the dice and deck into a still flip whenever Windows
      "Animation effects" was off. Do not put it back.
   3. Motion is Web Animations API (element.animate), so the global reduced motion rule in app.css cannot flatten it.
   4. A click on the moving dice, deck, drums or reel skips straight to the result, and a watchdog always lands the result.

   Load order in index.html: app.js, then this file, then vartypes-3d.js, all with defer.
   If this file or vartypes-3d.js fails to load, app.js draws its own dice, deck and random pick and number as before. */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const num = (v, d) => { const n = Number(v); return v == null || v === '' || isNaN(n) ? d : n; };
  // Only for small decorative touches. The randomisers follow mode() instead.
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const STYLES = ['none', 'pop', 'spring', 'follow', 'fan', 'draw', 'roll', 'tumble', 'morph'];
  const DEFAULT_MOTION = { diceroll: { style: 'tumble', intensity: 0.7 }, carddeck: { style: 'fan', intensity: 0.6 } };
  const CSS = [];
  const CONTROLS = {};
  const warned = {};

  // A failing animation must never block entering a value: log once and carry on
  function safe(name, fn) {
    return function () {
      try { return fn.apply(this, arguments); } catch (e) { if (!warned[name]) { warned[name] = 1; console.warn('Randomiser motion:', name, e); } }
    };
  }
  // Style, speed (0.5 to 2) and intensity (0 to 1) for a type, from the shared data file when it is loaded
  function cfg(type) {
    const D = window.PL_VARTYPES || {}, g = D.motion || {}, d = DEFAULT_MOTION[type] || {};
    const m = Object.assign({}, d, ((D.types || {})[type] || {}).motion || {});
    return {
      style: STYLES.includes(m.style) ? m.style : 'none',
      speed: clamp(num(m.speed, num(g.speed, 1)), 0.5, 2),
      intensity: clamp(num(m.intensity, num(g.intensity, 0.6)), 0, 1)
    };
  }
  // Add a class, restart its animation, remove it again after ms
  function flash(el, cls, ms) {
    if (!el) return;
    const key = '_vmt_' + cls;
    clearTimeout(el[key]);
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    el[key] = setTimeout(() => el.classList.remove(cls), ms + 40);
  }

  // ---- motion setting ----
  const MODES = ['full', 'short', 'off'];
  const MODE_KEY = 'pl.randomMotion';
  const MODE_LABEL = { full: 'Motion: full', short: 'Motion: short', off: 'Motion: off' };
  function mode() { try { const v = localStorage.getItem(MODE_KEY); return MODES.includes(v) ? v : 'full'; } catch (_) { return 'full'; } }
  function paintMode(b) { const m = mode(); b.textContent = MODE_LABEL[m]; b.setAttribute('aria-label', MODE_LABEL[m] + '. Click to change'); }
  function setMode(v) {
    if (!MODES.includes(v)) return;
    try { localStorage.setItem(MODE_KEY, v); } catch (_) {}
    document.querySelectorAll('[data-rmode]').forEach(paintMode);
    document.querySelectorAll('[data-rmode-set]').forEach(b => {
      const on = b.dataset.rmodeSet === v;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  const modeButton = () => `<button type="button" class="vm-rmode" data-rmode aria-label="${MODE_LABEL[mode()]}. Click to change">${MODE_LABEL[mode()]}</button>`;
  document.addEventListener('click', safe('rmode', e => {
    const cycle = e.target.closest && e.target.closest('[data-rmode]');
    if (cycle) { e.preventDefault(); return setMode(MODES[(MODES.indexOf(mode()) + 1) % MODES.length]); }
    const set = e.target.closest && e.target.closest('[data-rmode-set]');
    if (set) { e.preventDefault(); setMode(set.dataset.rmodeSet); }
  }));

  // ---- fair random: a whole number from 0 to n - 1, rejection sampling keeps every value equally likely ----
  function rand(n) {
    n = Math.floor(n);
    if (!(n > 0)) return 0;
    const c = window.crypto;
    if (!c || !c.getRandomValues) return Math.floor(Math.random() * n);
    const SPAN = 4294967296, limit = SPAN - (SPAN % n), bucket = limit / n, buf = new Uint32Array(1);
    for (let i = 0; i < 64; i++) { c.getRandomValues(buf); if (buf[0] < limit) return Math.floor(buf[0] / bucket); }
    return Math.floor(Math.random() * n);
  }

  // ---- reel: values flicker past fast, slow down, then the chosen one lands. Returns a skip function ----
  // el: the output element; next(): a decorative value to show; final: the chosen value; done(): called once.
  function reel(el, next, final, done) {
    const m = mode();
    let finished = false, timer = 0;
    const land = () => {
      if (finished) return; finished = true; clearTimeout(timer);
      el.getAnimations().forEach(a => a.cancel());
      el.textContent = final; el.classList.remove('vm-reeling');
      if (m !== 'off') el.animate([{ transform: 'scale(1.14)', color: 'var(--accent)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
      done();
    };
    if (m === 'off') { land(); return land; }
    const N = m === 'short' ? 6 : 16, slow = m === 'short' ? 90 : 190;
    el.classList.add('vm-reeling');
    let k = 0;
    const tick = () => {
      if (finished) return;
      if (k >= N) return land();
      const last = k === N - 1;
      el.textContent = last ? final : next();
      const d = 34 + slow * Math.pow(k / N, 2);
      el.animate([{ transform: 'translateY(-55%)', opacity: 0.15 }, { transform: 'translateY(0)', opacity: 1 }], { duration: Math.max(60, d * 0.9), easing: 'ease-out' });
      k++;
      timer = setTimeout(tick, d);
    };
    tick();
    setTimeout(land, 4000);
    return land;
  }

  // ---- the hook app.js calls for the dice and the deck: returns the shared 3D control, or null to keep its own ----
  function control(type, v, m, val) {
    const fn = CONTROLS[type];
    if (!fn) return null;
    const html = fn(v, m || {}, val == null ? '' : val, type);
    if (!html) return null;
    // the desktop reads every value from .var-input, so the shared control's hidden input joins in
    return `<div class="pl-r3d" data-vtype="${esc(type)}">${html.replace('<input type="hidden" data-var=', '<input type="hidden" class="var-input" data-var=')}</div>`;
  }
  window.PL_MOTION = { cfg, flash, reduced, clamp, esc, safe, STYLES, mode, setMode, modeButton, rand, reel, control: safe('control', control), register: (type, fn) => { CONTROLS[type] = fn; } };
  // vartypes-3d.js reports a new value through PL_VARS.onChange after it has set the hidden input
  window.PL_VARS = window.PL_VARS || {};
  if (!window.PL_VARS.onChange) {
    window.PL_VARS.onChange = function (name, value) {
      document.querySelectorAll('.pl-r3d input.var-input').forEach(inp => {
        if (inp.dataset.var === String(name) && inp.value === String(value)) inp.dispatchEvent(new Event('input', { bubbles: true }));
      });
    };
  }

  // ---- random pick and random number: a reel in place of the old ten quick ticks ----
  function pickValue(kind, list) {
    if (kind === 'randomnumber') {
      let lo = parseInt(list[0], 10), hi = parseInt(list[1], 10);
      if (isNaN(lo)) lo = 1;
      if (isNaN(hi)) hi = 100;
      if (lo > hi) [lo, hi] = [hi, lo];
      return String(lo + rand(hi - lo + 1));
    }
    return list[rand(list.length)] || '';
  }
  // decorative values for the reel only, never the result
  function decoyValue(kind, list) {
    if (kind === 'randomnumber') {
      let lo = parseInt(list[0], 10), hi = parseInt(list[1], 10);
      if (isNaN(lo)) lo = 1;
      if (isNaN(hi)) hi = 100;
      if (lo > hi) [lo, hi] = [hi, lo];
      return String(lo + Math.floor(Math.random() * (hi - lo + 1)));
    }
    return list[Math.floor(Math.random() * list.length)] || '';
  }
  const fallbackChoice = window._PL_rollChoice;
  window._PL_rollChoice = function (btn) {
    const wrap = btn && btn.closest && btn.closest('.var-random-block');
    if (!wrap || wrap._busy) return;
    try {
      let options = [];
      try { options = JSON.parse(btn.dataset.rollOptions || '[]'); } catch (_) {}
      const kind = btn.dataset.rollKind;
      const list = options.length ? options : (kind === 'randomnumber' ? ['1', '100'] : ['Option A', 'Option B', 'Option C']);
      // the result is chosen here, before any motion, so the reel never decides it
      const picked = pickValue(kind, list);
      const hidden = wrap.querySelector('input.var-input'), result = wrap.querySelector('[data-roll-result]');
      const land = () => {
        wrap._busy = false; wrap._skip = null; btn.disabled = false;
        if (hidden) { hidden.value = picked; hidden.dispatchEvent(new Event('input', { bubbles: true })); }
      };
      wrap._busy = true; btn.disabled = true;
      if (!result) return land();
      wrap._skip = reel(result, () => decoyValue(kind, list), picked || 'No valid options', land);
    } catch (e) {
      wrap._busy = false; btn.disabled = false;
      if (!warned.reel) { warned.reel = 1; console.warn('Randomiser motion: reel', e); }
      if (typeof fallbackChoice === 'function') return fallbackChoice.call(this, btn);
    }
  };
  // a click on a moving reel skips straight to the result
  document.addEventListener('click', safe('reelskip', e => {
    const out = e.target.closest && e.target.closest('.var-random-block [data-roll-result]');
    if (!out) return;
    const wrap = out.closest('.var-random-block');
    if (wrap._busy && wrap._skip) wrap._skip();
  }));

  // ---- Settings: Randomiser motion ----
  function addSetting() {
    const body = document.querySelector('#configPanel .config-panel-body');
    if (!body || body.querySelector('.pl-rm-setting')) return;
    const box = document.createElement('div');
    box.className = 'pl-rm-setting';
    const m = mode(), opt = (v, label) => `<button type="button" class="pl-rm-tab${m === v ? ' active' : ''}" data-rmode-set="${v}" aria-pressed="${m === v}">${label}</button>`;
    box.innerHTML = `<div class="config-section-label">Randomiser motion</div>
      <div class="pl-rm-tabs" role="group" aria-label="Randomiser motion">${opt('full', 'Full')}${opt('short', 'Short')}${opt('off', 'Off')}</div>
      <p class="pl-rm-hint">For dice, card decks, random picks and random numbers. Click while it moves to skip to the result.</p>`;
    body.appendChild(box);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', safe('setting', addSetting)); else safe('setting', addSetting)();

  CSS.push(`
.pl-r3d{--on-accent:var(--surface);--ease:var(--ease-out-expo, cubic-bezier(.16,1,.3,1));--t-meta:12px;--vm-s:1;--vm-a:1.2;padding-top:4px}
.pl-r3d button{cursor:pointer;font-family:inherit}
.pl-r3d button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.vm-rmode,.vd-out .vm-rmode,.vc-row .vm-rmode{min-height:36px;padding:6px 12px;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--ink-3);font:600 12px var(--ff-sans);white-space:nowrap}
.vm-rmode:hover{color:var(--ink);border-color:var(--ink-3)}
.vm-reeling{font-family:var(--ff-mono);color:var(--ink-3)}
.var-random-block [data-roll-result]{display:inline-block}
.pl-rm-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.pl-rm-tab{padding:8px 4px;text-align:center;font-size:var(--fs-sm, 13px);font-weight:500;border:1px solid var(--line);border-radius:var(--radius, 8px);background:var(--surface);color:var(--ink-2);cursor:pointer}
.pl-rm-tab:hover{background:var(--surface-3);color:var(--ink)}
.pl-rm-tab.active{background:var(--accent-soft, var(--surface-3));border-color:var(--accent);color:var(--accent);font-weight:600}
.pl-rm-hint{margin:6px 0 0;font-size:12px;color:var(--ink-3)}
`);
  const style = document.createElement('style');
  style.textContent = CSS.join('\n');
  document.head.appendChild(style);
})();
