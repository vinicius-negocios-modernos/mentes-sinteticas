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

## TD-3.1 — Schema Hardening execution (Tema C / Wave W3)

> Status: **PREPARED — awaiting maintenance-window execution.** Nothing in this
> section has been applied to production. All scripts are idempotent and were
> verified statically (no prod connection during authoring).

TD-3.1 cannot go through `drizzle-kit migrate` for its heavy DDL: drizzle wraps
each migration file in a transaction, and `CREATE INDEX CONCURRENTLY` /
`CREATE UNIQUE INDEX CONCURRENTLY` are **forbidden inside a transaction block**.
So the prod migration for TD-3.1 is a set of **standalone psql scripts** run in
order, in autocommit mode, during a maintenance window.

### Drizzle reconciliation (why there is no 0003 migration)

- **The standalone scripts ARE the production migration** for TD-3.1. The DDL is
  applied to prod by `psql -f scripts/db-migrate/td-3.1-*.sql` (autocommit), not
  by `drizzle-kit migrate`.
- `src/db/schema/*.ts` was updated to the **target state** (the indexes, the
  `file_uri_cache` unique, the user_id/mind_slug FKs, the enum/total_tokens
  CHECKs, `token_usage.user_id` made nullable, `debate_participants.mind_id`
  RESTRICT). This is for **type-consistency** (the app imports the schema) and so
  a future `drizzle-kit generate` baselines from the correct shape.
- **Do NOT run `drizzle-kit generate` and then apply the resulting 0003 to prod.**
  A naive generated 0003 would (a) emit non-concurrent `CREATE INDEX` /
  plain `ADD CONSTRAINT` (table-locking, not what we apply), and (b) double-apply
  objects that the standalone scripts already created → errors.
- The drizzle journal is intentionally left at **3 entries (0000–0002)** **until
  the maintenance window completes**. While in this state, **`drizzle/README.md`
  carries a STOP banner** — do not `drizzle-kit generate` / `push` against prod,
  because the schema is ahead of the journal and a naive `0003` would table-lock
  and double-apply (see that file for the full failure mode).

#### Post-window: land the guarded baseline `0003` (the reconciliation step)

**After** the in-window scripts succeed on prod (steps 0–8 below), reconcile the
journal with reality by **adding a single guarded baseline migration** rather than
hand-editing a `--custom` file later:

1. Author `drizzle/0003_td_3_1_baseline.sql` where **every** statement is a no-op
   on a DB that already ran the standalone scripts:
   - Indexes → plain `CREATE [UNIQUE] INDEX IF NOT EXISTS …` (NOT `CONCURRENTLY`;
     drizzle wraps the file in a tx — the concurrent online build was already done
     by `td-3.1-02`/`03` in-window).
   - FKs → catalog-guarded `DO $$ … IF NOT EXISTS (SELECT 1 FROM pg_constraint
     WHERE conname = '…') … ADD CONSTRAINT … NOT VALID $$;` then a guarded
     `VALIDATE CONSTRAINT` (no-op once valid). Match every `ON DELETE`/`ON UPDATE`
     to `td-3.1-04` exactly (CASCADE ×4, `token_usage` SET NULL, `messages.mind_slug`
     SET NULL + ON UPDATE CASCADE, `debate_participants.mind_id` RESTRICT).
   - CHECKs → same `pg_constraint` catalog guard for `messages_role_check`,
     `mind_memories_memory_type_check`, `debates_status_check`,
     `token_usage_total_tokens_check`.
   - The full object list + skeleton lives in **`drizzle/README.md`** — author from
     there; it is the single source for what this baseline must contain.
2. Record it via `drizzle-kit migrate` → it is a **clean no-op on prod** (gains the
   `0003` journal + `__drizzle_migrations` entry) and a full guarded apply on any
   fresh/staging DB. Now **journal == reality**.
