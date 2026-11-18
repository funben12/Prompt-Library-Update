// Swipe deck: one prompt card at a time, drag right to keep, left to archive, delete from the bar, undo anything.
// Shared byte for byte by the desktop app (static/swipe-deck.js) and the phone app (assets/swipe-deck.js).
(function () {
  'use strict';
  if (window.PL_SwipeDeck) return;

  const CSS = `
.sd{display:flex;flex-direction:column;gap:12px;outline:none;min-width:0;width:100%;max-width:640px;margin:0 auto}
.sd-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-size:13px;color:var(--ink-3,#666)}
.sd-head b{font-family:var(--ff-mono,ui-monospace,monospace);font-weight:600;color:var(--ink,#111)}
.sd-tally{display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-end}
.sd-progress{height:4px;border-radius:2px;background:var(--surface-3,#ddd);overflow:hidden}
.sd-progress i{display:block;height:100%;background:var(--accent,#0a7);border-radius:2px;transition:width .3s}
.sd-stage{display:grid;padding:0 6px 22px;position:relative;touch-action:pan-y}
.sd-card{grid-area:1/1;position:relative;background:var(--surface,#fff);border:1px solid var(--line,#ccc);border-radius:16px;box-shadow:0 1px 2px oklch(20% 0.02 260 / .08),0 8px 24px oklch(20% 0.02 260 / .08);min-width:0;transform-origin:50% 100%}
.sd-front{z-index:3;cursor:grab;touch-action:pan-y;user-select:none;-webkit-user-select:none;will-change:transform}
.sd-front:focus-visible{outline:2px solid var(--accent,#0a7);outline-offset:3px}
.sd-front.sd-drag{cursor:grabbing}
.sd-front input,.sd-front textarea{user-select:text;-webkit-user-select:text}
.sd-peek{pointer-events:none;overflow:hidden;max-height:100%;transform:translateY(calc(var(--d) * 11px)) scale(calc(1 - var(--d) * 0.045));z-index:calc(3 - var(--d));filter:saturate(.85)}
.sd-peek .sd-face{opacity:calc(1 - var(--d) * 0.35)}
.sd-face{padding:18px 18px 14px}
.sd-stamp{position:absolute;top:16px;z-index:2;padding:4px 12px;border:3px solid currentColor;border-radius:10px;font:800 15px/1.2 var(--ff-sans,system-ui);letter-spacing:.12em;text-transform:uppercase;opacity:0;pointer-events:none;background:var(--surface,#fff)}
.sd-stamp-r{left:16px;color:var(--accent,#0a7);transform:rotate(-12deg)}
.sd-stamp-l{right:16px;color:var(--ink-2,#444);transform:rotate(12deg)}
.sd-stamp-d{left:50%;top:40%;color:var(--danger,#c22);transform:translate(-50%,-50%) rotate(-6deg)}
.sd-dock{position:sticky;bottom:0;z-index:6;background:var(--bg,#f2efe9);padding:8px 0 6px;display:flex;flex-direction:column;gap:6px}
.sd-bar{display:flex;justify-content:center;align-items:center;gap:14px;padding-top:2px}
.sd-btn{display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:0;padding:0;cursor:pointer;color:var(--ink-3,#666);font:600 12px var(--ff-sans,system-ui);min-width:64px}
.sd-btn .sd-dot{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:var(--surface,#fff);border:1px solid var(--line,#ccc);box-shadow:0 2px 8px oklch(20% 0.02 260 / .10);transition:transform .12s,background .12s}
.sd-btn svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.sd-btn:active .sd-dot{transform:scale(.92)}
.sd-btn:disabled{opacity:.35;cursor:default}
.sd-btn.sd-small .sd-dot{width:44px;height:44px}
.sd-btn.sd-small svg{width:20px;height:20px}
.sd-right .sd-dot{color:var(--accent,#0a7)}
.sd-left .sd-dot{color:var(--ink-2,#444)}
.sd-del .sd-dot{color:var(--danger,#c22)}
@media (hover:hover){.sd-btn:not(:disabled):hover .sd-dot{background:var(--surface-2,#eee)}}
.sd-hint{margin:0;text-align:center;font-size:12px;color:var(--ink-3,#777)}
.sd-empty{padding:40px 16px;text-align:center;color:var(--ink-3,#666);font-size:14px;line-height:1.5}
.sd-empty strong{display:block;font-size:17px;color:var(--ink,#111);margin-bottom:4px}
.sd-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:12px;background:var(--danger-soft,oklch(94% 0.04 30));color:var(--danger,#c22);font-size:13px;font-weight:600}
.sd-foot button{border:0;border-radius:999px;padding:8px 14px;min-height:36px;background:var(--danger,#c22);color:#fff;font:700 13px var(--ff-sans,system-ui);cursor:pointer}
`;

  const ICON = {
    right: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    left: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="4.5" rx="1"/><path d="M5.5 8.5V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V8.5M10 12.5h4"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l1 12a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1l1-12M9 7V4.5h6V7"/></svg>',
    undo: '<svg viewBox="0 0 24 24"><path d="M9 14L4.5 9.5 9 5"/><path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3"/></svg>'
  };

  function injectCss() {
    if (document.getElementById('sd-style')) return;
    const s = document.createElement('style');
    s.id = 'sd-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const vw = () => Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0, 320);

  // Web Animations only, so a global reduced motion rule in a stylesheet cannot shrink the motion to nothing
  function play(el, frames, opts) {
    return new Promise(res => {
      let done = false;
      const fin = () => { if (!done) { done = true; res(); } };
      const o = Object.assign({ fill: 'forwards' }, opts);
      if (reduced()) o.duration = Math.round(o.duration * 0.7);
      try {
        const a = el.animate(frames, o);
        a.onfinish = fin;
        a.oncancel = fin;
      } catch (e) { fin(); }
      setTimeout(fin, (o.duration || 300) + (o.delay || 0) + 300);
    });
  }

  function create(host, o) {
    injectCss();
    const labels = Object.assign({ right: 'Keep', left: 'Archive', del: 'Delete' }, o.labels || {});
    const st = { done: new Set(), stack: [], busy: false, front: null, tally: { right: 0, left: 0, del: 0 }, dead: false };
    let root = null, drag = null, swallowClick = false;

    const keyOf = it => String(o.key(it));
    function queue() {
      const q = o.items().filter(it => !st.done.has(keyOf(it)));
      if (st.front) {
        const i = q.findIndex(it => keyOf(it) === st.front);
        if (i > 0) q.unshift(q.splice(i, 1)[0]);
      }
      return q;
    }

    function btn(kind, cls) {
      const off = kind === 'undo' ? !st.stack.length : false;
      const label = kind === 'undo' ? 'Undo' : labels[kind];
      const keys = { right: 'ArrowRight', left: 'ArrowLeft', del: 'Delete', undo: 'Z' }[kind];
      return `<button type="button" class="sd-btn sd-${kind} ${cls || ''}" data-sd="${kind}" aria-keyshortcuts="${keys}" ${off ? 'disabled' : ''}><span class="sd-dot">${ICON[kind]}</span><span>${label}</span></button>`;
    }

    function render() {
      if (st.dead) return;
      const q = queue();
      const total = st.done.size + q.length;
      const pos = Math.min(total, st.done.size + 1);
      const t = st.tally;
      const tally = `<span>${labels.right} <b>${t.right}</b></span><span>${labels.left} <b>${t.left}</b></span><span>${labels.del} <b>${t.del}</b></span>`;
      let stage, bar;
      if (q.length) {
        const it = q[0];
        const peeks = q.slice(1, 3).map((p, i) => `<div class="sd-card sd-peek" aria-hidden="true" inert style="--d:${i + 1}"><div class="sd-face">${(o.peekHtml || o.cardHtml)(p)}</div></div>`).reverse().join('');
        stage = peeks + `<div class="sd-card sd-front" data-sd-key="${esc(keyOf(it))}" tabindex="0" role="group" aria-roledescription="card" aria-label="${esc(o.title ? o.title(it) : '')}">` +
          `<div class="sd-stamp sd-stamp-r" aria-hidden="true">${labels.right}</div><div class="sd-stamp sd-stamp-l" aria-hidden="true">${labels.left}</div><div class="sd-stamp sd-stamp-d" aria-hidden="true">${labels.del}</div>` +
          `<div class="sd-face">${o.cardHtml(it)}</div></div>`;
        bar = btn('left') + btn('undo', 'sd-small') + btn('del', 'sd-small') + btn('right');
      } else {
        stage = `<div class="sd-empty">${o.emptyHtml ? o.emptyHtml(st) : '<strong>All done</strong>Nothing left in this pile.'}</div>`;
        bar = st.stack.length ? btn('undo', 'sd-small') : '';
      }
      host.innerHTML = `<div class="sd" tabindex="-1">` +
        `<div class="sd-head"><span><b>${q.length ? pos : total}</b> of <b>${total}</b></span><span class="sd-tally">${tally}</span></div>` +
        `<div class="sd-progress"><i style="width:${total ? Math.round(st.done.size / total * 100) : 100}%"></i></div>` +
        `<div class="sd-stage">${stage}</div>` +
        `<div class="sd-dock">` +
        (o.footHtml ? o.footHtml(st) : '') +
        (bar ? `<div class="sd-bar" role="toolbar" aria-label="Sort this prompt">${bar}</div>` : '') +
        (q.length && o.hint ? `<p class="sd-hint">${o.hint}</p>` : '') +
        `</div></div>`;
      root = host.firstElementChild;
      root.addEventListener('click', onClick, true);
      root.addEventListener('keydown', onKey);
      const card = root.querySelector('.sd-front');
      if (card) bindDrag(card);
      if (o.afterRender) { try { o.afterRender(root, q[0] || null, st); } catch (e) { /* glue errors must not break the deck */ } }
      // Keep arrow keys live after every card, unless the person is typing somewhere
      const ae = document.activeElement;
      const typing = ae && ae.closest && ae.closest('input,textarea,select,[contenteditable]');
      if (o.autofocus !== false && !typing && host.offsetParent) (card || root).focus({ preventScroll: true });
      if (o.onChange) o.onChange(st);
    }

    function esc(s) {
      return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function onClick(e) {
      if (swallowClick) { swallowClick = false; e.preventDefault(); e.stopPropagation(); return; }
      const b = e.target.closest('[data-sd]');
      if (!b || b.disabled) return;
      e.preventDefault();
      const k = b.dataset.sd;
      if (k === 'undo') undo(); else swipe(k);
    }

    function onKey(e) {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (e.altKey || e.metaKey) return;
      const k = e.key;
      if (k === 'ArrowRight' && !e.ctrlKey) { e.preventDefault(); swipe('right'); }
      else if (k === 'ArrowLeft' && !e.ctrlKey) { e.preventDefault(); swipe('left'); }
      else if ((k === 'Delete' || k === 'Backspace') && !e.ctrlKey) { e.preventDefault(); swipe('del'); }
      else if (k === 'z' || k === 'Z') { e.preventDefault(); undo(); }
    }

    function peeks() { return root ? [...root.querySelectorAll('.sd-peek')].reverse() : []; }

    // Next card rises as the front one is dragged away
    function followPeeks(p) {
      peeks().forEach((el, i) => {
        const d = i + 1 - p;
        el.style.transform = `translateY(${(d * 11).toFixed(1)}px) scale(${(1 - d * 0.045).toFixed(4)})`;
      });
    }

    function setPose(card, dx, dy, sign) {
      const w = card.offsetWidth || 320;
      card.style.transform = `translate(${dx}px, ${dy}px) rotate(${(dx / w * 16 * sign).toFixed(2)}deg)`;
      const p = clamp(dx / (w * 0.33), -1, 1);
      const r = card.querySelector('.sd-stamp-r'), l = card.querySelector('.sd-stamp-l');
      if (r) r.style.opacity = String(clamp(p, 0, 1));
      if (l) l.style.opacity = String(clamp(-p, 0, 1));
      followPeeks(Math.abs(p));
    }

    function bindDrag(card) {
      card.addEventListener('pointerdown', e => {
        if (st.busy || (e.pointerType === 'mouse' && e.button !== 0)) return;
        if (e.target.closest('input,textarea,select,button,a,label,[contenteditable],[data-sd-nodrag]')) return;
        const r = card.getBoundingClientRect();
        drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, live: false, sign: (e.clientY - r.top) < r.height / 2 ? 1 : -1, pts: [{ x: e.clientX, t: e.timeStamp }] };
      });
      card.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
        if (!drag.live) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
          drag.live = true;
          try { card.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety */ }
          card.classList.add('sd-drag');
          card.getAnimations && card.getAnimations().forEach(a => a.cancel());
        }
        drag.dx = dx; drag.dy = dy * 0.2;
        drag.pts.push({ x: e.clientX, t: e.timeStamp });
        if (drag.pts.length > 6) drag.pts.shift();
        setPose(card, drag.dx, drag.dy, drag.sign);
      });
      const end = e => {
        if (!drag || (e && e.pointerId !== drag.id)) return;
        const d = drag; drag = null;
        if (!d.live) return;
        card.classList.remove('sd-drag');
        swallowClick = true;
        setTimeout(() => { swallowClick = false; }, 0);
        const a = d.pts[0], b = d.pts[d.pts.length - 1];
        const vx = (b.t - a.t) > 0 ? (b.x - a.x) / (b.t - a.t) : 0;
        const w = card.offsetWidth || 320;
        const far = Math.abs(d.dx) > w * 0.33;
        const flick = Math.abs(vx) > 0.45 && Math.abs(d.dx) > 30 && Math.sign(vx) === Math.sign(d.dx);
        if (e && e.type === 'pointerup' && (far || flick)) commit(d.dx > 0 ? 'right' : 'left', card, d, vx);
        else springBack(card, d);
      };
      card.addEventListener('pointerup', end);
      card.addEventListener('pointercancel', end);
      card.addEventListener('lostpointercapture', e => { if (e.target === card && drag && drag.live) end(Object.assign({}, e, { type: 'pointercancel', pointerId: e.pointerId })); });
    }

    async function springBack(card, d) {
      const from = card.style.transform || 'none';
      card.style.transform = '';
      card.querySelectorAll('.sd-stamp').forEach(s => { s.style.opacity = ''; });
      peeks().forEach((el, i) => {
        const from2 = el.style.transform;
        el.style.transform = '';
        if (from2) play(el, [{ transform: from2 }, { transform: `translateY(${(i + 1) * 11}px) scale(${1 - (i + 1) * 0.045})` }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'none' });
      });
      await play(card, [{ transform: from }, { transform: `translate(${(-d.dx * 0.06).toFixed(1)}px, 0) rotate(${(-d.dx * 0.004 * d.sign).toFixed(2)}deg)`, offset: 0.6 }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'none' });
    }

    // Fly the front card off, move the deck up, run the action, then redraw
    async function commit(dir, card, d, vx) {
      if (st.busy) return;
      const q = queue();
      const it = q[0];
      if (!it || !card) return;
      st.busy = true;
      const key = keyOf(it);
      const w = card.offsetWidth || 320;
      const sign = d ? d.sign : 1;
      const from = card.style.transform || 'none';
      card.querySelectorAll('.sd-stamp').forEach(s => { s.style.opacity = ''; });
      let fly;
      if (dir === 'del') {
        const stamp = card.querySelector('.sd-stamp-d');
        if (stamp) play(stamp, [{ opacity: 0, transform: 'translate(-50%,-50%) rotate(-6deg) scale(1.6)' }, { opacity: 1, transform: 'translate(-50%,-50%) rotate(-6deg) scale(1)' }], { duration: 160, easing: 'ease-out' });
        fly = play(card, [
          { transform: from, opacity: 1 },
          { transform: 'translateY(-14px) scale(1.02) rotate(-2deg)', opacity: 1, offset: 0.3 },
          { transform: 'translateY(70vh) scale(.6) rotate(9deg)', opacity: 0 }
        ], { duration: 520, easing: 'cubic-bezier(.55,0,.75,.25)', delay: 120 });
      } else {
        const s = dir === 'right' ? 1 : -1;
        const stamp = card.querySelector(dir === 'right' ? '.sd-stamp-r' : '.sd-stamp-l');
        if (stamp) stamp.style.opacity = '1';
        const dist = vw() * 0.65 + w;
        const speed = Math.max(Math.abs(vx || 0), 1.4);
        const dur = clamp((dist - Math.abs(d ? d.dx : 0)) / speed, 220, 460);
        const lead = d ? [] : [{ transform: 'none', offset: 0 }, { transform: `translateX(${-s * 16}px) rotate(${-s * 2}deg)`, offset: 0.22 }];
        fly = play(card, lead.concat(lead.length ? [] : [{ transform: from }], [{ transform: `translate(${s * dist}px, ${((d ? d.dy : 0) + 60).toFixed(0)}px) rotate(${s * 30 * sign}deg)` }]),
          { duration: d ? dur : dur + 120, easing: d ? 'cubic-bezier(.25,.8,.4,1)' : 'cubic-bezier(.45,0,.6,1)' });
      }
      peeks().forEach((el, i) => {
        const fromT = el.style.transform || `translateY(${(i + 1) * 11}px) scale(${1 - (i + 1) * 0.045})`;
        play(el, [{ transform: fromT }, { transform: `translateY(${i * 11}px) scale(${1 - i * 0.045})` }], { duration: 360, delay: dir === 'del' ? 260 : 60, easing: 'cubic-bezier(.22,1,.36,1)' });
        const face = el.querySelector('.sd-face');
        if (face) play(face, [{ opacity: 1 - (i + 1) * 0.35 }, { opacity: 1 - i * 0.35 }], { duration: 300, delay: 60 });
      });
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { /* not on desktop */ } }
      let undoFn = null;
      try { undoFn = await o.onAction(dir, it); } catch (e) { undoFn = null; }
      await fly;
      st.busy = false;
      if (st.dead) return;
      if (typeof undoFn !== 'function') {
        render();
        const c = root && root.querySelector('.sd-front');
        if (c) play(c, [{ transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(-6px)' }, { transform: 'none' }], { duration: 320, fill: 'none' });
        return;
      }
      st.done.add(key);
      st.front = null;
      st.tally[dir]++;
      st.stack.push({ dir, key, undo: undoFn, w });
      render();
    }

    function swipe(dir) {
      if (st.busy || st.dead) return;
      const card = root && root.querySelector('.sd-front');
      if (!card) return;
      commit(dir, card, null, 0);
    }

    // Undo brings the card back in from the side it left
    async function undo() {
      if (st.busy || st.dead || !st.stack.length) return;
      st.busy = true;
      const e = st.stack.pop();
      let ok = false;
      try { ok = (await e.undo()) !== false; } catch (err) { ok = false; }
      st.busy = false;
      if (!ok) { st.stack.push(e); render(); return; }
      st.done.delete(e.key);
      st.tally[e.dir] = Math.max(0, st.tally[e.dir] - 1);
      st.front = e.key;
      render();
      const card = root && root.querySelector('.sd-front');
      if (!card) return;
      st.busy = true;
      const s = e.dir === 'right' ? 1 : -1;
      const start = e.dir === 'del'
        ? { transform: 'translateY(60vh) scale(.6) rotate(9deg)', opacity: 0 }
        : { transform: `translate(${s * (vw() * 0.65 + e.w)}px, 60px) rotate(${s * 30}deg)`, opacity: 1 };
      peeks().forEach((el, i) => {
        play(el, [{ transform: `translateY(${i * 11}px) scale(${1 - i * 0.045})` }, { transform: `translateY(${(i + 1) * 11}px) scale(${1 - (i + 1) * 0.045})` }], { duration: 360, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'none' });
      });
      await play(card, [start, { transform: 'none', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.34,1.3,.64,1)', fill: 'none' });
      st.busy = false;
    }

    function dropUndo(pred) {
      st.stack = st.stack.filter(e => !pred(e));
      render();
    }

    function destroy() {
      st.dead = true;
      drag = null;
      if (root && root.parentNode === host) host.innerHTML = '';
      root = null;
    }

    render();
    return { render, swipe, undo, dropUndo, destroy, state: st };
  }

  window.PL_SwipeDeck = { create, version: 1 };
})();
