/**
 * Pose Engine — Custom MediaPipe Pose wrapper
 */

import {
  PoseLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

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

export type ExercisePosition = 'up' | 'down' | 'middle';
export type FormQuality = 'good' | 'bad' | 'unknown';

export interface PoseAnalysis {
  position: ExercisePosition;
  form: FormQuality;
  formDetails?: string[];
  angle: number;           
  landmarks: NormalizedLandmark[];
  feedback: string;
  confident: boolean;
}

export interface ExerciseDef {
  id: string;
  name: string;
  icon: string;
  tips: string[];
  isHold?: boolean;
  analyze: (lm: NormalizedLandmark[]) => PoseAnalysis;
  keyLandmarks: number[];
}

const MIN_VISIBILITY = 0.5;

export function areLandmarksVisible(lm: NormalizedLandmark[], indices: number[]): boolean {
  return indices.every(i => lm[i] && (lm[i].visibility ?? 0) >= MIN_VISIBILITY);
}

export function calcAngle(a: NormalizedLandmark, b: NormalizedLandmark, c: NormalizedLandmark): number {
  if (!a || !b || !c) return 0;
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * (180 / Math.PI));
  if (angle > 180) angle = 360 - angle;
  return angle;
}

function avgSideAngle(
  lm: NormalizedLandmark[],
  leftA: number, leftB: number, leftC: number,
  rightA: number, rightB: number, rightC: number,
): number {
  const leftAngle = calcAngle(lm[leftA], lm[leftB], lm[leftC]);
  const rightAngle = calcAngle(lm[rightA], lm[rightB], lm[rightC]);
  return (leftAngle + rightAngle) / 2;
}

function checkForm(...conditions: [boolean, string][]): { form: FormQuality, details: string[] } {
  const details = conditions.filter(c => !c[0]).map(c => c[1]);
  return { form: details.length === 0 ? 'good' : 'bad', details };
}

