// Service worker for DuckDuckGo AI Backup Extension v2.2.0
// This runs in the background and handles extension lifecycle events + auto-backup

// Polyfill for Firefox
if (typeof browser === "undefined") {
  var browser = chrome;
}

// Auto-backup configuration
const AUTO_BACKUP_SETTINGS_KEY = 'autoBackupSettings';
const AUTO_BACKUP_DATA_KEY = 'autoBackupData';
const DEFAULT_AUTO_BACKUP_SETTINGS = {
  enabled: false,
  intervalMinutes: 10,
  maxVersionsPerChat: 3,
  notifications: true
};

// Alarm name for periodic backup
const AUTO_BACKUP_ALARM = 'autoBackupAlarm';

// Storage key for click-captured chats
const CAPTURED_CHATS_KEY = 'capturedChats';

// Store a chat captured by click-detection
async function storeCapturedChat(chatData) {
  if (!chatData || !chatData.title) return;
  
  const result = await browser.storage.local.get([CAPTURED_CHATS_KEY]);
  const captured = result[CAPTURED_CHATS_KEY] || {};
  
  // Use title hash as key to avoid duplicates
  const key = chatData.title.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  
  if (captured[key]) {
    // Update existing entry if new content is longer
    if (chatData.content.length > captured[key].content.length) {
      captured[key] = chatData;
      console.log(`🔍 Updated captured chat: "${chatData.title.substring(0, 40)}..."`);
    } else {
      console.log(`🔍 Already captured: "${chatData.title.substring(0, 40)}..."`);
    }
  } else {
    captured[key] = chatData;
    console.log(`🔍 New captured chat: "${chatData.title.substring(0, 40)}..." (${chatData.messageCount} messages)`);
  }
  
  await browser.storage.local.set({ [CAPTURED_CHATS_KEY]: captured });
}

// Initialize on install
browser.runtime.onInstalled.addListener(async () => {
  console.log('🦆 DuckDuckGo AI Backup extension installed');
  
  // Initialize auto-backup settings if not exists
  const result = await browser.storage.local.get([AUTO_BACKUP_SETTINGS_KEY]);
  if (!result[AUTO_BACKUP_SETTINGS_KEY]) {
    await browser.storage.local.set({
      [AUTO_BACKUP_SETTINGS_KEY]: DEFAULT_AUTO_BACKUP_SETTINGS
    });
    console.log('📋 Auto-backup settings initialized');
  }
});

// Handle extension startup
browser.runtime.onStartup.addListener(async () => {
  console.log('🦆 DuckDuckGo AI Backup extension started');
  await setupAutoBackupAlarm();
});

// Setup or update the auto-backup alarm
async function setupAutoBackupAlarm() {
  const result = await browser.storage.local.get([AUTO_BACKUP_SETTINGS_KEY]);
  const settings = result[AUTO_BACKUP_SETTINGS_KEY] || DEFAULT_AUTO_BACKUP_SETTINGS;
  
  // Clear existing alarm
  await browser.alarms.clear(AUTO_BACKUP_ALARM);
  
  if (settings.enabled) {
    // Create periodic alarm
    browser.alarms.create(AUTO_BACKUP_ALARM, {
      periodInMinutes: settings.intervalMinutes
    });
    console.log(`⏰ Auto-backup alarm set: every ${settings.intervalMinutes} minutes`);
  } else {
    console.log('⏰ Auto-backup disabled');
  }
}

// Handle alarm triggers
browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === AUTO_BACKUP_ALARM) {
    console.log('⏰ Auto-backup alarm triggered');
    await performAutoBackup();
  }
});

