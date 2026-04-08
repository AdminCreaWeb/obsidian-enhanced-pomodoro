// Auto-Backup UI Handler (v2.2.0)
// Handles all auto-backup related UI interactions

console.log("📦 autobackup.js loaded");

function initAutoBackupUI() {
  console.log("📦 initAutoBackupUI() called");
  
  const autoBackupEnabled = document.getElementById("autoBackupEnabled");
  const autoBackupOptions = document.getElementById("autoBackupOptions");
  const autoBackupStatus = document.getElementById("autoBackupStatus");
  const autoBackupInterval = document.getElementById("autoBackupInterval");
  const autoBackupVersions = document.getElementById("autoBackupVersions");
  const triggerAutoBackupBtn = document.getElementById("triggerAutoBackup");
  const viewAutoBackupsBtn = document.getElementById("viewAutoBackups");
  const clearAutoBackupsBtn = document.getElementById("clearAutoBackups");
  const autoBackupModal = document.getElementById("autoBackupModal");
  const autoBackupList = document.getElementById("autoBackupList");
  const autoBackupSearch = document.getElementById("autoBackupSearch");
  const closeAutoBackupModalBtn = document.getElementById("closeAutoBackupModal");
  const exportAllAutoBackupsBtn = document.getElementById("exportAllAutoBackups");
  
  // Get statusEl from popup.js or create fallback
  const statusEl = document.getElementById("status") || { textContent: '' };

  if (!autoBackupEnabled) {
    console.log("📦 Auto-backup UI elements not found - autoBackupEnabled missing");
    return;
  }
  
  console.log("📦 Auto-backup UI elements found, setting up handlers...");

  // Helper function to get download folder (mirrors popup.js)
  async function getDownloadFolder() {
    try {
      const result = await browser.storage.local.get('downloadFolder');
      return result.downloadFolder || 'DuckAI_Backups';
    } catch (e) {
      return 'DuckAI_Backups';
    }
  }

  // Load settings on init
  loadAutoBackupSettings();

  async function loadAutoBackupSettings() {
    try {
      const settings = await browser.runtime.sendMessage({ type: 'get_auto_backup_settings' });
      if (settings) {
        autoBackupEnabled.checked = settings.enabled;
        autoBackupInterval.value = settings.intervalMinutes.toString();
        autoBackupVersions.value = settings.maxVersionsPerChat.toString();
        autoBackupOptions.style.display = settings.enabled ? 'block' : 'none';
        autoBackupStatus.textContent = settings.enabled ? `Every ${settings.intervalMinutes}min` : 'Disabled';
        autoBackupStatus.style.color = settings.enabled ? '#28a745' : '#666';
      }
    } catch (error) {
      console.error('Error loading auto-backup settings:', error);
    }
  }

  // Toggle auto-backup
  autoBackupEnabled.addEventListener("change", async () => {
    const enabled = autoBackupEnabled.checked;
    autoBackupOptions.style.display = enabled ? 'block' : 'none';
    
    const settings = {
      enabled: enabled,
      intervalMinutes: parseInt(autoBackupInterval.value),
      maxVersionsPerChat: parseInt(autoBackupVersions.value),
      notifications: true
    };
    
    await browser.runtime.sendMessage({ type: 'set_auto_backup_settings', settings });
    autoBackupStatus.textContent = enabled ? `Every ${settings.intervalMinutes}min` : 'Disabled';
    autoBackupStatus.style.color = enabled ? '#28a745' : '#666';
    statusEl.textContent = enabled ? '⏰ Auto-backup enabled!' : '⏰ Auto-backup disabled';
    setTimeout(() => { statusEl.textContent = ''; }, 2000);
  });

  // Update interval
  autoBackupInterval.addEventListener("change", async () => {
    const settings = {
      enabled: autoBackupEnabled.checked,
      intervalMinutes: parseInt(autoBackupInterval.value),
      maxVersionsPerChat: parseInt(autoBackupVersions.value),
      notifications: true
    };
    await browser.runtime.sendMessage({ type: 'set_auto_backup_settings', settings });
    autoBackupStatus.textContent = `Every ${settings.intervalMinutes}min`;
  });

  // Update versions
  autoBackupVersions.addEventListener("change", async () => {
    const settings = {
      enabled: autoBackupEnabled.checked,
      intervalMinutes: parseInt(autoBackupInterval.value),
      maxVersionsPerChat: parseInt(autoBackupVersions.value),
      notifications: true
    };
    await browser.runtime.sendMessage({ type: 'set_auto_backup_settings', settings });
  });

  // Trigger manual backup
  triggerAutoBackupBtn.addEventListener("click", async () => {
    triggerAutoBackupBtn.disabled = true;
    triggerAutoBackupBtn.textContent = '⏳...';
    statusEl.textContent = '⏰ Running auto-backup...';
    
    try {
      await browser.runtime.sendMessage({ type: 'trigger_auto_backup' });
      statusEl.textContent = '✅ Auto-backup complete!';
    } catch (error) {
      statusEl.textContent = '❌ Auto-backup failed';
    }
    
    triggerAutoBackupBtn.disabled = false;
    triggerAutoBackupBtn.textContent = '▶️ Backup Now';
    setTimeout(() => { statusEl.textContent = ''; }, 3000);
  });

  // View backups modal
  viewAutoBackupsBtn.addEventListener("click", async () => {
    await renderAutoBackupList();
    autoBackupModal.style.display = 'block';
  });

  // Also handle the always-visible view button
  const viewAutoBackupsAlways = document.getElementById("viewAutoBackupsAlways");
  if (viewAutoBackupsAlways) {
    viewAutoBackupsAlways.addEventListener("click", async () => {
      await renderAutoBackupList();
      autoBackupModal.style.display = 'block';
    });
  }

  // Close modal
  closeAutoBackupModalBtn.addEventListener("click", () => {
    autoBackupModal.style.display = 'none';
  });

  autoBackupModal.addEventListener("click", (e) => {
    if (e.target === autoBackupModal) {
      autoBackupModal.style.display = 'none';
    }
  });

  // Search
  autoBackupSearch.addEventListener("input", () => {
    renderAutoBackupList(autoBackupSearch.value.toLowerCase());
  });

  // Clear all
  clearAutoBackupsBtn.addEventListener("click", async () => {
    if (confirm('Clear all auto-backup data?')) {
      await browser.runtime.sendMessage({ type: 'clear_auto_backup_data' });
      statusEl.textContent = '🗑️ Auto-backup data cleared';
      setTimeout(() => { statusEl.textContent = ''; }, 2000);
    }
  });

  // Render backup list
  async function renderAutoBackupList(searchFilter = '') {
    const data = await browser.runtime.sendMessage({ type: 'get_auto_backup_data' });
    
    if (!data || Object.keys(data).length === 0) {
      autoBackupList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No auto-backups yet. Enable auto-backup and visit duck.ai.</div>';
      return;
    }
    
    let html = '';
    const entries = Object.entries(data);
    
    entries.sort((a, b) => {
      const aLatest = a[1].versions[a[1].versions.length - 1]?.backupTimestamp || '';
      const bLatest = b[1].versions[b[1].versions.length - 1]?.backupTimestamp || '';
      return bLatest.localeCompare(aLatest);
    });
    
    let visibleCount = 0;
    
    for (const [hash, entry] of entries) {
      const title = entry.currentTitle || 'Untitled';
      if (searchFilter && !title.toLowerCase().includes(searchFilter)) continue;
      
      visibleCount++;
      const versions = entry.versions || [];
      const latestVersion = versions[versions.length - 1];
      const latestDate = latestVersion ? new Date(latestVersion.backupTimestamp).toLocaleString() : 'Unknown';
      const wasRenamed = (entry.titleHistory || []).length > 0;
      
      html += `
        <div style="border: 1px solid #e0e0e0; border-radius: 6px; padding: 10px; margin-bottom: 8px; background: #fafafa;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <strong style="color: #333; flex: 1;">${escapeHtml(title.substring(0, 50))}${title.length > 50 ? '...' : ''}</strong>
            ${wasRenamed ? '<span style="font-size: 0.7em; color: #ff9800;">🔄</span>' : ''}
            <span style="font-size: 0.75em; color: #666; margin-left: 8px;">${versions.length}v</span>
          </div>
          <div style="font-size: 0.75em; color: #666; margin-bottom: 6px;">📅 ${latestDate}</div>
          <button data-hash="${hash}" class="export-latest-btn" style="width: 100%; font-size: 0.75em; padding: 4px 8px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">📥 Export</button>
        </div>
      `;
    }
    
    if (visibleCount === 0) {
      html = '<div style="text-align: center; color: #666; padding: 20px;">No matches.</div>';
    } else {
      html = `<div style="font-size: 0.8em; color: #666; margin-bottom: 10px;">📦 ${visibleCount} conversations</div>` + html;
    }
    
    autoBackupList.innerHTML = html;
    
    // Add export handlers
    document.querySelectorAll('.export-latest-btn').forEach(btn => {
      btn.addEventListener('click', () => exportAutoBackup(btn.dataset.hash));
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function exportAutoBackup(hash) {
    const data = await browser.runtime.sendMessage({ type: 'get_auto_backup_data' });
    const entry = data[hash];
    if (!entry || !entry.versions.length) return;
    
    const version = entry.versions[entry.versions.length - 1];
    const folder = await getDownloadFolder();
    const date = new Date().toISOString().split('T')[0];
    const cleanTitle = (version.title || 'untitled').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').substring(0, 50);
    const filename = `${folder}/duckai_autobackup_${date}_${cleanTitle}.md`;
    
    const obsidianEnabled = document.getElementById('obsidianFrontmatter')?.checked;
    let content = '';
    
    if (obsidianEnabled) {
      content = `---
tags:
  - duckduckgo
  - ai-conversation
  - auto-backup
date: ${date}
created: ${version.backupTimestamp}
source: DuckDuckGo AI Chat (Auto-Backup)
model: ${version.model || 'unknown'}
---

`;
    }
    
    content += `# ${version.title}\n\n*Auto-backup: ${new Date(version.backupTimestamp).toLocaleString()}*\n\n---\n\n${version.content}`;
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    try {
      await browser.downloads.download({ url: url, filename: filename, saveAs: false });
      statusEl.textContent = `✅ Exported: ${cleanTitle}`;
    } catch (error) {
      statusEl.textContent = `❌ Export failed`;
    }
    
    URL.revokeObjectURL(url);
    setTimeout(() => { statusEl.textContent = ''; }, 3000);
  }

  // Import old backup file
  const importBackupFile = document.getElementById("importBackupFile");
  const importBackupBtn = document.getElementById("importBackupBtn");
  const importResultBox = document.getElementById("importResultBox");
  const importProgressFill = document.getElementById("importProgressFill");
  const importResultText = document.getElementById("importResultText");
  
  // Helper to show import progress
  function showImportProgress(percent, message, isError = false) {
    if (importResultBox) {
      importResultBox.style.display = 'block';
      importResultBox.style.borderColor = isError ? '#f44336' : '#ddd';
      importResultBox.style.background = isError ? '#ffebee' : '#f5f5f5';
    }
    if (importProgressFill) {
      importProgressFill.style.width = percent + '%';
      importProgressFill.style.background = isError ? '#f44336' : '#4caf50';
    }
    if (importResultText) {
      importResultText.innerHTML = message;
    }
  }
  
  // Button click triggers file input
  if (importBackupBtn && importBackupFile) {
    importBackupBtn.addEventListener("click", () => {
      importBackupFile.click();
    });
  }
  
  if (importBackupFile) {
    importBackupFile.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // Show progress
      showImportProgress(10, `📂 <b>Reading:</b> ${file.name}<br>📊 Size: ${(file.size / 1024).toFixed(1)} KB`);
      
      try {
        // Read file
        const content = await file.text();
        showImportProgress(30, `📂 <b>File:</b> ${file.name}<br>📊 Size: ${(file.size / 1024).toFixed(1)} KB<br>📝 Characters: ${content.length.toLocaleString()}`);
        
        // Parse
        showImportProgress(50, `📂 <b>File:</b> ${file.name}<br>⏳ Parsing content...`);
        const parsed = parseImportedBackup(content, file.name);
        
        if (!parsed) {
          showImportProgress(100, `❌ <b>Parse failed</b><br>Could not extract title from file.<br><br><b>First 100 chars:</b><br><code style="font-size:0.85em;background:#fff;padding:2px 4px;border-radius:2px;">${content.substring(0, 100).replace(/</g, '&lt;')}...</code>`, true);
          importBackupFile.value = '';
          return;
        }
        
        // Show parsed info
        showImportProgress(70, `📂 <b>File:</b> ${file.name}<br>📝 <b>Title:</b> ${parsed.title.substring(0, 50)}...<br>🤖 <b>Model:</b> ${parsed.model}<br>📅 <b>Date:</b> ${parsed.timestamp.split('T')[0]}<br>⏳ Storing...`);
        
        // Store
        const storeResult = await storeImportedBackup(parsed);
        
        // Success
        const preview = parsed.content.substring(0, 150).replace(/</g, '&lt;').replace(/\n/g, ' ');
        showImportProgress(100, `✅ <b>Import successful!</b><br><br>📝 <b>Title:</b> ${parsed.title.substring(0, 60)}${parsed.title.length > 60 ? '...' : ''}<br>🤖 <b>Model:</b> ${parsed.model}<br>📅 <b>Date:</b> ${parsed.timestamp.split('T')[0]}<br>📊 <b>Size:</b> ${(content.length / 1024).toFixed(1)} KB<br>📦 <b>Total backups:</b> ${storeResult.entryCount}<br><br><b>Preview:</b><br><code style="font-size:0.8em;background:#e8f5e9;padding:4px;border-radius:2px;display:block;max-height:60px;overflow:hidden;">${preview}...</code>`);
        
        statusEl.textContent = `✅ Imported: "${parsed.title.substring(0, 30)}..."`;
        
        // Refresh the backup list if modal is open
        if (autoBackupModal.style.display === 'block') {
          await renderAutoBackupList();
        }
        
        // Hide after 10 seconds
        setTimeout(() => {
          if (importResultBox) importResultBox.style.display = 'none';
        }, 10000);
        
      } catch (error) {
        showImportProgress(100, `❌ <b>Import failed</b><br>${error.message}`, true);
        statusEl.textContent = '❌ Import failed: ' + error.message;
      }
      
      // Reset file input
      importBackupFile.value = '';
      setTimeout(() => { statusEl.textContent = ''; }, 5000);
    });
  }

  // Parse imported backup file (Duck.ai txt/md format)
  function parseImportedBackup(content, filename) {
    let title = '';
    let model = 'unknown';
    let timestamp = new Date().toISOString();
    
    const lines = content.split('\n');
    
    // ===== DUCK.AI NATIVE FORMAT DETECTION =====
    // Format: "This conversation was generated with Duck.ai ... using MODEL"
    const duckaiHeaderMatch = content.match(/This conversation was generated with Duck\.ai.*?using\s+(?:OpenAI's\s+)?(\S+(?:\s+\d+B)?)\s+Model/i);
    if (duckaiHeaderMatch) {
      model = duckaiHeaderMatch[1]; // e.g., "gpt-oss 120B"
      
      // Extract first user prompt as title (Duck.ai format)
      const userPromptMatch = content.match(/User prompt \d+ of \d+[^:]*:\s*\n(.+?)(?:\n\n|\n[a-zA-Z])/s);
      if (userPromptMatch) {
        // Get first line of user's message as title
        const firstUserLine = userPromptMatch[1].split('\n')[0].trim();
        if (firstUserLine.length > 10 && firstUserLine.length < 150) {
          title = firstUserLine;
        }
      }
      
      // Extract date from user prompt timestamp
      const promptDateMatch = content.match(/User prompt \d+ of \d+ - (\d{2}\/\d{2}\/\d{4})/);
      if (promptDateMatch) {
        try {
          const [day, month, year] = promptDateMatch[1].split('/');
          timestamp = new Date(`${year}-${month}-${day}`).toISOString();
        } catch (e) { /* keep default */ }
      }
    }
    
    // ===== MARKDOWN FORMAT =====
    if (!title) {
      const headerMatch = content.match(/^#\s+(.+)$/m);
      if (headerMatch) {
        title = headerMatch[1].trim();
      }
    }
    
    // ===== OTHER FORMATS =====
    if (!title) {
      const convMatch = content.match(/^(?:Conversation|Title|Chat):\s*(.+)$/mi);
      if (convMatch) {
        title = convMatch[1].trim();
      }
    }
    
    // Check for date in various formats
    if (timestamp === new Date().toISOString()) {
      const dateMatch = content.match(/(?:Exported|Date|Created):\s*(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/i);
      if (dateMatch) {
        try {
          timestamp = new Date(dateMatch[1]).toISOString();
        } catch (e) { /* keep default */ }
      }
    }
    
    // Check for model in other formats
    if (model === 'unknown') {
      const modelMatch = content.match(/(?:Model|AI):\s*(Claude[^\n]*|GPT[^\n]*|Llama[^\n]*|Mixtral[^\n]*|gpt-[^\s]+)/i);
      if (modelMatch) {
        model = modelMatch[1].trim();
      }
    }
    
    // ===== FALLBACK: USE FILENAME =====
    if (!title) {
      // Parse filename: Beautiful_text_on_websites_duck.ai_2026-04-04_11-24-28.txt
      let cleanName = filename.replace(/\.(txt|md|markdown)$/i, '');
      
      // Extract date from filename if present
      const filenameDateMatch = cleanName.match(/(\d{4}-\d{2}-\d{2})/);
      if (filenameDateMatch && timestamp === new Date().toISOString()) {
        try {
          timestamp = new Date(filenameDateMatch[1]).toISOString();
        } catch (e) { /* keep default */ }
      }
      
      // Remove date and time patterns from filename for cleaner title
      cleanName = cleanName
        .replace(/_duck\.ai_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/i, '')
        .replace(/_\d{4}-\d{2}-\d{2}.*$/, '')
        .replace(/[_-]/g, ' ')
        .trim();
      
      if (cleanName.length > 5) {
        title = cleanName;
      }
    }
    
    // Final fallback: first meaningful line
    if (!title) {
      const firstLine = lines.find(l => {
        const trimmed = l.trim();
        return trimmed.length > 10 && 
               !trimmed.startsWith('This conversation') &&
               !trimmed.startsWith('==') &&
               !trimmed.startsWith('http');
      });
      if (firstLine && firstLine.length < 150) {
        title = firstLine.replace(/^[#*\->\s]+/, '').trim();
      }
    }
    
    // Clean up title
    title = title.substring(0, 100).trim();
    
    if (!title || content.length < 50) {
      return null;
    }
    
    return {
      title: title,
      content: content,
      model: model,
      timestamp: timestamp,
      source: 'imported',
      filename: filename
    };
  }

  // Store imported backup in auto-backup data
  async function storeImportedBackup(parsed) {
    // Generate content hash
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
    
    const contentHash = generateContentHash(parsed.title, parsed.content);
    
    // Get existing data (ensure it's an object)
    let data;
    try {
      data = await browser.runtime.sendMessage({ type: 'get_auto_backup_data' });
    } catch (e) {
      data = {};
    }
    if (!data || typeof data !== 'object') {
      data = {};
    }
    
    // Check if this content already exists
    if (data[contentHash]) {
      const existing = data[contentHash];
      const latestVersion = existing.versions && existing.versions[existing.versions.length - 1];
      
      if (latestVersion && latestVersion.content === parsed.content) {
        throw new Error('This backup already exists (duplicate content)');
      }
    }
    
    // Create or update entry
    if (!data[contentHash]) {
      data[contentHash] = {
        currentTitle: parsed.title,
        versions: [],
        importedFrom: parsed.filename
      };
    }
    
    // Ensure versions array exists
    if (!data[contentHash].versions) {
      data[contentHash].versions = [];
    }
    
    // Add version
    data[contentHash].versions.push({
      title: parsed.title,
      content: parsed.content,
      contentHash: contentHash,
      model: parsed.model,
      messageCount: (parsed.content.match(/(?:User prompt|You:|Assistant:|\*\*You\*\*|\*\*Assistant\*\*)/gi) || []).length || 1,
      firstMessageDate: parsed.timestamp,
      lastMessageDate: parsed.timestamp,
      backupTimestamp: new Date().toISOString(),
      source: 'imported'
    });
    
    // Update current title
    data[contentHash].currentTitle = parsed.title;
    
    // Save and verify
    const saveResult = await browser.runtime.sendMessage({ 
      type: 'set_auto_backup_data_direct', 
      data: data 
    });
    
    if (!saveResult || !saveResult.success) {
      throw new Error('Failed to save to storage');
    }
    
    // Verify it was saved
    const verifyData = await browser.runtime.sendMessage({ type: 'get_auto_backup_data' });
    if (!verifyData || !verifyData[contentHash]) {
      throw new Error('Verification failed - data not found after save');
    }
    
    return { hash: contentHash, entryCount: Object.keys(data).length };
  }

  // Export all
  exportAllAutoBackupsBtn.addEventListener("click", async () => {
    const data = await browser.runtime.sendMessage({ type: 'get_auto_backup_data' });
    if (!data || Object.keys(data).length === 0) {
      statusEl.textContent = '❌ No backups to export';
      return;
    }
    
    exportAllAutoBackupsBtn.disabled = true;
    exportAllAutoBackupsBtn.textContent = '⏳...';
    
    const folder = await getDownloadFolder();
    const date = new Date().toISOString().split('T')[0];
    const obsidianEnabled = document.getElementById('obsidianFrontmatter')?.checked;
    let exported = 0;
    
    for (const [hash, entry] of Object.entries(data)) {
      const version = entry.versions[entry.versions.length - 1];
      if (!version) continue;
      
      const cleanTitle = (version.title || 'untitled').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').substring(0, 40);
      const filename = `${folder}/duckai_autobackup_${date}_${String(++exported).padStart(3, '0')}_${cleanTitle}.md`;
      
      let content = obsidianEnabled ? `---\ntags:\n  - duckduckgo\n  - auto-backup\ndate: ${date}\n---\n\n` : '';
      content += `# ${version.title}\n\n*Auto-backup: ${new Date(version.backupTimestamp).toLocaleString()}*\n\n---\n\n${version.content}`;
      
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      try {
        await browser.downloads.download({ url: url, filename: filename, saveAs: false });
      } catch (e) { /* continue */ }
      
      URL.revokeObjectURL(url);
    }
    
    exportAllAutoBackupsBtn.disabled = false;
    exportAllAutoBackupsBtn.textContent = '📥 Export All';
    statusEl.textContent = `✅ Exported ${exported} conversations`;
    setTimeout(() => { statusEl.textContent = ''; }, 3000);
  });
}
