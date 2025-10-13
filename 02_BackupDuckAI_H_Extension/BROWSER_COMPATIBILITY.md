# Browser Compatibility Guide

## ✅ Supported Browsers

This extension is compatible with all major Chromium-based browsers and Firefox.

### Tested/Compatible Browsers

| Browser | Status | Notes |
|---------|--------|-------|
| **Firefox** | ✅ Full Support | Native `browser.*` API support |
| **Chrome** | ✅ Full Support | Uses `chrome.*` API (compatible with `browser.*`) |
| **Brave** | ✅ Full Support | Chromium-based, same as Chrome |
| **Edge** | ✅ Full Support | Chromium-based, same as Chrome |
| **Opera** | ✅ Full Support | Chromium-based, same as Chrome |
| **Vivaldi** | ✅ Full Support | Chromium-based, same as Chrome |

---

## 🔑 Independent Settings Per Browser

### **YES - Each browser has its own separate settings!**

Each browser maintains its own extension storage, which means:

✅ **Download Folder** - Unique per browser
✅ **Filename Format** - Unique per browser  
✅ **Backup History** - Unique per browser
✅ **Cache** - Unique per browser

### Why This Works

Extensions use `chrome.storage.local` (or `browser.storage.local`), which is **isolated per browser**. This means:

```
Firefox Extension:
  └─ Settings: DuckAI_Backups/, format2
  └─ History: 50 conversations backed up

Chrome Extension:
  └─ Settings: Chrome_Backups/, format3
  └─ History: 30 conversations backed up

Brave Extension:
  └─ Settings: Brave_DuckAI/, format1
  └─ History: 20 conversations backed up
```

### Example Use Cases

**Scenario 1: Different Folders per Browser**
- Firefox → `Firefox_DuckAI_Backups/`
- Chrome → `Chrome_DuckAI_Backups/`
- Brave → `Brave_DuckAI_Backups/`

**Scenario 2: Different Formats per Browser**
- Firefox → Compact Format (format2)
- Chrome → Date First (format3)
- Brave → Legacy Format (format1)

---

## 🔧 API Compatibility

### Downloads API

The extension uses the **WebExtensions Downloads API**:

```javascript
browser.downloads.download({
  url: blobUrl,
  filename: 'folder/file.md',
  saveAs: false
})
```

#### Browser Support

| Browser | API | Status |
|---------|-----|--------|
| Firefox | `browser.downloads.*` | ✅ Native |
| Chrome/Brave/Edge | `chrome.downloads.*` | ✅ Native |

#### Polyfill Support

Modern WebExtensions support both `browser.*` and `chrome.*` namespaces:
- Chrome/Brave/Edge: `chrome.*` is native, `browser.*` is polyfilled automatically
- Firefox: `browser.*` is native, `chrome.*` is aliased to `browser.*`

**Result:** The code works across all browsers without modification!

---

## 📥 Download Location Behavior

### Default Download Folders

Each browser has its own default downloads folder:

