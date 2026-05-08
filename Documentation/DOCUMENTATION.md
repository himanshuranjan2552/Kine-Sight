# Kine-Sight Documentation

## Overview
**Kine-Sight** is an interactive, browser-based AI fitness coaching application. It leverages real-time local AI processing to track the user's fitness movements, count repetitions, verify correct posture using visual pose estimation, and provide real-time motivating and corrective feedback through a local Large Language Model (LLM).

Because it relies on WebAssembly (WASM) and browser-based AI inference, it is highly private and fast—processing happens entirely on the user's device without needing external API calls to remote servers.

## Tech Stack & Dependencies
- **Frontend Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Computer Vision (Pose Detection)**: `@mediapipe/tasks-vision` runs MediaPipe's lightweight pose-landmarker model in the browser.
- **On-Device LLM (Voice/Text Coach)**: `@mlc-ai/web-llm` enables running local LLMs (e.g., Llama-3-8B-Instruct) natively in the browser using WebGPU and WebAssembly.
- **Audio Routing**: Web Audio API manages immediate correct/incorrect rep sound indications.

---

## Core Architecture and Data Flow

### 1. `src/App.tsx` & `src/main.tsx`
These act as the entry points of the application. `App.tsx` serves as a simple shell that mounts the primary view: `FitnessTab`.

### 2. `src/components/FitnessTab.tsx`
This is the core view and primary state-machine controller for the application.

**Key responsibilities:**
- **UI Architecture**: Displays the pre-workout "Dashboard/Bento" view with exercise choices. During a workout, it renders the video feed, the canvas overlay (for the skeleton), and the AI Coach's rolling text feedback.
- **Lifecycle Management**: 
  - Activates the camera (`getUserMedia`).
  - Initializes the MediaPipe Pose model.
  - Initializes the WebLLM coach in the background.
  - Coordinates a pre-workout countdown.
- **Detection Loop (`startDetectionLoop`)**: 
  - Runs recursively via `requestAnimationFrame` to sample frames from the active `<video>` element.
  - Passes frames to `poseEngine.ts` to get a pose analysis.
  - Extracts coordinates representing the skeleton, mirrors the inputs so the user sees a "mirror" of themselves, and draws the skeletal lines and angle labels on a `<canvas>` element hovering over the video feed.
- **Rep counting and Debounce logic**:
  - Maintains state tracking for `up` / `down` / `middle` positions.
  - Requires 5 consecutive identical form indications (`DEBOUNCE_FRAMES = 5`) to prevent flickering. 
  - Emits local audio sounds (dings/buzzes) upon rep completion and counts total correct vs. incorrect reps.
- **AI Coach Triggering**:
  - When a rep completes, it generates an event outlining the user's performance (e.g. "User completed a perfect rep" or "User completed a rep with poor form") and dispatches it to the local LLM. 

### 3. `src/fitness/poseEngine.ts`
This file encapsulates all spatial math and exercise movement profiles.

**Key components:**
- **MediaPipe Wrapper (`getPoseLandmarker`)**: Lazily downloads and loads the MediaPipe WASM model.
- **Angle Calculation**: Provides math helpers like `calcAngle` to find interior angles between 3 distinct joints (e.g. Shoulder → Elbow → Wrist) to deduce joint extension.
- **Exercise Definitions (`EXERCISES`)**: A declarative list defining each workout (Squats, Bicep Curls, Push-ups, Lunges, Shoulder Press, Plank). Each definition contains an `analyze()` function that is called per-frame. It accepts raw 3D landmarks and evaluates:
  - `position`: The current posture state (e.g. going `down` in a squat, or coming `up`).
  - `form`: Evaluates if the exercise is functionally sound (e.g. `bad` form if the torso leans too far forward in lunges).
  - `confident`: Determines if all the required joints for the exercise are fully within the camera's view.
- **Drawing Overlays**: Includes `drawSkeleton` and `drawAngleBadge` to construct the helpful UI augmentations on top of the camera feed.

### 4. `src/llm/llmEngine.ts`
This handles the initialization and prompting for the on-device AI coach.

- **Engine Initialization**: Connects to `@mlc-ai/web-llm` to download and load a local LLM in chunks (uses Llama-3-8B-Instruct by default).
- **Feedback Generation (`generateFeedback`)**: Constructs concise prompts. It gives the AI basic stats (how many reps are done, what is the present form quality) and streams back a quick, 1-2 sentence response. The streaming callback is then pumped to the React UI in `FitnessTab`.

### 5. `src/components/DemoVideo.tsx`
Handles displaying short looped demonstration `.mp4` references for each exercise prior to starting. It has error boundaries in case files are missing.

---

## Technical Highlights & Optimizations
- **On-Device Execution**: The entire pose pipeline AND the intelligence pipeline run within the browser. 
- **Adaptive Debouncing**: Rep counting is shielded against temporary 1-frame glitches in body tracking by forcing sequential consecutive positional hits.
- **Audio Context Priming**: The Web Audio API initializes during the initial user gesture ("Start Workout" click), allowing it to bypass native browser auto-play prevention, leading to flawless, zero-latency repetition feedback audio.

## Scaling the Product
To add a new exercise:
1. Identify the 3 joints that create the defining movement angle (e.g. Hip-Knee-Ankle). 
2. Add a new configuration block inside `EXERCISES` in `poseEngine.ts`.
3. Provide the angle bounds defining an "up" state vs. a "down" state.
4. Specify limits defining "good" vs. "bad" form.
