# Auto-Move Testing Guide

## Test Steps:

1. **Open Obsidian** with the Enhanced Pomodoro plugin
2. **Go to Settings** → Enhanced Pomodoro → Kanban Auto-Move Settings
3. **Ensure all toggles are ON**:
   - Auto-move to Progress ✅
   - Auto-move completed to Done ✅
   - Restrict to Progress tasks only ❌ (leave OFF for now)

4. **Open a Kanban board** with columns like:
   - 📝 Backlog
   - 📋 To Do  
   - 🚧 In Progress
   - ✅ Done

5. **Test Selection Auto-Move**:
   - Click on a task in "Backlog" or "To Do"
   - Should see: Task moves to "In Progress"
   - Should see: Notification "Task moved to 'In Progress'"
   - Should see: Sidebar scrolls to show "In Progress" column

6. **Test Checkbox Auto-Move**:
   - Check the checkbox of any uncompleted task
   - Should see: Task moves to "Done"
   - Should see: Notification "Task moved to 'Done'"
   - Should see: Task marked as [x] in file

## Debug Console Commands:

Open Developer Console (Ctrl+Shift+I or Cmd+Option+I) and look for:
- `[MOVE TASK]` logs showing task detection
- `[SCROLL]` logs showing scroll attempts
- `[AUTO-MOVE]` logs showing post-move selection

## Current Implementation:

✅ Settings toggles added
✅ Column detection with keywords
✅ Task movement logic
✅ Scroll-to-column functionality
✅ Warning messages for edge cases
✅ Basic drag & drop visual feedback

## Known Keywords:

**Progress Columns:**
- "in progress"
- "phase progress"
- "current tasks"
- "phase completion"
- "doing"
- "progress"

**Done Columns:**
- "✅ done"
- "done"
- "phase - done"
- "completed"
- "code improvements completed"
- "finished"
