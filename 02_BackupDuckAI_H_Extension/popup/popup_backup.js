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
        console.log(`Selector "${selector}": found ${elements.length} elements`);
        if (elements.length > 0 && elements.length < 20) {
            Array.from(elements).slice(0, 5).forEach((el, i) => {
                console.log(`  ${i+1}: "${(el.title || el.textContent || el.innerText || '').substring(0, 100)}..."`);
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
        console.log(`Text "${searchText}": found in ${elements.length} elements`);
        if (elements.length > 0 && elements.length < 10) {
            elements.forEach((el, i) => {
                console.log(`  ${i+1}: ${el.tagName} - "${el.textContent.substring(0, 50)}..."`);
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
            console.log(`Found ${chatItems.length} chat items with div[title] selector`);

            // Try alternative selectors if no items found
            if (chatItems.length === 0) {
                const altSelectors = ['[title]', 'button', 'div', 'a'];
                altSelectors.forEach(altSelector => {
                    const altItems = Array.from(nextSibling.querySelectorAll(altSelector));
                    console.log(`Alternative selector "${altSelector}": ${altItems.length} items`);
                    if (altItems.length > 0 && altItems.length < 20) {
                        altItems.slice(0, 3).forEach((item, i) => {
                            console.log(`  ${i+1}: "${(item.title || item.textContent || '').substring(0, 50)}..."`);
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
                progressCallback(i + 1, totalItems, `Processing conversation ${i + 1} of ${totalItems}...`);
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

                console.log(`Extracted: ${title} (${rawHTML.length} chars, hash: ${contentHash})`);
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

    return (!errors) ? results : { error: true, message: 'Errors occurred during backup' };
}


// async function fetchHeadings() {
//   const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
//   const results = await chrome.scripting.executeScript({
//     target: { tabId: tab.id },
//     func: function () {
//       // Define fetchContents inside the executed script
//       function fetchContents() {
//         const results = [];

//         // Process each heading individually
//         Array.from(document.querySelectorAll('h1,h2,h3')).forEach(heading => {
//           // Add the heading
//           results.push({ text: heading.innerText.trim(), tag: heading.tagName, tag_sort: 'title' });

//           // Find all p tags that follow this heading until the next heading
//           let nextElement = heading.nextElementSibling;
//           while (nextElement && !['H1', 'H2', 'H3'].includes(nextElement.tagName)) {
//             if (nextElement.tagName === 'P') {
//               results.push({ text: nextElement.innerText.trim(), tag: 'P', tag_sort: 'content' });
//             }
//             else if (nextElement.tagName === 'UL') {
//               results.push({ text: nextElement.innerText.trim(), tag: 'UL', tag_sort: 'content' });
//             }
//             else if (nextElement.tagName === 'OL') {
//               results.push({ text: nextElement.innerText.trim(), tag: 'OL', tag_sort: 'content' });
//             }
//             else if (nextElement.tagName === 'LI') {
//               results.push({ text: nextElement.innerText.trim(), tag: 'LI', tag_sort: 'content' });
//             }
//             else if (nextElement.tagName === 'DL') {
//               results.push({ text: nextElement.innerText.trim(), tag: 'DL', tag_sort: 'content' });
//             }
//             else if (nextElement.tagName === 'DT') {
//               results.push({ text: nextElement.innerText.trim(), tag: 'DT', tag_sort: 'content' });
//             }
//             else if (nextElement.tagName === 'DD') {
//               results.push({ text: nextElement.innerText.trim(), tag: 'DD', tag_sort: 'content' });
//             }
//            else {
//               results.push({ text: '', tag: nextElement.tagName, tag_sort: 'content' });
//             }
//             nextElement = nextElement.nextElementSibling;
//           }
//         });
//         return results;
//       }

//       // Execute the function
//       const results = fetchContents();

//       // Filter and log
//       const titles = results.filter(item => item.tag_sort === 'title');
//       const contents = results.filter(item => item.tag_sort === 'content');

//       console.log('All titles:', titles);
//       console.log('All contents:', contents);

//       return results; // Return the actual results
//     }
//   });
//   return results[0].result;
// }

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

function renderTitlesOnly() {
  listEl.innerHTML = '';
  items.forEach((it, i) => {
    const li = document.createElement('li');
    const originalTitle = it.title || it.text || `Conversation ${i + 1}`;
    const displayText = truncateTitle(originalTitle);

    li.innerHTML = `
      <label>
        <input type="checkbox" data-i="${i}" ${it.checked ? 'checked' : ''}/>
        <span class="title-text" title="${originalTitle.replace(/"/g, '&quot;')}">${displayText}</span>
      </label>
    `;
    listEl.appendChild(li);
  });
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
        if (result === 'skipped') {
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

// Check if conversation already exists in backup history
async function checkDuplicateConversation(conversation) {
  try {
    const { [BACKUP_HISTORY_KEY]: history } = await chrome.storage.local.get([BACKUP_HISTORY_KEY]);
    if (!history || !Array.isArray(history)) {
      return false;
    }

    // Check by content hash first (most reliable)
    if (conversation.contentHash && history.some(item => item.contentHash === conversation.contentHash)) {
      return true;
    }

    // Check by CSS fingerprint (for similar layout structures)
    if (conversation.cssFingerprint && history.some(item => item.cssFingerprint === conversation.cssFingerprint)) {
      return true;
    }

    // Check by title similarity (fuzzy match)
    const title = conversation.title?.toLowerCase().trim();
    if (title && history.some(item =>
      item.title?.toLowerCase().trim() === title ||
      item.title?.toLowerCase().includes(title) ||
      title.includes(item.title?.toLowerCase().trim() || '')
    )) {
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
      historyList.innerHTML = history.reverse().map((item, index) => `
        <div style="border: 1px solid #e1e5e9; border-radius: 4px; padding: 8px; margin: 4px 0; background: #f8f9fa;">
          <div style="font-weight: bold; font-size: 0.9em; margin-bottom: 4px;">${item.title || 'Untitled'}</div>
          <div style="font-size: 0.75em; color: #666;">
            <div>Date: ${new Date(item.backupDate).toLocaleString()}</div>
            <div>File: ${item.filename || 'unknown'}</div>
            <div>Hash: ${item.contentHash || 'none'}</div>
          </div>
        </div>
      `).join('');
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
  // Create a custom confirmation dialog with better formatting
  const confirmMessage = `⚠️ Clear Backup History

Are you sure you want to clear all backup history?

This action will:
• Remove all deduplication records
• Allow re-downloading of previously backed up conversations
• Cannot be undone

Do you want to continue?`;

  if (confirm(confirmMessage)) {
    try {
      await chrome.storage.local.remove([BACKUP_HISTORY_KEY]);
      statusEl.textContent = 'Backup history cleared successfully';
    } catch (error) {
      console.error('Error clearing backup history:', error);
      statusEl.textContent = 'Error clearing backup history';
    }
  }
});

// Debug test function that can be called from extension popup
async function testPageStructure() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: function() {
        console.log('🔍 DuckAI Page Structure Test from Extension');

        const debug = {
          url: window.location.href,
          title: document.title,
          recentChatsElements: 0,
          titleElements: 0,
          clickableElements: 0,
          sampleElements: []
        };

        // Check for "Recent Chats" text
        const recentChats = Array.from(document.querySelectorAll('p')).filter(p =>
          p.innerText && p.innerText.includes('Recent Chats')
        );
        debug.recentChatsElements = recentChats.length;

        // Check for title elements
        const titleElements = document.querySelectorAll('[title]');
        debug.titleElements = titleElements.length;

        // Check for clickable elements
        const clickable = document.querySelectorAll('button, a, [role="button"], div[title]');
        debug.clickableElements = clickable.length;

        // Get sample of potential conversation elements
        const samples = Array.from(clickable).slice(0, 10).map(el => ({
          tag: el.tagName,
          title: el.title || '',
          text: (el.textContent || '').substring(0, 50),
          classes: el.className || ''
        }));
        debug.sampleElements = samples;

        console.log('Debug results:', debug);
        return debug;
      }
    });

    const debugInfo = results[0].result;

    statusEl.innerHTML = `
      <div style="font-size: 0.8em; line-height: 1.3;">
        <strong>Page Debug Info:</strong><br>
        URL: ${debugInfo.url.substring(0, 50)}...<br>
        Recent Chats: ${debugInfo.recentChatsElements} found<br>
        Title Elements: ${debugInfo.titleElements}<br>
        Clickable: ${debugInfo.clickableElements}<br>
        <details style="margin-top: 4px;">
          <summary>Sample Elements (${debugInfo.sampleElements.length})</summary>
          ${debugInfo.sampleElements.map((el, i) =>
            `${i+1}. ${el.tag}: "${el.title || el.text}"`
          ).join('<br>')}
        </details>
      </div>
    `;

    console.log('Debug results from extension:', debugInfo);
    return debugInfo;

  } catch (error) {
    console.error('Test failed:', error);
    statusEl.textContent = `Test failed: ${error.message}`;
  }
}

// Add test button functionality (for debugging)
if (document.getElementById('testStructure')) {
  document.getElementById('testStructure').addEventListener('click', testPageStructure);
}

// // On load, show last saved info
// (async function initStatus() {
//   const s = await chrome.storage.local.get(['updated','encryptedItems','wrappedKey']);
//   if (s.updated) {
//     const count = s.encryptedItems ? s.encryptedItems.length : 0;
//     statusEl.textContent = `Last saved: ${new Date(s.updated).toLocaleString()} — ${count} items — storage: local (encrypted)`;
//   } else {
//     statusEl.textContent = 'No saved data yet.';
//   }
// })();
