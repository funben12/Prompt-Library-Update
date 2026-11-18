# Randomiser motion guard: the dice, card deck, random pick and random number must keep real motion after every update.
# Starts the real app on a throwaway data folder, seeds one prompt and drives it in headless Chromium.
#   pip install flask flask-cors waitress playwright
#   CHROME=<path to chrome> python -m unittest discover tests/randomiser
#   PHONE_ASSETS=<AI-App-Factory>/apps/app-003-prompt-library-mobile/source/app/src/main/assets  also checks the shared file has not drifted
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CHROME = os.environ.get('CHROME') or None
_opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
META = {
    'd': {'type': 'diceroll', 'faces': 6, 'visible': True},
    'c': {'type': 'carddeck', 'options': ['Ace', 'King', 'Queen'], 'visible': True},
    'p': {'type': 'randompick', 'options': ['Red', 'Green', 'Blue'], 'visible': True},
    'n': {'type': 'randomnumber', 'options': ['1', '500'], 'visible': True},
}
SERVER = r'''
import os, sys
sys.path.insert(0, sys.argv[1]); os.chdir(sys.argv[1])
from app import app, init_db
init_db()
from waitress import serve
serve(app, host='127.0.0.1', port=int(sys.argv[2]), threads=4, _quiet=True)
'''


def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