3. Verify on staging (prod dump) that `drizzle-kit migrate` is a clean no-op and a
   fresh `drizzle-kit generate` shows **zero TD-3.1 drift**. Only then is
   `drizzle-kit generate` safe again — remove/relax the STOP banner in
   `drizzle/README.md` accordingly. This is the must-do that re-gates TD-3.1
   CONCERNS → PASS (`docs/qa/gates/TD-3.1-schema-hardening.yml`).

> Fallback only if a future, unrelated change forces a migration **before** the
> baseline lands: `drizzle-kit generate --custom`, then **hand-edit out / `IF NOT
> EXISTS`-guard** every TD-3.1 object (they already exist on prod). Prefer the
> baseline `0003` above — the hand-edit is error-prone and is exactly what the QA
> gate flagged.

### Files (all under `scripts/`)

| Phase | File |
|-------|------|
| Audit (read-only) | `scripts/db-audit/td-3.1-preflight-audit.sql` |
| Remediation (tx) | `scripts/db-migrate/td-3.1-01-remediate.sql` |
| Indexes (autocommit) | `scripts/db-migrate/td-3.1-02-indexes.sql` |
| Unique file_uri (autocommit) | `scripts/db-migrate/td-3.1-03-unique-file-uri.sql` |
| FKs NOT VALID (tx) | `scripts/db-migrate/td-3.1-04-fks-add-notvalid.sql` |
| FKs VALIDATE (autocommit) | `scripts/db-migrate/td-3.1-05-fks-validate.sql` |
| CHECKs (tx+autocommit) | `scripts/db-migrate/td-3.1-06-checks.sql` |
| Rollbacks | `scripts/db-rollback/td-3.1-0{2..6}-*.sql` + `td-3.1-01-remediate-rollback.md` |

### Connection (SSH-tunnel pattern — same as the manual flow)

```bash
# Terminal A — open the tunnel to prod Postgres (inside Docker Swarm)
ssh -L 15432:postgres_postgres:5432 root@76.13.82.80

# Terminal B — point DATABASE_URL at the tunnel
export DATABASE_URL='postgres://postgres:<pw>@127.0.0.1:15432/mentes_sinteticas'
```

> Autocommit note: `psql "$DATABASE_URL" -f <file>` runs each statement in its own
> implicit transaction (autocommit). Do **NOT** add `-1` / `--single-transaction`
> to the CONCURRENTLY scripts (02, 03, 05) — that would re-wrap them in one tx and
> the CONCURRENTLY/VALIDATE statements would fail.

### Ordered sequence (go/no-go at each checkpoint)

