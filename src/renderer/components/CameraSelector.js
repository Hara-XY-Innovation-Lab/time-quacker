// Reusable Camera Selector Component

export class CameraSelector {
  constructor(containerEl, options = {}) {
    this.containerEl = containerEl;
    this.cameras = options.cameras || [];
    this.selectedCameraId = options.selectedCameraId || null;
    this.onCameraChange = options.onCameraChange || (() => {});
    this.render();
  }

  render() {
    const cameraOptions = this.cameras.map(cam => 
      `<option value="${cam.deviceId}" ${cam.deviceId === this.selectedCameraId ? 'selected' : ''}>
        ${cam.label || `Camera (${cam.deviceId.slice(-4)})`}
      </option>`
    ).join('');

    this.containerEl.innerHTML = `
      <div class="camera-selector">
        <label for="camera-select">Select Camera:</label>
        <select id="camera-select">
          ${cameraOptions}
        </select>
      </div>
    `;
    
    this.selectEl = this.containerEl.querySelector('#camera-select');
    this.selectEl.addEventListener('change', (e) => {
      this.selectedCameraId = e.target.value;
      this.onCameraChange(this.selectedCameraId);
    });
  }

  updateCameras(cameras, selectedCameraId) {
    this.cameras = cameras;
    this.selectedCameraId = selectedCameraId;
    this.render();
  }

  getSelectedCameraId() {
    return this.selectedCameraId;
  }

  destroy() {
    if (this.selectEl) {
      this.selectEl.removeEventListener('change', this.onCameraChange);
    }
  }
}