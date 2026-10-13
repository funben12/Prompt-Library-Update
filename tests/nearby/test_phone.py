# Phone page (the real index.html from AI-App-Factory) in headless Chromium at phone size, talking to
# two real desktop instances and a stub phone receiver. Covers phone to desktop, phone to phone
# (sender side) and the Incoming sheet. The Java receiver itself needs a real phone.
# Run: PHONE_ASSETS=<path to .../src/main/assets> python tests/nearby/test_phone.py
import functools
import http.server
import os
import sys
import threading
import unittest

from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import harness as h  # noqa: E402

ASSETS = os.environ.get('PHONE_ASSETS') or os.path.abspath(os.path.join(
    os.path.dirname(__file__), '..', '..', '..', 'AI-App-Factory', 'apps', 'app-003-prompt-library-mobile',
    'source', 'app', 'src', 'main', 'assets'))
CHROME = os.environ.get('CHROME') or '/opt/pw-browsers/chromium'
PHONE_IP = '127.0.0.5'
META = {'Name': {'type': 'text', 'default': 'Sam', 'visible': True, 'options': []},
        'Tone': {'type': 'dropdown', 'default': '', 'visible': True, 'options': ['Formal', 'Casual']}}

A = B = P = None
pw = browser = httpd = None


def setUpModule():
    global A, B, P, pw, browser, httpd
    A = h.desktop('Desk A', '127.0.0.2', 5101)
    B = h.desktop('Desk B', '127.0.0.3', 5102)
    P = h.phone('Pixel Test', '127.0.0.4')
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ASSETS)
    handler.log_message = lambda *a, **k: None
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 8099), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])


def tearDownModule():
    browser.close()
    pw.stop()
    httpd.shutdown()
    h.stop_all()


def open_phone(seed=True):
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    ctx.add_init_script(f"window.__LOCAL_IP = '{PHONE_IP}';")
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:8099/index.html')
    page.wait_for_function('window.PL && window.PL.S')
    if seed:
        page.evaluate("""async (meta) => {
            const rec = { id: 'seed1', title: 'Phone seed prompt', description: 'd', content: 'Write to [Name] in a [Tone] voice.',
              categories: ['Test'], tags: ['x'], varMeta: meta, favourite: false, createdAt: Date.now(), updatedAt: Date.now(), useCount: 0 };
            await PL.dbPut(rec); PL.S.prompts = PL.S.prompts.concat(rec); PL.go('viewer', 'seed1');
        }""", META)
        page.wait_for_selector('[data-nearby]')
    return ctx, page, errors


def open_sheet(page):
    page.click('[data-nearby]')
    page.wait_for_selector('.dev', timeout=15000)
    page.wait_for_function("!document.querySelector('.scan')", timeout=20000)


def devices(page):
    return {e.query_selector('.t').inner_text(): e for e in page.query_selector_all('.dev')}


class PhoneAssets(unittest.TestCase):
    def test_0_every_phone_script_parses(self):
        import glob
        import subprocess
        bad = []
        for f in sorted(glob.glob(os.path.join(ASSETS, '*.js'))):
            r = subprocess.run(['node', '--check', f], capture_output=True, text=True)
            if r.returncode:
                bad.append(os.path.basename(f))
        self.assertEqual(bad, [], 'these phone scripts do not parse, so their tools never load')


