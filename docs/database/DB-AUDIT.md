# Database Audit — Mentes Sintéticas (Data-Level Technical Debt)

> Produced by @data-engineer (Dara), FASE 2 brownfield-discovery. **Date:** 2026-05-30.
> Scope: data layer only (PostgreSQL 16 + Drizzle ORM). Analyzed from `src/db/schema/*.ts`, `drizzle/*.sql`, `scripts/*.sql`, and `src/lib/services/*` query code. No live DB connection used.
> Severity scale: **🔴 Critical** (data loss / runtime failure / security), **🟠 High** (correctness/perf at scale), **🟡 Medium** (hygiene/integrity), **🟢 Low** (polish).

## Preliminary Debt Table

| ID | Débito | Severidade | Esforço (rough) | Notas |
|----|--------|-----------|-----------------|-------|
| DB-1 | No RLS / DB-level authz after Supabase removal — security is 100% app-layer | 🟠 High | M (analysis) | Acceptable for single-app + Drizzle, but any raw/admin query bypasses scoping. Document & gate. |
| DB-2 | `user_id` in 5 tables has **no FK** to `users` (zero referential integrity) | 🔴 Critical | M | Orphan rows, no cascade on user delete. `users` referenced by 0 FKs. |
| DB-3 | `knowledge_documents.local_path` stored **NFD-encoded** (macOS) → JOIN/`=` mismatch | 🟠 High | S–M | Must `LIKE`/normalize; caused 20/21 URI cache miss (M1 bug). |
| DB-4 | `fix-m1-local-path.sql` writes `updated_at` on `knowledge_documents` — **column does not exist** | 🔴 Critical | XS | Script errors at runtime; table genuinely lacks `updated_at`. |
| DB-5 | `file_uri_cache` has no UNIQUE on `knowledge_document_id` but scripts use `ON CONFLICT (knowledge_document_id)` | 🔴 Critical | S | Upsert fails: no matching unique index. Also allows duplicate cache rows per doc. |
| DB-6 | Missing indexes on hot FK/filter columns: `messages.conversation_id`, `conversations.user_id`, `debates.user_id`, `knowledge_documents.mind_id`, `file_uri_cache.knowledge_document_id` | 🟠 High | S | All are sequential-scan reads today; `messages` is the hottest chat read. |
| DB-7 | `conversations.share_token` not indexed and not UNIQUE — public-share read does full scan; collision possible | 🟠 High | XS | Should be UNIQUE partial index `WHERE share_token IS NOT NULL`. |
| DB-8 | Ad-hoc `scripts/*.sql` mutate prod data outside migration system | 🟡 Medium | M | `update-file-uris*.sql`, `fix-m1-local-path.sql` — unversioned, manual, error-prone. |
| DB-9 | Enum-like columns (`messages.role`, `mind_memories.memory_type`, `debates.status`) enforced only in ORM, no DB CHECK / pg enum | 🟡 Medium | S | DB accepts any text; bad values possible via raw SQL/scripts. |
| DB-10 | No `updated_at` auto-update mechanism (no triggers); `updated_at` is app-maintained and silently skipped on raw writes | 🟡 Medium | S | Drift between `updated_at` and reality on script-driven updates. |
| DB-11 | `token_usage.total_tokens` denormalized (= input+output) with no CHECK constraint | 🟢 Low | XS | Can drift; add `CHECK (total_tokens = input_tokens + output_tokens)` or drop column. |
| DB-12 | `rate_limits` / `token_usage` grow unbounded — no retention/TTL/cleanup | 🟡 Medium | M | `rate_limits` windows accumulate forever; needs periodic purge job. |
| DB-13 | `rate_limits` lacks UNIQUE on (user_id, action, window_start) — concurrent inserts can duplicate a window | 🟠 High | S | Race under concurrency inflates/splits counts; should be unique + upsert. |
| DB-14 | `knowledge_documents` has both `local_path` and `storage_path` (post-Supabase); semantics now ambiguous | 🟢 Low | S | `storage_path` added for Supabase storage (now removed) — likely dead/unused. |

**Total debts identified: 14** (3 Critical, 4 High, 4 Medium, 2 Low — 1 of "High" is DB-1 analysis-only).

---

## Detailed Findings

