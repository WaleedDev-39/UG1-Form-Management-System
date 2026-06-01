#!/bin/bash
# Render start script
cd backend
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:$PORT --timeout 120 --access-logfile - --error-logfile -
