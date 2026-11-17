# Export guard: the desktop window must be able to save files.
# Root cause of the 2026-11-17 "exports do nothing" bug: pywebview 5.x cancels every download unless
# webview.settings['ALLOW_DOWNLOADS'] is True, and the app showed its success toast anyway.
#   python -m unittest discover tests/exports
# Needs flask, flask-cors and waitress (the app's own requirements). pywebview is stubbed, no window opens.
import base64
import io
import os
import re
import sys
import tempfile
import types
import unittest
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


class FakeWindow:
    def __init__(self):
        self.ret = None
        self.calls = []

    def create_file_dialog(self, kind, directory='', save_filename='', **kw):
        self.calls.append((kind, directory, save_filename))
        return self.ret


def load_main():
    home = tempfile.mkdtemp(prefix='plexport-')
    os.environ.update(HOME=home, USERPROFILE=home, APPDATA=home)
    wv = types.ModuleType('webview')
    wv.SAVE_DIALOG, wv.FOLDER_DIALOG, wv.settings = 30, 20, {'ALLOW_DOWNLOADS': False}
    win = FakeWindow()
    wv.windows = [win]
    wv.create_window = lambda *a, **k: None
    wv.start = lambda *a, **k: None
    sys.modules['webview'] = wv
    sys.path.insert(0, ROOT)
    os.chdir(ROOT)
    import Main
    return Main, win


class SaveBridge(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.Main, cls.win = load_main()
        cls.api = cls.Main.Api()
        cls.out = tempfile.mkdtemp(prefix='plexport-out-')

    def test_downloads_stay_enabled(self):
        src = open(os.path.join(ROOT, 'Main.py'), encoding='utf-8').read()
        self.assertTrue(re.search(r"webview\.settings\['ALLOW_DOWNLOADS'\]\s*=\s*True", src))

    def test_text_save(self):
        self.win.ret = os.path.join(self.out, 'a.md')
        r = self.api.save_file('a.md', '# Hi\nline é', False)
        self.assertEqual(r, {'saved': True, 'path': self.win.ret})
        self.assertEqual(open(self.win.ret, 'rb').read().decode('utf-8'), '# Hi\nline é')
        self.assertEqual(self.win.calls[-1][0], 30)

    def test_zip_save_is_byte_exact(self):
        buf = io.BytesIO()
        z = zipfile.ZipFile(buf, 'w')
        z.writestr('x.txt', 'hello')
        z.close()
        self.win.ret = os.path.join(self.out, 'b.zip')
        r = self.api.save_file('b.zip', base64.b64encode(buf.getvalue()).decode(), True)
        self.assertTrue(r['saved'])
        self.assertIsNone(zipfile.ZipFile(self.win.ret).testzip())

    def test_cancel_is_not_an_error(self):
        self.win.ret = None
        self.assertEqual(self.api.save_file('d.txt', 'x', False), {'saved': False})

    def test_failures_are_reported(self):
        self.win.ret = os.path.join(self.out, 'missing-folder', 'f.txt')
        r = self.api.save_file('f.txt', 'x', False)
        self.assertFalse(r['saved'])
        self.assertIn('error', r)


if __name__ == '__main__':
    unittest.main()
