"""
Reusable Flask + SQLite backend boilerplate, extracted from app.py / Main.py.

Reference only — not imported by the live app. Copy a section into a real
file and rename the placeholder fields/table before use.
"""

# ============================================================================
# 1. Frozen vs dev path resolution
# Source: app.py:22-38
# Use when: a PyInstaller desktop app needs one data directory and one
# static-assets directory that resolve correctly whether running from
# source or from the frozen .exe.
# ============================================================================
import os
import sys


def get_data_dir():
    """
    Data lives in Documents/<AppName> — always.
    Both the frozen EXE and dev (start.bat) point here so they share the same DB.
    """
    path = os.path.join(os.path.expanduser('~'), 'Documents', 'AppName')
    os.makedirs(path, exist_ok=True)
    return path


def get_static_dir():
    """Locate the static folder whether running from source or a bundle."""
    if getattr(sys, 'frozen', False):
        return os.path.join(sys._MEIPASS, 'static')
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')


# ============================================================================
# 2. SQLite connection helper
# Source: app.py:239-243
# Use when: any Flask + sqlite3 project that wants dict-like row access and
# enforced foreign keys without an ORM.
# ============================================================================
import sqlite3

DATABASE = os.path.join(get_data_dir(), 'App.db')


def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


# ============================================================================
# 3. Generic CRUD route template
# Source: app.py (roles endpoints, ~1707-1768) — adapted to a generic
# resource name. Swap "items" / "item" / table name and field list for the
# resource you're adding.
# Use when: a new entity needs the standard list (with optional filters) /
# create / update / delete route set.
# ============================================================================
from flask import Flask, request, jsonify

app = Flask(__name__)


@app.route('/api/items', methods=['GET'])
def list_items():
    conn = get_db()
    favourites_only = request.args.get('favorites', '0')
    query, params = 'SELECT * FROM items WHERE 1=1', []
    if favourites_only == '1':
        query += ' AND is_favorite=1'
    query += ' ORDER BY updated_at DESC'
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([serialize_item(r) for r in rows])


@app.route('/api/items', methods=['POST'])
def create_item():
    payload = _item_payload(_json_body())
    conn = get_db()
    try:
        cur = conn.execute(
            'INSERT INTO items (name, data) VALUES (?, ?)',
            (payload['name'], payload['data']),
        )
        new_id = cur.lastrowid
        conn.commit()
    finally:
        conn.close()
    return jsonify({'id': new_id})


