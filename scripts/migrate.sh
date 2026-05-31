#!/usr/bin/env bash
# migrate.sh — Safe, idempotent migration runner for Mentes Sinteticas (SYS-10)
#
# Wraps `drizzle-kit migrate` with operational guardrails so that schema
# changes (incl. the Tema C hardening migrations) can be applied to a live
# production database with a backup and a clear audit trail — instead of the
# ad-hoc `psql` flow that produced DB-4/DB-5/DB-8.
#
# WHAT THIS DOES (and does NOT do):
#   * Pre-flight DB connectivity check (SELECT 1) before touching anything.
#   * Optional `pg_dump` backup BEFORE applying migrations (--backup / BACKUP_BEFORE_MIGRATE=true).
#   * Runs `drizzle-kit migrate` which applies ONLY pending migrations,
#     in order, recorded in drizzle's __drizzle_migrations table. It is
#     idempotent: already-applied migrations are skipped. It NEVER drops
#     data on its own — destructive SQL only runs if YOU wrote it into a
#     migration file.
#   * Non-zero exit on ANY failure, with a clear marker line for log scraping.
#
#   It does NOT auto-run on container boot. Activation into the deploy path is
#   OPT-IN and documented in docs/runbooks/migrations.md (RUN_MIGRATIONS_ON_BOOT).
#
# OUT-OF-TRANSACTION STATEMENTS (CONCURRENTLY / NOT VALID / VALIDATE):
#   drizzle-kit applies each migration file. drizzle-kit does NOT wrap files in
#   an outer transaction by default, so `CREATE INDEX CONCURRENTLY` and
#   `ALTER TABLE ... ADD CONSTRAINT ... NOT VALID` / `VALIDATE CONSTRAINT`
#   are supported when authored as separate `--> statement-breakpoint`
#   statements in the generated SQL. For statements that postgres forbids
#   inside any transaction block, keep them in their own migration file with
#   a single statement. See docs/runbooks/migrations.md §"Out-of-transaction".
#
# USAGE:
#   scripts/migrate.sh                 # pre-flight + drizzle-kit migrate
#   scripts/migrate.sh --backup        # pg_dump first, then migrate
#   scripts/migrate.sh --check-only    # pre-flight connectivity only, no migrate
#   scripts/migrate.sh --dry-run       # show pending migration files, apply nothing
#
# ENV:
#   DATABASE_URL              (required) postgres connection string
#   BACKUP_BEFORE_MIGRATE     "true" to force a pg_dump backup (same as --backup)
#   BACKUP_DIR                backup output dir (default: ./backups)
#   MIGRATE_LOCK_TIMEOUT      lock_timeout passed to drizzle via PG env (default: 10s; advisory only)

set -euo pipefail

# ── Constants ────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
MARKER="[migrate]"
BACKUP_DIR="${BACKUP_DIR:-${REPO_DIR}/backups}"
DRIZZLE_DIR="${REPO_DIR}/drizzle"

log()       { echo "${MARKER} [$(date '+%Y-%m-%d %H:%M:%S')] $1"; }
log_error() { echo "${MARKER} [$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2; }
fail()      { log_error "$1"; echo "${MARKER} MIGRATION_FAILED" >&2; exit 1; }

# ── Argument parsing ─────────────────────────────────────────────────
DO_BACKUP="${BACKUP_BEFORE_MIGRATE:-false}"
CHECK_ONLY="false"
DRY_RUN="false"

while [ $# -gt 0 ]; do
  case "$1" in
    --backup)     DO_BACKUP="true" ;;
    --check-only) CHECK_ONLY="true" ;;
    --dry-run)    DRY_RUN="true" ;;
    -h|--help)
      grep -E '^#( |$)' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) fail "Unknown argument: $1" ;;
  esac
  shift
done

cd "$REPO_DIR"

# ── Load env (.env / .env.local) if present, without clobbering set vars ─
if [ -z "${DATABASE_URL:-}" ]; then
  for envfile in "${REPO_DIR}/.env" "${REPO_DIR}/.env.local"; do
    if [ -f "$envfile" ]; then
      set -a
      # shellcheck disable=SC1090
      source "$envfile"
      set +a
      log "Loaded env from $(basename "$envfile")"
      break
    fi
  done
fi

if [ -z "${DATABASE_URL:-}" ]; then
  fail "DATABASE_URL is not set. Provide it via env or .env / .env.local"
fi

# ── Pre-flight: DB connectivity ──────────────────────────────────────
log "Pre-flight: checking database connectivity..."
preflight() {
  if command -v psql &>/dev/null; then
    psql "$DATABASE_URL" -tAc 'SELECT 1' >/dev/null 2>&1
    return $?
  fi
  # Fallback: use node + the project's postgres driver (no psql on host).
  node -e '
    const postgres = require("postgres");
    const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 10 });
    sql`SELECT 1`.then(() => { sql.end(); process.exit(0); })
      .catch((e) => { console.error(String(e.message || e)); sql.end(); process.exit(1); });
  ' 2>/dev/null
}

if ! preflight; then
  fail "Database connectivity check failed (SELECT 1). Aborting before any migration."
fi
log "Pre-flight OK: database reachable."

if [ "$CHECK_ONLY" = "true" ]; then
  log "--check-only set: connectivity verified, no migrations applied."
  exit 0
fi

# ── Dry-run: list migration files, apply nothing ─────────────────────
if [ "$DRY_RUN" = "true" ]; then
  log "--dry-run set: listing migration files (drizzle applies only pending ones at runtime):"
  if [ -d "$DRIZZLE_DIR" ]; then
    find "$DRIZZLE_DIR" -maxdepth 1 -name '*.sql' | sort | sed "s|^|${MARKER}   |"
  else
    log "No drizzle/ directory found at ${DRIZZLE_DIR}"
  fi
  log "Dry-run complete. No changes applied."
  exit 0
fi

# ── Optional backup before migrating ─────────────────────────────────
if [ "$DO_BACKUP" = "true" ]; then
  if ! command -v pg_dump &>/dev/null; then
    fail "--backup requested but pg_dump is not installed on this host."
  fi
  mkdir -p "$BACKUP_DIR"
  STAMP="$(date '+%Y%m%d-%H%M%S')"
  BACKUP_FILE="${BACKUP_DIR}/pre-migrate-${STAMP}.sql.gz"
  log "Taking pg_dump backup → ${BACKUP_FILE}"
  if pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$BACKUP_FILE"; then
    log "Backup written ($(du -h "$BACKUP_FILE" | cut -f1))."
  else
    fail "pg_dump backup failed. Refusing to migrate without a backup."
  fi
else
  log "No backup taken (pass --backup or set BACKUP_BEFORE_MIGRATE=true to enable)."
fi

# ── Apply migrations ─────────────────────────────────────────────────
log "Applying pending migrations via drizzle-kit migrate..."
if npx drizzle-kit migrate; then
  log "Migrations applied successfully."
  echo "${MARKER} MIGRATION_OK"
  exit 0
else
  fail "drizzle-kit migrate exited non-zero. Inspect output above; DB may be partially migrated."
fi
