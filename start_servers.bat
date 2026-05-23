@echo off
title Start CancerScan Servers

echo Starting Flask Main Backend (Port 5099)...
start cmd /k "cd backend && python app.py"

echo Starting ML Engine Backend (Port 5001)...
start cmd /k "cd backend && python api_server.py"

echo Starting Electron Desktop App...
start cmd /k "cd frontend && npm start"

echo.
echo Both servers are starting in separate windows!
echo Once they are running, you can test the Google Places Autocomplete.
pause
