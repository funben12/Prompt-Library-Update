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
// Packet sizes that add up to the deck: each between lo and hi, the last one absorbing any remainder
const aSizes = (lo, hi) => {
  const out = []; let rem = DECK;
  while (rem > 0) {
    let n = lo + rand(hi - lo + 1);
    if (n > rem || rem - n < lo) n = rem;
    out.push(n); rem -= n;
  }
  return out;
};
// Split the cards (bottom first) into packets taken from the top: returns packets top packet first, each bottom first
const aPackets = (cards, sizes) => {
  const out = []; let top = cards.length;
  sizes.forEach(n => { out.push(cards.slice(top - n, top)); top -= n; });
  return out;
};
// Overhand: the deck sits in the left hand, the thumb peels a packet off the top, it arcs over and drops on the right hand's pile.
// Packets are of varying size, so the new order is the packets in reverse (each packet keeps its own order).
async function aOverhand(cards, S, amp, live, P, from) {
  const a = Math.min(amp, 1.4), lift = Math.min(18, 8 + 8 * a), mid = (P.L + P.R) / 2;
  const packets = aPackets(cards, aSizes(2, 4)), gap = 190, dur = 300;
  const next = [].concat.apply([], packets);
  const jit = next.map(() => [(Math.random() - 0.5) * 5, (Math.random() - 0.5) * 4]);
  const idx = new Map(cards.map((c, i) => [c, i]));
  const tiltL = -3, tiltR = 3;
  // the stack moves to the left hand
  if (Math.abs(from - P.L) > 1) {
    await all(cards.map((c, i) => c.animate([
      { transform: at(from, 0, i, 0) },
      { transform: at((from + P.L) / 2, -6, i, tiltL * 2), offset: 0.5 },
      { transform: at(P.L, 0, i, tiltL) }], { duration: 240 / S, delay: i * 6 / S, easing: 'ease-in-out', fill: 'forwards' })), (240 + DECK * 6) / S + 500);
    if (!live()) return;
  }
  cards.forEach((c, i) => lay(c, at(P.L, 0, i, tiltL)));
  // packets arc across one after another
  const anims = []; let k = 0;
  packets.forEach((pk, n) => {
    pk.forEach((c, j) => {
      const i = idx.get(c), z = 100 + k, jx = jit[k][0], jr = jit[k][1], kk = k;
      anims.push(c.animate([
        { transform: at(P.L, 0, i, tiltL), zIndex: z, easing: 'ease-out' },
        { transform: at(P.L + 10, -lift * 0.5, i, tiltL - 5), zIndex: z, offset: 0.18, easing: 'ease-in-out' },
        { transform: at(mid, -lift, (i + kk) / 2, 5 * a), zIndex: z, offset: 0.52, easing: 'ease-in' },
        { transform: at(P.R + jx, 2, kk, tiltR + jr), zIndex: z, offset: 0.88, easing: 'ease-out' },
        { transform: at(P.R + jx, 0, kk, tiltR + jr), zIndex: z }], { duration: dur / S, delay: (n * gap + j * 20) / S, fill: 'forwards' }));
      k++;
    });
  });
  await all(anims, (packets.length * gap + dur + 5 * 20) / S + 600);
  if (!live()) return;
  next.forEach((c, kk) => lay(c, at(P.R + jit[kk][0], 0, kk, tiltR + jit[kk][1]), kk + 1));
  cards.length = 0; next.forEach(c => cards.push(c));
  // the right hand carries the pile to the middle and taps it square
  await all(cards.map((c, kk) => c.animate([
    { transform: at(P.R + jit[kk][0], 0, kk, tiltR + jit[kk][1]) },
    { transform: at(P.C, -4, kk, 0), offset: 0.7 },
    { transform: at(P.C, 0, kk, 0) + ' scale(1.03,.96)', offset: 0.88 },
    { transform: at(P.C, 0, kk, 0) }], { duration: 300 / S, delay: kk * 4 / S, easing: 'ease-in-out', fill: 'forwards' })), (300 + DECK * 4) / S + 500);
  if (!live()) return;
  cards.forEach((c, kk) => lay(c, at(P.C, 0, kk, 0)));
}
aOverhand.dur = 2050;
reg('overhand', aOverhand);
// ===== END overhand =====



