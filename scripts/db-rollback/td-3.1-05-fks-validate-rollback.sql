-- =============================================================================
-- TD-3.1 ROLLBACK 05 — undo FK VALIDATE (DB-2 / DB-17)
-- =============================================================================
-- Author: Dara (@data-engineer)
-- Reverses: scripts/db-migrate/td-3.1-05-fks-validate.sql
--
-- IMPORTANT: Postgres has NO "de-validate" operation. A validated constraint
--   cannot be flipped back to NOT VALID in place. To return to the post-step-04
--   state (FKs present but NOT VALID) you must DROP and re-ADD as NOT VALID.
--   This script does exactly that, preserving the same ON DELETE policy.
--
--   If your goal is to remove the FKs entirely, use td-3.1-04-fks-rollback.sql
--   instead. Use THIS script only to re-establish the NOT-VALID intermediate
--   state (e.g. an orphan was found post-validate and you want writes still
--   guarded while you clean up).
--
-- TRANSACTIONAL. IDEMPOTENT (DROP IF EXISTS + guarded ADD).
--
-- RUN:  psql "$DATABASE_URL" -f scripts/db-rollback/td-3.1-05-fks-validate-rollback.sql
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
  -- conversations
  ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user_id_users_id_fk;
  ALTER TABLE conversations
    ADD CONSTRAINT conversations_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

  -- debates
  ALTER TABLE debates DROP CONSTRAINT IF EXISTS debates_user_id_users_id_fk;
  ALTER TABLE debates
    ADD CONSTRAINT debates_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

  -- mind_memories
  ALTER TABLE mind_memories DROP CONSTRAINT IF EXISTS mind_memories_user_id_users_id_fk;
  ALTER TABLE mind_memories
    ADD CONSTRAINT mind_memories_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

  -- rate_limits
  ALTER TABLE rate_limits DROP CONSTRAINT IF EXISTS rate_limits_user_id_users_id_fk;
  ALTER TABLE rate_limits
    ADD CONSTRAINT rate_limits_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

  -- token_usage (SET NULL)
  ALTER TABLE token_usage DROP CONSTRAINT IF EXISTS token_usage_user_id_users_id_fk;
  ALTER TABLE token_usage
    ADD CONSTRAINT token_usage_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL NOT VALID;

  -- messages.mind_slug
  ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_mind_slug_minds_slug_fk;
  ALTER TABLE messages
    ADD CONSTRAINT messages_mind_slug_minds_slug_fk
    FOREIGN KEY (mind_slug) REFERENCES minds(slug)
    ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;

  RAISE NOTICE '[TD-3.1-05 ROLLBACK] FKs returned to NOT VALID state';
END $$;

COMMIT;

\echo '[TD-3.1-05 ROLLBACK] FKs are NOT VALID again (writes still enforced).'
