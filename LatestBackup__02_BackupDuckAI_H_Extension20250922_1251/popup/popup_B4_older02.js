const statusEl = document.getElementById('status');
const listEl = document.getElementById('list');
const refreshBtn = document.getElementById('refresh');
const toggleBtn = document.getElementById('toggleAll');
const BackupBtn = document.getElementById('backupButton');

let items = [];


document.getElementById('backupButton').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("Backup button clicked, executing script...");

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: backupConversations
    });
});

// Function to back up conversations
async function backupConversations() { // Changed function name to match the call
    console.log("Executing backupConversations function...");

    let errors = false; // Changed to let
    let results = []; // Changed to let
    const results_title = [];
    const results_content = [];
    const recentChatsSection = Array.from(document.querySelectorAll('p'))
        .find(p => p.innerText.includes('Recent Chats'));

    if (recentChatsSection) {
        console.log("Recent Chats section found.");
        const chatItems = recentChatsSection.closest('div').nextElementSibling.querySelectorAll('div[title]');

        for (const chat of chatItems) {
            // Simulate a click on the chat title
            chat.click(); // This will reveal the conversation content

            // Wait for the content to be visible
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for 500ms

            // Try multiple selectors for conversation content
            let conversationContent = document.querySelector('div[data-activeresponse]')
                                   || document.querySelector('[role="main"] div')
                                   || document.querySelector('.conversation-content')
                                   || document.querySelector('main');

            if (conversationContent) {
                const title = chat.innerText.trim();
                const content = conversationContent.innerHTML || conversationContent.innerText || 'No content found';

                results_title.push({
                    id: "title",
                    text: title,
                });

                results_content.push({
                    id: "content",
                    text: content,
                });

                console.log(`Extracted: ${title} (${content.length} chars)`);
            } else {
                console.error('Conversation content not found for:', chat.innerText);
                // Still add title even if content not found
                results_title.push({
                    id: "title",
                    text: chat.innerText.trim(),
                });
                results_content.push({
                    id: "content",
                    text: 'Content not accessible',
                });
                errors = true;
            }
        }
    } else {
        console.error('Recent Chats section not found.');
        errors = true;
    }

    // Fixed the results mapping
    results = results_title.map((titleItem, index) => ({
        id: `conversation_${index}`,
        title: titleItem.text,
        content: results_content[index] ? results_content[index].text : '' // Fixed indexing
    }));

    return (!errors) ? results : { error: true, message: 'Errors occurred during backup' };
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

function renderBackups() {
  listEl.innerHTML = '';
  items.forEach((it, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<label><input type="checkbox" data-i="${i}" ${it.checked ? 'checked' : ''}/> ${it.title}</label>`;
    listEl.appendChild(li);
  });
}

function render() {
  listEl.innerHTML = '';
  items.forEach((it, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<label><input type="checkbox" data-i="${i}" ${it.checked ? 'checked' : ''}/> ${it.tag} — ${it.text}</label>`;
    listEl.appendChild(li);
  });
}

refreshBtn.addEventListener('click', async () => {
  statusEl.textContent = 'Extracting headings...';
  const raw = await fetchHeadings();

  // Filter and log
  const headings = await FilterTitles(raw);
  // const contents = results.filter(item => item.tag_sort === 'content');

  items = headings.map(r => ({ ...r, checked: false }));
  render();
  statusEl.textContent = 'Encrypting and saving...';
  await encryptAndSaveAES(items);
});

BackupBtn.addEventListener('click', async () => {
  statusEl.textContent = 'Extracting conversations...';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const raw = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: backupConversations
    });

    const results = raw[0].result;

    if (results && results.error) {
      statusEl.textContent = 'Error occurred during backup';
      return;
    }

    items = results.map(r => ({ ...r, checked: false }));
    renderBackups();
    statusEl.textContent = `Found ${results.length} conversations. Select titles to download.`;
  } catch (error) {
    console.error('Error during backup:', error);
    statusEl.textContent = 'Error occurred during backup';
  }
});


toggleBtn.addEventListener('click', () => {
  const allChecked = items.every(i => i.checked);
  items = items.map(i => ({ ...i, checked: !allChecked }));
  if (items.length > 0 && items[0].title) {
    renderBackups();
  } else {
    render();
  }
});

// Add checkbox event listeners
listEl.addEventListener('change', (e) => {
  if (e.target.type === 'checkbox') {
    const index = parseInt(e.target.getAttribute('data-i'));
    items[index].checked = e.target.checked;
  }
});

// Add download button functionality
document.getElementById('downloadButton').addEventListener('click', () => {
  const checkedItems = items.filter(item => item.checked);
  if (checkedItems.length === 0) {
    statusEl.textContent = 'No items selected for download';
    return;
  }

  downloadAsMarkdown(checkedItems);
  statusEl.textContent = `Downloaded ${checkedItems.length} conversations to .md file`;
});

function htmlToMarkdown(html) {
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Convert common HTML elements to markdown
  let markdown = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '\n```\n$1\n```\n')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '\n> $1\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')
    .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    })
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
      let counter = 1;
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`);
    })
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n')
    .replace(/<span[^>]*>(.*?)<\/span>/gi, '$1')
    .replace(/<[^>]+>/g, '') // Remove any remaining HTML tags
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Clean up multiple newlines
    .trim();

  return markdown;
}

function downloadAsMarkdown(conversations) {
  let markdownContent = '# Conversation Backup\n\n';
  markdownContent += `*Exported on: ${new Date().toLocaleString()}*\n\n`;
  markdownContent += '---\n\n';

  conversations.forEach((conversation, index) => {
    markdownContent += `## ${conversation.title}\n\n`;

    // Convert HTML content to markdown
    const contentMarkdown = htmlToMarkdown(conversation.content);
    markdownContent += `${contentMarkdown}\n\n`;
    markdownContent += '---\n\n';
  });

  const blob = new Blob([markdownContent], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `conversation_backup_${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}



// // On load, show last saved info
// (async function initStatus() {
//   const s = await chrome.storage.local.get(['updated','encryptedItems','wrappedKey']);
//   if (s.updated) {
//     const count = s.encryptedItems ? s.encryptedItems.length : 0;
//     statusEl.textContent = `Last saved: ${new Date(s.updated).toLocaleString()} — ${count} items — storage: local (encrypted)`;
//   } else {
//     statusEl.textContent = 'No saved data yet.';
//   }
// })();
