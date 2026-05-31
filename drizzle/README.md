# ⚠️⚠️⚠️ STOP — READ BEFORE `drizzle-kit generate` / `drizzle-kit push` ⚠️⚠️⚠️

> **DO NOT run `drizzle-kit generate` or `drizzle-kit push` against production right now.**
>
> The schema in `src/db/schema/` is **AHEAD of this drizzle journal**. TD-3.1
> (Schema Hardening) declared its **target state** in `src/db/schema/*.ts`, but
> prod gets that DDL from **standalone psql scripts** (`scripts/db-migrate/td-3.1-*.sql`),
> **not** from journal migrations. The journal is intentionally frozen at
> `0000`–`0002`.
>
> A `drizzle-kit generate` run **right now** would diff the (target) schema against
> journal snapshot `0002` and emit a `0003` that **re-adds every TD-3.1 object
> NON-CONCURRENTLY (table-locking) and double-applies objects prod already has** →
> **production incident**.

---

## Why this state exists

`drizzle-kit migrate` wraps each migration file in a single transaction. TD-3.1
needs `CREATE INDEX CONCURRENTLY` / `CREATE UNIQUE INDEX CONCURRENTLY` (the Gemini
cache unlock, DB-5) and `... VALIDATE CONSTRAINT`, which Postgres **forbids inside
a transaction block**. So TD-3.1's prod migration is a set of standalone,
autocommit psql scripts run in a maintenance window — see
**`docs/runbooks/migrations.md` → "TD-3.1 — Schema Hardening execution"**.

| Layer | State |
|-------|-------|
| `drizzle/` journal (`meta/_journal.json`) | `0000`, `0001`, `0002` only |
| `src/db/schema/*.ts` | **TD-3.1 target state** (unique / indexes / FKs / checks already declared) |
| Production database | Gets TD-3.1 via `scripts/db-migrate/td-3.1-*.sql` in a maintenance window |

The schema was advanced to target state for **type-consistency only** (the app
imports the schema) and so that a *future, correct* `drizzle-kit generate`
baselines from the right shape. It is **not** a signal that the journal is behind
and needs a `0003` generated.

## What WOULD break if you generate now

`drizzle-kit generate` today diffs **schema (target)** vs **journal snapshot 0002
(pre-hardening)** and emits a `0003` that:

1. Re-creates the TD-3.1 indexes with **plain `CREATE INDEX`** (NOT `CONCURRENTLY`)
   → takes an `ACCESS EXCLUSIVE` lock → **table-locking on a live prod table**.
2. Re-adds the FKs/uniques/checks with **plain `ADD CONSTRAINT`** (full validating
   scan, table lock) instead of the prod-safe `NOT VALID` + `VALIDATE` pattern.
3. **Double-applies** objects prod already has from the standalone scripts → errors.

Net: a `0003` that is both unsafe (locks) and broken (double-apply). **Never apply
a naively-generated `0003` to prod.**

## The correct sequence (do these in order)

1. **Execute the TD-3.1 maintenance window** per the runbook
   (`docs/runbooks/migrations.md` → ordered sequence, go/no-go at each checkpoint).
   Prod gets all TD-3.1 objects via the standalone autocommit scripts.
2. **THEN land the guarded baseline `drizzle/0003_td_3_1_baseline.sql`** (skeleton
   below) and let `drizzle-kit migrate` record it. Every statement is
   `IF NOT EXISTS` / catalog-guarded → it is a **clean no-op on the now-migrated
   prod**, and it actually applies the same guarded DDL on any fresh/staging DB.
   This makes **journal == reality** (`__drizzle_migrations` now reflects the
   TD-3.1 objects) so a future generate diffs from the true target with zero drift.
3. **From then on, `drizzle-kit generate` is safe again** — it baselines from
   `0003` and emits only genuinely-new changes.

> Until `0003_td_3_1_baseline.sql` exists, the trap is mitigated **by docs only**
> (this README + the runbook + per-schema-file header comments + the QA gate).
> Landing the baseline is the must-do that re-gates TD-3.1 from CONCERNS → PASS.

---

## Spec / skeleton — `drizzle/0003_td_3_1_baseline.sql`

**Author this only AFTER the prod window succeeds.** Every statement must be a
**no-op on a DB that already ran the standalone scripts** (idempotent), and must
match the standalone scripts and `src/db/schema/` exactly. Record it via
`drizzle-kit migrate` so `__drizzle_migrations` and `meta/_journal.json` gain a
`0003` entry.

Two caveats for the baseline file, because it is replayed through
`drizzle-kit migrate` (which wraps it in a transaction):

- **`CONCURRENTLY` is NOT allowed here** (drizzle wraps in a tx). The baseline uses
  **plain `CREATE [UNIQUE] INDEX IF NOT EXISTS`**. That is acceptable *only because*
  on prod these indexes already exist (no-op), and on a fresh/staging DB the table
  is empty/small. The **online, concurrent** build for prod is — and remains — the
  job of `scripts/db-migrate/td-3.1-02/03`, never this baseline.