### DB-1 — No database-level authorization (post-Supabase) 🟠
After Supabase removal (`aa0dade`), all RLS policies are gone. Authorization is enforced entirely in `src/lib/services/*` (every query filters by `userId`, e.g. `conversations.ts`, `sharing.ts`). This is a defensible architecture for a single trusted app server, but: (a) any future raw SQL, admin tool, or second consumer bypasses scoping; (b) the `user_id`-without-FK problem (DB-2) means even the app can't rely on the DB to reject invalid users. **Recommendation:** document the "app-is-the-only-gatekeeper" contract explicitly; never expose the connection string to untrusted contexts.

### DB-2 — `user_id` columns with no foreign key 🔴
`conversations.user_id`, `token_usage.user_id`, `rate_limits.user_id`, `mind_memories.user_id`, `debates.user_id` are all plain `uuid NOT NULL` with **no `REFERENCES users(id)`**. Confirmed: the `users` table is the target of **zero** FKs project-wide. Consequences: (1) a conversation can reference a non-existent user; (2) deleting a user orphans all their data silently (no cascade); (3) no DB guarantee that `user_id` is even a real user. **Recommendation:** add `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE` to all 5 tables (after verifying no orphans exist).

### DB-3 — NFD encoding of `local_path` 🟠
macOS stores filenames in Unicode NFD; ingest writes `local_path` in NFD. Lookups comparing against NFC strings (`WHERE local_path = ?`) silently miss. This already caused the M1 cache miss (20/21 URIs). Current mitigation is `LIKE`/manifest fallback. **Recommendation:** normalize to NFC on write (`localPath.normalize('NFC')`) in the ingest script; backfill existing rows once. Do not rely on `LIKE` as the permanent fix.

### DB-4 — Script writes non-existent column 🔴
`scripts/fix-m1-local-path.sql` line: `UPDATE knowledge_documents SET local_path = ..., updated_at = NOW() WHERE ...`. The table has **no `updated_at` column** (confirmed in schema + migration `0000`). This statement raises `column "updated_at" of relation "knowledge_documents" does not exist` and aborts the transaction. **Recommendation:** either remove `updated_at = NOW()` from the script, or add an `updated_at` column to `knowledge_documents` (preferred for consistency with sibling tables) via a migration.

### DB-5 — `ON CONFLICT` without matching unique constraint 🔴
`file_uri_cache` has only PK(`id`); `knowledge_document_id` is **not unique**. Yet `fix-m1-local-path.sql` and `update-file-uris.sql` use `INSERT ... ON CONFLICT (knowledge_document_id) DO UPDATE`. Postgres requires a unique/exclusion constraint matching the conflict target → error *"there is no unique or exclusion constraint matching the ON CONFLICT specification"*. The upsert cannot work as written. Separately, without the constraint the table can accumulate **multiple cache rows per document**, and `getCachedUris` would return duplicates. **Recommendation:** `ALTER TABLE file_uri_cache ADD CONSTRAINT file_uri_cache_kdoc_unique UNIQUE (knowledge_document_id)` (1:1 cache), then the upsert scripts work.

### DB-6 — Missing indexes on hot FK / filter columns 🟠
Verified against actual service-layer queries:
- `messages` loaded by `conversation_id` ordered by `created_at` (`messages.ts:48`) — **no index** on `conversation_id`. Hottest read in the chat path; full scan grows with all messages.
- `conversations` listed by `user_id` ordered by `updated_at DESC` (+ optional `mind_id`) (`conversations.ts:69-78`) — **no index** on `user_id`.
- `debates` queried by `user_id` — **no index**.
- `knowledge_documents.mind_id` and `file_uri_cache.knowledge_document_id` (both FKs, both JOINed in `knowledge.ts`) — **no index** (unindexed FKs also slow cascade deletes).
**Recommendation:** add `idx_messages_conversation_created (conversation_id, created_at)`, `idx_conversations_user_updated (user_id, updated_at DESC)`, `idx_debates_user (user_id)`, `idx_knowledge_documents_mind (mind_id)`, `idx_file_uri_cache_kdoc (knowledge_document_id)` (the last is subsumed if DB-5 unique is added).

