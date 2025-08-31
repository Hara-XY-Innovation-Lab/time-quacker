import { speak } from '../speech.js';
import { updateTimerUI } from './timer.js';
import { AppConfig } from '../../../shared/config.js';
import eventSystem from '../../../shared/eventSystem.js';
import { PomodoroState } from './state.js';
import stateManager from '../../../shared/stateManager.js';
import logger from '../../../shared/logger.js';

export class PomodoroTimer {
  constructor({ statusEl, timeEl, onUpdate, onSessionChange, onEnd }) {
    this.statusEl = statusEl;
    this.timeEl = timeEl;
    this.logger = new logger.Logger('PomodoroTimer');

    // Initialize state
    this.state = new PomodoroState(AppConfig);

    // Optional callback handlers
    this.onUpdate = onUpdate || (() => {});
    this.onSessionChange = onSessionChange || (() => {});
    this.onEnd = onEnd || (() => {});

    try {
      // Initialize with default state
      const pomodoroState = stateManager.get('pomodoro');
      if (pomodoroState) {
        updateTimerUI(pomodoroState.remaining, this.timeEl);
      }
      
      // Listen for face detection events
      this.unsubscribeFaceDetected = eventSystem.on('faceDetected', () => this.onFaceDetected());
      this.unsubscribeFaceNotDetected = eventSystem.on('faceNotDetected', () => this.onFaceNotDetected());
      
      // Subscribe to state changes
      this.unsubscribeState = stateManager.subscribe('pomodoro', (pomodoroState) => {
        if (this.timeEl) {
          updateTimerUI(pomodoroState.remaining, this.timeEl);
        }
      });
      
      this.logger.info('PomodoroTimer initialized');
    } catch (error) {
      this.logger.error('Failed to initialize PomodoroTimer', error);
      eventSystem.emit('pomodoroError', error);
    }
  }

  setPaused(paused) {
    try {
      this.state.setDetectionPaused(paused);
      if (this.statusEl) {
        this.statusEl.textContent = paused ? "Detection paused." : "Detection resumed.";
      }
    } catch (error) {
      this.logger.error('Error setting paused state', error);
      eventSystem.emit('pomodoroError', error);
    }
  }

  onFaceDetected() {
    try {
      if (this.state.isDetectionPaused()) return;
      if (!this.state.isFaceDetected()) {
        this.state.setFaceDetected(true);
        this.state.setFaceAbsentSince(null);
        if (this.state.isPaused() || this.state.isIdle()) this.resume();
        if (this.statusEl) {
          this.statusEl.textContent = "You are present (pomodoro running)";
        }
      }
    } catch (error) {
      this.logger.error('Error handling face detected', error);
      eventSystem.emit('pomodoroError', error);
    }
  }

  onFaceNotDetected() {
    try {
      if (this.state.isDetectionPaused()) return;
      if (this.state.isFaceDetected() && !this.state.getFaceAbsentSince())
        this.state.setFaceAbsentSince(Date.now());

      if (this.state.getFaceAbsentSince() && Date.now() - this.state.getFaceAbsentSince() > AppConfig.detection.faceAbsentThreshold) {
        this.state.setFaceDetected(false);
        this.state.setFaceAbsentSince(null);
        this.pause();
        if (this.statusEl) {
          this.statusEl.textContent = "Face not found. Pomodoro paused!";
        }
      }
    } catch (error) {
      this.logger.error('Error handling face not detected', error);
      eventSystem.emit('pomodoroError', error);
    }
  }

  start() {
    try {
      if (this.state.isIdle()) {
        this.state.start();
        this.tick();
        speak("Pomodoro started. Stay focused!");
        eventSystem.emit('pomodoroStarted', stateManager.get('pomodoro'));
      }
    } catch (error) {
      this.logger.error('Error starting pomodoro', error);
      eventSystem.emit('pomodoroError', error);
    }
  }

  pause() {
    try {
      if (this.state.isRunning()) {
        clearInterval(this.timer);
        this.timer = null;
        this.state.pause();
        const pomodoroState = stateManager.get('pomodoro');
        this.onUpdate(pomodoroState.remaining, pomodoroState.mode, pomodoroState.state);
        speak("Pomodoro paused.");
        eventSystem.emit('pomodoroPaused', pomodoroState);
      }
    } catch (error) {
      this.logger.error('Error pausing pomodoro', error);
      eventSystem.emit('pomodoroError', error);
    }
  }

  resume() {
    try {
      if (this.state.isPaused() || this.state.isIdle()) {
        this.state.resume();
        this.tick();
        speak("Resuming Pomodoro.");
        eventSystem.emit('pomodoroResumed', stateManager.get('pomodoro'));
      }
    } catch (error) {
      this.logger.error('Error resuming pomodoro', error);
      eventSystem.emit('pomodoroError', error);
    }
  }

  reset() {
    try {
      clearInterval(this.timer);
      this.timer = null;
      this.state.reset();
      const pomodoroState = stateManager.get('pomodoro');
      this.onUpdate(pomodoroState.remaining, pomodoroState.mode, pomodoroState.state);
      updateTimerUI(pomodoroState.remaining, this.timeEl);
      if (this.statusEl) {
        this.statusEl.textContent = "Pomodoro reset.";
      }
      eventSystem.emit('pomodoroReset', pomodoroState);
    } catch (error) {
      this.logger.error('Error resetting pomodoro', error);
      eventSystem.emit('pomodoroError', error);
    }
  }

  tick() {
    try {
      const pomodoroState = stateManager.get('pomodoro');
      this.onUpdate(pomodoroState.remaining, pomodoroState.mode, pomodoroState.state);
      updateTimerUI(pomodoroState.remaining, this.timeEl);

      this.timer = setInterval(() => {
        try {
          this.state.updateRemaining(pomodoroState.remaining - 1);
          const updatedState = stateManager.get('pomodoro');
          this.onUpdate(updatedState.remaining, updatedState.mode, updatedState.state);
          updateTimerUI(updatedState.remaining, this.timeEl);

          if (updatedState.remaining <= 0) {
            clearInterval(this.timer);
            this.onEnd(updatedState.mode);

            this.state.switchMode();
            const newState = stateManager.get('pomodoro');
            this.onSessionChange(newState.mode);

            speak(newState.mode === 'work' ? "Break over. Back to work!" : "Pomodoro complete. Time for a break!");
            this.start();
          }
        } catch (error) {
          this.logger.error('Error in timer tick', error);
          eventSystem.emit('pomodoroError', error);
        }
      }, 1000);
    } catch (error) {
      this.logger.error('Error starting timer', error);
      eventSystem.emit('pomodoroError', error);
    }
  }
  
  // Cleanup method to unsubscribe from events
  destroy() {
    try {
      if (this.unsubscribeFaceDetected) this.unsubscribeFaceDetected();
      if (this.unsubscribeFaceNotDetected) this.unsubscribeFaceNotDetected();
      if (this.unsubscribeState) this.unsubscribeState();
      if (this.timer) clearInterval(this.timer);
      this.logger.info('PomodoroTimer destroyed');
    } catch (error) {
      this.logger.error('Error destroying PomodoroTimer', error);
    }
  }
}