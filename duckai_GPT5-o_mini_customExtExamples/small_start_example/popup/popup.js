const listEl = document.getElementById("list");
const refreshBtn = document.getElementById("refresh");
const toggleBtn = document.getElementById("toggleAll");
let items = [];

async function fetchHeadings() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      return Array.from(document.querySelectorAll("h1,h2,h3")).map((el) => ({
        text: el.innerText.trim(),
        tag: el.tagName,
      }));
    },
  });
  return results[0].result;
}

function render() {
  listEl.innerHTML = "";
  items.forEach((it, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<label><input type="checkbox" data-i="${i}" ${it.checked ? "checked" : ""}/> ${it.tag} — ${it.text}</label>`;
    listEl.appendChild(li);
  });
}

function encryptAndSave(rawItems) {
  const pub = `-----BEGIN PUBLIC KEY-----\n...REPLACE_WITH_PUBKEY...\n-----END PUBLIC KEY-----`;
  const encrypt = new JSEncrypt();
  encrypt.setPublicKey(pub);
  const encrypted = rawItems.map((r) => ({
    data: encrypt.encrypt(r.text),
    tag: r.tag,
  }));
  chrome.storage.sync.set({ headings: encrypted, updated: Date.now() });
}

refreshBtn.addEventListener("click", async () => {
  const raw = await fetchHeadings();
  items = raw.map((r) => ({ ...r, checked: false }));
  render();
  encryptAndSave(items);
});

toggleBtn.addEventListener("click", () => {
  const allChecked = items.every((i) => i.checked);
  items = items.map((i) => ({ ...i, checked: !allChecked }));
  render();
});

listEl.addEventListener("change", async (e) => {
  const i = parseInt(e.target.dataset.i);
  items[i].checked = e.target.checked;
  render();
  encryptAndSave(items);
});

listEl.addEventListener("click", async (e) => {
  if (e.target.tagName === "LABEL") {
    const i = parseInt(e.target.querySelector("input").dataset.i);
    items[i].checked = !items[i].checked;
    render();
    encryptAndSave(items);
  }
});
