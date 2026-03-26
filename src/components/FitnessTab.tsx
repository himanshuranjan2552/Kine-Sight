import { useState, useRef, useEffect, useCallback } from 'react';
import { EXERCISES, getPoseLandmarker, drawSkeleton, drawAngleBadge, LM } from '../fitness/poseEngine';
import type { ExerciseDef, PoseAnalysis, FormQuality, ExercisePosition } from '../fitness/poseEngine';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { ExerciseDemo } from './ExerciseDemo';

// ---------------------------------------------------------------------------
// Audio Feedback (Global context to bypass browser autoplay rules)
// ---------------------------------------------------------------------------
let audioCtx: AudioContext | null = null;

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx?.state === 'suspended') {
    audioCtx.resume();
  }
}

function playCorrectBeep() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    // Success "ding" sound (B5 followed by E6)
    osc.frequency.setValueAtTime(987.77, audioCtx.currentTime);
    osc.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.1);
    
    // Quick volume attack and smooth fade out
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (err) {
    console.warn('Audio beep failed', err);
  }
}


// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CANVAS_FPS = 60; // Target FPS for pose detection and canvas drawing
/** Number of consecutive frames required to confirm a position change */
const DEBOUNCE_FRAMES = 5;
/** Countdown duration in seconds before workout starts */
const COUNTDOWN_SECONDS = 5;

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

  // Countdown
  const [countdown, setCountdown] = useState<number | null>(null);

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

  // Plank-specific
  const [plankHoldTime, setPlankHoldTime] = useState(0);
  const [plankBestTime, setPlankBestTime] = useState(0);

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

  // Debounce refs — for stable position detection
  const pendingPositionRef = useRef<ExercisePosition>('middle');
  const pendingFrameCountRef = useRef<number>(0);
  const confirmedPositionRef = useRef<ExercisePosition>('middle');

  // Plank refs
  const plankHoldStartRef = useRef<number>(0);
  const plankBestRef = useRef<number>(0);

  // Countdown masking ref
  const isCountdownRef = useRef<boolean>(false);

  // Keep refs in sync
  phaseRef.current = phase;
  isWorkoutRef.current = isWorkout;
  exerciseRef.current = selectedExercise;

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
        const mirroredLandmarks = landmarks.map((lm: NormalizedLandmark) => ({
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

        // Skip rep logic if landmarks aren't confident
        if (!analysis.confident) {
          setFeedback('🔍 Move into the frame clearly...');
          rafRef.current = requestAnimationFrame(detect);
          return;
        }

        if (analysis.form === 'bad') {
          formDuringRepRef.current = false;
        }

        // Skip rep counting and time tracking if we are still counting down
        if (isCountdownRef.current) {
          rafRef.current = requestAnimationFrame(detect);
          return;
        }

        // ---- Plank: track hold time instead of reps ----
        if (exercise.isHold) {
          if (analysis.form === 'good') {
            if (plankHoldStartRef.current === 0) {
              plankHoldStartRef.current = Date.now();
            }
            const holdSec = Math.floor((Date.now() - plankHoldStartRef.current) / 1000);
            setPlankHoldTime(holdSec);
            if (holdSec > plankBestRef.current) {
              plankBestRef.current = holdSec;
              setPlankBestTime(holdSec);
            }
          } else {
            // Form broke, reset hold timer
            plankHoldStartRef.current = 0;
            setPlankHoldTime(0);
          }
          rafRef.current = requestAnimationFrame(detect);
          return;
        }

        // ---- Debounced position detection ----
        // Only transition when N consecutive frames confirm same position
        if (analysis.position === pendingPositionRef.current) {
          pendingFrameCountRef.current++;
        } else {
          pendingPositionRef.current = analysis.position;
          pendingFrameCountRef.current = 1;
        }

        // Only update confirmed position after debounce threshold
        if (
          pendingFrameCountRef.current >= DEBOUNCE_FRAMES &&
          pendingPositionRef.current !== confirmedPositionRef.current
        ) {
          const newPosition = pendingPositionRef.current;
          confirmedPositionRef.current = newPosition;

          // Rep counting state machine (using confirmed/debounced positions)
          const prevPhase = phaseRef.current;

          if (newPosition === 'down' && (prevPhase === 'up' || prevPhase === 'idle')) {
            setPhase('down');
            phaseRef.current = 'down';
          } else if (newPosition === 'up') {
            if (prevPhase === 'down') {
              // Rep completed! (down → up)
              setPhase('up');
              phaseRef.current = 'up';

              const isCorrect = formDuringRepRef.current;
              if (isCorrect) playCorrectBeep();

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
        // No pose detected
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
  // Countdown helper
  // ------------------------------------------------------------------
  const runCountdown = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      let count = COUNTDOWN_SECONDS;
      setCountdown(count);

      const interval = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdown(count);
        } else {
          setCountdown(0); // Show "GO!"
          clearInterval(interval);
          // Brief delay to show "GO!" then resolve
          setTimeout(() => {
            setCountdown(null);
            resolve();
          }, 600);
        }
      }, 1000);
    });
  }, []);

  // ------------------------------------------------------------------
  // Workout session management
  // ------------------------------------------------------------------
  const startWorkout = useCallback(async (exercise: ExerciseDef) => {
    // Initialize audio context during user gesture to allow playback
    initAudioContext();

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

    // Reset debounce state
    pendingPositionRef.current = 'middle';
    pendingFrameCountRef.current = 0;
    confirmedPositionRef.current = 'middle';

    // Reset plank state
    plankHoldStartRef.current = 0;
    setPlankHoldTime(0);

    setPhase('idle');
    phaseRef.current = 'idle';
    setFormQuality('unknown');
    setFeedback('🎯 Get ready! Pose detection active.');
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

    // Now start the actual workout detection (UI enabled, logic muted by isCountdownRef)
    setIsWorkout(true);
    isWorkoutRef.current = true;
    isCountdownRef.current = true;

    // Start detection loop immediately so user sees themself
    startDetectionLoop();

    // Run countdown
    await runCountdown();
    
    isCountdownRef.current = false;
    setFeedback('🎯 Get moving!');

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  }, [poseReady, startCamera, startDetectionLoop, runCountdown]);

  const stopWorkout = useCallback(() => {
    setIsWorkout(false);
    isWorkoutRef.current = false;
    setPhase('idle');
    phaseRef.current = 'idle';
    setCountdown(null);

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
    setPlankHoldTime(0);
  }, [stopWorkout, stopCamera]);

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  const totalReps = stats.correctReps + stats.incorrectReps;
  const accuracy = totalReps > 0 ? Math.round((stats.correctReps / totalReps) * 100) : 0;
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const isPlank = selectedExercise?.isHold === true;

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
          <h2>AI Fitness Coach</h2>
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

          {/* Countdown overlay */}
          {countdown !== null && (
            <div className="countdown-overlay">
              <div className="countdown-ring" key={countdown} />
              {countdown > 0 ? (
                <>
                  <div className="countdown-number" key={`num-${countdown}`}>{countdown}</div>
                  <div className="countdown-label">Get Ready</div>
                </>
              ) : (
                <div className="countdown-go">GO!</div>
              )}
            </div>
          )}

          {/* Persistent exercise demonstration side-overlay */}
          {isWorkout && (
            <div className="demo-overlay-wrapper">
              <ExerciseDemo exerciseId={selectedExercise.id} />
              <div className="demo-overlay-label">Form Demo</div>
            </div>
          )}

          {/* Form quality indicator */}
          {isWorkout && (
            <div className={`form-indicator ${formQuality}`}>
              {formQuality === 'good' ? '✓' : formQuality === 'bad' ? '✗' : '?'}
            </div>
          )}

          {/* Phase indicator */}
          {isWorkout && phase !== 'idle' && !isPlank && (
            <div className={`phase-indicator ${phase}`}>
              {phase === 'up' ? '⬆️ UP' : '⬇️ DOWN'}
            </div>
          )}
        </div>
      </div>

      {/* Rep Counter OR Plank Hold Timer */}
      {isPlank ? (
        <div className="plank-hold-section">
          <div className="plank-hold-time">{formatTime(plankHoldTime)}</div>
          <div className="plank-hold-label">Hold Time</div>
          {plankBestTime > 0 && (
            <div className="plank-hold-best">🏆 Best: {formatTime(plankBestTime)}</div>
          )}
        </div>
      ) : (
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
      )}

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
