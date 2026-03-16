#!/usr/bin/env bash
# renew-uris.sh — Renew Gemini file URIs before they expire (~48h TTL)
# Designed to run on the VPS host via cron, NOT inside the Docker container.
#
# The app container only has the Next.js standalone build (no scripts/, knowledge_base/, or tsx).
# This script runs directly on the host where the full repo is checked out.
#
# Prerequisites on VPS:
#   1. Node.js 22+ installed on the host (nvm or system)
#   2. npm install (or npm ci) run once in /opt/mentes-sinteticas
#   3. npx tsx available (tsx is a devDependency)
#   4. .env file with GEMINI_API_KEY and DATABASE_URL
#
# Cron example (every 24h at 3 AM):
#   0 3 * * * /opt/mentes-sinteticas/scripts/renew-uris.sh >> /var/log/mentes-uri-renewal.log 2>&1

set -euo pipefail

REPO_DIR="/opt/mentes-sinteticas"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"
ENV_FILE="${REPO_DIR}/.env"

log() { echo "${LOG_PREFIX} $1"; }
log_error() { echo "${LOG_PREFIX} ERROR: $1" >&2; }

# Validate repo directory
if [ ! -d "$REPO_DIR" ]; then
    log_error "Repository directory not found: $REPO_DIR"
    exit 1
fi

cd "$REPO_DIR"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
elif [ -f "${REPO_DIR}/.env.local" ]; then
    set -a
    # shellcheck disable=SC1090
    source "${REPO_DIR}/.env.local"
    set +a
else
    log_error "No .env or .env.local file found in $REPO_DIR"
    exit 1
fi

# Validate required env vars
if [ -z "${GEMINI_API_KEY:-}" ]; then
    log_error "GEMINI_API_KEY is not set"
    exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
    log "WARNING: DATABASE_URL not set — manifest JSON will be updated but DB cache will not"
fi

# Validate knowledge_base exists
if [ ! -d "${REPO_DIR}/knowledge_base" ]; then
    log_error "knowledge_base/ directory not found in $REPO_DIR"
    exit 1
fi

# Validate node/npx available
if ! command -v npx &>/dev/null; then
    # Try common nvm paths
    export NVM_DIR="${HOME}/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
    if ! command -v npx &>/dev/null; then
        log_error "npx not found. Install Node.js on the VPS host."
        exit 1
    fi
fi

# Ensure node_modules exist
if [ ! -d "${REPO_DIR}/node_modules" ]; then
    log "node_modules not found, running npm install..."
    npm install --ignore-scripts 2>&1 || {
        log_error "npm install failed"
        exit 1
    }
fi

log "Starting URI renewal for all minds..."

# Run the ingest script for each mind in knowledge_base/
RENEWAL_FAILED=0
for mind_dir in "${REPO_DIR}/knowledge_base"/*/; do
    [ ! -d "$mind_dir" ] && continue
    mind_name="$(basename "$mind_dir")"

    # Skip hidden directories
    [[ "$mind_name" == .* ]] && continue

    log "Renewing URIs for: ${mind_name}"
    if npx tsx scripts/ingest_mind.ts "$mind_name" 2>&1; then
        log "Completed: ${mind_name}"
    else
        log_error "Failed to renew URIs for: ${mind_name}"
        RENEWAL_FAILED=1
    fi
done

if [ "$RENEWAL_FAILED" -eq 1 ]; then
    log "URI renewal finished with errors (see above)"
    exit 1
else
    log "URI renewal completed successfully"
fi
