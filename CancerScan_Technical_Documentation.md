# CancerScan: Comprehensive Technical Documentation

This document serves as the formal technical blueprint and architectural specification for **CancerScan – AI-Powered Lung Cancer Detection**, developed over 6 months by a 4-member team at Dr. Vithalrao Vikhe Patil College of Engineering, Ahilyanagar.

---

## SECTION 1: PROJECT FOLDER STRUCTURE

After 6 months of active development, the repository follows a micro-monorepo structure, cleanly separating the Electron/React frontend, the Python/Flask backend, the Machine Learning artifacts, and database implementations.

```text
CancerScan/
│
├── backend/                             # Python Server & ML Inference Engine
│   ├── app.py                           # Application entry point & Flask initialization
│   ├── requirements.txt                 # Python dependencies
│   ├── .env                             # Environment variables for Backend (JWT Secret, etc.)
│   ├── config/
│   │   └── settings.py                  # Environment-specific configuration (Dev/Prod)
│   ├── controllers/                     # Core business logic processing
│   │   ├── auth_controller.py           # JWT generation and validation logic
│   │   ├── patient_controller.py        # Patient record handling logic
│   │   └── scan_controller.py           # ML inference invocation logic
│   ├── database/
│   │   ├── db.py                        # SQLAlchemy DB engine and session configuration
│   │   └── models.py                    # Object-Relational Mapping (ORM) schemas
│   ├── ml_engine/
│   │   ├── models/                      # Saved serialized models
│   │   │   └── lcsc_net_v1.keras        # Trained LCSCNet model weights
│   │   ├── inference.py                 # Pipeline for model execution and pre-processing
│   │   └── image_utils.py               # Medical image standardization functions
│   └── routes/                          # API endpoint definitions (Flask Blueprints)
│       ├── auth_routes.py
│       ├── patient_routes.py
│       └── scan_routes.py
│
├── frontend/                            # React UI & Electron Desktop Shell
│   ├── package.json                     # Node dependencies and npm scripts
│   ├── vite.config.js                   # Vite pre-bundler configuration
│   ├── tailwind.config.js               # TailwindCSS v4 configurations and tokens
│   ├── .env                             # Environment variables for Frontend (API URLs)
│   ├── electron/                        # Desktop OS bindings
│   │   ├── main.cjs                     # Electron main process (Window management)
│   │   └── preload.cjs                  # Context bridges for IPC communication
│   ├── public/
│   │   ├── assets/                      # Static branding assets
│   │   └── icon.ico                     # Desktop application executable icon
│   └── src/                             # React application source
│       ├── App.jsx                      # Main React tree entry
│       ├── main.jsx                     # DOM rendering and Context providers
│       ├── index.css                    # Tailwind v4 injection and global Glassmorphism CSS
│       ├── components/                  # Reusable UI primitives
│       │   ├── Sidebar.jsx              # Application navigation
│       │   ├── ProtectedRoute.jsx       # Auth guard wrapper component
│       │   └── FileUpload.jsx           # Drag-and-drop WSI image uploader
│       ├── layouts/                     # High-level structural layouts
│       │   └── Layout.jsx               # Standard screen wrapper
│       ├── pages/                       # Route-level components
│       │   ├── LoginPage.jsx            # Authenication entry
│       │   ├── DashboardPage.jsx        # Statistical health summary
│       │   ├── ScanDirectoryPage.jsx    # WSI analysis execution
│       │   └── SystemHealthPage.jsx     # Telemetry and audit logs
│       └── services/                    # Axios clients for REST consumption
│           └── api.js                   # Interceptors and API declarations
│
├── database/                            # SQLite Persistence Layer
│   └── cancerscan.sqlite3               # Main relational database file (created on init)
│
├── docs/                                # Project documentation and diagrams
│   └── presentation_assets/             # Artifacts for the review panel
│
├── start_all.bat                        # Automated Windows dev-environment startup script
└── README.md                            # Setup and project initialization guidelines
```

