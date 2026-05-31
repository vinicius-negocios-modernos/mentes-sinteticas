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

# ── Alerting (SYS-16) ────────────────────────────────────────────────
# A cron failure must NOT be silent. alert() always emits a clearly-marked
# ERROR line (grep-able for log-based alarms) and, when configured, fans out to:
#   1. ALERT_WEBHOOK_URL — a POST with a JSON payload (Slack/Discord/generic).
#   2. Sentry — via scripts/report-cron-failure.ts (reuses the app's wired SDK)
#      when SENTRY_DSN is set and Node is available.
# Dependency-light: webhook uses curl if present; Sentry path is best-effort.
alert() {
    local reason="$1"
    # Always: a machine-grep-able marker line on stderr.
    echo "${LOG_PREFIX} CRON_ALERT renew-uris: ${reason}" >&2

    if [ -n "${ALERT_WEBHOOK_URL:-}" ] && command -v curl &>/dev/null; then
        local payload
        payload=$(printf '{"text":"[mentes-cron] renew-uris FAILED: %s","source":"renew-uris.sh","host":"%s"}' \
            "$(echo "$reason" | tr '"' "'" | tr -d '\n')" "$(hostname 2>/dev/null || echo unknown)")
        curl -fsS --max-time 10 -X POST \
            -H "Content-Type: application/json" \
            -d "$payload" "$ALERT_WEBHOOK_URL" >/dev/null 2>&1 \
            && log "Alert posted to webhook." \
            || log_error "Webhook alert POST failed (reason still logged above)."
    fi

    if [ -n "${SENTRY_DSN:-}" ] && command -v npx &>/dev/null \
        && [ -f "${REPO_DIR}/scripts/report-cron-failure.ts" ]; then
        CRON_NAME="renew-uris" CRON_ERROR="$reason" \
            npx tsx "${REPO_DIR}/scripts/report-cron-failure.ts" >/dev/null 2>&1 \
            && log "Alert captured to Sentry." \
            || log_error "Sentry alert capture failed (reason still logged above)."
    fi
}

# Validate repo directory
if [ ! -d "$REPO_DIR" ]; then
    log_error "Repository directory not found: $REPO_DIR"
    alert "Repository directory not found: $REPO_DIR"
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
    alert "No .env or .env.local file found in $REPO_DIR"
    exit 1
fi

# Validate required env vars
if [ -z "${GEMINI_API_KEY:-}" ]; then
    log_error "GEMINI_API_KEY is not set"
    alert "GEMINI_API_KEY is not set"
    exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
    log "WARNING: DATABASE_URL not set — manifest JSON will be updated but DB cache will not"
fi

# Validate knowledge_base exists
if [ ! -d "${REPO_DIR}/knowledge_base" ]; then
    log_error "knowledge_base/ directory not found in $REPO_DIR"
    alert "knowledge_base/ directory not found in $REPO_DIR"
    exit 1
fi

# Validate node/npx available
if ! command -v npx &>/dev/null; then
    # Try common nvm paths
    export NVM_DIR="${HOME}/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
    if ! command -v npx &>/dev/null; then
        log_error "npx not found. Install Node.js on the VPS host."
        alert "npx/Node.js not found on the VPS host"
        exit 1
    fi
fi

# Ensure node_modules exist
if [ ! -d "${REPO_DIR}/node_modules" ]; then
    log "node_modules not found, running npm install..."
    npm install --ignore-scripts 2>&1 || {
        log_error "npm install failed"
        alert "npm install failed during URI renewal"
        exit 1
    }
fi

log "Starting URI renewal for all minds..."

# Run the ingest script for each mind in knowledge_base/
RENEWAL_FAILED=0
MINDS_SEEN=0
MINDS_OK=0
FAILED_MINDS=""
for mind_dir in "${REPO_DIR}/knowledge_base"/*/; do
    [ ! -d "$mind_dir" ] && continue
    mind_name="$(basename "$mind_dir")"

    # Skip hidden directories
    [[ "$mind_name" == .* ]] && continue

    MINDS_SEEN=$((MINDS_SEEN + 1))
    log "Renewing URIs for: ${mind_name}"
    if npx tsx scripts/ingest_mind.ts "$mind_name" 2>&1; then
        log "Completed: ${mind_name}"
        MINDS_OK=$((MINDS_OK + 1))
    else
        log_error "Failed to renew URIs for: ${mind_name}"
        FAILED_MINDS="${FAILED_MINDS} ${mind_name}"
        RENEWAL_FAILED=1
    fi
done

# SYS-16: a quota-exhaustion / zero-progress run is a failure even if no
# individual ingest threw — "0 renewed when minds were due" must alert.
if [ "$MINDS_SEEN" -gt 0 ] && [ "$MINDS_OK" -eq 0 ]; then
    log_error "No minds were renewed successfully (0/${MINDS_SEEN}) — possible quota exhaustion or auth failure"
    alert "Zero minds renewed (0/${MINDS_SEEN}) — possible Gemini quota exhaustion / auth failure"
    exit 1
fi

if [ "$MINDS_SEEN" -eq 0 ]; then
    log_error "No mind directories found under knowledge_base/ — nothing renewed"
    alert "No mind directories found under knowledge_base/ — cron renewed nothing"
    exit 1
fi

if [ "$RENEWAL_FAILED" -eq 1 ]; then
    log "URI renewal finished with errors (failed:${FAILED_MINDS}; ok ${MINDS_OK}/${MINDS_SEEN})"
    alert "URI renewal partial failure — failed minds:${FAILED_MINDS} (ok ${MINDS_OK}/${MINDS_SEEN})"
    exit 1
else
    log "URI renewal completed successfully (${MINDS_OK}/${MINDS_SEEN} minds)"
fi
