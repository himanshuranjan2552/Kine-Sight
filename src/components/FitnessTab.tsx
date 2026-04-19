import { useState, useRef, useEffect, useCallback } from "react";
import {
  EXERCISES,
  getPoseLandmarker,
  drawSkeleton,
  drawAngleBadge,
  LM,
} from "../fitness/poseEngine";
import type {
  ExerciseDef,
  PoseAnalysis,
  FormQuality,
  ExercisePosition,
} from "../fitness/poseEngine";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import DemoVideo from "./DemoVideo";
import { llmService } from "../llm/llmEngine";
import { storageService } from "../storage/storageService";
import { ttsService } from "../tts/ttsService";
import { useAuth } from "../firebase/AuthContext";
import { authService } from "../firebase/authService";
import dingSoundUrl from "../../sounds/freesound_community-ding-36029.mp3";
import incorrectSoundUrl from "../../sounds/freesound_community-training-program-incorrect2-88735.mp3";

// ---------------------------------------------------------------------------
// Audio Feedback (Global context to bypass browser autoplay rules)
// ---------------------------------------------------------------------------
let audioCtx: AudioContext | null = null;
let dingBuffer: AudioBuffer | null = null;
let incorrectBuffer: AudioBuffer | null = null;

async function loadSounds() {
  if (!audioCtx) return;
  try {
    const [dingRes, incRes] = await Promise.all([
      fetch(dingSoundUrl),
      fetch(incorrectSoundUrl),
    ]);
    const [dingArr, incArr] = await Promise.all([
      dingRes.arrayBuffer(),
      incRes.arrayBuffer(),
    ]);
    dingBuffer = await audioCtx.decodeAudioData(dingArr);
    incorrectBuffer = await audioCtx.decodeAudioData(incArr);
  } catch (error) {
    console.error("Failed to load sounds:", error);
  }
}

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      loadSounds();
    }
  }
  if (audioCtx?.state === "suspended") {
    audioCtx.resume();
  }
}

function playCorrectBeep() {
  if (!audioCtx || !dingBuffer) return;
  try {
    const source = audioCtx.createBufferSource();
    source.buffer = dingBuffer;
    source.connect(audioCtx.destination);
    source.start();
  } catch (err) {
    console.warn("Audio playback failed", err);
  }
}

