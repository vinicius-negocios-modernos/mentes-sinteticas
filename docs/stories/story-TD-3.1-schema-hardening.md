# Story TD-3.1 — Hardening de schema (Tema C) — destrava cache Gemini

**Status:** Ready
**Epic:** [Resolução de Débitos Técnicos](epic-technical-debt.md) · **Wave:** W3
**Prioridade:** **P0** · **Estimativa:** ~13–15h

> 🔴 **P0 — contém o único débito Critical já manifestado em produção.** DB-5 (`ON CONFLICT` sem UNIQUE) é a raiz estrutural do cache-miss não-recuperável do Gemini. Esta story restaura o cache de conhecimento.
> 🔒 **Pré-requisitos não-negociáveis:** TD-1.1 (drizzle ^0.45.2 — dep #1) + TD-2.1 (runner + smoke — dep #2) DEVEM estar Done. Todo DDL roda **via o runner da W2**, nunca por psql manual.

## Story

**As a** operador do Mentes Sintéticas,
**I want** blindar o schema do banco com UNIQUE, índices, FKs, CHECKs e triggers, aplicados pelo runner automatizado com backup,
**So that** o cache de conhecimento do Gemini seja restaurado (🔴 Critical), a integridade referencial seja garantida no DB (não só na app), e os scans de performance sejam eliminados antes do crescimento da base.

## Débitos cobertos

- **DB-5** (🔴 Critical) — UNIQUE em `file_uri_cache(knowledge_document_id)` → destrava o upsert → **cache Gemini restaurado**
- **DB-6** (🟠) — índices em FK/filtros quentes (`messages.conversation_id`, `conversations.user_id/mind_id`, `debates.user_id`, `knowledge_documents.mind_id`, `file_uri_cache.knowledge_document_id`)
- **DB-18** (🟢) — índice em `created_at` (ordenação cronológica)
- **DB-2** (🟠) — FK `user_id` em 5 tabelas
- **DB-15** (🟡) — política `debate_participants.mind_id` (RESTRICT vs CASCADE, decisão explícita)
- **DB-17** (🟢) — `messages.mind_slug` FK/índice
- **DB-9** (🟡) — CHECKs para enums (`messages.role`, `mind_memories.memory_type`, `debates.status`)
- **DB-11** (🟢) — CHECK em `token_usage.total_tokens`
- **DB-10** (🟡) — triggers `BEFORE UPDATE` para `updated_at`
- **DB-7** (🟡) — índice em `conversations.share_token`
- **DB-12** (🟡) — retenção de `rate_limits` + arquivamento de `token_usage`

## Acceptance Criteria

1. **DB-5 — UNIQUE destrava upsert** *(test: qa-review §4 Cluster DB — Constraint integration)*
   - **Given** dedupe/audit confirmado (gate da W0, órfãos/duplicatas = 0 ou decididos)
   - **When** `CREATE UNIQUE INDEX CONCURRENTLY` em `file_uri_cache(knowledge_document_id)` é aplicado
   - **Then** `INSERT ... ON CONFLICT (knowledge_document_id)` faz upsert (não aborta); 2 inserts concorrentes do mesmo doc → 1 linha final. **🔴 resolvido.**

2. **FKs com política por tabela (DB-2/DB-15/DB-17)** *(test: qa-review §4 — FK CASCADE/SET NULL)*
   - **Given** órfãos = 0 (gate read-only antes de `VALIDATE CONSTRAINT`)
   - **When** FKs são aplicadas `NOT VALID` + `VALIDATE`, com política por tabela
   - **Then** delete de user → `conversations/mind_memories/debates/rate_limits` cascateiam; **`token_usage` preserva (SET NULL/RESTRICT)** — billing não some; `debate_participants.mind_id` = decisão RESTRICT explícita (AC por tabela)

3. **Índices via CONCURRENTLY (DB-6/DB-7/DB-18)**
   - **When** índices são criados via `CREATE INDEX CONCURRENTLY` pelo runner
   - **Then** os filtros quentes e ordenações têm índice; nenhum lock bloqueante em prod

4. **CHECKs (DB-9/DB-11)** *(test: qa-review §4 — CHECK test)*
   - **When** CHECKs de enum e de `total_tokens` são aplicados
   - **Then** insert raw com `messages.role='invalid'` é **rejeitado**; `total_tokens ≠ input+output` é rejeitado

5. **Triggers + retenção (DB-10/DB-12)**
   - **When** triggers `BEFORE UPDATE` de `updated_at` e job de retenção são aplicados
   - **Then** writes raw atualizam `updated_at`; `rate_limits` tem retenção; `token_usage` é **arquivado** (não deletado)

6. **Migration-rollback (todos)** *(test: qa-review §4 — Migration-rollback)*
   - **Then** cada migration tem `up`→`down`→schema idêntico ao baseline, verificado em staging com dump de prod

## Tasks / Subtasks

- [ ] Re-confirmar audit de órfãos/duplicatas = 0 (gate da W0) + `pg_dump` (DB-5/DB-2)
- [ ] Migration: UNIQUE CONCURRENTLY em `file_uri_cache` (DB-5)
- [ ] Migration: índices CONCURRENTLY em FK/filtros quentes + `created_at` (DB-6/DB-18) + `share_token` (DB-7)
- [ ] Migration: FKs NOT VALID+VALIDATE com política por tabela (DB-2/DB-15/DB-17)
- [ ] Migration: CHECKs de enum + total_tokens (DB-9/DB-11)
- [ ] Migration: triggers BEFORE UPDATE de `updated_at` (DB-10)
- [ ] Migration: job de retenção `rate_limits` + arquivamento `token_usage` (DB-12)
- [ ] Teste de integração de constraint (upsert + concorrência) (DB-5)
- [ ] Teste FK CASCADE/SET NULL por tabela (DB-2)
- [ ] Teste de rollback up→down→baseline em staging com dump de prod
- [ ] Aplicar em prod via runner da W2 com pg_dump

## Dependencies

**Depende de TD-1.1** (drizzle ^0.45.2 — dep #1) **e TD-2.1** (runner + smoke — dep #2). Ordem interna: **DB-5 antes** do fechamento de DB-3 (dep #3, fechado em TD-4.1). **Gate da W0** (audit de órfãos/duplicatas) deve ter rodado em TD-0.1.

## Definition of Done

- [ ] DB-5 aplicado: upsert funciona, cache Gemini restaurado (evidência: teste de concorrência)
- [ ] FKs com política por tabela; órfãos = 0 antes de VALIDATE; `token_usage` preservado
- [ ] Índices/CHECKs/triggers aplicados via runner com pg_dump
- [ ] Rollback verificado em staging
- [ ] Aplicado em prod sem downtime (CONCURRENTLY); smoke pós-deploy verde

## Priority

**P0** — DB-5 é o único 🔴 Critical e já se manifesta em produção (perda de cache Gemini). Núcleo da Fase 2 de negócio.

## Dev Notes — Preparation (awaiting maintenance-window execution)

**Status note:** all migration artifacts are **PREPARED but NOT applied to prod.**
Nothing was run against the live database; no SSH, no migration, no DDL. The
scripts are executed by the operator in a maintenance window per the runbook.

**Prod-safety strategy used (non-negotiable, per fase-5 §5):**
- `CREATE INDEX CONCURRENTLY` / `CREATE UNIQUE INDEX CONCURRENTLY` are authored as
  **standalone autocommit psql scripts** (NOT via drizzle migrate — drizzle wraps
  each migration in a transaction, where CONCURRENTLY is illegal).
- `file_uri_cache` UNIQUE (DB-5) is preceded by a **dedupe** (keep MAX(created_at)
  per `knowledge_document_id`), then `CREATE UNIQUE INDEX CONCURRENTLY`.
- FKs (DB-2/DB-15/DB-17) use **`ADD CONSTRAINT ... NOT VALID`** (fast, no full
  scan) then **`VALIDATE CONSTRAINT`** online; orphans cleaned/quarantined first.
  Policy: `token_usage.user_id` = ON DELETE SET NULL (preserve billing, column
  made nullable); conversations/mind_memories/debates/rate_limits = CASCADE;
  `debate_participants.mind_id` = RESTRICT (explicit, DB-15); `messages.mind_slug`
  = SET NULL / UPDATE CASCADE (DB-17).

**Drizzle reconciliation choice:** the standalone scripts ARE the prod migration.
`src/db/schema/*.ts` was updated to the target state for **type-consistency only**
(app imports the schema). The drizzle journal stays at 0000–0002 — do NOT generate
and apply a naive 0003 (it would double-apply and use non-concurrent DDL). Full
rationale + future-migration guidance in `docs/runbooks/migrations.md` → TD-3.1.

**Verification (no prod touched):** `npm run build` PASS · `npm test` 350/350 PASS
(schema imported by app code compiles cleanly with the new constraints/indexes).

## File List

**Audit (read-only):**
- `scripts/db-audit/td-3.1-preflight-audit.sql`

**Remediation (transactional, before DDL):**
- `scripts/db-migrate/td-3.1-01-remediate.sql`

**Prod-safe DDL (standalone autocommit / NOT VALID):**
- `scripts/db-migrate/td-3.1-02-indexes.sql` (DB-6, DB-18, DB-7)
- `scripts/db-migrate/td-3.1-03-unique-file-uri.sql` (DB-5 🔴 unlock)
- `scripts/db-migrate/td-3.1-04-fks-add-notvalid.sql` (DB-2, DB-15, DB-17)
- `scripts/db-migrate/td-3.1-05-fks-validate.sql` (DB-2, DB-17)
- `scripts/db-migrate/td-3.1-06-checks.sql` (DB-9, DB-11)

**Rollbacks:**
- `scripts/db-rollback/td-3.1-01-remediate-rollback.md` (pg_dump-based)
- `scripts/db-rollback/td-3.1-02-indexes-rollback.sql`
- `scripts/db-rollback/td-3.1-03-unique-file-uri-rollback.sql`
- `scripts/db-rollback/td-3.1-04-fks-rollback.sql`
- `scripts/db-rollback/td-3.1-05-fks-validate-rollback.sql`
- `scripts/db-rollback/td-3.1-06-checks-rollback.sql`

**Schema (target state, type-consistency):**
- `src/db/schema/conversations.ts`, `messages.ts`, `debates.ts`,
  `mind-memories.ts`, `rate-limits.ts`, `token-usage.ts`, `file-uri-cache.ts`,
  `debate-participants.ts`

**Runbook:**
- `docs/runbooks/migrations.md` (TD-3.1 section added)

## QA Results

**Reviewer:** Quinn (@qa) · **Date:** 2026-05-31 · **Type:** Adversarial pre-maintenance-window safety review (scripts PREPARED, NOT applied to prod) · **Gate file:** `docs/qa/gates/TD-3.1-schema-hardening.yml`

### Verdict: CONCERNS — safe to commit and to execute the window with the must-dos below tracked.

No script can corrupt or long-lock prod. CONCURRENTLY is correctly isolated from transactions, dedupe/orphan gates precede UNIQUE/FK, NOT VALID + VALIDATE keeps locks light, every forward step has a tested rollback, and the runbook has explicit go/no-go checkpoints with a mandatory `pg_dump` first. Build PASS, 350/350 tests PASS, lint 0 errors.

> Status stays **Ready** (not Done): the headline AC "cache Gemini restaurado (DB-5)" is unverifiable until the scripts actually run in the window. This review certifies the scripts are *safe to execute*, not that the story is *complete*. Re-gate after the window with prod evidence (ON CONFLICT upsert succeeds + smoke green).

### Adversarial checks

| # | Check | Result | Key evidence |
|---|-------|--------|--------------|
| 1 | CONCURRENTLY safety (no tx wrapper, invalid-index recovery) | PASS | 02/03 have NO BEGIN/COMMIT + "DO NOT WRAP" banners; 04/06 tx hold only NOT VALID/ALTER/DROP (06 VALIDATEs outside COMMIT); both 02/03 end with `indisvalid` check + DROP-and-retry guidance; runbook bans `-1`/`--single-transaction`. |
| 2 | DEDUPE before UNIQUE; safe-fail if skipped | PASS | 01 dedupes + asserts `v_dups=0` (RAISE EXCEPTION); runbook orders 01→03; skipping 01 only builds an INVALID index (caught), no corruption. |
| 3 | ORPHAN before FK; token_usage SET NULL nullability; RESTRICT | PASS | 04 does `DROP NOT NULL` before the SET NULL FK; per-table policy matches db-specialist-review §5 (CASCADE x4 / SET NULL token_usage / RESTRICT debate_participants = DB-15). VALIDATE failures per-statement + recoverable. |
| 4 | **THE DRIZZLE TRAP** | **CONCERNS** | Trap documented in story + runbook + per-schema-file comments, and schema target state matches the scripts. BUT no `drizzle/README.md` guard at the most-likely entry point, and journal reconciliation is a manual hand-edit, not a baselined no-op migration. A future `drizzle-kit generate` would emit a double-applying, non-concurrent 0003. Not a prod-safety blocker for *this* window — a future-dev footgun mitigated by docs only. |
| 5 | Idempotency / partial-failure re-runnability | PASS | 01 assertions, 02/03 `IF NOT EXISTS`, 04/06 catalog guards, 05 VALIDATE no-op once validated; ON_ERROR_STOP halts cleanly. |
| 6 | Rollback completeness (DROP INDEX CONCURRENTLY; irreversibility flagged) | PASS | 02/03 use `DROP INDEX CONCURRENTLY IF EXISTS`; 04/05/06 tx DROP; 05 correctly DROP+re-ADD NOT VALID (no de-validate in PG); 01 flagged pg_dump-only recovery. |
| 7 | Runbook go/no-go gates + mandatory first backup | PASS | 8 numbered steps, each with CHECKPOINT/GO + ROLLBACK pointer; step 0 = mandatory backup; audit step has NO-GO on unexplained user-content orphans. |

### Drizzle-trap verdict (highest-risk maintainability item): MITIGATED-BY-DOCS, not yet structurally safe.
**Recommended safest path:** after the prod scripts succeed in-window, author a single **guarded baseline `drizzle/0003_td_3_1_baseline.sql`** (every statement `IF NOT EXISTS` / catalog-guarded → a no-op against a DB that already ran the scripts) and let `drizzle-kit migrate` record it in `__drizzle_migrations`. This makes the journal == reality so a future `drizzle-kit generate` diffs from the true target state with zero TD-3.1 drift. Add a `drizzle/README.md` pointing at the runbook. This is cleaner and less error-prone than the runbook's `--custom` hand-edit.

### Must-do before / around execution
1. **(medium, post-window)** Land the baseline `drizzle/0003_td_3_1_baseline.sql` + `drizzle/README.md` to close the Drizzle trap structurally → re-gate to PASS. Owner: @data-engineer.
2. **(low, in-window)** Operator must *act on* (not just read) the step-01 RAISE NOTICE for `token_usage.user_id` and `messages.mind_slug` orphans before step 05 VALIDATE, or that VALIDATE errors. Consider promoting those two notices to a hard pre-05 gate in a future revision.

### Verification (no prod touched)
- `npm run build` → PASS
- `npm test` → **350/350 PASS** (28 suites) — schema edits compile cleanly with the new constraints/indexes
- `npm run lint` → exit 0 (0 errors, 9 pre-existing warnings, none in TD-3.1 files). CI stays green-able.

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-30 | 1.1.0 | Validated GO (10/10, P0 airtight) — Status: Draft → Ready | @po |
| 2026-05-31 | 1.2.0 | Prepared all migration/audit/rollback scripts + schema target state + runbook section. CONCURRENTLY-outside-tx + NOT VALID/VALIDATE strategy. Build PASS, 350/350 tests PASS. **NOT applied to prod — awaiting maintenance window.** Status stays Ready. | @data-engineer (Dara) |
| 2026-05-31 | 1.3.0 | Adversarial pre-window QA safety review. Verdict **CONCERNS** (safe to commit + execute). Drizzle trap mitigated-by-docs only → recommend baselined guarded 0003. Build/350-tests/lint all green. Status stays Ready (DB-5 unlock unverifiable until window). Gate: `docs/qa/gates/TD-3.1-schema-hardening.yml`. | @qa (Quinn) |
| 2026-05-31 | 1.3.1 | Closed the pre-window portion of QA CONCERNS #1 (the Drizzle trap entry-point gap): added LOUD `drizzle/README.md` STOP banner at the most-likely entry point (do not `drizzle-kit generate`/`push` — schema ahead of journal; failure mode + correct sequence + guarded `0003_td_3_1_baseline.sql` skeleton), strengthened runbook "Drizzle reconciliation" with the explicit post-window baseline-0003 step, and added a one-line pointer comment in `drizzle.config.ts`. No schema/script logic changed. Post-window baseline-0003 remains the must-do to re-gate → PASS. Build PASS, lint 0. | @data-engineer (Dara) |
