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
// (empty: falls back to the built in shuffle until written)
// ===== END wash =====



// ===== SHUFFLE pile (agent C) =====
// (empty: falls back to the built in shuffle until written)
// ===== END pile =====



// ===== SHUFFLE mongean (agent C) =====
// (empty: falls back to the built in shuffle until written)
// ===== END mongean =====





// ================ agent boundary ================





// ===== SHUFFLE charlier (agent D) =====
// Charlier cut: the lower half is pushed out and up, swings over the upper half and is dropped on top. Compact, little sideways travel.
reg('charlier', async function (cards, S, amp, live, P, from) {
  const n = cards.length, half = n >> 1, A = Math.min(amp, 1.4), C = P.C;
  const xf = f => from + (C - from) * f;
  const jit = cards.map(() => [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3]);
  const next = cards.slice(half).concat(cards.slice(0, half));
  const D = 820, anims = [];
  cards.forEach((c, i) => {
    const low = i < half, j = low ? i : i - half, k = low ? half + i : i - half;
    if (low) {
      const z = 100 + k;
      anims.push(c.animate([
        { transform: at(from, 0, i, 0), zIndex: i + 1 },
        { transform: at(xf(0.15) + 5, 0, i, 2), zIndex: i + 1, offset: 0.12 },
        { transform: at(xf(0.3) + 30 * A, -6 * A, i, 9 * A), zIndex: i + 1, offset: 0.32, easing: 'ease-in-out' },
        { transform: at(xf(0.55) + 22 * A, -12 * A, half + j, 12 * A), zIndex: z, offset: 0.34, easing: 'ease-in-out' },
        { transform: at(xf(0.8) + 6 * A, -9 * A, k, 4 * A), zIndex: z, offset: 0.7, easing: 'ease-out' },
        { transform: at(C + jit[k][0], 0, k, jit[k][1]), zIndex: z }], { duration: D / S, delay: j * 16 / S, easing: 'ease-in-out', fill: 'forwards' }));
    } else {
      anims.push(c.animate([
        { transform: at(from, 0, i, 0) },
        { transform: at(xf(0.35), 3, i, -1.5 * A), offset: 0.4, easing: 'ease-in-out' },
        { transform: at(C + jit[j][0], 0, j, jit[j][1]) }], { duration: D / S, delay: j * 6 / S, easing: 'ease-in-out', fill: 'forwards' }));
    }
  });
  await all(anims, (D + 100) / S + 600);
  if (!live()) return;
  next.forEach((c, k) => lay(c, at(C + jit[k][0], 0, k, jit[k][1]), k + 1));
  cards.length = 0; next.forEach(c => cards.push(c));
  await all(cards.map((c, k) => c.animate([
    { transform: at(C + jit[k][0], 0, k, jit[k][1]) },
    { transform: at(C, 3, k, 0) + ' scale(1.03,.96)', offset: 0.5 },
    { transform: at(C, 0, k, 0) }], { duration: 220 / S, easing: 'ease-in-out', fill: 'forwards' })), 220 / S + 600);
  if (!live()) return;
  cards.forEach((c, k) => lay(c, at(C, 0, k, 0)));
}); M.shuffles.charlier.dur = 1150;
// ===== END charlier =====



