
## Quick Reference Card:
``` bash
git status → What files changed?
git diff → What exactly changed in those files?
git diff --stat → Quick summary with numbers
git log → History of your commits
```

## More in depth

### Quick View of All Changes:
``` bash
# See which files you've modified (summary view)
git status

# See all actual code changes line-by-line
git diff

# See changes in a specific file
git diff src/main.ts

# See summary of changes (just file names and line counts)
git diff --stat
```

### Most Useful Commands for Beginners:
``` bash
# 1. Before you start editing - check current state
git status

# 2. While editing - see what you changed
git diff

# 3. See changes in just modified files (not new/untracked)
git diff --name-only

# 4. See a compact summary with file names + lines changed
git diff --stat --color
```

Pro Tips:
``` bash
# See changes in a prettier, side-by-side format (if available)
git diff --color-words

# Save your changes before experimenting (create a branch)
git checkout -b my-experiment

# Go back to main branch
git checkout main

# See history of commits (if any)
git log --oneline --graph
```

### Recommended Workflow for Learning:
``` bash
# 1. Check status before starting
git status

# 2. Make your changes in the code

# 3. See what you changed
git diff

# 4. If you like the changes, stage them
git add src/main.ts  # or git add . for all files

# 5. Commit with a message
git commit -m "My description of changes"
```

### 6. See your commit history
``` bash
    git log --oneline
```