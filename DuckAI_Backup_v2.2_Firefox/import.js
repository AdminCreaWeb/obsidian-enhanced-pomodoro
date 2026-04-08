// Import page script for Duck.ai Backup Extension
const MANUAL_IMPORTS_KEY = 'manualImports';

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const resultBox = document.getElementById('resultBox');
const progressFill = document.getElementById('progressFill');
const resultText = document.getElementById('resultText');
const importsList = document.getElementById('importsList');
const importsContent = document.getElementById('importsContent');
const closeBtn = document.getElementById('closeBtn');

// Show progress
function showProgress(percent, message, isError = false) {
    resultBox.style.display = 'block';
    resultBox.className = 'result-box ' + (isError ? 'error' : 'success');
    progressFill.style.width = percent + '%';
    progressFill.style.background = isError ? '#f44336' : '#4caf50';
    resultText.innerHTML = message;
}

// Parse Duck.ai export file
function parseDuckAIExport(content, filename) {
    let title = '';
    let model = 'unknown';
    let timestamp = new Date().toISOString();
    const lines = content.split('\n');
    
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
    
    const modelMatch = content.match(/Model:\s*(\S+)/i) || content.match(/using\s+(Claude|GPT|Llama|Mixtral)/i);
    if (modelMatch) model = modelMatch[1];
    
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) timestamp = dateMatch[1] + 'T00:00:00.000Z';
    
    if (!title) {
        title = filename.replace(/\.[^.]+$/, '').replace(/__duck\.ai.*$/, '').replace(/[_-]/g, ' ').trim();
    }
    
    if (!title || content.length < 50) return null;
    
    return { title, content, model, timestamp, filename };
}

// Handle file import
async function handleFile(file) {
    if (!file) return;
    
    console.log('📥 Importing:', file.name);
    showProgress(10, '📂 <b>Reading:</b> ' + file.name + '<br>📊 Size: ' + (file.size / 1024).toFixed(1) + ' KB');
    
    try {
        const content = await file.text();
        showProgress(30, '📂 <b>File:</b> ' + file.name + '<br>📝 Characters: ' + content.length.toLocaleString());
        
        showProgress(50, '⏳ Parsing content...');
        const parsed = parseDuckAIExport(content, file.name);
        
        if (!parsed) {
            showProgress(100, '❌ <b>Parse failed</b><br>Could not extract title from file.<br><br><b>First 100 chars:</b><br><code style="background:#fff;padding:4px;border-radius:3px;font-size:0.9em;">' + content.substring(0, 100).replace(/</g, '&lt;') + '...</code>', true);
            return;
        }
        
        showProgress(70, '📝 <b>Title:</b> ' + parsed.title.substring(0, 50) + '...<br>🤖 <b>Model:</b> ' + parsed.model + '<br>⏳ Storing...');
        
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
            showProgress(100, '⚠️ <b>Already imported</b><br>This file was previously imported.<br><br>📝 <b>Title:</b> ' + parsed.title, true);
            await loadImportsList();
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
        
        const preview = parsed.content.substring(0, 150).replace(/</g, '&lt;').replace(/\n/g, ' ');
        const count = Object.keys(imports).length;
        showProgress(100, '✅ <b>Import successful!</b><br><br>📝 <b>Title:</b> ' + parsed.title.substring(0, 70) + '<br>🤖 <b>Model:</b> ' + parsed.model + '<br>📅 <b>Date:</b> ' + parsed.timestamp.split('T')[0] + '<br>📦 <b>Total imports:</b> ' + count + '<br><br><b>Preview:</b><br><code style="background:#e8f5e9;padding:6px;border-radius:3px;display:block;max-height:60px;overflow:hidden;font-size:0.85em;margin-top:8px;">' + preview + '...</code>');
        
        browser.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon-48.png',
            title: '✅ Import Successful',
            message: parsed.title.substring(0, 60) + '\n' + count + ' total imports'
        });
        
        closeBtn.style.display = 'inline-block';
        await loadImportsList();
        
    } catch (error) {
        console.error('Import error:', error);
        showProgress(100, '❌ <b>Import failed</b><br>' + error.message, true);
    }
}

// Load and display imports list
async function loadImportsList() {
    const result = await browser.storage.local.get(MANUAL_IMPORTS_KEY);
    const imports = result[MANUAL_IMPORTS_KEY] || {};
    const entries = Object.entries(imports);
    
    if (entries.length === 0) {
        importsList.style.display = 'none';
        return;
    }
    
    entries.sort((a, b) => new Date(b[1].importedAt) - new Date(a[1].importedAt));
    
    let html = '';
    for (const [hash, entry] of entries) {
        const date = new Date(entry.importedAt).toLocaleString();
        html += '<div class="import-item">' +
            '<div class="import-title">' + (entry.title || 'Untitled').substring(0, 80) + '</div>' +
            '<div class="import-meta">🤖 ' + (entry.model || 'unknown') + ' | 📅 ' + date + '</div>' +
            '</div>';
    }
    
    importsContent.innerHTML = html;
    importsList.style.display = 'block';
}

// Click handler
dropZone.addEventListener('click', () => {
    fileInput.click();
});

// File selection handler
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
});

// Drag and drop handlers
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

// Close button
closeBtn.addEventListener('click', () => {
    window.close();
});

// Listen for refresh messages from popup
browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'refresh_imports') {
        console.log('📥 Sidebar received refresh request');
        loadImportsList();
    }
});

// Load existing imports on page load
loadImportsList();
