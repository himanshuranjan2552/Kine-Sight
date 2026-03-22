/**
 * Pose Engine — MediaPipe Pose Landmarker wrapper
 *
 * Provides:
 * - PoseLandmarker initialisation and singleton access
 * - Joint angle calculation from 3 keypoints
 * - Exercise-specific position detection via angle thresholds
 * - Skeleton drawing helpers
 */

import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

// ---------------------------------------------------------------------------
// Landmark indices (MediaPipe Pose 33 keypoints)
// ---------------------------------------------------------------------------
export const LM = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ExercisePosition = 'up' | 'down' | 'middle';
export type FormQuality = 'good' | 'bad' | 'unknown';

export interface PoseAnalysis {
  position: ExercisePosition;
  form: FormQuality;
  angle: number;           // primary angle used for detection
  landmarks: NormalizedLandmark[];
  feedback: string;
}

export interface ExerciseDef {
  id: string;
  name: string;
  icon: string;
  tips: string[];
  /** Returns analysis for the given landmarks */
  analyze: (lm: NormalizedLandmark[]) => PoseAnalysis;
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------
/** Calculate angle (in degrees) at point B given 3 points A-B-C */
export function calcAngle(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  c: NormalizedLandmark,
): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * (180 / Math.PI));
  if (angle > 180) angle = 360 - angle;
  return angle;
}

/** Average of left and right side angles */
function avgSideAngle(
  lm: NormalizedLandmark[],
  leftA: number, leftB: number, leftC: number,
  rightA: number, rightB: number, rightC: number,
): number {
  const leftAngle = calcAngle(lm[leftA], lm[leftB], lm[leftC]);
  const rightAngle = calcAngle(lm[rightA], lm[rightB], lm[rightC]);
  return (leftAngle + rightAngle) / 2;
}

