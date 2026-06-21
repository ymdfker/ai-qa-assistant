#!/bin/bash
set -e
./scripts/build.sh
echo "=== Packaging for macOS ==="
cd "$(dirname "$0")/../electron"
npx electron-builder --mac --config.build.mac.target=zip,dmg
cd ..
echo "=== Package Complete ==="
echo "Check electron/dist/ for the .dmg file"
