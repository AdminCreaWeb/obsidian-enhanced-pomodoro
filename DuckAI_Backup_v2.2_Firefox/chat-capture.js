/**
 * Chat Capture Script
 * Injected into duck.ai pages to detect when a chat is opened
 * and capture its content for backup.
 * 
 * This solves the problem of "locked" chats that Duck.ai only
 * stores on the server - when you click one, the content loads
 * in the DOM and we can capture it.
 */

(function() {
  'use strict';
  
  console.log('🔍 Chat Capture script loaded on duck.ai');
  
  let lastCapturedTitle = '';
  let lastCaptureTime = 0;
  const CAPTURE_COOLDOWN = 2000; // Don't re-capture same chat within 2s (must be < auto-click wait time)
  
  // UI text patterns to filter out (not real chat content)
  const UI_PATTERNS = [
    /^drop your (photos?|image|files?)/i,
    /^all chats are private/i,
    /^ai can make mistakes/i,
    /^new chat$/i,
    /^new image$/i,
    /^anonymized by/i,
    /^zero (provider|data)/i,
    /^no ai training/i,
    /^learn more$/i,
    /^\.?\s*$/  // Just a dot or empty
  ];
  
  // Find the chat content section (the one without data-testid)
  function getChatSection() {
    return Array.from(document.querySelectorAll('section')).find(s => !s.dataset?.testid);
  }
  
  // Check if text is just UI chrome, not real chat content
  function isUIContent(text) {
    const firstLine = text.split('\n')[0].trim();
    if (firstLine.length < 3) return true;
    return UI_PATTERNS.some(pattern => pattern.test(firstLine));
  }
  
  // Extract conversation from the chat section DOM
  function extractCurrentChat() {
    const chatSection = getChatSection();
    if (!chatSection) return null;
    
    const fullText = chatSection.innerText?.trim();
    if (!fullText || fullText.length < 50) return null;
    
    // Remove the Duck.ai privacy notice from the top (multiple variations)
    let cleanText = fullText
      .replace(/^Anonymized by DuckDuckGo[^\n]*\n*/i, '')
      .replace(/^Zero (provider visibility|data retention)[^\n]*\n*/i, '')
      .replace(/^Limited data retention[^\n]*\n*/i, '')
      .replace(/^No AI training[^\n]*\n*/i, '')
      .replace(/^Learn more[^\n]*\n*/i, '')
      .replace(/^All chats are private[^\n]*\n*/i, '')
      .replace(/^AI can make mistakes[^\n]*\n*/i, '')
      .replace(/^Drop your (photos?|image|files?)[^\n]*\n*/i, '')
      .replace(/^Image prompts must comply[^\n]*\n*/i, '')
      .trim();
    
    // Skip if remaining text is too short or is UI content
    if (cleanText.length < 50) return null;
    if (isUIContent(cleanText)) return null;
    
    // Try to extract title from sidebar (the active/selected item)
    const title = extractActiveChatTitle();
    
    if (!title) {
      // If we can't find the title from sidebar, skip - it's likely not a real chat
      console.log(`🔍 No sidebar title found, skipping capture`);
      return null;
    }
    
    // Try to split into user/assistant messages
    const messages = parseMessages(cleanText);
    
    return {
      title: title,
      content: cleanText,
      messages: messages,
      messageCount: messages.length,
      capturedAt: new Date().toISOString(),
      source: 'click_capture'
    };
  }
  
  // Find the title of the currently selected chat in the sidebar
  function extractActiveChatTitle() {
    // Strategy: Find sidebar div[title] elements that are NOT buttons/links
    // and match the currently displayed chat content
    const chatSection = getChatSection();
    if (!chatSection) {
      console.log('🔍 No chat section found for title extraction');
      return null;
    }
    
    const chatText = chatSection.innerText?.toLowerCase() || '';
    const chatFirstLine = chatText.split('\n')[0].trim().substring(0, 60);
    console.log(`🔍 Looking for sidebar title matching chat starting with: "${chatFirstLine.substring(0, 40)}..."`);
    
    // Get all sidebar div[title] elements (same logic as popup's extractSidebarTitles)
    const allDivsWithTitle = Array.from(document.querySelectorAll('div[title]'));
    const uiKeywords = ["button", "menu", "settings", "close", "open", "hide", "show", "expand", "collapse", "toggle", "click"];
    
    let bestMatch = null;
    let bestMatchLen = 0;
    
    for (const el of allDivsWithTitle) {
      let title = el.title || '';
      if (title.length < 3) continue;
      if (uiKeywords.some((keyword) => title.toLowerCase() === keyword)) continue;
      
      const role = el.getAttribute("role");
      if (role === "button" || role === "link") continue;
      
      // Extract first line if title contains full content (locked chats)
      if (title.includes('\n')) {
        title = title.split('\n')[0].trim();
      }
      if (title.trim().length < 3) continue;
      title = title.trim();
      
      // Check if this title appears in the chat content
      const titleLower = title.toLowerCase();
      if (chatText.includes(titleLower) && titleLower.length > bestMatchLen) {
        bestMatch = title;
        bestMatchLen = titleLower.length;
      }
    }
    
    if (bestMatch) {
      console.log(`🔍 Found sidebar title: "${bestMatch.substring(0, 50)}..."`);
      return bestMatch;
    }
    
    // Fallback: use the first line of chat content as title
    // (better than returning null and losing the capture)
    const fallbackTitle = chatFirstLine.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    if (fallbackTitle.length >= 5) {
      console.log(`🔍 Using fallback title from chat content: "${fallbackTitle.substring(0, 50)}..."`);
      return fallbackTitle;
    }
    
    console.log('🔍 No title found for current chat');
    return null;
  }
  
  // Parse the text into user/assistant message pairs
  function parseMessages(text) {
    const messages = [];
    const lines = text.split('\n');
    
    let currentRole = 'user';
    let currentContent = [];
    
    const modelIndicators = /^(GPT-\d|Claude|gpt-oss|o\d+-mini|Llama|Mixtral)/i;
    
    for (const line of lines) {
      if (modelIndicators.test(line.trim())) {
        if (currentContent.length > 0) {
          messages.push({
            role: currentRole,
            content: currentContent.join('\n').trim()
          });
        }
        currentRole = 'assistant';
        currentContent = [];
        continue;
      }
      
      currentContent.push(line);
    }
    
    if (currentContent.length > 0) {
      messages.push({
        role: currentRole,
        content: currentContent.join('\n').trim()
      });
    }
    
    return messages.filter(m => m.content.length > 0);
  }
  
  // Send captured chat to the extension background script
  function sendCapturedChat(chatData) {
    if (!chatData) return;
    
    const now = Date.now();
    if (chatData.title === lastCapturedTitle && now - lastCaptureTime < CAPTURE_COOLDOWN) {
      console.log(`🔍 Skipping duplicate capture: "${chatData.title?.substring(0, 40)}..."`);
      return;
    }
    
    lastCapturedTitle = chatData.title;
    lastCaptureTime = now;
    
    console.log(`🔍 Captured chat: "${chatData.title?.substring(0, 50)}..." (${chatData.messageCount} messages, ${chatData.content.length} chars)`);
    
    try {
      browser.runtime.sendMessage({
        type: 'store_captured_chat',
        payload: chatData
      });
    } catch (e) {
      console.log('🔍 Could not send to extension:', e);
    }
  }
  
  // Watch for URL changes (Duck.ai uses SPA navigation)
  let currentUrl = window.location.href;
  
  function checkUrlChange() {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      console.log('🔍 URL changed, waiting for chat to load...');
      // Wait for the chat content to render
      setTimeout(() => {
        const chatData = extractCurrentChat();
        if (chatData) sendCapturedChat(chatData);
      }, 2000);
    }
  }
  
  // Also watch for DOM mutations (chat content appearing)
  const domObserver = new MutationObserver((mutations) => {
    const chatSection = getChatSection();
    if (!chatSection) return;
    
    const text = chatSection.innerText?.trim() || '';
    if (text.length < 100) return;
    
    // Debounce - capture if it's a different chat or enough time passed
    const now = Date.now();
    const chatData = extractCurrentChat();
    if (!chatData) return;
    
    // Skip if same title captured recently
    if (chatData.title === lastCapturedTitle && now - lastCaptureTime < CAPTURE_COOLDOWN) return;
    // Skip if ANY capture happened too recently (prevent double-capture of same chat)
    if (now - lastCaptureTime < 1000) return;
    
    sendCapturedChat(chatData);
  });
  
  // Start observing after page is ready
  function startObserving() {
    console.log('🔍 Starting chat capture observer...');
    
    // Watch URL changes
    setInterval(checkUrlChange, 1000);
    
    // Watch DOM changes in the main area
    const mainContent = document.querySelector('main') || document.body;
    domObserver.observe(mainContent, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    // Capture the currently visible chat on load (if it's a real chat)
    setTimeout(() => {
      const chatData = extractCurrentChat();
      if (chatData) sendCapturedChat(chatData);
    }, 2000);
  }
  
  // Initialize
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    startObserving();
  } else {
    window.addEventListener('DOMContentLoaded', startObserving);
  }
  
})();
