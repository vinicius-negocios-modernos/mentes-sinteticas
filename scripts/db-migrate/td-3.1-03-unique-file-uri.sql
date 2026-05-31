-- =============================================================================
-- TD-3.1 STEP 03 — UNIQUE on file_uri_cache  (THE GEMINI CACHE UNLOCK — DB-5 🔴)
-- =============================================================================
-- Story:   TD-3.1 — Schema Hardening (Tema C / Wave W3)
-- Author:  Dara (@data-engineer)
-- Debt:    DB-5 (Critical) — file_uri_cache had no UNIQUE on knowledge_document_id,
--          so `INSERT ... ON CONFLICT (knowledge_document_id)` threw
--          "there is no unique or exclusion constraint matching the ON CONFLICT
--          specification" and aborted the upsert. This is the structural root of
--          the non-recoverable Gemini cache-miss. After this index, the upsert
--          works → cache refresh is restored.
--
-- !!! CRITICAL — STANDALONE / AUTOCOMMIT — DO NOT WRAP IN BEGIN/COMMIT !!!
--   CREATE UNIQUE INDEX CONCURRENTLY cannot run inside a transaction block.
--
-- PREREQUISITE (HARD GATE): td-3.1-01-remediate.sql MUST have committed and the
--   dedupe assertion passed. If any duplicate knowledge_document_id remains,
--   this CONCURRENTLY build finishes as an INVALID index (does not error loudly
--   on some paths) — the guard block below catches that and tells you to retry.
--
-- LOCK IMPACT: SHARE UPDATE EXCLUSIVE only — online, does not block reads/writes.
--
-- RUN:     psql "$DATABASE_URL" -f scripts/db-migrate/td-3.1-03-unique-file-uri.sql
-- =============================================================================

\set ON_ERROR_STOP on

-- Pre-build guard (autocommit, read-only): refuse to build over duplicates.
-- (Cannot DO/RAISE-EXCEPTION conditionally abort a non-tx script cleanly, so we
--  surface the count loudly; ON_ERROR_STOP + the post-build validity check are
--  the real gate.)
\echo '-- [DB-5] pre-build duplicate check (must be 0) --'
SELECT count(*) AS remaining_duplicate_groups
FROM (
  SELECT knowledge_document_id
  FROM file_uri_cache
  GROUP BY knowledge_document_id
  HAVING count(*) > 1
) g;

-- The unlock. Concurrent, idempotent.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS file_uri_cache_kdid_uniq
  ON file_uri_cache (knowledge_document_id);

-- -----------------------------------------------------------------------------
-- VERIFICATION — index exists AND is valid. An INVALID index here means the
-- build hit a duplicate; drop it (rollback 03), re-run remediation, retry.
-- -----------------------------------------------------------------------------
\echo ''
\echo '-- [TD-3.1-03] file_uri_cache_kdid_uniq presence + validity --'
SELECT i.relname      AS index_name,
       idx.indisunique AS is_unique,
       idx.indisvalid  AS is_valid
FROM pg_class i
JOIN pg_index idx ON idx.indexrelid = i.oid
WHERE i.relname = 'file_uri_cache_kdid_uniq';

\echo 'Expected: 1 row, is_unique = t, is_valid = t.'
\echo 'If is_valid = f => duplicates slipped through: run rollback 03, re-run'
\echo 'td-3.1-01-remediate.sql, then this script again.'
\echo ''
\echo 'POST-CHECK (smoke): an ON CONFLICT (knowledge_document_id) upsert now'
\echo 'succeeds instead of erroring. Verify Gemini cache via the runbook step.'
