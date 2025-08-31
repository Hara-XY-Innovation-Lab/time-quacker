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
  // Mute functionality
  onMuteToggled: (callback) => {
    console.log('Setting up mute-toggled listener');
    ipcRenderer.on('mute-toggled', (event, isMuted) => {
      console.log('Received mute-toggled event:', isMuted);
      callback(isMuted);
    });
  },
  onNotificationMuteToggled: (callback) => {
    console.log('Setting up notification-mute-toggled listener');
    ipcRenderer.on('notification-mute-toggled', (event, isNotificationMuted) => {
      console.log('Received notification-mute-toggled event:', isNotificationMuted);
      callback(isNotificationMuted);
    });
  },
  getMuteStatus: () => ipcRenderer.sendSync('get-mute-status'),
  getNotificationMuteStatus: () => ipcRenderer.sendSync('get-notification-mute-status'),
  setMuteStatus: (muted) => ipcRenderer.send('set-mute-status', muted),
  setNotificationMuteStatus: (muted) => ipcRenderer.send('set-notification-mute-status', muted),
  setNotificationPosition: (position) => ipcRenderer.send('set-notification-position', position),
  showSilentNotification: (message) => ipcRenderer.send('show-silent-notification', message),
  // Water reminder IPC functions
  startWaterReminders: () => ipcRenderer.send('start-water-reminders'),
  stopWaterReminders: () => ipcRenderer.send('stop-water-reminders'),
  logWaterIntake: (amount) => ipcRenderer.send('log-water-intake', amount),
  getWaterStats: () => ipcRenderer.invoke('get-water-stats'),
  setWaterGoal: (goal) => ipcRenderer.send('set-water-goal', goal),
  setReminderInterval: (interval) => ipcRenderer.send('set-reminder-interval', interval)
});