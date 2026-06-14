# 02. Folder Structure

The CancerScan repository is divided into two primary directories: `frontend` and `backend`.

## 1. High-Level Architecture

```text
CancerScan/
│
├── frontend/               # React + Electron Desktop App
│   ├── src/                # UI Components and API logic
│   ├── electron/           # Desktop packaging scripts
│   └── package.json        # Node.js dependencies
│
├── backend/                # Flask API + TensorFlow ML Engine
│   ├── routes/             # API Endpoints (Auth, Patients, etc.)
│   ├── database/           # PostgreSQL/SQLite connection logic
│   ├── models_lcscnet_full/# Saved .h5 TensorFlow models
│   ├── uploads/            # Temporary storage for uploaded slides
│   ├── app.py              # Main Flask Entry Point
│   └── api_server.py       # ML Engine Entry Point
│
├── Documentation/          # Project documentation files (You are here)
│
├── start_all.bat           # Local development launch script
└── LOCAL_SETUP_GUIDE.md    # Instructions for running offline
```

## 2. Frontend Detailed Structure

```text
frontend/
├── electron/
│   ├── main.cjs            # Electron window creation and OS integration
│   └── preload.cjs         # Secure bridge between React and Electron
│
├── src/
│   ├── assets/             # Images, icons, and logos
│   ├── components/         # Reusable React components (Buttons, Inputs)
│   ├── config/
│   │   └── api.js          # Auto-detects Render URL vs Localhost URL
│   ├── layouts/            # Page wrappers (Sidebar, Navbar)
│   ├── pages/              # Main screens (Dashboard, Analysis, Admin)
│   ├── services/           # Axios HTTP calls to backend
│   └── App.jsx             # React Router setup
│
├── dist/                   # Built React website (Internal)
└── dist-electron/          # FINAL OUTPUT: Contains the setup .exe file
```

## 3. Backend Detailed Structure

```text
backend/
├── routes/
│   ├── admin_routes.py     # Doctor approval and system stats
│   ├── analysis_routes.py  # Image upload and saving results
│   ├── auth_routes.py      # Login, Register, JWT generation
│   ├── hospital_routes.py  # Google Places autocomplete
│   └── patient_routes.py   # Patient history CRUD
│
├── database/
│   └── db.py               # Handles connection to Neon or Local SQLite
│
├── middleware/
│   └── auth_middleware.py  # @require_auth decorator for route security
│
├── config/
│   └── settings.py         # Loads environment variables
│
├── models_lcscnet_full/
│   └── lcscnet_fold1.h5    # The trained Neural Network model (4.5 MB)
│
├── utils/
│   ├── audit_logger.py     # Logs security events to database
│   └── ...
│
├── app.py                  # Runs on Port 5099. Handles all DB traffic
├── api_server.py           # Runs on Port 5001. Handles all ML traffic
├── auto_seed.py            # Automatically creates Admin account on Render
├── start.sh                # Render cloud startup script
└── requirements.txt        # Python pip dependencies
```

## 4. Key Files to Know

1. **`frontend/src/config/api.js`**: If your app is trying to connect to the wrong server, this is where you fix it. It tells the frontend whether to talk to Render or localhost.
2. **`backend/start.sh`**: This file tells Render *how* to start your app in the cloud. It boots up the ML server, waits 5 seconds, and then boots up the main server.
3. **`backend/database/db.py`**: This file decides whether to use the local SQLite database or the Neon PostgreSQL cloud database based on the `DATABASE_URL` environment variable.
