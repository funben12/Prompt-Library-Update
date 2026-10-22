/* Variable types with motion: switch, dice (dice-throw.js) and the random pick reel, plus motion for the native controls.
   Draws the control markup for renderVariableFields (app.js) through window.PL_VT_EXTRA.render and owns
   their click handling. Each control keeps its value in a hidden .var-input so the live preview reads it
   like every other type. Styles are injected here with a vx- prefix so they cannot clash with app.css. */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const split = o => { const raw = String(o), i = raw.indexOf('|'); return i < 0 ? { t: raw.trim(), d: '' } : { t: raw.slice(0, i).trim(), d: raw.slice(i + 1).trim() }; };
  const hidden = (v, val) => `<input type="hidden" class="var-input" data-var="${esc(v)}" value="${esc(val)}" />`;
  // Write a value into the hidden input and tell the live preview
  function commit(root, value) {
    const h = root.querySelector('input.var-input');
    h.value = value;
    h.dispatchEvent(new Event('input', { bubbles: true }));
  }
  // Restart a CSS animation class on an element
  function flash(el, cls, ms) {
    if (!el || reduced()) return;
    clearTimeout(el['_vx' + cls]);
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    el['_vx' + cls] = setTimeout(() => el.classList.remove(cls), ms);
  }

  const swLabels = o => [String((o && o[0]) || 'Yes').trim() || 'Yes', String((o && o[1]) || 'No').trim() || 'No'];
  const TYPES = {
    carddeck(v, m, def) {
      const cards = (m.options || []).map(x => split(x).t).filter(Boolean);
      return `<div class="vx-cs" data-vx-cs data-val="${esc(def)}" data-cards="${esc(JSON.stringify(cards))}"><div class="vx-csstage"></div><div class="vx-side"><div class="var-random-result" data-vx-out>${esc(def || 'Ready to draw')}</div><button type="button" class="btn btn-sm" data-vx-draw>Shuffle and draw</button></div>${hidden(v, def)}</div>`;
    },
    dice(v, m, def) {
      const faces = (m.options || []).map(x => split(x).t).filter(Boolean);
      if (!window.DiceThrow) {
        const opts = faces.length ? faces : ['1', '2', '3', '4', '5', '6'];
        return `<div class="var-random-block"><div class="var-random-result" data-roll-result>${esc(def || 'Ready to roll')}</div><button type="button" class="btn btn-sm" data-roll-kind="randompick" data-roll-options="${esc(JSON.stringify(opts))}" onclick="window._PL_rollChoice(this)">Roll dice</button>${hidden(v, def)}</div>`;
      }
      return `<div class="vx-dice" data-vx-dice data-val="${esc(def)}" data-faces="${esc(JSON.stringify(faces))}"><div class="vx-dstage"></div><div class="vx-side"><div class="var-random-result" data-vx-out>${esc(def || 'Ready to roll')}</div><button type="button" class="btn btn-sm" data-vx-roll>Roll dice</button></div>${hidden(v, def)}</div>`;
    },
    switch(v, m, def) {
      const [on, off] = swLabels(m.options), val = def || off, isOn = val === on;
      return `<div class="vx-sw${isOn ? ' on' : ''}" data-vx-sw data-on="${esc(on)}" data-off="${esc(off)}"><button type="button" role="switch" aria-checked="${isOn}" class="vx-swb"><span class="vx-swk"></span></button><span class="vx-swl"><span>${esc(isOn ? on : off)}</span></span>${hidden(v, val)}</div>`;
    },
  };

  function watch(root) {
    if (window.CardShuffle && root.querySelectorAll) root.querySelectorAll('.vx-cs:not([data-vx-m])').forEach(g => {
      g.setAttribute('data-vx-m', '1');
      try { window.CardShuffle.mount(g.querySelector('.vx-csstage'), g.dataset.val, JSON.parse(g.dataset.cards || '[]')); } catch (e) { console.warn('Cards:', e); }
    });
    if (window.DiceThrow && root.querySelectorAll) root.querySelectorAll('.vx-dice:not([data-vx-m])').forEach(g => {
      g.setAttribute('data-vx-m', '1');
      try { const f = JSON.parse(g.dataset.faces || '[]'); window.DiceThrow.mount(g.querySelector('.vx-dstage'), f.length ? g.dataset.val : (parseInt(g.dataset.val, 10) || 0), f); } catch (e) { console.warn('Dice:', e); }
    });
  }
  new MutationObserver(list => list.forEach(r => r.addedNodes.forEach(n => { if (n.nodeType === 1) watch(n); }))).observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('click', e => {
    const t = e.target;
    if (!t.closest) return;
    const swb = t.closest('.vx-swb');
    if (swb) {
      const g = swb.closest('[data-vx-sw]'), now = !g.classList.contains('on'), label = g.querySelector('.vx-swl span');
      g.classList.toggle('on', now); swb.setAttribute('aria-checked', now);
      label.textContent = now ? g.dataset.on : g.dataset.off;
      flash(label, now ? 'vx-up' : 'vx-down', 300);
      return commit(g, label.textContent);
    }
    const draw = t.closest('[data-vx-draw]');
    if (draw) {
      const g = draw.closest('[data-vx-cs]'), out = g.querySelector('[data-vx-out]');
      if (g._busy) return;
      g._busy = true; draw.disabled = true; out.textContent = 'Shuffling';
      const done = c => {
        g._busy = false; draw.disabled = false;
        if (!c) { out.textContent = 'Ready to draw'; return; }
        out.textContent = c; flash(out, 'vx-pop', 420); commit(g, c);
      };
      let cards = [];
      try { cards = JSON.parse(g.dataset.cards || '[]'); } catch (_) {}
      return void window.CardShuffle.draw(g.querySelector('.vx-csstage'), cards).then(done, () => done(''));
    }
    const droll = t.closest('[data-vx-roll]');
    if (droll) {
      const g = droll.closest('[data-vx-dice]'), out = g.querySelector('[data-vx-out]');
      if (g._busy) return;
      g._busy = true; droll.disabled = true; out.textContent = 'Rolling';
      const done = n => {
        g._busy = false; droll.disabled = false;
        if (!n) { out.textContent = 'Ready to roll'; return; }
        out.textContent = String(n); flash(out, 'vx-pop', 420); commit(g, String(n));
      };
      let f = [];
      try { f = JSON.parse(g.dataset.faces || '[]'); } catch (_) {}
      return void window.DiceThrow.roll(g.querySelector('.vx-dstage'), f).then(done, () => done(0));
    }
  });

  // ---- Parity with the phone: chips pop, step labels spring, checklist ticks pop, sliders show a value bubble, numbers roll ----
  document.addEventListener('click', e => {
    const chip = e.target.closest && e.target.closest('.var-choice-chips .var-toggle-btn, .var-choice-cards .var-toggle-btn');
    if (chip && chip.classList.contains('active')) flash(chip, 'vx-pop', 380);
    const lab = e.target.closest && e.target.closest('.var-step-label');
    if (lab) flash(lab.parentNode.querySelector('.var-step-label.active') || lab, 'vx-spring', 420);
  });
  function bubble(inp) {
    const body = inp.closest('.var-field-body');
    if (!body) return;
    let b = inp._vxb;
    if (!b) { b = inp._vxb = document.createElement('span'); b.className = 'vx-bub'; b.setAttribute('aria-hidden', 'true'); body.appendChild(b); }
    const min = Number(inp.min || 0), max = Number(inp.max || 100), r = max > min ? (inp.value - min) / (max - min) : 0;
    const br = body.getBoundingClientRect(), ir = inp.getBoundingClientRect(), thumb = 16;
    b.style.left = (ir.left - br.left + thumb / 2 + r * (ir.width - thumb)) + 'px';
    b.style.top = (ir.top - br.top - 30) + 'px';
    b.textContent = inp.value;
    b.classList.add('on');
    clearTimeout(inp._vxt);
    inp._vxt = setTimeout(() => b.classList.remove('on'), 800);
  }
  document.addEventListener('input', e => {
    const t = e.target;
    if (!t.matches) return;
    if (t.matches('.var-step-range')) { const l = t.closest('.var-stepslider').querySelector('.var-step-label.active'); return flash(l, 'vx-spring', 420); }
    if (t.matches('.var-mix-range')) return t.closest('.var-mix').querySelectorAll('.var-mix-pct').forEach(p => flash(p, 'vx-pop', 300));
    if (t.matches('.var-field input[type=range]')) return bubble(t);
    if (t.matches('.var-field input[type=number]')) {
      const now = parseFloat(t.value) || 0, before = t._vxv == null ? now : t._vxv;
      t._vxv = now;
      if (now !== before) flash(t, now > before ? 'vx-up' : 'vx-down', 300);
    }
  });
  document.addEventListener('focusin', e => {
    const t = e.target;
    if (t.matches && t.matches('.var-field input[type=number]') && t._vxv == null) t._vxv = parseFloat(t.value) || 0;
  });
  document.addEventListener('change', e => {
    const c = e.target.matches && e.target.matches('.var-checklist-item') && e.target;
    if (c) flash(c.closest('label'), 'vx-pop', 380);
  });


  // Reel: one strip of values scrolls past like a slot machine, slows, overshoots a touch and settles on the pick
  function reel(out, next, picked, done) {
    const items = [];
    let last = '';
    for (let i = 0; i < 28; i++) { let t = next(), k = 0; while (t === last && k++ < 4) t = next(); items.push(last = t); }
    items.push(picked);
    const strip = document.createElement('span');
    strip.className = 'vx-strip';
    items.forEach(t => { const s = document.createElement('span'); s.textContent = t; strip.appendChild(s); });
    out.textContent = ''; out.appendChild(strip);
    const h = strip.firstChild.getBoundingClientRect().height || 36, end = -(items.length - 1) * h;
    if (!strip.animate) return done();
    const a = strip.animate([
      { transform: 'translateY(0)', easing: 'cubic-bezier(.32,.05,.12,1)' },
      { transform: `translateY(${end - h * 0.22}px)`, offset: 0.9, easing: 'ease-in-out' },
      { transform: `translateY(${end}px)` }
    ], { duration: 2100, fill: 'forwards' });
    strip.animate([{ filter: 'blur(0px)' }, { filter: 'blur(1.4px)', offset: 0.15 }, { filter: 'blur(1.4px)', offset: 0.45 }, { filter: 'blur(0px)', offset: 0.8 }, { filter: 'blur(0px)' }], { duration: 2100 });
    a.onfinish = done; a.oncancel = done;
  }

  const css = document.createElement('style');
  css.textContent = `
/* Switch */
.vx-sw{display:flex;align-items:center;gap:12px}
.vx-swb{position:relative;flex:none;width:48px;height:28px;border:0;border-radius:14px;background:var(--surface-3);cursor:pointer;transition:background .3s var(--ease-out-quart)}
.vx-swk{position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:11px;background:var(--surface);box-shadow:1px 2px 4px oklch(18% 0.04 260 / .28);transition:transform .42s cubic-bezier(.3,1.5,.5,1),width .18s var(--ease-out-quart)}
.vx-swb:active .vx-swk{width:28px}
.vx-sw.on .vx-swb{background:var(--accent)}
.vx-sw.on .vx-swk{transform:translateX(20px)}
.vx-sw.on .vx-swb:active .vx-swk{transform:translateX(14px)}
.vx-swl{font-weight:600;color:var(--ink);overflow:hidden}
.vx-swl span{display:inline-block}
/* Card deck */
.vx-cs{display:flex;flex-wrap:wrap;align-items:center;gap:22px}
.vx-csstage{flex:1 1 320px;max-width:460px;min-width:240px}
/* Dice */
.vx-dice{display:flex;flex-wrap:wrap;align-items:center;gap:22px}
.vx-dstage{flex:1 1 320px;max-width:460px;min-width:240px}
/* Screen motion: variable cards rise in one after another, buttons press in */
.var-field{animation:vx-rise .46s var(--ease-out-quart) both}
@keyframes vx-rise{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:none}}
.var-field:nth-child(2){animation-delay:45ms}.var-field:nth-child(3){animation-delay:90ms}.var-field:nth-child(4){animation-delay:135ms}.var-field:nth-child(5){animation-delay:180ms}.var-field:nth-child(6){animation-delay:225ms}.var-field:nth-child(7){animation-delay:270ms}.var-field:nth-child(8){animation-delay:315ms}.var-field:nth-child(9){animation-delay:360ms}.var-field:nth-child(10){animation-delay:405ms}.var-field:nth-child(11){animation-delay:450ms}.var-field:nth-child(12){animation-delay:495ms}
.btn:active{transform:scale(.97)}
@media (prefers-reduced-motion:reduce){.var-field{animation:none}}
.var-random-result{height:38px;padding-top:0!important;padding-bottom:0!important;line-height:36px;overflow:hidden;white-space:nowrap}
.var-random-result.ticking{color:var(--ink-2)}
.vx-strip{display:block;will-change:transform}
.vx-strip span{display:block;height:36px;line-height:36px}
.var-field-body{position:relative}
.vx-bub{position:absolute;z-index:3;padding:3px 8px;border-radius:999px;background:var(--ink);color:var(--bg);font:700 11px var(--ff-mono, monospace);pointer-events:none;opacity:0;transform:translate(-50%,6px) scale(.8);transition:opacity .18s var(--ease-out-quart),transform .26s cubic-bezier(.3,1.5,.5,1)}
.vx-bub.on{opacity:1;transform:translate(-50%,0) scale(1)}
.vx-spring{display:inline-block;animation:vx-spring .42s cubic-bezier(.3,1.6,.5,1)}
@keyframes vx-spring{0%{transform:translateY(0) scale(1)}35%{transform:translateY(-4px) scale(1.18)}100%{transform:none}}
.var-checklist-item{accent-color:var(--accent)}
.var-choice-chips .var-toggle-btn{transition:background .25s var(--ease-out-quart),color .25s var(--ease-out-quart),transform .18s var(--ease-out-quart)}
/* Shared motion classes */
.vx-pop{animation:vx-pop .38s var(--ease-out-quart)}
@keyframes vx-pop{0%{transform:scale(1)}40%{transform:scale(1.14)}100%{transform:scale(1)}}
.vx-up{animation:vx-up .3s var(--ease-out-quart)}
.vx-down{animation:vx-down .3s var(--ease-out-quart)}
@keyframes vx-up{0%{transform:translateY(60%);opacity:.2}100%{transform:none;opacity:1}}
@keyframes vx-down{0%{transform:translateY(-60%);opacity:.2}100%{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){.vx-pop,.vx-up,.vx-down,.vx-spring,.vx-bub{animation:none!important}.vx-swk,.vx-swb,.vx-tgthumb{transition:none}}
`;
  document.head.appendChild(css);

  window.PL_VT_EXTRA = {
    types: Object.keys(TYPES).filter(t => t !== 'carddeck' || window.CardShuffle),
    render(type, v, m, def) { return TYPES[type] ? TYPES[type](v, m || {}, def == null ? '' : def) : null; },
    swLabels, reel
  };
  watch(document);
})();
