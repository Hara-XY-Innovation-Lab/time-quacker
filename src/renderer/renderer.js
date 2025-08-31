const statusEl = document.getElementById('status');
const timeEl = document.getElementById('time');
const videoEl = document.getElementById('webcam');

// Pomodoro State
let faceDetected = false;
let faceAbsentSince = null;
const faceTimeout = 5000; // ms
let pomodoroTimer = null;
let timeLeft = 25 * 60;    // seconds
let isWorkSession = true;
let isRunning = false;

let detectionPaused = false;
let lastTrigger = 0;
let isSpeaking = false;
const synth = window.speechSynthesis;

let thumbsUpStartTime = null;
let threeFingersStart = null;
const threeFingersDebounce = 1200; // ms

const WEATHER_API_KEY = '743cda0db886183f205f62623cac8604';
const LOCATION_API_URL = 'https://ipapi.co/json/';

// Pomodoro Logic (unchanged)
function startPomodoro() {
  if (!isRunning) {
    isRunning = true;
    updatePomodoro();
    pomodoroTimer = setInterval(updatePomodoro, 1000);
    speak('Pomodoro started. Stay focused!');
  }
}
function pausePomodoro() {
  if (isRunning) {
    clearInterval(pomodoroTimer);
    isRunning = false;
    speak('Pomodoro paused.');
  }
}
function resumePomodoro() {
  if (!isRunning) {
    pomodoroTimer = setInterval(updatePomodoro, 1000);
    isRunning = true;
    speak('Resuming Pomodoro.');
  }
}
function updatePomodoro() {
  if (timeLeft > 0) {
    timeLeft--;
    updateTimerUI();
  } else {
    clearInterval(pomodoroTimer);
    isRunning = false;
    isWorkSession = !isWorkSession;
    timeLeft = isWorkSession ? 25 * 60 : 5 * 60;
    updateTimerUI();
    speak(isWorkSession ? 'Break over. Back to work!' : 'Pomodoro complete. Time for a break!');
    startPomodoro(); // auto-start next session
  }
}
function updateTimerUI() {
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  timeEl.textContent = `${mins}:${secs}`;
  timeEl.classList.remove('hidden');
}
function speak(text) {
  if (!isSpeaking) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.onstart = () => { isSpeaking = true; };
    utter.onend = () => { isSpeaking = false; };
    synth.speak(utter);
  }
}

//--- Camera and Device Management (simplified to match working version) ---
window.electronAPI.onSelectCamera((deviceId) => {
  if (deviceId) startCamera(deviceId);
});
window.electronAPI.onPauseDetection((paused) => {
  detectionPaused = paused;
  statusEl.textContent = paused ? 'Detection paused.' : 'Detection resumed.';
});

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOMContentLoaded event fired in simplified renderer');
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');
    console.log('Found cameras:', cameras);
    window.electronAPI.sendCameraList(
      cameras.map(c => ({ deviceId: c.deviceId, label: c.label }))
    );
    if (cameras.length === 0) statusEl.textContent = 'No camera found.';
  } catch (error) {
    console.error('Error enumerating devices:', error);
    statusEl.textContent = 'Error accessing cameras: ' + error.message;
  }
});

//--- MediaPipe Hands (for gestures, not pomodoro) ---
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});
hands.onResults(onHandResults);

//--- MediaPipe Face Detection (for pomodoro presence) ---
const faceDetection = new FaceDetection({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
});
faceDetection.setOptions({
  model: 'short',
  minDetectionConfidence: 0.5
});
faceDetection.onResults(onFaceResults);

//--- Camera pipeline: run face+hands per frame ---
let cameraStream = null;
let mediapipeCamera = null;
async function startCamera(deviceId) {
  if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
  if (mediapipeCamera) mediapipeCamera.stop();
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } }, audio: false
    });
    videoEl.srcObject = cameraStream;
    statusEl.textContent = 'Camera started.';
    mediapipeCamera = new Camera(videoEl, {
      onFrame: async () => {
        await faceDetection.send({ image: videoEl }); // For face presence
        await hands.send({ image: videoEl });         // For gestures only
      },
      width: 600,
      height: 450
    });
    mediapipeCamera.start();
  } catch (err) {
    statusEl.textContent = 'Camera error: ' + err.message;
    console.error(err);
  }
}

