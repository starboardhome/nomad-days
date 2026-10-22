#!/usr/bin/env bash
# Checks the merged Android manifests (run from android/ after assembleDebug and processReleaseMainManifest):
#  - release has none of the permissions blocked in app.json (no network, no storage, no overlay, no biometrics)
#  - debug still has INTERNET, which Metro needs (plugins/withDebugInternet.js)
set -euo pipefail
merged() { find app/build/intermediates -path "*merged_manifest*/$1/*" -name AndroidManifest.xml | head -1; }
RELEASE_FILE=$(merged release); DEBUG_FILE=$(merged debug)
[ -n "$RELEASE_FILE" ] || { echo "::error::No merged release manifest found"; exit 1; }
[ -n "$DEBUG_FILE" ] || { echo "::error::No merged debug manifest found"; exit 1; }
# One element per line, whatever the original line breaks
flat() { tr '\n\t' '  ' < "$1" | sed 's/  */ /g; s/</\n</g'; }
RELEASE=$(mktemp); DEBUG=$(mktemp); flat "$RELEASE_FILE" > "$RELEASE"; flat "$DEBUG_FILE" > "$DEBUG"

BLOCKED=$(node -p "require('../app.json').expo.android.blockedPermissions.join(' ')")
status=0
for p in $BLOCKED; do
  if grep -q "uses-permission[^>]*\"$p\"" "$RELEASE"; then echo "::error::Release build requests blocked permission $p"; status=1; fi
done
grep -q 'uses-permission[^>]*"android.permission.INTERNET"' "$DEBUG" || { echo "::error::Debug build lacks INTERNET (Metro can't connect)"; status=1; }

echo "Release permissions:"; grep -o 'uses-permission[^>]*android:name="[^"]*"' "$RELEASE" | sed 's/.*name="android.permission./  /; s/"$//' | sort -u
[ $status -eq 0 ] && echo "✔ Release has no blocked permissions; debug keeps INTERNET"
exit $status
