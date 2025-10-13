const statusEl = document.getElementById('status');
const listEl = document.getElementById('list');
const refreshBtn = document.getElementById('refresh');
const toggleBtn = document.getElementById('toggleAll');

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
async function backupConversations() {
    console.log("Executing backupConversations function...");

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

            const conversationContent = document.querySelector('div[data-activeresponse]'); // Adjust selector as needed
            if (conversationContent) {
                //console.log(`Title: ${chat.innerText}`);
                //console.log(`Content: ${conversationContent.innerHTML}`); // Log the conversation content
            } else {
                console.error('Conversation content not found.');
            }
        }
    } else {
        console.error('Recent Chats section not found.');
    }
}

async function fetchHeadings() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    // func: () => Array.from(document.querySelectorAll('h1,h2,h3')).map(el => ({ text: el.innerText.trim(), tag: el.tagName }))
    func: function () {
      async () => {
        // const temp_titles = Array.from(document.querySelectorAll('h1,h2,h3')).map(el => ({ text: el.innerText.trim(), tag: el.tagName, tag_sort: 'title' }));
        //const temp_contents = temp_titles.closest('p').nextElementSibling.querySelectorAll('p').map(el => ({ text: el.innerText.trim(), tag: 'p', tag_sort: 'content' }));
        const results = await fetchContents();
        // console.log('Headings fetched: %o', results);
        //console.log('Contents fetched: %o', temp_contents);
        const titles = results.filter(item => item.tag_sort === 'title');
        const contents = results.filter(item => item.tag_sort === 'content');

        console.log('All titles:', titles);
        console.log('All contents:', contents);
        return temp_result;
      }
    }
  });
  return results[0].result;
}

async function fetchContents() {
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
      nextElement = nextElement.nextElementSibling;
    }
  });
  return results;
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
  items = raw.map(r => ({ ...r, checked: false }));
  render();
  statusEl.textContent = 'Encrypting and saving...';
  await encryptAndSaveAES(items);
});

toggleBtn.addEventListener('click', () => {
  const allChecked = items.every(i => i.checked);
  items = items.map(i => ({ ...i, checked: !allChecked }));
  render();
});


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
