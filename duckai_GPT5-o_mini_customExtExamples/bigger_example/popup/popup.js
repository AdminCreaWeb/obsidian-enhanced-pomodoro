// includes JSEncrypt and CryptoJS via popup.html <script> tags

// upgraded function to generate a public key here directly:
// function generateKeyAsync(bits = 2048) {
const bits = 2048;
function generateKeyAsync(bits) {
  return new Promise((resolve, reject) => {
    try {
      const crypt = new JSEncrypt({ default_key_size: bits });
      crypt.getKey(() => resolve(crypt.getPrivateKey()));
    } catch (e) {
      reject(e);
    }
  });
  return crypt.getKey(() => resolve(crypt.getPublicKey()));
}

const PUBLIC_KEY = await generateKeyAsync(bits);
// const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
// ...REPLACE_WITH_PUBKEY...
// -----END PUBLIC KEY-----`;

async function encryptAndSaveAES(items) {
  // 1) generate random AES key (256-bit)
  const aesKey = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex); // 32 bytes = 256 bits

  // 2) AES-encrypt each item (use IV)
  const encryptedItems = items.map((it) => {
    const iv = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
    const cipher = CryptoJS.AES.encrypt(
      it.text,
      CryptoJS.enc.Hex.parse(aesKey),
      {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      },
    ).toString();
    return { tag: it.tag, iv, cipher };
  });

  // 3) RSA-encrypt (wrap) the AES key with JSEncrypt
  const encr = new JSEncrypt();
  encr.setPublicKey(PUBLIC_KEY);
  const wrappedKey = encr.encrypt(aesKey); // base64 string

  // 4) store wrapped key + ciphertexts
  return new Promise((resolve) => {
    chrome.storage.sync.set(
      { wrappedKey, encryptedItems, updated: Date.now() },
      () => resolve(),
    );
  });
}

// Example usage after fetching headings:
refreshBtn.addEventListener("click", async () => {
  const raw = await fetchHeadings();
  items = raw.map((r) => ({ ...r, checked: false }));
  render();
  await encryptAndSaveAES(items);
});
