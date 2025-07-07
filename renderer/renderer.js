const statusEl = document.getElementById('status');
const timeEl = document.getElementById('time');
const videoEl = document.getElementById('webcam');

let lastTrigger = 0;
const debounceTime = 5000;
let isSpeaking = false;
const synth = window.speechSynthesis;
let thumbsUpStartTime = null;
let cameraStream = null;
let cameraList = [];
let detectionPaused = false;

// IPC: camera selection and detection pause
window.electronAPI.onSelectCamera((deviceId) => {
  if (deviceId) startCamera(deviceId);
});
window.electronAPI.onPauseDetection((paused) => {
  detectionPaused = paused;
  statusEl.textContent = paused ? 'Detection paused.' : 'Detection resumed.';
});

// Get cameras and send to main
async function sendCameraListToMain() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  cameraList = devices.filter(d => d.kind === 'videoinput');
  console.log('Found cameras:', cameraList);
  window.electronAPI.sendCameraList(cameraList.map(c => ({
    deviceId: c.deviceId,
    label: c.label
  })));
}

sendCameraListToMain();

// Start camera by deviceId
async function startCamera(deviceId) {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
  }
  try {
    console.log('Requesting camera with deviceId:', deviceId);
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } },
      audio: false
    });
    videoEl.srcObject = cameraStream;
    statusEl.textContent = 'Camera started.';
  } catch (err) {
    statusEl.textContent = 'Error accessing camera: ' + err.message;
    console.error('Camera error:', err);
  }
}


// --- Hand Gesture Detection ---
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});
hands.onResults(onResults);

function isThumbsUp(landmarks) {
  const thumbTip = landmarks[4];
  const thumbKnuckle = landmarks[2];
  const fingerTips = [8, 12, 16, 20];
  const fingerKnuckles = [6, 10, 14, 18];

  const thumbExtended = thumbTip.y < thumbKnuckle.y;
  let fingersCurled = true;
  for (let i = 0; i < fingerTips.length; i++) {
    if (landmarks[fingerTips[i]].y < landmarks[fingerKnuckles[i]].y) {
      fingersCurled = false;
      break;
    }
  }
  // Optional: Check thumb angle for robustness
  const dx = thumbTip.x - thumbKnuckle.x;
  const dy = thumbTip.y - thumbKnuckle.y;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const isMostlyUp = angle < -45 && angle > -135;

  return thumbExtended && fingersCurled && isMostlyUp;
}

function onResults(results) {
  if (detectionPaused) return;
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    if (isThumbsUp(landmarks)) {
      if (!thumbsUpStartTime) {
        thumbsUpStartTime = Date.now();
      } else {
        if (Date.now() - thumbsUpStartTime >= 2500) {
          statusEl.textContent = 'Thumbs up detected for 2.5 seconds!';
          updateTime();
          thumbsUpStartTime = null;
        } else {
          statusEl.textContent = 'Thumbs up detected, waiting...';
        }
      }
    } else {
      statusEl.textContent = 'Hand detected, but not thumbs up';
      thumbsUpStartTime = null;
    }
  } else {
    statusEl.textContent = 'No hand detected';
    thumbsUpStartTime = null;
  }
}

function updateTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
  timeEl.textContent = timeStr;
  timeEl.classList.remove('hidden');
  let greeting;
  const hour = now.getHours();
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';
  else greeting = 'Good evening';
  setTimeout(() => {
    timeEl.classList.add('hidden');
  }, 5000);
  if (!isSpeaking && Date.now() - lastTrigger > debounceTime) {
    const utterance = new SpeechSynthesisUtterance(`${greeting}. The time is ${timeStr}`);
    utterance.onstart = () => { isSpeaking = true; };
    utterance.onend = () => { isSpeaking = false; lastTrigger = Date.now(); };
    synth.speak(utterance);
  }
}

// Start MediaPipe camera loop
const camera = new Camera(videoEl, {
  onFrame: async () => { await hands.send({ image: videoEl }); },
  width: 600,
  height: 450
});
camera.start();
