// Polyfill for Chrome/Brave/Edge: Make 'browser' work like in Firefox
if (typeof browser === 'undefined') {
  var browser = chrome;
}

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
    const result = await browser.storage.local.get(['publicKey']);
    if (!result.publicKey) {
        const keyPair = await generateKeyAsync();
        await browser.storage.local.set({
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
    
    const folder = await getDownloadFolder();
    const filename = folder + '/encrypted_headings_' + new Date().toISOString().split('T')[0] + '.txt';

    try {
        await browser.downloads.download({
            url: url,
            filename: filename,
            saveAs: false  // Auto-download to folder
        });
        URL.revokeObjectURL(url);
        statusEl.textContent = 'Data encrypted and downloaded successfully!';
    } catch (error) {
        console.error('Download failed:', error);
        URL.revokeObjectURL(url);
        statusEl.textContent = 'Download failed: ' + error.message;
    }
}

// Store conversation data globally for later use
let conversationData = [];
let usingCachedData = false;  // NEW: Track if using cache
const CACHE_KEY = 'conversations_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds (increased for better performance)
const BACKUP_HISTORY_KEY = 'duckAI_backup_history';
const DOWNLOAD_FOLDER_KEY = 'duckAI_download_folder';
const FILENAME_FORMAT_KEY = 'duckAI_filename_format';
const OBSIDIAN_MODE_KEY = 'duckAI_obsidian_mode';
const OBSIDIAN_VAULT_PATH_KEY = 'duckAI_obsidian_vault_path';
const DEFAULT_DOWNLOAD_FOLDER = 'DuckAI_Backups';
const DEFAULT_FILENAME_FORMAT = 'format2'; // New format by default

// Filename format options
const FILENAME_FORMATS = {
  format1: {
    name: 'Legacy Format',
    template: (index, title, backupType, date) => 
      `duckai_conversation_${index}_${title}_${backupType}_${date}.md`,
    example: 'duckai_conversation_1_MyTitle_FULL_2025-10-09.md'
  },
  format2: {
    name: 'Compact Format (Recommended)',
    template: (index, title, backupType, date) => 
      `duckai_${date}_conversation_${String(index).padStart(3, '0')}_${title}.md`,
    example: 'duckai_2025-10-09_conversation_001_MyTitle.md'
  },
  format3: {
    name: 'Date First',
    template: (index, title, backupType, date) => 
      `${date}_duckai_${String(index).padStart(3, '0')}_${title}_${backupType}.md`,
    example: '2025-10-09_duckai_001_MyTitle_FULL.md'
  },
  format4: {
    name: 'Simple',
    template: (index, title, backupType, date) => 
      `${title}_${date}.md`,
    example: 'MyTitle_2025-10-09.md'
  }
};

// Get download folder setting
async function getDownloadFolder() {
  const result = await browser.storage.local.get([DOWNLOAD_FOLDER_KEY]);
  const folder = result[DOWNLOAD_FOLDER_KEY] || DEFAULT_DOWNLOAD_FOLDER;
  console.log('📁 getDownloadFolder() returning:', folder);
  return folder;
}

// Get filename format setting
async function getFilenameFormat() {
  const result = await browser.storage.local.get([FILENAME_FORMAT_KEY]);
  const format = result[FILENAME_FORMAT_KEY] || DEFAULT_FILENAME_FORMAT;
  console.log('📝 getFilenameFormat() returning:', format);
  return format;
}

// Get Obsidian mode setting
async function getObsidianMode() {
  const result = await browser.storage.local.get([OBSIDIAN_MODE_KEY]);
  return result[OBSIDIAN_MODE_KEY] || false;
}

// Get Obsidian vault path
async function getObsidianVaultPath() {
  const result = await browser.storage.local.get([OBSIDIAN_VAULT_PATH_KEY]);
  return result[OBSIDIAN_VAULT_PATH_KEY] || '';
}

// Generate filename based on selected format
async function generateFilename(index, title, backupType, date) {
  const formatKey = await getFilenameFormat();
  const format = FILENAME_FORMATS[formatKey] || FILENAME_FORMATS[DEFAULT_FILENAME_FORMAT];
  
  const cleanTitle = title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').substring(0, 50);
  return format.template(index + 1, cleanTitle, backupType, date);
}

// Generate Obsidian-friendly frontmatter
function generateObsidianFrontmatter(conversation, index, backupType) {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const timestamp = now.toISOString();
  
  return `---
tags:
  - duckduckgo
  - ai-conversation
  - ${backupType.toLowerCase()}-backup
date: ${date}
created: ${timestamp}
source: DuckDuckGo AI Chat
conversation_number: ${index + 1}
backup_type: ${backupType}
---

`;
}

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
    const cached = await browser.storage.local.get([CACHE_KEY, CACHE_KEY + '_timestamp']);
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
    await browser.storage.local.set({
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
    const cached = await browser.storage.local.get([CACHE_KEY + '_timestamp']);
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

    // Helper: Wait for page to be ready
    function waitForPageReady() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve, { once: true });
                // Fallback timeout
                setTimeout(resolve, 3000);
            }
        });
    }

    // Wait for page to fully load before scanning
    await waitForPageReady();
    console.log("Page ready, starting conversation scan...");
    
    // Give dynamic content a moment to render (duck.ai uses React)
    await new Promise(resolve => setTimeout(resolve, 1000));

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

    // Try multiple selectors to find conversation list items (more robust than hardcoded class)
    // Use generic selector that works regardless of class name changes
    const allDivsWithTitle = Array.from(document.querySelectorAll('div[title]'));
    console.log(`Found ${allDivsWithTitle.length} total div[title] elements`);
    
    // Smart filtering to identify conversation items vs UI elements
    const conversationElements = allDivsWithTitle.filter(el => {
        const title = el.title || '';
        const text = (el.textContent || '').trim();
        
        // Skip if title is too short
        if (title.length < 5) return false;
        
        // Skip common UI elements by title keywords
        const uiKeywords = ['button', 'menu', 'settings', 'search', 'close', 'open', 'hide', 'show', 'expand', 'collapse'];
        if (uiKeywords.some(keyword => title.toLowerCase().includes(keyword))) {
            console.log(`Filtered out UI element: "${title}"`);
            return false;
        }
        
        // Skip if it's actually a button/link (even if it's a div)
        const role = el.getAttribute('role');
        if (role === 'button' || role === 'link') {
            console.log(`Filtered out role="${role}": "${title}"`);
            return false;
        }
        
        // Conversation items usually have substantial text content beyond just the title
        // But title and text are often very similar for conversation items
        const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const hasSubstantialTitle = titleWords.length >= 2; // At least 2 meaningful words
        
        if (!hasSubstantialTitle) {
            console.log(`Filtered out short title: "${title}"`);
            return false;
        }
        
        // If we got here, it's likely a conversation
        console.log(`✅ Accepting conversation: "${title.substring(0, 50)}..."`);
        return true;
    });
    
    console.log(`After smart filtering: ${conversationElements.length} conversation items identified`);

    console.log(`Found ${conversationElements.length} conversation elements total`);

    if (conversationElements.length === 0) {
        console.warn("⚠️ No conversations found - checked all div[title] elements");
        return [];
    }

    // First, try to get the currently visible conversation content
    let currentConversationContent = '';
    let currentConversationHTML = '';
    
    // Try multiple strategies to extract the main conversation
    console.log("=== EXTRACTING MAIN CONVERSATION CONTENT ===");
    
    // Strategy 1: Look for the main content area
    const mainElement = document.querySelector('main');
    if (mainElement) {
        console.log("Found <main> element");
        
        // Try to find message containers
        const messageSelectors = [
            'main [class*="message"]',
            'main [class*="Message"]',
            'main [class*="turn"]',
            'main [class*="Turn"]',
            'main article',
            'main section',
            'main > div > div > div'
        ];
        
        for (const selector of messageSelectors) {
            const messages = document.querySelectorAll(selector);
            if (messages.length > 0) {
                console.log(`Found ${messages.length} message elements using selector: ${selector}`);
                
                // Extract text from all messages
                let combinedText = '';
                let combinedHTML = '';
                messages.forEach((msg, idx) => {
                    const text = msg.innerText || msg.textContent || '';
                    if (text.trim().length > 10) { // Skip empty or very short elements
                        combinedText += text + '\n\n';
                        combinedHTML += msg.innerHTML + '\n\n';
                    }
                });
                
                if (combinedText.length > 100) {
                    currentConversationContent = combinedText.trim();
                    currentConversationHTML = combinedHTML.trim();
                    console.log(`✅ Extracted ${currentConversationContent.length} chars from ${messages.length} messages`);
                    break;
                }
            }
        }
        
        // Fallback: Get all text from main if no messages found
        if (!currentConversationContent) {
            const mainText = mainElement.innerText || mainElement.textContent || '';
            if (mainText.length > 100) {
                currentConversationContent = mainText.trim();
                currentConversationHTML = mainElement.innerHTML;
                console.log(`✅ Extracted ${currentConversationContent.length} chars from <main> element (fallback)`);
            }
        }
    } else {
        console.warn("⚠️ No <main> element found on page");
    }
    
    console.log(`Final extracted content length: ${currentConversationContent.length} chars`);

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

        // Basic validation - skip UI elements (relaxed from 15 to 5 chars)
        if (title.length > 5 && !title.toLowerCase().includes('button')) {
            console.log(`✅ Valid conversation ${index + 1} - adding to results`);

            console.log(`Creating conversation object for ${index + 1}...`);

            try {
                // Determine which content to use
                let conversationContent = '';
                let conversationHTML = '';
                let contentSource = 'unknown';
                
                // For the currently visible conversation, use the extracted main content
                if (currentConversationContent.length > 100) {
                    // Check if this title appears to match the current conversation
                    const titleStart = title.toLowerCase().substring(0, Math.min(20, title.length));
                    const contentStart = currentConversationContent.toLowerCase().substring(0, 100);
                    
                    if (contentStart.includes(titleStart) || index === 0) {
                        conversationContent = currentConversationContent;
                        conversationHTML = currentConversationHTML;
                        contentSource = 'main_content';
                        console.log(`✅ Using main conversation content for "${title.substring(0, 30)}..." (${conversationContent.length} chars)`);
                    }
                }
                
                // Fallback to list item text if we couldn't get main content
                if (!conversationContent) {
                    conversationContent = listItemText.trim();
                    contentSource = 'sidebar_text';
                    console.log(`⚠️ Using sidebar text for "${title.substring(0, 30)}..." (${conversationContent.length} chars) - limited content`);
                }
                
                // Last resort: use just the title
                if (!conversationContent || conversationContent.length < 10) {
                    conversationContent = title;
                    contentSource = 'title_only';
                    console.log(`⚠️ Using title only for "${title.substring(0, 30)}..." - NO CONTENT AVAILABLE`);
                }

                const contentHash = generateContentHash(title, conversationContent);
                console.log(`Generated content hash: ${contentHash}`);

                const conversationItem = {
                    title: title.trim(),
                    content: conversationContent.trim(),
                    html: conversationHTML || '',
                    contentHash: contentHash,
                    contentSource: contentSource,
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    index: index,
                    cssClasses: element.className || ''
                };

                results.push(conversationItem);
                console.log(`✅ Added conversation ${index + 1}: "${title.substring(0, 50)}..." (content: ${conversationContent.length} chars, source: ${contentSource}, total results: ${results.length})`);

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

// NEW: Full backup with auto-navigation through each conversation
async function backupConversationsWithAutoClick(progressCallback) {
    console.log("=== FULL BACKUP MODE: AUTO-CLICKING THROUGH CONVERSATIONS ===");
    
    // Helper: Wait for page to be ready
    function waitForPageReady() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve, { once: true });
                setTimeout(resolve, 3000);
            }
        });
    }

    // Wait for page to fully load before scanning
    await waitForPageReady();
    console.log("Page ready, starting full backup scan...");
    
    // Give dynamic content a moment to render
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    function generateContentHash(title, content) {
        const combined = `${title}${content}`.replace(/\s+/g, ' ').trim();
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36).substring(0, 16);
    }
    
    function extractMainContent() {
        let content = '';
        let html = '';
        
        const mainElement = document.querySelector('main');
        if (!mainElement) {
            console.warn("No main element found");
            return { content: '', html: '' };
        }
        
        const messageSelectors = [
            'main [class*="message"]',
            'main [class*="Message"]',
            'main [class*="turn"]',
            'main [class*="Turn"]',
            'main article',
            'main section'
        ];
        
        for (const selector of messageSelectors) {
            const messages = document.querySelectorAll(selector);
            if (messages.length > 0) {
                let combinedText = '';
                let combinedHTML = '';
                messages.forEach((msg) => {
                    const text = msg.innerText || msg.textContent || '';
                    if (text.trim().length > 10) {
                        combinedText += text + '\n\n';
                        combinedHTML += msg.innerHTML + '\n\n';
                    }
                });
                
                if (combinedText.length > 100) {
                    content = combinedText.trim();
                    html = combinedHTML.trim();
                    console.log(`Extracted ${content.length} chars using selector: ${selector}`);
                    break;
                }
            }
        }
        
        // Fallback to main element
        if (!content) {
            const mainText = mainElement.innerText || mainElement.textContent || '';
            if (mainText.length > 100) {
                content = mainText.trim();
                html = mainElement.innerHTML;
            }
        }
        
        return { content, html };
    }
    
    // Find all conversation elements using smart generic selector
    const allDivsWithTitle = Array.from(document.querySelectorAll('div[title]'));
    console.log(`[Full Backup] Found ${allDivsWithTitle.length} total div[title] elements`);
    
    // Smart filtering to identify conversation items vs UI elements
    const conversationElements = allDivsWithTitle.filter(el => {
        const title = el.title || '';
        const text = (el.textContent || '').trim();
        
        // Skip if title is too short
        if (title.length < 5) return false;
        
        // Skip common UI elements by title keywords
        const uiKeywords = ['button', 'menu', 'settings', 'search', 'close', 'open', 'hide', 'show', 'expand', 'collapse'];
        if (uiKeywords.some(keyword => title.toLowerCase().includes(keyword))) {
            console.log(`[Full Backup] Filtered out UI element: "${title}"`);
            return false;
        }
        
        // Skip if it's actually a button/link (even if it's a div)
        const role = el.getAttribute('role');
        if (role === 'button' || role === 'link') {
            console.log(`[Full Backup] Filtered out role="${role}": "${title}"`);
            return false;
        }
        
        // Conversation items usually have substantial title
        const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const hasSubstantialTitle = titleWords.length >= 2; // At least 2 meaningful words
        
        if (!hasSubstantialTitle) {
            console.log(`[Full Backup] Filtered out short title: "${title}"`);
            return false;
        }
        
        // If we got here, it's likely a conversation
        console.log(`[Full Backup] ✅ Accepting conversation: "${title.substring(0, 50)}..."`);
        return true;
    });
    
    console.log(`[Full Backup] After smart filtering: ${conversationElements.length} conversation items identified`);
    
    if (conversationElements.length === 0) {
        console.error("No conversations found!");
        return [];
    }
    
    const results = [];
    const WAIT_TIME = 2500; // 2.5 seconds between clicks (increased to prevent content bleeding)
    
    console.log(`Will process ${conversationElements.length} conversations with auto-clicking`);
    
    for (let i = 0; i < conversationElements.length; i++) {
        const element = conversationElements[i];
        const title = element.title || 'Untitled Conversation';
        
        console.log(`\n=== Processing ${i + 1}/${conversationElements.length}: "${title.substring(0, 50)}..." ===`);
        
        // Report progress
        if (progressCallback) {
            progressCallback(i, conversationElements.length, `Clicking conversation ${i + 1}/${conversationElements.length}...`);
        }
        
        try {
            // Click the conversation element
            console.log("Clicking element...");
            element.click();
            
            // Wait for content to load
            console.log(`Waiting ${WAIT_TIME}ms for content to load...`);
            await new Promise(resolve => setTimeout(resolve, WAIT_TIME));
            
            // Extract the now-visible content
            console.log("Extracting content...");
            const { content, html } = extractMainContent();
            
            if (!content || content.length < 50) {
                console.warn(`⚠️ No substantial content found for "${title}"`);
            } else {
                console.log(`✅ Extracted ${content.length} chars`);
            }
            
            // Verify content matches conversation (title should appear in content)
            const titleWords = title.toLowerCase().split(/\s+/).slice(0, 3).join(' ');
            const contentLower = content.toLowerCase();
            if (titleWords && !contentLower.includes(titleWords.substring(0, 20))) {
                console.warn(`⚠️ Content mismatch warning: Title words not found in content. This may be content bleeding!`);
                console.warn(`   Expected: "${titleWords.substring(0, 30)}..."`);
                console.warn(`   Got content preview: "${content.substring(0, 100)}..."`);
            }
            
            const contentHash = generateContentHash(title, content);
            
            const conversationItem = {
                title: title.trim(),
                content: content.trim() || title.trim(),
                html: html || '',
                contentHash: contentHash,
                contentSource: content.length > 100 ? 'main_content' : 'limited',
                timestamp: new Date().toISOString(),
                url: window.location.href,
                index: i,
                cssClasses: element.className || ''
            };
            
            results.push(conversationItem);
            console.log(`✅ Added to results (${results.length}/${conversationElements.length})`);
            
            // Update progress after extraction
            if (progressCallback) {
                progressCallback(i + 1, conversationElements.length, `Processed ${i + 1}/${conversationElements.length} conversations`);
            }
            
        } catch (error) {
            console.error(`Error processing conversation ${i + 1}:`, error);
            // Still add it but with limited content
            results.push({
                title: title.trim(),
                content: title.trim(),
                html: '',
                contentHash: generateContentHash(title, title),
                contentSource: 'error',
                timestamp: new Date().toISOString(),
                url: window.location.href,
                index: i,
                error: error.message
            });
        }
    }
    
    console.log(`\n=== FULL BACKUP COMPLETE: ${results.length} conversations processed ===`);
    return results;
}

