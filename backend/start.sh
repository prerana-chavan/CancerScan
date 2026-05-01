#!/bin/bash
# 1. Run the auto-seed to ensure Admin account exists
python auto_seed.py

# 2. Tell api_server.py it's running on Render (disables debug mode)
export RENDER=true

# 3. Start the ML Server in the background
python api_server.py &

# 4. Wait for TensorFlow to fully load the model
# TF needs 30-60 seconds on a free-tier CPU server.
echo "Waiting for ML model to load..."
sleep 45

# 5. Start the Main API Server in the foreground
# --timeout 300 gives TF enough time for the first (cold) prediction.
# --workers 1 keeps RAM usage minimal on the 512MB free tier.
gunicorn app:app --bind 0.0.0.0:$PORT --timeout 300 --workers 1
