const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendCameraList: (cams) => {
    console.log('Sending camera list to main process:', cams);
    ipcRenderer.send('camera-list', cams);
  },
  onSelectCamera: (callback) => {
    console.log('Setting up select-camera listener');
    ipcRenderer.on('select-camera', (event, deviceId) => {
      console.log('Received select-camera event:', deviceId);
      callback(deviceId);
    });
  },
  onPauseDetection: (callback) => {
    console.log('Setting up pause-detection listener');
    ipcRenderer.on('pause-detection', (event, paused) => {
      console.log('Received pause-detection event:', paused);
      callback(paused);
    });
  },
  // Water reminder IPC functions
  startWaterReminders: () => ipcRenderer.send('start-water-reminders'),
  stopWaterReminders: () => ipcRenderer.send('stop-water-reminders'),
  logWaterIntake: (amount) => ipcRenderer.send('log-water-intake', amount),
  getWaterStats: () => ipcRenderer.invoke('get-water-stats'),
  setWaterGoal: (goal) => ipcRenderer.send('set-water-goal', goal),
  setReminderInterval: (interval) => ipcRenderer.send('set-reminder-interval', interval)
});