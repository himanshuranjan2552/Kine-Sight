# Chapter 4: Project Analysis and Design

---

**Project Title:** Kine-Sight — AI-Powered Digital Fitness Trainer  
**Project Type:** Software Project (Browser-Based Web Application)  
**Academic Year:** 2025–2026  
**Date:** April 2026

---

## 3.1 Hardware and Software Requirement Specifications

### 3.1.1 Hardware Requirements

The following table lists the minimum and recommended hardware specifications required to develop and run the Kine-Sight application:

| Component             | Minimum Requirement                         | Recommended Specification                     |
| --------------------- | ------------------------------------------- | --------------------------------------------- |
| **Processor**         | Intel Core i5 (8th Gen) / AMD Ryzen 5 2600  | Intel Core i7 (10th Gen+) / AMD Ryzen 7 5800  |
| **RAM**               | 8 GB DDR4                                   | 16 GB DDR4 or higher                          |
| **Storage**           | 256 GB SSD (10 GB free for project + models)| 512 GB SSD or higher                          |
| **GPU**               | Integrated GPU with WebGPU support          | Dedicated GPU (NVIDIA GTX 1650+ / AMD RX 580+)|
| **Display**           | 1366 × 768 resolution                       | 1920 × 1080 (Full HD) or higher               |
| **Webcam**            | 720p HD webcam (built-in or USB)            | 1080p Full HD webcam with auto-focus           |
| **Microphone**        | Built-in microphone                         | External USB microphone (for voice commands)   |
| **Speakers/Headphones**| Built-in speakers                          | External speakers or headphones                |
| **Internet Connection**| Broadband (for initial model download)     | High-speed broadband (10 Mbps+)               |

> **Note:** Since Kine-Sight runs entirely in the browser via WebAssembly, no dedicated server hardware is required for inference. All AI processing (pose detection, LLM feedback, TTS) occurs on the user's local device. The GPU is utilized through the WebGPU/WebGL API for accelerated AI inference.

### 3.1.2 Software Requirements

#### A. Development Environment

| Software                  | Version / Specification                  | Purpose                                         |
| ------------------------- | ---------------------------------------- | ----------------------------------------------- |
| **Operating System**      | Windows 10/11, macOS 12+, or Linux       | Development platform                            |
| **Node.js**               | v18.0 or higher                          | JavaScript runtime for build tools              |
| **npm**                   | v9.0 or higher                           | Package manager for dependency installation     |
| **TypeScript**            | v5.6.0                                   | Statically typed superset of JavaScript         |
| **Code Editor / IDE**     | VS Code (v1.85+)                         | Primary development IDE                         |
| **Git**                   | v2.40+                                   | Version control system                          |
| **Web Browser (Dev)**     | Google Chrome 120+ / Microsoft Edge 120+ | Development and debugging (DevTools, WebGPU)    |

#### B. Frameworks, Libraries & SDKs

| Library / Framework            | Version        | Purpose                                                |
| ------------------------------ | -------------- | ------------------------------------------------------ |
| **React**                      | v19.0.0        | UI component framework (SPA architecture)              |
| **Vite**                       | v6.0.0         | Fast build tool and development server                 |
| **@mediapipe/tasks-vision**    | v0.10.19       | Real-time pose landmark detection (33 body keypoints)  |
| **@mlc-ai/web-llm**           | v0.2.82        | On-device LLM inference via WebGPU/WASM                |
| **Firebase**                   | v12.11.0       | Authentication (Email/Google) & Cloud Firestore DB     |
| **react-spring**               | v10.0.3        | Physics-based UI animations                            |
| **three.js**                   | v0.183.2       | 3D rendering (landing page visual effects)             |
| **Web Speech API**             | Browser-native | Text-to-Speech for voice coaching feedback             |
| **Web Audio API**              | Browser-native | Auditory feedback (correct/incorrect rep sounds)       |
| **vite-plugin-pwa**            | v1.2.0         | Progressive Web App support (offline capability)       |

#### C. AI Models Used (On-Device)

| Model                          | Framework      | Size        | Purpose                                  |
| ------------------------------ | -------------- | ----------- | ---------------------------------------- |
| **MediaPipe Pose Landmarker Lite** | MediaPipe WASM | ~4 MB       | Real-time 33-point body pose estimation  |
| **Qwen2.5-1.5B-Instruct**     | WebLLM (WASM)  | ~1.2 GB     | AI coaching text generation (primary)    |
| **SmolLM2-1.7B-Instruct**     | WebLLM (WASM)  | ~1.3 GB     | AI coaching text generation (fallback)   |