```bash
# 0. BACKUP (mandatory — this is the only rollback for the remediation step)
npm run db:migrate:safe -- --backup        # pg_dump → ./backups/, gzip
#    CHECKPOINT: backup file present and size sane → GO

# 1. PRE-FLIGHT AUDIT (read-only, safe anytime)
psql "$DATABASE_URL" -f scripts/db-audit/td-3.1-preflight-audit.sql
#    REVIEW every count. GO criterion: all *_violations / *_orphans / *_collisions
#    / duplicate_groups = 0, OR an explicit documented decision for each non-zero.
#    NO-GO: any unexplained orphan in conversations/debates/mind_memories → STOP,
#    investigate (likely stale Supabase-era user_id) before remediating.

# 2. REMEDIATION (transactional; dedupe + NFC backfill + orphan policy)
psql "$DATABASE_URL" -f scripts/db-migrate/td-3.1-01-remediate.sql
#    Reads RAISE NOTICE row counts. It self-aborts (RAISE EXCEPTION) if user
#    content orphans remain or dedupe leaves duplicates.
#    CHECKPOINT: COMMIT printed, "[DB-5] OK", "[DB-2] OK" → GO
#    ROLLBACK: restore the step-0 pg_dump (see td-3.1-01-remediate-rollback.md)

# 3. INDEXES (autocommit, CONCURRENTLY, online — DB-6/DB-18/DB-7)
psql "$DATABASE_URL" -f scripts/db-migrate/td-3.1-02-indexes.sql
#    CHECKPOINT: verification prints 7 rows, all is_valid = t → GO
#    ROLLBACK: psql "$DATABASE_URL" -f scripts/db-rollback/td-3.1-02-indexes-rollback.sql

# 4. UNIQUE on file_uri_cache (autocommit, CONCURRENTLY — DB-5 🔴 the unlock)
psql "$DATABASE_URL" -f scripts/db-migrate/td-3.1-03-unique-file-uri.sql
#    CHECKPOINT: pre-build duplicate count = 0 AND verification is_valid = t → GO
#    NO-GO: is_valid = f → rollback 03, re-run step 2 remediation, retry.
#    ROLLBACK: psql "$DATABASE_URL" -f scripts/db-rollback/td-3.1-03-unique-file-uri-rollback.sql

# 5. FKs NOT VALID (transactional — DB-2/DB-15/DB-17; fast, no full scan)
psql "$DATABASE_URL" -f scripts/db-migrate/td-3.1-04-fks-add-notvalid.sql
#    CHECKPOINT: 7 rows; the 6 user_id/mind_slug FKs is_validated = f → GO
#    ROLLBACK: psql "$DATABASE_URL" -f scripts/db-rollback/td-3.1-04-fks-rollback.sql

# 6. FKs VALIDATE (autocommit, online, per-table — DB-2/DB-17)
psql "$DATABASE_URL" -f scripts/db-migrate/td-3.1-05-fks-validate.sql
#    CHECKPOINT: 6 rows, all is_validated = t → GO
#    NO-GO: a VALIDATE errored → that table has an orphan; fix it (td-3.1-01
#           policy) and re-run just that ALTER ... VALIDATE.
#    ROLLBACK (to NOT VALID): scripts/db-rollback/td-3.1-05-fks-validate-rollback.sql
#    ROLLBACK (drop FKs):     scripts/db-rollback/td-3.1-04-fks-rollback.sql

# 7. CHECKs (transactional ADD + autocommit VALIDATE — DB-9/DB-11)
psql "$DATABASE_URL" -f scripts/db-migrate/td-3.1-06-checks.sql
#    CHECKPOINT: 4 rows, all is_validated = t → GO
#    ROLLBACK: psql "$DATABASE_URL" -f scripts/db-rollback/td-3.1-06-checks-rollback.sql

# 8. VERIFY Gemini cache restored + smoke
#    a) Confirm the ON CONFLICT upsert now works (no "no unique or exclusion
#       constraint matching" error). Run the URI refresh script
#       (scripts/refresh-file-uris.ts / renew-uris.sh) — it should upsert cleanly.
#    b) Post-deploy smoke:
npm run smoke -- https://mentes.negociosmodernos.cloud
#    CHECKPOINT: chat returns Gemini-grounded answers; health 200 → DONE
```

### Staging dry-run before prod (TD-2.1 AC1)

Before the prod window, replay against a **staging DB loaded from a prod dump**:
run the full sequence above, then run each rollback in reverse order, and confirm
the schema returns to baseline (`drizzle-kit` introspect or `pg_dump --schema-only`
diff). This proves `up → down → baseline` for every step.

## Related

- `scripts/migrate.sh` — the runner.
- `scripts/docker-entrypoint.sh` — opt-in on-boot wrapper (default OFF).
- `scripts/smoke-test.sh` — post-deploy verification (SYS-11).
- `scripts/db-audit/td-3.1-preflight-audit.sql` — TD-3.1 read-only pre-flight.
- `scripts/db-migrate/td-3.1-*.sql` — TD-3.1 forward scripts (remediation + DDL).
- `scripts/db-rollback/td-3.1-*` — TD-3.1 rollbacks.
- `docs/prd/technical-debt-assessment.md` — Wave 2 / Wave 3 (Tema C) context.
- `docs/reviews/db-specialist-review.md` — fase-5 migration safety notes (§5).
