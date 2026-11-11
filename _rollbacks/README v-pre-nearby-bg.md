# Nearby share harness

Checks nearby share between two real desktop instances, a stub phone receiver and the real phone page. Nothing in the app is edited.

## Run

```
pip install -r requirements.txt playwright
python tests/nearby/test_desktop.py
PHONE_ASSETS=<AI-App-Factory>/apps/app-003-prompt-library-mobile/source/app/src/main/assets python tests/nearby/test_phone.py
```

`CHROME` overrides the Chromium path (default `/opt/pw-browsers/chromium`).

## How it works

- `instance.py`: the real `app.py` and `share_server.py` with its own `HOME` (own database), share port bound to a loopback address (127.0.0.2, 127.0.0.3). The scan covers 127.0.0.x, so discovery is real.
- `phone_stub.py`: Python copy of the Android receiver's wire behaviour on 127.0.0.4.
- `test_desktop.py`: desktop to desktop and desktop to phone. Discovery, send, accept, decline, double resolve, receive off, port isolation, empty prompt, add by address, rate limit.
- `test_phone.py`: the phone page at 390 x 844. Phone to desktop, phone to phone (sender side), Incoming sheet, empty state copy, and a parse check on every phone script.

## Not covered

The Java receiver (`MainActivity.handleShare`) and real radios, Wi-Fi client isolation and firewalls. These need two real devices: see `tests/README.md` items 14 to 21 in the phone app folder.
