// Handles three-finger (weather) and thumbs-up (time) gestures

let statusEl, timeEl;
const WEATHER_API_KEY = '743cda0db886183f205f62623cac8604';
const LOCATION_API_URL = 'https://ipapi.co/json/';
const synth = window.speechSynthesis;
let isSpeaking = false;
let lastTrigger = 0;
let thumbsUpStartTime = null;
let threeFingersStart = null;
const threeFingersDebounce = 1200; // ms

// Attach UI refs
export function attachWeatherTimeUI({ status, time }) {
  statusEl = status;
  timeEl = time;
}

export function handleHandResults(results) {
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
        if (statusEl) statusEl.textContent = 'Three fingers detected. Hold...';
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
        if (statusEl) statusEl.textContent = 'Thumbs up 👍 detected!';
        updateTime();
        thumbsUpStartTime = null;
      } else {
        if (statusEl) statusEl.textContent = 'Thumbs up detected, waiting...';
      }
    } else {
      thumbsUpStartTime = null;
    }
  } else {
    thumbsUpStartTime = null;
    threeFingersStart = null;
  }
}

function countExtendedFingers(landmarks) {
  const fingers = [[4, 2], [8, 6], [12, 10], [16, 14], [20, 18]];
  return fingers.reduce((count, [tip, base]) =>
    landmarks[tip].y < landmarks[base].y ? count + 1 : count
  , 0);
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

// ---- WEATHER & TIME LOGIC ----

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
  if (statusEl) statusEl.textContent = 'Getting weather...';
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
    if (statusEl) statusEl.textContent = info;
    if (timeEl) {
      timeEl.textContent = info;
      timeEl.classList.remove('hidden');
      setTimeout(() => { timeEl.classList.add('hidden'); }, 7000);
    }
    if (!isSpeaking) {
      const utter = new window.SpeechSynthesisUtterance(`In ${city}, it's ${temp} degrees and ${desc}. The time is ${timeStr}.`);
      utter.onstart = () => { isSpeaking = true; };
      utter.onend = () => { isSpeaking = false; };
      synth.speak(utter);
    }
  } catch (err) {
    if (statusEl) statusEl.textContent = 'Weather failed: ' + err.message;
  }
}
function updateTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
  if (timeEl) {
    timeEl.textContent = timeStr;
    timeEl.classList.remove('hidden');
    setTimeout(() => { timeEl.classList.add('hidden'); }, 5000);
  }
  let greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  if (!isSpeaking && Date.now() - lastTrigger > 5000) {
    const utter = new window.SpeechSynthesisUtterance(`${greeting}. The time is ${timeStr}`);
    utter.onstart = () => { isSpeaking = true; };
    utter.onend = () => {
      isSpeaking = false;
      lastTrigger = Date.now();
    };
    synth.speak(utter);
  }
}
