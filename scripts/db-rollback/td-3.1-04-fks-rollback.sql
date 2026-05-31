-- =============================================================================
-- TD-3.1 ROLLBACK 04 — drop the FKs (DB-2 / DB-15 / DB-17)
-- =============================================================================
-- Author: Dara (@data-engineer)
-- Reverses: scripts/db-migrate/td-3.1-04-fks-add-notvalid.sql
--   (also undoes td-3.1-05's VALIDATE — dropping the constraint removes it
--    whether validated or not).
--
-- TRANSACTIONAL: DROP CONSTRAINT is tx-legal; group atomically. DROP CONSTRAINT
--   is instant and never touches table data.
--
-- DB-15 restore: re-creates the original implicit "no action" mind_id FK from
--   migration 0002 so the baseline is byte-identical.
-- token_usage.user_id: restored to NOT NULL ONLY if no NULLs exist (a prior
--   SET NULL cascade may have created some — guarded).
--
-- IDEMPOTENT: DROP ... IF EXISTS; ADD guarded by catalog check.
--
-- RUN:  psql "$DATABASE_URL" -f scripts/db-rollback/td-3.1-04-fks-rollback.sql
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

ALTER TABLE conversations  DROP CONSTRAINT IF EXISTS conversations_user_id_users_id_fk;
ALTER TABLE debates        DROP CONSTRAINT IF EXISTS debates_user_id_users_id_fk;
ALTER TABLE mind_memories  DROP CONSTRAINT IF EXISTS mind_memories_user_id_users_id_fk;
ALTER TABLE rate_limits    DROP CONSTRAINT IF EXISTS rate_limits_user_id_users_id_fk;
ALTER TABLE token_usage    DROP CONSTRAINT IF EXISTS token_usage_user_id_users_id_fk;
ALTER TABLE messages       DROP CONSTRAINT IF EXISTS messages_mind_slug_minds_slug_fk;

-- DB-15: drop explicit RESTRICT, restore original implicit no-action FK.
ALTER TABLE debate_participants
  DROP CONSTRAINT IF EXISTS debate_participants_mind_id_minds_id_restrict_fk;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debate_participants_mind_id_minds_id_fk') THEN
    ALTER TABLE debate_participants
      ADD CONSTRAINT debate_participants_mind_id_minds_id_fk
      FOREIGN KEY (mind_id) REFERENCES minds(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
    RAISE NOTICE '[DB-15 ROLLBACK] restored original no-action mind_id FK';
  END IF;
END $$;

-- Restore token_usage.user_id NOT NULL only if safe (no NULLs present).
DO $$
DECLARE
  v_nulls integer;
BEGIN
  SELECT count(*) INTO v_nulls FROM token_usage WHERE user_id IS NULL;
  IF v_nulls = 0 THEN
    ALTER TABLE token_usage ALTER COLUMN user_id SET NOT NULL;
    RAISE NOTICE '[DB-2 ROLLBACK] token_usage.user_id restored to NOT NULL';
  ELSE
    RAISE NOTICE '[DB-2 ROLLBACK] token_usage.user_id left NULLABLE (% NULL rows present)', v_nulls;
  END IF;
END $$;

COMMIT;

\echo '[TD-3.1-04 ROLLBACK] FKs dropped; DB-15 baseline restored.'
