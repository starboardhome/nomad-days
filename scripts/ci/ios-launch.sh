#!/usr/bin/env bash
# Installs the simulator build, launches it and reports crashes as GitHub annotations.
set -uo pipefail
APP="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; BUNDLE_ID="$2" # simctl needs an absolute path
annotate() { python3 -c "import sys; t=sys.stdin.read()[:3500].replace('%','%25').replace('\r','').replace('\n','%0A'); print('::'+sys.argv[1]+' title='+sys.argv[2]+'::'+t)" "$1" "$2"; }

DEVICE=$(xcrun simctl list devices available -j | python3 -c "
import json,sys
d=json.load(sys.stdin)['devices']
print(next(x['udid'] for rt,xs in d.items() if 'iOS' in rt for x in xs if x['name'].startswith('iPhone')))")
xcrun simctl boot "$DEVICE"; xcrun simctl bootstatus "$DEVICE" -b >/dev/null
[ -d "$APP" ] || { echo "No app bundle at $APP" | annotate error "iOS: build output missing"; exit 1; }
echo "Installing $APP ($(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$APP/Info.plist"))"
xcrun simctl install "$DEVICE" "$APP" || { echo "simctl install failed for $APP" | annotate error "iOS: install failed"; exit 1; }
xcrun simctl spawn "$DEVICE" log stream --level error --style compact --predicate 'process CONTAINS "nomad"' > app-errors.log 2>&1 &
LOGPID=$!
xcrun simctl launch "$DEVICE" "$BUNDLE_ID" || true
sleep 30
kill $LOGPID 2>/dev/null

if xcrun simctl spawn "$DEVICE" launchctl list | grep -q "$BUNDLE_ID"; then
  xcrun simctl io "$DEVICE" screenshot ios-launch.png >/dev/null 2>&1
  echo "App still running 30s after launch" | annotate notice "iOS: app running"
  exit 0
fi
REPORT=$(ls -t ~/Library/Logs/DiagnosticReports/*.ips 2>/dev/null | grep -iv simctl | head -1)
if [ -n "$REPORT" ]; then
  # Exception type, termination reason and the crashed thread's top frames
  python3 - "$REPORT" <<'PY' | annotate error "iOS: crash report"
import json,sys
raw=open(sys.argv[1]).read().split('\n',1)
body=json.loads(raw[1]) if len(raw)>1 else {}
exc=body.get('exception',{}); term=body.get('termination',{})
print('exception:', exc.get('type'), exc.get('signal'), '| termination:', term.get('indicator'), term.get('reasons'))
print('asi:', body.get('asi'))
imgs=body.get('usedImages',[])
t=next((t for t in body.get('threads',[]) if t.get('triggered')), {})
for f in t.get('frames',[])[:25]:
  img=imgs[f.get('imageIndex',0)].get('name','?') if imgs else '?'
  print(img, f.get('symbol','?'))
PY
else
  echo "No .ips report found" | annotate error "iOS: app not running"
fi
tail -40 app-errors.log | annotate error "iOS: error log lines"
exit 1
