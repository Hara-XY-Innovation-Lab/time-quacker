import { speak } from '../speech.js';
import { updateTimerUI } from '../time.js';

export class PomodoroTimer {
  constructor({ statusEl, timeEl, onUpdate, onSessionChange, onEnd }) {
    this.statusEl = statusEl;
    this.timeEl = timeEl;

    this.faceDetected = false;
    this.faceAbsentSince = null;
    this.detectionPaused = false;

    this.durations = { work: 25 * 60, break: 5 * 60 };
    this.mode = 'work'; // 'work' or 'break'
    this.state = 'idle'; // 'idle', 'running', 'paused'
    this.remaining = this.durations[this.mode];
    this.timer = null;

    // Optional callback handlers
    this.onUpdate = onUpdate || (() => {});
    this.onSessionChange = onSessionChange || (() => {});
    this.onEnd = onEnd || (() => {});

    updateTimerUI(this.remaining, this.timeEl);
  }

  setPaused(paused) {
    this.detectionPaused = paused;
    this.statusEl.textContent = paused ? "Detection paused." : "Detection resumed.";
  }

  onFaceDetected() {
    if (this.detectionPaused) return;
    if (!this.faceDetected) {
      this.faceDetected = true;
      this.faceAbsentSince = null;
      if (this.state === 'paused' || this.state === 'idle') this.resume();
      this.statusEl.textContent = "You are present (pomodoro running)";
    }
  }

  onFaceNotDetected() {
    if (this.detectionPaused) return;
    if (this.faceDetected && !this.faceAbsentSince)
      this.faceAbsentSince = Date.now();

    if (this.faceAbsentSince && Date.now() - this.faceAbsentSince > 5000) {
      this.faceDetected = false;
      this.faceAbsentSince = null;
      this.pause();
      this.statusEl.textContent = "Face not found. Pomodoro paused!";
    }
  }

  start() {
    if (this.state === 'idle') {
      this.state = 'running';
      this.remaining = this.durations[this.mode];
      this.tick();
      speak("Pomodoro started. Stay focused!");
    }
  }

  pause() {
    if (this.state === 'running') {
      clearInterval(this.timer);
      this.timer = null;
      this.state = 'paused';
      this.onUpdate(this.remaining, this.mode, this.state);
      speak("Pomodoro paused.");
    }
  }

  resume() {
    if (this.state === 'paused' || this.state === 'idle') {
      this.state = 'running';
      this.tick();
      speak("Resuming Pomodoro.");
    }
  }

  reset() {
    clearInterval(this.timer);
    this.timer = null;
    this.state = 'idle';
    this.mode = 'work';
    this.remaining = this.durations[this.mode];
    this.onUpdate(this.remaining, this.mode, this.state);
    updateTimerUI(this.remaining, this.timeEl);
    this.statusEl.textContent = "Pomodoro reset.";
  }

  tick() {
    this.onUpdate(this.remaining, this.mode, this.state);
    updateTimerUI(this.remaining, this.timeEl);

    this.timer = setInterval(() => {
      this.remaining--;
      this.onUpdate(this.remaining, this.mode, this.state);
      updateTimerUI(this.remaining, this.timeEl);

      if (this.remaining <= 0) {
        clearInterval(this.timer);
        this.onEnd(this.mode);

        this.mode = this.mode === 'work' ? 'break' : 'work';
        this.remaining = this.durations[this.mode];
        this.onSessionChange(this.mode);

        speak(this.mode === 'work' ? "Break over. Back to work!" : "Pomodoro complete. Time for a break!");
        this.start();
      }
    }, 1000);
  }
}
