# Extract per-view HTML/CSS/JS reference bundles from the monolith files.
import os, re, io, json, collections

ROOT = r"C:\Users\Eugene Phillips\Documents\GitHub\Prompt-Library-Update"
OUT  = os.path.join(ROOT, "Prompt Library Interface Files")

html = io.open(os.path.join(ROOT, "static", "index.html"), encoding="utf-8").read()
css  = io.open(os.path.join(ROOT, "static", "app.css"), encoding="utf-8").read()
js   = io.open(os.path.join(ROOT, "static", "app.js"), encoding="utf-8").read()

# ---------------------------------------------------------------- views table
# folder, element id, human title
VIEWS = [
    ("01-sidebar-nav",          "sidebar",            "Sidebar / primary navigation"),
    ("02-library-main",         "main",               "Library main view (toolbar, grid, list, folders)"),
    ("03-prompt-viewer",        "promptViewer",       "Prompt viewer overlay"),
    ("04-settings-config",      "configPanel",        "Settings / config panel"),
    ("05-command-palette",      "cmdPalette",         "Command palette"),
    ("06-workspaces-launcher",  "workspacesLauncher", "Workspaces launcher grid"),
    ("07-agents-roles",         "rolesWorkspace",     "Agents / Roles workspace"),
    ("08-playground",           "playgroundWorkspace","Prompt Playground"),
    ("09-forge",                "forgeWorkspace",     "Prompt Forge"),
    ("10-lab",                  "labWorkspace",       "Prompt Lab"),
    ("11-chain",                "chainWorkspace",     "Prompt Chain"),
    ("12-meta",                 "metaWorkspace",      "Metaprompting"),
    ("13-optimizer",            "optimizerWorkspace", "Prompt Optimizer"),
    ("14-context-bank",         "contextBankWorkspace","Context Bank"),
    ("15-quick-fill",           "fillWorkspace",      "Quick Fill"),
    ("16-auditor",              "auditWorkspace",     "Prompt Auditor"),
    ("17-diff-lens",            "diffWorkspace",      "Diff Lens"),
    ("18-cost-lens",            "costWorkspace",      "Cost Lens"),
    ("19-library-pulse",        "pulseWorkspace",     "Library Pulse"),
    ("20-xray",                 "xrayWorkspace",      "Prompt X-Ray"),
    ("21-splicer",              "spliceWorkspace",    "Prompt Splicer"),
    ("22-components",           "componentsWorkspace","Prompt Components"),
    ("23-generator",            "genWorkspace",       "Prompt Generator"),
    ("24-dashboard",            "dashboardWorkspace", "Dashboard"),
    ("25-batch-runner",         "batchWorkspace",     "Batch Runner"),
    ("26-board",                "boardWorkspace",     "Prompt Board"),
    ("27-onboarding-tour",      "onboardingOverlay",  "Onboarding tour overlay"),
    ("28-tutorial-coachmarks",  "tutorialCard",       "Tutorial coachmark card"),
    ("29-toasts",               "toastContainer",     "Toast notifications"),
]

VOID = set("area base br col embed hr img input link meta param source track wbr".split())
TAG_RE = re.compile(r"<(/?)([a-zA-Z][\w-]*)([^>]*?)(/?)>", re.S)

def slice_element(src, el_id):
    """Return the full outer HTML of the element carrying id=el_id."""
    m = re.search(r'<([a-zA-Z][\w-]*)((?:[^>]*?\s)?id="%s")' % re.escape(el_id), src)
    if not m:
        raise SystemExit("id not found: " + el_id)
    start = m.start()
    depth = 0
    for t in TAG_RE.finditer(src, start):
        closing, name, attrs, selfclose = t.group(1), t.group(2).lower(), t.group(3), t.group(4)
        if name in VOID or selfclose == "/":
            continue
        if closing:
            depth -= 1
            if depth == 0:
                return src[start:t.end()]
        else:
            depth += 1
    raise SystemExit("unterminated element: " + el_id)

def dedent_block(block):
    lines = block.split("\n")
    pads = [len(l) - len(l.lstrip()) for l in lines[1:] if l.strip()]
    pad = min(pads) if pads else 0
    out = [lines[0]] + [(l[pad:] if len(l) >= pad else l.lstrip()) for l in lines[1:]]
    return "\n".join(out)

ID_RE    = re.compile(r'\bid="([^"]+)"')
CLASS_RE = re.compile(r'\bclass="([^"]+)"')