| OS | Browser | Default Path |
|----|---------|--------------|
| **macOS** | All Browsers | `~/Downloads/` |
| **Windows** | All Browsers | `C:\Users\[Username]\Downloads\` |
| **Linux** | All Browsers | `~/Downloads/` |

### How Custom Folders Work

When you set a custom folder like `DuckAI_Backups`:
- Files save to: `[Browser Downloads Folder]/DuckAI_Backups/`

**Example on macOS:**
- Firefox: `~/Downloads/DuckAI_Backups/`
- Chrome: `~/Downloads/DuckAI_Backups/`
- Brave: `~/Downloads/DuckAI_Backups/` *(same location by default)*

### Different Locations Per Browser

To have **truly separate locations** per browser:

#### Option 1: Use Different Folder Names (Recommended)
Set different folder names in each browser:
- Firefox → `Firefox_DuckAI/`
- Chrome → `Chrome_DuckAI/`
- Brave → `Brave_DuckAI/`

#### Option 2: Change Browser's Default Downloads Folder
Each browser allows you to change its default downloads folder:

**Chrome/Brave/Edge:**
1. Settings → Downloads
2. Change download location
3. Example: Set to `~/Documents/Chrome_Downloads/`

**Firefox:**
1. Settings → General → Downloads
2. Choose "Save files to" location
3. Example: Set to `~/Documents/Firefox_Downloads/`

Then the extension will save to:
- Firefox → `~/Documents/Firefox_Downloads/DuckAI_Backups/`
- Chrome → `~/Documents/Chrome_Downloads/DuckAI_Backups/`
- Brave → `~/Downloads/DuckAI_Backups/` (if unchanged)

---

## 🧪 Testing Checklist

### Installation Test
- [ ] Extension installs without errors
- [ ] Popup opens correctly
- [ ] All buttons are visible

### Core Functionality Test
- [ ] Load chat titles
- [ ] Download single conversation
- [ ] Download multiple conversations
- [ ] Files appear in correct folder

### Settings Test
- [ ] Change download folder → Save → Verify files go to new folder
- [ ] Change filename format → Verify new format is applied
- [ ] Settings persist after closing/reopening extension

### Cross-Browser Test
- [ ] Install in Firefox, Chrome, and Brave
- [ ] Set different folder names in each
- [ ] Download from each browser
- [ ] Verify files go to correct folders

---

## 🐛 Known Issues & Workarounds

### Issue 1: Downloads Permission Prompt
**Firefox:** May prompt for downloads permission on first use.
**Solution:** Click "Allow" when prompted.

### Issue 2: Folder Creation
**All Browsers:** Subfolders are created automatically.
**Note:** Deep nesting (e.g., `Backups/2025/Q4/October/`) works but may look cluttered.

### Issue 3: Filename Conflicts
**Behavior:** If a file with the same name exists, browsers handle it differently:
- Firefox: Adds `(1)`, `(2)` suffix automatically
- Chrome: Adds `(1)`, `(2)` suffix automatically
- **Solution:** Use date/time in filenames (already implemented in format2/format3)

---

## 🔄 Migration Between Browsers

If you want to **share settings across browsers**:

### Manual Method
1. Open extension in Browser A
2. Note your settings (folder name, format)
3. Open extension in Browser B
4. Enter the same settings

### Advanced: Export/Import Settings
*Not currently implemented, but could be added as a feature:*
- Export settings to JSON file
- Import settings from JSON file
- Share across browsers manually

---

## 📊 Storage Limits

Each browser has storage limits for extensions:

| Browser | Limit | Notes |
|---------|-------|-------|
| Firefox | ~10 MB | For `storage.local` |
| Chrome | ~10 MB | For `storage.local` (unlimited with permission) |
| Brave | ~10 MB | Same as Chrome |

**Impact on Extension:**
- Settings: < 1 KB (negligible)
- Backup History: ~1 KB per 50 conversations
- Cache: ~100 KB - 1 MB
- **Total:** Well within limits ✅

---

## 🛠️ Troubleshooting

### Downloads Not Working

**Symptom:** Clicks download but nothing happens

**Solutions:**
1. Check browser console for errors (F12 → Console)
2. Verify `downloads` permission in manifest
3. Try fallback: Extension should auto-fallback to `<a>` download
4. Check browser's download settings (not blocked/paused)

### Files Going to Wrong Folder

**Symptom:** Files save to default Downloads, not custom folder

**Possible Causes:**
1. Setting not saved → Click "Save" button after changing folder
2. Browser restriction → Some browsers restrict certain folder names
3. Path too long → Keep folder names under 50 characters

**Solutions:**
1. Re-enter folder name and click Save
2. Try simpler folder name (e.g., `Backups` instead of `My/Very/Deep/Folder/Structure`)
3. Check status message after saving

### Settings Not Persisting

**Symptom:** Settings reset after closing popup

**Solution:**
- This shouldn't happen! If it does:
  1. Check browser console for storage errors
  2. Try clearing extension data and reconfiguring
  3. Verify you're clicking the "Save" button

---

## 🚀 Future Enhancements

Potential improvements for cross-browser compatibility:

1. **Auto-detect browser** and suggest folder name (e.g., "Firefox_DuckAI")
2. **Settings sync** via cloud (if user wants same settings everywhere)
3. **Browser-specific presets** for filename formats
4. **Export/Import settings** feature for manual sync
5. **Smart path validation** to prevent browser-specific issues

---

## 📝 Summary

### ✅ What Works
- Full compatibility across Firefox, Chrome, Brave, Edge, Opera, Vivaldi
- Independent settings per browser (stored locally in each browser)
- Custom download folders (relative to each browser's downloads folder)
- Custom filename formats
- No code changes needed for different browsers

### ⚙️ Configuration Tips
- **Same Folder Across Browsers:** Use the same folder name (files go to same location)
- **Different Folders Per Browser:** Use browser-specific folder names
- **Truly Separate Locations:** Change each browser's default downloads folder

### 🎯 Best Practice
Set folder name to include browser name for clarity:
- Firefox → `Firefox_DuckAI`
- Chrome → `Chrome_DuckAI`
- Brave → `Brave_DuckAI`

This ensures you always know which browser created which backup!
