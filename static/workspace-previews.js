/* Workspace previews: scaled schematic miniatures of every workspace, for the picker cards.
   window.PLWS_PREVIEW = { html(id, {size}), ids(), attach(root), native }.
   html() returns a string: aria-hidden, inert, no ids, no focusable elements. Layouts are drawn with real DOM and CSS on a
   virtual 1280 by 800 workspace (960 by 600 when small) and scaled by CSS to the container width (see workspace-previews.css).
   Where the browser cannot do that division in CSS, attach() measures with a ResizeObserver instead.
   The previews are schematic: placeholder bars stand in for text, real names appear only in title bars. */
(function () {
    'use strict';

    let S = false; // true while building the small (reduced detail) version
    const KS = ['teal', 'blue', 'purple', 'orange', 'green', 'pink', 'indigo', 'cyan', 'amber', 'red'];

    // The four workspaces being added; used for name and icon until the launcher carries them.
    const NEWS = {
        openPromptPackBuilderWorkspace: { name: 'Prompt Pack Builder', icon: 'inventory_2' },
        openPromptBookBuilderWorkspace: { name: 'Prompt Book Builder', icon: 'menu_book' },
        openPromptWorkflowStudioWorkspace: { name: 'Prompt Workflow Studio', icon: 'conversion_path' },
        openContextPackBuilderWorkspace: { name: 'Context Pack Builder', icon: 'deployed_code' }
    };

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
    const px = v => typeof v === 'number' ? v + 'px' : v;
    function sty(o) {
        if (!o) return '';
        const m = [];
        if (o.w != null) { m.push('width:' + px(o.w)); m.push('flex:none'); }
        if (o.f != null) { m.push('flex:' + o.f + ' 1 0'); m.push('overflow:hidden'); }
        if (o.h != null) { m.push('height:' + px(o.h)); if (o.f == null && o.w == null) m.push('flex:none'); }
        if (o.g != null) m.push('gap:' + px(o.g));
        if (o.p != null) m.push('padding:' + px(o.p));
        if (o.al) m.push('align-items:' + o.al);
        if (o.jc) m.push('justify-content:' + o.jc);
        if (o.x) m.push(o.x);
        return m.length ? ' style="' + m.join(';') + '"' : '';
    }
    const flat = a => [].concat.apply([], a).join('');
    const D = (cls, o, kids) => '<div class="wsv-' + cls + (o && o.c ? ' ' + o.c : '') + '"' + sty(o) + '>' + flat(kids) + '</div>';
    const row = (o, ...k) => D('row', o, k);
    const col = (o, ...k) => D('col', o, k);
    // Repeat a builder; the small size draws about 80 percent of the items.
    function rep(n, fn, min) {
        const m = S ? Math.max(min || 1, Math.ceil(n * 0.8)) : n;
        let r = '';
        for (let i = 0; i < m; i++) r += fn(i);
        return r;
    }
    const fine = html => S ? '' : html;
    const coarse = html => S ? html : '';

    // ---- atoms ----
    // A number up to 100 is a percentage of the parent, a larger number is pixels, a string is used as given.
    const bar = (w, t) => '<i class="wsv-bar' + (t ? ' wsv-' + t : '') + '" style="width:' + (typeof w === 'number' ? (w > 100 ? w + 'px' : w + '%') : w) + '"></i>';
    const lab = w => '<i class="wsv-bar wsv-lab" style="width:' + (w || 70) + 'px"></i>';
    const hd = w => bar(w || 40, 'hd');
    const ln = (arr, g, t) => col({ g: g || 10 }, arr.map(w => bar(w, t)));
    const ic = (name, size, cls) => '<span class="wsv-ic' + (cls ? ' ' + cls : '') + '"' + (size ? ' style="font-size:' + size + 'px"' : '') + '>' + esc(name) + '</span>';
    const tile = (name, k, small) => '<div class="wsv-tile' + (k ? ' wsv-k wsv-k-' + k : '') + (small ? ' wsv-sm' : '') + '">' + ic(name) + '</div>';
    const dot = (k, extra) => '<i class="wsv-dot wsv-k-' + (k || 'n') + (extra ? ' ' + extra : '') + '"></i>';
    const mono = (txt, cls) => '<span class="wsv-mono' + (cls ? ' wsv-' + cls.split(' ').join(' wsv-') : '') + '">' + esc(txt) + '</span>';
    const txt = (s, cls) => '<span class="wsv-t' + (cls ? ' ' + cls : '') + '">' + esc(s) + '</span>';
    const chip = (w, k, on) => '<i class="wsv-chip wsv-k-' + (k || 'n') + (on ? ' wsv-on' : '') + '" style="width:' + w + 'px"></i>';
    const chipT = (s, k, on) => '<i class="wsv-chip wsv-tx wsv-k-' + (k || 'n') + (on ? ' wsv-on' : '') + '">' + esc(s) + '</i>';
    const chips = (list, o) => row(Object.assign({ g: 8, c: 'wsv-wrap' }, o || {}), list.map(c => chip(c[0], c[1], c[2])));
    const btn = (kind, w, lg) => '<i class="wsv-btn wsv-btn-' + (kind || 'g') + (lg ? ' wsv-btn-lg' : '') + '" style="width:' + (w || 110) + 'px"></i>';
    const sq = () => '<i class="wsv-btn wsv-btn-sq"></i>';
    const field = (w, o) => '<div class="wsv-field' + (o && o.sel ? ' wsv-sel' : '') + (o && o.line ? ' wsv-line' : '') + (o && o.search ? ' wsv-search' : '') + '"' + sty(w == null ? null : { w: w }) + '>' + (o && o.search ? ic('search', 20, 'wsv-faint') : '') + bar(o && o.fill != null ? o.fill : 46, 'soft') + '</div>';
    const sel = w => field(w, { sel: true, line: true });
    const area = (lines, o) => D('area', o, [ln(lines || [90, 70, 80])]);
    const out = (lines, o) => D('area', Object.assign({ c: 'wsv-out' }, o || {}), [ln(lines || [90, 70, 80])]);
    const seg = (n, on, w, tx) => '<div class="wsv-seg' + (tx ? ' wsv-tx' : '') + '"' + sty(w ? { w: w } : null) + '>' + (tx ? tx.map((s, i) => '<i' + (i === on ? ' class="wsv-on"' : '') + '>' + esc(s) + '</i>').join('') : Array.apply(null, Array(n)).map((_, i) => '<i' + (i === on ? ' class="wsv-on"' : '') + '></i>').join('')) + '</div>';
    const tabs = (n, on, g) => '<div class="wsv-tabs"' + (g ? ' style="gap:' + g + 'px"' : '') + '>' + Array.apply(null, Array(n)).map((_, i) => '<i' + (i === on ? ' class="wsv-on"' : '') + ' style="width:' + (46 + ((i * 13) % 22)) + 'px"></i>').join('') + '</div>';
    const sw = on => '<i class="wsv-sw' + (on ? ' wsv-on' : '') + '"></i>';
    const check = on => '<i class="wsv-check' + (on ? ' wsv-on' : '') + '"></i>';
    const trk = (pct, k, tall, full) => '<div class="wsv-trk wsv-k-' + (k || 'a') + (tall ? ' wsv-tall' : '') + '"' + (full ? ' style="flex:none;width:100%"' : '') + '><i style="width:' + pct + '%"></i></div>';
    const pane = (o, ...k) => D('pane', o, k);
    const rail = (o, ...k) => D('rail', o, k);
    const li = (o, ...k) => D('li', o, k);
    const badge = (s, k) => '<i class="wsv-badge wsv-k-' + (k || 'n') + '">' + esc(s) + '</i>';
    const hr = () => '<i class="wsv-hr"></i>';
    const av = (k, small) => '<i class="wsv-av wsv-k-' + k + (small ? ' wsv-sm' : '') + '"></i>';
    // Inline run of bars for diffs: items are [width percent, type].
    const seq = (items, g) => row({ g: g || 6, al: 'center' }, items.map(i => bar(i[0], i[1])));
    const rowsOf = (n, ws) => rep(n, i => bar(ws[i % ws.length]));
    // Section: label bar then content.
    const sec = (w, ...k) => col({ g: 8 }, lab(w), k);

    // ---- node canvas ----
    // Wire from (x1,y1) to (x2,y2): horizontal bezier with an arrowhead. cls is a stroke class such as wsv-w-a or wsv-w-d.
    function wire(x1, y1, x2, y2, cls, vert) {
        let d, ah;
        if (vert) {
            const dy = Math.max(30, Math.abs(y2 - y1) / 2) * (y2 >= y1 ? 1 : -1);
            d = 'M' + x1 + ' ' + y1 + ' C' + x1 + ' ' + (y1 + dy) + ' ' + x2 + ' ' + (y2 - dy) + ' ' + x2 + ' ' + y2;
            const s = y2 >= y1 ? 1 : -1;
            ah = x2 + ',' + y2 + ' ' + (x2 - 6) + ',' + (y2 - 11 * s) + ' ' + (x2 + 6) + ',' + (y2 - 11 * s);
        } else {
            const dx = Math.max(40, Math.abs(x2 - x1) / 2) * (x2 >= x1 ? 1 : -1);
            d = 'M' + x1 + ' ' + y1 + ' C' + (x1 + dx) + ' ' + y1 + ' ' + (x2 - dx) + ' ' + y2 + ' ' + x2 + ' ' + y2;
            const s = x2 >= x1 ? 1 : -1;
            ah = x2 + ',' + y2 + ' ' + (x2 - 11 * s) + ',' + (y2 - 6) + ' ' + (x2 - 11 * s) + ',' + (y2 + 6);
        }
        const c = cls || '';
        return '<path class="' + c + '" d="' + d + '"/><polygon class="' + c + '" points="' + ah + '"/>';
    }
    // Free path (for loops back); no arrowhead unless a point list is given.
    const wpath = (d, cls, head) => '<path class="' + (cls || '') + '" d="' + d + '"/>' + (head ? '<polygon class="' + (cls || '') + '" points="' + head + '"/>' : '');
    // Node card: x, y, width, height, colour, extra classes, inner html. Ports are optional flags in o.ports.
    function node(x, y, w, h, k, cls, inner, ports) {
        const p = ports || '';
        return '<div class="wsv-node wsv-k-' + (k || 'n') + (cls ? ' ' + cls : '') + '" style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;' + (h ? 'height:' + h + 'px' : '') + '">' + inner +
            (p.indexOf('l') > -1 ? '<i class="wsv-port wsv-l"></i>' : '') + (p.indexOf('r') > -1 ? '<i class="wsv-port wsv-rr"></i>' : '') +
            (p.indexOf('t') > -1 ? '<i class="wsv-port wsv-t"></i>' : '') + (p.indexOf('b') > -1 ? '<i class="wsv-port wsv-b"></i>' : '') + '</div>';
    }
    const nh = (icon, w, k) => '<div class="wsv-nh">' + (icon ? ic(icon, 20, k ? 'wsv-kc' : '') : dot(k || 'n')) + bar(w || 50, 'hd') + '</div>';
    // Canvas of design size W by H, centred in the available area. wires is svg inner html.
    function cv(W, H, wires, nodes, o) {
        return '<div class="wsv-cv' + (o && o.framed ? ' wsv-framed' : '') + '"><div class="wsv-cvin" style="width:' + W + 'px;height:' + H + 'px;margin-left:-' + (W / 2) + 'px">' +
            '<svg class="wsv-svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" focusable="false">' + (wires || '') + '</svg>' + flat([nodes || '']) + '</div>' + ((o && o.extra) || '') + '</div>';
    }
    // Small progress ring.
    function ring(size, pct, k) {
        const r = size / 2 - 8, c = 2 * Math.PI * r;
        return '<svg class="wsv-ring wsv-k-' + (k || 'a') + '" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" focusable="false"><circle class="wsv-rt" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '"/><circle class="wsv-rf" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-dasharray="' + (c * pct / 100).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/></svg>';
    }
    // Table: head is an array of column widths (px or 0 for flexible), rows are arrays of cell html.
    function table(widths, rows, o) {
        const cell = (w, h, i) => '<div class="wsv-c' + (o && o.rightFrom != null && i >= o.rightFrom ? ' wsv-r' : '') + '" style="' + (w ? 'width:' + w + 'px;flex:none' : 'flex:1 1 0') + '">' + h + '</div>';
        return D('tbl', o && o.o, [rows.map((r, ri) => '<div class="wsv-tr' + (ri === 0 && o && o.head ? ' wsv-h' : '') + (o && o.on === ri ? ' wsv-on' : '') + '">' + r.map((h, i) => cell(widths[i], h, i)).join('') + '</div>').join('')]);
    }

    // ---- frame: header plus body ----
    function info(id) {
        let w = null;
        try { if (window.PLWS && document.querySelector('#launcherGrid .launcher-card')) w = window.PLWS.get(id); } catch (e) { w = null; }
        if (w) return { name: w.name, icon: w.icon };
        if (NEWS[id]) return NEWS[id];
        const base = String(id || '').replace(/^open/, '').replace(/(Workspace|Workstation)$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
        return { name: base || 'Workspace', icon: 'grid_view' };
    }
    function actsHtml(list) {
        return row({ g: 10, al: 'center' }, (list && list.length ? list : list ? ['sq'] : [['g', 88], ['a', 128], 'sq']).map(a => a === 'sq' ? sq() : btn(a[0], a[1])));
    }
    function hdr(id, o) {
        o = o || {};
        const w = info(id);
        if (o.plx) {
            return '<div class="wsv-hdr wsv-hdr-plx">' + col({ g: 8 }, lab(60), '<span class="wsv-title">' + esc(w.name) + '</span>', bar(o.sub || 300, 'soft')) + '<span class="wsv-spacer"></span>' + sq() + '</div>';
        }
        const left = (o.noTile ? '' : tile(w.icon)) + col({ g: 7, x: 'min-width:0' }, '<span class="wsv-title">' + esc(w.name) + '</span>', bar(o.sub || 260, 'soft'));
        return '<div class="wsv-hdr">' + left + '<span class="wsv-spacer"></span>' + (S && o.acts && o.acts.length > 2 ? actsHtml(o.acts.slice(-2)) : actsHtml(o.acts)) + '</div>';
    }
    const frame = (id, o, ...body) => hdr(id, o) + '<div class="wsv-body">' + flat(body) + '</div>';
    // Single centred column of stacked sections, like the prompt tools built on pfe-body.
    const sheet = (w, ...k) => '<div class="wsv-body" style="padding:22px 28px;overflow:hidden">' + D('sheet', { x: 'width:' + (w || 760) + 'px', g: 12 }, k) + '</div>';
    // Same as sec but takes the leftover height, for the last block of a sheet.
    const secF = (w, ...k) => col({ g: 8, f: 1 }, lab(w), k);

    // ---- layouts ----
    const LAY = {};

    // Pro canvas: palette rail, wired nodes, compiled prompt on the right.
    LAY.openBuilderProWorkspace = id => frame(id, { acts: [['g', 84], ['g', 84], ['a', 120], 'sq'], sub: 280 },
        row({ f: 1, g: 0 },
            fine(rail({ w: 230 }, lab(90),
                rep(6, i => li({}, dot(KS[i]), bar(60 + (i * 9) % 30)), 6), lab(70), li({ c: 'wsv-card' }, ic('groups', 20), bar(60)), li({ c: 'wsv-card' }, ic('groups', 20), bar(48)))),
            cv(720, 724,
                wire(200, 108, 280, 262, 'wsv-w-a') + wire(200, 270, 280, 290) + wire(200, 450, 280, 318) + wire(460, 290, 540, 290, 'wsv-w-a') + wire(200, 600, 280, 600) + wire(460, 600, 540, 340),
                node(30, 70, 170, 110, 'teal', '', nh('person', 56, 'teal') + ln([90, 70]), 'r') +
                node(30, 220, 170, 100, 'blue', '', nh('', 50, 'blue') + ln([84, 60]), 'r') +
                node(30, 400, 170, 100, 'purple', '', nh('', 62, 'purple') + ln([80, 50]), 'r') +
                node(280, 220, 180, 140, 'a', 'wsv-sel', nh('merge', 60, 'a') + ln([88, 72, 56]), 'lr') +
                node(30, 550, 170, 100, 'orange', '', nh('groups', 58, 'orange') + ln([76, 52]), 'r') +
                node(280, 550, 180, 100, 'pink', '', nh('', 50, 'pink') + ln([70, 44]), 'lr') +
                node(540, 230, 160, 140, 'green', '', nh('output', 50, 'green') + ln([84, 66, 40]), 'l')),
            fine(rail({ w: 320, c: 'wsv-r' }, row({ al: 'center', jc: 'space-between' }, lab(100), mono('1,284 tok')),
                col({ g: 12 }, rep(4, i => col({ g: 7, x: 'border-left:4px solid var(--c-' + ['teal', 'blue', 'purple', 'orange'][i] + ');padding-left:10px' }, ln([92, 80, 60], 7)), 4)),
                row({ g: 8, x: 'margin-top:auto' }, btn('g', 90), btn('a', 120))))));

    LAY.openGenWorkspace = id => frame(id, { acts: [['g', 80], ['a', 140], 'sq'], sub: 280 },
        row({ f: 1, g: 0 },
            fine(rail({ w: 250 }, lab(90), col({ g: 5 }, rep(11, i => li({ c: 'wsv-sl' + (i === 0 ? ' wsv-on' : '') }, bar(52 + (i * 23) % 40, i === 0 ? 'acc' : '')))), lab(80), rep(3, i => row({ jc: 'space-between' }, bar(34), mono(['128', '842', '5'][i])), 3))),
            col({ f: 1, g: 11, p: '22px 24px' },
                lab(150), area([92, 76], { h: 96 }), lab(60), chips([[70, 'a', true], [62], [54], [66], [58], [72], [50], [64]]),
                lab(190),
                row({ g: 8, c: 'wsv-wrap' }, rep(21, i => chip(56 + (i * 19) % 46, 'n', i % 6 === 1))),
                row({ g: 10 }, btn('a', 130, true), btn('g', 110, true)),
                lab(120), out([94, 86, 90, 62], { f: 1 })),
            fine(rail({ w: 220, c: 'wsv-r' }, lab(90), sel(), lab(40), sel(), lab(90), chips([[62, 'n'], [66, 'a', true], [62]]), lab(80), chips([[62], [66, 'a', true], [62]]), lab(90), sel(), lab(70), field()))));

    LAY.openMetaPromptingWorkspace = id => frame(id, { acts: [['g', 88], 'sq'], sub: 300 },
        row({ f: 1, g: 0 },
            col({ w: S ? 380 : 470, g: 16, p: '24px 28px' }, rep(3, i => col({ g: 8 }, row({ g: 8, al: 'center' }, ic(['domain', 'category', 'checklist'][i], 20), lab(120)), bar(70, 'soft'), area([90, 60], { h: i === 0 ? 96 : 76 })), 3), btn('a', 190, true)),
            col({ f: 1, p: '24px 28px 24px 0' }, pane({ f: 1, g: 14 },
                row({ al: 'center', g: 10 }, ic('hub', 24, 'wsv-ac'), hd(30), '<span class="wsv-spacer" style="flex:1"></span>', badge('REUSABLE', 'a')),
                rep(4, i => col({ g: 8, x: 'border-left:4px solid var(--c-' + ['teal', 'purple', 'orange', 'blue'][i] + ');padding-left:12px' }, lab(70 + i * 12), ln([94, 82, i % 2 ? 50 : 66], 7)), 3),
                row({ g: 8, x: 'margin-top:auto' }, btn('g', 90), btn('a', 140))))));

    LAY.openForgeWorkspace = id => frame(id, { acts: [['g', 80], ['g', 70], ['a', 130], 'sq'], sub: 300 },
        '<div style="display:flex;align-items:center;gap:20px;height:60px;padding:0 28px;background:var(--surface-2);border-bottom:2px solid var(--line);flex:none">' + lab(80) + sel(230) + '<i class="wsv-div" style="height:30px"></i>' + lab(70) + chips([[70, 'a', true], [64], [58], [70], [60]]) + '</div>',
        row({ f: 1, g: 0 },
            col({ f: 1, g: 14, p: '22px 26px' }, rep(4, i => row({ g: 12, x: 'flex:none' }, '<i style="width:5px;border-radius:3px;background:var(--c-' + ['teal', 'blue', 'purple', 'orange'][i] + ')"></i>', col({ f: 1, g: 8 }, row({ g: 8, al: 'center' }, lab(60 + i * 14), fine(bar(18, 'soft'))), area([88, 58], { h: i === 0 ? 70 : 82 }))), 4), fine(row({ g: 12 }, field('50%'), field('50%')))),
            col({ w: S ? 380 : 470, g: 12, p: '22px 24px', x: 'border-left:2px solid var(--line);background:var(--surface)' },
                row({ al: 'center', g: 12 }, lab(110), '<span style="flex:1"></span>', seg(3, 0, 130), mono('312 tok')),
                row({ al: 'center', g: 12 }, trk(72, 'a', true), mono('72%', 'ac')),
                out([60, 92, 84, 90, 70, 40, 88, 76, 82], { f: 1, g: 11 }))));

    LAY.openComponentsWorkspace = id => frame(id, { acts: [['g', 80], ['g', 84], ['a', 100], 'sq'], sub: 310 },
        cv(880, 600,
            wire(206, 120, 270, 130, 'wsv-w-a') + wire(206, 335, 270, 150) + wire(496, 150, 560, 280, 'wsv-w-a') + wire(496, 320, 560, 320) + wire(206, 440, 330, 470) + wire(250, 520, 560, 470),
            '<div class="wsv-marq" style="left:10px;top:55px;width:210px;height:330px"></div>' +
            node(30, 70, 176, 100, 'teal', '', nh('person', 56, 'teal') + ln([86, 60]), 'r') +
            node(30, 290, 176, 90, 'blue', 'wsv-sel', nh('', 60, 'blue') + ln([80, 52]), 'r') +
            node(270, 80, 226, 130, 'purple', '', nh('', 60, 'purple') + ln([92, 78, 50]), 'lr') +
            node(560, 230, 270, 150, 'orange', '', nh('', 70, 'orange') + ln([92, 84, 64]) + row({ g: 6 }, chip(46, 'orange'), chip(52, 'amber')), 'lr') +
            node(30, 420, 220, 90, 'green', '', nh('', 56, 'green') + ln([84, 50]), 'r') +
            node(330, 410, 226, 100, 'pink', '', nh('', 64, 'pink') + ln([88, 64]), 'lr') +
            node(610, 440, 170, 80, 'cyan', '', nh('', 50, 'cyan') + ln([76]), 'l') +
            '<i class="wsv-marq" style="left:556px;top:226px;width:12px;height:12px;border-radius:3px;opacity:1;background:var(--surface)"></i>',
            { extra: '<div class="wsv-tools"><i></i><i></i><i></i></div>' }),
        '<div style="display:flex;align-items:center;gap:14px;height:62px;padding:0 28px;background:var(--surface);border-top:2px solid var(--line);flex:none">' + field(280) + mono('6 blocks') + mono('186 words') + chip(70, 'a') + '<span style="flex:1"></span>' + btn('g', 80) + btn('g', 100) + btn('a', 130) + '</div>');

    LAY.openContextBankWorkspace = id => frame(id, { acts: [['g', 90], ['a', 120], 'sq'], sub: 280 },
        '<div style="display:flex;align-items:center;gap:16px;padding:16px 28px;border-bottom:2px solid var(--line);flex:none">' + field(320, { search: true }) + chips([[64, 'a', true], [58, 'cyan'], [62, 'purple'], [54, 'amber'], [58, 'green']]) + '<span style="flex:1"></span>' + lab(40) + sel(130) + '</div>',
        row({ f: 1, g: 0 },
            col({ w: S ? 330 : 420, g: 8, p: '16px 20px', x: 'border-right:2px solid var(--line)' }, row({ jc: 'space-between', al: 'center' }, mono('24 blocks'), bar(16, 'soft')),
                rep(7, i => li({ c: 'wsv-card wsv-tall' + (i === 1 ? ' wsv-on' : '') }, dot(KS[(i * 3) % 10], 'wsv-sqd'), col({ g: 8, f: 1 }, bar(50 + (i * 11) % 30, 'hd'), bar(86, 'soft')), mono(String(120 + i * 83)), ), 5)),
            col({ f: 1, g: 14, p: '22px 28px' }, field(null, { fill: 36 }), row({ g: 8 }, chips([[60, 'cyan', true], [54], [50]]), '<span style="flex:1"></span>', mono('1,204 tok')),
                area([94, 90, 82, 88, 70, 92, 84, 56, 90, 76], { f: 1, g: 12 }), row({ g: 10 }, btn('a', 120), btn('g', 90), fine('<span style="flex:1"></span>'), btn('d', 90)))));

    // Chain: a seed input then functions joined left to right, with a configuration panel on the right.
    LAY.openChainWorkspace = id => frame(id, { acts: [['g', 100], ['g', 100], ['a', 130], 'sq'], sub: 310 },
        row({ f: 1, g: 0 },
            cv(800, 700,
                wire(150, 260, 216, 232, 'wsv-w-a') + wire(376, 232, 436, 332, 'wsv-w-a') + wire(596, 332, 650, 232, 'wsv-w-a') + wpath('M715 296 L715 420', 'wsv-w-d', '715,420 709,408 721,408'),
                node(10, 230, 140, 60, 'a', 'wsv-pill', ic('input', 22, 'wsv-ac') + '<span class="wsv-mono wsv-ac">{{input}}</span>', 'r') +
                node(216, 168, 160, 128, 'teal', '', row({ g: 8, al: 'center' }, badge('1', 'teal'), bar(56, 'hd')) + ln([88, 66, 42]), 'lr') +
                node(436, 268, 160, 128, 'blue', 'wsv-sel', row({ g: 8, al: 'center' }, badge('2', 'blue'), bar(56, 'hd')) + ln([84, 72, 50]), 'lr') +
                node(650, 168, 130, 128, 'purple', '', row({ g: 8, al: 'center' }, badge('3', 'purple'), bar(50, 'hd')) + ln([80, 60, 40]), 'l') +
                node(675, 430, 80, 80, 'n', 'wsv-ghost', '<div style="margin:auto">' + ic('add_circle', 30, 'wsv-faint') + '</div>', ''),
                { framed: false }),
            fine(rail({ w: 340, c: 'wsv-r wsv-plain' }, row({ g: 8, al: 'center' }, badge('2', 'blue'), field(null, { fill: 40 })), lab(60), area([90, 74, 82, 54], { h: 132 }), row({ jc: 'space-between' }, lab(70), mono('42w')),
                row({ g: 12 }, tabs(3, 0, 16)), out([86, 70, 60], { f: 1 }), btn('g', 150)))));

    LAY.openRolesWorkspace = id => frame(id, { acts: [['a', 130]], sub: 250 },
        row({ f: 1, g: 0 },
            rail({ w: S ? 250 : 290, c: 'wsv-plain' }, field(null, { search: true }), col({ g: 6 }, rep(6, i => li({ c: 'wsv-card' + (i === 1 ? ' wsv-on' : '') }, av(KS[i], false), col({ g: 7, f: 1 }, bar(52, 'hd'), bar(80, 'soft')), ))),
                fine(row({ g: 10, x: 'margin-top:auto' }, rep(2, i => col({ f: 1, g: 6, x: 'padding:10px;border:2px solid var(--line);border-radius:10px' }, mono(['12', '5'][i], 'lg'), bar(60, 'soft')))))),
            col({ f: 1, g: 14, p: '20px 26px' }, tabs(5, 1, 20),
                row({ g: 14, al: 'center' }, '<div style="width:54px;height:54px;border-radius:50%" class="wsv-av wsv-k-purple"></div>', col({ f: 1, g: 8 }, hd(34), bar(60, 'soft'))),
                lab(90), area([92, 80], { h: 80 }), lab(80), area([88, 76, 64], { f: 1 }), fine(row({ g: 20 }, rep(2, () => row({ g: 10, al: 'center', f: 1 }, sw(true), bar(60, 'soft')))))),
            fine(rail({ w: 330, c: 'wsv-r' }, lab(110), D('area', { c: 'wsv-hl' }, [ln([92, 76, 84, 60], 9)]), lab(90),
                col({ g: 10, f: 1 }, '<div class="wsv-pane" style="gap:8px;padding:12px;align-self:flex-start;width:70%">' + ln([90, 60], 7) + '</div>', '<div class="wsv-pane wsv-k-a" style="gap:8px;padding:12px;align-self:flex-end;width:78%;border-top:2px solid var(--accent-line);background:var(--accent-soft)">' + ln([92, 80, 40], 7) + '</div>'), field()))));

    // Prompt tools on one centred column (Prompt from Example, Model Adapter, Simplifier, Tone Rewriter, Translator, Gauntlet).
    const outHl = (lines) => D('area', { c: 'wsv-out wsv-hl', f: 1 }, [ln(lines, 10)]);
    LAY.openExampleWorkspace = id => frame(id, { acts: [], sub: 300 }, sheet(860,
        sec(120, area([96, 90, 94, 70, 88, 52], { h: 150 })), sec(100, area([80], { h: 56 })), btn('a', 240, true),
        secF(140, outHl([94, 88, 90, 74, 82, 70])), fine(sec(110, row({ g: 10 }, rep(3, i => li({ c: 'wsv-card', x: 'flex:1' }, ic('check_circle', 20, 'wsv-ok'), bar(70 - i * 8, 'soft'))))))));
    LAY.openAdapterWorkspace = id => frame(id, { acts: [], sub: 300 }, sheet(860,
        sec(120, area([96, 88, 92, 70, 84], { h: 128 })), sec(110, row({ g: 12, al: 'center' }, sel(320), row({ g: 8 }, ['purple', 'orange', 'green', 'blue', 'pink'].map((c, i) => '<i class="wsv-tile wsv-sm wsv-k wsv-k-' + c + '"' + (i === 1 ? ' style="border-color:var(--accent);box-shadow:0 0 0 4px var(--accent-soft)"' : '') + '></i>')))), btn('a', 200, true),
        secF(140, outHl([94, 90, 76, 88, 70])), fine(sec(110, col({ g: 9 }, rep(3, i => row({ g: 10, al: 'center' }, ic(['remove_circle', 'add_circle', 'sync_alt'][i], 20, ['wsv-bad', 'wsv-ok', 'wsv-ac'][i]), bar(60 + i * 12, ['del', 'add', 'hit'][i]))))))));
    LAY.openSimplifyWorkspace = id => frame(id, { acts: [], sub: 300 }, sheet(860,
        sec(130, area([96, 90, 94, 88, 92, 70, 84, 60], { h: 170 })), sec(80, seg(3, 1, 340)), btn('a', 200, true),
        secF(130, outHl([90, 76, 60])),
        sec(100, col({ g: 10 }, row({ g: 12, al: 'center' }, mono('412'), trk(100, 'n', true), mono('words')), row({ g: 12, al: 'center' }, mono('168', 'ac'), trk(41, 'a', true), mono('59% shorter', 'ok'))))));
    LAY.openToneWorkspace = id => frame(id, { acts: [], sub: 300 }, sheet(860,
        sec(130, area([96, 90, 94, 70, 84], { h: 130 })), sec(90, chips([[78, 'a', true], [90], [84], [96], [88], [100], [80]])), btn('a', 200, true),
        secF(130, outHl([94, 80, 90, 66])), fine(sec(120, col({ g: 9 }, rep(3, i => row({ g: 10, al: 'center' }, dot(['teal', 'purple', 'orange'][i]), bar(34 + i * 10, 'soft'), ic('arrow_forward', 18, 'wsv-faint'), bar(40 + i * 8, 'hit'))))))));
    LAY.openTranslateWorkspace = id => frame(id, { acts: [], sub: 300 }, sheet(860,
        sec(130, area([96, 88, 92, 70], { h: 120 })), sec(110, chips([[84, 'a', true], [76], [70], [80], [74], [66], [78], [72], [84], [70], [76]])), btn('a', 200, true),
        secF(130, outHl([92, 84, 90, 70])), sec(150, row({ g: 8, c: 'wsv-wrap' }, ['{{name}}', '{{topic}}', '{{tone}}', '{{length}}'].map(s => chipT(s, 'a'))))));
    LAY.openGauntletWorkspace = id => frame(id, { acts: [], sub: 340 }, sheet(860,
        sec(60, area([94, 76], { h: 84 })), sec(210, area([80], { h: 60 })), btn('a', 260, true),
        secF(130, row({ g: 0, al: 'stretch', f: 1 },
            pane({ f: 1, g: 12, c: 'wsv-k wsv-k-teal' }, row({ g: 8, al: 'center' }, ic('call_split', 22, 'wsv-kc'), hd(50)), ln([90, 70, 54, 80, 60], 9)),
            '<div style="display:flex;align-items:center;padding:0 4px">' + ic('arrow_forward', 26, 'wsv-faint') + '</div>',
            pane({ f: 1, g: 12, c: 'wsv-k wsv-k-orange' }, row({ g: 8, al: 'center' }, ic('autorenew', 22, 'wsv-kc'), hd(40)), ln([88, 74, 60, 84], 9)),
            '<div style="display:flex;align-items:center;padding:0 4px">' + ic('arrow_forward', 26, 'wsv-faint') + '</div>',
            pane({ f: 1, g: 12, c: 'wsv-k wsv-k-red' }, row({ g: 8, al: 'center' }, ic('gavel', 22, 'wsv-kc'), hd(56)), ln([84, 66, 50, 78], 9))))));

    LAY.openOptimizerWorkspace = id => frame(id, { acts: [['g', 80], ['a', 100], 'sq'], sub: 320 },
        row({ f: 1, g: 0 },
            fine(rail({ w: 250 }, lab(90), col({ g: 5 }, rep(5, i => li({ c: 'wsv-sl' + (i === 1 ? ' wsv-on' : '') }, bar(50 + (i * 21) % 36, i === 1 ? 'acc' : '')))), lab(100),
                row({ g: 16, al: 'center' }, '<div style="position:relative;display:flex;align-items:center;justify-content:center">' + ring(110, 82) + '<span class="wsv-mono wsv-lg" style="position:absolute">82</span></div>', col({ g: 12, f: 1 }, rep(4, i => trk([90, 70, 84, 60][i], i === 3 ? 'wn' : 'a'))))
            )),
            col({ f: 1, g: 11, p: '22px 24px' }, lab(110), area([94, 80, 88], { h: 90 }), lab(60), area([70], { h: 52 }), lab(150),
                row({ g: 8, c: 'wsv-wrap' }, rep(16, i => chip(56 + (i * 17) % 40, 'n', i % 5 === 2))), row({ g: 10 }, btn('a', 130, true), btn('g', 110, true)), lab(70), out([92, 84, 90, 60], { f: 1 })),
            fine(rail({ w: 250, c: 'wsv-r' }, lab(110), col({ g: 8 }, rep(4, i => li({ c: 'wsv-card' + (i === 0 ? ' wsv-on' : '') }, mono('v' + (4 - i)), bar(46, 'soft'), '<span class="wsv-end">' + mono(String(68 + i * 6)) + '</span>'))), lab(110),
                row({ g: 8 }, area([90, 60], { f: 1 }), area([90, 80], { f: 1 }))))));

    LAY.openSpliceWorkspace = id => frame(id, { acts: [['a', 120]], sub: 280 },
        col({ f: 1, g: 14, p: '22px 28px' },
            row({ g: 16, x: 'flex:2 1 0' }, rep(2, i => col({ f: 1, g: 8 }, row({ g: 8, al: 'center' }, badge(['A', 'B'][i], i ? 'purple' : 'teal'), lab(70)), sel(), area([94, 78, 88, 64, 86, 50], { f: 1 })), 2)),
            row({ g: 10, al: 'stretch', x: 'flex:none' }, rep(4, i => li({ c: 'wsv-card', x: 'flex:1;' }, check(i !== 2), bar(60 - i * 6, 'soft'), '<span class="wsv-end">' + badge(i % 2 ? 'B' : 'A', i % 2 ? 'purple' : 'teal') + '</span>'), 3)),
            lab(100), D('area', { c: 'wsv-out wsv-hl', f: 1 }, [ln([92, 86, 78, 90, 60], 10)])));

    LAY.openLabWorkspace = id => frame(id, { acts: [['g', 110], ['a', 120]], sub: 280 },
        col({ f: 1, g: 12, p: '18px 28px' },
            col({ g: 6, x: 'flex:none' }, lab(80), area([92], { h: 52 })),
            row({ f: 1, g: 12 }, '<div class="wsv-pane" style="flex:1 1 0;gap:10px;border-top:5px solid var(--c-teal)">' + row({ g: 8, al: 'center' }, badge('A', 'teal'), bar(36, 'hd'), '<span style="flex:1"></span>', row({ g: 4 }, [1, 1, 1, 0, 0].map(o => ic('star', 18, o ? 'wsv-fill wsv-wn' : 'wsv-faint')))) + area([94, 80, 88], { h: 92 }) + out([90, 80, 70, 86, 56], { f: 1 }) + '</div>',
                '<div class="wsv-vs">VS</div>',
                '<div class="wsv-pane" style="flex:1 1 0;gap:10px;border-top:5px solid var(--c-purple)">' + row({ g: 8, al: 'center' }, badge('B', 'purple'), bar(42, 'hd'), '<span style="flex:1"></span>', row({ g: 4 }, [1, 1, 1, 1, 0].map(o => ic('star', 18, o ? 'wsv-fill wsv-wn' : 'wsv-faint')))) + area([90, 84, 76], { h: 92 }) + out([92, 74, 88, 66, 80], { f: 1 }) + '</div>'),
            row({ g: 12, al: 'center', x: 'flex:none;padding:12px 16px;border-radius:10px;border:2px solid var(--accent-line);background:var(--accent-soft)' }, ic('emoji_events', 24, 'wsv-ac'), bar(36, 'acc'), mono('B leads by 1.0', 'ac'), '<span style="flex:1"></span>', btn('a', 150))));

    LAY.openPromptIdeWorkspace = id => frame(id, { acts: [['g', 60], ['g', 60], ['a', 90]], sub: 320 },
        '<div style="display:flex;align-items:center;gap:14px;height:54px;padding:0 28px;border-bottom:2px solid var(--line);background:var(--surface-2);flex:none">' + ic('route', 20, 'wsv-ac') + lab(110) + '<div class="wsv-seq">' + ['Edit', 'Run', 'Critique', 'Improve', 'Gauntlet'].map((s, i) => (i ? ic('chevron_right', 18) : '') + chipT(String(i + 1) + ' ' + s, i === 1 ? 'a' : 'n', i === 1)).join('') + '</div><span style="flex:1"></span>' + chipT('Round 2', 'a') + '</div>',
        row({ f: 1, g: 0 },
            col({ w: S ? 330 : 390, g: 10, p: '16px 18px', x: 'border-right:2px solid var(--line)' }, row({ jc: 'space-between' }, lab(60), lab(40)), field(null, { fill: 50 }), area([80], { h: 50 }),
                '<div class="wsv-area" style="flex:1 1 0;flex-direction:row;gap:12px;background:var(--surface);padding:12px"><div class="wsv-gut">' + rep(14, i => '<span class="wsv-mono">' + (i + 1) + '</span>') + '</div>' + ln([90, 74, 82, 60, 86, 70, 78, 40, 88, 66, 80, 54, 76, 62], 9) + '</div>', row({ jc: 'space-between' }, mono('1,842 chars'), mono('312 words')), fine(lab(70))),
            col({ f: 1, g: 10, p: '16px 22px' }, row({ jc: 'space-between', al: 'center' }, lab(90), row({ g: 8 }, btn('g', 70), btn('a', 80))), D('area', { c: 'wsv-mono-lines', f: 1, x: 'background:var(--surface-sunk)' }, [ln([90, 76, 84, 40, 88, 70, 62, 80], 9)]),
                row({ jc: 'space-between', al: 'center' }, lab(110), row({ g: 8 }, btn('g', 70), btn('a', 100), fine(btn('p', 80)))), D('area', { c: 'wsv-out', f: 1 }, [ln([90, 72, 80, 50], 9)])),
            fine(rail({ w: 290, c: 'wsv-r' }, row({ jc: 'space-between' }, lab(70), badge('Early', 'wn')), pane({ g: 10, p: 14 }, row({ jc: 'space-between' }, bar(34, 'soft'), mono('64%')), trk(64, 'a', true, true)),
                lab(80), chips([[70, 'a'], [60, 'cyan'], [66, 'purple']]), lab(70), chips([[70], [60]]), lab(70), col({ g: 8 }, ln([90, 70, 80], 8))))));

    LAY.openPromptForkingWorkspace = id => frame(id, { acts: [['g', 90]], sub: 320 },
        '<div style="display:flex;align-items:center;gap:10px;height:48px;padding:0 28px;border-bottom:2px solid var(--line);background:var(--surface-2);flex:none">' + ic('account_tree', 20, 'wsv-ac') + bar('90px', 'soft') + ic('chevron_right', 18) + bar('110px', 'soft') + ic('chevron_right', 18) + bar('90px', 'hd') + '</div>',
        row({ f: 1, g: 18, p: '22px 28px' },
            pane({ f: 1, g: 12 }, row({ g: 10, al: 'center' }, badge('ORIGINAL', 'n'), '<span style="flex:1"></span>', ic('lock', 20, 'wsv-faint')), hd(50), ln([94, 80, 90, 66, 86, 74, 92, 58, 84], 11)),
            fine('<div style="display:flex;flex-direction:column;justify-content:center;gap:10px;align-items:center">' + ic('compare_arrows', 26, 'wsv-faint') + '</div>'),
            pane({ f: 1, g: 12, c: 'wsv-sel' }, row({ g: 10, al: 'center' }, badge('FORK', 'a'), '<span style="flex:1"></span>', btn('g', 80), btn('a', 80)), field(null, { fill: 44 }),
                col({ g: 11 }, seq([[40], [30, 'add'], [20]]), seq([[70]]), seq([[28], [36, 'del'], [24, 'add']]), seq([[84]]), seq([[50], [30, 'add']]), seq([[76]]), seq([[44, 'del'], [40, 'add']]), seq([[66]])))));

    // Panel style workspaces that use the plx header (kicker, title, one line).
    LAY.openPlxSurgeonWorkspace = id => frame(id, { plx: true, sub: 360 },
        row({ f: 1, g: 18, p: '8px 28px 26px' },
            pane({ f: 1, g: 12 }, row({ jc: 'space-between', al: 'center' }, col({ g: 7 }, bar('130px', 'hd'), bar('190px', 'soft')), sel(150)), area([94, 82, 90, 70, 88, 76, 92, 60, 84], { f: 1 }), row({ g: 10 }, btn('a', 190, true), btn('g', 120, true))),
            pane({ f: 1, g: 12 }, row({ al: 'center', g: 10 }, ic('medical_services', 24, 'wsv-ac'), hd(40), '<span style="flex:1"></span>', badge('3 FINDINGS', 'wn')),
                rep(3, i => col({ g: 8, x: 'padding:12px 14px;border-radius:10px;border:2px solid var(--line);border-left:5px solid var(--' + ['danger', 'warn', 'warn'][i] + ');flex:none' }, row({ g: 8, al: 'center' }, badge(['HIGH', 'MED', 'MED'][i], ['bad', 'wn', 'wn'][i]), bar(50, 'hd')), ln([90, 62], 7)), 3),
                D('area', { c: 'wsv-out wsv-hl', f: 1 }, [row({ g: 8, al: 'center' }, ic('build', 20, 'wsv-ac'), lab(80)), seq([[60, 'del'], [30, 'add']]), seq([[80, 'add']])]))));
    LAY.openPlxTeammateWorkspace = id => frame(id, { plx: true, sub: 380 },
        row({ f: 1, g: 18, p: '8px 28px 26px' },
            pane({ w: S ? 360 : 440, g: 14 }, rep(4, i => col({ g: 8 }, row({ g: 8, al: 'center' }, ic(['flag', 'memory', 'handyman', 'block'][i], 20), lab(70 + i * 10)), field(null, { fill: 60 - i * 8 })), 4), btn('a', 230, true)),
            pane({ f: 1, g: 14 }, row({ jc: 'space-between', al: 'center' }, col({ g: 7 }, hd(44), bar(200, 'soft')), av('purple')),
                rep(5, i => row({ g: 12, x: 'padding:10px 12px;border-radius:10px;background:var(--surface-2);flex:none;align-items:flex-start' }, ic(['flag', 'memory', 'handyman', 'block', 'autorenew'][i], 22, 'wsv-ac'), col({ f: 1, g: 7 }, lab(70 + i * 8), bar(88 - i * 6, 'soft'), fine(bar(60 - i * 4, 'soft')))), 4))));
    LAY.openPlRedTeamWorkspace = id => frame(id, { plx: true, sub: 330 },
        row({ f: 1, g: 18, p: '8px 28px 26px' },
            pane({ f: 1, g: 12 }, area([94, 80, 90, 70, 88, 76, 92, 58], { f: 1 }), row({ g: 10 }, btn('d', 190, true), btn('g', 110, true))),
            pane({ f: 1, g: 12 }, row({ al: 'center', g: 10 }, ic('security', 24, 'wsv-bad'), hd(36), '<span style="flex:1"></span>', mono('7 of 10 held', 'ok')),
                col({ g: 8, f: 1 }, rep(7, i => li({ c: 'wsv-card' }, badge(['HIGH', 'HIGH', 'MED', 'MED', 'LOW', 'MED', 'LOW'][i], ['bad', 'bad', 'wn', 'wn', 'n', 'wn', 'n'][i]), bar(44 + (i * 13) % 30, 'soft'), '<span class="wsv-end">' + ic(i === 1 || i === 4 || i === 6 ? 'close' : 'check', 22, i === 1 || i === 4 || i === 6 ? 'wsv-bad' : 'wsv-ok') + '</span>'), 5)))));

    LAY.openAuditWorkspace = id => frame(id, { acts: [['a', 120]], sub: 330 },
        row({ f: 1, g: 0 },
            col({ w: S ? 380 : 450, g: 12, p: '22px 26px', x: 'border-right:2px solid var(--line)' }, lab(60), sel(), area([94, 82, 90, 68, 86, 76, 60], { f: 1 }), row({ g: 10 }, btn('a', 110, true), btn('g', 170, true))),
            col({ f: 1, g: 16, p: '22px 28px' },
                row({ g: 22, al: 'center' }, '<div style="position:relative;display:flex;align-items:center;justify-content:center">' + ring(130, 78) + '<span class="wsv-mono wsv-xl" style="position:absolute;font-size:42px">78</span></div>', col({ g: 10 }, badge('GOOD', 'ok'), mono('out of 100'), bar('140px', 'soft'))),
                lab(90), col({ g: 12 }, rep(6, i => row({ g: 12, al: 'center' }, bar('120px', 'soft'), trk([90, 70, 84, 55, 78, 40][i], [90, 70, 84, 55, 78, 40][i] < 60 ? 'wn' : 'ok', true), mono(String([90, 70, 84, 55, 78, 40][i]))), 4)),
                fine(lab(70)), fine(col({ g: 9 }, rep(3, i => li({ c: 'wsv-card wsv-sl' }, ic(i === 2 ? 'warning' : 'check_circle', 20, i === 2 ? 'wsv-wn' : 'wsv-ok'), bar(70 - i * 8, 'soft'))))))));

    LAY.openXrayWorkspace = id => frame(id, { acts: [['a', 130]], sub: 300 },
        row({ f: 1, g: 0 },
            col({ w: S ? 330 : 380, g: 11, p: '22px 24px', x: 'border-right:2px solid var(--line)' }, lab(60), sel(), area([94, 80, 90, 66, 88, 74, 92, 58], { f: 1 }), lab(40), sel(), btn('a', 150, true)),
            col({ f: 1, p: '22px 28px', g: 14 },
                '<div class="wsv-bento" style="grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr">' +
                [['teal', 'Role', 1], ['blue', 'Task', 2], ['purple', 'Context', 1], ['orange', 'Format', 1], ['green', 'Rules', 1]].map((c, i) => '<div class="wsv-bcell wsv-k-' + c[0] + '"' + (c[2] === 2 ? ' style="grid-column:span 2"' : '') + '>' + row({ g: 8, al: 'center' }, dot(c[0]), bar(36 + i * 4, 'hd')) + ln(i % 2 ? [90, 76, 58] : [86, 62], 8) + '</div>').join('') +
                '<div class="wsv-bcell wsv-k-pink">' + row({ g: 8, al: 'center' }, dot('pink'), bar(40, 'hd')) + ln([84, 60], 8) + '</div></div>')));

    LAY.openDiffWorkspace = id => frame(id, { acts: [['g', 90], ['a', 120]], sub: 340 },
        col({ f: 1, g: 14, p: '20px 28px' },
            row({ g: 16, x: 'flex:1.1 1 0' }, rep(2, i => col({ f: 1, g: 8 }, row({ g: 8, al: 'center' }, badge(['A', 'B'][i], i ? 'purple' : 'teal'), lab(80)), sel(), area([94, 82, 90, 66, 86], { f: 1 })), 2)),
            row({ g: 22, al: 'center', x: 'flex:none' }, row({ g: 8, al: 'center' }, dot('ok'), mono('14 added', 'ok')), row({ g: 8, al: 'center' }, dot('bad'), mono('6 removed', 'bad')), trk(62, 'ok', true), mono('94% match')),
            D('area', { c: 'wsv-out', f: 1.3 }, [col({ g: 12 }, seq([[40], [18, 'del'], [24, 'add'], [10]]), seq([[70]]), seq([[24], [30, 'add'], [34]]), seq([[50, ''], [20, 'del']]), seq([[84]]), fine(seq([[30, 'del'], [26, 'add'], [30]])), fine(seq([[66]])))])));

    LAY.openCostWorkspace = id => frame(id, { acts: [['a', 130]], sub: 260 },
        row({ f: 1, g: 0 },
            col({ w: S ? 350 : 420, g: 11, p: '22px 26px', x: 'border-right:2px solid var(--line)' }, lab(60), sel(), area([94, 82, 90, 66, 86, 76], { f: 1 }), row({ g: 12 }, rep(2, i => col({ f: 1, g: 7 }, lab(80), '<div class="wsv-field wsv-line"><span class="wsv-mono wsv-ink">' + ['800', '0.4'][i] + '</span></div>'), 2)), btn('a', 150, true)),
            col({ f: 1, g: 12, p: '22px 28px' }, lab(110),
                table([0, 96, 96, 96], [[lab(60), lab(40), lab(40), lab(40)]].concat(Array.apply(null, Array(S ? 5 : 8)).map((_, i) => [row({ g: 9, al: 'center' }, dot(KS[i], 'wsv-sqd'), bar(['60', '48', '70', '56', '64', '50', '58', '44'][i] + '%', 'soft')), mono(String(1200 + i * 310)), mono(String(480 + i * 90)), mono('$' + (0.02 + i * 0.011).toFixed(3), i === 3 ? 'ac' : '')])), { head: true, rightFrom: 1, o: { f: 1 }, on: 4 }),
                bar(80, 'soft'))));

    LAY.openPulseWorkspace = id => frame(id, { acts: [['g', 100]], sub: 300 },
        col({ f: 1, g: 14, p: '18px 28px' },
            row({ g: 22, al: 'center', x: 'flex:none' }, '<div style="position:relative;display:flex;align-items:center;justify-content:center">' + ring(96, 74) + '<span class="wsv-mono wsv-lg" style="position:absolute">74</span></div>', col({ g: 10, f: 1 }, bar(52, 'hd'), bar(72, 'soft')), row({ g: 8, al: 'center' }, ic('check_circle', 22, 'wsv-ok'), mono('9 resolved'))),
            row({ f: 1, g: 18 },
                col({ w: 270, g: 8 }, rep(5, i => li({ c: 'wsv-card' + (i === 0 ? ' wsv-on' : '') }, ic(['content_copy', 'schedule', 'sell', 'folder_off', 'description'][i], 20, i === 0 ? 'wsv-ac' : ''), bar(50, 'soft'), '<span class="wsv-end">' + mono(String([12, 8, 31, 5, 3][i])) + '</span>'), 4)),
                '<div class="wsv-stack">' +
                '<div class="wsv-pane" style="left:56px;right:0;top:0;bottom:62px;opacity:.55"></div>' +
                '<div class="wsv-pane" style="left:28px;right:28px;top:22px;bottom:34px;opacity:.8"></div>' +
                '<div class="wsv-pane wsv-sel" style="left:0;right:56px;top:44px;bottom:0;gap:12px">' + row({ g: 10, al: 'center' }, ic('content_copy', 22, 'wsv-wn'), hd(34), '<span style="flex:1"></span>', badge('DUPLICATE', 'wn')) + ln([92, 80, 88, 60], 9) + row({ g: 10, x: 'margin-top:auto' }, btn('g', 100), btn('g', 100), btn('a', 120)) + '</div></div>')));

    LAY.openFillWorkspace = id => frame(id, { acts: [['g', 80], ['a', 130]], sub: 300 },
        row({ f: 1, g: 0 },
            col({ w: S ? 380 : 460, g: 11, p: '22px 26px', x: 'border-right:2px solid var(--line)' }, lab(70), sel(), area([90, 70, 84], { h: 88 }), row({ g: 8, al: 'center' }, lab(90), chipT('5', 'a')),
                col({ g: 10 }, rep(5, i => row({ g: 10, al: 'center', x: 'padding:8px 10px;border-radius:10px;border:2px solid var(--line);background:var(--surface);flex:none' }, '<i class="wsv-tile wsv-sm wsv-k wsv-k-' + KS[i] + '" style="width:30px;height:30px;border-width:2px"></i>', bar(24, 'soft'), '<span style="flex:1"></span>', bar(30), ), 4))),
            col({ f: 1, g: 12, p: '22px 28px' }, row({ jc: 'space-between', al: 'center' }, lab(80), mono('4 of 5 filled', 'ac')), trk(80, 'a', true, true),
                D('area', { c: 'wsv-out', f: 1, g: 14 }, [seq([[40], [16, 'hit'], [28]]), seq([[70]]), seq([[24, 'hit'], [50]]), seq([[60], [22, 'hit']]), seq([[84]]), seq([[30], [20, 'hit'], [30]]), fine(seq([[66]]))]))));

    LAY.openPlaygroundWorkspace = id => frame(id, { noTile: false, acts: [['a', 100]], sub: 280 },
        row({ f: 1, g: 0 },
            fine(rail({ w: 260, c: 'wsv-plain' }, row({ jc: 'space-between', al: 'center' }, lab(80), mono('8')), col({ g: 6 }, rep(7, i => li({ c: 'wsv-card' + (i === 1 ? ' wsv-on' : '') }, ic('science', 18, i === 1 ? 'wsv-ac' : ''), bar(52 + (i * 11) % 30, 'soft')))))),
            col({ f: 1, g: 12, p: '16px 22px' }, row({ g: 12, al: 'center', x: 'flex:none' }, field(260, { fill: 50 }), field(null, { fill: 34 }), seg(3, 1, 150)),
                row({ f: 1, g: 14 }, rep(2, i => '<div class="wsv-pane" style="flex:1 1 0;gap:10px;border-top:5px solid var(--c-' + ['teal', 'purple'][i] + ')">' + row({ g: 8, al: 'center' }, badge(['A', 'B'][i], ['teal', 'purple'][i]), bar(40, 'hd'), '<span style="flex:1"></span>', mono(['7.5', '8.5'][i], 'ac')) + area([92, 78, 86], { h: 86 }) + out([90, 76, 84, 60], { f: 1 }) + '</div>', 2)))));

    LAY.openBatchWorkspace = id => frame(id, { acts: [['g', 90], ['a', 120]], sub: 330 },
        row({ f: 1, g: 0 },
            col({ w: S ? 330 : 400, g: 10, p: '20px 24px', x: 'border-right:2px solid var(--line)' }, row({ g: 8, al: 'center' }, lab(70), chipT('3', 'a')), sel(), area([90, 70, 84], { h: 90 }), chips([[84, 'a'], [70, 'cyan'], [60, 'purple']]), lab(80),
                D('area', { f: 1, g: 9 }, [rep(8, i => row({ g: 8, al: 'center' }, '<span class="wsv-mono" style="width:22px;font-size:12px">' + (i + 1) + '</span>', bar(50 + (i * 17) % 40, 'soft')))]), fine(row({ g: 10, al: 'center' }, mono('40 rows'), sel(150)))),
            col({ f: 1, g: 12, p: '20px 26px' }, row({ al: 'center', g: 12 }, lab(70), trk(45, 'a', true), mono('18 of 40', 'ac')),
                table([54, 0, 0, 44], [[lab(30), lab(50), lab(50), ''], ...Array.apply(null, Array(S ? 5 : 9)).map((_, i) => [mono(String(i + 1)), bar(60 + (i * 9) % 30, 'soft'), bar(70 - (i * 7) % 30), ic(i < 6 ? 'check_circle' : i === 6 ? 'progress_activity' : 'schedule', 20, i < 6 ? 'wsv-ok' : 'wsv-faint')])], { head: true, o: { f: 1 } }), row({ g: 10 }, btn('g', 110), btn('g', 110)))));

    LAY.openBoardWorkspace = id => frame(id, { noTile: false, acts: [['a', 130]], sub: 220 },
        row({ f: 1, g: 0 },
            fine(rail({ w: 250, c: 'wsv-plain' }, lab(80), col({ g: 6 }, rep(6, i => li({ c: i === 0 ? 'wsv-on' : '' }, dot(KS[i], 'wsv-sqd'), bar(46 + (i * 13) % 30, i === 0 ? 'acc' : ''), '<span class="wsv-end">' + mono(String([12, 8, 5, 9, 3, 6][i])) + '</span>'))), btn('g', 120))),
            col({ f: 1, p: '20px 24px', g: 12 }, field(320, { search: true }),
                '<div class="wsv-mas">' + [[150, 'teal'], [110, 'purple'], [190, 'orange'], [120, 'blue'], [170, 'pink'], [100, 'green'], [140, 'cyan'], [112, 'amber'], [160, 'indigo']].map(c => '<div class="wsv-pane wsv-k wsv-k-' + c[1] + '" style="height:' + c[0] + 'px;gap:9px;padding:14px;flex-direction:column">' + row({ g: 8, al: 'center' }, dot(c[1]), bar(52, 'hd')) + ln(c[0] > 130 ? [90, 76, 84, 50] : [88, 60], 8) + row({ g: 6, x: 'margin-top:auto' }, chip(40, c[1]), chip(36)) + '</div>').join('') + '</div>')));

    LAY.openCompareWorkspace = id => frame(id, { acts: [], sub: 340 },
        row({ f: 1, g: 0 },
            col({ w: S ? 330 : 400, g: 10, p: '20px 24px', x: 'border-right:2px solid var(--line)' }, lab(60), area([94, 80, 88], { h: 90 }), lab(80), area([84, 60], { h: 70 }), lab(80),
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' + rep(8, i => '<div class="wsv-li wsv-sl" style="border:2px solid var(--line);background:var(--surface)">' + check(i % 3 !== 2) + bar(56, 'soft') + '</div>', 4) + '</div>', btn('a', 150, true)),
            col({ f: 1, g: 12, p: '20px 26px' }, lab(60), row({ f: 1, g: 14 }, rep(3, i => '<div class="wsv-pane wsv-k wsv-k-' + ['teal', 'orange', 'purple'][i] + '" style="flex:1 1 0;gap:11px">' + row({ g: 8, al: 'center' }, dot(['teal', 'orange', 'purple'][i]), bar(50, 'hd')) + row({ jc: 'space-between' }, mono(['0.8 s', '1.2 s', '2.1 s'][i], 'ink'), mono(['312', '286', '340'][i])) + hr() + ln([92, 80, 88, 62, 84, 70], 10) + '</div>', 2)))));

    LAY.openHistoryWorkspace = id => frame(id, { acts: [], sub: 340 },
        col({ f: 1, g: 14, p: '20px 28px' }, field(420, { search: true }),
            lab(60),
            '<div class="wsv-tl" style="flex:1 1 0;overflow:hidden">' + rep(7, i => '<div class="wsv-li wsv-card wsv-k-' + (i === 2 ? 'a' : 'n') + (i === 2 ? ' wsv-on' : '') + '" style="height:' + (i === 2 ? 108 : 52) + 'px;' + (i === 2 ? 'flex-direction:column;align-items:stretch;justify-content:center;gap:10px' : '') + '">' + '<div style="display:flex;align-items:center;gap:12px">' + mono(['10:42', '10:18', '09:55', '09:31', '09:12', '08:47', '08:20'][i], 'ink') + bar(34 + (i * 13) % 22, 'hd') + '<span class="wsv-end">' + chip(48, KS[i], false) + mono(String(400 + i * 133)) + ic(i === 4 ? 'error' : 'check_circle', 20, i === 4 ? 'wsv-bad' : 'wsv-ok') + '</span></div>' + (i === 2 ? ln([90, 66], 8) : '') + '</div>', 5) + '</div>'));

    LAY.openBackupWorkspace = id => frame(id, { acts: [['a', 130]], sub: 340 }, sheet(760,
        lab(80), col({ g: 10 }, rep(6, i => li({ c: 'wsv-card wsv-tall' }, '<i class="wsv-tile wsv-sm wsv-k wsv-k-' + (i === 0 ? 'green' : 'n') + '">' + ic(i % 2 ? 'schedule' : 'restore') + '</i>', col({ g: 8, f: 1 }, mono(['16 Nov 2026', '15 Nov 2026', '14 Nov 2026', '12 Nov 2026', '9 Nov 2026', '4 Nov 2026'][i], 'ink'), bar(30, 'soft')), i === 0 ? chip(58, 'green') : '', mono(['4.2 MB', '4.1 MB', '4.1 MB', '3.9 MB', '3.7 MB', '3.2 MB'][i]), btn('g', 96)), 4))));

    LAY.openLockWorkspace = id => frame(id, { acts: [], sub: 320 }, sheet(780,
        field(null, { search: true }), col({ g: 10, f: 1 }, rep(8, i => li({ c: 'wsv-card wsv-tall' }, ic(i % 3 === 0 ? 'lock' : 'lock_open', 24, i % 3 === 0 ? 'wsv-fill wsv-ac' : 'wsv-faint'), col({ g: 8, f: 1 }, bar(40 + (i * 17) % 30, 'hd'), bar(70, 'soft')), i % 3 === 0 ? chip(56, 'a') : '', sw(i % 3 === 0)), 5))));

    LAY.openIntegrityWorkspace = id => frame(id, { acts: [['a', 160]], sub: 380 }, sheet(780,
        row({ g: 14, x: 'flex:none' }, [['14', 'ok', 'Passed'], ['2', 'wn', 'Warnings'], ['0', 'n', 'Errors']].map(s => '<div class="wsv-stat">' + mono(s[0], 'xl' + (s[1] === 'ok' ? ' ok' : s[1] === 'wn' ? ' wn' : '')) + bar(50, 'soft') + '</div>').join('')),
        col({ g: 9, f: 1 }, rep(8, i => li({ c: 'wsv-card' }, ic(i === 3 || i === 6 ? 'warning' : 'check_circle', 22, i === 3 || i === 6 ? 'wsv-wn' : 'wsv-ok'), bar(34 + (i * 11) % 26, 'hd'), bar(30, 'soft'), '<span class="wsv-end">' + mono((12 + i * 7) + ' ms') + '</span>'), 5))));

    LAY.openCredentialsWorkspace = id => frame(id, { acts: [], sub: 340 }, sheet(780,
        '<div class="wsv-banner">' + ic('shield_lock', 24, 'wsv-ac') + col({ g: 7, f: 1 }, bar(84, 'accs'), bar(50, 'accs')) + '</div>',
        col({ g: 10, f: 1 }, rep(7, i => li({ c: 'wsv-card wsv-tall' }, '<i class="wsv-tile wsv-sm wsv-k wsv-k-' + KS[i] + '" style="width:36px;height:36px"></i>', bar(24 + (i * 9) % 20, 'hd'), '<span class="wsv-end">' + (i % 3 === 2 ? chip(54, 'n') : mono('••••••••') + dot('ok') + btn('g', 80)) + '</span>'), 5))));

    // ---- the four new workspaces ----
    LAY.openPromptPackBuilderWorkspace = id => frame(id, { acts: [['g', 100], ['a', 130], 'sq'], sub: 330 },
        row({ f: 1, g: 18, p: '20px 28px' },
            pane({ w: S ? 380 : 440, g: 10 }, row({ jc: 'space-between', al: 'center' }, lab(130), mono('12 prompts')),
                col({ g: 7, f: 1 }, rep(11, i => li({ c: 'wsv-card' }, ic('drag_indicator', 20, 'wsv-faint'), check(i !== 5), bar(38 + (i * 13) % 34, 'soft'), '<span class="wsv-end">' + chip(48, KS[i % 10], false) + '</span>'), 5)),
                li({ c: 'wsv-card', x: 'border-style:dashed;justify-content:center;flex:none' }, ic('add', 20, 'wsv-ac'), bar(24, 'acc'))),
            col({ f: 1, g: 14 }, pane({ g: 14 }, lab(110),
                row({ g: 18 }, '<i class="wsv-tile wsv-k wsv-k-teal" style="width:108px;height:108px;border-radius:14px;flex:none">' + ic('inventory_2', 44) + '</i>', col({ f: 1, g: 10 }, field(null, { fill: 54 }), row({ g: 10 }, field('50%', { fill: 40 }), '<div class="wsv-field wsv-line" style="flex:1 1 0"><span class="wsv-mono wsv-ink">v1.2.0</span></div>'))),
                area([94, 80, 56], { h: 84 }), chips([[56, 'cyan'], [60, 'purple'], [48, 'amber'], [52, 'green']])),
                pane({ g: 12, f: 1 }, lab(120), row({ g: 10 }, [['Markdown', 1], ['JSON', 0], ['HTML', 0]].map(f => '<div class="wsv-pane' + (f[1] ? ' wsv-sel' : '') + '" style="flex:1 1 0;gap:9px;padding:14px;' + (f[1] ? 'background:var(--accent-soft)' : '') + '">' + row({ al: 'center', g: 8 }, ic(f[1] ? 'description' : 'data_object', 22, f[1] ? 'wsv-ac' : ''), '<span class="wsv-mono wsv-ink" style="font-size:17px;font-weight:600;' + (f[1] ? 'color:var(--accent)' : '') + '">' + f[0] + '</span>') + bar(70, 'soft') + '</div>').join('')),
                    fine(lab(100)), fine(D('area', { c: 'wsv-out wsv-mono-lines', f: 1 }, [ln([40, 70, 56, 84, 62, 76], 9)])),
                    row({ g: 10, jc: 'flex-end', x: 'flex:none' }, btn('g', 120, true), btn('a', 180, true))))));

    LAY.openPromptBookBuilderWorkspace = id => frame(id, { acts: [['g', 100], ['a', 130], 'sq'], sub: 320 },
        row({ f: 1, g: 0 },
            fine(rail({ w: 290 }, row({ jc: 'space-between', al: 'center' }, lab(90), mono('9')), col({ g: 5 }, ['1', '1.1', '1.2', '2', '2.1', '3', '4'].map((n, i) => li({ c: 'wsv-sl' + (i === 2 ? ' wsv-on' : ''), x: 'padding-left:' + (12 + (n.length > 1 ? 22 : 0)) + 'px' }, mono(n, i === 2 ? 'ac' : ''), bar(40 + (i * 17) % 34, i === 2 ? 'acc' : ''))).join('')), li({ c: 'wsv-card', x: 'border-style:dashed;justify-content:center;margin-top:auto' }, ic('add', 20, 'wsv-ac'), bar(40, 'acc')))),
            '<div class="wsv-cv" style="display:flex;justify-content:center;padding:26px 0 0">' + D('paper', { w: S ? 520 : 560, x: 'height:100%;gap:13px' }, [mono('Chapter 1.2'), hd(70), ln([94, 90, 82, 92, 60], 10),
                D('pblock', {}, [row({ g: 8, al: 'center' }, ic('terminal', 20, 'wsv-ac'), bar(30, 'acc'), '<span style="flex:1"></span>', chip(44, 'a'), ic('content_copy', 18, 'wsv-faint')), ln([90, 70, 84], 8)]), ln([92, 84, 70], 10), hd(46), ln([94, 88, 74, 90, 62], 10), fine(ln([88, 56], 10)), '<span class="wsv-mono" style="margin-top:auto;align-self:center">4</span>']) + '</div>',
            fine(rail({ w: 290, c: 'wsv-r' }, lab(90), col({ g: 10 }, rep(7, i => row({ g: 10, al: 'center' }, bar(46 + (i * 13) % 26, i === 2 ? 'hd' : 'soft'), '<span style="flex:1;height:2px;background:var(--line)"></span>', mono(String([1, 3, 4, 7, 9, 12, 15][i]), i === 2 ? 'ac' : ''))))))));

    LAY.openPromptWorkflowStudioWorkspace = id => frame(id, { acts: [['g', 110], ['a', 130], 'sq'], sub: 340 },
        row({ f: 1, g: 0 },
            cv(880, 700,
                wire(150, 225, 200, 225, 'wsv-w-a') + wire(380, 225, 430, 225, 'wsv-w-a') + wire(610, 225, 660, 225, 'wsv-w-ok') +
                wpath('M520 300 L520 420', 'wsv-w-bad wsv-w-d', '520,420 514,408 526,408') + wpath('M430 485 L290 485 L290 300', 'wsv-w-bad wsv-w-d', '290,300 284,312 296,312') +
                wpath('M750 300 L750 550', 'wsv-w-ok', '750,550 744,538 756,538'),
                node(0, 185, 150, 80, 'blue', '', nh('input', 52, 'blue') + ln([80], 9), 'r') +
                node(200, 150, 180, 150, 'teal', '', nh('terminal', 56, 'teal') + ln([88, 70, 50], 9), 'lrb') +
                node(430, 150, 180, 150, 'amber', 'wsv-sel', nh('rule', 60, 'amber') + ln([84, 60], 9) + row({ g: 6 }, chip(44, 'ok'), chip(44, 'bad')), 'lrb') +
                node(660, 150, 180, 150, 'green', '', nh('verified', 62, 'green') + ln([86, 62], 9), 'lb') +
                node(430, 420, 180, 130, 'red', '', nh('healing', 56, 'red') + ln([80, 56], 9), 'tl') +
                node(660, 550, 180, 70, 'violet', 'wsv-pill', ic('output', 22, 'wsv-kc') + bar(50, 'hd'), 't') +
                node(0, 560, 340, 100, 'n', 'wsv-flat', row({ g: 10, al: 'center' }, ic('description', 22, 'wsv-ac'), bar(40, 'hd'), '<span style="flex:1"></span>', chip(60, 'a')) + ln([90, 64], 9), '')),
            fine(rail({ w: 300, c: 'wsv-r wsv-plain' }, row({ g: 10, al: 'center' }, '<i class="wsv-tile wsv-sm wsv-k wsv-k-amber">' + ic('rule') + '</i>', col({ g: 7, f: 1 }, bar(60, 'hd'), bar(40, 'soft'))), lab(70),
                col({ g: 8 }, rep(3, i => li({ c: 'wsv-card wsv-sl' }, ic(i === 2 ? 'radio_button_unchecked' : 'check_circle', 20, i === 2 ? 'wsv-faint' : 'wsv-ok'), bar(70 - i * 10, 'soft')))), lab(70), sel(), lab(60), chips([[70, 'blue'], [60, 'green']]), btn('g', 150, true)))));

    LAY.openContextPackBuilderWorkspace = id => frame(id, { acts: [['g', 100], ['a', 150], 'sq'], sub: 340 },
        col({ f: 1, g: 14, p: '20px 28px' },
            row({ f: 1, g: 14 }, [['Project', 'folder', 'teal', 3], ['Rules', 'gavel', 'orange', 3], ['Background', 'article', 'purple', 2], ['Reference', 'menu_book', 'blue', 3]].slice(0, S ? 3 : 4).map((m, mi) =>
                '<div class="wsv-pane wsv-k wsv-k-' + m[2] + '" style="flex:1 1 0;gap:10px;padding:14px">' + row({ g: 9, al: 'center' }, ic(m[1], 22, 'wsv-kc'), txt(m[0]), '<span style="flex:1"></span>', mono(String(m[3] * 4 + mi))) + hr() +
                rep(m[3] + 3, i => col({ g: 8, x: 'padding:10px;border-radius:9px;border:2px solid var(--line);background:var(--surface-2);flex:none' }, row({ g: 8, al: 'center' }, chipT(['pdf', 'url', 'note', 'repo', 'md'][(i + mi) % 5], ['red', 'cyan', 'amber', 'indigo', 'green'][(i + mi) % 5]), bar(44 + (i * 17) % 24, 'hd')), row({ g: 8, al: 'center' }, bar(50, 'soft'), '<span style="flex:1"></span>', mono(String(840 + i * 410 + mi * 170)))), 3) + '</div>').join('')),
            pane({ g: 10, x: 'flex:none;padding:14px 18px' }, row({ g: 14, al: 'center' }, lab(110), '<div class="wsv-trk wsv-tall" style="display:flex;gap:3px;background:var(--surface-3)"><i style="width:30%;background:var(--c-teal)"></i><i style="width:24%;background:var(--c-orange)"></i><i style="width:18%;background:var(--c-purple)"></i><i style="width:14%;background:var(--c-blue)"></i></div>', mono('18,240 / 32,000 tokens', 'ac')),
                row({ g: 8, al: 'center' }, lab(110), ['Claude', 'ChatGPT', 'Gemini', 'Copilot', 'Custom'].map((p, i) => chipT(p, i === 0 ? 'a' : 'n', i === 0)).join('')))));

    // Combine Prompts is a dialog over the library: two prompts side by side, pick or edit each field, one combined result.
    LAY.openCombineWorkspace = id => {
        const w = info(id);
        const frow = (k, n, ln1, ln2, pick) => row({ g: 14, al: 'center', x: 'flex:none' },
            col({ f: 1, g: 7, x: 'padding:12px 14px;border-radius:10px;border:2px solid ' + (pick === 0 ? 'var(--accent)' : 'var(--line)') + ';background:' + (pick === 0 ? 'var(--accent-soft)' : 'var(--surface)') }, ln(ln1, 7)),
            seg(3, pick, 110),
            col({ f: 1, g: 7, x: 'padding:12px 14px;border-radius:10px;border:2px solid ' + (pick === 1 ? 'var(--accent)' : 'var(--line)') + ';background:' + (pick === 1 ? 'var(--accent-soft)' : 'var(--surface)') }, ln(ln2, 7)));
        return '<div class="wsv-body" style="background:var(--surface-2);align-items:center;justify-content:center;padding:34px 60px">' +
            D('pane', { f: 1, x: 'width:100%;padding:0;gap:0;box-shadow:var(--shadow-lg);border-color:var(--line-strong)' }, [
                '<div class="wsv-hdr" style="border-radius:12px 12px 0 0">' + tile(w.icon) + col({ g: 7 }, '<span class="wsv-title">' + esc(w.name) + '</span>', bar(260, 'soft')) + '<span class="wsv-spacer"></span>' + sq() + '</div>',
                col({ f: 1, g: 12, p: '18px 28px' },
                    row({ g: 14, x: 'flex:none' }, row({ f: 1, g: 8, al: 'center' }, badge('A', 'teal'), bar(38, 'hd')), '<span style="width:110px;flex:none"></span>', row({ f: 1, g: 8, al: 'center' }, badge('B', 'purple'), bar(42, 'hd'))),
                    frow(0, 0, [60], [48], 0), frow(0, 0, [90, 64], [84, 70], 1), rep(2, i => frow(0, 0, [94, 82, 70], [90, 76, 86], i), 1),
                    D('area', { c: 'wsv-out wsv-hl', f: 1 }, [row({ g: 8, al: 'center' }, lab(70), chip(54, 'a')), ln([92, 84, 70], 9)])),
                '<div style="display:flex;align-items:center;gap:12px;height:68px;padding:0 28px;border-top:2px solid var(--line);flex:none">' + ic('undo', 20, 'wsv-faint') + bar(160, 'soft') + '<span style="flex:1"></span>' + btn('g', 100, true) + btn('a', 170, true) + '</div>']) + '</div>';
    };

    // Unknown ids: a tasteful generic layout from the catalogue icon and name.
    function generic(id) {
        return frame(id, { sub: 280 }, row({ f: 1, g: 0 },
            fine(rail({ w: 240 }, lab(80), col({ g: 5 }, rep(6, i => li({ c: i === 1 ? 'wsv-on' : '' }, dot(KS[i]), bar(50 + (i * 13) % 30, i === 1 ? 'acc' : '')))))),
            col({ f: 1, g: 14, p: '24px 28px' }, lab(110), area([94, 80, 90, 66], { h: 120 }), row({ g: 10 }, btn('a', 130, true), btn('g', 110, true)), lab(90), out([92, 84, 70, 88], { f: 1 })),
            fine(rail({ w: 260, c: 'wsv-r' }, lab(70), sel(), lab(70), chips([[60, 'a', true], [56], [64]]), lab(60), field()))));
    }

    // ---- public API ----
    const ALIAS = { openForkWorkstation: 'openPromptForkingWorkspace', openPlxRedTeamWorkspace: 'openPlRedTeamWorkspace' };
    function build(id, small) {
        S = !!small;
        let inner;
        try {
            const fn = LAY[ALIAS[id] || id];
            inner = fn ? fn(id) : generic(id);
        } catch (e) {
            if (window.console) console.warn('PLWS_PREVIEW layout failed for', id, e);
            try { inner = generic(id); } catch (e2) { inner = ''; }
        }
        const html = '<div class="wsv' + (S ? ' wsv-sm' : '') + '" aria-hidden="true" inert data-wsv="' + esc(id) + '"><div class="wsv-stage">' + inner + '</div></div>';
        S = false;
        return html;
    }

    // Scaling fallback: only used when the browser cannot divide lengths in CSS. Native browsers never run this.
    const NATIVE = !!(window.CSS && CSS.supports && CSS.supports('transform', 'scale(tan(atan2(1px, 1px)))') && CSS.supports('width', '1cqw'));
    let ro = null, mo = null;
    function fitOne(el, w) {
        const base = el.classList.contains('wsv-sm') ? 960 : 1280;
        el.style.setProperty('--wsv-s', String(Math.max(0.01, w / base)));
    }
    function attach(root) {
        if (NATIVE || !window.ResizeObserver) return;
        (root || document).querySelectorAll('.wsv').forEach(el => { try { ro.observe(el); fitOne(el, el.clientWidth); } catch (e) { /* element detached */ } });
    }
    if (!NATIVE) {
        document.documentElement.classList.add('wsv-js');
        if (window.ResizeObserver) {
            ro = new ResizeObserver(entries => entries.forEach(en => fitOne(en.target, en.contentRect.width)));
            const startWatch = () => {
                attach(document);
                mo = new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => {
                    if (n.nodeType !== 1) return;
                    if (n.classList && n.classList.contains('wsv')) { ro.observe(n); fitOne(n, n.clientWidth); } else if (n.querySelector && n.querySelector('.wsv')) attach(n);
                })));
                mo.observe(document.documentElement, { childList: true, subtree: true });
            };
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startWatch); else startWatch();
        }
    }

    window.PLWS_PREVIEW = {
        native: NATIVE,
        html(id, opts) { return build(String(id || ''), !!(opts && opts.size === 'small')); },
        ids() { return Object.keys(LAY); },
        attach
    };
})();