async function fetchHeadings() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const results = await browser.scripting.executeScript({
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

  // Load backup history ONCE before the loop (prevents race conditions)
  const downloadedFiles = await checkLocalDownloadedFiles();
  console.log(`[renderTitlesOnly] Found ${downloadedFiles.length} downloaded files in history`);

  // Pre-calculate all statuses BEFORE rendering (prevents visual updates)
  const statuses = [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    let status = null;
    
    if (conversationData && conversationData[item.index]) {
      const conversation = conversationData[item.index];
      
      // Check if this is titles-only mode (no full content)
      const isTitlesOnly = !conversation.contentSource || conversation.contentSource === 'sidebar_text' || conversation.contentSource === 'title_only';
      
      if (isTitlesOnly) {
        // Simple check: does backup exist for this title?
        const existingBackup = downloadedFiles.find(f => f.title === conversation.title);
        
        if (existingBackup) {
          status = {
            icon: existingBackup.contentSource === 'main_content' ? '✅' : '💾',
            label: `Previously backed up (${new Date(existingBackup.timestamp).toLocaleDateString()})`,
            color: '#666',
            opacity: '0.6',
            bold: false
          };
        }
      } else {
        // Full content available - calculate accurate status
        status = getBackupStatusSync(conversation, downloadedFiles);
        console.log(`[renderTitlesOnly] Status for "${conversation.title.substring(0, 30)}": ${status?.icon || 'none'}`);
      }
    }
    
    statuses.push(status);
  }

  // Now render all items with pre-calculated statuses (no async, instant!)
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const li = document.createElement('li');
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.checked;
    checkbox.addEventListener('change', () => {
      items[index].checked = checkbox.checked;
      
      // Update Select All button text when individual checkbox changes
      const allChecked = items.every(i => i.checked);
      if (allChecked) {
        toggleBtn.textContent = '☐ Deselect All';
      } else {
        toggleBtn.textContent = '☑️ Select All';
      }
    });

    const titleSpan = document.createElement('span');
    titleSpan.className = 'title-text';
    titleSpan.textContent = truncateTitle(item.title || 'Untitled');

    label.appendChild(checkbox);
    label.appendChild(titleSpan);

    // Add pre-calculated status icon (synchronous, no flicker!)
    const status = statuses[index];
    if (status && status.icon) {
      const indicator = document.createElement('span');
      indicator.style.marginLeft = '8px';
      indicator.style.fontSize = '0.85em';
      if (status.opacity) indicator.style.opacity = status.opacity;
      if (status.bold) indicator.style.fontWeight = 'bold';
      indicator.textContent = status.icon;
      indicator.title = status.label;
      indicator.style.color = status.color;
      label.appendChild(indicator);
    }

    li.appendChild(label);
    list.appendChild(li);
  }
  
  // Update Select All button text based on current selection state
  const allChecked = items.every(i => i.checked);
  const anyChecked = items.some(i => i.checked);
  
  if (allChecked) {
    toggleBtn.textContent = '☐ Deselect All';
  } else if (anyChecked) {
    toggleBtn.textContent = '☑️ Select All'; // Some selected, button will select remaining
  } else {
    toggleBtn.textContent = '☑️ Select All';
  }
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
// FULL BACKUP BUTTON: Load conversations with full content AND download them all
refreshBtn.addEventListener('click', async () => {
  try {
    statusEl.textContent = '🔄 Starting Full Backup - loading conversations...';
    showProgress();
    
    // IMPORTANT: Ensure full backup mode is enabled FIRST
    document.getElementById('fullBackupMode').checked = true;
    console.log('✅ Full Backup Mode checkbox set to:', document.getElementById('fullBackupMode').checked);
    
    // Clear cache to force fresh load with full content
    await browser.storage.local.remove([CACHE_KEY, CACHE_KEY + '_timestamp']);
    usingCachedData = false;
    
    // Small delay to ensure checkbox state is set
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Step 1: Load all conversations with full content (auto-click mode)
    await loadConversations();
    
    // Check if we got any conversations
    if (!conversationData || conversationData.length === 0) {
      statusEl.textContent = '⚠️ No conversations found - Are you on duck.ai?';
      hideProgress();
      
      // Diagnostic: Check current tab
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        console.error('❌ No conversations found. Current tab:', tab?.url);
        console.error('Expected URL pattern: https://duckduckgo.com/?*duckai=1*');
      } catch (e) {
        console.error('❌ Could not query tab:', e);
      }
      return;
    }
    
    console.log(`✅ Full Backup loaded ${conversationData.length} conversations:`, conversationData.map(c => ({ title: c.title, length: c.content?.length, source: c.contentSource })));
    
    // Verify we got full content (not cached partial data)
    const fullContentCount = conversationData.filter(c => c.contentSource === 'main_content').length;
    console.log(`📊 Content sources: ${fullContentCount} full, ${conversationData.length - fullContentCount} partial`);
    
    if (fullContentCount === 0) {
      statusEl.textContent = '⚠️ No full content loaded - try refreshing the page';
      hideProgress();
      return;
    }
    
    // Step 2: Rebuild items array with new conversation data AND auto-select all
    // This is CRITICAL - we must rebuild items to match the new conversationData indices
    items = conversationData.map((r, index) => ({
      title: r.title,
      checked: true, // Auto-select all for Full Backup
      index: index
    }));
    console.log(`📋 Rebuilt items array with ${items.length} items, all selected`);
    
    await renderTitlesOnly();
    
    statusEl.textContent = `✓ Loaded ${conversationData.length} conversations - starting download...`;
    console.log('📦 Preparing to download', items.filter(i => i.checked).length, 'conversations...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 3: Download all selected conversations
    const checkedItems = items.filter(item => item.checked);
    
    if (checkedItems.length === 0) {
      statusEl.textContent = 'No items selected for download';
      hideProgress();
      return;
    }
    
    statusEl.textContent = `🔄 Downloading ${checkedItems.length} conversations...`;
    console.log('🚀 Starting download loop for', checkedItems.length, 'conversations');
    
    const downloadResults = [];

    for (let i = 0; i < checkedItems.length; i++) {
      const item = checkedItems[i];
      const conversation = conversationData[item.index];

      if (conversation) {
        console.log(`📥 Downloading ${i+1}/${checkedItems.length}:`, conversation.title);
        updateProgress(i + 1, checkedItems.length, `Downloading: ${conversation.title.substring(0, 30)}...`);

        const result = await downloadSingleConversation(conversation, i, checkedItems.length);
        console.log(`✅ Download complete for "${conversation.title}":`, result);
        downloadResults.push(result);

        // Delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    await addToBackupHistory(checkedItems.map(item => conversationData[item.index]));
    
    // Clear cache after backup
    console.log('Clearing cache after backup for accurate status on next load...');
    await browser.storage.local.remove([CACHE_KEY, CACHE_KEY + '_timestamp']);
    usingCachedData = false;

    const duplicateCount = downloadResults.filter(r => r.isDuplicate).length;
    const upgradeCount = downloadResults.filter(r => r.isUpgrade).length;
    const newCount = checkedItems.length - duplicateCount - upgradeCount;

    let summary = `✅ Full Backup Complete! `;
    if (newCount > 0) summary += `${newCount} new, `;
    if (upgradeCount > 0) summary += `${upgradeCount} upgraded, `;
    if (duplicateCount > 0) summary += `${duplicateCount} duplicates`;

    statusEl.textContent = summary;
    hideProgress();
  } catch (error) {
    console.error('Error during full backup:', error);
    statusEl.textContent = `❌ Error: ${error.message}`;
    hideProgress();
  }
});

// Auto-load on extension open (TITLES ONLY for speed)
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Extension popup opened - loading titles only (fast mode)...');
  await loadTitlesOnly(); // Fast: only titles, no content
});

// NEW: Fast titles-only load (for popup open)
async function loadTitlesOnly() {
  statusEl.textContent = 'Loading chat titles...';
  hideProgress();

  try {
    // Check cache first
    let cachedData = await getCachedConversations();

    if (cachedData) {
      conversationData = cachedData;
      usingCachedData = true;
      
      // Populate items array for rendering
      items = conversationData.map((r, index) => ({
        title: r.title,
        checked: false,
        index: index
      }));
      
      const cacheInfo = await getCacheInfo();
      statusEl.textContent = `✓ Loaded ${cachedData.length} conversations (cached, expires in ${cacheInfo.remainingMinutes}min)`;
      await renderTitlesOnly();
      return;
    }

    // No cache - do fast scan (titles only, no auto-clicking)
    statusEl.textContent = 'Scanning chat titles...';
    showProgress();

    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    const progressSteps = [
      { percent: 20, message: 'Locating conversations...' },
      { percent: 50, message: 'Extracting titles...' },
      { percent: 80, message: 'Processing...' }
    ];

    let currentStep = 0;
    let progressInterval = setInterval(() => {
      if (currentStep < progressSteps.length) {
        const step = progressSteps[currentStep];
        updateProgress(step.percent, 100, step.message);
        currentStep++;
      }
    }, 300);

    const results = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: backupConversations, // Fast version - no clicking
    });

    clearInterval(progressInterval);
    updateProgress(100, 100, 'Complete!');

    // Check if script executed successfully
    if (!results || !results[0] || !results[0].result) {
      clearInterval(progressInterval);
      hideProgress();
      statusEl.textContent = '⚠️ Not a DuckDuckGo AI page - Please navigate to duck.ai';
      conversationData = [];
      items = [];
      await renderTitlesOnly();
      return;
    }

    conversationData = results[0].result;
    usingCachedData = false;

    // Check if we got valid data
    if (!conversationData || !Array.isArray(conversationData)) {
      hideProgress();
      statusEl.textContent = '⚠️ No conversations found - Are you on duck.ai?';
      conversationData = [];
      items = [];
      await renderTitlesOnly();
      return;
    }

    // Populate items array for rendering
    items = conversationData.map((r, index) => ({
      title: r.title,
      checked: false,
      index: index
    }));

    // Cache the results
    await setCachedConversations(conversationData);

    await new Promise(resolve => setTimeout(resolve, 400));
    hideProgress();

    statusEl.textContent = `✓ Loaded ${conversationData.length} conversations`;
    await renderTitlesOnly();
  } catch (error) {
    hideProgress();
    console.error('Error loading titles:', error);
    statusEl.textContent = `Error: ${error.message || 'Failed to load conversations'}`;
  }
}

