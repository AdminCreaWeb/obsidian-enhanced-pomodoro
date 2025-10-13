# DuckDuckGo AI Chat Backup Extension

A browser extension to backup and export your conversations from Duck.ai (DuckDuckGo AI Chat).

## Features

- ✅ Export conversations to Markdown format
- ✅ **Two backup modes:** Fast (2 seconds) or Full (complete content for all conversations)
- ✅ **Smart duplicate detection** with content hashing
- ✅ **Backup quality tracking** - knows which backups are full vs. partial
- ✅ **Visual indicators** (✅/⚠️) showing backup status for each conversation
- ✅ **Automatic upgrades** - partial backups can be upgraded to full content
- ✅ **Backup Status Dashboard** - see detailed breakdown of all your backups
- ✅ Caching system (5-minute cache to avoid repeated page parsing)
- ✅ Backup history tracking
- ✅ Progress indicators for long operations

## Two Backup Modes

### 🔄 Full Backup Mode (Default - RECOMMENDED ⭐)
- **Speed:** ~2 seconds per conversation
- **What you get:** FULL content for ALL conversations
- **How it works:** Automatically clicks through each conversation, waits for it to load, extracts full content
- **Use when:** Most use cases - complete, reliable backups
- **Status:** **Enabled by default** - just click "Load Chat-titles"
- **Example:** 10 conversations = ~20 seconds, 25 conversations = ~50 seconds

### 🚀 Fast Mode (Optional)
- **Speed:** Very fast (1-2 seconds total)
- **What you get:** All conversation titles + preview text only (partial backups)
- **Use when:** 
  - Quick index to see what conversations you have
  - Poor/spotty internet connection
  - 100+ conversations and time-constrained
- **Enable:** Uncheck the "Full Backup Mode" checkbox
- **⚠️ Note:** Results in partial backups that can be upgraded later

### Content Source Indicators
Each exported file includes a header showing the content source:
- `✅ FULL CONTENT` - Complete conversation from main view
- `⚠️ LIMITED CONTENT` - Only sidebar preview text
- `⚠️ NO CONTENT` - Only the conversation title

## How to Use

### Installation

1. Load the extension in your browser:
   - **Firefox:** Go to `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → Select `manifest.json`
   - **Chrome:** Go to `chrome://extensions/` → Enable Developer Mode → Load Unpacked → Select extension folder

### Backing Up Conversations

#### Standard Usage (Full Backup Mode - Default ⭐)
1. **Navigate to Duck.ai**
2. **Click the extension icon** in your browser toolbar
3. **Click "Load Chat-titles"** button (Full Backup Mode is already checked by default)
   - The extension will automatically click through each conversation
   - You'll see the UI switching between chats (this is normal!)
   - Takes ~2 seconds per conversation
   - Progress bar shows "Clicking conversation X/Y..."
   - Single-click: Uses cache if available (faster)
   - Double-click: Forces fresh data extraction
4. **Wait for completion** - Status will show "✅ Full Backup: X conversations (Y with full content)"
5. **Select conversations** you want to backup using the checkboxes
6. **Click "Download .md"** to export selected conversations

#### Fast Mode (Optional - For Quick Index)
1. **Navigate to Duck.ai**
2. **Click the extension icon**
3. **❌ Uncheck "Full Backup Mode (Recommended)"** checkbox
4. **Click "Load Chat-titles"**
   - Very fast (1-2 seconds total)
   - Gets titles + previews only
   - Good for quick overview or poor connections
5. **Select and download** as usual
   - **Note:** Will result in partial backups (can be upgraded later)

### Understanding the Export

Each exported file includes:
- Conversation title
- Export timestamp
- Content hash (for duplicate detection)
- Content source indicator (full/limited/title only)
- The conversation content in Markdown format
- Metadata footer with export details

### Tips for Best Results

1. **Use the default (Full Backup Mode):** It's enabled by default for a reason - complete, reliable backups
2. **Don't interrupt Full Backup Mode:** Let it complete clicking through all conversations
3. **Expected time:** ~2 seconds × number of conversations (e.g., 10 chats = ~20 seconds, 25 chats = ~50 seconds)
4. **For poor connections:** Uncheck Full Backup Mode to get quick title index, upgrade later when connection improves
5. **Check backup status:** Click "📊 Backup Status" to see which conversations have full vs. partial backups
6. **Upgrade partial backups:** Re-run Full Backup Mode on conversations with ⚠️ indicator to upgrade them

