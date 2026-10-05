"""
py2app build config for Prompt Library Pro (macOS).

Run on macOS only, from the repo root: python3 mac/setup.py py2app
Produces dist/Prompt Library Pro.app
"""
from setuptools import setup

APP = ['Main.py']

def _static_files():
    # Bundle every static asset except the retired v1 copies; fonts live in a subfolder.
    import glob, os
    out = {}
    for f in glob.glob('static/**/*', recursive=True):
        if os.path.isfile(f) and ' - v1' not in f:
            out.setdefault(os.path.dirname(f), []).append(f)
    return sorted(out.items())


DATA_FILES = _static_files()

OPTIONS = {
    'argv_emulation': False,
    'iconfile': 'mac/app-icon.icns',
    'packages': ['flask', 'webview', 'waitress', 'objc', 'AppKit', 'Foundation', 'WebKit'],
    'includes': ['webview.platforms.cocoa'],
    'plist': {
        'CFBundleName': 'Prompt Library Pro',
        'CFBundleDisplayName': 'Prompt Library Pro',
        'CFBundleIdentifier': 'com.eugenephillips.promptlibrarypro',
        'CFBundleVersion': '1.0.0',
        'CFBundleShortVersionString': '1.0.0',
        'NSHighResolutionCapable': True,
        'CFBundleDocumentTypes': [
            {
                'CFBundleTypeName': 'Prompt Library Pack',
                'CFBundleTypeExtensions': ['plp'],
                'CFBundleTypeRole': 'Editor',
                'LSHandlerRank': 'Owner',
            }
        ],
    },
}

setup(
    app=APP,
    name='Prompt Library Pro',
    data_files=DATA_FILES,
    options={'py2app': OPTIONS},
    setup_requires=['py2app'],
)
