# Git Tracking Best Practices

## When **renaming** a folder:
```bash
# Use git mv instead of regular rename (preserves history)
git mv old-folder-name new-folder-name
git commit -m "Rename folder from old-name to new-name"
```

## When **creating** a new folder:
```bash
# After creating the folder and adding files:
git add new-folder-name/
git commit -m "Add new-folder-name project"
```

## When **copying** an existing project to a new folder:
```bash
# Copy files, then add to git
cp -r old-folder new-folder
git add new-folder/
git commit -m "Create new-folder based on old-folder"
```

## Quick checklist:
1. **Before renaming** → Use `git mv` not Finder/file manager
2. **After any folder change** → Run `git status` to see untracked files
3. **New folders appear as "Untracked"** → `git add folder/` to start tracking

## Common issue: Lost history after rename

If you renamed a folder outside of git (e.g., via Finder), git sees it as:
- Old folder: **deleted**
- New folder: **untracked** (new)

That's why history is lost. Using `git mv` preserves the file history.

## For version upgrades:

Consider either:
1. **Keep same folder name**, just update version in `manifest.json` (recommended)
2. Or use `git mv` if you really need to rename the folder

## Useful commands:

```bash
# Check what git sees
git status

# See untracked files
git status -u

# Add all files in current directory
git add .

# Add specific folder
git add folder-name/

# Rename with history preserved
git mv old-name new-name

# See file history
git log --follow filename
```
