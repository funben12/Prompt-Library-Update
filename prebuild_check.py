# Pre-build validation — called by Build.bat before PyInstaller runs.
# Catches broken files before they get baked into the exe.
import sys

errors = []

# --- index.html ---
try:
    html = open('static/index.html', 'r', encoding='utf-8').read()
    if 'app.js?v=' not in html:
        errors.append('static/index.html is missing the app.js script tag (file may be truncated).')
    if '</html>' not in html:
        errors.append('static/index.html is missing </html> (file is truncated).')
    nuls = open('static/index.html', 'rb').read().count(b'\x00')
    if nuls:
        errors.append(f'static/index.html contains {nuls} NUL bytes.')
    if not errors:
        print('  index.html OK')
except FileNotFoundError:
    errors.append('static/index.html not found.')

# --- app.js ---
try:
    nuls = open('static/app.js', 'rb').read().count(b'\x00')
    if nuls:
        errors.append(f'static/app.js contains {nuls} NUL bytes.')
    else:
        print('  app.js OK')
except FileNotFoundError:
    errors.append('static/app.js not found.')

# --- app.py ---
try:
    import py_compile
    py_compile.compile('app.py', doraise=True)
    print('  app.py OK')
except py_compile.PyCompileError as e:
    errors.append(f'app.py has a syntax error: {e}')
except FileNotFoundError:
    errors.append('app.py not found.')

# --- Report ---
if errors:
    print()
    print('PRE-BUILD CHECKS FAILED:')
    for e in errors:
        print(f'  ERROR: {e}')
    sys.exit(1)

print()
print('All pre-build checks passed.')
