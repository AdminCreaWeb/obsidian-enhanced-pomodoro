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
