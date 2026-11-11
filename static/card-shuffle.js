/* card-shuffle.js: a deck of cards that splits, riffles, squares up and deals the top card face up. DOM plus CSS 3D, no library. */
(function () {
  'use strict';
  if (window.CardShuffle) return;

  var STAGE_H = 190, TILT = 34, DECK = 12, PILE_MAX = 2, STEP_Z = 1.1, STEP_Y = 0.6;
  var SAMPLES = ['Ace', 'King', 'Queen', 'Jack', 'Ten'];
  var TEXT_MAX = 17, TEXT_MIN = 8, TEXT_LH = 1.12;

  var CSS = [
    '.cs-stage{position:relative;width:100%;height:' + STAGE_H + 'px;overflow:visible;perspective:760px;perspective-origin:50% 20%;user-select:none;-webkit-user-select:none}',
    '.cs-world{position:absolute;left:50%;top:47%;width:0;height:0;transform-style:preserve-3d;transform:rotateX(' + TILT + 'deg)}',
    '.cs-card,.cs-shadow,.cs-slot{position:absolute;left:calc(var(--cs-w) / -2);top:calc(var(--cs-h) / -2);width:var(--cs-w);height:var(--cs-h);border-radius:6px}',
    '.cs-card{transform-style:preserve-3d;will-change:transform}',
    '.cs-back,.cs-face{position:absolute;inset:0;border-radius:6px;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden}',
    '.cs-back{background:var(--surface,oklch(95.2% 0.008 70));border:1px solid var(--line,oklch(85% 0.016 70))}',
    '.cs-panel{position:absolute;inset:4px;border-radius:3px;background:var(--accent,oklch(38% 0.14 190));color:var(--on-accent,oklch(97% 0.01 190));overflow:hidden}',
    '.cs-panel svg{position:absolute;inset:0;width:100%;height:100%;display:block}',
    '.cs-face{transform:rotateY(180deg);background:var(--surface,oklch(95.2% 0.008 70));border:1px solid var(--line,oklch(85% 0.016 70))}',
    '.cs-pip{position:absolute;width:6px;height:6px;background:var(--accent,oklch(38% 0.14 190));transform:rotate(45deg)}',
    '.cs-pip.a{left:6px;top:6px}.cs-pip.b{right:6px;bottom:6px}',
    '.cs-label{position:absolute;inset:14px 6px;display:flex;align-items:center;justify-content:center;text-align:center}',
    '.cs-txt,.cs-measure{font-family:inherit;font-weight:700;line-height:' + TEXT_LH + ';color:var(--ink,oklch(18% 0.04 260));overflow-wrap:normal;word-break:normal;white-space:normal;max-width:100%}',
    '.cs-txt.cs-clamp{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden;overflow-wrap:anywhere}',
    '.cs-measure{position:absolute;left:0;top:0;max-width:none;visibility:hidden;pointer-events:none;text-align:center}',
    '.cs-shadow{background:oklch(12% 0.02 260);filter:blur(5px);opacity:0;will-change:transform,opacity}',
    '.cs-slot{border:1px dashed var(--line,oklch(85% 0.016 70))}',
    '.cs-left{position:absolute;bottom:0;transform:translateX(-50%);font-family:var(--ff-mono,ui-monospace,monospace);font-size:12px;line-height:16px;color:var(--ink-3,oklch(50% 0.015 260));white-space:nowrap;font-variant-numeric:tabular-nums}'
  ].join('\n');

  function injectCss() {
    if (document.getElementById('cs-style')) return;
    var st = document.createElement('style');
    st.id = 'cs-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, u) { return a + (b - a) * u; }
  var EASE = {
    lin: function (u) { return u; },
    in: function (u) { return u * u * u; },
    out: function (u) { return 1 - Math.pow(1 - u, 3); },
    io: function (u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  };
  var FIELDS = ['x', 'y', 'z', 'rz', 'ry', 'o', 's'];
  function pose(p) { return { x: p.x || 0, y: p.y || 0, z: p.z || 0, rz: p.rz || 0, ry: p.ry || 0, o: p.o === undefined ? 1 : p.o, s: p.s === undefined ? 1 : p.s }; }
  function merge(a, b) { var o = pose(a); for (var k in b) if (b.hasOwnProperty(k)) o[k] = b[k]; return o; }

  // Build a keyed track: each key holds a full pose, the ease into it and an optional lift arc.
  function Track(p) { this.keys = [{ t: 0, p: pose(p) }]; }
  Track.prototype.at = function (t, part, ease, arc) {
    var last = this.keys[this.keys.length - 1];
    if (t < last.t) t = last.t;
    this.keys.push({ t: t, p: merge(last.p, part || {}), e: ease || 'io', arc: arc || 0 });
    return this;
  };
  Track.prototype.hold = function (t) { return this.at(t, {}, 'lin'); };
  Track.prototype.end = function () { return this.keys[this.keys.length - 1].p; };
  Track.prototype.eval = function (t) {
    var k = this.keys;
    if (t <= k[0].t) return k[0].p;
    for (var i = 1; i < k.length; i++) {
      if (t < k[i].t) {
        var a = k[i - 1], b = k[i], raw = (t - a.t) / (b.t - a.t || 1), u = EASE[b.e](raw), o = {};
        for (var f = 0; f < FIELDS.length; f++) o[FIELDS[f]] = lerp(a.p[FIELDS[f]], b.p[FIELDS[f]], u);
        if (b.arc) o.z += b.arc * Math.sin(Math.PI * raw);
        return o;
      }
    }
    return k[k.length - 1].p;
  };

  function tf(p) {
    return 'translate3d(' + p.x.toFixed(2) + 'px,' + p.y.toFixed(2) + 'px,' + p.z.toFixed(2) + 'px) rotateZ(' + p.rz.toFixed(2) +
      'deg) rotateY(' + p.ry.toFixed(2) + 'deg)' + (p.s !== 1 ? ' scale(' + p.s.toFixed(3) + ')' : '');
  }
  function put(el, p) { el.style.transform = tf(p); el.__p = p; }
  function putShadow(el, p, op) { el.style.transform = tf(p); el.style.opacity = op.toFixed(3); }

  // Draw the back pattern once: a fine diagonal hatch inside a thin frame.
  var BACK_SVG = (function () {
    var w = 100, h = 140, d = '', gap = 9;
    for (var c = -h; c < w; c += gap) d += 'M' + c + ' ' + h + 'L' + (c + h) + ' 0';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + '" stroke="currentColor" stroke-width="1.6" opacity=".32" fill="none" vector-effect="non-scaling-stroke"/>' +
      '<rect x="7" y="7" width="' + (w - 14) + '" height="' + (h - 14) + '" rx="3" stroke="currentColor" stroke-width="1" opacity=".55" fill="none" vector-effect="non-scaling-stroke"/></svg>';
  })();

  function makeCard(st) {
    var c = document.createElement('div');
    c.className = 'cs-card';
    c.innerHTML = '<div class="cs-back"><div class="cs-panel">' + BACK_SVG + '</div></div><div class="cs-face"><i class="cs-pip a"></i><i class="cs-pip b"></i><div class="cs-label"></div></div>';
    c.__j = { x: rnd(-0.5, 0.5), rz: rnd(-0.8, 0.8) };
    st.world.appendChild(c);
    return c;
  }

  // Find the largest bold size that fits the face, else clamp at the minimum.
  function fitText(st, text) {
    if (st.fit[text]) return st.fit[text];
    var m = st.measure, bw = st.cw - 12, bh = st.ch - 28, out = null;
    m.style.width = bw + 'px';
    m.textContent = text;
    for (var s = TEXT_MAX; s >= TEXT_MIN; s--) {
      m.style.fontSize = s + 'px';
      if (m.scrollHeight <= bh + 0.5 && m.scrollWidth <= bw + 0.5) { out = { size: s, clamp: false }; break; }
    }
    if (!out) out = { size: TEXT_MIN, clamp: true };
    if (bw > 0) st.fit[text] = out;
    return out;
  }

  function setFace(st, card, text) {
    var lab = card.querySelector('.cs-label'), fit = fitText(st, text), span = document.createElement('span');
    span.className = 'cs-txt' + (fit.clamp ? ' cs-clamp' : '');
    span.style.fontSize = fit.size + 'px';
    span.textContent = text;
    lab.innerHTML = '';
    lab.appendChild(span);
    card.__v = text;
  }

  function geometry(st) {
    var w = st.stage.clientWidth || 360;
    st.cw = w >= 520 ? 74 : 64;
    st.ch = Math.round(st.cw * 1.406);
    st.dx = -Math.max(54, Math.min(96, w * 0.17));
    st.sx = -st.dx;
    st.stage.style.setProperty('--cs-w', st.cw + 'px');
    st.stage.style.setProperty('--cs-h', st.ch + 'px');
    st.leftEl.style.left = 'calc(50% + ' + st.dx + 'px)';
  }

  function rest(st, card, k) { return pose({ x: st.dx + card.__j.x, y: -k * STEP_Y, z: k * STEP_Z + 0.5, rz: card.__j.rz }); }
  function pileTop(st, i) { return i * STEP_Z + 0.6; }

  function normCards(cards) {
    var out = [];
    if (cards && typeof cards.length === 'number' && typeof cards !== 'string') {
      for (var i = 0; i < cards.length; i++) {
        if (cards[i] === null || cards[i] === undefined) continue;
        var t = String(cards[i]).trim();
        if (t) out.push(t);
      }
    }
    return out.length ? out : SAMPLES.slice();
  }

  function setLeft(st, n) { st.leftEl.textContent = n + ' left'; }

  // Lay every card at rest with no animation.
  function layout(st) {
    geometry(st);
    st.deck.forEach(function (c, k) { put(c, rest(st, c, k)); });
    st.pile.forEach(function (c) { put(c, c.__rest); });
    putShadow(st.deckShadow, pose({ x: st.dx, y: 3, z: 0.1, s: 1.02 }), 0.2);
    putShadow(st.pileShadow, pose({ x: st.sx, y: 3, z: 0.1, s: 1.02 }), st.pile.length ? 0.2 : 0);
    put(st.slot, pose({ x: st.sx, z: 0.05 }));
    putShadow(st.liftShadow, pose({ x: st.sx }), 0);
    setLeft(st, st.left.length);
  }

  function sameList(a, b) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }

  function setOptions(st, cards) {
    var list = normCards(cards);
    if (st.all && sameList(st.all, list)) return;
    st.all = list;
    st.left = list.slice();
    var v = st.pile.length ? st.pile[st.pile.length - 1].__v : '';
    var i = v ? st.left.indexOf(v) : -1;
    if (i >= 0) st.left.splice(i, 1);
  }

  function mount(el, value, cards) {
    if (!el) return;
    injectCss();
    if (el.__cs && el.contains(el.__cs.stage)) {
      if (!el.__cs.drawing) setOptions(el.__cs, cards);
      show(el, value);
      return;
    }
    var st = { deck: [], pile: [], left: [], fit: {}, drawing: null };
    var stage = document.createElement('div');
    stage.className = 'cs-stage';
    stage.setAttribute('role', 'img');
    var world = document.createElement('div');
    world.className = 'cs-world';
    stage.appendChild(world);
    var left = document.createElement('div');
    left.className = 'cs-left';
    left.setAttribute('aria-live', 'polite');
    stage.appendChild(left);
    var measure = document.createElement('div');
    measure.className = 'cs-measure';
    measure.setAttribute('aria-hidden', 'true');
    stage.appendChild(measure);
    el.innerHTML = '';
    el.appendChild(stage);
    st.stage = stage; st.world = world; st.leftEl = left; st.measure = measure;
    st.slot = document.createElement('div'); st.slot.className = 'cs-slot'; world.appendChild(st.slot);
    st.deckShadow = document.createElement('div'); st.deckShadow.className = 'cs-shadow'; world.appendChild(st.deckShadow);
    st.pileShadow = document.createElement('div'); st.pileShadow.className = 'cs-shadow'; world.appendChild(st.pileShadow);
    st.liftShadow = document.createElement('div'); st.liftShadow.className = 'cs-shadow'; world.appendChild(st.liftShadow);
    el.__cs = st;
    geometry(st);
    for (var i = 0; i < DECK; i++) st.deck.push(makeCard(st));
    show(el, value);
    setOptions(st, cards);
    setLeft(st, st.left.length);
  }

  function show(el, value) {
    if (!el) return;
    if (!el.__cs) { mount(el, value); return; }
    var st = el.__cs;
    if (st.drawing) return;
    geometry(st);
    var v = value === null || value === undefined ? '' : String(value).trim();
    if (!v) {
      while (st.pile.length) st.deck.push(st.pile.pop());
    } else {
      if (!st.pile.length) {
        var c = st.deck.pop();
        c.__rest = pose({ x: st.sx + rnd(-1.5, 1.5), y: rnd(-1, 1), z: pileTop(st, 0), rz: rnd(-4, 4), ry: 180 });
        st.pile.push(c);
      }
      setFace(st, st.pile[st.pile.length - 1], v);
    }
    st.value = v;
    layout(st);
    st.stage.setAttribute('aria-label', v ? 'Card drawn: ' + v : 'Deck of cards, face down');
  }

  // Plan the whole shuffle and draw as keyed tracks, a little different every time.
  function plan(st, value, reshuffle) {
    var acts = [], t0 = 0, cw = st.cw;
    var order = st.deck.slice();
    var events = [];

    // Gather the face up pile, turn it over and drop it on the deck.
    if (reshuffle && st.pile.length) {
      var back = st.pile.slice().reverse();
      back.forEach(function (c, q) {
        var tr = new Track(c.__p);
        var k = order.length + q;
        tr.at(0.05 + q * 0.03, { z: c.__p.z + 2 }, 'out').at(0.34, merge(rest(st, c, k), { ry: 360 }), 'io', 26);
        tr.at(0.341, rest(st, c, k), 'lin');
        acts.push({ el: c, tr: tr });
      });
      order = order.concat(back);
      events.push({ t: 0.34, fn: function () { setLeft(st, st.all.length); } });
      t0 = 0.34;
    }
    var n = order.length;
    var cut = Math.max(2, Math.min(n - 2, Math.round(n / 2 + rnd(-1.6, 1.6))));
    var halves = [order.slice(0, cut), order.slice(cut)];
    var tilt = rnd(4, 7), bend1 = rnd(8, 12), bend2 = rnd(20, 26), dt = reshuffle ? 0.044 : 0.052;
    var ho1 = cw * 0.5 + rnd(14, 20), ho2 = cw * 0.5 + 2, land = cw * 0.3;
    var tSplit = t0 + 0.24, tIn = t0 + 0.40;

    // Interleave from the bottom of each half, mostly alternating with the odd clump.
    var seq = [], ia = 0, ib = 0, side = Math.random() < 0.5 ? 0 : 1;
    while (ia < halves[0].length || ib < halves[1].length) {
      if (side === 0 && ia >= halves[0].length) side = 1;
      if (side === 1 && ib >= halves[1].length) side = 0;
      seq.push(side === 0 ? { c: halves[0][ia], s: -1, j: ia++ } : { c: halves[1][ib], s: 1, j: ib++ });
      if (Math.random() < 0.74) side = 1 - side;
    }
    var fallAt = [], tt = tIn + 0.02;
    for (var k = 0; k < seq.length; k++) { fallAt.push(tt); tt += dt * rnd(0.7, 1.3); }
    var fallDur = 0.14, tDown = fallAt[seq.length - 1] + fallDur, tSq = tDown + 0.17, tTap = tSq + 0.07, tSettle = tTap + 0.11;

    // Fan each half: upper cards bend further so the inner edges spread like a real riffle.
    function half(s, j, ho, bend, lift) {
      var b = bend + j * 1.6, r = b * Math.PI / 180;
      return { x: st.dx + s * ho + s * j * 0.4, y: 3 - j * 1.1 - lift, z: (cw / 2) * Math.sin(r) + 1 + j * 1.6, rz: -s * tilt, ry: s * b };
    }

    seq.forEach(function (it, k) {
      var c = it.c, i0 = order.indexOf(c), from = c.__p && acts.every(function (a) { return a.el !== c; }) ? c.__p : rest(st, c, i0);
      var tr = acts.filter(function (a) { return a.el === c; })[0];
      if (!tr) { tr = { el: c, tr: new Track(from) }; acts.push(tr); }
      tr = tr.tr;
      var lag = it.s > 0 ? 0 : 0.03, waitBend = bend2 + 9 * Math.min(1, (fallAt[k] - tIn) / 0.6);
      tr.hold(t0 + lag)
        .at(tSplit + lag, half(it.s, it.j, ho1, bend1, 4), 'out')
        .at(tIn, half(it.s, it.j, ho2, bend2, 2), 'io')
        .at(fallAt[k], half(it.s, it.j, ho2, waitBend, 2), 'lin')
        .at(fallAt[k] + fallDur, { x: st.dx + it.s * (land + rnd(-2, 3)), y: -k * STEP_Y + rnd(-1.5, 1.5), z: k * STEP_Z + 0.5, rz: it.s * rnd(1, 3.5), ry: 0 }, 'in');
      var r = rest(st, c, k);
      tr.hold(tDown)
        .at(tSq, merge(r, { y: r.y - 2, z: r.z + 6 }), 'io')
        .at(tTap, r, 'in')
        .at(tTap + 0.05, { z: r.z + 0.8 }, 'out')
        .at(tSettle, r, 'in');
    });

    // Deal the top card: slide it off, lift it, flip it face up and drop it on the pile.
    var top = seq[seq.length - 1].c, tr = acts.filter(function (a) { return a.el === top; })[0].tr;
    var rs = tr.end(), keepPile = reshuffle ? 0 : st.pile.length;
    var tSlide = tSettle + 0.24, tLand = tSlide + 0.58, tEnd = tLand + 0.16;
    var landPose = { x: st.sx + rnd(-2, 2), y: rnd(-1.5, 1.5), z: pileTop(st, keepPile), rz: rnd(-5, 5), ry: 180 };
    tr.hold(tSettle + 0.02)
      .at(tSlide, { x: rs.x + cw * 0.46, y: rs.y + rnd(-2, 2), z: rs.z + 1.2, rz: rs.rz - rnd(1, 3) }, 'io')
      .at(tLand, landPose, 'io', 58)
      .at(tLand + 0.07, { z: landPose.z + 2.4 }, 'out')
      .at(tEnd, { z: landPose.z }, 'in');
    top.__rest = pose(landPose);
    events.push({ t: tSlide - 0.08, fn: function () { setLeft(st, st.left.length); } });

    // Shadows follow the halves and the dealt card.
    var dsh = new Track({ x: st.dx, y: 3, z: 0.1, s: 1.02, o: 0.2 });
    dsh.at(t0 + 0.04, {}, 'lin').at(tSplit, { o: 0.05 }, 'out').at(tDown, { o: 0.16 }, 'lin').at(tSettle, { o: 0.2 }, 'out');
    var psh = new Track({ x: st.sx, y: 3, z: 0.1, s: 1.02, o: st.pile.length ? 0.2 : 0 });
    if (reshuffle) psh.at(0.3, { o: 0 }, 'out');
    psh.at(tLand - 0.04, {}, 'lin').at(tLand, { o: 0.2 }, 'out');
    acts.push({ el: st.deckShadow, tr: dsh, shadow: true }, { el: st.pileShadow, tr: psh, shadow: true }, { el: st.liftShadow, lift: top, shadow: true });

    var deck = seq.map(function (it) { return it.c; }).filter(function (c) { return c !== top; });
    return { acts: acts, events: events, total: tEnd, top: top, deck: deck, keepPile: keepPile };
  }

  function renderLift(st, el, card) {
    var p = card.__p;
    if (!p) return;
    var h = Math.max(0, p.z - 1.5), k = Math.min(1, h / 70), flat = Math.max(0.15, Math.abs(Math.cos(p.ry * Math.PI / 180)));
    var sp = pose({ x: p.x + h * 0.1, y: p.y + h * 0.35, z: 0.15, rz: p.rz, s: 1 + k * 0.25 });
    el.style.transform = tf(sp) + ' scaleX(' + flat.toFixed(3) + ')';
    el.style.opacity = (h > 3 ? 0.24 * (1 - k * 0.55) : 0).toFixed(3);
  }

  function draw(el, cards) {
    if (!el) return Promise.resolve('');
    if (!el.__cs) mount(el, '', cards);
    var st = el.__cs;
    if (st.drawing) return st.drawing;
    if (cards !== undefined) setOptions(st, cards);
    geometry(st);
    var reshuffle = !st.left.length;
    if (reshuffle) st.left = st.all.slice();
    var value = st.left.splice(Math.floor(Math.random() * st.left.length), 1)[0];
    // Reduced motion: lay the drawn card face up at once
    var still = false;
    try { still = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (still) { show(el, value); setLeft(st, st.left.length); return Promise.resolve(value); }
    var p = plan(st, value, reshuffle);
    setFace(st, p.top, value);
    st.stage.setAttribute('aria-label', 'Shuffling the deck');
    var promise = new Promise(function (resolve) {
      var start = null, done = false, ev = p.events.slice();
      function frame(t) {
        p.acts.forEach(function (a) {
          if (a.lift) renderLift(st, a.el, a.lift);
          else if (a.shadow) { var q = a.tr.eval(t); putShadow(a.el, q, q.o); }
          else put(a.el, a.tr.eval(t));
        });
        while (ev.length && ev[0].t <= t) ev.shift().fn();
      }
      function finish() {
        if (done) return;
        done = true;
        frame(p.total);
        ev.forEach(function (e) { e.fn(); });
        if (reshuffle) st.pile = [];
        st.pile.push(p.top);
        st.deck = p.deck;
        // Keep the pile small: retire the buried card and put a fresh one under the deck.
        while (st.pile.length > PILE_MAX) {
          var old = st.pile.shift();
          old.parentNode && old.parentNode.removeChild(old);
          var fresh = makeCard(st);
          st.deck.unshift(fresh);
        }
        st.pile.forEach(function (c, i) { c.__rest = merge(c.__rest, { z: pileTop(st, i) }); });
        st.value = value;
        st.drawing = null;
        layout(st);
        st.stage.setAttribute('aria-label', 'Card drawn: ' + value);
        resolve(value);
      }
      function tick() {
        if (done) return;
        var now = performance.now();
        if (start === null) start = now;
        var t = (now - start) / 1000;
        if (t >= p.total || !el.isConnected) { finish(); return; }
        frame(t);
        requestAnimationFrame(tick);
      }
      frame(0);
      requestAnimationFrame(tick);
      setTimeout(finish, p.total * 1000 + 1500);
    });
    promise.plan = { total: p.total, value: value, reshuffle: reshuffle };
    st.drawing = promise;
    return promise;
  }

  window.CardShuffle = { mount: mount, draw: draw, show: show };
})();
