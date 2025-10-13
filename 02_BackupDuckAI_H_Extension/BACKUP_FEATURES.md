# DuckAI Backup Extension - Enhanced Features

## Overview

This Chrome extension provides advanced backup capabilities for DuckDuckGo AI conversations with intelligent deduplication and improved HTML-to-Markdown conversion.

## Key Features

### 🔍 Intelligent Deduplication

The extension uses multiple methods to prevent duplicate backups:

1. **CSS Fingerprinting**: Extracts unique CSS class combinations from HTML structure
2. **Content Hashing**: Generates hash from title + content for exact duplicate detection
3. **Title Similarity**: Fuzzy matching for similar conversation titles

### 📝 Enhanced HTML-to-Markdown Conversion

Improved conversion that handles:
- Complex nested HTML structures
- Code blocks with syntax preservation
- Lists (ordered and unordered)
- Links and images
- Text formatting (bold, italic, etc.)
- Blockquotes
- Headers with proper markdown levels

### 🗂️ Backup History Management

- **View History**: See all previously backed up conversations
- **Clear History**: Reset deduplication history (allows re-downloading)
- **Duplicate Prevention**: Skip conversations already backed up

## Usage

### Basic Workflow

1. **Load Chat Titles**: Click "Load Chat-titles" to scan current DuckAI page
2. **Select Conversations**: Check boxes for conversations to backup
3. **Download**: Click "Download .md" to create markdown files

### Advanced Features

#### Cache Management
- **Single-click Load**: Uses cached data (expires in 5 minutes)
- **Double-click Load**: Forces fresh scan, bypasses cache
- **Clear Cache**: Manually clear conversation cache

#### Backup History
- **View History**: Shows previously backed up conversations with metadata
- **Clear History**: Removes deduplication history (use with caution)

### File Naming Convention

Generated files use the format:
```
DuckAI_Conversation_YYYYMMDD_HHh_MMm.md
```

Example: `DuckAI_Conversation_20241215_14h_30m.md`

## Technical Details

### CSS Fingerprinting Algorithm

```javascript
function extractCSSFingerprint(htmlContent) {
  // Extracts first 3 significant CSS class combinations
  // Uses first 100 characters of each class string
  // Creates pipe-separated signature: "class1|class2|class3"
}
```

### Content Hashing

```javascript
function generateContentHash(title, content) {
  // Simple hash algorithm for duplicate detection
  // Combines title + content, normalizes whitespace
  // Returns base-36 encoded hash
}
```

### Deduplication Logic

The extension checks for duplicates in this order:
1. Content hash (most reliable)
2. CSS fingerprint (structural similarity)
3. Title similarity (fuzzy matching)

### Metadata Storage

Each backed up conversation stores:
- Title
- Content hash
- CSS fingerprint
- Backup timestamp
- Filename

## File Structure

```
popup/
├── popup.js          # Main extension logic
├── popup.html        # UI interface
└── popup.css         # Styles (embedded in HTML)

lib/
├── jsencrypt.min.js  # RSA encryption library
└── crypto-js.min.js  # AES encryption library

test_deduplication.js # Testing script for fingerprinting
BACKUP_FEATURES.md    # This documentation
```

## Testing

### Manual Testing

1. Run `test_deduplication.js` in browser console on DuckAI page
2. Verify CSS fingerprints are generated correctly
3. Test markdown conversion with sample HTML

### Test Cases

The test script validates:
- CSS fingerprint extraction
- Content hash generation
- HTML-to-Markdown conversion
- Duplicate detection accuracy

## Troubleshooting

### Common Issues

**Problem**: Content appears truncated in markdown
**Solution**: The enhanced HTML parser preserves more content. Check console for errors.

**Problem**: Duplicate conversations still downloading
**Solution**: Clear backup history or check if content has actually changed.

**Problem**: CSS classes not detected
**Solution**: Verify page has loaded completely before running backup.

### Debug Information

Each markdown file includes debug metadata:
- Content hash for deduplication
- CSS fingerprint (first 50 chars)
- Original HTML preview (first 500 chars)

## Storage Usage

The extension uses Chrome's local storage for:
- Conversation cache (5MB typical)
- Backup history (last 100 entries)
- Encryption keys (RSA public key only)

## Security Notes

- Only public RSA keys are stored locally
- Private keys should be stored securely by user
- AES encryption uses random keys for each backup session
- No sensitive conversation data persists beyond cache duration

## Future Enhancements

Potential improvements:
- Export/import backup history
- Batch operations on backup history
- Custom markdown templates
- Integration with cloud storage services
- Advanced search within backed up conversations

## Contributing

When modifying the deduplication logic:
1. Test with `test_deduplication.js`
2. Verify no false positives in duplicate detection
3. Ensure CSS fingerprints remain stable across page reloads
4. Test markdown output readability

## Version History

- **v2.0**: Added intelligent deduplication and enhanced HTML conversion
- **v1.0**: Basic conversation backup functionality