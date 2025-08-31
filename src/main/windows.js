const { app, BrowserWindow } = require('electron');
const path = require('path');
const { getRandomSplashImage } = require('./splashImageManager');

function createSplashWindow() {
  const splashImage = getRandomSplashImage();
  const splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  splashWindow.loadFile(path.join(__dirname, '..', 'renderer', 'splash.html'), {
    query: { img: splashImage }
  });

  return splashWindow;
}

function createMainWindow() {
  console.log('Creating main window');
  
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      // Media permissions
      autoplayPolicy: 'no-user-gesture-required',
      // Allow media access
      permissions: ['media', 'camera', 'microphone']
    }
  });

  // Handle media access requests
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log('Window permission requested:', permission);
    
    // Automatically allow camera and microphone permissions
    if (permission === 'media' || permission === 'camera' || permission === 'microphone') {
      console.log('Automatically granting permission:', permission);
      callback(true);
      return;
    }
    
    // Default to denying other permissions
    callback(false);
  });

  // Also handle permission checks
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    console.log('Window permission check:', permission);
    
    // Automatically allow camera and microphone permissions
    if (permission === 'media' || permission === 'camera' || permission === 'microphone') {
      console.log('Automatically allowing permission check:', permission);
      return true;
    }
    
    // Default to denying other permissions
    return false;
  });
  
  // Add debugging for file loading
  const indexPath = path.join(__dirname, '..', 'renderer', 'index.html');
  console.log('Loading index.html from:', indexPath);
  
  mainWindow.loadFile(indexPath)
    .then(() => {
      console.log('index.html loaded successfully');
    })
    .catch(error => {
      console.error('Error loading index.html:', error);
    });

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  
  // Add debugging for page events
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Main window finished loading');
  });
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Main window failed to load:', errorCode, errorDescription);
  });

  return mainWindow;
}

module.exports = {
  createSplashWindow,
  createMainWindow
};