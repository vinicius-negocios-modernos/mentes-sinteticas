-- =============================================================================
-- TD-3.1 STEP 02 — INDEXES  (STANDALONE / AUTOCOMMIT — NO TRANSACTION WRAPPER)
-- =============================================================================
-- Story:   TD-3.1 — Schema Hardening (Tema C / Wave W3)
-- Author:  Dara (@data-engineer)
-- Debts:   DB-6 (hot FK / filter indexes), DB-18 (created_at ordering),
--          DB-7 (conversations.share_token partial UNIQUE).
--
-- !!! CRITICAL — DO NOT WRAP THIS FILE IN BEGIN/COMMIT !!!
--   CREATE INDEX CONCURRENTLY and CREATE UNIQUE INDEX CONCURRENTLY CANNOT run
--   inside a transaction block. Postgres errors:
--     "CREATE INDEX CONCURRENTLY cannot run inside a transaction block".
--   Run with autocommit ON (the default for: psql ... -f <file>). Do NOT pass
--   -1 / --single-transaction. Do NOT run via drizzle-kit migrate (it has no
--   outer tx, but author them as their own files anyway — see runbook).
--
-- IDEMPOTENT: every statement uses IF NOT EXISTS. Re-running is safe. If a prior
--   CONCURRENTLY build was interrupted it can leave an INVALID index — see the
--   verification block at the end to detect/clean those.
--
-- LOCK IMPACT: CONCURRENTLY takes only SHARE UPDATE EXCLUSIVE — it does NOT block
--   reads or writes. Slower to build, but online. Each runs to completion before
--   the next (autocommit per statement).
--
-- PREREQUISITES: td-3.1-01-remediate.sql committed; DB-7 collisions = 0 (audit).
--
-- RUN:     psql "$DATABASE_URL" -f scripts/db-migrate/td-3.1-02-indexes.sql
-- =============================================================================

\set ON_ERROR_STOP on

-- -----------------------------------------------------------------------------
-- DB-6 — hot read paths. messages.conversation_id is the hottest (chat fetch).
--        Composite (conversation_id, created_at) also serves DB-18 ordering.
-- -----------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_created
  ON messages (conversation_id, created_at);

-- DB-6 — conversations list per user, newest first.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_updated
  ON conversations (user_id, updated_at DESC);

-- DB-6 — conversations filtered by mind.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_mind
  ON conversations (mind_id);

-- DB-6 — debates listed per user.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_debates_user
  ON debates (user_id);

-- DB-6 — knowledge_documents filtered by mind (knowledge fetch / ingest).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_documents_mind
  ON knowledge_documents (mind_id);

-- NOTE: file_uri_cache(knowledge_document_id) is INTENTIONALLY omitted here —
-- the UNIQUE index in td-3.1-03 covers that FK lookup. Creating a plain index
-- too would be redundant.

-- -----------------------------------------------------------------------------
-- DB-18 — chronological ordering on messages.created_at standalone (the chat
--         path is covered by the composite above; this serves global/admin
--         time-ordered scans). conversations ordering is covered by
--         idx_conversations_user_updated.
-- -----------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_created_at
  ON messages (created_at);

-- -----------------------------------------------------------------------------
-- DB-7 — share_token: partial UNIQUE index (only non-null shared rows). Keeps
--        NULLs free, indexes only shared conversations, gives both the index
--        (kills the public-share seq scan) AND collision protection.
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS conversations_share_token_uniq
  ON conversations (share_token)
  WHERE share_token IS NOT NULL;

-- -----------------------------------------------------------------------------
-- VERIFICATION — all expected indexes present and VALID (not INVALID from an
-- interrupted CONCURRENTLY build).
-- -----------------------------------------------------------------------------
\echo ''
\echo '-- [TD-3.1-02] index presence + validity --'
SELECT i.relname        AS index_name,
       idx.indisvalid   AS is_valid,
       idx.indisready   AS is_ready
FROM pg_class i
JOIN pg_index idx ON idx.indexrelid = i.oid
WHERE i.relname IN (
  'idx_messages_conversation_created',
  'idx_conversations_user_updated',
  'idx_conversations_mind',
  'idx_debates_user',
  'idx_knowledge_documents_mind',
  'idx_messages_created_at',
  'conversations_share_token_uniq'
)
ORDER BY i.relname;

\echo 'Expected: 7 rows, all is_valid = t. Any is_valid = f => interrupted build,'
\echo 'DROP it (rollback script) and re-run. Then proceed to td-3.1-03.'
