# Python stand-in for the Android receiver (MainActivity.handleShare), same wire behaviour.
# usage: python phone_stub.py <name> <ip> [ctl_port]
# The real Java cannot run off a phone, so this checks the desktop and phone senders against the
# contract. Control (test only): GET /ctl/offers, POST /ctl/resolve/<id>/<accept|decline>.
import json
import sys
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

name, ip = sys.argv[1], sys.argv[2]
DEVICE_ID = uuid.uuid4().hex
OFFERS = {}
RECEIVING = {'on': True}


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, obj=None):
        body = json.dumps(obj or {}).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Length', '0' if code == 204 else str(len(body)))
        self.end_headers()
        if code != 204:
            self.wfile.write(body)

    def do_OPTIONS(self):
        self._send(204)

    def do_GET(self):
        path = self.path.split('?')[0]  # the real build strips the query string from 0.7.1
        if path == '/share/hello':
            return self._send(200, {'app': 'prompt-library', 'version': 1, 'type': 'phone',
                                    'deviceId': DEVICE_ID, 'name': name, 'receiving': RECEIVING['on']})
        if path == '/ctl/offers':
            return self._send(200, {'offers': list(OFFERS.values())})
        if path == '/ctl/receiving/off':
            RECEIVING['on'] = False
            return self._send(200)
        if not RECEIVING['on']:
            return self._send(403, {'error': 'This library is not receiving'})
        if path.startswith('/share/offer/'):
            o = OFFERS.get(path.rsplit('/', 1)[1])
            return self._send(200, {'status': o['status'] if o else 'expired'})
        self._send(404, {'error': 'Not found'})

    def do_POST(self):
        n = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(n) if n else b''
        if self.path.startswith('/ctl/resolve/'):
            _, _, _, oid, how = self.path.split('/')
            OFFERS[oid]['status'] = 'accepted' if how == 'accept' else 'declined'
            return self._send(200)
        if not RECEIVING['on']:
            return self._send(403, {'error': 'This library is not receiving'})
        if self.path == '/share/offer':
            d = json.loads(body or b'{}')
            oid = uuid.uuid4().hex[:12]
            OFFERS[oid] = {'id': oid, 'status': 'pending', 'created': time.time(),
                           'fromId': d.get('fromId'), 'fromName': d.get('fromName'),
                           'fromType': d.get('fromType'), 'prompt': d.get('prompt')}
            return self._send(200, {'offerId': oid, 'status': 'pending'})
        self._send(404, {'error': 'Not found'})


ThreadingHTTPServer((ip, 47800), H).serve_forever()
