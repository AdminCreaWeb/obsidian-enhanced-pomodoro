// Service worker for DuckDuckGo AI Backup Extension
// This runs in the background and handles extension lifecycle events

chrome.runtime.onInstalled.addListener(() => {
  console.log('DuckDuckGo AI Backup extension installed');
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('DuckDuckGo AI Backup extension started');
});

// Optional: Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  // Handle different message types if needed
  switch(message.type) {
    case 'backup_status':
      // Handle backup status updates
      sendResponse({success: true});
      break;
    default:
      sendResponse({success: true});
  }
});
