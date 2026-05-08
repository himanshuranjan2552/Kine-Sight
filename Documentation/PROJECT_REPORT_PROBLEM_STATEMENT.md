# Chapter 3: Problem Statement and Objectives

---

**Project Title:** Kine-Sight — AI-Powered Digital Fitness Trainer  
**Academic Year:** 2025–2026  
**Date:** April 2026

---

## 3.1 Problem Statement

The global shift toward home-based and unsupervised workouts has exposed a critical gap: **the absence of real-time, intelligent feedback on exercise form**. Without a trained instructor, users frequently perform exercises with incorrect posture, leading to reduced effectiveness, muscle imbalances, and risk of injury.

Existing solutions suffer from one or more of the following shortcomings:

- **Cloud-based AI fitness apps** (e.g., FitAI, Tempo) require users to stream their camera feed to remote servers for analysis, raising significant **privacy concerns** and introducing network latency.
- **Subscription-based platforms** (e.g., Peloton, Apple Fitness+) offer pre-recorded coaching but provide **no real-time, personalized feedback** on the user's actual form.
- **Wearable-only solutions** track motion metrics (steps, heart rate) but **cannot assess exercise posture or joint alignment**.
- **Open-source pose estimation tools** (e.g., OpenPose) require server setup, technical expertise, and do not provide actionable coaching feedback.

There is a clear need for an **intelligent fitness coaching system** that:
1. Analyzes exercise form in real-time using computer vision.
2. Provides personalized, AI-generated corrective feedback.
3. Runs entirely on the user's device to ensure complete privacy.
4. Requires zero installation — accessible instantly via a web browser.
5. Is free to use with no subscription or API costs.

---

## 3.2 Objectives

The primary objective of this project is to design and develop **Kine-Sight**, a browser-based AI fitness trainer that performs real-time pose detection, form evaluation, and intelligent coaching — all on-device.

The specific objectives are:

| # | Objective |
|---|-----------|
| 1 | To develop a **browser-based fitness application** requiring zero installation, accessible on any device with a modern web browser and webcam. |
| 2 | To implement **real-time human pose estimation** using MediaPipe's 33-landmark model via WebAssembly, achieving 20+ FPS on mid-range hardware. |
| 3 | To design a **declarative exercise definition system** supporting multiple exercises (Squats, Bicep Curls, Push-ups, Lunges, Shoulder Press, Plank) with biomechanical form validation. |
| 4 | To integrate an **on-device Large Language Model** (Qwen2.5-1.5B) for generating context-aware, single-sentence coaching feedback per repetition. |
| 5 | To implement a **debounce-based repetition counter** that accurately distinguishes correct and incorrect reps with less than 5% false-positive rate. |
| 6 | To build a **video analysis pipeline** for processing uploaded workout videos frame-by-frame, producing detailed reports with per-rep accuracy metrics. |
| 7 | To ensure **100% user privacy** by executing all AI inference (pose detection, LLM, TTS) entirely on-device — no camera data transmitted externally. |
| 8 | To provide **persistent workout tracking** with local storage for guest users and optional Firebase cloud synchronization for authenticated users. |

---

## 3.3 Scope

**In Scope:** Real-time single-person pose tracking, 6 exercise types, on-device LLM coaching with TTS voice output, uploaded video analysis, user authentication (Email/Google/Guest), workout history, PWA support, and dark/light theme.

**Out of Scope:** Multi-person tracking, custom exercise creation by end users, wearable/IoT integration, native mobile app, and nutrition/diet planning.

---

*End of Chapter 3: Problem Statement and Objectives*