#### D. Deployment & Hosting

| Service           | Purpose                                            |
| ----------------- | -------------------------------------------------- |
| **Vercel**        | Static site hosting with COOP/COEP header support  |
| **Firebase**      | Backend-as-a-Service (Authentication + Firestore)  |
| **HuggingFace**   | Model file hosting and distribution                |
| **CDN (jsDelivr)**| MediaPipe WASM binary delivery                     |

#### E. End-User Software Requirements

| Requirement         | Specification                                              |
| ------------------- | ---------------------------------------------------------- |
| **Web Browser**     | Google Chrome 120+ or Microsoft Edge 120+ (WebGPU support) |
| **Operating System**| Any OS with a supported browser (Windows, macOS, Linux, Android, ChromeOS) |
| **Permissions**     | Camera access, Microphone access (optional), Speaker/Audio |

---

## 3.2 Use Case Diagrams, Flowcharts & Activity Diagrams

### 3.2.1 Use Case Diagram

The following use case diagram illustrates the primary interactions between the user (Actor) and the Kine-Sight system:

![Figure 3.2.1 — Use Case Diagram](diagrams/use_case_diagram.png)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          KINE-SIGHT SYSTEM                                  │
│                                                                             │
│  ┌──────────────────────┐     ┌──────────────────────────┐                  │
│  │  UC1: View Landing   │     │  UC2: Register / Login   │                  │
│  │       Page           │     │  (Email / Google / Guest) │                  │
│  └──────────┬───────────┘     └──────────┬───────────────┘                  │
│             │                            │                                  │
│             │         ┌──────────────────┴────────────────┐                 │
│             │         │                                   │                 │
│  ┌──────────▼─────────▼──┐     ┌─────────────────────────┐                 │
│  │  UC3: Select Exercise │     │  UC4: View Workout       │                 │
│  │  (Squat, Bicep Curl,  │     │       Reports            │                 │
│  │   Push-up, Lunge,     │     │  (History, Stats, Streak) │                │
│  │   Shoulder Press,     │     └─────────────────────────┘                  │
│  │   Plank)              │                                                  │
│  └──────────┬────────────┘     ┌─────────────────────────┐                 │
│             │                  │  UC7: Analyze Uploaded   │                 │
│  ┌──────────▼────────────┐     │       Workout Video      │                 │
│  │  UC5: Start Live      │     │  (Frame-by-frame pose    │                 │
│  │   Workout Session     │     │   detection + report)    │                 │
│  │  (Camera + Pose       │     └─────────────────────────┘                 │
│  │   Detection + Reps)   │                                                  │
│  └──────────┬────────────┘     ┌─────────────────────────┐                 │
│             │                  │  UC8: Toggle Dark/Light  │                 │
│  ┌──────────▼────────────┐     │       Theme              │                 │
│  │  UC6: Receive AI      │     └─────────────────────────┘                 │
│  │   Coach Feedback      │                                                  │
│  │  (LLM + TTS Voice)    │     ┌─────────────────────────┐                 │
│  └───────────────────────┘     │  UC9: Sign Out           │                 │
│                                └─────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────┘
                    ▲
                    │
               ┌────┴────┐
               │  USER   │
               │ (Actor) │
               └─────────┘
