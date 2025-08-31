const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, Notification, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Import water reminder service
const waterReminderService = require('./services/waterReminderService');

let mainWindow, splashWindow, tray;
let cameraList = [];
let selectedCameraId = null;
let isDetectionPaused = false;
let disableTimeout = null;
let isMuted = false; // Voice mute state
let isNotificationMuted = false; // Notification mute state

const splashDir = path.join(__dirname, '..', '..', 'Assets', 'splash');
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
    console.log('Found splash images:', allImages);
    // Fisher-Yates shuffle
    for (let i = allImages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allImages[i], allImages[j]] = [allImages[j], allImages[i]];
    }
    splashShufflePool = allImages;
  }

  // Pop the next image from the shuffled pool
  const chosen = splashShufflePool.pop();
  console.log('Selected splash image:', chosen);
  if (!chosen) return null;
  const absPath = path.join(splashDir, chosen);
  const url = 'file://' + absPath.replace(/\\/g, '/');
  console.log('Splash image URL:', url);
  return url;
}

function createSplashWindow() {
  const splashImage = getRandomSplashImage(); // Now returns file://... URL
  console.log('Creating splash window with image:', splashImage);
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
  splashWindow.loadFile(path.join(__dirname, '..', 'renderer', 'splash.html'), { query: { img: splashImage } });
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
      backgroundThrottling: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

let settingsWindow = null;

// Function to create settings window
function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.show();
    return;
  }
  
  settingsWindow = new BrowserWindow({
    width: 600,
    height: 700,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  
  settingsWindow.loadFile(path.join(__dirname, '..', 'renderer', 'settings.html'));
  
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

let waterSettingsWindow = null;

// Function to create water settings window
function createWaterSettingsWindow() {
  if (waterSettingsWindow) {
    waterSettingsWindow.show();
    return;
  }
  
  waterSettingsWindow = new BrowserWindow({
    width: 500,
    height: 400,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  
  waterSettingsWindow.loadFile(path.join(__dirname, '..', 'renderer', 'water-settings.html'));
  
  waterSettingsWindow.on('closed', () => {
    waterSettingsWindow = null;
  });
}

// Update the updateTrayMenu function to include settings
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
    // Mute options
    {
      label: isMuted ? 'Unmute Time Quacker' : 'Mute Time Quacker',
      click: () => {
        isMuted = !isMuted;
        if (mainWindow) mainWindow.webContents.send('mute-toggled', isMuted);
        updateTrayMenu();
      }
    },
    {
      label: isNotificationMuted ? 'Enable Notifications' : 'Mute Notifications',
      click: () => {
        isNotificationMuted = !isNotificationMuted;
        if (mainWindow) mainWindow.webContents.send('notification-mute-toggled', isNotificationMuted);
        updateTrayMenu();
      }
    },
    { type: 'separator' },
    // Settings
    {
      label: 'Settings',
      click: () => createSettingsWindow()
    },
    { type: 'separator' },
    // Water Reminder Menu Items
    { label: 'Water Reminder', enabled: false },
    {
      label: waterReminderService.getSettings().isReminderActive ? 'Stop Water Reminders' : 'Start Water Reminders',
      click: () => {
        if (waterReminderService.getSettings().isReminderActive) {
          waterReminderService.stopReminders();
        } else {
          waterReminderService.startReminders();
        }
        updateTrayMenu();
      }
    },
    {
      label: 'Log Water Intake (250ml)',
      click: () => waterReminderService.logWaterIntake()
    },
    {
      label: 'Log Water Intake (500ml)',
      click: () => waterReminderService.logWaterIntake(500)
    },
    {
      label: 'Show Water Stats',
      click: () => createWaterStatsWindow()
    },
    {
      label: 'Water Settings',
      click: () => createWaterSettingsWindow()
    },
    { type: 'separator' },
    { label: 'Show App', click: () => mainWindow && mainWindow.show() },
    { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } }
  ]);
  tray.setContextMenu(contextMenu);
  tray.setToolTip(isDetectionPaused ? 'Detection Paused' : (isMuted ? 'Time Quacker (Muted) 🦆' : 'Time Quacker🦆'));
}

let waterStatsWindow = null;