class PhoneSender(unittest.TestCase):
    def test_00_board_and_components_tools_register(self):
        ctx, page, errors = open_phone(seed=False)
        try:
            tools = page.evaluate('Object.keys(window.PL_TOOLS || {})')
            self.assertEqual(errors, [])
            self.assertTrue(any('board' in t.lower() for t in tools), tools)
            self.assertTrue(any('component' in t.lower() for t in tools), tools)
        finally:
            ctx.close()

    def test_1_sheet_lists_desktops_and_phones(self):
        ctx, page, errors = open_phone()
        try:
            open_sheet(page)
            found = devices(page)
            self.assertEqual(sorted(found), ['Desk A', 'Desk B', 'Pixel Test'])
            self.assertIn('Computer', found['Desk A'].inner_text())
            self.assertIn('Phone', found['Pixel Test'].inner_text())
            self.assertEqual(errors, [])
        finally:
            ctx.close()

    def test_2_phone_to_desktop_accept(self):
        ctx, page, _ = open_phone()
        try:
            open_sheet(page)
            devices(page)['Desk A'].click()
            page.wait_for_selector('text=Waiting for Desk A')
            inbox = h.call('GET', A['main'] + '/api/share/inbox')[1]['offers']
            self.assertEqual(len(inbox), 1)
            self.assertEqual(inbox[0]['fromType'], 'phone')
            self.assertEqual(inbox[0]['prompt']['variable_meta']['Tone']['options'], ['Formal', 'Casual'])
            h.call('POST', f"{A['main']}/api/share/inbox/{inbox[0]['id']}", {'accept': True})
            page.wait_for_selector('#toast:has-text("Sent to Desk A")', timeout=8000)
        finally:
            ctx.close()

    def test_3_phone_to_desktop_decline(self):
        ctx, page, _ = open_phone()
        try:
            open_sheet(page)
            devices(page)['Desk B'].click()
            page.wait_for_selector('text=Waiting for Desk B')
            oid = h.call('GET', B['main'] + '/api/share/inbox')[1]['offers'][-1]['id']
            h.call('POST', f"{B['main']}/api/share/inbox/{oid}", {'accept': False})
            page.wait_for_selector('.dev .m:has-text("Declined")', timeout=8000)
        finally:
            ctx.close()

    def test_4_phone_to_phone_accept(self):
        ctx, page, _ = open_phone()
        try:
            open_sheet(page)
            devices(page)['Pixel Test'].click()
            page.wait_for_selector('text=Waiting for Pixel Test')
            offers = h.call('GET', P['share'] + '/ctl/offers')[1]['offers']
            o = [x for x in offers if x['prompt']['title'] == 'Phone seed prompt'][-1]
            self.assertEqual(o['fromType'], 'phone')
            self.assertEqual(o['prompt']['variable_meta']['Name']['default'], 'Sam')
            h.call('POST', f"{P['share']}/ctl/resolve/{o['id']}/accept")
            page.wait_for_selector('#toast:has-text("Sent to Pixel Test")', timeout=8000)
        finally:
            ctx.close()

    def test_5_empty_state_names_phones_as_well_as_computers(self):
        # a phone with no neighbours should not tell the user only to open a computer
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
        ctx.add_init_script("window.__LOCAL_IP = '10.99.99.5';")
        page = ctx.new_page()
        try:
            page.goto('http://127.0.0.1:8099/index.html')
            page.wait_for_function('window.PL && window.PL.S')
            page.evaluate("""async () => { const rec = { id: 's', title: 'T', content: 'x', categories: [], tags: [], varMeta: {},
              createdAt: Date.now(), updatedAt: Date.now() }; await PL.dbPut(rec); PL.S.prompts = PL.S.prompts.concat(rec); PL.go('viewer', 's'); }""")
            page.click('[data-nearby]')
            page.wait_for_selector('.sheet .note', timeout=20000)
            page.wait_for_function("!document.querySelector('.scan')", timeout=60000)
            text = page.inner_text('#sheet')
            self.assertIn('No libraries found', text)
            self.assertRegex(text.lower(), r'another phone|other phone|phone or computer|computer or phone',
                             'empty state should say a phone can be found too, not only a computer')
        finally:
            ctx.close()


class PhoneReceiver(unittest.TestCase):
    OFFER = {'id': 'o1', 'fromName': 'Desk A', 'fromType': 'desktop', 'prompt': {
        'title': 'From desktop', 'description': 'dd', 'content': 'Hello [Name]', 'categories': [], 'tags': ['t'],
        'variable_meta': {'Name': {'type': 'text', 'default': 'Sam', 'visible': True, 'options': []}}}}

    def test_6_incoming_accept_saves_with_types(self):
        ctx, page, errors = open_phone(seed=False)
        try:
            page.evaluate('o => window.onNearbyOffer(o)', self.OFFER)
            page.wait_for_selector('#incoming [data-in="1"]')
            self.assertIn('Desk A', page.inner_text('#incoming'))
            page.click('#incoming [data-in="1"]')
            page.wait_for_function("PL.S.prompts.some(p => p.title === 'From desktop')")
            p = page.evaluate("PL.S.prompts.find(p => p.title === 'From desktop')")
            self.assertEqual(p['categories'], ['Received'])
            self.assertEqual(p['varMeta']['Name']['default'], 'Sam')
            self.assertEqual(errors, [])
        finally:
            ctx.close()

    def test_7_incoming_decline_saves_nothing(self):
        ctx, page, _ = open_phone(seed=False)
        try:
            page.evaluate("o => window.onNearbyOffer({...o, id: 'o2', prompt: {...o.prompt, title: 'Nope'}})", self.OFFER)
            page.wait_for_selector('#incoming [data-in="0"]')
            page.click('#incoming [data-in="0"]')
            page.wait_for_function("document.querySelector('#incoming').hidden")
            self.assertFalse(page.evaluate("PL.S.prompts.some(p => p.title === 'Nope')"))
        finally:
            ctx.close()


if __name__ == '__main__':
    unittest.main(verbosity=2)
