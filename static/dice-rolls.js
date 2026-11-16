// Dice roll styles. Each dice_<id> variable type (see vartypes-3d.js, DICE_STYLES) rolls the way registered here under its id.
// The default 'dice_tumble' / 'diceroll' roll is `throwDie` in vartypes-3d.js, registered as M.rolls.tumble: READ IT FIRST, it is the reference.
// Contract: function (cell, faceIdx, sides, delay, D, amp, rm, x0) returns [flyAnim, shadowAnim, cubeAnim]
//   cell  : the .vd3-cell for one die. Inside it: .vd3-fly (moves the die, translate and squash), .vd3-shadow, .vd3-cube (3D pose).
//   faceIdx : the face that must be facing the camera at the end: its final cube transform is facing(geom(sides).faces[faceIdx].fr).
//   delay : ms this die starts late (several dice). D : base duration ms. Every animation lasts D + delay in total, fill 'both'.
//   amp   : intensity 0 to 1. rm : room { R, L0, Hm, xmin, xmax, row }: R die radius px, L0 touchdown height, Hm the top of the arc, xmin/xmax x limits.
//   x0    : sideways travel the die is allowed (from sweeps(); 0 can happen: stay put). Keep x within [rm.xmin, rm.xmax] and heights within L0..Hm
//           so the whole die stays inside the stage in every frame (it is clipped by the stage).
// The FIRST keyframe of each animation must be exactly the resting pose (the cube's current computed transform, `getComputedStyle(cube).transform`,
// or IDLE if none) so nothing jumps at the click. The LAST keyframe: fly at rest (translate(0,0) scale(1,1)), shadow at rest, cube = facing pose.
// Randomise the spin axis so rolls differ. Use Web Animations API only. The vartypes roll() picks the result BEFORE any animation; you only land it.
// Helpers from PL_MOTION.dice: geom, facing, IDLE, unit, f4, rand, clamp, room, sweeps. Set nothing else global.
(function () {
  'use strict';
  const M = window.PL_MOTION;
  if (!M || !M.dice || !M.rolls) return;
  const { geom, facing, IDLE, unit, f4, rand, clamp } = M.dice;
  const reg = (id, fn) => { M.rolls[id] = fn; };


// ===== ROLL drop (agent A) =====
// Shared by drop and flip: build the three animations from keys [time weight (-1 = held squash), x share, height, squash, spin share left, easing, cube easing]
function keyedRoll(cell, faceIdx, sides, delay, D, rm, x0, A, spin, K) {
  const g = geom(sides), cube = cell.querySelector('.vd3-cube'), fly = cell.querySelector('.vd3-fly'), sh = cell.querySelector('.vd3-shadow');
  const fin = facing(g.faces[faceIdx].fr), R = rm.R;
  let now = getComputedStyle(cube).transform;
  if (!now || now === 'none') now = IDLE;
  let M0 = now;
  try { M0 = new DOMMatrix().rotateAxisAngle(A[0], A[1], A[2], -spin * 180 / Math.PI).multiply(new DOMMatrix(now)).toString(); } catch (_) {}
  const T = D + delay, hf = Math.min(0.06, 80 / T), holds = K.filter(k => k[0] === -1).length;
  const free = K.reduce((s, k) => s + (k[0] > 0 ? k[0] : 0), 0), unitF = (1 - holds * hf) / free;
  let o = 0;
  const off = K.map((k, i) => (o = i ? Math.min(1, o + (k[0] === -1 ? hf : k[0] * unitF)) : 0));
  off[off.length - 1] = 1;
  const flyKf = K.map((k, i) => ({ offset: off[i], transform: `translate(${f4(x0 * k[1])}px,${f4(-k[2])}px) scale(${f4(1 + k[3])},${f4(1 - k[3])})`, easing: k[5] }));
  const shKf = K.map((k, i) => ({ offset: off[i], transform: `translateX(${f4(x0 * k[1])}px) scale(${f4(1 / (1 + k[2] / (2.2 * R)))})`, opacity: f4(0.5 / (1 + k[2] / (1.5 * R))), easing: k[5] }));
  const cubeKf = K.map((k, i) => ({ offset: off[i], transform: `rotate3d(${f4(A[0])},${f4(A[1])},${f4(A[2])},${f4(spin * k[4])}rad) ${i ? fin : M0}`, easing: k[6] || 'linear' }));
  const opt = { duration: T, fill: 'both' };
  return [fly.animate(flyKf, opt), sh.animate(shKf, opt), cube.animate(cubeKf, opt)];
}
// Drop: lifted to the top of the stage, let go, hard squash on the table, one big lazy bounce, two small ones, a short rock and rest
reg('drop', function (cell, faceIdx, sides, delay, D, amp, rm, x0) {
  const R = rm.R, L0 = rm.L0, Hm = rm.Hm, pk = Hm - L0;
  const b1 = Math.min(1.5 * R, 0.62 * pk), b2 = Math.min(0.55 * R, 0.25 * pk), b3 = Math.min(0.2 * R, 0.1 * pk);
  let A = unit([(Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.2]);
  if (!isFinite(A[0])) A = [1, 0, 0];
  const spin = (0.9 + Math.random() * 0.5) * 2 * Math.PI * (0.6 + 0.4 * amp);
  // a small drift to the side the table sweeps towards (0 when there is no room), kept inside the room
  const xs = 1, xd = x0 * 0.4;
  const SOFT = 'cubic-bezier(.4,0,.3,1)', FALL = 'cubic-bezier(.55,.06,.68,.19)', RISE = 'cubic-bezier(.2,.6,.4,1)', HOLD = 'linear';
  const K = [
    [0, 0, 0, 0, 1, SOFT, 'linear'], [330, 0.1 * xs, Hm, 0, 1, 'linear', 'linear'], [110, 0.1 * xs, Hm, 0, 1, FALL, 'linear'],
    [300, 0.3 * xs, L0, 0.2, 0.92, HOLD, 'linear'], [-1, 0.3 * xs, L0, 0.17, 0.9, RISE, 'linear'],
    [250, 0.55 * xs, L0 + b1, 0, 0.5, FALL, 'linear'], [250, 0.8 * xs, L0, 0.13, 0.12, HOLD, 'linear'], [-1, 0.8 * xs, L0, 0.1, 0.1, RISE, 'linear'],
    [110, 0.9 * xs, L0 + b2, 0, 0.06, FALL, 'linear'], [110, xs, L0, 0.07, 0.03, HOLD, 'linear'], [-1, xs, L0, 0.05, 0.03, RISE, 'linear'],
    [60, xs, L0 + b3, 0, 0.012, FALL, 'linear'], [60, xs, L0, 0.03, 0.006, 'ease-out', 'ease-out'],
    [200, xs, 0, 0, 0.012, 'ease-in-out', 'ease-in-out'], [110, xs, 0, 0, -0.008, 'ease-in-out', 'ease-in-out'], [60, xs, 0, 0, 0, 'linear', 'linear']];
  // the die ends where it started, so the drift is brought back to 0 over the last steps
  K.forEach((k, i) => { if (i >= K.length - 3) k[1] = k[1] * (i === K.length - 3 ? 0.6 : i === K.length - 2 ? 0.2 : 0); });
  return keyedRoll(cell, faceIdx, sides, delay, D, rm, xd, A, spin, K);
});
// ===== END drop =====



// ===== ROLL flip (agent A) =====
// Flip: flicked straight up, turns end over end 3 to 4 times in one high arc, lands with a soft squash and one tiny bounce
reg('flip', function (cell, faceIdx, sides, delay, D, amp, rm, x0) {
  const R = rm.R, L0 = rm.L0, Hm = rm.Hm, pk = Hm - L0;
  const b1 = Math.min(0.35 * R, 0.16 * pk), dir = Math.random() < 0.5 ? -1 : 1;
  const turns = 3 + Math.floor(Math.random() * 2) + (amp < 0.5 ? -1 : 0);
  // horizontal axis (across the screen), tipped a little so the spin is never perfectly flat
  let A = unit([dir, (Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.25]);
  if (!isFinite(A[0])) A = [1, 0, 0];
  const spin = Math.max(2, turns) * 2 * Math.PI;
  const xm = x0 * 0.5;
  const UP = 'cubic-bezier(.17,.55,.4,1)', DOWN = 'cubic-bezier(.6,0,.85,.45)', HOLD = 'linear';
  const K = [
    [0, 0, 0, -0.06, 1, UP, 'cubic-bezier(.3,0,.5,1)'], [520, 0.7, Hm, 0, 0.5, DOWN, 'cubic-bezier(.4,.3,.6,.7)'],
    [500, 0.3, L0, 0.15, 0.015, HOLD, 'ease-out'], [-1, 0.3, L0, 0.12, 0, 'cubic-bezier(.2,.6,.35,1)', 'linear'],
    [150, 0.2, L0 + b1, 0, 0.0, DOWN, 'linear'], [110, 0.1, L0, 0.05, 0, 'ease-out', 'linear'],
    [220, 0, 0, 0, 0.006, 'ease-in-out', 'ease-in-out'], [110, 0, 0, 0, -0.004, 'ease-in-out', 'ease-in-out'], [60, 0, 0, 0, 0, 'linear', 'linear']];
  K[0][3] = 0;
  K[1][3] = 0;
  return keyedRoll(cell, faceIdx, sides, delay, D, rm, xm, A, spin, K);
});
// ===== END flip =====





// ================ agent boundary ================





// ===== ROLL cup (agent B) =====
// Shared builder for the cup and float rolls. Each key: w time weight, x px, h height above rest px, q squash, s share of the spin left,
// r optional extra tilt [ax, ay, az, rad] laid over the spin, e easing out of the key. Key 0 is the resting pose, the last key is at rest.
const bBuild = (cell, faceIdx, sides, delay, D, R, K, A, spin) => {
  const g = geom(sides), cube = cell.querySelector('.vd3-cube'), fly = cell.querySelector('.vd3-fly'), sh = cell.querySelector('.vd3-shadow');
  const fin = facing(g.faces[faceIdx].fr);
  // the first key must be the pose on screen now: rotate3d(A, spin) times M0 equals it
  let now = getComputedStyle(cube).transform;
  if (!now || now === 'none') now = IDLE;
  let M0 = now;
  try { M0 = new DOMMatrix().rotateAxisAngle(A[0], A[1], A[2], -spin * 180 / Math.PI).multiply(new DOMMatrix(now)).toString(); } catch (_) {}
  const tot = K.reduce((s, k) => s + k.w, 0);
  let o = 0;
  const off = K.map((k, i) => (o = i ? Math.min(1, o + k.w / tot) : 0));
  off[off.length - 1] = 1;
  const flyKf = K.map((k, i) => ({ offset: off[i], transform: `translate(${f4(k.x)}px,${f4(-k.h)}px) scale(${f4(1 + k.q)},${f4(1 - k.q)})`, easing: k.e || 'linear' }));
  const shKf = K.map((k, i) => ({ offset: off[i], transform: `translateX(${f4(k.x)}px) scale(${f4(1 / (1 + k.h / (2.2 * R)))})`, opacity: f4(0.5 / (1 + k.h / (1.5 * R))), easing: k.e || 'linear' }));
  const cubeKf = K.map((k, i) => ({ offset: off[i], transform: `${k.r ? `rotate3d(${f4(k.r[0])},${f4(k.r[1])},${f4(k.r[2])},${f4(k.r[3])}rad) ` : ''}rotate3d(${f4(A[0])},${f4(A[1])},${f4(A[2])},${f4(spin * k.s)}rad) ${i ? fin : M0}`, easing: k.e || 'linear' }));
  const opt = { duration: D + delay, fill: 'both' };
  return [fly.animate(flyKf, opt), sh.animate(shKf, opt), cube.animate(cubeKf, opt)];
};

// Cup shake and pour: lifted into a cup, rattled hard with tiny jitters, then tipped out sideways to land, bounce twice and roll to rest.
reg('cup', function (cell, faceIdx, sides, delay, D, amp, rm, x0) {
  const R = rm.R, L0 = rm.L0, Hm = rm.Hm, pk = Hm - L0, lo = rm.xmin, hi = rm.xmax;
  const cx = v => clamp(v, lo, hi), cy = v => clamp(v, L0, Hm);
  const dir = x0 < 0 ? -1 : 1, sx = Math.abs(x0) > 0.1 ? x0 : 0;
  let A = unit([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]);
  if (!isFinite(A[0])) A = [1, 0, 0];
  const spin = (1.1 + Math.random() * 0.5) * 2 * Math.PI * (0.7 + 0.3 * amp);
  const IO = 'cubic-bezier(.45,0,.55,1)', FALL = 'cubic-bezier(.55,.085,.68,.53)', RISE = 'cubic-bezier(.25,.46,.45,.94)';
  const hc = L0 + Math.min(0.4 * pk, 0.7 * R);
  const jr = () => { const a = unit([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]); return isFinite(a[0]) ? [a[0], a[1], a[2], (0.12 + Math.random() * 0.2) * (Math.random() < 0.5 ? -1 : 1)] : [0, 0, 1, 0.2]; };
  const K = [{ w: 0, x: 0, h: 0, q: 0, s: 1 }, { w: 150, x: 0, h: hc, q: 0, s: 0.97, e: IO }];
  // 10 quick shakes: small sideways and up and down jumps with a rattle of rotation
  const n = 10, jx = Math.min(0.2 * R, Math.max(Math.abs(lo), Math.abs(hi)));
  let s = 0.97;
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? -1 : 1;
    s -= 0.012 + Math.random() * 0.02;
    K.push({ w: 52, x: cx(side * jx * (0.45 + Math.random() * 0.55)), h: cy(hc + side * Math.min(0.14 * R, 0.2 * pk) * (0.4 + Math.random() * 0.6)), q: i % 2 ? 0.015 : 0, s, r: jr(), e: IO });
  }
  // pour: it tips and slides down and out sideways, then drops
  K.push({ w: 230, x: cx(sx * 0.45), h: cy(L0 + 0.5 * pk), q: 0, s: 0.62, r: [0, 0, dir, -0.5 * dir], e: 'cubic-bezier(.4,0,.6,1)' });
  K.push({ w: 190, x: cx(sx * 0.82), h: L0, q: 0.14, s: 0.42, e: FALL });
  K.push({ w: 80, x: cx(sx * 0.84), h: L0, q: 0.1, s: 0.4, e: RISE });
  K.push({ w: 150, x: cx(sx * 0.93), h: cy(L0 + Math.min(1.1 * R, 0.7 * pk)), q: 0, s: 0.27, e: FALL });
  K.push({ w: 150, x: cx(sx * 0.98), h: L0, q: 0.09, s: 0.17, e: RISE });
  K.push({ w: 110, x: cx(sx), h: cy(L0 + Math.min(0.35 * R, 0.3 * pk)), q: 0, s: 0.1, e: FALL });
  K.push({ w: 90, x: cx(sx), h: L0, q: 0.05, s: 0.06, e: 'cubic-bezier(.2,.6,.35,1)' });
  K.push({ w: 200, x: 0, h: 0, q: 0, s: 0.007, e: 'ease-in-out' });
  K.push({ w: 90, x: 0, h: 0, q: 0, s: -0.004, e: 'ease-in-out' });
  K.push({ w: 40, x: 0, h: 0, q: 0, s: 0 });
  return bBuild(cell, faceIdx, sides, delay, D, R, K, A, spin);
});
// ===== END cup =====



// ===== ROLL float (agent B) =====
// Float and drop: lifts gently off the table, turns slowly about a tilted axis while it hangs and bobs, then is released, drops with a soft bounce and rocks to rest.
reg('float', function (cell, faceIdx, sides, delay, D, amp, rm, x0) {
  const R = rm.R, L0 = rm.L0, Hm = rm.Hm, pk = Hm - L0, lo = rm.xmin, hi = rm.xmax;
  const cx = v => clamp(v, lo, hi), cy = v => clamp(v, L0, Hm);
  const sx = x0 * 0.35, sg = Math.random() < 0.5 ? -1 : 1;
  let A = unit([sg * (0.25 + Math.random() * 0.3), 1, (Math.random() - 0.5) * 0.7]);
  if (!isFinite(A[0])) A = [0, 1, 0];
  const spin = (1.0 + Math.random() * 0.4) * 2 * Math.PI * (0.7 + 0.3 * amp);
  const SOFT = 'cubic-bezier(.45,.05,.35,1)', FALL = 'cubic-bezier(.5,.05,.8,.5)', RISE = 'cubic-bezier(.25,.46,.45,.94)';
  const top = L0 + 0.88 * pk, bob = 0.07 * pk;
  const K = [
    { w: 0, x: 0, h: 0, q: 0, s: 1 },
    { w: 560, x: cx(sx * 0.3), h: cy(top), q: -0.015, s: 0.72, e: SOFT },
    { w: 360, x: cx(sx * 0.2), h: cy(top - bob), q: 0, s: 0.52, e: SOFT },
    { w: 360, x: cx(sx * 0.35), h: cy(top + bob * 0.4), q: 0, s: 0.34, e: SOFT },
    { w: 220, x: cx(sx * 0.3), h: cy(top - bob * 0.3), q: 0, s: 0.24, e: 'cubic-bezier(.3,0,.6,1)' },
    // released: drops, lands with a soft squash
    { w: 330, x: cx(sx * 0.7), h: L0, q: 0.1, s: 0.07, e: FALL },
    { w: 70, x: cx(sx * 0.72), h: L0, q: 0.07, s: 0.06, e: RISE },
    { w: 160, x: cx(sx * 0.78), h: cy(L0 + Math.min(0.55 * R, 0.4 * pk)), q: 0, s: 0.035, e: FALL },
    { w: 110, x: cx(sx * 0.8), h: L0, q: 0.04, s: 0.012, e: 'cubic-bezier(.2,.6,.35,1)' },
    { w: 220, x: cx(sx * 0.4), h: 0, q: 0, s: -0.008, e: 'ease-in-out' },
    { w: 120, x: 0, h: 0, q: 0, s: 0.004, e: 'ease-in-out' },
    { w: 60, x: 0, h: 0, q: 0, s: 0 }];
  return bBuild(cell, faceIdx, sides, delay, D, R, K, A, spin);
});
// ===== END float =====





// ================ agent boundary ================





// ===== ROLL spin (agent C) =====
// (empty: falls back to the tumble until written)
// ===== END spin =====



// ===== ROLL tray (agent C) =====
// (empty: falls back to the tumble until written)
// ===== END tray =====





// ================ agent boundary ================





// ===== ROLL throw (agent D) =====
// (empty: falls back to the tumble until written)
// ===== END throw =====


})();
