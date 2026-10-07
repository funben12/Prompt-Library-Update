#!/bin/bash
# Build a macOS installer: dist/Prompt Library Pro Installer.pkg
# Usage: mac/build_pkg.sh            (packages the app already in dist/)
#        mac/build_pkg.sh --rebuild  (runs mac/build_mac.sh first)
set -e
cd "$(dirname "$0")/.."
APP_NAME="Prompt Library Pro.app"
VERSION="1.0.0"
OUT="dist/Prompt Library Pro Installer.pkg"

if [ "$1" = "--rebuild" ] || [ ! -d "dist/$APP_NAME" ]; then
  ./mac/build_mac.sh
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Stage a clean copy: no stray metadata or logs, fresh ad-hoc signature.
mkdir -p "$WORK/root/Applications" "$WORK/res"
cp -R "dist/$APP_NAME" "$WORK/root/Applications/"
STAGED="$WORK/root/Applications/$APP_NAME"
rm -f "$STAGED/Contents/MacOS/error.log"
xattr -cr "$STAGED"
codesign --force --deep --sign - "$STAGED"
codesign --verify --deep --strict "$STAGED"

# Never relocate (always /Applications, even if another copy exists elsewhere) and don't skip
# files because every build shares version 1.0.0.
pkgbuild --analyze --root "$WORK/root" "$WORK/components.plist" >/dev/null
PB=/usr/libexec/PlistBuddy
for KEY in BundleIsRelocatable BundleIsVersionChecked; do
  $PB -c "Set :0:$KEY false" "$WORK/components.plist" 2>/dev/null || $PB -c "Add :0:$KEY bool false" "$WORK/components.plist"
done

pkgbuild --root "$WORK/root" \
  --component-plist "$WORK/components.plist" \
  --identifier com.eugenephillips.promptlibrarypro.pkg \
  --version "$VERSION" \
  --install-location / \
  --scripts mac/pkg/scripts \
  "$WORK/PromptLibraryPro-component.pkg"

cp mac/pkg/welcome.html mac/pkg/conclusion.html "$WORK/res/"
sed "s/VERSION_PLACEHOLDER/$VERSION/" mac/pkg/distribution.xml > "$WORK/distribution.xml"

rm -f "$OUT"
productbuild --distribution "$WORK/distribution.xml" \
  --resources "$WORK/res" \
  --package-path "$WORK" \
  "$OUT"

echo "Done: $OUT"
