-- =============================================================================
-- TD-3.1 STEP 04 — ADD FOREIGN KEYS as NOT VALID  (DB-2 / DB-15 / DB-17)
-- =============================================================================
-- Story:   TD-3.1 — Schema Hardening (Tema C / Wave W3)
-- Author:  Dara (@data-engineer)
-- Debts:   DB-2  — user_id FKs on conversations/debates/mind_memories/
--                  rate_limits/token_usage (5 tables, none had a FK to users).
--          DB-15 — debate_participants.mind_id policy made EXPLICIT (RESTRICT).
--          DB-17 — messages.mind_slug FK to minds.slug.
--
-- STRATEGY (prod-safe on live data):
--   ADD CONSTRAINT ... NOT VALID  → fast, takes only a brief ACCESS EXCLUSIVE to
--   record the constraint in the catalog, does NOT scan existing rows, does NOT
--   block concurrent DML beyond that instant. New writes ARE checked immediately.
--   Legacy rows are validated separately in td-3.1-05 (online VALIDATE).
--
-- !!! This file uses a TRANSACTION (BEGIN/COMMIT) on purpose — ADD CONSTRAINT
--     NOT VALID is allowed in a transaction (unlike CONCURRENTLY). Wrapping all
--     ADDs together makes the catalog change atomic. !!!
--
-- ON DELETE POLICY (per fase-5 review §5):
--   conversations.user_id  -> CASCADE      (user delete removes their chats)
--   mind_memories.user_id  -> CASCADE      (personal data)
--   debates.user_id        -> CASCADE      (personal data)
--   rate_limits.user_id    -> CASCADE      (ephemeral)
--   token_usage.user_id    -> SET NULL     (PRESERVE billing/audit history)
--   debate_participants.mind_id -> RESTRICT (block deleting a mind in use — DB-15)
--   messages.mind_slug     -> minds.slug, ON DELETE SET NULL, ON UPDATE CASCADE
--                             (slug rename propagates; mind delete nulls the slug)
--
-- PREREQUISITES: td-3.1-01-remediate.sql committed; orphan audit handled.
--   token_usage.user_id must be NULLABLE for SET NULL to be legal — done below.
--
-- IDEMPOTENT: each ADD is guarded by a catalog check (skip if constraint exists).
--
-- RUN:     psql "$DATABASE_URL" -f scripts/db-migrate/td-3.1-04-fks-add-notvalid.sql
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- token_usage.user_id must allow NULL so ON DELETE SET NULL is valid.
-- (Idempotent: DROP NOT NULL is a no-op if already nullable.)
ALTER TABLE token_usage ALTER COLUMN user_id DROP NOT NULL;

