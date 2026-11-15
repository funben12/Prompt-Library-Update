// Card deck shuffles. Each deck_<id> variable type (see vartypes-3d.js, DECK_STYLES) runs the shuffle registered here under its id.
// Contract: async function (cards, S, amp, live, P, from)
//   cards : the 12 .vc-c elements, bottom card first. Reorder this array IN PLACE to the new order.
//   S     : speed factor (divide every duration by S). amp: 0.6 to 1.4, intensity (scale movement and tilt by it).
//   live(): false once the draw was skipped. Check it after every await and return at once if false.
//   P     : { L, R, C } x offsets on this table: left spot, right spot and the centre, measured from the deck's home spot.
//   from  : x offset where the stack starts (0 at home, P.C when it is the second pass).
// Start: the stack is squared at x = from, card i at at(from, 0, i, 0). End: squared at the table centre, lay(c, at(P.C, 0, k, 0), k + 1) for every card k.
// Use Web Animations API (c.animate(..., { fill: 'forwards' })), never CSS transitions. Always end with lay() so no animation is left running.
// Set fn.dur to the shuffle's length in ms at S = 1 (a watchdog lands the result if it runs far past this).
// Helpers from PL_MOTION.deck: DECK (12), at(x, y, i, rotDeg), base(i), lay(el, transform, z), all(anims, capMs), wait(ms), rand(n), f4(n).
(function () {
  'use strict';
  const M = window.PL_MOTION;
  if (!M || !M.deck || !M.shuffles) return;
  const { DECK, at, base, lay, all, wait, rand, f4 } = M.deck;
  const reg = (id, fn) => { M.shuffles[id] = fn; };


// ===== SHUFFLE overhand (agent A) =====
// (empty: falls back to the built in shuffle until written)
// ===== END overhand =====



// ===== SHUFFLE hindu (agent A) =====
// (empty: falls back to the built in shuffle until written)
// ===== END hindu =====



// ===== SHUFFLE strip (agent A) =====
// (empty: falls back to the built in shuffle until written)
// ===== END strip =====





// ================ agent boundary ================





// ===== SHUFFLE riffle (agent B) =====
// (empty: falls back to the built in shuffle until written)
// ===== END riffle =====



// ===== SHUFFLE faro (agent B) =====
// (empty: falls back to the built in shuffle until written)
// ===== END faro =====



// ===== SHUFFLE cascade (agent B) =====
// (empty: falls back to the built in shuffle until written)
// ===== END cascade =====





// ================ agent boundary ================





// ===== SHUFFLE wash (agent C) =====
{
  // Wash (scramble): the stack spreads into a loose scatter, both hands swirl it round, then it is pushed back into one stack.
  const geom = (cards) => {
    const dk = cards[0].parentNode, tb = dk.parentNode;
    const W = tb.clientWidth || 310, home = dk.offsetLeft || 44, cw = dk.offsetWidth || 76;
    return { xlo: 12 - home, xhi: W - cw - home - 12 };
  };
  async function wash(cards, S, amp, live, P, from) {
    const n = cards.length, g = geom(cards), cx = (g.xlo + g.xhi) / 2, ax = Math.max(30, (g.xhi - g.xlo) / 2 - 12), ay = 7 + 2.5 * Math.min(amp, 1.4), cy = -1;
    const dir = Math.random() < 0.5 ? 1 : -1, rotMax = 18 + 12 * Math.min(amp, 1.4);
    // each card gets a polar spot on an ellipse, a turn, and a place in the new order
    const spot = cards.map(() => ({ r: 0.3 + Math.random() * 0.7, th: Math.random() * Math.PI * 2, rot: (Math.random() * 2 - 1) * rotMax, sweep: dir * Math.PI * (1.2 + Math.random() * 0.8) * (0.8 + 0.3 * Math.min(amp, 1.4)) }));
    const pos = (s, t, wob) => {
      const th = s.th + s.sweep * t, r = s.r * (1 - 0.18 * wob * Math.sin(t * Math.PI * 2));
      return [cx + ax * r * Math.cos(th), cy + ay * r * Math.sin(th), s.rot + (t * s.sweep * 180 / Math.PI) * 0.35];
    };
    const zs = cards.map((c, i) => i).sort(() => Math.random() - 0.5);
    // spread: the stack opens out over the table
    const spread = cards.map((c, i) => { const s = spot[i], p = pos(s, 0, 0);
      return c.animate([{ transform: at(from, 0, i, 0), zIndex: 100 + zs[i] }, { transform: at(from + (p[0] - from) * 0.6, p[1] * 0.5, i * 0.4, p[2] * 0.6), zIndex: 100 + zs[i], offset: 0.55 }, { transform: at(p[0], p[1], 0, p[2]), zIndex: 100 + zs[i] }], { duration: 340 / S, delay: (n - 1 - i) * 14 / S, easing: 'cubic-bezier(.25,.8,.3,1)', fill: 'forwards' }); });
    await all(spread, (340 + n * 14) / S + 600);
    if (!live()) return;
    // swirl: the whole scatter circles round, cards drifting over and under each other
    const STEPS = 8, swirl = cards.map((c, i) => { const s = spot[i], z2 = 100 + ((zs[i] + 5) % n), kf = [];
      for (let q = 0; q <= STEPS; q++) { const p = pos(s, q / STEPS, 1); kf.push({ transform: at(p[0], p[1], 0, p[2]), zIndex: q < STEPS / 2 ? 100 + zs[i] : z2 }); }
      return c.animate(kf, { duration: 900 / S, easing: 'ease-in-out', fill: 'forwards' }); });
    await all(swirl, 900 / S + 600);
    if (!live()) return;
    const last = spot.map(s => pos(s, 1, 1));
    cards.forEach((c, i) => lay(c, at(last[i][0], last[i][1], 0, last[i][2]), 100 + ((zs[i] + 5) % n)));
    // push back together in a new random order
    const next = cards.slice().sort(() => Math.random() - 0.5), jit = next.map(() => [(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 5]);
    const back = next.map((c, k) => { const i = cards.indexOf(c);
      return c.animate([{ transform: at(last[i][0], last[i][1], 0, last[i][2]), zIndex: 200 + k }, { transform: at((last[i][0] + P.C) / 2, last[i][1] * 0.5, 0, last[i][2] * 0.4), zIndex: 200 + k, offset: 0.5 }, { transform: at(P.C + jit[k][0], 0, k, jit[k][1]), zIndex: 200 + k }], { duration: 300 / S, delay: k * 22 / S, easing: 'ease-in-out', fill: 'forwards' }); });
    await all(back, (300 + n * 22) / S + 600);
    if (!live()) return;
    next.forEach((c, k) => lay(c, at(P.C + jit[k][0], 0, k, jit[k][1]), k + 1));
    cards.length = 0; next.forEach(c => cards.push(c));
    await all(cards.map((c, k) => c.animate([{ transform: at(P.C + jit[k][0], 0, k, jit[k][1]) }, { transform: at(P.C, 3, k, 0) + ' scale(1.03,.96)', offset: 0.5 }, { transform: at(P.C, 0, k, 0) }], { duration: 200 / S, easing: 'ease-in-out', fill: 'forwards' })), 200 / S + 600);
    if (!live()) return;
    cards.forEach((c, k) => lay(c, at(P.C, 0, k, 0), k + 1));
  }
  wash.dur = 340 + 12 * 14 + 900 + 300 + 12 * 22 + 200;
  reg('wash', wash);
}
// ===== END wash =====



// ===== SHUFFLE pile (agent C) =====
{
  // Pile shuffle: deal the cards one at a time into separate piles in rotation, then scoop the piles together in a chosen order.
  async function pile(cards, S, amp, live, P, from) {
    const n = cards.length, dk = cards[0].parentNode, tb = dk.parentNode;
    const W = tb.clientWidth || 310, home = dk.offsetLeft || 44, cw = dk.offsetWidth || 76;
    const xlo = 14 - home, xhi = W - cw - home - 14;
    const np = (xhi - xlo) / 3 >= 66 ? 4 : 3, xs = Array.from({ length: np }, (_, p) => xlo + (xhi - xlo) * p / (np - 1));
    const lift = Math.max(10, 14 * Math.min(amp, 1.4)), step = 62, dur = 230;
    // dealing: the top card goes to pile 0, then 1, 2, ... round again
    const dealt = cards.slice().reverse(), piles = Array.from({ length: np }, () => []);
    const jit = dealt.map(() => [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4]);
    const anims = dealt.map((c, d) => {
      const p = d % np, h = piles[p].length, i = cards.indexOf(c), z = 100 + d; piles[p].push(c);
      return c.animate([
        { transform: at(from, 0, i, 0), zIndex: z },
        { transform: at(from + (xs[p] - from) * 0.5, -lift, i, (xs[p] - from) / 20), zIndex: z, offset: 0.45, easing: 'ease-in' },
        { transform: at(xs[p] + jit[d][0], 0, h, jit[d][1]), zIndex: z }], { duration: dur / S, delay: d * step / S, easing: 'ease-out', fill: 'forwards' });
    });
    await all(anims, (n * step + dur) / S + 600);
    if (!live()) return;
    piles.forEach((pl, p) => pl.forEach((c, h) => { const d = dealt.indexOf(c); lay(c, at(xs[p] + jit[d][0], 0, h, jit[d][1]), 100 + p * 20 + h); }));
    await wait(170 / S);
    if (!live()) return;
    // gather in a chosen order: each pile is scooped onto the one before
    const order = piles.map((_, p) => p).sort(() => Math.random() - 0.5), next = [];
    order.forEach(p => piles[p].forEach(c => next.push(c)));
    const gap = 150, gd = 250, scoop = [];
    order.forEach((p, o) => piles[p].forEach((c, h) => {
      const k = next.indexOf(c), d = dealt.indexOf(c), z = 300 + k;
      scoop.push(c.animate([
        { transform: at(xs[p] + jit[d][0], 0, h, jit[d][1]), zIndex: z },
        { transform: at((xs[p] + P.C) / 2, -lift * 0.7, h, 0), zIndex: z, offset: 0.5, easing: 'ease-in' },
        { transform: at(P.C, 0, k, 0), zIndex: z }], { duration: gd / S, delay: (o * gap + h * 14) / S, easing: 'ease-in-out', fill: 'forwards' }));
    }));
    await all(scoop, (np * gap + gd + 14 * n) / S + 600);
    if (!live()) return;
    next.forEach((c, k) => lay(c, at(P.C, 0, k, 0), k + 1));
    cards.length = 0; next.forEach(c => cards.push(c));
    await all(cards.map((c, k) => c.animate([{ transform: at(P.C, 0, k, 0) }, { transform: at(P.C, 3, k, 0) + ' scale(1.03,.96)', offset: 0.5 }, { transform: at(P.C, 0, k, 0) }], { duration: 180 / S, easing: 'ease-in-out', fill: 'forwards' })), 180 / S + 600);
    if (!live()) return;
    cards.forEach((c, k) => lay(c, at(P.C, 0, k, 0), k + 1));
  }
  pile.dur = 12 * 62 + 230 + 170 + 4 * 150 + 250 + 14 * 12 + 180;
  reg('pile', pile);
}
// ===== END pile =====



// ===== SHUFFLE mongean (agent C) =====
{
  // Mongean: cards are dealt one at a time into a new pile, alternately on top and underneath, so it grows from the middle outwards.
  async function mongean(cards, S, amp, live, P, from) {
    const n = cards.length, X = from < P.C - 1 ? P.R : P.L, dirn = X > from ? 1 : -1, lift = Math.max(12, 18 * Math.min(amp, 1.4));
    const src = cards.slice().reverse();
    // card d: the first is the base, odd ones go on top (height +1, +2 ...), even ones go underneath (height -1, -2 ...)
    const hOf = d => (d === 0 ? 0 : d % 2 ? (d + 1) / 2 : -d / 2), lo = Math.floor((n - 1) / 2);
    const next = new Array(n);
    src.forEach((c, d) => { next[hOf(d) + lo] = c; });
    const step = 84, dur = 240, jit = src.map(() => [(Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2.5]);
    const anims = src.map((c, d) => {
      const h = hOf(d), i = cards.indexOf(c), top = d % 2 === 1 || d === 0, zFin = 100 + h + lo, tx = X + jit[d][0];
      const kf = top ? [
        { transform: at(from, 0, i, 0), zIndex: 400 + d },
        { transform: at(from + (X - from) * 0.55, -lift, i, dirn * 6), zIndex: 400 + d, offset: 0.5, easing: 'ease-in' },
        { transform: at(tx, 0, h, jit[d][1]), zIndex: zFin }] : [
        { transform: at(from, 0, i, 0), zIndex: 400 + d },
        { transform: at(from + (X - from) * 0.5, -lift * 0.6, i, dirn * 5), zIndex: 400 + d, offset: 0.4, easing: 'ease-in' },
        { transform: at(X - dirn * 30, 7, h, dirn * 3), zIndex: 50, offset: 0.7 },
        { transform: at(tx, 0, h, jit[d][1]), zIndex: zFin }];
      return c.animate(kf, { duration: dur / S, delay: d * step / S, easing: 'ease-out', fill: 'forwards' });
    });
    await all(anims, (n * step + dur) / S + 600);
    if (!live()) return;
    src.forEach((c, d) => lay(c, at(X + jit[d][0], 0, hOf(d), jit[d][1]), 100 + hOf(d) + lo));
    cards.length = 0; next.forEach(c => cards.push(c));
    // slide the finished pile to the centre and tap it square
    await all(cards.map((c, k) => { const d = src.indexOf(c);
      return c.animate([{ transform: at(X + jit[d][0], 0, k - lo, jit[d][1]) }, { transform: at(P.C, 3, k, 0) + ' scale(1.03,.96)', offset: 0.7 }, { transform: at(P.C, 0, k, 0) }], { duration: 300 / S, easing: 'ease-in-out', fill: 'forwards' }); }), 300 / S + 600);
    if (!live()) return;
    cards.forEach((c, k) => lay(c, at(P.C, 0, k, 0), k + 1));
  }
  mongean.dur = 12 * 84 + 240 + 300;
  reg('mongean', mongean);
}
// ===== END mongean =====





// ================ agent boundary ================





// ===== SHUFFLE charlier (agent D) =====
// (empty: falls back to the built in shuffle until written)
// ===== END charlier =====



// ===== SHUFFLE cut (agent D) =====
// (empty: falls back to the built in shuffle until written)
// ===== END cut =====



// ===== SHUFFLE fan (agent D) =====
// (empty: falls back to the built in shuffle until written)
// ===== END fan =====


})();