class Randomiser(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.port = free_port()
        home = tempfile.mkdtemp(prefix='plrandom-')
        env = dict(os.environ, HOME=home, USERPROFILE=home, APPDATA=home)
        cls.proc = subprocess.Popen([sys.executable, '-c', SERVER, ROOT, str(cls.port)], env=env)
        base = f'http://127.0.0.1:{cls.port}'
        for _ in range(100):
            try:
                _opener.open(base + '/', timeout=1); break
            except Exception:
                time.sleep(0.2)
        req = urllib.request.Request(base + '/api/prompts', method='POST', headers={'Content-Type': 'application/json'},
                                     data=json.dumps({'title': 'Motion', 'content': 'Roll {{d}} draw {{c}} pick {{p}} number {{n}}', 'category': 'Test', 'variable_meta': META}).encode())
        cls.pid = json.loads(_opener.open(req, timeout=10).read())['id']
        cls.base = base
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.pw.stop(); cls.proc.terminate(); cls.proc.wait(10)

    def open(self, reduced=False, block=None, motion=None):
        ctx = self.browser.new_context(viewport={'width': 1400, 'height': 900}, reduced_motion='reduce' if reduced else 'no-preference')
        init = "try{localStorage.setItem('promptlib.tourDone','1')}catch(e){}"
        if motion:
            init += f"try{{localStorage.setItem('pl.randomMotion','{motion}')}}catch(e){{}}"
        ctx.add_init_script(init)
        if block:
            ctx.route(f'**/static/{block}*', lambda r: r.abort())
        page = ctx.new_page()
        page.errors = []
        page.on('pageerror', lambda e: page.errors.append(str(e)))
        page.goto(self.base + '/')
        page.wait_for_function('window.PL_openDetail')
        page.wait_for_timeout(600)
        page.evaluate(f'window.PL_openDetail({self.pid})')
        page.wait_for_selector('#variableFields .var-field')
        return page

    def anims(self, page, sel):
        return page.evaluate(f"document.querySelector('{sel}').getAnimations({{subtree:true}}).length")

    def test_1_dice_move_even_with_windows_animations_off(self):
        page = self.open(reduced=True)
        page.click('#variableFields [data-vdgo]')
        page.wait_for_timeout(250)
        self.assertGreaterEqual(self.anims(page, '#variableFields .vd-stage'), 3)
        page.wait_for_selector('#variableFields .vd-stage:not(.vd-rolling)', timeout=6000)
        value = page.input_value('#variableFields .pl-r3d[data-vtype=diceroll] input.var-input')
        self.assertIn(value, ['1', '2', '3', '4', '5', '6'])
        self.assertEqual(page.text_content('#variableFields .vd output'), value)
        # the die really has size: host CSS must not shrink its faces
        self.assertGreater(page.evaluate("parseFloat(getComputedStyle(document.querySelector('#variableFields .vd3-f')).width)"), 20)
        self.assertEqual(page.errors, [])

    def test_2_deck_cuts_riffles_and_deals(self):
        page = self.open(reduced=True)
        page.click('#variableFields [data-vcdraw]')
        page.wait_for_timeout(300)
        self.assertGreater(self.anims(page, '#variableFields .vc'), 3)
        page.wait_for_selector('#variableFields .vc.drawn', timeout=9000)
        self.assertIn(page.input_value('#variableFields .pl-r3d[data-vtype=carddeck] input.var-input'), ['Ace', 'King', 'Queen'])

    def test_3_random_pick_drum_spins_then_lands(self):
        page = self.open(reduced=True)
        page.click('#variableFields .vr-pick [data-vrgo]')
        page.wait_for_timeout(250)
        self.assertGreaterEqual(self.anims(page, '#variableFields .vr-pick'), 2)
        page.wait_for_selector('#variableFields .vr-pick.landed', timeout=5000)
        out = page.input_value('#variableFields .pl-r3d[data-vtype=randompick] input.var-input')
        self.assertIn(out, ['Red', 'Green', 'Blue'])
        self.assertEqual(page.text_content('#variableFields .vr-pick .vr-f.win'), out)
        self.assertIn(out, page.text_content('#varPreviewBox'))

    def test_3b_random_number_drums_stop_left_to_right(self):
        page = self.open(reduced=True)
        self.assertEqual(page.locator('#variableFields .vr-num .vr-dw').count(), 3)
        page.click('#variableFields .vr-num [data-vrgo]')
        page.wait_for_timeout(250)
        self.assertGreaterEqual(self.anims(page, '#variableFields .vr-num'), 3)
        page.wait_for_selector('#variableFields .vr-num.landed', timeout=5000)
        value = page.input_value('#variableFields .pl-r3d[data-vtype=randomnumber] input.var-input')
        self.assertTrue(1 <= int(value) <= 500)
        shown = ''.join(page.eval_on_selector_all('#variableFields .vr-num .vr-f.win', 'fs => fs.map(f => f.textContent)'))
        self.assertEqual(int(shown), int(value))
        self.assertIn(value, page.text_content('#varPreviewBox'))
        self.assertEqual(page.errors, [])

    def test_3c_the_text_reel_still_works_without_the_shared_file(self):
        page = self.open(block='vartypes-3d.js')
        page.click('#variableFields button[data-roll-kind=randompick]')
        page.wait_for_selector('#variableFields .vm-reeling', timeout=1000)
        block = '#variableFields .var-random-block:has(button[data-roll-kind=randompick])'
        page.wait_for_selector(block + ':not(:has(.vm-reeling))', timeout=4000)
        self.assertIn(page.text_content(block + ' [data-roll-result]'), ['Red', 'Green', 'Blue'])

    def test_4_motion_off_gives_the_result_at_once(self):
        page = self.open(motion='off')
        page.click('#variableFields [data-vdgo]')
        self.assertEqual(page.locator('#variableFields .vd-stage.vd-rolling').count(), 0)
        self.assertNotEqual(page.input_value('#variableFields .pl-r3d[data-vtype=diceroll] input.var-input'), '')

    def test_5_click_skips_to_the_result(self):
        page = self.open()
        page.click('#variableFields [data-vcdraw]')
        page.wait_for_timeout(250)
        page.click('#variableFields .vc-table', force=True)
        self.assertEqual(page.locator('#variableFields .vc.drawn').count(), 1)
        page.wait_for_timeout(800)
        self.assertEqual(self.anims(page, '#variableFields .vc'), 0)
        page.click('#variableFields .vr-num [data-vrgo]')
        page.wait_for_timeout(200)
        page.click('#variableFields .vr-num .vr-stage', force=True)
        self.assertEqual(page.locator('#variableFields .vr-num.landed').count(), 1)
        self.assertNotEqual(page.input_value('#variableFields .pl-r3d[data-vtype=randomnumber] input.var-input'), '')

    def test_6_settings_has_the_motion_choice(self):
        page = self.open()
        self.assertEqual(page.locator('#configPanel [data-rmode-set]').count(), 3)
        page.evaluate("document.querySelector('#configPanel [data-rmode-set=short]').click()")
        self.assertEqual(page.evaluate("localStorage.getItem('pl.randomMotion')"), 'short')

    def test_7_built_in_controls_still_work_if_the_shared_file_is_missing(self):
        page = self.open(block='vartypes-3d.js')
        self.assertEqual(page.locator('#variableFields .var-dice').count(), 1)
        self.assertEqual(page.locator('#variableFields .var-deck').count(), 1)
        page.click('#variableFields .var-dice button')
        page.wait_for_timeout(1700)
        self.assertNotEqual(page.input_value('#variableFields .var-dice input.var-input'), '')

    def test_8_shared_file_matches_the_phone(self):
        phone = os.environ.get('PHONE_ASSETS')
        if not phone:
            self.skipTest('set PHONE_ASSETS to the phone assets folder to check for drift')
        with open(os.path.join(ROOT, 'static', 'vartypes-3d.js'), 'rb') as a, open(os.path.join(phone, 'vartypes-3d.js'), 'rb') as b:
            self.assertEqual(a.read(), b.read(), 'static/vartypes-3d.js differs from the phone copy: copy the newer one across')


if __name__ == '__main__':
    unittest.main()