blocks = {}
for folder, el_id, title in VIEWS:
    b = dedent_block(slice_element(html, el_id))
    ids = set(ID_RE.findall(b))
    classes = set()
    for c in CLASS_RE.findall(b):
        for tok in c.split():
            if tok and not tok.startswith("{"):
                classes.add(tok)
    blocks[folder] = dict(id=el_id, title=title, html=b, ids=ids, classes=classes)

# class ownership: how many views use each class
class_count = collections.Counter()
for v in blocks.values():
    for c in v["classes"]:
        class_count[c] += 1
id_owner = {}
for f, v in blocks.items():
    for i in v["ids"]:
        id_owner.setdefault(i, []).append(f)

# ------------------------------------------------------------------ CSS split
def split_css(text):
    """Yield (kind, header, body_or_text) top-level chunks."""
    out, i, n = [], 0, len(text)
    buf = []
    while i < n:
        ch = text[i]
        if ch == "/" and text[i:i+2] == "/*":
            j = text.find("*/", i + 2)
            j = n if j == -1 else j + 2
            buf.append(text[i:j]); i = j; continue
        if ch == "@":
            j = i
            while j < n and text[j] not in "{;":
                j += 1
            if j < n and text[j] == ";":
                out.append(("raw", None, text[i:j+1])); i = j + 1; continue
            header = text[i:j].strip()
            depth, k = 1, j + 1
            while k < n and depth:
                if text[k] == "{": depth += 1
                elif text[k] == "}": depth -= 1
                k += 1
            out.append(("at", header, text[j+1:k-1])); i = k; continue
        if ch == "{":
            sel = "".join(buf).strip(); buf = []
            depth, k = 1, i + 1
            while k < n and depth:
                if text[k] == "{": depth += 1
                elif text[k] == "}": depth -= 1
                k += 1
            out.append(("rule", sel, text[i+1:k-1])); i = k; continue
        buf.append(ch); i += 1
    tail = "".join(buf).strip()
    if tail:
        out.append(("raw", None, tail))
    return out

SEL_ID  = re.compile(r"#([\w-]+)")
SEL_CLS = re.compile(r"\.([\w-]+)")

def owners_for_selector(sel):
    """Which view folders this selector belongs to (may be empty = shared)."""
    owners = set()
    for i in SEL_ID.findall(sel):
        for f in id_owner.get(i, []):
            owners.add(f)
    if not owners:
        for c in SEL_CLS.findall(sel):
            if class_count.get(c, 0) and class_count[c] <= 2:
                for f, v in blocks.items():
                    if c in v["classes"]:
                        owners.add(f)
    return owners

chunks = split_css(css)
view_css = collections.defaultdict(list)
shared_css = []

def emit_rule(sel, body):
    return "%s {%s}\n" % (sel.strip(), body)

for kind, header, body in chunks:
    if kind == "rule":
        owners = owners_for_selector(header)
        text = emit_rule(header, body)
        if owners:
            for f in owners:
                view_css[f].append(text)
        else:
            shared_css.append(text)
    elif kind == "at":
        inner = split_css(body)
        per = collections.defaultdict(list)
        rest = []
        for k2, h2, b2 in inner:
            if k2 == "rule":
                owners = owners_for_selector(h2)
                t = emit_rule(h2, b2)
                if owners:
                    for f in owners:
                        per[f].append(t)
                else:
                    rest.append(t)
            else:
                rest.append(b2 if k2 == "raw" else "%s {%s}\n" % (h2, b2))
        for f, rules in per.items():
            view_css[f].append("%s {\n%s}\n" % (header, "".join(rules)))
        if rest:
            shared_css.append("%s {\n%s}\n" % (header, "".join(rest)))
    else:
        shared_css.append(body + "\n")

# ------------------------------------------------------------------- JS split
FUNC_RE = re.compile(
    r"^[ \t]*(?:"
    r"(?:async\s+)?function\s+(?P<n1>[A-Za-z_$][\w$]*)\s*\("
    r"|(?:const|let|var)\s+(?P<n2>[A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\s*\(|\([^\n)]*\)\s*=>)"
    r"|window\.(?P<n3>[A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\s*\(|\([^\n)]*\)\s*=>)"
    r")", re.M)

