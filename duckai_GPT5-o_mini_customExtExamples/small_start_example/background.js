chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-headings",
    title: "Save (not-encrypted) headings",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "save-headings") {
    const res = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () =>
        Array.from(document.querySelectorAll("h1,h2,h3")).map((el) =>
          el.innerText.trim(),
        ),
    });
    chrome.storage.local.set({ lastRaw: res[0].result });
  }
});
