-- =============================================================================
-- TD-3.1 PRE-FLIGHT AUDIT  (READ-ONLY — NO MUTATIONS)
-- =============================================================================
-- Story:   TD-3.1 — Schema Hardening (Tema C / Wave W3)
-- Author:  Dara (@data-engineer)
-- Purpose: Tell the operator EXACTLY what remediation is required BEFORE any
--          constraint / unique / FK is added. A constraint added over dirty
--          data (duplicates or orphans) FAILS and aborts. Run this first.
--
-- Debts probed: DB-5 (file_uri_cache duplicates), DB-2 (user_id orphans x5),
--               DB-15 (debate_participants.mind_id orphans), DB-17 (messages.mind_slug
--               orphans vs minds.slug), DB-3 (NFD-encoded local_path rows).
--
-- SAFETY:  100% SELECTs. No INSERT / UPDATE / DELETE / DDL. Safe to run on prod
--          at any time, no lock impact beyond brief shared read locks.
--
-- RUN:     psql "$DATABASE_URL" -f scripts/db-audit/td-3.1-preflight-audit.sql
--          (see docs/runbooks/migrations.md → TD-3.1 for the SSH-tunnel pattern)
--
-- GO/NO-GO GATE: every "*_violations" / "*_orphans" count below MUST be 0,
--                OR have an explicit documented decision, before proceeding to
--                td-3.1-01-remediate.sql.
-- =============================================================================

\echo '== TD-3.1 PRE-FLIGHT AUDIT =================================================='
\echo ''

-- -----------------------------------------------------------------------------
-- DB-5 — file_uri_cache duplicates on knowledge_document_id
--        Adding UNIQUE will FAIL if any group has count > 1.
-- -----------------------------------------------------------------------------
\echo '-- [DB-5] file_uri_cache duplicate knowledge_document_id groups --'
SELECT
  count(*)                                AS duplicate_groups,
  COALESCE(sum(c) FILTER (WHERE c > 1), 0) AS total_rows_in_dup_groups,
  COALESCE(sum(c - 1) FILTER (WHERE c > 1), 0) AS rows_to_delete_on_dedupe
FROM (
  SELECT knowledge_document_id, count(*) AS c
  FROM file_uri_cache
  GROUP BY knowledge_document_id
) g
WHERE c > 1;

\echo '   (detail: the actual duplicated ids, if any)'
SELECT knowledge_document_id, count(*) AS rows
FROM file_uri_cache
GROUP BY knowledge_document_id
HAVING count(*) > 1
ORDER BY rows DESC;

-- -----------------------------------------------------------------------------
-- DB-2 — user_id orphans across the 5 tables (no FK to users today).
--        Adding FK + VALIDATE will FAIL if orphans > 0.
-- -----------------------------------------------------------------------------
\echo ''
\echo '-- [DB-2] user_id orphans (rows whose user_id has no matching users.id) --'
SELECT 'conversations' AS table_name,
       count(*)        AS user_id_orphans
FROM conversations c
LEFT JOIN users u ON c.user_id = u.id
WHERE u.id IS NULL
UNION ALL
SELECT 'debates',
       count(*)
FROM debates d
LEFT JOIN users u ON d.user_id = u.id
WHERE u.id IS NULL
UNION ALL
SELECT 'mind_memories',
       count(*)
FROM mind_memories m
LEFT JOIN users u ON m.user_id = u.id
WHERE u.id IS NULL
UNION ALL
SELECT 'rate_limits',
       count(*)
FROM rate_limits r
LEFT JOIN users u ON r.user_id = u.id
WHERE u.id IS NULL
UNION ALL
SELECT 'token_usage',
       count(*)
FROM token_usage t
LEFT JOIN users u ON t.user_id = u.id
WHERE u.id IS NULL
ORDER BY table_name;

-- -----------------------------------------------------------------------------
-- DB-15 — debate_participants.mind_id orphans vs minds.id
--         FK already exists (ON DELETE no action) from migration 0002, so
--         orphans are unlikely; this confirms before we re-state the policy.
-- -----------------------------------------------------------------------------
\echo ''
\echo '-- [DB-15] debate_participants.mind_id orphans vs minds.id --'
SELECT count(*) AS mind_id_orphans
FROM debate_participants dp
LEFT JOIN minds m ON dp.mind_id = m.id
WHERE m.id IS NULL;

