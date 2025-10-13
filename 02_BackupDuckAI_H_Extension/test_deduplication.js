// Test script for CSS fingerprinting and deduplication functionality
// Run this in browser console on a DuckDuckGo AI chat page to test

console.log('=== DuckAI Backup Deduplication Test ===');

// CSS class fingerprinting for deduplication
function extractCSSFingerprint(htmlContent) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  // Extract first few unique class combinations as fingerprint
  const elements = tempDiv.querySelectorAll('div[class], p[class], span[class]');
  const classSignatures = [];

  for (let i = 0; i < Math.min(elements.length, 5); i++) {
    const classes = elements[i].className.trim();
    if (classes && classes.length > 10) { // Only significant class names
      classSignatures.push(classes.substring(0, 100)); // First 100 chars
    }
  }

  return classSignatures.slice(0, 3).join('|'); // Max 3 signatures
}

// Content hash for additional deduplication
function generateContentHash(title, content) {
  const combined = (title + content).replace(/\s+/g, ' ').trim();
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// Test function
function testDeduplication() {
  console.log('\n--- Testing CSS Fingerprinting ---');

  // Find conversation elements
  const conversationElements = document.querySelectorAll('[data-activeresponse], .conversation-content, [role="main"] div');

  if (conversationElements.length === 0) {
    console.log('❌ No conversation elements found on this page');
    return;
  }

  console.log(`✅ Found ${conversationElements.length} conversation elements`);

  conversationElements.forEach((element, index) => {
    if (index >= 3) return; // Test only first 3 elements

    const html = element.innerHTML;
    const text = element.textContent || element.innerText;

    if (html && html.length > 100) {
      const fingerprint = extractCSSFingerprint(html);
      const contentHash = generateContentHash(`Test Title ${index}`, text);

      console.log(`\n📝 Element ${index + 1}:`);
      console.log(`   HTML Length: ${html.length} chars`);
      console.log(`   Text Length: ${text.length} chars`);
      console.log(`   CSS Fingerprint: ${fingerprint}`);
      console.log(`   Content Hash: ${contentHash}`);

      // Test with duplicate content
      const duplicateFingerprint = extractCSSFingerprint(html);
      const duplicateHash = generateContentHash(`Test Title ${index}`, text);

      console.log(`   🔄 Duplicate Test: ${fingerprint === duplicateFingerprint ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   🔄 Hash Test: ${contentHash === duplicateHash ? '✅ PASS' : '❌ FAIL'}`);
    }
  });

  console.log('\n--- Testing Title Elements ---');
  const titleElements = document.querySelectorAll('[title], h1, h2, h3');

  titleElements.forEach((element, index) => {
    if (index >= 5) return; // Test only first 5 title elements

    const title = element.title || element.textContent || element.innerText;
    if (title && title.trim().length > 5) {
      const hash = generateContentHash(title, 'sample content');
      console.log(`📑 Title ${index + 1}: "${title.substring(0, 50)}..." → Hash: ${hash}`);
    }
  });

  console.log('\n--- Testing HTML Structure Detection ---');
  const testHTML = `
    <div class="PBQZNIcKgp0FJ_yxBVaB wf30Mz8ZE2NPemnAYJBK">
      <div class="pjH_KRSqz6izB4eYeemN">
        <p>Test content with complex CSS classes</p>
      </div>
    </div>
  `;

  const testFingerprint = extractCSSFingerprint(testHTML);
  console.log(`🧪 Test HTML Fingerprint: ${testFingerprint}`);

  // Test with similar but different HTML
  const testHTML2 = `
    <div class="PBQZNIcKgp0FJ_yxBVaB wf30Mz8ZE2NPemnAYJBK">
      <div class="pjH_KRSqz6izB4eYeemN">
        <p>Different content but same CSS structure</p>
      </div>
    </div>
  `;

  const testFingerprint2 = extractCSSFingerprint(testHTML2);
  console.log(`🧪 Similar HTML Fingerprint: ${testFingerprint2}`);
  console.log(`🔍 Structure Match: ${testFingerprint === testFingerprint2 ? '✅ SAME' : '❌ DIFFERENT'}`);
}

// Test improved HTML to Markdown conversion
function testMarkdownConversion() {
  console.log('\n--- Testing HTML to Markdown Conversion ---');

  const testCases = [
    {
      name: 'Complex nested HTML',
      html: `<div class="complex-class"><h2>Test Header</h2><p>This is a <strong>bold</strong> paragraph with <code>code</code>.</p><ul><li>Item 1</li><li>Item 2</li></ul></div>`
    },
    {
      name: 'Code blocks',
      html: `<pre><code class="language-bash">nix-env --set-flag priority 10 nixpkgs</code></pre>`
    },
    {
      name: 'Links and images',
      html: `<p>Check out <a href="https://example.com">this link</a> and <img src="test.jpg" alt="test image">.</p>`
    }
  ];

  // Simple HTML to Markdown function for testing
  function simpleHtmlToMarkdown(html) {
    return html
      .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (match, level, content) => {
        const hashes = '#'.repeat(parseInt(level));
        return `${hashes} ${content}\n\n`;
      })
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '\n```\n$1\n```\n')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
      .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
        const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
        return items.map(item =>
          '- ' + item.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '$1').replace(/<[^>]+>/g, '')
        ).join('\n') + '\n\n';
      })
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<[^>]+>/g, '')
      .trim();
  }

  testCases.forEach((testCase, index) => {
    console.log(`\n🧪 Test Case ${index + 1}: ${testCase.name}`);
    console.log(`📝 Input HTML: ${testCase.html.substring(0, 100)}...`);

    const markdown = simpleHtmlToMarkdown(testCase.html);
    console.log(`📄 Output Markdown: ${markdown}`);
  });
}

// Run all tests
try {
  testDeduplication();
  testMarkdownConversion();
  console.log('\n🎉 All tests completed successfully!');
} catch (error) {
  console.error('❌ Test failed:', error);
}

console.log('\n=== Test Complete ===');
console.log('💡 To run: Copy and paste this script in the browser console on a DuckDuckGo AI chat page');
