import { ItemView, TFile, WorkspaceLeaf, Notice } from 'obsidian';

export const CIRCULAR_TIMER_VIEW = 'circular-timer-view';

export class CircularTimerView extends ItemView {
  private kanbanSelector: HTMLSelectElement | null = null;
  private tasksContainer: HTMLElement | null = null;
  private refreshButton: HTMLButtonElement | null = null;
  private warningElement: HTMLElement | null = null;
  private warningTimeout: number | null = null;
  private quickBreakButton: HTMLElement | null = null;

  private modeSpan!: HTMLSpanElement;
  private timeSpan!: HTMLSpanElement;
  private progressCircle!: SVGCircleElement;
  private playBtn!: HTMLElement;
  private svgElement!: SVGSVGElement;
  private debugStartDot!: SVGCircleElement;
  private debugEndDot!: SVGCircleElement;
  private startHitArea!: SVGCircleElement;
  private endHitArea!: SVGCircleElement;
  private isDragging: boolean = false;
  private dragTarget: 'start' | 'end' | null = null;
  private snapIndicators: SVGCircleElement[] = [];
  private animationFrameId: number | null = null;

  constructor(leaf: WorkspaceLeaf, private plugin: any) {
    super(leaf);
  }

  private async updateTaskCompletionState(taskId: string, completed: boolean) {
    try {
      const boardPath = this.plugin.settings.kanbanBoardPath;
      if (!boardPath) return;

      const file = this.app.vault.getAbstractFileByPath(boardPath);
      if (!(file instanceof TFile)) return;

      const taskElement = this.tasksContainer?.querySelector(`[data-task-id="${taskId}"]`);
      if (!taskElement) return;

      const taskTextElement = taskElement.querySelector('.task-text');
      if (!taskTextElement) return;

      let originalText = taskTextElement.textContent || '';
      originalText = originalText
        .replace(/ - 🍎 \d+:\d{2}/g, '')
        .replace(/ - \d+:\d{2}/g, '')
        .replace(/ \[\d+:\d{2}\]/g, '')
        .trim();

      const content = await this.app.vault.read(file);
      const lines = content.split('\n');
      let updated = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if ((line.includes('- [') || line.includes('* [')) && line.includes(originalText)) {
          const checkboxPattern = /([-*]\s+\[)([ xX])(\])/;

          if (checkboxPattern.test(line)) {
            lines[i] = line.replace(checkboxPattern, (_, prefix, _state, suffix) => {
              const newState = completed ? 'x' : ' ';
              return `${prefix}${newState}${suffix}`;
            });
            updated = true;
            break;
          }
        }
      }

      if (updated) {
        await this.app.vault.modify(file, lines.join('\n'));
        this.lastKanbanUpdateTime = Date.now();
        console.log(`[KANBAN UPDATE] Task completion state updated: ${originalText} → ${completed ? '[x]' : '[ ]'}`);
      }
    } catch (error) {
      console.error('[KANBAN UPDATE] Failed to update completion state:', error);
    }
  }

  getViewType(): string {
    return CIRCULAR_TIMER_VIEW;
  }

  getDisplayText(): string {
    return 'Pomodoro Timer';
  }

  getIcon(): string {
    return 'timer';
  }

  async onOpen() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    
    // Create main container with flex column layout
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100%';
    
    // Create timer container (no duplicate header - Obsidian provides one)
    const timerContainer = container.createDiv('pomodoro-timer-container');
    
    // Create SVG container
    const svgContainer = document.createElement('div');
    svgContainer.className = 'pomodoro-svg-container';
    
    // Create SVG element using createElementNS
    this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgElement.setAttribute('viewBox', '0 0 100 100');
    this.svgElement.setAttribute('width', '100%');
    this.svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svgElement.setAttribute('aria-label', 'Pomodoro Timer');
    this.svgElement.setAttribute('role', 'img');
    this.svgElement.style.height = 'auto';
    
    svgContainer.appendChild(this.svgElement);
    timerContainer.appendChild(svgContainer);
    
    // Add controls below the timer
    const controls = container.createDiv('pomodoro-controls');
    
    // Add tasks container BEFORE selector (needed for loadKanbanTasks)
    this.tasksContainer = container.createDiv('pomodoro-tasks');
    this.tasksContainer.style.flexGrow = '1';
    this.tasksContainer.style.overflowY = 'auto';
    
    // Add Kanban board selector (after tasksContainer exists)
    await this.addKanbanBoardSelector(controls);
    
    // Initialize SVG elements
    this.initializeSvgElements();
    
    // Add styles
    this.addStyles();
    
    // Start the animation loop
    this.animate();
    
    // Small delay to ensure metadata cache is ready and reload boards
    setTimeout(async () => {
      await this.loadKanbanBoards();
      
      // Load tasks from the selected Kanban board if one is set
      if (this.plugin.settings.kanbanBoardPath) {
        try {
          await this.loadKanbanTasks(this.plugin.settings.kanbanBoardPath);
        } catch (error) {
          console.error('Failed loading Kanban tasks:', error);
        }
      }
    }, 500);
  }
  
  private initializeSvgElements() {
    const svgNS = 'http://www.w3.org/2000/svg';
    
    // Background circle (centered in viewBox)
    const bgCircle = document.createElementNS(svgNS, 'circle');
    bgCircle.setAttribute('class', 'circle-bg');
    bgCircle.setAttribute('r', '45');
    bgCircle.setAttribute('cy', '50');
    bgCircle.setAttribute('cx', '50');
    bgCircle.setAttribute('stroke-width', '1');
    bgCircle.setAttribute('fill', 'none');
    
    // Progress circle
    const progressCircle = document.createElementNS(svgNS, 'circle');
    progressCircle.setAttribute('class', 'circle-progress');
    progressCircle.setAttribute('r', '45');
    progressCircle.setAttribute('cy', '50');
    progressCircle.setAttribute('cx', '50');
    progressCircle.setAttribute('stroke-width', '4');
    progressCircle.setAttribute('fill', 'none');
    progressCircle.setAttribute('transform', 'rotate(-90 50 50)'); // Rotate to start at top
    
    // Mode text (inside circle, above time)
    const modeText = document.createElementNS(svgNS, 'text');
    modeText.setAttribute('class', 'mode-text');
    modeText.setAttribute('x', '50');
    modeText.setAttribute('y', '45');
    modeText.setAttribute('text-anchor', 'middle');
    modeText.setAttribute('font-size', '8');
    modeText.textContent = 'Work';
    
    // Time text (inside circle, center)
    const timeText = document.createElementNS(svgNS, 'text');
    timeText.setAttribute('class', 'timer-text');
    timeText.setAttribute('x', '50');
    timeText.setAttribute('y', '55');
    timeText.setAttribute('text-anchor', 'middle');
    timeText.setAttribute('font-size', '12');
    // Use the actual current time from the plugin
    const totalMinutes = Math.floor(this.plugin.getTotalTime() / 60);
    timeText.textContent = `${totalMinutes}:00`;
    
    this.svgElement.appendChild(bgCircle);
    this.svgElement.appendChild(progressCircle);
    this.svgElement.appendChild(modeText);
    this.svgElement.appendChild(timeText);
    
    // Debug mode: draggable dots (both start at top/12 o'clock)
    const debugStartDot = document.createElementNS(svgNS, 'circle');
    debugStartDot.setAttribute('class', 'debug-dot debug-start-dot');
    debugStartDot.setAttribute('r', '3');
    debugStartDot.setAttribute('fill', '#ff6b6b');
    debugStartDot.setAttribute('stroke', '#ff0000');
    debugStartDot.setAttribute('stroke-width', '1');
    debugStartDot.setAttribute('cx', '50');
    debugStartDot.setAttribute('cy', '5'); // Top of circle (12 o'clock)
    debugStartDot.style.cursor = 'pointer';
    debugStartDot.style.display = 'none';
    
    const debugEndDot = document.createElementNS(svgNS, 'circle');
    debugEndDot.setAttribute('class', 'debug-dot debug-end-dot');
    debugEndDot.setAttribute('r', '3');
    debugEndDot.setAttribute('fill', '#51cf66');
    debugEndDot.setAttribute('stroke', '#00aa00');
    debugEndDot.setAttribute('stroke-width', '1');
    debugEndDot.setAttribute('cx', '50');
    debugEndDot.setAttribute('cy', '5'); // Also starts at top (12 o'clock)
    debugEndDot.style.cursor = 'pointer';
    debugEndDot.style.display = 'none';
    
    this.svgElement.appendChild(debugStartDot);
    this.svgElement.appendChild(debugEndDot);
    
    // Create button group below the SVG
    const timerContainer = this.svgElement.parentElement?.parentElement;
    if (!timerContainer) {
      console.error('Timer container not found');
      return;
    }
    
    const btnGroup = timerContainer.createDiv({ cls: 'btn-group' });
    
    // Play/Pause button
    const playBtn = btnGroup.createEl('span', { cls: 'control-icon' });
    playBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    playBtn.addEventListener('click', () => {
      if (!this.plugin.isRunning) {
        // If timer is at start, check current mode to decide which timer to start
        if (this.plugin.timeRemaining === this.plugin.getTotalTime()) {
          if (this.plugin.currentMode === 'work') {
            this.plugin.startPomodoro();
          } else {
            // For breaks, just start the timer without changing the mode
            this.plugin.isRunning = true;
            this.plugin.startTimer();
          }
        } else {
          // Resume the current timer
          this.plugin.togglePause();
        }
      } else {
        // If running, pause it
        this.plugin.togglePause();
      }
    });
    
    // Settings button (leftmost)
    const settingsBtn = btnGroup.createEl('span', { 
      cls: 'control-icon',
      attr: { 'aria-label': 'Open Pomodoro Settings' }
    });
    settingsBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24m-4.24 4.24l4.24 4.24M20 12h-6m-6 0H2m13.22 4.22l-4.24 4.24m-4.24-4.24l-4.24 4.24"></path></svg>`;
    settingsBtn.onclick = () => {
      // Open settings tab for this plugin
      (this.app as any).setting.open();
      (this.app as any).setting.openTabById('enhanced-pomodoro');
    };
    
    // Quick Break button
    const quickBreakBtn = btnGroup.createEl('span', {
      cls: `control-icon ${!this.plugin.settings.enableQuickBreak ? 'control-icon-disabled' : ''}`,
      attr: { 'aria-label': this.plugin.settings.enableQuickBreak 
        ? `Quick ${this.plugin.settings.quickBreakDuration} min break`
        : 'Quick break disabled' }
    });
    quickBreakBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    quickBreakBtn.onclick = () => {
      if (this.plugin.settings.enableQuickBreak) {
        this.plugin.startQuickBreak();
      }
    };
    // Store reference for updates
    this.quickBreakButton = quickBreakBtn;
    
    // Reset button
    const resetBtn = btnGroup.createEl('span', { cls: 'control-icon' });
    resetBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>`;
    resetBtn.onclick = () => {
      this.plugin.resetTimer();
    };
    
    // Store references for updates (SVG text elements)
    this.modeSpan = modeText as any; // SVG text element
    this.timeSpan = timeText as any; // SVG text element
    this.progressCircle = progressCircle;
    this.playBtn = playBtn;
    // this.svgElement is already set in onOpen()
    this.debugStartDot = debugStartDot;
    this.debugEndDot = debugEndDot;
    
    // Setup debug mode drag handlers
    this.setupDebugHandlers();
    
    // Start update loop
    this.startAnimation();
  }
  
  private startAnimation() {
    const update = () => {
      this.updateDisplay();
      // Update active task timer if in work mode
      if (this.plugin.currentMode === 'work') {
        this.updateActiveTaskTimer();
      }
      this.animationFrameId = requestAnimationFrame(update);
    };
    update();
  }
  
  private updateProgress() {
    if (!this.progressCircle) return;
    
    const timeRemaining = this.plugin.timeRemaining || 0;
    const totalTime = this.plugin.getTotalTime();
    
    // Calculate progress (0 = start, 1 = complete)
    const progress = Math.min(1, Math.max(0, 1 - (timeRemaining / totalTime)));
    const circumference = 2 * Math.PI * 45; // 2πr where r=45
    
    // Calculate offset - starts full and decreases as time progresses
    const offset = circumference * (1 - progress);
    
    // Update the progress circle
    this.progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    this.progressCircle.style.strokeDashoffset = offset.toString();
  }

  private updateDisplay() {
    if (!this.timeSpan || !this.progressCircle || !this.modeSpan) return;
    
    const timeRemaining = this.plugin.timeRemaining || 0;
    const totalTime = this.plugin.getTotalTime();
    
    // Update time display (SVG text element uses textContent)
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = Math.floor(timeRemaining % 60);
    this.timeSpan.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Update mode display (SVG text element uses textContent)
    const modeText = this.plugin.currentMode === 'work' ? 'Work' :
      this.plugin.currentMode === 'shortBreak' ? 'Short Break' :
        'Long Break';
    this.modeSpan.textContent = modeText;
    
    this.updateProgress();
    
    // Update play/pause icon
    if (this.playBtn) {
      if (this.plugin.isRunning) {
        // Pause icon
        this.playBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
      } else {
        // Play icon
        this.playBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
      }
    }
    
    // Update debug dots position
    this.updateDebugDots();
  }
 
  private setupDebugHandlers() {
    // Create larger hit areas for the dots with better visibility in debug mode
    const createHitArea = (target: 'start' | 'end') => {
      const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const isDebugMode = this.plugin.settings?.debugMode || false;
      const size = isDebugMode ? 16 : 12; // Larger hit area in debug mode
      
      hitArea.setAttribute('class', `debug-hit-area debug-hit-${target}`);
      hitArea.setAttribute('r', size.toString());
      hitArea.setAttribute('fill', isDebugMode ? 'rgba(0, 120, 212, 0.1)' : 'transparent');
      hitArea.setAttribute('stroke', isDebugMode ? 'rgba(0, 120, 212, 0.3)' : 'transparent');
      hitArea.setAttribute('stroke-width', isDebugMode ? '1' : '0');
      hitArea.style.pointerEvents = 'all';
      hitArea.style.cursor = 'grab';
      hitArea.style.transition = 'all 0.2s ease';
      
      // Position will be updated in updateDebugDots
      hitArea.setAttribute('cx', '0');
      hitArea.setAttribute('cy', '0');
      
      // Add hover effects in debug mode
      if (isDebugMode) {
        hitArea.addEventListener('mouseenter', () => {
          hitArea.setAttribute('fill', 'rgba(0, 120, 212, 0.2)');
          hitArea.setAttribute('r', (size + 2).toString());
        });
        
        hitArea.addEventListener('mouseleave', () => {
          hitArea.setAttribute('fill', 'rgba(0, 120, 212, 0.1)');
          hitArea.setAttribute('r', size.toString());
        });
      }
      
      // Add event listeners with passive: true for better performance
      hitArea.addEventListener('mousedown', (e) => this.startDrag(e, target));
      hitArea.addEventListener('touchstart', (e) => this.startDrag(e, target), { passive: true });
      
      // Prevent context menu on long press
      hitArea.addEventListener('contextmenu', (e) => e.preventDefault());
      
      this.svgElement.appendChild(hitArea);
      return hitArea;
    };
    
    const startHitArea = createHitArea('start');
    const endHitArea = createHitArea('end');
    
    // Store references to hit areas for updating positions
    this.startHitArea = startHitArea;
    this.endHitArea = endHitArea;
    
    // Mouse events for the dots (for visual feedback)
    this.debugStartDot.addEventListener('mousedown', (e) => this.startDrag(e, 'start'));
    this.debugEndDot.addEventListener('mousedown', (e) => this.startDrag(e, 'end'));
    
    this.svgElement.addEventListener('mousemove', (e) => {
      // Only process if we're dragging
      if (this.isDragging && this.dragTarget) {
        this.onDrag(e);
      }
    });
    this.svgElement.addEventListener('mouseup', () => this.stopDrag());
    this.svgElement.addEventListener('mouseleave', () => this.stopDrag());
    
    // Touch events for the dots (for visual feedback)
    this.debugStartDot.addEventListener('touchstart', (e) => this.startDrag(e, 'start'));
    this.debugEndDot.addEventListener('touchstart', (e) => this.startDrag(e, 'end'));
    
    this.svgElement.addEventListener('touchmove', (e) => {
      // Only process if we're dragging
      if (this.isDragging && this.dragTarget) {
        this.onDrag(e);
      }
    });
    this.svgElement.addEventListener('touchend', () => this.stopDrag());
  }
  
  private startDrag(e: MouseEvent | TouchEvent, target: 'start' | 'end') {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    this.isDragging = true;
    this.dragTarget = target;
    
    // Set cursor to grabbing
    this.debugStartDot.style.cursor = 'grabbing';
    this.debugEndDot.style.cursor = 'grabbing';
    if (this.startHitArea) this.startHitArea.style.cursor = 'grabbing';
    if (this.endHitArea) this.endHitArea.style.cursor = 'grabbing';
    
    // Show debug elements in debug mode
    if (this.plugin.settings.debugMode) {
      this.debugStartDot.style.display = 'block';
      this.debugEndDot.style.display = 'block';
      if (this.startHitArea) this.startHitArea.style.display = 'block';
      if (this.endHitArea) this.endHitArea.style.display = 'block';
      this.svgElement.classList.add('debug-mode');
    }
  }
  
  private onDrag(e: MouseEvent | TouchEvent) {
    // Only process drag events if we're actually dragging
    if (!this.isDragging || !this.dragTarget) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // Get mouse/touch position relative to SVG
    const svgRect = this.svgElement.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Convert to SVG coordinates (viewBox is 0-100, center is at 50,50)
    const svgX = ((clientX - svgRect.left) / svgRect.width) * 100;
    const svgY = ((clientY - svgRect.top) / svgRect.height) * 100;
    
    const x = svgX - 50; // Center X is at 50
    const y = svgY - 50;  // Center Y is at 50
    
    // Calculate angle (in radians) from center to mouse position
    // atan2 returns angle from -π to π, where 0 is at 3 o'clock
    let angle = Math.atan2(y, x);
    
    // Rotate by -90 degrees to start from top (12 o'clock) instead of right (3 o'clock)
    angle = angle + Math.PI / 2;
    
    // Normalize to 0-2π range
    if (angle < 0) angle += 2 * Math.PI;
    
    // Convert angle to progress (0-1), where 0 is at top going clockwise
    let progress = angle / (2 * Math.PI);
    
    // Calculate time based on progress
    const totalTime = this.plugin.getTotalTime();
    let newTime = Math.round(progress * totalTime);
    
    // Apply snapping if needed (only for end dot)
    if (this.dragTarget === 'end') {
      newTime = this.snapTime(newTime, totalTime);
      // Recalculate progress after snapping
      progress = newTime / totalTime;
    }
    
    // Update the timer based on which dot is being dragged
    if (this.dragTarget === 'start') {
      // For start dot, adjust the time remaining
      this.plugin.timeRemaining = Math.max(0, Math.min(totalTime, totalTime - newTime));
    } else {
      // For end dot, set time remaining (inverse of progress)
      // Progress of 0.25 (quarter circle) means 75% time remaining
      this.plugin.timeRemaining = totalTime - newTime;
    }
    
    // Update the display
    this.updateDisplay();
  }
  
  // Snap time to nearest 5-minute interval, except in the last 5 minutes
  private snapTime(time: number, totalTime: number): number {
    const minutes = time / 60; // Convert to minutes with decimals
    const totalMinutes = totalTime / 60;
    const interval = 5; // 5 minutes
    
    // Don't snap if total time is less than 5 minutes
    if (totalTime <= 5 * 60) {
      return time;
    }
    
    // Calculate the last 5 minutes in seconds
    const lastFiveMinutes = totalTime - (5 * 60);
    
    // If we're in the last 5 minutes, don't snap
    if (time >= lastFiveMinutes) {
      return time;
    }
    
    // Calculate the nearest 5-minute interval
    const currentInterval = Math.round(minutes / interval) * interval;
    let snappedTime = currentInterval * 60;
    
    // Ensure we don't go below 0 or above the last 5 minutes
    snappedTime = Math.max(0, Math.min(snappedTime, lastFiveMinutes));
    
    // If we're very close to a snap point, use it, otherwise return the original time
    const snapThreshold = 0.5; // Snap if within 0.5 minutes (30 seconds) of a snap point
    if (Math.abs(time - snappedTime) <= snapThreshold * 60) {
      return snappedTime;
    }
    
    return time; // No snap if not close enough to a snap point
  }
  
  private clearSnapIndicators() {
    // Remove all existing snap indicators
    if (this.snapIndicators) {
      this.snapIndicators.forEach(indicator => {
        if (indicator && indicator.parentNode) {
          indicator.remove();
        }
      });
      this.snapIndicators = [];
    }
  }
  
  private updateSnapIndicators() {
    // Clear existing indicators
    this.clearSnapIndicators();
    
    // Only show indicators in debug mode
    if (!this.plugin.settings?.debugMode) {
      return;
    }
    
    // Get total time in minutes
    const totalMinutes = this.plugin.getTotalMinutes ? this.plugin.getTotalMinutes() : 25; // Default to 25 minutes if not available
    const snapInterval = 5; // Snap to 5-minute intervals
    
    // Calculate snap points (every 5 minutes except the last 5 minutes)
    for (let minutes = 0; minutes < totalMinutes - 5; minutes += snapInterval) {
      // Skip 0 as it's already marked by the start dot
      if (minutes === 0) continue;
      
      // Calculate angle for this snap point (converting minutes to radians)
      const progress = minutes / totalMinutes;
      const angle = (1 - progress) * 2 * Math.PI; // Reverse for angle calculation
      
      // Calculate position on the circle (using the same radius as the progress circle)
      const radius = 45; // Should match your progress circle radius
      const x = 50 + radius * Math.cos(angle);
      const y = 50 + radius * Math.sin(angle);
      
      // Create a small circle for the snap indicator
      const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      indicator.setAttribute('cx', x.toString());
      indicator.setAttribute('cy', y.toString());
      indicator.setAttribute('r', '2');
      indicator.setAttribute('fill', 'var(--text-muted)');
      indicator.style.opacity = '0.7';
      
      // Add to SVG and store reference
      this.svgElement.appendChild(indicator);
      this.snapIndicators.push(indicator);
    }
  }
  
  private updateDebugDots() {
    if (!this.debugStartDot || !this.debugEndDot || !this.progressCircle) return;

    const radius = 45; // Slightly smaller radius to keep dots within circle
    const centerX = 50;
    const centerY = 50;
    const dotRadius = 3; // Smaller dots
    const hitAreaRadius = 8; // Smaller hit area

    // Update start dot (fixed at top)
    const startAngle = -Math.PI / 2;
    const startX = centerX + radius * Math.cos(startAngle);
    const startY = centerY + radius * Math.sin(startAngle);
    
    this.debugStartDot.setAttribute('cx', startX.toString());
    this.debugStartDot.setAttribute('cy', startY.toString());
    this.debugStartDot.setAttribute('r', dotRadius.toString());
    this.debugStartDot.setAttribute('fill', '#ff6b6b');
    this.debugStartDot.setAttribute('stroke', '#ff0000');
    this.debugStartDot.setAttribute('stroke-width', '1');
    this.debugStartDot.style.display = 'block';
    this.debugStartDot.style.pointerEvents = 'auto';
    this.debugStartDot.style.cursor = 'pointer';

    // Calculate end angle based on remaining time
    const progress = 1 - (this.plugin.timeRemaining / this.plugin.getTotalTime());
    const endAngle = (2 * Math.PI * progress) - (Math.PI / 2); // Start from top
    const endX = centerX + radius * Math.cos(endAngle);
    const endY = centerY + radius * Math.sin(endAngle);
    
    // Update end dot
    this.debugEndDot.setAttribute('cx', endX.toString());
    this.debugEndDot.setAttribute('cy', endY.toString());
    this.debugEndDot.setAttribute('r', dotRadius.toString());
    this.debugEndDot.setAttribute('fill', '#51cf66');
    this.debugEndDot.setAttribute('stroke', '#00aa00');
    this.debugEndDot.setAttribute('stroke-width', '1');
    this.debugEndDot.style.display = 'block';
    this.debugEndDot.style.pointerEvents = 'auto';
    this.debugEndDot.style.cursor = 'pointer';

    // Update hit areas with larger radius for better interaction
    if (this.startHitArea) {
      this.startHitArea.setAttribute('cx', startX.toString());
      this.startHitArea.setAttribute('cy', startY.toString());
      this.startHitArea.setAttribute('r', hitAreaRadius.toString());
      this.startHitArea.style.display = 'block';
    }
    
    if (this.endHitArea) {
      this.endHitArea.setAttribute('cx', endX.toString());
      this.endHitArea.setAttribute('cy', endY.toString());
      this.endHitArea.setAttribute('r', hitAreaRadius.toString());
      this.endHitArea.style.display = 'block';
    }
    
    // Update snap indicators with better visibility
    this.updateSnapIndicators();
    
    // Update play/pause button
    if (this.playBtn) {
      if (this.plugin.isRunning) {
        // Pause icon
        this.playBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>`;
      } else {
        // Play icon
        this.playBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>`;
      }
    }
  }

  private stopDrag() {
    this.isDragging = false;
    this.dragTarget = null;
    
    // Reset cursor
    if (this.debugStartDot) this.debugStartDot.style.cursor = 'pointer';
    if (this.debugEndDot) this.debugEndDot.style.cursor = 'pointer';
    if (this.startHitArea) this.startHitArea.style.cursor = 'grab';
    if (this.endHitArea) this.endHitArea.style.cursor = 'grab';
  }
  
  private stopAnimation() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animate() {
    if (!this.svgElement) return;
    
    const update = () => {
      // Update progress circle based on current timer state
      this.updateProgress();
      this.animationFrameId = requestAnimationFrame(update);
    };
    
    this.animationFrameId = requestAnimationFrame(update);
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .pomodoro-timer-container {
        padding: 1rem;
        text-align: center;
        border-bottom: 1px solid var(--background-modifier-border);
      }
      
      .pomodoro-svg-container {
        margin: 1rem auto;
        max-width: 200px;
      }
      
      .btn-group {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        margin-top: 1rem;
      }
      
      .control-icon {
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      
      .control-icon:active {
        background: var(--interactive-accent);
      }
      
      .control-icon-disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      
      .control-icon-disabled:hover {
        background: transparent;
      }
      
      .control-icon:hover {
        background-color: var(--background-modifier-hover);
      }
      
      .pomodoro-controls {
        padding: 1rem;
        border-bottom: 1px solid var(--background-modifier-border);
      }
      
      .pomodoro-tasks {
        padding: 1rem;
        flex-grow: 1;
        overflow-y: auto;
      }
      
      .pomodoro-tasks h3 {
        margin-top: 0;
        font-size: 1em;
        margin-bottom: 0.75rem;
      }
      
      .pomodoro-task-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      .pomodoro-task-item {
        padding: 0.5rem;
        margin-bottom: 0.25rem;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
        border-left: 3px solid transparent;
      }
      
      .pomodoro-task-item:hover {
        background-color: var(--background-modifier-hover);
      }
      
      .pomodoro-task-active {
        background-color: var(--background-modifier-hover);
        border-left-color: var(--interactive-accent);
      }
      
      .task-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .task-text {
        flex: 1;
        margin-right: 0.5rem;
      }
      
      .task-timer {
        color: var(--text-accent);
        font-size: 0.9em;
        font-weight: bold;
        min-width: 50px;
        text-align: right;
      }
      
      .pomodoro-column-header {
        display: flex;
        align-items: center;
        padding: 0.5rem;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        background-color: var(--background-secondary);
        border-radius: 4px;
        font-weight: bold;
        font-size: 0.9em;
      }
      
      .pomodoro-column-header:first-of-type {
        margin-top: 0.5rem;
      }
      
      .column-title {
        flex: 1;
        color: var(--text-normal);
      }
      
      .task-checkbox {
        margin-right: 0.5rem;
        cursor: pointer;
      }
      
      .task-completed {
        opacity: 0.6;
      }
      
      .task-completed .task-text {
        text-decoration: line-through;
        color: var(--text-muted);
      }
      
      .task-completed .task-timer {
        color: var(--text-muted);
      }
      
      .pomodoro-no-tasks,
      .pomodoro-error {
        color: var(--text-muted);
        font-style: italic;
        padding: 1rem 0;
      }
      
      .kanban-selector {
        width: 100%;
        margin-bottom: 0.5rem;
        padding: 0.5rem;
      }
      
      .refresh-button {
        width: 100%;
        padding: 0.5rem;
      }
    `;
    this.containerEl.appendChild(style);
  }
  
  private showCompletedTaskWarning(taskName: string) {
    // Create warning element if it doesn't exist
    if (!this.warningElement) {
      this.warningElement = this.containerEl.createEl('div', {
        cls: 'pomodoro-warning'
      });
      this.warningElement.style.position = 'absolute';
      this.warningElement.style.top = '60px';
      this.warningElement.style.left = '50%';
      this.warningElement.style.transform = 'translateX(-50%)';
      this.warningElement.style.padding = '8px 16px';
      this.warningElement.style.backgroundColor = 'rgba(255, 0, 0, 0.9)';
      this.warningElement.style.color = 'white';
      this.warningElement.style.borderRadius = '4px';
      this.warningElement.style.fontSize = '14px';
      this.warningElement.style.fontWeight = 'bold';
      this.warningElement.style.zIndex = '1000';
      this.warningElement.style.display = 'none';
    }
    
    // Show the warning
    this.warningElement.textContent = `⚠️ Cannot track completed task: ${taskName.substring(0, 30)}${taskName.length > 30 ? '...' : ''}`;
    this.warningElement.style.display = 'block';
    
    // Hide after 5 seconds
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
    }
    this.warningTimeout = window.setTimeout(() => {
      if (this.warningElement) {
        this.warningElement.style.display = 'none';
      }
    }, 5000);
  }

  // Column Detection Helper Functions
  private isProgressColumn(columnTitle: string): boolean {
    const normalized = columnTitle.toLowerCase().replace(/\s*\(\d+\)$/, '').trim();
    return normalized.includes('in progress') ||
           normalized.includes('phase progress') ||
           normalized.includes('current tasks') ||
           normalized.includes('phase completion') ||
           normalized === 'doing' ||
           normalized === 'progress';
  }

  private isDoneColumn(columnTitle: string): boolean {
    const normalized = columnTitle.toLowerCase().replace(/\s*\(\d+\)$/, '').trim();
    return normalized.includes('done') ||  // This catches "Done - Phase 1 (Code)" 
           normalized.includes('✅') ||    // Catches any column with checkmark emoji
           normalized.includes('completed') ||
           normalized.includes('finished') ||
           normalized === 'complete';
  }

  private findColumnsByType(type: 'progress' | 'done'): { element: HTMLElement, title: string }[] {
    const columns: { element: HTMLElement, title: string }[] = [];
    const groups = this.tasksContainer?.querySelectorAll('.pomodoro-task-group') || [];
    
    groups.forEach(group => {
      const titleElement = group.querySelector('.pomodoro-column-header .column-title');
      if (titleElement) {
        const title = titleElement.textContent || '';
        const isMatch = type === 'progress' ? this.isProgressColumn(title) : this.isDoneColumn(title);
        if (isMatch) {
          columns.push({ element: group as HTMLElement, title });
        }
      }
    });
    
    return columns;
  }

  private async moveTaskToColumn(taskId: string, targetColumnType: 'progress' | 'done'): Promise<boolean> {
    try {
      const boardPath = this.plugin.settings.kanbanBoardPath;
      if (!boardPath) return false;

      const file = this.app.vault.getAbstractFileByPath(boardPath);
      if (!(file instanceof TFile)) return false;

      // Get the task element to find its text
      const taskElement = this.tasksContainer?.querySelector(`[data-task-id="${taskId}"]`);
      if (!taskElement) {
        console.log('[MOVE TASK] Task element not found for ID:', taskId);
        return false;
      }
      
      const taskText = taskElement.querySelector('.task-text')?.textContent || '';
      if (!taskText) {
        console.log('[MOVE TASK] Task text not found');
        return false;
      }

      console.log('[MOVE TASK] Looking for task:', taskText);

      const content = await this.app.vault.read(file);
      const lines = content.split('\n');
      
      let taskLine: string | null = null;
      let taskLineIndex = -1;
      let targetColumnIndex = -1;
      let targetColumnEndIndex = -1;
      let currentColumn = '';
      let inTargetColumn = false;
      
      // First pass: find the task and identify ALL columns
      const columns: { name: string, startIndex: number, endIndex: number }[] = [];
      let lastColumnStart = -1;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check if this is a column header
        if (line.startsWith('## ')) {
          // If we had a previous column, set its end
          if (lastColumnStart >= 0) {
            columns[columns.length - 1].endIndex = i - 1;
          }
          
          currentColumn = line.substring(3).trim();
          columns.push({ name: currentColumn, startIndex: i, endIndex: lines.length - 1 });
          lastColumnStart = i;
          
          // Check if this is our target column 
          // Prefer "In Progress" over "Phase Progress", and "Done" over "Done - Phase X"
          if (targetColumnIndex === -1 || 
              (targetColumnType === 'progress' && currentColumn.includes('🚧') && !columns.find(c => c.startIndex === targetColumnIndex)?.name.includes('🚧')) ||
              (targetColumnType === 'done' && currentColumn.includes('✅') && !columns.find(c => c.startIndex === targetColumnIndex)?.name.includes('✅'))) {
            if ((targetColumnType === 'progress' && this.isProgressColumn(currentColumn)) ||
                (targetColumnType === 'done' && this.isDoneColumn(currentColumn))) {
              targetColumnIndex = i;
              console.log('[MOVE TASK] Found target column:', currentColumn, 'at line', i);
            }
          }
        }
        
        // Check if this line is a task that contains our text
        // Match both unchecked (- [ ]) and checked (- [x]) tasks
        if ((line.startsWith('- [ ]') || line.startsWith('- [x]')) && line.includes(taskText)) {
          taskLine = lines[i]; // Use original line with indentation
          taskLineIndex = i;
          console.log('[MOVE TASK] Found task at line', i, ':', line);
        }
      }
      
      // Find the actual end of the target column
      if (targetColumnIndex >= 0) {
        const targetCol = columns.find(c => c.startIndex === targetColumnIndex);
        if (targetCol) {
          targetColumnEndIndex = targetCol.endIndex;
          console.log('[MOVE TASK] Target column ends at line', targetColumnEndIndex);
        }
      }
      
      // If we didn't find the end of target column, set it to end of file
      if (targetColumnIndex >= 0 && targetColumnEndIndex === -1) {
        targetColumnEndIndex = lines.length - 1;
      }
      
      // Move the task if found
      if (taskLine && taskLineIndex >= 0 && targetColumnIndex >= 0) {
        console.log('[MOVE TASK] Moving task:', {
          taskText,
          fromLine: taskLineIndex,
          toColumn: lines[targetColumnIndex],
          toLine: targetColumnEndIndex
        });
        
        // Remove from current position
        lines.splice(taskLineIndex, 1);
        
        // Adjust indices if removal affected them
        if (taskLineIndex < targetColumnEndIndex) {
          targetColumnEndIndex--;
        }
        
        // Find the right place to insert
        // Look for the first task line or empty section after the header
        let insertIndex = targetColumnIndex + 1;
        
        // Skip the first empty line after header if it exists
        if (insertIndex <= targetColumnEndIndex && lines[insertIndex]?.trim() === '') {
          insertIndex++;
        }
        
        // Find where existing tasks end in target column (if any)
        let lastTaskIndex = insertIndex - 1;
        for (let i = insertIndex; i <= targetColumnEndIndex; i++) {
          const line = lines[i].trim();
          if (line.startsWith('- [ ]') || line.startsWith('- [x]')) {
            lastTaskIndex = i;
          }
        }
        
        // Insert after the last task, or after the header if no tasks
        insertIndex = lastTaskIndex + 1;
        
        // For done tasks, mark as completed
        if (targetColumnType === 'done' && taskLine.includes('- [ ]')) {
          taskLine = taskLine.replace('- [ ]', '- [x]');
        }
        
        // For progress tasks, ensure they're unchecked
        if (targetColumnType === 'progress' && taskLine.includes('- [x]')) {
          taskLine = taskLine.replace('- [x]', '- [ ]');
        }
        
        // Insert at the right position
        lines.splice(insertIndex, 0, taskLine);
        
        // Write back to file
        await this.app.vault.modify(file, lines.join('\n'));
        console.log('[MOVE TASK] Task moved successfully to line', insertIndex);
        
        // Small delay before reloading to ensure file is written
        setTimeout(async () => {
          await this.loadKanbanTasks(boardPath);
          // Trigger a UI update event
          this.plugin.app.workspace.trigger('file-modified');
        }, 200);
        
        return true;
      }
      
      console.log('[MOVE TASK] Failed to move task:', {
        taskFound: !!taskLine,
        taskIndex: taskLineIndex,
        targetFound: targetColumnIndex >= 0
      });
      return false;
    } catch (error) {
      console.error('[MOVE TASK] Error moving task:', error);
      return false;
    }
  }

  private lastKanbanUpdateTime = 0;
  private kanbanUpdateDebounceDelay = 5000; // Update Kanban file every 5 seconds max
  private lastUpdateTimerValue: Map<string, string> = new Map(); // Track last updated timer value per task
  
  private async updateTaskInKanbanFile(taskId: string, timeString: string) {
    // Only update if feature is enabled
    if (!this.plugin.settings.updateTaskTimerInFile) return;
    
    // Don't update if timer is 0:00 (no time tracked)
    if (!timeString || timeString === '0:00') {
      return;
    }
    
    // Check if the timer value has actually changed
    const lastValue = this.lastUpdateTimerValue.get(taskId);
    if (lastValue === timeString) {
      return; // No change, don't update
    }
    
    // Debounce to avoid too frequent file updates
    const now = Date.now();
    if (now - this.lastKanbanUpdateTime < this.kanbanUpdateDebounceDelay) {
      return;
    }
    
    try {
      const boardPath = this.plugin.settings.kanbanBoardPath;
      if (!boardPath) return;
      
      const file = this.app.vault.getAbstractFileByPath(boardPath);
      if (!(file instanceof TFile)) return;
      
      // Get the task element to find its original text
      const taskElement = this.tasksContainer?.querySelector(`[data-task-id="${taskId}"]`);
      if (!taskElement) return;
      
      // Don't update completed tasks
      if (taskElement.classList.contains('task-completed')) {
        console.log('[KANBAN UPDATE] Skipping completed task:', taskId);
        return;
      }
      
      const taskTextElement = taskElement.querySelector('.task-text');
      if (!taskTextElement) return;
      
      // Get the original task text (without any timer info)
      let originalText = taskTextElement.textContent || '';
      
      // Remove ALL timer-like patterns (with or without emoji)
      originalText = originalText
        .replace(/ - 🍎 \d+:\d{2}/g, '')  // Pattern with apple emoji
        .replace(/ - \d+:\d{2}/g, '')      // Pattern without emoji (like "- 1:01")
        .replace(/ \[\d+:\d{2}\]/g, '')    // Square bracket pattern
        .trim();
      
      const content = await this.app.vault.read(file);
      const lines = content.split('\n');
      
      let updated = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this line contains the task (without timer info)
        if ((line.includes('- [ ]') || line.includes('- [x]')) && line.includes(originalText)) {
          // Remove old timer info from the line (all patterns including without emoji)
          let cleanLine = line
            .replace(/ - 🍎 \d+:\d{2}/g, '')  // Pattern with apple emoji
            .replace(/ - \d+:\d{2}/g, '')      // Pattern without emoji
            .replace(/ \[\d+:\d{2}\]/g, '');   // Square bracket pattern
          
          // Add new timer info
          if (timeString && timeString !== '0:00') {
            // Insert timer info before any tags (which start with #)
            const tagIndex = cleanLine.search(/#\w+/);
            if (tagIndex !== -1) {
              // Has tags - insert timer before them
              lines[i] = cleanLine.substring(0, tagIndex).trimEnd() + ` - 🍎 ${timeString} ` + cleanLine.substring(tagIndex);
            } else {
              // No tags - append timer to end
              lines[i] = cleanLine.trimEnd() + ` - 🍎 ${timeString}`;
            }
          } else {
            lines[i] = cleanLine;
          }
          
          updated = true;
          console.log('[KANBAN UPDATE] Updated line:', lines[i]);
          break;
        }
      }
      
      if (updated) {
        await this.app.vault.modify(file, lines.join('\n'));
        this.lastKanbanUpdateTime = now;
        this.lastUpdateTimerValue.set(taskId, timeString); // Remember this value
        console.log('[KANBAN UPDATE] Task timer updated in file:', originalText, '→', timeString);
      }
    } catch (error) {
      console.error('[KANBAN UPDATE] Error updating task in file:', error);
    }
  }
  
  private handlePostMoveActions(taskText: string, columnType: 'progress' | 'done') {
    const columns = this.findColumnsByType(columnType);
    if (columns.length > 0) {
      // Prefer the main column over phase-specific columns
      const targetColumn = columnType === 'progress' 
        ? (columns.find(c => c.title.includes('In Progress')) || columns[0])
        : (columns.find(c => c.title.includes('Done') && !c.title.includes('Phase')) || columns[0]);
        
      this.scrollToColumn(targetColumn.element);
      
      // Find and select the moved task
      const tasksInColumn = targetColumn.element.querySelectorAll('.pomodoro-task-item');
      tasksInColumn.forEach(task => {
        const taskTextEl = task.querySelector('.task-text');
        if (taskTextEl && taskTextEl.textContent === taskText) {
          const htmlTask = task as HTMLElement;
          const timerEl = htmlTask.querySelector('.task-timer') as HTMLElement;
          if (timerEl) {
            const newTaskId = htmlTask.getAttribute('data-task-id') || '';
            // Update active task without triggering another move
            this.activeTaskId = newTaskId;
            this.plugin.settings.currentTask = newTaskId;
            htmlTask.classList.add('pomodoro-task-active');
          }
        }
      });
    }
  }

  private scrollToColumn(columnElement: HTMLElement) {
    if (!this.tasksContainer) {
      console.log('[SCROLL] No tasks container found');
      return;
    }
    
    // Ensure the container is scrollable horizontally
    const containerStyles = window.getComputedStyle(this.tasksContainer);
    console.log('[SCROLL] Container overflow-x:', containerStyles.overflowX);
    
    // Calculate the scroll position - account for container's position
    const containerRect = this.tasksContainer.getBoundingClientRect();
    const columnRect = columnElement.getBoundingClientRect();
    
    // Calculate how much to scroll
    const scrollLeft = columnElement.offsetLeft - 20; // 20px padding from left
    
    // Use scrollLeft directly for better compatibility
    this.tasksContainer.scrollLeft = scrollLeft;
    
    console.log('[SCROLL] Scrolling to column:', {
      columnLeft: columnElement.offsetLeft,
      columnRect: columnRect.left,
      containerRect: containerRect.left,
      scrollTo: scrollLeft,
      currentScroll: this.tasksContainer.scrollLeft,
      containerWidth: this.tasksContainer.offsetWidth,
      containerScrollWidth: this.tasksContainer.scrollWidth
    });
  }

  private async addKanbanBoardSelector(container: HTMLElement): Promise<void> {
    let selectorContainer: HTMLElement | null = null;
    
    try {
      // Try to get the Kanban plugin
      const kanbanPlugin = (this.app as any).plugins?.getPlugin('obsidian-kanban');
      
      if (!kanbanPlugin) {
        console.warn('Kanban plugin not found. Make sure the Kanban plugin is installed and enabled.');
        // Still create the UI but show a disabled state
      }

      selectorContainer = container.createDiv({ cls: 'kanban-selector-container' });
      selectorContainer.style.marginBottom = '10px';
      selectorContainer.style.display = 'flex';
      selectorContainer.style.alignItems = 'center';
      selectorContainer.style.gap = '8px';
    } catch (error) {
      console.error('Error initializing Kanban selector:', error);
      return;
    }

    if (!selectorContainer) {
      console.error('Failed to create Kanban selector container');
      return;
    }

    // Create dropdown for Kanban boards
    this.kanbanSelector = selectorContainer.createEl('select', {
      cls: 'kanban-board-selector',
      attr: { 'aria-label': 'Select Kanban board' }
    });
    
    if (!this.kanbanSelector) {
      console.error('Failed to create Kanban selector');
      return;
    }
    
    this.kanbanSelector.style.flex = '1';
    this.kanbanSelector.style.minWidth = '0';

    // Add default option
    const defaultOption = this.kanbanSelector.createEl('option', {
      value: '',
      text: 'Select a Kanban board'
    });
    
    if (!defaultOption) {
      console.error('Failed to create default option');
      return;
    }

    // Add refresh button
    this.refreshButton = selectorContainer.createEl('button', {
      cls: 'clickable-icon',
      attr: { 'aria-label': 'Refresh Kanban boards' }
    });
    
    if (!this.refreshButton) {
      console.error('Failed to create refresh button');
      return;
    }
    
    this.refreshButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>';
    this.refreshButton.style.border = 'none';
    this.refreshButton.style.background = 'var(--background-modifier-form-field)';
    this.refreshButton.style.borderRadius = '4px';
    this.refreshButton.style.padding = '4px';
    this.refreshButton.style.cursor = 'pointer';
    this.refreshButton.style.display = 'flex';
    this.refreshButton.style.alignItems = 'center';
    this.refreshButton.style.justifyContent = 'center';

    // Load available Kanban boards FIRST
    await this.loadKanbanBoards();
    
    // After boards are loaded, restore and load last active Kanban board if it exists
    if (this.plugin.settings.kanbanBoardPath && this.kanbanSelector) {
      // The board should already be selected by loadKanbanBoards
      // Double-check and force selection if needed
      if (this.kanbanSelector.value !== this.plugin.settings.kanbanBoardPath) {
        this.kanbanSelector.value = this.plugin.settings.kanbanBoardPath;
      }
      
      // Check if the selection was successful
      if (this.kanbanSelector.value === this.plugin.settings.kanbanBoardPath) {
        console.log('[Kanban Startup] Restoring last active board:', this.plugin.settings.kanbanBoardPath);
        try {
          await this.loadKanbanTasks(this.plugin.settings.kanbanBoardPath);
          console.log('[Kanban Startup] Tasks loaded successfully');
        } catch (error) {
          console.error('[Kanban Startup] Failed loading tasks:', error);
        }
      } else {
        console.log('[Kanban Startup] Previous board no longer exists:', this.plugin.settings.kanbanBoardPath);
        // Clear the invalid path
        this.plugin.settings.kanbanBoardPath = '';
        await this.plugin.saveSettings();
      }
    } else {
      console.log('[Kanban Startup] No previous board to restore');
    }

    // Handle board selection
    if (this.kanbanSelector) {
      this.kanbanSelector.addEventListener('change', async (e) => {
        const selectedPath = (e.target as HTMLSelectElement)?.value;
        if (!selectedPath) return;
      
        console.log('═══════════════════════════════════════════════════════');
        console.log('[KANBAN SELECTION] Changing Kanban board');
        console.log('  Previous Board:', this.plugin.settings.kanbanBoardPath || 'None');
        console.log('  New Board:', selectedPath);
        console.log('  Active Task Before Switch:', this.activeTaskId || 'None');
        
        // Save task timer before switching boards
        if (this.activeTaskId && this.plugin.isRunning && this.plugin.currentMode === 'work') {
          const elapsed = (Date.now() - this.lastUpdateTime) / 1000;
          const currentTime = this.taskTimers.get(this.activeTaskId) || 0;
          const newTime = currentTime + elapsed;
          this.taskTimers.set(this.activeTaskId, newTime);
          
          // Also save by task text for persistence
          const prevTaskElement = this.currentTaskElement || this.tasksContainer?.querySelector(`[data-task-id="${this.activeTaskId}"]`);
          if (prevTaskElement) {
            const prevTaskText = prevTaskElement.querySelector('.task-text')?.textContent || '';
            if (prevTaskText) {
              this.taskTimersByText.set(prevTaskText, newTime);
            }
          }
          
          console.log('  Saved Current Task Time Before Switch:', Math.floor(newTime / 60) + ':' + String(Math.floor(newTime % 60)).padStart(2, '0'));
          this.lastUpdateTime = Date.now();
          
          // Log to task timer file BEFORE switching boards
          const prevKanbanFileName = (this.plugin.settings.kanbanBoardPath || '').split('/').pop()?.replace('.md', '') || 'Unknown';
          await this.logTaskTime(this.activeTaskId, newTime, prevKanbanFileName);
          console.log('  Task time logged to file for board:', prevKanbanFileName);
        }
        
        this.plugin.settings.kanbanBoardPath = selectedPath;
        await this.plugin.saveSettings();
        console.log('  Settings Saved');
      
        // Load tasks from the selected Kanban board without opening the file
        try {
          await this.loadKanbanTasks(this.plugin.settings.kanbanBoardPath);
          console.log('  Tasks Loaded Successfully');
        } catch (error) {
          console.error('Failed loading Kanban tasks:', error);
       }
        console.log('═══════════════════════════════════════════════════════');

        // Refresh the Kanban buttons
        if (this.plugin.refreshKanbanButtons) {
          this.plugin.refreshKanbanButtons(true);
        }
      });
    }
  
    // Handle refresh button click
    if (this.refreshButton) {
      this.refreshButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.loadKanbanBoards();
        if (this.plugin.refreshKanbanButtons) {
          this.plugin.refreshKanbanButtons(true);
        }
      });
    }
  
    // Remove metadata cache listener - it causes infinite loops with timer updates
    // The refresh button is sufficient for manual reloads
  }

  private async loadKanbanBoards(): Promise<void> {
    if (!this.kanbanSelector) {
      console.warn('[KANBAN LOAD] Kanban selector not initialized');
      return;
    }
  
    console.log('[KANBAN LOAD] Loading Kanban boards...');
    
    // Clear existing options except the default one
    while (this.kanbanSelector.options.length > 1) {
      this.kanbanSelector.remove(1);
    }
  
    try {
      // Get all markdown files that might be Kanban boards
      const files = this.app.vault.getMarkdownFiles();
      console.log(`[KANBAN LOAD] Checking ${files.length} markdown files`);
      
      const kanbanFiles: TFile[] = [];
      const checkedFiles = new Set<string>(); // Track checked files to avoid duplicates
      
      // Check each file to see if it's a Kanban board
      for (const file of files) {
        if (checkedFiles.has(file.path)) continue;
        checkedFiles.add(file.path);
        
        try {
          // 1. Check file extension first (fastest check)
          const isKanbanFile = file.name.endsWith('.kanban.md') || 
                             file.name.endsWith('.kanban') ||
                             file.name.toLowerCase().includes('kanban');
          
          if (isKanbanFile) {
            kanbanFiles.push(file);
            continue;
          }
          
          // 2. Check frontmatter for various Kanban indicators
          const cache = this.app.metadataCache.getFileCache(file);
          const frontmatter = cache?.frontmatter;
          
          if (frontmatter) {
            const isKanban = frontmatter.kanban === true ||
                           frontmatter['kanban-plugin'] === true ||
                           frontmatter['kanban-plugin'] === 'board';
            
            if (isKanban) {
              kanbanFiles.push(file);
              continue;
            }
          }
          
          // 3. As a last resort, check file content for Kanban markers
          try {
            const content = await this.app.vault.cachedRead(file);
            const hasKanbanMarker = content.includes('kanban:') ||
                                  content.includes('kanban-plugin:') ||
                                  content.includes('kanban-plugin: board');
            
            if (hasKanbanMarker) {
              kanbanFiles.push(file);
            }
          } catch (e) {
            console.warn(`Error reading file ${file.path}:`, e);
          }
        } catch (e) {
          console.warn(`Error checking file ${file.path}:`, e);
        }
      }
      
      console.log(`[KANBAN LOAD] Found ${kanbanFiles.length} Kanban files`);
      
      if (kanbanFiles.length === 0) {
        const option = this.kanbanSelector.createEl('option', {
          value: '',
          text: 'No Kanban boards found'
        });
        option.disabled = true;
        return;
      }
    
      // Sort by name
      kanbanFiles.sort((a, b) => a.basename.localeCompare(b.basename));
      
      // Add boards to selector
      for (const file of kanbanFiles) {
        const displayName = file.basename.replace(/\.kanban$/, '');
        console.log(`[KANBAN LOAD] Adding board: ${displayName} (${file.path})`);
        
        const option = this.kanbanSelector.createEl('option', {
          value: file.path,
          text: displayName
        });
      
        // Select the current board if it matches
        if (this.plugin.settings.kanbanBoardPath === file.path) {
          option.selected = true;
          console.log(`[KANBAN LOAD] Selected board: ${displayName}`);
        }
      }
    
      // If we have a selected board but it's not in the list, add it
      if (this.plugin.settings.kanbanBoardPath) {
        const file = this.app.vault.getAbstractFileByPath(this.plugin.settings.kanbanBoardPath);
        if (file && file instanceof TFile && !kanbanFiles.some(f => f.path === file.path)) {
          const option = this.kanbanSelector.createEl('option', {
            value: file.path,
            text: file.basename.replace(/\.kanban$/, '') + ' (not found)'
          });
          option.selected = true;
        }
      }
    } catch (error) {
      console.error('Error loading Kanban boards:', error);
    }
  }

  private currentTaskElement: HTMLElement | null = null;
  private taskTimers: Map<string, number> = new Map(); // Store accumulated time for each task
  private taskTimersByText: Map<string, number> = new Map(); // Store timers by task text for persistence
  private activeTaskId: string | null = null;
  private lastUpdateTime: number = Date.now();

  private async loadKanbanTasks(boardPath: string): Promise<void> {
    if (!this.tasksContainer) {
      console.warn('Tasks container not initialized');
      return;
    }

    try {
      // Clear existing tasks
      this.tasksContainer.empty();

      // Validate board path
      if (!boardPath || boardPath.trim() === '') {
        this.tasksContainer.createEl('p', { 
          text: 'Please select a Kanban board',
          cls: 'pomodoro-no-tasks'
        });
        return;
      }

      const file = this.app.vault.getAbstractFileByPath(boardPath);
      if (!file || !(file instanceof TFile)) {
        // Board may have been deleted or moved
        this.tasksContainer.createEl('p', { 
          text: 'Kanban board not found. It may have been moved or deleted.',
          cls: 'pomodoro-error'
        });
        
        // Clear the invalid board from settings
        this.plugin.settings.kanbanBoardPath = '';
        await this.plugin.saveSettings();
        
        // Reset the selector
        if (this.kanbanSelector) {
          this.kanbanSelector.value = '';
        }
        return;
      }

      // Read the Kanban board content with timeout
      let content: string;
      try {
        content = await this.app.vault.read(file);
      } catch (readError) {
        console.error('Failed to read Kanban board:', readError);
        this.tasksContainer.createEl('p', { 
          text: 'Unable to read Kanban board content',
          cls: 'pomodoro-error'
        });
        return;
      }
      
      // Parse tasks from the Kanban board
      // The Obsidian Kanban plugin stores tasks in a special format
      // Format: - [ ] task text or just plain text in kanban cards
      const tasks: Array<{text: string, column: string, completed: boolean}> = [];
      
      // Try to parse as JSON first (newer Kanban format)
      try {
        const kanbanData = JSON.parse(content);
        if (kanbanData.lists && Array.isArray(kanbanData.lists)) {
          for (const list of kanbanData.lists) {
            const columnName = list.name || 'Untitled';
            if (list.items && Array.isArray(list.items)) {
              for (const item of list.items) {
                // Extract text from the item
                let taskText = '';
                if (typeof item === 'string') {
                  taskText = item;
                } else if (item.text) {
                  taskText = item.text;
                } else if (item.title) {
                  taskText = item.title;
                }
                
                // Clean up the text (remove markdown, links, etc.)
                taskText = taskText
                  .replace(/\[\[([^\]]+)\]\]/g, '$1') // Remove wiki links
                  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
                  .replace(/^[-*]\s+\[[ x]\]\s+/, '') // Remove checkbox prefix
                  .trim();
                
                if (taskText) {
                  tasks.push({
                    text: taskText,
                    column: columnName,
                    completed: columnName.toLowerCase().includes('done') || 
                              columnName.toLowerCase().includes('complete')
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        // Not JSON, try parsing as markdown with column headers
        
        // Remove frontmatter first
        let cleanContent = content.replace(/^---[\s\S]*?---\s*/m, '');
        
        // Split content by h2 headers (##) to create columns
        const sections = cleanContent.split(/^##\s+/gm).filter(s => s.trim());
        
        if (sections.length > 0) {
          for (const section of sections) {
            const lines = section.split('\n');
            // Clean the first line to get column name (remove emojis, parens, extra text)
            let columnName = lines[0].trim();
            // Remove common emoji patterns and extra text in parens
            columnName = columnName
              .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emoji
              .replace(/\([^)]*\)/g, '') // Remove anything in parentheses
              .replace(/[#*_~`]/g, '') // Remove markdown formatting
              .trim();
            
            // Skip empty columns
            if (!columnName) continue;
            
            // Parse tasks from remaining lines
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              
              // Match checkbox tasks: - [ ] or - [x]
              const checkboxMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
              if (checkboxMatch) {
                const isCompleted = checkboxMatch[1].toLowerCase() === 'x';
                let text = checkboxMatch[2].trim();
                
                // Extract timer if present (e.g., "Task Name - 🍎 25:30" or "Task Name - 25:30")
                const timerMatch = text.match(/ - (?:🍎 )?(\d+):(\d{2})(?:\s|$)/);
                if (timerMatch) {
                  const minutes = parseInt(timerMatch[1], 10);
                  const seconds = parseInt(timerMatch[2], 10);
                  const totalSeconds = minutes * 60 + seconds;
                  
                  // Remove timer from text to get clean task name
                  const cleanText = text.replace(/ - (?:🍎 )?\d+:\d{2}/, '').trim();
                  
                  // Store the timer by clean task text
                  if (totalSeconds > 0) {
                    this.taskTimersByText.set(cleanText, totalSeconds);
                    console.log(`[KANBAN LOAD] Parsed timer for "${cleanText}": ${minutes}:${seconds.toString().padStart(2, '0')}`);
                  }
                  
                  text = cleanText;
                }
                
                if (text && text.length > 2) {
                  tasks.push({
                    text: text,
                    column: columnName,
                    completed: isCompleted
                  });
                }
                continue;
              }
              
              // Match regular list items: - task or * task
              const listMatch = line.match(/^[-*]\s+([^[\]].+)$/);
              if (listMatch) {
                let text = listMatch[1].trim();
                
                // Extract timer if present
                const timerMatch = text.match(/ - (?:🍎 )?(\d+):(\d{2})(?:\s|$)/);
                if (timerMatch) {
                  const minutes = parseInt(timerMatch[1], 10);
                  const seconds = parseInt(timerMatch[2], 10);
                  const totalSeconds = minutes * 60 + seconds;
                  
                  // Remove timer from text to get clean task name
                  const cleanText = text.replace(/ - (?:🍎 )?\d+:\d{2}/, '').trim();
                  
                  // Store the timer by clean task text
                  if (totalSeconds > 0) {
                    this.taskTimersByText.set(cleanText, totalSeconds);
                    console.log(`[KANBAN LOAD] Parsed timer for "${cleanText}": ${minutes}:${seconds.toString().padStart(2, '0')}`);
                  }
                  
                  text = cleanText;
                }
                
                if (text && text.length > 2) {
                  tasks.push({
                    text: text,
                    column: columnName,
                    completed: false
                  });
                }
              }
            }
          }
        } else {
          // No headers found, treat everything as one column
          const checkboxPattern = /^[-*]\s+\[[ xX]\]\s+(.+)$/gm;
          let match;
          while ((match = checkboxPattern.exec(content)) !== null) {
            const text = match[1].trim();
            if (text && text.length > 2) {
              tasks.push({
                text: text,
                column: 'Tasks',
                completed: false
              });
            }
          }
        }
      }

      if (tasks.length === 0) {
        this.tasksContainer.createEl('p', { 
          text: 'No tasks found in this Kanban board',
          cls: 'pomodoro-no-tasks'
        });
        return;
      }

      // Group tasks by column
      const tasksByColumn = new Map<string, typeof tasks>();
      for (const task of tasks) {
        if (!tasksByColumn.has(task.column)) {
          tasksByColumn.set(task.column, []);
        }
        tasksByColumn.get(task.column)?.push(task);
      }

      // Sort columns: incomplete first, then completed
      const sortedColumns = Array.from(tasksByColumn.keys()).sort((a, b) => {
        const aCompleted = a.toLowerCase().includes('done') || a.toLowerCase().includes('complete');
        const bCompleted = b.toLowerCase().includes('done') || b.toLowerCase().includes('complete');
        if (aCompleted && !bCompleted) return 1;
        if (!aCompleted && bCompleted) return -1;
        return 0;
      });

      // Display tasks grouped by column
      let globalTaskIndex = 0;
      for (const columnName of sortedColumns) {
        const columnTasks = tasksByColumn.get(columnName) || [];
        if (columnTasks.length === 0) continue;

        // Create a group container for each column
        const taskGroup = this.tasksContainer.createEl('div', {
          cls: 'pomodoro-task-group'
        });

        // Create column header inside the group
        const columnHeader = taskGroup.createEl('div', { 
          cls: 'pomodoro-column-header' 
        });
        columnHeader.createEl('span', { 
          text: `${columnName} (${columnTasks.length})`,
          cls: 'column-title'
        });

        // Create task list for this column inside the group
        const taskList = taskGroup.createEl('ul', { cls: 'pomodoro-task-list' });
        
        // Add drop zone handlers for drag & drop
        taskList.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer!.dropEffect = 'move';
          taskList.classList.add('drag-over');
        });
        
        taskList.addEventListener('dragleave', () => {
          taskList.classList.remove('drag-over');
        });
        
        taskList.addEventListener('drop', async (e) => {
          e.preventDefault();
          taskList.classList.remove('drag-over');
          
          const draggedTaskId = e.dataTransfer?.getData('text/plain');
          if (!draggedTaskId) return;
          
          // Find the target column name
          const targetColumnName = columnName;
          
          // Simple implementation: just move the task to this column
          // In a real implementation, you'd update the Kanban file
          new Notice(`Moving task to "${targetColumnName}" - manual drag & drop (coming soon)`);
          
          // For now, just show it's possible but not fully implemented
          // Full implementation would require updating the Kanban markdown file
        });
        
        for (const task of columnTasks) {
          const taskId = `task-${boardPath}-${globalTaskIndex++}`;
          const taskItem = taskList.createEl('li', { 
            cls: `pomodoro-task-item ${task.completed ? 'task-completed' : ''}`
          });
          taskItem.setAttribute('data-task-id', taskId);
          taskItem.setAttribute('data-column', task.column);
          
          // Create task content with timer
          const taskContent = taskItem.createDiv({ cls: 'task-content' });
          
          // Add checkbox for task completion
          const checkbox = taskContent.createEl('input', { 
            cls: 'task-checkbox'
          });
          checkbox.type = 'checkbox';
          checkbox.checked = task.completed;
          
          // Set initial completed state based on checkbox
          if (task.completed) {
            taskItem.addClass('task-completed');
          }
          
          checkbox.addEventListener('change', async () => {
            task.completed = checkbox.checked;
            taskItem.toggleClass('task-completed', checkbox.checked);

            await this.updateTaskCompletionState(taskId, checkbox.checked);
            
            // If task is being completed, log the total time
            if (checkbox.checked) {
              // Clear active task if this was it (prevent timer updates on completed task)
              if (this.activeTaskId === taskId) {
                console.log('[TASK COMPLETE] Clearing active task as it was just completed');
                this.activeTaskId = null;
                this.currentTaskElement = null;
              }
              
              // Get the total time for this task
              const totalTime = this.taskTimers.get(taskId) || this.taskTimersByText.get(task.text) || 0;
              
              if (totalTime > 0) {
                // Log to the task timer file
                const kanbanFileName = boardPath.split('/').pop()?.replace('.md', '') || 'Unknown';
                await this.logTaskTime(taskId, totalTime, kanbanFileName);
                
                // Update the task in the Kanban file with final time
                const minutes = Math.floor(totalTime / 60);
                const seconds = Math.floor(totalTime % 60);
                const finalTimeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                
                // Force update the task in Kanban file with final time
                this.lastKanbanUpdateTime = 0; // Force update
                this.lastUpdateTimerValue.delete(taskId); // Clear cached value
                await this.updateTaskInKanbanFile(taskId, finalTimeString);
                
                console.log(`[TASK COMPLETE] Task "${task.text}" completed with total time: ${finalTimeString}`);
              }
            } else {
              // Task is being unchecked - just log it, don't force file updates
              // File updates will happen naturally when the task is used again
              console.log(`[TASK UNCOMPLETE] Task "${task.text}" unchecked - available for use`);
            }
            
            // Auto-move to done column if enabled and checkbox is checked
            if (checkbox.checked && this.plugin.settings.autoMoveToDone) {
              const currentGroupEl = taskItem.closest('.pomodoro-task-group');
              const currentColumnTitle = currentGroupEl?.querySelector('.pomodoro-column-header .column-title')?.textContent || '';
              
              if (!this.isDoneColumn(currentColumnTitle)) {
                const doneColumns = this.findColumnsByType('done');
                
                if (doneColumns.length === 0) {
                  new Notice('No "Done" column found on this board. Consider disabling auto-move in settings.');
                } else if (doneColumns.length > 1) {
                  const columnNames = doneColumns.map(c => c.title).join(', ');
                  new Notice(`Multiple done columns found: ${columnNames}. Consider disabling auto-move in settings.`);
                } else {
                  // Move to the single done column
                  const doneTitle = doneColumns[0].title;
                  const success = await this.moveTaskToColumn(taskId, 'done');
                  if (success) {
                    new Notice(`Task moved to "${doneTitle}"`);
                    // Wait for reload to complete, then scroll to the done column
                    setTimeout(() => {
                      const newDoneColumns = this.findColumnsByType('done');
                      if (newDoneColumns.length > 0) {
                        this.scrollToColumn(newDoneColumns[0].element);
                      }
                    }, 200);
                  }
                }
              }
            }
          });
          
          // Remove timer info from displayed text to avoid duplication
          let displayText = task.text;
          displayText = displayText
            .replace(/ - 🍎 \d+:\d{2}/g, '')  // Pattern with apple emoji
            .replace(/ - \d+:\d{2}/g, '')      // Pattern without emoji
            .replace(/ \[\d+:\d{2}\]/g, '');   // Square bracket pattern
          taskContent.createSpan({ text: displayText.trim(), cls: 'task-text' });
          const taskTimer = taskContent.createSpan({ text: '', cls: 'task-timer' });
          
          // Restore previous timer if exists - check both by ID and by text
          let previousTime = this.taskTimers.get(taskId) || 0;
          if (previousTime === 0) {
            // Try to restore by task text
            previousTime = this.taskTimersByText.get(task.text) || 0;
            if (previousTime > 0) {
              // Sync both maps
              this.taskTimers.set(taskId, previousTime);
            }
          }
          
          if (previousTime > 0) {
            const minutes = Math.floor(previousTime / 60);
            const seconds = Math.floor(previousTime % 60);
            taskTimer.setText(` [${minutes}:${seconds.toString().padStart(2, '0')}]`);
          }
          
          // Restore task logs from persistent storage
          if (this.plugin && 'restoreTaskLogs' in this.plugin) {
            (this.plugin as any).restoreTaskLogs(taskItem, taskId);
          }
          
          // Add click handler to mark task as current
          taskItem.addEventListener('click', () => {
            this.selectTask(taskId, taskItem, taskTimer);
          });
          
          // Add drag & drop support
          taskItem.draggable = true;
          taskItem.addEventListener('dragstart', (e) => {
            e.dataTransfer?.setData('text/plain', taskId);
            e.dataTransfer!.effectAllowed = 'move';
            taskItem.classList.add('dragging');
          });
          
          taskItem.addEventListener('dragend', () => {
            taskItem.classList.remove('dragging');
          });
          
          // Restore last active task
          if (this.plugin.settings.currentTask === taskId) {
            this.selectTask(taskId, taskItem, taskTimer);
          }
        } // End of tasks loop
      } // End of columns loop
      
      // Add a refresh hint if no tasks found
      if (tasks.length === 0) {
        const hintEl = this.tasksContainer.createEl('p', { 
          text: 'Tip: Click the refresh button to reload boards',
          cls: 'pomodoro-hint'
        });
        hintEl.style.fontSize = '0.85em';
        hintEl.style.marginTop = '1rem';
      }
    } catch (error) {
      console.error('Error loading Kanban tasks:', error);
      this.tasksContainer.createEl('p', { 
        text: 'Error loading tasks. Please try refreshing.',
        cls: 'pomodoro-error'
      });
      
      // Add retry button
      const retryBtn = this.tasksContainer.createEl('button', { 
        text: 'Retry',
        cls: 'mod-cta'
      });
      retryBtn.style.marginTop = '1rem';
      retryBtn.addEventListener('click', async () => {
        await this.loadKanbanTasks(boardPath);
      });
    }
  }

  private async selectTask(taskId: string, taskElement: HTMLElement, timerElement: HTMLElement) {
    // Always hide any existing warning as soon as a task is clicked
    if (this.warningElement) {
      this.warningElement.style.display = 'none';
    }
    if (this.warningTimeout !== null) {
      window.clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }

    const taskText = taskElement.querySelector('.task-text')?.textContent || 'Unknown Task';
    const kanbanFile = this.plugin.settings.kanbanBoardPath || 'No Kanban Selected';
    const kanbanFileName = kanbanFile.split('/').pop()?.replace('.md', '') || 'Unknown';
    
    // Force update the previous task's timer in Kanban file before switching
    if (this.activeTaskId && this.activeTaskId !== taskId) {
      const prevTime = this.taskTimers.get(this.activeTaskId) || 0;
      if (prevTime > 0) {
        const minutes = Math.floor(prevTime / 60);
        const seconds = Math.floor(prevTime % 60);
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        await this.updateTaskInKanbanFile(this.activeTaskId, timeString);
      }
    }
    
    // Clear cached timer value for the new task to ensure it gets updated
    this.lastUpdateTimerValue.delete(taskId);
    
    // Check if task is completed
    const isCompleted = taskElement.classList.contains('task-completed');
    const checkbox = taskElement.querySelector('.task-checkbox') as HTMLInputElement;
    
    if (isCompleted || (checkbox && checkbox.checked)) {
      // Show warning message for completed tasks
      this.showCompletedTaskWarning(taskText);
      console.log('[TASK SELECTION] Cannot select completed task:', taskText);
      return;
    }
    
    // Check if we need to restrict to progress tasks only
    if (this.plugin.settings.restrictToProgressTasks) {
      const groupEl = taskElement.closest('.pomodoro-task-group');
      const columnTitle = groupEl?.querySelector('.pomodoro-column-header .column-title')?.textContent || '';
      
      if (!this.isProgressColumn(columnTitle)) {
        this.showCompletedTaskWarning(`Task must be in progress column to start timer. Current: "${columnTitle}"`);
        console.log('[TASK SELECTION] Task not in progress column:', columnTitle);
        return;
      }
    }
    
    // Auto-move to progress if enabled
    if (this.plugin.settings.autoMoveToProgress) {
      const currentGroupEl = taskElement.closest('.pomodoro-task-group');
      const currentColumnTitle = currentGroupEl?.querySelector('.pomodoro-column-header .column-title')?.textContent || '';
      
      if (!this.isProgressColumn(currentColumnTitle)) {
        const progressColumns = this.findColumnsByType('progress');
        
        if (progressColumns.length === 0) {
          new Notice('No "In Progress" column found on this board. Consider disabling auto-move in settings.');
        } else if (progressColumns.length > 1) {
          const columnNames = progressColumns.map(c => c.title).join(', ');
          new Notice(`Multiple progress columns found: ${columnNames}. Consider disabling auto-move in settings.`);
        } else {
          // Move to the single progress column
          const progressTitle = progressColumns[0].title;
          const success = await this.moveTaskToColumn(taskId, 'progress');
          if (success) {
            new Notice(`Task moved to "${progressTitle}"`);
            // Wait for reload to complete, then scroll to the column
            setTimeout(() => {
              // Double-check that tasks container is populated
              if (!this.tasksContainer || this.tasksContainer.children.length === 0) {
                console.log('[AUTO-MOVE] Tasks container not ready yet, retrying...');
                setTimeout(() => {
                  this.handlePostMoveActions(taskText, 'progress');
                }, 300);
                return;
              }
              
              const newProgressColumns = this.findColumnsByType('progress');
              console.log('[AUTO-MOVE] Found progress columns after reload:', newProgressColumns.length);
              
              if (newProgressColumns.length > 0) {
                // Scroll to the FIRST progress column (not the Phase Progress one if both exist)
                const targetColumn = newProgressColumns.find(c => c.title.includes('In Progress')) || newProgressColumns[0];
                this.scrollToColumn(targetColumn.element);
                
                // Find and select the task by its text content in the new column
                setTimeout(() => {
                  const tasksInColumn = targetColumn.element.querySelectorAll('.pomodoro-task-item');
                  console.log('[AUTO-MOVE] Looking for task in', targetColumn.title, ', found', tasksInColumn.length, 'tasks');
                  
                  tasksInColumn.forEach(task => {
                    const taskTextEl = task.querySelector('.task-text');
                    if (taskTextEl && taskTextEl.textContent === taskText) {
                      console.log('[AUTO-MOVE] Found moved task, selecting it');
                      const htmlTask = task as HTMLElement;
                      const timerEl = htmlTask.querySelector('.task-timer') as HTMLElement;
                      if (timerEl) {
                        this.selectTask(htmlTask.getAttribute('data-task-id') || '', htmlTask, timerEl);
                      }
                    }
                  });
                }, 150);
              }
            }, 400);
            // Return early as the task will be reloaded
            return;
          }
        }
      }
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('[TASK SELECTION] Switching task');
    console.log('  Previous Task ID:', this.activeTaskId || 'None');
    console.log('  New Task ID:', taskId);
    console.log('  New Task Name:', taskText);
    console.log('  Kanban File:', kanbanFile);
    console.log('  Timer Running:', this.plugin.isRunning);
    console.log('  Current Mode:', this.plugin.currentMode);
    
    // Save time for previous task if it was active AND timer is running in work mode
    if (this.activeTaskId && this.plugin.isRunning && this.plugin.currentMode === 'work') {
      const elapsed = (Date.now() - this.lastUpdateTime) / 1000;
      const currentTime = this.taskTimers.get(this.activeTaskId) || 0;
      const newTime = currentTime + elapsed;
      this.taskTimers.set(this.activeTaskId, newTime);
      
      // Also save by task text for persistence
      const prevTaskElement = this.currentTaskElement || this.tasksContainer?.querySelector(`[data-task-id="${this.activeTaskId}"]`);
      if (prevTaskElement) {
        const prevTaskText = prevTaskElement.querySelector('.task-text')?.textContent || '';
        if (prevTaskText) {
          this.taskTimersByText.set(prevTaskText, newTime);
        }
      }
      
      console.log('  Saved Previous Task Time:', Math.floor(newTime / 60) + ':' + String(Math.floor(newTime % 60)).padStart(2, '0'));
      
      // Extract kanban file name from the previous task ID (format: task-{boardPath}-{index})
      // The boardPath is between "task-" and the last "-{index}"
      const prevTaskParts = this.activeTaskId.match(/^task-(.+)-(\d+)$/);
      const prevKanbanPath = prevTaskParts ? prevTaskParts[1] : '';
      const prevKanbanFileName = prevKanbanPath.split('/').pop()?.replace('.md', '') || kanbanFileName;
      
      // Log to task timer file with the correct kanban file name
      await this.logTaskTime(this.activeTaskId, newTime, prevKanbanFileName);
      console.log('  Task time logged for board:', prevKanbanFileName);
    }
    
    // Update UI - remove active class from all tasks
    const taskList = this.tasksContainer?.querySelector('.pomodoro-task-list');
    if (taskList) {
      taskList.querySelectorAll('.pomodoro-task-active').forEach(el => {
        el.classList.remove('pomodoro-task-active');
      });
    }
    
    // Also remove active class from any tasks in other columns
    if (this.tasksContainer) {
      this.tasksContainer.querySelectorAll('.pomodoro-task-active').forEach(el => {
        el.classList.remove('pomodoro-task-active');
      });
    }
    
    // Add active class to clicked task
    taskElement.classList.add('pomodoro-task-active');
    
    // Set new active task
    this.currentTaskElement = taskElement;
    this.activeTaskId = taskId;
    this.lastUpdateTime = Date.now();
    
    // Log current task timer state
    const existingTime = this.taskTimers.get(taskId) || 0;
    console.log('  New Task Existing Time:', Math.floor(existingTime / 60) + ':' + String(Math.floor(existingTime % 60)).padStart(2, '0'));
    console.log('═══════════════════════════════════════════════════════');
    
    // Save current task to settings
    this.plugin.settings.currentTask = taskId;
    await this.plugin.saveSettings();
    
    // Update display immediately
    this.updateTaskTimer(timerElement);
  }
  
  private updateTaskTimer(timerElement: HTMLElement) {
    if (!this.activeTaskId) return;
    
    let totalTime = this.taskTimers.get(this.activeTaskId) || 0;
    
    // Add current session time if timer is running
    if (this.plugin.isRunning && this.plugin.currentMode === 'work') {
      const currentSessionTime = (Date.now() - this.lastUpdateTime) / 1000;
      totalTime += currentSessionTime;
    }
    
    const minutes = Math.floor(totalTime / 60);
    const seconds = Math.floor(totalTime % 60);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    timerElement.setText(` [${timeString}]`);
    
    // Only update the task in the Kanban file when timer is actively running in work mode
    // This avoids expensive file writes (and reloads) when simply selecting tasks
    if (this.plugin.isRunning && this.plugin.currentMode === 'work') {
      this.updateTaskInKanbanFile(this.activeTaskId, timeString);
    }
  }
  
  // Call this method from the animation loop to update active task timer
  public updateActiveTaskTimer() {
    if (!this.activeTaskId || !this.currentTaskElement) return;
    
    // Don't update if task is completed
    if (this.currentTaskElement.classList.contains('task-completed')) {
      return;
    }
    
    const timerElement = this.currentTaskElement.querySelector('.task-timer') as HTMLElement;
    if (timerElement) {
      this.updateTaskTimer(timerElement);
    }
  }
  
  // Call this from outside to save current task time
  public saveCurrentTaskTime() {
    if (this.activeTaskId && this.plugin.currentMode === 'work') {
      const elapsed = (Date.now() - this.lastUpdateTime) / 1000;
      const currentTime = this.taskTimers.get(this.activeTaskId) || 0;
      const newTime = currentTime + elapsed;
      this.taskTimers.set(this.activeTaskId, newTime);
      
      // Also save by task text for persistence
      const taskElement = this.currentTaskElement || this.tasksContainer?.querySelector(`[data-task-id="${this.activeTaskId}"]`);
      if (taskElement) {
        const taskText = taskElement.querySelector('.task-text')?.textContent || '';
        if (taskText) {
          this.taskTimersByText.set(taskText, newTime);
        }
      }
      
      this.lastUpdateTime = Date.now();
    }
  }
  
  // Pause task timer (for quick breaks and manual pause)
  public pauseTaskTimer() {
    if (this.activeTaskId) {
      // Save accumulated time if we're in work mode
      if (this.plugin.currentMode === 'work') {
        const elapsed = (Date.now() - this.lastUpdateTime) / 1000;
        const currentTime = this.taskTimers.get(this.activeTaskId) || 0;
        const newTime = currentTime + elapsed;
        this.taskTimers.set(this.activeTaskId, newTime);
        
        // Save by task text too
        const taskElement = this.currentTaskElement || this.tasksContainer?.querySelector(`[data-task-id="${this.activeTaskId}"]`);
        if (taskElement) {
          const taskText = taskElement.querySelector('.task-text')?.textContent || '';
          if (taskText) {
            this.taskTimersByText.set(taskText, newTime);
          }
        }
        
        console.log('[TASK TIMER] Paused with time:', Math.floor(newTime / 60) + ':' + String(Math.floor(newTime % 60)).padStart(2, '0'));
        
        // Update display immediately with saved time
        const timerElement = this.currentTaskElement?.querySelector('.task-timer') as HTMLElement;
        if (timerElement) {
          const minutes = Math.floor(newTime / 60);
          const seconds = Math.floor(newTime % 60);
          timerElement.setText(` [${minutes}:${seconds.toString().padStart(2, '0')}]`);
        }
      }
    }
  }
  
  // Resume task timer (after pause or quick break)
  public resumeTaskTimer() {
    if (this.activeTaskId) {
      // Reset the lastUpdateTime so timer resumes from correct point
      this.lastUpdateTime = Date.now();
      console.log('[TASK TIMER] Resumed at', new Date().toLocaleTimeString());
      
      // Force an immediate display update
      const timerElement = this.currentTaskElement?.querySelector('.task-timer') as HTMLElement;
      if (timerElement && this.plugin.currentMode === 'work') {
        this.updateTaskTimer(timerElement);
      }
    }
  }
  
  // Log task time to dedicated task timer log file
  private async logTaskTime(taskId: string, totalSeconds: number, kanbanFileName: string) {
    try {
      const taskLogFile = 'Pomodoro Task Timers.md';
      const { vault } = this.plugin.app;
      
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.floor(totalSeconds % 60);
      const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      const now = new Date();
      const timestamp = now.toLocaleString();
      
      // Get task name from DOM
      const taskElement = this.currentTaskElement;
      const taskName = taskElement?.querySelector('.task-text')?.textContent || taskId;
      
      // Create log entry grouped by kanban file
      const logEntry = `📋 ${kanbanFileName} | ✓ ${taskName} | ⏱️ ${timeFormatted} | 📅 ${timestamp}\n`;
      
      // Check if file exists
      const fileExists = await vault.adapter.exists(taskLogFile);
      
      if (fileExists) {
        // Read existing content to check if we need to add kanban header
        const content = await vault.adapter.read(taskLogFile);
        const kanbanHeader = `\n## ${kanbanFileName}\n`;
        
        // Check if kanban section exists
        if (!content.includes(`## ${kanbanFileName}`)) {
          // Add new kanban section
          await vault.adapter.append(taskLogFile, kanbanHeader + logEntry);
        } else {
          // Append to existing kanban section
          await vault.adapter.append(taskLogFile, logEntry);
        }
      } else {
        // Create new file with header
        const header = `# Pomodoro Task Timers\n\nTask timing log organized by Kanban board.\n\n## ${kanbanFileName}\n`;
        await vault.adapter.write(taskLogFile, header + logEntry);
      }
    } catch (error) {
      console.error('Error logging task time:', error);
    }
  }
  
  // Update quick break button visibility without recreating the view
  public updateQuickBreakVisibility() {
    if (this.quickBreakButton) {
      const enabled = this.plugin.settings.enableQuickBreak;
      
      // Toggle disabled class
      if (enabled) {
        this.quickBreakButton.removeClass('control-icon-disabled');
      } else {
        this.quickBreakButton.addClass('control-icon-disabled');
      }
      
      // Update aria-label
      this.quickBreakButton.setAttribute('aria-label', enabled 
        ? `Quick ${this.plugin.settings.quickBreakDuration} min break`
        : 'Quick break disabled');
    }
  }
}