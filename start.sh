#!/bin/bash
# GramSetu Startup Script

echo "Starting Orchestrator Service (Port 8000)..."
python -m uvicorn services.orchestrator.main:app --host 0.0.0.0 --port 8000 &

echo "Starting Voice Service (Port 8001)..."
python -m uvicorn services.voice.main:app --host 0.0.0.0 --port 8001 &

echo "Starting Agent Service (Port 8002)..."
python -m uvicorn services.agent.main:app --host 0.0.0.0 --port 8002 &

echo "Starting Document Service (Port 8003)..."
python -m uvicorn services.document.main:app --host 0.0.0.0 --port 8003 &

echo "Starting Web Frontend App (Port 3000)..."
cd mobile-app && npx serve -s dist -l 3000 &

echo "All services are up! Tailing logs..."
wait -n

echo "A component crashed. Stopping container."
exit 1
