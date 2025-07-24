import { FaceDetection } from '@mediapipe/face_detection';

export function setupFaceDetection(pomodoro, videoEl) {
  const detector = new FaceDetection({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
  });

  detector.setOptions({
    model: 'short',
    minDetectionConfidence: 0.5
  });

  detector.onResults(results => {
    if (results.detections && results.detections.length > 0)
      pomodoro.onFaceDetected();
    else
      pomodoro.onFaceNotDetected();
  });

  window.faceDetector = detector;
}
