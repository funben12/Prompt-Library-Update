# Desktop pair and desktop to phone, against the real app.py routes on two instances.
# Run: python tests/nearby/test_desktop.py   (needs Flask, waitress; see README)
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import harness as h  # noqa: E402

A = B = P = None
META = {'Name': {'type': 'text', 'default': 'Sam', 'visible': True, 'options': []},
        'Tone': {'type': 'dropdown', 'default': '', 'visible': True, 'options': ['Formal', 'Casual']}}


def setUpModule():
    global A, B, P
    A = h.desktop('Desk A', '127.0.0.2', 5101)
    B = h.desktop('Desk B', '127.0.0.3', 5102)
    P = h.phone('Pixel Test', '127.0.0.4')


def tearDownModule():
    h.stop_all()


def make_prompt(inst, title='Nearby test prompt'):
    code, d = h.call('POST', inst['main'] + '/api/prompts', {
        'title': title, 'content': 'Write to [Name] in a [Tone] voice.', 'description': 'harness',
        'categories': ['Test'], 'tags': ['a', 'b'], 'variable_meta': META})
    assert code in (200, 201), (code, d)
    return d.get('id') or d.get('prompt', {}).get('id')


def devices(inst):
    return h.call('GET', inst['main'] + '/api/share/devices', timeout=30)[1].get('devices', [])


def send(inst, ip, pid):
    return h.call('POST', inst['main'] + '/api/share/send', {'ip': ip, 'prompt_id': pid})


class DesktopToDesktop(unittest.TestCase):
    def test_01_discovery_both_ways(self):
        a_sees = {d['name']: d for d in devices(A)}
        b_sees = {d['name']: d for d in devices(B)}
        self.assertIn('Desk B', a_sees, a_sees)
        self.assertEqual(a_sees['Desk B']['type'], 'desktop')
        self.assertTrue(a_sees['Desk B']['receiving'])
        self.assertIn('Desk A', b_sees, b_sees)
        self.assertNotIn('Desk A', a_sees, 'a device must not list itself')

    def test_02_discovery_finds_the_phone(self):
        self.assertIn('Pixel Test', {d['name']: d['type'] for d in devices(A)})

    def test_03_send_accept_lands_in_received(self):
        pid = make_prompt(A)
        code, d = send(A, B['ip'], pid)
        self.assertEqual(code, 200, d)
        oid = d['offerId']
        inbox = h.call('GET', B['main'] + '/api/share/inbox')[1]
        self.assertEqual([o['id'] for o in inbox['offers']], [oid])
        self.assertEqual(inbox['offers'][0]['fromName'], 'Desk A')
        self.assertEqual(h.call('GET', f"{A['main']}/api/share/send/{B['ip']}/{oid}")[1]['status'], 'pending')
        code, r = h.call('POST', f"{B['main']}/api/share/inbox/{oid}", {'accept': True})
        self.assertEqual(code, 200, r)
        self.assertEqual(h.call('GET', f"{A['main']}/api/share/send/{B['ip']}/{oid}")[1]['status'], 'accepted')
        got = h.call('GET', f"{B['main']}/api/prompts")[1]
        got = got if isinstance(got, list) else got.get('prompts', [])
        mine = [p for p in got if p['title'] == 'Nearby test prompt']
        self.assertEqual(len(mine), 1, 'accepted prompt should be saved once')
        self.assertEqual(mine[0]['variable_meta']['Tone']['options'], ['Formal', 'Casual'])
        self.assertEqual(mine[0]['variable_meta']['Name']['default'], 'Sam')
        self.assertIn('Received from Desk A', mine[0].get('notes', ''))

    def test_04_decline_saves_nothing(self):
        pid = make_prompt(A, 'Declined prompt')
        oid = send(A, B['ip'], pid)[1]['offerId']
        h.call('POST', f"{B['main']}/api/share/inbox/{oid}", {'accept': False})
        self.assertEqual(h.call('GET', f"{A['main']}/api/share/send/{B['ip']}/{oid}")[1]['status'], 'declined')
        got = h.call('GET', f"{B['main']}/api/prompts")[1]
        got = got if isinstance(got, list) else got.get('prompts', [])
        self.assertFalse([p for p in got if p['title'] == 'Declined prompt'])

    def test_05_resolve_twice_is_refused(self):
        oid = send(A, B['ip'], make_prompt(A, 'Twice'))[1]['offerId']
        self.assertEqual(h.call('POST', f"{B['main']}/api/share/inbox/{oid}", {'accept': True})[0], 200)
        self.assertEqual(h.call('POST', f"{B['main']}/api/share/inbox/{oid}", {'accept': True})[0], 410)

    def test_06_receive_off_blocks_sending_and_shows_in_scan(self):
        h.call('POST', B['main'] + '/api/share/settings', {'receiving': False})
        try:
            self.assertFalse({d['name']: d for d in devices(A)}['Desk B']['receiving'])
            code, d = send(A, B['ip'], make_prompt(A, 'Blocked'))
            self.assertEqual(code, 403, d)
        finally:
            h.call('POST', B['main'] + '/api/share/settings', {'receiving': True})

    def test_07_inbox_and_accept_are_loopback_only_on_the_share_port(self):
        # the share port must never expose the library or the inbox
        for path in ('/api/prompts', '/api/share/inbox'):
            self.assertEqual(h.call('GET', f"http://{B['ip']}:47800{path}")[0], 404, path)

    def test_08_empty_prompt_refused(self):
        code, d = h.call('POST', f"http://{B['ip']}:47800/share/offer", {'fromId': 'x', 'prompt': {'title': 't', 'content': '  '}})
        self.assertEqual(code, 400, d)

    def test_09_add_by_address(self):
        code, d = h.call('GET', f"{A['main']}/api/share/devices?ip={B['ip']}")
        self.assertEqual([x['name'] for x in d['devices']], ['Desk B'])
        code, d = h.call('GET', f"{A['main']}/api/share/devices?ip=8.8.8.8")
        self.assertEqual(d['devices'], [])

    def test_10_rate_limit(self):
        codes = [h.call('POST', f"http://{B['ip']}:47800/share/offer",
                        {'fromId': 'rl', 'prompt': {'title': 'r', 'content': 'x'}})[0] for _ in range(14)]
        self.assertIn(429, codes, codes)


class DesktopToPhone(unittest.TestCase):
    def test_11_desktop_sends_to_phone_contract(self):
        pid = make_prompt(A, 'To phone')
        code, d = send(A, P['ip'], pid)
        self.assertEqual(code, 200, d)
        offers = h.call('GET', P['share'] + '/ctl/offers')[1]['offers']
        o = [x for x in offers if x['prompt']['title'] == 'To phone'][0]
        self.assertEqual(o['fromType'], 'desktop')
        self.assertEqual(o['fromName'], 'Desk A')
        self.assertEqual(o['prompt']['variable_meta']['Tone']['type'], 'dropdown')
        h.call('POST', f"{P['share']}/ctl/resolve/{o['id']}/accept")
        self.assertEqual(h.call('GET', f"{A['main']}/api/share/send/{P['ip']}/{o['id']}")[1]['status'], 'accepted')


if __name__ == '__main__':
    unittest.main(verbosity=2)
