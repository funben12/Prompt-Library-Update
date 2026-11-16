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
// (empty: falls back to the tumble until written)
// ===== END drop =====



// ===== ROLL flip (agent A) =====
// (empty: falls back to the tumble until written)
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
// Hard throw: pulled back, then fired low and flat across the felt, hits the table early with a hard squash, then skids on in
// long low hops, each shorter than the last, spinning fast on a mostly depth axis (it rolls the way it travels) and slowing as it goes
reg('throw', function (cell, faceIdx, sides, delay, D, amp, rm, x0) {
  const g = geom(sides), cube = cell.querySelector('.vd3-cube'), fly = cell.querySelector('.vd3-fly'), sh = cell.querySelector('.vd3-shadow');
  const fin = facing(g.faces[faceIdx].fr), R = rm.R, L0 = rm.L0, pk = Math.max(0, rm.Hm - L0);
  // a lone die on its row gets more run; dice sharing a row keep the same pull so the handful moves as one
  const alone = !rm.row || rm.row.querySelectorAll('.vd3-cell').length < 2;
  const P = clamp(x0 * (alone ? 2.3 : 1), rm.xmin, rm.xmax), sg = P < 0 ? -1 : 1;
  // a small skid past home before it rocks back
  const back = P ? clamp(-sg * Math.min(0.12 * Math.abs(P), 0.2 * R), rm.xmin, rm.xmax) / P : 0;
  // hops stay low: a fraction of the die, never more than the height the room allows
  const j = () => 0.9 + Math.random() * 0.2;
  const b1 = Math.min(0.8 * R * j(), 0.6 * pk), b2 = Math.min(0.5 * R * j(), 0.4 * pk), b3 = Math.min(0.22 * R * j(), 0.2 * pk);
  // spin axis mostly into the screen, so the die rolls the way it travels
  const dir = P > 0 ? -1 : 1;
  let A = unit([(Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7, -dir]);
  if (!isFinite(A[0])) A = [0, 0, 1];
  const spin = (2.6 + Math.random() * 0.9) * 2 * Math.PI * (0.6 + 0.4 * amp);
  // the first key must be the pose on screen now: rotate3d(A, spin) times M0 equals it
  let now = getComputedStyle(cube).transform;
  if (!now || now === 'none') now = IDLE;
  let M0 = now;
  try { M0 = new DOMMatrix().rotateAxisAngle(A[0], A[1], A[2], -spin * 180 / Math.PI).multiply(new DOMMatrix(now)).toString(); } catch (_) {}
  // keys: time weight of the step before it (H = held squash), x as a share of the pull P (1 = pulled back, 0 = home),
  // height above the touchdown line, squash, share of the spin left, easing out
  const H = -1, FALL = 'cubic-bezier(.55,.085,.68,.53)', RISE = 'cubic-bezier(.25,.46,.45,.94)', LIFT = 'cubic-bezier(.3,0,.2,1)', FIRE = 'cubic-bezier(.2,.55,.35,1)', HOLD = 'linear', SLIDE = 'cubic-bezier(.2,.6,.35,1)';
  const K = [
    [0, 0, 0, 0, 1, LIFT], [150, 1, 0.25 * pk, 0, 0.985, FIRE], [130, 0.74, 0.3 * pk, 0, 0.8, FALL],
    [110, 0.6, 0, 0.2, 0.68, HOLD], [H, 0.58, 0, 0.16, 0.63, RISE], [200, 0.38, b1, 0, 0.5, FALL],
    [200, 0.25, 0, 0.13, 0.37, HOLD], [H, 0.24, 0, 0.1, 0.34, RISE], [170, 0.11, b2, 0, 0.22, FALL],
    [170, 0.02, 0, 0.09, 0.14, HOLD], [H, 0.01, 0, 0.07, 0.12, RISE], [120, -0.04, b3, 0, 0.06, FALL],
    [120, back, 0, 0.05, 0.035, SLIDE], [260, back * 0.5, 0, 0, 0.01, 'ease-in-out'], [140, 0, 0, 0, -0.005, 'ease-in-out'], [60, 0, 0, 0, 0, 'linear']];
  const T = D + delay, hf = Math.min(0.06, 80 / T), holds = K.filter(k => k[0] === H).length;
  const free = K.reduce((s, k) => s + (k[0] > 0 ? k[0] : 0), 0), unitF = (1 - holds * hf) / free;
  let o = 0;
  const off = K.map((k, i) => (o = i ? Math.min(1, o + (k[0] === H ? hf : k[0] * unitF)) : 0));
  off[off.length - 1] = 1;
  // the die rests on the table at the very start and end, and is held at the touchdown line (L0) in between
  const hy = (k, i) => (i === 0 || i >= 13 ? 0 : L0 + k[2]);
  const flyKf = K.map((k, i) => ({ offset: off[i], transform: `translate(${f4(P * k[1])}px,${f4(-hy(k, i))}px) scale(${f4(1 + k[3])},${f4(1 - k[3])})`, easing: k[5] }));
  const shKf = K.map((k, i) => ({ offset: off[i], transform: `translateX(${f4(P * k[1])}px) scale(${f4(1 / (1 + hy(k, i) / (2.2 * R)))})`, opacity: f4(0.5 / (1 + hy(k, i) / (1.5 * R))), easing: k[5] }));
  const cubeKf = K.map((k, i) => ({ offset: off[i], transform: `rotate3d(${f4(A[0])},${f4(A[1])},${f4(A[2])},${f4(spin * k[4])}rad) ${i ? fin : M0}`, easing: i < 12 ? 'linear' : k[5] }));
  const opt = { duration: T, fill: 'both' };
  return [fly.animate(flyKf, opt), sh.animate(shKf, opt), cube.animate(cubeKf, opt)];
});
// ===== END throw =====


})();