//--- Pomodoro presence logic: by face detection only! ---
function onFaceResults(results) {
  if (detectionPaused) return;
  if (results.detections && results.detections.length > 0) {
    if (!faceDetected) {
      faceDetected = true;
      faceAbsentSince = null;
      if (!isRunning) resumePomodoro(); // resume when you reappear!
      statusEl.textContent = "You are present (pomodoro running)";
    }
  } else {
    if (faceDetected && !faceAbsentSince) faceAbsentSince = Date.now();
    if (faceAbsentSince && Date.now() - faceAbsentSince > faceTimeout) {
      faceDetected = false;
      faceAbsentSince = null;
      pausePomodoro();
      statusEl.textContent = "Face not found. Pomodoro paused!";
    }
  }
}

//--- Gesture detection: does NOT start/stop Pomodoro, only for info/weather ---
function countExtendedFingers(landmarks) {
  const fingers = [[4, 2], [8, 6], [12, 10], [16, 14], [20, 18]];
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
function onHandResults(results) {
  if (detectionPaused) return;
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    const fingerCount = countExtendedFingers(landmarks);
    // Three-finger: weather and time
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
    // Thumbs up: current time
    if (isThumbsUp(landmarks)) {
      if (!thumbsUpStartTime) {
        thumbsUpStartTime = Date.now();
      } else if (Date.now() - thumbsUpStartTime >= 1500) {
        statusEl.textContent = 'Thumbs up 👍 detected!';
        updateTime();
        thumbsUpStartTime = null;
      } else {
        statusEl.textContent = 'Thumbs up detected, waiting...';
      }
    } else {
      thumbsUpStartTime = null;
    }
  } else {
    thumbsUpStartTime = null;
    threeFingersStart = null;
  }
}

// Weather/Time speech (unchanged)
async function getLocationByIP() {
  const res = await fetch(LOCATION_API_URL);
  if (!res.ok) throw new Error('IP location failed');
  return res.json();
}
async function fetchWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather fetch failed');
  return res.json();
}
async function showWeatherAndTime() {
  statusEl.textContent = 'Getting weather...';
  try {
    const location = await getLocationByIP();
    const { latitude, longitude, city } = location;
    const weather = await fetchWeather(latitude, longitude);
    const temp = Math.round(weather.main.temp);
    const desc = weather.weather[0].description;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const info = `📍 ${city}: ${temp}°C, ${desc}\n🕑 ${timeStr}\n📅 ${dateStr}`;
    statusEl.textContent = info;
    timeEl.textContent = info;
    timeEl.classList.remove('hidden');
    if (!isSpeaking) {
      const utter = new SpeechSynthesisUtterance(`In ${city}, it's ${temp} degrees and ${desc}. The time is ${timeStr}.`);
      utter.onstart = () => { isSpeaking = true; };
      utter.onend = () => { isSpeaking = false; };
      synth.speak(utter);
    }
    setTimeout(() => { timeEl.classList.add('hidden'); }, 7000);
  } catch (err) {
    statusEl.textContent = 'Weather failed: ' + err.message;
  }
}
function updateTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
  timeEl.textContent = timeStr;
  timeEl.classList.remove('hidden');
  let greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  setTimeout(() => { timeEl.classList.add('hidden'); }, 5000);
  if (!isSpeaking && Date.now() - lastTrigger > 5000) {
    const utter = new SpeechSynthesisUtterance(`${greeting}. The time is ${timeStr}`);
    utter.onstart = () => { isSpeaking = true; };
    utter.onend = () => {
      isSpeaking = false;
      lastTrigger = Date.now();
    };
    synth.speak(utter);
  }
}

//--- Expose for buttons ---
window.pomodoro = {
  start: startPomodoro,
  pause: pausePomodoro,
  resume: resumePomodoro,
  reset: () => {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
    isRunning = false;
    isWorkSession = true;
    timeLeft = 25 * 60;
    updateTimerUI();
    statusEl.textContent = "Pomodoro reset.";
  }
};