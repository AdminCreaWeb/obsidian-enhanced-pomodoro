# Testing Guide - Enhanced Pomodoro Timer

## Setup

1. **Reload the Plugin in Obsidian**
   - Open Settings → Community Plugins
   - Find "Enhanced Pomodoro"
   - Toggle it OFF then ON
   - Or use Ctrl+R (Cmd+R on Mac) to reload Obsidian

2. **Open the Timer**
   - Click the timer icon (⏲️) in the left ribbon
   - Or use Command Palette: "Show Timer"
   - Timer should appear in the right sidebar

## What to Test

### 1. Visual Display ✓
- [ ] Timer appears centered in sidebar (not at top)
- [ ] Circular timer with outer ring and inner circle
- [ ] Time displays in MM:SS format (e.g., "25:00")
- [ ] Mode text shows "Work" or "Break"
- [ ] Timer is 300px max and responsive

### 2. Click Interactions (JUST FIXED - NEEDS TESTING!)

#### Center Click (Play/Pause)
- [ ] Click the center of the timer circle
- [ ] Inner circle should change color (lighter when running)
- [ ] Timer should start counting down
- [ ] Icon should change: ▶️ (play) ↔️ ⏸ (pause)
- [ ] Click again to pause

#### Edge Click (Reset)
- [ ] Click near the outer edge of the timer
- [ ] Timer should reset to default time (25:00 for work)
- [ ] Progress arc should reset to start

#### Status Bar Click
- [ ] Click the status bar text (bottom of Obsidian)
- [ ] Should toggle play/pause like center click
- [ ] Status bar shows emoji and timer info

### 3. Keyboard Shortcuts
- [ ] Press **Space** or **P** → Toggle play/pause
- [ ] Press **R** → Reset timer
- [ ] Press **S** → Start new session (if not running)
- [ ] Shortcuts should NOT work when typing in editor

### 4. Timer Functionality
- [ ] Timer counts down properly (1 second intervals)
- [ ] Work session: Default 25 minutes
- [ ] After work: Switches to break automatically
- [ ] Break session: Default 5 minutes (short) or 15 (long)
- [ ] After 4 work sessions: Long break instead of short

### 5. Debug Mode (Advanced)

**Enable Debug Mode:**
- Settings → Enhanced Pomodoro → Enable Debug Mode

**Test Dragging:**
- [ ] "Drag to adjust time" text appears at bottom
- [ ] Click and drag anywhere on the timer circle
- [ ] Progress arc should follow your mouse
- [ ] Time should update as you drag
- [ ] Useful for testing without waiting 25 minutes!

**Note**: When debug mode is ON, normal clicking is disabled (only drag works)

### 6. Settings
- [ ] Settings → Enhanced Pomodoro
- [ ] Change work duration (e.g., to 1 minute for quick testing)
- [ ] Change short break duration
- [ ] Change long break duration
- [ ] Toggle debug mode
- [ ] Change log file path
- [ ] Sessions before long break (default: 4)

### 7. Responsive Behavior
- [ ] Resize Obsidian window
- [ ] Timer should scale smoothly
- [ ] Max size: 300px
- [ ] Min size: Adjusts to sidebar width
- [ ] Always centered in sidebar

## Quick Test Sequence

1. Open timer (ribbon icon)
2. Set work duration to **1 minute** in settings (for fast testing)
3. Click center of timer → starts countdown
4. Watch for 10 seconds → verify countdown
5. Click center again → pauses
6. Click outer edge → resets to 1:00
7. Press **Space** → starts timer
8. Press **R** → resets
9. Click status bar → toggles play/pause

## Troubleshooting

### Timer Doesn't Appear
- Check if right sidebar is open
- Look for "Pomodoro Timer" tab
- Try closing and reopening with ribbon icon

### Clicks Don't Work
- Make sure debug mode is **OFF** (regular clicks disabled in debug mode)
- Check browser console for errors (Ctrl+Shift+I / Cmd+Option+I)
- Try clicking exactly in the center or on the outer ring

### Timer Shows Wrong Text
- If debug mode is ON, you'll see "Drag to adjust time"
- This is normal! Turn off debug mode if you don't need it

### Numbers Don't Update
- Check if timer is actually running (play icon vs pause icon)
- Try resetting and starting again
- Check console for JavaScript errors

## Expected Behavior Summary

| Action | Expected Result |
|--------|----------------|
| Open timer | Appears in right sidebar, centered |
| Click center | Play/pause toggle |
| Click edge | Reset to default time |
| Drag (debug on) | Adjust time by dragging |
| Space/P key | Play/pause |
| R key | Reset |
| S key | Start (if not running) |
| Status bar click | Play/pause |
| Timer ends | Auto-switch to break (or work) |

## Report Issues

If something doesn't work as expected:
1. Note what you clicked/pressed
2. What happened vs. what you expected
3. Any error messages in console
4. Current settings (work duration, debug mode, etc.)
