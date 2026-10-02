#!/usr/bin/env bash
# Switches to the newest Xcode on the runner (betas/previews included). Each new iOS SDK can add
# launch-time requirements (iOS 27: the UIScene life cycle), and we want CI to hit them before users do.
set -euo pipefail
newest() { sed -E 's#^(.*/Xcode_([0-9][0-9.]*)[^/]*\.app)$#\2 \1#' | sort -V | tail -1 | cut -d' ' -f2-; }
XCODE=$(ls -d /Applications/Xcode_*.app | newest)
sudo xcode-select -s "$XCODE"
VERSION=$(xcodebuild -version | tr '\n' ' ')
echo "::notice title=Xcode::Using $XCODE ($VERSION)"
