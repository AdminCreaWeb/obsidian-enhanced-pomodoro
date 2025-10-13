## User

Hey can we fix the titles given in Console-output so they show up in the extension-popup-window as well (after clicking on "Load Chat-titles")?

in previous thread I've also shared the full HTML (an example of such a Duck.ai-page containing 2 titles in the sidebar and content (for each active sidebar-title) in main-section of the website.
But I guess it was to huge that HTML, that I couldn't talk any further with you (in that same thread).

## Assistant

I'll help you fix the issue where chat titles from the console output aren't showing up in the extension popup window after clicking "Load Chat-titles". Let me first explore the project structure to understand how the extension is organized.

**Tool Call: List the `/Users/kirikou/Development/Coding/JavascriptProjects` directory's contents**
Status: Completed

# Folders:
JavascriptProjects/01_BackupDuckAI_H_Extension
JavascriptProjects/02_BackupDuckAI_H_Extension
JavascriptProjects/Docs
JavascriptProjects/__BackupDuckai_additional_workfiles_at_creation
JavascriptProjects/duckai_GPT5-o_mini_customCreatedZedExt_zed-eslint-runner
JavascriptProjects/duckai_GPT5-o_mini_customExtExamples
JavascriptProjects/myCustomExtensionExamples
JavascriptProjects/myTryoutExtensionExamples
JavascriptProjects/node_modules
JavascriptProjects/webextensions-examples-main
JavascriptProjects/zed-mdx

# Files:
JavascriptProjects/.remarkrc
JavascriptProjects/README_for_zed.md
JavascriptProjects/package-lock.json
JavascriptProjects/package.json
JavascriptProjects/webextensions-examples-main.zip


## Assistant

Let me look at the backup directories to find the extension files:

**Tool Call: List the `/Users/kirikou/Development/Coding/JavascriptProjects/01_BackupDuckAI_H_Extension` directory's contents**
Status: Completed


# Files:
JavascriptProjects/01_BackupDuckAI_H_Extension/background.js
JavascriptProjects/01_BackupDuckAI_H_Extension/manifest.json
JavascriptProjects/01_BackupDuckAI_H_Extension/popup.html
JavascriptProjects/01_BackupDuckAI_H_Extension/popup.js
JavascriptProjects/01_BackupDuckAI_H_Extension/popup_b4_latest.js


**Tool Call: List the `/Users/kirikou/Development/Coding/JavascriptProjects/02_BackupDuckAI_H_Extension` directory's contents**
Status: Completed

# Folders:
JavascriptProjects/02_BackupDuckAI_H_Extension/Docs
JavascriptProjects/02_BackupDuckAI_H_Extension/lib
JavascriptProjects/02_BackupDuckAI_H_Extension/popup

# Files:
JavascriptProjects/02_BackupDuckAI_H_Extension/BACKUP_FEATURES.md
JavascriptProjects/02_BackupDuckAI_H_Extension/background.js
JavascriptProjects/02_BackupDuckAI_H_Extension/content_script.js
JavascriptProjects/02_BackupDuckAI_H_Extension/debug_page_structure.js
JavascriptProjects/02_BackupDuckAI_H_Extension/manifest.json
JavascriptProjects/02_BackupDuckAI_H_Extension/popup_b4_latest.js
JavascriptProjects/02_BackupDuckAI_H_Extension/test_deduplication.js


## Assistant

Let me check the popup directory in the second backup:

**Tool Call: List the `/Users/kirikou/Development/Coding/JavascriptProjects/02_BackupDuckAI_H_Extension/popup` directory's contents**
Status: Completed


# Files:
JavascriptProjects/02_BackupDuckAI_H_Extension/popup/popup.html
JavascriptProjects/02_BackupDuckAI_H_Extension/popup/popup.js
JavascriptProjects/02_BackupDuckAI_H_Extension/popup/popup_B4_older00.html
JavascriptProjects/02_BackupDuckAI_H_Extension/popup/popup_B4_older00.js
JavascriptProjects/02_BackupDuckAI_H_Extension/popup/popup_B4_older01.html
JavascriptProjects/02_BackupDuckAI_H_Extension/popup/popup_B4_older01.js
JavascriptProjects/02_BackupDuckAI_H_Extension/popup/popup_B4_older02.js
JavascriptProjects/02_BackupDuckAI_H_Extension/popup/popup_B4_older03.js
JavascriptProjects/02_BackupDuckAI_H_Extension/popup/popup_B4_older04.js
JavascriptProjects/02_BackupDuckAI_H_Extension/popup/popup_backup.js
JavascriptProjects/02_BackupDuckAI_H_Extension/popup/popup_simple.js


## Assistant

Let me examine the main popup files to understand the current implementation:

**Tool Call: popup.html**
Status: Completed

```json
{"Text":"<!doctype html>\n<html>\n    <head>\n        <meta charset=\"utf-8\" />\n        <style>\n            body {\n                font-family:\n                    system-ui,\n                    Segoe UI,\n                    Roboto,\n                    sans-serif;\n                padding: 12px;\n                width: 420px;\n                min-height: 400px;\n                max-width: 500px;\n                overflow-x: auto;\n            }\n            .controls {\n                display: flex;\n                flex-wrap: wrap;\n                gap: 6px;\n                margin-bottom: 8px;\n                align-items: center;\n            }\n            #list {\n                margin: 8px 0;\n                padding: 0;\n            }\n            #list li {\n                margin-bottom: 8px;\n                line-height: 1.3;\n                list-style: none;\n                border: 1px solid #e1e5e9;\n                border-radius: 4px;\n                padding: 6px;\n                background: #f8f9fa;\n            }\n            #list li:hover {\n                background: #e9ecef;\n            }\n            #list label {\n                display: flex;\n                align-items: flex-start;\n                cursor: pointer;\n                gap: 8px;\n            }\n            #list input[type=\"checkbox\"] {\n                margin: 2px 0 0 0;\n                flex-shrink: 0;\n            }\n            .title-text {\n                flex: 1;\n                font-size: 0.9em;\n                line-height: 1.3;\n                max-height: 2.6em; /* Approximately 2 lines */\n                overflow: hidden;\n                word-wrap: break-word;\n                display: -webkit-box;\n                -webkit-line-clamp: 2;\n                -webkit-box-orient: vertical;\n            }\n            #status {\n                font-size: 0.85em;\n                color: #666;\n                margin: 8px 0;\n                min-height: 1.2em;\n            }\n            button {\n                font-size: 0.85em;\n                padding: 6px 10px;\n                border: 1px solid #ccc;\n                border-radius: 4px;\n                background: #f5f5f5;\n                cursor: pointer;\n                white-space: nowrap;\n                min-width: fit-content;\n            }\n            button:hover {\n                background: #e9ecef;\n            }\n            #clearCache, #viewHistory, #clearHistory, #testStructure {\n                font-size: 0.75em !important;\n                padding: 4px 8px !important;\n                color: #666;\n                flex: 0 0 auto;\n            }\n            #clearHistory {\n                color: #dc3545 !important;\n            }\n            #testStructure {\n                color: #28a745 !important;\n            }\n            .progress-wrapper {\n                margin: 8px 0;\n                display: none;\n                animation: fadeIn 0.3s ease-in;\n            }\n            .progress-wrapper.show {\n                display: block;\n            }\n            .progress-container {\n                width: 100%;\n                background-color: #e0e0e0;\n                border-radius: 6px;\n                height: 14px;\n                overflow: hidden;\n                position: relative;\n                box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.15);\n                border: 1px solid #d0d0d0;\n            }\n            .progress-bar {\n                height: 100%;\n                background: linear-gradient(90deg, #28a745, #20c997, #17a2b8);\n                border-radius: 5px;\n                width: 0%;\n                transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);\n                position: relative;\n                overflow: hidden;\n                box-shadow: 0 1px 3px rgba(0, 123, 255, 0.3);\n            }\n            .progress-bar::after {\n                content: \"\";\n                position: absolute;\n                top: 0;\n                left: 0;\n                bottom: 0;\n                right: 0;\n                background: linear-gradient(\n                    45deg,\n                    rgba(255, 255, 255, 0.2) 25%,\n                    transparent 25%,\n                    transparent 50%,\n                    rgba(255, 255, 255, 0.2) 50%,\n                    rgba(255, 255, 255, 0.2) 75%,\n                    transparent 75%,\n                    transparent\n                );\n                background-size: 16px 16px;\n                animation: progress-stripes 1s linear infinite;\n            }\n            .progress-text {\n                font-size: 0.75em;\n                color: #666;\n                margin-top: 6px;\n                text-align: center;\n                font-weight: 500;\n                letter-spacing: 0.5px;\n            }\n            @keyframes progress-stripes {\n                0% {\n                    background-position: 0 0;\n                }\n                100% {\n                    background-position: 16px 0;\n                }\n            }\n            @keyframes fadeIn {\n                from {\n                    opacity: 0;\n                    transform: translateY(-10px);\n                }\n                to {\n                    opacity: 1;\n                    transform: translateY(0);\n                }\n            }\n        </style>\n    </head>\n    <body>\n        <div class=\"controls\">\n            <button id=\"toggleAll\">Toggle All</button>\n            <button\n                id=\"refresh\"\n                title=\"Single-click to load (may use cache), Double-click to force refresh\"\n            >\n                Load Chat-titles\n            </button>\n            <button id=\"downloadButton\">Download .md</button>\n        </div>\n        <div class=\"controls\">\n            <button id=\"clearCache\">Clear Cache</button>\n            <button id=\"viewHistory\">View History</button>\n            <button id=\"clearHistory\">Clear History</button>\n            <button id=\"testStructure\">🔍 Debug Page</button>\n        </div>\n\n        <div id=\"status\" aria-live=\"polite\"></div>\n        <div class=\"progress-wrapper\" id=\"progressWrapper\">\n            <div class=\"progress-container\">\n                <div class=\"progress-bar\" id=\"progressBar\"></div>\n            </div>\n            <div class=\"progress-text\" id=\"progressText\">0%</div>\n        </div>\n        <ul id=\"list\"></ul>\n\n        <div id=\"historyModal\" style=\"display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 1000;\">\n            <div style=\"position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 8px; padding: 20px; min-width: 450px; max-width: 90vw; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);\">\n                <h3 style=\"margin-top: 0; color: #333; border-bottom: 1px solid #eee; padding-bottom: 8px;\">Backup History</h3>\n                <div id=\"historyList\" style=\"margin: 15px 0; max-height: 400px; overflow-y: auto; font-size: 0.85em;\"></div>\n                <div style=\"text-align: right; margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee;\">\n                    <button id=\"closeHistory\" style=\"background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 0.9em; font-weight: 500;\">Close</button>\n                </div>\n            </div>\n        </div>\n</ul>\n\n        <script src=\"../lib/jsencrypt.min.js\"></script>\n        <script src=\"../lib/crypto-js.min.js\"></script>\n        <script src=\"popup.js\"></script>\n    </body>\n</html>\n"}
```

**Tool Call: popup.js**
Status: Completed

```json
{"Text":"This file was too big to read all at once.\n\nHere is an outline of its symbols:\n\nconst statusEl [L1]\nconst listEl [L2]\nconst refreshBtn [L3]\nconst toggleBtn [L4]\nconst BackupBtn [L5]\nlet items [L7]\nfunction generateKeyAsync( ) [L10-23]\nasync function ensurePublicKey() [L25-36]\nasync function encryptAndSaveAES( ) [L38-61]\nlet conversationData [L64]\nconst CACHE_KEY [L65]\nconst CACHE_DURATION [L66]\nconst BACKUP_HISTORY_KEY [L67]\nfunction extractCSSFingerprint( ) [L70-86]\nfunction generateContentHash( ) [L89-98]\nasync function getCachedConversations() [L101-115]\nasync function setCachedConversations( ) [L117-127]\nasync function getCacheInfo() [L129-148]\nasync function backupConversations( ) [L151-545]\nasync function fetchHeadings() [L548-609]\n function fetchContents() [L554-593]\nasync function FilterTitles( ) [L611-613]\nasync function FilterContents( ) [L615-617]\nasync function FilterBackupTitles( ) [L619-621]\nasync function FilterBackupContents( ) [L623-625]\nfunction truncateTitle( ) [L627-639]\nasync function renderTitlesOnly() [L641-670]\nfunction render() [L672-681]\nconst progressWrapper [L684]\nconst progressBar [L685]\nconst progressText [L686]\nfunction showProgress() [L689-693]\nfunction hideProgress() [L695-699]\nfunction updateProgress( ) [L701-708]\nasync function forceRefresh() [L817-822]\nfunction htmlToMarkdown( ) [L905-983]\nasync function checkLocalDownloadedFiles( ) [L986-1011]\nasync function trackDownloadedFile( ) [L1014-1031]\nasync function checkDuplicateConversation( ) [L1034-1075]\nasync function addToBackupHistory( ) [L1078-1101]\nasync function downloadSingleConversation( ) [L1103-1173]\n\nShowing symbols 1-41 (total symbols: 41)\n\n\nUsing the line numbers in this outline, you can call this tool again\nwhile specifying the start_line and end_line fields to see the\nimplementations of symbols in the outline.\n\nAlternatively, you can fall back to the `grep` tool (if available)\nto search the file for specific content."}
```

## Assistant

Let me read the key functions related to loading and rendering chat titles:

**Tool Call: popup.js**
Status: Completed

```json
{"Text":"async function fetchHeadings() {\n  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });\n  const results = await chrome.scripting.executeScript({\n    target: { tabId: tab.id },\n    func: function () {\n      // Define fetchContents inside the executed script\n      function fetchContents() {\n        const results = [];\n\n        // Process each heading individually\n        Array.from(document.querySelectorAll('h1,h2,h3')).forEach(heading => {\n          // Add the heading\n          results.push({ text: heading.innerText.trim(), tag: heading.tagName, tag_sort: 'title' });\n\n          // Find all p tags that follow this heading until the next heading\n          let nextElement = heading.nextElementSibling;\n          while (nextElement && !['H1', 'H2', 'H3'].includes(nextElement.tagName)) {\n            if (nextElement.tagName === 'P') {\n              results.push({ text: nextElement.innerText.trim(), tag: 'P', tag_sort: 'content' });\n            }\n            else if (nextElement.tagName === 'UL') {\n              results.push({ text: nextElement.innerText.trim(), tag: 'UL', tag_sort: 'content' });\n            }\n            else if (nextElement.tagName === 'OL') {\n              results.push({ text: nextElement.innerText.trim(), tag: 'OL', tag_sort: 'content' });\n            }\n            else if (nextElement.tagName === 'LI') {\n              results.push({ text: nextElement.innerText.trim(), tag: 'LI', tag_sort: 'content' });\n            }\n            else if (nextElement.tagName === 'DL') {\n              results.push({ text: nextElement.innerText.trim(), tag: 'DL', tag_sort: 'content' });\n            }\n            else if (nextElement.tagName === 'DT') {\n              results.push({ text: nextElement.innerText.trim(), tag: 'DT', tag_sort: 'content' });\n            }\n            else if (nextElement.tagName === 'DD') {\n              results.push({ text: nextElement.innerText.trim(), tag: 'DD', tag_sort: 'content' });\n            }\n           else {\n              results.push({ text: '', tag: nextElement.tagName, tag_sort: 'content' });\n            }\n            nextElement = nextElement.nextElementSibling;\n          }\n        });\n        return results;\n      }\n\n      // Execute the function\n      const results = fetchContents();\n\n      // Filter and log\n      const titles = results.filter(item => item.tag_sort === 'title');\n      const contents = results.filter(item => item.tag_sort === 'content');\n\n      console.log('All titles:', titles);\n      console.log('All contents:', contents);\n\n      return results; // Return the actual results\n    }\n  });\n  return results[0].result;\n}"}
```

**Tool Call: popup.js**
Status: Completed

