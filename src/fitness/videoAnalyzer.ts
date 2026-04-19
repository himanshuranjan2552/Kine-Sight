/**
 * Video Analyzer — Processes uploaded workout videos frame-by-frame
 * using MediaPipe PoseLandmarker in IMAGE mode.
 *
 * Uses a SEPARATE PoseLandmarker in IMAGE mode (not the shared VIDEO-mode
 * one used for live camera) because frame-by-frame seeking breaks temporal
 * smoothing. Each frame is treated independently.
 *
 * The video element is temporarily added to the DOM (off-screen) to ensure
 * the browser properly decodes video frames for pixel-level operations.
 */

import {
  PoseLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';
import {
  LM,
  bestSideAngle,
  areLandmarksVisibleLoose,
  calcAngle,
} from './poseEngine';
import type { ExerciseDef, ExercisePosition, FormQuality, PoseAnalysis } from './poseEngine';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FrameAnalysis {
  timestamp: number;
  position: ExercisePosition;
  form: FormQuality;
  formDetails: string[];
  angle: number;
  landmarks: NormalizedLandmark[];
  confident: boolean;
}

export interface RepSummary {
  repNumber: number;
  startTime: number;
  endTime: number;
  isCorrect: boolean;
  worstFormIssues: string[];
  avgAngle: number;
}

export interface VideoAnalysisReport {
  exerciseId: string;
  exerciseName: string;
  totalFrames: number;
  analyzedFrames: number;
  duration: number;
  fps: number;
  frames: FrameAnalysis[];
  reps: RepSummary[];
  totalReps: number;
  correctReps: number;
  incorrectReps: number;
  overallAccuracy: number;
  commonIssues: string[];
  videoDimensions: { width: number; height: number };
}

export interface AnalysisProgress {
  phase: 'loading' | 'analyzing' | 'building-report' | 'complete';
  progress: number;
  currentFrame: number;
  totalFrames: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ANALYSIS_FPS = 5;
const DEBOUNCE_FRAMES = 3;

// ---------------------------------------------------------------------------
// Separate IMAGE-mode PoseLandmarker for video analysis
// ---------------------------------------------------------------------------

let imageLandmarker: PoseLandmarker | null = null;
let imageLandmarkerPromise: Promise<PoseLandmarker> | null = null;

async function getImageLandmarker(): Promise<PoseLandmarker> {
  if (imageLandmarker) return imageLandmarker;
  if (imageLandmarkerPromise) return imageLandmarkerPromise;

  imageLandmarkerPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    // Try GPU first, fall back to CPU if it fails
    try {
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        numPoses: 1,
      });
      console.log('[VideoAnalyzer] PoseLandmarker created with GPU delegate');
      imageLandmarker = landmarker;
      return landmarker;
    } catch (gpuErr) {
      console.warn('[VideoAnalyzer] GPU delegate failed, falling back to CPU:', gpuErr);
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        numPoses: 1,
      });
      console.log('[VideoAnalyzer] PoseLandmarker created with CPU delegate');
      imageLandmarker = landmarker;
      return landmarker;
    }
  })();

  return imageLandmarkerPromise;
}

// ---------------------------------------------------------------------------
// Core analyzer
// ---------------------------------------------------------------------------

