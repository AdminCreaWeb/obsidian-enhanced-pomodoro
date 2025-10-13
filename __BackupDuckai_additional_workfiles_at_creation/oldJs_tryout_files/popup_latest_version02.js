document.getElementById('backupButton').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("Backup button clicked, executing script..."); // Log when button is clicked

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: findRecentChats // Pass the function reference
    });
});

// Function to find recent chats
function findRecentChats() {
    console.log("Executing findRecentChats function..."); // Log when the function is executed
    const recentChatsContainer = document.querySelector('div:has(p:contains("Recent Chats"))'); // Adjust based on actual structure
    if (recentChatsContainer) {
        console.log("Recent Chats container found."); // Log if the container is found
        const chatItems = recentChatsContainer.querySelectorAll('div[title]'); // Select divs with titles
        chatItems.forEach(chat => {
            console.log(chat.innerText); // Log each chat title
        });
    } else {
        console.error('Recent Chats container not found.'); // Log if the container is not found
    }
}
