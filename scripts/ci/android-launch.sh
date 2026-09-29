#!/usr/bin/env bash
# Installs the release APK on the running emulator, launches it and reports what happened.
# Findings are printed as GitHub annotations (::error:: / ::notice::) so they're visible without logs.
set -uo pipefail
APK="$1"; PKG="$2"
adb install -r "$APK" >/dev/null
adb logcat -c
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 25

annotate() { python3 -c "import sys; t=sys.stdin.read()[:3500].replace('%','%25').replace('\r','').replace('\n','%0A'); print('::'+sys.argv[1]+' title='+sys.argv[2]+'::'+t)" "$1" "$2"; }

CRASH=$(adb logcat -d -b crash)
JS=$(adb logcat -d -s ReactNativeJS:E ReactNative:E AndroidRuntime:E | tail -40)
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
SCREEN=$(adb shell cat /sdcard/ui.xml 2>/dev/null | grep -oE 'text="[^"]+"' | sed 's/text="//; s/"$//' | head -25)

if adb shell pidof "$PKG" >/dev/null; then
  echo "$SCREEN" | annotate notice "Android: app running. Text on screen"
  [ -n "$JS" ] && echo "$JS" | annotate warning "Android: JS/runtime errors in logcat"
  exit 0
fi
echo "${CRASH:-no crash buffer output}" | annotate error "Android: app is NOT running after launch (crash log)"
echo "${JS:-none}" | annotate error "Android: JS/runtime errors"
exit 1