// ===== SHUFFLE hindu (agent A) =====
// Hindu: the deck is held lengthwise (turned 90 degrees), packets slide out of the top into a growing stack in the other hand,
// then the stack turns back upright and squares up. New order is the packets in reverse.
async function aHindu(cards, S, amp, live, P, from) {
  const a = Math.min(amp, 1.4), tbW = (cards[0].closest('.vc-table') || {}).clientWidth || 310, hs = Math.max(40, Math.min((P.R - P.L) / 2, tbW / 2 - 62)), XL = P.C - hs, XR = P.C + hs;
  const packets = aPackets(cards, aSizes(2, 4)), gap = 175, dur = 280;
  const next = [].concat.apply([], packets);
  const jit = next.map(() => [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3]);
  const idx = new Map(cards.map((c, i) => [c, i]));
  // the deck turns lengthwise into the left hand
  await all(cards.map((c, i) => c.animate([
    { transform: at(from, 0, i, 0) },
    { transform: at((from + XL) / 2, -5, i, 50), offset: 0.55 },
    { transform: at(XL, 0, i, 90) }], { duration: 300 / S, delay: i * 5 / S, easing: 'ease-in-out', fill: 'forwards' })), (300 + DECK * 5) / S + 500);
  if (!live()) return;
  cards.forEach((c, i) => lay(c, at(XL, 0, i, 90)));
  const anims = []; let k = 0;
  packets.forEach((pk, n) => {
    pk.forEach((c, j) => {
      const i = idx.get(c), z = 100 + k, jx = jit[k][0], jr = jit[k][1], kk = k;
      anims.push(c.animate([
        { transform: at(XL, 0, i, 90), zIndex: z, easing: 'ease-out' },
        { transform: at(XL + 16 * a, -2, i, 92), zIndex: z, offset: 0.26, easing: 'ease-in-out' },
        { transform: at(XR - 22, -8 * a, (i + kk) / 2, 91), zIndex: z, offset: 0.72, easing: 'ease-out' },
        { transform: at(XR + jx, 0, kk, 90 + jr), zIndex: z }], { duration: dur / S, delay: (n * gap + j * 14) / S, fill: 'forwards' }));
      k++;
    });
  });
  await all(anims, (packets.length * gap + dur + 4 * 14) / S + 600);
  if (!live()) return;
  next.forEach((c, kk) => lay(c, at(XR + jit[kk][0], 0, kk, 90 + jit[kk][1]), kk + 1));
  cards.length = 0; next.forEach(c => cards.push(c));
  // the stack turns back upright in the middle and is tapped square
  await all(cards.map((c, kk) => c.animate([
    { transform: at(XR + jit[kk][0], 0, kk, 90 + jit[kk][1]) },
    { transform: at(P.C + (XR - P.C) * 0.3, -4, kk, 30), offset: 0.6 },
    { transform: at(P.C, 0, kk, 0) + ' scale(1.03,.96)', offset: 0.88 },
    { transform: at(P.C, 0, kk, 0) }], { duration: 360 / S, delay: kk * 4 / S, easing: 'ease-in-out', fill: 'forwards' })), (360 + DECK * 4) / S + 500);
  if (!live()) return;
  cards.forEach((c, kk) => lay(c, at(P.C, 0, kk, 0)));
}
aHindu.dur = 2000;
reg('hindu', aHindu);
// ===== END hindu =====



// ===== SHUFFLE strip (agent A) =====
// Strip (running cut): small sections are stripped off the top and slid flat across to a new stack on the table,
// each landing on the last with a short pause between, so the sections end up in reverse order.
async function aStrip(cards, S, amp, live, P, from) {
  const a = Math.min(amp, 1.4), packets = aPackets(cards, aSizes(2, 5)), gap = 215, dur = 250;
  const next = [].concat.apply([], packets);
  const jit = next.map(() => [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4]);
  const idx = new Map(cards.map((c, i) => [c, i]));
  if (Math.abs(from - P.L) > 1) {
    await all(cards.map((c, i) => c.animate([
      { transform: at(from, 0, i, 0) },
      { transform: at(P.L, 0, i, 0) }], { duration: 220 / S, delay: i * 5 / S, easing: 'ease-in-out', fill: 'forwards' })), (220 + DECK * 5) / S + 500);
    if (!live()) return;
  }
  cards.forEach((c, i) => lay(c, at(P.L, 0, i, 0)));
  const anims = []; let k = 0;
  packets.forEach((pk, n) => {
    pk.forEach((c, j) => {
      const i = idx.get(c), z = 100 + k, jx = jit[k][0], jr = jit[k][1], kk = k;
      // the section fans slightly as it slides, staying close to the table
      anims.push(c.animate([
        { transform: at(P.L, 0, i, 0), zIndex: z, easing: 'ease-in' },
        { transform: at(P.L + (P.R - P.L) * 0.55 + j * 5 * a, -3, (i + kk) / 2, 2 + j), zIndex: z, offset: 0.55, easing: 'ease-out' },
        { transform: at(P.R + jx, 1, kk, jr), zIndex: z, offset: 0.9 },
        { transform: at(P.R + jx, 0, kk, jr), zIndex: z }], { duration: dur / S, delay: (n * gap + j * 12) / S, fill: 'forwards' }));
      k++;
    });
  });
  await all(anims, (packets.length * gap + dur + 5 * 12) / S + 600);
  if (!live()) return;
  next.forEach((c, kk) => lay(c, at(P.R + jit[kk][0], 0, kk, jit[kk][1]), kk + 1));
  cards.length = 0; next.forEach(c => cards.push(c));
  // the new stack slides to the middle and is squared
  await all(cards.map((c, kk) => c.animate([
    { transform: at(P.R + jit[kk][0], 0, kk, jit[kk][1]) },
    { transform: at(P.C, 0, kk, 0) + ' scale(1.03,.96)', offset: 0.85 },
    { transform: at(P.C, 0, kk, 0) }], { duration: 280 / S, delay: kk * 4 / S, easing: 'ease-in-out', fill: 'forwards' })), (280 + DECK * 4) / S + 500);
  if (!live()) return;
  cards.forEach((c, kk) => lay(c, at(P.C, 0, kk, 0)));
}
aStrip.dur = 2000;
reg('strip', aStrip);
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
// (empty: falls back to the built in shuffle until written)
// ===== END charlier =====



// ===== SHUFFLE cut (agent D) =====
// (empty: falls back to the built in shuffle until written)
// ===== END cut =====



// ===== SHUFFLE fan (agent D) =====
// (empty: falls back to the built in shuffle until written)
// ===== END fan =====


})();