async function loadConversations() {
  const fullBackupMode = document.getElementById('fullBackupMode').checked;
  
  console.log('🔍 loadConversations() called. Full Backup Mode:', fullBackupMode);
  
  statusEl.textContent = fullBackupMode ? 'Loading full content (auto-clicking through conversations)...' : 'Loading chat titles...';
  hideProgress();

  try {
    let cachedData = await getCachedConversations();

    // Don't use cache in full backup mode
    if (cachedData && !fullBackupMode) {
      console.log('📦 Using cached data (', cachedData.length, 'conversations)');
      conversationData = cachedData;
      usingCachedData = true;  // NEW: Flag that we're using cache
      const cacheInfo = await getCacheInfo();
      statusEl.textContent = `Loaded cached chat titles (expires in ${cacheInfo.remainingMinutes}min)...`;
    } else {
      usingCachedData = false;  // NEW: Fresh scan, not using cache
      console.log('🔄 Fresh scan mode. Full Backup:', fullBackupMode);
      
      if (fullBackupMode) {
        statusEl.textContent = '🔄 Scanning conversations (Full Backup will start after clicking on button "Download Backup")...';
      } else {
        statusEl.textContent = 'Scanning conversations...';
      }
      showProgress();

      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      
      console.log('📍 Current tab:', { id: tab.id, url: tab.url, title: tab.title });

      // Choose appropriate function based on mode
      const backupFunction = fullBackupMode ? backupConversationsWithAutoClick : backupConversations;
      console.log('🎯 Using function:', fullBackupMode ? 'backupConversationsWithAutoClick (FULL BACKUP)' : 'backupConversations (TITLES ONLY)');
      
      if (fullBackupMode) {
        // Full backup mode - show real-time progress
        updateProgress(0, 100, 'Loading conversations...');
        
        try {
          console.log('🔧 Executing script in Full Backup mode...');
          const backupResults = await browser.scripting.executeScript({
            target: { tabId: tab.id },
            func: backupFunction
            // Note: No args needed - the function handles everything internally
          });

          updateProgress(100, 100, 'Complete!');
          
          console.log('📦 Script execution result:', backupResults);

          // Check if script executed successfully
          if (!backupResults || !backupResults[0] || !backupResults[0].result) {
            hideProgress();
            console.error('❌ Script returned no results:', { 
              hasResults: !!backupResults, 
              hasFirstItem: !!backupResults?.[0],
              result: backupResults?.[0]?.result 
            });
            statusEl.textContent = '⚠️ Not a DuckDuckGo AI page - Please navigate to duck.ai';
            conversationData = [];
            items = [];
            await renderTitlesOnly();
            return;
          }

          const result = backupResults[0].result;
          console.log('Full backup result:', result);

          if (result && result.error) {
            throw new Error(result.message || 'Unknown error occurred during backup');
          }

          conversationData = result;
          await new Promise(resolve => setTimeout(resolve, 600));
          hideProgress();
        } catch (scriptError) {
          hideProgress();
          console.error('❌ Script execution error:', scriptError);
          console.error('Error name:', scriptError.name);
          console.error('Error message:', scriptError.message);
          console.error('Error stack:', scriptError.stack);
          
          // Provide helpful error messages
          let errorMsg = 'Script execution failed';
          if (scriptError.message?.includes('Cannot access') || scriptError.message?.includes('scripting')) {
            errorMsg = 'Permission denied - Click extension while on duck.ai page';
          } else if (scriptError.message?.includes('Receiving end does not exist')) {
            errorMsg = 'Page not ready - Try refreshing duck.ai';
          }
          
          statusEl.textContent = `⚠️ ${errorMsg}`;
          conversationData = [];
          items = [];
          await renderTitlesOnly();
          return;
        }
      } else {
        // Fast mode - use progress steps
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
          const backupResults = await browser.scripting.executeScript({
            target: { tabId: tab.id },
            func: backupFunction
          });

          clearInterval(progressInterval);
          updateProgress(100, 100, 'Complete!');

          // Check if script executed successfully
          if (!backupResults || !backupResults[0] || !backupResults[0].result) {
            hideProgress();
            statusEl.textContent = '⚠️ Not a DuckDuckGo AI page - Please navigate to duck.ai';
            conversationData = [];
            items = [];
            await renderTitlesOnly();
            return;
          }

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
          statusEl.textContent = `⚠️ Error: ${scriptError.message || 'Are you on duck.ai?'}`;
          conversationData = [];
          items = [];
          await renderTitlesOnly();
          return;
        }
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
      const fullContentCount = conversationData.filter(c => c.contentSource === 'main_content').length;
      const limitedCount = conversationData.filter(c => c.contentSource === 'limited' || c.contentSource === 'sidebar_text').length;
      
      if (fullBackupMode) {
        statusEl.textContent = `✅ Loaded ${conversationData.length} conversations - Ready for Full Backup`;
      } else {
        statusEl.textContent = `Loaded ${conversationData.length} chat titles (fresh data, cached for 5min)`;
      }
    }
  } catch (error) {
    console.error('Error loading chat titles:', error);
    statusEl.textContent = 'Error loading chat titles - Please try again';
    hideProgress();
  }
}

