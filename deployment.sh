#!/usr/bin/env bash
#
# deploy_recapp_to_test.sh
# This script deploys the RecApp application to the test environment.
# It assumes:
#  - The deploy user has passwordless sudo for the needed npm/docker commands.
#  - $HOME is the home directory of that user, and ~/recapp is the app folder.
#  - npm scripts: stop:docker:prod, build:docker:prod, start:docker:prod exist in package.json.
#  - set -e is in effect, so any command failing will abort the script.

set -euo pipefail

BRANCH="${1:?Usage: deployment.sh <branch>}"

# Define log file and rotation parameters
# The log file will be stored in the user's home directory.
# It will rotate when it exceeds 10 MB, keeping the last 3 old logs.
# The log file will be named deploy.log, and old logs will be named deploy.log.1, deploy.log.2, etc.
# The log rotation will be handled by the rotate_logs function.
LOG_DIR="$HOME"
LOG_FILE="$LOG_DIR/deploy.log"
MAX_LOG_SIZE=$((10 * 1024 * 1024))   # 10 MB
MAX_OLD_LOGS=3

rotate_logs() {
  # If deploy.log does not exist, nothing to rotate
  [ -f "$LOG_FILE" ] || return 0

  local actual_size
  actual_size=$(stat -c%s "$LOG_FILE")
  if [ "$actual_size" -le "$MAX_LOG_SIZE" ]; then
    return 0
  fi

  # Shift old logs: deploy.log.2 -> deploy.log.3, deploy.log.1 -> deploy.log.2, deploy.log -> deploy.log.1
  if [ -f "$LOG_DIR/deploy.log.$((MAX_OLD_LOGS - 1))" ]; then
    rm -f "$LOG_DIR/deploy.log.$((MAX_OLD_LOGS - 1))"
  fi

  for (( i=MAX_OLD_LOGS-1; i>=1; i-- )); do
    if [ -f "$LOG_DIR/deploy.log.$i" ]; then
      mv "$LOG_DIR/deploy.log.$i" "$LOG_DIR/deploy.log.$((i + 1))"
    fi
  done

  mv "$LOG_FILE" "$LOG_DIR/deploy.log.1"
  : > "$LOG_FILE"
  echo "$(date '+%Y-%m-%d %H:%M:%S') - Log rotated: previous log moved to deploy.log.1" >> "$LOG_FILE"
  return 0
}

# Rotate logs if necessary
rotate_logs
echo "test end"
# Append a timestamped message to both the log file and stdout
log() {
  local msg="$1"
  echo "$(date '+%Y-%m-%d %H:%M:%S') - ${msg}" | tee -a "$LOG_FILE"
}

# On any unexpected exit (non-zero), log it
on_error() {
  local exit_code=$?
  log "❌ Deployment script exited with code ${exit_code}."
  exit "${exit_code}"
}
trap on_error ERR

log "=== Starting deployment to test environment ==="

# Verify sudo privileges (without a password prompt)
if ! sudo -n true 2>/dev/null; then
  log "ERROR: This script requires passwordless sudo privileges. Exiting."
  exit 1
fi

# Ensure the recapp directory exists
REPO_DIR="$HOME/recapp"
if [ ! -d "$REPO_DIR" ]; then
  log "ERROR: Directory '$REPO_DIR' not found. Cannot deploy."
  exit 1
fi

cd "$REPO_DIR"

log "Fetching origin..."
git fetch origin --prune

log "Checking out branch '$BRANCH' (force)..."
git checkout --force -B "$BRANCH" "origin/$BRANCH"
  
# 1) Stop the existing Docker production container
log "Stopping existing production container..."
sudo npm run stop:docker:prod 2>&1 | tee -a "$LOG_FILE"

# 2) Install dependencies (CI)
log "Installing npm dependencies for CI..."
sudo npm ci 2>&1 | tee -a "$LOG_FILE"

# 3) Build the Docker image for production
log "Building Docker image for production..."
sudo npm run build:docker:prod 2>&1 | tee -a "$LOG_FILE"

# 4) Start the new production container
log "Starting new production container..."
sudo npm run start:docker:prod 2>&1 | tee -a "$LOG_FILE"

log "✅ Deployment to test environment completed successfully."
exit 0