// ===== SHUFFLE cut (agent D) =====
// Plain two handed cut: the top half is lifted off and set to one side, the bottom half is lifted and placed on top of it, then a tap squares the stack.
reg('cut', async function (cards, S, amp, live, P, from) {
  const n = cards.length, half = n >> 1, A = Math.min(amp, 1.4), C = P.C;
  const Q = from < C - 20 ? C : P.L;
  const lift = 13 * A;
  const next = cards.slice(half).concat(cards.slice(0, half));
  // the upper half is lifted clear and set down to one side
  const jit = cards.map(() => [(Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2]);
  const DA = 400;
  await all(cards.slice(half).map((c, j) => c.animate([
    { transform: at(from, 0, half + j, 0) },
    { transform: at(from + (Q - from) * 0.45, -lift, half + j, -6 * A), offset: 0.45, easing: 'ease-in-out' },
    { transform: at(Q + jit[j][0], 0, j, 1.5 + jit[j][1]) }], { duration: DA / S, delay: j * 12 / S, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' })), (DA + 70) / S + 600);
  if (!live()) return;
  cards.slice(half).forEach((c, j) => lay(c, at(Q + jit[j][0], 0, j, 1.5 + jit[j][1]), half + j + 1));
  // a short pause, then the lower half is lifted and placed on top of the cut pile
  await wait(130 / S);
  if (!live()) return;
  const DB = 460;
  await all(cards.slice(0, half).map((c, i) => { const k = half + i, z = 100 + k; return c.animate([
    { transform: at(from, 0, i, 0), zIndex: i + 1 },
    { transform: at(from + (Q - from) * 0.12, -4, i, 1), zIndex: i + 1, offset: 0.12 },
    { transform: at(from + (Q - from) * 0.5, -lift - 4, i, 6 * A), zIndex: z, offset: 0.14, easing: 'ease-in-out' },
    { transform: at(Q, -lift * 0.5, k, 3 * A), zIndex: z, offset: 0.72, easing: 'ease-out' },
    { transform: at(Q + jit[k][0], 0, k, jit[k][1]), zIndex: z }], { duration: DB / S, delay: i * 12 / S, easing: 'ease-in-out', fill: 'forwards' }); }), (DB + 70) / S + 600);
  if (!live()) return;
  next.forEach((c, k) => lay(c, at(Q + jit[k][0], 0, k, jit[k][1]), k + 1));
  cards.length = 0; next.forEach(c => cards.push(c));
  await wait(90 / S);
  if (!live()) return;
  // tap to square, drifting to the table centre if the cut was made off to one side
  await all(cards.map((c, k) => c.animate([
    { transform: at(Q + jit[k][0], 0, k, jit[k][1]) },
    { transform: at(C, 3, k, 0) + ' scale(1.03,.96)', offset: 0.6 },
    { transform: at(C, 0, k, 0) }], { duration: (Q === C ? 240 : 340) / S, easing: 'ease-in-out', fill: 'forwards' })), 340 / S + 600);
  if (!live()) return;
  cards.forEach((c, k) => lay(c, at(C, 0, k, 0)));
}); M.shuffles.cut.dur = 1500;
// ===== END cut =====



// ===== SHUFFLE fan (agent D) =====
// Fan and sweep: the deck unfurls into a wide ribbon, the cards lift and trade places along it in a wave, then it is swept back into a stack.
reg('fan', async function (cards, S, amp, live, P, from) {
  const n = cards.length, mid = (n - 1) / 2, A = Math.min(amp, 1.3), C = P.C;
  const reach = Math.max(40, Math.min(C + 16, 140)) * (0.8 + 0.2 * A / 1.3), ang = 24 * A;
  // one pose on the ribbon: slot k, s closes the ribbon (1 open, 0 shut), dy lifts, sc grows
  const pose = (k, s, dy, sc) => { const u = (k - mid) / mid; return at(C + u * reach * s, (-6 + 12 * u * u) * s + (dy || 0), 0, u * ang * s) + ' scale(' + f4(sc || 1) + ')'; };
  const order = cards.slice(), next = cards.slice();
  for (let t = 0; t < 4; t++) {
    for (let i = n - 1; i > 0; i--) { const j = rand(i + 1), x = next[i]; next[i] = next[j]; next[j] = x; }
    if (next.some((c, k) => c !== order[k])) break;
  }
  // unfurl: the ribbon opens from the bottom card to the top card
  const D1 = 340, G1 = 16;
  await all(order.map((c, i) => c.animate([
    { transform: at(from, 0, i, 0) + ' scale(1)' },
    { transform: pose(i, 1.04, -3, 1.02), offset: 0.7, easing: 'ease-out' },
    { transform: pose(i, 1, 0, 1) }], { duration: D1 / S, delay: i * G1 / S, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' })), (D1 + n * G1) / S + 600);
  if (!live()) return;
  order.forEach((c, i) => lay(c, pose(i, 1, 0, 1), i + 1));
  await wait(60 / S);
  if (!live()) return;
  // mix: a wave runs along the ribbon, each card lifting, crossing over and settling in its new slot
  const D2 = 400, G2 = 22;
  await all(next.map((c, k) => { const i = order.indexOf(c), d = Math.abs(i - k), up = Math.min(20, (7 + d * 1.6) * A), z = 100 + k; return c.animate([
    { transform: pose(i, 1, 0, 1), zIndex: z },
    { transform: pose((i + k) / 2, 1, -up, 1.05), zIndex: z, offset: 0.5, easing: 'ease-in-out' },
    { transform: pose(k, 1, 0, 1), zIndex: z }], { duration: D2 / S, delay: k * G2 / S, easing: 'ease-in-out', fill: 'forwards' }); }), (D2 + n * G2) / S + 600);
  if (!live()) return;
  next.forEach((c, k) => lay(c, pose(k, 1, 0, 1), k + 1));
  cards.length = 0; next.forEach(c => cards.push(c));
  await wait(50 / S);
  if (!live()) return;
  // sweep: the ribbon is drawn together from one end, the cards slapping onto one squared stack
  const D3 = 340, G3 = 14;
  await all(cards.map((c, k) => c.animate([
    { transform: pose(k, 1, 0, 1) },
    { transform: pose(k, 0.3, -5, 1), offset: 0.55, easing: 'ease-in' },
    { transform: at(C, 0, k, 0) + ' scale(1)' }], { duration: D3 / S, delay: k * G3 / S, easing: 'ease-in-out', fill: 'forwards' })), (D3 + n * G3) / S + 600);
  if (!live()) return;
  cards.forEach((c, k) => lay(c, at(C, 0, k, 0), k + 1));
  await all(cards.map((c, k) => c.animate([
    { transform: at(C, 0, k, 0) },
    { transform: at(C, 3, k, 0) + ' scale(1.03,.96)', offset: 0.5 },
    { transform: at(C, 0, k, 0) }], { duration: 200 / S, easing: 'ease-in-out', fill: 'forwards' })), 200 / S + 600);
  if (!live()) return;
  cards.forEach((c, k) => lay(c, at(C, 0, k, 0)));
}); M.shuffles.fan.dur = 1900;
// ===== END fan =====


})();
