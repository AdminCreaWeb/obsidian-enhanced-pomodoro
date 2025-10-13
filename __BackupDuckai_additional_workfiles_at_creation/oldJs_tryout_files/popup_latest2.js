document.getElementById('backupButton').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("Backup button clicked, executing script..."); // Log when button is clicked
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            console.log("Executing backupChat function..."); // Log when the function is executed
            const chatContainer = document.querySelector('.chat-container'); // Adjust this selector
            if (chatContainer) {
                console.log("Chat container found."); // Log if the chat container is found
            } else {
                console.error('Chat container not found.'); // Log if the chat container is not found
            }
        }
    });
});
