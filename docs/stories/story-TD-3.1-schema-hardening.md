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

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-30 | 1.1.0 | Validated GO (10/10, P0 airtight) — Status: Draft → Ready | @po |
