// Find conversations without assuming any attributes
console.log("=== INSPECTING ACTUAL SIDEBAR STRUCTURE ===");
console.log("URL:", window.location.href);

// Find the main chat container (React root or similar)
const possibleRoots = [
  document.getElementById('react-root-zci'),
  document.querySelector('[id*="react"]'),
  document.querySelector('[id*="root"]'),
  document.querySelector('[id*="app"]'),
  document.querySelector('main'),
  document.body
];

console.log("\n=== SEARCHING FOR SIDEBAR/LIST CONTAINER ===");

// Look for any element that might be the sidebar
const allDivs = document.querySelectorAll('div');
console.log(`Total divs on page: ${allDivs.length}`);

// Find divs that might be the sidebar (have multiple children that look like list items)
const potentialSidebars = Array.from(allDivs).filter(div => {
  const children = div.children;
  // Sidebar likely has 5+ children (conversation items)
  if (children.length < 3) return false;
  
  // Children should be similar (same tag, similar classes)
  const firstChild = children[0];
  const secondChild = children[1];
  if (!firstChild || !secondChild) return false;
  
  // Check if first two children have similar structure
  const sameTag = firstChild.tagName === secondChild.tagName;
  const similarClasses = firstChild.className && secondChild.className && 
                        firstChild.className.split(' ')[0] === secondChild.className.split(' ')[0];
  
  return sameTag && (similarClasses || firstChild.tagName === 'DIV' || firstChild.tagName === 'A' || firstChild.tagName === 'BUTTON');
});

console.log(`\nFound ${potentialSidebars.length} potential sidebar containers`);

potentialSidebars.slice(0, 5).forEach((sidebar, index) => {
  console.log(`\n=== POTENTIAL SIDEBAR ${index + 1} ===`);
  console.log("Tag:", sidebar.tagName);
  console.log("Classes:", sidebar.className);
  console.log("ID:", sidebar.id || 'none');
  console.log("Children count:", sidebar.children.length);
  console.log("Parent:", sidebar.parentElement?.tagName, sidebar.parentElement?.className);
  
  // Show first 3 children
  console.log("\nFirst 3 children:");
  Array.from(sidebar.children).slice(0, 3).forEach((child, i) => {
    console.log(`  Child ${i + 1}:`);
    console.log(`    Tag: ${child.tagName}`);
    console.log(`    Classes: ${child.className}`);
    console.log(`    Text: ${child.textContent.substring(0, 60).replace(/\n/g, ' ')}`);
    console.log(`    Has title: ${!!child.title}`);
    console.log(`    Title: ${child.title || 'none'}`);
    console.log(`    Has aria-label: ${!!child.getAttribute('aria-label')}`);
    console.log(`    Aria-label: ${child.getAttribute('aria-label') || 'none'}`);
    console.log(`    Has href: ${!!child.href}`);
    console.log(`    Href: ${child.href || 'none'}`);
  });
});

// Alternative: Look for elements with specific text patterns (conversation titles)
console.log("\n\n=== SEARCHING BY TEXT CONTENT ===");

// Get all clickable elements
const clickable = Array.from(document.querySelectorAll('a, button, div[onclick], [role="button"]'));

// Filter for elements with conversation-like text (medium length, not too short, not too long)
const conversationLike = clickable.filter(el => {
  const text = (el.textContent || '').trim();
  return text.length > 10 && text.length < 150 && 
         !text.includes('\n') && // Single line
         !text.toLowerCase().includes('search') &&
         !text.toLowerCase().includes('settings') &&
         !text.toLowerCase().includes('menu') &&
         !text.toLowerCase().includes('cookie') &&
         !text.toLowerCase().includes('privacy');
});

console.log(`Found ${conversationLike.length} conversation-like clickable elements`);

conversationLike.slice(0, 10).forEach((el, i) => {
  console.log(`\n${i + 1}. ${el.tagName}`);
  console.log("   Text:", el.textContent.trim().substring(0, 70));
  console.log("   Classes:", el.className);
  console.log("   ID:", el.id || 'none');
  console.log("   Title attr:", el.title || 'none');
  console.log("   Aria-label:", el.getAttribute('aria-label') || 'none');
  console.log("   Parent:", el.parentElement?.tagName);
  console.log("   Parent classes:", el.parentElement?.className);
});

// Check for iframes (duck.ai might load chat in iframe)
console.log("\n\n=== CHECKING FOR IFRAMES ===");
const iframes = document.querySelectorAll('iframe');
console.log(`Found ${iframes.length} iframes`);
iframes.forEach((iframe, i) => {
  console.log(`Iframe ${i + 1}:`);
  console.log("  src:", iframe.src);
  console.log("  id:", iframe.id);
  console.log("  classes:", iframe.className);
});

// Look specifically for duck.ai chat elements
console.log("\n\n=== DUCK.AI SPECIFIC SEARCH ===");
const duckai = [
  ...document.querySelectorAll('[class*="duck"]'),
  ...document.querySelectorAll('[class*="Duck"]'),
  ...document.querySelectorAll('[class*="chat"]'),
  ...document.querySelectorAll('[class*="Chat"]'),
  ...document.querySelectorAll('[id*="duck"]'),
  ...document.querySelectorAll('[id*="chat"]')
];

console.log(`Found ${duckai.length} duck.ai related elements`);
duckai.slice(0, 5).forEach((el, i) => {
  console.log(`${i + 1}. ${el.tagName}`);
  console.log("   Classes:", el.className);
  console.log("   ID:", el.id);
  console.log("   Text:", el.textContent.substring(0, 50).replace(/\n/g, ' '));
});

console.log("\n\n=== DONE ===");
console.log("Check above for potential conversation elements and their selectors!");