async function forceRefresh() {
  console.log('Force refresh triggered');
  await browser.storage.local.remove([CACHE_KEY, CACHE_KEY + '_timestamp']);
  statusEl.textContent = 'Cache cleared, refreshing...';
  refreshBtn.click();
}

refreshBtn.addEventListener('dblclick', forceRefresh);

// NEW: Clear cache AND memory when Full Backup Mode checkbox is toggled
document.getElementById('fullBackupMode').addEventListener('change', async function() {
  console.log('Full Backup Mode toggled, clearing cache and memory...');
  await browser.storage.local.remove([CACHE_KEY, CACHE_KEY + '_timestamp']);
  usingCachedData = false;
  
  // CRITICAL: Also clear in-memory data to prevent mismatched downloads
  conversationData = [];
  items = [];
  await renderTitlesOnly();
  
  statusEl.textContent = '⚠️ Mode changed - You must reload conversations before downloading!';
});

document.getElementById('clearCache').addEventListener('click', async () => {
  try {
    await browser.storage.local.remove([CACHE_KEY, CACHE_KEY + '_timestamp']);
    usingCachedData = false;  // NEW: Clear flag
    statusEl.textContent = 'Cache cleared successfully';
    items = [];
    conversationData = [];
    await renderTitlesOnly();
  } catch (error) {
    console.error('Error clearing cache:', error);
    statusEl.textContent = 'Error clearing cache';
  }
});

// Select All / Deselect All button with smart toggle
toggleBtn.addEventListener('click', async () => {
  if (items.length === 0) {
    statusEl.textContent = '⚠️ No conversations loaded yet. Click "Load Chat-titles" first.';
    return;
  }
  
  const allChecked = items.every(i => i.checked);
  const newState = !allChecked;
  
  items = items.map(i => ({ ...i, checked: newState }));
  await renderTitlesOnly();
  
  // Update button text based on new state
  if (newState) {
    toggleBtn.textContent = '☐ Deselect All';
    statusEl.textContent = `✓ Selected all ${items.length} conversations`;
  } else {
    toggleBtn.textContent = '☑️ Select All';
    statusEl.textContent = `Deselected all conversations`;
  }
});

