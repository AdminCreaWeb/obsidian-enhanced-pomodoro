// CircularTimer.ts
export class CircularTimer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private radius: number;
    private currentTime: number = 0;
    private totalTime: number = 25 * 60; // 25 minutes in seconds
    private isRunning: boolean = false;
    private animationFrameId: number | null = null;
    private lastTimestamp: number = 0;
    private onComplete: () => void;
  
    constructor(
      container: HTMLElement,
      size: number = 200,
      onComplete: () => void = () => {}
    ) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = size;
      this.canvas.height = size;
      container.appendChild(this.canvas);
      
      const ctx = this.canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2D context');
      this.ctx = ctx;
      
      this.radius = size / 2 - 10;
      this.onComplete = onComplete;
      
      // Initial render
      this.render();
    }
  
    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.lastTimestamp = performance.now();
      this.animate();
    }
  
    pause() {
      this.isRunning = false;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }
  
    reset() {
      this.pause();
      this.currentTime = 0;
      this.render();
    }
  
    setTime(seconds: number) {
      this.currentTime = Math.max(0, Math.min(seconds, this.totalTime));
      this.render();
    }
  
    private animate(timestamp: number = 0) {
      if (!this.isRunning) return;
  
      const delta = (timestamp - this.lastTimestamp) / 1000; // Convert to seconds
      this.lastTimestamp = timestamp;
  
      this.currentTime += delta;
  
      if (this.currentTime >= this.totalTime) {
        this.currentTime = this.totalTime;
        this.isRunning = false;
        this.onComplete();
      }
  
      this.render();
  
      if (this.isRunning) {
        this.animationFrameId = requestAnimationFrame((t) => this.animate(t));
      }
    }
  
    private render() {
      const { ctx, canvas, radius, currentTime, totalTime } = this;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw background circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 8;
      ctx.stroke();
      
      // Draw progress
      const progress = currentTime / totalTime;
      const endAngle = Math.PI * 2 * progress - Math.PI / 2;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, -Math.PI / 2, endAngle);
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      // Draw time text
      const minutes = Math.floor((totalTime - currentTime) / 60);
      const seconds = Math.floor((totalTime - currentTime) % 60);
      const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      ctx.fillStyle = '#000000';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(timeString, centerX, centerY);
    }
  
    destroy() {
      this.pause();
      if (this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
    }
  }