def js_functions(text):
    raw = []
    for m in FUNC_RE.finditer(text):
        name = m.group("n1") or m.group("n2") or m.group("n3")
        # walk past the parameter list (may contain default values with braces)
        po = text.find("(", m.start())
        if po == -1:
            continue
        pd, pj = 1, po + 1
        while pj < len(text) and pd:
            if text[pj] == "(": pd += 1
            elif text[pj] == ")": pd -= 1
            pj += 1
        # find opening brace of the function body; bail on expression-bodied arrows
        b = text.find("{", pj)
        if b == -1:
            continue
        gap = text[pj:b]
        if ";" in gap or "\n\n" in gap or len(gap) > 200 or gap.count("\n") > 3:
            continue
        depth, k, n = 1, b + 1, len(text)
        stack = []   # nested template-literal / ${} contexts
        while k < n and depth:
            c = text[k]
            if stack and stack[-1][0] == "tpl":
                if c == "\\":
                    k += 2; continue
                if c == "`":
                    stack.pop(); k += 1; continue
                if text[k:k+2] == "${":
                    stack.append(["expr", 0]); k += 2; continue
                k += 1; continue
            if c in "\"'":
                q, j = c, k + 1
                while j < n:
                    if text[j] == "\\":
                        j += 2; continue
                    if text[j] == q or text[j] == "\n":
                        break
                    j += 1
                k = j + 1; continue
            if c == "`":
                stack.append(["tpl", 0]); k += 1; continue
            if stack and stack[-1][0] == "expr":
                if c == "{":
                    stack[-1][1] += 1; k += 1; continue
                if c == "}":
                    if stack[-1][1] == 0:
                        stack.pop()
                    else:
                        stack[-1][1] -= 1
                    k += 1; continue
            if c == "/" and text[k:k+2] == "//":
                k = text.find("\n", k); k = n if k == -1 else k; continue
            elif c == "/" and text[k:k+2] == "/*":
                j = text.find("*/", k + 2); k = n if j == -1 else j + 2; continue
            elif c == "/":
                # regex literal? look at the previous significant character
                p = k - 1
                while p >= 0 and text[p] in " \t\n":
                    p -= 1
                prev = text[p] if p >= 0 else "("
                if prev in "(,=:[!&|?{};+-~*%<>^" or text[max(0, p-5):p+1].endswith("return"):
                    j, cls = k + 1, False
                    while j < n:
                        cj = text[j]
                        if cj == "\\":
                            j += 2; continue
                        if cj == "[":
                            cls = True
                        elif cj == "]":
                            cls = False
                        elif cj == "/" and not cls:
                            break
                        elif cj == "\n":
                            break
                        j += 1
                    k = j + 1; continue
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
            k += 1
        # swallow a trailing `)` / `;` from `const x = (...) => ({...});`
        t = re.match(r"\s*\)?\s*;?", text[k:])
        if t:
            k += t.end()
        # include a preceding comment block if directly above
        s = m.start()
        pre = text.rfind("\n", 0, s - 1)
        head = text[text.rfind("\n", 0, pre) + 1:s] if pre != -1 else ""
        if head.strip().startswith("//") or head.strip().startswith("/*"):
            s = text.rfind("\n", 0, pre) + 1
        decl_line = text[text.rfind("\n", 0, m.start()) + 1:m.end()]
        indent = len(decl_line) - len(decl_line.lstrip())
        raw.append([name, s, k, indent])
    # drop nested declarations (spans fully inside another span)
    raw.sort(key=lambda r: (r[1], -r[2]))
    fns, cur_end, seen = [], -1, set()
    for name, s, e, indent in raw:
        if s < cur_end:
            continue
        cur_end = e
        body = text[s:e]
        # skip deeply nested one-off helpers pulled out of an uncaptured parent
        if indent > 8:
            continue
        if name in seen:
            continue
        seen.add(name)
        fns.append((name, body))
    return fns

fns = js_functions(js)
view_js = collections.defaultdict(list)
shared_js = []

# name prefixes that mark a function as belonging to a view
prefix_map = {}
for f, v in blocks.items():
    base = v["id"].replace("Workspace", "").lower()
    prefix_map[f] = set([base])