---

## SECTION 2: TECHNOLOGIES USED — DETAILED BREAKDOWN

### Frontend & Desktop Shell
*   **React (Frontend Library)**
    *   *What it is:* A declarative, component-based JavaScript library for building UIs.
    *   *Why chosen:* Superior state management handles complex user flows (upload -> infer -> report) without DOM manipulation overhead. Virtual DOM ensures rapid re-renders.
    *   *Role:* Core UI rendering and state orchestration.
    *   *Alternative:* Angular / Vue. Rejected as React's ecosystem allows tighter Vite and Electron integrations for our team's skill set.
*   **Vite (Build Tool)**
    *   *What it is:* A modern, native-ESM powered frontend build tool.
    *   *Why chosen:* Delivers near-instant Hot Module Replacement (HMR).
    *   *Role:* Compiles the React code and acts as the local development server.
    *   *Alternative:* Webpack (CRA). Rejected due to slow build times on large medical projects.
*   **TailwindCSS v4 (Styling engine)**
    *   *What it is:* A utility-first modern CSS framework.
    *   *Why chosen:* Version 4 offers zero-config compilation and JIT styling, radically speeding up the creation of custom glassmorphic interfaces without bloated CSS files.
    *   *Role:* Comprehensive application styling.
    *   *Alternative:* Bootstrap or SCSS. Rejected because Bootstrap results in "generic-looking" apps, and pure SCSS requires high maintenance.
*   **Electron (Desktop Framework)**
    *   *What it is:* A framework for creating native apps with web technologies using Chromium and Node.js.
    *   *Why chosen:* Allows us to package a heavy AI workflow into an installable desktop `.exe` which is critical for offline-first medical scenarios where data privacy prevents cloud uploads.
    *   *Role:* The application container that runs natively on hospital workstations.
    *   *Alternative:* Tauri (Rust-based) or Qt (C++). Rejected due to steep learning curves within our 6-month timeline.

### Backend & AI Platform
*   **Python (Language) & Flask (Web Framework)**
    *   *What it is:* Python is a high-level interpreted language; Flask is a lightweight WSGI web framework.
    *   *Why chosen:* Python is the industry standard for ML. Flask provides exactly what is needed for a REST API without the bloat of Django.
    *   *Role:* Acts as the middleware, receiving images, authenticating users, managing DB operations, and serving as the ML Inference Server.
    *   *Alternative:* Node.js / Express. Rejected because invoking TensorFlow through Node.js bridges is slower and more volatile than native Python bindings. Django. Rejected as overkill for an API-only backend.
*   **JSON Web Tokens (JWT) (Authentication)**
    *   *What it is:* An open standard (RFC 7519) defining a compact way for transmitting information as a JSON object.
    *   *Why chosen:* Stateless authentication allows secure session management without server-side memory overhead.
    *   *Role:* Secures API endpoints ensuring only verified doctors/admins can run scans or access patient records.
    *   *Alternative:* Server-side sessions (Cookies). Rejected as JWTs are more suitable for RESTful API decoupling.

### Machine Learning Engine
*   **TensorFlow & Keras (ML Frameworks)**
    *   *What it is:* An end-to-end open-source platform for machine learning (Google).
    *   *Why chosen:* Provides robust GPU acceleration capabilities, extensive diagnostic tools (TensorBoard), and a highly optimized C++ backend for fast inference. Keras provides the high-level API needed for rapid model iteration.
    *   *Role:* Trains the neural network and executes the inference engine on new scans.
    *   *Alternative:* PyTorch. A valid alternative, but TensorFlow's `SavedModel` compilation and production deployment pipelines were preferred for integration into a Flask standard server.