-- -----------------------------------------------------------------------------
-- DB-17 — messages.mind_slug orphans vs minds.slug
--         mind_slug is nullable (null for normal chat). Only non-null slugs
--         that do not match an existing mind are orphans. FK will be added as
--         NOT VALID + VALIDATE — VALIDATE fails if any non-null orphan exists.
-- -----------------------------------------------------------------------------
\echo ''
\echo '-- [DB-17] messages.mind_slug orphans vs minds.slug (non-null only) --'
SELECT count(*) AS mind_slug_orphans
FROM messages msg
LEFT JOIN minds m ON msg.mind_slug = m.slug
WHERE msg.mind_slug IS NOT NULL
  AND m.slug IS NULL;

\echo '   (detail: the distinct orphan slugs, if any)'
SELECT DISTINCT msg.mind_slug
FROM messages msg
LEFT JOIN minds m ON msg.mind_slug = m.slug
WHERE msg.mind_slug IS NOT NULL
  AND m.slug IS NULL;

-- -----------------------------------------------------------------------------
-- DB-3 — NFD-encoded local_path rows in knowledge_documents.
--        A path is NFD-affected when NFC normalization changes the string.
--        These rows are why the write-side JOIN-by-equality missed M1.
--        The remediation backfills them to NFC.
-- -----------------------------------------------------------------------------
\echo ''
\echo '-- [DB-3] knowledge_documents.local_path rows that change under NFC --'
SELECT count(*) AS nfd_rows_needing_backfill
FROM knowledge_documents
WHERE local_path IS NOT NULL
  AND local_path <> normalize(local_path, NFC);

\echo '   (detail: which docs differ — display_name only, path may contain accents)'
SELECT id, display_name
FROM knowledge_documents
WHERE local_path IS NOT NULL
  AND local_path <> normalize(local_path, NFC)
ORDER BY display_name;

-- -----------------------------------------------------------------------------
-- DB-9 — pre-existing enum-violating values (CHECK will FAIL if present).
-- -----------------------------------------------------------------------------
\echo ''
\echo '-- [DB-9] rows that would violate the new enum CHECKs --'
SELECT 'messages.role'         AS column_ref,
       count(*)                AS violations
FROM messages
WHERE role NOT IN ('user', 'assistant')
UNION ALL
SELECT 'mind_memories.memory_type',
       count(*)
FROM mind_memories
WHERE memory_type NOT IN ('fact', 'preference', 'topic', 'insight')
UNION ALL
SELECT 'debates.status',
       count(*)
FROM debates
WHERE status NOT IN ('setup', 'active', 'paused', 'completed')
ORDER BY column_ref;

-- -----------------------------------------------------------------------------
-- DB-11 — token_usage rows where total_tokens <> input+output (CHECK will FAIL).
-- -----------------------------------------------------------------------------
\echo ''
\echo '-- [DB-11] token_usage rows violating total_tokens = input + output --'
SELECT count(*) AS total_tokens_violations
FROM token_usage
WHERE total_tokens <> input_tokens + output_tokens;

-- -----------------------------------------------------------------------------
-- DB-7 — share_token duplicates (partial UNIQUE will FAIL on a collision).
--        crypto.randomBytes(32) makes collision ~impossible, but verify.
-- -----------------------------------------------------------------------------
\echo ''
\echo '-- [DB-7] conversations.share_token duplicate non-null values --'
SELECT count(*) AS share_token_collisions
FROM (
  SELECT share_token
  FROM conversations
  WHERE share_token IS NOT NULL
  GROUP BY share_token
  HAVING count(*) > 1
) g;

\echo ''
\echo '== END PRE-FLIGHT AUDIT ===================================================='
\echo 'GO criterion: every count above is 0 (or has an explicit documented'
\echo 'decision). Then proceed to scripts/db-migrate/td-3.1-01-remediate.sql.'
