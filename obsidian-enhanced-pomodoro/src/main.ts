// Test edit - Nov 13
const kanbanStyles = `
.kanban-settings-container {
  margin-top: 1em;
}

.search-container {
  margin-bottom: 1em;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  background-color: var(--background-primary);
  color: var(--text-normal);
}

.kanban-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  padding: 8px;
}

.kanban-list select {
  width: 100%;
  padding: 8px;
  background-color: var(--background-primary);
  color: var(--text-normal);
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
}

.loading-indicator {
  color: var(--text-muted);
  font-size: 0.9em;
  margin-top: 4px;
}

.no-results {
  color: var(--text-muted);
  font-style: italic;
  padding: 8px;
  text-align: center;
}
`;
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
import CircularTimerView, { CIRCULAR_TIMER_VIEW } from './CircularTimerView';

interface SchedulePhase {
  type: 'work' | 'shortBreak' | 'longBreak';
  duration: number;
  name?: string; // Custom name for the phase (optional)
}

interface TimeSchedule {
  id: string;
  name: string;
  // Legacy simple schedule (for backward compatibility)
  workDuration?: number;
  shortBreakDuration?: number;
  longBreakDuration?: number;
  // New custom sequence support
  phases?: SchedulePhase[];
  // Common settings
  autoStartNext: boolean;
  enableQuickBreak: boolean;
  quickBreakDuration: number;
  quickBreakSound: string;
  isDefault?: boolean;
  // Track current position in custom sequence
  currentPhaseIndex?: number;
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
  // Button display settings
  showButtonTooltips: boolean;
  buttonStyle: 'icons+text' | 'text' | 'icons';
  responsiveButtons: boolean; // Auto-switch to icons when sidebar < 575px
  // Sidebar view settings
  sidebarView: 'mini-calendar' | 'calendar-tasks' | 'manual';
  // Calendar settings
  calendarFilesPath: string; // Path to calendar files directory
  autoCreateCalendarFiles: boolean; // Auto-create daily kanban files
  // Schedule summary settings
  enableScheduleSummary: boolean;
  scheduleSummaryPath: string;
  // Per-board progress column settings
  perBoardProgressColumns: Record<string, string>; // boardPath -> columnTitle
  // Task timer settings
  updateTaskTimerInFile: boolean;
  // Auto-move settings
  autoMoveToProgress: boolean;
  autoMoveToDone: boolean;
  // Sessions tracking
  sessionsCompletedCount: number;
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
  quickBreakSound: 'default',
  sessionsCompletedCount: 0,
  autoMoveToProgress: true,
  autoMoveToDone: true,
  updateTaskTimerInFile: true,
  showButtonTooltips: true,
  buttonStyle: 'icons+text' as const,
  responsiveButtons: true, // Enable responsive layout by default
  sidebarView: 'mini-calendar' as const,
  calendarFilesPath: 'Daily Notes', // Default path for calendar files
  autoCreateCalendarFiles: false, // Don't auto-create by default (user choice)
  enableScheduleSummary: true, // Enable schedule summary generation
  scheduleSummaryPath: 'Pomodoro Schedule Summary.md',
  perBoardProgressColumns: {}, // Empty object initially
};

export default class EnhancedPomodoro extends Plugin {
  settings: EnhancedPomodoroSettings = DEFAULT_SETTINGS;
  statusBarText: HTMLElement | null = null;
  timerInterval: number | null = null;
  timeRemaining: number = 0;
  isRunning: boolean = false;
  currentMode: 'work' | 'shortBreak' | 'longBreak' = 'work';
  sessionsCompleted: number = 0;

  // Quick break state restoration
  private quickBreakSavedState: {
    wasRunning: boolean;
    previousMode: 'work' | 'shortBreak' | 'longBreak';
    previousTime: number;
  } | null = null;

  // Task logs storage - persists across kanban file switches
  private taskLogs: Map<string, Array<{message: string, timestamp: number}>> = new Map();

  public kanbanFileCache: { [path: string]: boolean } = {};
  public lastScanTime: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

  private async saveKanbanCache(): Promise<void> {
    await this.saveData({ kanbanFileCache: this.kanbanFileCache });
  }

  public async refreshKanbanList(containerEl: HTMLElement): Promise<void> {
    const now = Date.now();
    const useCache = (now - this.lastScanTime) < this.CACHE_TTL_MS;
    
    // Clear existing UI
    const container = containerEl.querySelector('.kanban-settings-container');
    if (container) container.remove();
    
    const settingsContainer = containerEl.createDiv({ cls: 'kanban-settings-container' });
    
    // Add search box
    const searchContainer = settingsContainer.createDiv({ cls: 'search-container' });
    const searchInput = searchContainer.createEl('input', {
      type: 'text',
      placeholder: 'Search Kanban boards...',
      cls: 'search-input'
    });
    
    // Add loading indicator
    const loadingEl = searchContainer.createDiv({ 
      text: 'Loading Kanban boards...',
      cls: 'loading-indicator'
    });
    
    // Get all markdown files (fast)
    const allMarkdownFiles = this.app.vault.getMarkdownFiles();
    let kanbanFiles: TFile[] = [];
    
    // Quick scan first (check file names and cache)
    const quickResults = allMarkdownFiles.filter(file => {
      const lowerName = file.name.toLowerCase();
      return this.kanbanFileCache[file.path] || 
             lowerName.includes('kanban') || 
             file.extension === 'kanban' ||
             file.path.endsWith('.kanban.md');
    });
    
    // Show quick results immediately
    if (quickResults.length > 0) {
      kanbanFiles = quickResults;
      this.updateKanbanList(settingsContainer, kanbanFiles, searchInput);
      loadingEl.textContent = `Found ${quickResults.length} likely Kanban boards. Scanning for more...`;
    }

    // Update list as user types
    searchInput.addEventListener('input', () => {
      this.updateKanbanList(settingsContainer, kanbanFiles, searchInput);
    });

    // Full scan in background
    setTimeout(async () => {
      try {
        // Check cache first
        const cachedResults = allMarkdownFiles.filter(f => this.kanbanFileCache[f.path]);
        if (cachedResults.length > 0 && useCache) {
          kanbanFiles = Array.from(new Set([...kanbanFiles, ...cachedResults]));
          this.updateKanbanList(settingsContainer, kanbanFiles, searchInput);
          return;
        }
        
        // Full content scan
        const CHUNK_SIZE = 20;
        const newKanbanFiles: TFile[] = [];
        
        for (let i = 0; i < allMarkdownFiles.length; i += CHUNK_SIZE) {
          const chunk = allMarkdownFiles.slice(i, i + CHUNK_SIZE);
          await Promise.all(chunk.map(async (file) => {
            if (this.kanbanFileCache[file.path] === false) return;
            
            try {
              const content = await this.app.vault.cachedRead(file);
              const isKanban = content.includes('kanban-plugin:');
              this.kanbanFileCache[file.path] = isKanban;
              
              if (isKanban) {
                newKanbanFiles.push(file);
              }
            } catch (error) {
              console.warn(`Error reading ${file.path}:`, error);
              this.kanbanFileCache[file.path] = false;
            }
          }));
          
          // Update UI with new findings
          if (newKanbanFiles.length > 0) {
            kanbanFiles = Array.from(new Set([...kanbanFiles, ...newKanbanFiles]));
            this.updateKanbanList(settingsContainer, kanbanFiles, searchInput);
            await this.saveKanbanCache();
          }
        }
        
        this.lastScanTime = Date.now();
      } catch (error) {
        console.error('Background scan failed:', error);
      } finally {
        loadingEl.remove();
        this.updateKanbanList(settingsContainer, kanbanFiles, searchInput);
      }
    }, 0);
  }

  refreshSoundsPreview(containerEl: HTMLElement) {
    // Rebuild the sound preview section
    // This is called when the refresh button is clicked
    // For now, just show a message that settings are live-updated
    new Notice('Sound previews are automatically updated! Just click Test after changing the dropdown.');
  }