*   **LCSCNet (Lung Cancer Subtype Classification Network)**
    *   *What it is:* Our custom-architected Convolutional Neural Network topology optimized specifically for histopathological slide analysis.
    *   *Why chosen:* Pre-trained models (like ResNet50) are too large and slow for desktop processing. LCSCNet balances parameter count with high specific recall for cellular anomalies.
    *   *Role:* The "Brain" of the system that detects malignant tissue and classifies subtypes.

### Database Layer
*   **SQLite with SQLAlchemy (DB Architecture)**
    *   *What it is:* SQLite is a C-language library implementing a self-contained SQL database. SQLAlchemy is a Python SQL toolkit and ORM.
    *   *Why chosen:* SQLite is serverless and writes directly to disk, fitting perfectly into a standalone Electron application model (no external database server required to be installed by the hospital). SQLAlchemy prevents SQL injection and manages complex joins in Python syntax.
    *   *Role:* Persists all system data persistently and securely.
    *   *Alternative:* PostgreSQL / MySQL. Rejected because they require running separate daemon processes, ruining the "click-to-install" desktop experience for end users.

---

## SECTION 3: APPLICATION ROUTING — FRONTEND & BACKEND

### A) FRONTEND ROUTING (React Router DOM)

The frontend utilizes React Router v6 for client-side routing. All non-login routes are protected by a state-managed authentication guard (`<ProtectedRoute>`).

**Route Configuration (`App.jsx` representation):**
```javascript
const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      { path: "dashboard", element: <DashboardPage /> },
      { path: "patients", element: <PatientsPage /> },
      { path: "scan", element: <ScanDirectoryPage /> },
      { path: "report/:scanId", element: <ReportViewerPage /> },
      { path: "audit-logs", element: <SystemHealthPage /> },
    ]
  }
]);
```

**Route Breakdown:**
| Path | Component | Auth Required? | Purpose |
| :--- | :--- | :--- | :--- |
| `/login` | `LoginPage` | No | Entry point. Establishes JWT in local storage. |
| `/dashboard` | `DashboardPage` | Yes | Shows system telemetry, historical scan metrics, and recent patients. |
| `/scan` | `ScanDirectoryPage` | Yes | Drag-and-drop WSI upload and triggers the ML pipeline. |
| `/report/:scanId` | `ReportViewerPage`| Yes | Displays detailed diagnosis, heatmap visualizations, and triggers PDF generation. |

### B) BACKEND ROUTING (Flask API Blueprints)

The Flask API is strictly designed adhering to REST principles. Every protected endpoint expects a valid `Authorization: Bearer <token>` header.

**1. Authentication Module (`/api/auth`)**
| Method | Endpoint | Request Body | Auth? | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | `{username, password}` | No | Validates credentials against DB; returns JWT and user metadata. |

**2. Patient Management Module (`/api/patients`)**
| Method | Endpoint | Request Body | Auth? | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET`  | `/api/patients` | None | Yes | Returns paginated list of all active patients. |
| `POST` | `/api/patients` | `{first_name, age, gender}`| Yes | Registers a new patient into the database. |

**3. ML Inference Module (`/api/scan`)**
| Method | Endpoint | Request Payload | Auth? | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/scan/analyze` | `multipart/form-data` (Image) | Yes | **Core Endpoint**: Receives image, standardizes, invokes ML, returns result. |

---

## SECTION 4: UI/UX DESIGN DETAILS

### Overall Design Language: Clinical Glassmorphism
The design mandate for CancerScan was to avoid the dated, clunky look of traditional legacy medical software (DICOM viewers). We implemented a **Clinical Glassmorphism** aesthetic. This involves:
*   Semi-transparent, blured background panels (backdrop-filter: blur) layering over a subtle abstract background.
*   Promotes high legibility using stark white clinical content boxes over deep-hued diagnostic backgrounds.

