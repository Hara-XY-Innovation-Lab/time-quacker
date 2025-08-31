// Gesture detection service

import { Hands } from '@mediapipe/hands';
import { FaceDetection } from '@mediapipe/face_detection';
import eventSystem from '../../shared/eventSystem.js';
import logger from '../../shared/logger.js';

class GestureService {
  constructor() {
    this.hands = null;
    this.faceDetector = null;
    this.thumbsUpStart = null;
    this.threeFingersStart = null;
    this.logger = new logger.Logger('GestureService');
  }

  // Initialize hand gesture detection
  initHandDetection() {
    try {
      this.hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      this.hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });

      this.hands.onResults((results) => this.handleHandResults(results));
    } catch (error) {
      this.logger.error('Failed to initialize hand detection', error);
      eventSystem.emit('handDetectionError', error);
    }
  }

  // Handle hand detection results
  handleHandResults(results) {
    try {
      const landmarks = results.multiHandLandmarks?.[0];
      if (!landmarks) {
        this.thumbsUpStart = null;
        this.threeFingersStart = null;
        return;
      }

      const count = this.countFingers(landmarks);
      if (count === 3) {
        if (!this.threeFingersStart) this.threeFingersStart = Date.now();
        else if (Date.now() - this.threeFingersStart >= 1200) {
          eventSystem.emit('threeFingersDetected');
          this.threeFingersStart = null;
        }
      } else {
        this.threeFingersStart = null;
      }

      if (this.isThumbsUp(landmarks)) {
        if (!this.thumbsUpStart) this.thumbsUpStart = Date.now();
        else if (Date.now() - this.thumbsUpStart >= 1500) {
          eventSystem.emit('thumbsUpDetected');
          this.thumbsUpStart = null;
        }
      } else {
        this.thumbsUpStart = null;
      }
    } catch (error) {
      this.logger.error('Error handling hand results', error);
      eventSystem.emit('handDetectionError', error);
    }
  }

  // Count visible fingers
  countFingers(landmarks) {
    try {
      const fingers = [[4, 2], [8, 6], [12, 10], [16, 14], [20, 18]];
      return fingers.reduce((acc, [tip, base]) => acc + (landmarks[tip].y < landmarks[base].y ? 1 : 0), 0);
    } catch (error) {
      this.logger.error('Error counting fingers', error);
      return 0;
    }
  }

  // Check if hand gesture is thumbs up
  isThumbsUp(landmarks) {
    try {
      const [tip, knuckle] = [landmarks[4], landmarks[2]];
      const dx = tip.x - knuckle.x, dy = tip.y - knuckle.y;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      return tip.y < knuckle.y && angle < -45 && angle > -135;
    } catch (error) {
      this.logger.error('Error detecting thumbs up', error);
      return false;
    }
  }

  // Initialize face detection
  initFaceDetection() {
    try {
      this.faceDetector = new FaceDetection({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
      });

      this.faceDetector.setOptions({
        model: 'short',
        minDetectionConfidence: 0.5
      });

      this.faceDetector.onResults((results) => this.handleFaceResults(results));
    } catch (error) {
      this.logger.error('Failed to initialize face detection', error);
      eventSystem.emit('faceDetectionError', error);
    }
  }

  // Handle face detection results
  handleFaceResults(results) {
    try {
      if (results.detections && results.detections.length > 0) {
        eventSystem.emit('faceDetected');
      } else {
        eventSystem.emit('faceNotDetected');
      }
    } catch (error) {
      this.logger.error('Error handling face results', error);
      eventSystem.emit('faceDetectionError', error);
    }
  }

  // Process a video frame for hand detection
  async processHandFrame(videoElement) {
    try {
      if (this.hands && videoElement) {
        // Add some debugging to see if we're getting frames
        if (!this.frameCount) this.frameCount = 0;
        this.frameCount++;
        
        if (this.frameCount % 30 === 0) { // Log every 30 frames
          this.logger.debug('Processing hand frame', { frameCount: this.frameCount });
        }
        
        await this.hands.send({ image: videoElement });
      }
    } catch (error) {
      // Don't log every frame error as it can be noisy
      // Only log if it's a significant error
      if (error.message && !error.message.includes('INVALID_STATE_ERR')) {
        this.logger.error('Error processing hand frame', error);
        eventSystem.emit('handDetectionError', error);
      }
    }
  }

  // Process a video frame for face detection
  async processFaceFrame(videoElement) {
    try {
      if (this.faceDetector && videoElement) {
        // Add some debugging to see if we're getting frames
        if (!this.faceFrameCount) this.faceFrameCount = 0;
        this.faceFrameCount++;
        
        if (this.faceFrameCount % 30 === 0) { // Log every 30 frames
          this.logger.debug('Processing face frame', { frameCount: this.faceFrameCount });
        }
        
        await this.faceDetector.send({ image: videoElement });
      }
    } catch (error) {
      // Don't log every frame error as it can be noisy
      // Only log if it's a significant error
      if (error.message && !error.message.includes('INVALID_STATE_ERR')) {
        this.logger.error('Error processing face frame', error);
        eventSystem.emit('faceDetectionError', error);
      }
    }
  }
}

// Create a singleton instance
const gestureService = new GestureService();

export default gestureService;