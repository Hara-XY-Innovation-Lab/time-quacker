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
      preload: path.join(__dirname, 'preload.js')
    }
  });

  splashWindow.loadFile(path.join('renderer', 'splash.html'), {
    query: { img: splashImage }
  });

  return splashWindow;
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
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

  mainWindow.loadFile(path.join('renderer', 'index.html'));

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  return mainWindow;
}

module.exports = {
  createSplashWindow,
  createMainWindow
};
