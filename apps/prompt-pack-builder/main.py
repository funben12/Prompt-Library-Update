"""
Prompt Pack Builder - standalone desktop app.

Opens the Prompt Pack Builder workspace from Prompt Library Pro in its own pywebview window.
Packs are saved to Documents/PromptPackBuilder/packs.json. The Prompt Library database is
only ever opened read only, for the Add from library picker.
"""

import base64
import json
import logging
import os
import sqlite3
import sys
import time
import traceback

import webview

APP_TITLE = 'Prompt Pack Builder'
MAX_STORE_BYTES = 20 * 1024 * 1024


def _base_dir():
    # PyInstaller unpacks bundled files to _MEIPASS; in dev the web folder sits next to this file.
    if hasattr(sys, '_MEIPASS'):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))


def get_data_dir():
    path = os.environ.get('PPB_DATA_DIR') or os.path.join(os.path.expanduser('~'), 'Documents', 'PromptPackBuilder')
    os.makedirs(path, exist_ok=True)
    return path


def get_library_db():
    # Same location Prompt Library Pro uses (app.py get_data_dir). PPB_LIBRARY_DB overrides it for testing.
    return os.environ.get('PPB_LIBRARY_DB') or os.path.join(
        os.path.expanduser('~'), 'Documents', 'PromptLibrary', 'PromptLibrary.db')


WEB_DIR = os.path.join(_base_dir(), 'web')
DATA_DIR = get_data_dir()
STORE_FILE = os.path.join(DATA_DIR, 'packs.json')

logging.basicConfig(filename=os.path.join(DATA_DIR, 'error.log'), level=logging.WARNING,
                    format='%(asctime)s %(levelname)s %(message)s')


def _normalise_list(value):
    # Library tags arrive as a JSON list string or a comma separated string.
    if not value:
        return []
    items = None
    raw = str(value).strip()
    if raw.startswith('['):
        try:
            parsed = json.loads(raw)
            items = parsed if isinstance(parsed, list) else None
        except (TypeError, ValueError):
            items = None
    if items is None:
        items = raw.split(',')
    return [str(x).strip() for x in items if str(x).strip()]


class Api:
    """Bridge exposed to the page as window.pywebview.api.*"""

    def load_store(self):
        """Return the saved packs as raw JSON text. A damaged file is set aside, never overwritten."""
        if not os.path.isfile(STORE_FILE):
            return {'ok': True, 'text': None, 'path': STORE_FILE}
        try:
            with open(STORE_FILE, 'r', encoding='utf-8') as fh:
                text = fh.read()
            json.loads(text)
            return {'ok': True, 'text': text, 'path': STORE_FILE}
        except (OSError, ValueError):
            logging.error(traceback.format_exc())
            kept = os.path.join(DATA_DIR, 'packs.damaged-%s.json' % time.strftime('%Y%m%d-%H%M%S'))
            try:
                os.replace(STORE_FILE, kept)
            except OSError:
                kept = None
            return {'ok': True, 'text': None, 'path': STORE_FILE, 'warning': 'Your packs file could not be read', 'kept': kept}

    def save_store(self, text):
        """Write the packs atomically, keeping the previous version as packs.json.bak."""
        try:
            text = str(text or '')
            if len(text.encode('utf-8')) > MAX_STORE_BYTES:
                return {'saved': False, 'error': 'Packs are larger than 20 MB'}
            data = json.loads(text)
            if not isinstance(data, dict) or not isinstance(data.get('packs'), list):
                return {'saved': False, 'error': 'Unexpected packs format'}
            tmp = STORE_FILE + '.tmp'
            with open(tmp, 'w', encoding='utf-8') as fh:
                fh.write(text)
                fh.flush()
                os.fsync(fh.fileno())
            if os.path.isfile(STORE_FILE):
                try:
                    os.replace(STORE_FILE, STORE_FILE + '.bak')
                except OSError:
                    pass
            os.replace(tmp, STORE_FILE)
            return {'saved': True}
        except Exception as e:
            logging.error(traceback.format_exc())
            return {'saved': False, 'error': str(e)}

    def library_status(self):
        path = get_library_db()
        return {'available': os.path.isfile(path), 'path': path}

    def list_library(self):
        """Read prompts from the Prompt Library database without changing it."""
        path = get_library_db()
        if not os.path.isfile(path):
            return {'ok': False, 'error': 'Prompt Library database not found'}
        conn = None
        try:
            uri = 'file:' + path.replace('\\', '/') + '?mode=ro'
            conn = sqlite3.connect(uri, uri=True, timeout=5)
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                'SELECT id, title, description, content, tags FROM prompts ORDER BY updated_at DESC').fetchall()
            prompts = [{
                'id': r['id'],
                'title': r['title'] or '',
                'description': r['description'] or '',
                'content': r['content'] or '',
                'tags': _normalise_list(r['tags']),
            } for r in rows]
            return {'ok': True, 'prompts': prompts}
        except Exception as e:
            logging.error(traceback.format_exc())
            return {'ok': False, 'error': str(e)}
        finally:
            if conn is not None:
                conn.close()

    def save_file(self, filename, content, is_base64=False):
        """Native Save As dialog, then write the file. Returns {saved, path} or {saved, error}."""
        try:
            name = os.path.basename(str(filename or 'export.txt')) or 'export.txt'
            downloads = os.path.join(os.path.expanduser('~'), 'Downloads')
            picked = webview.windows[0].create_file_dialog(
                webview.SAVE_DIALOG,
                directory=downloads if os.path.isdir(downloads) else '',
                save_filename=name,
            )
            if not picked:
                return {'saved': False}
            path = picked if isinstance(picked, str) else picked[0]
            data = base64.b64decode(content) if is_base64 else str(content or '').encode('utf-8')
            with open(path, 'wb') as fh:
                fh.write(data)
            return {'saved': True, 'path': path}
        except Exception as e:
            logging.error(traceback.format_exc())
            return {'saved': False, 'error': str(e)}


def main():
    index = os.path.join(WEB_DIR, 'index.html')
    if not os.path.isfile(index):
        logging.error('Missing %s', index)
        webview.create_window(APP_TITLE + ' - Error', html='<h2 style="font-family:sans-serif;padding:40px">'
                              'The app files are missing. Reinstall Prompt Pack Builder.</h2>', width=600, height=240)
        webview.start()
        sys.exit(1)
    webview.settings['ALLOW_DOWNLOADS'] = True
    webview.create_window(APP_TITLE, index, js_api=Api(), width=1320, height=880,
                          min_size=(480, 600), resizable=True, background_color='#ECE7E1')
    webview.start(http_server=True, debug=os.environ.get('PPB_DEBUG') == '1')


if __name__ == '__main__':
    main()