### DB-7 — `share_token` unindexed and not unique 🟠
Public share read: `WHERE conversations.share_token = ?` (`sharing.ts:147`). `share_token` (varchar 64) has no index → full table scan on every public page load; and no UNIQUE → two conversations could (theoretically) collide on a token. **Recommendation:** `CREATE UNIQUE INDEX conversations_share_token_uniq ON conversations (share_token) WHERE share_token IS NOT NULL` (partial unique — keeps NULLs free, indexes only shared rows).

### DB-8 — Ad-hoc SQL scripts bypassing migrations 🟡
`scripts/update-file-uris.sql`, `scripts/update-file-uris-2026-03-16.sql`, `scripts/fix-m1-local-path.sql` mutate production data manually (run via `psql -f` on VPS). They are unversioned (not in `drizzle/meta/_journal.json`), date-stamped by filename, and — as DB-4/DB-5 show — contain statements that don't match the actual schema. **Recommendation:** for data fixes, prefer a versioned seed/repair script invoked through a tracked process; at minimum, validate scripts against the live schema before running. The recurring URI refresh should be the parameterized `scripts/refresh-file-uris.ts` (Drizzle) rather than hand-edited SQL.

### DB-9 — Enum values enforced only in ORM 🟡
`messages.role`, `mind_memories.memory_type`, `debates.status` carry TypeScript enum types in Drizzle but are plain `text` in the DB (no CHECK, no pg `ENUM`). Any raw insert/script can write an invalid value. **Recommendation:** add `CHECK` constraints (lighter than pg enums, no migration pain on new values), e.g. `CHECK (role IN ('user','assistant'))`.

### DB-10 — No `updated_at` triggers 🟡
All `updated_at` columns rely on the app passing `now()`. Script-driven or partial updates leave `updated_at` stale (and DB-4 shows scripts even target a non-existent one). **Recommendation:** either accept app-managed timestamps as a documented convention, or add a shared `BEFORE UPDATE` trigger to set `updated_at = now()` on the tables that have it.

### DB-11 — Denormalized `total_tokens` without CHECK 🟢
`token_usage.total_tokens` is stored alongside `input_tokens`+`output_tokens` with no constraint tying them. **Recommendation:** add `CHECK (total_tokens = input_tokens + output_tokens)` or compute it as a generated column.

### DB-12 — Unbounded growth of `rate_limits` / `token_usage` 🟡
No retention policy. `rate_limits` accumulates one+ row per (user, action, window) forever; old windows are never purged. `token_usage` grows per message. **Recommendation:** scheduled purge of `rate_limits` older than the largest window (e.g. cron `DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`); decide a retention horizon for `token_usage` or roll up into aggregates.

### DB-13 — `rate_limits` lacks per-window uniqueness 🟠
The sliding-window counter reads `user_id`+`action`+`window_start >= window` then increments. Without `UNIQUE (user_id, action, window_start)`, concurrent first-requests in the same window can insert duplicate rows, splitting the count and weakening the limit. **Recommendation:** make the triple UNIQUE and switch the increment to an `INSERT ... ON CONFLICT DO UPDATE SET request_count = request_count + 1`.

### DB-14 — Dead/ambiguous `storage_path` 🟢
`storage_path` was added (`0001`) for Supabase Storage, which has since been removed. Co-existing with `local_path`, its current meaning is unclear and it is likely unused. **Recommendation:** confirm no reads remain, then drop the column in a migration (requires explicit approval — column drop).

---

## Quick Wins (highest value / lowest effort)

1. **DB-4** — remove `updated_at = NOW()` from `fix-m1-local-path.sql` (XS, prevents a guaranteed runtime error).
2. **DB-7** — partial UNIQUE index on `share_token` (XS, fixes public-share scan + collision).
3. **DB-5** — UNIQUE on `file_uri_cache.knowledge_document_id` (S, unblocks the upsert scripts the team already relies on).
4. **DB-6** — index `messages.conversation_id` + `conversations.user_id` (S, fixes the two hottest reads).

## Suggested Remediation Order

`DB-4` → `DB-5` → `DB-6`/`DB-7` (indexes) → `DB-13` (rate-limit uniqueness) → `DB-2` (user_id FKs, after orphan check) → `DB-3` (NFD normalize + backfill) → `DB-9`/`DB-11` (CHECKs) → `DB-8`/`DB-12` (process + retention) → `DB-14` (drop dead column, needs approval).
