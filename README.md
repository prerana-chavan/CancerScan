# 🔬 CancerScan: AI-Powered Lung Cancer Detection System

<div align="center">
  
  **An offline-first, Electron-based desktop application engineered to assist pathologists in diagnosing Lung Cancer subtypes using Deep Learning.**
</div>

---

## 📖 Overview

**CancerScan** is a comprehensive medical imaging platform developed to solve two major issues in modern oncology workflows: **diagnostic fatigue** among specialists, and the heavy reliance on **cloud architecture** which poses patient data privacy risks.

By binding a highly performant React frontend within an Electron shell and coupling it securely via REST APIs to a deeply trained, local Python TensorFlow inference engine, CancerScan acts as an intelligent "Second Reader." It ingests locally stored histological scans, identifies subtle malignancies instantly without an internet connection, and outputs comprehensive PDF reports.

### 🌟 Key Features

*   **🧠 Offline AI Inference:** Run complex Deep Learning models entirely locally. Patient data never leaves the hospital's network, ensuring strict HIPAA-style privacy compliance.
*   **🩺 Subtype Classification:** Detects and classifies histopathological tissue into:
    *   Benign Tissue
    *   Lung Adenocarcinoma
    *   Lung Squamous Cell Carcinoma
*   **📊 Clinical Glassmorphism UI:** A sleek, modern interface prioritizing legibility, speed, and reduced cognitive load for doctors.
*   **📑 Automated PDF Reporting:** Generate detailed diagnostic reports complete with heatmaps and patient metadata instantly.
*   **🔐 Role-Based Access Control:** Secure JWT authentication separating Doctors and System Administrators.
*   **📈 Telemetry & Audit Logs:** Built-in tracking of system usage, diagnosis volumes, and security events.

---

## 🛠️ Technology Stack

**Frontend & Desktop Shell:**
*   **React + Vite:** For an ultra-fast, component-driven UI architecture.
*   **TailwindCSS:** Utility-first styling for complex clinical dashboards.
*   **Electron:** Packages the web app into a native Windows/Linux executable.

**Backend & ML Inference:**
*   **Python + Flask:** Lightweight, fast REST API middleware.
*   **TensorFlow & Keras:** Powers the **LCSCNet** (Lung Cancer Subtype Classification Network) inference pipeline.
*   **SQLite + SQLAlchemy:** A self-contained, serverless database mapping complex patient and scan relationships.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18.0 or higher)
*   Python (v3.10 or higher)
*   Windows 10/11 or Ubuntu Linux

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/prerana-chavan/CancerScan.git
   cd CancerScan
   ```

2. **Backend Setup (Python Server):**
   ```bash
   cd backend
   python -m venv venv
   # Activate virtual environment
   # Windows: venv\Scripts\activate
   # Mac/Linux: source venv/bin/activate
   pip install -r requirements.txt
   
   # Initialize the SQLite Database
   python -c "from database.db import Base, engine; Base.metadata.create_all(engine)"
   ```

3. **Frontend Setup (Electron & React):**
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

For a fully automated startup on Windows, you can simply run the provided batch script from the root directory:
```cmd
start_all.bat
```

**Manual Startup (requires two terminal windows):**

Terminal 1 (Backend):
```bash
cd backend
python app.py
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run electron:dev
```

---

## 🧠 Machine Learning Performance

Based on the LC25000 holdout test set, the LCSCNet architecture yields the following clinical metrics:
*   **Accuracy:** 96.4%
*   **Precision (Malignant classes):** 95.8%
*   **Recall / Sensitivity:** 97.1% *(Optimized specifically to reduce false negatives)*

---

## ⚖️ Disclaimer

**CancerScan is designed strictly as a Computer-Aided Diagnosis (CAD) tool to assist trained medical professionals.** It is a "Second Reader" triaging system and should **never** be used as a standalone diagnostic authority. All final medical determinations must be made by a certified pathologist.

---
*Developed as a Major Engineering Project.*
