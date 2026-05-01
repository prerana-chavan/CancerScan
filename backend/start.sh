#!/bin/bash
# 1. Run the auto-seed to ensure Admin account exists (Fixes Render DB Wipe)
python auto_seed.py

# 2. Start the ML Server in the background on its hardcoded port (5001)
export PORT=5001
python api_server.py &

# Wait 5 seconds for the ML server to initialize and load the model
sleep 5

# 3. Start the Main API Server in the foreground using the Render-assigned port
export PORT=$RENDER_PORT
# We use gunicorn instead of python app.py for production stability
gunicorn app:app --bind 0.0.0.0:$RENDER_PORT --timeout 120
