# Chapter 3: Proposed Work and Methodology Adopted

---

**Project Title:** Kine-Sight — AI-Powered Digital Fitness Trainer  
**Project Type:** Software Project (Browser-Based Web Application)  
**Academic Year:** 2025–2026  
**Date:** April 2026

---

## 3.1 Problem Statement

Maintaining correct exercise form during unsupervised workouts remains a significant challenge for fitness enthusiasts. Incorrect posture leads to injuries, reduced effectiveness, and long-term musculoskeletal damage. Existing solutions either require expensive personal trainers, rely on cloud-based APIs that raise privacy concerns (as users must stream their camera feed to remote servers), or provide generic feedback without real-time pose analysis.

There is a clear need for an **intelligent, privacy-preserving, real-time fitness coaching system** that can run entirely on a user's device without external dependencies, while providing accurate form detection and personalized corrective feedback.

---

## 3.2 Proposed Work

The proposed work is to design and develop **Kine-Sight**, an AI-powered digital fitness trainer that operates entirely within the web browser. The system performs the following core functions:

1. **Real-Time Pose Detection** — Capture the user's live webcam feed and detect 33 body landmarks using the MediaPipe Pose Landmarker model running locally via WebAssembly (WASM).

2. **Exercise Form Evaluation** — Compute joint angles from detected landmarks and evaluate exercise-specific posture quality (good/bad form) against predefined biomechanical thresholds for 6 exercises: Squats, Bicep Curls, Push-ups, Lunges, Shoulder Press, and Plank.

3. **Repetition Counting with Debounce Logic** — Automatically count exercise repetitions by tracking positional state transitions (up → down → up) with a 5-frame debounce mechanism to prevent false counts from tracking noise.

4. **AI-Powered Coaching Feedback** — Generate real-time, context-aware motivational and corrective text feedback using an on-device Large Language Model (Qwen2.5-1.5B), streamed token-by-token and spoken aloud via the browser's Text-to-Speech API.

5. **Uploaded Video Analysis** — Allow users to upload pre-recorded workout videos for frame-by-frame offline analysis, producing a detailed report with per-rep breakdowns, accuracy percentages, and common form issues.

6. **Workout History & Cloud Sync** — Persist workout records locally (with 3-day pruning for guest users) and optionally sync to Firebase Cloud Firestore for authenticated users.

7. **Privacy-First Architecture** — Ensure all AI inference (pose detection, LLM, TTS) runs entirely on-device via WASM/WebGPU. No camera frames or personal data are transmitted to any external server.

---

## 3.3 Objectives

| # | Objective                                                                                              |
|---|--------------------------------------------------------------------------------------------------------|
| 1 | To develop a browser-based fitness application requiring zero installation by the end user.             |
| 2 | To implement real-time human pose estimation using MediaPipe's 33-landmark model via WebAssembly.      |
| 3 | To design a declarative exercise definition system supporting multiple exercises with form validation.  |
| 4 | To integrate an on-device LLM for generating context-aware, one-sentence coaching feedback per rep.    |
| 5 | To implement a debounce-based repetition counter that distinguishes correct and incorrect repetitions. |
| 6 | To build a video analysis pipeline that processes uploaded workout videos frame-by-frame at 5 FPS.     |
| 7 | To ensure complete user privacy by eliminating all server-side AI processing.                          |
| 8 | To provide persistent workout tracking with local storage and optional Firebase cloud synchronization. |

---

## 3.4 Scope of the Project

### In Scope

- Real-time single-person pose detection and form analysis via webcam.
- Support for 6 exercise types with extensible architecture for adding more.
- On-device LLM coaching with streaming text and TTS voice output.
- Uploaded video analysis with detailed per-rep reports.
- User authentication (Email, Google OAuth, Guest mode) with Firebase.
- Workout history tracking, performance statistics, and streak monitoring.
- Progressive Web App (PWA) support for installability and offline usage.
- Dark/Light theme support with system preference detection.

### Out of Scope

- Multi-person simultaneous tracking.
- Custom exercise creation by end users (requires developer modification).
- Wearable device or IoT sensor integration.
- Native mobile application (iOS/Android) — the project targets web browsers only.
- Nutrition tracking or diet planning features.

---

## 3.5 Methodology Adopted

The project follows an **Agile Iterative Development** methodology, where the system was built in incremental modules, each independently testable and deployable. This approach was chosen because:

- The project involves multiple interdependent AI subsystems (pose detection, LLM, TTS) that require individual validation before integration.
- Browser-based AI is an emerging field with rapidly evolving APIs (WebGPU, WASM), necessitating flexible adaptation.
- User interface requirements evolved based on functional testing feedback.

### 3.5.1 Development Phases

The project was executed in the following iterative phases:

#### Phase 1: Research & Feasibility Study
- Evaluated browser-based AI frameworks: MediaPipe, TensorFlow.js, ONNX Runtime Web.
- Benchmarked on-device LLM options: WebLLM (@mlc-ai/web-llm), RunAnywhere SDK.
- Confirmed feasibility of running pose detection + LLM simultaneously in a single browser tab within memory constraints (~2 GB for LLM + ~300 MB for MediaPipe).
- Selected React + TypeScript + Vite as the frontend stack for performance and developer experience.

