document.getElementById('backupButton').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("Backup button clicked, executing script...");

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: findRecentChats
    });
});

// Function to find recent chats
function findRecentChats() {
    console.log("Executing findRecentChats function...");
    
    // Adjust the selector based on the actual structure of the page
    const recentChatsContainer = document.querySelector('div[data-testid="recent-chats"]'); // Example selector
    if (recentChatsContainer) {
        console.log("Recent Chats container found.");
        const chatItems = recentChatsContainer.querySelectorAll('div[title]'); // Select divs with titles
        chatItems.forEach(chat => {
            console.log(chat.innerText); // Log each chat title
        });
    } else {
        console.error('Recent Chats container not found.');
    }
}
