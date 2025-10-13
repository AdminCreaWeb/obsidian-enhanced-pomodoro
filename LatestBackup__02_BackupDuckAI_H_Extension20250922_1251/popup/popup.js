const statusEl = document.getElementById('status');
const listEl = document.getElementById('list');
const refreshBtn = document.getElementById('refresh');
const toggleBtn = document.getElementById('toggleAll');
const BackupBtn = document.getElementById('backupButton');

let items = [];

// Function to generate a key pair for encryption
async function generateKeyAsync() {
    return new Promise((resolve) => {
        const crypt = new JSEncrypt({ default_key_size: 1024 });
        crypt.getKey(() => {
            resolve({
                publicKey: crypt.getPublicKey(),
                privateKey: crypt.getPrivateKey()
            });
        });
    });
}

// Function to ensure public key exists
async function ensurePublicKey() {
    const result = await chrome.storage.local.get(['publicKey']);
    if (!result.publicKey) {
        const keyPair = await generateKeyAsync();
        await chrome.storage.local.set({
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey
        });
        return keyPair.publicKey;
    }
    return result.publicKey;
}

// Function to encrypt and save data using AES
async function encryptAndSaveAES(data) {
    const publicKey = await ensurePublicKey();
    const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(data), publicKey).toString();

    const blob = new Blob([encryptedData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'encrypted_headings_' + new Date().toISOString().split('T')[0] + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    statusEl.textContent = 'Data encrypted and downloaded successfully!';
}

// Store conversation data globally for later use
let conversationData = [];
const CACHE_KEY = 'duckAI_conversation_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const BACKUP_HISTORY_KEY = 'duckAI_backup_history';

// Function to extract CSS fingerprint from HTML content
function extractCSSFingerprint(htmlContent) {
    const classMatches = htmlContent.match(/class="([^"]*)"/g);
    if (!classMatches || classMatches.length === 0) return '';

    // Extract unique class names and create a signature
    const allClasses = classMatches
        .map(match => match.replace(/class="([^"]*)"/, '$1'))
        .join(' ')
        .split(' ')
        .filter(cls => cls.length > 3); // Filter out very short classes

    const uniqueClasses = [...new Set(allClasses)];
    return uniqueClasses.slice(0, 10).sort().join('|'); // Take first 10, sort for consistency
}