#### Phase 2: Core Pose Detection Engine
- Implemented `poseEngine.ts` — a custom wrapper around MediaPipe's PoseLandmarker.
- Developed mathematical utilities: `calcAngle()` for computing interior joint angles from 3D landmarks, `avgSideAngle()` for bilateral averaging, and `bestSideAngle()` for selecting the more visible side in video analysis.
- Designed the declarative `EXERCISES[]` array, where each exercise is defined by its key landmarks, angle thresholds for position detection (up/down), and form-check conditions.
- Built `drawSkeleton()` and `drawAngleBadge()` for real-time canvas overlay rendering.

#### Phase 3: Live Workout Interface
- Developed `FitnessTab.tsx` — the primary workout view and state-machine controller.
- Implemented the detection loop using `requestAnimationFrame` for continuous frame capture and analysis.
- Built the debounce-based repetition counter requiring 5 consecutive identical position frames before confirming a state transition.
- Integrated Web Audio API for immediate auditory feedback (ding for correct rep, buzz for incorrect rep), with audio context priming on user gesture to comply with browser autoplay policies.

#### Phase 4: On-Device AI Coach
- Integrated `@mlc-ai/web-llm` in `llmEngine.ts` with Qwen2.5-1.5B-Instruct as the primary model and SmolLM2-1.7B-Instruct as fallback.
- Designed a system prompt constraining the LLM to produce single-sentence, actionable coaching responses without markdown formatting.
- Implemented streaming token-by-token output for perceived responsiveness, with a generation lock to prevent prompt queue buildup during rapid reps.
- Built `ttsService.ts` for voice output with automatic premium voice selection (Google US, Samantha, Daniel) and configurable rate/pitch settings.

#### Phase 5: Video Analysis Pipeline
- Developed `videoAnalyzer.ts` with a separate IMAGE-mode PoseLandmarker (distinct from the VIDEO-mode instance used for live camera) to handle frame-by-frame seeking without temporal smoothing issues.
- Implemented the `seekTo()` utility with double `requestAnimationFrame` delays for reliable frame decoding across browsers.
- Built `videoAnalyzeFrame()` with relaxed angle thresholds and `bestSideAngle()` to handle diverse camera angles in pre-recorded videos.
- Designed the `VideoAnalysisReport` data structure with per-rep summaries, accuracy percentages, and top-3 common issues analysis.

#### Phase 6: Authentication & Data Persistence
- Configured Firebase Authentication supporting Email/Password and Google OAuth sign-in.
- Implemented `storageService.ts` with a dual-storage strategy: localStorage for immediate access (auto-pruned to 3 days for non-authenticated users) and Cloud Firestore for long-term persistence.
- Built `syncLocalToCloud()` for migrating guest data upon account creation.

#### Phase 7: UI/UX Polish & Landing Page
- Designed the branded landing page with Three.js visual effects and glassmorphic styling.
- Implemented dark/light theme support with system preference detection and localStorage persistence.
- Added exercise demonstration videos, image previews, and tips for each supported exercise.
- Configured PWA manifest and service worker via `vite-plugin-pwa` for installability.

