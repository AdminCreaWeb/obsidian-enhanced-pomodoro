let myWindowId;
const contentBox = document.querySelector("#content");

/*
Make the content box editable as soon as the user mouses over the sidebar.
*/
// window.addEventListener("mouseover", () => {
  // contentBox.setAttribute("contenteditable", true);
// });

/*
When the user mouses out, save the current contents of the box.
*/
window.addEventListener("mouseout", () => {
  contentBox.setAttribute("contenteditable", false);
  browser.tabs.query({windowId: myWindowId, active: true}).then((tabs) => {
    let contentToStore = {};
    contentToStore[tabs[0].url] = contentBox.textContent;
    browser.storage.local.set(contentToStore);
  });
});



/*
Update the sidebar's content.

1) Get the active tab in this sidebar's window.
2) Get its stored content.
3) Put it in the content box.
*/
function updateContent() {
  browser.tabs.query({windowId: myWindowId, active: true})
    .then((tabs) => {
      return browser.storage.local.get(tabs[0].url);
    })
    .then((storedInfo) => {
      contentBox.textContent = storedInfo[Object.keys(storedInfo)[0]];
    });
}

/*
Update content when a new tab becomes active.
*/
browser.tabs.onActivated.addListener(updateContent);

/*
Update content when a new page is loaded into a tab.
*/
browser.tabs.onUpdated.addListener(updateContent);

/*
When the sidebar loads, get the ID of its window,
and update its content.
*/
browser.windows.getCurrent({populate: true}).then((windowInfo) => {
  myWindowId = windowInfo.id;
  updateContent();
});

/* BEGIN OF FIND ACROSS TABS */

let backgroundPage = browser.extension.getBackgroundPage();

document.getElementById("find-form").addEventListener("submit", function(e) {
  // Send the query from the form to the background page.
  backgroundPage.find(document.getElementById("find-input").value);
  e.preventDefault();
});

/* BEGIN OF FIND Earlier BackupAI Extension */

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
              console.log(`Title: ${chat.innerText}`);
              console.log(`Content: ${conversationContent.innerHTML}`); // Log the conversation content
          } else {
              console.error('Conversation content not found.');
          }
      }
  } else {
      console.error('Recent Chats section not found.');
  }
}







































