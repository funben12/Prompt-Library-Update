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
// Shared helpers for the spin and tray rolls (agent C): the pose is a stack of rotations sampled densely and played as matrix3d keyframes
const plCx = (() => {
  const D2R = Math.PI / 180, TAU = Math.PI * 2;
  const smooth = p => { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); };
  const EZ = { l: p => p, i: p => p * p, i14: p => Math.pow(p, 1.4), o: p => 1 - (1 - p) * (1 - p), o14: p => 1 - Math.pow(1 - p, 1.35), io: smooth };
  // piecewise value over u: points are [u, value, easing of the step that ends at this point]
  const track = (pts, u) => {
    if (u <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (u <= pts[i][0]) { const a = pts[i - 1], b = pts[i], p = (u - a[0]) / ((b[0] - a[0]) || 1); return a[1] + (b[1] - a[1]) * EZ[b[2] || 'l'](p); }
    }
    return pts[pts.length - 1][1];
  };
  const pulse = (u, c, w) => Math.max(0, 1 - Math.abs(u - c) / w);
  const rot = (x, y, z, deg) => new DOMMatrix().rotateAxisAngle(x, y, z, deg);
  // rotation matrix to [x, y, z, degrees] (through the quaternion, so a half turn is fine too)
  const aa = m => {
    const a = m.m11, b = m.m21, c = m.m31, d = m.m12, e = m.m22, f = m.m32, g = m.m13, h = m.m23, k = m.m33, tr = a + e + k;
    let w, x, y, z, S;
    if (tr > 0) { S = Math.sqrt(tr + 1) * 2; w = S / 4; x = (h - f) / S; y = (c - g) / S; z = (d - b) / S; }
    else if (a > e && a > k) { S = Math.sqrt(1 + a - e - k) * 2; w = (h - f) / S; x = S / 4; y = (b + d) / S; z = (c + g) / S; }
    else if (e > k) { S = Math.sqrt(1 + e - a - k) * 2; w = (c - g) / S; x = (b + d) / S; y = S / 4; z = (f + h) / S; }
    else { S = Math.sqrt(1 + k - a - e) * 2; w = (d - b) / S; x = (c + g) / S; y = (f + h) / S; z = S / 4; }
    const s = Math.sqrt(Math.max(0, 1 - w * w));
    return s < 1e-6 ? [0, 0, 1, 0] : [x / s, y / s, z / s, 2 * Math.acos(clamp(w, -1, 1)) / D2R];
  };
  const near = (p, q) => ['m11', 'm12', 'm13', 'm21', 'm22', 'm23', 'm31', 'm32', 'm33'].every(k => Math.abs(p[k] - q[k]) < 1e-3);
  // the resting pose now, the final pose, and the turn between them (qd is scaled by 1 - g to unwind it)
  const prep = (cell, g, faceIdx) => {
    const cube = cell.querySelector('.vd3-cube'), fly = cell.querySelector('.vd3-fly'), sh = cell.querySelector('.vd3-shadow');
    const fin = facing(g.faces[faceIdx].fr);
    let now = getComputedStyle(cube).transform;
    if (!now || now === 'none') now = IDLE;
    const Fin = new DOMMatrix(fin), Qb = new DOMMatrix(now).multiply(Fin.inverse());
    const q = aa(Qb);
    if (!near(rot(q[0], q[1], q[2], q[3]), Qb)) q[3] = -q[3];
    return { cube, fly, sh, fin, now, Fin, qx: q[0], qy: q[1], qz: q[2], qd: q[3] };
  };
  // rows are { x, y (height above rest), sx, sy (squash), m (cube matrix) } evenly spaced over the whole run
  const play = (P, S, T, R) => {
    const N = S.length - 1, fk = [], sk = [], ck = [];
    S.forEach((s, i) => {
      const o = i / N, h = Math.max(0, s.y);
      fk.push({ offset: o, transform: `translate(${f4(s.x)}px,${f4(-s.y)}px) scale(${f4(1 + s.sx)},${f4(1 + s.sy)})`, easing: 'linear' });
      sk.push({ offset: o, transform: `translateX(${f4(s.x)}px) scale(${f4(1 / (1 + h / (2.2 * R)))})`, opacity: f4(0.5 / (1 + h / (1.5 * R))), easing: 'linear' });
      ck.push({ offset: o, transform: s.m, easing: 'linear' });
    });
    ck[0].transform = P.now; ck[N].transform = P.fin;
    fk[0].transform = 'translate(0px,0px) scale(1,1)'; fk[N].transform = 'translate(0px,0px) scale(1,1)';
    sk[0].transform = 'translateX(0px) scale(1)'; sk[N].transform = 'translateX(0px) scale(1)';
    const opt = { duration: T, fill: 'both' };
    return [P.fly.animate(fk, opt), P.sh.animate(sk, opt), P.cube.animate(ck, opt)];
  };
  return { D2R, TAU, smooth, EZ, track, pulse, rot, prep, play };
})();

