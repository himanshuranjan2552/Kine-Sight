import { useState, useRef, useEffect, useCallback } from 'react';
import {
  EXERCISES,
  getPoseLandmarker,
  drawSkeleton,
  drawAngleBadge,
  LM,
} from '../fitness/poseEngine';
import type { ExerciseDef, PoseAnalysis, FormQuality } from '../fitness/poseEngine';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CANVAS_FPS = 30;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type RepPhase = 'idle' | 'up' | 'down';

interface SessionStats {
  correctReps: number;
  incorrectReps: number;
  startTime: number;
  formHistory: FormQuality[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function FitnessTab() {
  // Exercise selection
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDef | null>(null);

  // Camera
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pose engine
  const [poseReady, setPoseReady] = useState(false);
  const [poseLoading, setPoseLoading] = useState(false);

  // Session
  const [isWorkout, setIsWorkout] = useState(false);
  const [phase, setPhase] = useState<RepPhase>('idle');
  const [formQuality, setFormQuality] = useState<FormQuality>('unknown');
  const [feedback, setFeedback] = useState<string>('');
  const [currentAngle, setCurrentAngle] = useState<number>(0);
  const [stats, setStats] = useState<SessionStats>({
    correctReps: 0,
    incorrectReps: 0,
    startTime: 0,
    formHistory: [],
  });
  const [elapsed, setElapsed] = useState(0);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<RepPhase>('idle');
  const formDuringRepRef = useRef<boolean>(true);
  const isWorkoutRef = useRef(false);
  const statsRef = useRef<SessionStats>({ correctReps: 0, incorrectReps: 0, startTime: 0, formHistory: [] });
  const lastTimeRef = useRef<number>(0);
  const exerciseRef = useRef<ExerciseDef | null>(null);

  // Keep refs in sync
  phaseRef.current = phase;
  isWorkoutRef.current = isWorkout;
  exerciseRef.current = selectedExercise;

  // ------------------------------------------------------------------
  // Init MediaPipe Pose Landmarker
  // ------------------------------------------------------------------
  const initPose = useCallback(async () => {
    if (poseReady || poseLoading) return;
    setPoseLoading(true);
    setError(null);
    try {
      await getPoseLandmarker();
      setPoseReady(true);
    } catch (err) {
      setError(`Failed to load pose model: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPoseLoading(false);
    }
  }, [poseReady, poseLoading]);

  // ------------------------------------------------------------------
  // Camera — native getUserMedia
  // ------------------------------------------------------------------
  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setCameraActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowed') || msg.includes('Permission')) {
        setError('Camera permission denied. Please allow camera access.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setError('No camera found on this device.');
      } else {
        setError(`Camera error: ${msg}`);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      const stream = streamRef.current;
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ------------------------------------------------------------------
  // Pose detection loop (requestAnimationFrame)
  // ------------------------------------------------------------------
  const startDetectionLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const detect = async () => {
      if (!isWorkoutRef.current) return;

      const now = performance.now();
      // Throttle to ~CANVAS_FPS
      if (now - lastTimeRef.current < 1000 / CANVAS_FPS) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      lastTimeRef.current = now;

      const landmarker = await getPoseLandmarker();
      const exercise = exerciseRef.current;

      if (!exercise || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      // Resize canvas to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Run pose detection
      const results = landmarker.detectForVideo(video, now);

      // Clear and draw video frame (mirrored)
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];

        // Mirror landmarks for display
        const mirroredLandmarks = landmarks.map(lm => ({
          ...lm,
          x: 1 - lm.x,
        }));

        // Analyze exercise with ORIGINAL landmarks (not mirrored)
        const analysis: PoseAnalysis = exercise.analyze(landmarks);

        // Draw skeleton with mirrored landmarks
        const formColor = analysis.form === 'good' ? '#22C55E'
          : analysis.form === 'bad' ? '#EF4444' : '#F59E0B';
        drawSkeleton(ctx, mirroredLandmarks, canvas.width, canvas.height, formColor);

        // Draw angle badge on the relevant joint (mirrored)
        const angleLandmarkIndex = getAngleLandmarkIndex(exercise.id);
        if (angleLandmarkIndex >= 0) {
          drawAngleBadge(ctx, analysis.angle, mirroredLandmarks[angleLandmarkIndex], canvas.width, canvas.height);
        }

        // Update UI state
        setCurrentAngle(analysis.angle);
        setFormQuality(analysis.form);
        setFeedback(analysis.feedback);

        if (analysis.form === 'bad') {
          formDuringRepRef.current = false;
        }

        // Rep counting state machine
        if (exercise.id !== 'plank') {
          const prevPhase = phaseRef.current;

          if (analysis.position === 'down' && (prevPhase === 'up' || prevPhase === 'idle')) {
            setPhase('down');
            phaseRef.current = 'down';
          } else if (analysis.position === 'up') {
            if (prevPhase === 'down') {
              // Rep completed! (down → up)
              setPhase('up');
              phaseRef.current = 'up';

              const isCorrect = formDuringRepRef.current;
              const newStats: SessionStats = {
                ...statsRef.current,
                correctReps: statsRef.current.correctReps + (isCorrect ? 1 : 0),
                incorrectReps: statsRef.current.incorrectReps + (isCorrect ? 0 : 1),
                formHistory: [...statsRef.current.formHistory, isCorrect ? 'good' : 'bad'],
              };
              statsRef.current = newStats;
              setStats(newStats);

              const repNum = newStats.correctReps + newStats.incorrectReps;
              setFeedback(isCorrect
                ? `🎉 Rep ${repNum} — Perfect form!`
                : `⚠️ Rep ${repNum} — Work on form!`);

              formDuringRepRef.current = true;
            } else if (prevPhase === 'idle') {
              setPhase('up');
              phaseRef.current = 'up';
              setFeedback('🎯 Ready! Start your reps!');
            }
          }
        }
      } else {
        // No pose detected — just draw the video
        // (already drawn above)
        setFeedback('🔍 Step into frame so I can see you!');
      }

      rafRef.current = requestAnimationFrame(detect);
    };

    rafRef.current = requestAnimationFrame(detect);
  }, []);

  // ------------------------------------------------------------------
  // Get the landmark index where the angle badge should be drawn
  // ------------------------------------------------------------------
  function getAngleLandmarkIndex(exerciseId: string): number {
    switch (exerciseId) {
      case 'squats': return LM.LEFT_KNEE;
      case 'bicep-curls': return LM.LEFT_ELBOW;
      case 'pushups': return LM.LEFT_ELBOW;
      case 'lunges': return LM.LEFT_KNEE;
      case 'shoulder-press': return LM.LEFT_ELBOW;
      case 'plank': return LM.LEFT_HIP;
      default: return -1;
    }
  }

  // ------------------------------------------------------------------
  // Workout session management
  // ------------------------------------------------------------------
  const startWorkout = useCallback(async (exercise: ExerciseDef) => {
    setSelectedExercise(exercise);
    exerciseRef.current = exercise;

    // Init pose engine if needed
    if (!poseReady) {
      setPoseLoading(true);
      try {
        await getPoseLandmarker();
        setPoseReady(true);
      } catch (err) {
        setError(`Failed to load pose model: ${err instanceof Error ? err.message : String(err)}`);
        setPoseLoading(false);
        return;
      }
      setPoseLoading(false);
    }

    // Start camera if needed
    if (!streamRef.current) {
      await startCamera();
    }

    setIsWorkout(true);
    isWorkoutRef.current = true;
    setPhase('idle');
    phaseRef.current = 'idle';
    setFormQuality('unknown');
    setFeedback('🎯 Get into position! Pose detection starting...');
    formDuringRepRef.current = true;
    const freshStats: SessionStats = {
      correctReps: 0,
      incorrectReps: 0,
      startTime: Date.now(),
      formHistory: [],
    };
    setStats(freshStats);
    statsRef.current = freshStats;
    setElapsed(0);

    // Start detection loop
    startDetectionLoop();

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  }, [poseReady, startCamera, startDetectionLoop]);

  const stopWorkout = useCallback(() => {
    setIsWorkout(false);
    isWorkoutRef.current = false;
    setPhase('idle');
    phaseRef.current = 'idle';

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetSession = useCallback(() => {
    stopWorkout();
    stopCamera();
    setSelectedExercise(null);
    exerciseRef.current = null;
    setFormQuality('unknown');
    setFeedback('');
    setError(null);
    setCurrentAngle(0);
    const freshStats: SessionStats = { correctReps: 0, incorrectReps: 0, startTime: 0, formHistory: [] };
    setStats(freshStats);
    statsRef.current = freshStats;
    setElapsed(0);
  }, [stopWorkout, stopCamera]);

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  const totalReps = stats.correctReps + stats.incorrectReps;
  const accuracy = totalReps > 0 ? Math.round((stats.correctReps / totalReps) * 100) : 0;
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // ------------------------------------------------------------------
  // Render — Exercise Selection
  // ------------------------------------------------------------------
  if (!selectedExercise) {
    return (
      <div className="tab-panel fitness-panel">
        {/* Pose model loading banner */}
        {poseLoading && (
          <div className="model-banner">
            <span>Loading MediaPipe Pose model...</span>
          </div>
        )}

        <div className="fitness-hero">
          <div className="fitness-hero-icon">🏋️‍♂️</div>
          <h2>AI Fitness Trainer</h2>
          <p className="text-muted">Select an exercise to start your workout</p>
          <p className="text-muted" style={{ fontSize: '11px', opacity: 0.6 }}>
            Powered by MediaPipe Pose • Real-time skeleton tracking
          </p>
        </div>

        <div className="exercise-grid">
          {EXERCISES.map(ex => (
            <button
              key={ex.id}
              className="exercise-card"
              onClick={() => startWorkout(ex)}
              disabled={poseLoading}
            >
              <span className="exercise-icon">{ex.icon}</span>
              <span className="exercise-name">{ex.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render — Active Workout
  // ------------------------------------------------------------------
  return (
    <div className="tab-panel fitness-panel">
      {/* Pose model loading banner */}
      {poseLoading && (
        <div className="model-banner">
          <span>Loading MediaPipe Pose model...</span>
        </div>
      )}

      {/* Header */}
      <div className="fitness-workout-header">
        <div className="fitness-exercise-label">
          <span className="exercise-icon-sm">{selectedExercise.icon}</span>
          <span>{selectedExercise.name}</span>
        </div>
        <div className="fitness-header-right">
          <div className="fitness-angle-badge">{currentAngle}°</div>
          <div className="fitness-timer">{formatTime(elapsed)}</div>
        </div>
      </div>

      {/* Camera Feed + Skeleton Overlay */}
      <div className="fitness-camera-wrapper">
        <div className={`fitness-camera ${formQuality === 'good' ? 'form-good' : formQuality === 'bad' ? 'form-bad' : ''}`}>
          {/* Hidden video element — MediaPipe reads from this */}
          <video
            ref={videoRef}
            style={{ display: 'none' }}
            playsInline
            muted
          />

          {/* Canvas overlay — skeleton + video drawn here */}
          <canvas
            ref={canvasRef}
            className="skeleton-canvas"
          />

          {!cameraActive && !poseLoading && (
            <div className="empty-state">
              <h3>📷 Camera</h3>
              <p>Starting camera...</p>
            </div>
          )}

          {/* Form quality indicator */}
          {isWorkout && (
            <div className={`form-indicator ${formQuality}`}>
              {formQuality === 'good' ? '✓' : formQuality === 'bad' ? '✗' : '?'}
            </div>
          )}

          {/* Phase indicator */}
          {isWorkout && phase !== 'idle' && (
            <div className={`phase-indicator ${phase}`}>
              {phase === 'up' ? '⬆️ UP' : '⬇️ DOWN'}
            </div>
          )}
        </div>
      </div>

      {/* Rep Counter */}
      <div className="rep-counter-section">
        <div className="rep-counter-main">
          <div className="rep-count-display">
            <span className="rep-count-number">{totalReps}</span>
            <span className="rep-count-label">REPS</span>
          </div>
        </div>
        <div className="rep-counter-details">
          <div className="rep-detail correct">
            <span className="rep-detail-icon">✅</span>
            <span className="rep-detail-value">{stats.correctReps}</span>
            <span className="rep-detail-label">Correct</span>
          </div>
          <div className="rep-detail incorrect">
            <span className="rep-detail-icon">❌</span>
            <span className="rep-detail-value">{stats.incorrectReps}</span>
            <span className="rep-detail-label">Incorrect</span>
          </div>
          <div className="rep-detail accuracy">
            <span className="rep-detail-icon">🎯</span>
            <span className="rep-detail-value">{accuracy}%</span>
            <span className="rep-detail-label">Accuracy</span>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`fitness-feedback ${formQuality}`}>
          <p>{feedback}</p>
        </div>
      )}

      {/* Tips */}
      <div className="fitness-tips">
        <h4>💡 Tips for {selectedExercise.name}</h4>
        <ul>
          {selectedExercise.tips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </div>

      {/* Error */}
      {error && (
        <div className="fitness-error">
          <span className="error-text">Error: {error}</span>
        </div>
      )}

      {/* Controls */}
      <div className="fitness-controls">
        {isWorkout ? (
          <button className="btn btn-stop" onClick={stopWorkout}>
            ⏹ Stop Workout
          </button>
        ) : (
          <button className="btn btn-primary btn-lg" onClick={() => startWorkout(selectedExercise)}>
            ▶ Resume
          </button>
        )}
        <button className="btn" onClick={resetSession}>
          ↩ Change Exercise
        </button>
      </div>
    </div>
  );
}