// Function to create water statistics window
function createWaterStatsWindow() {
  if (waterStatsWindow) {
    waterStatsWindow.show();
    return;
  }
  
  waterStatsWindow = new BrowserWindow({
    width: 600,
    height: 400,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  
  waterStatsWindow.loadFile(path.join(__dirname, '..', 'renderer', 'water-stats.html'));
  
  waterStatsWindow.on('closed', () => {
    waterStatsWindow = null;
  });
}

// Update the showWaterStats function
function showWaterStats() {
  createWaterStatsWindow();
}

function createTray() {
  const iconPath = path.join(__dirname, '..', '..', 'Assets', 'tray-icon.png');
  console.log('Creating tray with icon:', iconPath);
  console.log('Icon file exists:', fs.existsSync(iconPath));
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

// IPC handlers for water reminder
ipcMain.on('start-water-reminders', () => {
  waterReminderService.startReminders();
  updateTrayMenu();
});

ipcMain.on('stop-water-reminders', () => {
  waterReminderService.stopReminders();
  updateTrayMenu();
});

ipcMain.on('log-water-intake', (event, amount) => {
  waterReminderService.logWaterIntake(amount);
  updateTrayMenu();
});

ipcMain.handle('get-water-stats', () => {
  return {
    today: waterReminderService.getTodaysStats(),
    weekly: waterReminderService.getWeeklyStats(),
    settings: waterReminderService.getSettings()
  };
});

ipcMain.on('set-water-goal', (event, goal) => {
  waterReminderService.setDailyGoal(goal);
});

ipcMain.on('set-reminder-interval', (event, interval) => {
  waterReminderService.setReminderInterval(interval);
});

ipcMain.on('camera-list', (event, cams) => {
  console.log('Received camera list from renderer:', cams);
  cameraList = cams;
  const integrated = cameraList.find(c => /integrated|built[-\s]?in/i.test(c.label));
  selectedCameraId = integrated ? integrated.deviceId : (cameraList[0] && cameraList[0].deviceId);
  updateTrayMenu();
  if (mainWindow) mainWindow.webContents.send('select-camera', selectedCameraId);
});

// Add notification position variable
let notificationPosition = 'top-left'; // Default position

// Function to show silent splash notification
function showSilentSplashNotification(message) {
  console.log('Attempting to show silent splash notification:', message);
  console.log('Notification muted status:', isNotificationMuted);
  console.log('Notification position:', notificationPosition);
  
  // Show splash notification ONLY when notifications are muted
  if (!isNotificationMuted) {
    console.log('Notifications are NOT muted, skipping silent splash notification');
    return;
  }
  
  try {
    // Create a small window for the notification
    const notificationWindow = new BrowserWindow({
      width: 350,
      height: 80,
      show: false,
      frame: false,
      alwaysOnTop: true,
      transparent: false,
      resizable: false,
      movable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    
    console.log('Created notification window');
    
    // Position based on setting
    const primaryDisplay = screen.getPrimaryDisplay();
    const { x, y, width, height } = primaryDisplay.workArea;
    let windowX, windowY;
    
    switch (notificationPosition) {
      case 'top-right':
        windowX = x + width - 370; // 350px width + 20px margin
        windowY = y + 20;
        break;
      case 'bottom-left':
        windowX = x + 20;
        windowY = y + height - 100; // 80px height + 20px margin
        break;
      case 'bottom-right':
        windowX = x + width - 370; // 350px width + 20px margin
        windowY = y + height - 100; // 80px height + 20px margin
        break;
      case 'center':
        windowX = x + (width / 2) - 175; // Center horizontally
        windowY = y + (height / 2) - 40; // Center vertically
        break;
      case 'top-left':
      default:
        windowX = x + 20;
        windowY = y + 20;
        break;
    }
    
    notificationWindow.setPosition(windowX, windowY);
    
    console.log('Set window position to:', windowX, windowY);
    
    // Load the splash notification HTML file with message as query parameter
    const notificationPath = path.join(__dirname, '..', 'renderer', 'splash-notification.html');
    const url = `file://${notificationPath}?message=${encodeURIComponent(message)}`;
    notificationWindow.loadURL(url);
    
    console.log('Loaded splash notification file into window');
    
    notificationWindow.once('ready-to-show', () => {
      console.log('Notification window ready to show');
      notificationWindow.show();
    });
    
    notificationWindow.once('error', (error) => {
      console.error('Notification window error:', error);
    });
    
  } catch (error) {
    console.error('Error creating silent splash notification:', error);
  }
}

// IPC handler for showing silent splash notifications
ipcMain.on('show-silent-notification', (event, message) => {
  console.log('IPC: show-silent-notification called with message:', message);
  showSilentSplashNotification(message);
});

// IPC handlers for mute status
ipcMain.on('get-mute-status', (event) => {
  event.returnValue = isMuted;
});

ipcMain.on('get-notification-mute-status', (event) => {
  event.returnValue = isNotificationMuted;
});

ipcMain.on('set-mute-status', (event, muted) => {
  isMuted = muted;
  if (mainWindow) mainWindow.webContents.send('mute-toggled', isMuted);
  updateTrayMenu();
});

ipcMain.on('set-notification-mute-status', (event, muted) => {
  isNotificationMuted = muted;
  if (mainWindow) mainWindow.webContents.send('notification-mute-toggled', isNotificationMuted);
  updateTrayMenu();
});

// IPC handler for setting notification position
ipcMain.on('set-notification-position', (event, position) => {
  notificationPosition = position;
  console.log('Notification position set to:', position);
});

app.whenReady().then(() => {
  createSplashWindow();
  setTimeout(() => {
    if (splashWindow) { splashWindow.close(); splashWindow = null; }
    createMainWindow();
    createTray();
    
    // Start water reminders by default
    waterReminderService.startReminders();
  }, 2500);
});

app.on('window-all-closed', (e) => e.preventDefault());
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});