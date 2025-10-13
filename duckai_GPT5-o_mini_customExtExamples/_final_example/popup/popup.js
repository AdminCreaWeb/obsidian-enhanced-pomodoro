// popup.js (module)
//importWorkerKeyGen(); // optional worker path if you create one

const statusEl = document.getElementById('status');
const listEl = document.getElementById('list');
const refreshBtn = document.getElementById('refresh');
const toggleBtn = document.getElementById('toggleAll');

let items = [];

// Promise wrapper for JSEncrypt key generation (callback-style)
function generateKeyAsync(bits = 2048) {
  return new Promise((resolve, reject) => {
    try {
      const crypt = new JSEncrypt({ default_key_size: bits });
      // getKey accepts a callback invoked when key generation completes
      crypt.getKey(() => {
        // return public key PEM
        resolve(crypt.getPublicKey());
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function ensurePublicKey() {
  // try to read stored public key, otherwise generate one (demo only)
  const { publicKey } = await chrome.storage.local.get('publicKey');
  if (publicKey) return publicKey;

  statusEl.textContent = 'Generating RSA keypair (this may take a few seconds)...';
  const pub = await generateKeyAsync(2048);
  // store only public key; private key should be stored by user in secure place (not synced)
  await chrome.storage.local.set({ publicKey: pub });
  statusEl.textContent = 'Generated and stored public key (public only).';
  return pub;
}

async function encryptAndSaveAES(items) {
  const publicKey = await ensurePublicKey();

  const aesKey = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  const encryptedItems = items.map(it => {
    const iv = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
    const cipher = CryptoJS.AES.encrypt(it.text, CryptoJS.enc.Hex.parse(aesKey), {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }).toString();
    return { tag: it.tag, iv, cipher };
  });

  const encr = new JSEncrypt();
  encr.setPublicKey(publicKey);
  const wrappedKey = encr.encrypt(aesKey);

  const payload = { wrappedKey, encryptedItems, updated: Date.now(), storage: 'local' };
  await chrome.storage.local.set(payload);

  // update status quickly for UI feedback
  statusEl.textContent = `Saved securely: ${encryptedItems.length} items — stored in local storage (encrypted)`;
}

async function fetchHeadings() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => Array.from(document.querySelectorAll('h1,h2,h3')).map(el => ({ text: el.innerText.trim(), tag: el.tagName }))
  });
  return results[0].result;
}

function render() {
  listEl.innerHTML = '';
  items.forEach((it, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<label><input type="checkbox" data-i="${i}" ${it.checked ? 'checked' : ''}/> ${it.tag} — ${it.text}</label>`;
    listEl.appendChild(li);
  });
}

refreshBtn.addEventListener('click', async () => {
  statusEl.textContent = 'Extracting headings...';
  const raw = await fetchHeadings();
  items = raw.map(r => ({ ...r, checked: false }));
  render();
  statusEl.textContent = 'Encrypting and saving...';
  await encryptAndSaveAES(items);
});

toggleBtn.addEventListener('click', () => {
  const allChecked = items.every(i => i.checked);
  items = items.map(i => ({ ...i, checked: !allChecked }));
  render();
});

// On load, show last saved info
(async function initStatus() {
  const s = await chrome.storage.local.get(['updated','encryptedItems','wrappedKey']);
  if (s.updated) {
    const count = s.encryptedItems ? s.encryptedItems.length : 0;
    statusEl.textContent = `Last saved: ${new Date(s.updated).toLocaleString()} — ${count} items — storage: local (encrypted)`;
  } else {
    statusEl.textContent = 'No saved data yet.';
  }
})();
