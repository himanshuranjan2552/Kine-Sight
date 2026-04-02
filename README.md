# 🏋️‍♂️ Kine-Sight: Your AI-Powered Digital Fitness Trainer

[![Live Demo](https://img.shields.io/badge/Live_Demo-kine--sight.vercel.app-blue?style=for-the-badge)](https://kine-sight.vercel.app)

**Kine-Sight** is a cutting-edge digital fitness trainer with an "eye." By leveraging on-device Vision-Language Models (VLMs), it watches your form, tracks your progress, catches your mistakes, and provides real-time, actionable feedback to help you perfect your fitness journey. 

Everything runs **100% locally in your browser** via WebAssembly—meaning zero server costs, zero API keys, and complete privacy for your camera feed.

## ✨ Features

- **👀 Real-Time Vision Tracking:** Uses your device's camera to analyze your posture, reps, and movements in real-time.
- **🗣️ Interactive Feedback:** Get instant corrections and motivational feedback when your form breaks down.
- **🔒 100% Private & Secure:** Powered by `@runanywhere/web`, all AI inference happens locally on your device. Your camera feed never leaves your browser.
- **⚡ Blazing Fast On-Device AI:** Utilizes optimized WASM engines to run Vision (LFM2-VL) and Text (LFM2) models directly in the web browser.
- **🎙️ Voice Integration:** Speak to your AI trainer naturally, and it will respond via text-to-speech.

[![YouTube Demo](https://img.shields.io/badge/YouTube-Watch_Demo-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/watch?v=egs9YfF6UwM)

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Styling:** CSS / HTML5
- **Local AI Engine:** `@runanywhere/web` (llama.cpp, whisper.cpp, sherpa-onnx)
- **Deployment:** Vercel

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A modern web browser (Chrome 120+ or Edge 120+ recommended)

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/himanshuranjan2552/Kine-Sight.git](https://github.com/himanshuranjan2552/Kine-Sight.git)
   cd Kine-Sight
2. **Install dependencies:**
   ```bash
   npm install
3. **Start the development server:**
   ```bash
   npm run dev
4. **Open in Browser:**
   Navigate to http://localhost:5173.

(Note: AI Models will be downloaded on first use and cached locally in your browser's Origin Private File System).


## 🧠 How It Works Under the Hood

- Kine-Sight is built on top of the **RunAnywhere SDK**. It uses a combination of powerful local models.
- **VLM** (Vision-Language Model): Captures frames from your webcam and analyzes your body positioning.
- **LLM** (Large Language Model): Processes the vision data to formulate encouraging text or corrective instructions.
- **Voice Pipeline** (VAD, STT, TTS): Allows you to ask the trainer questions hands-free while working out.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute.
1. Fork the Project
2. Create your Feature Branch `git checkout -b feature/AmazingFeature`
3. Commit your Changes `git commit -m 'Add some AmazingFeature'`
4. Push to the Branch `git push origin feature/AmazingFeature`
5. Open a Pull Request

## 📄 License
This project is licensed under the MIT License.
---
Built with ❤️ to make fitness smarter, safer, and more accessible.
