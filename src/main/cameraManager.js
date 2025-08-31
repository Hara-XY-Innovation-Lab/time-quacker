let cameraList = [];
let selectedCameraId = null;

function getCameraList() {
  console.log('getCameraList called, returning:', cameraList);
  return cameraList;
}

function getSelectedCameraId() {
  console.log('getSelectedCameraId called, returning:', selectedCameraId);
  return selectedCameraId;
}

function handleCameraList(cams, mainWindow) {
  console.log('handleCameraList called with:', cams);
  console.log('Main window available:', !!mainWindow);
  cameraList = cams || [];
  console.log('Camera list updated to:', cameraList);
  
  if (cameraList.length > 0) {
    const integrated = cameraList.find(c => /integrated|built[-\s]?in/i.test(c.label));
    selectedCameraId = integrated ? integrated.deviceId : (cameraList[0]?.deviceId);
    console.log('Selected camera ID:', selectedCameraId);
  } else {
    selectedCameraId = null;
    console.log('No cameras available, clearing selected camera ID');
  }
  
  if (mainWindow) {
    // Add a small delay to ensure the renderer is ready
    setTimeout(() => {
      console.log('Sending select-camera event to renderer with ID:', selectedCameraId);
      mainWindow.webContents.send('select-camera', selectedCameraId);
    }, 100);
  }
}

function setSelectedCamera(id) {
  console.log('setSelectedCamera called with:', id);
  selectedCameraId = id;
}

// Function to start the camera
function startCamera(videoElement, deviceId) {
  console.log('startCamera called with deviceId:', deviceId);
  // Check if MediaDevices API is available
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return Promise.reject(new Error('MediaDevices API not available'));
  }

  // Stop any existing stream
  if (videoElement.srcObject) {
    const tracks = videoElement.srcObject.getTracks();
    tracks.forEach(track => track.stop());
  }

  // Get user media with specified constraints
  const constraints = {
    video: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      width: { ideal: 640 },
      height: { ideal: 480 }
    },
    audio: false
  };

  return navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      videoElement.srcObject = stream;
      return stream;
    })
    .catch(error => {
      throw error;
    });
}

module.exports = {
  getCameraList,
  getSelectedCameraId,
  handleCameraList,
  setSelectedCamera,
  startCamera
};