/**
 * Video Analyzer — Processes uploaded workout videos frame-by-frame
 * using MediaPipe PoseLandmarker and the existing exercise definitions.
 */

import { getPoseLandmarker } from './poseEngine';
import type { ExerciseDef, ExercisePosition, FormQuality, PoseAnalysis } from './poseEngine';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FrameAnalysis {
  timestamp: number;          // seconds into the video
  position: ExercisePosition;
  form: FormQuality;
  formDetails: string[];
  angle: number;
  landmarks: NormalizedLandmark[];
  confident: boolean;
}

export interface RepSummary {
  repNumber: number;
  startTime: number;          // seconds
  endTime: number;            // seconds
  isCorrect: boolean;
  worstFormIssues: string[];
  avgAngle: number;
}

export interface VideoAnalysisReport {
  exerciseId: string;
  exerciseName: string;
  totalFrames: number;
  analyzedFrames: number;
  duration: number;           // total video duration in seconds
  fps: number;
  frames: FrameAnalysis[];
  reps: RepSummary[];
  totalReps: number;
  correctReps: number;
  incorrectReps: number;
  overallAccuracy: number;    // 0-100
  commonIssues: string[];     // top 3 recurring issues
}

export interface AnalysisProgress {
  phase: 'loading' | 'analyzing' | 'building-report' | 'complete';
  progress: number;           // 0–1
  currentFrame: number;
  totalFrames: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Frames per second to sample from the video */
const ANALYSIS_FPS = 5;

/** Consecutive frames to confirm a position change (same logic as live workout) */
const DEBOUNCE_FRAMES = 3;

// ---------------------------------------------------------------------------
// Core analyzer
// ---------------------------------------------------------------------------

/**
 * Analyze a video file frame-by-frame for a given exercise.
 * Returns a full structured report.
 */
export async function analyzeVideo(
  videoFile: File,
  exercise: ExerciseDef,
  onProgress: (progress: AnalysisProgress) => void,
): Promise<VideoAnalysisReport> {
  // Phase 1: Load
  onProgress({
    phase: 'loading',
    progress: 0,
    currentFrame: 0,
    totalFrames: 0,
    message: 'Loading pose model...',
  });

  const landmarker = await getPoseLandmarker();

  onProgress({
    phase: 'loading',
    progress: 0.3,
    currentFrame: 0,
    totalFrames: 0,
    message: 'Loading video...',
  });

  // Create an offscreen video element
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  const videoUrl = URL.createObjectURL(videoFile);

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load video. Unsupported format?'));
    video.src = videoUrl;
  });

  // Ensure video dimensions are available
  await new Promise<void>((resolve) => {
    if (video.videoWidth > 0) {
      resolve();
      return;
    }
    video.onloadeddata = () => resolve();
  });

  const duration = video.duration;
  const frameInterval = 1 / ANALYSIS_FPS;
  const totalFrames = Math.floor(duration * ANALYSIS_FPS);

  onProgress({
    phase: 'loading',
    progress: 1,
    currentFrame: 0,
    totalFrames,
    message: `Video loaded: ${duration.toFixed(1)}s, ${totalFrames} frames to analyze`,
  });

  // Phase 2: Analyze frame-by-frame
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d')!;

  const frames: FrameAnalysis[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const seekTime = i * frameInterval;

    // Seek to the target time
    await seekTo(video, seekTime);

    // Draw the current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Run pose detection
    // We use a unique timestamp for each frame to avoid caching issues
    const detectionTimestamp = performance.now();
    const results = landmarker.detectForVideo(video, detectionTimestamp);

    let frameData: FrameAnalysis;

    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      const analysis: PoseAnalysis = exercise.analyze(landmarks);

      frameData = {
        timestamp: seekTime,
        position: analysis.position,
        form: analysis.form,
        formDetails: analysis.formDetails || [],
        angle: analysis.angle,
        landmarks: landmarks.map(lm => ({ ...lm })),
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

    frames.push(frameData);

    onProgress({
      phase: 'analyzing',
      progress: (i + 1) / totalFrames,
      currentFrame: i + 1,
      totalFrames,
      message: `Analyzing frame ${i + 1} of ${totalFrames}...`,
    });
  }

  // Cleanup
  URL.revokeObjectURL(videoUrl);

  // Phase 3: Build report
  onProgress({
    phase: 'building-report',
    progress: 0.5,
    currentFrame: totalFrames,
    totalFrames,
    message: 'Building report...',
  });

  const report = buildReport(frames, exercise, duration, ANALYSIS_FPS);

  onProgress({
    phase: 'complete',
    progress: 1,
    currentFrame: totalFrames,
    totalFrames,
    message: 'Analysis complete!',
  });

  return report;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Seek a video element to a specific time and wait for it to be ready.
 */
function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.01) {
      resolve();
      return;
    }
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = time;
  });
}

/**
 * Build a VideoAnalysisReport from raw frame data.
 * Uses debounced position detection and rep counting (same logic as FitnessTab).
 */
function buildReport(
  frames: FrameAnalysis[],
  exercise: ExerciseDef,
  duration: number,
  fps: number,
): VideoAnalysisReport {
  const reps: RepSummary[] = [];
  const confidentFrames = frames.filter(f => f.confident);

  // --- Rep counting with debounce ---
  let confirmedPosition: ExercisePosition = 'middle';
  let pendingPosition: ExercisePosition = 'middle';
  let pendingCount = 0;
  let phase: 'idle' | 'up' | 'down' = 'idle';
  let formDuringRep = true;
  let repStartTime = 0;
  let repAngles: number[] = [];
  let repIssues: string[] = [];

  for (const frame of confidentFrames) {
    // Track form during current rep
    if (frame.form === 'bad') {
      formDuringRep = false;
      repIssues.push(...frame.formDetails);
    }

    // Debounce position detection
    if (frame.position === pendingPosition) {
      pendingCount++;
    } else {
      pendingPosition = frame.position;
      pendingCount = 1;
    }

    if (pendingCount >= DEBOUNCE_FRAMES && pendingPosition !== confirmedPosition) {
      confirmedPosition = pendingPosition;

      // State machine (same as FitnessTab)
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
          // Rep completed!
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

  // --- Aggregate stats ---
  const correctReps = reps.filter(r => r.isCorrect).length;
  const incorrectReps = reps.length - correctReps;
  const overallAccuracy = reps.length > 0
    ? Math.round((correctReps / reps.length) * 100)
    : 0;

  // --- Common issues ---
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
  };
}
