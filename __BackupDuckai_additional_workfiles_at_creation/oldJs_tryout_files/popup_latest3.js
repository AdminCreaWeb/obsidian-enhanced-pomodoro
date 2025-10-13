document.getElementById('backupButton').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("Backup button clicked, executing script..."); // Log when button is clicked
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (selector) => {
            console.log("Executing backupChat function..."); // Log when the function is executed
            const chatContainer = document.querySelector(selector); // Use the passed selector
            if (chatContainer) {
                console.log("Chat container found."); // Log if the chat container is found
                const chatHistory = chatContainer.innerText;
                const blob = new Blob([chatHistory], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'chat_backup.txt';
                a.click();
                URL.revokeObjectURL(url);
            } else {
                console.error('Chat container not found.'); // Log if the chat container is not found
            }
        },
        args: ['.chat-container'] // Pass the selector as an argument
    });
});