function htmlToMarkdown(html) {
  let result = html;
  
  // FIRST: Handle DuckDuckGo code blocks (with language labels and copy buttons)
  // Structure: <pre><div class="..."><div>...<p>LANGUAGE</p></div><div><button>Code kopiëren</button>...</div></div><div>...<code>ACTUAL CODE</code></div></div></pre>
  result = result.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (match, preContent) => {
    // Extract language label from the structure
    const languageMatch = preContent.match(/<p[^>]*class="[^"]*li3asHIMe05JPmtJCytG[^"]*"[^>]*>(.*?)<\/p>/i);
    const language = languageMatch ? languageMatch[1].trim() : '';
    
    // Extract the actual code from <code> tag
    const codeMatch = preContent.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
    if (codeMatch) {
      let code = codeMatch[1];
      
      // Remove button texts and SVG elements
      code = code.replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '');
      code = code.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');
      
      // Remove specific DuckDuckGo UI text patterns
      code = code.replace(/Code\s+kopiëren/gi, '');
      code = code.replace(/Gekopieerd/gi, '');
      
      // Strip remaining HTML tags from code
      code = code.replace(/<[^>]+>/g, '');
      
      // Decode HTML entities
      code = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      
      code = code.trim();
      
      // Format as markdown code block with language
      if (language) {
        return `\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;
      } else {
        return `\n\n\`\`\`\n${code}\n\`\`\`\n\n`;
      }
    }
    
    // Fallback if no code tag found - just clean the content
    let cleanContent = preContent
      .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '')
      .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
      .replace(/Code\s+kopiëren/gi, '')
      .replace(/Gekopieerd/gi, '')
      .replace(/<[^>]+>/g, '');
    
    return `\n\n\`\`\`\n${cleanContent.trim()}\n\`\`\`\n\n`;
  });
  
  // Handle tables SECOND (before other replacements)
  result = result.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, tableContent) => {
    let markdown = '\n\n';
    
    // Extract header row
    const headerMatch = tableContent.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
    if (headerMatch) {
      const headerCells = [];
      const headerHtml = headerMatch[1];
      const thMatches = headerHtml.matchAll(/<th[^>]*>(.*?)<\/th>/gi);
      for (const th of thMatches) {
        headerCells.push(th[1].trim());
      }
      
      if (headerCells.length > 0) {
        // Add header row
        markdown += '| ' + headerCells.join(' | ') + ' |\n';
        // Add separator row
        markdown += '|' + headerCells.map(() => '---').join('|') + '|\n';
      }
    }
    
    // Extract body rows
    const bodyMatch = tableContent.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    if (bodyMatch) {
      const bodyHtml = bodyMatch[1];
      const rowMatches = bodyHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      
      for (const row of rowMatches) {
        const cells = [];
        const cellMatches = row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi);
        for (const cell of cellMatches) {
          // Clean cell content but preserve formatting tags temporarily
          let cellContent = cell[1].trim();
          cells.push(cellContent);
        }
        
        if (cells.length > 0) {
          markdown += '| ' + cells.join(' | ') + ' |\n';
        }
      }
    }
    
    markdown += '\n';
    return markdown;
  });
  
  // Continue with other conversions
  result = result
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n# $1\n\n')
    .replace(/<p[^>]*>/gi, '\n\n')
    .replace(/<\/p>/gi, '')
    .replace(/<br[^>]*>/gi, '\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    // Handle inline code (after code blocks have been processed)
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    // Fix links: Remove image icons within link text
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(?:<img[^>]*>)?([^<]*?)(?:<img[^>]*>)?<\/a>/gi, '[$2]($1)')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (match, url, text) => {
      // Strip any remaining img tags from link text
      const cleanText = text.replace(/<img[^>]*>/gi, '').trim();
      return `[${cleanText}](${url})`;
    })
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
    // Clean up excessive newlines
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
  
  // NEW: Wrap user questions in ```my_question blocks
  // Detect paragraphs that look like questions (end with ?)
  result = result.replace(/^([^\n]+\?)\s*$/gm, (match, question) => {
    // Only wrap if it's a substantial question (more than 10 chars, not already in a code block)
    if (question.length > 10 && !question.includes('```')) {
      return `\`\`\`my_question\n${question}\n\`\`\``;
    }
    return match;
  });
    
  return result;
}

async function checkLocalDownloadedFiles() {
  try {
    const downloadedFiles = await browser.storage.local.get(['downloadedFiles']) || { downloadedFiles: [] };
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
      title: conversation.title,
      contentSource: conversation.contentSource || 'unknown', // NEW: Track backup quality
      contentLength: conversation.content?.length || 0 // NEW: Track content size
    };

    existingFiles.push(newFile);
    await browser.storage.local.set({ downloadedFiles: existingFiles });
    console.log(`📝 Tracked: ${filename} (${newFile.contentSource})`);
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
        timestamp: duplicate.timestamp,
        contentSource: duplicate.contentSource || 'unknown', // NEW: Return backup quality
        wasFullBackup: duplicate.contentSource === 'main_content' // NEW: Flag for full backups
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return { isDuplicate: false };
  }
}

// Async wrapper for backup status (loads downloadedFiles then calls sync version)
async function getBackupStatus(conversation) {
  const downloadedFiles = await checkLocalDownloadedFiles();
  const syncResult = getBackupStatusSync(conversation, downloadedFiles);
  
  // Map icon-based result to status codes expected by viewBackupStatus
  let status = 'not-backed-up';
  let backupType = null;
  
  if (syncResult.icon === '✅') {
    status = 'up-to-date';
    backupType = 'main_content';
  } else if (syncResult.icon === '⚠️') {
    const isPartial = syncResult.label.includes('Partial');
    const canUpgrade = syncResult.label.includes('upgrade');
    status = canUpgrade ? 'upgrade-available' : 'up-to-date';
    backupType = canUpgrade ? 'sidebar_text' : syncResult.label.includes('Full') ? 'main_content' : 'sidebar_text';
  } else if (syncResult.icon === '🔄') {
    status = 'outdated';
    backupType = 'main_content';
  }
  
  return {
    ...syncResult,
    status,
    backupType
  };
}

// NEW: Synchronous backup status (uses pre-loaded downloadedFiles)
function getBackupStatusSync(conversation, downloadedFiles) {
  try {
    const currentHash = conversation.contentHash;
    const currentSource = conversation.contentSource;
    const title = conversation.title;
    
    // Check for exact hash match (content unchanged)
    // IMPORTANT: Find the MOST RECENT match, not just any match
    const hashMatches = downloadedFiles.filter(f => f.conversationHash === currentHash);
    const exactMatch = hashMatches.length > 0 
      ? hashMatches.reduce((latest, current) => current.timestamp > latest.timestamp ? current : latest)
      : null;
    
    if (exactMatch) {
      const isFullBackup = exactMatch.contentSource === 'main_content';
      return {
        icon: isFullBackup ? '✅' : '⚠️',
        label: isFullBackup 
          ? `Full backup (${new Date(exactMatch.timestamp).toLocaleDateString()})` 
          : `Partial backup (${new Date(exactMatch.timestamp).toLocaleDateString()})`,
        color: isFullBackup ? '#28a745' : '#ffc107',
        bold: true
      };
    }
    
    // Check for same title but different hash (CONVERSATION UPDATED!)
    // IMPORTANT: Skip outdated check in these cases to avoid false positives:
    // 1. When using cached data (cache hashes might be unreliable)
    // 2. When content source is not main_content (sidebar_text hashes are unstable)
    // 3. When current content is very short (might be partial/incomplete extraction)
    // 4. When we don't have backup files loaded yet (prevents timing issues on first load)
    const shouldCheckOutdated = !usingCachedData && 
                                 currentSource === 'main_content' && 
                                 conversation.content && 
                                 conversation.content.length > 200 && // Require substantial content
                                 downloadedFiles && downloadedFiles.length > 0; // Require backup history loaded
    
    // IMPORTANT: Filter all potential matches first, then find the MOST RECENT outdated backup
    const outdatedMatches = shouldCheckOutdated ? downloadedFiles.filter(f => {
      if (f.title !== title || f.contentSource !== currentSource) return false;
      if (f.conversationHash === currentHash) return false; // Hash matches, not outdated
      
      // Additional check: If content lengths are very similar, probably just extraction variance
      // Only mark as outdated if there's a significant length difference (>10%)
      const currentLength = conversation.content.length;
      const backupLength = f.contentLength || 0;
      
      if (backupLength > 0) {
        const lengthDiff = Math.abs(currentLength - backupLength);
        const percentDiff = (lengthDiff / backupLength) * 100;
        
        // If length difference is less than 10%, probably just extraction variance
        if (percentDiff < 10) {
          console.log(`[Status Check] Similar length (${percentDiff.toFixed(1)}% diff) - treating as unchanged: "${title.substring(0, 30)}"`);
          return false;
        }
        
        console.log(`[Status Check] Significant length change (${percentDiff.toFixed(1)}% diff) - marking as outdated: "${title.substring(0, 30)}"`);
      }
      
      return true; // Different hash AND significant length change
    }) : [];
    
    const outdatedMatch = outdatedMatches.length > 0
      ? outdatedMatches.reduce((latest, current) => current.timestamp > latest.timestamp ? current : latest)
      : null;
    
    if (outdatedMatch) {
      return {
        icon: '🔄',
        label: `Updated since backup (${new Date(outdatedMatch.timestamp).toLocaleDateString()})`,
        color: '#ff9800',
        bold: true
      };
    }
    
    // Check if backup exists with same title (no hash match yet)
    // IMPORTANT: Find the MOST RECENT backup with same title AND content source
    const sameTitleMatches = downloadedFiles.filter(f => 
      f.title === title &&
      f.contentSource === currentSource
    );
    const sameTitle = sameTitleMatches.length > 0
      ? sameTitleMatches.reduce((latest, current) => current.timestamp > latest.timestamp ? current : latest)
      : null;
    
    if (sameTitle) {
      // Backup exists with same source (hash matched earlier, or this is fallback)
      const isFullBackup = sameTitle.contentSource === 'main_content';
      return {
        icon: isFullBackup ? '✅' : '⚠️',
        label: isFullBackup 
          ? `Backed up (${new Date(sameTitle.timestamp).toLocaleDateString()})` 
          : `Partial backup (${new Date(sameTitle.timestamp).toLocaleDateString()})`,
        color: isFullBackup ? '#28a745' : '#ffc107',
        bold: true
      };
    }
    
    // Check if backup exists but with different content source (upgrade candidate)
    // IMPORTANT: This should NOT trigger if a NEWER full backup exists
    // Only show upgrade message if the most recent backup is partial but current is full
    const allBackupsForTitle = downloadedFiles.filter(f => f.title === title);
    const mostRecentBackup = allBackupsForTitle.length > 0
      ? allBackupsForTitle.reduce((latest, current) => current.timestamp > latest.timestamp ? current : latest)
      : null;
    
    // Only suggest upgrade if most recent backup is partial AND current is full
    if (mostRecentBackup && 
        mostRecentBackup.contentSource !== 'main_content' && 
        currentSource === 'main_content') {
      return {
        icon: '⚠️',
        label: `Partial backup exists (${new Date(mostRecentBackup.timestamp).toLocaleDateString()}) - can upgrade to full`,
        color: '#ffc107',
        bold: true
      };
    }
    
    // No backup exists
    return {
      icon: null,
      label: 'Not backed up',
      color: null,
      needsUpdate: true,
      backupExists: false,
      backupType: null
    };
  } catch (error) {
    console.error('Error checking backup status:', error);
    return {
      status: 'error',
      icon: null,
      label: 'Error checking status',
      color: null,
      needsUpdate: false,
      backupExists: false,
      backupType: null
    };
  }
}

