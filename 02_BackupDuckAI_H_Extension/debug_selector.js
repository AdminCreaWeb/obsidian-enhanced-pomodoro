// Debug script - paste this in Firefox console on duck.ai page
// This will help us find the correct selector

console.log("=== DEBUGGING CONVERSATION SELECTORS ===");
console.log("Current URL:", window.location.href);

// Test all possible selectors
const selectors = [
  "div[title].clS_s3a7onj0_NFty2Qh",  // Original
  'div[role="button"][title]',
  "aside div[title]",
  "nav div[title]",
  '[class*="conversation"][title]',
  '[class*="chat"][title]',
  "a[title]",
  "aside button",
  "aside a",
  "nav button",
  "nav a",
  "[data-testid*='conversation']",
  "[data-testid*='chat']"
];

console.log("\n=== TESTING SELECTORS ===");
selectors.forEach(sel => {
  const elements = document.querySelectorAll(sel);
  if (elements.length > 0) {
    console.log(`✅ Found ${elements.length} with: ${sel}`);
    console.log("First element:", elements[0]);
    console.log("Classes:", elements[0].className);
    console.log("Title:", elements[0].title);
    console.log("Text:", elements[0].textContent.substring(0, 50));
  } else {
    console.log(`❌ Found 0 with: ${sel}`);
  }
});

// Check if sidebar exists
console.log("\n=== CHECKING PAGE STRUCTURE ===");
const aside = document.querySelector('aside');
const nav = document.querySelector('nav');
const main = document.querySelector('main');

console.log("Sidebar (aside):", aside ? "✅ Found" : "❌ Not found");
console.log("Navigation (nav):", nav ? "✅ Found" : "❌ Not found");
console.log("Main content:", main ? "✅ Found" : "❌ Not found");

if (aside) {
  console.log("Sidebar children:", aside.children.length);
  console.log("Sidebar HTML preview:", aside.innerHTML.substring(0, 200));
}

// Look for any clickable elements with text
console.log("\n=== LOOKING FOR CONVERSATION-LIKE ELEMENTS ===");
const allButtons = document.querySelectorAll('button');
const allLinks = document.querySelectorAll('a');
const allDivs = document.querySelectorAll('div[title]');

console.log(`All buttons: ${allButtons.length}`);
console.log(`All links: ${allLinks.length}`);
console.log(`All divs with title: ${allDivs.length}`);

// Check if we're in the right place
if (document.title !== "Duck.ai" && !document.title.includes("DuckDuckGo")) {
  console.warn("⚠️ This doesn't look like duck.ai!");
}

console.log("\n=== WAIT 3 SECONDS AND CHECK AGAIN ===");
setTimeout(() => {
  console.log("After 3 seconds:");
  const afterWait = document.querySelectorAll("div[title].clS_s3a7onj0_NFty2Qh");
  console.log(`Found ${afterWait.length} conversations`);
  if (afterWait.length > 0) {
    console.log("✅ Conversations appeared after waiting!");
  }
}, 3000);

console.log("\n=== DONE ===");
console.log("If you see conversations in the sidebar, copy the selector that worked ✅");