export const EXERCISES: ExerciseDef[] = [
  {
    id: 'squats',
    name: 'Squats',
    icon: '🏋️',
    tips: ['Keep back straight', 'Knees behind toes', 'Thighs parallel to ground'],
    keyLandmarks: [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_KNEE, LM.RIGHT_KNEE, LM.LEFT_ANKLE, LM.RIGHT_ANKLE],
    analyze(lm: NormalizedLandmark[]) {
      const confident = areLandmarksVisible(lm, [LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_KNEE, LM.RIGHT_KNEE, LM.LEFT_ANKLE, LM.RIGHT_ANKLE, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER]);
      const kneeAngle = avgSideAngle(lm, LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE, LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE);
      const hipAngle = avgSideAngle(lm, LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_KNEE, LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE);

      let position: ExercisePosition = 'middle';
      if (kneeAngle < 80) position = 'down';
      else if (kneeAngle > 160) position = 'up';

      // Advanced Form Checks
      const torsoUpright = hipAngle > 55;
      const hipsLowered = position === 'down' ? kneeAngle < 90 : true;

      const checks = checkForm(
        [torsoUpright, 'Keep your back straight'],
        [hipsLowered, 'Go deeper on the squat']
      );

      const feedback = position === 'down' ? (checks.form === 'good' ? '⬇️ Great depth!' : `⚠️ ${checks.details[0]}`) : position === 'up' ? '⬆️ Stand tall!' : '🔄 Keep going...';
      return { position, form: checks.form, formDetails: checks.details, angle: Math.round(kneeAngle), landmarks: lm, feedback, confident };
    },
  },
  {
    id: 'bicep-curls',
    name: 'Bicep Curls',
    icon: '💪',
    tips: ['Keep elbows close to body', 'Full range of motion', 'Control the movement'],
    keyLandmarks: [LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_ELBOW, LM.RIGHT_ELBOW, LM.LEFT_WRIST, LM.RIGHT_WRIST],
    analyze(lm: NormalizedLandmark[]) {
      const confident = areLandmarksVisible(lm, [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_ELBOW, LM.RIGHT_ELBOW, LM.LEFT_WRIST, LM.RIGHT_WRIST]);
      const elbowAngle = avgSideAngle(lm, LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST);
      const shoulderAngle = avgSideAngle(lm, LM.LEFT_HIP, LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.RIGHT_HIP, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW);
      
      let position: ExercisePosition = 'middle';
      if (elbowAngle < 50) position = 'up';
      else if (elbowAngle > 150) position = 'down';

      const elbowDrift = Math.abs((lm[LM.LEFT_ELBOW]?.x||0) - (lm[LM.LEFT_HIP]?.x||0));
      
      const checks = checkForm(
        [elbowDrift < 0.15, 'Tuck elbows closer to body'],
        [shoulderAngle < 35, 'Do not swing your upper arms']
      );

      const feedback = position === 'up' ? (checks.form === 'good' ? '💪 Great curl!' : `⚠️ ${checks.details[0]}`) : position === 'down' ? '⬇️ Fix ready stance' : '🔄 Control...';
      return { position, form: checks.form, formDetails: checks.details, angle: Math.round(elbowAngle), landmarks: lm, feedback, confident };
    },
  },
  {
    id: 'pushups',
    name: 'Push-ups',
    icon: '🫸',
    tips: ['Keep body straight', 'Chest near ground', 'Full arm extension'],
    keyLandmarks: [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_ELBOW, LM.RIGHT_ELBOW, LM.LEFT_WRIST, LM.RIGHT_WRIST, LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_ANKLE, LM.RIGHT_ANKLE],
    analyze(lm: NormalizedLandmark[]) {
      const confident = areLandmarksVisible(lm, [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_ELBOW, LM.RIGHT_ELBOW, LM.LEFT_WRIST, LM.RIGHT_WRIST, LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_ANKLE, LM.RIGHT_ANKLE]);
      const elbowAngle = avgSideAngle(lm, LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST);
      const bodyAngle = avgSideAngle(lm, LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_ANKLE, LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_ANKLE);
      
      let position: ExercisePosition = 'middle';
      if (elbowAngle < 85) position = 'down';
      else if (elbowAngle > 155) position = 'up';
      
      const headDropped = Math.abs((lm[LM.NOSE]?.y||0) - (lm[LM.LEFT_SHOULDER]?.y||0)) > 0.2;

      const checks = checkForm(
        [bodyAngle > 150, 'Keep your body in a straight line (hips dropping)'],
        [!headDropped, 'Do not drop your head, look slightly forward']
      );

      const feedback = position === 'down' ? (checks.form === 'good' ? '⬇️ Great push-up!' : `⚠️ ${checks.details[0]}`) : position === 'up' ? '⬆️ Extend!' : '🔄 Push...';
      return { position, form: checks.form, formDetails: checks.details, angle: Math.round(elbowAngle), landmarks: lm, feedback, confident };
    },
  },
  {
    id: 'lunges',
    name: 'Lunges',
    icon: '🦵',
    tips: ['Front knee at 90°', 'Back knee near floor', 'Keep torso upright'],
    keyLandmarks: [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_KNEE, LM.RIGHT_KNEE, LM.LEFT_ANKLE, LM.RIGHT_ANKLE],
    analyze(lm: NormalizedLandmark[]) {
      const confident = areLandmarksVisible(lm, [LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_KNEE, LM.RIGHT_KNEE, LM.LEFT_ANKLE, LM.RIGHT_ANKLE]);
      const leftKnee = calcAngle(lm[LM.LEFT_HIP], lm[LM.LEFT_KNEE], lm[LM.LEFT_ANKLE]);
      const rightKnee = calcAngle(lm[LM.RIGHT_HIP], lm[LM.RIGHT_KNEE], lm[LM.RIGHT_ANKLE]);
      const minKnee = Math.min(leftKnee, rightKnee);
      
      let position: ExercisePosition = 'middle';
      if (minKnee < 95) position = 'down';
      else if (minKnee > 160) position = 'up';
      
      const torsoLean = Math.abs((lm[LM.LEFT_SHOULDER]?.x||0) - (lm[LM.LEFT_HIP]?.x||0));
      
      const checks = checkForm(
        [torsoLean < 0.15, 'Keep torso upright and do not lean forward'],
        [minKnee < 110 || position !== 'down', 'Go deeper on your lunge']
      );

      const feedback = position === 'down' ? (checks.form === 'good' ? '⬇️ Deep lunge!' : `⚠️ ${checks.details[0]}`) : position === 'up' ? '⬆️ Stand!' : '🔄 Lunge...';
      return { position, form: checks.form, formDetails: checks.details, angle: Math.round(minKnee), landmarks: lm, feedback, confident };
    },
  },
  {
    id: 'shoulder-press',
    name: 'Shoulder Press',
    icon: '🙆',
    tips: ['Press directly overhead', 'Don\'t arch back', 'Full extension at top'],
    keyLandmarks: [LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_ELBOW, LM.RIGHT_ELBOW, LM.LEFT_WRIST, LM.RIGHT_WRIST],
    analyze(lm: NormalizedLandmark[]) {
      const confident = areLandmarksVisible(lm, [LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_ELBOW, LM.RIGHT_ELBOW, LM.LEFT_WRIST, LM.RIGHT_WRIST]);
      const elbowAngle = avgSideAngle(lm, LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST);
      const shoulderAngle = avgSideAngle(lm, LM.LEFT_HIP, LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.RIGHT_HIP, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW);
      
      let position: ExercisePosition = 'middle';
      // BUG FIX: Requires BOTH elbow extension AND shoulder raising
      if (elbowAngle > 155 && shoulderAngle > 140) position = 'up';
      else if (elbowAngle < 95) position = 'down';
      
      const wristOffset = Math.abs(((lm[LM.LEFT_WRIST]?.x||0) + (lm[LM.RIGHT_WRIST]?.x||0))/2 - ((lm[LM.LEFT_SHOULDER]?.x||0) + (lm[LM.RIGHT_SHOULDER]?.x||0))/2);
      
      const checks = checkForm(
        [wristOffset < 0.15, 'Press straight up without drifting your hands'],
        [true, 'Placeholder for future checks'] // Always passing placeholder
      );

      const feedback = position === 'up' ? (checks.form === 'good' ? '⬆️ Full extension!' : `⚠️ ${checks.details[0]}`) : position === 'down' ? '⬇️ Ready' : '🔄 Press...';
      return { position, form: checks.form, formDetails: checks.details, angle: Math.round(elbowAngle), landmarks: lm, feedback, confident };
    },
  },
  {
    id: 'plank',
    name: 'Plank',
    icon: '🧘',
    isHold: true,
    tips: ['Keep body in straight line', 'Engage core', 'Don\'t drop hips'],
    keyLandmarks: [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_ANKLE, LM.RIGHT_ANKLE],
    analyze(lm: NormalizedLandmark[]) {
      const confident = areLandmarksVisible(lm, [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_ANKLE, LM.RIGHT_ANKLE]);
      const bodyAngle = avgSideAngle(lm, LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_ANKLE, LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_ANKLE);
      
      const position: ExercisePosition = 'down';
      
      const hipsDropped = bodyAngle < 155;
      
      const checks = checkForm(
        [!hipsDropped, 'Do not drop your hips, straight line']
      );

      const feedback = checks.form === 'good' ? '🧘 Great!' : `⚠️ ${checks.details[0]}`;
      return { position, form: checks.form, formDetails: checks.details, angle: Math.round(bodyAngle), landmarks: lm, feedback, confident };
    },
  }
];

