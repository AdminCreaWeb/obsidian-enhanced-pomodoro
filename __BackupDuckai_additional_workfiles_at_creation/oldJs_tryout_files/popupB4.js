document.getElementById('backupButton').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: backupChat
    });
});

function backupChat() {
    const chatHistory = document.querySelector('.chat-container').innerText; // Adjust selector as needed
    const blob = new Blob([chatHistory], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat_backup.txt';
    a.click();
    URL.revokeObjectURL(url);
}

// Try to edit this comment
const obj = {
    language: 'javascript'
  }; //=