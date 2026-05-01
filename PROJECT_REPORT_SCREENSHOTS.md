# Application Screenshots & Workflow

---

**Project Title:** Kine-Sight — AI-Powered Digital Fitness Trainer  
**Academic Year:** 2025–2026  
**Date:** May 2026

---

## Application Flow Overview

The following diagram illustrates the user journey through the Kine-Sight application:

```
Landing Page → Login / Sign Up → Dashboard (Exercise Selection)
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
             Live Workout        Performance          Video Analysis
             (Camera + AI)        Reports              (Upload)
```

---

## Screen 1: Landing Page

![Figure 1 — Landing Page](diagrams/screenshots/01_landing_page.png)

**Description:** The first screen users see when visiting the application. Features:
- Bold "ELITE PERFORMANCE RE-ENGINEERED" hero headline with a fitness-themed background image.
- "INITIALIZE PROTOCOL" CTA button that navigates to the login screen.
- Navigation bar with links to Features, AI Coach, Pricing sections, and a "GET STARTED" button.
- Dark, premium aesthetic with the KineSight branding.

**User Action:** Click "GET STARTED" or "INITIALIZE PROTOCOL" to proceed to authentication.

---

## Screen 2: Login Screen (Access Portal)

![Figure 2 — Login Screen](diagrams/screenshots/02_login_page.png)

**Description:** The authentication screen where returning users sign in. Features:
- Split-panel layout: left side shows KineSight branding with tagline, right side contains the login form.
- **Email/Password** fields with a prominent "LOGIN" button.
- **Google OAuth** sign-in option ("Sign in with Google").
- **Guest Mode** option ("Browse as Guest") for immediate access without registration.
- "New athlete? Create an Account" link to switch to the signup form.

**User Action:** Enter credentials and click Login, use Google sign-in, or browse as Guest.

---

## Screen 3: Sign Up / Create Account

![Figure 3 — Sign Up Screen](diagrams/screenshots/03_signup_page.png)

**Description:** The registration screen for new users. Features:
- "CREATE ACCOUNT" header with subtitle "Join the next generation of athletes."
- **Email and Password** fields for account creation.
- **Profile fields:** Age, Weight (kg), and Gender dropdown for personalized fitness tracking.
- "INITIALIZE PROFILE" button to create the account.
- Alternative sign-in options (Google OAuth, Guest Mode) below the form.

**User Action:** Fill in profile details and click "Initialize Profile" to create an account.

---

## Screen 4: Dashboard (Exercise Selection)

![Figure 4 — Dashboard / Exercise Selection](diagrams/screenshots/04_dashboard.png)

**Description:** The main application hub after authentication. Features:
- **Session Objective** header: "Let's calibrate your next move" with AI coach tagline.
- **Guest Mode notice** banner informing data is saved locally with option to create account.
- **Available Routines** — 6 exercise cards, each displaying:
  - Exercise image thumbnail
  - Exercise name (Squats, Bicep Curls, Push-ups, Lunges, Shoulder Press, Plank)
  - Quick tip (e.g., "Keep back straight")
  - "Active AI" badge indicating LLM coaching is available
  - "START WORKOUT" button
- **Upload Video** card at the bottom for video analysis.
- **KineSight Coach Insight** panel on the right with a motivational AI quote.
- Top navigation bar with Reports link, Sound toggle, Dark/Light theme toggle, and Create Account button.

**User Action:** Select an exercise and click "START WORKOUT" to begin a live session, or click "ANALYZE VIDEO" for video upload.

---

## Screen 5: Live Workout Session

![Figure 5 — Live Workout Session (Squats)](diagrams/screenshots/05_live_workout.png)

**Description:** The core workout interface with real-time pose detection. Features:
- **Live camera feed** occupying the left portion of the screen with the countdown overlay ("4 — GET READY").
- **LLM Coach status bar** at the top center showing "Initializing LLM Coach... (0%)" — the AI model loading in the background.
- **Workout metrics panel** (right side):
  - Duration timer (00:00)
  - Total Reps counter (0)
  - Performance Accuracy section with Correct/Incorrect rep bars
- **Target Form** button (bottom-left) to view the ideal exercise form.
- **Angle badge** (bottom-right) showing the current joint angle (0°).
- **Visibility toggle** to show/hide the skeleton overlay.
- **"CHANGE EXERCISE"** and **"END WORKOUT"** buttons for session control.
- Exercise name displayed in the top-right ("SQUATS").

**User Action:** Perform the exercise in front of the camera. The system automatically detects poses, counts reps, evaluates form, and provides AI coaching feedback.

---

## Screen 6: Performance Reports

![Figure 6 — Performance Reports](diagrams/screenshots/06_reports.png)

**Description:** The workout history and statistics dashboard. Features:
- **All-Time Metrics** — 4 stat cards:
  - Total Workouts (1)
  - Total Reps (0)
  - Overall Accuracy (0%)
  - Best Perfect Streak (0 🔥)
- **Session Log** — Chronological list of past workouts showing:
  - Exercise name (Squats)
  - Date and timestamp (01/05/2026 at 15:25)
  - Duration (0m 12s)
  - Reps count and Accuracy percentage
- Back navigation arrow and dark/light theme toggle.

**User Action:** Review workout history and track progress over time. Navigate back to dashboard.

---

## Screen 7: Video Analysis

![Figure 7 — Video Analysis Upload](diagrams/screenshots/07_video_analysis.png)

**Description:** The video upload and analysis interface. Features:
- **Drag-and-drop zone** — Large dashed border area with upload icon and "Drop your workout video here" text. Supports MP4, WebM, MOV formats.
- **Exercise Type Selector** — 6 exercise buttons (Squats, Bicep Curls, Push-ups, Lunges, Shoulder Press, Plank) to select which exercise to analyze. "Bicep Curls" is shown selected (highlighted).
- **"ANALYZE MY FORM"** — Prominent CTA button to start the frame-by-frame analysis.
- "BACK" navigation button in the top-right corner.
- KineSight branding and "VIDEO ANALYSIS" label in the header.

**User Action:** Upload a workout video, select the exercise type, and click "Analyze My Form" to receive a detailed AI-generated report with per-rep form breakdown.

---

## Complete User Flow Summary

| Step | Screen | Action | Next Screen |
|------|--------|--------|-------------|
| 1 | Landing Page | Click "Get Started" | Login Screen |
| 2a | Login Screen | Enter credentials → Login | Dashboard |
| 2b | Login Screen | Click "Sign in with Google" | Dashboard |
| 2c | Login Screen | Click "Browse as Guest" | Dashboard |
| 2d | Login Screen | Click "Create an Account" | Sign Up Screen |
| 3 | Sign Up Screen | Fill profile → "Initialize Profile" | Dashboard |
| 4a | Dashboard | Select exercise → "Start Workout" | Live Workout |
| 4b | Dashboard | Click "Reports" | Performance Reports |
| 4c | Dashboard | Click "Analyze Video" | Video Analysis |
| 5 | Live Workout | Perform exercise → "End Workout" | Dashboard (record saved) |
| 6 | Performance Reports | View stats → Click back arrow | Dashboard |
| 7 | Video Analysis | Upload video → "Analyze My Form" | Analysis Report → Dashboard |

---

*End of Application Screenshots & Workflow*
