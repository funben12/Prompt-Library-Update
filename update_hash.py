import hashlib
import re

# Hash app.js
with open('static/app.js', 'rb') as f:
    js_hash = hashlib.md5(f.read()).hexdigest()[:8]

# Hash app.css
with open('static/app.css', 'rb') as f:
    css_hash = hashlib.md5(f.read()).hexdigest()[:8]

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Update app.js version param
html = re.sub(r'app\.js\?v=[a-f0-9]+', 'app.js?v=' + js_hash, html)

# Update app.css version param
html = re.sub(r'app\.css\?v=[a-f0-9]+', 'app.css?v=' + css_hash, html)

import os, tempfile
tmp = 'static/index.html.tmp'
with open(tmp, 'w', encoding='utf-8') as f:
    f.write(html)
os.replace(tmp, 'static/index.html')

print('  JS  hash: ' + js_hash)
print('  CSS hash: ' + css_hash)
