import stateManager from '../../../shared/stateManager.js';

export class PomodoroState {
  constructor(config) {
    this.config = config;
    this.reset();
  }

  reset() {
    const initialState = {
      mode: 'work', // 'work' or 'break'
      state: 'idle', // 'idle', 'running', 'paused'
      remaining: this.config.pomodoro.workDuration,
      faceDetected: false,
      faceAbsentSince: null,
      detectionPaused: false,
    };
    
    stateManager.set('pomodoro', initialState);
  }

  // Get current pomodoro state
  getState() {
    return stateManager.get('pomodoro') || {};
  }

  // Get current session duration based on mode
  getDuration() {
    const pomodoroState = this.getState();
    return this.config.pomodoro[pomodoroState.mode];
  }

  // Switch to next mode (work <-> break)
  switchMode() {
    const pomodoroState = this.getState();
    const newState = {
      ...pomodoroState,
      mode: pomodoroState.mode === 'work' ? 'break' : 'work',
      remaining: this.config.pomodoro[pomodoroState.mode === 'work' ? 'break' : 'work']
    };
    
    stateManager.set('pomodoro', newState);
  }

  // Pause the timer
  pause() {
    const pomodoroState = this.getState();
    stateManager.set('pomodoro', {
      ...pomodoroState,
      state: 'paused'
    });
  }

  // Resume the timer
  resume() {
    const pomodoroState = this.getState();
    stateManager.set('pomodoro', {
      ...pomodoroState,
      state: 'running'
    });
  }

  // Start the timer
  start() {
    const pomodoroState = this.getState();
    stateManager.set('pomodoro', {
      ...pomodoroState,
      state: 'running',
      remaining: this.getDuration()
    });
  }

  // Update remaining time
  updateRemaining(remaining) {
    const pomodoroState = this.getState();
    stateManager.set('pomodoro', {
      ...pomodoroState,
      remaining
    });
  }

  // Check if timer is running
  isRunning() {
    const pomodoroState = this.getState();
    return pomodoroState.state === 'running';
  }

  // Check if timer is paused
  isPaused() {
    const pomodoroState = this.getState();
    return pomodoroState.state === 'paused';
  }

  // Check if timer is idle
  isIdle() {
    const pomodoroState = this.getState();
    return pomodoroState.state === 'idle';
  }

  // Set detection paused state
  setDetectionPaused(paused) {
    const pomodoroState = this.getState();
    stateManager.set('pomodoro', {
      ...pomodoroState,
      detectionPaused: paused
    });
  }

  // Check if detection is paused
  isDetectionPaused() {
    const pomodoroState = this.getState();
    return pomodoroState.detectionPaused;
  }

  // Set face detected state
  setFaceDetected(detected) {
    const pomodoroState = this.getState();
    stateManager.set('pomodoro', {
      ...pomodoroState,
      faceDetected: detected
    });
  }

  // Check if face is detected
  isFaceDetected() {
    const pomodoroState = this.getState();
    return pomodoroState.faceDetected;
  }

  // Set face absent since timestamp
  setFaceAbsentSince(timestamp) {
    const pomodoroState = this.getState();
    stateManager.set('pomodoro', {
      ...pomodoroState,
      faceAbsentSince: timestamp
    });
  }

  // Get face absent since timestamp
  getFaceAbsentSince() {
    const pomodoroState = this.getState();
    return pomodoroState.faceAbsentSince;
  }
}