EXTRA_PREFIXES = {
    "22-components": ["pcw", "components"],
    "08-playground": ["playground", "pg"],
    "07-agents-roles": ["role", "agent"],
    "02-library-main": ["prompt", "folder", "library", "grid", "card"],
    "23-generator": ["gen", "generator"],
    "26-board": ["board"],
    "24-dashboard": ["dash", "dashboard"],
    "25-batch-runner": ["batch"],
    "13-optimizer": ["optimizer", "optimise", "optimize"],
    "14-context-bank": ["contextbank", "ctxbank"],
    "11-chain": ["chain"],
    "12-meta": ["meta"],
    "10-lab": ["lab"],
    "09-forge": ["forge"],
    "20-xray": ["xray"],
    "21-splicer": ["splice"],
    "17-diff-lens": ["diff"],
    "18-cost-lens": ["cost"],
    "19-library-pulse": ["pulse"],
    "16-auditor": ["audit"],
    "15-quick-fill": ["fill", "quickfill"],
    "05-command-palette": ["cmd", "palette"],
    "27-onboarding-tour": ["onboarding"],
    "28-tutorial-coachmarks": ["tutorial"],
    "04-settings-config": ["config", "settings"],
    "06-workspaces-launcher": ["launcher", "workspaces"],
    "03-prompt-viewer": ["viewer"],
    "01-sidebar-nav": ["sidebar", "nav"],
    "29-toasts": ["toast"],
}
for f, extra in EXTRA_PREFIXES.items():
    prefix_map[f].update(extra)

VERBS = ("open", "close", "init", "render", "update", "wire", "refresh", "reset",
         "_", "_render", "_init", "show", "hide", "load", "save", "build")

def name_matches(lname, prefixes):
    for p in prefixes:
        if len(p) < 3:
            continue
        if lname.startswith(p) or lname.lstrip("_").startswith(p):
            return True
        for v in VERBS:
            if lname.startswith(v + p) or lname.lstrip("_").startswith(v + p):
                return True
    return False

for name, body in fns:
    lname = name.lower()
    scores = {}
    for f, v in blocks.items():
        s = 0
        for i in v["ids"]:
            if len(i) > 3 and len(id_owner.get(i, [])) == 1 and \
               re.search(r"['\"#`]%s\b" % re.escape(i), body):
                s += 1
        if name_matches(lname, prefix_map[f]):
            s += 4
        if s:
            scores[f] = s
    if not scores:
        shared_js.append((name, body))
        continue
    top = max(scores.values())
    owners = [f for f, s in scores.items() if s >= max(3, top * 0.6)]
    if not owners or len(owners) > 3:
        owners = [f for f, s in scores.items() if s == top][:2]
    if not owners:
        shared_js.append((name, body))
    else:
        for f in owners:
            view_js[f].append((name, body))

# --------------------------------------------------------------------- writer
def w(path, text):
    d = os.path.dirname(path)
    if not os.path.isdir(d):
        os.makedirs(d)
    io.open(path, "w", encoding="utf-8", newline="\n").write(text)

PREVIEW = u"""<!doctype html>
<html lang="en-GB" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(title)s — reference</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&family=JetBrains+Mono:wght@100..800&family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
<link rel="stylesheet" href="../_shared/shared.css">
<link rel="stylesheet" href="styles.css">
</head>
<body>
%(markup)s

<!-- Preview shim: workspaces are hidden until .open is set by the app. Force it visible. -->
<script>
(function () {
  var root = document.body.firstElementChild;
  if (!root) return;
  root.classList.add('open', 'active', 'visible');
  root.removeAttribute('hidden');
  root.removeAttribute('aria-hidden');
  root.style.display = '';
  root.style.opacity = '1';
  root.style.visibility = 'visible';
  root.style.transform = 'none';
  root.style.pointerEvents = 'auto';
})();
</script>

<!-- Extracted logic. Expect console errors here: these functions were cut out of the
     app.js IIFE and still expect state, api() and the rest of the app around them.
     Preview is for layout and styling, not for running the feature. -->
<script src="../_shared/shared.js"></script>
<script src="script.js"></script>
</body>
</html>
"""

README = u"""# %(title)s

Reference extract of one interface area of Prompt Library Pro. Read-only copy —
the live app still runs from `static/index.html`, `static/app.css`, `static/app.js`.

## Files

| File | What it is |
|---|---|
| `markup.html` | The exact HTML block for this view, dedented. Root element: `#%(elid)s` |
| `styles.css` | CSS rules from `static/app.css` whose selectors target this view's ids / view-specific classes (%(ncss)d rules) |
| `script.js` | Top-level functions from `static/app.js` that reference this view's ids or carry its name prefix (%(njs)d functions) |
| `preview.html` | Standalone page that loads `_shared` + the three files above, for isolated visual work |

## Source locations

- HTML: `static/index.html`, element `#%(elid)s`
- CSS: `static/app.css`
- JS: `static/app.js` (one IIFE — these functions are extracted out of it)

## Functions in `script.js`

%(fnlist)s

## Editing workflow

1. Change here first, open `preview.html` to eyeball it.
2. Port the change back into the real files by hand (`static/index.html` / `app.css` / `app.js`).
3. `node --check static/app.js`, then `python3 update_hash.py` after any `app.js` edit.

Anything global (tokens, buttons, layout primitives, `state`, `api`, helpers) lives in
`../_shared/` — it is shared by every view, so change it with care.
"""

