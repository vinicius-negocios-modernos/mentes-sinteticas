-- =============================================================================
-- TD-3.1 STEP 01 — DATA REMEDIATION  (runs in a transaction; BEFORE the DDL)
-- =============================================================================
-- Story:   TD-3.1 — Schema Hardening (Tema C / Wave W3)
-- Author:  Dara (@data-engineer)
-- Purpose: Clean the data so the prod-safe DDL (steps 02-06) cannot fail.
--          A UNIQUE / FK added over duplicates or orphans aborts the migration.
--          This script removes the dirt FIRST.
--
-- Covers:  DB-5 (dedupe file_uri_cache, keep newest per knowledge_document_id),
--          DB-3 (NFC-normalize legacy local_path backfill),
--          DB-2 (quarantine/clean user_id orphans per the per-table policy).
--
-- PREREQUISITES:
--   1. pg_dump backup taken (npm run db:migrate:safe -- --backup, or manual).
--   2. scripts/db-audit/td-3.1-preflight-audit.sql reviewed — you KNOW the counts.
--
-- SAFETY:  Wrapped in a single BEGIN/COMMIT. Idempotent — re-running is a no-op
--          once data is clean. Emits RAISE NOTICE row counts. No DDL here.
--
-- ORPHAN POLICY (per fase-5 review §3-Q2 / §5):
--   - rate_limits      : DELETE orphans (ephemeral, TTL'd anyway).
--   - conversations    : DO NOT auto-delete — RAISE EXCEPTION if found (investigate).
--   - debates          : DO NOT auto-delete — RAISE EXCEPTION if found (investigate).
--   - mind_memories    : DO NOT auto-delete — RAISE EXCEPTION if found (investigate).
--   - token_usage      : token_usage.user_id FK will be ON DELETE SET NULL, so we
--                        do NOT delete billing rows; orphans are handled at FK time
--                        only IF the column is made nullable. Here we ONLY report.
--   This keeps destructive action minimal and forces a human decision on the
--   tables that represent real user content / billing.
--
-- RUN:     psql "$DATABASE_URL" -f scripts/db-migrate/td-3.1-01-remediate.sql
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- -----------------------------------------------------------------------------
-- DB-5 — Dedupe file_uri_cache: keep MAX(created_at) per knowledge_document_id.
--        Tie-break on created_at then id (deterministic). Idempotent: once one
--        row per group remains, the DELETE matches nothing.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_deleted integer;
BEGIN
  WITH ranked AS (
    SELECT id,
           row_number() OVER (
             PARTITION BY knowledge_document_id
             ORDER BY created_at DESC, id DESC
           ) AS rn
    FROM file_uri_cache
  )
  DELETE FROM file_uri_cache f
  USING ranked r
  WHERE f.id = r.id
    AND r.rn > 1;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE '[DB-5] file_uri_cache duplicates deleted: %', v_deleted;
END $$;

-- Post-dedupe assertion: no duplicates may remain (gate for the UNIQUE step).
DO $$
DECLARE
  v_dups integer;
BEGIN
  SELECT count(*) INTO v_dups
  FROM (
    SELECT knowledge_document_id
    FROM file_uri_cache
    GROUP BY knowledge_document_id
    HAVING count(*) > 1
  ) g;

  IF v_dups > 0 THEN
    RAISE EXCEPTION '[DB-5] % duplicate groups still present after dedupe — aborting', v_dups;
  END IF;
  RAISE NOTICE '[DB-5] OK: file_uri_cache has at most one row per knowledge_document_id';
END $$;

-- -----------------------------------------------------------------------------
-- DB-3 — NFC-normalize legacy local_path. The app reads by UUID (not local_path),
--        so this is write-side hygiene: future JOIN-by-equality / LIKE in the
--        ingest pipeline will match. Idempotent: rows already NFC are skipped by
--        the WHERE clause.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE knowledge_documents
  SET local_path = normalize(local_path, NFC)
  WHERE local_path IS NOT NULL
    AND local_path <> normalize(local_path, NFC);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE '[DB-3] knowledge_documents.local_path NFC-normalized: % rows', v_updated;
END $$;

-- -----------------------------------------------------------------------------
-- DB-2 — user_id orphan handling per table.
-- -----------------------------------------------------------------------------

-- rate_limits: safe to delete orphans (ephemeral).
DO $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM rate_limits r
  WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = r.user_id);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE '[DB-2] rate_limits orphan rows deleted: %', v_deleted;
END $$;

-- conversations / debates / mind_memories: NEVER auto-delete user content.
-- Abort and force investigation if any orphan exists.
DO $$
DECLARE
  v_conv integer;
  v_deb  integer;
  v_mem  integer;
BEGIN
  SELECT count(*) INTO v_conv FROM conversations c
    WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = c.user_id);
  SELECT count(*) INTO v_deb  FROM debates d
    WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = d.user_id);
  SELECT count(*) INTO v_mem  FROM mind_memories m
    WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = m.user_id);

  IF v_conv > 0 OR v_deb > 0 OR v_mem > 0 THEN
    RAISE EXCEPTION
      '[DB-2] user-content orphans present (conversations=%, debates=%, mind_memories=%). '
      'These are NOT auto-cleaned. Investigate (likely a stale Supabase-era user_id), '
      'reassign or remove deliberately, then re-run.', v_conv, v_deb, v_mem;
  END IF;
  RAISE NOTICE '[DB-2] OK: no orphans in conversations / debates / mind_memories';
END $$;

-- token_usage: billing data — only REPORT orphans (FK will be ON DELETE SET NULL
-- and the column made nullable in step 04; do not destroy cost history here).
DO $$
DECLARE
  v_tok integer;
BEGIN
  SELECT count(*) INTO v_tok FROM token_usage t
    WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = t.user_id);
  RAISE NOTICE '[DB-2] token_usage orphan rows (preserved, set NULL at FK step): %', v_tok;
END $$;

-- -----------------------------------------------------------------------------
-- DB-17 — messages.mind_slug orphans vs minds.slug.
--         mind_slug is debates-only metadata; an orphan slug means a renamed/
--         removed mind. Report only — the operator decides (NULL it, or fix the
--         mind). VALIDATE in step 05 will block if these are not resolved.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_slug integer;
BEGIN
  SELECT count(*) INTO v_slug
  FROM messages msg
  WHERE msg.mind_slug IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM minds m WHERE m.slug = msg.mind_slug);
  IF v_slug > 0 THEN
    RAISE NOTICE '[DB-17] WARNING: % messages have an orphan mind_slug. '
                 'Resolve before td-3.1-05 VALIDATE, or that step will fail.', v_slug;
  ELSE
    RAISE NOTICE '[DB-17] OK: no orphan messages.mind_slug';
  END IF;
END $$;

COMMIT;

\echo ''
\echo '== TD-3.1 STEP 01 remediation COMMITTED ===================================='
\echo 'Next: run the standalone (autocommit) DDL scripts, in order:'
\echo '  td-3.1-02-indexes.sql  -> td-3.1-03-unique-file-uri.sql'
\echo '  -> td-3.1-04-fks-add-notvalid.sql -> td-3.1-05-fks-validate.sql'
\echo '  -> td-3.1-06-checks.sql'
\echo 'Those MUST be run WITHOUT a transaction wrapper (CONCURRENTLY restriction).'