async function addToBackupHistory(items) {
  try {
    const { [BACKUP_HISTORY_KEY]: history = [] } = await browser.storage.local.get([BACKUP_HISTORY_KEY]);

    const newEntry = {
      timestamp: new Date().toISOString(),
      itemCount: items.length,
      items: items.map(item => ({
        title: item.title.substring(0, 100),
        contentHash: item.contentHash,
        contentSource: item.contentSource || 'unknown'  // NEW: Track backup type in history
      }))
    };

    history.unshift(newEntry);

    const maxHistory = 50;
    const trimmedHistory = history.slice(0, maxHistory);

    await browser.storage.local.set({ [BACKUP_HISTORY_KEY]: trimmedHistory });
    console.log('Added backup entry to history');
  } catch (error) {
    console.error('Error adding to backup history:', error);
  }
}

async function downloadSingleConversation(conversation, index, total) {
  const title = conversation.title || 'Untitled Conversation';
  const content = conversation.content || 'No content available';
  const contentSource = conversation.contentSource || 'unknown';

  // Determine backup type label for filename
  const backupType = contentSource === 'main_content' ? 'FULL' : 'PARTIAL';
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = await generateFilename(index, title, backupType, dateStr);

  const duplicateCheck = await checkDuplicateConversation(conversation);
  
  // Check if Obsidian frontmatter is enabled (simple checkbox)
  const obsidianFrontmatter = document.getElementById('obsidianFrontmatter')?.checked ?? true;
  console.log('🔮 Obsidian frontmatter enabled:', obsidianFrontmatter);

  let markdownContent = '';
  
  // Add Obsidian frontmatter if enabled
  if (obsidianFrontmatter) {
    markdownContent += generateObsidianFrontmatter(conversation, index, backupType);
  }

  if (duplicateCheck.isDuplicate) {
    const previousBackupType = duplicateCheck.contentSource === 'main_content' ? '✅ FULL CONTENT' : '⚠️ PARTIAL CONTENT';
    const currentBackupType = contentSource === 'main_content' ? '✅ FULL CONTENT' : '⚠️ PARTIAL CONTENT';
    
    markdownContent += `# ${title}\n\n**⚠️ DUPLICATE DETECTED**\n\nThis conversation was already downloaded as: \`${duplicateCheck.filename}\`\nOriginal download: ${new Date(duplicateCheck.timestamp).toLocaleString()}\nPrevious backup: ${previousBackupType}\nCurrent backup: ${currentBackupType}\n\n`;
    
    // If previous was partial but current is full, allow upgrade
    if (!duplicateCheck.wasFullBackup && contentSource === 'main_content') {
      markdownContent += `**📈 UPGRADE AVAILABLE**\n\nThis is an upgraded backup with full content. The file will be saved with full content.\n\n`;
      console.log(`🔄 Upgrading partial backup to full: ${title}`);
    }
  }

  const now = new Date();
  markdownContent += `# ${title}\n\n`;
  markdownContent += `*Exported from Duck.ai on: ${now.toLocaleString()}*\n\n`;

  if (conversation.contentHash) {
    markdownContent += `*Content Hash: ${conversation.contentHash}*\n\n`;
  }

  markdownContent += `*Source: ${conversation.url || 'Unknown'}*\n\n`;
  
  // Add warning based on content source
  if (contentSource === 'sidebar_text') {
    markdownContent += `**⚠️ LIMITED CONTENT**: This backup only contains the sidebar preview text. The full conversation content was not accessible.\n\n`;
  } else if (contentSource === 'title_only') {
    markdownContent += `**⚠️ NO CONTENT**: This backup only contains the conversation title. The conversation content was not accessible.\n\n`;
  } else if (contentSource === 'main_content') {
    markdownContent += `**✅ FULL CONTENT**: This backup contains the complete conversation from the main view.\n\n`;
  }
  
  markdownContent += `---\n\n`;

  // Use HTML content if available, otherwise use text content
  let contentToConvert = content;
  if (conversation.html && conversation.html.length > content.length * 0.5) {
    contentToConvert = conversation.html;
    console.log(`Using HTML content for better formatting (${conversation.html.length} chars)`);
  }

  const contentMarkdown = htmlToMarkdown(contentToConvert);
  markdownContent += `${contentMarkdown}\n\n`;

  // Add metadata footer
  markdownContent += `\n\n---\n\n`;
  markdownContent += `*Export Details*\n\n`;
  markdownContent += `- Content Source: \`${contentSource}\`\n`;
  markdownContent += `- Export Date: ${now.toISOString()}\n`;
  markdownContent += `- Content Length: ${content.length} characters\n`;

  const blob = new Blob([markdownContent], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);

  // Always use custom download folder (simple approach)
  const folder = await getDownloadFolder();
  const fullPath = folder + '/' + filename;
  console.log('📁 Downloading to:', fullPath);

  // Download using standard API (works for relative paths only)
  try {
    console.log('🚀 Starting download:', { filename, fullPath, folder });
    
    // Try downloading with folder path
    let downloadId;
    try {
      downloadId = await browser.downloads.download({
        url: url,
        filename: fullPath,
        saveAs: false,
        conflictAction: 'uniquify'  // Auto-rename duplicates
      });
      console.log('✅ Download started successfully! ID:', downloadId);
    } catch (folderError) {
      // If folder path fails, try without folder (Chrome sometimes fails with folders)
      console.warn('⚠️ Folder path failed, trying filename only:', folderError.message);
      downloadId = await browser.downloads.download({
        url: url,
        filename: filename,  // Just filename, no folder
        saveAs: false,
        conflictAction: 'uniquify'
      });
      console.log('✅ Download started (without folder) ID:', downloadId);
    }
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('❌ Download API completely failed:', error);
    console.error('Error details:', error.message, error.stack);
    // Fallback to traditional method if downloads API fails
    console.log('⚠️ Falling back to traditional <a> tag download method...');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('✅ Fallback download triggered');
  }

  // Track the download
  // Allow upgrades from partial to full backup
  const isUpgrade = duplicateCheck.isDuplicate && !duplicateCheck.wasFullBackup && contentSource === 'main_content';
  
  if (!duplicateCheck.isDuplicate || isUpgrade) {
    await trackDownloadedFile(filename, conversation);
    if (isUpgrade) {
      console.log(`✅ Backup upgraded from ${duplicateCheck.contentSource} to ${contentSource}`);
    }
  }

  return { 
    filename, 
    isDuplicate: duplicateCheck.isDuplicate && !isUpgrade, // Don't count upgrades as duplicates
    contentSource,
    isUpgrade: isUpgrade
  };
}

