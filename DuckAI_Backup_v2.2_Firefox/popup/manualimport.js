// Manual Import Handler for Duck.ai Backup Extension
// Handles importing old Duck.ai export files (.txt, .md)

console.log('📦 manualimport.js loaded');

const MANUAL_IMPORTS_KEY = 'manualImports';

// Initialize manual import UI
function initManualImportUI() {
    console.log('📦 initManualImportUI() called');
    
    const importBtn = document.getElementById('manualImportBtn');
    const viewImportsBtn = document.getElementById('viewManualImportsBtn');
    const closeModalBtn = document.getElementById('closeManualImportsModal');
    
    // Import file modal elements
    const importFileModal = document.getElementById('importFileModal');
    const closeImportFileModal = document.getElementById('closeImportFileModal');
    const dropZone = document.getElementById('dropZone');
    const importFileInput = document.getElementById('importFileInput');
    const importProgressBox = document.getElementById('importProgressBox');
    const importProgressBarFill = document.getElementById('importProgressBarFill');
    const importProgressText = document.getElementById('importProgressText');
    
    console.log('📦 Elements found:', {
        importBtn: !!importBtn,
        viewImportsBtn: !!viewImportsBtn,
        closeModalBtn: !!closeModalBtn,
        importFileModal: !!importFileModal,
        dropZone: !!dropZone
    });
    
    // Show import progress in modal
    function showModalProgress(percent, message, isError = false) {
        if (importProgressBox) {
            importProgressBox.style.display = 'block';
            importProgressBox.style.borderColor = isError ? '#f44336' : '#ddd';
            importProgressBox.style.background = isError ? '#ffebee' : '#f5f5f5';
        }
        if (importProgressBarFill) {
            importProgressBarFill.style.width = percent + '%';
            importProgressBarFill.style.background = isError ? '#f44336' : '#4caf50';
        }
        if (importProgressText) {
            importProgressText.innerHTML = message;
        }
    }
    
    // Handle file import
    async function handleFileImport(file) {
        if (!file) return;
        
        console.log('� Importing:', file.name);
        showModalProgress(10, '📂 <b>Reading:</b> ' + file.name + '<br>📊 Size: ' + (file.size / 1024).toFixed(1) + ' KB');
        
        try {
            const content = await file.text();
            showModalProgress(30, '📂 <b>File:</b> ' + file.name + '<br>📝 Characters: ' + content.length.toLocaleString());
            
            showModalProgress(50, '⏳ Parsing content...');
            const parsed = parseDuckAIExport(content, file.name);
            
            if (!parsed) {
                showModalProgress(100, '❌ <b>Parse failed</b><br>Could not extract title from file.', true);
                return;
            }
            
            showModalProgress(70, '📝 <b>Title:</b> ' + parsed.title.substring(0, 50) + '...<br>🤖 <b>Model:</b> ' + parsed.model + '<br>⏳ Storing...');
            
            // Generate hash
            const combined = (parsed.title + parsed.content).replace(/\s+/g, ' ').trim();
            let hash = 0;
            for (let i = 0; i < combined.length; i++) {
                hash = (hash << 5) - hash + combined.charCodeAt(i);
                hash = hash & hash;
            }
            const contentHash = Math.abs(hash).toString(36).substring(0, 16);
            
            // Get existing imports
            const result = await browser.storage.local.get(MANUAL_IMPORTS_KEY);
            const imports = result[MANUAL_IMPORTS_KEY] || {};
            
            // Check for duplicate
            if (imports[contentHash]) {
                showModalProgress(100, '⚠️ <b>Already imported</b><br>This file was previously imported.', true);
                browser.notifications.create({
                    type: 'basic',
                    iconUrl: '../icons/icon-48.png',
                    title: 'Already Imported',
                    message: parsed.title.substring(0, 60)
                });
                return;
            }
            
            // Store import
            imports[contentHash] = {
                title: parsed.title,
                content: parsed.content,
                model: parsed.model,
                timestamp: parsed.timestamp,
                filename: parsed.filename,
                importedAt: new Date().toISOString()
            };
            
            await browser.storage.local.set({ [MANUAL_IMPORTS_KEY]: imports });
            console.log('📥 Import stored. Total:', Object.keys(imports).length);
            
            const count = Object.keys(imports).length;
            showModalProgress(100, '✅ <b>Import successful!</b><br><br>📝 <b>Title:</b> ' + parsed.title.substring(0, 60) + '<br>🤖 <b>Model:</b> ' + parsed.model + '<br>📅 <b>Date:</b> ' + parsed.timestamp.split('T')[0] + '<br>📦 <b>Total imports:</b> ' + count);
            
            browser.notifications.create({
                type: 'basic',
                iconUrl: '../icons/icon-48.png',
                title: '✅ Import Successful',
                message: parsed.title.substring(0, 60) + '\n' + count + ' total imports'
            });
            
            const statusEl = document.getElementById('status');
            if (statusEl) statusEl.textContent = '✅ Imported: "' + parsed.title.substring(0, 30) + '..."';
            
            setTimeout(() => {
                if (importProgressBox) importProgressBox.style.display = 'none';
                if (statusEl) statusEl.textContent = '';
            }, 5000);
            
        } catch (error) {
            console.error('Import error:', error);
            showModalProgress(100, '❌ <b>Import failed</b><br>' + error.message, true);
        }
    }
    
    // Open import sidebar (stays open while file picker is used)
    if (importBtn) {
        console.log('📦 Adding click listener to import button');
        importBtn.addEventListener('click', async () => {
            console.log('📦 Import button clicked - opening sidebar');
            try {
                await browser.sidebarAction.open();
            } catch (e) {
                console.log('📦 Sidebar failed, opening tab instead:', e);
                // Fallback to tab if sidebar fails
                browser.tabs.create({
                    url: browser.runtime.getURL('import.html')
                });
            }
        });
    }
    
    // Close import modal
    if (closeImportFileModal) {
        closeImportFileModal.addEventListener('click', () => {
            if (importFileModal) importFileModal.style.display = 'none';
        });
    }
    
    // Drop zone click
    if (dropZone && importFileInput) {
        dropZone.addEventListener('click', () => {
            importFileInput.click();
        });
        
        // File selection
        importFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFileImport(file);
            e.target.value = '';
        });
        
        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#667eea';
            dropZone.style.background = '#e8f0ff';
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = '#ddd';
            dropZone.style.background = '#f9f9f9';
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#ddd';
            dropZone.style.background = '#f9f9f9';
            const file = e.dataTransfer.files[0];
            if (file) handleFileImport(file);
        });
    }
    
    // View imports button
    if (viewImportsBtn) {
        console.log('📦 Adding click listener to view imports button');
        viewImportsBtn.addEventListener('click', () => {
            console.log('📦 View imports button clicked!');
            showManualImports();
        });
    }
    
    // Close imports list modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            document.getElementById('manualImportsModal').style.display = 'none';
        });
    }
}

