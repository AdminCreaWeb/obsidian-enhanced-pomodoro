# Deployment Guide

## Quick Deployment (Development/Personal Use)

### Firefox (Fastest - No Review)
```bash
# 1. Build XPI
./build-extension.sh

# 2. Install temporarily
# - Open Firefox → about:debugging
# - Click "This Firefox" → "Load Temporary Add-on"
# - Select: build/duckduckgo-ai-backup-v1.0-firefox.xpi
# - Limitation: Resets on browser restart

# 3. OR install permanently (self-distributed)
# - Go to: https://addons.mozilla.org/developers/
# - Submit for "Self-Distribution" (not AMO listing)
# - Wait 5-10 minutes for automatic signing
# - Download signed XPI
# - Drag to Firefox to install permanently
```

### Chrome/Brave/Edge (Development)
```bash
# 1. No build needed - use unpacked extension
# - Chrome → chrome://extensions
# - Enable "Developer mode"
# - Click "Load unpacked"
# - Select extension folder
# - Works immediately!
```

---

## Public Distribution

### Firefox Add-ons (AMO)

**Pros:**
- Free
- Automatic updates
- User trust (official store)
- Firefox Sync integration

**Cons:**
- Review takes 1-2 weeks (initial)
- Updates reviewed (usually < 24 hours)
- Must follow strict policies

**Steps:**
1. Create account at https://addons.mozilla.org/developers/
2. Click "Submit a New Add-on"
3. Upload: `build/duckduckgo-ai-backup-v1.0-firefox.xpi`
4. Fill out listing details:
   - Name: DuckDuckGo AI Backup
   - Description: Backup and export DuckDuckGo AI conversations
   - Category: Productivity
   - License: MIT (or your choice)
   - Screenshots (optional but recommended)
5. Submit for review
6. Wait for approval (1-2 weeks)
7. Users install from: https://addons.mozilla.org

**Update Process:**
- Build new version (update `manifest.json` version)
- Upload new XPI
- Review typically < 24 hours
- Auto-updates to users

---

### Chrome Web Store

**Pros:**
- Works on Chrome, Brave, Edge, Opera automatically
- Large user base
- Automatic updates

**Cons:**
- $5 one-time developer fee
- Review takes 1-2 days (usually hours)
- Stricter privacy policies

