#!/bin/zsh
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_URL="http://localhost:3000"
HEALTH_URL="$APP_URL/api/health"

cd "$APP_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install it first, then run this launcher again."
  exit 1
fi

if [ ! -d "$APP_DIR/node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
  open "$APP_URL"
  echo "Daily Log is already running at $APP_URL"
  exit 0
fi

echo "Starting Daily Log..."
npm start > "$APP_DIR/daily-log.log" 2>&1 &
SERVER_PID=$!

for attempt in {1..30}; do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    open "$APP_URL"
    echo "Daily Log opened at $APP_URL"
    echo "Keep this Terminal window open while using Daily Log."
    wait "$SERVER_PID"
    exit 0
  fi
  sleep 0.3
done

echo "Daily Log did not start. Last log lines:"
tail -40 "$APP_DIR/daily-log.log"
exit 1
