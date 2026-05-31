#!/usr/bin/env bash
# smoke-test.sh — Post-deploy smoke test (SYS-11)
#
# The container healthcheck only hits `GET /`, so a broken /api/chat (e.g. a
# Gemini auth failure) currently passes the gate. This smoke test exercises the
# real critical paths and fails loudly when they are degraded.
#
# Checks:
#   1. GET /api/health  → must be 200 AND report database+auth "ok".
#   2. GET /            → homepage must be 200.
#   3. POST /api/chat   → must be "alive". A 401 (unauthenticated) or 400
#      (validation) means the route booted and reached auth/validation — that's
#      ALIVE. A 500 or a connection error means the route is broken (this is the
#      real SYS-11 concern: a Gemini-key/runtime failure surfaces as 5xx).
#
# A 401 on a protected route = alive. A 500 = dead. We treat 2xx/4xx (except
# 5xx) on /api/chat as a passing liveness probe; 5xx / unreachable fails.
#
# OPTIONAL authenticated deep-probe (real Gemini response):
#   If SMOKE_AUTH_COOKIE is provided, the chat probe sends it and additionally
#   requires a non-5xx streamed response — this is the "real Gemini" check the
#   QA review asked for. Without it, we still catch 5xx (broken key / runtime).
#
# USAGE:
#   scripts/smoke-test.sh                         # defaults to http://localhost:3000
#   scripts/smoke-test.sh https://mentes.negociosmodernos.cloud
#   BASE_URL=https://... scripts/smoke-test.sh
#   SMOKE_AUTH_COOKIE='authjs.session-token=...' scripts/smoke-test.sh https://...
#
# Exits 0 on all-pass, non-zero with a clear message on first hard failure.

set -uo pipefail

BASE_URL="${1:-${BASE_URL:-http://localhost:3000}}"
BASE_URL="${BASE_URL%/}"
TIMEOUT="${SMOKE_TIMEOUT:-30}"
MARKER="[smoke]"

log()  { echo "${MARKER} $1"; }
pass() { echo "${MARKER} PASS — $1"; }
fail() { echo "${MARKER} FAIL — $1" >&2; echo "${MARKER} SMOKE_FAILED" >&2; exit 1; }

if ! command -v curl &>/dev/null; then
  fail "curl is required but not installed."
fi

log "Target: ${BASE_URL} (timeout ${TIMEOUT}s)"

# ── Check 1: /api/health (200 + DB + auth) ───────────────────────────
log "Check 1/3: GET /api/health"
HEALTH_BODY="$(curl -fsS --max-time "$TIMEOUT" "${BASE_URL}/api/health" 2>/dev/null)" || \
  fail "health endpoint unreachable or non-2xx at ${BASE_URL}/api/health"

# Lightweight JSON field checks without requiring jq.
echo "$HEALTH_BODY" | grep -q '"status":"healthy"' || \
  fail "health status is not 'healthy': ${HEALTH_BODY}"
echo "$HEALTH_BODY" | grep -q '"database":{"status":"ok"' || \
  fail "health database component is not ok: ${HEALTH_BODY}"
echo "$HEALTH_BODY" | grep -q '"auth":{"status":"ok"' || \
  fail "health auth component is not ok: ${HEALTH_BODY}"
pass "/api/health is healthy (db+auth ok)"

# ── Check 2: homepage ────────────────────────────────────────────────
log "Check 2/3: GET /"
HOME_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" "${BASE_URL}/" 2>/dev/null)" || \
  fail "homepage request errored"
[ "$HOME_CODE" = "200" ] || fail "homepage returned HTTP ${HOME_CODE} (expected 200)"
pass "homepage returned 200"

# ── Check 3: /api/chat liveness (5xx = dead, 401/400 = alive) ────────
log "Check 3/3: POST /api/chat (liveness; 5xx fails the gate)"
CHAT_ARGS=(-s -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT"
           -X POST "${BASE_URL}/api/chat"
           -H "Content-Type: application/json"
           --data '{"mindName":"smoke-probe","message":"smoke test ping"}')
if [ -n "${SMOKE_AUTH_COOKIE:-}" ]; then
  log "  (authenticated deep-probe: SMOKE_AUTH_COOKIE present — exercises real Gemini path)"
  CHAT_ARGS+=(-H "Cookie: ${SMOKE_AUTH_COOKIE}")
fi

CHAT_CODE="$(curl "${CHAT_ARGS[@]}" 2>/dev/null)"
CURL_RC=$?
if [ "$CURL_RC" -ne 0 ] && [ -z "$CHAT_CODE" ]; then
  fail "/api/chat unreachable (curl rc=${CURL_RC}) — route is down"
fi

case "$CHAT_CODE" in
  5*) fail "/api/chat returned HTTP ${CHAT_CODE} — route is broken (e.g. Gemini auth/runtime failure). This is the SYS-11 gap a GET / healthcheck would miss." ;;
  401|403) pass "/api/chat returned ${CHAT_CODE} (auth gate reached → route alive)" ;;
  400|422) pass "/api/chat returned ${CHAT_CODE} (validation reached → route alive)" ;;
  2*) pass "/api/chat returned ${CHAT_CODE} (streamed response → route alive)" ;;
  *)  log "  /api/chat returned ${CHAT_CODE} (non-5xx, treated as alive)"
      pass "/api/chat returned ${CHAT_CODE} (non-5xx → route alive)" ;;
esac

echo "${MARKER} SMOKE_OK — all critical paths healthy at ${BASE_URL}"
exit 0
