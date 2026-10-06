# NEARBY SHARE -- AirDrop style receive port for prompts sent from phones and other desktops.
# Runs as its own tiny server on SHARE_PORT. It can only say hello, take an offer and report
# that offer's status; it never touches the library or /api. Accepting happens on the
# loopback-only main app (see register_local_routes), so nothing lands without a click.
import ipaddress
import secrets
import socket
import threading
import time

from flask import Flask, jsonify, request

SHARE_PORT = 47800
OFFER_TTL = 180            # seconds an offer waits for Accept or Decline
MAX_BODY = 256 * 1024      # bytes per offer
MAX_PENDING = 20
RATE_WINDOW, RATE_MAX = 60, 10

share_app = Flask('prompt_library_share')
share_app.config['MAX_CONTENT_LENGTH'] = MAX_BODY

_lock = threading.Lock()
_offers = {}               # offer_id -> dict
_hits = {}                 # remote ip -> [timestamps]
_state = {'enabled': True, 'device_id': None, 'name': None}


def _private(addr):
    try:
        ip = ipaddress.ip_address((addr or '').split('%')[0])
        if getattr(ip, 'ipv4_mapped', None):
            ip = ip.ipv4_mapped
        return ip.is_private or ip.is_loopback
    except ValueError:
        return False


def _expire():
    now = time.time()
    for oid, o in list(_offers.items()):
        if o['status'] == 'pending' and now - o['created'] > OFFER_TTL:
            o['status'] = 'expired'
        if now - o['created'] > OFFER_TTL * 4:
            del _offers[oid]


def _text(v, limit):
    return str(v or '').strip()[:limit]


def _list(v):
    if isinstance(v, str):
        v = v.split(',')
    if not isinstance(v, list):
        return []
    return [_text(x, 60) for x in v if _text(x, 60)][:20]


def configure(device_id, name, enabled=True):
    _state.update(device_id=device_id, name=name, enabled=bool(enabled))


@share_app.before_request
def _gate():
    if not _private(request.remote_addr):
        return jsonify({'error': 'Local network only'}), 403
    if not _state['enabled'] and request.path != '/share/hello':
        return jsonify({'error': 'This library is not receiving'}), 403
    return None


@share_app.after_request
def _cors(resp):
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return resp


@share_app.route('/share/hello', methods=['GET'])
def hello():
    return jsonify({
        'app': 'prompt-library', 'version': 1, 'type': 'desktop',
        'deviceId': _state['device_id'], 'name': _state['name'] or socket.gethostname(),
        'receiving': _state['enabled'],
    })


@share_app.route('/share/offer', methods=['POST'])
def offer():
    ip = request.remote_addr or ''
    now = time.time()
    data = request.get_json(silent=True) or {}
    p = data.get('prompt') or {}
    content = str(p.get('content') or '')
    if not content.strip():
        return jsonify({'error': 'Prompt text is required'}), 400
    with _lock:
        _expire()
        hits = [t for t in _hits.get(ip, []) if now - t < RATE_WINDOW]
        if len(hits) >= RATE_MAX:
            return jsonify({'error': 'Too many requests, wait a minute'}), 429
        _hits[ip] = hits + [now]
        if sum(1 for o in _offers.values() if o['status'] == 'pending') >= MAX_PENDING:
            return jsonify({'error': 'Too many waiting offers'}), 429
        oid = secrets.token_urlsafe(12)
        _offers[oid] = {
            'id': oid, 'status': 'pending', 'created': now, 'ip': ip,
            'fromId': _text(data.get('fromId'), 80),
            'fromName': _text(data.get('fromName'), 60) or 'A nearby device',
            'fromType': _text(data.get('fromType'), 20) or 'phone',
            'prompt': {
                'title': _text(p.get('title'), 200) or 'Untitled',
                'description': _text(p.get('description'), 2000),
                'content': content[:MAX_BODY],
                'categories': _list(p.get('categories')),
                'tags': _list(p.get('tags')),
            },
        }
    return jsonify({'offerId': oid, 'status': 'pending', 'expiresIn': OFFER_TTL})


@share_app.route('/share/offer/<oid>', methods=['GET'])
def offer_status(oid):
    with _lock:
        _expire()
        o = _offers.get(oid)
    if not o:
        return jsonify({'status': 'expired'})
    return jsonify({'status': o['status']})


def pending():
    with _lock:
        _expire()
        return [{k: o[k] for k in ('id', 'fromName', 'fromType', 'prompt', 'created')}
                for o in sorted(_offers.values(), key=lambda o: o['created']) if o['status'] == 'pending']


def resolve(oid, accept):
    with _lock:
        _expire()
        o = _offers.get(oid)
        if not o or o['status'] != 'pending':
            return None
        o['status'] = 'accepted' if accept else 'declined'
        return o


# ---- sending: desktop to phone, desktop to desktop ----
import json
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor


def _lan_ip():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(('10.255.255.255', 1))
        return sock.getsockname()[0]
    except OSError:
        return None
    finally:
        sock.close()


def _call(ip, path, body=None, timeout=4.0):
    if not _private(ip) or not ipaddress.ip_address(ip).version == 4:
        raise ValueError('Not a local address')
    url = f'http://{ip}:{SHARE_PORT}{path}'
    data = json.dumps(body).encode('utf-8') if body is not None else None
    req = urllib.request.Request(url, data=data, method='POST' if data else 'GET',
                                 headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read(512 * 1024) or b'{}')
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read(64 * 1024) or b'{}')
        except ValueError:
            return e.code, {}


def scan():
    """Find other Prompt Libraries on this /24, excluding this one."""
    me = _lan_ip()
    if not me:
        return {'devices': [], 'ip': None}
    base = me.rsplit('.', 1)[0] + '.'

    def probe(i):
        ip = base + str(i)
        if ip == me:
            return None
        try:
            code, d = _call(ip, '/share/hello', timeout=0.8)
        except Exception:
            return None
        if code == 200 and d.get('app') == 'prompt-library' and d.get('deviceId') != _state['device_id']:
            return {'ip': ip, 'name': d.get('name') or ip, 'type': d.get('type') or 'desktop',
                    'receiving': d.get('receiving') is not False}
        return None

    with ThreadPoolExecutor(max_workers=64) as pool:
        found = [d for d in pool.map(probe, range(1, 255)) if d]
    return {'devices': sorted(found, key=lambda d: d['name'].lower()), 'ip': me}


def send(ip, prompt):
    return _call(ip, '/share/offer', {
        'fromId': _state['device_id'], 'fromName': _state['name'] or socket.gethostname(),
        'fromType': 'desktop', 'prompt': prompt,
    }, timeout=5.0)


def sent_status(ip, oid):
    return _call(ip, '/share/offer/' + urllib.request.quote(oid, safe=''), timeout=4.0)


def serve_forever():
    try:
        _serve()
    except Exception:
        import logging, traceback
        logging.error('Nearby share could not start:\n' + traceback.format_exc())


def _serve():
    try:
        from waitress import serve
        serve(share_app, host='0.0.0.0', port=SHARE_PORT, threads=4, _quiet=True)
    except ImportError:
        share_app.run(host='0.0.0.0', port=SHARE_PORT, debug=False, use_reloader=False)
