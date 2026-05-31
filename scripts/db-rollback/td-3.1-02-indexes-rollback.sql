-- =============================================================================
-- TD-3.1 ROLLBACK 02 — drop the indexes (DB-6 / DB-18 / DB-7)
-- =============================================================================
-- Author: Dara (@data-engineer)
-- Reverses: scripts/db-migrate/td-3.1-02-indexes.sql
--
-- !!! STANDALONE / AUTOCOMMIT — DROP INDEX CONCURRENTLY cannot run in a tx. !!!
--   Do NOT wrap in BEGIN/COMMIT, do NOT use --single-transaction.
--
-- SAFETY: dropping an index never affects table data. CONCURRENTLY keeps it
--   online. IF EXISTS makes it idempotent. Also drops INVALID leftovers from an
--   interrupted CONCURRENTLY build.
--
-- RUN:    psql "$DATABASE_URL" -f scripts/db-rollback/td-3.1-02-indexes-rollback.sql
-- =============================================================================

\set ON_ERROR_STOP on

DROP INDEX CONCURRENTLY IF EXISTS idx_messages_conversation_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_conversations_user_updated;
DROP INDEX CONCURRENTLY IF EXISTS idx_conversations_mind;
DROP INDEX CONCURRENTLY IF EXISTS idx_debates_user;
DROP INDEX CONCURRENTLY IF EXISTS idx_knowledge_documents_mind;
DROP INDEX CONCURRENTLY IF EXISTS idx_messages_created_at;
DROP INDEX CONCURRENTLY IF EXISTS conversations_share_token_uniq;

\echo '[TD-3.1-02 ROLLBACK] indexes dropped.'