// Perform auto-backup by injecting script into duck.ai tabs
async function performAutoBackup() {
  try {
    // Find all duck.ai tabs
    const tabs = await browser.tabs.query({ url: ['https://duck.ai/*', 'https://*.duck.ai/*'] });
    
    if (tabs.length === 0) {
      console.log('📭 No duck.ai tabs open, skipping auto-backup');
      return;
    }
    
    console.log(`🔍 Found ${tabs.length} duck.ai tab(s)`);
    
    // Use the first duck.ai tab
    const tab = tabs[0];
    
    // Inject extraction script
    const results = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractConversationsForAutoBackup
    });
    
    if (!results || !results[0] || !results[0].result) {
      console.log('⚠️ Auto-backup: No data extracted');
      return;
    }
    
    const conversations = results[0].result;
    
    if (conversations.error) {
      console.log('⚠️ Auto-backup error:', conversations.message);
      return;
    }
    
    if (!Array.isArray(conversations) || conversations.length === 0) {
      console.log('📭 Auto-backup: No conversations found');
      return;
    }
    
    // Store the backup
    await storeAutoBackup(conversations);
    
    // Show notification if enabled
    const settings = (await browser.storage.local.get([AUTO_BACKUP_SETTINGS_KEY]))[AUTO_BACKUP_SETTINGS_KEY];
    if (settings?.notifications) {
      // Note: Notifications require "notifications" permission in manifest
      console.log(`✅ Auto-backup complete: ${conversations.length} conversations saved`);
    }
    
  } catch (error) {
    console.error('❌ Auto-backup error:', error);
  }
}

// Function to inject into duck.ai page for extraction
function extractConversationsForAutoBackup() {
  try {
    const savedChatsRaw = localStorage.getItem("savedAIChats");
    
    if (!savedChatsRaw) {
      return { error: true, message: "No savedAIChats in localStorage" };
    }
    
    const savedChats = JSON.parse(savedChatsRaw);
    
    if (!savedChats.chats || savedChats.chats.length === 0) {
      return { error: true, message: "No chats found" };
    }
    
    // Generate content hash for deduplication
    function generateContentHash(title, content) {
      const combined = `${title}${content}`.replace(/\s+/g, " ").trim();
      let hash = 0;
      for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(36).substring(0, 16);
    }
    
    // Format messages
    function formatMessages(messages) {
      if (!messages || !Array.isArray(messages)) return "";
      
      return messages.map((msg) => {
        const role = msg.role === "user" ? "**You:**" : "**Assistant:**";
        let content = "";
        
        if (typeof msg.content === "string") {
          content = msg.content;
        } else if (msg.content && typeof msg.content === "object") {
          content = msg.content.text || JSON.stringify(msg.content);
        }
        
        if (msg.parts && Array.isArray(msg.parts)) {
          const textParts = msg.parts
            .filter((p) => p.type === "text" && p.text)
            .map((p) => String(p.text));
          if (textParts.length > 0) {
            content = textParts.join("\n\n");
          }
        }
        
        if (!content || (typeof content === "string" && !content.trim())) return null;
        
        const timestamp = msg.createdAt
          ? `\n*${new Date(msg.createdAt).toLocaleString()}*`
          : "";
        return `${role}${timestamp}\n\n${content}`;
      }).filter(Boolean).join("\n\n---\n\n");
    }
    
    const results = [];
    
    for (let i = 0; i < savedChats.chats.length; i++) {
      const chat = savedChats.chats[i];
      const title = chat.title || "Untitled Conversation";
      const messages = chat.messages || [];
      const content = formatMessages(messages);
      const contentHash = generateContentHash(title, content);
      
      results.push({
        title: title,
        content: content,
        contentHash: contentHash,
        model: chat.model || "unknown",
        messageCount: messages.length,
        firstMessageDate: messages[0]?.createdAt || new Date().toISOString(),
        lastMessageDate: messages[messages.length - 1]?.createdAt || new Date().toISOString(),
        extractedAt: new Date().toISOString()
      });
    }
    
    return results;
    
  } catch (error) {
    return { error: true, message: error.message };
  }
}

