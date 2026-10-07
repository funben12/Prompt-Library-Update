#!/bin/bash
# Build "Prompt Library Pro.app" and a .dmg on macOS. Run from anywhere.
set -e
cd "$(dirname "$0")/.."

[ -d .venv-mac ] || python3 -m venv .venv-mac
source .venv-mac/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt py2app

rm -rf mac/icon.iconset && mkdir mac/icon.iconset
for s in 16 32 128 256 512; do
  sips -z $s $s app-icon.png --out mac/icon.iconset/icon_${s}x${s}.png >/dev/null
  sips -z $((s*2)) $((s*2)) app-icon.png --out mac/icon.iconset/icon_${s}x${s}@2x.png >/dev/null
done
iconutil -c icns mac/icon.iconset -o mac/app-icon.icns

rm -rf build dist
python mac/setup.py py2app
xattr -cr "dist/Prompt Library Pro.app"
codesign --force --deep --sign - "dist/Prompt Library Pro.app"

rm -rf dist_dmg && mkdir dist_dmg
cp -R "dist/Prompt Library Pro.app" dist_dmg/
cp mac/HOW_TO_OPEN.txt dist_dmg/
hdiutil create -volname "Prompt Library Pro" -srcfolder dist_dmg -ov -format UDZO "dist/Prompt Library Pro.dmg"
rm -rf dist_dmg
echo "Done: dist/Prompt Library Pro.app and dist/Prompt Library Pro.dmg"