index_rows = []
for folder, el_id, title in VIEWS:
    v = blocks[folder]
    d = os.path.join(OUT, folder)
    rules = view_css.get(folder, [])
    funcs = view_js.get(folder, [])
    w(os.path.join(d, "markup.html"), v["html"] + "\n")
    w(os.path.join(d, "styles.css"),
      u"/* %s — CSS extracted from static/app.css */\n\n" % title + "\n".join(rules))
    w(os.path.join(d, "script.js"),
      u"/* %s — functions extracted from static/app.js\n"
      u"   These run inside the app.js IIFE and rely on shared helpers\n"
      u"   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */\n\n"
      % title + "\n\n".join(b for _, b in funcs) + "\n")
    w(os.path.join(d, "preview.html"), PREVIEW % dict(title=title, markup=v["html"]))
    fnlist = "\n".join("- `%s()`" % n for n, _ in funcs) or "_none matched — logic lives in shared code_"
    w(os.path.join(d, "README.md"), README % dict(
        title=title, elid=el_id, ncss=len(rules), njs=len(funcs), fnlist=fnlist))
    index_rows.append((folder, title, el_id, len(rules), len(funcs),
                       v["html"].count("\n") + 1))

w(os.path.join(OUT, "_shared", "shared.css"),
  u"/* Global CSS: tokens, resets, layout primitives, shared components.\n"
  u"   Selectors here were not specific to any single view. */\n\n" + "".join(shared_css))
w(os.path.join(OUT, "_shared", "shared.js"),
  u"/* Global JS: helpers and functions used by 5+ views (or none specifically).\n"
  u"   Extracted from static/app.js. */\n\n" + "\n\n".join(b for _, b in shared_js) + "\n")
w(os.path.join(OUT, "_shared", "README.md"),
  u"# Shared layer\n\n`shared.css` — design tokens, resets, buttons, layout primitives, "
  u"any rule not tied to a single view.\n\n`shared.js` — `state`, `api()`, `$`, `$$`, `toast()`, "
  u"`escapeHtml()`, loaders, and any function touched by 5+ views (%d functions).\n\n"
  u"Change anything here and every view is affected. Check the view folders before editing.\n"
  % len(shared_js))

rows = "\n".join("| [%s](%s/) | %s | `#%s` | %d | %d | %d |" %
                 (f, f, t, e, c, j, h) for f, t, e, c, j, h in index_rows)
w(os.path.join(OUT, "README.md"), u"""# Prompt Library Interface Files

One folder per user-facing interface area of Prompt Library Pro. Each folder holds the
HTML, CSS and JS for that area only, pulled out of the three monolith files so a single
screen can be worked on in isolation.

**These are reference copies, not the live app.** The app still loads
`static/index.html`, `static/app.css`, `static/app.js`. Port changes back by hand.

## Layout of each folder

```
<view>/
  markup.html    HTML block, dedented, root element noted in the README
  styles.css     CSS rules targeting this view
  script.js      app.js functions belonging to this view
  preview.html   standalone page: shared.css + styles.css + markup + script
  README.md      source locations, function list, edit workflow
```

`_shared/` holds the global CSS (tokens, resets, primitives) and the global JS
(state, api, helpers) that every view depends on.

## Views

| Folder | Area | Root element | CSS rules | JS fns | HTML lines |
|---|---|---|---|---|---|
%s

## Rules when porting back

1. Never use Edit/Write on `static/app.js` or `static/index.html` — use bash + Python
   `content.replace()`, then verify (project CLAUDE.md hard rule 1).
2. `node --check static/app.js` and `python3 -m py_compile app.py` after edits.
3. `python3 update_hash.py` after every `app.js` change, or the browser serves a stale copy.
4. New workspace order: `openXxxWorkspace()` -> nav route -> `_escapeToLibrary()` -> `initXxxWorkspace()` -> HTML.
""" % rows)

print("views:", len(VIEWS))
print("shared css chunks:", len(shared_css), "shared js fns:", len(shared_js))
for f, t, e, c, j, h in index_rows:
    print("%-26s css=%-4d js=%-3d html=%d" % (f, c, j, h))
