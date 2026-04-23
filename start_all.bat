@echo off
title Lung Cancer Detection - App Starter
echo =======================================================
echo Starting Main Backend (Port 5099)...
cd backend
start "Backend Server" cmd /k "python app.py || echo 'Backend Failed to Start' && pause"

echo Starting ML Engine Server (Port 5001)...
start "ML Backend Server" cmd /k "python api_server.py || echo 'ML Backend Failed to Start' && pause"
cd ..

echo Starting Frontend (Electron)...
cd frontend
start "Frontend Electron" cmd /k "npm run electron:dev || npm start || npm run dev"
cd ..

echo All three services launched in separate windows!
echo =======================================================