```

#### Use Case Descriptions

| Use Case ID | Use Case Name                 | Description                                                                                                              |
| ----------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| UC1         | View Landing Page             | User visits the application and sees the branded landing page with a "Get Started" CTA button.                           |
| UC2         | Register / Login              | User creates an account via Email or Google OAuth, or continues as a Guest (offline mode).                               |
| UC3         | Select Exercise               | User chooses from 6 supported exercises: Squats, Bicep Curls, Push-ups, Lunges, Shoulder Press, and Plank.              |
| UC4         | View Workout Reports          | User navigates to the Reports tab to view historical workout data, performance statistics, and best streaks.             |
| UC5         | Start Live Workout Session    | User activates their webcam; the system performs real-time pose detection, counts reps, and evaluates form quality.       |
| UC6         | Receive AI Coach Feedback     | The on-device LLM generates motivational or corrective one-sentence feedback spoken aloud via TTS after each rep.        |
| UC7         | Analyze Uploaded Workout Video| User uploads a pre-recorded workout video; the system processes it frame-by-frame and produces a detailed analysis report.|
| UC8         | Toggle Dark/Light Theme       | User switches between dark mode and light mode, persisted across sessions via localStorage.                              |
| UC9         | Sign Out                      | Authenticated user logs out and returns to the login screen.                                                              |

---

### 3.2.2 System Flowchart

The following flowchart describes the complete application flow from launch to workout completion:

![Figure 3.2.2 — System Flowchart](diagrams/system_flowchart.png)

```
                              ┌─────────────┐
                              │   START     │
                              └──────┬──────┘
                                     │
                              ┌──────▼──────┐
                              │ Load Landing │
                              │    Page      │
                              └──────┬──────┘
                                     │
                              ┌──────▼──────┐
                              │ User clicks  │
                              │ "Get Started"│
                              └──────┬──────┘
                                     │
                              ┌──────▼──────────────┐
                              │ Authentication       │
                              │ Screen               │
                              └──────┬───────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
            ┌──────────┐    ┌──────────────┐   ┌──────────┐
            │  Email   │    │   Google     │   │  Guest   │
            │  Login   │    │   OAuth      │   │  Mode    │
            └────┬─────┘    └──────┬───────┘   └────┬─────┘
                 │                 │                 │
                 └────────────────┬┘─────────────────┘
                                  │
                           ┌──────▼──────┐
                           │  Dashboard  │
                           │ (Exercise   │
                           │  Selection) │
                           └──────┬──────┘
                                  │
               ┌──────────────────┼───────────────────┐
               ▼                  ▼                   ▼
    ┌────────────────┐   ┌───────────────┐   ┌───────────────┐
    │ Start Workout  │   │ View Reports  │   │ Video Analysis│
    │ (Live Camera)  │   │ (History Tab) │   │ (Upload Tab)  │
    └───────┬────────┘   └───────────────┘   └───────┬───────┘
            │                                        │
    ┌───────▼────────┐                       ┌───────▼───────┐
    │ Initialize:    │                       │ Upload Video  │
    │ • Camera       │                       │ File          │
    │ • MediaPipe    │                       └───────┬───────┘
    │ • LLM (bg)     │                               │
    └───────┬────────┘                       ┌───────▼───────┐
            │                                │ Select Exercise│
    ┌───────▼────────┐                       │ for Analysis   │
    │ Countdown      │                       └───────┬───────┘
    │ (3-2-1-GO!)    │                               │
    └───────┬────────┘                       ┌───────▼────────┐
            │                                │ Frame-by-Frame │
    ┌───────▼──────────────┐                 │ Pose Detection │
    │ DETECTION LOOP       │                 │ (IMAGE mode)   │
    │ (requestAnimationFrame)│                └───────┬────────┘
    │                      │                         │
    │  ┌──────────────┐    │                 ┌───────▼───────┐
    │  │ Capture Frame │    │                 │ Build Report  │
    │  └──────┬───────┘    │                 │ (Reps, Form,  │
    │         │            │                 │  Accuracy)     │
    │  ┌──────▼───────┐    │                 └───────────────┘
    │  │ Pose Detection│   │
    │  │ (33 landmarks)│   │
    │  └──────┬───────┘    │
    │         │            │
    │  ┌──────▼───────┐    │
    │  │ Analyze Form │    │
    │  │ & Position   │    │
    │  └──────┬───────┘    │
    │         │            │
    │  ┌──────▼───────────┐│
    │  │ Debounce (5      ││
    │  │ consecutive      ││
    │  │ same-position    ││
    │  │ frames)          ││
    │  └──────┬───────────┘│
    │         │            │
    │    ┌────▼────┐       │
    │    │Rep Done?│───NO──►│ (Loop continues)
    │    └────┬────┘       │
    │         │ YES        │
    │  ┌──────▼───────┐    │
    │  │ Count Rep     │   │
    │  │ (Correct/     │   │
    │  │  Incorrect)   │   │
    │  └──────┬───────┘    │
    │         │            │
    │  ┌──────▼───────┐    │
    │  │ Play Audio   │    │
    │  │ Feedback     │    │
    │  └──────┬───────┘    │
    │         │            │
    │  ┌──────▼───────┐    │
    │  │ LLM Generates│   │
    │  │ Coach Text   │   │
    │  └──────┬───────┘    │
    │         │            │
    │  ┌──────▼───────┐    │
    │  │ TTS Speaks   │    │
    │  │ Feedback     │    │
    │  └──────┬───────┘    │
    │         │            │
    │  ┌──────▼───────┐    │
    │  │ Draw Skeleton│    │
    │  │ on Canvas    │    │
    │  └──────────────┘    │
    │                      │
    │        (Loop)        │
    └──────────────────────┘
            │
    ┌───────▼────────┐
    │ End Workout    │
    │ Save Record    │
    │ (Local + Cloud)│
    └───────┬────────┘
            │
    ┌───────▼────────┐
    │     END        │
    └────────────────┘
