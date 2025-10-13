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
  statusEl.textContent = 'Saved securely: ' + encryptedItems.length + ' items — stored in local storage (encrypted)';
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

    // Debug: Check for various possible selectors
    console.log("=== DEBUGGING CONVERSATION DETECTION ===");

    // Try multiple approaches to find conversations
    const possibleSelectors = [
        'p',
        '[data-testid*="chat"]',
        '[title]',
        'div[title]',
        'button[title]',
        '.chat-item',
        '.conversation-item',
        '[role="button"][title]'
    ];

    possibleSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log('Selector "' + selector + '": found ' + elements.length + ' elements');
        if (elements.length > 0 && elements.length < 20) {
            Array.from(elements).slice(0, 5).forEach((el, i) => {
                console.log('  ' + (i+1) + ': "' + (el.title || el.textContent || el.innerText || '').substring(0, 100) + '..."');
            });
        }
    });

    // Check for "Recent Chats" text in various ways
    console.log("=== SEARCHING FOR 'Recent Chats' ===");
    const textSearches = [
        'Recent Chats',
        'recent chats',
        'Recent',
        'Chats',
        'History',
        'Conversations'
    ];

    textSearches.forEach(searchText => {
        const elements = Array.from(document.querySelectorAll('*')).filter(el =>
            el.textContent && el.textContent.toLowerCase().includes(searchText.toLowerCase())
        );
        console.log('Text "' + searchText + '": found in ' + elements.length + ' elements');
        if (elements.length > 0 && elements.length < 10) {
            elements.forEach((el, i) => {
                console.log('  ' + (i+1) + ': ' + el.tagName + ' - "' + el.textContent.substring(0, 50) + '..."');
            });
        }
    });

    // Original approach
    const recentChatsSection = Array.from(document.querySelectorAll('p'))
        .find(p => p.innerText.includes('Recent Chats'));

    console.log("Original 'Recent Chats' section found:", !!recentChatsSection);

    if (recentChatsSection) {
        console.log("Recent Chats section found.");
        console.log("Parent element:", recentChatsSection.parentElement);
        console.log("Closest div:", recentChatsSection.closest('div'));

        const nextSibling = recentChatsSection.closest('div').nextElementSibling;
        console.log("Next sibling element:", nextSibling);

        if (nextSibling) {
            const chatItems = Array.from(nextSibling.querySelectorAll('div[title]'));
            console.log('Found ' + chatItems.length + ' chat items with div[title] selector');

            // Try alternative selectors if no items found
            if (chatItems.length === 0) {
                const altSelectors = ['[title]', 'button', 'div', 'a'];
                altSelectors.forEach(altSelector => {
                    const altItems = Array.from(nextSibling.querySelectorAll(altSelector));
                    console.log('Alternative selector "' + altSelector + '": ' + altItems.length + ' items');
                    if (altItems.length > 0 && altItems.length < 20) {
                        altItems.slice(0, 3).forEach((item, i) => {
                            console.log('  ' + (i+1) + ': "' + (item.title || item.textContent || '').substring(0, 50) + '..."');
                        });
                    }
                });
            }

            const totalItems = chatItems.length;

            // Report initial progress
            if (progressCallback) progressCallback(0, totalItems, 'Starting to parse conversations...');

            // Keep original order (latest first) - reverse only if needed
            for (let i = 0; i < chatItems.length; i++) {
                const chat = chatItems[i];

                // Update progress
                if (progressCallback) {
                    progressCallback(i + 1, totalItems, 'Processing conversation ' + (i + 1) + ' of ' + totalItems + '...');
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
                    const title = chat.innerText.trim();
                    const rawHTML = conversationContent.innerHTML || 'No content found';
                    const contentText = conversationContent.innerText || conversationContent.textContent || 'No content found';

                    // Generate fingerprints for deduplication
                    const cssFingerprint = extractCSSFingerprint(rawHTML);
                    const contentHash = generateContentHash(title, contentText);

                    results_title.push({
                        id: "title",
                        text: title,
                    });

                    results_content.push({
                        id: "content",
                        text: rawHTML,
                        textContent: contentText,
                        cssFingerprint: cssFingerprint,
                        contentHash: contentHash
                    });

                    console.log('Extracted: ' + title + ' (' + rawHTML.length + ' chars, hash: ' + contentHash + ')');
                } else {
                    console.error('Conversation content not found for:', chat.innerText);
                    const title = chat.innerText.trim();
                    // Still add title even if content not found
                    results_title.push({
                        id: "title",
                        text: title,
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
            console.log('Fallback selector "' + selector + '": ' + items.length + ' items');

            if (items.length > 0) {
                // Filter items that look like conversation titles
                const conversationItems = items.filter(item => {
                    const text = item.title || item.textContent || item.innerText || '';
                    return text.length > 10 && text.length < 200 &&
                           !text.toLowerCase().includes('button') &&
                           !text.toLowerCase().includes('menu') &&
                           !text.toLowerCase().includes('close');
                });

                console.log('Filtered conversation items: ' + conversationItems.length);
                if (conversationItems.length > 0) {
                    foundItems = conversationItems;
                    break;
                }
            }
        }

        if (foundItems.length > 0) {
            console.log('Using fallback approach with ' + foundItems.length + ' items');

            for (let i = 0; i < foundItems.length; i++) {
                const chat = foundItems[i];

                if (progressCallback) {
                    progressCallback(i + 1, foundItems.length, 'Processing conversation ' + (i + 1) + ' of ' + foundItems.length + '...');
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
                    const title = chat.title || chat.textContent || chat.innerText || 'Conversation ' + (i + 1);
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

                    console.log('Extracted (fallback): ' + title + ' (' + rawHTML.length + ' chars, hash: ' + contentHash + ')');
                } else {
                    console.error('Conversation content not found for:', chat.title || chat.textContent);
                    const title = chat.title || chat.textContent || chat.innerText || 'Conversation ' + (i + 1);
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

    // Keep original order mapping with enhanced metadata
    results = results_title.map((titleItem, index) => {
        const contentItem = results_content[index];
        return {
            id: 'conversation_' + index,
            title: titleItem.text,
            content: contentItem ? contentItem.text : '',
            textContent: contentItem ? contentItem.textContent : '',
            cssFingerprint: contentItem ? contentItem.cssFingerprint : '',
            contentHash: contentItem ? contentItem.contentHash : '',
            timestamp: Date.now() - index, // Add timestamp to preserve order
            backupDate: new Date().toISOString()
        };
    });

    return (!errors) ? results : { error: true, message: 'Errors occurred during backup' };
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

function renderTitlesOnly() {
  listEl.innerHTML = '';
  items.forEach((it, i) => {
    const li = document.createElement('li');
    const originalTitle = it.title || it.text || 'Conversation ' + (i + 1);
    const displayText = truncateTitle(originalTitle);

    li.innerHTML = '<label><input type="checkbox" data-i="' + i + '"' + (it.checked ? ' checked' : '') + '/><span class="title-text" title="' + originalTitle.replace(/"/g, '&quot;') + '">' + displayText + '</span></label>';
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
  progressBar.style.width = percentage + '%';
  progressText.textContent = percentage + '%';
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
      statusEl.textContent = 'Loaded cached chat titles (expires in ' + cacheInfo.remainingMinutes + 'min)...';
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

        conversationData = backupResults[0].result;

        await new Promise(resolve => setTimeout(resolve, 600));
        hideProgress();
      } catch (scriptError) {
        clearInterval(progressInterval);
        hideProgress();
        throw scriptError;
      }

      // Cache the fresh data
      if (conversationData && conversationData.length > 0) {
        await setCachedConversations(conversationData);
      }
    }

    if (!conversationData || conversationData.length === 0) {
      statusEl.textContent = 'No conversations found';
      hideProgress();
      return;
    }

    // Show only titles in the UI (maintain original order - latest first)
    items = conversationData.map((r, index) => ({
      title: r.title,
      checked: false,
      index: index // Keep reference to original data
    }));

    renderTitlesOnly();

    if (cachedData) {
      const cacheInfo = await getCacheInfo();
      statusEl.textContent = 'Loaded ' + conversationData.length + ' chat titles (cached, ' + cacheInfo.remainingMinutes + 'min left)';
    } else {
      statusEl.textContent = 'Loaded ' + conversationData.length + ' chat titles (fresh data, cached for 5min)';
    }
  } catch (error) {
    console.error('Error loading chat titles:', error);
    statusEl.textContent = 'Error loading chat titles - Please try again';
    hideProgress();
  }
});

// Add force refresh function that bypasses cache
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
    renderTitlesOnly();
  } catch (error) {
    console.error('Error clearing cache:', error);
    statusEl.textContent = 'Error clearing cache';
  }
});

toggleBtn.addEventListener('click', () => {
  const allChecked = items.every(i => i.checked);
  items = items.map(i => ({ ...i, checked: !allChecked }));
  renderTitlesOnly();
});

// Add checkbox event listeners
listEl.addEventListener('change', (e) => {
  if (e.target.type === 'checkbox') {
    const index = parseInt(e.target.getAttribute('data-i'));
    items[index].checked = e.target.checked;
  }
});

// Simplified HTML to Markdown conversion
function htmlToMarkdown(html) {
  if (!html || typeof html !== 'string') {
    return 'No content available';
  }

  // Simple conversion without template strings
  let markdown = html
    .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, function(match, level, content) {
      const hashes = '#'.repeat(parseInt(level));
      return '\n' + hashes + ' ' + content.replace(/<[^>]+>/g, '').trim() + '\n\n';
    })
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '\n```\n$1\n```\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n')
    .replace(/<span[^>]*>(.*?)<\/span>/gi, '$1')
    .replace(/<[^>]+>/g, '') // Remove remaining HTML tags
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Clean up multiple newlines
    .replace(/^\s+|\s+$/gm, '') // Trim lines
    .trim();

  return markdown;
}

// Check if conversation already exists in backup history
async function checkDuplicateConversation(conversation) {
  try {
    const result = await chrome.storage.local.get([BACKUP_HISTORY_KEY]);
    const history = result[BACKUP_HISTORY_KEY];

    if (!history || !Array.isArray(history)) {
      return false;
    }

    // Check by content hash first (most reliable)
    if (conversation.contentHash && history.some(item => item.contentHash === conversation.contentHash)) {
      return true;
    }

    // Check by title similarity (fuzzy match)
    const title = conversation.title && conversation.title.toLowerCase().trim();
    if (title && history.some(item => {
      const histTitle = item.title && item.title.toLowerCase().trim();
      return histTitle === title ||
             (histTitle && histTitle.includes(title)) ||
             (title.includes(histTitle || ''));
    })) {
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
    const result = await chrome.storage.local.get([BACKUP_HISTORY_KEY]);
    const history = result[BACKUP_HISTORY_KEY] || [];

    const historyEntry = {
      title: conversation.title,
      contentHash: conversation.contentHash,
      cssFingerprint: conversation.cssFingerprint,
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
    console.log('Skipping duplicate conversation: ' + conversation.title);
    return 'skipped';
  }

  // Create filename with requested format
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const timeStr = now.getHours() + 'h_' + now.getMinutes().toString().padStart(2, '0') + 'm';
  const filename = 'DuckAI_Conversation_' + dateStr + '_' + timeStr + (fileIndex > 0 ? '_' + fileIndex : '') + '.md';

  let markdownContent = '# ' + (conversation.title || 'Untitled Conversation') + '\n\n';
  markdownContent += '*Exported on: ' + now.toLocaleString() + '*\n\n';

  // Add metadata for debugging and deduplication
  if (conversation.contentHash) {
    markdownContent += '*Content Hash: ' + conversation.contentHash + '*\n\n';
  }
  if (conversation.cssFingerprint) {
    markdownContent += '*CSS Fingerprint: ' + conversation.cssFingerprint.substring(0, 50) + '...*\n\n';
  }

  markdownContent += '---\n\n';

  // Convert HTML content to markdown with improved conversion
  const content = conversation.content || 'No content available';
  const contentMarkdown = htmlToMarkdown(content);
  markdownContent += contentMarkdown + '\n\n';

  console.log('Creating file: ' + filename);

  // Add to backup history
  conversation.filename = filename;
  await addToBackupHistory(conversation);

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

  statusEl.textContent = 'Creating ' + checkedItems.length + ' .md files...';
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
        if (result === 'skipped') {
          skippedCount++;
        } else {
          downloadedCount++;
        }
        statusEl.textContent = 'Progress: ' + downloadedCount + ' downloaded, ' + skippedCount + ' skipped duplicates...';

        // Add delay between downloads
        if (i < checkedItems.
