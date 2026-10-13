# Shared helpers for the nearby share harness: start instances, call them, tear down.
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
_opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
_procs = []
_tmp = tempfile.mkdtemp(prefix='plnearby-')


def call(method, url, body=None, timeout=10):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={'Content-Type': 'application/json'})
    try:
        with _opener.open(req, timeout=timeout) as r:
            return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b'{}')
        except ValueError:
            return e.code, {}


def wait_for(url, timeout=20):
    end = time.time() + timeout
    while time.time() < end:
        try:
            call('GET', url, timeout=1)
            return
        except Exception:
            time.sleep(0.2)
    raise RuntimeError('Timed out waiting for ' + url)


def desktop(name, ip, port):
    home = os.path.join(_tmp, name.replace(' ', '_'))
    os.makedirs(home, exist_ok=True)
    p = subprocess.Popen([PY, os.path.join(HERE, 'instance.py'), name, ip, str(port)],
                         env={**os.environ, 'HOME': home, 'USERPROFILE': home},
                         stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    _procs.append(p)
    wait_for(f'http://127.0.0.1:{port}/api/share/inbox')
    wait_for(f'http://{ip}:47800/share/hello')
    return {'name': name, 'ip': ip, 'main': f'http://127.0.0.1:{port}', 'proc': p}


def phone(name, ip):
    p = subprocess.Popen([PY, os.path.join(HERE, 'phone_stub.py'), name, ip],
                         stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    _procs.append(p)
    wait_for(f'http://{ip}:47800/share/hello')
    return {'name': name, 'ip': ip, 'share': f'http://{ip}:47800', 'proc': p}


def stop_all():
    for p in _procs:
        p.terminate()
    for p in _procs:
        try:
            p.wait(5)
        except subprocess.TimeoutExpired:
            p.kill()
    _procs.clear()
