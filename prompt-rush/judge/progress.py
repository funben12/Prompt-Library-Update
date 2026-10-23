# Render the live progress page from rounds/log.json. Usage: python3 progress.py
import base64, html, io, json, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG = os.path.join(ROOT, 'rounds', 'log.json')
OUT = os.path.join(ROOT, 'progress.html')


def thumb(path, w=150):
    if not os.path.exists(path):
        return ''
    im = Image.open(path).convert('RGB')
    im.thumbnail((w * 2, w * 2))
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=62)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


def esc(s):
    return html.escape(str(s or ''))


log = json.load(open(LOG))
rounds = log.get('rounds', [])
latest = rounds[-1] if rounds else {}
status = log.get('status', 'running')

rows = []
for r in reversed(rounds):
    verdicts = ''.join(
        f'<li><span class="pill {"win" if v.get("win") else "loss"}">{"Ours" if v.get("win") else "Reference"}</span>'
        f'<b>{esc(v.get("orientation"))}</b> {esc(v.get("why"))}</li>'
        for v in r.get('verdicts', []))
    changes = ''.join(f'<li>{esc(c)}</li>' for c in r.get('changed', []))
    rows.append(f'''<article class="round">
  <header><span class="rn">Round {esc(r.get("n"))}</span><span class="when">{esc(r.get("when"))}</span></header>
  <div class="cols">
    <section><h3>What changed</h3><ul>{changes or "<li>Nothing yet</li>"}</ul></section>
    <section><h3>Critic verdicts</h3><ul class="verdicts">{verdicts or "<li>Pending</li>"}</ul></section>
  </div>
  <p class="gap"><b>Biggest gap:</b> {esc(r.get("gap"))}</p>
  <p class="next"><b>Next:</b> {esc(r.get("next"))}</p>
</article>''')

shots = ''
sdir = latest.get('shots')
if sdir:
    cells = []
    for o in ('portrait', 'landscape'):
        for s in ('start', 'round-4', 'final'):
            src = thumb(os.path.join(ROOT, sdir, f'{o}-{s}.png'), 150 if o == 'portrait' else 230)
            if src:
                cells.append(f'<figure class="{o}"><img src="{src}" alt="{o} {s}"><figcaption>{o} · {s}</figcaption></figure>')
    shots = '<section class="shots"><h2>Latest build</h2><div class="strip">' + ''.join(cells) + '</div></section>'

wins = sum(1 for v in latest.get('verdicts', []) if v.get('win'))
total = len(latest.get('verdicts', []))

page = f'''<title>Prompt Rush Progress</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* Layout: single column log, newest round first, status band on top */
:root {{
  --bg: #ece3d6; --surface: #f6efe3; --ink: #121a2b; --muted: #5d6170; --teal: #17706d; --loss: #a2493a; --line: #d9cdbb;
  --shadow: 6px 6px 14px #cfc3b2, -6px -6px 14px #fffaf0;
  --display: "Trebuchet MS", "Segoe UI", system-ui, sans-serif; --body: system-ui, "Segoe UI", sans-serif; --mono: ui-monospace, Menlo, Consolas, monospace;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg: #1b1d22; --surface: #23262d; --ink: #ece3d6; --muted: #a4a8b4; --teal: #4fb3ad; --loss: #e08a78; --line: #343842; --shadow: 0 0 0 1px #343842; color-scheme: dark }} }}
:root[data-theme="dark"] {{ --bg: #1b1d22; --surface: #23262d; --ink: #ece3d6; --muted: #a4a8b4; --teal: #4fb3ad; --loss: #e08a78; --line: #343842; --shadow: 0 0 0 1px #343842; color-scheme: dark }}
body {{ background: var(--bg); color: var(--ink); font: 15px/1.5 var(--body); }}
main {{ max-width: 860px; margin: 0 auto; padding-block: 28px 48px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 22px; }}
h1 {{ font: 700 28px/1.1 var(--display); margin: 0; letter-spacing: -.01em; text-wrap: balance; }}
h2 {{ font: 700 13px var(--body); text-transform: uppercase; letter-spacing: .12em; color: var(--muted); margin: 0 0 10px; }}
h3 {{ font: 700 12px var(--body); text-transform: uppercase; letter-spacing: .1em; color: var(--muted); margin: 0 0 6px; }}
.band {{ background: var(--surface); border-radius: 18px; box-shadow: var(--shadow); padding: 18px 20px; display: flex; flex-wrap: wrap; gap: 14px 28px; align-items: baseline; }}
.band .stat {{ display: grid; }}
.band .k {{ font-size: 12px; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); }}
.band .v {{ font: 700 22px var(--mono); font-variant-numeric: tabular-nums; }}
.band .v.ok {{ color: var(--teal); }}
.note {{ color: var(--muted); margin: 0; max-width: 65ch; }}
.strip {{ display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; }}
figure {{ margin: 0; flex: none; }}
figure img {{ display: block; border-radius: 10px; border: 1px solid var(--line); }}
figure.portrait img {{ width: 150px; }} figure.landscape img {{ width: 230px; }}
figcaption {{ font: 12px var(--mono); color: var(--muted); margin-top: 4px; }}
.round {{ border-top: 1px solid var(--line); padding-top: 16px; display: grid; gap: 10px; }}
.round header {{ display: flex; justify-content: space-between; gap: 12px; }}
.rn {{ font: 700 18px var(--display); }} .when {{ font: 13px var(--mono); color: var(--muted); }}
.cols {{ display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }}
.cols section {{ min-width: 0; }}
@media (max-width: 640px) {{ .cols {{ grid-template-columns: 1fr; }} }}
ul {{ margin: 0; padding-left: 18px; display: grid; gap: 4px; }}
.verdicts {{ list-style: none; padding: 0; }}
.pill {{ display: inline-block; font: 700 11px var(--body); text-transform: uppercase; letter-spacing: .08em; padding: 2px 8px; border-radius: 99px; margin-right: 8px; color: var(--bg); }}
.pill.win {{ background: var(--teal); }} .pill.loss {{ background: var(--loss); }}
.gap, .next {{ margin: 0; }}
</style>
<main>
  <h1>Prompt Rush progress</h1>
  <div class="band">
    <div class="stat"><span class="k">Status</span><span class="v {"ok" if status == "won" else ""}">{esc(status)}</span></div>
    <div class="stat"><span class="k">Round</span><span class="v">{esc(latest.get("n", 0))}</span></div>
    <div class="stat"><span class="k">Latest blind wins</span><span class="v">{wins}/{total}</span></div>
    <div class="stat"><span class="k">Updated</span><span class="v">{esc(log.get("updated"))}</span></div>
  </div>
  <p class="note">{esc(log.get("note"))}</p>
  {shots}
  <section><h2>Rounds</h2>{"".join(rows) or "<p class='note'>Round 1 is being built.</p>"}</section>
</main>
'''
open(OUT, 'w').write(page)
print(OUT, len(page))
