#!/bin/bash
# Watchdog: auto-restart Next.js dev server on crash
# Uses script-relative path instead of hardcoded absolute path
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
while true; do
  cd "$SCRIPT_DIR" && npx next dev -p 3000 2>&1 | tee "$SCRIPT_DIR/dev.log"
  echo "Server died, restarting in 2s..."
  sleep 2
done