// Function to generate a content hash for deduplication
function generateContentHash(title, content) {
    const combined = `${title}${content}`.replace(/\s+/g, ' ').trim();
    return CryptoJS.MD5(combined).toString().substring(0, 16);
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

    console.log('Cache expired or not found');
    return null;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

async function setCachedConversations(data) {
  try {
    await chrome.storage.local.set({
      [CACHE_KEY]: data,
      [CACHE_KEY + '_timestamp']: Date.now()
    });
    console.log('Conversation data cached');
  } catch (error) {
    console.error('Error caching data:', error);
  }
}

async function getCacheInfo() {
  try {
    const cached = await chrome.storage.local.get([CACHE_KEY + '_timestamp']);
    const timestamp = cached[CACHE_KEY + '_timestamp'];

    if (timestamp) {
      const age = Date.now() - timestamp;
      const remainingTime = CACHE_DURATION - age;
      const remainingMinutes = Math.max(0, Math.floor(remainingTime / (1000 * 60)));

      return {
        hasCache: true,
        ageMinutes: Math.floor(age / (1000 * 60)),
        remainingMinutes: remainingMinutes,
        isExpired: remainingTime <= 0
      };
    }

    return { hasCache: false };
  } catch (error) {
    return { hasCache: false };
  }
}

// COMPLETELY REWRITTEN: Safe no-click backupConversations function
async function backupConversations(progressCallback) {
    console.log("=== SAFE NO-CLICK CONVERSATION EXTRACTION ===");
    console.log("Current URL:", window.location.href);
    console.log("Page title:", document.title);

    // Define helper function inside the execution context
    function generateContentHash(title, content) {
        const combined = `${title}${content}`.replace(/\s+/g, ' ').trim();
        // Simple hash function since CryptoJS may not be available
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36).substring(0, 16);
    }

    const results = [];

    // Use exact selectors from debug output
    const conversationSelector = 'div[title].clS_s3a7onj0_NFty2Qh';
    const conversationElements = Array.from(document.querySelectorAll(conversationSelector));

    console.log(`Found ${conversationElements.length} conversation elements`);

    if (conversationElements.length === 0) {
        console.warn("No conversations found with known selector");
        return [];
    }

    // First, try to get the currently visible conversation content
    let currentConversationContent = '';
    const mainContentSelectors = [
        'main [role="main"]',
        'main section',
        '[data-testid="conversation-turn"]',
        '[data-testid="chat-content"]',
        'main div[class*="conversation"]',
        'main div[class*="chat"]',
        'main > div > div',
        'main'
    ];

    for (const selector of mainContentSelectors) {
        const contentArea = document.querySelector(selector);
        if (contentArea) {
            const contentText = contentArea.innerText || contentArea.textContent || '';
            if (contentText.length > 100) { // Must have substantial content
                currentConversationContent = contentText;
                console.log(`Found main conversation content (${contentText.length} chars) using selector: ${selector}`);
                break;
            }
        }
    }

    // Process each conversation WITHOUT any clicking - using for loop for proper execution
    for (let index = 0; index < conversationElements.length; index++) {
        const element = conversationElements[index];
        const title = element.title || 'Untitled Conversation';
        const listItemText = element.textContent || element.innerText || '';

        console.log(`Processing element ${index + 1}:`);
        console.log(`- Title: "${title}"`);
        console.log(`- Title length: ${title.length}`);
        console.log(`- List item text: "${listItemText.substring(0, 100)}..."`);
        console.log(`- Element classes: "${element.className}"`);

        // Basic validation - skip UI elements
        if (title.length > 15 && !title.toLowerCase().includes('button')) {
            console.log(`✅ Valid conversation ${index + 1} - adding to results`);

            console.log(`Creating conversation object for ${index + 1}...`);

            try {
                // For the first/active conversation, try to use the main content
                let conversationContent = listItemText;
                if (index === 0 && currentConversationContent.length > 100) {
                    // Check if this title matches the current conversation
                    if (currentConversationContent.toLowerCase().includes(title.toLowerCase().substring(0, 20))) {
                        conversationContent = currentConversationContent;
                        console.log(`Using main conversation content for ${index + 1} (${conversationContent.length} chars)`);
                    }
                }

                const contentHash = generateContentHash(title, conversationContent);
                console.log(`Generated content hash: ${contentHash}`);

                const conversationItem = {
                    title: title.trim(),
                    content: conversationContent.trim() || title.trim(),
                    contentHash: contentHash,
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    index: index,
                    cssClasses: element.className || ''
                };

                results.push(conversationItem);
                console.log(`✅ Added conversation ${index + 1}: "${title.substring(0, 50)}..." (content: ${conversationContent.length} chars, total results: ${results.length})`);

                // Report progress
                if (progressCallback) {
                    progressCallback(index + 1, conversationElements.length, `Processed ${index + 1}/${conversationElements.length}`);
                }
            } catch (error) {
                console.error(`Error creating conversation object for ${index + 1}:`, error);
            }
        } else {
            console.log(`❌ Skipped element ${index + 1} - failed validation (length: ${title.length}, contains 'button': ${title.toLowerCase().includes('button')})`);
        }
    }

    console.log(`SUCCESS: Extracted ${results.length} conversations safely`);
    return results;
}

async function fetchHeadings() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: function () {
      function fetchContents() {
        const results = [];
        Array.from(document.querySelectorAll('h1,h2,h3')).forEach(heading => {
          results.push({ text: heading.innerText.trim(), tag: heading.tagName, tag_sort: 'title' });
          let nextElement = heading.nextElementSibling;
          while (nextElement && !['H1', 'H2', 'H3'].includes(nextElement.tagName)) {
            if (nextElement.tagName === 'P') {
              results.push({ text: nextElement.innerText.trim(), tag: 'P', tag_sort: 'content' });
            } else {
              results.push({ text: '', tag: nextElement.tagName, tag_sort: 'content' });
            }
            nextElement = nextElement.nextElementSibling;
          }
        });
        return results;
      }
      const results = fetchContents();
      const titles = results.filter(item => item.tag_sort === 'title');
      const contents = results.filter(item => item.tag_sort === 'content');
      console.log('All titles:', titles);
      console.log('All contents:', contents);
      return results;
    }
  });
  return results[0].result;
}

