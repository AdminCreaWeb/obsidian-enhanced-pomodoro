document.getElementById('backupButton').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            const chatContainer = document.querySelector('.chat-container'); // Adjust this selector
            if (chatContainer) {
                const chatHistory = chatContainer.innerText;
                const blob = new Blob([chatHistory], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'chat_backup.txt';
                a.click();
                URL.revokeObjectURL(url);
            } else {
                console.error('Chat container not found.');
            }
        }
    });
});
