// Enhanced debug script - finds ALL divs with title and analyzes them
console.log("=== FINDING CONVERSATION ELEMENTS ===");
console.log("Current URL:", window.location.href);

// Find ALL divs with title attribute
console.log("\n=== ALL DIVS WITH TITLE ===");
const allDivsWithTitle = document.querySelectorAll('div[title]');
console.log(`Total found: ${allDivsWithTitle.length}`);

allDivsWithTitle.forEach((div, index) => {
  console.log(`\n--- Div ${index + 1} ---`);
  console.log("Title:", div.title);
  console.log("Title length:", div.title.length);
  console.log("Classes:", div.className);
  console.log("Text content:", div.textContent.substring(0, 100));
  console.log("Parent element:", div.parentElement?.tagName);
  console.log("Parent classes:", div.parentElement?.className);
  console.log("HTML preview:", div.outerHTML.substring(0, 200));
});

// Check for conversation-like structure
console.log("\n=== LOOKING FOR CONVERSATION PATTERNS ===");

// Try to find the sidebar/conversation list container
const possibleContainers = [
  document.querySelector('[class*="sidebar"]'),
  document.querySelector('[class*="Sidebar"]'),
  document.querySelector('[class*="history"]'),
  document.querySelector('[class*="History"]'),
  document.querySelector('[class*="conversation"]'),
  document.querySelector('[class*="Conversation"]'),
  document.querySelector('[class*="list"]'),
  document.querySelector('[class*="List"]'),
  document.querySelector('nav'),
  document.querySelector('aside'),
];

possibleContainers.forEach((container, index) => {
  if (container) {
    console.log(`\nContainer ${index + 1} found:`, container.tagName);
    console.log("Classes:", container.className);
    console.log("Children count:", container.children.length);
    
    // Check if this container has divs with titles
    const divsInContainer = container.querySelectorAll('div[title]');
    console.log("Divs with title in this container:", divsInContainer.length);
  }
});

// Look for clickable conversation items
console.log("\n=== ANALYZING CLICKABLE ELEMENTS ===");

const clickableElements = [
  ...document.querySelectorAll('button'),
  ...document.querySelectorAll('a'),
  ...document.querySelectorAll('[role="button"]'),
  ...document.querySelectorAll('[onclick]')
];

const conversationLike = clickableElements.filter(el => {
  const text = el.textContent || '';
  const title = el.title || el.getAttribute('aria-label') || '';
  // Filter for elements that look like conversation titles (longer text, not UI elements)
  return (text.length > 20 || title.length > 20) && 
         !text.toLowerCase().includes('search') &&
         !text.toLowerCase().includes('settings') &&
         !text.toLowerCase().includes('menu');
});

console.log(`Found ${conversationLike.length} conversation-like elements:`);
conversationLike.slice(0, 5).forEach((el, i) => {
  console.log(`\n${i + 1}. Tag: ${el.tagName}`);
  console.log("Text:", el.textContent.substring(0, 60));
  console.log("Title/aria-label:", el.title || el.getAttribute('aria-label') || 'none');
  console.log("Classes:", el.className);
});

// Look for elements with conversation-like text patterns
console.log("\n=== CHECKING FOR LONG TEXT ELEMENTS ===");
const allElements = document.querySelectorAll('div, button, a, li');
const longTextElements = Array.from(allElements).filter(el => {
  const text = el.textContent || '';
  // Must have substantial text but not be the entire page
  return text.length > 15 && text.length < 200 && 
         el.children.length < 5 && // Not a container
         !text.includes('\n\n'); // Not multi-line content
});

console.log(`Found ${longTextElements.length} elements with conversation-like text`);
longTextElements.slice(0, 10).forEach((el, i) => {
  console.log(`\n${i + 1}. ${el.tagName}.${el.className.split(' ')[0]}`);
  console.log("Text:", el.textContent.substring(0, 70));
  console.log("Has title attr:", !!el.title);
  console.log("Has aria-label:", !!el.getAttribute('aria-label'));
});

// Check the entire DOM structure
console.log("\n=== OVERALL PAGE STRUCTURE ===");
console.log("Body children:", document.body.children.length);
Array.from(document.body.children).forEach((child, i) => {
  console.log(`${i + 1}. <${child.tagName} class="${child.className.substring(0, 50)}">`);
});

// Try to find React app root
console.log("\n=== LOOKING FOR REACT ROOT ===");
const reactRoot = document.querySelector('#root') || 
                  document.querySelector('[id*="root"]') ||
                  document.querySelector('[id*="app"]');
if (reactRoot) {
  console.log("React root found:", reactRoot.id || reactRoot.className);
  console.log("Children:", reactRoot.children.length);
  if (reactRoot.children.length > 0) {
    console.log("First child:", reactRoot.children[0].tagName, reactRoot.children[0].className);
  }
}

console.log("\n=== DONE ===");
console.log("Look for conversation-like elements above and note their selectors!");
