const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow, splashWindow, tray;
let cameraList = [];
let selectedCameraId = null;
let isDetectionPaused = false;
let disableTimeout = null;





const splashDir = path.join(__dirname, 'Assets', 'splash');
let splashShufflePool = [];

function getSplashImages() {
  return fs.existsSync(splashDir)
    ? fs.readdirSync(splashDir).filter(f => /\.(png|jpe?g|gif|bmp|webp)$/i.test(f))
    : [];
}

function getRandomSplashImage() {
  // Refill and shuffle if pool is empty
  if (splashShufflePool.length === 0) {
    const allImages = getSplashImages();
    // Fisher-Yates shuffle
    for (let i = allImages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allImages[i], allImages[j]] = [allImages[j], allImages[i]];
    }
    splashShufflePool = allImages;
  }

  // Pop the next image from the shuffled pool
  const chosen = splashShufflePool.pop();
  if (!chosen) return null;
  const absPath = path.join(splashDir, chosen);
  return 'file://' + absPath.replace(/\\/g, '/');
}

function createSplashWindow() {
  const splashImage = getRandomSplashImage(); // Now returns file://... URL
  splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    show: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  splashWindow.loadFile(path.join('renderer', 'splash.html'), { query: { img: splashImage } });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false // <-- Add this line
    }
  });
  mainWindow.loadFile(path.join('renderer', 'index.html'));
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function updateTrayMenu() {
  const cameraMenuItems = cameraList.map(cam => ({
    label: cam.label || `Camera (${cam.deviceId.slice(-4)})`,
    type: 'radio',
    checked: cam.deviceId === selectedCameraId,
    click: () => {
      selectedCameraId = cam.deviceId;
      if (mainWindow) mainWindow.webContents.send('select-camera', cam.deviceId);
      updateTrayMenu();
    }
  }));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Select Camera', enabled: false },
    ...cameraMenuItems,
    { type: 'separator' },
    {
      label: 'Disable for 5 Minutes',
      enabled: !isDetectionPaused,
      click: () => pauseDetection(5)
    },
    {
      label: 'Disable for 15 Minutes',
      enabled: !isDetectionPaused,
      click: () => pauseDetection(15)
    },
    {
      label: 'Disable for 1 Hour',
      enabled: !isDetectionPaused,
      click: () => pauseDetection(60)
    },
    {
      label: 'Disable until its Enable',
      enabled: !isDetectionPaused,
      click: disableDetection
    },
    {
      label: 'Enable Now',
      enabled: isDetectionPaused,
      click: enableDetection
    },
    { type: 'separator' },
    { label: 'Show App', click: () => mainWindow && mainWindow.show() },
    { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } }
  ]);
  tray.setContextMenu(contextMenu);
  tray.setToolTip(isDetectionPaused ? 'Detection Paused' : 'Time Quacker🦆');
}

function createTray() {
  const iconPath = path.join(__dirname, 'Assets', 'timequacker latest.png');
  tray = new Tray(nativeImage.createFromPath(iconPath));
  updateTrayMenu();
}

function pauseDetection(minutes) {
  isDetectionPaused = true;
  if (mainWindow) mainWindow.webContents.send('pause-detection', true);
  updateTrayMenu();
  if (disableTimeout) clearTimeout(disableTimeout);
  disableTimeout = setTimeout(enableDetection, minutes * 60 * 1000);
}
function disableDetection() {
  isDetectionPaused = true;
  if (mainWindow) mainWindow.webContents.send('pause-detection', true);
  updateTrayMenu();
}

function enableDetection() {
  isDetectionPaused = false;
  if (mainWindow) mainWindow.webContents.send('pause-detection', false);
  updateTrayMenu();
  if (disableTimeout) clearTimeout(disableTimeout);
}

ipcMain.on('camera-list', (event, cams) => {
  cameraList = cams;
  const integrated = cameraList.find(c => /integrated|built[-\s]?in/i.test(c.label));
  selectedCameraId = integrated ? integrated.deviceId : (cameraList[0] && cameraList[0].deviceId);
  updateTrayMenu();
  if (mainWindow) mainWindow.webContents.send('select-camera', selectedCameraId);
});

app.whenReady().then(() => {
  createSplashWindow();
  setTimeout(() => {
    if (splashWindow) { splashWindow.close(); splashWindow = null; }
    createMainWindow();
    createTray();
  }, 2500);
});

app.on('window-all-closed', (e) => e.preventDefault());
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
