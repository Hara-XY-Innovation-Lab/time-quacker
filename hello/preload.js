const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendCameraList: (cams) => ipcRenderer.send('camera-list', cams),
  onSelectCamera: (callback) => ipcRenderer.on('select-camera', (event, deviceId) => callback(deviceId)),
  onPauseDetection: (callback) => ipcRenderer.on('pause-detection', (event, paused) => callback(paused)),
});