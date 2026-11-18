// Prompt X-Ray views, shared by the desktop app and the phone app. Splits a prompt into the parts of any Prompt Forge framework. Offline, keyword scored.
(function () {
  'use strict';

  // Words that tie a framework part to one of the six classic parts
  var BASE_WORDS = {
    role: ['role', 'persona', 'capacity', 'identity', 'character', 'hat', 'expert', 'expertise', 'who', 'voice'],
    context: ['context', 'background', 'situation', 'scenario', 'setting', 'reality', 'before', 'environment', 'audience', 'user', 'reader', 'customer', 'data', 'input', 'evidence', 'fact', 'knowledge', 'insight', 'information', 'observation', 'current', 'present', 'past', 'history', 'source', 'symptom', 'issue', 'problem', 'complication', 'dump', 'detail', 'why', 'situation', 'obstacle', 'challenge', 'assumption', 'cause'],
    task: ['task', 'action', 'instruction', 'objective', 'goal', 'mission', 'ask', 'request', 'purpose', 'intent', 'aim', 'job', 'execute', 'execution', 'do', 'solve', 'solution', 'generate', 'focus', 'question', 'plan', 'step', 'method', 'process', 'how', 'what', 'statement', 'need', 'decision', 'move', 'query', 'recommendation', 'approach', 'strategy', 'create', 'write', 'topic', 'subject', 'point', 'idea', 'analyze', 'analyse', 'analysis', 'evaluate', 'evaluation', 'test', 'review', 'iterate', 'investigate', 'examine', 'assess', 'explore', 'identify', 'verify', 'understand', 'improve', 'refine', 'outline', 'explain', 'develop', 'find', 'select', 'organize', 'summarize', 'synthesize', 'synthesis', 'reason', 'reasoning', 'logic', 'option', 'alternative', 'vision', 'target'],
    constraints: ['constraint', 'limit', 'restriction', 'restrict', 'rule', 'narrowing', 'warning', 'avoid', 'exclude', 'guardrail', 'scope', 'boundary', 'requirement', 'standard', 'risk', 'limitation', 'suppress', 'nuance', 'allowed', 'timeline', 'keyword', 'avoid'],
    format: ['format', 'output', 'response', 'structure', 'yield', 'return', 'style', 'tone', 'length', 'notation', 'layout', 'deliverable', 'expectation', 'result', 'outcome', 'success', 'end', 'criteria', 'language', 'medium', 'syntax', 'template', 'schema', 'turnaround', 'emphasis', 'answer', 'metric', 'measure', 'measurable', 'deliver'],
    examples: ['example', 'sample', 'shot', 'demonstration', 'demonstrate', 'reference', 'illustrate', 'few']
  };
  // Order matters: on a tie the earlier part wins, same as the classic X-Ray
  var BASE_KEYS = ['role', 'constraints', 'format', 'examples', 'task', 'context'];

  // Everyday words that point at a named part, so 'readers' lands in Audience
  var SYN = { reader: 'audience', parent: 'audience', student: 'audience', customer: 'audience', client: 'audience', viewer: 'audience', listener: 'audience', subscriber: 'audience', user: 'audience', friendly: 'tone', formal: 'tone', casual: 'tone', warm: 'tone', playful: 'tone', voice: 'tone', step: 'step', first: 'step', then: 'step', list: 'format', bullet: 'format', table: 'format', json: 'format', markdown: 'format', never: 'constraint', avoid: 'constraint', under: 'constraint', limit: 'constraint', why: 'reason', because: 'reason' };

  // Same scoring as the classic X-Ray, so a sentence lands in the same classic part on both apps
  var RX = {
    role: /\b(you are|act as|act like|adopt the|persona of|role of|behave as|you're an?|assume the role)\b/i,
    constraints: /\b(don'?t|do not|never|avoid|must not|no more than|at most|at least|limit(?:ed)? to|only|exclude|without|refuse|forbidden|not allowed)\b/i,
    format: /\b(format|bullet|bulleted|numbered list|table|json|xml|yaml|markdown|heading|word count|words? max|paragraphs?|respond in|output.{0,12}(as|in)|structure your|tone[:\s]|begin with|end with|no preamble)\b/i,
    examples: /\b(example|e\.g\.|for instance|for example|such as|input:|output:|sample)\b/i,
    task: /\b(write|create|generate|analy[sz]e|summari[sz]e|list|explain|rewrite|classify|extract|translate|design|draft|produce|evaluate|compare|review|identify|describe|outline|build|compose|convert|improve|suggest|recommend|brainstorm|critique|answer|research)\b/i,
    context: /\b(context|background|given|about|we are|we're|i am|i'm|our (company|team|brand|product|business|customers|clients)|the users?|scenario|situation|currently|working on|audiences?|readers?|users|customers|clients|students|listeners|viewers|subscribers)\b/i
  };

  var STOP = {};
  ('a an and are as at be by can do does for from has have how i if in into is it its me my no not of on or our should so than that the their them then there these they this to up us was we what when where which who will with you your one any all more most each own just also e g eg etc').split(' ').forEach(function (w) { STOP[w] = 1; });

  function stem(w) {
    w = w.toLowerCase();
    if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (w.length > 3 && /[^sui]s$/.test(w)) return w.slice(0, -1);
    return w;
  }
  function words(text, keepStop) {
    return String(text || '').toLowerCase().split(/[^a-z0-9']+/).map(function (w) { return w.replace(/'/g, ''); })
      .filter(function (w) { return w && w.length > 1 && (keepStop || !STOP[w]); }).map(stem);
  }
  function norm(text) {
    return String(text || '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  // Which classic part a framework part is closest to, or null
  function baseOf(field) { var r = baseRank(field); return r ? r.base : null; }

  // The classic part and how strongly the part's name points at it (0 is strongest)
  function baseRank(field) {
    var tries = [field.label, String(field.id || '').replace(/^forge[A-Z][a-z]*/, '').replace(/([a-z])([A-Z])/g, '$1 $2'), field.hint];
    for (var t = 0; t < tries.length; t++) {
      var ws = words(tries[t], true);
      for (var i = 0; i < ws.length; i++) {
        for (var b = 0; b < BASE_KEYS.length; b++) {
          var at = BASE_WORDS[BASE_KEYS[b]].indexOf(ws[i]);
          if (at >= 0) return { base: BASE_KEYS[b], rank: t * 100 + i * 10 + Math.min(at, 9) };
        }
      }
    }
    return null;
  }

  function classify(line, i) {
    var s = {
      role: (RX.role.test(line) ? 3 : 0) + (i === 0 ? 1 : 0),
      constraints: RX.constraints.test(line) ? 2.5 : 0,
      format: RX.format.test(line) ? 2.5 : 0,
      examples: RX.examples.test(line) ? 2 : 0,
      task: RX.task.test(line) ? 2 : 0,
      context: (RX.context.test(line) ? 1.5 : 0) + (i > 0 && i < 3 ? 0.5 : 0)
    };
    var best = null, top = 1;
    BASE_KEYS.forEach(function (k) { if (s[k] > top) { best = k; top = s[k]; } });
    return best;
  }

  function sentences(line) {
    var keep = line.replace(/\b(e\.g|i\.e|etc|vs|approx|incl)\./gi, function (m) { return m.replace(/\./g, '\u0001'); });
    return (keep.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g) || [keep]).map(function (x) { return x.replace(/\u0001/g, '.').trim(); }).filter(Boolean);
  }

  // A heading is a short line marked with #, ** or a closing colon, an XML tag, or the exact name of a part
  function heading(line, labels) {
    var t = line.trim(), m;
    if ((m = /^<([a-z][a-z0-9_ -]{1,30})>$/i.exec(t))) return norm(m[1].replace(/_/g, ' '));
    if ((m = /^#{1,6}\s*(.{2,40}?)\s*:?\s*$/.exec(t))) return norm(m[1].replace(/\*\*/g, ''));
    if ((m = /^\*\*(.{2,40}?)\*\*\s*:?\s*$/.exec(t))) return norm(m[1]);
    if ((m = /^([A-Za-z][A-Za-z0-9'&\/ -]{1,30}):$/.exec(t))) return norm(m[1]);
    var n = norm(t);
    if (n && n.split(' ').length <= 4 && labels[n]) return n;
    return null;
  }

  // Split text into sentences and list items, each with the heading it sits under and its classic part
  function segments(text, labels) {
    labels = labels || {};
    var segs = [], section = null, n = 0;
    String(text || '').split(/\n/).forEach(function (raw) {
      var line = raw.trim();
      if (!line || /^<\/[a-z0-9_ -]+>$/i.test(line)) return;
      var h = heading(line, labels);
      if (h) { section = h; return; }
      var head = section;
      var inline = /^([A-Za-z][A-Za-z0-9'&\/ -]{1,30}):\s+(.+)$/.exec(line);
      if (inline && norm(inline[1]).split(' ').length <= 4) { head = norm(inline[1]); line = inline[2]; }
      var list = /^([-*•]|\d+[.)])\s+/.test(line);
      (list ? [line] : sentences(line)).forEach(function (sx) {
        segs.push({ text: sx, head: head, base: classify(sx, n++) });
      });
    });
    return segs;
  }

  // Map a heading to a classic part using the same words that tie framework parts to classic parts
  function headBase(head) {
    var ws = words(head);
    for (var i = 0; i < ws.length; i++) {
      for (var b = 0; b < BASE_KEYS.length; b++) if (BASE_WORDS[BASE_KEYS[b]].indexOf(ws[i]) >= 0) return BASE_KEYS[b];
    }
    return null;
  }

  // Split a prompt into the parts of one framework. Returns [{ text, part }] where part is a field id or 'other'.
  function split(text, def) {
    var fields = (def && def.fields || []).map(function (f, i) {
      var label = words(f.label), hint = words(f.hint);
      var r = baseRank(f);
      return { id: f.id || ('part' + i), idx: i, name: norm(f.label), label: label, hint: hint, base: r ? r.base : null, rank: r ? r.rank : 999 };
    });
    var labels = {};
    fields.forEach(function (f) { if (f.name) labels[f.name] = f; });
    var segs = segments(text, labels);

    // First pass: exact heading, else best score
    var picks = segs.map(function (s) {
      if (s.head && labels[s.head]) return { field: labels[s.head], tied: null };
      var base = (s.head && headBase(s.head)) || s.base;
      var tw = words(s.text).concat(s.head ? words(s.head) : []);
      tw = tw.concat(tw.map(function (w) { return SYN[w]; }).filter(Boolean));
      var best = [], top = 1.1;
      fields.forEach(function (f) {
        var hit = 0;
        tw.forEach(function (w) { if (f.label.indexOf(w) >= 0) hit += 1; else if (f.hint.indexOf(w) >= 0) hit += 0.4; });
        // A part named straight after the classic part (Format over Style) wins a tie
        var sc = (f.base && f.base === base ? 3 - Math.min(f.rank, 300) / 1000 : 0) + Math.min(2, hit) * 1.2;
        if (sc > top + 0.001) { best = [f]; top = sc; } else if (Math.abs(sc - top) <= 0.001) best.push(f);
      });
      if (!best.length) return { field: null, tied: null };
      return best.length === 1 ? { field: best[0], tied: null } : { field: null, tied: best, base: base };
    });

    // Second pass: spread sentences across tied parts in reading order
    var groups = {};
    picks.forEach(function (p, i) {
      if (!p.tied) return;
      var key = p.tied.map(function (f) { return f.idx; }).join(',');
      (groups[key] = groups[key] || []).push(i);
    });
    Object.keys(groups).forEach(function (key) {
      var list = groups[key], tied = picks[list[0]].tied;
      list.forEach(function (segIdx, r) {
        picks[segIdx].field = tied[Math.min(tied.length - 1, Math.floor(r * tied.length / list.length))];
      });
    });

    return segs.map(function (s, i) { return { text: s.text, part: picks[i].field ? picks[i].field.id : 'other' }; });
  }

  // Short name and parts list for menus, without the long dash used in Forge titles
  function name(def) {
    var label = def.label || String(def.title || '').split(' — ')[0];
    return label + ': ' + (def.fields || []).map(function (f) { return f.label; }).join(', ');
  }

  window.PL_XRAY_VIEWS = {
    POPULAR: ['rtf', 'costar', 'risen', 'crispe', 'race', 'care', 'rodes', 'ricce', 'trace', 'tag', 'ape', 'craft', 'cot', 'fewshot', 'bab', 'pas', 'star', 'scqa'],
    baseOf: baseOf,
    segments: segments,
    split: split,
    name: name
  };
})();
