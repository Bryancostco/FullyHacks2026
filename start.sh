#!/bin/sh
# Start the backend API
cd /app/prep_pilot
uvicorn main:app --host 0.0.0.0 --port 8000 &

# Serve the frontend build
cd /app/frontend/dist
python3 -m http.server 3000 &

# Wait for either process to exit
wait