- FKs/checks use `NOT VALID` + a guarded `VALIDATE`, or are catalog-guarded with
  `DO $$ ... IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = ...) $$`,
  so re-running is a no-op.

```sql
-- 0003_td_3_1_baseline.sql — GUARDED no-op baseline for TD-3.1.
-- Applied to prod out-of-band via scripts/db-migrate/td-3.1-*.sql in the
-- maintenance window. This migration only RECONCILES the drizzle journal:
-- a clean no-op on already-migrated prod; full (guarded) apply on fresh/staging.
-- Source of truth: scripts/db-migrate/td-3.1-*.sql + src/db/schema/*.ts.
-- DO NOT add CONCURRENTLY here (drizzle wraps this file in a transaction).

-- 1) INDEXES (from td-3.1-02-indexes.sql) — plain IF NOT EXISTS (no-op on prod)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON conversations (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_conversations_mind
  ON conversations (mind_id);
CREATE INDEX IF NOT EXISTS idx_debates_user
  ON debates (user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_mind
  ON knowledge_documents (mind_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON messages (created_at);
CREATE UNIQUE INDEX IF NOT EXISTS conversations_share_token_uniq
  ON conversations (share_token) WHERE share_token IS NOT NULL;        -- DB-7 partial

-- 2) UNIQUE on file_uri_cache (from td-3.1-03 — DB-5, the Gemini cache unlock)
CREATE UNIQUE INDEX IF NOT EXISTS file_uri_cache_kdid_uniq
  ON file_uri_cache (knowledge_document_id);

-- 3) FOREIGN KEYS (from td-3.1-04 + 05) — catalog-guarded ADD ... NOT VALID,
--    then guarded VALIDATE. Match ON DELETE / ON UPDATE to the scripts EXACTLY:
--      conversations_user_id_users_id_fk          ON DELETE CASCADE
--      debates_user_id_users_id_fk                ON DELETE CASCADE
--      mind_memories_user_id_users_id_fk          ON DELETE CASCADE
--      rate_limits_user_id_users_id_fk            ON DELETE CASCADE
--      token_usage_user_id_users_id_fk            ON DELETE SET NULL   (user_id nullable)
--      messages_mind_slug_minds_slug_fk           ON DELETE SET NULL ON UPDATE CASCADE
--      debate_participants_mind_id_minds_id_restrict_fk  ON DELETE RESTRICT
--    e.g. per constraint:
--      DO $$ BEGIN
--        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_user_id_users_id_fk') THEN
--          ALTER TABLE conversations
--            ADD CONSTRAINT conversations_user_id_users_id_fk
--            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;
--        END IF;
--      END $$;
--      ALTER TABLE conversations VALIDATE CONSTRAINT conversations_user_id_users_id_fk;  -- no-op once valid
--    (repeat for all 7 FKs above)

-- 4) CHECK CONSTRAINTS (from td-3.1-06 — DB-9 enums + DB-11 total_tokens)
--    catalog-guarded ADD ... CHECK (...) NOT VALID, then guarded VALIDATE:
--      messages_role_check               CHECK (role IN ('user','assistant'))
--      mind_memories_memory_type_check   CHECK (memory_type IN ('fact','preference','topic','insight'))
--      debates_status_check              CHECK (status IN ('setup','active','paused','completed'))
--      token_usage_total_tokens_check    CHECK (total_tokens >= 0)   -- confirm exact expr vs td-3.1-06
--    same DO $$ ... IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = ...) $$ guard pattern.

-- NOTE: token_usage.user_id was made nullable and debate_participants.mind_id FK
-- set to RESTRICT as part of TD-3.1 — reflect those column/policy states too if a
-- fresh DB would not already have them from the base 0000–0002 migrations.
```

After the baseline lands and `drizzle-kit migrate` records it, verify on a
**staging DB loaded from a prod dump** that `drizzle-kit migrate` is a **clean
no-op** and a fresh `drizzle-kit generate` produces **no TD-3.1 drift**.

---

## References

- **Runbook:** [`docs/runbooks/migrations.md`](../docs/runbooks/migrations.md) — "TD-3.1 — Schema Hardening execution" + "Drizzle reconciliation".
- **Prod migration scripts:** [`scripts/db-migrate/td-3.1-*.sql`](../scripts/db-migrate/) (01 remediate → 06 checks) and their rollbacks in `scripts/db-rollback/`.
- **QA gate:** [`docs/qa/gates/TD-3.1-schema-hardening.yml`](../docs/qa/gates/TD-3.1-schema-hardening.yml) — adversarial-safety review, check #4 (THE DRIZZLE TRAP), verdict CONCERNS.
- **Story:** [`docs/stories/story-TD-3.1-schema-hardening.md`](../docs/stories/story-TD-3.1-schema-hardening.md).
- **Schema (target state):** [`src/db/schema/`](../src/db/schema/).
