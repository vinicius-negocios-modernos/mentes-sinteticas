# TD-3.1 ROLLBACK 01 — Data Remediation (NOT auto-reversible)

Reverses (conceptually): `scripts/db-migrate/td-3.1-01-remediate.sql`.

The remediation step performs **destructive, non-reversible** data changes. There
is no forward SQL that restores deleted/normalized rows. The only rollback path is
the **`pg_dump` backup taken before the maintenance window**.

| Mutation | Reversible? | Recovery |
|----------|-------------|----------|
| DB-5 dedupe (DELETE older file_uri_cache rows) | No | Restore from `pg_dump`; or re-run the URI ingest/refresh script — the cache is rebuildable from Gemini. |
| DB-3 NFC-normalize `local_path` | No (old NFD bytes lost) | Restore from `pg_dump`. Low risk: app reads by UUID, not `local_path`. |
| DB-2 `rate_limits` orphan DELETE | No | None needed — ephemeral, TTL'd data. Acceptable loss. |

**Rule:** ALWAYS `--backup` (pg_dump) immediately before running `td-3.1-01-remediate.sql`.
That dump is the rollback for everything in step 01.

```bash
# Backup (from the runner)
npm run db:migrate:safe -- --backup   # pg_dump → ./backups/, gzip

# Restore (last resort, in the maintenance window only)
gunzip -c ./backups/<dump>.sql.gz | psql "$DATABASE_URL"
```

The DDL steps (02–06) each have their own idempotent forward + rollback `.sql`
and do NOT require the dump — only step 01 does.
