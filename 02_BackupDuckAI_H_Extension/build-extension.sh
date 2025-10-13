#!/bin/bash
# Build script for DuckDuckGo AI Backup Extension

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Building DuckDuckGo AI Backup Extension...${NC}"

# Get version from manifest.json
VERSION=$(grep -o '"version": "[^"]*' manifest.json | grep -o '[^"]*$')
echo -e "Version: ${GREEN}${VERSION}${NC}"

# Create build directory
mkdir -p build

# Build Firefox XPI
echo -e "\n${BLUE}Creating Firefox XPI...${NC}"
zip -r "build/duckduckgo-ai-backup-v${VERSION}-firefox.xpi" \
  manifest.json \
  background.js \
  content_script.js \
  popup/ \
  lib/ \
  -x "*.DS_Store" \
  -x "**/popup_*.js" \
  -x "popup/popup_B4_*" \
  -x "popup/popup_backup*" \
  -x "popup/popup_simple.js"

echo -e "${GREEN}✓ Firefox XPI created: build/duckduckgo-ai-backup-v${VERSION}-firefox.xpi${NC}"

# Build Chrome/Brave ZIP
echo -e "\n${BLUE}Creating Chrome/Brave ZIP...${NC}"
zip -r "build/duckduckgo-ai-backup-v${VERSION}-chrome.zip" \
  manifest.json \
  background.js \
  content_script.js \
  popup/ \
  lib/ \
  -x "*.DS_Store" \
  -x "**/popup_*.js" \
  -x "popup/popup_B4_*" \
  -x "popup/popup_backup*" \
  -x "popup/popup_simple.js"

echo -e "${GREEN}✓ Chrome ZIP created: build/duckduckgo-ai-backup-v${VERSION}-chrome.zip${NC}"

# Create source code archive (for AMO submission)
echo -e "\n${BLUE}Creating source code archive...${NC}"
zip -r "build/duckduckgo-ai-backup-v${VERSION}-source.zip" \
  . \
  -x "*.git*" \
  -x "*.DS_Store" \
  -x "build/*" \
  -x "lib/jsencrypt.min.js" \
  -x "lib/crypto-js.min.js"

echo -e "${GREEN}✓ Source archive created: build/duckduckgo-ai-backup-v${VERSION}-source.zip${NC}"

echo -e "\n${GREEN}Build complete!${NC}"
echo -e "\nFiles created in ${BLUE}build/${NC} directory:"
ls -lh build/

echo -e "\n${BLUE}Next steps:${NC}"
echo -e "1. Firefox: Upload XPI to https://addons.mozilla.org/developers/"
echo -e "2. Chrome: Upload ZIP to https://chrome.google.com/webstore/devconsole"
echo -e "3. Keep source.zip for AMO review if requested"
