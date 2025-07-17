export class PomodoroTimer {
  constructor(onUpdate, onSessionChange, onEnd) {
    this.durations = { work: 25 * 60, break: 5 * 60 }; // in seconds
    this.mode = 'work';        // 'work' or 'break'
    this.state = 'idle';       // 'idle', 'running', 'paused'
    this.remaining = this.durations[this.mode];
    this.timer = null;

    this.onUpdate = onUpdate;           // (remaining, mode, state) => {}
    this.onSessionChange = onSessionChange; // (mode) => {}
    this.onEnd = onEnd;                 // () => {}
  }

  start() {
    if (this.state === 'idle') {
      this.state = 'running';
      this.remaining = this.durations[this.mode];
      this.tick();
    }
  }

  pause() {
    if (this.state === 'running') {
      clearInterval(this.timer);
      this.timer = null;
      this.state = 'paused';
      this.onUpdate(this.remaining, this.mode, this.state);
    }
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'running';
      this.tick();
    }
  }

  reset() {
    clearInterval(this.timer);
    this.timer = null;
    this.state = 'idle';
    this.mode = 'work';
    this.remaining = this.durations[this.mode];
    this.onUpdate(this.remaining, this.mode, this.state);
  }

  tick() {
    this.onUpdate(this.remaining, this.mode, this.state);
    this.timer = setInterval(() => {
      this.remaining--;
      this.onUpdate(this.remaining, this.mode, this.state);

      if (this.remaining <= 0) {
        clearInterval(this.timer);
        this.onEnd(this.mode);

        // Switch mode
        this.mode = this.mode === 'work' ? 'break' : 'work';
        this.remaining = this.durations[this.mode];
        this.onSessionChange(this.mode);

        // Auto-restart next session
        this.start();
      }
    }, 1000);
  }
}