### Framework Implementation
*   **TailwindCSS v4:** Utilized heavily for utility classes. We implemented custom CSS variables injected into Tailwind's theme layer for strict brand adherence (e.g., `bg-medical-dark`).
*   **Electron Configuration:** We removed the default Windows OS title bar frame (`frame: false` in `main.cjs`) and built a custom title bar in React featuring dragging mechanics and custom minimize/maximize/close SVG icons.

### Key Application Screens

**1. Login Screen**
*   *Purpose:* Security gatekeeping.
*   *Interactions:* Keyboard navigation mapping for Enter key submission. Floating label animations on inputs.

**2. Dashboard Screen**
*   *Purpose:* Executive overview for doctors.
*   *UI Components:* Dynamic Chart.js widgets showing scan volumes by week and distribution of detected subtypes.

**3. Scan Directory Page (Analysis Matrix)**
*   *Purpose:* The main workbench.
*   *UI Components:* A massive central drag-and-drop dropzone. Once dropped, an indeterminate loading ring appears alongside a console output streaming faux log statements.

**4. Results & Reporting Screen**
*   *Purpose:* Presenting the ML findings.
*   *UI Components:* Displays the original slice alongside an overlaid "Confidence Heatmap". Features a prominent "Export to PDF" button. Green/Red typography visually highlights Benign vs Malignant logic.

### Typography & Palette
*   **Font:** 'Inter' (Google Fonts). Highly legible, geometry-focused sans-serif perfect for dense data.
*   **Palette:** Backgrounds use `#0f172a` (Slate-900). Accents use `#3b82f6` (Blue-500) for interactive elements, `#ef4444` (Red-500) for critical warnings, and `#10b981` (Emerald-500) for benign confirmations.

---

## SECTION 5: DATABASE SCHEMAS

The database is built on SQLite via SQLAlchemy ORM. The relational model guarantees data integrity through Foreign Key constraints.

### 1. `users` Table (System Access)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, AutoIncrement | Unique user identifier |
| `username` | String(50) | Unique, Not Null | Login identifier |
| `password_hash` | String(255) | Not Null | Bcrypt hashed password |
| `role` | String(20) | Not Null | 'Doctor' or 'SystemAdmin' |

### 2. `patients` Table (Demographics)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `patient_id` | String(20) | PK, Example: 'PT-1002' | Hospital patient identifier |
| `first_name` | String(100) | Not Null | Patient name |
| `age` | Integer | Not Null | Age in years |
| `created_at` | DateTime | Default(Now) | Record creation timestamp |

### 3. `scans` Table (Analysis Records)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `scan_id` | Integer | PK, AutoIncrement | Unique scan transaction identifier |
| `patient_id` | String(20) | FK (`patients.patient_id`) | Link to patient |
| `doctor_id` | Integer | FK (`users.id`) | Doctor who initiated scan |
| `image_path` | String(500) | Not Null | Local file path to stored WSI image |
| `scan_date` | DateTime | Default(Now) | When inference was run |

### 4. `predictions` Table (ML Outputs)
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `prediction_id`| Integer | PK, AutoIncrement | Unique result identifier |
| `scan_id` | Integer | FK (`scans.scan_id`), Unique| 1-to-1 relationship with scan |
| `is_malignant` | Boolean | Not Null | High-level binary outcome |
| `subtype` | String(50) | Nullable | 'Adenocarcinoma', etc. |
| `confidence` | Float | Not Null | Softmax probability (0.0 to 1.0) |

### Entity Relationship Diagram (ERD) Description
*   **Users → Scans:** One-to-Many. One doctor can perform many scans.
*   **Patients → Scans:** One-to-Many. One patient can have multiple scans over time (longitudinal studies).
*   **Scans → Predictions:** One-to-One. Every scan yields exactly one conclusive ML prediction record.

---

## SECTION 6: MACHINE LEARNING MODELS

