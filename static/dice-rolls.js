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
// (empty: falls back to the tumble until written)
// ===== END throw =====


})();
