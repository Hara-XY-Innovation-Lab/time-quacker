import { Hands } from '@mediapipe/hands';
import { updateTime } from './time.js';
import { showWeather } from './weather.js';

let thumbsUpStart = null;
let threeFingersStart = null;

export function setupHandGestures(statusEl, timeEl) {
  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  });

  hands.onResults(results => {
    const landmarks = results.multiHandLandmarks?.[0];
    if (!landmarks) {
      thumbsUpStart = null;
      threeFingersStart = null;
      return;
    }

    const count = countFingers(landmarks);
    if (count === 3) {
      if (!threeFingersStart) threeFingersStart = Date.now();
      else if (Date.now() - threeFingersStart >= 1200) {
        showWeather(statusEl, timeEl);
        threeFingersStart = null;
      }
    } else {
      threeFingersStart = null;
    }

    if (isThumbsUp(landmarks)) {
      if (!thumbsUpStart) thumbsUpStart = Date.now();
      else if (Date.now() - thumbsUpStart >= 1500) {
        updateTime(statusEl, timeEl);
        thumbsUpStart = null;
      }
    } else {
      thumbsUpStart = null;
    }
  });

  window.handDetector = hands;
}

function countFingers(landmarks) {
  const fingers = [[4, 2], [8, 6], [12, 10], [16, 14], [20, 18]];
  return fingers.reduce((acc, [tip, base]) => acc + (landmarks[tip].y < landmarks[base].y ? 1 : 0), 0);
}

function isThumbsUp(landmarks) {
  const [tip, knuckle] = [landmarks[4], landmarks[2]];
  const dx = tip.x - knuckle.x, dy = tip.y - knuckle.y;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return tip.y < knuckle.y && angle < -45 && angle > -135;
}
