#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-production}"
REPO_DIR="$HOME/recapp"
LOG_FILE="$HOME/deploy.log"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') - $*" | tee -a "$LOG_FILE" ; }

on_error() {
  local exit_code=$?
  log "❌ Deployment failed (exit ${exit_code})."
  exit "$exit_code"
}
trap on_error ERR INT TERM

log "=== Starting deployment to PROD (branch: ${BRANCH}) ==="

# Sudo check (only needed for docker/compose, ideally)
if ! sudo -n true 2>/dev/null; then
  log "ERROR: Need passwordless sudo for docker/compose."
  exit 1
fi

cd "$REPO_DIR"

log "Fetching origin..."
git fetch origin --prune

log "Checking out ${BRANCH}..."
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH"
git reset --hard "origin/$BRANCH"

DEPLOY_REF="$(git rev-parse HEAD)"
DEPLOY_DESC="$(git show -s --format='%h %ci %d %s' HEAD)"
echo "$(date -Is) branch=$BRANCH ref=$DEPLOY_REF $DEPLOY_DESC" | tee -a "$HOME/deploy.log" >> "$HOME/deploy.refs.log"

log "Installing npm deps (non-root)..."
npm ci 2>&1 | tee -a "$LOG_FILE"

log "Building docker images..."
# Prefer calling compose directly so you don’t depend on opaque npm scripts
sudo docker compose --env-file .env.production -f docker/docker-compose.yaml -f docker/docker-compose.prod.yaml build 2>&1 | tee -a "$LOG_FILE"

log "Bringing services up (recreate if needed)..."
sudo docker compose --env-file .env.production -f docker/docker-compose.yaml -f docker/docker-compose.prod.yaml up -d 2>&1 | tee -a "$LOG_FILE"

log "Health check backend (wait up to 60s)..."

ok=0
for i in {1..30}; do
  if curl -fsS --max-time 2 "http://127.0.0.1:3123/ping" >/dev/null; then
    ok=1
    break
  fi
  sleep 2
done

if [[ "$ok" -ne 1 ]]; then
  log "ERROR: Backend health check failed after retries."
  sudo docker logs --tail 200 docker-backend-1 2>&1 | tee -a "$LOG_FILE"
  exit 1
fi

log "✅ Deployment completed successfully."