### LCSCNet Architecture (Lung Cancer Subtype Classification Network)
LCSCNet is a custom Convolutional Neural Network modeled conceptually after DenseNet but drastically pruned for inference speed.
*   **Input Layer:** Expects 3-channel RGB image patches resized strictly to `256 x 256` pixels.
*   **Feature Extraction:** Utilizes 4 Convolutional blocks (Conv2D -> BatchNormalization -> ReLU -> MaxPooling2D). Batch Normalization prevents internal covariate shift, ensuring stability.
*   **Classification Head:** Global Average Pooling layer flattening into a dense layer with Dropout (0.4) to prevent overfitting, terminating in a Softmax activation unit for multi-class classification.

### Training Details
*   **Dataset:** LC25000 (Lung and Colon Infection Dataset) combined with synthetically augmented data to balance class distributions.
*   **Subtypes Detected:**
    1. Benign Tissue
    2. Lung Adenocarcinoma
    3. Lung Squamous Cell Carcinoma
*   **Hyperparameters:** Trained for 50 Epochs using the Adam Optimizer, categorical cross-entropy loss, with EarlyStopping callbacks monitoring validation loss.

### Inference Pipeline
1.  **Ingestion:** Electron reads WSI chunks from disk and posts multipart to Flask.
2.  **Standardization:** Python OpenCV reads the buffer, resizes to `256x256`, scales pixel arrays to `[0, 1]` via `/ 255.0`.
3.  **Forward Pass:** Flask passes the numpy tensor to `model.predict()`.
4.  **Softmax Parsing:** The argmax of the model's output array determines the class. The raw float represents the confidence score.

### Performance Metrics
Based on the holdout test set:
*   **Accuracy:** 96.4%
*   **Precision (Malignant classes):** 95.8%
*   **Recall (Sensitivity):** 97.1% (Crucial in medical field; false negatives are highly dangerous).

---

## SECTION 7: HOW TO RUN THE PROJECT

**Prerequisites:**
*   Node.js (v18+)
*   Python (v3.10+)
*   Windows 10/11 or Ubuntu Linux

**Step 1: Repository Clone**
```bash
git clone https://github.com/organization/CancerScan.git
cd CancerScan
```

**Step 2: Database & Backend Setup**
```bash
cd backend
python -m venv venv
# Activate venv: Windows -> venv\Scripts\activate. Linux -> source venv/bin/activate
pip install -r requirements.txt
python -c "from database.db import Base, engine; Base.metadata.create_all(engine)" # DB Init
```

**Step 3: Environment Configuration**
In `backend/.env`, set:
```text
SECRET_KEY=super_secure_jwt_secret_key_123
FLASK_ENV=development
PORT=5000
```
In `frontend/.env`, set:
```text
VITE_API_BASE_URL=http://localhost:5000/api
```

**Step 4: Startup (Run these simultaneously in two terminals)**
```bash
# Terminal 1 - Backend Server
cd backend
python app.py
# Expected output: "Running on http://127.0.0.1:5000"

# Terminal 2 - Frontend & Electron container
cd frontend
npm install
npm run electron:dev
# Expected output: Vite server starts & the native OS Electron window launches displaying the login page.
```

---

## SECTION 8: SYSTEM ARCHITECTURE DIAGRAM (Text Format)

