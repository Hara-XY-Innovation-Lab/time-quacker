// Centralized configuration system

export const AppConfig = {
  // Pomodoro settings
  pomodoro: {
    workDuration: 25 * 60, // 25 minutes in seconds
    breakDuration: 5 * 60,  // 5 minutes in seconds
  },
  
  // Detection settings
  detection: {
    faceAbsentThreshold: 5000, // 5 seconds
    gesture: {
      thumbsUpHoldDuration: 1500, // 1.5 seconds
      threeFingersHoldDuration: 1200, // 1.2 seconds
    }
  },
  
  // Camera settings
  camera: {
    defaultResolution: { width: 640, height: 480 },
  },
  
  // Weather settings
  weather: {
    apiKey: '743cda0db886183f205f62623cac8604',
    updateInterval: 7000, // 7 seconds
  }
};

export default AppConfig;