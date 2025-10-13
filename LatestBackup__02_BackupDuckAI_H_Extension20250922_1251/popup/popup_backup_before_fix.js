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

    try {
        let results = [];

        // Enhanced debugging for conversation detection
        console.log("=== ROBUST CONVERSATION DETECTION (NO CLICKING) ===");

        // Use the specific Duck.ai selectors we know work
        const conversationSelectors = [
            'div[title].clS_s3a7onj0_NFty2Qh', // Specific Duck.ai chat item class from debug
            'div[title][class*="clS_s3a7onj0_NFty2Qh"]', // Partial class match
            'div[title]' // Generic fallback
        ];

        let chatItems = [];

        for (const selector of conversationSelectors) {
            const foundItems = Array.from(document.querySelectorAll(selector));
            console.log(`Selector "${selector}": found ${foundItems.length} elements`);

            if (foundItems.length > 0) {
                // Enhanced filtering for actual conversations
                const validItems = foundItems.filter(item => {
                    const title = item.title || '';

                    // Check if this looks like a conversation title
                    const hasValidLength = title.length > 15 && title.length < 1500;
                    const notUIElement = !title.toLowerCase().includes('tooltip') &&
                                       !title.toLowerCase().includes('button') &&
                                       !title.toLowerCase().includes('close') &&
                                       !title.toLowerCase().includes('menu') &&
                                       !title.toLowerCase().includes('settings') &&
                                       !title.toLowerCase().includes('search');

                    // Check for conversation-like content
                    const hasConversationPatterns = /[.!?]/.test(title) ||
                                                  title.split(' ').length > 4 ||
                                                  /\b(how|what|why|when|where|can|could|should|would|do|does|did|is|are|was|were)\b/i.test(title);

                    return hasValidLength && notUIElement && hasConversationPatterns;
                });

                console.log(`After filtering: ${validItems.length} conversation-like items`);

                if (validItems.length > 0) {
                    chatItems = validItems;
                    break; // Use the first selector that finds valid items
                }
            }
        }

        const totalItems = chatItems.length;
        console.log(`Found ${totalItems} chat items to process`);

        if (totalItems === 0) {
            console.warn("No chat items found - returning empty array");
            return [];
        }

        // Process each conversation WITHOUT clicking (avoid DeadObject errors)
        for (let i = 0; i < chatItems.length; i++) {
            const chat = chatItems[i];

            // Update progress if callback provided
            if (progressCallback) {
                progressCallback(i + 1, totalItems, `Processing conversation ${i + 1} of ${totalItems}...`);
            }

            // Extract all available information without risky operations
            const title = (chat.title || '').trim();
            const textContent = (chat.textContent || chat.innerText || '').trim();
            const className = chat.className || '';

            // Generate content hash for deduplication
            const contentHash = generateContentHash(title, textContent);

            // Create conversation object with all available data
            const conversationItem = {
                title: title,
                content: textContent || title, // Use textContent if available, otherwise title
                contentHash: contentHash,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                index: i,
                cssClasses: className,
                element: {
                    tagName: chat.tagName,
                    className: className,
                    hasClickHandler: typeof chat.click === 'function'
                }
            };

            results.push(conversationItem);
            console.log(`✅ Processed conversation ${i + 1}: "${title.substring(0, 60)}..." (hash: ${contentHash})`);
        }

        console.log(`Successfully extracted ${results.length} conversations without errors`);
        return results;

    } catch (error) {
        console.error('Error in backupConversations:', error);
        return [];
    }
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
           //  else if (nextElement.tagName === 'UL') {
           //    results.push({ text: nextElement.innerText.trim(), tag: 'UL', tag_sort: 'content' });
           //  }
           //  else if (nextElement.tagName === 'OL') {
           //    results.push({ text: nextElement.innerText.trim(), tag: 'OL', tag_sort: 'content' });
           //  }
           //  else if (nextElement.tagName === 'LI') {
           //    results.push({ text: nextElement.innerText.trim(), tag: 'LI', tag_sort: 'content' });
           //  }
           //  else if (nextElement.tagName === 'DL') {
           //    results.push({ text: nextElement.innerText.trim(), tag: 'DL', tag_sort: 'content' });
           //  }
           //  else if (nextElement.tagName === 'DT') {
           //    results.push({ text: nextElement.innerText.trim(), tag: 'DT', tag_sort: 'content' });
           //  }
           //  else if (nextElement.tagName === 'DD') {
           //    results.push({ text: nextElement.innerText.trim(), tag: 'DD', tag_sort: 'content' });
           //  }
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
    statusEl.textContent = 'Running enhanced debug analysis...';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const debugResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: function() {
        console.log("=== COMPREHENSIVE DUCKAI DEBUG ANALYSIS ===");
        console.log("Current URL:", window.location.href);
        console.log("Page title:", document.title);
        console.log("Timestamp:", new Date().toISOString());

        const analysis = {
          pageInfo: {
            url: window.location.href,
            title: document.title,
            isDuckAI: window.location.href.includes('duckduckgo.com') || window.location.href.includes('duck')
          },
          timePeriods: {
            found: 0,
            elements: [],
            commonClasses: []
          },
          conversations: {
            titleElements: 0,
            potentialChats: [],
            sidebarElements: 0
          },
          structure: {
            recentChats: 0,
            navElements: 0,
            mainContent: 0
          }
        };

        // 1. Look for time period elements (Today, Past week, etc.)
        console.log("\n🕐 SEARCHING FOR TIME PERIOD ELEMENTS...");
        const timePeriodTexts = ['Any time', 'Today', 'Past day', 'Past week', 'Past month', 'Past 6 month', 'Past year'];
        timePeriodTexts.forEach(timeText => {
          const elements = Array.from(document.querySelectorAll('*')).filter(el =>
            el.textContent && el.textContent.trim() === timeText
          );

          if (elements.length > 0) {
            analysis.timePeriods.found += elements.length;
            elements.forEach(el => {
              analysis.timePeriods.elements.push({
                text: timeText,
                tagName: el.tagName,
                className: el.className,
                parentClass: el.parentElement ? el.parentElement.className : '',
                innerHTML: el.innerHTML
              });

              // Collect unique class names
              if (el.className && !analysis.timePeriods.commonClasses.includes(el.className)) {
                analysis.timePeriods.commonClasses.push(el.className);
              }
            });
          }
        });

        // 2. Enhanced conversation detection
        console.log("\n💬 SEARCHING FOR CONVERSATION ELEMENTS...");
        const conversationSelectors = [
          'div[title]',
          'button[title]',
          'a[title]',
          '[role="button"][title]',
          'li[title]',
          'span[title]'
        ];

        conversationSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          console.log(`${selector}: ${elements.length} elements`);

          Array.from(elements).forEach(el => {
            const title = el.title || '';
            if (title.length > 15 && title.length < 500) {
              // Filter out UI elements
              if (!title.toLowerCase().includes('tooltip') &&
                  !title.toLowerCase().includes('button') &&
                  !title.toLowerCase().includes('menu') &&
                  !title.toLowerCase().includes('close')) {

                analysis.conversations.potentialChats.push({
                  title: title.substring(0, 150) + (title.length > 150 ? '...' : ''),
                  tagName: el.tagName,
                  className: el.className,
                  selector: selector,
                  textContent: (el.textContent || '').substring(0, 100),
                  hasClick: typeof el.click === 'function',
                  position: {
                    offsetTop: el.offsetTop,
                    offsetLeft: el.offsetLeft
                  }
                });
              }
            }
          });
        });

        analysis.conversations.titleElements = analysis.conversations.potentialChats.length;

        // 3. Look for sidebar and navigation structure
        console.log("\n🗂️ ANALYZING PAGE STRUCTURE...");

        // Recent Chats detection
        const recentChatsElements = Array.from(document.querySelectorAll('*')).filter(el =>
          el.textContent && (
            el.textContent.includes('Recent Chats') ||
            el.textContent.includes('Chat History') ||
            el.textContent.includes('Conversations')
          )
        );
        analysis.structure.recentChats = recentChatsElements.length;

        // Sidebar detection
        const sidebarSelectors = ['aside', '[role="navigation"]', '.sidebar', '[class*="sidebar"]', 'nav'];
        sidebarSelectors.forEach(sel => {
          analysis.conversations.sidebarElements += document.querySelectorAll(sel).length;
        });

        // Main content area
        const mainSelectors = ['main', '[role="main"]', '.main-content', '[class*="main"]'];
        mainSelectors.forEach(sel => {
          analysis.structure.mainContent += document.querySelectorAll(sel).length;
        });

        // 4. CSS Class Analysis
        console.log("\n🎨 CSS CLASS ANALYSIS...");
        const allElements = document.querySelectorAll('*');
        const classFrequency = {};

        Array.from(allElements).slice(0, 1000).forEach(el => { // Limit to first 1000 elements
          if (el.className && typeof el.className === 'string') {
            el.className.split(' ').forEach(cls => {
              if (cls.length > 5) { // Only count substantial class names
                classFrequency[cls] = (classFrequency[cls] || 0) + 1;
              }
            });
          }
        });

        // Get most common classes
        const topClasses = Object.entries(classFrequency)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 20)
          .map(([cls, count]) => ({ class: cls, count }));

        analysis.cssAnalysis = {
          totalElements: allElements.length,
          topClasses: topClasses,
          suspiciousClasses: topClasses.filter(item =>
            item.class.match(/^[a-zA-Z]{2,4}_[a-zA-Z0-9_]+$/) || // Pattern like: gj1DLKT2IqzlxHKsuX6c
            item.class.length > 15
          )
        };

        // 5. Final summary
        console.log("\n📊 ANALYSIS SUMMARY:");
        console.log("Time periods found:", analysis.timePeriods.found);
        console.log("Potential conversations:", analysis.conversations.titleElements);
        console.log("Recent chats elements:", analysis.structure.recentChats);
        console.log("Sidebar elements:", analysis.conversations.sidebarElements);

        return analysis;
      }
    });

    const result = debugResults[0].result;
    console.log('🔍 Complete Debug Analysis:', result);

    // Display summary in status
    const summary = `Debug Complete: ${result.conversations.titleElements} potential chats, ${result.timePeriods.found} time elements, ${result.structure.recentChats} recent chat sections found`;
    statusEl.textContent = summary;

    // Also display in console for detailed review
    console.log('📝 SUMMARY FOR USER:');
    console.log('- Time period elements found:', result.timePeriods.found);
    if (result.timePeriods.commonClasses.length > 0) {
      console.log('- Common time period CSS classes:', result.timePeriods.commonClasses);
    }
    console.log('- Potential conversation elements:', result.conversations.titleElements);
    console.log('- Top CSS classes that might be relevant:', result.cssAnalysis.suspiciousClasses);

    return result;
  });
}