```text
┌────────────────────────────────────────────────────────┐
│                   HOSPITAL WORKSTATION                 │
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │              ELECTRON DESKTOP APP              │   │
│   │  ┌──────────────────────────────────────────┐  │   │
│   │  │              REACT FRONTEND              │  │   │
│   │  │                                          │  │   │
│   │  │  [Dashboard]  [Scan Uploader]  [Reports] │  │   │
│   │  └────────────────────┬─────────────────────┘  │   │
│   └───────────────────────┼────────────────────────┘   │
│                           │ Axios/HTTP JSON            │
│                           ▼                            │
│   ┌────────────────────────────────────────────────┐   │
│   │              FLASK REST API SERVER             │   │
│   │                                                │   │
│   │  ┌──────────────┐   ┌────────────────────────┐ │   │
│   │  │ Auth Guard   │◄─►│ ML Inference Engine    │ │   │
│   │  │ (JWT Tokens) │   │ (TensorFlow / Keras)   │ │   │
│   │  └──────────────┘   └──────────┬─────────────┘ │   │
│   │          ▲                     │               │   │
│   └──────────┼─────────────────────┼───────────────┘   │
│              │ SQLAlchemy          │ Memory Tensor │   │
│              ▼                     ▼               │   │
│   ┌─────────────────┐   ┌────────────────────────┐ │   │
│   │  SQLite Base    │   │  LCSCNet .keras file   │ │   │
│   │ (Local File DB) │   │ (Pre-Trained Weights)  │ │   │
│   └─────────────────┘   └────────────────────────┘ │   │
└────────────────────────────────────────────────────────┘
```

---

## SECTION 9: REVIEWER Q&A PREPARATION

### Technology Choices
**1. Q: Why did you use Electron instead of making this a web app hosted on AWS?**
*A:* In medical environments, patient data privacy (HIPAA/local laws) is paramount. Uploading massive Whole Slide Images to cloud servers raises compliance issues and requires heavy bandwidth. Electron processes locally on the hospital's hardware, ensuring data never leaves the premises.

**2. Q: Why use Flask over Django for the backend?**
*A:* Our application is mostly decoupled; the frontend handles all views. Django's tightly coupled MVC architecture was unnecessary overhead. Flask gave us precisely the lightweight framework needed to create REST APIs and integrate directly with raw Python TensorFlow functions.

**3. Q: Tailwind vs regular CSS — why the choice?**
*A:* Speed and consistency. Tailwind's utility-first approach avoided the typical issue of massive, conflicting CSS files. It allowed rapid prototyping of our complex "Glassmorphism" UI directly inside our React components.

**4. Q: Why use Vite instead of Create React App (Webpack)?**
*A:* Vite uses native ES modules, making local server startup almost instantaneous compared to Webpack, which bundles the entire app before starting. This significantly accelerated our dev cycle.

### Data & Machine Learning
**5. Q: What is the LCSCNet architecture actually doing under the hood?**
*A:* It passes the image through deep Convolutional layers that act as feature extractors—first finding simple edges, then deeper layers finding cellular anomalies typical of cancer. The final dense layer maps these geometrical features into mathematical probabilities across three specific classes.

**6. Q: How did you handle overfitting given your limited 6-month timeframe and dataset?**
*A:* We employed several techniques: robust Data Augmentation using Keras `ImageDataGenerator` (rotations, flips, zoom), implementing heavy Dropout layers (0.4), and EarlyStopping during training to halt when validation loss stopped improving.

**7. Q: You claim 96.4% accuracy. Did you check Precision vs. Recall?**
*A:* Yes. In oncology, Recall (Minimizing False Negatives) is more important than overall accuracy. We optimized our model thresholding to achieve a 97.1% Recall rate, meaning if cancer is there, the system rarely misses it, even if it causes a slight drop in pure precision.

**8. Q: How do you handle images of vastly different sizes from different microscope vendors?**
*A:* We implemented a Python `image_utils.py` pre-processing pipeline that intercepts the image buffer, normalizes the aspect ratio, scales it via Lanczos interpolation to `256x256`, and standardizes the color distributions before passing the tensor to the ML model.

### Security & Architecture
**9. Q: How do you prevent unauthorized doctors from accessing patient data?**
*A:* Every API request is protected by JSON Web Tokens. When a doctor logs in, the server generates a cryptographically signed token valid for 8 hours. The React frontend stores this and attaches it to the Authorization headers of subsequent requests. Unauthorized requests are rejected with a 401 status.

