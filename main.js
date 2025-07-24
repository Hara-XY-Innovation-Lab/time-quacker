const { app, ipcMain } = require('electron');
const { createSplashWindow, createMainWindow } = require('./windows');
const { createTray, updateTrayMenu } = require('./tray');
const { handleCameraList } = require('./cameraManager');
const { pauseDetection, enableDetection, disableDetection, isDetectionPaused } = require('./detectionController');

let mainWindow, splashWindow;

app.whenReady().then(() => {
  splashWindow = createSplashWindow();
  setTimeout(() => {
    if (splashWindow) splashWindow.close();
    mainWindow = createMainWindow();
    createTray(mainWindow);
  }, 2500);
});

app.on('window-all-closed', (e) => e.preventDefault());
app.on('activate', () => {
  if (!mainWindow) mainWindow = createMainWindow();
});

// IPC for camera list from renderer
ipcMain.on('camera-list', (event, cams) => {
  handleCameraList(cams, mainWindow);
  updateTrayMenu(mainWindow);
});