// ---------------------------------------------------------------------------
// Exercise definitions with angle-based analysis
// ---------------------------------------------------------------------------
export const EXERCISES: ExerciseDef[] = [
  {
    id: 'squats',
    name: 'Squats',
    icon: '🏋️',
    tips: ['Keep back straight', 'Knees behind toes', 'Thighs parallel to ground'],
    analyze(lm) {
      // Primary: knee angle (hip → knee → ankle)
      const kneeAngle = avgSideAngle(
        lm,
        LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE,
        LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE,
      );

      // Form: hip angle (shoulder → hip → knee) — check for leaning too far forward
      const hipAngle = avgSideAngle(
        lm,
        LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_KNEE,
        LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE,
      );

      let position: ExercisePosition = 'middle';
      if (kneeAngle < 100) position = 'down';
      else if (kneeAngle > 155) position = 'up';

      const form: FormQuality = hipAngle > 60 ? 'good' : 'bad';
      const feedback = position === 'down'
        ? (form === 'good' ? '⬇️ Great depth!' : '⚠️ Keep your back straight!')
        : position === 'up'
          ? '⬆️ Stand tall!'
          : '🔄 Keep going...';

      return { position, form, angle: Math.round(kneeAngle), landmarks: lm, feedback };
    },
  },
  {
    id: 'bicep-curls',
    name: 'Bicep Curls',
    icon: '💪',
    tips: ['Keep elbows close to body', 'Full range of motion', 'Control the movement'],
    analyze(lm) {
      // Primary: elbow angle (shoulder → elbow → wrist)
      const elbowAngle = avgSideAngle(
        lm,
        LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST,
        LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST,
      );

      let position: ExercisePosition = 'middle';
      if (elbowAngle < 60) position = 'up'; // curled
      else if (elbowAngle > 140) position = 'down'; // extended

      // Form: check if elbows stay near body (elbow x close to hip x)
      const elbowDrift = Math.abs(lm[LM.LEFT_ELBOW].x - lm[LM.LEFT_HIP].x);
      const form: FormQuality = elbowDrift < 0.15 ? 'good' : 'bad';
      const feedback = position === 'up'
        ? (form === 'good' ? '💪 Great curl!' : '⚠️ Keep elbows tucked in!')
        : position === 'down'
          ? '⬇️ Fully extend arms'
          : '🔄 Control the movement...';

      return { position, form, angle: Math.round(elbowAngle), landmarks: lm, feedback };
    },
  },
  {
    id: 'pushups',
    name: 'Push-ups',
    icon: '🫸',
    tips: ['Keep body straight', 'Chest near ground', 'Full arm extension'],
    analyze(lm) {
      // Primary: elbow angle
      const elbowAngle = avgSideAngle(
        lm,
        LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST,
        LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST,
      );

      let position: ExercisePosition = 'middle';
      if (elbowAngle < 90) position = 'down';
      else if (elbowAngle > 150) position = 'up';

      // Form: body alignment (shoulder → hip → ankle angle should be ~180)
      const bodyAngle = avgSideAngle(
        lm,
        LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_ANKLE,
        LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_ANKLE,
      );
      const form: FormQuality = bodyAngle > 150 ? 'good' : 'bad';
      const feedback = position === 'down'
        ? (form === 'good' ? '⬇️ Great push-up!' : '⚠️ Keep body straight!')
        : position === 'up'
          ? '⬆️ Arms extended!'
          : '🔄 Push through...';

      return { position, form, angle: Math.round(elbowAngle), landmarks: lm, feedback };
    },
  },
  {
    id: 'lunges',
    name: 'Lunges',
    icon: '🦵',
    tips: ['Front knee at 90°', 'Back knee near floor', 'Keep torso upright'],
    analyze(lm) {
      // Use the minimum knee angle (the front leg will have the smaller angle)
      const leftKnee = calcAngle(lm[LM.LEFT_HIP], lm[LM.LEFT_KNEE], lm[LM.LEFT_ANKLE]);
      const rightKnee = calcAngle(lm[LM.RIGHT_HIP], lm[LM.RIGHT_KNEE], lm[LM.RIGHT_ANKLE]);
      const minKnee = Math.min(leftKnee, rightKnee);

      let position: ExercisePosition = 'middle';
      if (minKnee < 100) position = 'down';
      else if (minKnee > 155) position = 'up';

      // Form: torso should be upright (shoulder-hip vertical alignment)
      const torsoLean = Math.abs(lm[LM.LEFT_SHOULDER].x - lm[LM.LEFT_HIP].x);
      const form: FormQuality = torsoLean < 0.1 ? 'good' : 'bad';
      const feedback = position === 'down'
        ? (form === 'good' ? '⬇️ Deep lunge!' : '⚠️ Keep torso upright!')
        : position === 'up'
          ? '⬆️ Stand tall!'
          : '🔄 Lunge deeper...';

      return { position, form, angle: Math.round(minKnee), landmarks: lm, feedback };
    },
  },
  {
    id: 'shoulder-press',
    name: 'Shoulder Press',
    icon: '🙆',
    tips: ['Press directly overhead', 'Don\'t arch back', 'Full extension at top'],
    analyze(lm) {
      // Primary: elbow angle
      const elbowAngle = avgSideAngle(
        lm,
        LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST,
        LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST,
      );

      let position: ExercisePosition = 'middle';
      if (elbowAngle > 155) position = 'up'; // overhead
      else if (elbowAngle < 100) position = 'down'; // at shoulders

      // Form: wrists should be roughly above shoulders (not too far out)
      const wristOffset = Math.abs(
        (lm[LM.LEFT_WRIST].x + lm[LM.RIGHT_WRIST].x) / 2 -
        (lm[LM.LEFT_SHOULDER].x + lm[LM.RIGHT_SHOULDER].x) / 2
      );
      const form: FormQuality = wristOffset < 0.12 ? 'good' : 'bad';
      const feedback = position === 'up'
        ? (form === 'good' ? '⬆️ Full extension!' : '⚠️ Press straight overhead!')
        : position === 'down'
          ? '⬇️ Ready position'
          : '🔄 Press up...';

      return { position, form, angle: Math.round(elbowAngle), landmarks: lm, feedback };
    },
  },
  {
    id: 'plank',
    name: 'Plank',
    icon: '🧘',
    tips: ['Keep body in straight line', 'Engage core', 'Don\'t drop hips'],
    analyze(lm) {
      // Body alignment: shoulder → hip → ankle angle
      const bodyAngle = avgSideAngle(
        lm,
        LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_ANKLE,
        LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_ANKLE,
      );

      const position: ExercisePosition = 'down'; // plank is always "hold"
      const form: FormQuality = bodyAngle > 155 ? 'good' : 'bad';
      const feedback = form === 'good'
        ? '🧘 Great plank! Body is straight!'
        : '⚠️ Keep hips up — straighten your body!';

      return { position, form, angle: Math.round(bodyAngle), landmarks: lm, feedback };
    },
  },
];

// ---------------------------------------------------------------------------
// Singleton PoseLandmarker
// ---------------------------------------------------------------------------
let landmarkerInstance: PoseLandmarker | null = null;
let initPromise: Promise<PoseLandmarker> | null = null;

export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (landmarkerInstance) return landmarkerInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
    );

    const landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });

    landmarkerInstance = landmarker;
    return landmarker;
  })();

  return initPromise;
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  formColor: string = '#22C55E',
) {
  const drawUtils = new DrawingUtils(ctx);

  // Draw connections (bones)
  drawUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
    color: formColor,
    lineWidth: 3,
  });

  // Draw landmarks (joints)
  drawUtils.drawLandmarks(landmarks, {
    color: '#FFFFFF',
    fillColor: formColor,
    lineWidth: 1,
    radius: 4,
  });
}

/** Draw the primary angle value near the relevant joint */
export function drawAngleBadge(
  ctx: CanvasRenderingContext2D,
  angle: number,
  landmark: NormalizedLandmark,
  width: number,
  height: number,
) {
  const x = landmark.x * width;
  const y = landmark.y * height;

  ctx.save();
  ctx.font = 'bold 14px "SF Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Background pill
  const text = `${angle}°`;
  const metrics = ctx.measureText(text);
  const pad = 6;
  const w = metrics.width + pad * 2;
  const h = 20;

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2 - 20, w, h, 8);
  ctx.fill();

  ctx.fillStyle = '#FF8A50';
  ctx.fillText(text, x, y - 20);
  ctx.restore();
}
