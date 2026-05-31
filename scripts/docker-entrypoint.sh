#!/usr/bin/env sh
# docker-entrypoint.sh — OPT-IN migration-on-boot wrapper (SYS-10)
#
# SAFETY POLICY: This wrapper is NOT wired into the Docker image by default.
# The current Dockerfile CMD is `node server.js` and stays that way until you
# deliberately opt in. Even when this entrypoint IS used, it only runs
# migrations when RUN_MIGRATIONS_ON_BOOT=true (default: false). With the flag
# unset/false it simply execs the app — behaviourally identical to today.
#
# WHY default-off: the production container is a Next.js *standalone* build and
# does NOT contain scripts/, drizzle-kit, or the drizzle/ folder. Running
# migrations from the app container would require shipping those into the image
# AND accepting that every replica restart could race on schema changes. The
# recommended activation runs migrations as a ONE-OFF step in your maintenance
# window (see docs/runbooks/migrations.md), not on every boot.
#
# To activate on-boot migrations (deliberate, documented):
#   1. Build an image that includes scripts/, drizzle/, and drizzle-kit
#      (i.e. a "migrator" image or a fuller runtime stage).
#   2. Set ENTRYPOINT ["sh", "/app/scripts/docker-entrypoint.sh"] in that image.
#   3. Set RUN_MIGRATIONS_ON_BOOT=true in the env (one line in compose) for the
#      deploy where you want migrations to run — then unset it again.
#
# ENV:
#   RUN_MIGRATIONS_ON_BOOT   "true" to run migrations before starting the app.
#                            Anything else (incl. unset) => skip, start app as-is.
#   MIGRATE_BACKUP_ON_BOOT   "true" to pg_dump before migrating (requires pg_dump
#                            in the image). Default: false.

set -e

if [ "${RUN_MIGRATIONS_ON_BOOT:-false}" = "true" ]; then
  echo "[entrypoint] RUN_MIGRATIONS_ON_BOOT=true — running migrations before app start."
  if [ "${MIGRATE_BACKUP_ON_BOOT:-false}" = "true" ]; then
    sh /app/scripts/migrate.sh --backup
  else
    sh /app/scripts/migrate.sh
  fi
  echo "[entrypoint] Migrations step finished. Starting application."
else
  echo "[entrypoint] RUN_MIGRATIONS_ON_BOOT not set — skipping migrations (default-safe). Starting application."
fi

# Hand off to the app. Default to the standalone server if no command given.
if [ "$#" -gt 0 ]; then
  exec "$@"
else
  exec node server.js
fi
