# Quick Debug Steps - Diagnose Download Issues

## 🚨 Issue: Files Not Going to Custom Folder

### Step 1: Reload Extension
```
1. Right-click extension icon → "Manage Extension"
2. Click "Reload" button
3. Close and reopen popup
```

### Step 2: Check Settings in Console

1. **Open extension popup**
2. **Press F12** (opens console)
3. **Click "🔧 Show Settings" button**
4. **Check console output:**

```
=== ALL STORED SETTINGS ===
Download Folder: YourFolderName    ← Should show your folder
Filename Format: format2           ← Should show your format
Obsidian Mode: false              ← Should match your setting
Obsidian Vault Path: ...          ← If using Obsidian
===========================
```

**If "Download Folder" shows "NOT SET" or wrong value:**
- Your setting didn't save
- Try Step 3

### Step 3: Save Folder Again (With Console Open)

1. **Keep console open** (F12)
2. **Enter folder name**: `TestFolder`
3. **Click "Save"**
4. **Watch console for:**

```
✅ Download folder saved: TestFolder
Verification - Stored value: TestFolder
```

**If you see these messages:** Setting saved successfully!  
**If you DON'T see these messages:** JavaScript error occurred - check console for red errors

### Step 4: Test Download (With Console Open)

1. **Keep console open**
2. **Download one conversation**
3. **Watch console for:**

```
📁 getDownloadFolder() returning: TestFolder
Downloading to: TestFolder/duckai_2025-10-11_conversation_001_Title.md
```

**If path shown is correct:**
- Extension is working
- Browser might be rejecting the path
- Try a simpler folder name (no spaces, no special chars)

**If path shows "DuckAI_Backups" (default):**
- Setting not loading
- Try clearing extension data and reconfiguring

### Step 5: Check Browser Download Manager

After download completes:

**Firefox:**
- Press `Ctrl+Shift+Y` (or `Cmd+Shift+Y` on Mac)
- Find the file
- Right-click → "Show in Folder"
- **Check actual location**

**Chrome/Brave:**
- Press `Ctrl+J` (or `Cmd+J` on Mac)
- Find the file
- Click folder icon
- **Check actual location**

---

## 🔮 Issue: Obsidian Vault Not Working

### Understanding the Limitation

**Browser Security Restriction:**
- The `downloads` API **CANNOT** write to absolute paths like `/Users/.../Obsidian/MyVault`
- It **CAN ONLY** write to relative paths within the Downloads folder

### Current Behavior with Absolute Paths

When you use `/Users/.../Obsidian/MyVault`:
1. Extension detects absolute path
2. Browser shows "Save As" dialog
3. **You manually navigate to vault folder**
4. Click save
5. File is saved with frontmatter

This is **intentional** - it's a workaround for the browser limitation.

### Solutions for Automatic Downloads to Vault

#### Solution A: Change Browser Download Folder (Recommended)

**Firefox:**
```
1. Settings → General → Downloads
2. Click "Browse"
3. Select: /Users/.../Obsidian/MyVault
4. In extension:
   - Obsidian Mode: OFF (or use relative path)
   - Download Folder: DuckAI_Conversations
5. Files go to: /Users/.../Obsidian/MyVault/DuckAI_Conversations/
```

**Chrome/Brave:**
```
1. Settings → Downloads
2. Change Location → Select vault
3. In extension: Use relative folder name
```

#### Solution B: Use Relative Path (If Vault is in Downloads)

If your vault happens to be in Downloads already:
```
Downloads/
  └── MyVault/        ← Your vault

Extension settings:
  - Vault Path: MyVault
  - Subfolder: DuckAI_Conversations
  
Result: Downloads/MyVault/DuckAI_Conversations/
```

#### Solution C: Symbolic Link (Advanced)

```bash
# Create link from Downloads to vault
cd ~/Downloads
ln -s ~/Documents/Obsidian/MyVault MyVault

# Then in extension:
Vault Path: MyVault (relative)
```

---

## 🧪 Quick Test Script

Paste this in browser console (F12) while popup is open:

```javascript
// Check all settings
chrome.storage.local.get(null, (data) => {
  console.log('All settings:', data);
});

// Test saving a folder
chrome.storage.local.set({
  'duckAI_download_folder': 'TestFolder123'
}, () => {
  console.log('Test folder saved');
  
  // Verify it worked
  chrome.storage.local.get(['duckAI_download_folder'], (result) => {
    console.log('Verified:', result.duckAI_download_folder);
  });
});
```

---

## ✅ Working Configuration Examples

### Example 1: Simple Custom Folder (Most Common)

```
Settings:
  - Obsidian Mode: OFF
  - Download Folder: MyBackups
  - Filename Format: Compact

Result:
  Downloads/MyBackups/duckai_2025-10-11_conversation_001_Title.md
```

### Example 2: Nested Folder

```
Settings:
  - Obsidian Mode: OFF
  - Download Folder: Backups/DuckAI/2025
  - Filename Format: Date First

Result:
  Downloads/Backups/DuckAI/2025/2025-10-11_duckai_001_Title.md
```

### Example 3: Obsidian with Manual Save

```
Settings:
  - Obsidian Mode: ON
  - Vault Path: /Users/kirikou/Documents/Obsidian/MyVault
  - Subfolder: DuckAI_Conversations
  - Frontmatter: ON

Process:
  1. Click "Start Backup"
  2. Browser shows "Save As" dialog
  3. Navigate to: MyVault/DuckAI_Conversations/
  4. Click Save
  5. File saved with YAML frontmatter
```

### Example 4: Obsidian with Auto-Download

```
Browser Setup:
  - Change download folder to: /Users/.../Obsidian/MyVault

Extension Settings:
  - Obsidian Mode: ON (or OFF, doesn't matter)
  - Download Folder: DuckAI_Conversations (relative)
  - Frontmatter: ON

Result:
  Auto-downloads to: MyVault/DuckAI_Conversations/
  With YAML frontmatter if Obsidian mode ON
```

---

## 🔧 Reset Everything (Nuclear Option)

If nothing works, reset all settings:

```javascript
// Paste in console (F12)
chrome.storage.local.clear(() => {
  console.log('All settings cleared');
  alert('Settings cleared - reload extension');
});
```

Then:
1. Reload extension
2. Reconfigure from scratch

---

## 📞 Still Stuck?

**Collect this info:**

1. Browser console output after clicking "🔧 Show Settings"
2. Browser console output after saving folder
3. Browser console output after downloading
4. Actual file location from download manager
5. Browser version (Help → About)

This will help diagnose the exact issue!
