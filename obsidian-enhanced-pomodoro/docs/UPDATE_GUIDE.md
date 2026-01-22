# 🔄 Plugin Update Workflow

A quick reference guide for updating the Enhanced Pomodoro Timer plugin.

---

## 1. Make Code Changes

Edit files in `src/` as needed. Key files:

| File                       | Purpose                                 |
| -------------------------- | --------------------------------------- |
| `src/main.ts`              | Core plugin logic, settings, status bar |
| `src/CircularTimerView.ts` | Sidebar UI                              |

---

## 2. Build & Test

```bash
cd /Users/kirikou/Development/Coding/JavascriptProjects/obsidian-enhanced-pomodoro
npm run build
```

This compiles TypeScript → `main.js`. Reload Obsidian (**Cmd+R**) to test.

---

## 3. Update Version

Edit `manifest.json`:

```json
"version": "1.0.X",
```

Bump the version number appropriately.

---

## 4. Update Documentation (Optional)

- `DEVELOPMENT_STATUS.md` - Add changelog entry
- `README.md` - If new features need user docs

---

## 5. Commit & Push

```bash
git add .
git commit -m "feat: Description of changes"
git push origin my-own-latest-edits
```

### Commit Message Prefixes

| Prefix      | Use For            |
| ----------- | ------------------ |
| `feat:`     | New feature        |
| `fix:`      | Bug fix            |
| `refactor:` | Code cleanup       |
| `docs:`     | Documentation only |

---

## 6. Create GitHub Release

```bash
gh release create 1.0.X main.js manifest.json styles.css \
  --title "v1.0.X - Brief Title" \
  --notes "## Changes
- Feature 1
- Bug fix 2"
```

**Required release assets:** `main.js`, `manifest.json`, `styles.css`

---

## 📋 Quick Reference Commands

| Action         | Command                                                           |
| -------------- | ----------------------------------------------------------------- |
| Build          | `npm run build`                                                   |
| Check status   | `git status`                                                      |
| Stage all      | `git add .`                                                       |
| Commit         | `git commit -m "message"`                                         |
| Push           | `git push origin my-own-latest-edits`                             |
| Create release | `gh release create VERSION FILES --title "TITLE" --notes "NOTES"` |
| List releases  | `gh release list`                                                 |
| Delete release | `gh release delete VERSION`                                       |

---

## 🔧 BRAT Users

BRAT (Beta Reviewers Auto-update Tester) users get updates automatically from GitHub releases. No extra steps needed on your end!

---

## 📁 Project Structure

```
obsidian-enhanced-pomodoro/
├── src/
│   ├── main.ts              # Main plugin file
│   └── CircularTimerView.ts # Sidebar view
├── main.js                  # Compiled output (release asset)
├── manifest.json            # Plugin metadata (release asset)
├── styles.css               # Plugin styles (release asset)
├── package.json             # Dependencies
├── README.md                # User documentation
└── DEVELOPMENT_STATUS.md    # Development changelog
```