@app.route('/api/items/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    payload = _item_payload(_json_body())
    conn = get_db()
    try:
        conn.execute(
            'UPDATE items SET name=?, data=? WHERE id=?',
            (payload['name'], payload['data'], item_id),
        )
        conn.commit()
    finally:
        conn.close()
    return jsonify({'success': True})


@app.route('/api/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    conn = get_db()
    conn.execute('DELETE FROM items WHERE id=?', (item_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


def _item_payload(body):
    """Pull and default the fields this resource accepts from a request body."""
    return {
        'name': (body.get('name') or '').strip(),
        'data': body.get('data') or '',
    }


# ============================================================================
# 4. Request body parsing + list normalisation
# Source: app.py:482-536
# Use when: an endpoint accepts a field that might arrive as a real list, a
# comma-separated string, or a JSON-encoded string (common with form data /
# loosely-typed clients), and you want one clean Python list out the other
# end with duplicates and whitespace removed.
# ============================================================================
import json


def _json_body():
    return request.get_json(silent=True) or {}


def _normalise_list(value):
    """Clean a string list from DB text, a real list, or a JSON string."""
    if value is None:
        return []
    if isinstance(value, list):
        items = value
    elif isinstance(value, str):
        raw = value.strip()
        if raw.startswith('['):
            try:
                parsed = json.loads(raw)
                items = parsed if isinstance(parsed, list) else raw.split(',')
            except Exception:
                items = raw.split(',')
        else:
            items = raw.split(',')
    else:
        items = []

    cleaned, seen = [], set()
    for item in items:
        text = str(item).strip()
        key = text.lower()
        if text and key not in seen:
            cleaned.append(text)
            seen.add(key)
    return cleaned


def _json_value(value, default):
    """Coerce a DB/request value into a list or dict, falling back to default."""
    if value is None or value == '':
        return default
    if isinstance(value, (list, dict)):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(default, list) and isinstance(parsed, list):
                return parsed
            if isinstance(default, dict) and isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
    return default


# ============================================================================
# 5. Row-to-dict serialiser with JSON field parsing
# Source: app.py:1591-1623 (serialize_role)
# Use when: a SQLite row stores some columns as JSON text and the API needs
# plain dicts/lists back, with safe fallbacks if the stored JSON is malformed
# or missing.
# ============================================================================
def serialize_item(row):
    item = dict(row)
    item.setdefault('icon', '\U0001F3AF')
    item.setdefault('colour', '#6366f1')

    raw_tags = item.get('tags') or '[]'
    try:
        item['tags'] = json.loads(raw_tags) if isinstance(raw_tags, str) else raw_tags
    except Exception:
        item['tags'] = []
    return item


# ============================================================================
# 6. Dynamic WHERE-clause query builder
# Source: app.py:715-741 (get_prompts)
# Use when: a list endpoint needs several optional filters (search, foreign
# key, boolean flag, threshold) combined safely with parameterised SQL.
# ============================================================================
@app.route('/api/items/search', methods=['GET'])
def search_items():
    conn = get_db()
    search = request.args.get('search', '')
    folder_id = request.args.get('folder_id', '')
    favourites_only = request.args.get('favorites', '0')
    min_rating = request.args.get('min_rating', '')

    query, params = 'SELECT * FROM items WHERE 1=1', []

    if search:
        query += ' AND (title LIKE ? OR description LIKE ?)'
        params.extend([f'%{search}%'] * 2)
    if folder_id:
        query += ' AND folder_id=?'
        params.append(int(folder_id))
    if favourites_only == '1':
        query += ' AND is_favorite=1'
    if min_rating:
        query += ' AND rating>=?'
        params.append(int(min_rating))

    query += ' ORDER BY updated_at DESC'
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([serialize_item(r) for r in rows])


# ============================================================================
# 7. Licence key hashing (SHA-256, no plaintext at rest)
# Source: app.py:15-16, ~76-235
# Use when: a desktop app ships licence/API keys baked into the binary and
# you don't want the raw keys recoverable from the shipped artifact.
# ============================================================================
import hashlib


def _hash_key(key):
    return hashlib.sha256(key.strip().upper().encode()).hexdigest()


# Build the valid-hash set once at startup, then drop the plaintext source list.
_RAW_KEYS = []  # populate from wherever keys are sourced
VALID_KEY_HASHES = {_hash_key(k) for k in _RAW_KEYS}
del _RAW_KEYS


@app.route('/api/licence/validate', methods=['POST'])
def validate_licence():
    body = request.get_json(silent=True) or {}
    hashed = _hash_key(body.get('key') or '')
    if hashed in VALID_KEY_HASHES:
        return jsonify({'valid': True})
    return jsonify({'valid': False, 'message': 'Invalid licence key.'}), 400


# ============================================================================
# 8. ZIP "pack" export/import with manifest + conflict detection
# Source: app.py:1882-1919 (.plp import)
# Use when: the app needs a user-portable export/import bundle (zip with a
# manifest.json plus one or more data JSON files) and wants to flag
# name collisions against existing data before the caller commits the import.
# ============================================================================
import zipfile
import io


def parse_pack_bytes(raw_bytes):
    """Parse a .pack ZIP (manifest.json + items.json) and flag title conflicts."""
    try:
        buf = io.BytesIO(raw_bytes)
        with zipfile.ZipFile(buf, 'r') as zf:
            names = zf.namelist()
            if 'manifest.json' not in names:
                return jsonify({'error': 'Invalid pack: missing manifest'}), 400
            manifest = json.loads(zf.read('manifest.json'))
            items = json.loads(zf.read('items.json')) if 'items.json' in names else []
    except zipfile.BadZipFile:
        return jsonify({'error': 'File is not a valid pack'}), 400
    except (json.JSONDecodeError, KeyError) as e:
        return jsonify({'error': f'Malformed pack data: {e}'}), 400

    conn = get_db()
    existing_titles = {r[0].lower() for r in conn.execute('SELECT title FROM items').fetchall()}
    conn.close()
    for entry in items:
        entry['_conflict'] = (entry.get('title') or '').lower() in existing_titles

    return jsonify({'manifest': manifest, 'items': items})


# ============================================================================
# 9. Background Flask server + "wait until ready" socket poll
# Source: Main.py:41-97
# Use when: a PyWebView (or any native-window) desktop app embeds a Flask
# server in a background thread and must not open the window until the
# server is actually accepting connections — avoids a blank/error window
# on slower machines.
# ============================================================================
import socket
import threading
import time
import logging
import traceback

_server_crashed = threading.Event()


def _find_free_port(preferred=5000):
    """Return the preferred port if free, otherwise let the OS assign one."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('127.0.0.1', preferred))
            return preferred
        except OSError:
            pass
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def start_server(port):
    """Run Flask under a production WSGI server; log crashes instead of dying silently."""
    try:
        from waitress import serve
        serve(app, host='127.0.0.1', port=port, threads=8, _quiet=True)
    except Exception:
        logging.error(traceback.format_exc())
        _server_crashed.set()


def wait_for_server(host, port, timeout=30):
    """Block until the server accepts TCP connections, or raise after timeout."""
    start = time.time()
    while time.time() - start < timeout:
        if _server_crashed.is_set():
            raise RuntimeError('Server crashed — see error.log')
        try:
            with socket.create_connection((host, port), timeout=1):
                return True
        except OSError:
            time.sleep(0.1)
    raise RuntimeError(f'Server did not start within {timeout}s')


# Usage:
#   port = _find_free_port(5000)
#   threading.Thread(target=start_server, args=(port,), daemon=True).start()
#   wait_for_server('127.0.0.1', port)
#   # safe to open the WebView window now
