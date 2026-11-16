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
// (empty: falls back to the tumble until written)
// ===== END cup =====



// ===== ROLL float (agent B) =====
// (empty: falls back to the tumble until written)
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