```

---

### 3.2.3 Activity Diagram — Live Workout Session

The following activity diagram describes the concurrent activities during a live workout session:

![Figure 3.2.3 — Live Workout Activity Diagram](diagrams/activity_diagram_workout.png)

```
┌─────────────────────────────────────────────────────────────────┐
│                    LIVE WORKOUT ACTIVITY DIAGRAM                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [User Action]              [System Processing]                 │
│                                                                 │
│  ● Start                                                        │
│  │                                                              │
│  ▼                                                              │
│  Select Exercise ──────────► Load Exercise Config                │
│  │                           (angle thresholds, key landmarks)  │
│  │                                                              │
│  ▼                                                              │
│  Click "Start" ────────────► Initialize Camera (getUserMedia)   │
│                              │                                  │
│                              ├──► Initialize MediaPipe Model    │
│                              │    (Download WASM + model file)  │
│                              │                                  │
│                              ├──► Initialize LLM Engine (bg)    │
│                              │    (Download ~1.2 GB model)      │
│                              │                                  │
│                              └──► Prime Web Audio Context       │
│  │                                                              │
│  ▼                                                              │
│  Watch Countdown ──────────► Display 3... 2... 1... GO!         │
│  │                                                              │
│  ▼                                                              │
│  ┌──────────────────── PARALLEL ACTIVITIES ─────────────────┐   │
│  │                                                           │   │
│  │  LANE 1: Pose Detection          LANE 2: AI Coach       │   │
│  │  ┌─────────────────────┐         ┌────────────────────┐  │   │
│  │  │ Capture Video Frame │         │ Wait for Rep Event │  │   │
│  │  └────────┬────────────┘         └────────┬───────────┘  │   │
│  │           │                               │              │   │
│  │  ┌────────▼────────────┐         ┌────────▼───────────┐  │   │
│  │  │ Run PoseLandmarker  │         │ Build Prompt       │  │   │
│  │  │ (detect 33 points)  │         │ (exercise, form,   │  │   │
│  │  └────────┬────────────┘         │  rep count)        │  │   │
│  │           │                      └────────┬───────────┘  │   │
│  │  ┌────────▼────────────┐         ┌────────▼───────────┐  │   │
│  │  │ Calculate Joint     │         │ Stream LLM Reply   │  │   │
│  │  │ Angles              │         │ (token by token)   │  │   │
│  │  └────────┬────────────┘         └────────┬───────────┘  │   │
│  │           │                               │              │   │
│  │  ┌────────▼────────────┐         ┌────────▼───────────┐  │   │
│  │  │ Evaluate Position   │         │ Display Coach Text │  │   │
│  │  │ & Form Quality      │         │ on Screen          │  │   │
│  │  └────────┬────────────┘         └────────┬───────────┘  │   │
│  │           │                               │              │   │
│  │  ┌────────▼────────────┐         ┌────────▼───────────┐  │   │
│  │  │ Mirror & Draw       │         │ Speak via TTS      │  │   │
│  │  │ Skeleton Overlay    │         │ (SpeechSynthesis)  │  │   │
│  │  └────────┬────────────┘         └────────────────────┘  │   │
│  │           │                                              │   │
│  │  ┌────────▼────────────┐                                 │   │
│  │  │ Debounce & Count    │                                 │   │
│  │  │ Repetition          │                                 │   │
│  │  └────────┬────────────┘                                 │   │
│  │           │                                              │   │
│  │  ┌────────▼────────────┐                                 │   │
│  │  │ Play Audio Ding     │                                 │   │
│  │  │ (correct/incorrect) │                                 │   │
│  │  └────────┬────────────┘                                 │   │
│  │           │                                              │   │
│  │           ▼ (loop via requestAnimationFrame)              │   │
│  └──────────────────────────────────────────────────────────┘   │
│  │                                                              │
│  ▼                                                              │
│  Click "End Workout" ──────► Save WorkoutRecord                 │
│                               │                                 │
│                               ├──► localStorage (3-day cache)   │
│                               ├──► Cloud Firestore (if logged in)│
│                               └──► Update UserProfile stats     │
│  │                                                              │
│  ▼                                                              │
│  ● End                                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3.2.4 Activity Diagram — Video Analysis Flow

