#!/usr/bin/env bash
# Clean-builds the app, launches it on the iOS simulator or Android emulator,
# checks it's still running 20s later and saves logs + a screenshot.
#
#   scripts/dev/launch-check.sh ios        # Release build (JS bundled in, no Metro needed)
#   scripts/dev/launch-check.sh android    # start the emulator first (`droid`)
#   KEEP_NATIVE=1 scripts/dev/launch-check.sh ios   # reuse ios/ instead of regenerating it
#
# Paste the printed summary back into the chat if something fails.
set -uo pipefail
PLATFORM="${1:-}"
[[ "$PLATFORM" == ios || "$PLATFORM" == android ]] || { echo "Usage: $0 ios|android"; exit 2; }
cd "$(dirname "$0")/../.."

OUT="launch-logs/$PLATFORM-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"
SUMMARY="$OUT/summary.txt"
say() { echo "$*" | tee -a "$SUMMARY"; }
section() { printf '\n── %s ──\n' "$1" | tee -a "$SUMMARY"; }
appjson() { node -p "require('./app.json').expo.$1"; }

section "Setup"
say "branch: $(git rev-parse --abbrev-ref HEAD) @ $(git rev-parse --short HEAD)$(git diff --quiet || echo ' (uncommitted changes)')"
say "node $(node -v), expo $(node -p "require('expo/package.json').version")"
npm install --no-audit --no-fund >"$OUT/npm-install.log" 2>&1 || { say "npm install failed, see $OUT/npm-install.log"; exit 1; }
if [[ -z "${KEEP_NATIVE:-}" ]]; then
  say "Regenerating $PLATFORM/ (native code must match the current dependencies)"
  rm -rf "$PLATFORM"
fi

if [[ "$PLATFORM" == ios ]]; then
  ID=$(appjson ios.bundleIdentifier)
  DEVICE=$(xcrun simctl list devices booted -j | python3 -c "
import json,sys
d=[x for xs in json.load(sys.stdin)['devices'].values() for x in xs]
print(d[0]['udid'] if d else '')")
  if [[ -z "$DEVICE" ]]; then
    DEVICE=$(xcrun simctl list devices available -j | python3 -c "
import json,sys
d=json.load(sys.stdin)['devices']
print(next(x['udid'] for rt,xs in d.items() if 'iOS' in rt for x in xs if x['name'].startswith('iPhone')))")
    xcrun simctl boot "$DEVICE"; open -a Simulator; xcrun simctl bootstatus "$DEVICE" -b >/dev/null
  fi
  say "simulator: $(xcrun simctl list devices | grep "$DEVICE" | sed 's/^ *//')"
  xcrun simctl uninstall "$DEVICE" "$ID" >/dev/null 2>&1 # start from a fresh install

  section "Build (Release, takes several minutes)"
  xcrun simctl spawn "$DEVICE" log stream --level error --style compact --predicate 'process CONTAINS[c] "nomad"' >"$OUT/device.log" 2>&1 &
  LOGPID=$!
  if ! npx expo run:ios --configuration Release --no-bundler -d "$DEVICE" >"$OUT/build.log" 2>&1; then
    kill $LOGPID 2>/dev/null
    say "BUILD FAILED. Last lines of $OUT/build.log:"
    grep -E 'error:|Error|❌' "$OUT/build.log" | tail -20 | tee -a "$SUMMARY"
    exit 1
  fi
  say "Built and launched. Waiting 20s…"
  sleep 20
  kill $LOGPID 2>/dev/null
  xcrun simctl io "$DEVICE" screenshot "$OUT/screenshot.png" >/dev/null 2>&1
  RUNNING=$(xcrun simctl spawn "$DEVICE" launchctl list | grep -c "$ID")
else
  ID=$(appjson android.package)
  adb get-state >/dev/null 2>&1 || { say "No Android emulator/device connected. Start one first (droid)."; exit 1; }
  say "device: $(adb shell getprop ro.product.model | tr -d '\r'), Android $(adb shell getprop ro.build.version.release | tr -d '\r')"
  adb uninstall "$ID" >/dev/null 2>&1
  adb logcat -c

  section "Build (release variant, takes several minutes)"
  if ! npx expo run:android --variant release --no-bundler >"$OUT/build.log" 2>&1; then
    say "BUILD FAILED. Last lines of $OUT/build.log:"
    grep -E 'FAILURE|error:|Error|What went wrong' -A3 "$OUT/build.log" | tail -25 | tee -a "$SUMMARY"
    exit 1
  fi
  say "Built and launched. Waiting 20s…"
  sleep 20
  adb exec-out screencap -p >"$OUT/screenshot.png" 2>/dev/null
  adb logcat -d -b crash >"$OUT/crash.log"
  adb logcat -d '*:E' >"$OUT/device.log"
  RUNNING=$(adb shell pidof "$ID" >/dev/null && echo 1 || echo 0)
fi

section "Result"
if [[ "$RUNNING" -gt 0 ]]; then
  say "✅ $ID is still running 20s after launch. Screenshot: $OUT/screenshot.png"
else
  say "❌ $ID is NOT running (it crashed or closed)."
fi
section "Errors from the app (last 30)"
# iOS: error/fault lines only, minus iOS 27 deprecation noise from React Native's status bar calls
grep -E ' (E|F) |ReactNativeJS|AndroidRuntime|FATAL' "$OUT/device.log" 2>/dev/null | grep -v 'API has been deprecated' | tail -30 | tee -a "$SUMMARY"
[[ -s "${OUT}/crash.log" ]] && { section "Crash buffer"; tail -40 "$OUT/crash.log" | tee -a "$SUMMARY"; }
REPORT=$(ls -t ~/Library/Logs/DiagnosticReports/*.ips 2>/dev/null | head -1)
[[ "$PLATFORM" == ios && -n "$REPORT" && $(find "$REPORT" -mmin -10 2>/dev/null) ]] && { section "Crash report $REPORT"; head -c 3000 "$REPORT" | tee -a "$SUMMARY"; }
printf '\nFull logs: %s\n' "$OUT"
[[ "$RUNNING" -gt 0 ]]