function playIncorrectBeep() {
  if (!audioCtx || !incorrectBuffer) return;
  try {
    const source = audioCtx.createBufferSource();
    source.buffer = incorrectBuffer;
    source.connect(audioCtx.destination);
    source.start();
  } catch (err) {
    console.warn("Audio playback failed", err);
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CANVAS_FPS = 30;
/** Number of consecutive frames required to confirm a position change */
const DEBOUNCE_FRAMES = 5;
/** Countdown duration in seconds before workout starts */
const COUNTDOWN_SECONDS = 5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type RepPhase = "idle" | "up" | "down";

interface SessionStats {
  correctReps: number;
  incorrectReps: number;
  startTime: number;
  formHistory: FormQuality[];
}

// ---------------------------------------------------------------------------
// Constant Motivational Messages
// ---------------------------------------------------------------------------
const MOTIVATIONAL_MESSAGES = [
  "Great job, keep it up!",
  "Perfect form!",
  "You're doing amazing!",
  "Spot on!",
  "Excellent movement!",
  "Looking strong!",
  "Keep that pace!",
  "Flawless execution!"
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function FitnessTab({ onOpenReports, onOpenVideoAnalysis, theme, onToggleTheme }: { onOpenReports?: () => void; onOpenVideoAnalysis?: () => void; theme?: 'light' | 'dark'; onToggleTheme?: () => void }) {
  const { user, isGuest, setGuestMode } = useAuth();
  
  // Exercise selection
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDef | null>(
    null,
  );

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
  const [phase, setPhase] = useState<RepPhase>("idle");
  const [formQuality, setFormQuality] = useState<FormQuality>("unknown");
  const [feedback, setFeedback] = useState<string>("");
  const [currentAngle, setCurrentAngle] = useState<number>(0);
  const [stats, setStats] = useState<SessionStats>({
    correctReps: 0,
    incorrectReps: 0,
    startTime: 0,
    formHistory: [],
  });
  const [elapsed, setElapsed] = useState(0);

  // Coach AI
  const [coachText, setCoachText] = useState<string>("");
  const [llmStatus, setLlmStatus] = useState<string>("");
  const [llmProgress, setLlmProgress] = useState<number>(0);

  // Stats / Streak
  const [currentPerfectReps, setCurrentPerfectReps] = useState(0);
  const [ttsEnabled, setTtsEnabled] = useState(ttsService.isEnabled());
  const [showSkeleton, setShowSkeleton] = useState(true);

  // Plank-specific
  const [plankHoldTime, setPlankHoldTime] = useState(0);
  const [plankBestTime, setPlankBestTime] = useState(0);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<RepPhase>("idle");
  const formDuringRepRef = useRef<boolean>(true);
  const isWorkoutRef = useRef(false);
  const statsRef = useRef<SessionStats>({
    correctReps: 0,
    incorrectReps: 0,
    startTime: 0,
    formHistory: [],
  });
  const lastTimeRef = useRef<number>(0);
  const exerciseRef = useRef<ExerciseDef | null>(null);

  // Debounce refs — for stable position detection
  const pendingPositionRef = useRef<ExercisePosition>("middle");
  const pendingFrameCountRef = useRef<number>(0);
  const confirmedPositionRef = useRef<ExercisePosition>("middle");

  // Plank refs
  const plankHoldStartRef = useRef<number>(0);
  const plankBestRef = useRef<number>(0);

  // Countdown masking ref
  const isCountdownRef = useRef<boolean>(false);
  const showSkeletonRef = useRef<boolean>(true);

  // Keep refs in sync
  showSkeletonRef.current = showSkeleton;
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
      if (msg.includes("NotAllowed") || msg.includes("Permission")) {
        setError("Camera permission denied. Please allow camera access.");
      } else if (msg.includes("NotFound") || msg.includes("DevicesNotFound")) {
        setError("No camera found on this device.");
      } else {
        setError(`Camera error: ${msg}`);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
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
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ------------------------------------------------------------------
  // Pose detection loop (requestAnimationFrame)
  // ------------------------------------------------------------------
  const startDetectionLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set initial canvas dimensions
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = 640;
      canvas.height = 480;
    }

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

        // Draw skeleton with mirrored landmarks AND filter
        if (showSkeletonRef.current) {
          const formColor =
            analysis.form === "good"
              ? "#22C55E"
              : analysis.form === "bad"
                ? "#EF4444"
                : "#F59E0B";
          drawSkeleton(
            ctx,
            mirroredLandmarks,
            canvas.width,
            canvas.height,
            formColor,
            exercise.keyLandmarks,
          );

          // Draw angle badge on the relevant joint (mirrored)
          const angleLandmarkIndex = getAngleLandmarkIndex(exercise.id);
          if (angleLandmarkIndex >= 0) {
            drawAngleBadge(
              ctx,
              analysis.angle,
              mirroredLandmarks[angleLandmarkIndex],
              canvas.width,
              canvas.height,
            );
          }
        }

        // Update UI state
        setCurrentAngle(analysis.angle);
        setFormQuality(analysis.form);
        setFeedback(analysis.feedback);

        // Skip rep logic if landmarks aren't confident
        if (!analysis.confident) {
          setFeedback("🔍 Move into the frame clearly...");
          rafRef.current = requestAnimationFrame(detect);
          return;
        }

        if (analysis.form === "bad") {
          formDuringRepRef.current = false;
        }

        // Skip rep counting and time tracking if we are still counting down
        if (isCountdownRef.current) {
          rafRef.current = requestAnimationFrame(detect);
          return;
        }

        // ---- Plank: track hold time instead of reps ----
        if (exercise.isHold) {
          if (analysis.form === "good") {
            if (plankHoldStartRef.current === 0) {
              plankHoldStartRef.current = Date.now();
            }
            const holdSec = Math.floor(
              (Date.now() - plankHoldStartRef.current) / 1000,
            );
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

          if (
            newPosition === "down" &&
            (prevPhase === "up" || prevPhase === "idle")
          ) {
            setPhase("down");
            phaseRef.current = "down";
          } else if (newPosition === "up") {
            if (prevPhase === "down") {
              // Rep completed! (down → up)
              setPhase("up");
              phaseRef.current = "up";

              const isCorrect = formDuringRepRef.current;
              if (isCorrect) playCorrectBeep();
              else playIncorrectBeep();

              // Streak Logic
              let nextPerfectReps = currentPerfectReps;
              if (isCorrect) {
                 nextPerfectReps++;
                 if (nextPerfectReps >= 10) {
                    storageService.getUserProfile().then(profile => {
                      storageService.updateBestStreak(profile.bestPerfectRepStreak + 1);
                    });
                    nextPerfectReps = 0; // reset counter after claiming a streak point
                    ttsService.speak("Incredible! That is a 10-rep perfect streak.");
                 }
              } else {
                 nextPerfectReps = 0;
              }
              setCurrentPerfectReps(nextPerfectReps);

              const newStats: SessionStats = {
                ...statsRef.current,
                correctReps: statsRef.current.correctReps + (isCorrect ? 1 : 0),
                incorrectReps:
                  statsRef.current.incorrectReps + (isCorrect ? 0 : 1),
                formHistory: [
                  ...statsRef.current.formHistory,
                  isCorrect ? "good" : "bad",
                ],
              };
              statsRef.current = newStats;
              setStats(newStats);

              const repNum = newStats.correctReps + newStats.incorrectReps;
              setFeedback(
                isCorrect
                  ? `🎉 Rep ${repNum} — Perfect form!`
                  : `⚠️ Rep ${repNum} — Work on form!`
              );

              // Trigger AI Coach response
              if (llmService.isReady()) {
                const repNumber = newStats.correctReps + newStats.incorrectReps;
                const context = {
                  repNumber,
                  formDetails: analysis.formDetails || [],
                  formHistory: newStats.formHistory.slice(-3),
                };
                
                if (!isCorrect || (isCorrect && repNumber % 10 === 0)) {
                  const action = isCorrect
                    ? "User completed a perfect milestone."
                    : "User completed a rep with poor form.";
                  llmService.generateFeedback(
                    exercise.name,
                    action,
                    context,
                    (text) => {
                      setCoachText(text);
                    }
                  ).then(finalCoachText => {
                     if (finalCoachText) ttsService.speak(finalCoachText);
                  });
                } else {
                  const randomMsg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
                  setCoachText(randomMsg);
                  // TTS is intentionally omitted here so it only speaks on mistakes and milestones
                }
              }

              formDuringRepRef.current = true;
            } else if (prevPhase === "idle") {
              setPhase("up");
              phaseRef.current = "up";
              setFeedback("🎯 Ready! Start your reps!");
            }
          }
        }
      } else {
        // No pose detected
        setFeedback("🔍 Step into frame so I can see you!");
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
      case "squats":
        return LM.LEFT_KNEE;
      case "bicep-curls":
        return LM.LEFT_ELBOW;
      case "pushups":
        return LM.LEFT_ELBOW;
      case "lunges":
        return LM.LEFT_KNEE;
      case "shoulder-press":
        return LM.LEFT_ELBOW;
      case "plank":
        return LM.LEFT_HIP;
      default:
        return -1;
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
  const startWorkout = useCallback(
    async (exercise: ExerciseDef) => {
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
          setError(
            `Failed to load pose model: ${err instanceof Error ? err.message : String(err)}`,
          );
          setPoseLoading(false);
          return;
        }
        setPoseLoading(false);
      }

      // Init Coach LLM (non-blocking)
      if (!llmService.isReady()) {
        setLlmStatus("Initializing LLM Coach...");
        llmService
          .init((report) => {
            setLlmStatus(report.text);
            setLlmProgress(report.progress);
            if (report.progress >= 1) {
              setTimeout(() => setLlmStatus(""), 3000);
            }
          })
          .catch((err) => {
            console.error(err);
            setLlmStatus("Coach failed to load.");
          });
      }

      // Start camera if needed
      if (!streamRef.current) {
        await startCamera();
      }

      // Reset debounce state
      pendingPositionRef.current = "middle";
      pendingFrameCountRef.current = 0;
      confirmedPositionRef.current = "middle";

      // Reset plank state
      plankHoldStartRef.current = 0;
      setPlankHoldTime(0);

      setPhase("idle");
      phaseRef.current = "idle";
      setFormQuality("unknown");
      setFeedback("🎯 Get ready! Pose detection active.");
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
      setFeedback("🎯 Get moving!");

      // Start elapsed timer
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    },
    [poseReady, startCamera, startDetectionLoop, runCountdown],
  );

  const stopWorkout = useCallback(() => {
    if (isWorkoutRef.current && exerciseRef.current) {
        // Save workout stat on stop
        storageService.saveWorkoutRecord({
            exerciseId: exerciseRef.current.id,
            exerciseName: exerciseRef.current.name,
            date: Date.now(),
            durationSec: timerRef.current ? (Date.now() - statsRef.current.startTime)/1000 : 0,
            correctReps: statsRef.current.correctReps,
            incorrectReps: statsRef.current.incorrectReps,
            plankHoldTime: exerciseRef.current.isHold ? plankBestRef.current : 0
        });
    }

    setIsWorkout(false);
    isWorkoutRef.current = false;
    setPhase("idle");
    phaseRef.current = "idle";
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
    setFormQuality("unknown");
    setFeedback("");
    setError(null);
    setCurrentAngle(0);
    const freshStats: SessionStats = {
      correctReps: 0,
      incorrectReps: 0,
      startTime: 0,
      formHistory: [],
    };
    setStats(freshStats);
    statsRef.current = freshStats;
    setElapsed(0);
    setPlankHoldTime(0);
  }, [stopWorkout, stopCamera]);

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  const totalReps = stats.correctReps + stats.incorrectReps;
  const accuracy =
    totalReps > 0 ? Math.round((stats.correctReps / totalReps) * 100) : 0;
  const formatTime = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const isPlank = selectedExercise?.isHold === true;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  if (!selectedExercise) {
    return (
      <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-white pb-24 min-h-screen">
        {/* TopAppBar Shell */}
        <header className="fixed top-0 w-full z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm dark:shadow-none h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black italic tracking-tighter text-slate-900 dark:text-white">
              KINESIGHT
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onOpenReports} className="flex items-center gap-1 text-primary font-bold uppercase text-[12px] tracking-widest hover:text-primary-hover transition-colors">
              <span className="material-symbols-outlined text-lg" data-icon="bar_chart">bar_chart</span>
              Reports
            </button>
            <button onClick={() => { const next = !ttsEnabled; ttsService.setEnabled(next); setTtsEnabled(next); }} className="text-primary hover:text-primary-hover transition-colors" title={ttsEnabled ? 'Mute voice' : 'Enable voice'}>
              <span className="material-symbols-outlined text-2xl" data-icon={ttsEnabled ? "volume_up" : "volume_off"}>
                {ttsEnabled ? "volume_up" : "volume_off"}
              </span>
            </button>
            <button onClick={onToggleTheme} className="text-primary hover:text-primary-hover transition-colors" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
              <span className="material-symbols-outlined text-2xl" data-icon={theme === 'dark' ? 'light_mode' : 'dark_mode'}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            {user ? (
              <div className="flex items-center gap-2 border-l border-outline-variant/30 pl-3 ml-1">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm tracking-tighter">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <button onClick={() => authService.signOut()} className="text-secondary hover:text-error transition-colors transform hover:scale-110" title="Sign Out">
                  <span className="material-symbols-outlined text-2xl">logout</span>
                </button>
              </div>
            ) : isGuest && (
              <div className="flex items-center gap-2 border-l border-outline-variant/30 pl-3 ml-1">
                <button onClick={() => setGuestMode(false)} className="text-secondary hover:text-primary transition-colors flex bg-surface-container py-1 px-2 rounded-lg font-bold text-xs items-center gap-1 uppercase" title="Sign Up to save data">
                  <span className="material-symbols-outlined text-sm">login</span>
                  Create Account
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="pt-24 pb-24 px-4 md:px-8 max-w-5xl mx-auto">
          {/* AI Coach Hero Header */}
          <section className="mb-10">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="label-md text-secondary uppercase tracking-widest font-bold">
                Session Objective
              </span>
              <div className="h-px flex-grow bg-surface-container-high"></div>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-on-background leading-none mb-4">
              Let's calibrate your{" "}
              <span className="text-primary italic">next move.</span>
            </h1>
            <p className="text-secondary body-md max-w-lg mb-4">
              I'm your KineSight AI. Tell me your constraints, and I'll generate
              a precision-engineered routine for maximum athletic output.
            </p>
            {isGuest && (
              <div className="bg-primary-container/20 border border-primary/30 p-3 rounded-xl flex items-center gap-3 text-sm max-w-lg">
                <span className="material-symbols-outlined text-primary">cloud_off</span>
                <p className="text-on-surface"><strong>Guest Mode:</strong> Your routines are saved locally. <button className="text-primary font-bold hover:underline" onClick={() => setGuestMode(false)}>Create an account</button> to sync to the cloud.</p>
              </div>
            )}
          </section>

          {/* Generated Routine Section (Bento Style) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="headline-lg font-black tracking-tighter uppercase text-2xl">
                  Available Routines
                </h2>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-surface-container-high rounded-full text-[10px] font-black tracking-widest uppercase">
                    Select to Start
                  </span>
                </div>
              </div>

              {/* Pose model loading banner */}
              {poseLoading && (
                <div className="bg-surface-container-high p-4 rounded-xl text-center mb-4 text-primary font-bold animate-pulse">
                  Loading MediaPipe Pose model...
                </div>
              )}

              {EXERCISES.map((ex) => (
                <div
                  key={ex.id}
                  onClick={() => !poseLoading && startWorkout(ex)}
                  className={`group relative bg-surface-container-lowest rounded-xl overflow-hidden flex flex-col md:flex-row h-auto md:h-48 border border-transparent hover:border-primary/20 transition-all ${poseLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="w-full md:w-32 lg:w-48 h-48 bg-surface-container flex flex-col items-center justify-center text-4xl overflow-hidden relative shrink-0">
                    {ex.imagePath ? (
                      <>
                        <img src={ex.imagePath} alt={ex.name} className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-black/30 z-10 transition-colors duration-500 group-hover:bg-black/20"></div>
                      </>
                    ) : (
                      <>
                        <span className="z-20 text-6xl group-hover:scale-125 transition-transform duration-500">
                          {ex.icon}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-tr from-surface-container to-surface-container-high opacity-50 z-0"></div>
                      </>
                    )}
                  </div>
                  <div className="flex-grow p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-xl font-extrabold uppercase tracking-tight">
                          {ex.name}
                        </h4>
                        <span className="text-primary font-bold text-sm whitespace-nowrap ml-2">
                          Active AI
                        </span>
                      </div>
                      <p className="text-secondary text-sm my-2 line-clamp-2">
                        {ex.tips && ex.tips.length > 0
                          ? ex.tips[0]
                          : "Use AI to check your form in real-time."}
                      </p>
                    </div>
                    <div className="flex gap-4 mt-2">
                      <button className="bg-gradient-to-r from-primary to-primary-container text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-md group-hover:shadow-lg transition-all active:scale-95">
                        Start Workout
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Upload Video Card */}
            <div
              onClick={() => onOpenVideoAnalysis?.()}
              className="group relative bg-surface-container-lowest rounded-xl overflow-hidden flex flex-col md:flex-row h-auto md:h-48 border border-dashed border-primary/30 hover:border-primary/60 transition-all cursor-pointer"
            >
              <div className="w-full md:w-32 lg:w-48 h-48 bg-gradient-to-br from-primary/10 to-primary-container/10 flex flex-col items-center justify-center text-4xl overflow-hidden relative shrink-0">
                <span className="material-symbols-outlined text-primary text-5xl group-hover:scale-110 transition-transform duration-500 z-20">
                  upload_file
                </span>
              </div>
              <div className="flex-grow p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-xl font-extrabold uppercase tracking-tight">
                      Upload Video
                    </h4>
                    <span className="text-primary font-bold text-sm whitespace-nowrap ml-2">
                      AI Analysis
                    </span>
                  </div>
                  <p className="text-secondary text-sm my-2 line-clamp-2">
                    Upload a recorded workout video and get a detailed posture analysis, rep count, and form feedback.
                  </p>
                </div>
                <div className="flex gap-4 mt-2">
                  <button className="bg-gradient-to-r from-primary to-primary-container text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-md group-hover:shadow-lg transition-all active:scale-95">
                    Analyze Video
                  </button>
                </div>
              </div>
            </div>
            </div>

            {/* Sidebar: Performance Insights */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-inverse-surface text-inverse-on-surface p-6 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="material-symbols-outlined text-primary text-xl"
                    data-icon="auto_awesome"
                  >
                    auto_awesome
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    KineSight Coach Insight
                  </span>
                </div>
                <p className="text-lg font-medium leading-relaxed italic z-10 relative">
                  "Your form is the bridge between power and stability. The AI
                  will guide you to perfection."
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render — Active Workout
  // ------------------------------------------------------------------
  return (
    <div className="bg-surface text-on-surface font-body min-h-screen flex flex-col h-[100dvh]">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between px-6 h-16 w-full">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black italic tracking-tighter text-slate-900 dark:text-white">
              KINESIGHT
            </span>
          </div>
          {llmStatus && (
            <div className="text-xs font-bold text-primary flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full">
              <span
                className="material-symbols-outlined text-[14px] animate-spin"
                data-icon="sync"
              >
                sync
              </span>
              {llmStatus} ({Math.round(llmProgress * 100)}%)
            </div>
          )}
          <div className="flex items-center gap-3">
            <button onClick={() => { const next = !ttsEnabled; ttsService.setEnabled(next); setTtsEnabled(next); }} className="text-primary hover:text-primary-hover transition-colors" title={ttsEnabled ? 'Mute voice' : 'Enable voice'}>
              <span className="material-symbols-outlined text-2xl" data-icon={ttsEnabled ? "volume_up" : "volume_off"}>
                {ttsEnabled ? "volume_up" : "volume_off"}
              </span>
            </button>
            <button onClick={onToggleTheme} className="text-primary hover:text-primary-hover transition-colors" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
              <span className="material-symbols-outlined text-2xl" data-icon={theme === 'dark' ? 'light_mode' : 'dark_mode'}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <span className="font-bold text-sm uppercase tracking-widest">
              {selectedExercise.name}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow flex flex-col md:flex-row pt-16 h-full overflow-hidden">
        {/* Camera Viewport & AI Overlay */}
        <section className="relative flex-grow basis-full md:basis-[65%] shrink-0 bg-inverse-surface border-b md:border-b-0 md:border-r border-outline-variant/20 overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 z-0">
            {/* Hidden video element — MediaPipe reads from this */}
            <video
              ref={videoRef}
              style={{ display: "none" }}
              playsInline
              muted
            />
            {/* Canvas overlay — skeleton + video drawn here */}
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
              style={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          </div>

          {!cameraActive && !poseLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white bg-black/50">
              <span className="material-symbols-outlined text-6xl mb-4">
                videocam
              </span>
              <h3 className="text-xl font-bold">Starting camera...</h3>
            </div>
          )}

          {/* Countdown overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="text-9xl font-black text-white italic drop-shadow-2xl animate-pulse">
                {countdown > 0 ? countdown : "GO!"}
              </div>
              {countdown > 0 && (
                <div className="text-xl text-white/80 font-bold uppercase tracking-widest mt-4">
                  Get Ready
                </div>
              )}
            </div>
          )}

          {/* Dynamic Feedback Banner */}
          {feedback && !isCountdownRef.current && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-md">
              <div
                className={`backdrop-blur-md px-6 py-4 rounded-xl flex items-center justify-between shadow-2xl transition-colors ${formQuality === "bad" ? "bg-error/90" : formQuality === "good" ? "bg-green-600/90" : "bg-orange-500/90"}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-white"
                    data-icon={formQuality === "bad" ? "warning" : "info"}
                  >
                    {formQuality === "bad"
                      ? "warning"
                      : formQuality === "good"
                        ? "check_circle"
                        : "info"}
                  </span>
                  <p className="font-headline font-bold text-white tracking-tight text-lg uppercase h-6 overflow-hidden text-ellipsis whitespace-nowrap">
                    {feedback}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Corner Context Tags */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-20">
            <button
              onClick={() => {
                const next = !showSkeleton;
                setShowSkeleton(next);
                showSkeletonRef.current = next;
              }}
              className="flex items-center justify-center gap-2 border border-white/10 rounded-lg px-3 py-2 bg-black/40 backdrop-blur-md hover:bg-black/60 transition-colors text-white"
              title={showSkeleton ? "Hide Skeleton" : "Show Skeleton"}
            >
              <span className="material-symbols-outlined text-lg" data-icon={showSkeleton ? "visibility" : "visibility_off"}>
                {showSkeleton ? "visibility" : "visibility_off"}
              </span>
            </button>
            <div className="flex flex-col gap-2 border border-white/10 rounded-lg p-2 bg-black/40 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-white/70 uppercase font-bold tracking-widest">
                  Angle
                </p>
                <p className="text-white font-black italic text-lg">
                  {currentAngle}°
                </p>
              </div>
            </div>
          </div>

          {/* Form Demo Side Overlay */}
          <div className="absolute bottom-6 left-6 z-20 w-32 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
            <DemoVideo exerciseId={selectedExercise.id} />
            <div className="bg-black/60 text-center py-1 text-[10px] font-bold text-white uppercase tracking-widest">
              Target Form
            </div>
          </div>
        </section>

        {/* Right Panel: Coach & Metrics */}
        <section className="bg-surface px-6 py-6 md:py-8 flex flex-col basis-auto md:basis-[35%] shrink z-30 overflow-y-auto w-full gap-4 relative">
          
          {/* Coach LLM Feedback (Desktop Panel / Mobile inline) */}
          {coachText && !isCountdownRef.current && (
            <div className="w-full transition-all duration-300">
              <div className="bg-surface-container-highest/90 border border-primary/30 p-4 rounded-2xl shadow-sm flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-primary text-xl"
                    data-icon="smart_toy"
                  >
                    smart_toy
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    AI Coach Feed
                  </span>
                </div>
                <p className="text-on-surface font-medium leading-tight">
                  {coachText}
                </p>
              </div>
            </div>
          )}

          {/* Metrics Section */}
          <div className="grid grid-cols-2 gap-4 w-full">
            {/* Time Elapsed */}
            <div className="col-span-1 bg-surface-container-lowest p-4 rounded-xl flex flex-col justify-between shadow-sm">
              <label className="text-[0.75rem] font-bold uppercase tracking-widest text-secondary mb-2">
                Duration
            </label>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl lg:text-4xl font-black italic tracking-tighter">
                {formatTime(elapsed)}
              </span>
            </div>
          </div>

          {/* Main Metric: Reps or Plank Time */}
          <div className="col-span-1 bg-surface-container-lowest p-4 rounded-xl border-l-4 border-primary flex flex-col justify-between relative overflow-hidden shadow-sm">
            {isPlank ? (
              <>
                <label className="text-[0.75rem] font-bold uppercase tracking-widest text-secondary mb-2">
                  Hold Time
                </label>
                <div className="relative z-10">
                  <span className="text-5xl lg:text-6xl font-black italic tracking-tighter leading-none">
                    {formatTime(plankHoldTime)}
                  </span>
                </div>
                {plankBestTime > 0 && (
                  <span className="text-[0.65rem] font-bold uppercase text-primary block mt-1 absolute bottom-4 left-4 z-10">
                    🏆 Best: {formatTime(plankBestTime)}
                  </span>
                )}
                <div className="absolute -right-4 -bottom-4 text-primary/5 select-none pointer-events-none">
                  <span
                    className="material-symbols-outlined text-7xl"
                    data-icon="timer"
                  >
                    timer
                  </span>
                </div>
              </>
            ) : (
              <>
                <label className="text-[0.75rem] font-bold uppercase tracking-widest text-secondary mb-2">
                  Total Reps
                </label>
                <div className="relative z-10">
                  <span className="text-5xl lg:text-6xl font-black italic tracking-tighter leading-none">
                    {totalReps}
                  </span>
                </div>
                <div className="absolute -right-4 -bottom-4 text-primary/5 select-none pointer-events-none">
                  <span
                    className="material-symbols-outlined text-7xl"
                    data-icon="fitness_center"
                  >
                    fitness_center
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Accuracy Split (Bento Card Large) */}
          <div className="col-span-2 bg-surface-container-lowest p-4 rounded-xl flex flex-col justify-between shadow-sm">
            <label className="text-[0.75rem] font-bold uppercase tracking-widest text-secondary mb-4">
              Performance Accuracy
            </label>
            <div className="flex items-end gap-4 h-full">
              <div className="flex-grow flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs lg:text-sm font-bold uppercase text-on-surface">
                    Correct
                  </span>
                  <span className="text-xl lg:text-2xl font-black italic text-on-background">
                    {stats.correctReps}
                  </span>
                </div>
                <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{
                      width: `${totalReps > 0 ? (stats.correctReps / totalReps) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="flex-grow flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs lg:text-sm font-bold uppercase text-secondary">
                    Incorrect
                  </span>
                  <span className="text-xl lg:text-2xl font-black italic text-secondary">
                    {stats.incorrectReps}
                  </span>
                </div>
                <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{
                      width: `${totalReps > 0 ? (stats.incorrectReps / totalReps) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls (Action Bar) */}
          <div className="col-span-2 flex gap-4 mt-2 w-full pb-8 md:pb-0">
            <button
              onClick={resetSession}
              className="flex-1 bg-surface-container-highest h-14 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-on-surface hover:bg-surface-variant shadow-sm border border-outline-variant/30"
            >
              <span
                className="material-symbols-outlined text-xl"
                data-icon="close"
              >
                close
              </span>
              <span className="font-headline font-extrabold uppercase tracking-tight text-sm lg:text-base">
                Change Exercise
              </span>
            </button>
            {isWorkout ? (
              <button
                onClick={stopWorkout}
                className="flex-1 bg-gradient-to-r from-primary to-primary-container h-14 rounded-xl flex items-center justify-center gap-2 text-white shadow-md active:scale-95 transition-all hover:shadow-lg"
              >
                <span
                  className="material-symbols-outlined text-xl"
                  data-icon="stop"
                >
                  stop
                </span>
                <span className="font-headline font-extrabold uppercase tracking-tight text-sm lg:text-base">
                  End Workout
                </span>
              </button>
            ) : (
              <button
                onClick={() => startWorkout(selectedExercise)}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 h-14 rounded-xl flex items-center justify-center gap-2 text-white shadow-md active:scale-95 transition-all hover:shadow-lg"
              >
                <span
                  className="material-symbols-outlined text-xl"
                  data-icon="play_arrow"
                >
                  play_arrow
                </span>
                <span className="font-headline font-extrabold uppercase tracking-tight text-sm lg:text-base">
                  Resume
                </span>
              </button>
            )}
          </div>
          </div>
        </section>
      </main>
    </div>
  );
}