export async function analyzeVideo(
  videoFile: File,
  exercise: ExerciseDef,
  onProgress: (progress: AnalysisProgress) => void,
): Promise<VideoAnalysisReport> {
  // Phase 1: Load
  onProgress({
    phase: 'loading', progress: 0, currentFrame: 0, totalFrames: 0,
    message: 'Loading pose model (IMAGE mode)...',
  });

  const landmarker = await getImageLandmarker();

  onProgress({
    phase: 'loading', progress: 0.3, currentFrame: 0, totalFrames: 0,
    message: 'Loading video...',
  });

  // Create a video element and ADD IT TO THE DOM (off-screen).
  // This is critical: browsers may not properly decode frames for off-screen
  // video elements that aren't in the DOM, leading to blank/stale frames.
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';
  // Position off-screen but keep it rendered so the browser decodes frames
  video.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:640px;height:480px;opacity:0;pointer-events:none;';
  document.body.appendChild(video);

  const videoUrl = URL.createObjectURL(videoFile);

  try {
    // Load video metadata
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video. Unsupported format?'));
      video.src = videoUrl;
    });

    // Wait for enough data to decode frames
    await new Promise<void>((resolve) => {
      if (video.readyState >= 3) { // HAVE_FUTURE_DATA
        resolve();
        return;
      }
      video.oncanplay = () => resolve();
    });

    const duration = video.duration;
    const frameInterval = 1 / ANALYSIS_FPS;
    const totalFrames = Math.floor(duration * ANALYSIS_FPS);
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    console.log(`[VideoAnalyzer] Video: ${videoWidth}×${videoHeight}, ${duration.toFixed(1)}s, ${totalFrames} frames at ${ANALYSIS_FPS}FPS`);

    onProgress({
      phase: 'loading', progress: 1, currentFrame: 0, totalFrames,
      message: `Video loaded: ${duration.toFixed(1)}s, ${totalFrames} frames (${videoWidth}×${videoHeight})`,
    });

    // Phase 2: Analyze frame-by-frame
    // Draw each frame to a canvas so we have guaranteed pixel data
    const canvas = document.createElement('canvas');
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    const frames: FrameAnalysis[] = [];
    let detectedCount = 0;

    for (let i = 0; i < totalFrames; i++) {
      const seekTime = Math.min(i * frameInterval, duration - 0.01);

      // Seek and wait for frame to be fully ready
      await seekTo(video, seekTime);

      // Draw the current video frame to the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Run pose detection on the canvas
      let frameData: FrameAnalysis;

      try {
        // @ts-ignore - The `detect` method is missing from MediaPipe's TS definitions 
        // for PoseLandmarker in some versions, but it exists at runtime.
        const results = (landmarker as any).detect(canvas);

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          // Use video-specific analysis with relaxed thresholds
          const analysis = videoAnalyzeFrame(landmarks, exercise);
          detectedCount++;

          frameData = {
            timestamp: seekTime,
            position: analysis.position,
            form: analysis.form,
            formDetails: analysis.formDetails || [],
            angle: analysis.angle,
            landmarks: landmarks.map((lm: NormalizedLandmark) => ({ ...lm })),
            confident: analysis.confident,
          };
        } else {
          frameData = {
            timestamp: seekTime,
            position: 'middle',
            form: 'unknown',
            formDetails: [],
            angle: 0,
            landmarks: [],
            confident: false,
          };
        }
      } catch (detectErr) {
        console.warn(`[VideoAnalyzer] Detection error on frame ${i}:`, detectErr);
        frameData = {
          timestamp: seekTime,
          position: 'middle',
          form: 'unknown',
          formDetails: [],
          angle: 0,
          landmarks: [],
          confident: false,
        };
      }

      frames.push(frameData);

      onProgress({
        phase: 'analyzing',
        progress: (i + 1) / totalFrames,
        currentFrame: i + 1,
        totalFrames,
        message: `Analyzing frame ${i + 1} of ${totalFrames} (${detectedCount} poses found)...`,
      });
    }

    console.log(`[VideoAnalyzer] Detection complete: ${detectedCount}/${totalFrames} frames had poses`);

    // Phase 3: Build report
    onProgress({
      phase: 'building-report', progress: 0.5, currentFrame: totalFrames, totalFrames,
      message: 'Building report...',
    });

    const report = buildReport(frames, exercise, duration, ANALYSIS_FPS, { width: videoWidth, height: videoHeight });

    console.log(`[VideoAnalyzer] Report: ${report.totalReps} reps, ${report.correctReps} correct, accuracy ${report.overallAccuracy}%`);
    if (report.commonIssues.length > 0) {
      console.log(`[VideoAnalyzer] Common issues:`, report.commonIssues);
    }

    onProgress({
      phase: 'complete', progress: 1, currentFrame: totalFrames, totalFrames,
      message: 'Analysis complete!',
    });

    return report;
  } finally {
    // Cleanup: always remove the video from DOM and revoke URL
    URL.revokeObjectURL(videoUrl);
    document.body.removeChild(video);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Seek to a specific time and wait for the frame to be fully decoded.
 * Uses multiple signals to ensure readiness:
 * 1. The 'seeked' event fires
 * 2. readyState >= 2 (HAVE_CURRENT_DATA)
 * 3. A requestAnimationFrame pass (browser has rendered the frame)
 */
function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.01 && video.readyState >= 2) {
      // Already at this time with data available
      requestAnimationFrame(() => resolve());
      return;
    }

    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      // Wait one animation frame to ensure the browser has
      // fully decoded and rendered the frame
      requestAnimationFrame(() => {
        // Another rAF for extra safety — some browsers need two
        // passes to fully commit the frame to the compositor
        requestAnimationFrame(() => resolve());
      });
    };

    video.addEventListener('seeked', onSeeked);
    video.currentTime = time;
  });
}

