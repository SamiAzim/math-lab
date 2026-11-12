#!/bin/bash
# Packages the extension as livecode-<version>.vsix (a zip; no node or vsce needed) and prints the install command.
set -e
cd "$(dirname "$0")"
V=$(python3 -c "import json; print(json.load(open('extension/package.json'))['version'])")
sed -e "s/@VERSION@/$V/" extension.vsixmanifest.in > extension.vsixmanifest
OUT=livecode-$V.vsix
rm -f "$OUT"
zip -q -r "$OUT" "[Content_Types].xml" extension.vsixmanifest extension -x '*.DS_Store' -x 'extension/node_modules/*'
echo "built $OUT"
echo "install: \"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code\" --install-extension $PWD/$OUT --force"
echo "then: Developer: Reload Window in each VS Code window"
