# Appendix: Key Code Snippets, Processes & Logic

---

**Project Title:** Kine-Sight — AI-Powered Digital Fitness Trainer  
**Academic Year:** 2025–2026

---

## A.1 Joint Angle Calculation

The core biomechanical logic computes the interior angle at a joint vertex from three body landmarks using the inverse tangent function.

**File:** `src/fitness/poseEngine.ts`

```typescript
export function calcAngle(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  c: NormalizedLandmark
): number {
  if (!a || !b || !c) return 0;
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) -
    Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * (180 / Math.PI));
  if (angle > 180) angle = 360 - angle;
  return angle;
}
```

**Logic:** Given landmarks A (start), B (vertex), C (end), the function computes two vectors BA and BC, finds the angle between them using `atan2`, converts to degrees (0°–180°), and normalizes angles exceeding 180°.

---

## A.2 Best-Side Angle Selection (Video Analysis)

For side-angle workout videos, one side of the body may be occluded. This function selects the angle from the more visible side.

**File:** `src/fitness/poseEngine.ts`

```typescript
export function bestSideAngle(
  lm: NormalizedLandmark[],
  leftA: number, leftB: number, leftC: number,
  rightA: number, rightB: number, rightC: number,
): number {
  const leftVis  = ((lm[leftA]?.visibility ?? 0) +
    (lm[leftB]?.visibility ?? 0) + (lm[leftC]?.visibility ?? 0)) / 3;
  const rightVis = ((lm[rightA]?.visibility ?? 0) +
    (lm[rightB]?.visibility ?? 0) + (lm[rightC]?.visibility ?? 0)) / 3;
  const leftAngle  = calcAngle(lm[leftA], lm[leftB], lm[leftC]);
  const rightAngle = calcAngle(lm[rightA], lm[rightB], lm[rightC]);

  if (leftVis > 0.5 && rightVis > 0.5)
    return (leftAngle + rightAngle) / 2;
  return leftVis > rightVis ? leftAngle : rightAngle;
}
```

**Logic:** Averages the visibility score (0.0–1.0) for each side's three landmarks. If both sides are well-visible (>0.5), returns the bilateral average. Otherwise, returns the angle from the side with higher visibility — preventing occluded landmarks from corrupting the measurement.

---

## A.3 Declarative Exercise Definition

Each exercise is defined as a configuration object with its own `analyze()` function, making the system easily extensible.

**File:** `src/fitness/poseEngine.ts` (Squat example)

```typescript
{
  id: 'squats',
  name: 'Squats',
  icon: '🏋️',
  tips: ['Keep back straight', 'Knees behind toes',
         'Thighs parallel to ground'],
  keyLandmarks: [LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_KNEE,
    LM.RIGHT_KNEE, LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
    LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  analyze(lm: NormalizedLandmark[]) {
    const kneeAngle = avgSideAngle(lm,
      LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE,
      LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE);
    const hipAngle = avgSideAngle(lm,
      LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_KNEE,
      LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE);

    let position: ExercisePosition = 'middle';
    if (kneeAngle < 80) position = 'down';
    else if (kneeAngle > 160) position = 'up';

    const checks = checkForm(
      [hipAngle > 55, 'Keep your back straight'],
      [position !== 'down' || kneeAngle < 90, 'Go deeper']
    );

    return { position, form: checks.form,
      formDetails: checks.details,
      angle: Math.round(kneeAngle), landmarks: lm,
      feedback: '...', confident: true };
  },
}
```

**Logic:** Each exercise defines which angle determines position (up/down), what thresholds classify each state, and what form-check conditions must pass. The `checkForm()` helper returns `'good'` if all conditions pass, or `'bad'` with detail strings for the first failing condition.

---

## A.4 MediaPipe PoseLandmarker Initialization

The pose model is lazily loaded and cached as a singleton using a promise-based pattern.

**File:** `src/fitness/poseEngine.ts`

```typescript
let landmarkerInstance: PoseLandmarker | null = null;
let initPromise: Promise<PoseLandmarker> | null = null;

export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (landmarkerInstance) return landmarkerInstance;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    const landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/.../pose_landmarker_lite.task',
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
```

**Logic:** Idempotent initialization — multiple callers safely share a single model instance. The WASM binary and model weights are fetched from CDN on first load and cached by the browser.

---

## A.5 LLM Coach — Prompt Construction & Streaming

The AI coach generates one-sentence feedback using a constrained system prompt and streaming token output.

**File:** `src/llm/llmEngine.ts`

```typescript
const SYSTEM_PROMPT = "You are an AI fitness coach. When the user " +
  "makes a mistake, explain EXACTLY what body part is misaligned " +
  "and give ONE clear corrective cue. When motivating, be energetic " +
  "and specific. Never use markdown, lists, or emojis. " +
  "Keep it to ONE short sentence.";

async generateFeedback(exercise, action, context, onChunk) {
  if (!this.engine || this.generating) return "";
  this.generating = true;

  const prompt = `Exercise: ${exercise}\nAction: ${action}\n` +
    `Form Mistakes: ${context.formDetails?.join(', ') || 'None'}\n` +
    `Rep Number: ${context.repNumber}\n` +
    `Provide your ONE sentence response.`;

  const chunks = await this.engine.chat.completions.create({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    temperature: 0.6,
    max_tokens: 60,
    stream: true,
  });

  let fullText = "";
  for await (const chunk of chunks) {
    fullText += chunk.choices[0]?.delta?.content || "";
    onChunk(fullText.trim());  // Stream to UI
  }
  this.generating = false;
  return fullText.trim();
}
```