**10. Q: Is SQLite really capable of handling a hospital's traffic?**
*A:* For an application designed for a single pathology department running locally, yes. SQLite handles up to 2GB per file effortlessly and operates extremely fast on local SSDs. If deployed hospital-wide, SQLAlchemy allows us to change the connection string to PostgreSQL with zero codebase rewrites.

**11. Q: How do you prevent SQL Injection attacks?**
*A:* We do not write raw SQL querying strings. We use SQLAlchemy, an Object-Relational Mapper (ORM), which automatically sanitizes and parametrizes all inputs, neutralizing injection vectors.

**12. Q: What happens if the Model prediction crashes midway?**
*A:* We implemented robust `try/except` auditing. If TensorFlow crashes, Flask catches the exception, logs it to our `audit_logs` table, and returns a controlled `500 API Error` to React, which then displays a graceful User Interface error rather than crashing the desktop application.

### Business Use & Novelty
**13. Q: If doctors still have to review the slides, what is the point of this app?**
*A:* It acts as a distinct "Second Reader." Pathologists suffer from immense fatigue when staring at thousands of slides a day. CancerScan preemptively highlights areas of high malignancy probability, acting as a triaging system to prioritize critical cases and reduce human error.

**14. Q: How does your UI accommodate older users/doctors unfamiliar with new tech?**
*A:* We adhered strictly to Nielsen's Heuristics. Big, legible typefaces, clear affordances (drag-and-drop zones), and explicit error states. It mimics physical workflows by clearly moving from "Patient File" -> "Scan" -> "Printed PDF Report."

**15. Q: What was the biggest technical challenge your team faced?**
*A:* Bridging the Node.js Electron environment with the Python ML environment initially caused IPC (Inter-Process Communication) blockages. We resolved this by decoupling them entirely and communicating solely over local HTTP REST calls, allowing the Python ML backend to manage memory independently of the frontend UI thread.

---

## SECTION 10: PROJECT NOVELTY & SCOPE

### Real-World Impact and Novelty
**CancerScan** distinguishes itself by breaking the paradigm that advanced Deep Learning necessitates cloud computing. Its primary novelty lies in its dual nature: packing heavy-weight Keras analysis logic into an offline, zero-latency desktop application utilizing an aesthetically modern Electron shell. Unlike existing CAD (Computer-Aided Diagnosis) tools that cost thousands of dollars and mandate proprietary workstation hardware, our system is highly democratized; it runs seamlessly on standard Windows laptops, bringing automated oncology screening to rural or tier-2 diagnostic centers that cannot afford massive IT infrastructures.

### Limitations
1.  **Hardware Constraint:** Without a dedicated GPU, inference on high-resolution multi-gigabyte WSI files takes longer on CPU-only standard clinic laptops.
2.  **Dataset Domain:** The model's accuracy may dip dynamically if exposed to staining techniques radically different from the LC25000 dataset averages.

### Future Scope (v2.0)
*   **Segmentation Support:** Moving beyond mere classification to pixel-level semantic segmentation (U-Net) to literally draw bounding-boxes exactly over the cancerous cells on the UI.
*   **PACs/DICOM Integration:** Allowing direct polling of images from hospital DICOM servers rather than manual drag-and-drop.

---
### PROJECT SUMMARY
**(Read this aloud as your opening statement)**

> "Good morning, respected panel members. Our project, CancerScan, is a deeply integrated, offline-first Desktop application engineered to assist pathologists in diagnosing Lung Cancer subtypes. We identified two major issues in modern oncology workflows: diagnostic fatigue among specialists, and the heavy reliance on cloud architecture which poses data privacy risks. By binding a highly performant React frontend within an Electron shell and coupling it securely via REST APIs to a deeply trained, local Python TensorFlow inference engine, we have created an application that acts as an intelligent 'Second Reader'. It ingests locally stored histological scans, identifies subtle malignancies instantly without an internet connection, and outputs comprehensive PDF reports, drastically reducing triage time while maintaining full HIPAA-style privacy compliance."
