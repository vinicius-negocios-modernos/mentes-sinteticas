-- =============================================================================
-- TD-3.1 ROLLBACK 06 — drop CHECK constraints (DB-9 / DB-11)
-- =============================================================================
-- Author: Dara (@data-engineer)
-- Reverses: scripts/db-migrate/td-3.1-06-checks.sql
--
-- TRANSACTIONAL. DROP CONSTRAINT is instant, no data effect. IDEMPOTENT.
--
-- RUN:  psql "$DATABASE_URL" -f scripts/db-rollback/td-3.1-06-checks-rollback.sql
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

ALTER TABLE messages       DROP CONSTRAINT IF EXISTS messages_role_check;
ALTER TABLE mind_memories  DROP CONSTRAINT IF EXISTS mind_memories_memory_type_check;
ALTER TABLE debates        DROP CONSTRAINT IF EXISTS debates_status_check;
ALTER TABLE token_usage    DROP CONSTRAINT IF EXISTS token_usage_total_tokens_check;

COMMIT;

\echo '[TD-3.1-06 ROLLBACK] CHECK constraints dropped.'
