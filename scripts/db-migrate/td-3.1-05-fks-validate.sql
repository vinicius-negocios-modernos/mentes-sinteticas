-- =============================================================================
-- TD-3.1 STEP 05 — VALIDATE FOREIGN KEYS  (online, DB-2 / DB-17)
-- =============================================================================
-- Story:   TD-3.1 — Schema Hardening (Tema C / Wave W3)
-- Author:  Dara (@data-engineer)
-- Purpose: Validate the legacy rows against the NOT VALID FKs added in step 04.
--          Each VALIDATE CONSTRAINT scans the table ONCE but takes only
--          SHARE UPDATE EXCLUSIVE — it does NOT block reads or normal writes.
--          If a table still has an orphan, VALIDATE for that table ERRORS and
--          (with ON_ERROR_STOP) the script halts — go back to remediation.
--
-- !!! Run each VALIDATE as its own statement (autocommit). Do NOT wrap in a
--     single BEGIN/COMMIT — keep failures isolated per table so a later table
--     can be retried independently after fixing its orphans. !!!
--
-- PREREQUISITE: td-3.1-04 committed; td-3.1-01 remediation handled orphans.
--
-- IDEMPOTENT: VALIDATE on an already-validated constraint is a cheap no-op.
--
-- RUN:     psql "$DATABASE_URL" -f scripts/db-migrate/td-3.1-05-fks-validate.sql
-- =============================================================================

\set ON_ERROR_STOP on

\echo '-- [DB-2] validating conversations_user_id_users_id_fk --'
ALTER TABLE conversations  VALIDATE CONSTRAINT conversations_user_id_users_id_fk;

\echo '-- [DB-2] validating debates_user_id_users_id_fk --'
ALTER TABLE debates        VALIDATE CONSTRAINT debates_user_id_users_id_fk;

\echo '-- [DB-2] validating mind_memories_user_id_users_id_fk --'
ALTER TABLE mind_memories  VALIDATE CONSTRAINT mind_memories_user_id_users_id_fk;

\echo '-- [DB-2] validating rate_limits_user_id_users_id_fk --'
ALTER TABLE rate_limits    VALIDATE CONSTRAINT rate_limits_user_id_users_id_fk;

\echo '-- [DB-2] validating token_usage_user_id_users_id_fk (SET NULL) --'
ALTER TABLE token_usage    VALIDATE CONSTRAINT token_usage_user_id_users_id_fk;

\echo '-- [DB-17] validating messages_mind_slug_minds_slug_fk --'
ALTER TABLE messages       VALIDATE CONSTRAINT messages_mind_slug_minds_slug_fk;

-- -----------------------------------------------------------------------------
-- VERIFICATION — every FK now convalidated = t.
-- -----------------------------------------------------------------------------
\echo ''
\echo '-- [TD-3.1-05] post-validate state --'
SELECT conname                  AS constraint_name,
       convalidated             AS is_validated
FROM pg_constraint
WHERE conname IN (
  'conversations_user_id_users_id_fk',
  'debates_user_id_users_id_fk',
  'mind_memories_user_id_users_id_fk',
  'rate_limits_user_id_users_id_fk',
  'token_usage_user_id_users_id_fk',
  'messages_mind_slug_minds_slug_fk'
)
ORDER BY conname;

\echo 'Expected: 6 rows, all is_validated = t. If any VALIDATE errored above,'
\echo 'that table still has an orphan — resolve it (see td-3.1-01 policy) and'
\echo 're-run just that ALTER ... VALIDATE. Then proceed to td-3.1-06-checks.sql.'
