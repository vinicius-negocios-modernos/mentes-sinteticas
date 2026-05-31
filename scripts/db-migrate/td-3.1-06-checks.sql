-- =============================================================================
-- TD-3.1 STEP 06 — CHECK CONSTRAINTS  (DB-9 enums + DB-11 total_tokens)
-- =============================================================================
-- Story:   TD-3.1 — Schema Hardening (Tema C / Wave W3)
-- Author:  Dara (@data-engineer)
-- Debts:   DB-9  — enforce enum domains at the DB (messages.role,
--                  mind_memories.memory_type, debates.status). Today they are
--                  plain text validated only in the ORM — raw SQL/scripts can
--                  write garbage (the vector that bit DB-4/DB-8).
--          DB-11 — token_usage.total_tokens = input_tokens + output_tokens.
--
-- WHY CHECK (not pg ENUM): pg enums are expensive to alter (adding a value is a
--   catalog migration). CHECK (... IN (...)) is cheap to evolve. (fase-5 §1 DB-9.)
--
-- STRATEGY (prod-safe): ADD CONSTRAINT ... CHECK (...) NOT VALID (fast, no full
--   scan, new writes enforced immediately) → VALIDATE CONSTRAINT (online scan,
--   SHARE UPDATE EXCLUSIVE). Mirrors the FK pattern so a live table is never
--   long-locked.
--
-- !!! NOT VALID + VALIDATE are transaction-legal, but to keep VALIDATE failures
--     isolated per constraint we run each VALIDATE as its own statement.
--     The ADDs are grouped in one tx; the VALIDATEs are autocommit. !!!
--
-- PREREQUISITE: td-3.1-01 committed. Pre-flight audit DB-9/DB-11 counts = 0
--   (otherwise VALIDATE errors and ON_ERROR_STOP halts).
--
-- IDEMPOTENT: ADDs guarded by catalog checks; VALIDATE is a no-op once validated.
--
-- RUN:     psql "$DATABASE_URL" -f scripts/db-migrate/td-3.1-06-checks.sql
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
  -- DB-9: messages.role
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_role_check') THEN
    ALTER TABLE messages
      ADD CONSTRAINT messages_role_check
      CHECK (role IN ('user', 'assistant')) NOT VALID;
    RAISE NOTICE '[DB-9] added messages_role_check (NOT VALID)';
  ELSE RAISE NOTICE '[DB-9] messages_role_check already present — skipped';
  END IF;

  -- DB-9: mind_memories.memory_type
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mind_memories_memory_type_check') THEN
    ALTER TABLE mind_memories
      ADD CONSTRAINT mind_memories_memory_type_check
      CHECK (memory_type IN ('fact', 'preference', 'topic', 'insight')) NOT VALID;
    RAISE NOTICE '[DB-9] added mind_memories_memory_type_check (NOT VALID)';
  ELSE RAISE NOTICE '[DB-9] mind_memories_memory_type_check already present — skipped';
  END IF;

  -- DB-9: debates.status
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debates_status_check') THEN
    ALTER TABLE debates
      ADD CONSTRAINT debates_status_check
      CHECK (status IN ('setup', 'active', 'paused', 'completed')) NOT VALID;
    RAISE NOTICE '[DB-9] added debates_status_check (NOT VALID)';
  ELSE RAISE NOTICE '[DB-9] debates_status_check already present — skipped';
  END IF;

  -- DB-11: token_usage.total_tokens = input + output
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'token_usage_total_tokens_check') THEN
    ALTER TABLE token_usage
      ADD CONSTRAINT token_usage_total_tokens_check
      CHECK (total_tokens = input_tokens + output_tokens) NOT VALID;
    RAISE NOTICE '[DB-11] added token_usage_total_tokens_check (NOT VALID)';
  ELSE RAISE NOTICE '[DB-11] token_usage_total_tokens_check already present — skipped';
  END IF;
END $$;

COMMIT;

-- VALIDATE online, one per statement (isolate failures).
\echo '-- [DB-9] validating messages_role_check --'
ALTER TABLE messages       VALIDATE CONSTRAINT messages_role_check;
\echo '-- [DB-9] validating mind_memories_memory_type_check --'
ALTER TABLE mind_memories  VALIDATE CONSTRAINT mind_memories_memory_type_check;
\echo '-- [DB-9] validating debates_status_check --'
ALTER TABLE debates        VALIDATE CONSTRAINT debates_status_check;
\echo '-- [DB-11] validating token_usage_total_tokens_check --'
ALTER TABLE token_usage    VALIDATE CONSTRAINT token_usage_total_tokens_check;

-- -----------------------------------------------------------------------------
-- VERIFICATION
-- -----------------------------------------------------------------------------
\echo ''
\echo '-- [TD-3.1-06] CHECK constraint state --'
SELECT conname AS constraint_name, convalidated AS is_validated
FROM pg_constraint
WHERE conname IN (
  'messages_role_check',
  'mind_memories_memory_type_check',
  'debates_status_check',
  'token_usage_total_tokens_check'
)
ORDER BY conname;

\echo 'Expected: 4 rows, all is_validated = t.'
\echo 'TD-3.1 schema hardening DDL complete. Run the post-migrate smoke test.'
