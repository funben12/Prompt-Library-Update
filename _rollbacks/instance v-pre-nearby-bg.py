# One real desktop instance for the nearby share harness.
# usage: HOME=<tmp> python instance.py <name> <share_ip> <main_port>
# Runs the real app.py routes and the real share_server, but binds the share port to a loopback
# address so two "computers" can share one machine. Nothing in the app is edited.
import os
import sys
import threading

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

name, ip, main_port = sys.argv[1], sys.argv[2], int(sys.argv[3])

from app import app, init_db, set_setting, share_boot  # noqa: E402
import share_server  # noqa: E402

init_db()
set_setting('device_name', name)
share_boot()

# scan this fake network only: 127.0.0.1 to 127.0.0.254
share_server._lan_ips = lambda: [ip]


def serve_share():
    from waitress import serve
    serve(share_server.share_app, host=ip, port=share_server.SHARE_PORT, threads=4, _quiet=True)


threading.Thread(target=serve_share, daemon=True).start()
from waitress import serve  # noqa: E402
serve(app, host='127.0.0.1', port=main_port, threads=8, _quiet=True)
