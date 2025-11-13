import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, Workspace, PluginManifest, TFile } from 'obsidian';

// Extend the App interface to include the plugins property
declare module 'obsidian' {
  interface App {
    plugins: {
      plugins: {
        'obsidian-kanban'?: {
          // Add any specific methods or properties you need from the Kanban plugin
        };
        [key: string]: any;
      };
      getPlugin: (id: string) => any;
    };
  }
}
import { CircularTimerView, CIRCULAR_TIMER_VIEW } from './CircularTimerView';

interface TimeSchedule {
  id: string;
  name: string;
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  autoStartNext: boolean;
  enableQuickBreak: boolean;
  quickBreakDuration: number;
  quickBreakSound: string;
  isDefault?: boolean;
}

interface EnhancedPomodoroSettings {
  // Current active schedule ID
  currentScheduleId: string;
  // List of all schedules
  schedules: TimeSchedule[];
  // Legacy settings (for backward compatibility)
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  autoStartNext: boolean;
  debugMode: boolean;
  logFile: string;
  // Path to the selected Kanban board
  kanbanBoardPath: string;
  currentTask: string | null;
  enableQuickBreak: boolean;
  quickBreakDuration: number;
  quickBreakSound: string;
  kanbanIntegration: boolean;
}

const DEFAULT_SETTINGS: EnhancedPomodoroSettings = {
  // Default schedule (legacy settings will be migrated to this)
  currentScheduleId: 'default',
  schedules: [
    {
      id: 'default',
      name: 'Default Schedule',
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      autoStartNext: true,
      enableQuickBreak: true,
      quickBreakDuration: 5,
      quickBreakSound: 'default',
      isDefault: true
    }
  ],
  // Legacy settings (will be migrated on first load)
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  kanbanIntegration: true,
  autoStartNext: true,
  debugMode: false,
  logFile: 'Pomodoro Log.md',
  kanbanBoardPath: '', // Empty means no Kanban board is selected
  currentTask: null,
  enableQuickBreak: true,
  quickBreakDuration: 5,
  quickBreakSound: 'default'
};

export default class EnhancedPomodoro extends Plugin {
  settings: EnhancedPomodoroSettings = DEFAULT_SETTINGS;
  statusBarText: HTMLElement | null = null;
  timerInterval: number | null = null;
  timeRemaining: number = 0;
  isRunning: boolean = false;
  currentMode: 'work' | 'shortBreak' | 'longBreak' = 'work';
  sessionsCompleted: number = 0;

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async onload() {
    console.log('Loading Enhanced Pomodoro plugin...');
    
    try {
      // Load settings first
      await this.loadSettings();
      
      // Initialize timeRemaining with current schedule's work duration
      const currentSchedule = this.getCurrentSchedule();
      this.timeRemaining = currentSchedule.workDuration * 60;
      
      // Register the view
      this.registerView(
        CIRCULAR_TIMER_VIEW,
        (leaf) => new CircularTimerView(leaf, this)
      );
      
      // Add status bar item
      this.statusBarText = this.addStatusBarItem();
      if (this.statusBarText) {
        this.statusBarText.addClass('clickable');
        this.statusBarText.onClickEvent(() => this.togglePause());
        this.updateStatusBar();
      }
      
      // Add ribbon icon
      this.addRibbonIcon('timer', 'Show Pomodoro Timer', () => {
        this.activateView();
      });
      
      // Add commands
      this.addCommand({
        id: 'start-pomodoro',
        name: 'Start Pomodoro',
        callback: () => this.startPomodoro()
      });
      
      this.addCommand({
        id: 'pause-pomodoro',
        name: 'Pause/Resume Pomodoro',
        callback: () => this.togglePause()
      });
      
      this.addCommand({
        id: 'reset-pomodoro',
        name: 'Reset Pomodoro',
        callback: () => this.resetTimer()
      });
      
      this.addCommand({
        id: 'show-timer',
        name: 'Show Timer',
        callback: () => this.activateView()
      });

      // Set up settings tab
      this.addSettingTab(new EnhancedPomodoroSettingTab(this.app, this));
      
      // Initialize Kanban integration if enabled
      if (this.settings.kanbanIntegration) {
        this.setupKanbanIntegration();
      }
      
      console.log('Enhanced Pomodoro plugin loaded successfully');
    } catch (error) {
      console.error('Error loading Enhanced Pomodoro plugin:', error);
      new Notice('Failed to load Enhanced Pomodoro plugin. Check console for details.');
    }
  }
  
