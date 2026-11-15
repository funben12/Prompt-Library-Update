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
// Shared helpers for riffle, faro and cascade (all in this agent B block; the other two sections use them).
const shBMid = (k, n) => (k - (n - 1) / 2) / ((n - 1) / 2);
// the stack bent into an arch: the middle rises and widens, the ends stay down; t scales the bend
const shBArch = (cx, k, n, h, t, jx, jr) => {
  const m = shBMid(k, n), q = 1 - m * m;
  return at(cx + (jx || 0) * (1 - t) + m * 9 * t, -h * q * t, k, (jr || 0) * (1 - t) + m * 7 * t) + (t ? ` scale(${f4(1 + 0.04 * q * t)})` : '');
};
// cut the squared stack at x = from into a lower half (left) and an upper half (right), each tilted towards the other
async function shBCut(order, S, live, P, from, tilt, lift) {
  const half = DECK / 2, sx = left => (left ? P.L : P.R);
  const pose = (left, j) => at(sx(left), left ? 0 : -3, j, left ? tilt : -tilt);
  await all(order.map((c, i) => {
    const left = i < half, j = left ? i : i - half, mx = from + (sx(left) - from) * 0.5;
    return c.animate([
      { transform: at(from, 0, i, 0) },
      { transform: at(mx, left ? -4 : -lift, j, left ? tilt * 0.5 : -tilt * 0.5), offset: 0.45 },
      { transform: pose(left, j) }], { duration: 300 / S, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
  }), 300 / S + 600);
  if (!live()) return false;
  order.forEach((c, i) => { const left = i < half; lay(c, pose(left, left ? i : i - half)); });
  return true;
}
// interleave the two halves, each keeping its own order; the bottom of each half falls first
function shBWeave(order) {
  const half = DECK / 2, L = order.slice(0, half), R = order.slice(half), next = [], startLeft = Math.random() < 0.5;
  for (let k = 0; k < DECK; k++) {
    const useLeft = (k % 2 === 0) === startLeft;
    next.push(useLeft ? (L.length ? L.shift() : R.shift()) : (R.length ? R.shift() : L.shift()));
  }
  return next;
}
// tap the stack square on the table
async function shBTap(cards, S, live, P, jit, ms) {
  await all(cards.map((c, k) => c.animate([
    { transform: at(P.C + (jit ? jit[k][0] : 0), 0, k, jit ? jit[k][1] : 0) },
    { transform: at(P.C, 3, k, 0) + ' scale(1.03,.96)', offset: 0.5 },
    { transform: at(P.C, 0, k, 0) }], { duration: (ms || 200) / S, easing: 'ease-in-out', fill: 'forwards' })), (ms || 200) / S + 600);
  if (!live()) return false;
  cards.forEach((c, k) => lay(c, at(P.C, 0, k, 0), k + 1));
  return true;
}
async function shBRiffle(cards, S, amp, live, P, from) {
  const half = DECK / 2, order = cards.slice(), A = Math.min(amp, 1.4), tilt = 9 * A, lift = Math.max(10, 14 * A);
  if (!(await shBCut(order, S, live, P, from, tilt, lift))) return;
  // riffle: thumbs release the corners, one card from each half in turn, onto one stack in the centre
  const next = shBWeave(order), jit = next.map(() => [(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 5]);
  const anims = next.map((c, k) => {
    const i = order.indexOf(c), left = i < half, j = left ? i : i - half, x0 = left ? P.L : P.R, z = 100 + k;
    return c.animate([
      { transform: at(x0, left ? 0 : -3, j, left ? tilt : -tilt), zIndex: z },
      { transform: at(x0 + (P.C - x0) * 0.55, -lift, k, (left ? tilt : -tilt) * 0.3), zIndex: z, offset: 0.5, easing: 'ease-in' },
      { transform: at(P.C + jit[k][0], 0, k, jit[k][1]), zIndex: z }], { duration: 210 / S, delay: k * 55 / S, easing: 'ease-out', fill: 'forwards' });
  });
  await all(anims, (DECK * 55 + 210) / S + 600);
  if (!live()) return;
  next.forEach((c, k) => lay(c, at(P.C + jit[k][0], 0, k, jit[k][1]), k + 1));
  cards.length = 0; next.forEach(c => cards.push(c));
  // bridge: both thumbs push in and the stack bows up in the middle ...
  const h = 16 * Math.min(A, 1.1), n = cards.length;
  await all(cards.map((c, k) => c.animate([
    { transform: shBArch(P.C, k, n, h, 0, jit[k][0], jit[k][1]) },
    { transform: shBArch(P.C, k, n, h, 1, 0, 0) }], { duration: 240 / S, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' })), 240 / S + 600);
  if (!live()) return;
  cards.forEach((c, k) => lay(c, shBArch(P.C, k, n, h, 1, 0, 0)));
  // ... then lets go: the arch springs flat, a little past square, and settles
  await all(cards.map((c, k) => c.animate([
    { transform: shBArch(P.C, k, n, h, 1, 0, 0) },
    { transform: at(P.C, 3, k, 0) + ' scale(1.03,.96)', offset: 0.55, easing: 'ease-out' },
    { transform: at(P.C, 0, k, 0) }], { duration: 260 / S, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' })), 260 / S + 600);
  if (!live()) return;
  cards.forEach((c, k) => lay(c, at(P.C, 0, k, 0), k + 1));
}
shBRiffle.dur = 1750;
reg('riffle', shBRiffle);
// ===== END riffle =====



// ===== SHUFFLE faro (agent B) =====
// Perfect faro: two exact halves face each other, are pushed corner to corner and weave card by card.
// The out faro: bottom and top cards stay put, the result alternates bottom half, top half, bottom half ...
async function shBFaro(cards, S, amp, live, P, from) {
  const half = DECK / 2, order = cards.slice(), A = Math.min(amp, 1.4), tilt = 8 * A, lift = Math.max(8, 10 * A), gap = 24;
  if (!(await shBCut(order, S, live, P, from, tilt, lift))) return;
  const lo = order.slice(0, half), hi = order.slice(half), next = [];
  for (let j = 0; j < half; j++) { next.push(lo[j]); next.push(hi[j]); }
  // push together: the halves slide towards each other until the corners just meet
  const near = (left, j) => at(P.C + (left ? -gap : gap), left ? 0 : -3, j, left ? tilt * 0.45 : -tilt * 0.45);
  await all(order.map((c, i) => { const left = i < half, j = left ? i : i - half; return c.animate([
    { transform: at(left ? P.L : P.R, left ? 0 : -3, j, left ? tilt : -tilt) },
    { transform: near(left, j) }], { duration: 260 / S, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' }); }), 260 / S + 600);
  if (!live()) return;
  order.forEach((c, i) => { const left = i < half; lay(c, near(left, left ? i : i - half)); });
  // weave: the corners lock and the cards zip together from the bottom up, one from each side in turn
  const anims = next.map((c, k) => {
    const left = order.indexOf(c) < half, j = Math.floor(k / 2), z = 100 + k;
    return c.animate([
      { transform: near(left, j), zIndex: z },
      { transform: at(P.C + (left ? -gap : gap) * 0.45, -5 * A, k, left ? 3 : -3), zIndex: z, offset: 0.5 },
      { transform: at(P.C, 0, k, 0), zIndex: z }], { duration: 220 / S, delay: k * 48 / S, easing: 'ease-in-out', fill: 'forwards' });
  });
  await all(anims, (DECK * 48 + 220) / S + 600);
  if (!live()) return;
  next.forEach((c, k) => lay(c, at(P.C, 0, k, 0), k + 1));
  cards.length = 0; next.forEach(c => cards.push(c));
  await shBTap(cards, S, live, P, null, 220);
}
shBFaro.dur = 1480;
reg('faro', shBFaro);
// ===== END faro =====



// ===== SHUFFLE cascade (agent B) =====
// Bridge and waterfall: halves are interleaved, the stack is bowed into an arch, then the cards flip across in a wave and land square.
async function shBCascade(cards, S, amp, live, P, from) {
  const half = DECK / 2, order = cards.slice(), A = Math.min(amp, 1.4), tilt = 8 * A, lift = Math.max(10, 12 * A), n = DECK;
  if (!(await shBCut(order, S, live, P, from, tilt, lift))) return;
  const next = shBWeave(order);
  // quick interleave, the two halves meeting in the middle
  const anims = next.map((c, k) => {
    const i = order.indexOf(c), left = i < half, j = left ? i : i - half, x0 = left ? P.L : P.R, z = 100 + k;
    return c.animate([
      { transform: at(x0, left ? 0 : -3, j, left ? tilt : -tilt), zIndex: z },
      { transform: at(x0 + (P.C - x0) * 0.55, -lift, k, (left ? tilt : -tilt) * 0.3), zIndex: z, offset: 0.5, easing: 'ease-in' },
      { transform: at(P.C, 0, k, 0), zIndex: z }], { duration: 180 / S, delay: k * 28 / S, easing: 'ease-out', fill: 'forwards' });
  });
  await all(anims, (n * 28 + 180) / S + 600);
  if (!live()) return;
  next.forEach((c, k) => lay(c, at(P.C, 0, k, 0), k + 1));
  cards.length = 0; next.forEach(c => cards.push(c));
  // bend: the thumbs bow the stack into a tall arch
  const h = 20 * Math.min(A, 1.1), spread = Math.min(34, (P.R - P.L) / 3 + 10) * A;
  const arch = (k, t) => { const m = shBMid(k, n), q = 1 - m * m; return at(P.C + m * spread * t, -h * q * t, k, m * 16 * t); };
  await all(cards.map((c, k) => c.animate([{ transform: at(P.C, 0, k, 0) }, { transform: arch(k, 1) }], { duration: 240 / S, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' })), 240 / S + 600);
  if (!live()) return;
  cards.forEach((c, k) => lay(c, arch(k, 1)));
  // waterfall: from one end to the other each card springs up, then drops to its place in the stack
  await all(cards.map((c, k) => {
    const m = shBMid(k, n), z = 200 + k;
    return c.animate([
      { transform: arch(k, 1), zIndex: z },
      { transform: at(P.C + m * spread * 0.5, -h * 0.9 - 8, k, m * 24), zIndex: z, offset: 0.4, easing: 'ease-in' },
      { transform: at(P.C, 2, k, 0) + ' scale(1.02,.98)', zIndex: z, offset: 0.85, easing: 'ease-out' },
      { transform: at(P.C, 0, k, 0), zIndex: z }], { duration: 300 / S, delay: k * 46 / S, easing: 'ease-in-out', fill: 'forwards' });
  }), (n * 46 + 300) / S + 600);
  if (!live()) return;
  cards.forEach((c, k) => lay(c, at(P.C, 0, k, 0), k + 1));
}
shBCascade.dur = 1900;
reg('cascade', shBCascade);
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