## Controls Explained

- **Toggle All** - Select/deselect all conversations
- **Load Chat-titles** - Scan the page and load available conversations (double-click to force refresh)
- **Download .md** - Export selected conversations as Markdown files
- **Full Backup Mode** ⭐ - Checkbox to enable auto-clicking through all conversations for full content
- **Clear Cache** - Remove cached conversation data (forces fresh scan next time)
- **View History** - See your previous backup operations
- **Clear History** - Delete backup history (doesn't affect downloaded files)
- **📊 Backup Status** 🆕 - View detailed breakdown of full vs. partial backups
- **🔍 Debug Page** - Technical debug tool to test page structure detection

## Visual Indicators

After loading conversations, you'll see status indicators:

- **✅ Green checkmark** - Full backup exists (hover to see date)
- **⚠️ Yellow warning** - Partial backup exists (can be upgraded with Full Backup Mode)
- **No indicator** - Not backed up yet

## Caching System

- Conversations are cached for **5 minutes** after scanning
- Cache prevents unnecessary page re-parsing
- Double-click "Load Chat-titles" to force bypass cache
- "Clear Cache" button manually removes cached data

## Duplicate Detection

The extension tracks previously downloaded conversations using content hashing:
- Attempts to re-download the same conversation will be marked as duplicates
- Duplicate files include a warning header
- Helps avoid cluttering your backup folder with duplicates

## File Naming

Files are named: `duckai_conversation_[N]_[title]_[date].md`
- `[N]` - Sequential number in current export batch
- `[title]` - First 50 characters of conversation title (sanitized)
- `[date]` - Export date in ISO format (YYYY-MM-DD)

## Technical Details

### Content Extraction Strategy

The extension uses a multi-strategy approach:

1. **Main Content Extraction:**
   - Searches for `<main>` element
   - Looks for message containers using multiple selectors
   - Extracts both text and HTML for better formatting

2. **Sidebar Parsing:**
   - Tries multiple selectors to find conversation list items
   - Filters out UI elements (buttons, menus)
   - Falls back gracefully if specific selectors fail

3. **Fallback Chain:**
   - Full main content → Sidebar preview → Title only

### Known Issues & Solutions

1. **Obfuscated CSS classes:** Duck.ai uses randomized CSS class names that may change
   - ✅ **Solution:** Extension tries 7+ different selector strategies for resilience
   
2. **~~Single conversation limitation~~** SOLVED! 
   - ✅ **Solution:** Use Full Backup Mode to automatically navigate through all conversations

3. **Dynamic content loading:** Some content may load asynchronously
   - ✅ **Solution:** Full Backup Mode waits 1.8 seconds between clicks for content to load
   - **Tip:** If extracts seem incomplete, wait for page to fully load before starting

4. **Full Backup Mode is slower**
   - This is expected - it needs time to click and load each conversation
   - ~2 seconds per conversation is normal
   - For 20 conversations, expect ~40 seconds total

## Development

To modify or debug:

1. Check browser console for detailed logs
2. Use the "🔍 Debug Page" button to test selector detection
3. Content extraction logic is in `popup.js` → `backupConversations()` function
4. Selector arrays can be modified to adapt to UI changes

## Privacy

- ✅ All processing happens locally in your browser
- ✅ No data is sent to external servers
- ✅ Exported files are saved directly to your Downloads folder
- ✅ Uses browser's local storage for cache and history

## Troubleshooting

### "No conversations found"
- Make sure you're on duck.ai page
- Try refreshing the Duck.ai page
- Use "🔍 Debug Page" to check if selectors are working

### "Limited Content" exports in Fast Mode
- ✅ **Solution:** Use Full Backup Mode instead!
- Check the "Full Backup Mode" checkbox before clicking "Load Chat-titles"

### Full Backup Mode seems stuck
- This is normal - it takes ~2 seconds per conversation
- You'll see the Duck.ai UI switching between conversations
- Check the progress bar for current status
- Don't close the extension popup while it's running

### Some conversations still show "LIMITED CONTENT" even in Full Backup Mode
- The conversation might be empty or very short
- Wait a bit longer and try again (content might still be loading)
- Check browser console for errors

### Extension not working after Duck.ai update
- Duck.ai may have changed their HTML structure
- Check console for errors
- The extension uses multiple fallback selectors to handle changes
- Report the issue with console logs

## License

This is a personal backup tool. Use responsibly and respect Duck.ai's terms of service.
