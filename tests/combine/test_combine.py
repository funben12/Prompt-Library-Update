"""Checks combine and undo against a throwaway database. Run: python tests/combine/test_combine.py"""
import os, sys, tempfile

HOME = tempfile.mkdtemp(prefix='pl-combine-')
os.environ['HOME'] = HOME
os.environ['USERPROFILE'] = HOME
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
import app as A

assert A.DATABASE.startswith(HOME), 'refusing to run against a real library'
A.init_db()
c = A.app.test_client()
fails = []

def check(name, ok):
    print(('PASS ' if ok else 'FAIL ') + name)
    if not ok:
        fails.append(name)

def post(path, body=None):
    r = c.post(path, json=body or {})
    return r.status_code, r.get_json()

def counts():
    conn = A.get_db()
    out = {t: conn.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0] for t in ('prompts', 'prompt_versions', 'usage_log', 'prompt_relationships')}
    conn.close()
    return out

_, a = post('/api/prompts', {'title': 'A', 'content': 'Write to [[name]] about {{offer}}', 'tags': ['sales']})
_, b = post('/api/prompts', {'title': 'B', 'content': 'Write to [[name]] in a [[tone]] tone', 'tags': ['outreach']})
_, other = post('/api/prompts', {'title': 'Other', 'content': 'Unrelated'})
_, fork = post(f"/api/prompts/{a['id']}/fork", {'title': 'A fork'})
post(f"/api/prompts/{a['id']}/favorite")
post(f"/api/prompts/{a['id']}/use"); post(f"/api/prompts/{b['id']}/use"); post(f"/api/prompts/{b['id']}/use")
post(f"/api/prompts/{b['id']}/relationships", {'related_id': other['id']})
c.put(f"/api/prompts/{a['id']}", json={'content': 'Write to [[name]] about {{offer}}!'})
before = counts()

code, res = post('/api/prompts/combine', {'source_ids': [a['id'], b['id']], 'prompt': {'title': 'AB', 'content': 'Write to [[name]] about {{offer}} in a [[tone]] tone', 'tags': ['sales', 'outreach'], 'is_favorite': 1}})
check('combine returns 200', code == 200)
new = c.get(f"/api/prompts/{res['id']}").get_json()
check('combined keeps chosen fields', new['title'] == 'AB' and new['tags'] == ['sales', 'outreach'] and new['is_favorite'] == 1)
check('use count is added up', new['use_count'] == 3)
check('both originals removed', c.get(f"/api/prompts/{a['id']}").status_code == 404 and c.get(f"/api/prompts/{b['id']}").status_code == 404)
check('related link moves to combined', [r['id'] for r in c.get(f"/api/prompts/{res['id']}/relationships").get_json()] == [other['id']])
check('fork keeps a snapshot of its parent', c.get(f"/api/prompts/{fork['id']}").get_json()['fork_snapshot'] is not None)

code, _ = post('/api/prompts/combine/undo', {'undo_token': res['undo_token']})
check('undo returns 200', code == 200)
check('undo restores every row', counts() == before)
back = c.get(f"/api/prompts/{a['id']}").get_json()
check('original comes back with same id and data', back['title'] == 'A' and back['is_favorite'] == 1 and back['use_count'] == 1)
check('fork snapshot cleared again', c.get(f"/api/prompts/{fork['id']}").get_json()['fork_snapshot'] is None)
check('combined prompt gone after undo', c.get(f"/api/prompts/{res['id']}").status_code == 404)
check('undo only once', post('/api/prompts/combine/undo', {'undo_token': res['undo_token']})[0] == 404)

_, res2 = post('/api/prompts/combine', {'source_ids': [a['id'], b['id']], 'prompt': {'title': 'X', 'content': 'x'}})
c.put(f"/api/prompts/{res2['id']}", json={'content': 'edited after combining'})
code, body = post('/api/prompts/combine/undo', {'undo_token': res2['undo_token']})
check('undo warns when combined prompt was edited', code == 409 and body.get('edited'))
check('forced undo still works', post('/api/prompts/combine/undo', {'undo_token': res2['undo_token'], 'force': True})[0] == 200)

A._save_locked_prompt_ids([other['id']])
check('locked prompt refused', post('/api/prompts/combine', {'source_ids': [other['id'], a['id']], 'prompt': {'content': 'y'}})[0] == 423)
A._save_locked_prompt_ids([])
check('same prompt twice refused', post('/api/prompts/combine', {'source_ids': [a['id'], a['id']], 'prompt': {'content': 'y'}})[0] == 400)
check('empty content refused, nothing removed', post('/api/prompts/combine', {'source_ids': [a['id'], b['id']], 'prompt': {'content': '  '}})[0] == 400 and c.get(f"/api/prompts/{a['id']}").status_code == 200)
check('missing prompt refused, other kept', post('/api/prompts/combine', {'source_ids': [a['id'], 99999], 'prompt': {'content': 'z'}})[0] == 404 and c.get(f"/api/prompts/{a['id']}").status_code == 200)

print('\n' + ('All passed' if not fails else f'{len(fails)} failed'))
sys.exit(1 if fails else 0)
