-- =============================================================================
-- DEPRECATED — DO NOT RUN / DO NOT REUSE AS TEMPLATE (TD-0.1 / DB-4)
-- =============================================================================
-- This is a one-off remediation artifact from a past incident (M1 local_path
-- missing .md extension). It is kept only for historical/audit reference.
--
-- Why deprecated:
--   * `knowledge_documents` has NO `updated_at` column. The original Step 1
--     wrote `updated_at = NOW()`, which would error. It never corrupted prod
--     because the whole script runs inside BEGIN/COMMIT (an error aborts the
--     transaction and rolls back). The offending column write has been removed.
--   * The hardcoded file_uri / expires_at values below are long expired and
--     specific to a single historical run — not reusable.
--   * Going forward, local_path values are NFC-normalized at ingest time
--     (see scripts/ingest_mind.ts), removing the root cause of JOIN mismatch.
--
-- If a similar fix is ever needed, write a fresh script — do not copy this one.
-- =============================================================================

BEGIN;

-- Step 1: Fix local_path in knowledge_documents (add missing .md extension)
-- NOTE: `updated_at` write removed — knowledge_documents has no such column.
UPDATE knowledge_documents
SET local_path = 'Antonio Napole/M1 - História de Vida e Formação.md'
WHERE local_path = 'Antonio Napole/M1 - História de Vida e Formação';

-- Step 2: Insert missing file_uri_cache entry for M1
-- Uses ON CONFLICT to handle re-runs safely (upsert)
INSERT INTO file_uri_cache (id, knowledge_document_id, file_uri, mime_type, expires_at, created_at, updated_at)
SELECT
  gen_random_uuid(),
  kd.id,
  'https://generativelanguage.googleapis.com/v1beta/files/xxcc612yi2q3',
  'text/markdown',
  '2026-03-10T05:17:13.393709196Z'::timestamptz,
  NOW(),
  NOW()
FROM knowledge_documents kd
JOIN minds m ON m.id = kd.mind_id AND m.name = 'Antonio Napole'
WHERE kd.local_path = 'Antonio Napole/M1 - História de Vida e Formação.md'
ON CONFLICT (knowledge_document_id) DO UPDATE SET
  file_uri = EXCLUDED.file_uri,
  mime_type = EXCLUDED.mime_type,
  expires_at = EXCLUDED.expires_at,
  updated_at = NOW();

COMMIT;

-- Step 3: Verify all 21 documents have cached URIs
SELECT
  COUNT(*) AS total_documents,
  COUNT(fuc.id) AS cached_uris,
  COUNT(*) - COUNT(fuc.id) AS missing_uris
FROM knowledge_documents kd
JOIN minds m ON m.id = kd.mind_id AND m.name = 'Antonio Napole'
LEFT JOIN file_uri_cache fuc ON fuc.knowledge_document_id = kd.id;