**Logic:** The `generating` flag acts as a lock — if a response is already being generated, new requests are silently skipped to prevent queue buildup during rapid reps. Responses stream token-by-token via the `onChunk` callback for immediate UI display.

---

## A.6 Video Frame Seeking with Reliable Decode

Seeking a video to an arbitrary timestamp requires waiting for the browser to fully decode the frame before reading pixels.

**File:** `src/fitness/videoAnalyzer.ts`

```typescript
function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.01
        && video.readyState >= 2) {
      requestAnimationFrame(() => resolve());
      return;
    }
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());  // Double rAF
      });
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = time;
  });
}
```

**Logic:** Sets `currentTime`, waits for the `seeked` event, then waits **two** `requestAnimationFrame` cycles to ensure the browser has fully composited the decoded frame. Without the double rAF, some browsers return stale pixel data from the previous frame.

---

## A.7 TTS Voice Selection Algorithm

The TTS service automatically selects the highest-quality available English voice.

**File:** `src/tts/ttsService.ts`

```typescript
private loadVoices() {
  const voices = this.synth.getVoices();
  const preferredKeywords = ['Google US', 'Google UK', 'Samantha',
    'Daniel', 'Karen', 'Premium', 'Natural', 'Enhanced'];
  const englishVoices = voices.filter(v => v.lang.startsWith('en'));
  const premium = englishVoices.filter(v =>
    preferredKeywords.some(kw => v.name.includes(kw))
  );

  if (premium.length > 0) this.voice = premium[0];
  else if (englishVoices.length > 0) this.voice = englishVoices[0];
  else this.voice = voices[0];
}
```

**Logic:** Filters all browser voices to English, then ranks by preferred keywords (premium/natural voices). Falls back to any English voice, then any available voice.

---

## A.8 Dual-Storage Workout Persistence

Workout records are saved to localStorage immediately and synced to Firestore for authenticated users.

**File:** `src/storage/storageService.ts`

```typescript
saveWorkoutRecord: async (record) => {
  const newRecord = { ...record, id: crypto.randomUUID() };

  // 1. Save locally (immediate)
  const history = storageService.getWorkoutHistory();
  history.push(newRecord);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(
    pruneLocalStorageHistory(history)  // 3-day window
  ));

  // 2. Update profile stats
  const profile = await storageService.getUserProfile();
  profile.totalWorkouts += 1;
  profile.totalCorrectReps += record.correctReps;
  profile.totalIncorrectReps += record.incorrectReps;
  await storageService.saveUserProfile(profile);

  // 3. Cloud sync (if authenticated)
  const user = auth?.currentUser;
  if (user && db) {
    await setDoc(doc(db, `users/${user.uid}/workouts`,
      newRecord.id), newRecord);
  }
}
```

**Logic:** Three-step persistence — (1) immediate localStorage save with automatic 3-day pruning for guest users, (2) cumulative profile statistics update, (3) optional Firestore cloud write for authenticated users. This ensures the app works fully offline while enabling cloud sync when available.

---

## A.9 Project File Structure

```
Kine-Sight/
├── src/
│   ├── App.tsx                  # Root component, routing & theme
│   ├── main.tsx                 # React entry point
│   ├── components/
│   │   ├── FitnessTab.tsx       # Core workout view (52 KB)
│   │   ├── VideoAnalysisTab.tsx # Video upload & analysis UI
│   │   ├── ReportsTab.tsx       # Workout history & stats
│   │   ├── LoginScreen.tsx      # Auth UI (Email/Google/Guest)
│   │   ├── LandingPage.tsx      # Branded landing page
│   │   └── DemoVideo.tsx        # Exercise demo player
│   ├── fitness/
│   │   ├── poseEngine.ts        # MediaPipe wrapper, exercises, math
│   │   └── videoAnalyzer.ts     # Frame-by-frame video analysis
│   ├── llm/
│   │   ├── llmEngine.ts         # WebLLM coach (Qwen2.5-1.5B)
│   │   └── llm-worker.ts       # Web Worker for LLM thread
│   ├── firebase/
│   │   ├── firebaseConfig.ts    # Firebase initialization
│   │   ├── authService.ts       # Auth operations
│   │   └── AuthContext.tsx      # React auth context provider
│   ├── storage/
│   │   └── storageService.ts    # localStorage + Firestore sync
│   ├── tts/
│   │   └── ttsService.ts       # Text-to-Speech service
│   ├── styles/                  # CSS stylesheets
│   └── types/                   # TypeScript type definitions
├── package.json                 # Dependencies & scripts
├── vite.config.ts               # Vite + PWA + COOP/COEP headers
├── vercel.json                  # Deployment configuration
└── index.html                   # HTML entry point
```

---

*End of Appendix*
