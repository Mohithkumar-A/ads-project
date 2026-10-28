#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PID=""
FRONTEND_PID=""
OLLAMA_PID=""

stop_services() {
  trap - INT TERM EXIT
  for pid in "$FRONTEND_PID" "$BACKEND_PID" "$OLLAMA_PID"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  for pid in "$FRONTEND_PID" "$BACKEND_PID" "$OLLAMA_PID"; do
    if [[ -n "$pid" ]]; then
      wait "$pid" 2>/dev/null || true
    fi
  done
}

trap stop_services INT TERM EXIT

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required. Install Node.js and npm, then try again." >&2
  exit 1
fi

for app in frontend backend; do
  if [[ ! -d "$ROOT_DIR/$app/node_modules" ]]; then
    echo "Error: $app dependencies are missing. Run 'npm install' in $app first." >&2
    exit 1
  fi
done

echo "Starting ADS Log Investigator..."

# Reuse an Ollama server that is already listening; otherwise start one when installed.
if curl --silent --fail http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  echo "Ollama is already running at http://127.0.0.1:11434"
elif command -v ollama >/dev/null 2>&1; then
  ollama serve &
  OLLAMA_PID=$!
  echo "Started Ollama server (PID $OLLAMA_PID)"
else
  echo "Ollama is not installed; continuing without the local LLM."
fi

(cd "$ROOT_DIR/backend" && npm run dev) &
BACKEND_PID=$!
(cd "$ROOT_DIR/frontend" && npm run dev -- --host 127.0.0.1) &
FRONTEND_PID=$!

echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:5173"
if command -v ollama >/dev/null 2>&1; then
  echo "LLM model: llama3.1:latest (ensure it is downloaded with: ollama pull llama3.1:latest)"
fi
echo "Press Ctrl+C to stop the services started by this script."

wait
