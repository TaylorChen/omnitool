#!/bin/bash

# OmniTool Extension Build Script
# Creates a distributable zip file for the extension

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Version from manifest
VERSION=$(grep '"version"' manifest.json | sed 's/.*: *"\([^"]*\)".*/\1/')

# Output filename
OUTPUT_FILE="omnitool-v${VERSION}.zip"

# Remove old build
rm -f "$OUTPUT_FILE"

# Create zip with necessary files only
zip -r "$OUTPUT_FILE" \
    manifest.json \
    LICENSE \
    README.md \
    popup/ \
    background/ \
    modules/ \
    assets/icons/*.png \
    -x "*.DS_Store" \
    -x "*/.git/*" \
    -x "*.map"

echo ""
echo "✅ Build complete: $OUTPUT_FILE"
echo ""
echo "To install in Chrome:"
echo "1. Open chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Drag and drop $OUTPUT_FILE onto the page"
echo "   OR click 'Load unpacked' after extracting the zip"