```json
{"Text":"async function renderTitlesOnly() {\n  listEl.innerHTML = '';\n  for (let i = 0; i < items.length; i++) {\n    const it = items[i];\n    const li = document.createElement('li');\n    const originalTitle = it.title || it.text || `Conversation ${i + 1}`;\n    const displayText = truncateTitle(originalTitle);\n\n    // Check if this conversation has been backed up\n    let backupIndicator = '';\n    if (conversationData && conversationData[it.index]) {\n      const conversation = conversationData[it.index];\n      const isDuplicate = await checkDuplicateConversation(conversation);\n      const localCheck = await checkLocalDownloadedFiles(conversation);\n\n      if (isDuplicate || localCheck.found) {\n        backupIndicator = '<span style=\"color: #28a745; font-weight: bold; margin-left: 4px;\" title=\"Already backed up\">✓</span>';\n      }\n    }\n\n    li.innerHTML = `\n      <label>\n        <input type=\"checkbox\" data-i=\"${i}\" ${it.checked ? 'checked' : ''}/>\n        <span class=\"title-text\" title=\"${originalTitle.replace(/\"/g, '&quot;')}\">${displayText}</span>\n        ${backupIndicator}\n      </label>\n    `;\n    listEl.appendChild(li);\n  }\n}"}
```

## Assistant

Now let me check where the titles are populated in the `items` array:

**Tool Call: Search files for regex `items\s*=`**
Status: Completed

Showing matches 1-20 (there were more matches found; use offset: 20 to see next page):

## Matches in JavascriptProjects/01_BackupDuckAI_H_Extension/popup.js

### async function backupConversations() › L18-28
```
    if (recentChatsSection) {
        console.log("Recent Chats section found.");
        const chatItems = recentChatsSection.closest('div').nextElementSibling.querySelectorAll('div[title]');

        for (const chat of chatItems) {
            // Simulate a click on the chat title
            chat.click(); // This will reveal the conversation content

            // Wait for the content to be visible
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for 500ms

```

9 lines remaining in ancestor node. Read the file to see all.

## Matches in JavascriptProjects/01_BackupDuckAI_H_Extension/popup_b4_latest.js

### function findRecentChats() › L21-31
```
    if (recentChatsSection) {
        console.log("Recent Chats section found.");

        // Navigate to the parent div to find chat items
        const chatItemsContainer = recentChatsSection.closest('div').nextElementSibling; // Adjust as necessary
        const chatItems = chatItemsContainer.querySelectorAll('div[title]'); // Select divs with titles

        chatItems.forEach(chat => {
            console.log(chat.innerText); // Log each chat title
        });
    } else {
```

### function backupConversations() › L43-53
```
    if (recentChatsSection) {
        console.log("Recent Chats section found.");
        const chatItems = recentChatsSection.closest('div').nextElementSibling.querySelectorAll('div[title]');

        chatItems.forEach(chat => {            
            // Simulate a click on the chat title
            chat.click(); // This will reveal the conversation content

            // Wait for the content to be visible (you may need to adjust this)
            setTimeout(() => {
                const conversationContent = document.querySelector('div[data-activeresponse]'); // Adjust selector as needed
```

9 lines remaining in ancestor node. Read the file to see all.

## Matches in JavascriptProjects/02_BackupDuckAI_H_Extension/popup/popup.js

### let items › L1-11
```
const statusEl = document.getElementById('status');
const listEl = document.getElementById('list');
const refreshBtn = document.getElementById('refresh');
const toggleBtn = document.getElementById('toggleAll');
const BackupBtn = document.getElementById('backupButton');

let items = [];

// Promise wrapper for JSEncrypt key generation (callback-style)
function generateKeyAsync(bits = 2048) {
  return new Promise((resolve, reject) => {
```

1376 lines remaining in ancestor node. Read the file to see all.

### async function encryptAndSaveAES( ) › L38-48
```
async function encryptAndSaveAES(items) {
  const publicKey = await ensurePublicKey();

  const aesKey = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  const encryptedItems = items.map(it => {
    const iv = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
    const cipher = CryptoJS.AES.encrypt(it.text, CryptoJS.enc.Hex.parse(aesKey), {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString();
```

13 lines remaining in ancestor node. Read the file to see all.

### async function backupConversations( ) › L316-333
```
            ];

            let chatItems = [];
            for (const selector of chatSelectors) {
                chatItems = Array.from(conversationsContainer.querySelectorAll(selector));
                console.log(`Selector "${selector}": found ${chatItems.length} items`);

                if (chatItems.length > 0) {
                    // Filter out items that don't look like conversations
                    chatItems = chatItems.filter(item => {
                        const text = item.title || item.textContent || item.innerText || '';
                        return text.length > 5 && text.length < 500 &&
                               !text.toLowerCase().includes('button') &&
                               !text.toLowerCase().includes('close') &&
                               !text.toLowerCase().includes('menu');
                    });

                    console.log(`After filtering: ${chatItems.length} conversation-like items`);
```

### async function backupConversations( ) › L343-347
```
            }

            const totalItems = chatItems.length;
            console.log(`Found ${totalItems} chat items to process`);

```

### async function backupConversations( ) › L432-449
```
        ];

        let foundItems = [];
        for (const selector of fallbackSelectors) {
            const items = Array.from(document.querySelectorAll(selector));
            console.log(`Fallback selector "${selector}": ${items.length} items`);

            if (items.length > 0) {
                // Filter items that look like conversation titles
                const conversationItems = items.filter(item => {
                    const text = item.title || item.textContent || item.innerText || '';
                    return text.length > 10 && text.length < 200 &&
                           !text.toLowerCase().includes('button') &&
                           !text.toLowerCase().includes('menu') &&
                           !text.toLowerCase().includes('close');
                });

                console.log(`Filtered conversation items: ${conversationItems.length}`);
```

### async function backupConversations( ) › L450-453
```
                if (conversationItems.length > 0) {
                    foundItems = conversationItems;
                    break;
                }
```

### L793-797
```

    // Show only titles in the UI (maintain original order - latest first)
    items = conversationData.map((r, index) => ({
      title: r.title,
      checked: false,
```

### L829-835
```
  try {
    await chrome.storage.local.remove([CACHE_KEY, CACHE_KEY + '_timestamp']);
    statusEl.textContent = 'Cache cleared successfully';
    items = [];
    conversationData = [];
    await renderTitlesOnly();
  } catch (error) {
```

### L841-845
```
toggleBtn.addEventListener('click', async () => {
  const allChecked = items.every(i => i.checked);
  items = items.map(i => ({ ...i, checked: !allChecked }));
  await renderTitlesOnly();
});
```

### L858-868
```
document.getElementById('downloadButton').addEventListener('click', async () => {
  const checkedItems = items.filter(item => item.checked);
  if (checkedItems.length === 0) {
    statusEl.textContent = 'No items selected for download';
    return;
  }

  if (!conversationData || conversationData.length === 0) {
    statusEl.textContent = 'Please load chat titles first';
    return;
  }
```

35 lines remaining in ancestor node. Read the file to see all.

### function htmlToMarkdown( ) › L947-952
```
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
      const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      return '\n' + items.map(item =>
        '- ' + item.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '$1').replace(/<[^>]+>/g, '').trim()
      ).join('\n') + '\n\n';
    })
```

### function htmlToMarkdown( ) › L953-958
```
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
      const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      return '\n' + items.map((item, index) =>
        `${index + 1}. ` + item.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '$1').replace(/<[^>]+>/g, '').trim()
      ).join('\n') + '\n\n';
    })
```

## Matches in JavascriptProjects/02_BackupDuckAI_H_Extension/popup/popup_B4_older00.js

### let items › L1-11
```
const statusEl = document.getElementById('status');
const listEl = document.getElementById('list');
const refreshBtn = document.getElementById('refresh');
const toggleBtn = document.getElementById('toggleAll');

let items = [];


document.getElementById('backupButton').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("Backup button clicked, executing script...");
```

118 lines remaining in ancestor node. Read the file to see all.

### async function backupConversations() › L26-36
```
    if (recentChatsSection) {
        console.log("Recent Chats section found.");
        const chatItems = recentChatsSection.closest('div').nextElementSibling.querySelectorAll('div[title]');

        for (const chat of chatItems) {
            // Simulate a click on the chat title
            chat.click(); // This will reveal the conversation content

            // Wait for the content to be visible
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for 500ms

```

9 lines remaining in ancestor node. Read the file to see all.

### L103-110
```
refreshBtn.addEventListener('click', async () => {
  statusEl.textContent = 'Extracting headings...';
  const raw = await fetchHeadings();
  items = raw.map(r => ({ ...r, checked: false }));
  render();
  statusEl.textContent = 'Encrypting and saving...';
  await encryptAndSaveAES(items);
});
```

### L112-116
```
toggleBtn.addEventListener('click', () => {
  const allChecked = items.every(i => i.checked);
  items = items.map(i => ({ ...i, checked: !allChecked }));
  render();
});
```

## Matches in JavascriptProjects/02_BackupDuckAI_H_Extension/popup/popup_B4_older01.js

### let items › L1-11
```
const statusEl = document.getElementById('status');
const listEl = document.getElementById('list');
const refreshBtn = document.getElementById('refresh');
const toggleBtn = document.getElementById('toggleAll');
const BackupBtn = document.getElementById('backupButton');

let items = [];


document.getElementById('backupButton').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
```

193 lines remaining in ancestor node. Read the file to see all.


## Assistant

Let me look at the main refresh button event handler to see how titles are being set:

**Tool Call: Search files for regex `refreshBtn\.addEventListener|refresh.*addEventListener`**
Status: Completed

Found 5 matches:

## Matches in JavascriptProjects/02_BackupDuckAI_H_Extension/popup/popup.js

### L710-720
```
refreshBtn.addEventListener('click', async () => {
  statusEl.textContent = 'Loading chat titles...';
  hideProgress();

  try {
    // Check cache first
    let cachedData = await getCachedConversations();

    if (cachedData) {
      conversationData = cachedData;
      const cacheInfo = await getCacheInfo();
```

94 lines remaining in ancestor node. Read the file to see all.

### L823-827
```

// Add force refresh on double-click
refreshBtn.addEventListener('dblclick', forceRefresh);

// Add clear cache button functionality
```

## Matches in JavascriptProjects/duckai_GPT5-o_mini_customExtExamples/_final_example/popup/popup.js

### L83-90
```
refreshBtn.addEventListener('click', async () => {
  statusEl.textContent = 'Extracting headings...';
  const raw = await fetchHeadings();
  items = raw.map(r => ({ ...r, checked: false }));
  render();
  statusEl.textContent = 'Encrypting and saving...';
  await encryptAndSaveAES(items);
});
```

## Matches in JavascriptProjects/duckai_GPT5-o_mini_customExtExamples/bigger_example/popup/popup.js

### L57-62
```
refreshBtn.addEventListener("click", async () => {
  const raw = await fetchHeadings();
  items = raw.map((r) => ({ ...r, checked: false }));
  render();
  await encryptAndSaveAES(items);
});
```

## Matches in JavascriptProjects/duckai_GPT5-o_mini_customExtExamples/small_start_example/popup/popup.js

### L40-45
```
refreshBtn.addEventListener("click", async () => {
  const raw = await fetchHeadings();
  items = raw.map((r) => ({ ...r, checked: false }));
  render();
  encryptAndSave(items);
});
```


## Assistant

Let me read the full refresh button event handler:

**Tool Call: popup.js**
Status: Completed

```json
{"Text":"refreshBtn.addEventListener('click', async () => {\n  statusEl.textContent = 'Loading chat titles...';\n  hideProgress();\n\n  try {\n    // Check cache first\n    let cachedData = await getCachedConversations();\n\n    if (cachedData) {\n      conversationData = cachedData;\n      const cacheInfo = await getCacheInfo();\n      statusEl.textContent = `Loaded cached chat titles (expires in ${cacheInfo.remainingMinutes}min)...`;\n    } else {\n      statusEl.textContent = 'Parsing chat data (this may take a moment)...';\n      showProgress();\n\n      // Get fresh data from the page with progress tracking\n      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });\n\n      // Simulate realistic progress during parsing\n      const progressSteps = [\n        { percent: 5, message: 'Initializing chat parsing...' },\n        { percent: 15, message: 'Locating chat sections...' },\n        { percent: 30, message: 'Extracting chat titles...' },\n        { percent: 50, message: 'Processing conversations...' },\n        { percent: 70, message: 'Gathering content data...' },\n        { percent: 85, message: 'Organizing results...' },\n        { percent: 95, message: 'Finalizing data...' }\n      ];\n\n      // Start progress animation\n      let currentStep = 0;\n      let progressInterval = setInterval(() => {\n        if (currentStep < progressSteps.length) {\n          const step = progressSteps[currentStep];\n          updateProgress(step.percent, 100, step.message);\n          currentStep++;\n        }\n      }, 400);\n\n      try {\n        const backupResults = await chrome.scripting.executeScript({\n          target: { tabId: tab.id },\n          func: backupConversations\n        });\n\n        // Clear interval and complete progress\n        clearInterval(progressInterval);\n        updateProgress(100, 100, 'Complete!');\n\n        const result = backupResults[0].result;\n        console.log('Raw backup result:', result);\n\n        // Check if result is an error object\n        if (result && result.error) {\n          throw new Error(result.message || 'Unknown error occurred during backup');\n        }\n\n        conversationData = result;\n\n        await new Promise(resolve => setTimeout(resolve, 600));\n        hideProgress();\n      } catch (scriptError) {\n        clearInterval(progressInterval);\n        hideProgress();\n        console.error('Script execution error:', scriptError);\n        statusEl.textContent = `Error: ${scriptError.message || 'Failed to load conversations'}`;\n        throw scriptError;\n      }\n\n      // Cache the fresh data\n      if (conversationData && Array.isArray(conversationData) && conversationData.length > 0) {\n        await setCachedConversations(conversationData);\n      }\n    }\n\n    console.log('Final conversationData:', conversationData);\n\n    if (!conversationData || !Array.isArray(conversationData) || conversationData.length === 0) {\n      statusEl.textContent = 'No conversations found - try refreshing the DuckAI page or check if conversations are visible';\n      hideProgress();\n      return;\n    }\n\n    // Show only titles in the UI (maintain original order - latest first)\n    items = conversationData.map((r, index) => ({\n      title: r.title,\n      checked: false,\n      index: index // Keep reference to original data\n    }));\n\n    await renderTitlesOnly();\n\n    if (cachedData) {\n      const cacheInfo = await getCacheInfo();\n      statusEl.textContent = `Loaded ${conversationData.length} chat titles (cached, ${cacheInfo.remainingMinutes}min left)`;\n    } else {\n      statusEl.textContent = `Loaded ${conversationData.length} chat titles (fresh data, cached for 5min)`;\n    }\n  } catch (error) {\n    console.error('Error loading chat titles:', error);\n    statusEl.textContent = 'Error loading chat titles - Please try again';\n    hideProgress();\n  }\n});\n\n// Add a force refresh function that bypasses cache\nasync function forceRefresh() {\n  // Clear cache first\n  await chrome.storage.local.remove([CACHE_KEY, CACHE_KEY + '_timestamp']);\n  // Then refresh normally"}
```

## Assistant

Now let me look at the `backupConversations` function to see where the titles are being extracted from the page:

**Tool Call: popup.js**
Status: Completed

```json
{"Text":"async function backupConversations(progressCallback) {\n    console.log(\"Executing backupConversations function...\");\n    console.log(\"Current URL:\", window.location.href);\n    console.log(\"Page title:\", document.title);\n\n    let errors = false;\n    let results = [];\n    const results_title = [];\n    const results_content = [];\n\n    // Enhanced debugging for conversation detection\n    console.log(\"=== ENHANCED DEBUGGING CONVERSATION DETECTION ===\");\n    console.log(\"Current URL:\", window.location.href);\n    console.log(\"Page title:\", document.title);\n\n    // Try multiple approaches to find conversations with more comprehensive selectors\n    const possibleSelectors = [\n        'div[title]',\n        'button[title]',\n        '[role=\"button\"][title]',\n        'a[title]',\n        'li[title]',\n        'span[title]',\n        '[data-testid*=\"chat\"]',\n        '[data-testid*=\"conversation\"]',\n        '[aria-label*=\"chat\"]',\n        '[aria-label*=\"conversation\"]',\n        '.chat-item',\n        '.conversation-item',\n        '.message-item',\n        '.history-item',\n        'p',\n        'div[class*=\"chat\"]',\n        'div[class*=\"conversation\"]',\n        'div[class*=\"history\"]'\n    ];\n\n    const selectorResults = {};\n    possibleSelectors.forEach(selector => {\n        const elements = document.querySelectorAll(selector);\n        console.log(`Selector \"${selector}\": found ${elements.length} elements`);\n\n        if (elements.length > 0 && elements.length < 50) {\n            const samples = Array.from(elements).slice(0, 5).map(el => {\n                const text = (el.title || el.textContent || el.innerText || '').substring(0, 100);\n                return {\n                    text: text,\n                    tagName: el.tagName,\n                    className: el.className,\n                    hasTitle: !!el.title,\n                    hasClick: typeof el.click === 'function'\n                };\n            });\n            selectorResults[selector] = samples;\n            samples.forEach((sample, i) => {\n                console.log(`  ${i+1}: ${sample.tagName}${sample.className ? '.' + sample.className : ''} - \"${sample.text}...\" [hasTitle: ${sample.hasTitle}, clickable: ${sample.hasClick}]`);\n            });\n        }\n    });\n\n    // Check for various text patterns that might indicate conversation areas\n    console.log(\"=== SEARCHING FOR CONVERSATION INDICATORS ===\");\n    const textSearches = [\n        'Recent Chats',\n        'Chat History',\n        'Conversations',\n        'History',\n        'Messages',\n        'Chats',\n        'Recent',\n        'Previous'\n    ];\n\n    const textResults = {};\n    textSearches.forEach(searchText => {\n        const elements = Array.from(document.querySelectorAll('*')).filter(el =>\n            el.textContent && el.textContent.toLowerCase().includes(searchText.toLowerCase()) &&\n            el.children.length === 0 // Only text nodes\n        );\n        console.log(`Text \"${searchText}\": found in ${elements.length} elements`);\n        if (elements.length > 0 && elements.length < 20) {\n            textResults[searchText] = elements.slice(0, 5);\n            elements.slice(0, 5).forEach((el, i) => {\n                console.log(`  ${i+1}: ${el.tagName} - \"${el.textContent.substring(0, 100)}...\"`);\n                console.log(`      Parent: ${el.parentElement?.tagName}, Next sibling: ${el.nextElementSibling?.tagName}`);\n            });\n        }\n    });\n\n    // Try the original approach first\n    let recentChatsSection = Array.from(document.querySelectorAll('p'))\n        .find(p => p.innerText && p.innerText.includes('Recent Chats'));\n\n    // If not found, try alternative text searches\n    if (!recentChatsSection) {\n        for (const searchText of textSearches) {\n            recentChatsSection = Array.from(document.querySelectorAll('*')).find(el =>\n                el.textContent && el.textContent.toLowerCase().includes(searchText.toLowerCase()) &&\n                el.children.length === 0\n            );\n            if (recentChatsSection) {\n                console.log(`Found section indicator with text: \"${searchText}\"`);\n                break;\n            }\n        }\n    }\n\n    console.log(\"Conversation section found:\", !!recentChatsSection);\n    if (recentChatsSection) {\n        console.log(\"Section text:\", recentChatsSection.textContent);\n        console.log(\"Section parent:\", recentChatsSection.parentElement);\n    }\n\n    if (recentChatsSection) {\n        console.log(\"Conversation section found!\");\n        console.log(\"Section element:\", recentChatsSection);\n        console.log(\"Parent element:\", recentChatsSection.parentElement);\n        console.log(\"Closest div:\", recentChatsSection.closest('div'));\n\n        // Try multiple strategies to find the conversations container\n        let conversationsContainer = null;\n\n        // Strategy 1: Next sibling of closest div\n        const closestDiv = recentChatsSection.closest('div');\n        if (closestDiv && closestDiv.nextElementSibling) {\n            conversationsContainer = closestDiv.nextElementSibling;\n            console.log(\"Strategy 1: Using next sibling of closest div\");\n        }\n\n        // Strategy 2: Parent's next sibling\n        if (!conversationsContainer && recentChatsSection.parentElement?.nextElementSibling) {\n            conversationsContainer = recentChatsSection.parentElement.nextElementSibling;\n            console.log(\"Strategy 2: Using parent's next sibling\");\n        }\n\n        // Strategy 3: Look for container within parent\n        if (!conversationsContainer) {\n            const parent = recentChatsSection.parentElement?.parentElement;\n            if (parent) {\n                // Look for a container that might hold conversations\n                const possibleContainers = parent.querySelectorAll('div[role], div[class*=\"chat\"], div[class*=\"conversation\"], div[class*=\"history\"]');\n                if (possibleContainers.length > 0) {\n                    conversationsContainer = possibleContainers[0];\n                    console.log(\"Strategy 3: Found potential container with role/class\");\n                }\n            }\n        }\n\n        // Strategy 4: Search the whole document for conversation-like elements\n        if (!conversationsContainer) {"}
```

**Tool Call: popup.js**
Status: Completed

```json
{"Text":"        if (!conversationsContainer) {\n            console.log(\"Strategy 4: Searching entire document\");\n            conversationsContainer = document.body; // Will search entire document\n        }\n\n        console.log(\"Using conversations container:\", conversationsContainer);\n\n        if (conversationsContainer) {\n            // Try multiple selectors to find chat items\n            const chatSelectors = [\n                'div[title]',\n                'button[title]',\n                '[role=\"button\"][title]',\n                'a[title]',\n                'li[title]',\n                '[title]'\n            ];\n\n            let chatItems = [];\n            for (const selector of chatSelectors) {\n                chatItems = Array.from(conversationsContainer.querySelectorAll(selector));\n                console.log(`Selector \"${selector}\": found ${chatItems.length} items`);\n\n                if (chatItems.length > 0) {\n                    // Filter out items that don't look like conversations\n                    chatItems = chatItems.filter(item => {\n                        const text = item.title || item.textContent || item.innerText || '';\n                        return text.length > 5 && text.length < 500 &&\n                               !text.toLowerCase().includes('button') &&\n                               !text.toLowerCase().includes('close') &&\n                               !text.toLowerCase().includes('menu');\n                    });\n\n                    console.log(`After filtering: ${chatItems.length} conversation-like items`);\n\n                    if (chatItems.length > 0) {\n                        chatItems.slice(0, 5).forEach((item, i) => {\n                            const text = item.title || item.textContent || item.innerText || '';\n                            console.log(`  ${i+1}: \"${text.substring(0, 100)}...\"`);\n                        });\n                        break; // Found valid items, use this selector\n                    }\n                }\n            }\n\n            const totalItems = chatItems.length;\n            console.log(`Found ${totalItems} chat items to process`);\n\n            // Report initial progress\n            if (progressCallback) progressCallback(0, totalItems, 'Starting to parse conversations...');\n\n            // Keep original order (latest first) - reverse only if needed\n            for (let i = 0; i < chatItems.length; i++) {\n                const chat = chatItems[i];\n\n                // Update progress\n                if (progressCallback) {\n                    progressCallback(i + 1, totalItems, `Processing conversation ${i + 1} of ${totalItems}...`);\n                }\n\n                // Extract title from the div[title] attribute or text content\n                const title = chat.title || chat.innerText.trim() || chat.textContent.trim() || `Conversation ${i + 1}`;\n                console.log(`Processing conversation ${i + 1}: \"${title.substring(0, 50)}...\"`);\n\n                // Extract CSS class fingerprint from the chat item itself\n                const chatCSSFingerprint = chat.className || '';\n\n                // Simulate a click on the chat title to load content\n                chat.click();\n\n                // Wait for the content to be visible\n                await new Promise(resolve => setTimeout(resolve, 800));\n\n                // Try multiple selectors for conversation content with better HTML preservation\n                let conversationContent = document.querySelector('div[data-activeresponse]')\n                                       || document.querySelector('[role=\"main\"] div')\n                                       || document.querySelector('.conversation-content')\n                                       || document.querySelector('main')\n                                       || document.querySelector('article')\n                                       || document.querySelector('[data-testid*=\"conversation\"]');\n\n                if (conversationContent) {\n                    const rawHTML = conversationContent.innerHTML || 'No content found';\n                    const contentText = conversationContent.innerText || conversationContent.textContent || 'No content found';\n\n                    // Generate fingerprints for deduplication\n                    const cssFingerprint = extractCSSFingerprint(rawHTML);\n                    const contentHash = generateContentHash(title, contentText);\n\n                    results_title.push({\n                        id: \"title\",\n                        text: title,\n                    });\n\n                    results_content.push({\n                        id: \"content\",\n                        text: rawHTML,\n                        textContent: contentText,\n                        cssFingerprint: cssFingerprint,\n                        contentHash: contentHash,\n                        chatItemClass: chatCSSFingerprint"}
```

## User

[@duck.ai_incognito-html-example.html](file:///Users/kirikou/Development/Coding/JavascriptProjects/02_BackupDuckAI_H_Extension/Docs/duck.ai_incognito-html-example.html) 
here is the example html page as file, maybe easier to handle

## Assistant

<thinking>
The user is asking me to fix an issue where chat titles from the console output aren't showing up in the extension popup window after clicking "Load Chat-titles". They've also provided an HTML example file from Duck.ai showing the page structure.

Let me examine the HTML structure first to understand how the chat titles are organized on the Duck.ai page:

Looking at the HTML, I can see the sidebar structure with Recent Chats:
- There's a "Recent Chats" section with the text `<p class="sgyUFzmA1VDsy59mWCx_ wZ4JdaHxSAhGy1HoNVja d26Geqs1C__RaCO7MUs2">Recent Chats</p>`
- Under "Today" there are chat items with titles like:
  - "What could be the benefit of drinking out of cupper?"
  - "What's the benefits of Zed compared to IDE's like Windsurf, Void and VScode? can you give me a table of comparison near summarization"

These chat items have the structure:
```html
<div title="What could be the benefit of drinking out of cupper?" class="clS_s3a7onj0_NFty2Qh PMQFURe7WSKqXJk9e3Jn RNhKTnX5_tmxfZbEYpsQ">
  <div class="I7r8CFM3BF5qGUiR253f"></div>
  <p class="QqP0kldzMMlc27xwCN_8 wZ4JdaHxSAhGy1HoNVja cPy9QU4brI7VQXFNPEvF">What could be the benefit of drinking out of cupper?</p>
</div>
```

And the second one:
```html
<div title="What's the benefits of Zed compared to IDE's like Windsurf, Void and VScode?
can you give me a table of comparison near summarization" class="clS_s3a7onj0_NFty2Qh PMQFURe7WSKqXJk9e3Jn RNhKTnX5_tmxfZbEYpsQ o_5vAkKhGYXeC775_M0n">
  <div class="I7r8CFM3BF5qGUiR253f"></div>
  <p class="QqP0kldzMMlc27xwCN_8 wZ4JdaHxSAhGy1HoNVja cPy9QU4brI7VQXFNPEvF">What's the benefits of Zed compared to IDE's like Windsurf, Void and VScode?
can you give me a table of comparison near summarization</p>
  <!-- buttons for download/delete -->
</div>
```

Now looking back at the extension code, I can see the issue. The `backupConversations` function is looking for chat titles, but it seems like it might not be finding the right selectors or structure for the Duck.ai page.

Let me analyze the current code logic:

1. The `backupConversations` function tries to find a "Recent Chats" section
2. It then looks for chat items using various selectors
3. It extracts titles and processes them

But looking at the HTML structure, the chat items are in a specific structure under the Recent Chats section. The current selectors might not be matching the actual HTML structure.

From the HTML, I can see:
1. The "Recent Chats" text is in a `<p>` tag with specific classes
2. The chat items are `<div>` elements with `title` attributes and specific classes
3. The structure is: Recent Chats section → Today section → individual chat items

Let me update the `backupConversations` function to properly target the Duck.ai page structure based on the provided HTML.
</thinking>

Looking at the HTML structure you provided, I can see the issue. The current extension code isn't properly targeting the Duck.ai page structure. Let me update the `backupConversations` function to correctly extract the chat titles from the sidebar.

**Tool Call: popup.js**
Status: Completed

```json
{"Text":"                        chatItemClass: chatCSSFingerprint\n                    });\n\n                    console.log(`✅ Extracted: \"${title.substring(0, 50)}...\" (${rawHTML.length} chars, hash: ${contentHash})`);\n                } else {\n                    console.warn(`⚠️ Conversation content not found for: \"${title}\"`);\n                    const title_clean = title;\n                    // Still add title even if content not found\n                    results_title.push({\n                        id: \"title\",\n                        text: title_clean,\n                    });\n                    results_content.push({\n                        id: \"content\",\n                        text: 'Content not accessible - conversation may need to be opened manually',\n                        textContent: 'Content not accessible',\n                        cssFingerprint: '',\n                        contentHash: generateContentHash(title_clean, 'Content not accessible'),\n                        chatItemClass: chatCSSFingerprint\n                    });\n                }\n            }\n    } else {\n        console.error('Recent Chats section not found.');\n        console.log(\"=== FALLBACK APPROACH ===\");\n\n        // Try fallback approaches\n        const fallbackSelectors = [\n            'div[title]',\n            'button[title]',\n            '[role=\"button\"][title]',\n            'a[title]'\n        ];\n\n        let foundItems = [];\n        for (const selector of fallbackSelectors) {\n            const items = Array.from(document.querySelectorAll(selector));\n            console.log(`Fallback selector \"${selector}\": ${items.length} items`);\n\n            if (items.length > 0) {\n                // Filter items that look like conversation titles\n                const conversationItems = items.filter(item => {\n                    const text = item.title || item.textContent || item.innerText || '';\n                    return text.length > 10 && text.length < 200 &&\n                           !text.toLowerCase().includes('button') &&\n                           !text.toLowerCase().includes('menu') &&\n                           !text.toLowerCase().includes('close');\n                });\n\n                console.log(`Filtered conversation items: ${conversationItems.length}`);\n                if (conversationItems.length > 0) {\n                    foundItems = conversationItems;\n                    break;\n                }\n            }\n        }\n\n        if (foundItems.length > 0) {\n            console.log(`Using fallback approach with ${foundItems.length} items`);\n\n            for (let i = 0; i < foundItems.length; i++) {\n                const chat = foundItems[i];\n\n                if (progressCallback) {\n                    progressCallback(i + 1, foundItems.length, `Processing conversation ${i + 1} of ${foundItems.length}...`);\n                }\n\n                // Simulate a click on the chat title\n                chat.click();\n\n                // Wait for the content to be visible\n                await new Promise(resolve => setTimeout(resolve, 500));\n\n                // Try multiple selectors for conversation content with better HTML preservation\n                let conversationContent = document.querySelector('div[data-activeresponse]')\n                                       || document.querySelector('[role=\"main\"] div')\n                                       || document.querySelector('.conversation-content')\n                                       || document.querySelector('main');\n\n                if (conversationContent) {\n                    const title = chat.title || chat.textContent || chat.innerText || `Conversation ${i + 1}`;\n                    const rawHTML = conversationContent.innerHTML || 'No content found';\n                    const contentText = conversationContent.innerText || conversationContent.textContent || 'No content found';\n\n                    // Generate fingerprints for deduplication\n                    const cssFingerprint = extractCSSFingerprint(rawHTML);\n                    const contentHash = generateContentHash(title, contentText);\n\n                    results_title.push({\n                        id: \"title\",\n                        text: title.trim(),\n                    });\n\n                    results_content.push({\n                        id: \"content\",\n                        text: rawHTML,\n                        textContent: contentText,\n                        cssFingerprint: cssFingerprint,\n                        contentHash: contentHash\n                    });\n"}
```

## Assistant

Now let me create a new version of the `backupConversations` function that correctly targets the Duck.ai page structure based on the HTML you provided:

**Tool Call: Update backupConversations function to correctly extract chat titles from Duck.ai sidebar**
Status: Completed

Diff: /Users/kirikou/Development/Coding/JavascriptProjects/02_BackupDuckAI_H_Extension/popup/popup.js
```
const statusEl = document.getElementById('status');
const listEl = document.getElementById('list');
const refreshBtn = document.getElementById('refresh');
const toggleBtn = document.getElementById('toggleAll');
const BackupBtn = document.getElementById('backupButton');

let items = [];

// Promise wrapper for JSEncrypt key generation (callback-style)
function generateKeyAsync(bits = 2048) {
  return new Promise((resolve, reject) => {
    try {
      const crypt = new JSEncrypt({ default_key_size: bits });
      // getKey accepts a callback invoked when key generation completes
      crypt.getKey(() => {
        // return public key PEM
        resolve(crypt.getPublicKey());
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function ensurePublicKey() {
  // try to read stored public key, otherwise generate one (demo only)
  const { publicKey } = await chrome.storage.local.get('publicKey');
  if (publicKey) return publicKey;

  statusEl.textContent = 'Generating RSA keypair (this may take a few seconds)...';
  const pub = await generateKeyAsync(2048);
  // store only public key; private key should be stored by user in secure place (not synced)
  await chrome.storage.local.set({ publicKey: pub });
  statusEl.textContent = 'Generated and stored public key (public only).';
  return pub;
}

async function encryptAndSaveAES(items) {
  const publicKey = await ensurePublicKey();

  const aesKey = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  const encryptedItems = items.map(it => {
    const iv = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
    const cipher = CryptoJS.AES.encrypt(it.text, CryptoJS.enc.Hex.parse(aesKey), {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString();
    return { tag: it.tag, iv, cipher };
  });

  const encr = new JSEncrypt();
  encr.setPublicKey(publicKey);
  const wrappedKey = encr.encrypt(aesKey);

  const payload = { wrappedKey, encryptedItems, updated: Date.now(), storage: 'local' };
  await chrome.storage.local.set(payload);

  // update status quickly for UI feedback
  statusEl.textContent = `Saved securely: ${encryptedItems.length} items — stored in local storage (encrypted)`;
}

// Store conversation data globally for later use
let conversationData = [];
const CACHE_KEY = 'duckAI_conversation_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const BACKUP_HISTORY_KEY = 'duckAI_backup_history';

// CSS class fingerprinting for deduplication
function extractCSSFingerprint(htmlContent) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  // Extract first few unique class combinations as fingerprint
  const elements = tempDiv.querySelectorAll('div[class], p[class], span[class]');
  const classSignatures = [];

  for (let i = 0; i < Math.min(elements.length, 5); i++) {
    const classes = elements[i].className.trim();
    if (classes && classes.length > 10) { // Only significant class names
      classSignatures.push(classes.substring(0, 100)); // First 100 chars
    }
  }

  return classSignatures.slice(0, 3).join('|'); // Max 3 signatures
}

// Content hash for additional deduplication
function generateContentHash(title, content) {
  const combined = (title + content).replace(/\s+/g, ' ').trim();
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// Cache management functions
async function getCachedConversations() {
  try {
    const cached = await chrome.storage.local.get([CACHE_KEY, CACHE_KEY + '_timestamp']);
    const timestamp = cached[CACHE_KEY + '_timestamp'];
    const data = cached[CACHE_KEY];

    if (timestamp && data && (Date.now() - timestamp) < CACHE_DURATION) {
      console.log('Using cached conversation data');
      return data;
    }
  } catch (error) {
    console.log('Cache read error:', error);
  }
  return null;
}

async function setCachedConversations(data) {
  try {
    await chrome.storage.local.set({
      [CACHE_KEY]: data,
      [CACHE_KEY + '_timestamp']: Date.now()
    });
    console.log('Conversation data cached');
  } catch (error) {
    console.log('Cache write error:', error);
  }
}

async function getCacheInfo() {
  try {
    const cached = await chrome.storage.local.get([CACHE_KEY + '_timestamp']);
    const timestamp = cached[CACHE_KEY + '_timestamp'];

    if (timestamp) {
      const age = Date.now() - timestamp;
      const remaining = Math.max(0, CACHE_DURATION - age);
      const remainingMinutes = Math.ceil(remaining / (60 * 1000));
      return {
        exists: true,
        remainingMinutes,
        expired: remaining <= 0
      };
    }
  } catch (error) {
    console.log('Cache info error:', error);
  }
  return { exists: false };
}

// Function to back up conversations with progress reporting
async function backupConversations(progressCallback) {
    console.log("Executing backupConversations function...");
    console.log("Current URL:", window.location.href);
    console.log("Page title:", document.title);

    let errors = false;
    let results = [];
    const results_title = [];
    const results_content = [];

    // Enhanced debugging for conversation detection
    console.log("=== ENHANCED DEBUGGING CONVERSATION DETECTION ===");
    console.log("Current URL:", window.location.href);
    console.log("Page title:", document.title);

    // Try multiple approaches to find conversations with more comprehensive selectors
    const possibleSelectors = [
        'div[title]',
        'button[title]',
        '[role="button"][title]',
        'a[title]',
        'li[title]',
        'span[title]',
        '[data-testid*="chat"]',
        '[data-testid*="conversation"]',
        '[aria-label*="chat"]',
        '[aria-label*="conversation"]',
        '.chat-item',
        '.conversation-item',
        '.message-item',
        '.history-item',
        'p',
        'div[class*="chat"]',
        'div[class*="conversation"]',
        'div[class*="history"]'
    ];

    const selectorResults = {};
    possibleSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`Selector "${selector}": found ${elements.length} elements`);

        if (elements.length > 0 && elements.length < 50) {
            const samples = Array.from(elements).slice(0, 5).map(el => {
                const text = (el.title || el.textContent || el.innerText || '').substring(0, 100);
                return {
                    text: text,
                    tagName: el.tagName,
                    className: el.className,
                    hasTitle: !!el.title,
                    hasClick: typeof el.click === 'function'
                };
            });
            selectorResults[selector] = samples;
            samples.forEach((sample, i) => {
                console.log(`  ${i+1}: ${sample.tagName}${sample.className ? '.' + sample.className : ''} - "${sample.text}..." [hasTitle: ${sample.hasTitle}, clickable: ${sample.hasClick}]`);
            });
        }
    });

    // Check for various text patterns that might indicate conversation areas
    console.log("=== SEARCHING FOR CONVERSATION INDICATORS ===");
    const textSearches = [
        'Recent Chats',
        'Chat History',
        'Conversations',
        'History',
        'Messages',
        'Chats',
        'Recent',
        'Previous'
    ];

    const textResults = {};
    textSearches.forEach(searchText => {
        const elements = Array.from(document.querySelectorAll('*')).filter(el =>
            el.textContent && el.textContent.toLowerCase().includes(searchText.toLowerCase()) &&
            el.children.length === 0 // Only text nodes
        );
        console.log(`Text "${searchText}": found in ${elements.length} elements`);
        if (elements.length > 0 && elements.length < 20) {
            textResults[searchText] = elements.slice(0, 5);
            elements.slice(0, 5).forEach((el, i) => {
                console.log(`  ${i+1}: ${el.tagName} - "${el.textContent.substring(0, 100)}..."`);
                console.log(`      Parent: ${el.parentElement?.tagName}, Next sibling: ${el.nextElementSibling?.tagName}`);
            });
        }
    });

    // Try the original approach first - look for Recent Chats section
    let recentChatsSection = Array.from(document.querySelectorAll('p'))
        .find(p => p.innerText && p.innerText.trim() === 'Recent Chats');

    // If not found, try alternative text searches
    if (!recentChatsSection) {
        for (const searchText of textSearches) {
            recentChatsSection = Array.from(document.querySelectorAll('*')).find(el =>
                el.textContent && el.textContent.toLowerCase().includes(searchText.toLowerCase()) &&
                el.children.length === 0
            );
            if (recentChatsSection) {
                console.log(`Found section indicator with text: "${searchText}"`);
                break;
            }
        }
    }

    console.log("Conversation section found:", !!recentChatsSection);
    if (recentChatsSection) {
        console.log("Section text:", recentChatsSection.textContent);
        console.log("Section parent:", recentChatsSection.parentElement);
    }

    if (recentChatsSection) {
        console.log("Conversation section found!");
        console.log("Section element:", recentChatsSection);
        console.log("Parent element:", recentChatsSection.parentElement);

        // Duck.ai specific: Find the chat items container
        // The structure is: Recent Chats p tag -> go up to find the sidebar container -> find chat items
        let conversationsContainer = null;

        // Look for the sidebar container that contains both "Recent Chats" and the chat items
        const sidebarContainer = recentChatsSection.closest('section') ||
                                recentChatsSection.closest('div[class*="sidebar"]') ||
                                recentChatsSection.closest('aside') ||
                                document.querySelector('section[class*="sidebar"]') ||
                                document.querySelector('main').querySelector('section:first-child');

        if (sidebarContainer) {
            conversationsContainer = sidebarContainer;
            console.log("Found sidebar container:", conversationsContainer);
        } else {
            // Fallback: search from Recent Chats section upwards
            let currentElement = recentChatsSection.parentElement;
            while (currentElement && currentElement !== document.body) {
                // Look for elements that might contain chat items
                const potentialChatItems = currentElement.querySelectorAll('div[title]');
                if (potentialChatItems.length > 0) {
                    // Check if these look like chat titles
                    const validChats = Array.from(potentialChatItems).filter(item => {
                        const title = item.title || '';
                        return title.length > 10 && title.length < 500;
                    });
                    if (validChats.length > 0) {
                        conversationsContainer = currentElement;
                        console.log("Found container with chat items:", conversationsContainer);
                        break;
                    }
                }
                currentElement = currentElement.parentElement;
            }
        }

        if (!conversationsContainer) {
            console.log("Using document body as fallback");
            conversationsContainer = document.body;
        }

        console.log("Using conversations container:", conversationsContainer);

        if (conversationsContainer) {
            // Duck.ai specific selectors - focus on div elements with title attributes
            // that are likely to be chat items based on the HTML structure
            const chatSelectors = [
                'div[title].clS_s3a7onj0_NFty2Qh', // Specific Duck.ai chat item class
                'div[title][class*="clS_s3a7onj0_NFty2Qh"]', // Partial class match
                'div[title]', // Generic div with title
                'button[title]',
                '[title]'
            ];

            let chatItems = [];
            for (const selector of chatSelectors) {
                const foundItems = Array.from(conversationsContainer.querySelectorAll(selector));
                console.log(`Selector "${selector}": found ${foundItems.length} items`);

                if (foundItems.length > 0) {
                    // Filter to get only conversation-like items
                    const filteredItems = foundItems.filter(item => {
                        const title = item.title || '';
                        const text = item.textContent || item.innerText || '';

                        // Check if this looks like a conversation title
                        const hasValidTitle = title.length > 10 && title.length < 1000;
                        const notUIElement = !title.toLowerCase().includes('button') &&
                                           !title.toLowerCase().includes('close') &&
                                           !title.toLowerCase().includes('menu') &&
                                           !title.toLowerCase().includes('search') &&
                                           !title.toLowerCase().includes('settings');

                        // Additional check: should contain actual conversation text
                        const looksLikeConversation = /[.!?]/.test(title) || title.split(' ').length > 3;

                        return hasValidTitle && notUIElement && looksLikeConversation;
                    });

                    console.log(`After filtering: ${filteredItems.length} conversation-like items`);

                    if (filteredItems.length > 0) {
                        chatItems = filteredItems;
                        filteredItems.slice(0, 5).forEach((item, i) => {
                            const title = item.title || '';
                            console.log(`  ${i+1}: "${title.substring(0, 100)}..."`);
                        });
                        break; // Found valid items, use this selector
                    }
                }
            }

            const totalItems = chatItems.length;
            console.log(`Found ${totalItems} chat items to process`);

            if (totalItems === 0) {
                console.warn("No chat items found with current selectors, trying broader search...");
                // Try a very broad search as final fallback
                const allTitleElements = Array.from(document.querySelectorAll('[title]')).filter(el => {
                    const title = el.title || '';
                    return title.length > 15 && title.length < 500 && /[.!?]/.test(title);
                });

                console.log(`Broad search found ${allTitleElements.length} potential items`);
                if (allTitleElements.length > 0) {
                    chatItems = allTitleElements.slice(0, 10); // Limit to 10 items
                }
            }

            // Report initial progress
            if (progressCallback) progressCallback(0, chatItems.length, 'Starting to parse conversations...');

            // Process chat items - for Duck.ai we'll focus on extracting titles first
            for (let i = 0; i < chatItems.length; i++) {
                const chat = chatItems[i];

                // Update progress
                if (progressCallback) {
                    progressCallback(i + 1, chatItems.length, `Processing conversation ${i + 1} of ${chatItems.length}...`);
                }

                // Extract title from the title attribute (Duck.ai stores full title here)
                const title = (chat.title || chat.innerText?.trim() || chat.textContent?.trim() || `Conversation ${i + 1}`).trim();
                console.log(`Processing conversation ${i + 1}: "${title.substring(0, 50)}..."`);

                // Extract CSS class fingerprint from the chat item itself
                const chatCSSFingerprint = chat.className || '';

                // For Duck.ai, first just collect the titles without clicking
                // This is more reliable and faster than clicking each item
                results_title.push({
                    id: "title",
                    text: title,
                });

                // Try to get content by clicking (but don't fail if it doesn't work)
                try {
                    // Simulate a click on the chat title to load content
                    chat.click();

                    // Wait for the content to be visible
                    await new Promise(resolve => setTimeout(resolve, 600));

                    // Try multiple selectors for conversation content
                    let conversationContent = document.querySelector('div[data-activeresponse="true"]') ||
                                           document.querySelector('div[data-activeresponse]') ||
                                           document.querySelector('[role="main"] div') ||
                                           document.querySelector('main section:last-child') ||
                                           document.querySelector('main div[class*="conversation"]') ||
                                           document.querySelector('main');

                    if (conversationContent) {
                        const rawHTML = conversationContent.innerHTML || 'No content found';
                        const contentText = conversationContent.innerText || conversationContent.textContent || 'No content found';

                        // Generate fingerprints for deduplication
                        const cssFingerprint = extractCSSFingerprint(rawHTML);
                        const contentHash = generateContentHash(title, contentText);

                        results_content.push({
                            id: "content",
                            text: rawHTML,
                            textContent: contentText,
                            cssFingerprint: cssFingerprint,
                            contentHash: contentHash,
                            chatItemClass: chatCSSFingerprint
                        });

                        console.log(`✅ Extracted: "${title.substring(0, 50)}..." (${rawHTML.length} chars, hash: ${contentHash})`);
                    } else {
                        console.warn(`⚠️ Conversation content not found for: "${title}"`);
                        // Still add placeholder content
                        results_content.push({
                            id: "content",
                            text: 'Content not accessible - conversation may need to be opened manually',
                            textContent: 'Content not accessible',
                            cssFingerprint: '',
                            contentHash: generateContentHash(title, 'Content not accessible'),
                            chatItemClass: chatCSSFingerprint
                        });
                    }
                } catch (error) {
                    console.warn(`Error processing conversation "${title}":`, error);
                    // Add placeholder content on error
                    results_content.push({
                        id: "content",
                        text: 'Error accessing content',
                        textContent: 'Error accessing content',
                        cssFingerprint: '',
                        contentHash: generateContentHash(title, 'Error accessing content'),
                        chatItemClass: chatCSSFingerprint
                    });
                }
            }
    } else {
        console.error('Recent Chats section not found.');
        console.log("=== FALLBACK APPROACH ===");

        // Try fallback approaches
        const fallbackSelectors = [
            'div[title]',
            'button[title]',
            '[role="button"][title]',
            'a[title]'
        ];

        let foundItems = [];
        for (const selector of fallbackSelectors) {
            const items = Array.from(document.querySelectorAll(selector));
            console.log(`Fallback selector "${selector}": ${items.length} items`);

            if (items.length > 0) {
                // Filter items that look like conversation titles
                const conversationItems = items.filter(item => {
                    const text = item.title || item.textContent || item.innerText || '';
                    return text.length > 10 && text.length < 200 &&
                           !text.toLowerCase().includes('button') &&
                           !text.toLowerCase().includes('menu') &&
                           !text.toLowerCase().includes('close');
                });

                console.log(`Filtered conversation items: ${conversationItems.length}`);
                if (conversationItems.length > 0) {
                    foundItems = conversationItems;
                    break;
                }
            }
        }

        if (foundItems.length > 0) {
            console.log(`Using fallback approach with ${foundItems.length} items`);

            for (let i = 0; i < foundItems.length; i++) {
                const chat = foundItems[i];

                if (progressCallback) {
                    progressCallback(i + 1, foundItems.length, `Processing conversation ${i + 1} of ${foundItems.length}...`);
                }

                // Simulate a click on the chat title
                chat.click();

                // Wait for the content to be visible
                await new Promise(resolve => setTimeout(resolve, 500));

                // Try multiple selectors for conversation content with better HTML preservation
                let conversationContent = document.querySelector('div[data-activeresponse]')
                                       || document.querySelector('[role="main"] div')
                                       || document.querySelector('.conversation-content')
                                       || document.querySelector('main');

                if (conversationContent) {
                    const title = chat.title || chat.textContent || chat.innerText || `Conversation ${i + 1}`;
                    const rawHTML = conversationContent.innerHTML || 'No content found';
                    const contentText = conversationContent.innerText || conversationContent.textContent || 'No content found';

                    // Generate fingerprints for deduplication
                    const cssFingerprint = extractCSSFingerprint(rawHTML);
                    const contentHash = generateContentHash(title, contentText);

                    results_title.push({
                        id: "title",
                        text: title.trim(),
                    });

                    results_content.push({
                        id: "content",
                        text: rawHTML,
                        textContent: contentText,
                        cssFingerprint: cssFingerprint,
                        contentHash: contentHash
                    });

                    console.log(`Extracted (fallback): ${title} (${rawHTML.length} chars, hash: ${contentHash})`);
                } else {
                    console.error('Conversation content not found for:', chat.title || chat.textContent);
                    const title = chat.title || chat.textContent || chat.innerText || `Conversation ${i + 1}`;
                    results_title.push({
                        id: "title",
                        text: title.trim(),
                    });
                    results_content.push({
                        id: "content",
                        text: 'Content not accessible',
                        textContent: 'Content not accessible',
                        cssFingerprint: '',
                        contentHash: generateContentHash(title, 'Content not accessible')
                    });
                    errors = true;
                }
            }
        } else {
            console.error('No conversations found with any approach.');
            errors = true;
        }
    }
    }

    // Keep original order mapping with enhanced metadata
    results = results_title.map((titleItem, index) => {
        const contentItem = results_content[index];
        return {
            id: `conversation_${index}`,
            title: titleItem.text,
            content: contentItem ? contentItem.text : '',
            textContent: contentItem ? contentItem.textContent : '',
            cssFingerprint: contentItem ? contentItem.cssFingerprint : '',
            contentHash: contentItem ? contentItem.contentHash : '',
            timestamp: Date.now() - index, // Add timestamp to preserve order
            backupDate: new Date().toISOString()
        };
    });

    console.log(`✅ Backup completed: ${results.length} conversations processed`);
    console.log('Results summary:', results.map(r => ({ title: r.title.substring(0, 50), hasContent: r.content !== 'Content not accessible' })));

    return results.length > 0 ? results : { error: true, message: 'No conversations found or processed' };
}


async function fetchHeadings() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: function () {
      // Define fetchContents inside the executed script
      function fetchContents() {
        const results = [];

        // Process each heading individually
        Array.from(document.querySelectorAll('h1,h2,h3')).forEach(heading => {
          // Add the heading
          results.push({ text: heading.innerText.trim(), tag: heading.tagName, tag_sort: 'title' });

          // Find all p tags that follow this heading until the next heading
          let nextElement = heading.nextElementSibling;
          while (nextElement && !['H1', 'H2', 'H3'].includes(nextElement.tagName)) {
            if (nextElement.tagName === 'P') {
              results.push({ text: nextElement.innerText.trim(), tag: 'P', tag_sort: 'content' });
            }
            else if (nextElement.tagName === 'UL') {
              results.push({ text: nextElement.innerText.trim(), tag: 'UL', tag_sort: 'content' });
            }
            else if (nextElement.tagName === 'OL') {
              results.push({ text: nextElement.innerText.trim(), tag: 'OL', tag_sort: 'content' });
            }
            else if (nextElement.tagName === 'LI') {
              results.push({ text: nextElement.innerText.trim(), tag: 'LI', tag_sort: 'content' });
            }
            else if (nextElement.tagName === 'DL') {
              results.push({ text: nextElement.innerText.trim(), tag: 'DL', tag_sort: 'content' });
            }
            else if (nextElement.tagName === 'DT') {
              results.push({ text: nextElement.innerText.trim(), tag: 'DT', tag_sort: 'content' });
            }
            else if (nextElement.tagName === 'DD') {
              results.push({ text: nextElement.innerText.trim(), tag: 'DD', tag_sort: 'content' });
            }
           else {
              results.push({ text: '', tag: nextElement.tagName, tag_sort: 'content' });
            }
            nextElement = nextElement.nextElementSibling;
          }
        });
        return results;
      }

      // Execute the function
      const results = fetchContents();

      // Filter and log
      const titles = results.filter(item => item.tag_sort === 'title');
      const contents = results.filter(item => item.tag_sort === 'content');

      console.log('All titles:', titles);
      console.log('All contents:', contents);

      return results; // Return the actual results
    }
  });
  return results[0].result;
}

async function FilterTitles(results) {
  return results.filter(item => item.tag_sort === 'title');
}

async function FilterContents(results) {
  return results.filter(item => item.tag_sort === 'content');
}

async function FilterBackupTitles(results) {
  return results.filter(item => item.title);
}

async function FilterBackupContents(results) {
  return results.filter(item => item.content.text);
}

function truncateTitle(title, maxLength = 80) {
  if (!title || title.length <= maxLength) return title;

  // Try to break at word boundaries for better 2-line display
  const truncated = title.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.6) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

async function renderTitlesOnly() {
  listEl.innerHTML = '';
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const li = document.createElement('li');
    const originalTitle = it.title || it.text || `Conversation ${i + 1}`;
    const displayText = truncateTitle(originalTitle);

    // Check if this conversation has been backed up
    let backupIndicator = '';
    if (conversationData && conversationData[it.index]) {
      const conversation = conversationData[it.index];
      const isDuplicate = await checkDuplicateConversation(conversation);
      const localCheck = await checkLocalDownloadedFiles(conversation);

      if (isDuplicate || localCheck.found) {
        backupIndicator = '<span style="color: #28a745; font-weight: bold; margin-left: 4px;" title="Already backed up">✓</span>';
      }
    }

    li.innerHTML = `
      <label>
        <input type="checkbox" data-i="${i}" ${it.checked ? 'checked' : ''}/>
        <span class="title-text" title="${originalTitle.replace(/"/g, '&quot;')}">${displayText}</span>
        ${backupIndicator}
      </label>
    `;
    listEl.appendChild(li);
  }
}

function render() {
  listEl.innerHTML = '';
  items.forEach((it, i) => {
    const li = document.createElement('li');
    const displayText = it.text || it.title || `Item ${i + 1}`;
    const tagText = it.tag ? `${it.tag} — ` : '';
    li.innerHTML = `<label><input type="checkbox" data-i="${i}" ${it.checked ? 'checked' : ''}/> ${tagText}${displayText}</label>`;
    listEl.appendChild(li);
  });
}

// Progress bar elements
const progressWrapper = document.getElementById('progressWrapper');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

// Function to show/hide progress bar
function showProgress() {
  progressWrapper.classList.add('show');
  progressBar.style.width = '0%';
  progressText.textContent = '0%';
}

function hideProgress() {
  progressWrapper.classList.remove('show');
  progressBar.style.width = '0%';
  progressText.textContent = '0%';
}

function updateProgress(current, total, message = '') {
  const percentage = Math.round((current / total) * 100);
  progressBar.style.width = `${percentage}%`;
  progressText.textContent = `${percentage}%`;
  if (message) {
    statusEl.textContent = message;
  }
}

refreshBtn.addEventListener('click', async () => {
  statusEl.textContent = 'Loading chat titles...';
  hideProgress();

  try {
    // Check cache first
    let cachedData = await getCachedConversations();

    if (cachedData) {
      conversationData = cachedData;
      const cacheInfo = await getCacheInfo();
      statusEl.textContent = `Loaded cached chat titles (expires in ${cacheInfo.remainingMinutes}min)...`;
    } else {
      statusEl.textContent = 'Parsing chat data (this may take a moment)...';
      showProgress();

      // Get fresh data from the page with progress tracking
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Simulate realistic progress during parsing
      const progressSteps = [
        { percent: 5, message: 'Initializing chat parsing...' },
        { percent: 15, message: 'Locating chat sections...' },
        { percent: 30, message: 'Extracting chat titles...' },
        { percent: 50, message: 'Processing conversations...' },
        { percent: 70, message: 'Gathering content data...' },
        { percent: 85, message: 'Organizing results...' },
        { percent: 95, message: 'Finalizing data...' }
      ];

      // Start progress animation
      let currentStep = 0;
      let progressInterval = setInterval(() => {
        if (currentStep < progressSteps.length) {
          const step = progressSteps[currentStep];
          updateProgress(step.percent, 100, step.message);
          currentStep++;
        }
      }, 400);

      try {
        const backupResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: backupConversations
        });

        // Clear interval and complete progress
        clearInterval(progressInterval);
        updateProgress(100, 100, 'Complete!');

        const result = backupResults[0].result;
        console.log('Raw backup result:', result);

        // Check if result is an error object
        if (result && result.error) {
          throw new Error(result.message || 'Unknown error occurred during backup');
        }

        conversationData = result;

        await new Promise(resolve => setTimeout(resolve, 600));
        hideProgress();
      } catch (scriptError) {
        clearInterval(progressInterval);
        hideProgress();
        console.error('Script execution error:', scriptError);
        statusEl.textContent = `Error: ${scriptError.message || 'Failed to load conversations'}`;
        throw scriptError;
      }

      // Cache the fresh data
      if (conversationData && Array.isArray(conversationData) && conversationData.length > 0) {
        await setCachedConversations(conversationData);
      }
    }

    console.log('Final conversationData:', conversationData);

    if (!conversationData || !Array.isArray(conversationData) || conversationData.length === 0) {
      statusEl.textContent = 'No conversations found - try refreshing the DuckAI page or check if conversations are visible';
      hideProgress();
      return;
    }

    // Show only titles in the UI (maintain original order - latest first)
    items = conversationData.map((r, index) => ({
      title: r.title,
      checked: false,
      index: index // Keep reference to original data
    }));

    await renderTitlesOnly();

    if (cachedData) {
      const cacheInfo = await getCacheInfo();
      statusEl.textContent = `Loaded ${conversationData.length} chat titles (cached, ${cacheInfo.remainingMinutes}min left)`;
    } else {
      statusEl.textContent = `Loaded ${conversationData.length} chat titles (fresh data, cached for 5min)`;
    }
  } catch (error) {
    console.error('Error loading chat titles:', error);
    statusEl.textContent = 'Error loading chat titles - Please try again';
    hideProgress();
  }
});

// Add a force refresh function that bypasses cache
async function forceRefresh() {
  // Clear cache first
  await chrome.storage.local.remove([CACHE_KEY, CACHE_KEY + '_timestamp']);
  // Then refresh normally
  refreshBtn.click();
}

// Add force refresh on double-click
refreshBtn.addEventListener('dblclick', forceRefresh);

// Add clear cache button functionality
document.getElementById('clearCache').addEventListener('click', async () => {
  try {
    await chrome.storage.local.remove([CACHE_KEY, CACHE_KEY + '_timestamp']);
    statusEl.textContent = 'Cache cleared successfully';
    items = [];
    conversationData = [];
    await renderTitlesOnly();
  } catch (error) {
    console.error('Error clearing cache:', error);
    statusEl.textContent = 'Error clearing cache';
  }
});

toggleBtn.addEventListener('click', async () => {
  const allChecked = items.every(i => i.checked);
  items = items.map(i => ({ ...i, checked: !allChecked }));
  await renderTitlesOnly();
});

// Add checkbox event listeners
listEl.addEventListener('change', (e) => {
  if (e.target.type === 'checkbox') {
    const index = parseInt(e.target.getAttribute('data-i'));
    items[index].checked = e.target.checked;
    // Re-render to update backup indicators if needed
    setTimeout(() => renderTitlesOnly(), 100);
  }
});

// Add download button functionality
document.getElementById('downloadButton').addEventListener('click', async () => {
  const checkedItems = items.filter(item => item.checked);
  if (checkedItems.length === 0) {
    statusEl.textContent = 'No items selected for download';
    return;
  }

  if (!conversationData || conversationData.length === 0) {
    statusEl.textContent = 'Please load chat titles first';
    return;
  }

  console.log('Items to download:', checkedItems);

  statusEl.textContent = `Creating ${checkedItems.length} .md files...`;
  let downloadedCount = 0;
  let skippedCount = 0;

  // Download each selected conversation as a separate file
  for (let i = 0; i < checkedItems.length; i++) {
    const item = checkedItems[i];
    const conversationIndex = item.index;
    const conversation = conversationData[conversationIndex];

    if (conversation) {
      try {
        const result = await downloadSingleConversation(conversation, i);
        if (result === 'skipped' || result === 'skipped_local') {
          skippedCount++;
        } else {
          downloadedCount++;
        }
        statusEl.textContent = `Progress: ${downloadedCount} downloaded, ${skippedCount} skipped duplicates...`;

        // Add delay between downloads
        if (i < checkedItems.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error('Error downloading conversation:', error);
      }
    }
  }

  statusEl.textContent = `Complete: ${downloadedCount} downloaded, ${skippedCount} skipped duplicates`;
});

function htmlToMarkdown(html) {
  // Handle null/undefined html
  if (!html || typeof html !== 'string') {
    return 'No content available';
  }

  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // First pass: Handle code blocks and preserve them
  const codeBlocks = [];
  let codeIndex = 0;

  // Extract and preserve code blocks
  html = html.replace(/<pre[^>]*>[\s\S]*?<code[^>]*>([\s\S]*?)<\/code>[\s\S]*?<\/pre>/gi, (match, code) => {
    const placeholder = `__CODE_BLOCK_${codeIndex}__`;
    codeBlocks[codeIndex] = '\n```\n' + code.replace(/<[^>]+>/g, '').trim() + '\n```\n';
    codeIndex++;
    return placeholder;
  });

  // Handle inline code
  html = html.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

  // Convert other HTML elements to markdown with better handling
  let markdown = html
    // Headers
    .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (match, level, content) => {
      const hashes = '#'.repeat(parseInt(level));
      return `\n${hashes} ${content.replace(/<[^>]+>/g, '').trim()}\n\n`;
    })
    // Text formatting
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    // Links and images
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')
    // Lists with better handling
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
      const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      return '\n' + items.map(item =>
        '- ' + item.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '$1').replace(/<[^>]+>/g, '').trim()
      ).join('\n') + '\n\n';
    })
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
      const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      return '\n' + items.map((item, index) =>
        `${index + 1}. ` + item.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '$1').replace(/<[^>]+>/g, '').trim()
      ).join('\n') + '\n\n';
    })
    // Blockquotes
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
      const cleanContent = content.replace(/<[^>]+>/g, '').trim();
      return '\n> ' + cleanContent.replace(/\n/g, '\n> ') + '\n\n';
    })
    // Paragraphs and divs
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1\n')
    .replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1')
    // Line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '') // Trim lines
    .trim();

  // Restore code blocks
  for (let i = 0; i < codeBlocks.length; i++) {
    markdown = markdown.replace(`__CODE_BLOCK_${i}__`, codeBlocks[i]);
  }

  return markdown;
}

// Check if conversation already exists in local downloads folder
async function checkLocalDownloadedFiles(conversation) {
  try {
    // This would require additional permissions to access local files
    // For now, we'll use the browser's storage as a proxy
    const { downloadedFiles = {} } = await chrome.storage.local.get(['downloadedFiles']);

    // Check if this conversation's CSS classes or hash exists in downloaded files
    const cssClasses = conversation.chatItemClass;
    const contentHash = conversation.contentHash;

    if (cssClasses && downloadedFiles[cssClasses]) {
      console.log(`📁 Found in local downloads by CSS classes: ${conversation.title?.substring(0, 50)}...`);
      return { found: true, type: 'css_classes', file: downloadedFiles[cssClasses] };
    }

    if (contentHash && downloadedFiles[contentHash]) {
      console.log(`📁 Found in local downloads by content hash: ${conversation.title?.substring(0, 50)}...`);
      return { found: true, type: 'content_hash', file: downloadedFiles[contentHash] };
    }

    return { found: false };
  } catch (error) {
    console.error('Error checking local downloads:', error);
    return { found: false };
  }
}

// Track downloaded files for local checking
async function trackDownloadedFile(conversation, filename) {
  try {
    const { downloadedFiles = {} } = await chrome.storage.local.get(['downloadedFiles']);

    // Store by both CSS classes and content hash for multiple lookup methods
    if (conversation.chatItemClass) {
      downloadedFiles[conversation.chatItemClass] = filename;
    }
    if (conversation.contentHash) {
      downloadedFiles[conversation.contentHash] = filename;
    }

    await chrome.storage.local.set({ downloadedFiles });
    console.log(`📁 Tracked downloaded file: ${filename}`);
  } catch (error) {
    console.error('Error tracking downloaded file:', error);
  }
}

// Check if conversation already exists in backup history
async function checkDuplicateConversation(conversation) {
  try {
    const { [BACKUP_HISTORY_KEY]: history } = await chrome.storage.local.get([BACKUP_HISTORY_KEY]);
    if (!history || !Array.isArray(history)) {
      return false;
    }

    // Check by content hash first (most reliable)
    if (conversation.contentHash && history.some(item => item.contentHash === conversation.contentHash)) {
      console.log(`🔍 Duplicate found by content hash: ${conversation.title?.substring(0, 50)}...`);
      return true;
    }

    // Check by CSS fingerprint (for similar layout structures)
    if (conversation.cssFingerprint && history.some(item => item.cssFingerprint === conversation.cssFingerprint)) {
      console.log(`🔍 Duplicate found by CSS fingerprint: ${conversation.title?.substring(0, 50)}...`);
      return true;
    }

    // NEW: Check by chat item CSS class (specific to DuckAI div classes)
    if (conversation.chatItemClass && history.some(item => item.chatItemClass === conversation.chatItemClass)) {
      console.log(`🔍 Duplicate found by chat item CSS class: ${conversation.title?.substring(0, 50)}...`);
      return true;
    }

    // Check by title similarity (fuzzy match)
    const title = conversation.title?.toLowerCase().trim();
    if (title && history.some(item =>
      item.title?.toLowerCase().trim() === title ||
      item.title?.toLowerCase().includes(title) ||
      title.includes(item.title?.toLowerCase().trim() || '')
    )) {
      console.log(`🔍 Duplicate found by title similarity: ${conversation.title?.substring(0, 50)}...`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return false;
  }
}

// Add conversation to backup history
async function addToBackupHistory(conversation) {
  try {
    const { [BACKUP_HISTORY_KEY]: history = [] } = await chrome.storage.local.get([BACKUP_HISTORY_KEY]);

    const historyEntry = {
      title: conversation.title,
      contentHash: conversation.contentHash,
      cssFingerprint: conversation.cssFingerprint,
      chatItemClass: conversation.chatItemClass, // NEW: Store DuckAI CSS classes
      backupDate: new Date().toISOString(),
      filename: conversation.filename || 'unknown'
    };

    history.push(historyEntry);

    // Keep only last 100 entries to avoid storage bloat
    const trimmedHistory = history.slice(-100);

    await chrome.storage.local.set({ [BACKUP_HISTORY_KEY]: trimmedHistory });
    console.log('Added to backup history:', historyEntry);
  } catch (error) {
    console.error('Error adding to backup history:', error);
  }
}

async function downloadSingleConversation(conversation, fileIndex = 0) {
  console.log('Downloading single conversation:', conversation);

  // Check if this conversation was already backed up
  const isDuplicate = await checkDuplicateConversation(conversation);
  if (isDuplicate) {
    console.log(`Skipping duplicate conversation: ${conversation.title}`);
    return 'skipped';
  }

  // Check if this conversation exists in local downloads
  const localCheck = await checkLocalDownloadedFiles(conversation);
  if (localCheck.found) {
    console.log(`Skipping conversation found in local downloads (${localCheck.type}): ${conversation.title}`);
    return 'skipped_local';
  }

  // Create filename with requested format: DuckAI_Conversation_YYYYMMDD_HHh_MMm.md
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const timeStr = `${now.getHours()}h_${now.getMinutes().toString().padStart(2, '0')}m`;
  const filename = `DuckAI_Conversation_${dateStr}_${timeStr}${fileIndex > 0 ? `_${fileIndex}` : ''}.md`;

  let markdownContent = `# ${conversation.title || 'Untitled Conversation'}\n\n`;
  markdownContent += `*Exported on: ${now.toLocaleString()}*\n\n`;

  // Add metadata for debugging and deduplication
  if (conversation.contentHash) {
    markdownContent += `*Content Hash: ${conversation.contentHash}*\n\n`;
  }
  if (conversation.cssFingerprint) {
    markdownContent += `*CSS Fingerprint: ${conversation.cssFingerprint.substring(0, 50)}...*\n\n`;
  }
  if (conversation.chatItemClass) {
    markdownContent += `*DuckAI CSS Classes: ${conversation.chatItemClass}*\n\n`;
  }

  markdownContent += '---\n\n';

  // Convert HTML content to markdown with improved conversion
  const content = conversation.content || 'No content available';
  const contentMarkdown = htmlToMarkdown(content);
  markdownContent += `${contentMarkdown}\n\n`;

  // Add original HTML as comment for debugging (first 500 chars)
  if (content && content !== 'No content available') {
    const htmlPreview = content.substring(0, 500).replace(/-->/g, '-\\->');
    markdownContent += `\n\n<!-- Original HTML Preview:\n${htmlPreview}...\n-->\n`;
  }

  console.log(`Creating file: ${filename}`);

  // Add to backup history
  conversation.filename = filename;
  await addToBackupHistory(conversation);

  // Track this file for local download checking
  await trackDownloadedFile(conversation, filename);

  const blob = new Blob([markdownContent], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return 'downloaded';
}



// Backup history management
document.getElementById('viewHistory').addEventListener('click', async () => {
  const modal = document.getElementById('historyModal');
  const historyList = document.getElementById('historyList');

  try {
    const { [BACKUP_HISTORY_KEY]: history = [] } = await chrome.storage.local.get([BACKUP_HISTORY_KEY]);

    if (history.length === 0) {
      historyList.innerHTML = '<p style="color: #666; font-style: italic;">No backup history found.</p>';
    } else {
      historyList.innerHTML = history.reverse().map((item, index) =>
        '<div style="border: 1px solid #e1e5e9; border-radius: 4px; padding: 8px; margin: 4px 0; background: #f8f9fa;">' +
          '<div style="font-weight: bold; font-size: 0.9em; margin-bottom: 4px;">' + (item.title || 'Untitled') + '</div>' +
          '<div style="font-size: 0.75em; color: #666;">' +
            '<div>Date: ' + new Date(item.backupDate).toLocaleString() + '</div>' +
            '<div>File: ' + (item.filename || 'unknown') + '</div>' +
            '<div>Hash: ' + (item.contentHash || 'none') + '</div>' +
            '<div>CSS Classes: ' + (item.chatItemClass || 'none') + '</div>' +
          '</div>' +
        '</div>'
      ).join('');
    }

    modal.style.display = 'block';
  } catch (error) {
    console.error('Error loading backup history:', error);
    historyList.innerHTML = '<p style="color: #dc3545;">Error loading backup history.</p>';
    modal.style.display = 'block';
  }
});

document.getElementById('closeHistory').addEventListener('click', () => {
  document.getElementById('historyModal').style.display = 'none';
});

document.getElementById('clearHistory').addEventListener('click', async () => {
  // Create a custom modal dialog for better formatting and visibility
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white;
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    max-width: 400px;
    width: 90%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  dialog.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 16px 0; color: #d32f2f; font-size: 18px;">⚠️ Clear Backup History</h3>
      <p style="margin: 0 0 12px 0; color: #333; line-height: 1.5;">
        Are you sure you want to clear all backup history?
      </p>
      <div style="color: #666; font-size: 14px; line-height: 1.4;">
        <p style="margin: 8px 0 4px 0; font-weight: bold;">This action will:</p>
        <ul style="margin: 4px 0; padding-left: 20px;">
          <li>Remove all deduplication records</li>
          <li>Allow re-downloading of previously backed up conversations</li>
          <li style="color: #d32f2f; font-weight: bold;">Cannot be undone</li>
        </ul>
      </div>
    </div>
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button id="cancelClear" style="
        padding: 8px 16px;
        border: 1px solid #ddd;
        background: white;
        color: #333;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      ">Cancel</button>
      <button id="confirmClear" style="
        padding: 8px 16px;
        border: none;
        background: #d32f2f;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
      ">Clear History</button>
    </div>
  `;

  modal.appendChild(dialog);
  document.body.appendChild(modal);

  // Add button event listeners
  document.getElementById('cancelClear').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  document.getElementById('confirmClear').addEventListener('click', async () => {
    document.body.removeChild(modal);
    try {
      await chrome.storage.local.remove([BACKUP_HISTORY_KEY]);
      statusEl.textContent = 'Backup history cleared successfully';
      // Close the history modal if it's open
      const historyModal = document.getElementById('historyModal');
      if (historyModal.style.display === 'block') {
        historyModal.style.display = 'none';
      }
    } catch (error) {
      console.error('Error clearing backup history:', error);
      statusEl.textContent = 'Error clearing backup history';
    }
  });

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
});

// Add test button functionality (for debugging)
if (document.getElementById('testStructure')) {
  document.getElementById('testStructure').addEventListener('click', async function() {
    statusEl.textContent = 'Running debug test...';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const debugResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: function() {
        console.log("=== ENHANCED DEBUG TEST ===");
        console.log("Current URL:", window.location.href);
        console.log("Page title:", document.title);

        // Test all possible selectors for conversations
        const testSelectors = [
          'div[title]',
          'button[title]',
          '[role="button"][title]',
          'a[title]',
          'p',
          '.chat-item',
          '.conversation-item',
          '[data-testid*="chat"]',
          '[aria-label*="chat"]',
          '[aria-label*="conversation"]',
          'li[title]',
          'span[title]'
        ];

        const results = {};

        testSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          results[selector] = {
            count: elements.length,
            samples: Array.from(elements).slice(0, 3).map(el => ({
              text: (el.title || el.textContent || el.innerText || '').substring(0, 100),
              tagName: el.tagName,
              className: el.className,
              id: el.id
            }))
          };
        });

        // Look for text patterns that might indicate conversations
        const textPatterns = [
          'Recent Chats',
          'Chat History',
          'Conversations',
          'Messages',
          'History'
        ];

        const textResults = {};
        textPatterns.forEach(pattern => {
          const elements = Array.from(document.querySelectorAll('*')).filter(el =>
            el.textContent && el.textContent.toLowerCase().includes(pattern.toLowerCase())
          );
          textResults[pattern] = {
            count: elements.length,
            samples: elements.slice(0, 2).map(el => ({
              text: el.textContent.substring(0, 100),
              tagName: el.tagName,
              className: el.className
            }))
          };
        });

        return { selectors: results, textPatterns: textResults };
      }
    });

    console.log('Debug results:', debugResults[0].result);
    statusEl.textContent = 'Debug completed - check console for detailed results';
  });
}

```


## Assistant

Now let's also update the fallback section to be more specific to the Duck.ai structure:

**Tool Call: popup.js**
Status: Completed

```json
{"Text":"        console.log(\"=== FALLBACK APPROACH ===\");\n\n        // Try fallback approaches\n        const fallbackSelectors = [\n            'div[title]',\n            'button[title]',\n            '[role=\"button\"][title]',\n            'a[title]'\n        ];\n\n        let foundItems = [];\n        for (const selector of fallbackSelectors) {\n            const items = Array.from(document.querySelectorAll(selector));\n            console.log(`Fallback selector \"${selector}\": ${items.length} items`);\n\n            if (items.length > 0) {\n                // Filter items that look like conversation titles\n                const conversationItems = items.filter(item => {\n                    const text = item.title || item.textContent || item.innerText || '';\n                    return text.length > 10 && text.length < 200 &&\n                           !text.toLowerCase().includes('button') &&\n                           !text.toLowerCase().includes('menu') &&\n                           !text.toLowerCase().includes('close');\n                });\n\n                console.log(`Filtered conversation items: ${conversationItems.length}`);\n                if (conversationItems.length > 0) {\n                    foundItems = conversationItems;\n                    break;\n                }\n            }\n        }\n\n        if (foundItems.length > 0) {\n            console.log(`Using fallback approach with ${foundItems.length} items`);\n\n            for (let i = 0; i < foundItems.length; i++) {\n                const chat = foundItems[i];\n\n                if (progressCallback) {\n                    progressCallback(i + 1, foundItems.length, `Processing conversation ${i + 1} of ${foundItems.length}...`);\n                }\n\n                // Simulate a click on the chat title\n                chat.click();\n\n                // Wait for the content to be visible\n                await new Promise(resolve => setTimeout(resolve, 500));\n\n                // Try multiple selectors for conversation content with better HTML preservation\n                let conversationContent = document.querySelector('div[data-activeresponse]')\n                                       || document.querySelector('[role=\"main\"] div')\n                                       || document.querySelector('.conversation-content')\n                                       || document.querySelector('main');\n\n                if (conversationContent) {\n                    const title = chat.title || chat.textContent || chat.innerText || `Conversation ${i + 1}`;\n                    const rawHTML = conversationContent.innerHTML || 'No content found';\n                    const contentText = conversationContent.innerText || conversationContent.textContent || 'No content found';\n\n                    // Generate fingerprints for deduplication\n                    const cssFingerprint = extractCSSFingerprint(rawHTML);\n                    const contentHash = generateContentHash(title, contentText);\n\n                    results_title.push({\n                        id: \"title\",\n                        text: title.trim(),\n                    });\n\n                    results_content.push({\n                        id: \"content\",\n                        text: rawHTML,\n                        textContent: contentText,\n                        cssFingerprint: cssFingerprint,\n                        contentHash: contentHash\n                    });\n\n                    console.log(`Extracted (fallback): ${title} (${rawHTML.length} chars, hash: ${contentHash})`);\n                } else {\n                    console.error('Conversation content not found for:', chat.title || chat.textContent);\n                    const title = chat.title || chat.textContent || chat.innerText || `Conversation ${i + 1}`;"}
```

**Tool Call: Update fallback approach to be more Duck.ai specific and focus on titles first**
Status: Completed

Diff: /Users/kirikou/Development/Coding/JavascriptProjects/02_BackupDuckAI_H_Extension/popup/popup.js
```
const statusEl = document.getElementById('status');
const listEl = document.getElementById('list');
const refreshBtn = document.getElementById('refresh');
const toggleBtn = document.getElementById('toggleAll');
const BackupBtn = document.getElementById('backupButton');

let items = [];

// Promise wrapper for JSEncrypt key generation (callback-style)
function generateKeyAsync(bits = 2048) {
  return new Promise((resolve, reject) => {
    try {
      const crypt = new JSEncrypt({ default_key_size: bits });
      // getKey accepts a callback invoked when key generation completes
      crypt.getKey(() => {
        // return public key PEM
        resolve(crypt.getPublicKey());
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function ensurePublicKey() {
  // try to read stored public key, otherwise generate one (demo only)
  const { publicKey } = await chrome.storage.local.get('publicKey');
  if (publicKey) return publicKey;

  statusEl.textContent = 'Generating RSA keypair (this may take a few seconds)...';
  const pub = await generateKeyAsync(2048);
  // store only public key; private key should be stored by user in secure place (not synced)
  await chrome.storage.local.set({ publicKey: pub });
  statusEl.textContent = 'Generated and stored public key (public only).';
  return pub;
}

async function encryptAndSaveAES(items) {
  const publicKey = await ensurePublicKey();

  const aesKey = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  const encryptedItems = items.map(it => {
    const iv = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
    const cipher = CryptoJS.AES.encrypt(it.text, CryptoJS.enc.Hex.parse(aesKey), {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString();
    return { tag: it.tag, iv, cipher };
  });

  const encr = new JSEncrypt();
  encr.setPublicKey(publicKey);
  const wrappedKey = encr.encrypt(aesKey);

  const payload = { wrappedKey, encryptedItems, updated: Date.now(), storage: 'local' };
  await chrome.storage.local.set(payload);

  // update status quickly for UI feedback
  statusEl.textContent = `Saved securely: ${encryptedItems.length} items — stored in local storage (encrypted)`;
}

// Store conversation data globally for later use
let conversationData = [];
const CACHE_KEY = 'duckAI_conversation_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const BACKUP_HISTORY_KEY = 'duckAI_backup_history';

// CSS class fingerprinting for deduplication
function extractCSSFingerprint(htmlContent) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  // Extract first few unique class combinations as fingerprint
  const elements = tempDiv.querySelectorAll('div[class], p[class], span[class]');
  const classSignatures = [];

  for (let i = 0; i < Math.min(elements.length, 5); i++) {
    const classes = elements[i].className.trim();
    if (classes && classes.length > 10) { // Only significant class names
      classSignatures.push(classes.substring(0, 100)); // First 100 chars
    }
  }

  return classSignatures.slice(0, 3).join('|'); // Max 3 signatures
}

// Content hash for additional deduplication
function generateContentHash(title, content) {
  const combined = (title + content).replace(/\s+/g, ' ').trim();
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// Cache management functions
async function getCachedConversations() {
  try {
    const cached = await chrome.storage.local.get([CACHE_KEY, CACHE_KEY + '_timestamp']);
    const timestamp = cached[CACHE_KEY + '_timestamp'];
    const data = cached[CACHE_KEY];

    if (timestamp && data && (Date.now() - timestamp) < CACHE_DURATION) {
      console.log('Using cached conversation data');
      return data;
    }
  } catch (error) {
    console.log('Cache read error:', error);
  }
  return null;
}

async function setCachedConversations(data) {
  try {
    await chrome.storage.local.set({
      [CACHE_KEY]: data,
      [CACHE_KEY + '_timestamp']: Date.now()
    });
    console.log('Conversation data cached');
  } catch (error) {
    console.log('Cache write error:', error);
  }
}

async function getCacheInfo() {
  try {
    const cached = await chrome.storage.local.get([CACHE_KEY + '_timestamp']);
    const timestamp = cached[CACHE_KEY + '_timestamp'];

    if (timestamp) {
      const age = Date.now() - timestamp;
      const remaining = Math.max(0, CACHE_DURATION - age);
      const remainingMinutes = Math.ceil(remaining / (60 * 1000));
      return {
        exists: true,
        remainingMinutes,
        expired: remaining <= 0
      };
    }
  } catch (error) {
    console.log('Cache info error:', error);
  }
  return { exists: false };
}

// Function to back up conversations with progress reporting
async function backupConversations(progressCallback) {
    console.log("Executing backupConversations function...");
    console.log("Current URL:", window.location.href);
    console.log("Page title:", document.title);

    let errors = false;
    let results = [];
    const results_title = [];
    const results_content = [];

    // Enhanced debugging for conversation detection
    console.log("=== ENHANCED DEBUGGING CONVERSATION DETECTION ===");
    console.log("Current URL:", window.location.href);
    console.log("Page title:", document.title);

    // Try multiple approaches to find conversations with more comprehensive selectors
    const possibleSelectors = [
        'div[title]',
        'button[title]',
        '[role="button"][title]',
        'a[title]',
        'li[title]',
        'span[title]',
        '[data-testid*="chat"]',
        '[data-testid*="conversation"]',
        '[aria-label*="chat"]',
        '[aria-label*="conversation"]',
        '.chat-item',
        '.conversation-item',
        '.message-item',
        '.history-item',
        'p',
        'div[class*="chat"]',
        'div[class*="conversation"]',
        'div[class*="history"]'
    ];

    const selectorResults = {};
    possibleSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`Selector "${selector}": found ${elements.length} elements`);

        if (elements.length > 0 && elements.length < 50) {
            const samples = Array.from(elements).slice(0, 5).map(el => {
                const text = (el.title || el.textContent || el.innerText || '').substring(0, 100);
                return {
                    text: text,
                    tagName: el.tagName,
                    className: el.className,
                    hasTitle: !!el.title,
                    hasClick: typeof el.click === 'function'
                };
            });
            selectorResults[selector] = samples;
            samples.forEach((sample, i) => {
                console.log(`  ${i+1}: ${sample.tagName}${sample.className ? '.' + sample.className : ''} - "${sample.text}..." [hasTitle: ${sample.hasTitle}, clickable: ${sample.hasClick}]`);
            });
        }
    });

    // Check for various text patterns that might indicate conversation areas
    console.log("=== SEARCHING FOR CONVERSATION INDICATORS ===");
    const textSearches = [
        'Recent Chats',
        'Chat History',
        'Conversations',
        'History',
        'Messages',
        'Chats',
        'Recent',
        'Previous'
    ];

    const textResults = {};
    textSearches.forEach(searchText => {
        const elements = Array.from(document.querySelectorAll('*')).filter(el =>
            el.textContent && el.textContent.toLowerCase().includes(searchText.toLowerCase()) &&
            el.children.length === 0 // Only text nodes
        );
        console.log(`Text "${searchText}": found in ${elements.length} elements`);
        if (elements.length > 0 && elements.length < 20) {
            textResults[searchText] = elements.slice(0, 5);
            elements.slice(0, 5).forEach((el, i) => {
                console.log(`  ${i+1}: ${el.tagName} - "${el.textContent.substring(0, 100)}..."`);
                console.log(`      Parent: ${el.parentElement?.tagName}, Next sibling: ${el.nextElementSibling?.tagName}`);
            });
        }
    });

    // Try the original approach first - look for Recent Chats section
    let recentChatsSection = Array.from(document.querySelectorAll('p'))
        .find(p => p.innerText && p.innerText.trim() === 'Recent Chats');

    // If not found, try alternative text searches
    if (!recentChatsSection) {
        for (const searchText of textSearches) {
            recentChatsSection = Array.from(document.querySelectorAll('*')).find(el =>
                el.textContent && el.textContent.toLowerCase().includes(searchText.toLowerCase()) &&
                el.children.length === 0
            );
            if (recentChatsSection) {
                console.log(`Found section indicator with text: "${searchText}"`);
                break;
            }
        }
    }

    console.log("Conversation section found:", !!recentChatsSection);
    if (recentChatsSection) {
        console.log("Section text:", recentChatsSection.textContent);
        console.log("Section parent:", recentChatsSection.parentElement);
    }

    if (recentChatsSection) {
        console.log("Conversation section found!");
        console.log("Section element:", recentChatsSection);
        console.log("Parent element:", recentChatsSection.parentElement);

        // Duck.ai specific: Find the chat items container
        // The structure is: Recent Chats p tag -> go up to find the sidebar container -> find chat items
        let conversationsContainer = null;

        // Look for the sidebar container that contains both "Recent Chats" and the chat items
        const sidebarContainer = recentChatsSection.closest('section') ||
                                recentChatsSection.closest('div[class*="sidebar"]') ||
                                recentChatsSection.closest('aside') ||
                                document.querySelector('section[class*="sidebar"]') ||
                                document.querySelector('main').querySelector('section:first-child');

        if (sidebarContainer) {
            conversationsContainer = sidebarContainer;
            console.log("Found sidebar container:", conversationsContainer);
        } else {
            // Fallback: search from Recent Chats section upwards
            let currentElement = recentChatsSection.parentElement;
            while (currentElement && currentElement !== document.body) {
                // Look for elements that might contain chat items
                const potentialChatItems = currentElement.querySelectorAll('div[title]');
                if (potentialChatItems.length > 0) {
                    // Check if these look like chat titles
                    const validChats = Array.from(potentialChatItems).filter(item => {
                        const title = item.title || '';
                        return title.length > 10 && title.length < 500;
                    });
                    if (validChats.length > 0) {
                        conversationsContainer = currentElement;
                        console.log("Found container with chat items:", conversationsContainer);
                        break;
                    }
                }
                currentElement = currentElement.parentElement;
            }
        }

        if (!conversationsContainer) {
            console.log("Using document body as fallback");
            conversationsContainer = document.body;
        }

        console.log("Using conversations container:", conversationsContainer);

        if (conversationsContainer) {
            // Duck.ai specific selectors - focus on div elements with title attributes
            // that are likely to be chat items based on the HTML structure
            const chatSelectors = [
                'div[title].clS_s3a7onj0_NFty2Qh', // Specific Duck.ai chat item class
                'div[title][class*="clS_s3a7onj0_NFty2Qh"]', // Partial class match
                'div[title]', // Generic div with title
                'button[title]',
                '[title]'
            ];

            let chatItems = [];
            for (const selector of chatSelectors) {
                const foundItems = Array.from(conversationsContainer.querySelectorAll(selector));
                console.log(`Selector "${selector}": found ${foundItems.length} items`);

                if (foundItems.length > 0) {
                    // Filter to get only conversation-like items
                    const filteredItems = foundItems.filter(item => {
                        const title = item.title || '';
                        const text = item.textContent || item.innerText || '';

                        // Check if this looks like a conversation title
                        const hasValidTitle = title.length > 10 && title.length < 1000;
                        const notUIElement = !title.toLowerCase().includes('button') &&
                                           !title.toLowerCase().includes('close') &&
                                           !title.toLowerCase().includes('menu') &&
                                           !title.toLowerCase().includes('search') &&
                                           !title.toLowerCase().includes('settings');

                        // Additional check: should contain actual conversation text
                        const looksLikeConversation = /[.!?]/.test(title) || title.split(' ').length > 3;

                        return hasValidTitle && notUIElement && looksLikeConversation;
                    });

                    console.log(`After filtering: ${filteredItems.length} conversation-like items`);

                    if (filteredItems.length > 0) {
                        chatItems = filteredItems;
                        filteredItems.slice(0, 5).forEach((item, i) => {
                            const title = item.title || '';
                            console.log(`  ${i+1}: "${title.substring(0, 100)}..."`);
                        });
                        break; // Found valid items, use this selector
                    }
                }
            }

            const totalItems = chatItems.length;
            console.log(`Found ${totalItems} chat items to process`);

            if (totalItems === 0) {
                console.warn("No chat items found with current selectors, trying broader search...");
                // Try a very broad search as final fallback
                const allTitleElements = Array.from(document.querySelectorAll('[title]')).filter(el => {
                    const title = el.title || '';
                    return title.length > 15 && title.length < 500 && /[.!?]/.test(title);
                });

                console.log(`Broad search found ${allTitleElements.length} potential items`);
                if (allTitleElements.length > 0) {
                    chatItems = allTitleElements.slice(0, 10); // Limit to 10 items
                }
            }

            // Report initial progress
            if (progressCallback) progressCallback(0, chatItems.length, 'Starting to parse conversations...');

            // Process chat items - for Duck.ai we'll focus on extracting titles first
            for (let i = 0; i < chatItems.length; i++) {
                const chat = chatItems[i];

                // Update progress
                if (progressCallback) {
                    progressCallback(i + 1, chatItems.length, `Processing conversation ${i + 1} of ${chatItems.length}...`);
                }

                // Extract title from the title attribute (Duck.ai stores full title here)
                const title = (chat.title || chat.innerText?.trim() || chat.textContent?.trim() || `Conversation ${i + 1}`).trim();
                console.log(`Processing conversation ${i + 1}: "${title.substring(0, 50)}..."`);

                // Extract CSS class fingerprint from the chat item itself
                const chatCSSFingerprint = chat.className || '';

                // For Duck.ai, first just collect the titles without clicking
                // This is more reliable and faster than clicking each item
                results_title.push({
                    id: "title",
                    text: title,
                });

                // Try to get content by clicking (but don't fail if it doesn't work)
                try {
                    // Simulate a click on the chat title to load content
                    chat.click();

                    // Wait for the content to be visible
                    await new Promise(resolve => setTimeout(resolve, 600));

                    // Try multiple selectors for conversation content
                    let conversationContent = document.querySelector('div[data-activeresponse="true"]') ||
                                           document.querySelector('div[data-activeresponse]') ||
                                           document.querySelector('[role="main"] div') ||
                                           document.querySelector('main section:last-child') ||
                                           document.querySelector('main div[class*="conversation"]') ||
                                           document.querySelector('main');

                    if (conversationContent) {
                        const rawHTML = conversationContent.innerHTML || 'No content found';
                        const contentText = conversationContent.innerText || conversationContent.textContent || 'No content found';

                        // Generate fingerprints for deduplication
                        const cssFingerprint = extractCSSFingerprint(rawHTML);
                        const contentHash = generateContentHash(title, contentText);

                        results_content.push({
                            id: "content",
                            text: rawHTML,
                            textContent: contentText,
                            cssFingerprint: cssFingerprint,
                            contentHash: contentHash,
                            chatItemClass: chatCSSFingerprint
                        });

                        console.log(`✅ Extracted: "${title.substring(0, 50)}..." (${rawHTML.length} chars, hash: ${contentHash})`);
                    } else {
                        console.warn(`⚠️ Conversation content not found for: "${title}"`);
                        // Still add placeholder content
                        results_content.push({
                            id: "content",
                            text: 'Content not accessible - conversation may need to be opened manually',
                            textContent: 'Content not accessible',
                            cssFingerprint: '',
                            contentHash: generateContentHash(title, 'Content not accessible'),
                            chatItemClass: chatCSSFingerprint
                        });
                    }
                } catch (error) {
                    console.warn(`Error processing conversation "${title}":`, error);
                    // Add placeholder content on error
                    results_content.push({
                        id: "content",
                        text: 'Error accessing content',
                        textContent: 'Error accessing content',
                        cssFingerprint: '',
                        contentHash: generateContentHash(title, 'Error accessing content'),
                        chatItemClass: chatCSSFingerprint
                    });
                }
            }
    } else {
        console.error('Recent Chats section not found.');
        console.log("=== DUCK.AI FALLBACK APPROACH ===");

        // Duck.ai specific fallback selectors based on the HTML structure
        const fallbackSelectors = [
            'div[title].clS_s3a7onj0_NFty2Qh', // Specific Duck.ai chat item class
            'div[title][class*="clS_s3a7onj0_NFty2Qh"]', // Partial class match
            'div[title]', // Any div with title
            '[title]' // Any element with title as final fallback
        ];

        let foundItems = [];
        for (const selector of fallbackSelectors) {
            const items = Array.from(document.querySelectorAll(selector));
            console.log(`Fallback selector "${selector}": ${items.length} items`);

            if (items.length > 0) {
                // Duck.ai specific filtering for conversation titles
                const conversationItems = items.filter(item => {
                    const title = item.title || '';
                    const text = item.textContent || item.innerText || '';

                    // More specific filtering for Duck.ai conversations
                    const hasValidTitle = title.length > 15 && title.length < 1000;
                    const notUIElement = !title.toLowerCase().includes('button') &&
                                       !title.toLowerCase().includes('menu') &&
                                       !title.toLowerCase().includes('close') &&
                                       !title.toLowerCase().includes('search') &&
                                       !title.toLowerCase().includes('settings') &&
                                       !title.toLowerCase().includes('tooltip') &&
                                       !title.toLowerCase().includes('aria-label');

                    // Check if it looks like an actual conversation
                    const looksLikeConversation = /[.!?]/.test(title) || title.split(' ').length > 5;

                    return hasValidTitle && notUIElement && looksLikeConversation;
                });

                console.log(`Filtered Duck.ai conversation items: ${conversationItems.length}`);
                if (conversationItems.length > 0) {
                    foundItems = conversationItems;
                    console.log("Sample titles found:");
                    conversationItems.slice(0, 3).forEach((item, i) => {
                        console.log(`  ${i+1}: "${item.title.substring(0, 80)}..."`);
                    });
                    break;
                }
            }
        }

        if (foundItems.length > 0) {
            console.log(`Using Duck.ai fallback approach with ${foundItems.length} items`);

            // Process chat items - focus on titles first for Duck.ai
            for (let i = 0; i < foundItems.length; i++) {
                const chat = foundItems[i];

                if (progressCallback) {
                    progressCallback(i + 1, foundItems.length, `Processing conversation ${i + 1} of ${foundItems.length}...`);
                }

                // Extract title (Duck.ai stores full conversation title in the title attribute)
                const title = (chat.title || chat.textContent?.trim() || chat.innerText?.trim() || `Conversation ${i + 1}`).trim();
                console.log(`Processing fallback conversation ${i + 1}: "${title.substring(0, 50)}..."`);

                // Add title first
                results_title.push({
                    id: "title",
                    text: title,
                });

                // Try to get content but don't fail if it doesn't work
                try {
                    // Click to load content
                    chat.click();
                    await new Promise(resolve => setTimeout(resolve, 600));

                    // Duck.ai specific content selectors
                    let conversationContent = document.querySelector('div[data-activeresponse="true"]') ||
                                           document.querySelector('div[data-activeresponse]') ||
                                           document.querySelector('main section:last-child') ||
                                           document.querySelector('[role="main"] div') ||
                                           document.querySelector('main');

                    if (conversationContent) {
                        const rawHTML = conversationContent.innerHTML || 'No content found';
                        const contentText = conversationContent.innerText || conversationContent.textContent || 'No content found';

                        // Generate fingerprints for deduplication
                        const cssFingerprint = extractCSSFingerprint(rawHTML);
                        const contentHash = generateContentHash(title, contentText);

                        results_content.push({
                            id: "content",
                            text: rawHTML,
                            textContent: contentText,
                            cssFingerprint: cssFingerprint,
                            contentHash: contentHash,
                            chatItemClass: chat.className || ''
                        });

                        console.log(`✅ Extracted (fallback): "${title.substring(0, 50)}..." (${rawHTML.length} chars)`);
                    } else {
                        console.warn(`⚠️ Content not accessible for: "${title}"`);
                        // Add placeholder content
                        results_content.push({
                            id: "content",
                            text: 'Content not accessible - conversation may need to be opened manually',
                            textContent: 'Content not accessible',
                            cssFingerprint: '',
                            contentHash: generateContentHash(title, 'Content not accessible'),
                            chatItemClass: chat.className || ''
                        });
                    }
                } catch (error) {
                    console.warn(`Error processing fallback conversation "${title}":`, error);
                    // Add error placeholder
                    results_content.push({
                        id: "content",
                        text: 'Error accessing content',
                        textContent: 'Error accessing content',
                        cssFingerprint: '',
                        contentHash: generateContentHash(title, 'Error accessing content'),
                        chatItemClass: chat.className || ''
                    });
                }
            }
        } else {
            errors = true;
            console.error('No Duck.ai conversation titles found with any approach');
            console.log("Final attempt: searching for any elements that might contain conversation titles...");

            // Ultra-fallback: look for any text that might be conversation titles
            const allElements = Array.from(document.querySelectorAll('*'));
            const potentialTitles = allElements.filter(el => {
                const text = el.title || el.textContent || '';
                return text.length > 20 && text.length < 500 &&
                       /[.!?]/.test(text) &&
                       text.split(' ').length > 5 &&
                       !text.toLowerCase().includes('button');
            }).slice(0, 5);

            if (potentialTitles.length > 0) {
                console.log(`Found ${potentialTitles.length} potential conversation titles in ultra-fallback`);
                potentialTitles.forEach((el, i) => {
                    const text = (el.title || el.textContent || '').trim();
                    results_title.push({
                        id: "title",
                        text: text,
                    });
                    results_content.push({
                        id: "content",
                        text: 'Content extraction failed - fallback title only',
                        textContent: 'Content extraction failed',
                        cssFingerprint: '',
                        contentHash: generateContentHash(text, 'Content extraction failed'),
                        chatItemClass: el.className || ''
                    });
                });
                errors = false; // We found something at least
            }
        }
    }
    }

    // Keep original order mapping with enhanced metadata
    results = results_title.map((titleItem, index) => {
        const contentItem = results_content[index];
        return {
            id: `conversation_${index}`,
            title: titleItem.text,
            content: contentItem ? contentItem.text : '',
            textContent: contentItem ? contentItem.textContent : '',
            cssFingerprint: contentItem ? contentItem.cssFingerprint : '',
            contentHash: contentItem ? contentItem.contentHash : '',
            timestamp: Date.now() - index, // Add timestamp to preserve order
            backupDate: new Date().toISOString()
        };
    });

    console.log(`✅ Backup completed: ${results.length} conversations processed`);
    console.log('Results summary:', results.map(r => ({ title: r.title.substring(0, 50), hasContent: r.content !== 'Content not accessible' })));

    return results.length > 0 ? results : { error: true, message: 'No conversations found or processed' };
}


async function fetchHeadings() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: function () {
      // Define fetchContents inside the executed script
      function fetchContents() {
        const results = [];

        // Process each heading individually
        Array.from(document.querySelectorAll('h1,h2,h3')).forEach(heading => {
          // Add the heading
          results.push({ text: heading.innerText.trim(), tag: heading.tagName, tag_sort: 'title' });

          // Find all p tags that follow this heading until the next heading
          let nextElement = heading.nextElementSibling;
          while (nextElement && !['H1', 'H2', 'H3'].includes(nextElement.tagName)) {
            if (nextElement.tagName === 'P') {
              results.push({ text: nextElement.innerText.trim(), tag: 'P', tag_sort: 'content' });
            }
            else if (nextElement.tagName === 'UL') {
              results.push({ text: nextElement.innerText.trim(), tag: 'UL', tag_sort: 'content' });
            }
            else if (nextElement.tagName === 'OL') {
              results.push({ text: nextElement.innerText.trim(), tag: 'OL', tag_sort: 'content' });
            }
            else if (nextElement.tagName === 'LI') {
              results.push({ text: nextElement.innerText.trim(), tag: 'LI', tag_sort: 'content' });
            }
            else if (nextElement.tagName === 'DL') {
              results.push({ text: nextElement.innerText.trim(), tag: 'DL', tag_sort: 'content' });
            }
            else if (nextElement.tagName === 'DT') {
              results.push({ text: nextElement.innerText.trim(), tag: 'DT', tag_sort: 'content' });
            }
            else if (nextElement.tagName === 'DD') {
              results.push({ text: nextElement.innerText.trim(), tag: 'DD', tag_sort: 'content' });
            }
           else {
              results.push({ text: '', tag: nextElement.tagName, tag_sort: 'content' });
            }
            nextElement = nextElement.nextElementSibling;
          }
        });
        return results;
      }

      // Execute the function
      const results = fetchContents();

      // Filter and log
      const titles = results.filter(item => item.tag_sort === 'title');
      const contents = results.filter(item => item.tag_sort === 'content');

      console.log('All titles:', titles);
      console.log('All contents:', contents);

      return results; // Return the actual results
    }
  });
  return results[0].result;
}

async function FilterTitles(results) {
  return results.filter(item => item.tag_sort === 'title');
}

async function FilterContents(results) {
  return results.filter(item => item.tag_sort === 'content');
}

async function FilterBackupTitles(results) {
  return results.filter(item => item.title);
}

async function FilterBackupContents(results) {
  return results.filter(item => item.content.text);
}

function truncateTitle(title, maxLength = 80) {
  if (!title || title.length <= maxLength) return title;

  // Try to break at word boundaries for better 2-line display
  const truncated = title.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.6) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

async function renderTitlesOnly() {
  listEl.innerHTML = '';
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const li = document.createElement('li');
    const originalTitle = it.title || it.text || `Conversation ${i + 1}`;
    const displayText = truncateTitle(originalTitle);

    // Check if this conversation has been backed up
    let backupIndicator = '';
    if (conversationData && conversationData[it.index]) {
      const conversation = conversationData[it.index];
      const isDuplicate = await checkDuplicateConversation(conversation);
      const localCheck = await checkLocalDownloadedFiles(conversation);

      if (isDuplicate || localCheck.found) {
        backupIndicator = '<span style="color: #28a745; font-weight: bold; margin-left: 4px;" title="Already backed up">✓</span>';
      }
    }

    li.innerHTML = `
      <label>
        <input type="checkbox" data-i="${i}" ${it.checked ? 'checked' : ''}/>
        <span class="title-text" title="${originalTitle.replace(/"/g, '&quot;')}">${displayText}</span>
        ${backupIndicator}
      </label>
    `;
    listEl.appendChild(li);
  }
}

function render() {
  listEl.innerHTML = '';
  items.forEach((it, i) => {
    const li = document.createElement('li');
    const displayText = it.text || it.title || `Item ${i + 1}`;
    const tagText = it.tag ? `${it.tag} — ` : '';
    li.innerHTML = `<label><input type="checkbox" data-i="${i}" ${it.checked ? 'checked' : ''}/> ${tagText}${displayText}</label>`;
    listEl.appendChild(li);
  });
}

// Progress bar elements
const progressWrapper = document.getElementById('progressWrapper');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

// Function to show/hide progress bar
function showProgress() {
  progressWrapper.classList.add('show');
  progressBar.style.width = '0%';
  progressText.textContent = '0%';
}

function hideProgress() {
  progressWrapper.classList.remove('show');
  progressBar.style.width = '0%';
  progressText.textContent = '0%';
}

function updateProgress(current, total, message = '') {
  const percentage = Math.round((current / total) * 100);
  progressBar.style.width = `${percentage}%`;
  progressText.textContent = `${percentage}%`;
  if (message) {
    statusEl.textContent = message;
  }
}

refreshBtn.addEventListener('click', async () => {
  statusEl.textContent = 'Loading chat titles...';
  hideProgress();

  try {
    // Check cache first
    let cachedData = await getCachedConversations();

    if (cachedData) {
      conversationData = cachedData;
      const cacheInfo = await getCacheInfo();
      statusEl.textContent = `Loaded cached chat titles (expires in ${cacheInfo.remainingMinutes}min)...`;
    } else {
      statusEl.textContent = 'Parsing chat data (this may take a moment)...';
      showProgress();

      // Get fresh data from the page with progress tracking
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Simulate realistic progress during parsing
      const progressSteps = [
        { percent: 5, message: 'Initializing chat parsing...' },
        { percent: 15, message: 'Locating chat sections...' },
        { percent: 30, message: 'Extracting chat titles...' },
        { percent: 50, message: 'Processing conversations...' },
        { percent: 70, message: 'Gathering content data...' },
        { percent: 85, message: 'Organizing results...' },
        { percent: 95, message: 'Finalizing data...' }
      ];

      // Start progress animation
      let currentStep = 0;
      let progressInterval = setInterval(() => {
        if (currentStep < progressSteps.length) {
          const step = progressSteps[currentStep];
          updateProgress(step.percent, 100, step.message);
          currentStep++;
        }
      }, 400);

      try {
        const backupResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: backupConversations
        });

        // Clear interval and complete progress
        clearInterval(progressInterval);
        updateProgress(100, 100, 'Complete!');

        const result = backupResults[0].result;
        console.log('Raw backup result:', result);

        // Check if result is an error object
        if (result && result.error) {
          throw new Error(result.message || 'Unknown error occurred during backup');
        }

        conversationData = result;

        await new Promise(resolve => setTimeout(resolve, 600));
        hideProgress();
      } catch (scriptError) {
        clearInterval(progressInterval);
        hideProgress();
        console.error('Script execution error:', scriptError);
        statusEl.textContent = `Error: ${scriptError.message || 'Failed to load conversations'}`;
        throw scriptError;
      }

      // Cache the fresh data
      if (conversationData && Array.isArray(conversationData) && conversationData.length > 0) {
        await setCachedConversations(conversationData);
      }
    }

    console.log('Final conversationData:', conversationData);

    if (!conversationData || !Array.isArray(conversationData) || conversationData.length === 0) {
      statusEl.textContent = 'No conversations found - try refreshing the DuckAI page or check if conversations are visible';
      hideProgress();
      return;
    }

    // Show only titles in the UI (maintain original order - latest first)
    items = conversationData.map((r, index) => ({
      title: r.title,
      checked: false,
      index: index // Keep reference to original data
    }));

    await renderTitlesOnly();

    if (cachedData) {
      const cacheInfo = await getCacheInfo();
      statusEl.textContent = `Loaded ${conversationData.length} chat titles (cached, ${cacheInfo.remainingMinutes}min left)`;
    } else {
      statusEl.textContent = `Loaded ${conversationData.length} chat titles (fresh data, cached for 5min)`;
    }
  } catch (error) {
    console.error('Error loading chat titles:', error);
    statusEl.textContent = 'Error loading chat titles - Please try again';
    hideProgress();
  }
});

// Add a force refresh function that bypasses cache
async function forceRefresh() {
  // Clear cache first
  await chrome.storage.local.remove([CACHE_KEY, CACHE_KEY + '_timestamp']);
  // Then refresh normally
  refreshBtn.click();
}

// Add force refresh on double-click
refreshBtn.addEventListener('dblclick', forceRefresh);

// Add clear cache button functionality
document.getElementById('clearCache').addEventListener('click', async () => {
  try {
    await chrome.storage.local.remove([CACHE_KEY, CACHE_KEY + '_timestamp']);
    statusEl.textContent = 'Cache cleared successfully';
    items = [];
    conversationData = [];
    await renderTitlesOnly();
  } catch (error) {
    console.error('Error clearing cache:', error);
    statusEl.textContent = 'Error clearing cache';
  }
});

toggleBtn.addEventListener('click', async () => {
  const allChecked = items.every(i => i.checked);
  items = items.map(i => ({ ...i, checked: !allChecked }));
  await renderTitlesOnly();
});

// Add checkbox event listeners
listEl.addEventListener('change', (e) => {
  if (e.target.type === 'checkbox') {
    const index = parseInt(e.target.getAttribute('data-i'));
    items[index].checked = e.target.checked;
    // Re-render to update backup indicators if needed
    setTimeout(() => renderTitlesOnly(), 100);
  }
});

// Add download button functionality
document.getElementById('downloadButton').addEventListener('click', async () => {
  const checkedItems = items.filter(item => item.checked);
  if (checkedItems.length === 0) {
    statusEl.textContent = 'No items selected for download';
    return;
  }

  if (!conversationData || conversationData.length === 0) {
    statusEl.textContent = 'Please load chat titles first';
    return;
  }

  console.log('Items to download:', checkedItems);

  statusEl.textContent = `Creating ${checkedItems.length} .md files...`;
  let downloadedCount = 0;
  let skippedCount = 0;

  // Download each selected conversation as a separate file
  for (let i = 0; i < checkedItems.length; i++) {
    const item = checkedItems[i];
    const conversationIndex = item.index;
    const conversation = conversationData[conversationIndex];

    if (conversation) {
      try {
        const result = await downloadSingleConversation(conversation, i);
        if (result === 'skipped' || result === 'skipped_local') {
          skippedCount++;
        } else {
          downloadedCount++;
        }
        statusEl.textContent = `Progress: ${downloadedCount} downloaded, ${skippedCount} skipped duplicates...`;

        // Add delay between downloads
        if (i < checkedItems.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error('Error downloading conversation:', error);
      }
    }
  }

  statusEl.textContent = `Complete: ${downloadedCount} downloaded, ${skippedCount} skipped duplicates`;
});

function htmlToMarkdown(html) {
  // Handle null/undefined html
  if (!html || typeof html !== 'string') {
    return 'No content available';
  }

  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // First pass: Handle code blocks and preserve them
  const codeBlocks = [];
  let codeIndex = 0;

  // Extract and preserve code blocks
  html = html.replace(/<pre[^>]*>[\s\S]*?<code[^>]*>([\s\S]*?)<\/code>[\s\S]*?<\/pre>/gi, (match, code) => {
    const placeholder = `__CODE_BLOCK_${codeIndex}__`;
    codeBlocks[codeIndex] = '\n```\n' + code.replace(/<[^>]+>/g, '').trim() + '\n```\n';
    codeIndex++;
    return placeholder;
  });

  // Handle inline code
  html = html.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

  // Convert other HTML elements to markdown with better handling
  let markdown = html
    // Headers
    .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (match, level, content) => {
      const hashes = '#'.repeat(parseInt(level));
      return `\n${hashes} ${content.replace(/<[^>]+>/g, '').trim()}\n\n`;
    })
    // Text formatting
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    // Links and images
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')
    // Lists with better handling
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
      const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      return '\n' + items.map(item =>
        '- ' + item.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '$1').replace(/<[^>]+>/g, '').trim()
      ).join('\n') + '\n\n';
    })
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
      const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      return '\n' + items.map((item, index) =>
        `${index + 1}. ` + item.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '$1').replace(/<[^>]+>/g, '').trim()
      ).join('\n') + '\n\n';
    })
    // Blockquotes
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
      const cleanContent = content.replace(/<[^>]+>/g, '').trim();
      return '\n> ' + cleanContent.replace(/\n/g, '\n> ') + '\n\n';
    })
    // Paragraphs and divs
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1\n')
    .replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1')
    // Line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '') // Trim lines
    .trim();

  // Restore code blocks
  for (let i = 0; i < codeBlocks.length; i++) {
    markdown = markdown.replace(`__CODE_BLOCK_${i}__`, codeBlocks[i]);
  }

  return markdown;
}

// Check if conversation already exists in local downloads folder
async function checkLocalDownloadedFiles(conversation) {
  try {
    // This would require additional permissions to access local files
    // For now, we'll use the browser's storage as a proxy
    const { downloadedFiles = {} } = await chrome.storage.local.get(['downloadedFiles']);

    // Check if this conversation's CSS classes or hash exists in downloaded files
    const cssClasses = conversation.chatItemClass;
    const contentHash = conversation.contentHash;

    if (cssClasses && downloadedFiles[cssClasses]) {
      console.log(`📁 Found in local downloads by CSS classes: ${conversation.title?.substring(0, 50)}...`);
      return { found: true, type: 'css_classes', file: downloadedFiles[cssClasses] };
    }

    if (contentHash && downloadedFiles[contentHash]) {
      console.log(`📁 Found in local downloads by content hash: ${conversation.title?.substring(0, 50)}...`);
      return { found: true, type: 'content_hash', file: downloadedFiles[contentHash] };
    }

    return { found: false };
  } catch (error) {
    console.error('Error checking local downloads:', error);
    return { found: false };
  }
}

// Track downloaded files for local checking
async function trackDownloadedFile(conversation, filename) {
  try {
    const { downloadedFiles = {} } = await chrome.storage.local.get(['downloadedFiles']);

    // Store by both CSS classes and content hash for multiple lookup methods
    if (conversation.chatItemClass) {
      downloadedFiles[conversation.chatItemClass] = filename;
    }
    if (conversation.contentHash) {
      downloadedFiles[conversation.contentHash] = filename;
    }

    await chrome.storage.local.set({ downloadedFiles });
    console.log(`📁 Tracked downloaded file: ${filename}`);
  } catch (error) {
    console.error('Error tracking downloaded file:', error);
  }
}

// Check if conversation already exists in backup history
async function checkDuplicateConversation(conversation) {
  try {
    const { [BACKUP_HISTORY_KEY]: history } = await chrome.storage.local.get([BACKUP_HISTORY_KEY]);
    if (!history || !Array.isArray(history)) {
      return false;
    }

    // Check by content hash first (most reliable)
    if (conversation.contentHash && history.some(item => item.contentHash === conversation.contentHash)) {
      console.log(`🔍 Duplicate found by content hash: ${conversation.title?.substring(0, 50)}...`);
      return true;
    }

    // Check by CSS fingerprint (for similar layout structures)
    if (conversation.cssFingerprint && history.some(item => item.cssFingerprint === conversation.cssFingerprint)) {
      console.log(`🔍 Duplicate found by CSS fingerprint: ${conversation.title?.substring(0, 50)}...`);
      return true;
    }

    // NEW: Check by chat item CSS class (specific to DuckAI div classes)
    if (conversation.chatItemClass && history.some(item => item.chatItemClass === conversation.chatItemClass)) {
      console.log(`🔍 Duplicate found by chat item CSS class: ${conversation.title?.substring(0, 50)}...`);
      return true;
    }

    // Check by title similarity (fuzzy match)
    const title = conversation.title?.toLowerCase().trim();
    if (title && history.some(item =>
      item.title?.toLowerCase().trim() === title ||
      item.title?.toLowerCase().includes(title) ||
      title.includes(item.title?.toLowerCase().trim() || '')
    )) {
      console.log(`🔍 Duplicate found by title similarity: ${conversation.title?.substring(0, 50)}...`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return false;
  }
}

// Add conversation to backup history
async function addToBackupHistory(conversation) {
  try {
    const { [BACKUP_HISTORY_KEY]: history = [] } = await chrome.storage.local.get([BACKUP_HISTORY_KEY]);

    const historyEntry = {
      title: conversation.title,
      contentHash: conversation.contentHash,
      cssFingerprint: conversation.cssFingerprint,
      chatItemClass: conversation.chatItemClass, // NEW: Store DuckAI CSS classes
      backupDate: new Date().toISOString(),
      filename: conversation.filename || 'unknown'
    };

    history.push(historyEntry);

    // Keep only last 100 entries to avoid storage bloat
    const trimmedHistory = history.slice(-100);

    await chrome.storage.local.set({ [BACKUP_HISTORY_KEY]: trimmedHistory });
    console.log('Added to backup history:', historyEntry);
  } catch (error) {
    console.error('Error adding to backup history:', error);
  }
}

async function downloadSingleConversation(conversation, fileIndex = 0) {
  console.log('Downloading single conversation:', conversation);

  // Check if this conversation was already backed up
  const isDuplicate = await checkDuplicateConversation(conversation);
  if (isDuplicate) {
    console.log(`Skipping duplicate conversation: ${conversation.title}`);
    return 'skipped';
  }

  // Check if this conversation exists in local downloads
  const localCheck = await checkLocalDownloadedFiles(conversation);
  if (localCheck.found) {
    console.log(`Skipping conversation found in local downloads (${localCheck.type}): ${conversation.title}`);
    return 'skipped_local';
  }

  // Create filename with requested format: DuckAI_Conversation_YYYYMMDD_HHh_MMm.md
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const timeStr = `${now.getHours()}h_${now.getMinutes().toString().padStart(2, '0')}m`;
  const filename = `DuckAI_Conversation_${dateStr}_${timeStr}${fileIndex > 0 ? `_${fileIndex}` : ''}.md`;

  let markdownContent = `# ${conversation.title || 'Untitled Conversation'}\n\n`;
  markdownContent += `*Exported on: ${now.toLocaleString()}*\n\n`;

  // Add metadata for debugging and deduplication
  if (conversation.contentHash) {
    markdownContent += `*Content Hash: ${conversation.contentHash}*\n\n`;
  }
  if (conversation.cssFingerprint) {
    markdownContent += `*CSS Fingerprint: ${conversation.cssFingerprint.substring(0, 50)}...*\n\n`;
  }
  if (conversation.chatItemClass) {
    markdownContent += `*DuckAI CSS Classes: ${conversation.chatItemClass}*\n\n`;
  }

  markdownContent += '---\n\n';

  // Convert HTML content to markdown with improved conversion
  const content = conversation.content || 'No content available';
  const contentMarkdown = htmlToMarkdown(content);
  markdownContent += `${contentMarkdown}\n\n`;

  // Add original HTML as comment for debugging (first 500 chars)
  if (content && content !== 'No content available') {
    const htmlPreview = content.substring(0, 500).replace(/-->/g, '-\\->');
    markdownContent += `\n\n<!-- Original HTML Preview:\n${htmlPreview}...\n-->\n`;
  }

  console.log(`Creating file: ${filename}`);

  // Add to backup history
  conversation.filename = filename;
  await addToBackupHistory(conversation);

  // Track this file for local download checking
  await trackDownloadedFile(conversation, filename);

  const blob = new Blob([markdownContent], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return 'downloaded';
}



// Backup history management
document.getElementById('viewHistory').addEventListener('click', async () => {
  const modal = document.getElementById('historyModal');
  const historyList = document.getElementById('historyList');

  try {
    const { [BACKUP_HISTORY_KEY]: history = [] } = await chrome.storage.local.get([BACKUP_HISTORY_KEY]);

    if (history.length === 0) {
      historyList.innerHTML = '<p style="color: #666; font-style: italic;">No backup history found.</p>';
    } else {
      historyList.innerHTML = history.reverse().map((item, index) =>
        '<div style="border: 1px solid #e1e5e9; border-radius: 4px; padding: 8px; margin: 4px 0; background: #f8f9fa;">' +
          '<div style="font-weight: bold; font-size: 0.9em; margin-bottom: 4px;">' + (item.title || 'Untitled') + '</div>' +
          '<div style="font-size: 0.75em; color: #666;">' +
            '<div>Date: ' + new Date(item.backupDate).toLocaleString() + '</div>' +
            '<div>File: ' + (item.filename || 'unknown') + '</div>' +
            '<div>Hash: ' + (item.contentHash || 'none') + '</div>' +
            '<div>CSS Classes: ' + (item.chatItemClass || 'none') + '</div>' +
          '</div>' +
        '</div>'
      ).join('');
    }

    modal.style.display = 'block';
  } catch (error) {
    console.error('Error loading backup history:', error);
    historyList.innerHTML = '<p style="color: #dc3545;">Error loading backup history.</p>';
    modal.style.display = 'block';
  }
});

document.getElementById('closeHistory').addEventListener('click', () => {
  document.getElementById('historyModal').style.display = 'none';
});

document.getElementById('clearHistory').addEventListener('click', async () => {
  // Create a custom modal dialog for better formatting and visibility
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white;
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    max-width: 400px;
    width: 90%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  dialog.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 16px 0; color: #d32f2f; font-size: 18px;">⚠️ Clear Backup History</h3>
      <p style="margin: 0 0 12px 0; color: #333; line-height: 1.5;">
        Are you sure you want to clear all backup history?
      </p>
      <div style="color: #666; font-size: 14px; line-height: 1.4;">
        <p style="margin: 8px 0 4px 0; font-weight: bold;">This action will:</p>
        <ul style="margin: 4px 0; padding-left: 20px;">
          <li>Remove all deduplication records</li>
          <li>Allow re-downloading of previously backed up conversations</li>
          <li style="color: #d32f2f; font-weight: bold;">Cannot be undone</li>
        </ul>
      </div>
    </div>
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button id="cancelClear" style="
        padding: 8px 16px;
        border: 1px solid #ddd;
        background: white;
        color: #333;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      ">Cancel</button>
      <button id="confirmClear" style="
        padding: 8px 16px;
        border: none;
        background: #d32f2f;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
      ">Clear History</button>
    </div>
  `;

  modal.appendChild(dialog);
  document.body.appendChild(modal);

  // Add button event listeners
  document.getElementById('cancelClear').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  document.getElementById('confirmClear').addEventListener('click', async () => {
    document.body.removeChild(modal);
    try {
      await chrome.storage.local.remove([BACKUP_HISTORY_KEY]);
      statusEl.textContent = 'Backup history cleared successfully';
      // Close the history modal if it's open
      const historyModal = document.getElementById('historyModal');
      if (historyModal.style.display === 'block') {
        historyModal.style.display = 'none';
      }
    } catch (error) {
      console.error('Error clearing backup history:', error);
      statusEl.textContent = 'Error clearing backup history';
    }
  });

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
});

// Add test button functionality (for debugging)
if (document.getElementById('testStructure')) {
  document.getElementById('testStructure').addEventListener('click', async function() {
    statusEl.textContent = 'Running debug test...';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const debugResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: function() {
        console.log("=== ENHANCED DEBUG TEST ===");
        console.log("Current URL:", window.location.href);
        console.log("Page title:", document.title);

        // Test all possible selectors for conversations
        const testSelectors = [
          'div[title]',
          'button[title]',
          '[role="button"][title]',
          'a[title]',
          'p',
          '.chat-item',
          '.conversation-item',
          '[data-testid*="chat"]',
          '[aria-label*="chat"]',
          '[aria-label*="conversation"]',
          'li[title]',
          'span[title]'
        ];

        const results = {};

        testSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          results[selector] = {
            count: elements.length,
            samples: Array.from(elements).slice(0, 3).map(el => ({
              text: (el.title || el.textContent || el.innerText || '').substring(0, 100),
              tagName: el.tagName,
              className: el.className,
              id: el.id
            }))
          };
        });

        // Look for text patterns that might indicate conversations
        const textPatterns = [
          'Recent Chats',
          'Chat History',
          'Conversations',
          'Messages',
          'History'
        ];

        const textResults = {};
        textPatterns.forEach(pattern => {
          const elements = Array.from(document.querySelectorAll('*')).filter(el =>
            el.textContent && el.textContent.toLowerCase().includes(pattern.toLowerCase())
          );
          textResults[pattern] = {
            count: elements.length,
            samples: elements.slice(0, 2).map(el => ({
              text: el.textContent.substring(0, 100),
              tagName: el.tagName,
              className: el.className
            }))
          };
        });

        return { selectors: results, textPatterns: textResults };
      }
    });

    console.log('Debug results:', debugResults[0].result);
    statusEl.textContent = 'Debug completed - check console for detailed results';
  });
}

```


## User

I also discovered that the CSS fingerprint (those used in HTML for the Period of time (Today, Year, ... see further) isn't specific code, but rather always the same for each sideebar-title 

for example:

Maybe later on it is possible to get a filter in the titles so they are automaticly sorted in the same way:
<span class="gj1DLKT2IqzlxHKsuX6c">Any time</span>
<span class="gj1DLKT2IqzlxHKsuX6c">Today</span>
<span class="gj1DLKT2IqzlxHKsuX6c">Past day</span>
<span class="gj1DLKT2IqzlxHKsuX6c">Past week</span>
<span class="gj1DLKT2IqzlxHKsuX6c">Past month</span>
<span class="gj1DLKT2IqzlxHKsuX6c">Past 6 month</span>
<span class="gj1DLKT2IqzlxHKsuX6c">Past year</span>Don't know if that is the same for the specific div-class-name (code) for (the content of) each titleif that is specific or also (like with the period of time noticed (just before - prev. messages) isn't specific at allCan you tell me, what you've just done with the code (refactoring)?(in summary)I guess a new thread or not, didn't make sense as long as I refer to that big full HTML-page (even if it is stored in my current project), you seem to get cut-off/lost ... no further interaction possible (at your end)!

Still the error: after clicking on the button named: "Load Chat-titles":

No conversations found - try refreshing the DuckAI page or check if conversations are visible

