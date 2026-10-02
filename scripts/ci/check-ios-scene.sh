#!/usr/bin/env bash
# Apps built with the iOS 27 SDK are killed at launch unless they adopt the UIScene life cycle.
# Checks the generated ios/ project does (via plugins/withSceneLifecycle.js), whatever Xcode CI has.
set -euo pipefail
DIR=$(dirname "$(ls ios/*/AppDelegate.swift | head -1)")
fail() { echo "::error title=iOS: UIScene life cycle missing::$1 (see plugins/withSceneLifecycle.js)"; exit 1; }

python3 - "$DIR/Info.plist" <<'PY' || fail "Info.plist has no UIApplicationSceneManifest pointing at SceneDelegate"
import plistlib, sys
m = plistlib.load(open(sys.argv[1], 'rb'))['UIApplicationSceneManifest']
assert m['UISceneConfigurations']['UIWindowSceneSessionRoleApplication'][0]['UISceneDelegateClassName'].endswith('SceneDelegate')
PY
[ -f "$DIR/SceneDelegate.swift" ] || fail "SceneDelegate.swift is missing"
grep -q 'SceneDelegate.swift in Sources' ios/*.xcodeproj/project.pbxproj || fail "SceneDelegate.swift isn't compiled into the app"
grep -q 'ExpoReactNativeFactoryProvider' "$DIR/AppDelegate.swift" || fail "AppDelegate doesn't conform to ExpoReactNativeFactoryProvider"
if grep -q 'UIWindow(frame:' "$DIR/AppDelegate.swift"; then fail "AppDelegate still creates its own window"; fi
echo "✔ iOS project adopts the UIScene life cycle"
