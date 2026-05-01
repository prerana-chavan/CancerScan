#!/bin/bash
# 1. Run the auto-seed to ensure Admin account exists
python auto_seed.py

# 2. Start the ML Server in the background
# api_server.py is hardcoded to 5001, we do not need to change PORT
python api_server.py &

# Wait 5 seconds for the ML server to initialize
sleep 5

# 3. Start the Main API Server in the foreground
# Render automatically provides the $PORT variable (usually 10000)
gunicorn app:app --bind 0.0.0.0:$PORT --timeout 120
