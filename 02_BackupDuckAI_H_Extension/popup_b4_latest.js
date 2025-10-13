document.getElementById('backupButton').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("Backup button clicked, executing script...");

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        //func: findRecentChats,
        func: backupConversations
    });
});


// Function to find recent chats
function findRecentChats() {
    console.log("Executing findRecentChats function...");

    // Locate the "Recent Chats" section
    const recentChatsSection = Array.from(document.querySelectorAll('p'))
        .find(p => p.innerText.includes('Recent Chats'));

    if (recentChatsSection) {
        console.log("Recent Chats section found.");

        // Navigate to the parent div to find chat items
        const chatItemsContainer = recentChatsSection.closest('div').nextElementSibling; // Adjust as necessary
        const chatItems = chatItemsContainer.querySelectorAll('div[title]'); // Select divs with titles

        chatItems.forEach(chat => {
            console.log(chat.innerText); // Log each chat title
        });
    } else {
        console.error('Recent Chats section not found.');
    }
}

// Function to back up conversations
function backupConversations() {
    console.log("Executing backupConversations function...");

    const recentChatsSection = Array.from(document.querySelectorAll('p'))
        .find(p => p.innerText.includes('Recent Chats'));

    if (recentChatsSection) {
        console.log("Recent Chats section found.");
        const chatItems = recentChatsSection.closest('div').nextElementSibling.querySelectorAll('div[title]');

        chatItems.forEach(chat => {            
            // Simulate a click on the chat title
            chat.click(); // This will reveal the conversation content

            // Wait for the content to be visible (you may need to adjust this)
            setTimeout(() => {
                const conversationContent = document.querySelector('div[data-activeresponse]'); // Adjust selector as needed
                if (conversationContent) {
                    console.log(`Title: ${chat.innerText}`);
                    console.log(`Content: ${conversationContent.innerText}`); // Log the conversation content
                } else {
                    console.error('Conversation content not found.');
                }
            }, 500); // Adjust the timeout as necessary to allow for content to load
        });
    } else {
        console.error('Recent Chats section not found.');
    }
}

