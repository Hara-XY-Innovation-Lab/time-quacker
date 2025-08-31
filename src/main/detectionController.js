let isDetectionPaused = false;
let disableTimeout = null;

function pauseDetection(minutes, mainWindow) {
  isDetectionPaused = true;
  mainWindow?.webContents.send('pause-detection', true);
  if (disableTimeout) clearTimeout(disableTimeout);
  disableTimeout = setTimeout(() => enableDetection(mainWindow), minutes * 60 * 1000);
}

function disableDetection(mainWindow) {
  isDetectionPaused = true;
  mainWindow?.webContents.send('pause-detection', true);
}

function enableDetection(mainWindow) {
  isDetectionPaused = false;
  mainWindow?.webContents.send('pause-detection', false);
  if (disableTimeout) clearTimeout(disableTimeout);
}

module.exports = {
  isDetectionPaused,
  pauseDetection,
  disableDetection,
  enableDetection
};