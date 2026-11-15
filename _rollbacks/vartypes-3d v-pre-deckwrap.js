/* Variable 3D: a real N sided die that drops, bounces and settles on a table, a card deck that cuts,
   riffles and deals, and slot machine drums for random pick and random number.
   Registers the diceroll, carddeck, randompick and randomnumber controls with PL_MOTION (vartypes-motion.js).
   Everything is DOM and CSS 3D driven by the Web Animations API, no canvas, no library.
   If this file fails to load, vartypes.js draws its own dice, deck and text reel as before. */
(function () {
  const M = window.PL_MOTION;
  if (!M || !M.register) return;
  const { cfg, flash, reduced, clamp, esc, safe } = M;
  // See the RANDOMISER MOTION CONTRACT in vartypes-motion.js: results come from rand(), motion follows mode(), never the OS switch
  const rand = M.rand || (n => Math.floor(Math.random() * n));
  const mode = M.mode || (() => 'full');
  const modeButton = M.modeButton || (() => '');
  const CSS = [];

  // ---- vector helpers ----
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const unit = a => mul(a, 1 / len(a));
  const f4 = n => (Math.round(n * 10000) / 10000);

  // ---- geometry: N face normals, then the solid is every plane n.x = 1 clipped by every other ----
  const PHI = (1 + Math.sqrt(5)) / 2;
  function signs3() { const o = []; [1, -1].forEach(x => [1, -1].forEach(y => [1, -1].forEach(z => o.push([x, y, z])))); return o; }
  function fibonacci(n) {
    const o = [], g = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) { const y = 1 - (2 * i + 1) / n, r = Math.sqrt(1 - y * y), t = i * g; o.push([Math.cos(t) * r, y, Math.sin(t) * r]); }
    return o;
  }
  function normalsFor(n) {
    if (n === 4) return [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(unit);
    if (n === 6) return [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, -1, 0], [0, 1, 0]];
    if (n === 8) return signs3().map(unit);
    if (n === 12) { const o = []; [1, -1].forEach(a => [1, -1].forEach(b => { o.push([0, a, b * PHI], [a, b * PHI, 0], [b * PHI, 0, a]); })); return o.map(unit); }
    if (n === 20) {
      const o = signs3(); const q = 1 / PHI;
      [1, -1].forEach(a => [1, -1].forEach(b => { o.push([0, a * q, b * PHI], [a * q, b * PHI, 0], [b * PHI, 0, a * q]); }));
      return o.map(unit);
    }
    return fibonacci(n);
  }
  // Clip a polygon (3D points on one plane) to the half space n.x <= 1
  function clip(poly, n) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], sa = dot(n, a) - 1, sb = dot(n, b) - 1;
      if (sa <= 1e-9) out.push(a);
      if ((sa < -1e-9 && sb > 1e-9) || (sa > 1e-9 && sb < -1e-9)) { const t = sa / (sa - sb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); }
    }
    return out;
  }
  // Frame of a face: d is screen down inside the plane, u = d x n, so (u, d, n) is a proper rotation
  function frame(n) {
    let d = sub([0, 1, 0], mul(n, n[1]));
    if (len(d) < 0.25) d = sub([0, 0, 1], mul(n, n[2]));
    d = unit(d);
    return { u: cross(d, n), d, n };
  }
  const geoms = {};
  // Faces for N sides. Under 4 sides, or when the normals do not close, a cube with repeating labels
  function geom(N) {
    if (geoms[N]) return geoms[N];
    let ns = N >= 4 ? normalsFor(N) : normalsFor(6), cube = N < 4;
    let faces = build(ns);
    if (!faces) { ns = normalsFor(6); cube = true; faces = build(ns); }
    const count = ns.length;
    // opposite faces add up to N + 1 on the regular solids, like a real die
    const label = Array.from({ length: count }, (_, i) => i);
    if (!cube && (N === 6 || N === 8 || N === 12 || N === 20)) {
      const done = {}; let v = 0;
      for (let i = 0; i < count; i++) {
        if (done[i]) continue;
        let j = -1; for (let k = 0; k < count; k++) if (k !== i && dot(ns[i], ns[k]) < -0.999) { j = k; break; }
        label[i] = v; done[i] = 1;
        if (j >= 0) { label[j] = N - 1 - v; done[j] = 1; }
        v++;
      }
    } else if (cube) for (let i = 0; i < count; i++) label[i] = i % N;
    return (geoms[N] = { N, cube, count, faces, label });
  }
  function build(ns) {
    const faces = [];
    for (let i = 0; i < ns.length; i++) {
      const n = ns[i], fr = frame(n), B = 40;
      let poly = [[-B, -B], [B, -B], [B, B], [-B, B]].map(([a, b]) => [n[0] + fr.u[0] * a + fr.d[0] * b, n[1] + fr.u[1] * a + fr.d[1] * b, n[2] + fr.u[2] * a + fr.d[2] * b]);
      for (let j = 0; j < ns.length && poly.length; j++) if (j !== i) poly = clip(poly, ns[j]);
      if (poly.length < 3 || poly.some(p => len(p) > 9)) return null;
      const pts = poly.map(p => { const q = sub(p, n); return [dot(q, fr.u), dot(q, fr.d)]; });
      const c = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
      let r = 9;
      for (let k = 0; k < pts.length; k++) {
        const a = pts[k], b = pts[(k + 1) % pts.length], ex = b[0] - a[0], ey = b[1] - a[1], l = Math.hypot(ex, ey) || 1;
        r = Math.min(r, Math.abs((c[0] - a[0]) * ey - (c[1] - a[1]) * ex) / l);
      }
      faces.push({ n, fr, pts, c, r, ext: Math.max.apply(null, pts.map(p => Math.max(Math.abs(p[0]), Math.abs(p[1])))) });
    }
    return faces;
  }
  M.geom3d = geom;

  // ---- orientation: spin so a chosen face looks at the camera, text upright ----
  const TARGET = unit([0, -0.42, 1]);
  function facing(fr) {
    const nt = TARGET, dt = unit(sub([0, 1, 0], mul(nt, nt[1]))), ut = cross(dt, nt);
    const col = j => [ut[0] * fr.u[j] + dt[0] * fr.d[j] + nt[0] * fr.n[j], ut[1] * fr.u[j] + dt[1] * fr.d[j] + nt[1] * fr.n[j], ut[2] * fr.u[j] + dt[2] * fr.d[j] + nt[2] * fr.n[j]];
    const c0 = col(0), c1 = col(1), c2 = col(2);
    return `matrix3d(${[c0[0], c0[1], c0[2], 0, c1[0], c1[1], c1[2], 0, c2[0], c2[1], c2[2], 0, 0, 0, 0, 1].map(f4).join(',')})`;
  }
  const IDLE = 'rotateX(-24deg) rotateY(-34deg)';

  // ---- dice markup ----
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const baseR = n => (n <= 8 ? 34 : n <= 20 ? 38 : n <= 50 ? 42 : 46);
  const ROWS = { 1: [1], 2: [2], 3: [3], 4: [2, 2], 5: [3, 2], 6: [3, 3] };
  const scaleFor = c => (c <= 2 ? 1 : c === 3 ? 0.9 : 0.8);
  function dims(sides, count) {
    const R = Math.round(baseR(sides) * scaleFor(count) * 10) / 10;
    return { R, cw: Math.round(2.6 * R + 8), ch: Math.round(4.6 * R), cy: 2.7 * R, ty: 3.7 * R };
  }
  function faceSvg(g, i, text, R, pips) {
    const f = g.faces[i], W = Math.ceil(2 * f.ext * R) + 6, h = W / 2, rr = f.r * R;
    const poly = f.pts.map(p => f4(h + p[0] * R) + ',' + f4(h + p[1] * R)).join(' ');
    const L = unit([-0.5, -0.7, 0.55]), shade = clamp(0.1 * (1 - dot(f.n, L)), 0, 0.2).toFixed(3);
    const cx = h + f.c[0] * R, cy = h + f.c[1] * R;
    let body;
    if (pips) body = (PIPS[+text] || []).map(k => `<circle cx="${f4(cx + ((k % 3) - 1) * 0.5 * R)}" cy="${f4(cy + (Math.floor(k / 3) - 1) * 0.5 * R)}" r="${f4(0.13 * R)}"/>`).join('');
    else {
      let t = String(text == null ? '' : text);
      const max = Math.max(2, Math.floor((2.6 * rr) / (0.62 * 7)));
      if (t.length > max) t = t.slice(0, max - 1) + '…';
      const fs = Math.max(7, Math.min(rr * 1.1, (2.6 * rr) / (0.62 * Math.max(t.length, 1))));
      body = `<text x="${f4(cx)}" y="${f4(cy)}" text-anchor="middle" dominant-baseline="central" font-size="${f4(fs)}">${esc(t)}</text>`;
    }
    const m = f.fr, T = mul(f.n, R);
    const mat = `matrix3d(${[m.u[0], m.u[1], m.u[2], 0, m.d[0], m.d[1], m.d[2], 0, m.n[0], m.n[1], m.n[2], 0, T[0], T[1], T[2], 1].map(f4).join(',')})`;
    return `<svg class="vd3-f" data-i="${i}" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}" style="left:${-h}px;top:${-h}px;transform:${mat}" aria-hidden="true"><polygon class="vd3-p" points="${poly}"/><polygon class="vd3-s" points="${poly}" opacity="${shade}"/>${body}</svg>`;
  }
  // labels: the text for each value index; pose: a transform string for the cube
  function cubeHtml(sides, labels, d, pose, pips) {
    const g = geom(sides);
    return `<div class="vd3-cube" data-faces="${g.count}" data-sides="${sides}" style="transform:${pose}">${g.faces.map((_, i) => faceSvg(g, i, labels[g.label[i]], d.R, pips)).join('')}</div>`;
  }
  function cellHtml(sides, labels, d, k, pips) {
    return `<span class="vd-die vd3-cell" style="--k:${k};width:${d.cw}px;height:${d.ch}px;--cy:${f4(d.cy)}px;--ty:${f4(d.ty)}px;--R:${d.R}px"><i class="vd3-shadow"></i><span class="vd3-fly">${cubeHtml(sides, labels, d, IDLE, pips)}</span></span>`;
  }
  function stageHtml(sides, labels, count, pips) {
    const d = dims(sides, count), rows = ROWS[count] || [count];
    let k = 0;
    return rows.map(n => `<div class="vd3-row" style="height:${d.ch}px;--rowty:${f4(d.ty)}px">${Array.from({ length: n }, () => cellHtml(sides, labels, d, k++, pips)).join('')}</div>`).join('');
  }

  // ---- dice control ----
  const PRESETS = [4, 6, 8, 10, 12, 20, 100];
  const MINUS = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const PLUS = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 12h12M12 6v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const isNum = s => /^-?\d+$/.test(String(s).trim());
  function resultText(picks) {
    const text = picks.join(', ');
    return picks.length > 1 && picks.every(isNum) ? text + ' (total ' + picks.reduce((a, b) => a + parseInt(b, 10), 0) + ')' : text;
  }
  function faceValues(g) {
    if (g.dataset.custom === '1') { try { return JSON.parse(g.dataset.opts || '[]'); } catch (_) { return []; } }
    return Array.from({ length: +g.dataset.sides }, (_, i) => String(i + 1));
  }
  const usePips = g => g.dataset.custom !== '1' && +g.dataset.sides === 6;
  function stepHtml(kind, label, value, less, more, lo, hi) {
    return `<div class="vd-step" data-vdk="${kind}"><span class="vd-lab">${label}</span><button type="button" data-vdstep="-1" aria-label="${less}"${value <= lo ? ' disabled' : ''}>${MINUS}</button><b>${value}</b><button type="button" data-vdstep="1" aria-label="${more}"${value >= hi ? ' disabled' : ''}>${PLUS}</button></div>`;
  }
  M.register('diceroll', function (v, m, val) {
    const opts = (m.options || []).map(o => String(o).trim()).filter(Boolean), custom = opts.length > 0;
    const sides = custom ? opts.length : clamp(parseInt(m.faces, 10) || 6, 2, 100);
    const labels = custom ? opts : Array.from({ length: sides }, (_, i) => String(i + 1));
    return `<div class="vd" data-vd="${esc(v)}" data-custom="${custom ? 1 : 0}" data-sides="${sides}" data-count="1" data-opts="${esc(JSON.stringify(opts))}">
      <div class="vd-out"><output aria-live="polite">${esc(val || 'Ready to roll')}</output><button type="button" data-vdgo>Roll dice</button>${modeButton()}</div>
      <div class="vd-stage" aria-hidden="true">${stageHtml(sides, labels, 1, !custom && sides === 6)}</div>
      <div class="vd-ctl">
        ${custom ? '' : stepHtml('sides', 'Sides', sides, 'Fewer sides', 'More sides', 2, 100) + `<div class="vd-presets">${PRESETS.map(n => `<button type="button" class="vd-pre${n === sides ? ' on' : ''}" data-vdsides="${n}">${n}</button>`).join('')}</div>`}
        ${stepHtml('count', 'Dice', 1, 'Fewer dice', 'More dice', 1, 6)}
      </div>
      <input type="hidden" data-var="${esc(v)}" value="${esc(val)}"></div>`;
  });
  function syncUi(g) {
    const sides = +g.dataset.sides, count = +g.dataset.count;
    g.querySelectorAll('[data-vdk]').forEach(s => {
      const kind = s.dataset.vdk, n = kind === 'sides' ? sides : count, lo = kind === 'sides' ? 2 : 1, hi = kind === 'sides' ? 100 : 6;
      s.querySelector('b').textContent = n;
      s.querySelector('[data-vdstep="-1"]').disabled = n <= lo;
      s.querySelector('[data-vdstep="1"]').disabled = n >= hi;
    });
    g.querySelectorAll('[data-vdsides]').forEach(b => b.classList.toggle('on', +b.dataset.vdsides === sides));
  }
  function redraw(g) {
    const st = g.querySelector('.vd-stage');
    st.innerHTML = stageHtml(+g.dataset.sides, faceValues(g), +g.dataset.count, usePips(g));
    flash(st, 'vd-morph', 260);
  }
  function setSides(g, n) { if (g.dataset.custom === '1') return; g.dataset.sides = clamp(n, 2, 100); syncUi(g); redraw(g); }
  function setCount(g, n) { g.dataset.count = clamp(n, 1, 6); syncUi(g); redraw(g); }

  // One die: drop from above, hop three times across the table, tumble on one axis, land on the chosen face
  function throwDie(cell, faceIdx, sides, delay, D, amp) {
    const g = geom(sides), cube = cell.querySelector('.vd3-cube'), fly = cell.querySelector('.vd3-fly'), sh = cell.querySelector('.vd3-shadow');
    const R = parseFloat(getComputedStyle(cell).getPropertyValue('--R')) || 34, fin = facing(g.faces[faceIdx].fr);
    const side = Math.random() < 0.5 ? -1 : 1, x0 = side * (R * (1.6 + Math.random())), up = 4.5 * R + 10;
    let A = unit([Math.random() - 0.5, Math.random() - 0.5, (Math.random() - 0.5) * 0.6]);
    if (!isFinite(A[0])) A = [1, 0, 0];
    const spin = (2.4 + Math.random() * 1.2) * 2 * Math.PI * (0.6 + 0.4 * amp);
    // offsets: fall, hop 1, hop 2, hop 3, rest
    const O = [0, 0.3, 0.46, 0.6, 0.71, 0.82, 0.9, 1];
    const Hh = [up, 0, 1.3 * R, 0, 0.5 * R, 0, 0.16 * R, 0];
    const X = [x0, x0 * 0.45, x0 * 0.16, -x0 * 0.05, -x0 * 0.04, 0, 0, 0];
    const ANG = [1, 0.52, 0.4, 0.27, 0.18, 0.1, 0.04, 0];
    const FALL = 'cubic-bezier(.55,0,.95,.7)', RISE = 'cubic-bezier(.1,.55,.4,1)';
    const hit = i => Hh[i] === 0 && i > 0;
    const flyKf = O.map((o, i) => ({ offset: o, transform: `translate(${f4(X[i])}px,${f4(-Hh[i])}px) scale(${hit(i) ? '1.07,.93' : '1,1'})`, easing: Hh[i] > Hh[i + 1] ? FALL : RISE }));
    const shKf = O.map((o, i) => ({ offset: o, transform: `translateX(${f4(X[i])}px) scale(${f4(1 / (1 + Hh[i] / (2.2 * R)))})`, opacity: f4(0.5 / (1 + Hh[i] / (1.5 * R))), easing: Hh[i] > Hh[i + 1] ? FALL : RISE }));
    const cubeKf = O.map((o, i) => ({ offset: o, transform: `rotate3d(${f4(A[0])},${f4(A[1])},${f4(A[2])},${f4(spin * ANG[i])}rad) ${fin}`, easing: i < 5 ? 'linear' : 'ease-out' }));
    const opt = { duration: D, delay, fill: 'both' };
    return [fly.animate(flyKf, opt), sh.animate(shKf, opt), cube.animate(cubeKf, opt)];
  }
  function roll(g) {
    const vals = faceValues(g);
    if (!vals.length) return;
    const n = +g.dataset.count, sides = +g.dataset.sides, G = geom(sides), pips = usePips(g);
    // the result is chosen here, before any animation, so the motion never decides it
    const ks = Array.from({ length: n }, () => rand(vals.length));
    const picks = ks.map(k => vals[k]);
    const faceOf = k => Math.max(0, G.label.indexOf(k));
    const out = g.querySelector('output'), hidden = g.querySelector('input[data-var]'), go = g.querySelector('[data-vdgo]'), st = g.querySelector('.vd-stage');
    const settle = () => {
      st.querySelectorAll('.vd3-cell').forEach((cell, i) => {
        const cube = cell.querySelector('.vd3-cube');
        cube.style.transform = facing(G.faces[faceOf(ks[i])].fr);
        const f = cube.querySelector(`[data-i="${faceOf(ks[i])}"]`);
        if (f) f.classList.add('win');
      });
    };
    const finish = () => {
      settle();
      st.getAnimations({ subtree: true }).forEach(a => a.cancel());
      g._busy = false; go.disabled = false; st.classList.remove('vd-rolling');
      const text = resultText(picks);
      out.textContent = text; hidden.value = text;
      if (window.PL_VARS && window.PL_VARS.onChange) window.PL_VARS.onChange(g.dataset.vd, text);
    };
    const md = mode();
    if (md === 'off') { finish(); st.classList.add('vd-fade'); setTimeout(() => st.classList.remove('vd-fade'), 160); return; }
    const c = cfg('diceroll'), D = (md === 'short' ? 950 : 1900) / c.speed;
    g._busy = true; go.disabled = true; out.textContent = '';
    st.classList.add('vd-rolling');
    let last = null;
    st.querySelectorAll('.vd3-cell').forEach((cell, i) => {
      // restart from the face the player last saw; the throw begins above the stage
      const a = throwDie(cell, faceOf(ks[i]), sides, i * 110 / c.speed, D, md === 'short' ? c.intensity * 0.5 : c.intensity);
      last = a[0];
    });
    let done = false;
    const end = () => { if (done) return; done = true; g._end = null; finish(); };
    g._end = end;
    if (last && last.finished) last.finished.then(end, end);
    setTimeout(end, D + n * 110 / c.speed + 900);
  }
  document.addEventListener('click', safe('dice3d', e => {
    const g = e.target.closest && e.target.closest('.vd');
    if (!g) return;
    // a tap on the table while the dice move skips straight to the result
    if (g._busy) { if (g._end && e.target.closest('.vd-stage')) { e.preventDefault(); g._end(); } return; }
    if (e.target.closest('[data-vdgo]')) return roll(g);
    const pre = e.target.closest('[data-vdsides]');
    if (pre) return setSides(g, +pre.dataset.vdsides);
    const st = e.target.closest('[data-vdstep]');
    if (!st) return;
    const dir = +st.dataset.vdstep;
    if (st.closest('[data-vdk]').dataset.vdk === 'sides') setSides(g, +g.dataset.sides + dir); else setCount(g, +g.dataset.count + dir);
  }));
  CSS.push(`
.vd{--vd-sh:rgba(110,85,55,.34);display:grid;gap:14px;padding-top:6px}
.vd-stage{order:1}
.vd-ctl{order:2}
.vd-out{order:3}
.vd-stage{display:flex;flex-direction:column;align-items:center;overflow:hidden;border-radius:var(--r-md);background:var(--surface)}
.vd3-row{position:relative;display:flex;justify-content:center;width:100%}
.vd3-row::before{content:'';position:absolute;left:0;right:0;bottom:0;top:calc(var(--rowty,0px));background:var(--surface-3);border-top:1px solid var(--line)}
.vd3-cell{position:relative;display:block;flex:none;perspective:640px;perspective-origin:50% 30%}
.vd3-fly{position:absolute;inset:0;transform-style:preserve-3d;transform-origin:50% 75%}
.vd3-cube{position:absolute;left:50%;top:var(--cy);width:0;height:0;transform-style:preserve-3d}
.vd3-f{position:absolute;max-width:none;max-height:none;overflow:visible;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.vd3-p{fill:var(--surface-2);stroke:var(--ink-3);stroke-width:1.4;stroke-linejoin:round}
.vd3-s{fill:var(--ink);stroke:none}
.vd3-f text{fill:var(--ink);font-family:var(--ff-mono);font-weight:700}
.vd3-f circle{fill:var(--ink)}
.vd3-f.win .vd3-p{fill:var(--surface);stroke:var(--accent);stroke-width:2.4}
.vd3-f.win text{fill:var(--accent)}
.vd3-shadow{position:absolute;left:50%;top:var(--ty);width:calc(var(--R) * 2.4);height:calc(var(--R) * .5);margin:calc(var(--R) * -.1) 0 0 calc(var(--R) * -1.2);border-radius:50%;background:var(--vd-sh);opacity:.5}
.vd-ctl{display:flex;flex-direction:column;gap:10px}
.vd-step{display:flex;align-items:center;gap:10px}
.vd-lab{flex:1;font:600 13px var(--ff-sans);color:var(--ink-3)}
.vd-step b{min-width:34px;text-align:center;font:700 16px var(--ff-mono);color:var(--ink)}
.vd-step button{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border:0;border-radius:var(--r-md);background:var(--surface-3);color:var(--ink)}
.vd-step button:disabled{opacity:.4}
.vd-presets{display:flex;flex-wrap:wrap;gap:6px}
.vd-pre{min-width:40px;min-height:44px;padding:6px 8px;border:0;border-radius:999px;background:var(--surface-3);color:var(--ink-2);font:600 13px var(--ff-mono)}
.vd-pre.on{background:var(--accent);color:var(--on-accent)}
.vd-out{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.vd-out output{font-family:var(--ff-mono);flex:1;min-width:100px;padding:10px 14px;border:1px solid var(--line);border-radius:10px;font-weight:700}
.vd-out button{min-height:44px;padding:8px 16px;border:0;border-radius:var(--r-md);background:var(--accent);color:var(--on-accent);font-weight:700}
.vd-out button:disabled{opacity:.6}
.vd-morph .vd3-cube{animation:vd-morph calc(.26s / var(--vm-s,1)) var(--ease) both}
@keyframes vd-morph{0%{opacity:0;scale:.7}100%{opacity:1;scale:1}}
.vd-fade{animation:vd-fade .12s linear}
@keyframes vd-fade{0%{opacity:0}100%{opacity:1}}
@media (prefers-color-scheme:dark){.vd{--vd-sh:rgba(0,0,0,.55)}}
@media (prefers-reduced-motion:reduce){.vd-morph .vd3-cube{animation:none!important}}
`);

  // ---- card deck: cut, riffle twice, square up, deal one card face up ----
  const DECK = 12;
  const CARDS = ['Ace', 'King', 'Queen', 'Jack', 'Ten'];
  M.register('carddeck', function (v, m, val) {
    const opts = (m.options || []).map(o => String(o).split('|')[0].trim()).filter(Boolean), deck = opts.length ? opts : CARDS;
    return `<div class="vc${val ? ' drawn' : ''}" data-vc="${esc(v)}" data-options="${esc(JSON.stringify(deck))}"><div class="vc-table"><div class="vc-deck" aria-hidden="true">${Array.from({ length: DECK }, (_, i) => `<i class="vc-c" style="--i:${i}"></i>`).join('')}</div><div class="vc-slot"><div class="vc-card"><div class="vc-back"></div><div class="vc-face" data-vcface>${esc(val)}</div></div></div></div><div class="vc-row"><button type="button" data-vcdraw>Shuffle and draw</button><small data-vcleft>${deck.length} cards in the deck</small>${modeButton()}</div><input type="hidden" data-var="${esc(v)}" value="${esc(val)}"></div>`;
  });
  const base = i => `translate(${f4(-i * 0.3)}px,${f4(-i * 0.6)}px)`;
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  // Resolve when every animation has finished, never hang the control
  const all = (anims, cap) => Promise.race([Promise.all(anims.map(a => a.finished.catch(() => 0))), wait(cap)]);
  // live(): false once the draw was skipped, so a stopped shuffle never starts its next step
  async function riffle(cards, S, amp, live) {
    const half = DECK / 2, dx = 40 * amp, order = cards.slice();
    // cut: lower half goes left, upper half goes right
    await all(order.map((c, i) => {
      const left = i < half;
      return c.animate([{ transform: base(i) + ' rotate(0deg)' }, { transform: `${base(i)} translate(${left ? -dx : dx}px,${left ? 0 : -5}px) rotate(${left ? -6 : 6}deg)` }], { duration: 240 / S, easing: 'ease-out', fill: 'forwards' });
    }), 700);
    if (!live()) return;
    // riffle: cards fall one by one from alternating halves into a single stack
    const fromL = order.slice(0, half), fromR = order.slice(half), next = [];
    let a = 0, b = 0;
    for (let k = 0; k < DECK; k++) next.push(k % 2 === 0 ? (a < fromL.length ? fromL[a++] : fromR[b++]) : (b < fromR.length ? fromR[b++] : fromL[a++]));
    // the upper half drops from its bottom card, so the stack builds from the bottom up
    const idx = c => order.indexOf(c);
    const anims = next.map((c, k) => {
      const left = idx(c) < half, i0 = idx(c);
      c.style.zIndex = 100 + k;
      const cut = `${base(i0)} translate(${left ? -dx : dx}px,${left ? 0 : -5}px) rotate(${left ? -6 : 6}deg)`;
      const mid = `${base(k)} translate(${left ? -dx * 0.45 : dx * 0.45}px,${f4(-26 * amp)}px) rotate(${left ? -3 : 3}deg)`;
      const an = c.animate([{ transform: cut, offset: 0 }, { transform: mid, offset: 0.5, easing: 'ease-in' }, { transform: base(k) + ' rotate(0deg)', offset: 1 }], { duration: 300 / S, delay: (240 + k * 46) / S, easing: 'ease-out', fill: 'both' });
      an.finished.then(() => { c.style.zIndex = k + 1; }, () => {});
      return an;
    });
    await all(anims, 2000);
    if (!live()) return;
    cards.length = 0; next.forEach(c => cards.push(c));
    // square up: a quick squeeze and release of the whole stack
    const stack = cards[0].parentNode;
    await all([stack.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.06,.93)', offset: 0.45 }, { transform: 'scale(1,1)' }], { duration: 240 / S, easing: 'ease-in-out' })], 600);
    if (!live()) return;
    cards.forEach((c, i) => { c.getAnimations().forEach(x => x.cancel()); c.style.transform = base(i); });
  }
  async function drawCard(btn) {
    const g = btn.closest('[data-vc]');
    if (!g || g._busy) return;
    let all0 = [];
    try { all0 = JSON.parse(g.dataset.options || '[]'); } catch (_) {}
    if (!all0.length) return;
    if (!g._left || !g._left.length) g._left = all0.slice();
    const pick = g._left.splice(rand(g._left.length), 1)[0];
    const face = g.querySelector('[data-vcface]'), left = g.querySelector('[data-vcleft]'), hidden = g.querySelector('input[data-var]');
    const slotCard = g.querySelector('.vc-card');
    let valueSet = false, ended = false;
    const setValue = () => { if (valueSet) return; valueSet = true; face.textContent = pick; if (hidden) hidden.value = pick; if (window.PL_VARS && window.PL_VARS.onChange) window.PL_VARS.onChange(g.dataset.vc, pick); };
    const deckEl = g.querySelector('.vc-deck'), cards = Array.from(deckEl.querySelectorAll('.vc-c'));
    const done = () => {
      if (ended) return; ended = true;
      setValue();
      clearTimeout(g._watch); g._skip = null;
      // put every card back square, in its shuffled order, whatever step the motion stopped at
      [slotCard, deckEl].concat(cards).forEach(x => x.getAnimations().forEach(a => a.cancel()));
      cards.forEach((x, i) => { x.style.transform = base(i); x.style.zIndex = i + 1; });
      cards[cards.length - 1].style.visibility = 'hidden';
      g._busy = false; btn.disabled = false;
      g.classList.remove('shuffling', 'dealing'); g.classList.add('drawn');
      if (left) left.textContent = g._left.length ? g._left.length + ' card' + (g._left.length === 1 ? '' : 's') + ' left in the deck' : 'Deck empty, the next draw reshuffles';
    };
    const md = mode();
    if (md === 'off') return done();
    const c = cfg('carddeck'), S = c.speed * (md === 'short' ? 1.6 : 1), amp = 0.6 + c.intensity * 0.8;
    g._busy = true; btn.disabled = true;
    g.classList.remove('drawn', 'dealing'); g.classList.add('shuffling');
    cards.forEach(x => { x.style.visibility = ''; });
    // a tap on the table skips to the dealt card; the watchdog lands it if anything stalls
    let skipped = false;
    g._skip = () => { skipped = true; done(); };
    g._watch = setTimeout(done, 7000);
    try {
      await riffle(cards, S, amp, () => !skipped);
      if (skipped) return;
      if (md === 'full') { await riffle(cards, S * 1.15, amp, () => !skipped); if (skipped) return; }
      // deal: the top card slides out and turns over in the slot
      setValue();
      g.classList.remove('shuffling'); g.classList.add('dealing');
      const top = cards[cards.length - 1];
      await all([
        slotCard.animate([
          { transform: 'translate(-140px,0) rotateY(0deg)', opacity: 1, offset: 0 },
          { transform: 'translate(-70px,-22px) rotateY(90deg)', opacity: 1, offset: 0.5 },
          { transform: 'translate(0,0) rotateY(180deg)', opacity: 1, offset: 1 }], { duration: 700 / S, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }),
        top.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' })
      ], 1500);
    } catch (e) { /* fall through: the result still lands */ }
    done();
  }
  document.addEventListener('click', safe('deck3d', e => {
    const t = e.target.closest && e.target.closest('.vc-table');
    // the field is a <label>: preventDefault stops it forwarding this tap to the draw button and starting a new draw
    if (t) { const g = t.closest('[data-vc]'); if (g && g._busy && g._skip) { e.preventDefault(); return g._skip(); } }
    const b = e.target.closest && e.target.closest('[data-vcdraw]');
    if (b) drawCard(b);
  }));
  CSS.push(`
.vc{display:flex;flex-direction:column}
.vc-table{position:relative;height:150px;border-radius:var(--r-md);background:var(--surface-3);border:1px solid var(--line);overflow:hidden}
.vc-deck,.vc-slot{position:absolute;top:22px;width:76px;height:106px}
.vc-deck{left:44px}
.vc-slot{left:62px;margin-left:140px;perspective:700px}
.vc-slot::before{content:'';position:absolute;inset:0;border:1px dashed var(--line);border-radius:10px}
.vc-c{position:absolute;inset:0;border:1px solid var(--line);border-radius:10px;background:var(--surface-2);box-shadow:inset 0 0 0 5px var(--surface-3),1px 2px 3px rgba(110,85,55,.22),-1px -1px 2px rgba(255,255,255,.5);transform:translate(calc(var(--i) * -.3px),calc(var(--i) * -.6px));z-index:calc(var(--i) + 1)}
.vc-deck{transform-origin:50% 60%}
.vc-card{position:relative;width:100%;height:100%;opacity:0;transform-style:preserve-3d}
.vc-back,.vc-face{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:10px;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.vc-back{background:var(--surface-2);border:1px solid var(--line);box-shadow:inset 0 0 0 5px var(--surface-3)}
.vc-face{padding:8px;background:var(--surface);border:1px solid var(--accent);transform:rotateY(180deg);font:700 14px/1.25 var(--ff-sans);text-align:center;color:var(--ink);overflow:hidden;overflow-wrap:anywhere}
.vc.drawn .vc-card{opacity:1;transform:rotateY(180deg)}
.vc.dealing .vc-card{opacity:1}
.vc-row{display:flex;align-items:center;gap:12px;padding-top:8px}
.vc-row button{min-height:44px;padding:8px 14px;border:0;border-radius:var(--r-md);background:var(--accent);color:var(--on-accent);font-weight:700}
.vc-row button:disabled{opacity:.6}
.vc-row small{color:var(--ink-3);font-size:var(--t-meta)}
`);
  // ---- random pick and random number: slot machine drums ----
  // Random pick is one 3D drum of option slats that winds back, spins and clunks onto the chosen option.
  // Random number is one drum per digit; every drum starts together and they stop left to right.
  // The result is chosen first with rand(); the drums only travel to it.
  const PICK_N = 16, PICK_H = 52, DIG_N = 10, DIG_H = 56, MAX_DIGITS = 9;
  const PICK_DEFAULT = ['Option A', 'Option B', 'Option C'];
  const radius = (n, h) => f4((h / 2) / Math.tan(Math.PI / n));
  const turn = deg => `rotateX(${f4(deg)}deg)`;
  const norm360 = d => ((d % 360) + 360) % 360;
  function drumHtml(n, h, labels, at, cls) {
    const a = 360 / n, r = radius(n, h);
    const faces = labels.map((t, i) => `<span class="vr-f" data-i="${i}" style="height:${h}px;margin-top:${-h / 2}px;transform:rotateX(${f4(-i * a)}deg) translateZ(${r}px)"><span class="vr-t">${esc(t)}</span></span>`).join('');
    return `<div class="vr-win ${cls}" style="--h:${h}px"><div class="vr-drum" data-at="${at}" style="transform:${turn(at * a)}">${faces}</div></div>`;
  }
  // Spin a drum down to face t: a short wind back, a fast spin that slows, a small overshoot, then the clunk
  function spinTo(drum, n, t, spins, dur, delay) {
    const a = 360 / n, cur = drum._ang != null ? drum._ang : (+drum.dataset.at || 0) * a, base = t * a;
    const k = Math.ceil((base - cur + spins * 360) / 360 - 1e-9), fin = base - 360 * k;
    drum._fin = norm360(base);
    return drum.animate([
      { transform: turn(cur), offset: 0, easing: 'ease-in-out' },
      { transform: turn(cur + a * 0.35), offset: 0.08, easing: 'cubic-bezier(.2,.7,.25,1)' },
      { transform: turn(fin - a * 0.3), offset: 0.86, easing: 'cubic-bezier(.3,0,.45,1)' },
      { transform: turn(fin), offset: 1 }], { duration: dur, delay, fill: 'forwards' });
  }
  function rest(drum, n, t) {
    if (drum._fin == null) drum._fin = norm360(t * 360 / n);
    drum.getAnimations().forEach(x => x.cancel());
    drum._ang = drum._fin; drum.dataset.at = t;
    drum.style.transform = turn(drum._fin);
  }
  const blur = (win, dur, delay) => win.animate([{ filter: 'blur(0)' }, { filter: 'blur(1.6px)', offset: 0.18 }, { filter: 'blur(1.2px)', offset: 0.55 }, { filter: 'blur(0)' }], { duration: dur, delay, easing: 'ease-out' });
  const clunk = el => el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.035,.94)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' });
  function report(g, value) {
    const hidden = g.querySelector('input[data-var]'), out = g.querySelector('.vr-out');
    if (out) out.textContent = value;
    if (hidden) hidden.value = value;
    if (window.PL_VARS && window.PL_VARS.onChange) window.PL_VARS.onChange(g.dataset.vr, value);
  }
  function numRange(m) {
    const o = m.options || [];
    let lo = parseInt(o[0], 10), hi = parseInt(o[1], 10);
    if (isNaN(lo)) lo = 1;
    if (isNaN(hi)) hi = 100;
    if (lo > hi) [lo, hi] = [hi, lo];
    return [lo, hi];
  }

  M.register('randompick', function (v, m, val) {
    const opts = (m.options || []).map(o => String(o).split('|')[0].trim()).filter(Boolean), list = opts.length ? opts : PICK_DEFAULT;
    // face 0 holds the current value; the slats below and above continue through the options in order
    const vi = list.indexOf(val), start = vi < 0 ? 0 : vi;
    const labels = Array.from({ length: PICK_N }, (_, i) => i === 0 ? (val || 'Ready to spin') : list[(start + (vi < 0 ? i - 1 : i) + list.length * PICK_N) % list.length]);
    return `<div class="vr vr-pick" data-vr="${esc(v)}" data-kind="randompick" data-options="${esc(JSON.stringify(list))}">
      <div class="vr-stage">${drumHtml(PICK_N, PICK_H, labels, 0, 'vr-pw')}<i class="vr-pay" aria-hidden="true"></i></div>
      <div class="vr-row"><button type="button" data-vrgo>Pick at random</button><small>${list.length} option${list.length === 1 ? '' : 's'}</small>${modeButton()}</div>
      <output class="vr-out" aria-live="polite">${esc(val)}</output><input type="hidden" data-var="${esc(v)}" value="${esc(val)}"></div>`;
  });
  M.register('randomnumber', function (v, m, val) {
    const [lo, hi] = numRange(m), D = Math.max(String(Math.abs(lo)).length, String(Math.abs(hi)).length);
    // very long numbers keep the host's own text reel
    if (D > MAX_DIGITS || hi - lo + 1 > 4294967295) return null;
    const n = parseInt(val, 10), has = !isNaN(n), digits = String(Math.abs(has ? n : 0)).padStart(D, '0').slice(-D).split('').map(Number);
    const nz = digits.findIndex(d => d !== 0), first = nz < 0 ? D - 1 : nz;
    const digitLabels = Array.from({ length: DIG_N }, (_, i) => String(i));
    return `<div class="vr vr-num${has ? '' : ' idle'}" data-vr="${esc(v)}" data-kind="randomnumber" data-lo="${lo}" data-hi="${hi}">
      <div class="vr-stage"><div class="vr-digits">${lo < 0 ? `<b class="vr-sign">${has && n < 0 ? '-' : ''}</b>` : ''}${digits.map((d, i) => drumHtml(DIG_N, DIG_H, digitLabels, d, 'vr-dw' + (has && i < first ? ' lead' : ''))).join('')}</div><i class="vr-pay" aria-hidden="true"></i></div>
      <div class="vr-row"><button type="button" data-vrgo>Generate number</button><small>${lo} to ${hi}</small>${modeButton()}</div>
      <output class="vr-out" aria-live="polite">${esc(val)}</output><input type="hidden" data-var="${esc(v)}" value="${esc(val)}"></div>`;
  });
  function markLeading(g) {
    const ws = Array.from(g.querySelectorAll('.vr-dw'));
    let lead = true;
    ws.forEach((w, i) => { const d = +w.querySelector('.vr-drum').dataset.at; if (d !== 0 || i === ws.length - 1) lead = false; w.classList.toggle('lead', lead); });
  }
  function spinDrums(g) {
    const kind = g.dataset.kind, md = mode(), stage = g.querySelector('.vr-stage'), go = g.querySelector('[data-vrgo]');
    let value = '', jobs = [];
    if (kind === 'randompick') {
      let list = [];
      try { list = JSON.parse(g.dataset.options || '[]'); } catch (_) {}
      if (!list.length) return report(g, 'No valid options');
      const pi = rand(list.length);
      value = list[pi];
      const drum = g.querySelector('.vr-drum'), a = 360 / PICK_N;
      const front = Math.round(norm360(drum._ang != null ? drum._ang : (+drum.dataset.at || 0) * a) / a) % PICK_N, t = (front + PICK_N / 2) % PICK_N;
      // relabel every slat out of sight; the chosen option sits on the far side and its neighbours follow the list
      drum.querySelectorAll('.vr-f').forEach((f, i) => {
        const fromFront = Math.min((i - front + PICK_N) % PICK_N, (front - i + PICK_N) % PICK_N);
        if (fromFront <= 2) return;
        const off = ((i - t + PICK_N + PICK_N / 2) % PICK_N) - PICK_N / 2;
        f.querySelector('.vr-t').textContent = list[((pi + off) % list.length + list.length) % list.length];
        f.classList.remove('win');
      });
      jobs.push({ drum, n: PICK_N, t, spins: md === 'short' ? 2 : 4, dur: md === 'short' ? 950 : 2000, delay: 0 });
    } else {
      const lo = +g.dataset.lo, hi = +g.dataset.hi, n = lo + rand(hi - lo + 1);
      value = String(n);
      const drums = Array.from(g.querySelectorAll('.vr-dw .vr-drum')), D = drums.length;
      const digits = String(Math.abs(n)).padStart(D, '0').slice(-D).split('').map(Number);
      drums.forEach((drum, j) => jobs.push({ drum, n: DIG_N, t: digits[j], spins: md === 'short' ? 1 : 2 + j, dur: md === 'short' ? 600 + j * 160 : 1050 + j * 380, delay: 0 }));
      g._sign = n < 0 ? '-' : '';
    }
    let ended = false;
    const land = () => {
      if (ended) return; ended = true;
      clearTimeout(g._watch); g._end = null;
      stage.getAnimations({ subtree: true }).forEach(x => x.cancel());
      jobs.forEach(j => {
        rest(j.drum, j.n, j.t);
        j.drum.querySelectorAll('.vr-f').forEach(f => f.classList.toggle('win', +f.dataset.i === j.t));
      });
      const sign = g.querySelector('.vr-sign');
      if (sign) sign.textContent = g._sign || '';
      if (kind === 'randomnumber') markLeading(g);
      g._busy = false; go.disabled = false;
      g.classList.remove('spinning', 'idle'); g.classList.add('landed');
      report(g, value);
      if (md !== 'off') stage.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 300, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
    };
    if (md === 'off') return land();
    g._busy = true; go.disabled = true;
    g.classList.remove('landed', 'idle'); g.classList.add('spinning');
    g.querySelectorAll('.vr-f.win').forEach(f => f.classList.remove('win'));
    g.querySelectorAll('.vr-dw.lead').forEach(w => w.classList.remove('lead'));
    const sign = g.querySelector('.vr-sign');
    if (sign) sign.textContent = '';
    let longest = 0, lastAnim = null;
    jobs.forEach(j => {
      const an = spinTo(j.drum, j.n, j.t, j.spins, j.dur, j.delay), win = j.drum.parentNode;
      blur(win, j.dur * 0.9, j.delay);
      // each drum clunks as it stops, so a number lands digit by digit
      an.finished.then(() => { if (!ended) { rest(j.drum, j.n, j.t); clunk(win); } }, () => {});
      if (j.dur + j.delay >= longest) { longest = j.dur + j.delay; lastAnim = an; }
    });
    g._end = land;
    if (lastAnim) lastAnim.finished.then(() => setTimeout(land, 180), land);
    g._watch = setTimeout(land, longest + 1500);
  }
  document.addEventListener('click', safe('drums', e => {
    const g = e.target.closest && e.target.closest('.vr');
    if (!g) return;
    // a tap on the drums while they spin skips straight to the result; preventDefault keeps a host <label> from starting a new spin
    if (g._busy) { if (g._end && e.target.closest('.vr-stage')) { e.preventDefault(); g._end(); } return; }
    if (e.target.closest('[data-vrgo]')) spinDrums(g);
  }));
  CSS.push(`
.vr{display:flex;flex-direction:column;gap:10px;padding-top:6px}
.vr-stage{position:relative;display:flex;justify-content:center;padding:12px;border-radius:var(--r-md);background:var(--surface-3);border:1px solid var(--line);cursor:pointer;-webkit-tap-highlight-color:transparent}
.vr-win{position:relative;height:calc(var(--h) * 1.9);perspective:520px;overflow:hidden;border:1px solid var(--line);border-radius:10px;background:var(--surface);-webkit-mask-image:linear-gradient(transparent,#000 24%,#000 76%,transparent);mask-image:linear-gradient(transparent,#000 24%,#000 76%,transparent)}
.vr-pw{flex:1;max-width:320px}
.vr-drum{position:absolute;left:0;right:0;top:50%;height:0;transform-style:preserve-3d;will-change:transform}
.vr-f{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:0 14px;background:var(--surface-2);border-top:1px solid var(--line);border-bottom:1px solid var(--line);backface-visibility:hidden;-webkit-backface-visibility:hidden}
.vr-t{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-align:center;font:700 15px/1.25 var(--ff-sans);color:var(--ink);overflow-wrap:anywhere}
.vr-f.win{background:var(--surface)}
.vr-f.win .vr-t{color:var(--accent)}
.vr-pay{position:absolute;left:4px;right:4px;top:50%;height:0;pointer-events:none}
.vr-pay::before,.vr-pay::after{content:'';position:absolute;top:-7px;border:7px solid transparent}
.vr-pay::before{left:0;border-left-color:var(--accent)}
.vr-pay::after{right:0;border-right-color:var(--accent)}
.vr-digits{display:flex;align-items:center;gap:6px}
.vr-dw{width:44px;flex:none}
.vr-dw .vr-f{padding:0}
.vr-dw .vr-t{font:700 30px/1 var(--ff-mono)}
.vr-dw.lead .vr-t,.vr-num.idle .vr-t{color:var(--ink-3);opacity:.45}
.vr-sign{min-width:18px;text-align:center;font:700 30px/1 var(--ff-mono);color:var(--accent)}
.vr-row{display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.vr-row button[data-vrgo]{min-height:44px;padding:8px 14px;border:0;border-radius:var(--r-md);background:var(--accent);color:var(--on-accent);font-weight:700}
.vr-row button:disabled{opacity:.6}
.vr-row small{color:var(--ink-3);font-size:var(--t-meta)}
.vr-out{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`);
  const style = document.createElement('style');
  style.textContent = CSS.join('\n');
  document.head.appendChild(style);
})();
