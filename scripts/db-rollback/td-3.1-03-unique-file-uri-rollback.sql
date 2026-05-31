-- =============================================================================
-- TD-3.1 ROLLBACK 03 — drop the file_uri_cache UNIQUE (DB-5)
-- =============================================================================
-- Author: Dara (@data-engineer)
-- Reverses: scripts/db-migrate/td-3.1-03-unique-file-uri.sql
--
-- !!! STANDALONE / AUTOCOMMIT — DROP INDEX CONCURRENTLY cannot run in a tx. !!!
--
-- NOTE: dropping this index re-breaks the ON CONFLICT (knowledge_document_id)
--   upsert (DB-5). Only roll back if the build was INVALID (duplicates slipped
--   in) — then re-run td-3.1-01-remediate.sql and td-3.1-03 again. IF EXISTS
--   makes it idempotent and also removes an INVALID leftover.
--
-- RUN:  psql "$DATABASE_URL" -f scripts/db-rollback/td-3.1-03-unique-file-uri-rollback.sql
-- =============================================================================

\set ON_ERROR_STOP on

DROP INDEX CONCURRENTLY IF EXISTS file_uri_cache_kdid_uniq;

\echo '[TD-3.1-03 ROLLBACK] file_uri_cache_kdid_uniq dropped.'
\echo 'WARNING: ON CONFLICT upsert is broken again until the unique is re-created.'
