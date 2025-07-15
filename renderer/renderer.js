// renderer.js

const statusEl = document.getElementById('status');
const timeEl = document.getElementById('time');
const videoEl = document.getElementById('webcam');

let cameraStream = null;
let mediapipeCamera = null;
let detectionPaused = false;
let lastTrigger = 0;
const debounceTime = 5000;
let isSpeaking = false;
const synth = window.speechSynthesis;

// Gesture timers
let thumbsUpStartTime = null;
let threeFingersStart = null;
const threeFingersDebounce = 1200; // ms

const WEATHER_API_KEY = '743cda0db886183f205f62623cac8604'; // ⚠️ Replace in production
const LOCATION_API_URL = 'https://ipapi.co/json/';

window.electronAPI.onSelectCamera((deviceId) => {
  if (deviceId) startCamera(deviceId);
});

window.electronAPI.onPauseDetection((paused) => {
  detectionPaused = paused;
  statusEl.textContent = paused ? 'Detection paused.' : 'Detection resumed.';
});

document.addEventListener('DOMContentLoaded', async () => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = devices.filter(d => d.kind === 'videoinput');
  window.electronAPI.sendCameraList(
    cameras.map(c => ({ deviceId: c.deviceId, label: c.label }))
  );
  if (cameras.length === 0) statusEl.textContent = 'No camera found.';
});

async function startCamera(deviceId) {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  if (mediapipeCamera) {
    mediapipeCamera.stop();
    mediapipeCamera = null;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } }, audio: false
    });
    videoEl.srcObject = cameraStream;
    statusEl.textContent = 'Camera started.';

    mediapipeCamera = new Camera(videoEl, {
      onFrame: async () => { await hands.send({ image: videoEl }); },
      width: 600,
      height: 450
    });
    mediapipeCamera.start();
  } catch (err) {
    statusEl.textContent = 'Camera error: ' + err.message;
    console.error(err);
  }
}

// --- MediaPipe Hands Setup ---
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(onResults);

// --- Gesture Detection ---
function countExtendedFingers(landmarks) {
  const fingers = [
    [4, 2],   // Thumb
    [8, 6],   // Index
    [12, 10], // Middle
    [16, 14], // Ring
    [20, 18]  // Pinky
  ];
  return fingers.reduce((count, [tip, base]) => (
    landmarks[tip].y < landmarks[base].y ? count + 1 : count
  ), 0);
}

function isThumbsUp(landmarks) {
  const thumbTip = landmarks[4];
  const thumbKnuckle = landmarks[2];
  const fingerTips = [8, 12, 16, 20];
  const fingerKnuckles = [6, 10, 14, 18];

  const thumbExtended = thumbTip.y < thumbKnuckle.y;
  let fingersCurled = fingerTips.every((tip, i) =>
    landmarks[tip].y > landmarks[fingerKnuckles[i]].y
  );

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
    const fingerCount = countExtendedFingers(landmarks);

    if (fingerCount === 3) {
      if (!threeFingersStart) threeFingersStart = Date.now();
      if (Date.now() - threeFingersStart >= threeFingersDebounce) {
        showWeatherAndTime();
        threeFingersStart = null;
      } else {
        statusEl.textContent = 'Three fingers detected. Hold...';
      }
      thumbsUpStartTime = null;
      return;
    } else {
      threeFingersStart = null;
    }

    if (isThumbsUp(landmarks)) {
      if (!thumbsUpStartTime) {
        thumbsUpStartTime = Date.now();
      } else if (Date.now() - thumbsUpStartTime >= 1500) {
        statusEl.textContent = 'Thumbs up 👍 detected for 1.5 seconds!';
        updateTime();
        thumbsUpStartTime = null;
      } else {
        statusEl.textContent = 'Thumbs up detected, waiting...';
      }
    } else {
      statusEl.textContent = 'Hand detected 🙌, but not thumbs up';
      thumbsUpStartTime = null;
    }
  } else {
    statusEl.textContent = 'No hand 🖐️ detected';
    thumbsUpStartTime = null;
    threeFingersStart = null;
  }
}

// --- Weather Logic ---
async function getLocationByIP() {
  try {
    const res = await fetch(LOCATION_API_URL);
    if (!res.ok) throw new Error('Could not get location via IP');
    return res.json();
  } catch (err) {
    throw new Error('Location fetch failed: ' + err.message);
  }
}

async function fetchWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather fetch failed');
  return res.json();
}

async function showWeatherAndTime() {
  statusEl.textContent = 'Retrieving weather and time...';

  try {
    const location = await getLocationByIP();
    const { latitude, longitude, city } = location;

    const weatherData = await fetchWeather(latitude, longitude);
    const temp = Math.round(weatherData.main.temp);
    const desc = weatherData.weather[0].description;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const info = `📍 ${city}: ${temp}°C, ${desc}\n🕑 ${timeStr}\n📅 ${dateStr}`;
    statusEl.textContent = info;
    timeEl.textContent = info;
    timeEl.classList.remove('hidden');

    if (!isSpeaking) {
      const utterance = new SpeechSynthesisUtterance(`In ${city}, it's ${temp} degrees and ${desc}. The time is ${timeStr}.`);
      utterance.onstart = () => { isSpeaking = true; };
      utterance.onend = () => { isSpeaking = false; };
      synth.speak(utterance);
    }

    setTimeout(() => {
      timeEl.classList.add('hidden');
    }, 7000);
  } catch (err) {
    statusEl.textContent = 'Weather fetch failed: ' + err.message;
  }
}

// --- Time Update for Thumbs Up ---
function updateTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });

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
    utterance.onend = () => {
      isSpeaking = false;
      lastTrigger = Date.now();
    };
    synth.speak(utterance);
  }
}
