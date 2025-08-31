// Basic test for Pomodoro functionality

import { PomodoroState } from './state.js';
import { AppConfig } from '../../../../shared/config.js';

// Mock DOM elements
const mockStatusEl = { textContent: '' };
const mockTimeEl = { textContent: '' };

// Mock callbacks
const mockOnUpdate = jest.fn();
const mockOnSessionChange = jest.fn();
const mockOnEnd = jest.fn();

describe('Pomodoro Timer', () => {
  let pomodoroState;
  
  beforeEach(() => {
    pomodoroState = new PomodoroState(AppConfig);
  });
  
  test('should initialize with correct default values', () => {
    const state = pomodoroState.getState();
    expect(state.mode).toBe('work');
    expect(state.state).toBe('idle');
    expect(state.remaining).toBe(AppConfig.pomodoro.workDuration);
  });
  
  test('should switch mode correctly', () => {
    pomodoroState.switchMode();
    const state = pomodoroState.getState();
    expect(state.mode).toBe('break');
    expect(state.remaining).toBe(AppConfig.pomodoro.breakDuration);
  });
  
  test('should pause and resume correctly', () => {
    pomodoroState.start();
    expect(pomodoroState.isRunning()).toBe(true);
    
    pomodoroState.pause();
    expect(pomodoroState.isPaused()).toBe(true);
    
    pomodoroState.resume();
    expect(pomodoroState.isRunning()).toBe(true);
  });
  
  test('should reset correctly', () => {
    pomodoroState.start();
    pomodoroState.switchMode();
    
    pomodoroState.reset();
    const state = pomodoroState.getState();
    expect(state.mode).toBe('work');
    expect(state.state).toBe('idle');
    expect(state.remaining).toBe(AppConfig.pomodoro.workDuration);
  });
});