import { FaceDetection } from '@mediapipe/face_detection';
import eventSystem from '../../../shared/eventSystem.js';

export function setupFaceDetection(videoEl) {
  const detector = new FaceDetection({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
  });

  detector.setOptions({
    model: 'short',
    minDetectionConfidence: 0.5
  });

  detector.onResults(results => {
    if (results.detections && results.detections.length > 0)
      eventSystem.emit('faceDetected');
    else
      eventSystem.emit('faceNotDetected');
  });

  window.faceDetector = detector;
}