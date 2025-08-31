// Camera service for robust camera detection and management

console.log('CameraService module loading...');

class CameraService {
  constructor() {
    this.logger = {
      log: (...args) => console.log('[CameraService]', ...args),
      warn: (...args) => console.warn('[CameraService]', ...args),
      error: (...args) => console.error('[CameraService]', ...args)
    };
    this.cameras = [];
    this.selectedCameraId = null;
    console.log('CameraService instance created');
  }

  /**
   * Detect and enumerate all available cameras
   * @returns {Promise<Array>} List of available cameras
   */
  async detectCameras() {
    console.log('!!! detectCameras called !!!');
    this.logger.log('Detecting cameras...');
    
    // Check if media devices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      this.logger.error('MediaDevices API not available');
      throw new Error('Camera API not available');
    }

    try {
      // Log initial state
      this.logger.log('Initial navigator.mediaDevices state:', {
        enumerateDevices: typeof navigator.mediaDevices.enumerateDevices,
        getUserMedia: typeof navigator.mediaDevices.getUserMedia
      });
      
      // First, try to get permission by requesting media
      try {
        this.logger.log('Requesting camera permission...');
        const testStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        this.logger.log('Camera permission granted, stopping test stream...');
        testStream.getTracks().forEach(track => track.stop());
      } catch (permissionError) {
        this.logger.warn('Camera permission request failed:', permissionError.name, permissionError.message);
        // Continue anyway, as we might still be able to enumerate devices
      }
      
      // Add a delay to ensure the API is ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Enumerate devices
      this.logger.log('Enumerating devices...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.logger.log('All devices:', devices);
      this.logger.log('Number of devices found:', devices.length);
      
      const cams = devices.filter(d => d.kind === 'videoinput');
      this.logger.log('Video input devices found:', cams.length);
      
      // Log details of each camera
      cams.forEach((cam, index) => {
        this.logger.log(`Camera ${index}:`, {
          deviceId: cam.deviceId,
          label: cam.label,
          kind: cam.kind,
          groupId: cam.groupId
        });
      });
      
      console.log('!!! detectCameras returning:', cams);
      
      // If no cameras found, try again after a delay
      if (cams.length === 0) {
        this.logger.warn('No cameras found, retrying after delay...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const retryDevices = await navigator.mediaDevices.enumerateDevices();
        const retryCams = retryDevices.filter(d => d.kind === 'videoinput');
        this.logger.log('Retry - Video input devices found:', retryCams.length);
        
        // Log details of each camera on retry
        retryCams.forEach((cam, index) => {
          this.logger.log(`Retry Camera ${index}:`, {
            deviceId: cam.deviceId,
            label: cam.label,
            kind: cam.kind,
            groupId: cam.groupId
          });
        });
        
        // If still no cameras, try requesting permission again
        if (retryCams.length === 0) {
          this.logger.warn('Still no cameras found, trying permission request again...');
          try {
            const retryStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            this.logger.log('Camera permission granted on retry, stopping test stream...');
            retryStream.getTracks().forEach(track => track.stop());
            
            // Try enumerating again
            const finalDevices = await navigator.mediaDevices.enumerateDevices();
            const finalCams = finalDevices.filter(d => d.kind === 'videoinput');
            this.logger.log('Final attempt - Video input devices found:', finalCams.length);
            
            // Log details of each camera on final attempt
            finalCams.forEach((cam, index) => {
              this.logger.log(`Final Camera ${index}:`, {
                deviceId: cam.deviceId,
                label: cam.label,
                kind: cam.kind,
                groupId: cam.groupId
              });
            });
            
            console.log('!!! detectCameras returning final attempt:', finalCams);
            return finalCams;
          } catch (finalError) {
            this.logger.error('Final permission request failed:', finalError.name, finalError.message);
          }
        }
        
        console.log('!!! detectCameras returning retry:', retryCams);
        return retryCams;
      }
      
      console.log('!!! detectCameras returning initial:', cams);
      return cams;
    } catch (error) {
      this.logger.error('Error detecting cameras:', error);
      this.logger.error('Error name:', error.name);
      this.logger.error('Error message:', error.message);
      this.logger.error('Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Start camera with specified device ID
   * @param {HTMLVideoElement} videoElement - Video element to attach stream to
   * @param {string} deviceId - Device ID of camera to use
   * @returns {Promise<MediaStream>} Media stream
   */
  async startCamera(videoElement, deviceId) {
    this.logger.log('Starting camera with deviceId:', deviceId);
    
    // Check if MediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('MediaDevices API not available');
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

    this.logger.log('Attempting to start camera with constraints:', constraints);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.logger.log('Camera stream acquired successfully');
      videoElement.srcObject = stream;
      
      // Try to play the video element
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.logger.log('Video play started successfully');
          })
          .catch(error => {
            this.logger.warn('Video play failed:', error);
          });
      }
      
      return stream;
    } catch (error) {
      this.logger.error('Error starting camera:', error);
      
      // Provide more specific error messages
      if (error.name === 'NotAllowedError') {
        throw new Error('Camera access denied. Please allow camera access.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('Camera not found. The selected camera may be disconnected.');
      } else if (error.name === 'NotReadableError') {
        throw new Error('Camera is being used by another application.');
      } else if (error.name === 'OverconstrainedError') {
        throw new Error('Camera settings not supported.');
      } else {
        throw error;
      }
    }
  }

  /**
   * Select a camera by device ID
   * @param {string} deviceId - Device ID of camera to select
   */
  selectCamera(deviceId) {
    this.selectedCameraId = deviceId;
    this.logger.log('Selected camera ID set to:', deviceId);
  }
}

// Create a singleton instance
console.log('Creating CameraService singleton instance');
const cameraService = new CameraService();

export default cameraService;