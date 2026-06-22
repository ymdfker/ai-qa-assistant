#!/bin/bash
set -e
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cleanup() {
    echo "Shutting down..."
    kill $FRONTEND_PID 2>/dev/null; kill $KEYMONITOR_PID 2>/dev/null
    wait $FRONTEND_PID 2>/dev/null
    echo "Stopped."
}
trap cleanup EXIT INT TERM

export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

echo "========================================="
echo "  AI Q&A Assistant — Development Mode"
echo "========================================="

echo "[0/3] Building native keymonitor..."
cd "$PROJECT_DIR/electron/native"
if [ ! -f keymonitor ] || [ keymonitor.m -nt keymonitor ]; then
    clang -o keymonitor keymonitor.m -framework Cocoa -framework Carbon -Os
fi
echo "       Native helper ready ✓"

echo "[1/3] Building Electron TypeScript..."
cd "$PROJECT_DIR/electron"
npx tsc
echo "       Electron build complete ✓"

echo "[2/3] Starting Vue frontend..."
cd "$PROJECT_DIR/frontend"
npx vite --host &
FRONTEND_PID=$!
for i in $(seq 1 10); do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then echo "       Frontend ready ✓"; break; fi
    sleep 1
done

echo "[3/3] Starting Electron..."
cd "$PROJECT_DIR/electron"
export NODE_ENV=development
npx electron dist/main.js &
ELECTRON_PID=$!

echo ""
echo "========================================="
echo "  All services running!"
echo "  Frontend: http://localhost:5173"
echo "  Electron: GUI window"
echo "  Press Ctrl+C to stop all"
echo "========================================="

wait $ELECTRON_PID 2>/dev/null
