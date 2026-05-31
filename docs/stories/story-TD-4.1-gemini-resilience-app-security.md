# Story TD-4.1 — Resiliência Gemini (auto-cura) + contrato de segurança app-only

**Status:** Ready
**Epic:** [Resolução de Débitos Técnicos](epic-technical-debt.md) · **Wave:** W4
**Prioridade:** P1 · **Estimativa:** ~12–15h

## Story

**As a** operador do Mentes Sintéticas,
**I want** redesenhar o pipeline de conhecimento Gemini para se auto-curar (eliminando a dependência do cron SPOF) e formalizar o contrato de segurança "app-is-the-only-gatekeeper",
**So that** o conhecimento das mentes nunca se perca silenciosamente e a autorização — 100% na app desde a remoção do RLS — seja defensável nas duas pontas (escrita validada + integridade referencial).

## Débitos cobertos

### Tema E — pipeline Gemini auto-cura
- **SYS-1** (🟠 High) — re-upload self-healing sob expiração → elimina a dependência do cron externo
- **SYS-7** (🟡) — unificar nos dois SDKs Gemini → AI SDK; dropar `@google/generative-ai` legacy
- **DB-8** (🟡) — mover refresh de URI para script Drizzle versionado (fora de SQL ad-hoc) — desbloqueado por SYS-10 (TD-2.1)
- **DB-3 (fechamento)** (🟠) — confirmar NFC backfill completo na origem (parte código já feita em TD-0.1)

### Tema D — contrato app-only
- **DB-1** (🟠 analysis) — ADR explícito "app-is-the-only-gatekeeper" pós-RLS
- **SYS-14 (boundary)** (🟡) — signup via `users` service; remover import `@/db` direto da rota *(a validação Zod já foi em TD-1.1)*

## Acceptance Criteria

1. **Self-healing Gemini (SYS-1)** *(test: qa-review §4 Cluster Gemini — Self-healing)*
   - **Given** URIs de File expiram em ~48h e dependem de cron externo
   - **When** o app detecta URI expirado e re-faz upload sob demanda
   - **Then** o cache repopula **sem cron**; o chat usa knowledge mesmo com cache stale (teste de integração com URI expirado simulado)

2. **NFC normalization confirmada (DB-3)** *(test: qa-review §4 Cluster Gemini — NFC)*
   - **Given** o NFC normalize no ingest (TD-0.1)
   - **When** um doc NFD é ingerido e o backfill é re-verificado
   - **Then** `local_path` persiste em NFC e JOIN por igualdade casa; backfill 100% verificado

3. **SDK consolidation (SYS-7)**
   - **When** o pipeline unifica no AI SDK e o `@google/generative-ai` legacy é removido
   - **Then** um único SDK Gemini permanece; streaming e memory funcionam (regressão verde)

4. **Refresh versionado (DB-8)**
   - **When** o refresh de URI vira script Drizzle versionado rodado pelo runner (TD-2.1)
   - **Then** nenhum SQL ad-hoc fora das migrations muta prod

5. **Contrato app-only (DB-1 + SYS-14 boundary)** *(test: qa-review §4 — Boundary test)*
   - **Given** autorização 100% na app desde a remoção do RLS
   - **When** um ADR formaliza o contrato app-only e o signup passa por um `users` service único
   - **Then** ADR documentado; signup não importa `@/db` direto (toda escrita pelo mesmo portão validado, com FKs de TD-3.1 garantindo integridade)

## Tasks / Subtasks

- [ ] Implementar re-upload self-healing na expiração de URI (SYS-1)
- [ ] Teste de integração: URI expirado → re-upload → cache repopula (SYS-1)
- [ ] Re-verificar backfill NFC completo (DB-3 fechamento)
- [ ] Unificar pipeline no AI SDK; remover `@google/generative-ai` (SYS-7)
- [ ] Migrar refresh de URI para script Drizzle versionado (DB-8)
- [ ] Escrever ADR "app-is-the-only-gatekeeper" (DB-1)
- [ ] Extrair `users` service; remover `@/db` direto da rota de signup (SYS-14 boundary)
- [ ] Teste de boundary: signup sem import `@/db` direto

## Dependencies

**Depende de TD-3.1** (DB-5 destrava o upsert antes do fechamento de DB-3 — dep #3; FKs de DB-2 blindam o contrato app-only) **e TD-2.1** (runner versionado para DB-8). SYS-14 Zod já foi feito em TD-1.1.

## Definition of Done

- [ ] Self-healing funciona sem cron (evidência: teste com URI expirado)
- [ ] SDK único; legacy removido; regressão verde
- [ ] Refresh de URI versionado via runner
- [ ] ADR app-only escrito; signup via `users` service sem `@/db` direto
- [ ] `npm test` verde

## Priority

**P1** — fecha o pipeline de conhecimento (maior fragilidade do produto) e o contrato de segurança nas duas pontas. Início da Fase 3 de negócio.

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-30 | 1.1.0 | Validated GO (9/10) — Status: Draft → Ready | @po |
