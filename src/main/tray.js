const { app, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { getSelectedCameraId, getCameraList, setSelectedCamera } = require('./cameraManager');
const { pauseDetection, enableDetection, disableDetection, isDetectionPaused } = require('./detectionController');

let tray;

function createTray(mainWindow) {
  // Fix the path to the icon - it should be in the root Assets directory, not src/main/Assets
  const iconPath = path.join(__dirname, '..', '..', 'Assets', 'timequacker latest.png');
  tray = new Tray(nativeImage.createFromPath(iconPath));
  updateTrayMenu(mainWindow);
}

function updateTrayMenu(mainWindow) {
  const cameraList = getCameraList();
  const selectedCameraId = getSelectedCameraId();
  
  console.log('updateTrayMenu called');
  console.log('Camera list:', cameraList);
  console.log('Selected camera ID:', selectedCameraId);
  
  let cameraItems = [];
  
  if (cameraList && cameraList.length > 0) {
    console.log('Creating camera items for', cameraList.length, 'cameras');
    cameraItems = cameraList.map(cam => ({
      label: cam.label || `Camera (${cam.deviceId.slice(-4)})`,
      type: 'radio',
      checked: cam.deviceId === selectedCameraId,
      click: () => {
        console.log('Camera selected from tray menu:', cam.deviceId);
        setSelectedCamera(cam.deviceId);
        if (mainWindow) {
          mainWindow.webContents.send('select-camera', cam.deviceId);
        }
        updateTrayMenu(mainWindow);
      }
    }));
  } else {
    console.log('No cameras available, showing empty message');
    cameraItems = [{
      label: 'No cameras available',
      enabled: false
    }];
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Select Camera', enabled: false },
    ...cameraItems,
    { type: 'separator' },
    { label: 'Disable for 5 Minutes', enabled: !isDetectionPaused, click: () => pauseDetection(5, mainWindow) },
    { label: 'Disable for 15 Minutes', enabled: !isDetectionPaused, click: () => pauseDetection(15, mainWindow) },
    { label: 'Disable for 1 Hour', enabled: !isDetectionPaused, click: () => pauseDetection(60, mainWindow) },
    { label: 'Disable until its Enable', enabled: !isDetectionPaused, click: () => disableDetection(mainWindow) },
    { label: 'Enable Now', enabled: isDetectionPaused, click: () => enableDetection(mainWindow) },
    { type: 'separator' },
    { label: 'Show App', click: () => mainWindow.show() },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(isDetectionPaused ? 'Detection Paused' : 'Time Quacker🦆');
}

module.exports = { createTray, updateTrayMenu };