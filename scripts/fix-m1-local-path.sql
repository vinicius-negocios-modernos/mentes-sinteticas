-- Fix M1 knowledge document local_path and insert missing file_uri_cache entry
-- Problem: local_path was missing .md extension, causing JOIN failure during ingest
-- Result: M1 had no cached Gemini file URI (20/21 instead of 21/21)

BEGIN;

-- Step 1: Fix local_path in knowledge_documents (add missing .md extension)
UPDATE knowledge_documents
SET local_path = 'Antonio Napole/M1 - História de Vida e Formação.md',
    updated_at = NOW()
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
