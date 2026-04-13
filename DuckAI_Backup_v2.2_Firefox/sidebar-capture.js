/**
 * Sidebar Capture Script
 * Injected into duck.ai pages to run auto-capture with floating UI
 * This runs entirely in the page context, surviving popup close
 */

(function() {
  'use strict';
  
  // Find sidebar conversation elements
  function findConversationElements() {
    const allDivsWithTitle = Array.from(document.querySelectorAll("div[title]"));
    const uiKeywords = ["button", "menu", "settings", "close", "open", "hide", "show", "expand", "collapse", "toggle", "click"];
    
    const conversationElements = allDivsWithTitle.filter((el) => {
      let title = el.title || "";
      if (title.length < 3) return false;
      if (uiKeywords.some((keyword) => title.toLowerCase() === keyword)) return false;
      const role = el.getAttribute("role");
      if (role === "button" || role === "link") return false;
      if (title.includes('\n')) title = title.split('\n')[0].trim();
      if (title.trim().length < 3) return false;
      return true;
    });
    
    return conversationElements.map((el, i) => {
      let title = el.title || '';
      if (title.includes('\n')) title = title.split('\n')[0].trim();
      return { element: el, index: i, title: title.trim() };
    });
  }
  
  // Extract content from current chat
  function extractChatContent(expectedTitle) {
    const sections = document.querySelectorAll('section');
    let chatSection = null;
    for (const s of sections) {
      if (!s.dataset?.testid) {
        chatSection = s;
        break;
      }
    }
    
    if (!chatSection) {
      chatSection = document.querySelector('main');
    }
    
    if (!chatSection) return { success: false, reason: 'no section' };
    
    let content = chatSection.innerText?.trim() || '';
    if (content.length < 20) return { success: false, reason: 'too short', len: content.length };
    
    // Clean privacy notices
    content = content
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
    
    if (content.length < 20) return { success: false, reason: 'too short after clean', len: content.length };
    
    // Skip image-only chats
    if (content.length < 100 && /image prompt|must comply/i.test(content)) {
      return { success: false, reason: 'image only', len: content.length };
    }
    
    // Count messages
    const lines = content.split('\n');
    let msgCount = 1;
    const modelRe = /^(GPT-\d|Claude|gpt-oss|o\d+-mini|Llama|Mixtral)/i;
    for (const line of lines) {
      if (modelRe.test(line.trim())) msgCount++;
    }
    
    // Detect model
    let model = 'unknown';
    for (const line of lines) {
      const m = line.trim().match(/^(GPT-\d[\w-]*|Claude[\w -]*|gpt-oss[\w -]*|o\d+-mini[\w-]*|Llama[\w -]*|Mixtral[\w -]*)/i);
      if (m) { model = m[1].trim(); break; }
    }
    
    return {
      success: true,
      title: expectedTitle,
      content: content,
      messageCount: msgCount,
      model: model,
      capturedAt: new Date().toISOString(),
      contentLength: content.length
    };
  }
  
  // Store captured chat via background script
  const capturedTitles = new Set();
  
  async function storeCapturedChat(chatData) {
    if (!chatData || !chatData.title) return false;
    
    // Dedup: skip if already captured in this session
    const dedupKey = chatData.title.substring(0, 50).toLowerCase();
    if (capturedTitles.has(dedupKey)) {
      console.log(`Skipping duplicate: "${chatData.title.substring(0, 30)}..."`);
      return false;
    }
    capturedTitles.add(dedupKey);
    
    try {
      await browser.runtime.sendMessage({
        type: 'store_captured_chat',
        payload: chatData
      });
      return true;
    } catch (e) {
      console.log('Failed to store capture:', e);
      return false;
    }
  }
  
  // Update UI elements
  function updateUI(status, detail, progress = null) {
    const statusEl = document.getElementById('capture-status');
    const detailEl = document.getElementById('capture-detail');
    const progressBar = document.getElementById('capture-progress-bar');
    
    if (statusEl) statusEl.textContent = status;
    if (detailEl) detailEl.textContent = detail;
    if (progressBar && progress !== null) {
      progressBar.style.width = `${progress}%`;
    }
  }
  
  // Main capture function — supports resume from a given index
  async function runAutoCapture(startIndex = 0) {
    const captureUI = document.getElementById('duckai-capture-ui');
    if (!captureUI) return;
    
    captureUI.dataset.started = 'true';
    clearTimeout(parseInt(captureUI.dataset.autoCloseTimeout || '0'));
    
    updateUI('Finding sidebar chats...', '');
    
    const conversationElements = findConversationElements();
    const total = conversationElements.length;
    
    if (total === 0) {
      updateUI('No sidebar chats found', 'Try refreshing the page');
      document.getElementById('capture-cancel').style.display = 'none';
      document.getElementById('capture-close').style.display = 'inline-block';
      document.getElementById('capture-continue').style.display = 'none';
      return;
    }
    
    const alreadyCaptured = startIndex; // chats already done before resume
    updateUI(`Found ${total} chats`, startIndex > 0 ? `Resuming from #${startIndex + 1}...` : 'Starting capture...');
    
    let capturedCount = 0;
    let cancelled = false;
    let stopIndex = total; // will be set on cancel
    
    // Cancel button handler — pauses instead of stopping
    document.getElementById('capture-cancel').onclick = () => {
      cancelled = true;
    };
    
    // Close button handler
    document.getElementById('capture-close').onclick = () => {
      captureUI.remove();
    };
    
    // Continue button handler — resumes from where it stopped
    document.getElementById('capture-continue').onclick = () => {
      document.getElementById('capture-continue').style.display = 'none';
      document.getElementById('capture-close').style.display = 'none';
      document.getElementById('capture-cancel').style.display = 'inline-block';
      runAutoCapture(stopIndex);
    };
    
    // Capture loop
    for (let i = startIndex; i < total; i++) {
      if (cancelled) {
        stopIndex = i; // remember where we stopped
        break;
      }
      
      const chat = conversationElements[i];
      const progress = Math.round(((i + 1) / total) * 100);
      
      updateUI(
        `Capturing ${i + 1}/${total} chats`,
        `"${chat.title.substring(0, 40)}..."`,
        progress
      );
      
      // Click the sidebar element
      chat.element.click();
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Extract content
      const result = extractChatContent(chat.title);
      
      if (result.success) {
        const stored = await storeCapturedChat(result);
        if (stored) {
          capturedCount++;
          console.log(`Stored: "${chat.title.substring(0, 30)}..." (${result.contentLength} chars)`);
        }
      } else {
        console.log(`Skipped "${chat.title.substring(0, 30)}..." - ${result.reason}`);
      }
    }
    
    // Final UI update
    if (cancelled) {
      const totalCaptured = alreadyCaptured + capturedCount;
      updateUI('Paused', `Captured ${totalCaptured}/${total} chats — ${total - stopIndex} remaining`, Math.round((stopIndex / total) * 100));
      document.getElementById('capture-cancel').style.display = 'none';
      document.getElementById('capture-continue').style.display = 'inline-block';
      document.getElementById('capture-close').style.display = 'inline-block';
    } else {
      const totalCaptured = alreadyCaptured + capturedCount;
      
      // Full refresh: remove stale entries no longer in sidebar
      if (startIndex === 0) {
        try {
          const sidebarTitles = new Set(conversationElements.map(c => c.title.substring(0, 50).toLowerCase()));
          const result = await browser.storage.local.get(['capturedChats']);
          const captured = result.capturedChats || {};
          let removed = 0;
          for (const [key, entry] of Object.entries(captured)) {
            const entryTitle = (entry.title || '').substring(0, 50).toLowerCase();
            if (!sidebarTitles.has(entryTitle)) {
              delete captured[key];
              removed++;
            }
          }
          if (removed > 0) {
            await browser.storage.local.set({ capturedChats: captured });
            console.log(`Cleaned ${removed} stale captured chats`);
          }
        } catch (e) {
          console.log('Failed to clean stale entries:', e);
        }
      }
      
      updateUI('Done!', `Captured ${totalCaptured}/${total} chats successfully`, 100);
      document.getElementById('capture-cancel').style.display = 'none';
      document.getElementById('capture-close').style.display = 'inline-block';
      document.getElementById('capture-continue').style.display = 'none';
    }
    
    // Clear cache so popup shows updated icons
    try {
      await browser.storage.local.remove(['conversationCache', 'conversationCache_timestamp']);
    } catch (e) {
      console.log('Failed to clear cache:', e);
    }
  }
  
  // Auto-start if UI exists
  setTimeout(() => {
    const captureUI = document.getElementById('duckai-capture-ui');
    if (captureUI && !captureUI.dataset.started) {
      runAutoCapture();
    }
  }, 100);
  
})();
