# Enhanced Pomodoro for Obsidian

A feature-rich Pomodoro timer plugin for Obsidian with enhanced logging and debugging capabilities.

## Features

- 🕒 Customizable work and break durations
- 📝 Session logging to a custom file
- 🔍 Debug mode for development
- 🔄 Auto-start next session option
- 📊 Status bar integration
- 🎨 Clean, minimal interface

## Installation

1. Clone this repository to your Obsidian vault's plugins folder:
   ```
   cd your-vault/.obsidian/plugins
   git clone https://github.com/yourusername/obsidian-enhanced-pomodoro.git
   ```

2. Install dependencies:
   ```
   cd obsidian-enhanced-pomodoro
   npm install
   ```

3. Build the plugin:
   ```
   npm run build
   ```

4. Enable the plugin in Obsidian's settings under "Community plugins".

## Usage

- Click the tomato 🍅 icon in the status bar to start a Pomodoro session
- Use the commands in the command palette:
  - "Start Pomodoro" - Start a new session
  - "Pause/Resume Pomodoro" - Toggle pause state
  - "Reset Pomodoro" - Reset the current session

## Configuration

Access settings via Obsidian's settings panel:

- Work Duration: Length of work sessions (1-60 minutes)
- Short Break: Length of short breaks (1-30 minutes)
- Long Break: Length of long breaks (5-60 minutes)
- Auto-start: Automatically start the next session
- Debug Mode: Enable debug features
- Log File: Custom path for session logs

## Development

1. Run `npm run dev` to start the development build with hot-reloading
2. Make your changes in `src/main.ts`
3. Test in Obsidian (enable developer tools for console output)

## License

MIT
