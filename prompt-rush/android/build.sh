#!/usr/bin/env bash
# Build a signed debug APK from ../www with raw SDK tools (no Gradle). Usage: ./build.sh
set -euo pipefail
cd "$(dirname "$0")"
SDK="${ANDROID_HOME:-/opt/android-sdk}"
BT="$SDK/build-tools/35.0.0"
JAR="$SDK/platforms/android-34/android.jar"
OUT=build
rm -rf "$OUT" && mkdir -p "$OUT/classes" "$OUT/assets/www"
cp -r ${WWW:-../www}/. "$OUT/assets/www/"
"$BT/aapt2" compile --dir res -o "$OUT/res.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$JAR" --manifest AndroidManifest.xml -A "$OUT/assets" "$OUT/res.zip"
javac -source 8 -target 8 -bootclasspath "$JAR" -classpath "$JAR" -nowarn -Xlint:-options -d "$OUT/classes" $(find src -name '*.java')
"$BT/d8" --min-api 21 --lib "$JAR" --output "$OUT" $(find "$OUT/classes" -name '*.class')
(cd "$OUT" && zip -q -u base.apk classes.dex)
"$BT/zipalign" -f 4 "$OUT/base.apk" "$OUT/aligned.apk"
KS="${KEYSTORE:-$HOME/.android/promptrush-debug.keystore}"
if [ ! -f "$KS" ]; then
  mkdir -p "$(dirname "$KS")"
  keytool -genkeypair -keystore "$KS" -storepass android -keypass android -alias debug \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Prompt Rush Debug" >/dev/null 2>&1
fi
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:android --key-pass pass:android --out ../PromptRush-debug.apk "$OUT/aligned.apk"
echo "APK: $(cd .. && pwd)/PromptRush-debug.apk ($(du -h ../PromptRush-debug.apk | cut -f1))"
