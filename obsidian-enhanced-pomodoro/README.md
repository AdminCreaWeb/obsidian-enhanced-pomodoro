# Enhanced Pomodoro Timer for Obsidian

A powerful Pomodoro timer plugin with deep Kanban integration, custom schedules, visual circular timer, and comprehensive task tracking.

![Enhanced Pomodoro Timer](https://img.shields.io/badge/Obsidian-Plugin-purple)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🍅 Visual Circular Timer
- **SVG-based circular progress indicator** in the sidebar
- **Real-time countdown** with mode display (Work/Short Break/Long Break)
- **Draggable endpoint** for time adjustment (debug mode)
- **Status bar integration** with click-to-toggle

### 📋 Deep Kanban Integration
- **Select any Kanban board** from dropdown
- **Task list in sidebar** grouped by columns
- **Click to track time** on specific tasks
- **Auto-move tasks** between columns (Todo → In Progress → Done)
- **Task timers displayed** directly in Kanban file (`Task - 🍎 25:30`)
- **Right-click context menus** for quick actions

### ⏱️ Custom Schedules
- **Per-board custom schedules** - each Kanban board can have its own
- **Flexible phase sequences** - Work, Short Break, Long Break in any order
- **Phase reordering** with arrow buttons (↑↓)
- **Start with any phase** - timer respects first phase of schedule
- **Auto-reset on changes** - timer updates immediately when schedule is modified

### 🎯 Task Tracking
- **Active task display** under timer with 🎯 icon
- **Quick scroll buttons** for column navigation
- **Quick add task** inline input in each column
- **Keyboard navigation** (Arrow keys, Enter, Space, M for move)
- **Priority indicators** - auto-detect from !!!, #high, p1, urgent keywords
- **Persistent task timers** across sessions

### 🔊 Sound Controls
- **Mute button in sidebar** - quick toggle (🔊/🔇)
- **Mute toggle in settings** - synced with sidebar
- **Distinct sounds** for short break, long break, and work start
- **Sound preview** in settings

### 📅 Calendar Integration
- **Mini calendar view** for date selection
- **Daily Kanban files** auto-created
- **Sync tasks to daily notes**

## 📥 Installation

### From Community Plugins (Recommended)
1. Open Obsidian Settings → Community plugins
2. Browse and search for "Enhanced Pomodoro Timer"
3. Click Install, then Enable

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create folder: `your-vault/.obsidian/plugins/enhanced-pomodoro-timer/`
3. Copy downloaded files into that folder
4. Reload Obsidian and enable the plugin in Settings → Community plugins

## 🚀 Quick Start

1. **Open the timer sidebar** - Click the tomato icon in the left ribbon or use command palette
2. **Select a Kanban board** - Use the dropdown to choose your task board
3. **Click a task** - Select what you're working on
4. **Press Play** - Start your Pomodoro session
5. **Work!** - Timer tracks time automatically

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` / `P` | Play/Pause timer |
| `R` | Reset timer |
| `S` | Start new session |
| `↑` / `↓` or `j` / `k` | Navigate tasks |
| `Enter` | Start timer on selected task |
| `Space` | Toggle task completion |
| `M` | Move task to next column |

## ⚙️ Configuration

Access settings via **Settings → Enhanced Pomodoro Timer**:

### Timer Settings
- **Work Duration**: 1-60 minutes (default: 25)
- **Short Break**: 1-30 minutes (default: 5)
- **Long Break**: 5-60 minutes (default: 15)
- **Auto-start next session**: Toggle

### Kanban Settings
- **Kanban Board**: Select your task board
- **Auto-move to Progress**: When task selected
- **Auto-move to Done**: When task completed
- **Update timer in file**: Show timer in Kanban markdown

### Board-Specific Settings
- **Main Column Mapping**: Set which columns are Todo/Progress/Done
- **Column Order**: Customize sidebar column display
- **Custom Schedule**: Create per-board phase sequences

### Sound Settings
- **Mute All Sounds**: Global mute toggle
- **Quick Break Sound**: Select sound for quick breaks
- **Test buttons**: Preview all sounds

## 🔧 Commands

Available in Command Palette (`Ctrl/Cmd + P`):

- `Start Pomodoro` - Start a new work session
- `Pause/Resume Pomodoro` - Toggle pause state
- `Reset Pomodoro` - Reset timer to beginning
- `Start Quick Break` - Take a short break (resumes after)
- `End Current Cycle` - Complete current phase early

## 📝 Session Logging

Sessions are logged to `Pomodoro Log.md` (configurable):

```markdown
🍅 WORK STARTED
   📅 2026-01-08 14:30
   ⏱️ 25 min session

✅ WORK COMPLETE
   📅 2026-01-08 14:55
   🎯 Task: Implement feature X
```

## 🤝 Credits

Based on [obsidian-pomodoro-timer](https://github.com/eatgrass/obsidian-pomodoro-timer) by eatgrass.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🐛 Issues & Feedback

Found a bug or have a suggestion? Please open an issue on [GitHub](https://github.com/AdminCreaWeb/obsidian-enhanced-pomodoro/issues).