// Show import progress
function showImportProgress(percent, message, isError = false) {
    const box = document.getElementById('importResultBox');
    const fill = document.getElementById('importProgressFill');
    const text = document.getElementById('importResultText');
    if (box) {
        box.style.display = 'block';
        box.style.borderColor = isError ? '#f44336' : '#ffe082';
        box.style.background = isError ? '#ffebee' : '#fff8e1';
    }
    if (fill) {
        fill.style.width = percent + '%';
        fill.style.background = isError ? '#f44336' : '#4caf50';
    }
    if (text) text.innerHTML = message;
}

// Parse Duck.ai export file
function parseDuckAIExport(content, filename) {
    let title = '';
    let model = 'unknown';
    let timestamp = new Date().toISOString();
    const lines = content.split('\n');
    
    // Try to extract title from "User prompt:" line
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
        const line = lines[i].trim();
        if (line.startsWith('User prompt:')) {
            title = line.replace('User prompt:', '').trim().substring(0, 100);
            break;
        }
        if (line.startsWith('# ') && !title) {
            title = line.replace(/^#\s*/, '').trim();
        }
    }
    
    // Try to get model from header
    const modelMatch = content.match(/Model:\s*(\S+)/i) || content.match(/using\s+(Claude|GPT|Llama|Mixtral)/i);
    if (modelMatch) model = modelMatch[1];
    
    // Try to get date from filename
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) timestamp = dateMatch[1] + 'T00:00:00.000Z';
    
    // Fallback: use filename as title
    if (!title) {
        title = filename.replace(/\.[^.]+$/, '').replace(/__duck\.ai.*$/, '').replace(/[_-]/g, ' ').trim();
    }
    
    if (!title || content.length < 50) return null;
    
    return { title, content, model, timestamp, filename };
}

