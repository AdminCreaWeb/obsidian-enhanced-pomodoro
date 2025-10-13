# Troubleshooting Download Issues

## 🔍 Quick Diagnosis

### Issue 1: Files Going to Downloads Folder (Not Custom Folder)

**Check the browser console:**
1. Open extension popup
2. Press F12 (or right-click → Inspect)
3. Go to Console tab
4. Click "Save" on your custom folder setting
5. Look for these messages:
   ```
   ✅ Download folder saved: YourFolderName
   Verification - Stored value: YourFolderName
   ```

6. Try downloading a conversation
7. Look for:
   ```
   📁 getDownloadFolder() returning: YourFolderName
   Downloading to: YourFolderName/filename.md
   ```

**If you see these messages but files still go to Downloads root:**

This is a **browser limitation**. The `browser.downloads.download()` API has restrictions:

- ✅ **Works**: Relative paths like `DuckAI_Backups`
- ❌ **Fails silently**: Absolute paths like `/Users/.../folder`
- ❌ **Fails silently**: Parent directory references like `../folder`
- ❌ **Fails**: Invalid characters in path

---

## 🛠️ Solutions

### Solution 1: Use Simple Folder Names (Recommended)

**Instead of:**
- ❌ `/Users/kirikou/Documents/Backups`
- ❌ `../MyBackups`
- ❌ `My Backups` (spaces can cause issues)

**Use:**
- ✅ `DuckAI_Backups`
- ✅ `AI_Conversations`
- ✅ `Backups/DuckAI`

**Where they go:**
- `DuckAI_Backups` → `Downloads/DuckAI_Backups/`
- `Backups/DuckAI` → `Downloads/Backups/DuckAI/`

### Solution 2: Change Browser's Download Folder

If you want files outside Downloads:

**Firefox:**
1. Settings → General → Downloads
2. Click "Browse"
3. Select your desired folder (e.g., `~/Documents/MyBackups`)
4. In extension, set folder to: `DuckAI` (relative)
5. Files go to: `~/Documents/MyBackups/DuckAI/`

**Chrome/Brave:**
1. Settings → Downloads
2. Change "Location"
3. Select your folder
4. In extension, use relative folder name

---

## 🔮 Obsidian Integration Issues

### Issue: Files Not Going to Obsidian Vault

**The Problem:**
Absolute paths like `/Users/.../Obsidian/MyVault` don't work with the downloads API due to browser security restrictions.

**Current Behavior:**
- Absolute path → Browser shows "Save As" dialog
- You manually navigate to vault
- File is saved with frontmatter

**Workarounds:**

#### Workaround A: Change Browser Download Folder to Vault
1. Set browser's download folder to your Obsidian vault
2. In extension, set subfolder: `DuckAI_Conversations`
3. Files auto-download to vault

#### Workaround B: Use Symbolic Link (Advanced)
```bash
# macOS/Linux
cd ~/Downloads
ln -s ~/Documents/Obsidian/MyVault MyVault

# Then in extension, use relative path:
# Vault Path: MyVault
```

#### Workaround C: Manual Save (Current Implementation)
- Use absolute path
- Browser shows save dialog
- Navigate to vault/subfolder
- Click save

---

## 🧪 Testing Your Setup

### Test 1: Verify Folder Setting is Saved

1. Open extension popup
2. Open browser console (F12)
3. Enter folder name: `TestFolder`
4. Click "Save"
5. **Look for:** `✅ Download folder saved: TestFolder`
6. **Look for:** `Verification - Stored value: TestFolder`

If you don't see these messages:
- Extension error occurred
- Check for JavaScript errors in console

### Test 2: Verify Folder is Used in Download

1. With console still open
2. Download a single conversation
3. **Look for:** `📁 getDownloadFolder() returning: TestFolder`
4. **Look for:** `Downloading to: TestFolder/filename.md`

If path shown is correct but file goes elsewhere:
- Browser is rejecting the path
- Try simpler folder name (no spaces, no special chars)

### Test 3: Check Actual Download Location

1. After download, check browser's download manager
2. Firefox: Ctrl+Shift+Y (or Tools → Downloads)
3. Chrome: Ctrl+J
4. Right-click file → "Show in folder"
5. **Should see:** `Downloads/TestFolder/filename.md`

---

## 🐛 Common Issues

### Issue: Folder Name Disappears After Reload

**Cause:** Storage not persisting

**Fix:**
1. Check browser console for storage errors
2. Try: Right-click extension → Manage → Reload
3. Clear extension storage: Settings → Extensions → Extension Details → Clear Data
4. Reconfigure

### Issue: Files Download with Wrong Names

**Cause:** Filename format not applied

**Fix:**
1. Select filename format from dropdown
2. Wait for confirmation message
3. Try download again

### Issue: Obsidian Frontmatter Missing

**Cause:** Obsidian mode not enabled or checkbox unchecked

**Fix:**
1. Expand "🔮 Obsidian Integration"
2. Check "Enable Obsidian Mode"
3. Ensure "Add YAML frontmatter" is checked
4. Save settings

---

## 📊 Debug Information to Collect

If still having issues, collect this info:

1. **Browser version:**
   - Firefox: Help → About Firefox
   - Chrome/Brave: Settings → About

2. **Console output:**
   - Open console before clicking Save
   - Copy all messages after clicking Save
   - Copy all messages after downloading

3. **Storage inspection:**
   ```javascript
   // Paste in console:
   chrome.storage.local.get(null, (data) => console.log(data));
   ```
   - Shows all stored settings

4. **Extension manifest:**
   - Check `manifest.json` has `"downloads"` permission

---

## 🔧 Manual Fixes

### Reset All Settings

```javascript
// Paste in browser console while popup is open:
chrome.storage.local.clear(() => {
  console.log('All settings cleared');
  location.reload();
});
```

### Check Specific Setting

```javascript
// Check download folder setting:
chrome.storage.local.get(['duckAI_download_folder'], (result) => {
  console.log('Current folder:', result.duckAI_download_folder);
});

// Check Obsidian mode:
chrome.storage.local.get(['duckAI_obsidian_mode'], (result) => {
  console.log('Obsidian mode:', result.duckAI_obsidian_mode);
});
```

### Manually Set Folder

```javascript
// Force set folder:
chrome.storage.local.set({
  'duckAI_download_folder': 'MyCustomFolder'
}, () => {
  console.log('Folder manually set');
});
```

---

## ✅ Expected Behavior Summary

### Standard Mode (Default)

| Setting | Expected Result |
|---------|-----------------|
| Folder: `DuckAI_Backups` | → `Downloads/DuckAI_Backups/file.md` |
| Folder: `Backups/AI` | → `Downloads/Backups/AI/file.md` |
| Folder: (empty) | → `Downloads/DuckAI_Backups/file.md` |

### Obsidian Mode

| Vault Path | Result |
|------------|--------|
| `MyVault` (relative) | → `Downloads/MyVault/subfolder/file.md` |
| `/full/path` (absolute) | → Manual save dialog |
| (empty) | → Falls back to standard mode |

---

## 📞 Still Not Working?

1. **Check browser console** for errors
2. **Reload extension**: Right-click → Manage → Reload
3. **Try incognito mode** (to rule out other extensions)
4. **Check permissions**: Extension should have `downloads` permission
5. **Try Firefox** if on Chrome (or vice versa) to isolate browser-specific issues

---

**Most common fix:** Use simple folder names like `DuckAI_Backups` instead of absolute paths!
