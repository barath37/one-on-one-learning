# 🎓 Gurukul - One-on-One Adaptive Learning Platform

> **H26EDU03 - Gurukul Learning**
>
> Built at **NIT Tiruchirappalli** | Organised by **Tata Centre for Artificial Intelligence and Machine Learning**

An AI-powered one-on-one tutoring platform that builds fully personalised learning roadmaps for any concept. Gurukul adapts in real-time to each learner's interests, pace, regional dialect, and cognitive profile — just like a real Gurukul teacher sitting beside you.

---

## ✨ Features

### 🧠 Adaptive AI Tutoring
- **Psychometric Onboarding** — A five-question behavioural assessment that determines learning maturity, pacing preference, and resilience score before any teaching begins.
- **Dynamic Persona Engine** — The AI tutor adjusts its tone, metaphor domain, dialect, and pacing speed per learner. A cricket-loving Tamil learner gets cricket analogies in a warm tone; a fast-paced engineering student gets concise, challenging delivery.
- **Daily Relevance Check-in** — A "talk of the town" icebreaker each day keeps the learner engaged, plus an irrelevant attention-check question to detect drift.

### 📚 Intelligent Topic Classification
- **CHITCHAT / SIMPLE / COMPLEX** — Every learner query is auto-classified. Simple topics get a quick 3-question prerequisite gate before teaching. Complex or cross-domain topics trigger a full curriculum builder.
- **Prerequisite Gate & Auto-Escalation** — If a learner fails prerequisites, the system auto-generates a structured multi-module curriculum to build them up from the foundations.

### 🗂️ Curriculum Builder (Tracks)
- **Iterative Drafting** — Complex topics go through an AI-driven curriculum drafting loop. The learner can refine the structure before finalising.
- **Module → Submodule Hierarchy** — Finalised curricula are broken into Modules and Submodules, each with auto-generated learning material, Mermaid.js diagrams, and application-based assignments.
- **No-Retry Frustration Handling** — If a learner fails twice on a submodule, the system quietly falls back to a prerequisite concept (implicit repair) without calling out the failure.

### 🎙️ Voice & Multimodal
- **Text-to-Speech (Edge TTS)** — Natural, Indian-accented voice output using Microsoft Edge TTS with emotional prosody.
- **Voice Input** — Browser-native Web Speech API for hands-free interaction.
- **Whiteboard + AI Vision** — A freehand digital whiteboard where learners can draw diagrams or write equations, then ask the AI to analyse their drawing using NVIDIA Vision API.

### 🔬 AR / Computer Vision Demo
- **OpenCV Hand-Tracking Simulator** — An augmented-reality demo using MediaPipe hand tracking. Learners pinch and drag virtual elements in real-time — bridging physical experimentation with digital learning. (Yet to be completed)

### 📖 History & Library
- **Mistake Log** — Full history of incorrect answers with AI feedback, enabling targeted revision.
- **Topics Explored** — A library of every topic the learner has studied, with quick access to revisit.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.13, Django 6.x, Django REST (function-based views) |
| **Frontend** | React 19 (Vite 8), Tailwind CSS 4, Lucide Icons, Mermaid.js |
| **AI / LLM** | NVIDIA NIM API (Meta LLaMA 3.1 70B), Ollama (local fallback) |
| **Vision AI** | NVIDIA Vision API (LLaMA 3.2 11B Vision Instruct) |
| **TTS** | Microsoft Edge TTS (edge-tts) |
| **CV / AR** | OpenCV, MediaPipe Hand Landmarker |
| **Database** | SQLite (development) |
| **Environment** | python-dotenv for secrets management |

---

## ⚙️ Setup & Installation

### Prerequisites