// Handle manual import
async function handleManualImport(input) {
    const file = input.files[0];
    if (!file) return;
    
    console.log('📥 Manual import started:', file.name);
    showImportProgress(10, '📂 <b>Reading:</b> ' + file.name + '<br>📊 Size: ' + (file.size / 1024).toFixed(1) + ' KB');
    
    try {
        const content = await file.text();
        console.log('📥 File read complete, length:', content.length);
        showImportProgress(30, '📂 <b>File:</b> ' + file.name + '<br>📝 Characters: ' + content.length.toLocaleString());
        
        showImportProgress(50, '⏳ Parsing content...');
        const parsed = parseDuckAIExport(content, file.name);
        
        if (!parsed) {
            console.error('📥 Parse failed - no title extracted');
            showImportProgress(100, '❌ <b>Parse failed</b><br>Could not extract title from file.', true);
            browser.notifications.create({
                type: 'basic',
                iconUrl: '../icons/icon-48.png',
                title: 'Import Failed',
                message: 'Could not extract title from: ' + file.name
            });
            input.value = '';
            return;
        }
        
        console.log('📥 Parsed:', parsed.title);
        showImportProgress(70, '📝 <b>Title:</b> ' + parsed.title.substring(0, 50) + '...<br>🤖 <b>Model:</b> ' + parsed.model + '<br>⏳ Storing...');
        
        // Generate hash
        const combined = (parsed.title + parsed.content).replace(/\s+/g, ' ').trim();
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            hash = (hash << 5) - hash + combined.charCodeAt(i);
            hash = hash & hash;
        }
        const contentHash = Math.abs(hash).toString(36).substring(0, 16);
        
        // Get existing imports
        const result = await browser.storage.local.get(MANUAL_IMPORTS_KEY);
        const imports = result[MANUAL_IMPORTS_KEY] || {};
        
        // Check for duplicate
        if (imports[contentHash]) {
            console.log('📥 Duplicate detected:', contentHash);
            showImportProgress(100, '⚠️ <b>Already imported</b><br>This file was previously imported.', true);
            browser.notifications.create({
                type: 'basic',
                iconUrl: '../icons/icon-48.png',
                title: 'Already Imported',
                message: parsed.title.substring(0, 60) + '...'
            });
            input.value = '';
            return;
        }
        
        // Store import
        imports[contentHash] = {
            title: parsed.title,
            content: parsed.content,
            model: parsed.model,
            timestamp: parsed.timestamp,
            filename: parsed.filename,
            importedAt: new Date().toISOString()
        };
        
        await browser.storage.local.set({ [MANUAL_IMPORTS_KEY]: imports });
        console.log('📥 Import stored successfully. Total imports:', Object.keys(imports).length);
        
        // Show notification (persists even if popup closes)
        browser.notifications.create({
            type: 'basic',
            iconUrl: '../icons/icon-48.png',
            title: '✅ Import Successful',
            message: parsed.title.substring(0, 60) + '\n' + Object.keys(imports).length + ' total imports'
        });
        
        const preview = parsed.content.substring(0, 120).replace(/</g, '&lt;').replace(/\n/g, ' ');
        const count = Object.keys(imports).length;
        showImportProgress(100, '✅ <b>Import successful!</b><br><br>📝 <b>Title:</b> ' + parsed.title.substring(0, 60) + '<br>🤖 <b>Model:</b> ' + parsed.model + '<br>📅 <b>Date:</b> ' + parsed.timestamp.split('T')[0] + '<br>📦 <b>Total imports:</b> ' + count + '<br><br><b>Preview:</b><br><code style="font-size:0.8em;background:#e8f5e9;padding:4px;border-radius:2px;display:block;max-height:50px;overflow:hidden;">' + preview + '...</code>');
        
        const statusEl = document.getElementById('status');
        if (statusEl) statusEl.textContent = '✅ Imported: "' + parsed.title.substring(0, 30) + '..."';
        
        setTimeout(() => {
            const box = document.getElementById('importResultBox');
            if (box) box.style.display = 'none';
            if (statusEl) statusEl.textContent = '';
        }, 8000);
        
    } catch (error) {
        console.error('📥 Import error:', error);
        showImportProgress(100, '❌ <b>Import failed</b><br>' + error.message, true);
        browser.notifications.create({
            type: 'basic',
            iconUrl: '../icons/icon-48.png',
            title: 'Import Failed',
            message: error.message
        });
    }
    
    input.value = '';
}

