// Application state structure

export const initialState = {
  // Camera state
  camera: {
    selectedDeviceId: null,
    devices: [],
  },
  
  // Pomodoro state
  pomodoro: {
    mode: 'work', // 'work' or 'break'
    state: 'idle', // 'idle', 'running', 'paused'
    remaining: 25 * 60, // 25 minutes in seconds
    faceDetected: false,
    detectionPaused: false,
  },
  
  // UI state
  ui: {
    statusMessage: '',
    currentTime: '',
  },
  
  // Detection state
  detection: {
    faceAbsentSince: null,
  }
};

export default initialState;