import { PomodoroTimer } from './modules/pomodoro.js';
import { setupFaceDetection } from './modules/faceDetection.js';
import { setupHandGestures } from './modules/handGestures.js';
import { startCamera } from '../cameraManager.js';

const statusEl = document.getElementById('status');
const timeEl = document.getElementById('time');
const videoEl = document.getElementById('webcam');

const pomodoro = new PomodoroTimer(statusEl, timeEl);

window.electronAPI.onSelectCamera((deviceId) => {
  if (deviceId) startCamera(videoEl, deviceId);
});

window.electronAPI.onPauseDetection((paused) => {
  pomodoro.setPaused(paused);
});

document.addEventListener('DOMContentLoaded', async () => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cams = devices.filter(d => d.kind === 'videoinput');
  window.electronAPI.sendCameraList(cams.map(c => ({ deviceId: c.deviceId, label: c.label })));
  if (cams.length === 0) statusEl.textContent = "No camera found.";
});

setupFaceDetection(pomodoro, videoEl);
setupHandGestures(statusEl, timeEl);