// Show manual imports modal
async function showManualImports() {
    const modal = document.getElementById('manualImportsModal');
    const list = document.getElementById('manualImportsList');
    
    const result = await browser.storage.local.get(MANUAL_IMPORTS_KEY);
    const imports = result[MANUAL_IMPORTS_KEY] || {};
    const entries = Object.entries(imports);
    
    if (entries.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 30px; color: #795548;"><p style="font-size: 1.2em;">📭 No imports yet</p><p>Click "Import .txt/.md File" to add old Duck.ai exports.</p></div>';
    } else {
        let html = '<div style="margin-bottom: 10px; color: #e65100; font-weight: 600;">📦 ' + entries.length + ' imported conversation(s)</div>';
        
        entries.sort((a, b) => new Date(b[1].importedAt) - new Date(a[1].importedAt));
        
        for (const [hash, entry] of entries) {
            const date = new Date(entry.importedAt).toLocaleString();
            const preview = (entry.content || '').substring(0, 100).replace(/</g, '&lt;');
            html += '<div style="background: white; border: 1px solid #ffcc80; border-radius: 4px; padding: 10px; margin-bottom: 8px;">' +
                '<div style="font-weight: 600; color: #e65100;">' + (entry.title || 'Untitled').substring(0, 60) + '</div>' +
                '<div style="font-size: 0.85em; color: #666; margin: 4px 0;">🤖 ' + (entry.model || 'unknown') + ' | 📅 Imported: ' + date + '</div>' +
                '<div style="font-size: 0.8em; color: #888; margin-top: 6px; padding: 6px; background: #fafafa; border-radius: 3px; max-height: 40px; overflow: hidden;">' + preview + '...</div>' +
                '<div style="margin-top: 8px; display: flex; gap: 6px;">' +
                '<button class="export-import-btn" data-hash="' + hash + '" style="font-size: 0.75em; padding: 4px 8px; background: #4caf50; color: white; border: none; border-radius: 3px; cursor: pointer;">📥 Export</button>' +
                '<button class="delete-import-btn" data-hash="' + hash + '" data-title="' + (entry.title || 'Untitled').substring(0, 30).replace(/"/g, '&quot;') + '" style="font-size: 0.75em; padding: 4px 8px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer;">�️ Delete</button>' +
                '</div>' +
                '</div>';
        }
        list.innerHTML = html;
        
        // Add export button handlers
        document.querySelectorAll('.export-import-btn').forEach(btn => {
            btn.addEventListener('click', () => exportManualImport(btn.dataset.hash));
        });
        
        // Add delete button handlers
        document.querySelectorAll('.delete-import-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteManualImport(btn.dataset.hash, btn.dataset.title));
        });
    }
    
    modal.style.display = 'block';
}

// Delete a manual import
async function deleteManualImport(hash, title) {
    if (!confirm('Delete import?\n\n"' + title + '..."\n\nThis cannot be undone.')) {
        return;
    }
    
    const result = await browser.storage.local.get(MANUAL_IMPORTS_KEY);
    const imports = result[MANUAL_IMPORTS_KEY] || {};
    
    if (imports[hash]) {
        delete imports[hash];
        await browser.storage.local.set({ [MANUAL_IMPORTS_KEY]: imports });
        
        const statusEl = document.getElementById('status');
        if (statusEl) statusEl.textContent = '🗑️ Deleted: "' + title + '..."';
        setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
        
        // Notify sidebar to refresh
        try {
            browser.runtime.sendMessage({ type: 'refresh_imports' });
        } catch (e) {
            // Sidebar may not be open
        }
        
        // Refresh the list
        showManualImports();
    }
}

// Export a manual import
async function exportManualImport(hash) {
    const result = await browser.storage.local.get(MANUAL_IMPORTS_KEY);
    const imports = result[MANUAL_IMPORTS_KEY] || {};
    const entry = imports[hash];
    if (!entry) return;
    
    const folderResult = await browser.storage.local.get('downloadFolder');
    const folder = folderResult.downloadFolder || 'DuckAI_Backups';
    const date = new Date().toISOString().split('T')[0];
    const cleanTitle = (entry.title || 'untitled').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').substring(0, 50);
    const filename = folder + '/duckai_import_' + date + '_' + cleanTitle + '.md';
    
    const content = '# ' + entry.title + '\n\n*Imported: ' + new Date(entry.importedAt).toLocaleString() + '*\n*Model: ' + entry.model + '*\n\n---\n\n' + entry.content;
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const statusEl = document.getElementById('status');
    try {
        await browser.downloads.download({ url: url, filename: filename, saveAs: false });
        if (statusEl) statusEl.textContent = '✅ Exported: ' + cleanTitle;
    } catch (e) {
        if (statusEl) statusEl.textContent = '❌ Export failed';
    }
    
    URL.revokeObjectURL(url);
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initManualImportUI);
} else {
    initManualImportUI();
}