  private updateKanbanList(container: HTMLElement, files: TFile[], searchInput: HTMLInputElement): void {
    const listContainer = container.querySelector('.kanban-list') || container.createDiv({ cls: 'kanban-list' });
    listContainer.empty();
    
    const searchTerm = searchInput.value.toLowerCase();
    const filteredFiles = files.filter(file => 
      file.path.toLowerCase().includes(searchTerm)
    );
    
    if (filteredFiles.length === 0) {
      listContainer.createDiv({ 
        text: 'No Kanban boards found. Create a Kanban board first.',
        cls: 'no-results' 
      });
      return;
    }
    
    const select = listContainer.createEl('select');
    select.add(new Option('-- Select a Kanban board --', ''));
    
    filteredFiles.forEach(file => {
      const option = new Option(file.path, file.path);
      if (file.path === this.settings.kanbanBoardPath) {
        option.selected = true;
      }
      select.add(option);
    });

    select.addEventListener('change', async (e) => {
      const selectedPath = (e.target as HTMLSelectElement).value;
      this.settings.kanbanBoardPath = selectedPath;
      await this.saveSettings();

      if (this.settings.kanbanIntegration) {
        this.removeKanbanIntegration();
        await this.setupKanbanIntegration();
      }
    });
  }


  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async onload() {
    console.log('Loading Enhanced Pomodoro Timer...');
    await this.loadSettings();
    
    // Restore sessions completed count from settings
    this.sessionsCompleted = this.settings.sessionsCompletedCount || 0;
    console.log('[Plugin Load] Restored sessions completed:', this.sessionsCompleted);

    try {
      // Load settings first
      await this.loadSettings();
      
      // Initialize timeRemaining with current schedule's work duration
      const currentSchedule = this.getCurrentSchedule();
      this.timeRemaining = this.getDurationForPhase('work') * 60;
      
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
        document.head.createEl('style', { text: kanbanStyles });
        this.setupKanbanIntegration();
      }

      // Load Kanban cache
  if (this.settings.kanbanIntegration) {
    const data = await this.loadData();
    if (data?.kanbanFileCache) {
      this.kanbanFileCache = data.kanbanFileCache;
    }
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
   * Get the duration for the current phase, supporting both legacy and custom sequences
   */
  getDurationForPhase(phase: 'work' | 'shortBreak' | 'longBreak'): number {
    const schedule = this.getCurrentSchedule();
    
    // If using custom phases
    if (schedule.phases && schedule.phases.length > 0) {
      // Find the current phase or default to work
      const currentPhaseIndex = schedule.currentPhaseIndex || 0;
      const currentPhase = schedule.phases[currentPhaseIndex];
      
      if (currentPhase && currentPhase.type === phase) {
        return currentPhase.duration;
      }
      
      // Find the first occurrence of this phase type
      const matchingPhase = schedule.phases.find(p => p.type === phase);
      return matchingPhase ? matchingPhase.duration : 25; // Default fallback
    }
    
    // Legacy schedule support
    switch (phase) {
      case 'work': return schedule.workDuration || 25;
      case 'shortBreak': return schedule.shortBreakDuration || 5;
      case 'longBreak': return schedule.longBreakDuration || 15;
      default: return 25;
    }
  }
  
  /**
   * Get the current phase information for custom sequences
   */
  getCurrentPhase(): SchedulePhase | null {
    const schedule = this.getCurrentSchedule();
    
    if (!schedule.phases || schedule.phases.length === 0) {
      // Legacy schedule - create phase on the fly
      return {
        type: this.currentMode as 'work' | 'shortBreak' | 'longBreak',
        duration: this.getDurationForPhase(this.currentMode as 'work' | 'shortBreak' | 'longBreak'),
        name: this.currentMode.charAt(0).toUpperCase() + this.currentMode.slice(1)
      };
    }
    
    const currentPhaseIndex = schedule.currentPhaseIndex || 0;
    return schedule.phases[currentPhaseIndex] || null;
  }
  
  /**
   * Advance to the next phase in custom sequence
   */
  advanceToNextPhase(): void {
    const schedule = this.getCurrentSchedule();
    
    if (!schedule.phases || schedule.phases.length === 0) {
      // Legacy schedule - use standard cycle logic
      return;
    }
    
    // Find current phase index
    let currentIndex = schedule.currentPhaseIndex || 0;
    currentIndex = (currentIndex + 1) % schedule.phases.length;
    
    // Update the schedule with new phase index
    const scheduleIndex = this.settings.schedules.findIndex(s => s.id === schedule.id);
    if (scheduleIndex !== -1) {
      this.settings.schedules[scheduleIndex].currentPhaseIndex = currentIndex;
      this.saveSettings();
    }
    
    console.log('[Schedule] Advanced to phase', currentIndex, 'of', schedule.phases.length);
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
    this.timeRemaining = (schedule.workDuration || 25) * 60;
    this.currentMode = 'work';
    this.isRunning = true;
    this.startTimer();
    await this.logSession('start');
  }

  async startQuickBreak() {
    const schedule = this.getCurrentSchedule();

    // Check if quick break is enabled in the current schedule
    if (!schedule.enableQuickBreak) {
      new Notice('Quick break is disabled in the current schedule');
      return;
    }

    // Quick break only makes sense during a work session. Prevent starting it
    // from short/long breaks, where there is nothing meaningful to resume.
    if (this.currentMode !== 'work') {
      new Notice('Quick break is only available during work sessions.');
      return;
    }

    // Pause task timer BEFORE saving state (to capture current work time)
    const view = this.app.workspace.getLeavesOfType('circular-timer-view')[0]?.view;
    if (view && 'pauseTaskTimer' in view) {
      (view as any).pauseTaskTimer();
      console.log('[Quick Break] Task timer paused');
    }

    // Save current state BEFORE making changes
    this.quickBreakSavedState = {
      wasRunning: this.isRunning,
      previousMode: this.currentMode,
      previousTime: this.timeRemaining
    };
    console.log('[Quick Break] Saved state:', this.quickBreakSavedState);

    // Stop any running timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // Set quick break duration from schedule (always use fresh value from settings)
    this.timeRemaining = schedule.quickBreakDuration * 60;
    this.currentMode = 'shortBreak';
    this.isRunning = true;
    
    // Update the UI
    this.updateStatusBar();
    
    // Show notification (no sound to be consistent with regular breaks)
    new Notice(`Quick break: ${schedule.quickBreakDuration} min (will resume timer after)`);
    
    // Log quick break start
    await this.logSession('quick_break_start');
    
    // Start the timer
    this.startTimer();
  }

  private async restoreAfterQuickBreak() {
    console.log('[Quick Break] Restoring state:', this.quickBreakSavedState);
    
    if (!this.quickBreakSavedState) {
      console.log('[Quick Break] No saved state, resetting timer');
      // No saved state, just reset to work
      this.resetTimer();
      return;
    }

    const savedState = this.quickBreakSavedState;
    this.quickBreakSavedState = null; // Clear saved state so subsequent logic treats this as a normal session

    // Show completion notice
    // Always restore the previous mode/time. If the timer was running before
    // the quick break, resume automatically; otherwise just restore the state
    // and wait for the user to start the timer again.
    this.currentMode = savedState.previousMode;
    this.timeRemaining = savedState.previousTime;
    this.isRunning = savedState.wasRunning;
    this.updateStatusBar();

    const view = this.app.workspace.getLeavesOfType('circular-timer-view')[0]?.view;
    if (view) {
      if ('updateDisplay' in view) {
        (view as any).updateDisplay();
      }
      // Reset lastUpdateTime so task timer resumes correctly when resuming
      if (savedState.wasRunning && 'lastUpdateTime' in view) {
        (view as any).lastUpdateTime = Date.now();
        console.log('[Quick Break] Task timer tracking reset');
      }
    }

    new Notice('Quick break over! Resuming previous session' + (savedState.wasRunning ? '' : ' (timer paused)') + '.');
    await this.logSession('quick_break_end');

    if (savedState.wasRunning) {
      this.startTimer();
    }
  }
  
  async endCurrentCycle() {
    // If in quick break, restore to previous work session
    if (this.quickBreakSavedState) {
      console.log('[End Cycle] Ending quick break, restoring previous state');
      await this.restoreAfterQuickBreak();
      return;
    }
    
    // Otherwise, complete the current session and move to next phase
    console.log('[End Cycle] Ending current session phase');
    await this.completeSession();
  }
  
  playSound(sound: string) {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (sound === 'longbreak') {
        // One longer beep for long break
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 528; // A4 note
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.2); // Longer beep
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 1.2);
        
      } else if (sound === 'shortbreak') {
        // Three short beeps for short break
        for (let i = 0; i < 3; i++) {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 693; // Higher pitch
          oscillator.type = 'sine';
          
          const startTime = audioContext.currentTime + (i * 0.3);
          gainNode.gain.setValueAtTime(0.2, startTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
          
          oscillator.start(startTime);
          oscillator.stop(startTime + 0.15);
        }
      } else if (sound == 'quickbreak') {
         // Three short beeps for short break
        for (let i = 0; i < 3; i++) {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 432; // Higher pitch
          oscillator.type = 'sine';
          
          const startTime = audioContext.currentTime + (i * 0.3);
          gainNode.gain.setValueAtTime(0.2, startTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
          
          oscillator.start(startTime);
          oscillator.stop(startTime + 0.15);
        }
        
      } else if (sound === 'ding') {
        // Create a ding sound  
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 693;
        oscillator.type = 'triangle';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      }
      else if(sound === 'default') {
        // Default beep sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 693; // A4 note
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.8);
      }
    } catch (e) {
      console.error('Error playing sound:', e);
    }
  }
  
  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.timerInterval = window.setInterval(() => {
      if (!this.isRunning) return;
      
      this.timeRemaining--;
      this.updateStatusBar();
      
      // Update active task timer every second
      const view = this.app.workspace.getLeavesOfType('circular-timer-view')[0]?.view;
      if (view && 'updateActiveTaskTimer' in view && this.currentMode === 'work') {
        (view as any).updateActiveTaskTimer();
      }
      
      // Check if timer has reached zero
      if (this.timeRemaining <= 0) {
        clearInterval(this.timerInterval!);
        this.isRunning = false;
        this.timeRemaining = 0;
        this.updateStatusBar();
        
        // Only trigger timer complete event if NOT a quick break (to avoid beep sounds)
        if (!this.quickBreakSavedState) {
          this.app.workspace.trigger('pomodoro:timer-complete');
        }
        
        // Complete the session
        this.completeSession();
      }
    }, 1000);
  }
  
  async togglePause() {
    this.isRunning = !this.isRunning;
    if (this.isRunning) {
      this.startTimer();
      // Resume task timer in the view
      const view = this.app.workspace.getLeavesOfType('circular-timer-view')[0]?.view;
      if (view && 'resumeTaskTimer' in view) {
        (view as any).resumeTaskTimer();
      }
      await this.logSession('resume');
    } else {
      if (this.timerInterval) clearInterval(this.timerInterval);
      // Pause task timer in the view
      const view = this.app.workspace.getLeavesOfType('circular-timer-view')[0]?.view;
      if (view && 'pauseTaskTimer' in view) {
        (view as any).pauseTaskTimer();
      }
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
    
    // Reset custom sequence phase index
    const schedule = this.getCurrentSchedule();
    if (schedule.phases && schedule.phases.length > 0) {
      const scheduleIndex = this.settings.schedules.findIndex(s => s.id === schedule.id);
      if (scheduleIndex !== -1) {
        this.settings.schedules[scheduleIndex].currentPhaseIndex = 0;
        this.saveSettings();
      }
    }
    
    this.timeRemaining = this.getDurationForPhase('work') * 60;
    
    // Also reset sessions count on manual reset
    this.sessionsCompleted = 0;
    this.settings.sessionsCompletedCount = 0;
    await this.saveSettings();
    console.log('[Reset] Sessions count reset to 0');
    
    this.updateStatusBar();
    
    // Update the view display
    const view = this.app.workspace.getLeavesOfType('circular-timer-view')[0]?.view;
    if (view && 'updateDisplay' in view) {
      (view as any).updateDisplay();
    }
    
    await this.logSession('reset');
  }
  
  async completeSession() {
  this.isRunning = false;
  if (this.timerInterval) {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  }
  
  const schedule = this.getCurrentSchedule();
  console.log('═══════════════════════════════════════════════════════');
  console.log('[COMPLETE SESSION] Session finished');
  console.log('  Current Mode:', this.currentMode);
  console.log('  Sessions Completed:', this.sessionsCompleted);
  console.log('  Schedule:', schedule.name);
  console.log('  Auto-Start Setting:', schedule.autoStartNext, '(type:', typeof schedule.autoStartNext, ')');
  
  if (this.currentMode === 'work') {
    // Pause task timer when work session ends
    const view = this.app.workspace.getLeavesOfType('circular-timer-view')[0]?.view;
    if (view && 'pauseTaskTimer' in view) {
      (view as any).pauseTaskTimer();
    }
    
    // Increment sessionsCompleted FIRST, then check for long break
    this.sessionsCompleted++;
    
    // Save the updated count immediately
    this.settings.sessionsCompletedCount = this.sessionsCompleted;
    await this.saveSettings();
    
    console.log('  → Work Complete! Sessions:', this.sessionsCompleted);
    new Notice(`Work session complete!`);
    await this.logSession('work_complete');
    
    // Play work completion sound
    this.playSound('shortbreak'); // Use short break sound for work completion
    
    // Determine next phase
    let nextMode: 'shortBreak' | 'longBreak';
    let nextDuration: number;
    
    if (schedule.phases && schedule.phases.length > 0) {
      // Custom sequence - advance to next phase
      this.advanceToNextPhase();
      const nextPhase = this.getCurrentPhase();
      
      if (nextPhase && (nextPhase.type === 'shortBreak' || nextPhase.type === 'longBreak')) {
        nextMode = nextPhase.type;
        nextDuration = nextPhase.duration;
        console.log('  → Custom Sequence Next Phase:', nextPhase.name || nextPhase.type);
      } else {
        // Fallback to legacy logic if custom sequence is malformed
        const isLongBreak = this.sessionsCompleted % 4 === 0;
        nextMode = isLongBreak ? 'longBreak' : 'shortBreak';
        nextDuration = this.getDurationForPhase(nextMode);
        console.log('  → Fallback to Legacy Break Type:', nextMode);
      }
    } else {
      // Legacy schedule logic
      const isLongBreak = this.sessionsCompleted % 4 === 0;
      nextMode = isLongBreak ? 'longBreak' : 'shortBreak';
      nextDuration = this.getDurationForPhase(nextMode);
      console.log('  → Legacy Break Type:', nextMode, 'Long Break:', isLongBreak);
    }
    
    this.currentMode = nextMode;
    this.timeRemaining = nextDuration * 60;
    
    console.log('  → Next Break Duration:', Math.floor(this.timeRemaining / 60), 'minutes');
    
    new Notice(`Time for a ${nextMode === 'longBreak' ? 'long' : 'short'} break!`);
    
    // Play appropriate break sound
    this.playSound(nextMode === 'longBreak' ? 'longbreak' : 'shortbreak');
    
    // Update status bar to show new mode
    this.updateStatusBar();
    
    // Auto-start break ONLY if enabled in current schedule
    if (schedule.autoStartNext === true) {
      console.log('  → Auto-start: YES - Starting break timer immediately');
      this.isRunning = true;
      this.startTimer();
    } else {
      console.log('  → Auto-start: NO - Waiting for manual start');
    }
  } else {
    // Coming from a break
    console.log('  Current Break Mode:', this.currentMode);
    console.log('  Quick Break State Exists?', !!this.quickBreakSavedState);
    
    // Check if this was a quick break that needs state restoration
    if (this.quickBreakSavedState) {
      console.log('  → This was a quick break - restoring previous state');
      await this.restoreAfterQuickBreak();
      console.log('═══════════════════════════════════════════════════════');
      return; // Don't continue with normal break completion
    }
    
    // Normal break completion - reset to work mode
    console.log('  → Break Complete! Returning to work mode');
    this.currentMode = 'work';
    
    // For custom sequences, advance to next phase
    if (schedule.phases && schedule.phases.length > 0) {
      this.advanceToNextPhase();
      const nextPhase = this.getCurrentPhase();
      if (nextPhase && nextPhase.type === 'work') {
        this.timeRemaining = nextPhase.duration * 60;
        console.log('  → Custom Sequence Next Phase:', nextPhase.name || 'Work');
      } else {
        // Fallback to default work duration
        this.timeRemaining = this.getDurationForPhase('work') * 60;
        console.log('  → Fallback to default work duration');
      }
    } else {
      // Legacy schedule
      this.timeRemaining = this.getDurationForPhase('work') * 60;
    }
    
    new Notice('Break is over! Time to work!');
    await this.logSession('break_complete');
    
    // Play work start sound (default bell)
    this.playSound('ding');
    
    // Update status bar to show new mode
    this.updateStatusBar();
    
    // Auto-start work timer ONLY if enabled in current schedule
    if (schedule.autoStartNext === true) {
      console.log('  → Auto-start: YES - Starting work timer immediately');
      this.isRunning = true;
      this.startTimer();
    } else {
      console.log('  → Auto-start: NO - Waiting for manual start');
    }
  }
  console.log('═══════════════════════════════════════════════════════');
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
        return (schedule.workDuration || 25) * 60;
      case 'shortBreak':
        return (schedule.shortBreakDuration || 5) * 60;
      case 'longBreak':
        return (schedule.longBreakDuration || 15) * 60;
      default:
        return (schedule.workDuration || 25) * 60;
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

    // Open selected Kanban board if set
    if (this.settings.kanbanBoardPath) {
      const kanbanFile = this.app.vault.getAbstractFileByPath(this.settings.kanbanBoardPath);
      if (kanbanFile instanceof TFile) {
        const leaf = this.app.workspace.getLeaf(true);
        await leaf.openFile(kanbanFile);
      }
    }

    // Set up mutation observer to watch for Kanban task changes
    this.kanbanObserver = new MutationObserver(() => {
      this.refreshKanbanButtons();
    });

    // Observe workspace for Kanban changes
    const kanbanContainer = document.body.querySelector('.kanban-plugin');
    const target = kanbanContainer || document.body;
    this.kanbanObserver.observe(target, {
      childList: true,
      subtree: true,
    });

    // Initial setup after the board has had a moment to render
    setTimeout(() => this.refreshKanbanButtons(), 300);

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

  // Debounce timer for Kanban refresh
  private kanbanRefreshTimeout: NodeJS.Timeout | null = null;
  private lastKanbanRefresh = 0;
  private readonly KANBAN_REFRESH_DEBOUNCE = 500; // 500ms debounce
  private readonly KANBAN_REFRESH_INTERVAL = 5000; // 5 seconds minimum between refreshes

  // Debounced refresh of Kanban buttons
  async refreshKanbanButtons(force = false) {
    const now = Date.now();
    
    // Clear any pending refresh
    if (this.kanbanRefreshTimeout) {
      clearTimeout(this.kanbanRefreshTimeout);
      this.kanbanRefreshTimeout = null;
    }

    // If not forced and we've refreshed recently, debounce
    if (!force && now - this.lastKanbanRefresh < this.KANBAN_REFRESH_DEBOUNCE) {
      this.kanbanRefreshTimeout = setTimeout(
        () => this.refreshKanbanButtons(force),
        this.KANBAN_REFRESH_DEBOUNCE
      );
      return;
    }

    // Don't refresh too frequently
    if (!force && now - this.lastKanbanRefresh < this.KANBAN_REFRESH_INTERVAL) {
      return;
    }

    this.lastKanbanRefresh = now;

    try {
      // Clear existing buttons
      this.taskButtons.forEach(button => button.remove());
      this.taskButtons.clear();

      // Get Kanban plugin
      const kanbanPlugin = this.app.plugins.getPlugin('obsidian-kanban');
      if (!kanbanPlugin) {
        if (this.settings.debugMode) console.log('Kanban plugin not found');
        return;
      }

      // Get all Kanban views from the workspace
      const kanbanViews = this.app.workspace.getLeavesOfType('kanban');
      if (!kanbanViews || kanbanViews.length === 0) {
        if (this.settings.debugMode) console.log('No active Kanban views found');
        return;
      }

      // Process each Kanban view
      for (const view of kanbanViews) {
        try {
          // Type assertion to access the view's properties
          const kanbanView = view as any; // Using any to bypass TypeScript errors for now
          
          // Get the file associated with this view
          const file = kanbanView?.file || kanbanView?.view?.file;
          if (!file) continue;

          // Skip if a specific board is selected and this isn't it
          if (this.settings.kanbanBoardPath && 
              file.path !== this.settings.kanbanBoardPath && 
              !file.path.endsWith(this.settings.kanbanBoardPath)) {
            continue;
          }
          
          // Get the container element, checking both possible locations
          const containerEl = kanbanView.containerEl || kanbanView.view?.containerEl;
          if (!containerEl) {
            console.log('No container element found for Kanban view');
            continue;
          }
          
          // Find all task items in this board
          const taskItems = containerEl.querySelectorAll('.kanban-task-item');
          if (!taskItems || taskItems.length === 0) {
            // Skip if no tasks found (board might be empty)
            continue;
          }

          taskItems.forEach((taskItem, index) => {
            const taskElement = taskItem as HTMLElement;
            // Use a more stable ID based on task content or position
            const taskId = `task-${file.path}-${index}-${taskElement.textContent?.trim().substring(0, 20).replace(/\s+/g, '-') || index}`;
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
    } catch (error) {
      console.error('Error in refreshKanbanButtons:', error);
    }
  }

  private async startTaskPomodoro(taskId: string, taskText: string, taskElement: HTMLElement): Promise<void> {
    if (!taskId || !taskText || !taskElement) {
      console.error('Invalid task parameters', { taskId, taskText, taskElement });
      return;
    }

    try {
      // Set current task and save settings
      this.settings.currentTask = taskId;
      await this.saveSettings().catch(error => {
        console.error('Failed to save settings:', error);
        throw new Error('Failed to save task state');
      });

      // Start the pomodoro timer
      this.startPomodoro();

      // Update UI
      this.updateStatusBar(`${taskText.substring(0, 20)}${taskText.length > 20 ? '...' : ''}`);

      // Log the session start
      await Promise.all([
        this.logSession('start').catch(error => 
          console.error('Error logging session start:', error)
        ),
        this.logToKanbanTask(taskId, 'start', taskElement).catch(error => 
          console.error('Error logging to Kanban task:', error)
        )
      ]);

      new Notice(`Started Pomodoro for: ${taskText}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in startTaskPomodoro:', error);
      new Notice(`Error starting Pomodoro: ${errorMessage}`);
    }
  }

  private async logSession(action: string): Promise<void> {
    if (!this.settings.logFile) {
      return;
    }

    // Skip unnecessary logging events to keep log concise
    const skipActions = ['resume', 'pause', 'plugin_unloaded', 'reset'];
    if (skipActions.includes(action)) {
      return; // Only log to Kanban, not to file
    }

    try {
      const now = new Date();
      const timestamp = now.toLocaleString();
      const schedule = this.getCurrentSchedule();
      
      // Get current task and kanban info
      const view = this.app.workspace.getLeavesOfType('circular-timer-view')[0]?.view;
      const kanbanFile = this.settings.kanbanBoardPath 
        ? this.settings.kanbanBoardPath.split('/').pop()?.replace('.md', '') || 'Unknown'
        : 'No Kanban Selected';
      
      let taskName = 'No Task Selected';
      let taskTime = '0:00';
      if (view && 'activeTaskId' in view && 'currentTaskElement' in view) {
        const activeElement = (view as any).currentTaskElement as HTMLElement;
        if (activeElement) {
          taskName = activeElement.querySelector('.task-text')?.textContent || 'Unknown Task';
          const timerText = activeElement.querySelector('.task-timer')?.textContent || '[0:00]';
          taskTime = timerText.replace(/[\[\]]/g, '').trim();
        }
      }
      
      // Create more readable log entries with task and kanban context
      let logEntry = '';
      if (action === 'start') {
        logEntry = `\n═══════════════════════════════════════════════════════\n`;
        logEntry += `🍅 WORK STARTED - ${schedule.workDuration}min\n`;
        logEntry += `   📅 ${timestamp}\n`;
        logEntry += `   📋 Kanban: ${kanbanFile}\n`;
        logEntry += `   ✓  Task: ${taskName}\n`;
        logEntry += `   ⏱️  Task Time: ${taskTime}\n`;
        logEntry += `═══════════════════════════════════════════════════════\n`;
      } else if (action === 'work_complete') {
        const breakType = this.currentMode === 'longBreak' ? 'Long Break' : 'Short Break';
        const breakDuration = this.currentMode === 'longBreak' ? schedule.longBreakDuration : schedule.shortBreakDuration;
        logEntry = `\n✅ WORK COMPLETE - Starting ${breakType} (${breakDuration}min)\n`;
        logEntry += `   📅 ${timestamp}\n`;
        logEntry += `   📋 Kanban: ${kanbanFile}\n`;
        logEntry += `   ✓  Task: ${taskName}\n`;
        logEntry += `   ⏱️  Task Time: ${taskTime}\n\n`;
      } else if (action === 'break_complete') {
        logEntry = `\n🔄 BREAK COMPLETE - Back to work\n`;
        logEntry += `   📅 ${timestamp}\n\n`;
      }

      if (!logEntry) return; // Don't log unknown actions

      // Use a single transaction for file operations
      const { vault } = this.app;
      const { logFile } = this.settings;

      try {
        // Check if file exists and append or create accordingly
        const fileExists = await vault.adapter.exists(logFile);
        
        if (fileExists) {
          await vault.adapter.append(logFile, logEntry);
        } else {
          const header = "# Pomodoro Session Log\n\n";
          await vault.create(logFile, header + logEntry);
        }
      } catch (fileError) {
        console.error('File operation failed:', fileError);
        throw new Error('Failed to update log file');
      }

      // Log to Kanban if integration is enabled
      if (this.settings.kanbanIntegration && this.settings.currentTask) {
        await this.logToKanbanTask(this.settings.currentTask, action).catch(error => {
          console.error('Failed to log to Kanban:', error);
          // Don't rethrow to avoid masking the original success
        });
      }
    } catch (error) {
      console.error('Error in logSession:', error);
      // Don't throw to prevent breaking the main flow
    }
  }

  private async logToKanbanTask(taskId: string, action: string, taskElement?: HTMLElement): Promise<void> {
    if (!taskId) {
      console.warn('logToKanbanTask called with empty taskId');
      return;
    }

    try {
      const now = new Date();
      const timestamp = now.toLocaleString();
      const sessionTime = this.formatTime(this.timeRemaining);
      
      // Create log entry based on action
      let logMessage = '';
      
      if (action === 'start') {
        logMessage = `🍅 Started: ${timestamp} (${sessionTime})`;
      } else if (action === 'pause') {
        logMessage = `⏸️ Paused: ${timestamp} (${sessionTime})`;
      } else if (action === 'resume') {
        logMessage = `▶️ Resumed: ${timestamp} (${sessionTime})`;
      } else if (action === 'work_complete') {
        logMessage = `✅ Work complete: ${timestamp} (${this.settings.workDuration}min)`;
      } else if (action === 'break_complete') {
        logMessage = `🔄 Break complete: ${timestamp}`;
      } else if (action === 'reset') {
        logMessage = `🔄 Reset: ${timestamp}`;
      } else if (action === 'plugin_unloaded') {
        // Skip logging for plugin unload
        return;
      } else {
        // Skip unknown actions silently
        return;
      }

      // Find task element if not provided
      const targetElement = taskElement || this.findTaskElement(taskId);
      if (!targetElement) {
        // Task element not found - this is normal if tasks were reloaded or board changed
        // Only log in debug mode to avoid console spam
        if (this.settings.debugMode) {
          console.log('[Debug] Task element not found for:', taskId);
        }
        return;
      }

      // Update the UI with the log message
      this.updateTaskLogs(targetElement, logMessage, taskId);
    } catch (error) {
      console.error('Error in logToKanbanTask:', error);
      // Don't rethrow to prevent breaking the main flow
    }
  }

  private findTaskElement(taskId: string): HTMLElement | null {
    try {
      // Look for task items with matching data-task-id attribute
      const taskItem = document.querySelector(`[data-task-id="${taskId}"]`);
      if (taskItem) {
        return taskItem as HTMLElement;
      }
      
      // Fallback: check all task items
      const taskItems = Array.from(document.querySelectorAll('.pomodoro-task-item'));
      for (const item of taskItems) {
        if (item.getAttribute('data-task-id') === taskId) {
          return item as HTMLElement;
        }
      }
    } catch (error) {
      console.error('Error finding task element:', error);
    }
    return null;
  }

  private updateTaskLogs(taskElement: HTMLElement, logEntry: string, taskId: string): void {
    try {
      // Store log in persistent storage
      const logs = this.taskLogs.get(taskId) || [];
      logs.push({
        message: logEntry,
        timestamp: Date.now()
      });
      this.taskLogs.set(taskId, logs);

      // Keep only last 10 logs per task to prevent memory bloat
      if (logs.length > 10) {
        logs.shift();
      }

      // Update DOM
      let logContainer = taskElement.querySelector('.pomodoro-task-log') as HTMLElement;
      
      if (!logContainer) {
        logContainer = document.createElement('div');
        logContainer.className = 'pomodoro-task-log';
        logContainer.style.display = 'block';
        taskElement.appendChild(logContainer);
      }

      // Add the new log entry
      const sessionLog = document.createElement('div');
      sessionLog.className = 'pomodoro-session-log';
      sessionLog.textContent = logEntry;
      logContainer.appendChild(sessionLog);

      // Auto-hide if not current task
      if (this.settings.currentTask !== taskId) {
        setTimeout(() => {
          if (logContainer && this.settings.currentTask !== taskId) {
            logContainer.style.display = 'none';
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Error updating task logs:', error);
    }
  }

  // Restore task logs from storage when tasks are reloaded
  public restoreTaskLogs(taskElement: HTMLElement, taskId: string): void {
    const logs = this.taskLogs.get(taskId);
    if (!logs || logs.length === 0) return;

    // Find or create log container
    let logContainer = taskElement.querySelector('.pomodoro-task-log') as HTMLElement;
    
    if (!logContainer) {
      logContainer = document.createElement('div');
      logContainer.className = 'pomodoro-task-log';
      logContainer.style.display = this.settings.currentTask === taskId ? 'block' : 'none';
      taskElement.appendChild(logContainer);
    }

    // Clear existing logs in DOM (if any)
    logContainer.empty();

    // Restore all logs from storage
    for (const log of logs) {
      const sessionLog = document.createElement('div');
      sessionLog.className = 'pomodoro-session-log';
      sessionLog.textContent = log.message;
      logContainer.appendChild(sessionLog);
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
          console.log(`[Settings] Work duration changed from ${this.plugin.settings.workDuration} to ${value}`);
          
          // Update legacy setting
          this.plugin.settings.workDuration = value;
          
          // Update current schedule
          const currentSchedule = this.plugin.getCurrentSchedule();
          if (currentSchedule) {
            console.log(`[Settings] Updating current schedule '${currentSchedule.name}' workDuration to ${value}`);
            currentSchedule.workDuration = value;
          }
          
          await this.plugin.saveSettings();
          console.log('[Settings] Settings saved');
          
          // Reset timer to apply new duration
          this.plugin.resetTimer();
          console.log('[Settings] Timer reset');
          
          // Force update view (may not exist if settings opened before view created)
          const view = this.plugin.app.workspace.getLeavesOfType('circular-timer-view')[0]?.view;
          if (view) {
            console.log('[Settings] Updating view display');
            (view as any).updateDisplay();
          } else {
            console.log('[Settings] View not yet loaded - changes will apply on next view open');
          }
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
          
          // Update current schedule
          const currentSchedule = this.plugin.getCurrentSchedule();
          if (currentSchedule) {
            currentSchedule.shortBreakDuration = value;
          }
          
          await this.plugin.saveSettings();
          this.plugin.resetTimer();
          
          const view = this.plugin.app.workspace.getLeavesOfType('circular-timer-view')[0]?.view;
          if (view) {
            (view as any).updateDisplay();
          }
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
          
          // Update current schedule
          const currentSchedule = this.plugin.getCurrentSchedule();
          if (currentSchedule) {
            currentSchedule.longBreakDuration = value;
          }
          
          await this.plugin.saveSettings();
          this.plugin.resetTimer();
          
          const view = this.plugin.app.workspace.getLeavesOfType('circular-timer-view')[0]?.view;
          if (view) {
            (view as any).updateDisplay();
          }
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
          
          // Also update the current schedule's autoStartNext
          const currentSchedule = this.plugin.getCurrentSchedule();
          if (currentSchedule) {
            currentSchedule.autoStartNext = value;
            console.log(`[Settings] Updated autoStartNext for schedule '${currentSchedule.name}' to ${value}`);
          }
          
          await this.plugin.saveSettings();
        })
      );


      // Kanban board selection
    const kanbanBoardSetting = new Setting(containerEl)
      .setName('Kanban Board')
      .setDesc('Select a Kanban board to open and track tasks from');

    // Add refresh button
    kanbanBoardSetting.addButton(button => {
      button
        .setIcon('refresh-cw')
        .setTooltip('Refresh Kanban board list')
        .onClick(() => this.plugin.refreshKanbanList(kanbanBoardSetting.controlEl));
    });

    // Initial load of Kanban files
    this.plugin.refreshKanbanList(kanbanBoardSetting.controlEl);

    // Kanban Auto-Move Settings
    containerEl.createEl('h3', { text: 'Kanban Auto-Move Settings' });

    new Setting(containerEl)
      .setName('Auto-move to Progress')
      .setDesc('Automatically move selected tasks to the "In Progress" column (or equivalent)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoMoveToProgress)
        .onChange(async (value) => {
          this.plugin.settings.autoMoveToProgress = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Auto-move completed to Done')
      .setDesc('Automatically move checked tasks to the "Done" column (or equivalent)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoMoveToDone)
        .onChange(async (value) => {
          this.plugin.settings.autoMoveToDone = value;
          await this.plugin.saveSettings();
        })
      );

    // Per-Board Progress Column Settings
    new Setting(containerEl)
      .setName('Per-Board Progress Columns')
      .setHeading();

    new Setting(containerEl)
      .setName('Progress Column Selection')
      .setDesc('Configure preferred progress columns for each kanban board')
      .addButton(button => button
        .setButtonText('Configure Progress Columns')
        .setCta()
        .onClick(() => {
          // Open progress column configuration modal
          this.openProgressColumnConfig();
        })
      );

    new Setting(containerEl)
      .setName('Update timer in Kanban file')
      .setDesc('Show task timer (🍎 1:23) directly in Kanban file text')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.updateTaskTimerInFile)
        .onChange(async (value) => {
          this.plugin.settings.updateTaskTimerInFile = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Enable Schedule Summary')
      .setDesc('Automatically generate schedule summary from task timer logs')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableScheduleSummary)
        .onChange(async (value) => {
          this.plugin.settings.enableScheduleSummary = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Schedule Summary Path')
      .setDesc('Path to the schedule summary file')
      .addText(text => text
        .setPlaceholder('Pomodoro Schedule Summary.md')
        .setValue(this.plugin.settings.scheduleSummaryPath)
        .onChange(async (value) => {
          this.plugin.settings.scheduleSummaryPath = value;
          await this.plugin.saveSettings();
        })
      );

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
          // Update quick break button visibility without recreating view
          const view = this.plugin.app.workspace.getLeavesOfType('circular-timer-view')[0]?.view;
          if (view && 'updateQuickBreakVisibility' in view) {
            (view as any).updateQuickBreakVisibility();
          }
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

    
    // Button Display Settings
    new Setting(containerEl)
      .setName('Button Display Settings')
      .setHeading();

    new Setting(containerEl)
      .setName('Button Style')
      .setDesc('Choose how timer control buttons are displayed')
      .addDropdown(dropdown => {
        dropdown
          .addOption('icons+text', 'Icons + Text')
          .addOption('text', 'Text Only')
          .addOption('icons', 'Icons Only');
        dropdown.setValue(this.plugin.settings.buttonStyle);
        dropdown.onChange(async (value: string) => {
          this.plugin.settings.buttonStyle = value as 'icons+text' | 'text' | 'icons';
          await this.plugin.saveSettings();
          
          // Update the view to reflect new button style
          const view = this.plugin.app.workspace.getLeavesOfType('circular-timer-view')[0]?.view;
          if (view) {
            (view as any).updateButtonStyle();
          }
        });
      });

    new Setting(containerEl)
      .setName('Show Button Tooltips')
      .setDesc('Show tooltips on timer control buttons (only applies to icons-only mode)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showButtonTooltips)
        .onChange(async (value) => {
          this.plugin.settings.showButtonTooltips = value;
          await this.plugin.saveSettings();
          
          // Update the view to reflect tooltip setting
          const view = this.plugin.app.workspace.getLeavesOfType('circular-timer-view')[0]?.view;
          if (view) {
            (view as any).updateButtonTooltips();
          }
        })
      );

    new Setting(containerEl)
      .setName('Responsive Button Layout')
      .setDesc('Automatically switch to icons-only when sidebar width is less than 575px')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.responsiveButtons)
        .onChange(async (value) => {
          this.plugin.settings.responsiveButtons = value;
          await this.plugin.saveSettings();
          
          // Update the view to reflect responsive setting
          const view = this.plugin.app.workspace.getLeavesOfType('circular-timer-view')[0]?.view;
          if (view) {
            (view as any).updateResponsiveLayout();
          }
        })
      );

    // Sidebar View Settings
    new Setting(containerEl)
      .setName('Sidebar View')
      .setHeading();

    new Setting(containerEl)
      .setName('Default Sidebar View')
      .setDesc('Choose the default view when opening the sidebar')
      .addDropdown(dropdown => {
        dropdown
          .addOption('mini-calendar', 'Mini Calendar')
          .addOption('calendar-tasks', 'Calendar Tasks')
          .addOption('manual', 'Manual Kanban');
        dropdown.setValue(this.plugin.settings.sidebarView);
        dropdown.onChange(async (value: string) => {
          this.plugin.settings.sidebarView = value as 'mini-calendar' | 'calendar-tasks' | 'manual';
          await this.plugin.saveSettings();
          
          // Update the view to switch tabs
          const view = this.plugin.app.workspace.getLeavesOfType('circular-timer-view')[0]?.view;
          if (view) {
            (view as any).switchSidebarView(value);
          }
        });
      });

    // Calendar Settings
    new Setting(containerEl)
      .setName('Calendar Settings')
      .setHeading();

    new Setting(containerEl)
      .setName('Calendar Files Path')
      .setDesc('Directory where daily kanban files are stored')
      .addText(text => text
        .setPlaceholder('Daily Notes')
        .setValue(this.plugin.settings.calendarFilesPath)
        .onChange(async (value) => {
          this.plugin.settings.calendarFilesPath = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Auto-Create Calendar Files')
      .setDesc('Automatically create daily kanban files when accessing Calendar Tasks view')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoCreateCalendarFiles)
        .onChange(async (value) => {
          this.plugin.settings.autoCreateCalendarFiles = value;
          await this.plugin.saveSettings();
        })
      );

    // Schedule Management
    new Setting(containerEl)
      .setName('Schedule Management')
      .setHeading();

    // Current Schedule Selection
    new Setting(containerEl)
      .setName('Current Schedule')
      .setDesc('Select the active schedule to use')
      .addDropdown(dropdown => {
        // Populate with all available schedules
        this.plugin.settings.schedules.forEach(schedule => {
          dropdown.addOption(schedule.id, schedule.name);
        });
        dropdown.setValue(this.plugin.settings.currentScheduleId);
        dropdown.onChange(async (value: string) => {
          this.plugin.settings.currentScheduleId = value;
          await this.plugin.saveSettings();
          this.plugin.resetTimer();
          
          // Refresh the settings to show the selected schedule's details
          this.display();
        });
      });

    // Display current schedule info and management
    const currentSchedule = this.plugin.getCurrentSchedule();
    const scheduleInfoEl = containerEl.createDiv();
    scheduleInfoEl.createEl('h3', { text: `Current Schedule: ${currentSchedule.name}` });
    
    if (currentSchedule.phases && currentSchedule.phases.length > 0) {
      // Custom sequence display
      const phasesList = scheduleInfoEl.createEl('ul');
      currentSchedule.phases.forEach((phase, index) => {
        const phaseItem = phasesList.createEl('li');
        phaseItem.setText(`${index + 1}. ${phase.name || phase.type}: ${phase.duration} min`);
      });
    } else {
      // Legacy schedule display
      const legacyInfo = scheduleInfoEl.createEl('p');
      legacyInfo.setText(`Work: ${currentSchedule.workDuration}min, Short Break: ${currentSchedule.shortBreakDuration}min, Long Break: ${currentSchedule.longBreakDuration}min`);
    }

    // Add new schedule button
    new Setting(containerEl)
      .setName('Add New Schedule')
      .setDesc('Create a new custom schedule with phases')
      .addButton(button => button
        .setButtonText('Add Schedule')
        .onClick(async () => {
          const scheduleName = await this.showScheduleNameDialog();
          if (scheduleName) {
            await this.addNewSchedule(scheduleName);
            this.display(); // Refresh settings
          }
        })
      );

    // Edit/Delete current schedule (not the default one)
    if (currentSchedule.id !== 'default') {
      const editDeleteContainer = containerEl.createDiv();
      editDeleteContainer.style.display = 'flex';
      editDeleteContainer.style.gap = '10px';
      editDeleteContainer.style.marginTop = '10px';

      const editButton = editDeleteContainer.createEl('button');
      editButton.textContent = 'Edit Schedule';
      editButton.onclick = async () => {
        await this.editSchedule(currentSchedule.id);
        this.display(); // Refresh settings
      };

      const deleteButton = editDeleteContainer.createEl('button');
      deleteButton.textContent = 'Delete Schedule';
      deleteButton.style.color = 'red';
      deleteButton.onclick = async () => {
        const confirmed = await this.showConfirmDialog(`Delete schedule "${currentSchedule.name}"?`);
        if (confirmed) {
          await this.plugin.deleteSchedule(currentSchedule.id);
          this.display(); // Refresh settings
        }
      };
    }

    // Sound Settings with Preview
    new Setting(containerEl)
      .setName('Break Sounds')
      .setHeading();

    new Setting(containerEl)
      .setName('Quick Break Sound Preview')
      .setDesc('Test the currently selected quick break sound')
      .addButton(button => button
        .setButtonText('Test')
        .onClick(() => {
          // Play the sound selected in the dropdown above
          const selectedSound = this.plugin.settings.quickBreakSound;
          if (selectedSound !== 'none') {
            this.plugin.playSound(selectedSound);
          } else {
            new Notice('Quick break sound is set to "None"');
          }
        })
      );
      
    new Setting(containerEl)
      .setName('Short Break Sound')
      .setDesc('Three quick beeps at 693Hz')
      .addButton(button => button
        .setButtonText('Test')
        .onClick(() => {
          this.plugin.playSound('shortbreak');
        })
      );
      
    new Setting(containerEl)
      .setName('Long Break Sound')
      .setDesc('One sustained beep at 528Hz')
      .addButton(button => button
        .setButtonText('Test')
        .onClick(() => {
          this.plugin.playSound('longbreak');
        })
      );
      
    new Setting(containerEl)
      .setName('Work Start Sound')
      .setDesc('Standard bell sound')
      .addButton(button => button
        .setButtonText('Test')
        .onClick(() => {
          this.plugin.playSound('ding');
        })
      );
  }

  // Helper methods for schedule management
  private async showScheduleNameDialog(): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = new ScheduleNameModal(this.app, (name: string) => {
        resolve(name);
      }, () => {
        resolve(null);
      });
      modal.open();
    });
  }

  private async addNewSchedule(name: string): Promise<void> {
    const newSchedule: Omit<TimeSchedule, 'id'> = {
      name: name,
      phases: [
        { type: 'work', duration: 25, name: 'Work' },
        { type: 'shortBreak', duration: 5, name: 'Short Break' },
        { type: 'work', duration: 25, name: 'Work' },
        { type: 'shortBreak', duration: 5, name: 'Short Break' },
        { type: 'work', duration: 25, name: 'Work' },
        { type: 'shortBreak', duration: 5, name: 'Short Break' },
        { type: 'work', duration: 25, name: 'Work' },
        { type: 'longBreak', duration: 15, name: 'Long Break' }
      ],
      autoStartNext: false,
      enableQuickBreak: true,
      quickBreakDuration: 3,
      quickBreakSound: 'ding'
    };

    const created = await this.plugin.addSchedule(newSchedule);
    await this.plugin.switchSchedule(created.id);
    new Notice(`Schedule "${name}" created successfully`);
  }

  private async editSchedule(scheduleId: string): Promise<void> {
    const schedule = this.plugin.getSchedule(scheduleId);
    if (!schedule) return;

    const modal = new ScheduleEditModal(this.app, schedule, async (updatedSchedule) => {
      await this.plugin.updateSchedule(updatedSchedule.id, updatedSchedule);
      new Notice(`Schedule "${updatedSchedule.name}" updated successfully`);
    });
    modal.open();
  }

  private async showConfirmDialog(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = new ConfirmModal(this.app, message, () => {
        resolve(true);
      }, () => {
        resolve(false);
      });
      modal.open();
    });
  }

  openProgressColumnConfig() {
    const modal = new ProgressColumnConfigModal(this.app, this.plugin);
    modal.open();
  }
}

// Modal classes for schedule management
class ScheduleNameModal extends Modal {
  private resolve: (name: string) => void;
  private reject: () => void;
  private inputEl!: HTMLInputElement;

  constructor(app: App, onSubmit: (name: string) => void, onCancel: () => void) {
    super(app);
    this.resolve = onSubmit;
    this.reject = onCancel;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'New Schedule Name' });

    const inputContainer = contentEl.createDiv();
    this.inputEl = inputContainer.createEl('input', {
      type: 'text',
      placeholder: 'Enter schedule name...'
    });
    this.inputEl.style.width = '100%';
    this.inputEl.style.marginBottom = '1em';

    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.justifyContent = 'flex-end';

    const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelButton.onclick = () => {
      this.reject();
      this.close();
    };

    const createButton = buttonContainer.createEl('button', { text: 'Create' });
    createButton.onclick = () => {
      const name = this.inputEl.value.trim();
      if (name) {
        this.resolve(name);
        this.close();
      } else {
        new Notice('Please enter a schedule name');
      }
    };

    // Focus input and allow Enter key
    this.inputEl.focus();
    this.inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        createButton.click();
      }
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class ScheduleEditModal extends Modal {
  private schedule: TimeSchedule;
  private resolve: (schedule: TimeSchedule) => void;
  private phasesContainer!: HTMLElement;

  constructor(app: App, schedule: TimeSchedule, onSubmit: (schedule: TimeSchedule) => void) {
    super(app);
    this.schedule = { ...schedule }; // Create a copy
    this.resolve = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: `Edit Schedule: ${this.schedule.name}` });

    // Schedule name
    new Setting(contentEl)
      .setName('Schedule Name')
      .addText(text => text
        .setPlaceholder('Schedule name')
        .setValue(this.schedule.name)
        .onChange(async (value) => {
          this.schedule.name = value;
        })
      );

    // Schedule type toggle
    new Setting(contentEl)
      .setName('Schedule Type')
      .setDesc('Choose between legacy simple schedule or custom phase sequence')
      .addDropdown(dropdown => {
        dropdown
          .addOption('legacy', 'Legacy (Work/Short/Long)')
          .addOption('custom', 'Custom Phases');
        
        const isCustom = this.schedule.phases && this.schedule.phases.length > 0;
        dropdown.setValue(isCustom ? 'custom' : 'legacy');
        
        dropdown.onChange(async (value) => {
          if (value === 'custom') {
            // Convert to custom if not already
            if (!this.schedule.phases || this.schedule.phases.length === 0) {
              this.schedule.phases = [
                { type: 'work', duration: this.schedule.workDuration || 25, name: 'Work' },
                { type: 'shortBreak', duration: this.schedule.shortBreakDuration || 5, name: 'Short Break' },
                { type: 'work', duration: this.schedule.workDuration || 25, name: 'Work' },
                { type: 'shortBreak', duration: this.schedule.shortBreakDuration || 5, name: 'Short Break' },
                { type: 'work', duration: this.schedule.workDuration || 25, name: 'Work' },
                { type: 'shortBreak', duration: this.schedule.shortBreakDuration || 5, name: 'Short Break' },
                { type: 'work', duration: this.schedule.workDuration || 25, name: 'Work' },
                { type: 'longBreak', duration: this.schedule.longBreakDuration || 15, name: 'Long Break' }
              ];
            }
          } else {
            // Convert to legacy
            this.schedule.phases = undefined;
          }
          this.renderPhasesSection();
        });
      });

    // Legacy settings (shown only when not using custom phases)
    const legacyContainer = contentEl.createDiv();
    legacyContainer.id = 'legacy-settings';
    
    new Setting(legacyContainer)
      .setName('Work Duration (minutes)')
      .addSlider(slider => slider
        .setLimits(1, 60, 1)
        .setValue(this.schedule.workDuration || 25)
        .onChange(async (value) => {
          this.schedule.workDuration = value;
        })
      );

    new Setting(legacyContainer)
      .setName('Short Break Duration (minutes)')
      .addSlider(slider => slider
        .setLimits(1, 30, 1)
        .setValue(this.schedule.shortBreakDuration || 5)
        .onChange(async (value) => {
          this.schedule.shortBreakDuration = value;
        })
      );

    new Setting(legacyContainer)
      .setName('Long Break Duration (minutes)')
      .addSlider(slider => slider
        .setLimits(1, 60, 1)
        .setValue(this.schedule.longBreakDuration || 15)
        .onChange(async (value) => {
          this.schedule.longBreakDuration = value;
        })
      );

    // Custom phases section
    this.phasesContainer = contentEl.createDiv();
    this.phasesContainer.id = 'custom-phases';
    
    // Common settings
    new Setting(contentEl)
      .setName('Auto-start Next Session')
      .setDesc('Automatically start the next session after completion')
      .addToggle(toggle => toggle
        .setValue(this.schedule.autoStartNext)
        .onChange(async (value) => {
          this.schedule.autoStartNext = value;
        })
      );

    // Buttons
    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.marginTop = '1em';

    const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelButton.onclick = () => {
      this.close();
    };

    const saveButton = buttonContainer.createEl('button', { text: 'Save' });
    saveButton.onclick = () => {
      if (!this.schedule.name.trim()) {
        new Notice('Schedule name cannot be empty');
        return;
      }
      this.resolve(this.schedule);
      this.close();
    };

    // Initial render
    this.renderPhasesSection();
  }

  private renderPhasesSection() {
    this.phasesContainer.empty();
    
    const isCustom = this.schedule.phases && this.schedule.phases.length > 0;
    const legacyEl = document.getElementById('legacy-settings');
    const phasesEl = this.phasesContainer;
    
    if (legacyEl) {
      legacyEl.style.display = isCustom ? 'none' : 'block';
    }
    phasesEl.style.display = isCustom ? 'block' : 'none';

    if (isCustom) {
      phasesEl.createEl('h3', { text: 'Custom Phases' });
      
      const phasesList = phasesEl.createDiv();
      phasesList.style.marginBottom = '1em';

      this.schedule.phases!.forEach((phase, index) => {
        const phaseContainer = phasesList.createDiv();
        phaseContainer.style.display = 'flex';
        phaseContainer.style.alignItems = 'center';
        phaseContainer.style.gap = '10px';
        phaseContainer.style.marginBottom = '5px';

        // Phase number
        phaseContainer.createSpan({ text: `${index + 1}.` });

        // Phase type
        const typeDropdown = phaseContainer.createEl('select');
        ['work', 'shortBreak', 'longBreak'].forEach(type => {
          const option = typeDropdown.createEl('option', { 
            text: type === 'work' ? 'Work' : type === 'shortBreak' ? 'Short Break' : 'Long Break',
            value: type
          });
          if (phase.type === type) {
            option.selected = true;
          }
        });
        typeDropdown.onchange = () => {
          phase.type = typeDropdown.value as 'work' | 'shortBreak' | 'longBreak';
        };

        // Duration
        const durationInput = phaseContainer.createEl('input', { type: 'number' });
        durationInput.value = phase.duration.toString();
        durationInput.min = '1';
        durationInput.max = '120';
        durationInput.style.width = '60px';
        durationInput.onchange = () => {
          phase.duration = parseInt(durationInput.value) || 25;
        };

        phaseContainer.createSpan({ text: 'min' });

        // Custom name
        const nameInput = phaseContainer.createEl('input', { type: 'text' });
        nameInput.value = phase.name || '';
        nameInput.placeholder = 'Custom name (optional)';
        nameInput.style.flex = '1';
        nameInput.onchange = () => {
          phase.name = nameInput.value || undefined;
        };

        // Remove button
        if (this.schedule.phases!.length > 1) {
          const removeButton = phaseContainer.createEl('button', { text: '×' });
          removeButton.style.color = 'red';
          removeButton.style.padding = '0 5px';
          removeButton.onclick = () => {
            this.schedule.phases!.splice(index, 1);
            this.renderPhasesSection();
          };
        }
      });

      // Add phase button
      const addButton = phasesList.createEl('button', { text: 'Add Phase' });
      addButton.onclick = () => {
        this.schedule.phases!.push({ 
          type: 'work', 
          duration: 25, 
          name: 'Work' 
        });
        this.renderPhasesSection();
      };
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class ConfirmModal extends Modal {
  private message: string;
  private resolve: (confirmed: boolean) => void;

  constructor(app: App, message: string, onConfirm: () => void, onCancel: () => void) {
    super(app);
    this.message = message;
    this.resolve = (confirmed: boolean) => {
      if (confirmed) {
        onConfirm();
      } else {
        onCancel();
      }
    };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Confirm' });
    contentEl.createEl('p', { text: this.message });

    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.marginTop = '1em';

    const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelButton.onclick = () => {
      this.resolve(false);
      this.close();
    };

    const confirmButton = buttonContainer.createEl('button', { text: 'Confirm' });
    confirmButton.style.color = 'red';
    confirmButton.onclick = () => {
      this.resolve(true);
      this.close();
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class ProgressColumnConfigModal extends Modal {
  plugin: EnhancedPomodoro;

  constructor(app: App, plugin: EnhancedPomodoro) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Progress Column Configuration' });
    contentEl.createEl('p', { 
      text: 'Configure which column to use as the "In Progress" column for each kanban board. This helps when boards have multiple progress-like columns.' 
    });

    const container = contentEl.createDiv('progress-column-config');

    // Get all kanban files
    const kanbanFiles = Object.keys(this.plugin.settings.perBoardProgressColumns || {});
    
    if (kanbanFiles.length === 0) {
      const emptyState = container.createDiv('empty-state');
      emptyState.createEl('p', { text: 'No kanban boards configured yet. Use kanban boards first to set up progress column preferences.' });
    } else {
      kanbanFiles.forEach(boardPath => {
        const boardSetting = new Setting(container)
          .setName(boardPath)
          .setDesc('Progress column for this board')
          .addText(text => text
            .setPlaceholder('In Progress')
            .setValue(this.plugin.settings.perBoardProgressColumns[boardPath] || '')
            .onChange(async (value) => {
              this.plugin.settings.perBoardProgressColumns[boardPath] = value;
              await this.plugin.saveSettings();
            })
          );

        // Add remove button
        boardSetting.addButton(button => button
          .setButtonText('Remove')
          .setWarning()
          .onClick(async () => {
            delete this.plugin.settings.perBoardProgressColumns[boardPath];
            await this.plugin.saveSettings();
            this.onOpen(); // Refresh modal
          })
        );
      });
    }

    // Add instructions
    const instructions = contentEl.createDiv('instructions');
    instructions.createEl('h3', { text: 'How to use:' });
    instructions.createEl('ol', {}, ol => {
      ol.createEl('li', { text: 'Use kanban boards with multiple progress columns' });
      ol.createEl('li', { text: 'When prompted, select your preferred progress column' });
      ol.createEl('li', { text: 'Or configure manually here' });
      ol.createEl('li', { text: 'The plugin will remember your choice for each board' });
    });

    // Close button
    const buttonContainer = contentEl.createDiv('modal-button-container');
    buttonContainer.style.marginTop = '20px';
    buttonContainer.style.textAlign = 'right';

    const closeButton = buttonContainer.createEl('button', { text: 'Close' });
    closeButton.onclick = () => this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
