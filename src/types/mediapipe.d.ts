declare module '@mediapipe/tasks-vision' {
  export class PoseLandmarker {
    static createFromOptions(vision: FilesetResolver, options: any): Promise<PoseLandmarker>;
    static POSE_CONNECTIONS: any;
    detectForVideo(video: HTMLVideoElement, timestamp: number): { landmarks: NormalizedLandmark[][] };
  }
  
  export class FilesetResolver {
    static forVisionTasks(url: string): Promise<any>;
  }

  export class DrawingUtils {
    constructor(ctx: CanvasRenderingContext2D);
    drawConnectors(landmarks: NormalizedLandmark[], connections: any, options?: any): void;
    drawLandmarks(landmarks: NormalizedLandmark[], options?: any): void;
  }

  export interface NormalizedLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
  }
}
