import hashlib
import json
import os
import re
import sqlite3

import pytest

import main

APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@pytest.fixture
def api(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'DATA_DIR', str(tmp_path))
    monkeypatch.setattr(main, 'STORE_FILE', str(tmp_path / 'packs.json'))
    return main.Api()


@pytest.fixture
def library(tmp_path, monkeypatch):
    path = tmp_path / 'PromptLibrary.db'
    conn = sqlite3.connect(path)
    conn.execute('CREATE TABLE prompts (id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT, '
                 'content TEXT NOT NULL, tags TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')
    conn.executemany('INSERT INTO prompts (title, description, content, tags) VALUES (?, ?, ?, ?)', [
        ('Cold email opener', 'Outreach', 'Write an opener for [[audience]].', '["sales", "email"]'),
        ('Meeting summary', None, 'Summarise [[notes]].', 'meetings, productivity'),
    ])
    conn.commit()
    conn.close()
    monkeypatch.setenv('PPB_LIBRARY_DB', str(path))
    return path


def store_text(title='Starter pack'):
    return json.dumps({'v': 1, 'activeId': 'pk_1', 'packs': [{'id': 'pk_1', 'title': title, 'prompts': []}]})


def test_version_is_set():
    assert re.fullmatch(r'\d+\.\d+\.\d+', main.__version__)


def test_load_with_no_file_starts_clean(api):
    res = api.load_store()
    assert res['ok'] and res['text'] is None


def test_save_then_load_round_trip(api):
    assert api.save_store(store_text())['saved']
    res = api.load_store()
    assert json.loads(res['text'])['packs'][0]['title'] == 'Starter pack'


def test_second_save_keeps_a_backup(api, tmp_path):
    api.save_store(store_text('First'))
    api.save_store(store_text('Second'))
    backup = json.loads((tmp_path / 'packs.json.bak').read_text(encoding='utf-8'))
    assert backup['packs'][0]['title'] == 'First'
    assert not (tmp_path / 'packs.json.tmp').exists()


@pytest.mark.parametrize('bad', ['not json', '[]', '{"packs": "nope"}'])
def test_save_refuses_bad_data_and_keeps_old_file(api, tmp_path, bad):
    api.save_store(store_text('Keep me'))
    res = api.save_store(bad)
    assert res['saved'] is False
    assert json.loads((tmp_path / 'packs.json').read_text(encoding='utf-8'))['packs'][0]['title'] == 'Keep me'


def test_damaged_file_is_set_aside_not_lost(api, tmp_path):
    (tmp_path / 'packs.json').write_text('{broken', encoding='utf-8')
    res = api.load_store()
    assert res['text'] is None and 'warning' in res
    kept = [p for p in os.listdir(tmp_path) if p.startswith('packs.damaged-')]
    assert len(kept) == 1
    assert (tmp_path / kept[0]).read_text(encoding='utf-8') == '{broken'


def test_library_status_and_missing_database(api, tmp_path, monkeypatch):
    monkeypatch.setenv('PPB_LIBRARY_DB', str(tmp_path / 'missing.db'))
    assert api.library_status()['available'] is False
    assert api.list_library()['ok'] is False


def test_library_is_read_without_changes(api, library):
    before = hashlib.md5(library.read_bytes()).hexdigest()
    assert api.library_status()['available'] is True
    res = api.list_library()
    assert res['ok']
    by_title = {p['title']: p for p in res['prompts']}
    assert by_title['Cold email opener']['tags'] == ['sales', 'email']
    assert by_title['Meeting summary']['tags'] == ['meetings', 'productivity']
    assert by_title['Meeting summary']['description'] == ''
    assert hashlib.md5(library.read_bytes()).hexdigest() == before


def test_library_connection_is_read_only(library):
    uri = 'file:' + str(library).replace('\\', '/') + '?mode=ro'
    conn = sqlite3.connect(uri, uri=True)
    with pytest.raises(sqlite3.OperationalError):
        conn.execute("INSERT INTO prompts (title, content) VALUES ('x', 'y')")
    conn.close()


@pytest.mark.parametrize('value, expected', [
    (None, []), ('', []), ('["a", " b "]', ['a', 'b']), ('a, b,,c', ['a', 'b', 'c']), ('[broken', ['[broken']),
])
def test_normalise_list(value, expected):
    assert main._normalise_list(value) == expected


def test_page_files_all_exist():
    html = open(os.path.join(APP_DIR, 'web', 'index.html'), encoding='utf-8').read()
    refs = re.findall(r'(?:src|href)="([^"]+)"', html)
    assert refs
    for ref in refs:
        assert os.path.isfile(os.path.join(APP_DIR, 'web', ref)), ref


def test_bridge_loads_before_workspace():
    html = open(os.path.join(APP_DIR, 'web', 'index.html'), encoding='utf-8').read()
    assert html.index('bridge.js') < html.index('prompt-pack-builder.js')