![Figure 3.2.4 — Video Analysis Activity Diagram](diagrams/activity_diagram_video.png)

```
┌────────────────────────────────────────────────────────────────┐
│               VIDEO ANALYSIS ACTIVITY DIAGRAM                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ● Start                                                       │
│  │                                                             │
│  ▼                                                             │
│  User uploads video file (.mp4, .webm, .mov)                  │
│  │                                                             │
│  ▼                                                             │
│  User selects target exercise (Squats, Bicep Curls, etc.)      │
│  │                                                             │
│  ▼                                                             │
│  System loads SEPARATE PoseLandmarker (IMAGE mode)             │
│  │                                                             │
│  ▼                                                             │
│  System creates off-screen <video> element in DOM              │
│  │                                                             │
│  ▼                                                             │
│  Load video metadata (duration, resolution)                    │
│  │                                                             │
│  ▼                                                             │
│  ┌─── FOR EACH FRAME (at 5 FPS sample rate) ──────────────┐   │
│  │                                                         │   │
│  │  Seek video to timestamp ──► Wait for frame decode      │   │
│  │  │                                                      │   │
│  │  ▼                                                      │   │
│  │  Draw frame to off-screen <canvas>                      │   │
│  │  │                                                      │   │
│  │  ▼                                                      │   │
│  │  Run PoseLandmarker.detect(canvas) — IMAGE mode         │   │
│  │  │                                                      │   │
│  │  ▼                                                      │   │
│  │  Use bestSideAngle() — picks the side with better       │   │
│  │  landmark visibility (handles side-camera angles)       │   │
│  │  │                                                      │   │
│  │  ▼                                                      │   │
│  │  Evaluate position (up/down/middle) + form (good/bad)   │   │
│  │  with RELAXED thresholds for video analysis             │   │
│  │  │                                                      │   │
│  │  ▼                                                      │   │
│  │  Store FrameAnalysis (timestamp, angle, form, landmarks)│   │
│  │  │                                                      │   │
│  │  ▼                                                      │   │
│  │  Report progress to UI                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│  │                                                             │
│  ▼                                                             │
│  Build Report:                                                 │
│  • Count reps using debounced position transitions             │
│  •   (3 consecutive same-position frames = confirmed)          │
│  • Classify each rep as correct / incorrect                    │
│  • Calculate overall accuracy percentage                       │
│  • Identify top 3 most common form issues                      │
│  │                                                             │
│  ▼                                                             │
│  Display VideoAnalysisReport to the user                       │
│  │                                                             │
│  ▼                                                             │
│  ● End                                                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

### 3.2.5 Data Flow Diagram (Level 0 — Context Diagram)

![Figure 3.2.5 — Data Flow Diagram (Level 0)](diagrams/data_flow_diagram.png)

```
                         ┌──────────────────────────────┐
   Camera Feed ─────────►│                              │
   (Video Frames)        │                              │──────► Skeleton Overlay
                         │                              │        (Canvas Drawing)
   User Exercise ───────►│      KINE-SIGHT SYSTEM       │
   Selection             │                              │──────► Rep Count &
                         │   (Browser-based AI Engine)  │        Form Assessment
   Uploaded ────────────►│                              │
   Workout Video         │                              │──────► AI Coach Text
                         │                              │        + Voice Feedback
   Login ───────────────►│                              │
   Credentials           │                              │──────► Workout History
                         └──────────────────────────────┘        & Statistics
                                     ▲   │
                                     │   │
                              ┌──────┘   └──────┐
                              │                  │
                        ┌─────┴─────┐    ┌──────▼──────┐
                        │ Firebase  │    │ AI Models   │
                        │ Cloud     │    │ (MediaPipe, │
                        │ (Auth +   │    │  WebLLM,    │
                        │ Firestore)│    │  TTS)       │
                        └───────────┘    └─────────────┘