// Spin like a top: flicked onto a corner, 6 to 10 turns about a near vertical axis that die away, a growing wobble, then it topples flat
reg('spin', function (cell, faceIdx, sides, delay, D, amp, rm, x0) {
  const { D2R, TAU, smooth, track, pulse, rot, prep, play } = plCx;
  const g = geom(sides), P = prep(cell, g, faceIdx), R = rm.R, L0 = rm.L0, Hm = rm.Hm, pk = Math.max(0, Hm - L0), T = D + delay;
  const row = cell.closest('.vd3-row'), many = !!row && row.children.length > 1, a = 0.6 + 0.4 * clamp(amp, 0, 1), rho = 1.55 * R;
  const turns = 6 + rand(5), sdir = Math.random() < 0.5 ? -1 : 1, pdir = Math.random() < 0.5 ? -1 : 1, psi0 = Math.random() * 360;
  // a corner of the body: three faces that meet, then where it points once the die lies on the chosen face
  const F = g.faces, dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2], i0 = rand(F.length), n0 = F[i0].n;
  let i1 = -1, i2 = -1, best = -9;
  F.forEach((f, i) => { if (i !== i0 && dot(f.n, n0) > best + 1e-6 && dot(f.n, n0) > -0.9) { best = dot(f.n, n0); i1 = i; } });
  const s01 = i1 < 0 ? n0 : [n0[0] + F[i1].n[0], n0[1] + F[i1].n[1], n0[2] + F[i1].n[2]];
  best = -9;
  F.forEach((f, i) => { if (i !== i0 && i !== i1 && dot(f.n, s01) > best + 1e-6 && dot(f.n, n0) > -0.5) { best = dot(f.n, s01); i2 = i; } });
  const cv = unit(i2 < 0 ? s01 : [s01[0] + F[i2].n[0], s01[1] + F[i2].n[1], s01[2] + F[i2].n[2]]);
  const pv = P.Fin.transformPoint(new DOMPoint(cv[0], cv[1], cv[2])), vv = unit([pv.x, pv.y, pv.z]);
  // turn that points that corner straight down the screen
  let ka = [-vv[2], 0, vv[0]], kl = Math.hypot(ka[0], ka[2]), alpha = Math.acos(clamp(vv[1], -1, 1)) / D2R;
  if (kl < 1e-4) { ka = [1, 0, 0]; alpha = vv[1] < 0 ? 180 : 0; } else ka = [ka[0] / kl, 0, ka[2] / kl];
  if (rot(ka[0], ka[1], ka[2], alpha).transformPoint(new DOMPoint(vv[0], vv[1], vv[2])).y < 0.98) alpha = -alpha;
  // spin: fast at once, then slower and slower, finishing exactly when the die has toppled
  const UT = 0.865, G = 400, cum = [0];
  for (let i = 1; i <= G; i++) { const p = i / G; cum[i] = cum[i - 1] + Math.pow(1 - p, 1.4) * smooth(p / 0.05); }
  const Efn = p => { if (p >= 1) return 1; const q = p * G, i = Math.floor(q); return (cum[i] + (cum[i + 1] - cum[i]) * (q - i)) / cum[G]; };
  // wobble: the lean grows as the spin slows, kept low where the stage is tight
  const tm0 = (many ? 0.3 : 0.46) * a, yb = L0 + Math.min(pk * 0.9, rho * (1 - Math.cos(tm0)));
  const tm = Math.max(0.22 * a, Math.min(tm0, Math.acos(clamp(1 - (yb - L0) / rho, -1, 1))));
  const flick = L0 + (0.35 + 0.2 * Math.random()) * pk, ra = Math.random() * TAU, rk0 = 0.06 * a * (Math.random() < 0.5 ? -1 : 1);
  const yPts = [[0, 0], [0.05, flick, 'o'], [0.1, yb, 'i'], [0.72, yb, 'l'], [0.865, L0, 'i'], [0.915, L0 + Math.min(0.4 * R, 0.6 * pk), 'o'], [0.945, L0, 'i'], [0.99, 0, 'io'], [1, 0, 'l']];
  const N = 240, S = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, gq = smooth(u / 0.1), tp = clamp((u - 0.72) / 0.145, 0, 1), kap = smooth(u / 0.1) * (1 - Math.pow(tp, 2.2));
    const th = sdir * 360 * turns * Efn(Math.min(1, u / UT)), us = clamp((u - 0.1) / 0.8, 0, 1), s = clamp((u - 0.12) / 0.6, 0, 1);
    const ramp = u < 0.08 ? 0 : u < 0.14 ? 0.12 * smooth((u - 0.08) / 0.06) : 0.12 + 0.88 * Math.pow(s, 1.8);
    const tau = tm * ramp * (1 - smooth(tp)), psi = psi0 + pdir * 360 * (0.6 * us + 2.6 * us * us * us);
    const v = clamp((u - 0.945) / 0.055, 0, 1), rk = u < 0.945 ? 0 : rk0 * Math.sin(v * Math.PI * 2.2) * Math.pow(1 - v, 1.5);
    const tilt = rot(Math.cos(psi * D2R), 0, Math.sin(psi * D2R), tau / D2R);
    const m = rot(Math.cos(ra), 0, Math.sin(ra), rk / D2R).multiply(rot(P.qx, P.qy, P.qz, P.qd * (1 - gq))).multiply(tilt).multiply(rot(0, 1, 0, th)).multiply(rot(ka[0], ka[1], ka[2], alpha * kap)).multiply(P.Fin);
    const cp = tilt.transformPoint(new DOMPoint(0, rho, 0));
    const x = x0 * smooth((u - 0.04) / 0.46) * (1 - smooth((u - 0.5) / 0.38)) - cp.x * kap;
    const y = track(yPts, u) + (cp.y - rho) * kap;
    const q = (pulse(u, 0.1, 0.025) * 0.1 + pulse(u, 0.865, 0.03) * 0.14 + pulse(u, 0.945, 0.025) * 0.06) * a;
    S.push({ x: clamp(x, rm.xmin, rm.xmax), y: clamp(y, 0, Hm), sx: q, sy: -q, m: m.toString() });
  }
  return play(P, S, T, R);
});
// ===== END spin =====



