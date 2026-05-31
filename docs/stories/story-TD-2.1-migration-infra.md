# Story TD-2.1 — Infra de migração: runner + smoke + alerting

**Status:** Ready
**Epic:** [Resolução de Débitos Técnicos](epic-technical-debt.md) · **Wave:** W2
**Prioridade:** P1 · **Estimativa:** ~15–20h

> 🔒 **Gate de ordem não-negociável #2:** nenhum DDL do Tema C (TD-3.1) pode rodar antes desta story. Sem runner versionado, todo hardening reintroduz o anti-padrão psql-manual que gerou DB-4/DB-5/DB-8.

## Story

**As a** equipe de engenharia operando o Mentes Sintéticas em produção,
**I want** um runner de migração automatizado e seguro, smoke test pós-deploy que exercite a resposta real do Gemini, e alerting do cron de URI,
**So that** o hardening do schema (TD-3.1) possa ser aplicado em prod viva com backup/rollback, e falhas de deploy ou de conhecimento parem de ser silenciosas.

## Débitos cobertos

- **SYS-10** (🟠 High) — migrations aplicadas manualmente via SSH tunnel; sem runner automatizado no deploy
- **SYS-11** (🟡) — sem smoke pós-deploy; healthcheck do cron só testa `GET /`. Gap real: e2e de debate + smoke de resposta Gemini real
- **SYS-16** (🟡) — Sentry instrumentado mas alerting/incident-response não validado; cron de URI (SYS-1) é SPOF sem alarme verificável

## Acceptance Criteria

1. **Migration runner (SYS-10)** *(test: qa-review §3 + §4 Cluster Deploy)*
   - **Given** migrations hoje aplicadas via psql manual
   - **When** um runner gated no deploy é implementado
   - **Then** ele suporta: (a) statements fora de transação (`CREATE INDEX CONCURRENTLY`), (b) `NOT VALID`/`VALIDATE CONSTRAINT`, (c) `pg_dump` pré-migração, (d) rollback step-by-step. Verificado em staging com dump de prod: `migrate up` → `migrate down` → schema idêntico ao baseline

2. **Smoke pós-deploy com Gemini real (SYS-11)** *(test: qa-review §4 Cluster Deploy)*
   - **Given** o healthcheck atual só testa `GET /`
   - **When** o smoke pós-deploy faz `GET /api/health` (200, DB+auth) **E** `/api/chat` com resposta Gemini real
   - **Then** uma falha de auth do Gemini **derruba o smoke** (hoje passaria o healthcheck)

3. **e2e de debate (SYS-11)** *(test: qa-review §1.4 + §4)*
   - **Given** que só `chat/home/login/protected` têm e2e
   - **When** um spec Playwright para o fluxo de debate é adicionado
   - **Then** o fluxo de debate é exercitado end-to-end no CI

4. **Alerting do cron (SYS-16)** *(test: qa-review §4 Cluster Gemini)*
   - **Given** Sentry instrumentado mas o cron de renovação de URI sem alarme
   - **When** o cron passa a reportar falha ao Sentry
   - **Then** uma falha do cron dispara evento Sentry verificável (mock `captureException`); cron failure ≠ silencioso

## Tasks / Subtasks

- [ ] Implementar migration runner com suporte a CONCURRENTLY/NOT VALID/VALIDATE (SYS-10)
- [ ] Adicionar `pg_dump` pré-migração + rollback step-by-step ao runner (SYS-10)
- [ ] Validar up→down→baseline em staging com dump de prod (SYS-10)
- [ ] Gate o runner no pipeline de deploy (SYS-10)
- [ ] Estender smoke pós-deploy: `/api/health` + `/api/chat` com Gemini real (SYS-11)
- [ ] Escrever e2e spec Playwright para fluxo de debate (SYS-11)
- [ ] Conectar cron de URI ao Sentry com captura de falha (SYS-16)
- [ ] Teste de alerting com mock `captureException` (SYS-16)

## Dependencies

**Depende de TD-1.1** (drizzle bump deve estar feito antes de qualquer trabalho de migration). **Bloqueia TD-3.1** (gate de ordem #2).

## Definition of Done

- [ ] Runner suporta os 4 recursos (CONCURRENTLY, NOT VALID/VALIDATE, pg_dump, rollback) — verificado em staging
- [ ] Smoke pós-deploy falha em erro de Gemini (evidência)
- [ ] e2e de debate verde no CI
- [ ] Alerting do cron testado com mock; evento Sentry verificável
- [ ] `npm test` verde

## Priority

**P1** — habilitador de infra. Sem ele, o hardening de prod (TD-3.1) é inseguro. Fundação da Fase 2 de negócio.

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-30 | 1.1.0 | Validated GO (9/10) — Status: Draft → Ready | @po |