document.getElementById('downloadButton').addEventListener('click', async () => {
  // AUTO-LOAD if no conversations are loaded yet
  if (!conversationData || conversationData.length === 0) {
    statusEl.textContent = '⚡ Quick Download - loading conversations...';
    showProgress();
    
    try {
      await loadTitlesOnly(); // Load titles quickly
      
      if (!conversationData || conversationData.length === 0) {
        statusEl.textContent = '⚠️ No conversations found on this page';
        hideProgress();
        return;
      }
      
      statusEl.textContent = `✓ Loaded ${conversationData.length} conversations - Select conversations to download`;
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('Error loading conversations:', error);
      statusEl.textContent = `❌ Error: ${error.message}`;
      hideProgress();
      return;
    }
  }
  
  // Check if any items are selected
  const checkedItems = items.filter(item => item.checked);
  if (checkedItems.length === 0) {
    statusEl.textContent = '⚠️ No conversations selected! Click "☑️ Select All" or check individual conversations first.';
    hideProgress();
    return;
  }
  
  const finalCheckedItems = checkedItems; // Use the already-filtered list

  const fullBackupMode = document.getElementById('fullBackupMode').checked;
  
  // WARN about Quick Download limitation
  if (!fullBackupMode) {
    const partialCount = conversationData.filter(c => c.contentSource !== 'main_content').length;
    if (partialCount > 0) {
      const proceed = confirm(
        `⚠️ QUICK DOWNLOAD LIMITATION\n\n` +
        `${partialCount} of ${conversationData.length} conversations will be PARTIAL backups (title only).\n\n` +
        `Only the currently open conversation has full content.\n\n` +
        `💡 Use "Full Backup (Auto-Click Mode)" for complete backups.\n\n` +
        `Continue with Quick Download anyway?`
      );
      if (!proceed) {
        statusEl.textContent = 'Quick download cancelled - use Full Backup for complete content';
        return;
      }
    }
  }
  
  // NEW: Check if we need to load full content first
  if (conversationData.length > 0) {
    const hasFullContent = conversationData.some(c => c.contentSource === 'main_content');
    const hasPartialContent = conversationData.some(c => c.contentSource !== 'main_content');
    
    // If we only have titles/partial content but need full backup, load it now
    if (fullBackupMode && !hasFullContent) {
      statusEl.textContent = '🔄 Loading full content before backup (this may take a moment)...';
      showProgress();
      
      try {
        // Load full content by calling loadConversations with full backup mode
        await loadConversations();
        
        // Check if load was successful
        if (!conversationData || conversationData.length === 0) {
          statusEl.textContent = '❌ Failed to load full content';
          hideProgress();
          return;
        }
        
        statusEl.textContent = '✓ Full content loaded! Starting backup...';
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Error loading full content:', error);
        statusEl.textContent = `❌ Error loading content: ${error.message}`;
        hideProgress();
        return;
      }
    }
  }
  
  if (fullBackupMode) {
    statusEl.textContent = `🔄 Starting Full Backup for ${finalCheckedItems.length} conversations...`;
  } else {
    statusEl.textContent = `Downloading ${finalCheckedItems.length} conversations...`;
  }
  showProgress();

  try {
    const downloadResults = [];

    for (let i = 0; i < finalCheckedItems.length; i++) {
      const item = finalCheckedItems[i];
      const conversation = conversationData[item.index];

      if (conversation) {
        updateProgress(i + 1, finalCheckedItems.length, `Downloading: ${conversation.title.substring(0, 30)}...`);

        const result = await downloadSingleConversation(conversation, i, finalCheckedItems.length);
        downloadResults.push(result);

        // Longer delay between downloads to prevent content bleeding
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    await addToBackupHistory(finalCheckedItems.map(item => conversationData[item.index]));
    
    // Clear cache after backup so next load shows accurate outdated status
    console.log('Clearing cache after backup for accurate status on next load...');
    await browser.storage.local.remove([CACHE_KEY, CACHE_KEY + '_timestamp']);
    usingCachedData = false;

    const duplicateCount = downloadResults.filter(r => r.isDuplicate).length;
    const upgradeCount = downloadResults.filter(r => r.isUpgrade).length;
    const newCount = downloadResults.length - duplicateCount - upgradeCount;
    const fullContentCount = downloadResults.filter(r => r.contentSource === 'main_content').length;
    const limitedContentCount = downloadResults.filter(r => r.contentSource === 'sidebar_text').length;
    const titleOnlyCount = downloadResults.filter(r => r.contentSource === 'title_only').length;

    hideProgress();

    let statusMessage = `Downloaded: ${newCount} new`;
    if (upgradeCount > 0) {
      statusMessage += `, ${upgradeCount} upgraded 📈`;
    }
    if (duplicateCount > 0) {
      statusMessage += `, ${duplicateCount} duplicates`;
    }
    if (fullContentCount > 0) {
      statusMessage += ` (${fullContentCount} full content)`;
    }
    if (limitedContentCount > 0) {
      statusMessage += ` (${limitedContentCount} limited)`;
    }
    if (titleOnlyCount > 0) {
      statusMessage += ` (${titleOnlyCount} title only)`;
    }
    statusEl.textContent = statusMessage;

  } catch (error) {
    console.error('Download error:', error);
    statusEl.textContent = 'Error during download - check console for details';
  }
});

// NEW: Enhanced Backup Status Viewer with Outdated Detection
document.getElementById('viewBackupStatus').addEventListener('click', async () => {
  try {
    // AUTO-LOAD if no conversations are loaded yet
    if (!conversationData || conversationData.length === 0) {
      statusEl.textContent = '📊 Loading conversations for status check...';
      showProgress();
      
      try {
        await loadTitlesOnly(); // Load titles quickly
        
        if (!conversationData || conversationData.length === 0) {
          statusEl.textContent = '⚠️ No conversations found on this page';
          hideProgress();
          return;
        }
        
        statusEl.textContent = `✓ Loaded ${conversationData.length} conversations`;
        hideProgress();
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error('Error loading conversations:', error);
        statusEl.textContent = `❌ Error: ${error.message}`;
        hideProgress();
        return;
      }
    }
    
    const downloadedFiles = await checkLocalDownloadedFiles();
    
    // Analyze current conversation status
    const statusCounts = {
      upToDate: 0,
      outdated: 0,
      partial: 0,
      notBackedUp: 0,
      legacy: 0
    };
    
    const conversationStatuses = [];
    
    for (const conversation of conversationData) {
      const status = await getBackupStatus(conversation);
      conversationStatuses.push({ conversation, status });
      
      if (status.status === 'up-to-date') {
        if (status.backupType === 'main_content') {
          statusCounts.upToDate++;
        } else {
          statusCounts.partial++;
        }
      } else if (status.status === 'outdated') {
        statusCounts.outdated++;
      } else if (status.status === 'upgrade-available') {
        statusCounts.partial++;  // Count as partial (can be upgraded)
      } else if (status.status === 'not-backed-up') {
        statusCounts.notBackedUp++;
      }
    }
    
    // Count legacy backups (in tracking but not in current conversations)
    const legacyBackups = downloadedFiles.filter(f => !f.contentSource).length;
    statusCounts.legacy = legacyBackups;

    let modalHTML = `
      <div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 1000; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; border-radius: 12px; padding: 25px; max-width: 650px; max-height: 80vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
          <h3 style="margin: 0 0 15px 0; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">📊 Backup Status Report</h3>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; text-align: center; margin-bottom: 15px;">
              <div>
                <div style="font-size: 2em; color: #28a745;">✅</div>
                <div style="font-size: 1.5em; font-weight: bold; color: #28a745;">${statusCounts.upToDate}</div>
                <div style="font-size: 0.85em; color: #666;">Up to Date</div>
              </div>
              <div>
                <div style="font-size: 2em; color: #ff9800;">🔄</div>
                <div style="font-size: 1.5em; font-weight: bold; color: #ff9800;">${statusCounts.outdated}</div>
                <div style="font-size: 0.85em; color: #666;">Updated</div>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center;">
              <div>
                <div style="font-size: 1.5em; color: #999;">⭕</div>
                <div style="font-size: 1.2em; font-weight: bold; color: #999;">${statusCounts.notBackedUp}</div>
                <div style="font-size: 0.8em; color: #666;">Not Backed Up</div>
              </div>
              ${statusCounts.partial > 0 ? `
                <div>
                  <div style="font-size: 1.5em; color: #ffc107;">⚠️</div>
                  <div style="font-size: 1.2em; font-weight: bold; color: #ffc107;">${statusCounts.partial}</div>
                  <div style="font-size: 0.8em; color: #666;">Partial</div>
                </div>
              ` : '<div></div>'}
              ${statusCounts.legacy > 0 ? `
                <div>
                  <div style="font-size: 1.5em; color: #6c757d;">📌</div>
                  <div style="font-size: 1.2em; font-weight: bold; color: #6c757d;">${statusCounts.legacy}</div>
                  <div style="font-size: 0.8em; color: #666;">Legacy</div>
                </div>
              ` : '<div></div>'}
            </div>
          </div>
          
          ${statusCounts.outdated > 0 ? `
            <div style="background: #fff3cd; border-left: 4px solid #ff9800; padding: 12px; margin-bottom: 15px; border-radius: 4px;">
              <strong>🔄 Action Needed:</strong> ${statusCounts.outdated} conversation(s) updated since last backup. Re-backup to get latest content!
            </div>
          ` : ''}

          ${statusCounts.partial > 0 ? `
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin-bottom: 15px; border-radius: 4px;">
              <strong>💡 Tip:</strong> ${statusCounts.partial} partial backup(s). Use <strong>Full Backup Mode</strong> to upgrade!
            </div>
          ` : ''}
          
          ${conversationData && conversationData.length > 0 && conversationData[0].contentSource !== 'main_content' ? `
            <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 12px; margin-bottom: 15px; border-radius: 4px;">
              <strong>ℹ️ Note:</strong> Status based on partial content. Enable <strong>Full Backup Mode</strong> and reload for accurate outdated detection.
            </div>
          ` : ''}
          
          ${usingCachedData ? `
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin-bottom: 15px; border-radius: 4px;">
              <strong>⚠️ Warning:</strong> Using cached data. Status may show false "Outdated" warnings. Click <strong>"Load Chat-titles"</strong> to refresh for accurate status.
            </div>
          ` : ''}

          ${statusCounts.legacy > 0 ? `
            <div style="background: #e7f3ff; border-left: 4px solid #007bff; padding: 12px; margin-bottom: 15px; border-radius: 4px;">
              <strong>📌 Legacy Backups:</strong> ${statusCounts.legacy} old backup(s) created before this extension tracked backup types. These show as [?] in History View.
            </div>
          ` : ''}

          <h4 style="margin: 15px 0 10px 0; color: #555;">Conversation Status:</h4>
          <div style="max-height: 300px; overflow-y: auto;">
            ${conversationStatuses.slice(0, 20).map(({ conversation, status }) => {
              let statusLabel = 'Not Backed Up';
              if (status.status === 'up-to-date') {
                statusLabel = status.backupType === 'main_content' ? 'Up to Date' : 'Partial';
              } else if (status.status === 'outdated') {
                statusLabel = 'Updated';
              } else if (status.status === 'upgrade-available') {
                statusLabel = 'Can Upgrade';
              }
              
              return `
                <div style="padding: 10px; border-bottom: 1px solid #eee; font-size: 0.9em;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <span style="font-size: 1.2em;">${status.icon || '⭕'}</span>
                    <strong style="flex: 1; color: #333;">${conversation.title?.substring(0, 45) || 'Untitled'}${(conversation.title?.length || 0) > 45 ? '...' : ''}</strong>
                    <span style="background: ${status.color || '#999'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75em; font-weight: bold;">${statusLabel}</span>
                  </div>
                  <div style="color: #999; font-size: 0.85em;">
                    ${status.label}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div style="text-align: right; margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
            <button id="closeBackupStatus" style="background: #007bff; color: white; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-size: 0.95em; font-weight: 500;">Close</button>
          </div>
        </div>
      </div>
    `;

    const modalElement = document.createElement('div');
    modalElement.innerHTML = modalHTML;
    document.body.appendChild(modalElement);

    modalElement.querySelector('#closeBackupStatus').addEventListener('click', () => {
      document.body.removeChild(modalElement);
    });

    modalElement.addEventListener('click', (e) => {
      if (e.target === modalElement.firstElementChild) {
        document.body.removeChild(modalElement);
      }
    });

  } catch (error) {
    console.error('Error viewing backup status:', error);
    statusEl.textContent = 'Error loading backup status';
  }
});

// Store full history for filtering
let fullHistory = [];

function renderHistoryList(searchTerm = '') {
  const historyList = document.getElementById('historyList');
  
  if (fullHistory.length === 0) {
    historyList.innerHTML = '<p style="color: #666; font-style: italic;">No backup history found.</p>';
    return;
  }
  
  // Filter history by search term
  const filtered = searchTerm
    ? fullHistory.filter(item => 
        item.items.some(conv => 
          conv.title.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : fullHistory;
  
  if (filtered.length === 0) {
    historyList.innerHTML = `<p style="color: #666; font-style: italic;">No matches found for "${searchTerm}"</p>`;
    return;
  }
  
  historyList.innerHTML = filtered.map((item, index) => {
    // Find which conversations match the search
    const matchingItems = searchTerm
      ? item.items.filter(conv => conv.title.toLowerCase().includes(searchTerm.toLowerCase()))
      : item.items.slice(0, 3);
    
    const displayItems = searchTerm ? matchingItems : item.items.slice(0, 3);
    const remainingCount = searchTerm ? 0 : Math.max(0, item.items.length - 3);
    
    return `<div style="border-bottom: 1px solid #eee; padding: 8px 0;">
      <strong>Backup ${fullHistory.indexOf(item) + 1}</strong> - ${new Date(item.timestamp).toLocaleString()}<br>
      <small style="color: #666;">${item.itemCount} conversations${searchTerm ? ` (${matchingItems.length} matching)` : ''}</small>
      <div style="margin-top: 4px; font-size: 0.8em; max-height: ${searchTerm ? '200px' : '60px'}; overflow-y: auto;">
        ${displayItems.map(conv => {
          const typeIcon = conv.contentSource === 'main_content' ? '<span style="color: #28a745; font-weight: bold;" title="Full Backup">[FULL]</span>' : 
                           conv.contentSource && conv.contentSource !== 'unknown' ? '<span style="color: #ffc107; font-weight: bold;" title="Partial Backup">[PARTIAL]</span>' : 
                           '<span style="color: #6c757d; font-weight: bold;" title="Unknown Type">[?]</span>';
          return `<div style="color: #888;">• ${typeIcon} ${conv.title}${conv.title.length > 50 ? '...' : ''}</div>`;
        }).join('')}
        ${remainingCount > 0 ? `<div style="color: #aaa; font-style: italic;">...and ${remainingCount} more</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

document.getElementById('viewHistory').addEventListener('click', async () => {
  const modal = document.getElementById('historyModal');
  const searchInput = document.getElementById('historySearch');

  try {
    const { [BACKUP_HISTORY_KEY]: history = [] } = await browser.storage.local.get([BACKUP_HISTORY_KEY]);
    fullHistory = history.reverse();
    
    // Clear search input
    searchInput.value = '';
    
    // Render initial list
    renderHistoryList();

    modal.style.display = 'block';
  } catch (error) {
    console.error('Error loading history:', error);
    document.getElementById('historyList').innerHTML = '<p style="color: red;">Error loading backup history.</p>';
    modal.style.display = 'block';
  }
});

// Search functionality
document.getElementById('historySearch').addEventListener('input', (e) => {
  renderHistoryList(e.target.value);
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
      await browser.storage.local.remove([BACKUP_HISTORY_KEY]);
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

    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    const debugResults = await browser.scripting.executeScript({
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

// Download folder settings
const downloadFolderInput = document.getElementById('downloadFolder');
const saveFolderBtn = document.getElementById('saveFolder');
const folderPreview = document.getElementById('folderPreview');
const filenameFormatSelect = document.getElementById('filenameFormat');
const formatExampleEl = document.getElementById('formatExample');

// Load current folder setting on popup open
(async function loadFolderSetting() {
  const folder = await getDownloadFolder();
  downloadFolderInput.value = folder;
  folderPreview.textContent = folder;
})();

// Load current filename format setting
(async function loadFilenameFormat() {
  const format = await getFilenameFormat();
  filenameFormatSelect.value = format;
  updateFormatExample(format);
})();

// Update format example display
function updateFormatExample(formatKey) {
  const format = FILENAME_FORMATS[formatKey];
  if (format) {
    formatExampleEl.textContent = format.example;
  }
}

// Update preview as user types
downloadFolderInput.addEventListener('input', () => {
  const value = downloadFolderInput.value.trim() || DEFAULT_DOWNLOAD_FOLDER;
  folderPreview.textContent = value;
});

// Handle filename format change
filenameFormatSelect.addEventListener('change', async () => {
  const formatKey = filenameFormatSelect.value;
  await browser.storage.local.set({ [FILENAME_FORMAT_KEY]: formatKey });
  updateFormatExample(formatKey);
  
  statusEl.textContent = `✓ Filename format updated: ${FILENAME_FORMATS[formatKey].name}`;
  setTimeout(() => {
    if (statusEl.textContent.includes('Filename format updated')) {
      statusEl.textContent = '';
    }
  }, 3000);
});

// Save folder setting
saveFolderBtn.addEventListener('click', async () => {
  const folder = downloadFolderInput.value.trim() || DEFAULT_DOWNLOAD_FOLDER;
  
  // Sanitize folder name (remove invalid characters)
  const sanitized = folder.replace(/[<>:"|?*]/g, '_');
  
  await browser.storage.local.set({ [DOWNLOAD_FOLDER_KEY]: sanitized });
  downloadFolderInput.value = sanitized;
  folderPreview.textContent = sanitized;
  
  console.log('✅ Download folder saved:', sanitized);
  console.log('Full storage key:', DOWNLOAD_FOLDER_KEY);
  
  // Verify it was saved
  const verify = await browser.storage.local.get([DOWNLOAD_FOLDER_KEY]);
  console.log('Verification - Stored value:', verify[DOWNLOAD_FOLDER_KEY]);
  
  statusEl.textContent = `✓ Download folder set to: ${sanitized}`;
  setTimeout(() => {
    if (statusEl.textContent.includes('Download folder set')) {
      statusEl.textContent = '';
    }
  }, 3000);
});

// Obsidian Integration - Simple checkbox, no complex handlers needed
// Frontmatter checkbox is checked by default, user can toggle it

// Debug Settings Button - Show all stored settings
const debugSettingsBtn = document.getElementById('debugSettingsBtn');
if (debugSettingsBtn) {
  debugSettingsBtn.addEventListener('click', async () => {
    const allSettings = await browser.storage.local.get(null);
    console.log('=== ALL STORED SETTINGS ===');
    console.log('Download Folder:', allSettings[DOWNLOAD_FOLDER_KEY] || 'NOT SET');
    console.log('Filename Format:', allSettings[FILENAME_FORMAT_KEY] || 'NOT SET');
    console.log('Obsidian Mode:', allSettings[OBSIDIAN_MODE_KEY] || 'NOT SET');
    console.log('Obsidian Vault Path:', allSettings[OBSIDIAN_VAULT_PATH_KEY] || 'NOT SET');
    console.log('Full storage object:', allSettings);
    console.log('===========================');
    
    statusEl.textContent = '🔧 Settings logged to console (press F12)';
    setTimeout(() => {
      if (statusEl.textContent.includes('Settings logged')) {
        statusEl.textContent = '';
      }
    }, 3000);
  });
}