async function FilterTitles() {}
async function FilterContents() {}
async function FilterBackupTitles() {}
async function FilterBackupContents() {}

function truncateTitle(title, maxLength = 100) {
  if (title.length <= maxLength) return title;
  const truncated = title.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > maxLength * 0.6 ? truncated.substring(0, lastSpace) : truncated) + '...';
}

async function renderTitlesOnly() {
  const list = document.getElementById('list');
  list.innerHTML = '';

  if (!items || items.length === 0) {
    list.innerHTML = '<li style="color: #666; font-style: italic;">No items to display</li>';
    return;
  }

  items.forEach((item, index) => {
    const li = document.createElement('li');
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.checked;
    checkbox.addEventListener('change', () => {
      items[index].checked = checkbox.checked;
    });

    const titleSpan = document.createElement('span');
    titleSpan.className = 'title-text';
    titleSpan.textContent = truncateTitle(item.title || 'Untitled');

    label.appendChild(checkbox);
    label.appendChild(titleSpan);
    li.appendChild(label);
    list.appendChild(li);
  });
}

function render() {}

// Progress bar functions
const progressWrapper = document.getElementById('progressWrapper');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

function showProgress() {
  progressWrapper.classList.add('show');
}

function hideProgress() {
  progressWrapper.classList.remove('show');
}

function updateProgress(current, total, message = '') {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  progressBar.style.width = percentage + '%';
  progressText.textContent = message || `${percentage}% (${current}/${total})`;
}