  async loadSettings() {
    try {
      // Load settings and merge with defaults
      const loadedSettings = await this.loadData();
      this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedSettings);
      
      // Ensure all required settings exist
      if (!this.settings.schedules || this.settings.schedules.length === 0) {
        this.settings.schedules = [...DEFAULT_SETTINGS.schedules];
      }
      
      if (!this.settings.currentScheduleId) {
        this.settings.currentScheduleId = DEFAULT_SETTINGS.currentScheduleId;
      }
      
      // Migrate legacy settings if needed
      await this.migrateLegacySettings();
      
      // Save settings to ensure any new defaults are persisted
      await this.saveSettings();
    } catch (error) {
      console.error('Error loading settings, using defaults:', error);
      this.settings = { ...DEFAULT_SETTINGS };
      await this.saveSettings();
    }
  }
  
  /**
   * Migrates legacy settings to the new schedule-based system
   */
  private async migrateLegacySettings() {
    // Only migrate if we have legacy settings and no custom schedules yet
    if (this.settings.workDuration !== undefined && this.settings.schedules.length === 1 && this.settings.schedules[0].isDefault) {
      console.log('Migrating legacy pomodoro settings to schedule-based system');
      
      // Update the default schedule with legacy settings
      this.settings.schedules[0] = {
        ...this.settings.schedules[0],
        workDuration: this.settings.workDuration,
        shortBreakDuration: this.settings.shortBreakDuration,
        longBreakDuration: this.settings.longBreakDuration,
        autoStartNext: this.settings.autoStartNext,
        enableQuickBreak: this.settings.enableQuickBreak,
        quickBreakDuration: this.settings.quickBreakDuration,
        quickBreakSound: this.settings.quickBreakSound
      };
      
      // Save the updated settings
      await this.saveSettings();
    }
  }
  
  /**
   * Gets the current active schedule
   */
  getCurrentSchedule(): TimeSchedule {
    const schedule = this.settings.schedules.find(s => s.id === this.settings.currentScheduleId);
    if (!schedule) {
      // Fallback to default schedule if current schedule is not found
      return this.settings.schedules[0];
    }
    return schedule;
  }
  
  /**
   * Gets a schedule by ID
   */
  getSchedule(scheduleId: string): TimeSchedule | undefined {
    return this.settings.schedules.find(s => s.id === scheduleId);
  }
  
  /**
   * Adds a new schedule
   */
  async addSchedule(schedule: Omit<TimeSchedule, 'id'>): Promise<TimeSchedule> {
    const newSchedule = {
      ...schedule,
      id: `schedule-${Date.now()}` // Simple ID generation
    };
    
    this.settings.schedules.push(newSchedule);
    await this.saveSettings();
    return newSchedule;
  }
  
  /**
   * Updates an existing schedule
   */
  async updateSchedule(scheduleId: string, updates: Partial<TimeSchedule>): Promise<boolean> {
    const index = this.settings.schedules.findIndex(s => s.id === scheduleId);
    if (index === -1) return false;
    
    this.settings.schedules[index] = {
      ...this.settings.schedules[index],
      ...updates
    };
    
    await this.saveSettings();
    return true;
  }
  
  /**
   * Deletes a schedule
   */
  async deleteSchedule(scheduleId: string): Promise<boolean> {
    if (this.settings.schedules.length <= 1) {
      // Don't delete the last schedule
      return false;
    }
    
    const index = this.settings.schedules.findIndex(s => s.id === scheduleId);
    if (index === -1) return false;
    
    this.settings.schedules.splice(index, 1);
    
    // If the deleted schedule was the current one, switch to the first available schedule
    if (this.settings.currentScheduleId === scheduleId) {
      this.settings.currentScheduleId = this.settings.schedules[0].id;
    }
    
    await this.saveSettings();
    return true;
  }
  
  /**
   * Switches to a different schedule
   */
  async switchSchedule(scheduleId: string): Promise<boolean> {
    if (!this.settings.schedules.some(s => s.id === scheduleId)) {
      return false;
    }
    
    // Pause current timer if running
    const wasRunning = this.isRunning;
    if (wasRunning) {
      await this.togglePause();
    }
    
    // Switch schedule
    this.settings.currentScheduleId = scheduleId;
    await this.saveSettings();
    
    // Reset timer with new schedule
    this.resetTimer();
    
    // Restart timer if it was running
    if (wasRunning) {
      await this.togglePause();
    }
    
    return true;
  }
  
  async saveSettings() {
    await this.saveData(this.settings);
  }
  
  async startPomodoro() {
    if (this.isRunning) return;
    
    const schedule = this.getCurrentSchedule();
    this.timeRemaining = schedule.workDuration * 60;
    this.currentMode = 'work';
    this.isRunning = true;
    this.startTimer();
    await this.logSession('start');
  }

  async startQuickBreak() {
    // Save current state
    const wasRunning = this.isRunning;
    const previousMode = this.currentMode;
    const previousTime = this.timeRemaining;
    const schedule = this.getCurrentSchedule();

    // Stop any running timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // Check if quick break is enabled in the current schedule
    if (!schedule.enableQuickBreak) {
      new Notice('Quick break is disabled in the current schedule');
      return;
    }

    // Set quick break duration from schedule
    this.timeRemaining = schedule.quickBreakDuration * 60;
    this.currentMode = 'shortBreak';
    this.isRunning = true;
    
    // Update the UI
    this.updateStatusBar();
    
    // Play notification sound if enabled
    if (this.settings.quickBreakSound && this.settings.quickBreakSound !== 'none') {
      this.playSound(this.settings.quickBreakSound);
    }
    
    // Show notification
    new Notice(`Starting ${this.settings.quickBreakDuration} minute quick break`);
    
    // Start the timer
    this.startTimer();
    
    // When break ends, restore previous state
    const onComplete = () => {
      // Remove this listener first to prevent multiple triggers
      this.app.workspace.off('pomodoro:timer-complete', onComplete);
      
      // Play sound when break ends
      if (this.settings.quickBreakSound && this.settings.quickBreakSound !== 'none') {
        this.playSound(this.settings.quickBreakSound);
      }
      
      // Show completion notice
      new Notice('Quick break is over!');
      
      // Restore previous state
      if (wasRunning) {
        this.currentMode = previousMode;
        this.timeRemaining = previousTime;
        this.isRunning = true;
        this.startTimer();
      } else {
        this.resetTimer();
      }
    };
    
    // Store the onComplete handler so we can remove it later
    this.registerEvent(this.app.workspace.on('quit', onComplete));
  }
  
  private playSound(sound: string) {
    try {
      if (sound === 'default') {
        // Use browser's built-in notification sound
        const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + 
          'BmOGRmYjMzM2MxMDFjMWUwYTA2M2QyN2IxZGNkNDFjYTIzMDAwMDAwMDAwMDAwMD' + 
          'AwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAw' + 
          'MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA' + 
          'wMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA' + 
          'wMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAw' + 
          'MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM' + 
          'DAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM');
        audio.volume = 0.5;
        audio.play().catch(e => console.error('Error playing sound:', e));
      } else if (sound.startsWith('http') || sound.startsWith('data:audio')) {
        // Play from URL or data URL
        const audio = new Audio(sound);
        audio.volume = 0.5;
        audio.play().catch(e => console.error('Error playing sound:', e));
      } else {
        // Try to play from vault path
        const file = this.app.vault.getAbstractFileByPath(sound);
        // Check if the file exists and is actually a file (not a folder)
        if (file && 'extension' in file && (file as any).extension) {
          const url = this.app.vault.getResourcePath(file as TFile);
          const audio = new Audio(url);
          audio.volume = 0.5;
          audio.play().catch(e => console.error('Error playing sound:', e));
        }
      }
    } catch (e) {
      console.error('Error playing notification sound:', e);
    }
  }
  
  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.timerInterval = window.setInterval(() => {
      if (!this.isRunning) return;
      
      this.timeRemaining--;
      this.updateStatusBar();
      
      // Check if timer has reached zero
      if (this.timeRemaining <= 0) {
        clearInterval(this.timerInterval!);
        this.isRunning = false;
        this.timeRemaining = 0;
        this.updateStatusBar();
        
        // Trigger timer complete event
        this.app.workspace.trigger('pomodoro:timer-complete');
        
        // Handle completion based on current mode
        if (this.currentMode === 'work') {
          this.completeSession();
        } else {
          // For breaks, just complete the session
          this.completeSession();
        }
      }
      
      if (this.timeRemaining <= 0) {
        this.completeSession();
      }
    }, 1000);
  }
  
  async togglePause() {
    this.isRunning = !this.isRunning;
    if (this.isRunning) {
      this.startTimer();
      await this.logSession('resume');
    } else {
      if (this.timerInterval) clearInterval(this.timerInterval);
      await this.logSession('pause');
    }
  }
  
  async resetTimer() {
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    // Reset to work mode
    this.currentMode = 'work';
    this.timeRemaining = this.settings.workDuration * 60;
    this.updateStatusBar();
    await this.logSession('reset');
  }
  
  async completeSession() {
  this.isRunning = false;
  if (this.timerInterval) {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  }
  
  const isLongBreak = this.sessionsCompleted % 4 === 0;
  
  if (this.currentMode === 'work') {
    // Only increment sessionsCompleted after a work session
    this.sessionsCompleted++;
    this.currentMode = isLongBreak ? 'longBreak' : 'shortBreak';
    this.timeRemaining = isLongBreak 
      ? this.settings.longBreakDuration * 60 
      : this.settings.shortBreakDuration * 60;
    
    new Notice(`Time for a ${isLongBreak ? 'long' : 'short'} break!`);
    await this.logSession('work_complete');
    
    if (this.settings.autoStartNext) {
      this.startTimer();
    }
  } else {
    // Coming from a break, reset to work mode
    this.currentMode = 'work';
    this.timeRemaining = this.settings.workDuration * 60;
    new Notice('Break is over! Time to work!');
    await this.logSession('break_complete');
  }
}
  
  updateStatusBar(text?: string) {
    if (!this.statusBarText) return;
    
    if (text) {
      this.statusBarText.setText(text);
      return;
    }
    
    // Handle invalid timeRemaining values
    const safeTime = Math.max(0, this.timeRemaining);
    const minutes = Math.floor(safeTime / 60);
    const seconds = Math.floor(safeTime % 60);
    const modeEmoji = this.currentMode === 'work' ? '🍅' : '☕';
    const statusText = this.isRunning ? '' : '(Paused) ';
    
    this.statusBarText.setText(
      `${modeEmoji} ${statusText}${minutes}:${seconds.toString().padStart(2, '0')}`
    );
  }
  
  getTotalTime(): number {
    const schedule = this.getCurrentSchedule();
    switch (this.currentMode) {
      case 'work':
        return schedule.workDuration * 60;
      case 'shortBreak':
        return schedule.shortBreakDuration * 60;
      case 'longBreak':
        return schedule.longBreakDuration * 60;
      default:
        return schedule.workDuration * 60;
    }
  }
  
  async activateView() {
    const { workspace } = this.app;
    
    // Try to find an existing leaf
    const leaves = workspace.getLeavesOfType(CIRCULAR_TIMER_VIEW);
    let leaf = leaves.length > 0 ? leaves[0] : null;

    if (!leaf) {
      // Create a new leaf in the right sidebar
      const newLeaf = workspace.getRightLeaf(false);
      if (!newLeaf) return; // Couldn't create a new leaf
      
      await newLeaf.setViewState({
        type: CIRCULAR_TIMER_VIEW,
        active: true,
      });
      
      // Get the leaf after setting the view state
      const updatedLeaves = workspace.getLeavesOfType(CIRCULAR_TIMER_VIEW);
      leaf = updatedLeaves.length > 0 ? updatedLeaves[0] : null;
    }

    // Bring the leaf into focus if it exists
    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
  
  // Kanban Integration Methods
  private kanbanObserver?: MutationObserver;
  private taskButtons: Map<string, HTMLElement> = new Map();

  async setupKanbanIntegration() {
    // Check if Kanban plugin is installed
    const kanbanPlugin = this.app.plugins.getPlugin('obsidian-kanban');
    if (!kanbanPlugin) {
      console.warn('Kanban plugin not found. Kanban integration will be disabled.');
      return;
    }
    
    // Clean up any existing integration first
    this.removeKanbanIntegration();

    // Add CSS for pomodoro buttons
    this.addKanbanCSS();

    // Set up mutation observer to watch for Kanban task changes
    this.kanbanObserver = new MutationObserver(() => {
      this.refreshKanbanButtons();
    });

    // Observe the entire workspace for Kanban changes
    this.kanbanObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Initial setup of existing Kanban tasks
    this.refreshKanbanButtons();

    new Notice('Kanban integration enabled! 🍅');
  }

  removeKanbanIntegration() {
    if (this.kanbanObserver) {
      this.kanbanObserver.disconnect();
      this.kanbanObserver = undefined;
    }

    // Remove all task buttons
    this.taskButtons.forEach(button => button.remove());
    this.taskButtons.clear();

    // Remove CSS
    this.removeKanbanCSS();
  }

  addKanbanCSS() {
    const styleId = 'pomodoro-kanban-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .kanban-task-item {
        position: relative;
      }

      .pomodoro-task-button {
        position: absolute;
        top: 2px;
        right: 2px;
        background: var(--interactive-accent);
        border: none;
        border-radius: 3px;
        padding: 2px 4px;
        font-size: 10px;
        color: var(--text-on-accent);
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s ease;
        z-index: 1000;
      }

      .pomodoro-task-button:hover {
        opacity: 1;
      }

      .pomodoro-task-button:active {
        transform: scale(0.95);
      }

      .kanban-task-item:hover .pomodoro-task-button {
        opacity: 1;
      }

      .pomodoro-task-log {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--background-modifier-border);
        font-size: 0.8em;
        color: var(--text-muted);
      }

      .pomodoro-session-log {
        margin: 2px 0;
        padding: 2px 4px;
        background: var(--background-modifier-hover);
        border-radius: 2px;
        border-left: 2px solid var(--interactive-accent);
      }
    `;
    document.head.appendChild(style);
  }

  removeKanbanCSS() {
    const style = document.getElementById('pomodoro-kanban-styles');
    if (style) style.remove();
  }

  async addTaskLogs(taskElement: HTMLElement, taskId: string) {
    try {
      // Check if logs already exist for this task
      const existingLogs = taskElement.querySelector('.pomodoro-task-log');
      if (existingLogs) return;

      // Create log container
      const logContainer = document.createElement('div');
      logContainer.className = 'pomodoro-task-log';
      logContainer.style.display = 'none'; // Hidden by default, show on hover or when active

      // Add header
      const logHeader = document.createElement('div');
      logHeader.textContent = '🍅 Pomodoro Sessions:';
      logHeader.style.fontWeight = 'bold';
      logHeader.style.marginBottom = '4px';
      logContainer.appendChild(logHeader);

      taskElement.appendChild(logContainer);
    } catch (error) {
      console.error('Error adding task logs:', error);
    }
  }

  async refreshKanbanButtons() {
    // Clear existing buttons
    this.taskButtons.forEach(button => button.remove());
    this.taskButtons.clear();

    // Get all Kanban views
    const kanbanPlugin = this.app.plugins.getPlugin('obsidian-kanban');
    if (!kanbanPlugin) return;

    // Get all markdown files in the vault
    const markdownFiles = this.app.vault.getMarkdownFiles();
    const kanbanFiles: TFile[] = [];

    // Check each file for Kanban frontmatter
    for (const file of markdownFiles) {
      // Skip if a specific board is selected and this isn't it
      if (this.settings.kanbanBoardPath && 
          file.path !== this.settings.kanbanBoardPath && 
          !file.path.endsWith(this.settings.kanbanBoardPath)) {
        continue;
      }

      try {
        // Read the first few lines of the file to check for Kanban frontmatter
        const content = await this.app.vault.read(file);
        if (content.includes('kanban-plugin:') || 
            content.includes('kanban-plugin: board') ||
            content.includes('---\nkanban-plugin:') ||
            content.includes('---\r\nkanban-plugin:')) {
          kanbanFiles.push(file);
        }
      } catch (error) {
        console.error(`Error reading file ${file.path}:`, error);
      }
    }

    // Process each Kanban board
    for (const file of kanbanFiles) {
      try {
        // Get the Kanban view for this file
        const kanbanView = this.app.workspace.getActiveViewOfType(kanbanPlugin.kanbanViewType);
        if (!kanbanView) continue;
        
        // Find all task items in this board
        const taskItems = kanbanView.containerEl.querySelectorAll('.kanban-task-item');

    taskItems.forEach((taskItem, index) => {
      const taskElement = taskItem as HTMLElement;
      const taskId = `task-${index}-${Date.now()}`;
      const taskText = taskElement.textContent?.trim() || '';

      // Create pomodoro button
      const button = document.createElement('button');
      button.className = 'pomodoro-task-button';
      button.textContent = '🍅';
      button.title = 'Start Pomodoro for this task';
      button.onclick = (e) => {
        e.stopPropagation();
        this.startTaskPomodoro(taskId, taskText, taskElement);
      };

      taskElement.appendChild(button);
      this.taskButtons.set(taskId, button);

          // Add existing pomodoro logs if any
          this.addTaskLogs(taskElement, taskId);
        });
      } catch (error) {
        console.error('Error refreshing Kanban buttons:', error);
      }
    }
  }

  async startTaskPomodoro(taskId: string, taskText: string, taskElement: HTMLElement) {
    try {
      // Set current task
      this.settings.currentTask = taskId;
      await this.saveSettings();

      // Start pomodoro
      this.startPomodoro();

      // Add task context to status bar
      this.updateStatusBar(`${taskText.substring(0, 20)}...`);

      // Log the start of the task
      await this.logSession('start');
      
      // Log to Kanban task
      await this.logToKanbanTask(taskId, 'start', taskElement);

      new Notice(`Started Pomodoro for: ${taskText}`);
    } catch (error) {
      console.error('Error starting task pomodoro:', error);
      new Notice('Error starting Pomodoro session');
    }
  }

  async logSession(action: string) {
    try {
      if (!this.settings.logFile) return;

      const now = new Date();
      const timestamp = now.toISOString();
      const logEntry = `- [${timestamp}] ${action} - Mode: ${this.currentMode} - Time: ${this.formatTime(this.timeRemaining)}\n`;

      // Check if log file exists
      const fileExists = await this.app.vault.adapter.exists(this.settings.logFile);

      if (fileExists) {
        // Append to existing file
        await this.app.vault.adapter.append(this.settings.logFile, logEntry);
      } else {
        // Create new log file with a header
        const header = "# Pomodoro Session Log\n\n";
        await this.app.vault.create(this.settings.logFile, header + logEntry);
      }

      // Also log to Kanban if integration is enabled and we have a current task
      if (this.settings.kanbanIntegration && this.settings.currentTask) {
        await this.logToKanbanTask(this.settings.currentTask, action);
      }
    } catch (error) {
      console.error('Error logging session:', error);
    }
  }

  async logToKanbanTask(taskId: string, action: string, taskElement?: HTMLElement) {
    if (!taskId) return;

    try {
      const now = new Date();
      const timestamp = now.toLocaleString();
      const sessionTime = this.formatTime(this.timeRemaining);

      let logEntry = '';

      switch (action) {
        case 'start':
          logEntry = `🍅 Started: ${timestamp} (${sessionTime})`;
          break;
        case 'pause':
          logEntry = `⏸️ Paused: ${timestamp} (${sessionTime})`;
          break;
        case 'resume':
          logEntry = `▶️ Resumed: ${timestamp} (${sessionTime})`;
          break;
        case 'work_complete':
          logEntry = `✅ Work complete: ${timestamp} (${this.settings.workDuration}min)`;
          break;
        case 'break_complete':
          logEntry = `🔄 Break complete: ${timestamp}`;
          break;
        case 'reset':
          logEntry = `🔄 Reset: ${timestamp}`;
          break;
      }

      if (!logEntry) return;

      // Find the task element if not provided
      if (!taskElement) {
        const taskItems = Array.from(document.querySelectorAll('.kanban-task-item'));
        for (const item of taskItems) {
          const pomodoroButton = item.querySelector('.pomodoro-task-button');
          if (pomodoroButton && this.taskButtons.get(taskId) === pomodoroButton) {
            taskElement = item as HTMLElement;
            break;
          }
        }
      }

      if (!taskElement) return;

      // Add log entry to task
      const logContainer = taskElement.querySelector('.pomodoro-task-log');
      if (logContainer) {
        const sessionLog = document.createElement('div');
        sessionLog.className = 'pomodoro-session-log';
        sessionLog.textContent = logEntry;
        logContainer.appendChild(sessionLog);

        // Show log container
        (logContainer as HTMLElement).style.display = 'block';

        // Auto-hide after 3 seconds unless it's the current task
        if (this.settings.currentTask !== taskId) {
          setTimeout(() => {
            (logContainer as HTMLElement).style.display = 'none';
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Error logging to Kanban task:', error);
    }
  }

  async onunload() {
    console.log('Unloading Enhanced Pomodoro plugin...');
    
    // Clean up Kanban integration
    this.removeKanbanIntegration();
    
    // Clear any active timers
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    // Clean up status bar
    if (this.statusBarText) {
      this.statusBarText.remove();
      // No need to set to null as we're already in unload
    }
    
    // Remove any remaining DOM elements
    const pomodoroElements = document.querySelectorAll('.pomodoro-task-button, .pomodoro-debug');
    pomodoroElements.forEach(el => el.remove());
    
    // Remove any added CSS
    const styleElement = document.getElementById('pomodoro-kanban-styles');
    if (styleElement) {
      styleElement.remove();
    }
    
    console.log('Enhanced Pomodoro plugin unloaded');
    
    // Log the plugin unload
    await this.logSession('plugin_unloaded');
    
    // Clean up the view
    this.app.workspace.detachLeavesOfType(CIRCULAR_TIMER_VIEW);
    
    // Remove any remaining status bar elements
    if (this.statusBarText) {
      this.statusBarText.remove();
    }
  }
}

class EnhancedPomodoroSettingTab extends PluginSettingTab {
  plugin: EnhancedPomodoro;

  constructor(app: App, plugin: EnhancedPomodoro) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Enhanced Pomodoro Settings' });

    new Setting(containerEl)
      .setName('Work Duration (minutes)')
      .setDesc('Duration of work sessions')
      .addSlider(slider => slider
        .setLimits(1, 60, 1)
        .setValue(this.plugin.settings.workDuration)
        .onChange(async (value) => {
          this.plugin.settings.workDuration = value;
          await this.plugin.saveSettings();
        })
        .setDynamicTooltip()
      );

    new Setting(containerEl)
      .setName('Short Break Duration (minutes)')
      .setDesc('Duration of short breaks')
      .addSlider(slider => slider
        .setLimits(1, 30, 1)
        .setValue(this.plugin.settings.shortBreakDuration)
        .onChange(async (value) => {
          this.plugin.settings.shortBreakDuration = value;
          await this.plugin.saveSettings();
        })
        .setDynamicTooltip()
      );

    new Setting(containerEl)
      .setName('Long Break Duration (minutes)')
      .setDesc('Duration of long breaks (after 4 sessions)')
      .addSlider(slider => slider
        .setLimits(5, 60, 1)
        .setValue(this.plugin.settings.longBreakDuration)
        .onChange(async (value) => {
          this.plugin.settings.longBreakDuration = value;
          await this.plugin.saveSettings();
        })
        .setDynamicTooltip()
      );

    new Setting(containerEl)
      .setName('Auto-start next session')
      .setDesc('Automatically start the next session when one completes')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoStartNext)
        .onChange(async (value) => {
          this.plugin.settings.autoStartNext = value;
          await this.plugin.saveSettings();
        })
      );

    // Kanban board selection
    const kanbanBoardSetting = new Setting(containerEl)
      .setName('Kanban Board')
      .setDesc('Select a Kanban board to open and track tasks from');

    // Track if we're currently refreshing to prevent multiple refreshes
    let isRefreshing = false;
    
    // Function to refresh the dropdown with available Kanban files
    const refreshKanbanList = async () => {
      // Define variables at the function scope
      let debugLog: string[] = [];
      let kanbanFiles: TFile[] = [];
      let loadingEl: HTMLElement | null = null;
      
      if (isRefreshing) {
        console.log('Refresh already in progress, skipping...');
        return;
      }
      
      isRefreshing = true;
      console.log('Refreshing Kanban list...');
      
      try {
        // Clear existing dropdown
        const dropdown = kanbanBoardSetting.controlEl.querySelector('select');
        if (dropdown) dropdown.remove();

        // Create a loading indicator
        loadingEl = document.createElement('div');
        loadingEl.textContent = 'Scanning for Kanban boards...';
        kanbanBoardSetting.controlEl.appendChild(loadingEl);

        // Get all markdown files in the vault
        const allMarkdownFiles = this.app.vault.getMarkdownFiles();
        debugLog = [];
        debugLog.push(`Starting Kanban file detection at ${new Date().toISOString()}`);
        kanbanFiles = [];
        debugLog.push(`### All Markdown Files (${allMarkdownFiles.length}):`);
        allMarkdownFiles.forEach(file => {
          debugLog.push(`- ${file.path}`);
        });
        
        debugLog.push(`\n### Checking for Kanban files...`);

        // Process files in chunks to keep the UI responsive
        const CHUNK_SIZE = 10;
        for (let i = 0; i < allMarkdownFiles.length; i += CHUNK_SIZE) {
          const chunk = allMarkdownFiles.slice(i, i + CHUNK_SIZE);
          await Promise.all(chunk.map(async (file) => {
            try {
              const content = await this.app.vault.cachedRead(file);
              const isKanban = content.includes('kanban-plugin:') || 
                            content.includes('kanban-plugin: board') ||
                            content.includes('---\nkanban-plugin:') ||
                            content.includes('---\r\nkanban-plugin:');
              
              if (isKanban) {
                kanbanFiles.push(file);
                debugLog.push(`✅ Found Kanban board: ${file.path}`);
              } else if (file.name.endsWith('.kanban.md') || file.name.endsWith('.kanban')) {
                debugLog.push(`⚠️ File has .kanban extension but no Kanban frontmatter: ${file.path}`);
              }
            } catch (error) {
              debugLog.push(`❌ Error reading file ${file.path}: ${error instanceof Error ? error.message : String(error)}`);
            }
          }));
          
          // Update loading message with progress
          loadingEl.textContent = `Scanning... ${Math.min(i + CHUNK_SIZE, allMarkdownFiles.length)}/${allMarkdownFiles.length} files`;
          await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI
        }
        
        // Remove loading indicator
        loadingEl.remove();
        
        // Log results
        debugLog.push(`\n### Found ${kanbanFiles.length} Kanban files`);
        console.log('Kanban File Detection Debug:', debugLog.join('\n'));
        
        // Debug: Write to a file if needed
        if (this.plugin.settings.debugMode) {
          const logContent = debugLog.join('\n') + '\n\n';
          const logFile = this.plugin.app.vault.getAbstractFileByPath('pomodoro-debug-log.md');
          if (logFile instanceof TFile) {
            await this.plugin.app.vault.modify(logFile, logContent);
          } else {
            await this.plugin.app.vault.create('pomodoro-debug-log.md', logContent);
          }
        }
        
        console.log('Found Kanban files:', kanbanFiles);
        if (kanbanFiles.length === 0) {
          console.log('No Kanban files found in the vault');
          const noFilesEl = document.createElement('div');
          noFilesEl.textContent = 'No Kanban boards found. Create a Kanban board first.';
          noFilesEl.style.marginTop = '10px';
          noFilesEl.style.color = 'var(--text-muted)';
          kanbanBoardSetting.controlEl.appendChild(noFilesEl);
        }

        // Create dropdown if we found any Kanban files
        if (kanbanFiles.length > 0) {
          const dropdown = document.createElement('select');
          dropdown.add(new Option('-- Select a Kanban board --', ''));
          
          kanbanFiles.forEach(file => {
            const option = new Option(file.path, file.path);
            dropdown.add(option);
            console.log('Adding Kanban file to dropdown:', file.path);
          });
          
          // Set current value if any
          if (this.plugin.settings.kanbanBoardPath) {
            dropdown.value = this.plugin.settings.kanbanBoardPath;
          }
          
          // Handle selection change
          dropdown.addEventListener('change', async (e) => {
            const target = e.target as HTMLSelectElement;
            this.plugin.settings.kanbanBoardPath = target.value;
            await this.plugin.saveSettings();
            console.log('Selected Kanban board:', target.value);
          });
          
          kanbanBoardSetting.controlEl.appendChild(dropdown);
        }
        
        // Log to file
        try {
          const logContent = debugLog.join('\n') + '\n\n';
          if (await this.app.vault.adapter.exists(this.plugin.settings.logFile)) {
            const currentContent = await this.app.vault.adapter.read(this.plugin.settings.logFile);
            await this.app.vault.adapter.write(this.plugin.settings.logFile, logContent + currentContent);
          } else {
            await this.app.vault.create(this.plugin.settings.logFile, logContent);
          }
        } catch (error) {
          console.error('Error writing debug log:', error);
        }
        
      } catch (error) {
        console.error('Error refreshing Kanban list:', error);
        const errorEl = document.createElement('div');
        errorEl.textContent = 'Error scanning for Kanban boards. Check console for details.';
        errorEl.style.color = 'var(--text-error)';
        errorEl.style.marginTop = '10px';
        kanbanBoardSetting.controlEl.appendChild(errorEl);
      } finally {
        if (loadingEl) {
          loadingEl.remove();
        }
        isRefreshing = false;
      }

      // Log to console
      console.log('Kanban File Detection Debug:', debugLog.join('\n'));
      
      // Log to Pomodoro log file if it exists
      try {
        const logContent = debugLog.join('\n') + '\n\n';
        if (await this.app.vault.adapter.exists(this.plugin.settings.logFile)) {
          try {
            const currentContent = await this.app.vault.adapter.read(this.plugin.settings.logFile);
            await this.app.vault.adapter.write(this.plugin.settings.logFile, logContent + currentContent);
          } catch (readError) {
            console.error('Error reading log file, creating new one:', readError);
            await this.app.vault.create(this.plugin.settings.logFile, logContent);
          }
        } else {
          await this.app.vault.create(this.plugin.settings.logFile, logContent);
        }
      } catch (error) {
        console.error('Error writing to log file:', error);
        console.error('Error writing debug log:', error);
      }

