document.getElementById('backupButton').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("Backup button clicked, executing script..."); // Log when button is clicked
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            console.log("Executing backupChat function..."); // Log when the function is executed

            findRecentChats();
            
            // Example function to find recent chats
            function findRecentChats() {
                const recentChatsContainer = document.querySelector('div:has(p:contains("Recent Chats"))'); // Adjust based on actual structure
                if (recentChatsContainer) {
                    const chatItems = recentChatsContainer.querySelectorAll('div[title]'); // Select divs with titles
                    chatItems.forEach(chat => {
                        console.log(chat.innerText); // Log each chat title
                    });
                } else {
                    console.error('Recent Chats container not found.');
                }
            }
            console.log("findRecentChats has been passed");            
            // const chatContainer = document.querySelector('.chat-container'); // Adjust this selector
            // if (chatContainer) {
                // console.log("Chat container found."); // Log if the chat container is found
                // const chatHistory = chatContainer.innerText;
                // console.log("Chat history retrieved:", chatHistory); // Log the chat history
                // const blob = new Blob([chatHistory], { type: 'text/plain' });
                // const url = URL.createObjectURL(blob);
                // const a = document.createElement('a');
                // a.href = url;
                // a.download = 'chat_backup.txt';
                // a.click();
                // URL.revokeObjectURL(url);
            // } else {
                // console.error('Chat container not found.'); // Log if the chat container is not found
            // }
        
        }
    });                                            
});