```

---

## 3.3 Connection Diagram

> **Note:** Kine-Sight is a **software-only** project. It does not involve custom hardware circuits, microcontrollers, or sensor modules. However, the following **system architecture / connection diagram** illustrates how the software components, browser APIs, external services, and user hardware (webcam, microphone, speakers) interconnect.

### 3.3.1 System Architecture Connection Diagram

![Figure 3.3.1 — System Architecture Connection Diagram](diagrams/system_architecture_diagram.png)

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          USER'S DEVICE (Browser)                          │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                        REACT APPLICATION                           │   │
│  │                       (App.tsx Entry Point)                        │   │
│  │                                                                    │   │
│  │  ┌──────────┐  ┌────────────┐  ┌───────────────┐  ┌────────────┐ │   │
│  │  │ Landing  │  │   Login    │  │  FitnessTab   │  │  Reports   │ │   │
│  │  │  Page    │  │  Screen    │  │  (Core View)  │  │    Tab     │ │   │
│  │  └──────────┘  └─────┬──────┘  └───────┬───────┘  └────────────┘ │   │
│  │                      │                 │                          │   │
│  │                      ▼                 │                          │   │
│  │  ┌──────────────────────┐              │  ┌───────────────────┐  │   │
│  │  │   AuthContext.tsx    │              │  │ VideoAnalysisTab  │  │   │
│  │  │  (Firebase Auth)     │              │  │ (Upload Analysis) │  │   │
│  │  └──────────┬───────────┘              │  └────────┬──────────┘  │   │
│  │             │                          │           │             │   │
│  └─────────────┼──────────────────────────┼───────────┼─────────────┘   │
│                │                          │           │                  │
│  ┌─────────────▼──────────┐  ┌───────────▼────────┐  │                  │
│  │    Firebase SDK        │  │   Pose Engine      │  │                  │
│  │  ┌─────────────────┐   │  │  (poseEngine.ts)   │◄─┘                  │
│  │  │ Auth Service    │   │  │                    │                      │
│  │  │ (Email/Google)  │   │  │  • calcAngle()    │                      │
│  │  └─────────────────┘   │  │  • EXERCISES[]    │                      │
│  │  ┌─────────────────┐   │  │  • drawSkeleton() │                      │
│  │  │ Firestore DB    │   │  └────────┬───────────┘                     │
│  │  │ (Cloud Storage) │   │           │                                  │
│  │  └─────────────────┘   │  ┌────────▼───────────┐                     │
│  └────────────────────────┘  │   MediaPipe WASM   │                     │
│                              │  PoseLandmarker    │                     │
│  ┌────────────────────────┐  │  (33 body points)  │                     │
│  │     LLM Engine         │  └────────────────────┘                     │
│  │   (llmEngine.ts)       │                                             │
│  │  ┌─────────────────┐   │  ┌────────────────────┐                    │
│  │  │ WebWorkerMLCEngine│  │  │   TTS Service      │                    │
│  │  │ (Web Worker)     │  │  │  (ttsService.ts)   │                    │
│  │  └────────┬────────┘   │  │                    │                    │
│  │           │            │  │  SpeechSynthesis   │                    │
│  └───────────┼────────────┘  │  (Browser API)     │                    │
│              │               └────────────────────┘                    │
│              │                                                          │
│  ┌───────────▼──────────────────────────────────────────┐              │
│  │              WebAssembly Runtime (WASM)                │              │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │             │
│  │  │ llama.cpp    │  │ MediaPipe    │  │ Web Audio  │  │             │
│  │  │ (LLM Engine) │  │ (Vision)     │  │ API        │  │             │
│  │  └──────────────┘  └──────────────┘  └────────────┘  │             │
│  └──────────────────────────────────────────────────────┘              │
│                                                                        │
│  ┌──────────────────── BROWSER APIs ───────────────────────┐          │
│  │ getUserMedia()  │  Canvas2D  │  WebGPU/WebGL  │  OPFS   │          │
│  └─────────────────┴────────────┴────────────────┴─────────┘          │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
         │              │                │
         ▼              ▼                ▼
    ┌─────────┐   ┌──────────┐    ┌─────────────┐
    │ WEBCAM  │   │ DISPLAY  │    │ SPEAKERS /  │
    │ (720p+) │   │ (Monitor)│    │ HEADPHONES  │
    └─────────┘   └──────────┘    └─────────────┘
```

### 3.3.2 External Service Connection Diagram

![Figure 3.3.2 — External Service Connection Diagram](diagrams/external_services_diagram.png)