console.log('Found Kanban files:', kanbanFiles);
      
      // Add a default "None" option
      const options = [
        { value: '', display: '-- Select a Kanban board --' },
        ...kanbanFiles.map(file => {
          console.log('Adding Kanban file to dropdown:', file.path);
          return {
            value: file.path,
            display: file.path
          };
        })
      ];
      
if (kanbanFiles.length === 0) {
        console.log('No Kanban files found in the vault');
      }

      // Create dropdown
      kanbanBoardSetting.addDropdown(dropdown => {
        options.forEach(option => {
          dropdown.addOption(option.value, option.display);
        });

        // Set current value
        dropdown.setValue(this.plugin.settings.kanbanBoardPath);

        // Handle selection change
        dropdown.onChange(async (value) => {
          this.plugin.settings.kanbanBoardPath = value;
          await this.plugin.saveSettings();
          
          // Open the selected Kanban board
          if (value) {
            const file = this.app.vault.getAbstractFileByPath(value);
            if (file instanceof TFile) {
              // Close any existing Kanban views
              const leaves = this.app.workspace.getLeavesOfType('kanban');
              leaves.forEach(leaf => leaf.detach());
              
              // Open the selected Kanban board
              await this.app.workspace.getLeaf().openFile(file);
              
              // Set up Kanban integration
              this.plugin.setupKanbanIntegration();
            }
          }
        });
      });
    };

    // Add refresh button
    kanbanBoardSetting.addButton(button => {
      button
        .setIcon('refresh-cw')
        .setTooltip('Refresh Kanban board list')
        .onClick(() => refreshKanbanList());
    });

    // Initial load of Kanban files
    refreshKanbanList();

    new Setting(containerEl)
      .setName('Log File')
      .setDesc('Path to the log file (e.g., "Pomodoro Log.md")')
      .addText(text => text
        .setValue(this.plugin.settings.logFile)
        .onChange(async (value) => {
          this.plugin.settings.logFile = value;
          await this.plugin.saveSettings();
        })
      );

    containerEl.createEl('h3', { text: 'Quick Break Settings' });

    new Setting(containerEl)
      .setName('Enable Quick Breaks')
      .setDesc('Add a button to start a quick break timer')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableQuickBreak)
        .onChange(async (value) => {
          this.plugin.settings.enableQuickBreak = value;
          await this.plugin.saveSettings();
          // Refresh the timer view to show/hide the quick break button
          this.plugin.activateView();
        })
      );

    new Setting(containerEl)
      .setName('Quick Break Duration (minutes)')
      .setDesc('Duration of quick breaks')
      .addSlider(slider => slider
        .setLimits(1, 15, 1)
        .setValue(this.plugin.settings.quickBreakDuration)
        .onChange(async (value) => {
          this.plugin.settings.quickBreakDuration = value;
          await this.plugin.saveSettings();
        })
        .setDynamicTooltip()
      )
      .setDisabled(!this.plugin.settings.enableQuickBreak);

    new Setting(containerEl)
      .setName('Quick Break Sound')
      .setDesc('Sound to play when quick break ends')
      .addDropdown(dropdown => {
        dropdown
          .addOption('default', 'Default Bell')
          .addOption('chime', 'Chime')
          .addOption('ding', 'Ding')
          .addOption('none', 'None')
          .setValue(this.plugin.settings.quickBreakSound)
          .onChange(async (value: string) => {
            this.plugin.settings.quickBreakSound = value;
            await this.plugin.saveSettings();
          });
      })
      .setDisabled(!this.plugin.settings.enableQuickBreak);
  }
}
