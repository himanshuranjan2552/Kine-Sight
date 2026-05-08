# Chapter 7: Future Scope of Work

---

**Project Title:** Kine-Sight — AI-Powered Digital Fitness Trainer  
**Academic Year:** 2025–2026  
**Date:** April 2026

---

While Kine-Sight successfully delivers a functional AI fitness coaching system, several enhancements can further extend its capabilities, user reach, and commercial viability. The following areas represent the most impactful directions for future development.

## 7.1 Expanded Exercise Library & Custom Exercise Builder

The current system supports 6 exercises. The declarative `EXERCISES[]` architecture allows rapid addition of new exercises (deadlifts, pull-ups, burpees, tricep dips, etc.) by defining key landmarks and angle thresholds — each requiring only ~40 lines of code. Beyond pre-built exercises, a **UI-based exercise builder** would allow users to select joints, set angle thresholds via sliders, and create custom exercise profiles without any programming knowledge.

## 7.2 Advanced AI Coaching with Vision-Language Models

The current LLM coach receives text-based rep summaries. A significant upgrade would involve replacing this with a **Vision-Language Model (VLM)** such as LFM2-VL that directly analyzes camera frames. This would enable the AI to provide visually-grounded feedback (*"Your left knee is caving inward"*) rather than relying solely on computed angle data, resulting in richer and more precise corrections.

## 7.3 Personalized Workout Plans & Adaptive Difficulty

Using the stored workout history and user profile (age, weight, fitness goals), the LLM can generate **personalized weekly workout plans** that adapt based on performance trends. For example, if the system detects consistently good squat form but poor push-up form, it could recommend more push-up-focused sessions with progressive difficulty scaling.

## 7.4 Progress Analytics & Visualization

Adding interactive **charts and graphs** (form accuracy trends over weeks, rep volume tracking, exercise frequency heatmaps, and personal record timelines) would provide users with meaningful long-term progress insights. Libraries such as Chart.js or Recharts can be integrated for this purpose.

## 7.5 Multi-Person Tracking

MediaPipe's PoseLandmarker supports `numPoses > 1`, enabling simultaneous tracking of multiple users. This opens the door for **group workout sessions**, partner exercises, and trainer-student scenarios where a coach can monitor multiple trainees on a single screen.

## 7.6 Wearable & IoT Integration

Leveraging the **Web Bluetooth API**, the application could connect to smartwatches and fitness bands to incorporate heart rate, calorie burn, and SpO₂ data into the coaching feedback loop. This would enable holistic health monitoring beyond just pose analysis.

## 7.7 Smaller & Faster AI Models

As the on-device AI ecosystem matures, sub-500MB models (e.g., LFM2-350M at ~250 MB) are becoming viable for browser deployment. Migrating to these smaller models would dramatically reduce first-load time (from ~120s to ~30s), lower RAM requirements, and expand compatibility to mobile devices and low-end hardware.

## 7.8 Native Mobile Application

While the PWA provides mobile access, a native app built with **React Native** or **Capacitor** would offer direct camera access, background processing, push notifications for workout reminders, and better performance on iOS/Android. The core pose analysis logic (TypeScript) can be largely reused.

## 7.9 Social & Gamification Features

Adding **workout sharing, leaderboards, challenges, and achievement badges** would increase user engagement and retention. Users could share video analysis reports, compete on weekly rep counts, or join community challenges — transforming the solo workout experience into a social fitness platform.

## 7.10 Multilingual & Accessibility Support

Extending LLM coaching and TTS voice output to support multiple languages (Hindi, Spanish, French, etc.) would significantly broaden the user base. Additionally, implementing **accessibility features** — screen reader support, high-contrast mode, and keyboard navigation — would make the application inclusive for users with disabilities.

---

These future enhancements are designed to be **incrementally implementable** using Kine-Sight's existing modular architecture, ensuring that each improvement can be developed and deployed independently without disrupting the core system.

---

*End of Chapter 7: Future Scope of Work*
