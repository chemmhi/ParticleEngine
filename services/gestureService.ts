
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

export class GestureService {
  handLandmarker: HandLandmarker | null = null;
  lastVideoTime = -1;
  runningMode: "IMAGE" | "VIDEO" = "VIDEO";
  isInitializing = false;

  async initialize() {
    if (this.handLandmarker) return;
    if (this.isInitializing) return; // Prevent double init

    this.isInitializing = true;
    try {
        console.log("Initializing MediaPipe HandLandmarker...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        );
        
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: this.runningMode,
          numHands: 2, // ENABLED 2 HANDS FOR ZOOM
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        console.log("Gesture Service Initialized Successfully");
    } catch (error) {
        console.error("Gesture Service Initialization Failed:", error);
        throw error;
    } finally {
        this.isInitializing = false;
    }
  }

  detect(video: HTMLVideoElement) {
    if (!this.handLandmarker) return null;
    
    try {
        const nowInMs = performance.now();
        // Only detect if video frame has changed
        if (video.currentTime !== this.lastVideoTime) {
            this.lastVideoTime = video.currentTime;
            const result = this.handLandmarker.detectForVideo(video, nowInMs);
            return result;
        }
    } catch (e) {
        console.warn("Detection warning:", e);
    }
    return null;
  }
}

export const gestureService = new GestureService();