/**
 * Build a VideoAnalysisReport from raw frame data.
 */
function buildReport(
  frames: FrameAnalysis[],
  exercise: ExerciseDef,
  duration: number,
  fps: number,
  videoDimensions: { width: number; height: number },
): VideoAnalysisReport {
  const reps: RepSummary[] = [];
  const confidentFrames = frames.filter(f => f.confident);

  let confirmedPosition: ExercisePosition = 'middle';
  let pendingPosition: ExercisePosition = 'middle';
  let pendingCount = 0;
  let phase: 'idle' | 'up' | 'down' = 'idle';
  let formDuringRep = true;
  let repStartTime = 0;
  let repAngles: number[] = [];
  let repIssues: string[] = [];

  for (const frame of confidentFrames) {
    if (frame.form === 'bad') {
      formDuringRep = false;
      repIssues.push(...frame.formDetails);
    }

    if (frame.position === pendingPosition) {
      pendingCount++;
    } else {
      pendingPosition = frame.position;
      pendingCount = 1;
    }

    if (pendingCount >= DEBOUNCE_FRAMES && pendingPosition !== confirmedPosition) {
      confirmedPosition = pendingPosition;

      if (confirmedPosition === 'down' && (phase === 'up' || phase === 'idle')) {
        phase = 'down';
        repStartTime = frame.timestamp;
        repAngles = [];
        repIssues = [];
        formDuringRep = true;
        if (frame.form === 'bad') {
          formDuringRep = false;
          repIssues.push(...frame.formDetails);
        }
      } else if (confirmedPosition === 'up') {
        if (phase === 'down') {
          const uniqueIssues = [...new Set(repIssues)];
          reps.push({
            repNumber: reps.length + 1,
            startTime: repStartTime,
            endTime: frame.timestamp,
            isCorrect: formDuringRep,
            worstFormIssues: uniqueIssues,
            avgAngle: repAngles.length > 0
              ? Math.round(repAngles.reduce((a, b) => a + b, 0) / repAngles.length)
              : 0,
          });
          phase = 'up';
          formDuringRep = true;
          repAngles = [];
          repIssues = [];
        } else if (phase === 'idle') {
          phase = 'up';
        }
      }
    }

    repAngles.push(frame.angle);
  }

  const correctReps = reps.filter(r => r.isCorrect).length;
  const incorrectReps = reps.length - correctReps;
  const overallAccuracy = reps.length > 0
    ? Math.round((correctReps / reps.length) * 100)
    : 0;

  const allIssues = reps.flatMap(r => r.worstFormIssues);
  const issueCounts = new Map<string, number>();
  for (const issue of allIssues) {
    issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1);
  }
  const commonIssues = [...issueCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([issue]) => issue);

  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    totalFrames: frames.length,
    analyzedFrames: confidentFrames.length,
    duration,
    fps,
    frames,
    reps,
    totalReps: reps.length,
    correctReps,
    incorrectReps,
    overallAccuracy,
    commonIssues,
    videoDimensions,
  };
}

// ---------------------------------------------------------------------------
// Video-specific exercise analysis
// ---------------------------------------------------------------------------

/**
 * Analyze a single frame for video analysis.
 *
 * This differs from the live-camera exercise.analyze() in several key ways:
 * 1. Uses `bestSideAngle` — picks the more visible side's angle instead of
 *    blindly averaging both sides (critical for side-angle camera views)
 * 2. Uses `areLandmarksVisibleLoose` — requires only 60% of landmarks at
 *    a lower visibility threshold (0.3 instead of 0.5)
 * 3. Relaxed form thresholds — accounts for camera angle distortion
 */
function videoAnalyzeFrame(
  lm: NormalizedLandmark[],
  exercise: ExerciseDef,
): PoseAnalysis {
  // Use video-specific analysis based on exercise type
  switch (exercise.id) {
    case 'squats':
      return analyzeSquatVideo(lm);
    case 'bicep-curls':
      return analyzeBicepCurlVideo(lm);
    case 'pushups':
      return analyzePushupVideo(lm);
    case 'lunges':
      return analyzeLungeVideo(lm);
    default:
      // Fallback: use the exercise's built-in analysis
      return exercise.analyze(lm);
  }
}

