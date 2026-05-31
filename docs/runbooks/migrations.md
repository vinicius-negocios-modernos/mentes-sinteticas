# Runbook — Database Migrations (SYS-10)

Safe operation of the migration runner for Mentes Sintéticas production.

> **Safety policy:** the runner exists in the repo but does **not** silently
> change production's boot/deploy behaviour. Auto-running migrations on deploy
> is **opt-in** (env-flagged, default OFF). You activate it deliberately in a
> maintenance window. Today's flow (manual via SSH tunnel) keeps working — only
> better.

## What changed vs. the old flow

| Before | After |
|--------|-------|
| `psql ... < drizzle/NNNN.sql` over an SSH tunnel, ad-hoc | `scripts/migrate.sh` — pre-flight check, optional `pg_dump`, `drizzle-kit migrate`, non-zero exit on failure, log markers |
| No backup step | `--backup` runs `pg_dump` before applying |
| No connectivity guard | `SELECT 1` pre-flight aborts before touching schema |
| No deploy integration | OPT-IN entrypoint wrapper (`RUN_MIGRATIONS_ON_BOOT`, default false) |

`drizzle-kit migrate` applies **only pending** migrations, in order, tracked in
`__drizzle_migrations`. It is idempotent and never drops data on its own —
destructive SQL only runs if it was authored into a migration file.

## Manual run (current production flow, improved)

From a host with `DATABASE_URL` reachable (e.g. via the SSH tunnel):

```bash
# 1. Open the tunnel (unchanged)
ssh -L 15432:postgres_postgres:5432 root@76.13.82.80

# 2. Point DATABASE_URL at the tunnel and dry-run / check first
export DATABASE_URL='postgres://postgres:...@127.0.0.1:15432/mentes_sinteticas'
npm run db:migrate:safe -- --check-only   # connectivity only, applies nothing
npm run db:migrate:safe -- --dry-run      # lists migration files, applies nothing

# 3. Back up, then migrate
npm run db:migrate:safe -- --backup       # pg_dump → ./backups/, then migrate
```

Flags:

- `--check-only` — pre-flight connectivity only.
- `--dry-run` — list migration files; apply nothing.
- `--backup` — `pg_dump` (gzip) into `BACKUP_DIR` (default `./backups`) before migrating.

Markers for log scraping: `[migrate] MIGRATION_OK` / `[migrate] MIGRATION_FAILED`.

## Activating migrations on deploy (OPT-IN — deliberate)

The production image is a Next.js **standalone** build and does **not** contain
`scripts/`, `drizzle-kit`, or the `drizzle/` folder, so the app container cannot
migrate as shipped. Two safe activation options:

### Option A (recommended) — one-off migration step in your window

Run the migration as a discrete step (manual, or a dedicated CI/cron task that
you trigger), **not** on every container boot. This avoids replica restart races
and keeps schema changes inside a controlled window. Use the manual flow above
with `--backup`.

### Option B — on-boot wrapper (only if you accept the trade-offs)

1. Build an image that includes `scripts/`, `drizzle/`, and `drizzle-kit`
   (a "migrator" image or a fuller runtime stage).
2. Set the entrypoint to the wrapper:
   `ENTRYPOINT ["sh", "/app/scripts/docker-entrypoint.sh"]`.
3. For the one deploy where you want migrations to run, set
   `RUN_MIGRATIONS_ON_BOOT=true` (one line in `docker-compose.prod.yml` env),
   deploy, verify, then **unset it again**.
4. Optionally set `MIGRATE_BACKUP_ON_BOOT=true` (requires `pg_dump` in the image).

With `RUN_MIGRATIONS_ON_BOOT` unset/false the wrapper just `exec`s the app —
behaviourally identical to the current `node server.js` boot.

> **Replica caution:** with `replicas > 1`, only one instance should migrate.
> The on-boot wrapper does **not** coordinate replicas. Prefer Option A, or set
> `replicas: 1` for the migrating deploy.

## Out-of-transaction statements (CONCURRENTLY / NOT VALID / VALIDATE)

The Tema C hardening (TD-3.1) needs statements postgres forbids inside a
transaction block:

- `CREATE INDEX CONCURRENTLY ...`
- `ALTER TABLE ... ADD CONSTRAINT ... NOT VALID` followed later by
  `ALTER TABLE ... VALIDATE CONSTRAINT ...`

drizzle-kit applies each generated `.sql` file and does not impose an outer
transaction, so author these as their own statements (separated by
`--> statement-breakpoint`). For a statement that must run entirely outside any
transaction, keep it alone in its own migration file. Verify in **staging with a
prod dump**: `migrate up` → `migrate down` → schema identical to baseline
(story TD-2.1 AC1).

## Rollback

drizzle-kit does not auto-generate `down` SQL. For each hardening migration:

1. Author the reverse statements in a paired down-migration (or keep a tested
   rollback `.sql` alongside).
2. Always `--backup` before applying so a `pg_dump` restore is the last resort.
3. Validate `up → down → baseline` on staging with a prod dump before prod.

## Pre-flight checklist (before any prod migration)

- [ ] Orphan/duplicate audit is clean (Tema C gate — see assessment Wave 0).
- [ ] `--backup` taken and its size sanity-checked.
- [ ] Ran against staging (prod dump) with `up → down → baseline` verified.
- [ ] Maintenance window / low-traffic period chosen.
- [ ] `replicas: 1` (or a single migrator) for the migrating deploy.
- [ ] Post-migrate: run `npm run smoke -- https://mentes.negociosmodernos.cloud`.

## Related

- `scripts/migrate.sh` — the runner.
- `scripts/docker-entrypoint.sh` — opt-in on-boot wrapper (default OFF).
- `scripts/smoke-test.sh` — post-deploy verification (SYS-11).
- `docs/prd/technical-debt-assessment.md` — Wave 2 / Wave 3 (Tema C) context.