// ===== ROLL tray (agent C) =====
// Dice tray: thrown from rest, rolls to the far wall, bounces back, hits the near wall gently and rests; a lone die uses most of the stage width
reg('tray', function (cell, faceIdx, sides, delay, D, amp, rm, x0) {
  const { D2R, TAU, smooth, track, pulse, rot, prep, play } = plCx;
  const g = geom(sides), P = prep(cell, g, faceIdx), R = rm.R, L0 = rm.L0, Hm = rm.Hm, pk = Math.max(0, Hm - L0), T = D + delay;
  const row = cell.closest('.vd3-row'), many = !!row && row.children.length > 1, a = 0.6 + 0.4 * clamp(amp, 0, 1);
  const side = x0 > 0 ? 1 : x0 < 0 ? -1 : (Math.random() < 0.5 ? -1 : 1);
  const far = Math.max(0, side > 0 ? rm.xmax : -rm.xmin), back = Math.max(0, side > 0 ? -rm.xmin : rm.xmax);
  // a row of dice moves together by the swept distance; a lone die uses most of the stage
  const A = many ? x0 : side * far * (0.88 + 0.1 * Math.random());
  const xB = -side * Math.min(0.42 * Math.abs(A), back * 0.9);
  const ax = (Math.random() - 0.5) * 0.24, ay = (Math.random() - 0.5) * 0.24, al = Math.hypot(ax, ay, 1);
  const ya = (4 + Math.random() * 6) * (Math.random() < 0.5 ? -1 : 1), ra = Math.random() * TAU, rk0 = 0.05 * a * (Math.random() < 0.5 ? -1 : 1);
  const j = (Math.random() - 0.5) * 0.012, h1 = Math.min(1.0 * R, 0.7 * pk), h2 = Math.min(0.2 * R, 0.4 * pk);
  const xPts = [[0, 0], [0.04, -0.05 * A, 'o'], [0.2, 0.62 * A, 'i14'], [0.34, A, 'l'], [0.38, A, 'l'], [0.7, xB, 'o14'], [0.73, xB, 'l'], [0.95, 0, 'o'], [1, 0, 'l']];
  const yPts = [[0, 0], [0.04, 0.6 * L0, 'o'], [0.12, L0 + 0.4 * pk, 'o'], [0.2, L0, 'i'], [0.9, L0, 'l'], [0.985, 0, 'io'], [1, 0, 'l']];
  const hop = (u, c, w, h) => Math.abs(u - c) < w ? h * (1 - Math.pow((u - c) / w, 2)) : 0;
  const N = 240, S = [], k = 0.9;
  for (let i = 0; i <= N; i++) {
    const u = i / N, x = track(xPts, u), y = track(yPts, u) + hop(u, 0.53 + j, 0.09, h1) + hop(u, 0.8, 0.035, h2);
    const w = u < 0.34 ? Math.pow(1 - u / 0.34, 1.3) : 0, th = (k * x / R + TAU * side * w) / D2R, gq = smooth(u / 0.3);
    const v = clamp((u - 0.95) / 0.05, 0, 1), rk = u < 0.95 ? 0 : rk0 * Math.sin(v * Math.PI * 2.2) * Math.pow(1 - v, 1.5);
    const m = rot(Math.cos(ra), 0, Math.sin(ra), rk / D2R).multiply(rot(P.qx, P.qy, P.qz, P.qd * (1 - gq))).multiply(rot(0, 1, 0, ya * Math.sin(TAU * u))).multiply(rot(ax / al, ay / al, 1 / al, th)).multiply(P.Fin);
    const wl = (pulse(u, 0.36, 0.03) * 0.13 + pulse(u, 0.715, 0.03) * 0.07) * a, fl = (pulse(u, 0.2, 0.03) * 0.08 + pulse(u, 0.62 + j, 0.025) * 0.06 + pulse(u, 0.835, 0.02) * 0.03) * a;
    S.push({ x: clamp(x, rm.xmin, rm.xmax), y: clamp(y, 0, Hm), sx: fl - wl, sy: -fl + wl * 0.4, m: m.toString() });
  }
  return play(P, S, T, R);
});
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