let landmarkerInstance: PoseLandmarker | null = null;
let initPromise: Promise<PoseLandmarker> | null = null;

export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (landmarkerInstance) return landmarkerInstance;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');
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

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  formColor: string = '#22C55E',
  activeIndices?: number[]
) {
  const POSE_CONNECTIONS = PoseLandmarker.POSE_CONNECTIONS;
  const connections = activeIndices 
    ? POSE_CONNECTIONS.filter((c: {start: number; end: number}) => activeIndices.includes(c.start) && activeIndices.includes(c.end))
    : POSE_CONNECTIONS;

  ctx.strokeStyle = formColor;
  ctx.lineWidth = 3;

  for (const conn of connections) {
    const p1 = landmarks[conn.start];
    const p2 = landmarks[conn.end];
    if (p1 && p2 && (p1.visibility ?? 1) > MIN_VISIBILITY && (p2.visibility ?? 1) > MIN_VISIBILITY) {
      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    }
  }

  const indicesToDraw = activeIndices || landmarks.map((_, i) => i);
  for (const i of indicesToDraw) {
    const lm = landmarks[i];
    if (lm && (lm.visibility ?? 1) > MIN_VISIBILITY) {
      const cx = lm.x * width;
      const cy = lm.y * height;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, 2 * Math.PI);
      ctx.fillStyle = formColor;
      ctx.fill();
    }
  }
}

export function drawAngleBadge(
  ctx: CanvasRenderingContext2D,
  angle: number,
  landmark: NormalizedLandmark,
  width: number,
  height: number,
) {
  if (!landmark || (landmark.visibility && landmark.visibility < MIN_VISIBILITY)) return;

  const x = landmark.x * width;
  const y = landmark.y * height;

  ctx.save();
  ctx.font = 'bold 14px "SF Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
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