```
┌──────────────────────┐         HTTPS (REST)         ┌──────────────────┐
│                      │ ◄──────────────────────────── │                  │
│   User's Browser     │         Initial Model         │   HuggingFace   │
│   (Kine-Sight App)   │         Downloads (~1.2 GB)   │   Model Hub     │
│                      │ ────────────────────────────► │                  │
└──────────┬───────────┘                              └──────────────────┘
           │
           │  HTTPS (Firebase SDK)
           │
           ▼
┌──────────────────────┐         HTTPS               ┌──────────────────┐
│   Firebase Auth      │ ◄─────────────────────────── │   Google OAuth   │
│   (Authentication)   │                              │   Provider       │
└──────────┬───────────┘                              └──────────────────┘
           │
           │  gRPC / HTTPS
           │
           ▼
┌──────────────────────┐
│   Cloud Firestore    │
│   (Workout history,  │
│    user profiles)    │
└──────────────────────┘

┌──────────────────────┐         HTTPS (CDN)         ┌──────────────────┐
│   User's Browser     │ ◄─────────────────────────── │   jsDelivr CDN   │
│   (Initial Load)     │       MediaPipe WASM files   │  (mediapipe npm) │
└──────────────────────┘                              └──────────────────┘
```

> **Privacy Note:** After the initial model download, ALL AI inference runs entirely on-device. No video frames, pose data, or personal fitness information is ever transmitted to external servers. The only outgoing network requests (after initial load) are optional Firebase Auth and Firestore calls for authenticated users.

---

## 3.4 Description of Hardware Components Used

> **Important:** Kine-Sight is a **software-based project** that leverages standard consumer hardware already present on users' devices. It does **not** use custom hardware, microcontrollers, sensors, or embedded systems. The "hardware components" described below refer to the **standard peripherals and device subsystems** that the application interfaces with through browser APIs.

### 3.4.1 Webcam (Primary Input Device)

| Attribute        | Details                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| **Purpose**      | Captures live video feed of the user performing exercises for real-time pose detection.          |
| **Specification**| Minimum 720p HD resolution; recommended 1080p Full HD with auto-focus.                          |
| **Interface**    | Accessed via the `navigator.mediaDevices.getUserMedia()` browser API.                            |
| **Data Flow**    | Video frames are passed to a `<video>` HTML element → drawn to `<canvas>` → fed to MediaPipe PoseLandmarker. |
| **Privacy**      | The camera feed is processed entirely on-device. No frames are transmitted over the network.     |
| **Fallback**     | If the camera is unavailable or permission is denied, the user can still use the Video Analysis tab (upload pre-recorded videos). |

### 3.4.2 GPU (Graphics Processing Unit)

| Attribute        | Details                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| **Purpose**      | Accelerates AI inference for both pose detection (MediaPipe) and LLM text generation (WebLLM).  |
| **Specification**| Any GPU supporting WebGPU or WebGL 2.0. NVIDIA, AMD, Intel, and Apple Silicon GPUs are supported.|
| **Interface**    | Accessed via WebGPU API (preferred) or WebGL fallback. MediaPipe uses GPU delegate by default.   |
| **Data Flow**    | Video frames → GPU shader pipeline → Pose estimation inference → 33 normalized landmark coordinates. |
| **Fallback**     | If WebGPU is unavailable (e.g., Safari), the system falls back to CPU-based WASM inference.      |

### 3.4.3 CPU (Central Processing Unit)

| Attribute        | Details                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| **Purpose**      | Runs the React application, JavaScript logic, Web Workers, and serves as fallback for AI inference when GPU is unavailable. |
| **Specification**| Multi-core processor recommended (4+ cores). WebAssembly runs multi-threaded when `SharedArrayBuffer` is available (COOP/COEP headers enabled). |
| **Interface**    | WebAssembly (WASM) runtime within the browser's V8/SpiderMonkey engine.                          |
| **Key Role**     | The LLM engine runs in a dedicated Web Worker thread to prevent blocking the UI rendering loop.  |

### 3.4.4 System Memory (RAM)

| Attribute        | Details                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| **Purpose**      | Stores loaded AI models, video frame buffers, and application state during runtime.              |
| **Specification**| Minimum 8 GB; LLM models require 1–2 GB of RAM when loaded.                                    |
| **Key Constraint**| Browser tabs have limited memory allocation. Models >2 GB may cause tab crashes on low-RAM devices. The application uses the smaller Qwen 1.5B model (Q4 quantized) to stay within browser memory limits. |
| **Optimization** | Models are stored in the Origin Private File System (OPFS) so they persist across sessions and don't require re-download. |

### 3.4.5 Display / Monitor