-- Helper: add a constraint only if it does not already exist.
DO $$
BEGIN
  -- DB-2: conversations.user_id -> users(id) CASCADE
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_user_id_users_id_fk') THEN
    ALTER TABLE conversations
      ADD CONSTRAINT conversations_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;
    RAISE NOTICE '[DB-2] added conversations_user_id_users_id_fk (NOT VALID)';
  ELSE RAISE NOTICE '[DB-2] conversations FK already present — skipped';
  END IF;

  -- DB-2: debates.user_id -> users(id) CASCADE
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debates_user_id_users_id_fk') THEN
    ALTER TABLE debates
      ADD CONSTRAINT debates_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;
    RAISE NOTICE '[DB-2] added debates_user_id_users_id_fk (NOT VALID)';
  ELSE RAISE NOTICE '[DB-2] debates FK already present — skipped';
  END IF;

  -- DB-2: mind_memories.user_id -> users(id) CASCADE
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mind_memories_user_id_users_id_fk') THEN
    ALTER TABLE mind_memories
      ADD CONSTRAINT mind_memories_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;
    RAISE NOTICE '[DB-2] added mind_memories_user_id_users_id_fk (NOT VALID)';
  ELSE RAISE NOTICE '[DB-2] mind_memories FK already present — skipped';
  END IF;

  -- DB-2: rate_limits.user_id -> users(id) CASCADE
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rate_limits_user_id_users_id_fk') THEN
    ALTER TABLE rate_limits
      ADD CONSTRAINT rate_limits_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;
    RAISE NOTICE '[DB-2] added rate_limits_user_id_users_id_fk (NOT VALID)';
  ELSE RAISE NOTICE '[DB-2] rate_limits FK already present — skipped';
  END IF;

  -- DB-2: token_usage.user_id -> users(id) SET NULL (preserve billing)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'token_usage_user_id_users_id_fk') THEN
    ALTER TABLE token_usage
      ADD CONSTRAINT token_usage_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL NOT VALID;
    RAISE NOTICE '[DB-2] added token_usage_user_id_users_id_fk (NOT VALID, SET NULL)';
  ELSE RAISE NOTICE '[DB-2] token_usage FK already present — skipped';
  END IF;

  -- DB-17: messages.mind_slug -> minds(slug) SET NULL / UPDATE CASCADE
  -- (requires minds.slug to be UNIQUE — it is, from migration 0000.)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_mind_slug_minds_slug_fk') THEN
    ALTER TABLE messages
      ADD CONSTRAINT messages_mind_slug_minds_slug_fk
      FOREIGN KEY (mind_slug) REFERENCES minds(slug)
      ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
    RAISE NOTICE '[DB-17] added messages_mind_slug_minds_slug_fk (NOT VALID)';
  ELSE RAISE NOTICE '[DB-17] messages.mind_slug FK already present — skipped';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- DB-15 — debate_participants.mind_id policy made EXPLICIT as RESTRICT.
--   Migration 0002 created it as "ON DELETE no action" (default), which behaves
--   like RESTRICT but is implicit/ambiguous. We re-create it named + RESTRICT so
--   the intent ("you cannot delete a mind that is participating in a debate") is
--   documented in the catalog. This DROP+ADD is cheap (small table, RESTRICT
--   needs no scan of large data); kept inside the same tx.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debate_participants_mind_id_minds_id_fk') THEN
    ALTER TABLE debate_participants DROP CONSTRAINT debate_participants_mind_id_minds_id_fk;
    RAISE NOTICE '[DB-15] dropped implicit no-action mind_id FK';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debate_participants_mind_id_minds_id_restrict_fk') THEN
    ALTER TABLE debate_participants
      ADD CONSTRAINT debate_participants_mind_id_minds_id_restrict_fk
      FOREIGN KEY (mind_id) REFERENCES minds(id) ON DELETE RESTRICT;
    RAISE NOTICE '[DB-15] added debate_participants_mind_id_minds_id_restrict_fk (RESTRICT, explicit)';
  ELSE RAISE NOTICE '[DB-15] explicit RESTRICT mind_id FK already present — skipped';
  END IF;
END $$;

COMMIT;

-- -----------------------------------------------------------------------------
-- VERIFICATION — all FKs present; DB-2/DB-17 ones are NOT VALID (convalidated=f)
-- until td-3.1-05 runs.
-- -----------------------------------------------------------------------------
\echo ''
\echo '-- [TD-3.1-04] FK presence + validation state --'
SELECT conname                      AS constraint_name,
       conrelid::regclass::text     AS on_table,
       convalidated                 AS is_validated
FROM pg_constraint
WHERE conname IN (
  'conversations_user_id_users_id_fk',
  'debates_user_id_users_id_fk',
  'mind_memories_user_id_users_id_fk',
  'rate_limits_user_id_users_id_fk',
  'token_usage_user_id_users_id_fk',
  'messages_mind_slug_minds_slug_fk',
  'debate_participants_mind_id_minds_id_restrict_fk'
)
ORDER BY conname;

\echo 'Expected: 7 rows. The 6 DB-2/DB-17 FKs is_validated = f (NOT VALID).'
\echo 'The DB-15 RESTRICT FK is_validated = t (added validated, small table).'
\echo 'Next: run td-3.1-05-fks-validate.sql to validate the legacy rows online.'