- **Python 3.10+** installed and available in PATH
- **Node.js 18+** and npm installed
- **Git** installed
- An **NVIDIA NIM API Key** (get one at [build.nvidia.com](https://build.nvidia.com))

---

### 1. Clone the Repository

```bash
git clone https://github.com/barath37/one-on-one-learning.git
cd one-on-one-learning
```

---

### 2. Set Up the Python Virtual Environment

Create and activate a virtual environment:

```bash
python -m venv .venv
```

**Activate it (Windows PowerShell):**

```powershell
.venv\Scripts\Activate.ps1
```

> **Note:** If you get a script execution policy error, run this first:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

---

### 3. Install Python Dependencies

With the virtual environment activated, install all required libraries:

```bash
pip install -r requirements.txt
```

This installs: `django`, `django-cors-headers`, `python-dotenv`, `openai`, `edge-tts`, `requests`, `opencv-python`, `mediapipe`, `numpy`

---

### 4. Create the `.env` File (API Keys)

Create a file named `.env` in the **project root directory** (same folder as `manage.py`):

```bash
# On Windows (PowerShell):
New-Item -Path .env -ItemType File
```

Open the `.env` file and add your NVIDIA API key:

```env
NVIDIA_API_KEY=nvapi-your-actual-nvidia-api-key-here
```

**How to get your NVIDIA API Key:**

1. Go to [https://build.nvidia.com](https://build.nvidia.com)
2. Sign in or create a free NVIDIA account
3. Navigate to any NIM model (e.g., LLaMA 3.1 70B Instruct)
4. Click **"Get API Key"** and copy the key
5. Paste it into your `.env` file

> ⚠️ **IMPORTANT:** The `.env` file is listed in `.gitignore` and will **never** be pushed to GitHub. Never share your API key publicly.

---

### 5. Run Database Migrations

```bash
python manage.py migrate
```

---

### 6. Running the Application

You need **two terminals** running simultaneously — one for the backend, one for the frontend.

#### Terminal 1 — Backend (Django)

```powershell
# Activate the virtual environment
.venv\Scripts\Activate.ps1

# Start the Django development server
python manage.py runserver
```

The backend will start at: **http://127.0.0.1:8000**

#### Terminal 2 — Frontend (React + Vite)

```powershell
# Activate the virtual environment (for consistency)
.venv\Scripts\Activate.ps1

# Navigate to the frontend directory
cd frontend

# Install Node.js dependencies (first time only)
npm install

# Start the Vite dev server
npm run dev
```

The frontend will start at: **http://localhost:5173**

---

### 7. Open the Application

Open your browser and navigate to:

```
http://localhost:5173
```

You should see the Gurukul landing page. Click **"Get Started"** to begin the onboarding flow.

---

## 📁 Project Structure

```
one-on-one-learning/
├── config/                  # Django project configuration
│   ├── settings.py          # Django settings (INSTALLED_APPS, middleware, DB)
│   ├── urls.py              # Root URL routing
│   └── wsgi.py              # WSGI application entry point
├── core/                    # Main Django app — all backend logic
│   ├── models.py            # Database models (LearnerProfile, Track, Module, etc.)
│   ├── views.py             # All API endpoints + LLM/TTS logic
│   ├── urls.py              # API route definitions
│   └── apps.py              # Django app config
├── cv_demo/                 # OpenCV AR circuit simulator (standalone)
│   ├── main.py              # Entry point for the hand-tracking demo
│   ├── hand_tracker.py      # MediaPipe hand landmark detection
│   ├── circuit.py           # Circuit rendering with electron flow animation
│   ├── components.py        # Draggable conductor/insulator components
│   └── config.py            # Visual constants (colours, thresholds)
├── frontend/                # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx          # Complete frontend application
│   │   ├── Dashboard.jsx    # Dashboard UI components
│   │   ├── App.css          # Component styles
│   │   └── index.css        # Global styles
│   ├── package.json         # Node.js dependencies
│   └── vite.config.js       # Vite configuration
├── .env                     # API keys (NOT tracked by Git)
├── .gitignore               # Git ignore rules
├── manage.py                # Django CLI entry point
├── requirements.txt         # Python dependencies
└── README.md                # This file
```

---

## 🎬 Demo

A full video walkthrough of the platform is included in the repository:

📹 **[Video Demo.mp4](./Video%20Demo.mp4)**

---

## 👥 Team

**H26EDU03 — Gurukul Learning**

| Name | Role |
|---|---|
| **Barath Kumar S** | Developer |
| **Nagella Venkata Siva Sai Advik** | Developer |

---

## 🏛️ Acknowledgements

This project was developed at the **National Institute of Technology, Tiruchirappalli (NIT Trichy)**, as part of an initiative organised by the **Tata Centre for Artificial Intelligence and Machine Learning**.
---

## 📄 License

This project was built as part of an educational initiative at NIT Trichy. All rights reserved by the team.
