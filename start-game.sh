#!/bin/bash
# Start the game-server mini-service
# Uses script-relative path instead of hardcoded absolute path
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/mini-services/game-server"
exec bun index.ts