// Store auto-backup data with versioning
async function storeAutoBackup(conversations) {
  const settings = (await browser.storage.local.get([AUTO_BACKUP_SETTINGS_KEY]))[AUTO_BACKUP_SETTINGS_KEY] || DEFAULT_AUTO_BACKUP_SETTINGS;
  const existingData = (await browser.storage.local.get([AUTO_BACKUP_DATA_KEY]))[AUTO_BACKUP_DATA_KEY] || {};
  
  const timestamp = new Date().toISOString();
  let newCount = 0;
  let updatedCount = 0;
  
  for (const conv of conversations) {
    const key = conv.contentHash; // Use content hash as unique identifier
    
    if (!existingData[key]) {
      // New conversation
      existingData[key] = {
        currentTitle: conv.title,
        versions: []
      };
      newCount++;
    }
    
    const entry = existingData[key];
    
    // Check if content actually changed (compare with latest version)
    const latestVersion = entry.versions[entry.versions.length - 1];
    if (latestVersion && latestVersion.contentHash === conv.contentHash && latestVersion.messageCount === conv.messageCount) {
      // No changes, just update the title if renamed
      if (entry.currentTitle !== conv.title) {
        entry.titleHistory = entry.titleHistory || [];
        entry.titleHistory.push({ title: entry.currentTitle, changedAt: timestamp });
        entry.currentTitle = conv.title;
      }
      continue;
    }
    
    // Add new version
    entry.versions.push({
      title: conv.title,
      content: conv.content,
      contentHash: conv.contentHash,
      model: conv.model,
      messageCount: conv.messageCount,
      firstMessageDate: conv.firstMessageDate,
      lastMessageDate: conv.lastMessageDate,
      backupTimestamp: timestamp
    });
    
    // Update current title
    entry.currentTitle = conv.title;
    
    // Trim old versions if exceeding max
    while (entry.versions.length > settings.maxVersionsPerChat) {
      entry.versions.shift();
    }
    
    updatedCount++;
  }
  
  // Save updated data
  await browser.storage.local.set({ [AUTO_BACKUP_DATA_KEY]: existingData });
  
  console.log(`💾 Auto-backup stored: ${newCount} new, ${updatedCount} updated, ${Object.keys(existingData).length} total conversations`);
}

// Handle messages from popup or content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', message);

  // Handle different message types
  switch(message.type) {
    case 'backup_status':
      sendResponse({success: true});
      break;
      
    case 'get_auto_backup_settings':
      browser.storage.local.get([AUTO_BACKUP_SETTINGS_KEY]).then(result => {
        sendResponse(result[AUTO_BACKUP_SETTINGS_KEY] || DEFAULT_AUTO_BACKUP_SETTINGS);
      });
      return true; // Keep channel open for async response
      
    case 'set_auto_backup_settings':
      browser.storage.local.set({ [AUTO_BACKUP_SETTINGS_KEY]: message.settings }).then(async () => {
        await setupAutoBackupAlarm();
        sendResponse({ success: true });
      });
      return true;
      
    case 'get_auto_backup_data':
      browser.storage.local.get([AUTO_BACKUP_DATA_KEY]).then(result => {
        sendResponse(result[AUTO_BACKUP_DATA_KEY] || {});
      });
      return true;
      
    case 'trigger_auto_backup':
      performAutoBackup().then(() => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'clear_auto_backup_data':
      browser.storage.local.set({ [AUTO_BACKUP_DATA_KEY]: {} }).then(() => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'set_auto_backup_data_direct':
      // Direct set for import feature
      browser.storage.local.set({ [AUTO_BACKUP_DATA_KEY]: message.data }).then(() => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'store_captured_chat':
      // Store a chat captured by click-detection from chat-capture.js
      storeCapturedChat(message.payload).then(() => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'get_captured_chats':
      browser.storage.local.get(['capturedChats']).then(result => {
        sendResponse(result.capturedChats || {});
      });
      return true;
      
    case 'clear_captured_chats':
      browser.storage.local.set({ capturedChats: {} }).then(() => {
        console.log('🔍 Cleared all captured chats');
        sendResponse({ success: true });
      });
      return true;
      
    default:
      sendResponse({success: true});
  }
});
