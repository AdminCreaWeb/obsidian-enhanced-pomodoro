# Enhanced Pomodoro Timer - Git Change Log

## Recent Changes (Nov 18-19, 2025 - Session 11)

### Latest Commit: Fix infinite update loop for completed tasks
**Date:** Nov 19, 2025 10:18am  
**Issue:** Completed tasks were triggering infinite Kanban file updates

**Fixes:**
- Added check in `updateTaskInKanbanFile` to skip completed tasks
- Added check in `updateActiveTaskTimer` to skip completed tasks  
- Clear `activeTaskId` when task is marked complete via checkbox
- Prevent timer updates from running on completed tasks

### Previous Commit: Fix pause display, settings layout, and timer persistence
**Date:** Nov 19, 2025 9:31am  
**Issues Fixed:**
1. Timer showed [0:00] when paused instead of accumulated time
2. Empty button in settings between "Break Sounds" sections
3. Timer reset to 0:00 when task restored via drag & drop

**Solutions:**
- Added `resumeTaskTimer()` method to reset `lastUpdateTime` on resume
- Fixed `pauseTaskTimer()` to work when timer is not running
- Parse timer patterns from Kanban file (e.g., "Task - 🍎 25:30")
- Store parsed timers in `taskTimersByText` map

### Earlier Commit: Add quick break pause/resume and task completion logging
**Date:** Nov 18, 2025 5:04pm  
**Features:**
- Added `pauseTaskTimer()` method for proper pause/resume during quick breaks
- Task completion logging to both Kanban file and dedicated log file
- Final timer value updated in Kanban file when task is completed

### Earlier Commit: Fix multiple task selection and timer persistence
**Date:** Nov 18, 2025 (earlier)  
**Fixes:**
1. Multiple tasks showing selected (purple border) - Fixed DOM classList methods
2. Timer persistence when tasks move between columns - Dual tracking with Maps
3. Added `taskTimersByText` Map for better timer persistence

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