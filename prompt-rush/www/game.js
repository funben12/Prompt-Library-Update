(function () {
  "use strict";
  var C = window.PR_CONTENT;
  var K_RUN = "promptRush.run", K_AGENTS = "promptRush.agents", K_SET = "promptRush.settings";
  var LETTERS = ["A", "B", "C", "D"];
  var RUSH_SECONDS = 10;
  var $ = function (s, r) { return (r || document).querySelector(s); };

  // Storage, always guarded
  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function drop(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function titleCase(s) { return s.replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); }
  function sentence(s) { s = String(s || "").trim(); if (!s) return s; s = cap(s); return /[.!?]$/.test(s) ? s : s + "."; }

  // Icons
  var I = {
    drum: '<ellipse cx="12" cy="10" rx="8" ry="3"/><path d="M4 10v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/><path d="M6.5 3.5l4 5M17.5 3.5l-4 5"/>',
    dumbbell: '<path d="M6.5 6v12M17.5 6v12M3 9.5v5M21 9.5v5M6.5 12h11"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/>',
    pen: '<path d="M4 20l4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16 4 20z"/><path d="M14.5 6.5l3 3"/>',
    chart: '<path d="M3 20h18M6 20v-6M11 20V9M16 20v-9M20.5 4.5L15 9l-3-2.5-6 5"/>',
    headset: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.6"/><rect x="17" y="14" width="4" height="6" rx="1.6"/>',
    scales: '<path d="M12 4v16M7.5 20h9M5 7h14"/><path d="M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/>',
    coin: '<circle cx="12" cy="12" r="8.5"/><path d="M14.6 9.4c-.6-.9-1.5-1.4-2.6-1.4-1.5 0-2.6.8-2.6 2s1.1 1.7 2.6 2 2.6.8 2.6 2-1.1 2-2.6 2c-1.1 0-2-.5-2.6-1.4M12 6.5V8M12 16v1.5"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
    plane: '<path d="M21 3L3 10.5l7 2.5 2.5 7L21 3z"/><path d="M10 13l5.5-5.5"/>',
    pan: '<circle cx="10" cy="14" r="6"/><path d="M16 14h6M8 6.5c0-1.2 1.2-1.3 1.2-2.5M11.5 6.5c0-1.2 1.2-1.3 1.2-2.5"/>',
    book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H7a2 2 0 0 0-2 2z"/><path d="M5 20a2 2 0 0 1 2-2h12v3H7a2 2 0 0 1-2-1zM9 7.5h6"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    spark: '<path d="M12 3l2.2 6.3L20.5 11.5l-6.3 2.2L12 20l-2.2-6.3L3.5 11.5l6.3-2.2z"/>',
    shuffle: '<path d="M3 7h3.5c4.5 0 6.5 10 11 10H21M3 17h3.5c1.8 0 3.1-1.6 4.3-3.6M13.2 9.6C14.4 8 15.7 7 17.5 7H21M18 4l3 3-3 3M18 14l3 3-3 3"/>',
    pencil: '<path d="M4 20l4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16 4 20z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    share: '<path d="M12 15V3.5M7.5 8L12 3.5 16.5 8"/><path d="M5 12.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5.5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    up: '<path d="M6 14l6-6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>'
  };
  function icon(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (I[n] || I.spark) + "</svg>"; }
  var STAR = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 0l1.6 4.4L12 6l-4.4 1.6L6 12 4.4 7.6 0 6l4.4-1.6z"/></svg>';

  // Settings
  var osCalm = false;
  try { osCalm = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var settings = Object.assign({ rush: false, sound: false, haptics: true, calm: osCalm }, load(K_SET, {}));
  function applySettings() { document.documentElement.classList.toggle("calm", !!settings.calm); }

  // Idea parsing: domain, subject slots, name
  var audienceSet = C.AUDIENCES.split(" ");
  var roleSet = {}; C.ROLE_WORDS.split(" ").forEach(function (w) { roleSet[w] = 1; });

  function detectDomain(words) {
    var best = C.GENERAL, top = 0;
    C.DOMAINS.forEach(function (d) {
      var strong = " " + d.kw + " ", weak = " " + d.kw2 + " ", s = 0;
      words.forEach(function (w) {
        var stem = w.replace(/(es|s)$/, "");
        if (strong.indexOf(" " + w + " ") > -1 || (stem.length > 2 && strong.indexOf(" " + stem + " ") > -1)) s += 2;
        else if (weak.indexOf(" " + w + " ") > -1) s += 1;
      });
      if (s > top) { top = s; best = d; }
    });
    return best;
  }

  function s3(v) { v = v.toLowerCase(); return /(sh|ch|x|s)$/.test(v) ? v + "es" : v + "s"; }
  function parseIdea(idea) {
    var raw = String(idea || "").trim().replace(/\s+/g, " ").replace(/[.!?]+$/, "");
    var low = raw.toLowerCase();
    var words = low.match(/[a-z0-9']+/g) || [];
    var d = detectDomain(words);
    var m = raw.match(/^(.*?)\s+(that|who|which|to|for|so)\s+(.*)$/i);
    var head = m ? m[1] : raw, joiner = m ? m[2].toLowerCase() : "", rest = m ? m[3] : "";
    // Imperative ideas like "Help me plan a budget" describe the job, not the agent
    if (/^(please\s+)?(help|teach|coach|show|plan|write|make|build|track|find|keep|get|turn|give|explain|review|organi[sz]e|answer|cook|learn|practi[sc]e|create|draft|fix|manage|remind)\b/i.test(raw) && !/^(build|make|create)\s+(an?|the|my)\s/i.test(raw)) {
      head = ""; joiner = "that";
      rest = raw.replace(/^(please\s+)?help\s+(me|us)\s+(to\s+)?/i, "helps you ").replace(/^(please\s+)?(teach|coach|show|remind)\s+me\b/i, function (_, p, v) { return s3(v) + " you"; }).replace(/^(please\s+)?(plan|write|make|build|track|find|keep|get|turn|give|explain|review|organi[sz]e|answer|cook|learn|practi[sc]e|create|draft|fix|manage)\b/i, function (_, p, v) { return s3(v); });
    }
    head = head.replace(/^(i want|i need|build|make|create|give me)\s+/i, "").replace(/^(an?|the|my|your)\s+/i, "");
    var hw = head.toLowerCase().replace(/^(someone|something|an? ai|ai)$/, "assistant").replace(/\bai\b\s*/g, "").split(" ").filter(Boolean);
    if (hw.length > 4) hw = hw.slice(-3);
    var topicWords = hw.filter(function (w) { return !roleSet[w]; });
    var topic = topicWords.join(" ") || (d.id === "general" ? "everyday tasks" : d.topic);
    var roleWord = hw.filter(function (w) { return roleSet[w]; }).pop();
    // Unlisted agent nouns such as "summariser" or "reviewer" still count as the role word
    if (!roleWord && hw.length > 1 && /(er|or|ist|ian)$/.test(hw[hw.length - 1])) { roleWord = hw[hw.length - 1]; topicWords = hw.slice(0, -1); topic = topicWords.join(" "); }
    // "support agent for a small online bike shop": the place becomes the subject, the role word does not
    var focus = topic, orgLine = "";
    if (joiner === "for" && rest) {
      var rw = (rest.toLowerCase().match(/[a-z0-9']+/g) || []).filter(function (w) { return !/^(a|an|the|small|little|tiny|big|busy|new|local|independent)$/.test(w); });
      var rl = rest.toLowerCase().match(/[a-z0-9']+/g) || [];
      if (rw.length && rl.length <= 7 && audienceSet.indexOf(rw[0]) < 0 && !/(ing|ers)$/.test(rw[0]) && !/^(me|us|myself|people|anyone|everyone|someone|those|them|users|beginners)$/.test(rw[0])) {
        focus = rw.join(" ") + (topicWords.length ? " " + topicWords.join(" ") : "");
        orgLine = rest.toLowerCase();
        topic = focus;
      }
    }
    var agent;
    if (!hw.length) agent = d.id === "general" ? "personal assistant" : d.label.toLowerCase() + " assistant";
    else if (!topicWords.length) agent = (d.id === "general" ? "personal" : d.label.toLowerCase()) + " " + (roleWord || "assistant");
    else if (!roleWord) agent = hw.join(" ") + " assistant";
    else agent = hw.join(" ");
    var audWord = "";
    for (var i = 0; i < words.length; i++) { if (audienceSet.indexOf(words[i]) > -1) { audWord = words[i]; break; } }
    var audience = audWord || (/\b(me|my|i)\b/.test(low) ? "the user" : d.audience);
    var goal = "";
    var gm = joiner !== "for" && rest.match(/^(?:helps?|will help|can help|lets?|gets?|supports?)\s+(.*)$/i);
    if (/^helps you /i.test(rest)) audience = "the user";
    if (gm) {
      goal = gm[1].replace(new RegExp("^(?:(?:\\w+\\s+){0,2}" + (audWord || "zzz") + "|me|you|people|them|users|anyone|everyone)\\s+", "i"), "").replace(/^to\s+/i, "");
      if (goal.split(" ").length > 9 || goal.split(" ").length < 2) goal = "";
    }
    goal = goal || d.goal;
    var what;
    if (rest && (joiner === "that" || joiner === "who" || joiner === "which")) what = sentence(rest);
    else if (rest && joiner === "for") what = sentence("Made for " + rest);
    else if (rest && joiner === "to") what = sentence("Built to " + rest);
    else what = sentence("Helps " + audience + " " + goal);
    var name = d.names[hash(low) % d.names.length];
    var thatLine = (rest && (joiner === "that" || joiner === "who" || joiner === "which")) ? rest.replace(/^helps you /i, "helps you ") : "";
    return { domain: d, topic: topic, focus: focus || topic, orgLine: orgLine, thatLine: thatLine, head: hw.join(" "), agent: agent, audience: audience, goal: goal, what: what, name: name, title: titleCase(agent), idea: raw };
  }

  function fill(s, ctx) {
    var out = s.replace(/\{(topic|agent|audience|goal)\}/g, function (_, k) { return ctx[k]; });
    return /^\{/.test(s) ? cap(out) : out;
  }

  // Decks: two tailored options mixed with generic ones, deterministic per idea and shuffle count
  function genericOrder(r, ctx) {
    var key = C.ROUNDS[r].key, list = C.GENERIC[key].map(function (o, i) { return i; });
    var rand = rng(hash(ctx.idea.toLowerCase()) + r * 7919);
    for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var t = list[i]; list[i] = list[j]; list[j] = t; }
    return list;
  }
  function makeOpt(r, id, ctx) {
    var key = C.ROUNDS[r].key, src, tailored = id.charAt(0) === "d";
    var idx = +id.slice(1);
    src = tailored ? ctx.domain.opts[key][idx] : C.GENERIC[key][idx];
    if (!src) return null;
    return { id: id, t: fill(src[0], ctx), l: fill(src[1], ctx), p: fill(src[2], ctx), g: src[3].split(" "), tailored: tailored };
  }
  function deck(r, k, ctx) {
    var g = genericOrder(r, ctx), n = g.length, dom = ctx.domain.opts ? ctx.domain.opts[C.ROUNDS[r].key] : null, ids = [];
    if (dom) {
      if (k === 0) ids = ["d0", "g" + g[0], "d1", "g" + g[1]];
      else { var s = 2 + (k - 1) * 3; ids = ["g" + g[s % n], "d" + (k % 2), "g" + g[(s + 1) % n], "g" + g[(s + 2) % n]]; }
    } else { for (var i = 0; i < 4; i++) ids.push("g" + g[(k * 4 + i) % n]); }
    var seen = {};
    ids = ids.filter(function (id) { if (seen[id]) return false; seen[id] = 1; return true; });
    return ids.map(function (id) { return makeOpt(r, id, ctx); });
  }
  function resolve(r, pick, ctx) {
    if (!pick) return null;
    if (pick.custom) return { id: "custom", t: "Your own", l: sentence(pick.custom), p: sentence(pick.custom), g: [], custom: true };
    return makeOpt(r, pick.id, ctx);
  }

  // Run state
  var state = null, ctx = null;
  function fresh(idea) {
    return { v: 1, id: Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), idea: idea, screen: "round", round: 0, picks: [null, null, null, null, null, null, null], decks: [0, 0, 0, 0, 0, 0, 0], rush: [0, 0, 0, 0, 0, 0, 0], tweak: false };
  }
  function saveRun() { if (state) store(K_RUN, state); }
  function setCtx() { ctx = state ? parseIdea(state.idea) : null; }

  function scoreOf(st, cx) {
    var s = 0, combos = [], seen = {}, used = {};
    for (var r = 0; r < 7; r++) {
      var o = resolve(r, st.picks[r], cx);
      if (!o) continue;
      s += o.custom ? 12 : (o.tailored ? 11 : 9);
      if (st.rush[r]) s += 3;
      for (var i = 0; i < o.g.length; i++) {
        var t = o.g[i];
        if (seen[t] && !used[t]) { used[t] = 1; combos.push({ tag: t, name: C.SYNERGY[t] || "Combo", round: r }); s += 4; break; }
      }
      o.g.forEach(function (t) { seen[t] = 1; });
    }
    s = Math.min(100, s);
    var rank = s >= 94 ? ["S", "Legendary"] : s >= 84 ? ["A", "Elite"] : s >= 70 ? ["B", "Solid"] : ["C", "Rookie"];
    return { score: s, combos: combos, rank: rank[0], rankName: rank[1] };
  }
  function pickedCount() { return state.picks.filter(Boolean).length; }

  // Prompt builder
  function buildPrompt(st, cx) {
    var o = []; for (var r = 0; r < 7; r++) o.push(resolve(r, st.picks[r], cx));
    var L = [];
    L.push("# " + cx.name + ", the " + cx.title);
    L.push("");
    L.push("## Role");
    var an = /^[aeiou]/i.test(cx.agent) ? "an " : "a ";
    if (cx.orgLine) L.push("You are " + cx.name + ", the " + cx.head + " for " + cx.orgLine + ".");
    else if (cx.thatLine) L.push("You are " + cx.name + ", " + an + cx.agent + " that " + cx.thatLine + ".");
    else L.push("You are " + cx.name + ", " + an + cx.agent + " built for " + cx.audience + ".");
    if (o[0]) L.push(o[0].p);
    L.push("Mission: " + cx.what);
    L.push("Context: you work with " + cx.audience + " who bring you " + cx.focus + " requests. Most chats are one job to finish, so aim to leave each person with something they can use straight away.");
    L.push("Scope: stay with " + cx.focus + " requests that help " + cx.audience + " " + cx.goal + ". Out of scope: anything unrelated to that, which you decline kindly and point elsewhere.");
    L.push("");
    L.push("## Voice");
    if (o[1]) L.push(o[1].p);
    L.push("Mirror the user's language and level. Never pad an answer to sound helpful.");
    L.push("");
    L.push("## Knowledge");
    if (o[2]) L.push(o[2].p);
    L.push("Boundaries: you know " + cx.focus + " well. When a question goes beyond what you reliably know, say so plainly and point to a better source.");
    L.push("");
    L.push("## Tools");
    if (o[3]) L.push(o[3].p);
    L.push("Only claim to use a tool that is actually available in this conversation. If one is missing, give the user the steps to do it themselves.");
    L.push("");
    L.push("## Guardrails");
    if (o[4]) L.push(o[4].p);
    if (cx.domain.caution) L.push(cx.domain.caution);
    if (!o[4] || o[4].id !== "g0" || o[4].tailored) L.push("Never invent facts, figures, quotes or sources.");
    L.push("");
    L.push("## Output format");
    if (o[5]) L.push(o[5].p);
    L.push("Keep formatting readable on a small screen: short paragraphs, no walls of text.");
    L.push("");
    L.push("## Handoff and escalation");
    if (o[6]) L.push(o[6].p);
    L.push("");
    L.push("## How you work");
    L.push("1. Read the request and make sure you understand the goal.");
    L.push("2. If a missing detail would change your answer, ask one short question first.");
    L.push("3. Answer in the voice and format above, inside your knowledge boundaries.");
    L.push("4. Check your guardrails before you reply.");
    L.push("5. Close the loop using your handoff rule.");
    return L.join("\n");
  }
  function promptHTML(text) {
    return text.split("\n").map(function (line) {
      if (/^## /.test(line)) return '<span class="h">' + esc(line) + "</span>";
      if (/^# /.test(line)) return '<span class="t">' + esc(line) + "</span>";
      return esc(line);
    }).join("\n");
  }

  // Feedback: haptics, sound, toasts, confetti
  function buzz(p) { if (!settings.haptics || shot) return; try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
  var actx = null;
  function blip(notes) {
    if (!settings.sound || shot) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var t = actx.currentTime;
      notes.forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = "triangle"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.07);
        g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.07 + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.16);
        o.connect(g); g.connect(actx.destination); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.18);
      });
    } catch (e) {}
  }
  function toast(html, plain) {
    if (shot) return;
    var el = document.createElement("div");
    el.className = "toast" + (plain ? " plain" : "");
    el.innerHTML = html;
    $("#toasts").appendChild(el);
    setTimeout(function () { el.remove(); }, plain ? 2500 : 2000);
  }
  function confetti() {
    if (shot || settings.calm) return;
    var fx = $("#fx"), cols = ["#17706d", "#121a2b", "#d97a24", "#7fd1c6", "#f6efe3"], html = "";
    for (var i = 0; i < 38; i++) {
      var a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 220;
      html += '<i class="bit" style="background:' + cols[i % 5] + ";--x:" + Math.round(Math.cos(a) * d) + "px;--y:" + Math.round(Math.sin(a) * d * 0.8 + 160) + "px;--r:" + Math.round(Math.random() * 720 - 360) + "deg;animation-delay:" + (Math.random() * 0.15).toFixed(2) + 's"></i>';
    }
    fx.innerHTML = html;
    setTimeout(function () { fx.innerHTML = ""; }, 1900);
  }

  // Rendering
  var screen = $("#screen"), dock = $("#dock"), barMid = $("#barMid");
  var rushTimer = null, rushStart = 0, rushRound = -1, busy = false, lastLatest = "";

  function setScreen(name) { document.body.setAttribute("data-screen", name); }

  function renderBar() {
    document.body.classList.toggle("on-start", !state);
    if (!state) { barMid.innerHTML = '<span class="brand">Prompt Rush</span>'; return; }
    var h = '<div class="pips" role="img" aria-label="' + pickedCount() + ' of 7 layers built">';
    for (var r = 0; r < 7; r++) {
      var cls = state.picks[r] ? "done" : "";
      if (state.screen === "round" && r === state.round) cls += " now";
      h += '<span class="pip ' + cls + '"></span>';
    }
    barMid.innerHTML = h + "</div>";
  }

  function layersHTML(st, cx, freshRound) {
    var h = '<ul class="layers">';
    for (var r = 0; r < 7; r++) {
      var o = resolve(r, st.picks[r], cx);
      h += '<li class="' + (o ? "set" : "empty") + (r === freshRound ? " new" : "") + '"><span class="eyebrow">' + C.ROUNDS[r].name + "</span><span>" + (o ? esc(o.l) : "Round " + (r + 1)) + "</span></li>";
    }
    return h + "</ul>";
  }

  function meterHTML(score) {
    return '<div class="meter"><div class="meter-fill" style="transform:scaleX(' + (score / 100).toFixed(3) + ')"></div><div class="meter-ticks">' + new Array(11).join("<i></i>") + "</div></div>";
  }

  function renderDock(freshRound) {
    if (!state || state.screen !== "round") { dock.innerHTML = ""; return; }
    var sc = scoreOf(state, ctx), latest = "", latestLab = "Building";
    for (var r = 6; r >= 0; r--) { var o = resolve(r, state.picks[r], ctx); if (o) { latest = o.l; latestLab = C.ROUNDS[r].name; break; } }
    var isFresh = latest !== lastLatest; lastLatest = latest;
    dock.innerHTML =
      '<div class="dock-card" id="dockCard">' +
      '<div class="expand-hint">' + icon("up") + "</div>" +
      '<div class="dock-top"><div class="avatar">' + icon(ctx.domain.glyph) + "</div>" +
      '<div class="dock-id"><div class="dock-name">' + esc(ctx.name) + "<small>" + esc(ctx.title) + "</small></div>" +
      '<div class="dock-what">' + esc(ctx.what) + "</div></div>" +
      '<div class="score"><div class="score-num" id="scoreNum">' + sc.score + '</div><div class="score-lab">Strength</div></div></div>' +
      meterHTML(sc.score) +
      '<div class="latest' + (isFresh ? " fresh" : "") + '"><span class="eyebrow">' + (latest ? latestLab : "Your agent") + "</span><span>" + esc(latest || "Tap a card to add the first layer.") + "</span></div>" +
      '<div class="dock-layers">' + layersHTML(state, ctx, freshRound) + "</div>" +
      '<button class="expand" id="expandBtn" aria-label="Show your agent"></button>' +
      "</div>";
    $("#expandBtn").onclick = openAgentSheet;
  }

  function renderStart() {
    setScreen("start");
    var run = load(K_RUN, null), agents = load(K_AGENTS, []), h = '<div class="start">';
    h += '<div class="hero"><h1 class="wordmark">Prompt Rush</h1>' +
      '<p class="pitch">One sentence in. <b>Seven fast rounds.</b> Copy a finished system prompt.</p>' +
      '<div class="teaser" role="img" aria-label="Example result: Tempo, Drum Tutor, strength 86"><span class="t-tag">Example result</span>' +
      '<div class="t-top"><div class="avatar">' + icon("drum") + '</div><div class="t-id"><b>Tempo</b><small>Drum Tutor</small></div><div class="score"><div class="score-num">86</div><div class="score-lab">Strength</div></div></div>' +
      meterHTML(86) + '<p class="t-prompt">You are Tempo, a patient drum coach for beginners. Keep steady time, explain one step at a time, and end with a short practice plan.</p></div></div>';
    if (run && run.idea) {
      var cx = parseIdea(run.idea), n = run.picks.filter(Boolean).length;
      h += '<button class="continue" id="contBtn"><div class="avatar">' + icon(cx.domain.glyph) + '</div><div class="c-txt"><div class="c-name">Continue ' + esc(cx.name) + '</div><div class="c-sub">' + (n === 7 ? "Finished. Open the card" : "Round " + Math.min(7, n + 1) + " of 7, " + n + (n === 1 ? " layer" : " layers") + " built") + '</div></div><span class="c-go">' + icon("arrow") + "</span></button>";
    }
    h += '<div class="idea-box"><label class="idea-label" for="idea">Describe your agent in one sentence</label>' +
      '<textarea id="idea" class="idea-input" rows="3" maxlength="160" placeholder="A gardening mentor for new growers"></textarea>' +
      '<div class="idea-foot"><span id="ideaHelp">Type a few words to start</span><span id="ideaCount">0 / 160</span></div>' +
      '<button class="btn btn-primary btn-wide" id="goBtn" disabled>Start the rush ' + icon("arrow") + "</button>" +
      '<p class="trust">Offline. No sign in. Nothing leaves this phone.</p></div>';
    h += '<div><div class="chips-head"><span class="eyebrow">Stuck? Surprise me</span><button class="chip chip-dice" id="diceBtn">' + icon("dice") + "Roll one</button></div>" +
      '<div class="chips" id="seeds" style="margin-top:10px">' + seedChips() + "</div></div>";
    h += '<div class="shelf"><h3 class="eyebrow">Your agents <small>' + (agents.length ? agents.length + " built" : "Finished builds land here") + "</small></h3><div class=\"shelf-row\">";
    if (agents.length) {
      agents.slice().reverse().forEach(function (a) {
        h += '<button class="mini" data-agent="' + esc(a.id) + '"><span class="mini-rank">' + esc(a.rank) + '</span><div class="avatar">' + icon(a.glyph) + '</div><div class="mini-name">' + esc(a.name) + '</div><div class="mini-sub">' + esc(a.title) + "</div></button>";
      });
    } else {
      for (var i = 0; i < 3; i++) h += '<div class="mini ghost"><span class="ghost-plus"></span>' + (i === 0 ? "Your first agent" : "") + "</div>";
    }
    h += "</div></div></div>";
    screen.innerHTML = h;
    screen.scrollTop = 0;

    var input = $("#idea"), go = $("#goBtn");
    var help = $("#ideaHelp"), cnt = $("#ideaCount");
    function sync() { var n = input.value.trim().length; go.disabled = n < 4; cnt.textContent = input.value.length + " / 160"; help.textContent = n < 4 ? "Type a few words to start" : "Ready when you are"; help.classList.toggle("ok", n >= 4); }
    input.addEventListener("input", sync);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); if (!go.disabled) go.click(); } });
    go.onclick = function () { begin(input.value); };
    $("#diceBtn").onclick = function () {
      var s = C.SEEDS[Math.floor(Math.random() * C.SEEDS.length)];
      input.value = s; sync(); buzz(8); blip([520, 660]);
      $("#seeds").innerHTML = seedChips(); wireSeeds();
    };
    wireSeeds();
    var cb = $("#contBtn"); if (cb) cb.onclick = function () { state = load(K_RUN, null); setCtx(); state.screen = pickedCount() === 7 && !state.tweak ? "final" : "round"; if (state.screen === "round") state.round = firstOpen(); show(); };
    Array.prototype.forEach.call(screen.querySelectorAll(".mini[data-agent]"), function (b) {
      b.onclick = function () {
        var a = load(K_AGENTS, []).filter(function (x) { return x.id === b.getAttribute("data-agent"); })[0];
        if (!a) return;
        state = { v: 1, id: a.id, idea: a.idea, screen: "final", round: 6, picks: a.picks, decks: a.decks || [0, 0, 0, 0, 0, 0, 0], rush: a.rush || [0, 0, 0, 0, 0, 0, 0], tweak: false, saved: true };
        setCtx(); saveRun(); show();
      };
    });
  }
  var seedOffset = 0;
  function seedChips() {
    var out = "";
    for (var i = 0; i < 3; i++) {
      var s = C.SEEDS[(seedOffset + i) % C.SEEDS.length];
      out += '<button class="chip seed" style="animation-delay:' + (i * 0.05) + 's" data-seed="' + esc(s) + '">' + esc(s) + "</button>";
    }
    seedOffset = (seedOffset + 3) % C.SEEDS.length;
    return out;
  }
  function wireSeeds() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-seed]"), function (b) {
      b.onclick = function () { buzz(8); begin(b.getAttribute("data-seed")); };
    });
  }

  function begin(idea) {
    idea = String(idea || "").trim();
    if (idea.length < 4) return;
    state = fresh(idea); setCtx(); saveRun(); buzz([10, 30, 10]); blip([440, 660, 880]);
    lastLatest = "";
    show();
    toast('<span class="burst">' + esc(ctx.domain.label) + "</span>Cards tuned for your " + esc(ctx.agent) + ".", true);
  }

  function firstOpen() { for (var r = 0; r < 7; r++) if (!state.picks[r]) return r; return 6; }

  function renderRound(animate) {
    setScreen("round");
    var r = state.round, R = C.ROUNDS[r], cards = deck(r, state.decks[r], ctx), cur = state.picks[r];
    var h = '<div class="round' + (animate ? " round-anim" : "") + '"><div class="round-head">' +
      '<div class="round-meta"><span class="round-num">Round <b>' + (r + 1) + "</b> of 7</span><span class=\"eyebrow\">" + R.name + "</span>" + rushHTML() + "</div>" +
      '<h2 class="round-title">' + esc(fill(R.title, ctx)) + "</h2>" +
      '<p class="round-hint">' + esc(fill(R.hint, ctx)) + "</p></div>";
    h += '<div class="choices" id="choices">';
    var base = scoreOf(state, ctx);
    cards.forEach(function (o, i) {
      var was = cur && !cur.custom && cur.id === o.id;
      var trial = JSON.parse(JSON.stringify(state)); trial.picks[r] = { id: o.id };
      var tc = scoreOf(trial, ctx).combos.filter(function (c) { return c.round === r; })[0];
      var tags = (tc && !was ? '<span class="tag combo">+4 ' + esc(tc.name) + "</span>" : "") + (o.tailored ? '<span class="tag">' + STAR + "Tailored</span>" : "");
      h += '<button class="choice' + (was ? " was" : "") + (tags ? " has-tag" : "") + '" data-i="' + i + '">' +
        (tags ? '<span class="tags">' + tags + "</span>" : "") +
        '<span class="key">' + (was ? icon("check") : LETTERS[i]) + "</span>" +
        '<span><span class="c-title">' + esc(o.t) + '</span><span class="c-line">' + esc(o.l) + "</span></span></button>";
    });
    h += "</div>";
    h += '<div class="round-actions">' +
      '<button class="btn btn-soft" id="shuffleBtn">' + icon("shuffle") + "Shuffle</button>" +
      '<button class="btn btn-soft" id="ownBtn">' + icon("pencil") + "Write my own</button>" +
      (state.tweak ? '<button class="btn btn-soft back-final" id="backFinal">' + icon("back") + "Back to my agent</button>" : "") +
      "</div></div>";
    screen.innerHTML = h;
    screen.scrollTop = 0;
    Array.prototype.forEach.call(screen.querySelectorAll(".choice"), function (b) {
      b.onclick = function () { var o = cards[+b.getAttribute("data-i")]; choose({ id: o.id }, b, o); };
    });
    $("#shuffleBtn").onclick = function () {
      state.decks[r] = (state.decks[r] + 1) % 6; saveRun(); buzz(8); blip([600, 500]); renderRound(true); renderDock();
    };
    $("#ownBtn").onclick = openOwnSheet;
    var bf = $("#backFinal"); if (bf) bf.onclick = function () { state.tweak = false; state.screen = "final"; saveRun(); show(); };
    startRush(r);
  }

  function rushHTML() {
    if (!settings.rush || state.tweak || shot) return "";
    return '<span class="rush" id="rush"><span class="rush-track"><span class="rush-fill"></span></span><span id="rushLab">Bonus</span></span>';
  }
  function startRush(r) {
    clearTimeout(rushTimer);
    var el = $("#rush");
    if (!el) return;
    if (rushRound !== r) { rushRound = r; rushStart = Date.now(); }
    var left = RUSH_SECONDS * 1000 - (Date.now() - rushStart);
    if (left <= 0) { el.classList.add("over"); $("#rushLab").textContent = "No rush"; return; }
    el.style.setProperty("--rush", (left / 1000).toFixed(2) + "s");
    var fillEl = el.querySelector(".rush-fill");
    fillEl.style.transform = "scaleX(" + (left / (RUSH_SECONDS * 1000)).toFixed(3) + ")";
    requestAnimationFrame(function () { fillEl.style.transform = ""; el.classList.add("run"); fillEl.style.animation = "drain " + (left / 1000).toFixed(2) + "s linear both"; fillEl.style.transform = ""; });
    rushTimer = setTimeout(function () { el.classList.remove("run"); el.classList.add("over"); var lab = $("#rushLab"); if (lab) lab.textContent = "No rush"; }, left);
  }
  function rushLive(r) { return settings.rush && !state.tweak && rushRound === r && Date.now() - rushStart < RUSH_SECONDS * 1000; }

  function choose(pick, el, opt) {
    if (busy) return;
    busy = true;
    var r = state.round, before = scoreOf(state, ctx);
    state.picks[r] = pick;
    state.rush[r] = rushLive(r) ? 1 : 0;
    clearTimeout(rushTimer);
    var after = scoreOf(state, ctx);
    var newCombos = after.combos.filter(function (c) { return !before.combos.some(function (b) { return b.tag === c.tag; }); });
    var wasTweak = state.tweak;
    var next = firstOpen();
    var done = pickedCount() === 7;
    if (wasTweak || done) { state.screen = "final"; state.tweak = false; } else { state.round = next; }
    saveRun();
    buzz(newCombos.length ? [12, 40, 18] : 14);
    blip(newCombos.length ? [660, 880, 1100] : [700, 940]);

    if (shot) { busy = false; show(); return; }
    var gain = after.score - before.score;
    if (el) {
      el.classList.add("picked");
      el.querySelector(".key").innerHTML = icon("check");
      $("#choices").classList.add("locked");
      var pt = document.createElement("span"); pt.className = "points"; pt.textContent = "+" + Math.max(gain, 0); el.appendChild(pt);
    }
    if (state.screen === "final") celebrateNext = true;
    renderDockAnimated(r, before.score, after.score);
    newCombos.forEach(function (c, i) { setTimeout(function () { toast('<span class="burst">Combo</span>' + esc(c.name) + ' <span class="plus">+4</span>'); }, 150 + i * 300); });
    if (state.rush[r]) setTimeout(function () { toast('<span class="burst">Rush</span>Quick pick bonus <span class="plus">+3</span>'); }, 200);
    setTimeout(function () { busy = false; show(); }, settings.calm ? 380 : 720);
  }

  function renderDockAnimated(freshRound, from, to) {
    if (state.screen !== "round") { var s = state.screen; state.screen = "round"; renderDock(freshRound); state.screen = s; }
    else renderDock(freshRound);
    var card = $("#dockCard"), num = $("#scoreNum");
    if (!card) return;
    card.classList.add("bump");
    var fillEl = card.querySelector(".meter-fill");
    fillEl.style.transform = "scaleX(" + (from / 100).toFixed(3) + ")";
    requestAnimationFrame(function () { requestAnimationFrame(function () { fillEl.style.transform = "scaleX(" + (to / 100).toFixed(3) + ")"; }); });
    if (settings.calm) return;
    var t0 = performance.now();
    (function tick(t) { var k = Math.min(1, (t - t0) / 500); num.textContent = Math.round(from + (to - from) * k); if (k < 1) requestAnimationFrame(tick); })(t0);
  }

  function renderFinal(celebrate) {
    setScreen("final");
    var sc = scoreOf(state, ctx), prompt = buildPrompt(state, ctx);
    saveAgent(sc);
    var h = '<div class="final">';
    h += '<div class="final-head"><span class="eyebrow">Build complete</span><h1>Meet ' + esc(ctx.name) + ".</h1></div>";
    h += '<div class="final-left"><article class="agent-card">' +
      '<div class="stamp"><b>' + sc.rank + "</b><small>" + sc.rankName + "</small></div>" +
      '<div class="ac-top"><div class="avatar">' + icon(ctx.domain.glyph) + '</div><div><h2 class="ac-name">' + esc(ctx.name) + '</h2><div class="ac-sub">' + esc(ctx.title) + "</div></div></div>" +
      '<p class="ac-what">' + esc(ctx.what) + "</p>" +
      '<div class="ac-score">' + meterHTML(sc.score) + '<span class="score-num">' + sc.score + "</span><em>" + sc.rankName + "</em></div>" +
      '<div class="ac-layers">' + layersHTML(state, ctx, -1) + "</div>" +
      (sc.combos.length ? '<div class="combos">' + sc.combos.map(function (c) { return '<span class="combo-chip">' + esc(c.name) + "</span>"; }).join("") + "</div>" : "") +
      "</article></div>";
    h += '<div class="final-right">' +
      '<div class="final-actions"><button class="btn btn-primary" id="copyBtn">' + icon("copy") + 'Copy prompt</button><button class="btn btn-soft" id="shareBtn">' + icon("share") + "Share</button></div>" +
      '<section class="prompt-box"><div class="eyebrow">System prompt <span>' + prompt.split(/\s+/).length + " words</span></div><pre class=\"prompt\" id=\"promptText\">" + promptHTML(prompt) + "</pre></section>" +
      '<div class="tweak"><h3 class="eyebrow">Tweak a layer</h3><div class="tweak-row">' +
      C.ROUNDS.map(function (R, i) { return '<button class="chip" data-tweak="' + i + '"><small>' + (i + 1) + "</small>" + R.name + "</button>"; }).join("") +
      '<button class="chip" id="anotherMini" style="color:var(--teal)"><small>New</small>Build</button></div></div>' +
      '<button class="btn btn-soft btn-wide" id="anotherBtn">' + icon("plus") + "Build another agent</button>" +
      "</div></div>";
    screen.innerHTML = h;
    screen.scrollTop = 0;
    $("#copyBtn").onclick = function () { copyText(prompt); };
    $("#shareBtn").onclick = function () { shareText(ctx.name + ", built in Prompt Rush\n\n" + prompt); };
    var another = function () { drop(K_RUN); state = null; ctx = null; show(); };
    $("#anotherBtn").onclick = another; $("#anotherMini").onclick = another;
    Array.prototype.forEach.call(screen.querySelectorAll("[data-tweak]"), function (b) {
      b.onclick = function () { state.round = +b.getAttribute("data-tweak"); state.tweak = true; state.screen = "round"; saveRun(); buzz(8); show(); };
    });
    if (celebrate) { confetti(); buzz([20, 60, 20, 60, 40]); blip([523, 659, 784, 1047]); }
  }

  function saveAgent(sc) {
    var agents = load(K_AGENTS, []), entry = { id: state.id, name: ctx.name, title: ctx.title, glyph: ctx.domain.glyph, rank: sc.rank, score: sc.score, idea: state.idea, picks: state.picks, decks: state.decks, rush: state.rush };
    agents = agents.filter(function (a) { return a.id !== state.id; });
    agents.push(entry);
    if (agents.length > 12) agents = agents.slice(-12);
    store(K_AGENTS, agents);
  }

  function copyText(text) {
    var ok = function () { buzz([10, 40, 10]); blip([880, 1175]); toast('<span class="burst">Copied</span>Paste it into any AI chat.', true); var b = $("#copyBtn"); if (b) { b.innerHTML = icon("check") + "Copied"; setTimeout(function () { if (b.isConnected) b.innerHTML = icon("copy") + "Copy prompt"; }, 1800); } };
    var fallback = function () {
      var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
      var done = false; try { done = document.execCommand("copy"); } catch (e) {}
      ta.remove(); if (done) ok(); else toast("Copy blocked. Press and hold the prompt to select it.", true);
    };
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback(); } catch (e) { fallback(); }
  }
  function shareText(text) {
    try { if (navigator.share) { navigator.share({ title: "Prompt Rush agent", text: text }).catch(function () {}); return; } } catch (e) {}
    copyText(text);
  }

  // Sheets
  var sheetWrap = $("#sheetWrap"), sheet = $("#sheet");
  function openSheet(html) {
    sheet.innerHTML = '<div class="grab"></div>' + html;
    sheetWrap.hidden = false;
    pauseRush();
    buzz(6);
  }
  function closeSheet() { sheetWrap.hidden = true; sheet.innerHTML = ""; resumeRush(); }
  var rushPausedAt = 0;
  function pauseRush() {
    if (rushPausedAt || !settings.rush || !state || state.screen !== "round") return;
    var el = $("#rush"); if (!el || el.classList.contains("over")) return;
    rushPausedAt = Date.now(); clearTimeout(rushTimer);
    var f = el.querySelector(".rush-fill"); if (f) f.style.animationPlayState = "paused";
  }
  function resumeRush() {
    if (!rushPausedAt) return;
    var gap = Date.now() - rushPausedAt; rushPausedAt = 0;
    if (!state || state.screen !== "round" || !settings.rush) return;
    var el = $("#rush"); if (!el || el.classList.contains("over")) return;
    var f = el.querySelector(".rush-fill"); if (f) f.style.animationPlayState = "";
    rushStart += gap;
    var left = RUSH_SECONDS * 1000 - (Date.now() - rushStart);
    clearTimeout(rushTimer);
    rushTimer = setTimeout(function () { el.classList.remove("run"); el.classList.add("over"); var lab = $("#rushLab"); if (lab) lab.textContent = "No rush"; }, Math.max(0, left));
  }
  sheetWrap.addEventListener("click", function (e) { if (e.target.hasAttribute("data-close")) closeSheet(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !sheetWrap.hidden) closeSheet(); });

  function openAgentSheet() {
    var sc = scoreOf(state, ctx);
    openSheet('<div class="dock-top"><div class="avatar">' + icon(ctx.domain.glyph) + '</div><div class="dock-id"><h2 style="margin:0">' + esc(ctx.name) + '</h2><div class="dock-what" style="white-space:normal">' + esc(ctx.what) + '</div></div><div class="score"><div class="score-num">' + sc.score + '</div><div class="score-lab">Strength</div></div></div>' +
      '<div style="margin:12px 0 14px">' + meterHTML(sc.score) + "</div>" + layersHTML(state, ctx, -1) +
      (sc.combos.length ? '<div class="combos">' + sc.combos.map(function (c) { return '<span class="combo-chip">' + esc(c.name) + "</span>"; }).join("") + "</div>" : "") +
      '<div class="sheet-actions" style="grid-template-columns:1fr"><button class="btn btn-primary" data-close>Keep building</button></div>');
  }

  function openOwnSheet() {
    var R = C.ROUNDS[state.round];
    openSheet('<span class="eyebrow">' + R.name + '</span><h2>Write your own</h2><p>' + esc(fill(R.hint, ctx)) + ' Your words go straight into the prompt.</p>' +
      '<textarea class="idea-input" id="ownText" maxlength="220" placeholder="In one sentence, describe the ' + R.name.toLowerCase() + ' you want"></textarea>' +
      '<div class="sheet-actions"><button class="btn btn-soft" data-close>Cancel</button><button class="btn btn-primary" id="ownSave" disabled>Add it ' + icon("check") + "</button></div>");
    var ta = $("#ownText"), b = $("#ownSave");
    ta.addEventListener("input", function () { b.disabled = ta.value.trim().length < 4; });
    b.onclick = function () { var v = ta.value.trim().replace(/\s+/g, " "); closeSheet(); choose({ custom: v }, null, null); toast('<span class="burst">Custom</span>Your own layer <span class="plus">+12</span>'); };
    setTimeout(function () { try { ta.focus(); } catch (e) {} }, 60);
  }

  function toggleRow(key, title, sub) {
    return '<button class="toggle-row" role="switch" aria-checked="' + !!settings[key] + '" data-set="' + key + '"><span class="toggle-txt"><b>' + title + "</b><span>" + sub + '</span></span><span class="switch"></span></button>';
  }
  function openSettings() {
    openSheet("<h2>Settings</h2>" +
      toggleRow("rush", "Rush mode", "A 10 second bonus clock each round. Never a penalty.") +
      toggleRow("sound", "Sound", "Tiny blips when you pick and finish.") +
      toggleRow("haptics", "Haptics", "A light buzz on every tap.") +
      toggleRow("calm", "Reduce motion", osCalm ? "On because your phone asks for less motion." : "Fewer animations, same game.") +
      '<p class="fine">Works fully offline. Nothing you type leaves this phone.</p>');
    Array.prototype.forEach.call(sheet.querySelectorAll("[data-set]"), function (b) {
      b.onclick = function () {
        var k = b.getAttribute("data-set"); settings[k] = !settings[k]; store(K_SET, settings); applySettings();
        b.setAttribute("aria-checked", !!settings[k]); buzz(8); blip([620]);
        if (k === "rush" && state && state.screen === "round") { rushRound = -1; renderRound(false); }
      };
    });
  }

  function openRestart() {
    var has = !!load(K_RUN, null);
    openSheet("<h2>Start over?</h2><p>" + (has ? "This wipes the agent you are building now. Finished agents stay on your shelf." : "This clears the idea box so you can start fresh. Finished agents stay on your shelf.") + "</p>" +
      '<div class="sheet-actions"><button class="btn btn-soft" data-close>Keep going</button><button class="btn btn-danger" id="wipeBtn">Wipe and restart</button></div>');
    $("#wipeBtn").onclick = function () { closeSheet(); drop(K_RUN); state = null; ctx = null; clearTimeout(rushTimer); rushRound = -1; buzz([20, 40, 20]); show(); toast("Fresh start. What will you build?", true); };
  }

  $("#settingsBtn").onclick = openSettings;
  $("#restartBtn").onclick = openRestart;
  $("#homeBtn").onclick = function () { if (state) { state.screen = "start"; saveRun(); } clearTimeout(rushTimer); state = null; ctx = null; show(); };

  var celebrateNext = false;
  function show() {
    renderBar();
    if (!state) { renderStart(); return; }
    if (state.screen === "final") { var c = celebrateNext; celebrateNext = false; renderFinal(c); return; }
    renderRound(!shot); renderDock();
  }

  // Test hook: ?shot=start|round-1|round-4|round-7|final
  var shot = null;
  try { shot = new URLSearchParams(location.search).get("shot"); } catch (e) {}
  function runShot(name) {
    document.documentElement.classList.add("calm");
    drop(K_RUN); drop(K_AGENTS); drop(K_SET);
    settings = { rush: false, sound: false, haptics: false, calm: true };
    if (name === "start") { state = null; show(); return; }
    var target = { "round-1": 0, "round-4": 3, "round-7": 6, "final": 7 }[name];
    if (target === undefined) target = 0;
    state = fresh("A drum tutor that helps beginners keep steady time"); state.id = "shot";
    setCtx();
    for (var r = 0; r < target; r++) state.picks[r] = { id: deck(r, 0, ctx)[0].id };
    if (target === 7) state.screen = "final"; else state.round = target;
    saveRun(); show();
  }

  window.__promptRush = { parseIdea: parseIdea, build: function (idea) {
    var st = fresh(idea), cx = parseIdea(idea);
    for (var r = 0; r < 7; r++) st.picks[r] = { id: deck(r, 0, cx)[0].id };
    return buildPrompt(st, cx);
  } };
  applySettings();
  if (shot) runShot(shot);
  else {
    state = load(K_RUN, null);
    if (state && (!state.idea || !Array.isArray(state.picks) || state.picks.length !== 7)) state = null;
    if (state && state.screen === "start") state = null;
    if (state) setCtx();
    show();
    if (state && state.screen === "round") toast("Welcome back, round " + (state.round + 1) + " of 7", true);
  }
})();