function analyzeSquatVideo(lm: NormalizedLandmark[]): PoseAnalysis {
  const confident = areLandmarksVisibleLoose(lm, [
    LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_KNEE, LM.RIGHT_KNEE,
    LM.LEFT_ANKLE, LM.RIGHT_ANKLE, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
  ]);

  const kneeAngle = bestSideAngle(lm,
    LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE,
    LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE,
  );
  const hipAngle = bestSideAngle(lm,
    LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_KNEE,
    LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE,
  );

  let position: ExercisePosition = 'middle';
  if (kneeAngle < 100) position = 'down';   // More lenient than live (80)
  else if (kneeAngle > 155) position = 'up'; // Slightly more lenient than live (160)

  // Relaxed form checks for video
  const torsoUpright = hipAngle > 40;  // Relaxed from 55 — accounts for natural squat lean & camera angle
  const formDetails: string[] = [];
  if (!torsoUpright) formDetails.push('Keep your back straight');

  const form: FormQuality = formDetails.length === 0 ? 'good' : 'bad';
  const feedback = position === 'down'
    ? (form === 'good' ? '⬇️ Great depth!' : `⚠️ ${formDetails[0]}`)
    : position === 'up' ? '⬆️ Stand tall!' : '🔄 Keep going...';

  return { position, form, formDetails, angle: Math.round(kneeAngle), landmarks: lm, feedback, confident };
}

function analyzeBicepCurlVideo(lm: NormalizedLandmark[]): PoseAnalysis {
  const confident = areLandmarksVisibleLoose(lm, [
    LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_ELBOW, LM.RIGHT_ELBOW,
    LM.LEFT_WRIST, LM.RIGHT_WRIST,
  ]);

  const elbowAngle = bestSideAngle(lm,
    LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST,
    LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST,
  );

  let position: ExercisePosition = 'middle';
  if (elbowAngle < 60) position = 'up';      // Relaxed from 50
  else if (elbowAngle > 145) position = 'down'; // Relaxed from 150

  const formDetails: string[] = [];
  const form: FormQuality = formDetails.length === 0 ? 'good' : 'bad';
  const feedback = position === 'up'
    ? (form === 'good' ? '💪 Great curl!' : `⚠️ ${formDetails[0]}`)
    : position === 'down' ? '⬇️ Ready stance' : '🔄 Control...';

  return { position, form, formDetails, angle: Math.round(elbowAngle), landmarks: lm, feedback, confident };
}

function analyzePushupVideo(lm: NormalizedLandmark[]): PoseAnalysis {
  const confident = areLandmarksVisibleLoose(lm, [
    LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_ELBOW, LM.RIGHT_ELBOW,
    LM.LEFT_WRIST, LM.RIGHT_WRIST, LM.LEFT_HIP, LM.RIGHT_HIP,
  ]);

  const elbowAngle = bestSideAngle(lm,
    LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST,
    LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST,
  );
  const bodyAngle = bestSideAngle(lm,
    LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_ANKLE,
    LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_ANKLE,
  );

  let position: ExercisePosition = 'middle';
  if (elbowAngle < 95) position = 'down';     // Relaxed from 85
  else if (elbowAngle > 150) position = 'up';  // Relaxed from 155

  const formDetails: string[] = [];
  if (bodyAngle < 140) formDetails.push('Keep your body in a straight line');

  const form: FormQuality = formDetails.length === 0 ? 'good' : 'bad';
  const feedback = position === 'down'
    ? (form === 'good' ? '⬇️ Great push-up!' : `⚠️ ${formDetails[0]}`)
    : position === 'up' ? '⬆️ Extend!' : '🔄 Push...';

  return { position, form, formDetails, angle: Math.round(elbowAngle), landmarks: lm, feedback, confident };
}

function analyzeLungeVideo(lm: NormalizedLandmark[]): PoseAnalysis {
  const confident = areLandmarksVisibleLoose(lm, [
    LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_KNEE, LM.RIGHT_KNEE,
    LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
  ]);

  const kneeAngle = bestSideAngle(lm,
    LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE,
    LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE,
  );

  let position: ExercisePosition = 'middle';
  if (kneeAngle < 100) position = 'down';    // Relaxed from 90
  else if (kneeAngle > 155) position = 'up'; // Relaxed from 160

  const formDetails: string[] = [];
  const form: FormQuality = formDetails.length === 0 ? 'good' : 'bad';
  const feedback = position === 'down'
    ? '⬇️ Good lunge depth!'
    : position === 'up' ? '⬆️ Stand up!' : '🔄 Step forward...';

  return { position, form, formDetails, angle: Math.round(kneeAngle), landmarks: lm, feedback, confident };
}
