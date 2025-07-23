let cameraList = [];
let selectedCameraId = null;

function handleCameraList(cams, mainWindow) {
  cameraList = cams;
  const integrated = cameraList.find(c => /integrated|built[-\s]?in/i.test(c.label));
  selectedCameraId = integrated ? integrated.deviceId : (cameraList[0]?.deviceId);
  if (mainWindow) mainWindow.webContents.send('select-camera', selectedCameraId);
}

function setSelectedCamera(id) {
  selectedCameraId = id;
}

module.exports = {
  cameraList,
  selectedCameraId,
  handleCameraList,
  setSelectedCamera
};
