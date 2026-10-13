# Checks that the desktop editor is wired to variable-types-data.js and no longer hardcodes the type lists.
import os
import re
import sys

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
html = open(os.path.join(root, 'static', 'index.html'), encoding='utf8').read()
js = open(os.path.join(root, 'static', 'app.js'), encoding='utf8').read()
bad = []
tag = html.find('<script src="/static/variable-types-data.js"></script>')
app = html.find('app.js?v=')
if tag < 0:
    bad.append('index.html is missing the variable-types-data.js script tag')
elif app >= 0 and tag > app:
    bad.append('variable-types-data.js must load before app.js')
for name in ('_PL_KEPT_TYPES', '_PL_OPTION_TYPES', '_PL_RANDOM_TYPES'):
    if re.search(r'const ' + name + r' = \[', js):
        bad.append(name + ' is still a hardcoded list')
if '<option value="diceroll"' in js:
    bad.append('the type dropdown is still hardcoded')
if 'const typeIcon = {' in js:
    bad.append('typeIcon is still a hardcoded map')
if '_PL_typeSelectHtml' not in js:
    bad.append('_PL_typeSelectHtml is missing')
for b in bad:
    print('FAIL', b)
if not bad:
    print('ok: desktop editor reads variable-types-data.js')
sys.exit(1 if bad else 0)
