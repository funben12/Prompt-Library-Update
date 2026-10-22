/* Variable types with motion: toggle group, switch, rating, tags, coin flip and spin wheel.
   Draws the control markup for renderVariableFields (app.js) through window.PL_VT_EXTRA.render and owns
   their click handling. Each control keeps its value in a hidden .var-input so the live preview reads it
   like every other type. Styles are injected here with a vx- prefix so they cannot clash with app.css. */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const csv = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
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
  const ratingMax = o => Math.max(2, Math.min(10, parseInt((o || [])[0], 10) || 5));
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.4l2.7 5.5 6 .9-4.4 4.2 1 6L12 17.1 6.7 20l1-6L3.3 9.8l6-.9z" stroke-linejoin="round"/></svg>';
  const X = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const tagHtml = t => `<span class="vx-tag" data-t="${esc(t)}"><b>${esc(t)}</b><button type="button" data-vx-rm aria-label="Remove ${esc(t)}">${X}</button></span>`;
  const coinSides = o => { const l = (o || []).map(x => split(x).t).filter(Boolean); return [l[0] || 'Heads', l[1] || 'Tails']; };
  const WSAMPLE = ['Option A', 'Option B', 'Option C', 'Option D', 'Option E', 'Option F'];
  const wheelItems = o => { const l = (o || []).map(x => split(x).t).filter(Boolean); return (l.length >= 2 ? l : WSAMPLE).slice(0, 16); };
  const pt = (r, deg) => { const t = deg * Math.PI / 180; return [(100 + r * Math.sin(t)).toFixed(2), (100 - r * Math.cos(t)).toFixed(2)]; };
  function wheelSvg(items, win) {
    const n = items.length, seg = 360 / n;
    return `<svg viewBox="0 0 200 200" aria-hidden="true">${items.map((t, i) => {
      const a = pt(96, i * seg), b = pt(96, (i + 1) * seg), w = i === win, lab = t.length > 11 ? t.slice(0, 10) + '.' : t;
      return `<path class="vx-wedge${i % 2 ? ' odd' : ''}${w ? ' win' : ''}" d="M100 100L${a[0]} ${a[1]}A96 96 0 0 1 ${b[0]} ${b[1]}Z"/><text class="vx-wtxt${w ? ' win' : ''}" transform="rotate(${((i + 0.5) * seg).toFixed(2)} 100 100)" x="100" y="${n > 8 ? 30 : 34}" text-anchor="middle" font-size="${n > 10 ? 8 : 10}">${esc(lab)}</text>`;
    }).join('')}<circle cx="100" cy="100" r="9" class="vx-whub"/></svg>`;
  }

  const TYPES = {
    dice(v, m, def) {
      const faces = (m.options || []).map(x => split(x).t).filter(Boolean);
      if (!window.DiceThrow) {
        const opts = faces.length ? faces : ['1', '2', '3', '4', '5', '6'];
        return `<div class="var-random-block"><div class="var-random-result" data-roll-result>${esc(def || 'Ready to roll')}</div><button type="button" class="btn btn-sm" data-roll-kind="randompick" data-roll-options="${esc(JSON.stringify(opts))}" onclick="window._PL_rollChoice(this)">Roll dice</button>${hidden(v, def)}</div>`;
      }
      return `<div class="vx-dice" data-vx-dice data-val="${esc(def)}" data-faces="${esc(JSON.stringify(faces))}"><div class="vx-dstage"></div><div class="vx-side"><div class="var-random-result" data-vx-out>${esc(def || 'Ready to roll')}</div><button type="button" class="btn btn-sm" data-vx-roll>Roll dice</button></div>${hidden(v, def)}</div>`;
    },
    togglegroup(v, m, def) {
      const opts = m.options || [];
      if (!opts.length) return '<p style="font-size:12px;color:var(--ink-3);">Add options in the variable editor.</p>';
      const multi = !!m.multi, on = multi ? csv(def) : [def], pairs = opts.map(split), desc = pairs.some(p => p.d);
      return `<div class="vx-tg${desc ? ' desc' : ''}${multi ? ' multi' : ''}" data-vx-tg data-multi="${multi ? 1 : 0}"><span class="vx-tgthumb" aria-hidden="true"></span>${pairs.map(p => `<button type="button" class="vx-tgb${on.includes(p.t) ? ' on' : ''}" data-vx-o="${esc(p.t)}" aria-pressed="${on.includes(p.t)}"><b>${esc(p.t)}</b>${p.d ? `<small>${esc(p.d)}</small>` : ''}${desc ? '<span class="vx-mark"><svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' : ''}</button>`).join('')}${hidden(v, def)}</div>`;
    },
    switch(v, m, def) {
      const [on, off] = swLabels(m.options), val = def || off, isOn = val === on;
      return `<div class="vx-sw${isOn ? ' on' : ''}" data-vx-sw data-on="${esc(on)}" data-off="${esc(off)}"><button type="button" role="switch" aria-checked="${isOn}" class="vx-swb"><span class="vx-swk"></span></button><span class="vx-swl"><span>${esc(isOn ? on : off)}</span></span>${hidden(v, val)}</div>`;
    },
    rating(v, m, def) {
      const max = ratingMax(m.options), n = parseInt(def, 10) || 0;
      let stars = '';
      for (let i = 1; i <= max; i++) stars += `<button type="button" class="vx-star${i <= n ? ' on' : ''}" data-vx-star="${i}" aria-label="${i} of ${max}">${STAR}</button>`;
      return `<div class="vx-rate" data-vx-rate data-max="${max}">${stars}<span class="vx-rout">${n ? n + '/' + max : 'Not rated'}</span>${hidden(v, n ? n + '/' + max : '')}</div>`;
    },
    tags(v, m, def) {
      const list = csv(def), all = (m.options || []).map(x => split(x).t).filter(Boolean), sugg = all.filter(o => !list.includes(o));
      return `<div class="vx-tags" data-vx-tags><div class="vx-taglist">${list.map(tagHtml).join('')}</div><div class="vx-tagadd"><input type="text" placeholder="Add a tag, then press Enter" autocomplete="off"><button type="button" data-vx-add>Add</button></div>${sugg.length ? `<div class="vx-tagsug">${sugg.map(s => `<button type="button" data-vx-sug="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}${hidden(v, def)}</div>`;
    },
    coinflip(v, m, def) {
      const s = coinSides(m.options), ang = def && def === s[1] ? 180 : 0;
      return `<div class="vx-coin" data-vx-coin data-sides="${esc(JSON.stringify(s))}" data-ang="${ang}"><div class="vx-cscene"><div class="vx-cface" style="transform:rotateY(${ang}deg)"><div class="vx-cf"><span>${esc(s[0])}</span></div><div class="vx-cf back"><span>${esc(s[1])}</span></div></div><i class="vx-cshadow"></i></div><div class="vx-side"><div class="var-random-result" data-vx-out>${esc(def || 'Ready to flip')}</div><button type="button" class="btn btn-sm" data-vx-flip>Flip coin</button></div>${hidden(v, def)}</div>`;
    },
    spinwheel(v, m, def) {
      const items = wheelItems(m.options), win = items.indexOf(def), rot = win >= 0 ? -(win + 0.5) * (360 / items.length) : 0;
      return `<div class="vx-wheel" data-vx-wheel data-items="${esc(JSON.stringify(items))}" data-rot="${rot}"><div class="vx-wbox"><div class="vx-wrot" style="transform:rotate(${rot}deg)">${wheelSvg(items, win)}</div><svg class="vx-wptr" viewBox="0 0 24 28" aria-hidden="true"><path d="M12 26L3 6a10 10 0 0 1 18 0z"/></svg></div><div class="vx-side"><div class="var-random-result" data-vx-out>${esc(def || 'Ready to spin')}</div><button type="button" class="btn btn-sm" data-vx-spin>Spin wheel</button></div>${hidden(v, def)}</div>`;
    }
  };

  // Toggle group: one thumb slides behind the chosen option (single choice only)
  function placeThumb(g, animate) {
    const th = g.querySelector('.vx-tgthumb'), sel = g.querySelector('.vx-tgb.on');
    if (!th) return;
    if (g.dataset.multi === '1' || !sel) { th.style.opacity = '0'; return; }
    if (!animate) th.style.transition = 'none';
    th.style.opacity = '1';
    th.style.width = sel.offsetWidth + 'px'; th.style.height = sel.offsetHeight + 'px';
    th.style.transform = `translate(${sel.offsetLeft}px,${sel.offsetTop}px)`;
    if (!animate) requestAnimationFrame(() => requestAnimationFrame(() => { th.style.transition = ''; }));
  }
  function watch(root) {
    if (window.DiceThrow && root.querySelectorAll) root.querySelectorAll('.vx-dice:not([data-vx-m])').forEach(g => {
      g.setAttribute('data-vx-m', '1');
      try { const f = JSON.parse(g.dataset.faces || '[]'); window.DiceThrow.mount(g.querySelector('.vx-dstage'), f.length ? g.dataset.val : (parseInt(g.dataset.val, 10) || 0), f); } catch (e) { console.warn('Dice:', e); }
    });
    root.querySelectorAll && root.querySelectorAll('.vx-tg:not([data-vx-w])').forEach(g => {
      g.dataset.vxW = '1'; g.setAttribute('data-vx-w', '1');
      placeThumb(g, false);
      if (window.ResizeObserver) new ResizeObserver(() => placeThumb(g, false)).observe(g);
    });
  }
  new MutationObserver(list => list.forEach(r => r.addedNodes.forEach(n => { if (n.nodeType === 1) watch(n); }))).observe(document.documentElement, { childList: true, subtree: true });

  function tagsSync(g) {
    const have = [...g.querySelectorAll('.vx-tag')].map(t => t.dataset.t);
    g.querySelectorAll('[data-vx-sug]').forEach(b => { b.hidden = have.includes(b.dataset.vxSug); });
    commit(g, have.join(', '));
  }
  function tagsAdd(g, text) {
    const list = g.querySelector('.vx-taglist'), have = [...list.querySelectorAll('.vx-tag')].map(t => t.dataset.t);
    csv(text).filter(t => !have.includes(t)).forEach(t => { list.insertAdjacentHTML('beforeend', tagHtml(t)); flash(list.lastElementChild, 'vx-pop', 380); });
    tagsSync(g);
  }

  document.addEventListener('click', e => {
    const t = e.target;
    if (!t.closest) return;
    const tgb = t.closest('.vx-tgb');
    if (tgb) {
      const g = tgb.closest('[data-vx-tg]'), multi = g.dataset.multi === '1';
      let val;
      if (multi) { tgb.classList.toggle('on'); val = [...g.querySelectorAll('.vx-tgb.on')].map(b => b.dataset.vxO).join(', '); flash(tgb, 'vx-pop', 380); }
      else { const was = tgb.classList.contains('on'); g.querySelectorAll('.vx-tgb').forEach(b => b.classList.remove('on')); if (!was) tgb.classList.add('on'); val = was ? '' : tgb.dataset.vxO; }
      g.querySelectorAll('.vx-tgb').forEach(b => b.setAttribute('aria-pressed', b.classList.contains('on')));
      placeThumb(g, true);
      return commit(g, val);
    }
    const swb = t.closest('.vx-swb');
    if (swb) {
      const g = swb.closest('[data-vx-sw]'), now = !g.classList.contains('on'), label = g.querySelector('.vx-swl span');
      g.classList.toggle('on', now); swb.setAttribute('aria-checked', now);
      label.textContent = now ? g.dataset.on : g.dataset.off;
      flash(label, now ? 'vx-up' : 'vx-down', 300);
      return commit(g, label.textContent);
    }
    const star = t.closest('.vx-star');
    if (star) {
      const g = star.closest('[data-vx-rate]'), max = +g.dataset.max, prev = g.querySelectorAll('.vx-star.on').length;
      const n = +star.dataset.vxStar === prev ? 0 : +star.dataset.vxStar;
      g.querySelectorAll('.vx-star').forEach((s, i) => {
        s.classList.toggle('on', i < n);
        if (i < n) { s.style.animationDelay = (i * 45) + 'ms'; flash(s, 'vx-starpop', 520 + i * 45); }
      });
      g.querySelector('.vx-rout').textContent = n ? n + '/' + max : 'Not rated';
      return commit(g, n ? n + '/' + max : '');
    }
    const add = t.closest('[data-vx-add]'), sug = t.closest('[data-vx-sug]'), rm = t.closest('[data-vx-rm]');
    if (add || sug || rm) {
      const g = t.closest('[data-vx-tags]');
      if (add) { const i = g.querySelector('input[type=text]'); tagsAdd(g, i.value); i.value = ''; i.focus(); return; }
      if (sug) return tagsAdd(g, sug.dataset.vxSug);
      const chip = rm.closest('.vx-tag');
      chip.classList.add('out');
      return void setTimeout(() => { chip.remove(); tagsSync(g); }, reduced() ? 0 : 260);
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
    const flip = t.closest('[data-vx-flip]');
    if (flip) return coinFlip(flip);
    const spin = t.closest('[data-vx-spin]');
    if (spin) return wheelSpin(spin);
  });
  document.addEventListener('keydown', e => {
    const i = e.target;
    if (!i.matches || !i.matches('.vx-tagadd input') || (e.key !== 'Enter' && e.key !== ',')) return;
    e.preventDefault();
    tagsAdd(i.closest('[data-vx-tags]'), i.value);
    i.value = '';
  });

  function coinFlip(btn) {
    const g = btn.closest('[data-vx-coin]');
    if (g._busy) return;
    let sides = [];
    try { sides = JSON.parse(g.dataset.sides); } catch (_) { return; }
    const idx = Math.random() < 0.5 ? 0 : 1, out = g.querySelector('[data-vx-out]'), coin = g.querySelector('.vx-cface'), shadow = g.querySelector('.vx-cshadow');
    const cur = +g.dataset.ang || 0, delta = (((idx * 180 - cur) % 360) + 360) % 360, total = 360 * (3 + Math.floor(Math.random() * 3)) + delta, end = cur + total;
    const finish = () => {
      g._busy = false; btn.disabled = false; g.dataset.ang = end % 360;
      coin.style.transform = `rotateY(${end % 360}deg)`;
      out.textContent = sides[idx]; flash(out, 'vx-pop', 420); commit(g, sides[idx]);
    };
    if (reduced() || !coin.animate) { g.dataset.ang = idx * 180; coin.style.transform = `rotateY(${idx * 180}deg)`; out.textContent = sides[idx]; return commit(g, sides[idx]); }
    g._busy = true; btn.disabled = true; out.textContent = '';
    const dur = 1250, up = 'cubic-bezier(.2,.7,.4,1)', down = 'cubic-bezier(.6,0,.9,.5)';
    const a = coin.animate([
      { transform: `translateY(0) scale(1) rotateY(${cur}deg)`, easing: up },
      { transform: `translateY(-74px) scale(1.25) rotateY(${cur + total * 0.55}deg)`, offset: 0.45, easing: down },
      { transform: `translateY(0) scale(1) rotateY(${cur + total * 0.93}deg)`, offset: 0.8, easing: up },
      { transform: `translateY(-12px) scale(1.04) rotateY(${cur + total * 0.985}deg)`, offset: 0.9, easing: down },
      { transform: `translateY(0) scale(1) rotateY(${end}deg)` }
    ], { duration: dur });
    shadow.animate([{ transform: 'scale(1)', opacity: 0.35, easing: up }, { transform: 'scale(.55)', opacity: 0.15, offset: 0.45, easing: down }, { transform: 'scale(1)', opacity: 0.35, offset: 0.8 }, { transform: 'scale(.85)', opacity: 0.28, offset: 0.9 }, { transform: 'scale(1)', opacity: 0.35 }], { duration: dur });
    a.onfinish = finish; a.oncancel = finish;
  }

  function wheelSpin(btn) {
    const g = btn.closest('[data-vx-wheel]');
    if (g._busy) return;
    let items = [];
    try { items = JSON.parse(g.dataset.items); } catch (_) { return; }
    const n = items.length, seg = 360 / n, idx = Math.floor(Math.random() * n), jitter = (Math.random() - 0.5) * seg * 0.6;
    const rotEl = g.querySelector('.vx-wrot'), ptr = g.querySelector('.vx-wptr'), out = g.querySelector('[data-vx-out]');
    const cur = +g.dataset.rot || 0, want = -((idx + 0.5) * seg + jitter);
    const delta = (((want - cur) % 360) + 360) % 360, end = cur + 360 * (4 + Math.floor(Math.random() * 2)) + delta;
    const clear = () => g.querySelectorAll('.vx-wedge, .vx-wtxt').forEach(el => el.classList.remove('win'));
    const finish = () => {
      g._busy = false; btn.disabled = false; g.dataset.rot = end;
      rotEl.style.transform = `rotate(${end}deg)`;
      clear();
      const w = g.querySelectorAll('.vx-wedge'), x = g.querySelectorAll('.vx-wtxt');
      if (w[idx]) { w[idx].classList.add('win'); x[idx].classList.add('win'); }
      out.textContent = items[idx]; flash(out, 'vx-pop', 420); commit(g, items[idx]);
    };
    if (reduced() || !rotEl.animate) { g.dataset.rot = end; return finish(); }
    g._busy = true; btn.disabled = true; out.textContent = ''; clear();
    const dur = 3400;
    const a = rotEl.animate([{ transform: `rotate(${cur}deg)` }, { transform: `rotate(${end}deg)` }], { duration: dur, easing: 'cubic-bezier(.12,.6,.12,1)' });
    ptr.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-16deg)' }, { transform: 'rotate(0deg)' }], { duration: dur / (n * 2.2), iterations: Math.round(n * 2.2) });
    a.onfinish = finish; a.oncancel = finish;
  }


  // ---- Parity with the phone: chips pop, step labels spring, checklist ticks pop, sliders show a value bubble, numbers roll ----
  document.addEventListener('click', e => {
    const chip = e.target.closest && e.target.closest('.var-choice-chips .var-toggle-btn');
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
/* Toggle group */
.vx-tg{position:relative;display:flex;flex-wrap:wrap;gap:4px;padding:4px;background:var(--surface-sunk);border-radius:12px}
.vx-tgthumb{position:absolute;top:0;left:0;width:0;height:0;border-radius:9px;background:var(--accent);opacity:0;pointer-events:none;transition:transform .42s cubic-bezier(.3,1.35,.5,1),width .3s var(--ease-out-quart),height .3s var(--ease-out-quart),opacity .2s var(--ease-out-quart)}
.vx-tgb{position:relative;z-index:1;flex:1 1 auto;display:flex;align-items:center;justify-content:center;gap:2px;min-height:34px;padding:6px 14px;border:0;border-radius:9px;background:none;color:var(--ink-3);font:600 13px var(--ff-sans, inherit);cursor:pointer;transition:color .25s var(--ease-out-quart),background .25s var(--ease-out-quart),transform .18s var(--ease-out-quart)}
.vx-tgb:hover{color:var(--ink)}
.vx-tgb:active{transform:scale(.97)}
.vx-tgb b{font:inherit}
.vx-tg:not(.multi) .vx-tgb.on{color:var(--on-accent,#fff)}
.vx-tg.multi .vx-tgb.on{background:var(--accent);color:var(--on-accent,#fff)}
.vx-tg.desc{flex-direction:row;align-items:stretch;background:none;padding:0;gap:10px}
.vx-tg.desc .vx-tgthumb{border-radius:12px;background:var(--accent-soft);box-shadow:inset 0 0 0 1.5px var(--accent)}
.vx-tg.desc .vx-tgb{flex:1 1 150px;flex-direction:column;align-items:flex-start;justify-content:flex-start;gap:4px;min-height:76px;padding:12px 38px 12px 14px;border:1px solid var(--line);border-radius:12px;text-align:left;color:var(--ink-2);background:var(--surface)}
.vx-tg.desc .vx-tgb:hover{box-shadow:var(--shadow-md);transform:translateY(-1px)}
.vx-tg.desc .vx-tgb b{font:700 13px var(--ff-sans, inherit);color:var(--ink)}
.vx-tg.desc .vx-tgb small{font:400 12px/1.4 var(--ff-sans, inherit);color:var(--ink-3)}
.vx-tg.desc:not(.multi) .vx-tgb.on{color:var(--ink-2);border-color:transparent;background:none}
.vx-tg.desc.multi .vx-tgb.on{background:var(--accent-soft);box-shadow:inset 0 0 0 1.5px var(--accent);border-color:transparent;color:var(--ink-2)}
.vx-mark{position:absolute;top:10px;right:10px;display:flex;align-items:center;justify-content:center;width:18px;height:18px;border:1px solid var(--line);border-radius:50%;font-size:13px;color:transparent;transform:scale(.8);transition:all .3s cubic-bezier(.3,1.5,.5,1)}
.vx-tgb.on .vx-mark{background:var(--accent);border-color:var(--accent);color:var(--on-accent,#fff);transform:scale(1)}
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
/* Rating */
.vx-rate{display:flex;align-items:center;gap:2px}
.vx-star{display:grid;place-items:center;width:36px;height:36px;border:0;background:none;color:var(--ink-4);cursor:pointer}
.vx-star svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:1.6;transition:fill .2s var(--ease-out-quart),color .2s var(--ease-out-quart),transform .18s var(--ease-out-quart)}
.vx-star:hover svg{transform:scale(1.12)}
.vx-star.on{color:var(--accent)}
.vx-star.on svg{fill:currentColor}
.vx-rout{margin-left:8px;font:600 12px var(--ff-mono, monospace);color:var(--ink-3)}
/* Tags */
.vx-tags{display:flex;flex-direction:column;gap:10px}
.vx-taglist{display:flex;flex-wrap:wrap;gap:6px}
.vx-taglist:empty{display:none}
.vx-tag{display:inline-flex;align-items:center;gap:2px;height:30px;padding:0 4px 0 12px;border-radius:15px;background:var(--accent);color:var(--on-accent,#fff);font:600 13px var(--ff-sans, inherit);transition:transform .26s cubic-bezier(.5,0,.75,0),opacity .26s ease-in}
.vx-tag.out{transform:scale(.7);opacity:0}
.vx-tag button{display:grid;place-items:center;width:22px;height:22px;border:0;border-radius:50%;background:none;color:inherit;opacity:.8;cursor:pointer}
.vx-tag button:hover{background:oklch(100% 0 0 / .2)}
.vx-tagadd{display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--line)}
.vx-tagadd input{flex:1;min-width:0;border:0;outline:none;background:none;padding:6px 0;font:inherit;color:var(--ink)}
.vx-tagadd button{border:0;background:none;color:var(--accent);font-weight:700;cursor:pointer}
.vx-tagsug{display:flex;flex-wrap:wrap;gap:6px}
.vx-tagsug button{padding:4px 10px;border:1px dashed var(--line-strong);border-radius:14px;background:none;color:var(--ink-3);font:600 12px var(--ff-sans, inherit);cursor:pointer}
.vx-tagsug button:hover{color:var(--accent);border-color:var(--accent)}
.vx-tagsug button[hidden]{display:none}
/* Dice */
.vx-dice{display:flex;flex-wrap:wrap;align-items:center;gap:22px}
.vx-dstage{flex:1 1 320px;max-width:460px;min-width:240px}
/* Coin and wheel */
.vx-coin,.vx-wheel{display:flex;flex-wrap:wrap;align-items:center;gap:22px}
.vx-side{display:flex;flex-direction:column;align-items:flex-start;gap:10px}
.vx-cscene{position:relative;flex:none;width:96px;height:120px;perspective:520px}
.vx-cface{position:absolute;left:16px;top:28px;width:64px;height:64px;transform-style:preserve-3d}
.vx-cf{position:absolute;inset:0;display:grid;place-items:center;border-radius:50%;background:var(--surface-3);border:3px solid var(--accent);box-shadow:inset 0 0 0 4px var(--surface-2);backface-visibility:hidden;transform:translateZ(2px)}
.vx-cf.back{transform:rotateY(180deg) translateZ(2px)}
.vx-cf span{max-width:46px;text-align:center;font:700 11px/1.1 var(--ff-sans, inherit);color:var(--ink);overflow-wrap:anywhere}
.vx-cshadow{position:absolute;left:20px;bottom:6px;width:56px;height:10px;border-radius:50%;background:var(--ink);opacity:.35;filter:blur(2px)}
.vx-wbox{position:relative;flex:none;width:176px;height:176px;margin-top:14px}
.vx-wrot,.vx-wrot svg{display:block;width:100%;height:100%}
.vx-wedge{fill:var(--surface-3);stroke:var(--bg);stroke-width:1.5;transition:fill .3s var(--ease-out-quart)}
.vx-wedge.odd{fill:var(--surface-2)}
.vx-wedge.win{fill:var(--accent)}
.vx-wtxt{fill:var(--ink);font-family:var(--ff-sans, inherit);font-weight:700}
.vx-wtxt.win{fill:var(--on-accent,#fff)}
.vx-whub{fill:var(--bg);stroke:var(--line);stroke-width:1.5}
.vx-wptr{position:absolute;left:50%;top:-16px;width:22px;height:26px;margin-left:-11px;fill:var(--ink);transform-origin:50% 90%}
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
.vx-starpop{animation:vx-starpop .5s cubic-bezier(.3,1.6,.5,1) backwards}
@keyframes vx-starpop{0%{transform:scale(.6) rotate(-24deg)}55%{transform:scale(1.35) rotate(8deg)}100%{transform:scale(1) rotate(0)}}
@media (prefers-reduced-motion:reduce){.vx-pop,.vx-up,.vx-down,.vx-starpop,.vx-spring,.vx-bub,.vx-tk{animation:none!important}.vx-swk,.vx-swb,.vx-tgthumb{transition:none}}
`;
  document.head.appendChild(css);

  window.PL_VT_EXTRA = {
    types: Object.keys(TYPES),
    render(type, v, m, def) { return TYPES[type] ? TYPES[type](v, m || {}, def == null ? '' : def) : null; },
    swLabels, ratingMax, reel
  };
  watch(document);
})();
