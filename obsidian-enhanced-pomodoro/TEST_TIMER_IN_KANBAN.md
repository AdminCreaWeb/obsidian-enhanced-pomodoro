# Test Guide: Timer Display in Kanban File

## Feature Overview
Tasks now automatically show their timer directly in the Kanban markdown file:
- **Format**: `Task Name - 🍎 1:23 #tags`
- Updates every 5 seconds while timer is running
- Preserves tags and formatting
- Shows final time when switching tasks

## Setup
1. Go to **Settings → Enhanced Pomodoro**
2. Enable **"Update timer in Kanban file"** toggle
3. Make sure **Kanban Integration** is enabled
4. Select a Kanban board

## Testing Steps

### Basic Timer Display
1. Select any task in the sidebar
2. Start the timer (click Play button)
3. Wait 5+ seconds
4. Open the Kanban file directly
5. **Expected**: Task should show `- 🍎 0:05` or similar

### Timer Updates
1. Let timer run for 1 minute
2. Check the Kanban file
3. **Expected**: Timer should show `- 🍎 1:00` or higher

### Task Switching
1. Work on Task A for 30 seconds
2. Switch to Task B
3. Check Task A in Kanban file
4. **Expected**: Task A preserves its timer (e.g., `- 🍎 0:30`)

### Tags Preservation
1. Select a task with tags: `Task Name #tag1 #tag2`
2. Run timer for 10 seconds
3. Check Kanban file
4. **Expected**: `Task Name - 🍎 0:10 #tag1 #tag2`

### Completed Tasks
1. Check a task's checkbox
2. Task moves to Done column (if auto-move enabled)
3. Check Kanban file
4. **Expected**: Timer preserved in Done column

### Disable Feature
1. Turn off **"Update timer in Kanban file"**
2. Run timer on a new task
3. **Expected**: No timer appears in Kanban file

## Console Logs
Open Developer Console (Cmd+Option+I) to see:
```
[KANBAN UPDATE] Task timer updated in file: Task Name → 1:23
[KANBAN UPDATE] Updated line: - [ ] Task Name - 🍎 1:23 #tag
```

## Known Behaviors
- Updates are debounced (max every 5 seconds)
- Final time is saved when switching tasks
- Timer format: M:SS (no leading zeros for minutes)
- Emoji: 🍎 (Pomodoro tomato)