| Attribute        | Details                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| **Purpose**      | Renders the application UI including the live camera feed, skeleton overlay, rep counter, AI coach text, and workout reports. |
| **Specification**| Minimum 1366×768; recommended 1920×1080. The application is responsive and adapts to various screen sizes. |
| **Key Feature**  | A `<canvas>` element overlays the `<video>` feed to draw real-time skeleton lines, joint dots, and angle badges using the Canvas 2D API. |

### 3.4.6 Audio Output (Speakers / Headphones)

| Attribute        | Details                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| **Purpose**      | Provides auditory feedback during workouts: (1) correct/incorrect rep ding sounds via Web Audio API, and (2) spoken AI coach responses via Text-to-Speech (SpeechSynthesis API). |
| **Interface**    | Web Audio API for programmatic sound generation; SpeechSynthesis API for TTS voice output.       |
| **Key Feature**  | Audio Context is primed on the user's first gesture ("Start Workout" button click) to comply with browser autoplay policies, ensuring zero-latency audio feedback during the workout. |
| **Voice Selection**| The TTS Service automatically selects premium English voices (Google US, Samantha, Daniel) when available; falls back to default system voice. |

### 3.4.7 Storage (SSD / HDD)

| Attribute        | Details                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| **Purpose**      | Stores downloaded AI models persistently via the browser's Origin Private File System (OPFS).    |
| **Specification**| Approximately 1.5–2 GB of free storage required for AI model files.                              |
| **Data Stored**  | MediaPipe WASM binaries (~4 MB), LLM model weights (~1.2 GB), workout history cache via `localStorage` (auto-pruned to 3 days for guest users). |
| **Persistence**  | OPFS data persists across browser sessions. On subsequent visits, models load from local OPFS cache without re-downloading from HuggingFace. |

---

### 3.4.8 Hardware Component Summary Table

| # | Component      | Type               | Interface / API                  | Role in System                                        |
|---|----------------|--------------------|---------------------------------|-------------------------------------------------------|
| 1 | Webcam         | Input (Peripheral) | `getUserMedia()`                | Captures live video for pose detection                |
| 2 | GPU            | Processing         | WebGPU / WebGL                  | Accelerates AI inference (pose + LLM)                 |
| 3 | CPU            | Processing         | WASM / Web Workers              | Application logic + fallback inference                |
| 4 | RAM            | Memory             | Browser memory allocation       | Stores loaded models + frame buffers                  |
| 5 | Display        | Output             | Canvas 2D / DOM rendering       | Shows UI, video feed, skeleton overlay                |
| 6 | Speakers       | Output (Peripheral)| Web Audio API / SpeechSynthesis | Audio rep feedback + AI coach voice                   |
| 7 | Storage (SSD)  | Persistence        | OPFS / localStorage             | Caches AI models + workout history                    |

---

### 3.4.9 Component Interaction Diagram

![Figure 3.4.9 — Hardware Component Interaction Diagram](diagrams/hardware_interaction_diagram.png)
                                                                               
```
    ┌──────────┐    Video Frames     ┌──────────────┐
    │  WEBCAM  │ ──────────────────► │  BROWSER     │
    └──────────┘    getUserMedia()   │  (React App) │
                                     │              │
    ┌──────────┐    Inference        │  MediaPipe   │
    │   GPU    │ ◄──────────────────►│  + WebLLM    │
    └──────────┘    WebGPU/WebGL     │  (WASM)      │
                                     │              │
    ┌──────────┐    Web Workers +    │  JavaScript  │
    │   CPU    │ ◄──────────────────►│  Engine      │
    └──────────┘    WASM Runtime     │              │
                                     │              │
    ┌──────────┐    Model Loading    │  OPFS +      │
    │   RAM    │ ◄──────────────────►│  In-Memory   │
    └──────────┘    ~1.5 GB          │  Cache       │
                                     │              │
    ┌──────────┐    Canvas + DOM     │  Renderer    │
    │ DISPLAY  │ ◄──────────────────►│  (React DOM) │
    └──────────┘    Rendering        │              │
                                     │              │
    ┌──────────┐    Audio Feedback   │  Web Audio + │
    │ SPEAKERS │ ◄──────────────────►│  TTS API     │
    └──────────┘    Rep Dings + Voice│              │
                                     │              │
    ┌──────────┐    Persistent Store │  localStorage│
    │   SSD    │ ◄──────────────────►│  + OPFS      │
    └──────────┘    Models + History └──────────────┘
```

---

*End of Chapter 4: Project Analysis and Design*
