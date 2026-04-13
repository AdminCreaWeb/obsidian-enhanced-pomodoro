# Duck.AI Backup Extension (v2.2.1)

A browser extension to backup and export your conversations from [duck.ai](https://duck.ai).

## ✨ What's New in v2.2.1

**Bug Fixes:**
- 🐛 Fixed export of captured chats — downloads no longer fail when popup closes (blob URLs revoked after download completes)
- 🐛 Fixed Export All getting stuck at ~24 files due to Firefox rate limiting (added delays between batch downloads)
- 🐛 Fixed all modals showing on load (duplicate CSS `display` property conflict)
- 🐛 Hidden "Export All" / "Clear All" buttons when captured list is empty

**UI Improvements:**
- ✕ Sticky close buttons at top of every modal — no more scrolling to close
- 📋 Unified workflow panel: Capture All → Full Backup → Auto-Backup → Import
- 📊 Backup Status Report now cross-matches conversations across all sources with icons:
  - 🔍 Click-Captured | 🔄 Auto-Backup | 📥 Manual Import | 💾 Full Backup
- 🎨 All modals properly sized to fit within popup (396px × 550px)

**New Features:**
- 🔄 Capture All acts as full refresh — stale entries (deleted/renamed chats) are automatically removed
- ⏸️ Pause/Resume capture — Cancel pauses, Continue resumes from where it stopped

## What's New in v2.2.0

**Auto-Backup Feature:**
- ⏰ **Automatic backups** - Saves conversations every 5/10/15/30 minutes while on duck.ai
- 📚 **Version history** - Keeps up to 5 versions of each conversation
- 🔄 **Rename tracking** - Tracks title changes, never loses content
- 💾 **Internal storage** - No download spam, export when ready
- 📥 **Export options** - Export individual conversations or all at once

**How it works:**
1. Enable Auto-Backup in the extension popup
2. Keep duck.ai open in a tab
3. Conversations are automatically saved to extension storage
4. View and export backups anytime from "📦 View Backups"

**Import Old Backups:**
- 📤 Import .txt/.md files from previous Duck.ai exports via sidebar
- Drag & drop or click to select files
- Automatically parses title, date, and content
- Duplicate detection by content hash
- Delete imports you no longer need

## What's New in v2.1

**Complete rewrite** using localStorage extraction:
- ⚡ **Instant** - All conversations extracted in 1-2 seconds
- ✅ **Always full content** - No more partial backups
- 🔒 **Reliable** - No dependency on HTML/CSS structure
- 🌐 **Cross-browser** - Firefox, Chrome, Brave

## Features

- ✅ Export to Markdown format
- ✅ Smart duplicate detection
- ✅ Obsidian frontmatter integration
- ✅ Multiple filename formats
- ✅ Backup history tracking
- ✅ Visual status indicators

## Installation

| Browser | Instructions |
|---------|-------------|
| **Firefox** | `about:debugging` → Load Temporary Add-on → Select `manifest.json` |
| **Chrome** | `chrome://extensions` → Developer mode → Load unpacked |
| **Brave** | `brave://extensions` → Developer mode → Load unpacked |

## Usage

1. Go to [duck.ai](https://duck.ai)
2. Click extension icon
3. Click **Load Chat-titles** (extracts instantly)
4. Select conversations → **Download .md**

## Controls

| Control | Description |
|---------|-------------|
| **🔍 Capture All** | Auto-capture full content from all sidebar chats |
| **💾 Full Backup** | Download all conversations as .md files |
| **Toggle All** | Select/deselect all conversations |
| **⚡ Quick Download** | Download currently open conversation |
| **🔍 Captured** | View click-captured chats |
| **📊 Backup Status** | View cross-source backup status with icons |
| **🔄 Auto-Backup** | Enable periodic auto-saving of conversations |
| **� Manual Import** | Import old Duck.ai export files |

## Visual Indicators

| Icon | Meaning |
|------|---------|
| ✅ | Full backup exists (up to date) |
| 🔄 | Updated (needs re-backup) |
| ⭕ | Not backed up yet |
| ⚠️ | Partial backup (from older version) |
| � | Click-Captured source |
| 🔄 | Auto-Backup source |
| 📥 | Manual Import source |
| 💾 | Full Backup (downloaded) source |

## Settings

### Filename Formats
Choose from multiple naming conventions in Settings:
- `duckai_2026-01-29_conversation_001_Title.md` (default)
- `duckai_conversation_1_Title_FULL_2026-01-29.md`
- `2026-01-29_duckai_001_Title_FULL.md`
- `Title_2026-01-29.md`

### Obsidian Integration
Enable frontmatter to add YAML metadata compatible with Obsidian:
```yaml
---
tags:
  - duckduckgo
  - ai-conversation
  - full-backup
date: 2026-01-29
backup_type: FULL
---
```

## Privacy

- ✅ All processing happens locally in your browser
- ✅ No data is sent to external servers
- ✅ Files saved directly to your Downloads folder
- ✅ Uses browser's local storage for cache and history

## Troubleshooting

### "No saved chats found"
- Make sure you're on **duck.ai** (not duckduckgo.com)
- You need at least one conversation saved
- Try refreshing the page

### Extension not loading conversations
- Check browser console for errors
- Verify the extension has permission for duck.ai
- Try reloading the extension

## Technical Details

### v2.1 Architecture
- Reads `localStorage.savedAIChats` directly
- Parses JSON structure containing all conversations
- Formats messages into Markdown with timestamps
- No HTML parsing or DOM manipulation needed

### Browser Compatibility
- Firefox 109+
- Chrome (Manifest V3)
- Brave (Manifest V3)

## License
MIT - Use responsibly and respect Duck.ai's terms of service.

## Credits
This extension was developed with significant assistance from AI coding tools (Claude/Cascade).
Ideas, testing, debugging, and project direction by Stefan.