// Event listeners
refreshBtn.addEventListener('click', async () => {
  statusEl.textContent = 'Loading chat titles...';
  hideProgress();

  try {
    let cachedData = await getCachedConversations();

    if (cachedData) {
      conversationData = cachedData;
      const cacheInfo = await getCacheInfo();
      statusEl.textContent = `Loaded cached chat titles (expires in ${cacheInfo.remainingMinutes}min)...`;
    } else {
      statusEl.textContent = 'Parsing chat data (this may take a moment)...';
      showProgress();

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const progressSteps = [
        { percent: 5, message: 'Initializing chat parsing...' },
        { percent: 15, message: 'Locating chat sections...' },
        { percent: 30, message: 'Extracting chat titles...' },
        { percent: 50, message: 'Processing conversations...' },
        { percent: 70, message: 'Gathering content data...' },
        { percent: 85, message: 'Organizing results...' },
        { percent: 95, message: 'Finalizing data...' }
      ];

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

        clearInterval(progressInterval);
        updateProgress(100, 100, 'Complete!');

        const result = backupResults[0].result;
        console.log('Raw backup result:', result);

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

    items = conversationData.map((r, index) => ({
      title: r.title,
      checked: false,
      index: index
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

async function forceRefresh() {
  console.log('Force refresh triggered');
  await chrome.storage.local.remove([CACHE_KEY, CACHE_KEY + '_timestamp']);
  statusEl.textContent = 'Cache cleared, refreshing...';
  refreshBtn.click();
}

refreshBtn.addEventListener('dblclick', forceRefresh);

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

function htmlToMarkdown(html) {
  return html
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n# $1\n\n')
    .replace(/<p[^>]*>/gi, '\n\n')
    .replace(/<\/p>/gi, '')
    .replace(/<br[^>]*>/gi, '\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '\n\n```\n$1\n```\n\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '\n\n> $1\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

async function checkLocalDownloadedFiles() {
  try {
    const downloadedFiles = await chrome.storage.local.get(['downloadedFiles']) || { downloadedFiles: [] };
    return downloadedFiles.downloadedFiles || [];
  } catch (error) {
    console.error('Error checking downloaded files:', error);
    return [];
  }
}

async function trackDownloadedFile(filename, conversation) {
  try {
    const existingFiles = await checkLocalDownloadedFiles();
    const newFile = {
      filename: filename,
      timestamp: new Date().toISOString(),
      conversationHash: conversation.contentHash,
      title: conversation.title
    };

    existingFiles.push(newFile);
    await chrome.storage.local.set({ downloadedFiles: existingFiles });
  } catch (error) {
    console.error('Error tracking downloaded file:', error);
  }
}

async function checkDuplicateConversation(conversation) {
  try {
    const downloadedFiles = await checkLocalDownloadedFiles();
    const duplicate = downloadedFiles.find(file =>
      file.conversationHash === conversation.contentHash
    );

    if (duplicate) {
      return {
        isDuplicate: true,
        filename: duplicate.filename,
        timestamp: duplicate.timestamp
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return { isDuplicate: false };
  }
}

async function addToBackupHistory(items) {
  try {
    const { [BACKUP_HISTORY_KEY]: history = [] } = await chrome.storage.local.get([BACKUP_HISTORY_KEY]);

    const newEntry = {
      timestamp: new Date().toISOString(),
      itemCount: items.length,
      items: items.map(item => ({
        title: item.title.substring(0, 100),
        contentHash: item.contentHash
      }))
    };

    history.unshift(newEntry);

    const maxHistory = 50;
    const trimmedHistory = history.slice(0, maxHistory);

    await chrome.storage.local.set({ [BACKUP_HISTORY_KEY]: trimmedHistory });
    console.log('Added backup entry to history');
  } catch (error) {
    console.error('Error adding to backup history:', error);
  }
}

async function downloadSingleConversation(conversation, index, total) {
  const title = conversation.title || 'Untitled Conversation';
  const content = conversation.content || 'No content available';

  const filename = `duckai_conversation_${index + 1}_${title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').substring(0, 50)}_${new Date().toISOString().split('T')[0]}.md`;

  const duplicateCheck = await checkDuplicateConversation(conversation);

  let markdownContent = '';

  if (duplicateCheck.isDuplicate) {
    markdownContent = `# ${title}\n\n**⚠️ DUPLICATE DETECTED**\n\nThis conversation was already downloaded as: \`${duplicateCheck.filename}\`\nOriginal download: ${new Date(duplicateCheck.timestamp).toLocaleString()}\n\n`;
  }

  const now = new Date();
  markdownContent += `# ${title}\n\n`;
  markdownContent += `*Exported from Duck.ai on: ${now.toLocaleString()}*\n\n`;
  markdownContent += `*Exported on: ${now.toLocaleString()}*\n\n`;

  if (conversation.contentHash) {
    markdownContent += `*Content Hash: ${conversation.contentHash}*\n\n`;
  }

  markdownContent += `*Source: ${conversation.url || 'Unknown'}*\n\n`;
  markdownContent += `---\n\n`;

  const contentMarkdown = htmlToMarkdown(content);
  markdownContent += `${contentMarkdown}\n\n`;

  if (content && content !== 'No content available') {
    const htmlPreview = content.substring(0, 500).replace(/-->/g, '-\\->');
    markdownContent += `\n\n<!-- Original HTML (first 500 chars):\n${htmlPreview}...\n-->\n`;
  }

  const blob = new Blob([markdownContent], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (!duplicateCheck.isDuplicate) {
    await trackDownloadedFile(filename, conversation);
  }

  return { filename, isDuplicate: duplicateCheck.isDuplicate };
}

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

  statusEl.textContent = `Downloading ${checkedItems.length} conversations...`;
  showProgress();

  try {
    const downloadResults = [];

    for (let i = 0; i < checkedItems.length; i++) {
      const item = checkedItems[i];
      const conversation = conversationData[item.index];

      if (conversation) {
        updateProgress(i + 1, checkedItems.length, `Downloading: ${conversation.title.substring(0, 30)}...`);

        const result = await downloadSingleConversation(conversation, i, checkedItems.length);
        downloadResults.push(result);

        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    await addToBackupHistory(checkedItems.map(item => conversationData[item.index]));

    const duplicateCount = downloadResults.filter(r => r.isDuplicate).length;
    const newCount = downloadResults.length - duplicateCount;

    hideProgress();

    if (duplicateCount > 0) {
      statusEl.textContent = `Downloaded: ${newCount} new, ${duplicateCount} duplicates detected`;
    } else {
      statusEl.textContent = `Successfully downloaded ${checkedItems.length} conversations`;
    }

  } catch (error) {
    console.error('Download error:', error);
    statusEl.textContent = 'Error during download - check console for details';
    hideProgress();
  }
});

document.getElementById('viewHistory').addEventListener('click', async () => {
  const modal = document.getElementById('historyModal');
  const historyList = document.getElementById('historyList');

  try {
    const { [BACKUP_HISTORY_KEY]: history = [] } = await chrome.storage.local.get([BACKUP_HISTORY_KEY]);

    if (history.length === 0) {
      historyList.innerHTML = '<p style="color: #666; font-style: italic;">No backup history found.</p>';
    } else {
      historyList.innerHTML = history.reverse().map((item, index) =>
        `<div style="border-bottom: 1px solid #eee; padding: 8px 0;">
          <strong>Backup ${index + 1}</strong> - ${new Date(item.timestamp).toLocaleString()}<br>
          <small style="color: #666;">${item.itemCount} conversations</small>
          <div style="margin-top: 4px; font-size: 0.8em; max-height: 60px; overflow-y: auto;">
            ${item.items.slice(0, 3).map(conv =>
              `<div style="color: #888;">• ${conv.title}${conv.title.length > 50 ? '...' : ''}</div>`
            ).join('')}
            ${item.items.length > 3 ? `<div style="color: #aaa; font-style: italic;">...and ${item.items.length - 3} more</div>` : ''}
          </div>
        </div>`
      ).join('');
    }

    modal.style.display = 'block';
  } catch (error) {
    console.error('Error loading history:', error);
    historyList.innerHTML = '<p style="color: red;">Error loading backup history.</p>';
    modal.style.display = 'block';
  }
});

document.getElementById('closeHistory').addEventListener('click', () => {
  document.getElementById('historyModal').style.display = 'none';
});

document.getElementById('clearHistory').addEventListener('click', async () => {
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

  modal.innerHTML = `
    <div style="background: white; padding: 30px; border-radius: 12px; text-align: center; max-width: 400px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
      <div style="color: #dc3545; font-size: 48px; margin-bottom: 15px;">⚠️</div>
      <h3 style="margin: 0 0 15px 0; color: #333; font-size: 1.3em;">Clear Backup History?</h3>
      <p style="margin: 0 0 25px 0; color: #666; line-height: 1.4;">This will permanently delete all backup history records. Downloaded files will not be affected.</p>
      <div style="display: flex; gap: 15px; justify-content: center;">
        <button id="cancelClear" style="padding: 12px 24px; border: 2px solid #6c757d; background: white; color: #6c757d; border-radius: 8px; cursor: pointer; font-size: 1em; font-weight: 500; transition: all 0.2s;">
          Cancel
        </button>
        <button id="confirmClear" style="padding: 12px 24px; border: 2px solid #dc3545; background: #dc3545; color: white; border-radius: 8px; cursor: pointer; font-size: 1em; font-weight: 500; transition: all 0.2s;">
          Clear History
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('cancelClear').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  document.getElementById('confirmClear').addEventListener('click', async () => {
    document.body.removeChild(modal);
    try {
      await chrome.storage.local.remove([BACKUP_HISTORY_KEY]);
      statusEl.textContent = 'Backup history cleared successfully';

      const historyModal = document.getElementById('historyModal');
      if (historyModal.style.display === 'block') {
        document.getElementById('viewHistory').click();
      }
    } catch (error) {
      console.error('Error clearing history:', error);
      statusEl.textContent = 'Error clearing backup history';
    }
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });

  document.body.appendChild(modal);
});

// Enhanced debug functionality
if (document.getElementById('testStructure')) {
  document.getElementById('testStructure').addEventListener('click', async () => {
    statusEl.textContent = 'Running debug analysis...';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const debugResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: function() {
        console.log("=== DEBUG TEST ===");
        const elements = document.querySelectorAll('div[title].clS_s3a7onj0_NFty2Qh');
        console.log(`Found ${elements.length} conversation elements`);

        const results = [];
        elements.forEach((el, i) => {
          results.push({
            index: i,
            title: el.title.substring(0, 100),
            className: el.className
          });
        });

        return { count: elements.length, items: results };
      }
    });

    const result = debugResults[0].result;
    statusEl.textContent = `Debug: Found ${result.count} conversations`;
    console.log('Debug results:', result);
  });
}
