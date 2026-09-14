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

import os, tempfile, time
tmp = 'static/index.html.tmp'
with open(tmp, 'w', encoding='utf-8') as f:
    f.write(html)

# os.replace() (atomic rename-with-replace) gets blocked with PermissionError on this
# machine -- something in the write path (OneDrive sync engine most likely) locks out
# that specific syscall on this file. Delete-then-rename avoids it; verified safe.
for attempt in range(6):
    try:
        if os.path.exists('static/index.html'):
            os.remove('static/index.html')
        os.rename(tmp, 'static/index.html')
        break
    except PermissionError:
        if attempt == 5:
            raise
        time.sleep(0.5 * (attempt + 1))

print('  JS  hash: ' + js_hash)
print('  CSS hash: ' + css_hash)
