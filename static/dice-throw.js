/* dice-throw.js: one six sided die thrown onto a table, simulated as a rigid body, with pips or custom text faces. DOM plus CSS 3D, no library. */
(function () {
  'use strict';
  if (window.DiceThrow) return;

  var SIZE = 54, H = SIZE / 2, MASS = 1, INERTIA = SIZE * SIZE / 6;
  var GRAVITY = 2000, RESTITUTION = 0.45, FRICTION = 0.5, STEP = 1 / 240;
  var TILT = 55, STAGE_H = 180, SETTLE_TIME = 0.34;
  var MIN_TOTAL = 1.6, MAX_TOTAL = 2.4;
  var LIGHT = norm([-0.45, 0.3, 0.85]);
  var PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  // Body face normals in order: +z, -z, +x, -x, -y, +y.
  var NORMALS = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, -1, 0], [0, 1, 0]];
  var FACE_TF = ['translateZ(' + H + 'px)', 'rotateY(180deg) translateZ(' + H + 'px)', 'rotateY(90deg) translateZ(' + H + 'px)',
    'rotateY(-90deg) translateZ(' + H + 'px)', 'rotateX(90deg) translateZ(' + H + 'px)', 'rotateX(-90deg) translateZ(' + H + 'px)'];
  // Face element x and y axes in body space, used to turn text upright on the landing face.
  var FACE_X = [[1, 0, 0], [-1, 0, 0], [0, 0, -1], [0, 0, 1], [1, 0, 0], [1, 0, 0]];
  var FACE_Y = [[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1]];
  var TEXT_PAD = 4, TEXT_BOX = SIZE - TEXT_PAD * 2, TEXT_MAX = 20, TEXT_MIN = 8, TEXT_LH = 1.15;
  var CORNERS = [];
  for (var cx = -1; cx <= 1; cx += 2) for (var cy = -1; cy <= 1; cy += 2) for (var cz = -1; cz <= 1; cz += 2) CORNERS.push([cx * H, cy * H, cz * H]);

  var CSS = [
    '.dt-stage{position:relative;width:100%;height:' + STAGE_H + 'px;overflow:hidden;background:var(--bg,oklch(93.5% 0.01 70));perspective:900px;perspective-origin:50% 10%;contain:layout paint;user-select:none;-webkit-user-select:none}',
    '.dt-world{position:absolute;left:50%;top:74%;width:0;height:0;transform-style:preserve-3d;transform:rotateX(' + TILT + 'deg)}',
    '.dt-floor{position:absolute;left:-2000px;top:-120px;width:4000px;height:900px;background:var(--surface-2,oklch(92% 0.012 70));border-top:2px solid var(--line,oklch(85% 0.016 70))}',
    '.dt-shadow{position:absolute;left:' + (-H) + 'px;top:' + (-H) + 'px;width:' + SIZE + 'px;height:' + SIZE + 'px;border-radius:12px;background:oklch(12% 0.02 260);filter:blur(6px);opacity:.28;will-change:transform,opacity}',
    '.dt-die{position:absolute;left:0;top:0;width:0;height:0;transform-style:preserve-3d;will-change:transform}',
    '.dt-face,.dt-core{position:absolute;left:' + (-H) + 'px;top:' + (-H) + 'px;width:' + SIZE + 'px;height:' + SIZE + 'px}',
    '.dt-face{border-radius:8px;background:var(--surface,oklch(95.2% 0.008 70));backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden}',
    '.dt-core{background:var(--surface-3,oklch(88.5% 0.015 70))}',
    '.dt-pip{position:absolute;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:var(--ink,oklch(18% 0.04 260))}',
    '.dt-shade{position:absolute;inset:0;background:oklch(0% 0 0);opacity:0}',
    '.dt-label{position:absolute;inset:' + TEXT_PAD + 'px;display:flex;align-items:center;justify-content:center;text-align:center}',
    '.dt-txt,.dt-measure{font-family:inherit;font-weight:700;line-height:' + TEXT_LH + ';color:var(--ink,oklch(18% 0.04 260));overflow-wrap:normal;word-break:normal;white-space:normal;max-width:100%}',
    '.dt-txt.dt-clamp{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere}',
    '.dt-measure{position:absolute;left:0;top:0;width:' + TEXT_BOX + 'px;max-width:none;overflow:hidden;visibility:hidden;pointer-events:none;text-align:center}'
  ].join('\n');

  function injectCss() {
    if (document.getElementById('dt-style')) return;
    var st = document.createElement('style');
    st.id = 'dt-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function qmul(a, b) {
    return [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
      a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
  }
  function qnorm(q) { var l = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]; }
  function qaxis(ax, ang) { var s = Math.sin(ang / 2); ax = norm(ax); return [Math.cos(ang / 2), ax[0] * s, ax[1] * s, ax[2] * s]; }
  function qslerp(a, b, t) {
    var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = [-b[0], -b[1], -b[2], -b[3]]; d = -d; }
    if (d > 0.9995) return qnorm([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]);
    var th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
    return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb, a[3] * wa + b[3] * wb];
  }
  function qmat(q) {
    var w = q[0], x = q[1], y = q[2], z = q[3];
    return [[1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
      [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
      [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]];
  }
  function mv(m, v) { return [dot(m[0], v), dot(m[1], v), dot(m[2], v)]; }
  function restZ(q) { var m = qmat(q), lo = Infinity; for (var i = 0; i < 8; i++) lo = Math.min(lo, mv(m, CORNERS[i])[2]); return -lo; }
  function upFace(q) {
    var m = qmat(q), best = 0, bz = -2;
    for (var i = 0; i < 6; i++) { var z = mv(m, NORMALS[i])[2]; if (z > bz) { bz = z; best = i; } }
    return best;
  }

  // Simulate one throw from launch until rest and record a frame every step.
  function simulate(width) {
    var dir = Math.random() < 0.5 ? 1 : -1;
    var half = width / 2;
    var p = [-dir * (half - 10 + Math.random() * 40), -40 - Math.random() * 30, 175 + Math.random() * 40];
    var v = [dir * Math.min(900, 200 + width * (0.45 + Math.random() * 0.35)), Math.random() * 50, 60 + Math.random() * 160];
    var spinAxis = norm([(Math.random() - 0.5) * 0.8, dir * (0.8 + Math.random() * 0.4), (Math.random() - 0.5) * 0.9]);
    var spin = 13 + Math.random() * 9;
    var w = [spinAxis[0] * spin, spinAxis[1] * spin, spinAxis[2] * spin];
    var q = qnorm([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]);
    var frames = [], t = 0, calm = 0, bounces = 0, airborne = true;

    while (t < MAX_TOTAL) {
      v[2] -= GRAVITY * STEP;
      var damp = Math.exp(-0.25 * STEP);
      w = [w[0] * damp, w[1] * damp, w[2] * damp];
      p = [p[0] + v[0] * STEP, p[1] + v[1] * STEP, p[2] + v[2] * STEP];
      var wl = Math.hypot(w[0], w[1], w[2]);
      if (wl > 1e-6) q = qnorm(qmul(qaxis(w, wl * STEP), q));

      var m = qmat(q), contacts = [], pen = 0;
      for (var i = 0; i < 8; i++) {
        var r = mv(m, CORNERS[i]);
        var z = p[2] + r[2];
        if (z < 0) {
          var vc = [v[0] + w[1] * r[2] - w[2] * r[1], v[1] + w[2] * r[0] - w[0] * r[2], v[2] + w[0] * r[1] - w[1] * r[0]];
          var rn = cross(r, [0, 0, 1]);
          contacts.push({ r: r, target: vc[2] < -80 ? -RESTITUTION * vc[2] : 0, kn: 1 / MASS + dot(rn, rn) / INERTIA, pn: 0, pt: [0, 0] });
          pen = Math.max(pen, -z);
        }
      }
      if (contacts.length) {
        if (airborne && v[2] < -60) bounces++;
        airborne = false;
        for (var it = 0; it < 8; it++) {
          for (var c = 0; c < contacts.length; c++) {
            var k = contacts[c], rr = k.r;
            var vz = v[2] + w[0] * rr[1] - w[1] * rr[0];
            var dpn = -(vz - k.target) / k.kn, npn = Math.max(k.pn + dpn, 0);
            dpn = npn - k.pn; k.pn = npn;
            if (dpn) applyImpulse([0, 0, dpn], rr);
            var vx = v[0] + w[1] * rr[2] - w[2] * rr[1], vy = v[1] + w[2] * rr[0] - w[0] * rr[2];
            var rx = cross(rr, [1, 0, 0]), ry = cross(rr, [0, 1, 0]);
            var kx = 1 / MASS + dot(rx, rx) / INERTIA, ky = 1 / MASS + dot(ry, ry) / INERTIA;
            var ptx = k.pt[0] - vx / kx, pty = k.pt[1] - vy / ky, cap = FRICTION * k.pn, mag = Math.hypot(ptx, pty);
            if (mag > cap && mag > 0) { ptx *= cap / mag; pty *= cap / mag; }
            var dx = ptx - k.pt[0], dy = pty - k.pt[1];
            k.pt = [ptx, pty];
            if (dx || dy) applyImpulse([dx, dy, 0], rr);
          }
        }
        p[2] += pen;
        var rd = Math.exp(-1.6 * STEP);
        w = [w[0] * rd, w[1] * rd, w[2] * rd];
      } else if (p[2] > H * 1.8) {
        airborne = true;
      }
      t += STEP;
      frames.push({ p: p.slice(), q: q.slice() });

      var speed = Math.hypot(v[0], v[1], v[2]), spinNow = Math.hypot(w[0], w[1], w[2]);
      calm = contacts.length && speed < 70 && spinNow < 4 ? calm + 1 : 0;
      if (t > 0.9 && (calm > 4 || t > MAX_TOTAL - SETTLE_TIME)) break;
    }

    // Tip onto whichever face is now closest to up and rock to rest.
    var q0 = q, face = upFace(q0), nUp = mv(qmat(q0), NORMALS[face]);
    var axis = cross(nUp, [0, 0, 1]), sn = Math.hypot(axis[0], axis[1], axis[2]);
    var qT = sn > 1e-6 ? qnorm(qmul(qaxis(axis, Math.asin(Math.min(1, sn))), q0)) : q0;
    var tip = Math.asin(Math.min(1, sn)), natural = 0.12 + (SETTLE_TIME - 0.12) * Math.min(1, tip / 0.6);
    var dur = Math.max(natural, Math.min(0.5, MIN_TOTAL - t));
    var drift = [v[0], v[1]], n = Math.round(dur / STEP), sp = p.slice();
    for (var s = 1; s <= n; s++) {
      var u = s / n;
      var f = 1 - Math.pow(1 - u, 3) + 0.09 * Math.sin(Math.PI * 2 * u) * (1 - u);
      var qs = qslerp(q0, qT, f);
      var travel = (1 - Math.pow(1 - u, 2)) * dur / 2;
      frames.push({ p: [sp[0] + drift[0] * travel, sp[1] + drift[1] * travel, restZ(qs)], q: qs });
    }
    var last = frames[frames.length - 1];
    return { frames: frames, face: face, total: frames.length * STEP, natural: t + natural, end: last.p, bounces: bounces };

    function applyImpulse(P, r) {
      v = [v[0] + P[0] / MASS, v[1] + P[1] / MASS, v[2] + P[2] / MASS];
      var tq = cross(r, P);
      w = [w[0] + tq[0] / INERTIA, w[1] + tq[1] / INERTIA, w[2] + tq[2] / INERTIA];
    }
  }

  // Run throws until one fits the time window, then slide it so it rests in frame.
  function planThrow(width) {
    var best = null, bestScore = Infinity;
    for (var i = 0; i < 90; i++) {
      var sim = simulate(width);
      var e = sim.end, margin = Math.max(0, Math.min(width / 2 - SIZE * 1.2, 220));
      sim.dx = Math.max(-margin, Math.min(margin, e[0])) - e[0];
      sim.dy = Math.max(-30, Math.min(30, e[1])) - e[1];
      var score = 3 * (Math.max(0, MIN_TOTAL - sim.natural) + Math.max(0, sim.total - MAX_TOTAL)) + (sim.bounces < 2 ? 0.05 : 0) +
        Math.max(0, Math.abs(sim.dx) - 30) / 150 + Math.max(0, Math.abs(sim.dy) - 20) / 150;
      if (score < bestScore) { best = sim; bestScore = score; }
      if (score === 0) break;
    }
    best.frames.forEach(function (f) { f.p[0] += best.dx; f.p[1] += best.dy; });
    return best;
  }

  // Assign pips so the landing face shows the result and opposite faces sum to 7.
  function labelFaces(upIdx, result) {
    var labels = [0, 0, 0, 0, 0, 0], opp = function (i) { return i ^ 1; };
    labels[upIdx] = result; labels[opp(upIdx)] = 7 - result;
    var pairs = [[1, 6], [2, 5], [3, 4]].filter(function (pr) { return pr[0] !== result && pr[1] !== result; });
    if (Math.random() < 0.5) pairs.reverse();
    var free = [0, 2, 4].filter(function (i) { return i !== (upIdx & ~1); });
    for (var j = 0; j < 2; j++) {
      var pr = Math.random() < 0.5 ? pairs[j] : [pairs[j][1], pairs[j][0]];
      labels[free[j]] = pr[0]; labels[free[j] + 1] = pr[1];
    }
    return labels;
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // Put the result on the landing face and fill the other five from the remaining options.
  function labelOptions(upIdx, result, options) {
    var pool = shuffle(options.filter(function (o) { return o !== result; })), others = pool.slice(0, 5);
    var spare = pool.length ? pool : [result];
    for (var k = 0; others.length < 5; k++) others.push(spare[k % spare.length]);
    shuffle(others);
    var labels = [];
    for (var i = 0, j = 0; i < 6; i++) labels.push(i === upIdx ? result : others[j++]);
    return labels;
  }

  // Find the largest bold size that fits the face in up to two lines, else clamp at the minimum.
  function fitText(st, text) {
    if (st.fit[text]) return st.fit[text];
    var m = st.measure, host = st.stage.isConnected && st.stage.getClientRects().length ? st.stage : document.body;
    host.appendChild(m);
    m.textContent = text;
    var out = { size: TEXT_MIN, clamp: true };
    for (var s = TEXT_MAX; s >= TEXT_MIN; s--) {
      m.style.fontSize = s + 'px';
      if (m.scrollWidth <= TEXT_BOX + 0.5 && m.scrollHeight <= Math.ceil(2 * s * TEXT_LH) + 1) { out = { size: s, clamp: false }; break; }
    }
    host.removeChild(m);
    st.fit[text] = out;
    return out;
  }

  // Pick the quarter turn that makes a face read upright from the camera.
  function uprightTurn(q, i) {
    var m = qmat(q), xw = mv(m, FACE_X[i]), yw = mv(m, FACE_Y[i]), best = 0, bs = -Infinity;
    for (var k = 0; k < 4; k++) {
      var a = k * Math.PI / 2, score = -(Math.sin(a) * xw[1] - Math.cos(a) * yw[1]);
      if (score > bs) { bs = score; best = k; }
    }
    return best * 90;
  }

  function paintText(st, i, text, turn) {
    var f = st.faces[i];
    while (f.firstChild) f.removeChild(f.firstChild);
    var fit = fitText(st, text);
    var box = document.createElement('div');
    box.className = 'dt-label';
    if (turn) box.style.transform = 'rotate(' + turn + 'deg)';
    var span = document.createElement('span');
    span.className = 'dt-txt' + (fit.clamp ? ' dt-clamp' : '');
    span.style.fontSize = fit.size + 'px';
    span.textContent = text;
    box.appendChild(span);
    f.appendChild(box);
    f.appendChild(st.shades[i]);
  }

  function buildFace(st, i) {
    var f = document.createElement('div');
    f.className = 'dt-face';
    f.style.transform = FACE_TF[i];
    var shade = document.createElement('div');
    shade.className = 'dt-shade';
    st.faces.push(f); st.shades.push(shade);
    return f;
  }

  function paintFace(st, i, n) {
    var f = st.faces[i];
    while (f.firstChild) f.removeChild(f.firstChild);
    var turn = (n === 2 || n === 3 || n === 6) && Math.random() < 0.5;
    PIPS[n].forEach(function (cell) {
      var col = cell % 3, row = (cell / 3) | 0;
      if (turn) { var t = col; col = row; row = 2 - t; }
      var pip = document.createElement('i');
      pip.className = 'dt-pip';
      pip.style.left = (SIZE * (0.24 + col * 0.26)) + 'px';
      pip.style.top = (SIZE * (0.24 + row * 0.26)) + 'px';
      f.appendChild(pip);
    });
    f.appendChild(st.shades[i]);
  }

  // Paint all six faces, turning text on the landing face upright for the resting pose.
  function setLabels(st, labels, upIdx, restQ) {
    st.labels = labels;
    for (var i = 0; i < 6; i++) {
      if (typeof labels[i] === 'string') paintText(st, i, labels[i], i === upIdx ? uprightTurn(restQ, i) : 90 * Math.floor(Math.random() * 4));
      else paintFace(st, i, labels[i]);
    }
  }

  function render(st, p, q) {
    var m = qmat(q);
    st.die.style.transform = 'translate3d(' + p[0].toFixed(2) + 'px,' + p[1].toFixed(2) + 'px,' + p[2].toFixed(2) + 'px) matrix3d(' +
      m[0][0] + ',' + m[1][0] + ',' + m[2][0] + ',0,' + m[0][1] + ',' + m[1][1] + ',' + m[2][1] + ',0,' +
      m[0][2] + ',' + m[1][2] + ',' + m[2][2] + ',0,0,0,0,1)';
    for (var i = 0; i < 6; i++) {
      var d = dot(mv(m, NORMALS[i]), LIGHT);
      st.shades[i].style.opacity = Math.max(0, Math.min(0.32, (0.92 - d) * 0.24)).toFixed(3);
    }
    var hgt = Math.max(0, p[2] - restZ(q));
    var k = Math.min(1, hgt / 160);
    st.shadow.style.transform = 'translate3d(' + p[0].toFixed(2) + 'px,' + p[1].toFixed(2) + 'px,0.5px) scale(' + (0.92 + k * 0.6).toFixed(3) + ')';
    st.shadow.style.opacity = (0.32 * (1 - k)).toFixed(3);
    st.pos = p; st.q = q;
  }

  function restingQuat(face, yaw) {
    var n = NORMALS[face], axis = cross(n, [0, 0, 1]), sn = Math.hypot(axis[0], axis[1], axis[2]);
    var q = sn > 1e-6 ? qaxis(axis, Math.asin(sn)) : (n[2] > 0 ? [1, 0, 0, 0] : qaxis([1, 0, 0], Math.PI));
    return qnorm(qmul(qaxis([0, 0, 1], yaw), q));
  }

  function clampValue(n) { n = Math.round(Number(n)); return n >= 1 && n <= 6 ? n : 1; }

  // Keep non empty option strings, or return null for classic pips.
  function normFaces(faces) {
    if (!faces || typeof faces.length !== 'number' || typeof faces === 'string') return null;
    var out = [];
    for (var i = 0; i < faces.length; i++) {
      if (faces[i] === null || faces[i] === undefined) continue;
      var t = String(faces[i]).trim();
      if (t) out.push(t);
    }
    return out.length ? out : null;
  }

  function resolveValue(st, value) {
    if (!st.options) return clampValue(value);
    var t = value === null || value === undefined ? '' : String(value).trim();
    return t || st.options[0];
  }

  function mount(el, value, faces) {
    if (!el) return;
    injectCss();
    if (el.__dt && el.__dt.stage && el.contains(el.__dt.stage)) {
      if (!el.__dt.rolling) el.__dt.options = normFaces(faces);
      show(el, value);
      return;
    }
    var st = { faces: [], shades: [], rolling: null, options: normFaces(faces), fit: {} };
    st.value = resolveValue(st, value);
    var stage = document.createElement('div');
    stage.className = 'dt-stage';
    stage.setAttribute('role', 'img');
    var world = document.createElement('div');
    world.className = 'dt-world';
    var floor = document.createElement('div');
    floor.className = 'dt-floor';
    var shadow = document.createElement('div');
    shadow.className = 'dt-shadow';
    var die = document.createElement('div');
    die.className = 'dt-die';
    ['rotateY(90deg)', 'rotateX(90deg)', 'none'].forEach(function (tf) {
      var c = document.createElement('div');
      c.className = 'dt-core';
      c.style.transform = tf;
      die.appendChild(c);
    });
    for (var i = 0; i < 6; i++) die.appendChild(buildFace(st, i));
    world.appendChild(floor); world.appendChild(shadow); world.appendChild(die);
    stage.appendChild(world);
    el.innerHTML = '';
    el.appendChild(stage);
    var measure = document.createElement('div');
    measure.className = 'dt-measure';
    measure.setAttribute('aria-hidden', 'true');
    st.stage = stage; st.die = die; st.shadow = shadow; st.measure = measure;
    el.__dt = st;
    show(el, st.value);
  }

  function show(el, n) {
    if (!el) return;
    if (!el.__dt) { mount(el, n); return; }
    var st = el.__dt;
    if (st.rolling) return;
    n = resolveValue(st, n);
    st.value = n;
    var q = restingQuat(0, 0.42);
    setLabels(st, st.options ? labelOptions(0, n, st.options) : labelFaces(0, n), 0, q);
    var pos = st.pos ? [st.pos[0], st.pos[1], 0] : [0, 0, 0];
    pos[2] = restZ(q);
    render(st, pos, q);
    st.stage.setAttribute('aria-label', 'Die showing ' + n);
  }

  function reducedMotion() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

  function roll(el, faces) {
    if (!el) return Promise.resolve(0);
    if (!el.__dt) mount(el, null, faces);
    var st = el.__dt;
    if (st.rolling) return st.rolling;
    if (faces !== undefined) st.options = normFaces(faces);
    var opts = st.options;
    var result = opts ? opts[Math.floor(Math.random() * opts.length)] : 1 + Math.floor(Math.random() * 6);
    if (reducedMotion()) {
      show(el, result);
      return Promise.resolve(result);
    }
    var width = st.stage.clientWidth || 360;
    var plan = planThrow(width);
    var restQ = plan.frames[plan.frames.length - 1].q;
    setLabels(st, opts ? labelOptions(plan.face, result, opts) : labelFaces(plan.face, result), plan.face, restQ);
    st.stage.setAttribute('aria-label', 'Rolling die');
    st.rolling = new Promise(function (resolve) {
      var start = null, done = false, frames = plan.frames;
      function finish() {
        if (done) return;
        done = true;
        var f = frames[frames.length - 1];
        render(st, f.p, f.q);
        st.value = result;
        st.rolling = null;
        st.stage.setAttribute('aria-label', 'Die showing ' + result);
        resolve(result);
      }
      function tick(now) {
        if (done) return;
        if (start === null) start = now;
        var idx = (now - start) / 1000 / STEP;
        if (idx >= frames.length - 1 || !el.isConnected) { finish(); return; }
        var i0 = Math.floor(idx), a = frames[i0], b = frames[i0 + 1], u = idx - i0;
        render(st, [a.p[0] + (b.p[0] - a.p[0]) * u, a.p[1] + (b.p[1] - a.p[1]) * u, a.p[2] + (b.p[2] - a.p[2]) * u], qslerp(a.q, b.q, u));
        requestAnimationFrame(tick);
      }
      render(st, frames[0].p, frames[0].q);
      requestAnimationFrame(tick);
      setTimeout(finish, plan.total * 1000 + 1500);
    });
    st.rolling.plan = plan;
    return st.rolling;
  }

  window.DiceThrow = { mount: mount, roll: roll, show: show };
})();