**Steps:**
1. Go to: https://chrome.google.com/webstore/devconsole
2. Pay $5 developer fee (one-time)
3. Click "New Item"
4. Upload: `build/duckduckgo-ai-backup-v1.0-chrome.zip`
5. Fill out store listing:
   - Title: DuckDuckGo AI Backup
   - Description: Backup and export conversations
   - Category: Productivity
   - Icon: 128x128 PNG
   - Screenshots: 1280x800 or 640x400
   - Privacy policy URL (if collecting data - you're not)
6. Submit for review
7. Approval usually within hours
8. Users install from Chrome Web Store

**Update Process:**
- Build new version
- Upload new ZIP
- Review typically < 2 hours
- Auto-updates to users

---

### Edge Add-ons

**Note:** Edge uses Chrome extensions, but has its own store.

**Steps:**
1. Go to: https://partner.microsoft.com/dashboard
2. Create Partner Center account (free)
3. Upload same Chrome ZIP
4. Usually approved within 24 hours
5. Reach Edge users specifically

**Usually not needed** - Most Edge users install from Chrome Web Store.

---

## Build Checklist

Before building/submitting:

### Code Quality
- [ ] Remove console.log statements (except critical errors)
- [ ] Remove commented-out code
- [ ] Clean up backup files (popup_B4_*.js, etc.)
- [ ] Update version in manifest.json
- [ ] Test in clean browser profile

### Files to Include
- [ ] manifest.json
- [ ] background.js
- [ ] content_script.js
- [ ] popup/ (only popup.html, popup.js, popup.css if exists)
- [ ] lib/ (jsencrypt.min.js, crypto-js.min.js)
- [ ] icons/ (if you have custom icons)

### Files to EXCLUDE
- [ ] *.md (documentation)
- [ ] build/ (build directory)
- [ ] .git/ (.DS_Store, etc.)
- [ ] Old backup files (popup_B4_*.js, popup_backup*.js)
- [ ] Test files (test_*.js, debug_*.js)

### Documentation
- [ ] README.md with clear description
- [ ] CHANGELOG.md with version history
- [ ] Privacy policy (if submitting to stores)
- [ ] Screenshots for store listing

---

## Privacy Policy (Required for Stores)

**Do you collect data?**
- ❌ No analytics
- ❌ No telemetry
- ❌ No server communication
- ✅ All data stored locally
- ✅ No external API calls (except DuckDuckGo itself)

**Sample Privacy Policy:**
```
This extension does not collect, store, or transmit any user data.
All conversation backups are stored locally on your device.
No analytics or tracking of any kind is performed.
```

You can host this on GitHub or include in store listing.

---

## Version Management

### Semantic Versioning

```
Major.Minor.Patch
1.0.0
```

- **Major (1.x.x):** Breaking changes
- **Minor (x.1.x):** New features (e.g., filename formats added)
- **Patch (x.x.1):** Bug fixes

**Example Timeline:**
- `1.0.0` - Initial release
- `1.1.0` - Added filename formats + custom folders (current)
- `1.1.1` - Fixed bug in duplicate detection
- `1.2.0` - Added Obsidian integration (future)
- `2.0.0` - Complete UI redesign (breaking)

---

## Build Script Usage

```bash
# Make executable (first time only)
chmod +x build-extension.sh

# Build all packages
./build-extension.sh

# Output:
# build/duckduckgo-ai-backup-v1.0-firefox.xpi
# build/duckduckgo-ai-backup-v1.0-chrome.zip
# build/duckduckgo-ai-backup-v1.0-source.zip
```

---

## Store Listing Tips

### Good Title
✅ "DuckDuckGo AI Chat Backup"  
✅ "DuckDuckGo Conversation Export"  
❌ "DDGAI Backup" (too vague)

### Good Description
```
Easily backup and export your DuckDuckGo AI chat conversations.

Features:
• Export conversations as Markdown files
• Custom download folders
• Multiple filename formats
• Full conversation content backup
• Duplicate detection
• Works offline - no external servers

Perfect for:
• Archiving important conversations
• Creating personal knowledge bases
• Organizing research notes
• Backing up before clearing history
```

### Screenshots (Recommended)
1. Extension popup with conversation list
2. Settings section showing custom folder
3. Downloaded files in folder
4. Markdown file preview

Size: 1280x800 or 640x400 (Chrome), any size (Firefox)

---

## Distribution Comparison

| Method | Effort | Reach | Updates | Trust |
|--------|--------|-------|---------|-------|
| **Unpacked** | 1 min | Self only | Manual | N/A |
| **Self-Hosted XPI** | 5 min | Friends | Manual | Low |
| **Firefox AMO** | 30 min + wait | All Firefox | Auto | High |
| **Chrome Store** | 30 min + $5 | All Chromium | Auto | High |

**Recommendation for Personal Use:** Self-hosted signed XPI (Firefox) or unpacked (Chrome)

**Recommendation for Public:** Both Firefox AMO + Chrome Web Store

---

## Troubleshooting

### Firefox Signing Failed
**Error:** "This add-on could not be signed"  
**Solution:** Check manifest.json for errors, especially permissions array

### Chrome Upload Rejected
**Error:** "Manifest version 3 required"  
**Solution:** Already using V3, check for syntax errors

### Store Review Rejection
**Common reasons:**
1. Missing privacy policy
2. Unclear permissions explanation
3. Broken functionality in reviewer's test
4. Trademark issues (using "DuckDuckGo" name)

**Solutions:**
1. Add privacy policy
2. In store listing, explain why each permission is needed
3. Test in clean browser before submitting
4. Consider renaming to "AI Chat Backup for DuckDuckGo" (more generic)

---

## Maintenance Plan

**Quarterly Check (every 3 months):**
1. Test extension on latest browser version
2. Check if DuckDuckGo changed their site structure
3. Update dependencies if needed
4. Fix any reported issues

**Annual Review:**
1. Check for new browser APIs
2. Review security best practices
3. Consider new features based on feedback

---

## Summary

**Quickest Path to Use:**
1. Run `./build-extension.sh`
2. Drag XPI to Firefox (will reset on restart)
3. OR submit to AMO for self-distribution (10 min wait, permanent)

**Best for Public Distribution:**
1. Submit to Firefox AMO (free, 1-2 week wait)
2. Submit to Chrome Store ($5, 1-2 day wait)
3. Reach 99% of users

**Maintenance:**
- Low effort: Mostly stable APIs
- Main risk: DuckDuckGo website changes
- Test quarterly, update as needed