#### Phase 8: Deployment & Cross-Browser Testing
- Configured Vite build with COOP/COEP headers (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: credentialless`) for SharedArrayBuffer support (required by multi-threaded WASM).
- Deployed to Vercel with custom header configuration via `vercel.json`.
- Tested across Chrome 120+, Edge 120+, and identified Safari limitations (no WebGPU, OPFS reliability issues).

### 3.5.2 Development Methodology Diagram

![Figure 3.5.2 — Development Methodology Diagram](diagrams/development_methodology_diagram.png)

```
┌──────────────────────────────────────────────────────────────────┐
│                  AGILE ITERATIVE DEVELOPMENT                     │
│                                                                  │
│   Phase 1          Phase 2          Phase 3          Phase 4     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Research  │───►│  Pose    │───►│  Live    │───►│  AI      │   │
│  │ &         │    │  Engine  │    │  Workout │    │  Coach   │   │
│  │ Feasibility│   │  Core    │    │  UI      │    │  (LLM)   │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│                                                       │          │
│   Phase 8          Phase 7          Phase 6       Phase 5        │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Deploy   │◄───│  UI/UX   │◄───│  Auth &  │◄───│  Video   │   │
│  │ & Test   │    │  Polish  │    │  Storage │    │  Analysis │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│                                                                  │
│         ◄──── Continuous Testing & Feedback Loop ────►           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3.6 Algorithms and Techniques Used

### 3.6.1 Joint Angle Calculation

The core biomechanical analysis relies on computing the interior angle between three body landmarks using the inverse tangent function:

```
Given three landmarks A (joint start), B (vertex/joint), C (joint end):

θ = |atan2(Cy - By, Cx - Bx) - atan2(Ay - By, Ax - Bx)|

If θ > 180°:  θ = 360° - θ
```

This produces an angle in degrees (0°–180°) representing the joint extension. For example, a fully extended elbow ≈ 170°, and a fully curled bicep ≈ 40°.

### 3.6.2 Debounce-Based State Machine for Rep Counting

```
State Variables:
  - confirmedPosition: 'up' | 'down' | 'middle'
  - pendingPosition: current candidate
  - pendingCount: consecutive frames in candidate state

Algorithm (per frame):
  1. Analyze pose → get current position
  2. If position == pendingPosition: pendingCount++
     Else: pendingPosition = position, pendingCount = 1
  3. If pendingCount >= DEBOUNCE_THRESHOLD (5 frames):
     - confirmedPosition = pendingPosition
     - Check state transition:
       If 'up' → 'down': mark rep start
       If 'down' → 'up': mark rep complete, classify form
```

This prevents false rep counts caused by momentary tracking glitches or transitional body positions.

### 3.6.3 Best-Side Angle Selection (Video Analysis)

For uploaded videos filmed from a side angle, one side of the body may be partially occluded. The `bestSideAngle()` algorithm:

```
1. Compute average visibility of left-side landmarks (0.0 – 1.0)
2. Compute average visibility of right-side landmarks (0.0 – 1.0)
3. If both sides visibility > 0.5: return average of both angles
4. Else: return the angle from the side with higher visibility
```

### 3.6.4 LLM Prompt Engineering

The AI coach uses a constrained system prompt to generate concise, actionable feedback:

```
System: "You are an AI fitness coach. When the user makes a mistake,
explain EXACTLY what body part is misaligned and give ONE clear
corrective cue. When motivating, be energetic and specific to their
progress. Never use markdown, lists, or emojis. Keep it to ONE
short sentence."

User: "Exercise: {name}\nAction: {action}\nForm Mistakes: {details}\n
Rep Number: {count}\nProvide your ONE sentence response."
```

Generation is limited to 60 tokens at temperature 0.6 for consistent, brief responses.

---

## 3.7 Tools and Technologies Summary

| Category          | Tool / Technology                             | Role                                      |
|-------------------|-----------------------------------------------|-------------------------------------------|
| **Frontend**      | React 19, TypeScript, Vite 6                  | Application framework and build system    |
| **Pose Detection**| MediaPipe PoseLandmarker (WASM, GPU delegate) | 33-landmark body pose estimation          |
| **AI Coach**      | WebLLM (Qwen2.5-1.5B, llama.cpp WASM)        | On-device text generation                 |
| **Voice Output**  | Web Speech API (SpeechSynthesis)              | Text-to-speech coaching feedback          |
| **Audio Feedback**| Web Audio API                                 | Programmatic rep ding/buzz sounds         |
| **Authentication**| Firebase Auth (Email, Google OAuth)            | User identity management                  |
| **Database**      | Cloud Firestore + localStorage                | Workout history and profile storage       |
| **3D Graphics**   | Three.js                                      | Landing page visual effects               |
| **Animations**    | react-spring                                  | Physics-based UI transitions              |
| **PWA**           | vite-plugin-pwa, Service Workers              | Offline capability and installability     |
| **Deployment**    | Vercel                                        | Static hosting with custom headers        |
| **Version Control**| Git + GitHub                                 | Source code management                    |

---

## 3.8 Expected Outcomes

1. A fully functional, browser-based AI fitness trainer accessible at [kine-sight.vercel.app](https://kine-sight.vercel.app).
2. Real-time pose detection running at 15–30 FPS on mid-range hardware.
3. Accurate repetition counting with <5% false-positive rate due to debounce logic.
4. Context-aware AI coaching responses generated in <3 seconds per rep.
5. Complete user privacy — zero camera data transmitted to external servers.
6. Video analysis reports with per-rep form breakdown and accuracy metrics.
7. Cross-browser compatibility with Chrome 120+ and Edge 120+.
8. PWA installability for a native-app-like experience.

---

## 3.9 Novelty and Contribution

| Aspect                     | Existing Solutions                          | Kine-Sight's Approach                                  |
|----------------------------|---------------------------------------------|--------------------------------------------------------|
| **AI Processing**          | Cloud-based (API calls to remote servers)   | 100% on-device via WASM/WebGPU (zero server cost)      |
| **Privacy**                | Camera feed sent to cloud for analysis      | Camera feed never leaves the browser                   |
| **Installation**           | Native app download required                | Zero-install — runs in any modern browser              |
| **Cost**                   | Subscription-based cloud API fees           | Completely free (no API keys, no server costs)         |
| **Feedback Quality**       | Pre-recorded tips or generic messages       | LLM-generated, context-specific coaching per rep       |
| **Video Analysis**         | Not commonly available                      | Frame-by-frame offline analysis with detailed reports  |
| **Exercise Extensibility** | Hardcoded exercise library                  | Declarative exercise definitions — add via config only |

---

*End of Chapter 3: Proposed Work and Methodology Adopted*
