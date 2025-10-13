// Debug script for DuckAI page structure
// Copy and paste this entire script into the browser console on the DuckAI page

console.log('🔍 DuckAI Page Structure Debug Script');
console.log('=====================================');

function debugPageStructure() {
    console.log('\n📍 Page Information:');
    console.log('URL:', window.location.href);
    console.log('Title:', document.title);
    console.log('Domain:', window.location.hostname);

    // Check if we're on the right page
    const isDuckAI = window.location.hostname.includes('duckduckgo.com') ||
                     window.location.href.includes('duck') ||
                     document.title.toLowerCase().includes('duck');

    console.log('Is DuckAI page:', isDuckAI ? '✅ YES' : '❌ NO');

    console.log('\n🔍 Searching for conversation elements...');

    // 1. Look for text containing "Recent" or "Chat"
    const textSelectors = ['Recent Chats', 'recent chats', 'Recent', 'Chats', 'Chat History', 'Conversations'];
    textSelectors.forEach(text => {
        const elements = Array.from(document.querySelectorAll('*')).filter(el =>
            el.textContent && el.textContent.trim().toLowerCase().includes(text.toLowerCase()) &&
            el.children.length === 0 // Only leaf nodes
        );

        if (elements.length > 0) {
            console.log(`\n📝 Found "${text}":`);
            elements.forEach((el, i) => {
                console.log(`  ${i+1}. ${el.tagName}: "${el.textContent.trim()}"`);
                console.log(`     Parent: ${el.parentElement?.tagName} (${el.parentElement?.className || 'no class'})`);
                console.log(`     Next sibling: ${el.parentElement?.nextElementSibling?.tagName || 'none'}`);
            });
        }
    });

    // 2. Look for clickable elements that might be conversations
    console.log('\n🖱️ Clickable elements with titles:');
    const clickableSelectors = ['button[title]', 'div[title]', 'a[title]', '[role="button"][title]'];
    clickableSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`\n${selector}: ${elements.length} elements`);

        Array.from(elements).slice(0, 5).forEach((el, i) => {
            const title = el.title || el.getAttribute('aria-label') || '';
            const text = el.textContent?.trim().substring(0, 50) || '';
            if (title.length > 5 || text.length > 5) {
                console.log(`  ${i+1}. Title: "${title}"`);
                console.log(`     Text: "${text}"`);
                console.log(`     Classes: "${el.className}"`);
            }
        });
    });

    // 3. Look for sidebar or navigation elements
    console.log('\n📋 Sidebar/Navigation elements:');
    const navSelectors = ['nav', '[role="navigation"]', 'aside', '.sidebar', '[data-testid*="sidebar"]', '[data-testid*="nav"]'];
    navSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            console.log(`${selector}: ${elements.length} elements`);
            Array.from(elements).forEach((el, i) => {
                console.log(`  ${i+1}. ${el.tagName} - Classes: "${el.className}"`);
                const children = el.querySelectorAll('*');
                console.log(`     Contains ${children.length} child elements`);
            });
        }
    });

    // 4. Look for main content areas
    console.log('\n📄 Main content areas:');
    const mainSelectors = ['main', '[role="main"]', '.main', '#main', '.content', '.chat-content'];
    mainSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            console.log(`${selector}: ${elements.length} elements`);
        }
    });

    // 5. Check for data attributes that might indicate conversations
    console.log('\n🏷️ Elements with data attributes:');
    const dataElements = document.querySelectorAll('[data-testid], [data-id], [data-chat], [data-conversation]');
    console.log(`Found ${dataElements.length} elements with data attributes`);

    const dataAttrs = new Set();
    Array.from(dataElements).forEach(el => {
        Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('data-')) {
                dataAttrs.add(attr.name);
            }
        });
    });

    console.log('Unique data attributes found:', Array.from(dataAttrs).sort());

    // 6. Look for specific DuckDuckGo patterns
    console.log('\n🦆 DuckDuckGo-specific elements:');
    const duckPatterns = [
        '[class*="duck"]',
        '[class*="Duck"]',
        '[id*="duck"]',
        '[data-testid*="duck"]',
        '[class*="chat"]',
        '[class*="Chat"]'
    ];

    duckPatterns.forEach(pattern => {
        const elements = document.querySelectorAll(pattern);
        if (elements.length > 0) {
            console.log(`${pattern}: ${elements.length} elements`);
        }
    });

    // 7. Sample the page structure
    console.log('\n🏗️ Page structure sample:');
    const body = document.body;
    if (body) {
        console.log('Body classes:', body.className);
        console.log('Body children:', body.children.length);

        // Look at the first few main containers
        Array.from(body.children).slice(0, 3).forEach((child, i) => {
            console.log(`\nTop-level container ${i+1}:`);
            console.log(`  Tag: ${child.tagName}`);
            console.log(`  Classes: "${child.className}"`);
            console.log(`  ID: "${child.id}"`);
            console.log(`  Children: ${child.children.length}`);

            // Look one level deeper
            if (child.children.length > 0 && child.children.length < 10) {
                Array.from(child.children).forEach((grandchild, j) => {
                    console.log(`    Child ${j+1}: ${grandchild.tagName} (${grandchild.className || 'no class'})`);
                });
            }
        });
    }

    // 8. Test conversation detection functions
    console.log('\n🧪 Testing conversation detection:');

    // Simulate the original detection logic
    const recentChatsElements = Array.from(document.querySelectorAll('p')).filter(p =>
        p.innerText && p.innerText.includes('Recent Chats')
    );

    console.log(`Found ${recentChatsElements.length} elements containing "Recent Chats"`);

    recentChatsElements.forEach((el, i) => {
        console.log(`\nRecent Chats element ${i+1}:`);
        console.log(`  Text: "${el.innerText}"`);
        console.log(`  Parent: ${el.parentElement?.tagName}`);
        console.log(`  Closest div: ${el.closest('div') ? 'found' : 'not found'}`);

        const closestDiv = el.closest('div');
        if (closestDiv) {
            const nextSibling = closestDiv.nextElementSibling;
            console.log(`  Next sibling: ${nextSibling ? nextSibling.tagName : 'none'}`);

            if (nextSibling) {
                const titleElements = nextSibling.querySelectorAll('div[title]');
                console.log(`  Found ${titleElements.length} div[title] elements in next sibling`);

                Array.from(titleElements).slice(0, 3).forEach((titleEl, j) => {
                    console.log(`    Title ${j+1}: "${titleEl.title}"`);
                });
            }
        }
    });

    console.log('\n✅ Debug complete!');
    console.log('\n💡 Tips:');
    console.log('- If no "Recent Chats" found, the page might be different');
    console.log('- Look for patterns in the clickable elements');
    console.log('- Check if you need to scroll or interact with the page first');
    console.log('- The page might load content dynamically');

    return {
        recentChatsFound: recentChatsElements.length > 0,
        clickableElements: document.querySelectorAll('button[title], div[title], a[title]').length,
        isDuckAI: isDuckAI
    };
}

// Run the debug function
try {
    const results = debugPageStructure();
    console.log('\n📊 Summary:', results);
} catch (error) {
    console.error('❌ Debug script error:', error);
}

console.log('\n🔧 Manual inspection commands:');
console.log('Try these in console:');
console.log('document.querySelectorAll("p")  // All paragraphs');
console.log('document.querySelectorAll("[title]")  // All elements with titles');
console.log('document.querySelectorAll("button")  // All buttons');
console.log('document.body.innerHTML  // Full page HTML (warning: large output)');
