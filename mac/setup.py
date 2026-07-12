"""
py2app build config for Prompt Library Pro (macOS).

Run on macOS only, from the repo root: python3 mac/setup.py py2app
Produces dist/Prompt Library Pro.app
"""
from setuptools import setup

APP = ['Main.py']

DATA_FILES = [
    ('static', [
        'static/app.css',
        'static/app.js',
        'static/components-data.js',
        'static/index.html',
    ]),
]

OPTIONS = {
    'argv_emulation': False,
    'iconfile': 'mac/app-icon.icns',
    'packages': ['flask', 'flask_cors', 'webview', 'waitress'],
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
