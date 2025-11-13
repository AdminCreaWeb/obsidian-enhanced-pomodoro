# Quick Break Settings

This document outlines the Quick Break feature and its configuration options in the Enhanced Pomodoro plugin.

## Overview
The Quick Break feature allows users to take a short, customizable break at any time during their work session. Unlike regular Pomodoro breaks, quick breaks are not logged and can be started on demand.

## Settings

### Enable Quick Breaks
- **Type**: Toggle (On/Off)
- **Default**: On
- **Description**: When enabled, a quick break button will be visible in the timer interface.
- **Effect**: Toggling this setting will show/hide the quick break button in the timer view.

### Quick Break Duration
- **Type**: Slider (1-15 minutes)
- **Default**: 5 minutes
- **Description**: Sets the duration of the quick break.
- **Note**: This setting is only active when "Enable Quick Breaks" is toggled on.

### Quick Break Sound
- **Type**: Dropdown
- **Options**:
  - Default Bell
  - Chime
  - Ding
  - None (no sound)
- **Default**: Default Bell
- **Description**: Selects the sound that plays when the quick break ends.
- **Note**: This setting is only active when "Enable Quick Breaks" is toggled on.

## Usage
1. Click the quick break button (clock icon) in the timer interface.
2. The timer will start counting down from your configured quick break duration.
3. When the break ends, the selected sound will play (if not set to "None").
4. The timer will automatically return to your previous state (work/break).

## Technical Notes
- Quick breaks do not affect your Pomodoro session count.
- The quick break timer can be paused/resumed like regular timers.
- No session data is logged for quick breaks.

## Example Configuration
```typescript
{
  "enableQuickBreak": true,
  "quickBreakDuration": 5,
  "quickBreakSound": "default"
}
```

## Version History
- **v1.0.0**: Initial implementation (October 2025)
