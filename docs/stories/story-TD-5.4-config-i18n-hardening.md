# Story TD-5.4 — Config & i18n hardening (Tema G)

**Status:** Draft
**Epic:** [Resolução de Débitos Técnicos](epic-technical-debt.md) · **Wave:** W5
**Prioridade:** P3 · **Estimativa:** ~7–13h
**Parent (superseded):** [TD-5.1](story-TD-5.1-cleanup-design-tests.md)

> Sub-story do split de TD-5.1 (umbrella). Cobre o Tema G — centralização de env/config/i18n. A infra para todas as três áreas já existe (Zod para `GEMINI_*`, módulo `i18n/`, constantes de config); o débito é o bypass sistemático. Inclui SYS-8 (standalone: taxonomia `AppError` no chat) que compartilha a assinatura de "a infra existe, o código a contorna".

## Story

**As a** equipe de engenharia do Mentes Sintéticas,
**I want** estender o schema Zod para cobrir todo o env obrigatório com fail-fast no boot, externalizar magic constants e URLs hardcoded, e rotear todas as strings PT-BR pelo módulo `i18n/` existente (backend e frontend),
**So that** o boot falhe imediatamente em qualquer env faltante (não em runtime silencioso), não haja URLs ou constantes hardcoded espalhadas, e as strings sejam gerenciáveis centralmente — base pronta para i18n real quando necessário.

## Débitos cobertos

### Tema G — config/i18n

- **SYS-5** (🟡) — Validação de env parcial: só `GEMINI_*` via Zod; `DATABASE_URL`/`AUTH_SECRET`/limites (`MAX_FILE_URIS_PER_REQUEST=8`, rate defaults) lidos raw sem fail-fast.
- **SYS-6** (🟢) — URLs de prod e magic constants hardcoded (`NEXTAUTH_URL`, `MAX_FILE_URIS_PER_REQUEST=8`, rate defaults, outros).
- **SYS-13** (🟢) — Strings PT-BR hardcoded em rotas/erros backend apesar de módulo `i18n/` existir.
- **UX-5** (🟡) — i18n hardcoded pt-BR + strings inline fora do `t()` no frontend. Espelho de SYS-13.

### Standalone (oportunístico)

- **SYS-8** (🟡) — `chat/route.ts` usa string-matching no catch em vez da taxonomia `AppError`/`classifyError` existente. Mesma assinatura: infra criada, código a contorna.

**Total: 5 débitos.**

## Acceptance Criteria

1. **Zod único de env com fail-fast (SYS-5)**
   - **Given** env é atualmente validado parcialmente (só `GEMINI_*` via Zod) e variáveis como `DATABASE_URL`, `AUTH_SECRET`, `MAX_FILE_URIS_PER_REQUEST` são lidas raw
   - **When** um schema Zod único e centralizado é criado cobrindo **todo** env obrigatório, e importado no boot da aplicação
   - **Then** o processo falha imediatamente no boot se qualquer variável obrigatória estiver ausente ou inválida (fail-fast); nenhuma variável crítica é lida raw em módulos individuais; mensagem de erro de boot lista claramente quais variáveis faltam

2. **Magic constants externalizadas (SYS-6)**
   - **Given** `NEXTAUTH_URL`, `MAX_FILE_URIS_PER_REQUEST=8`, rate defaults e outras constantes estão hardcoded em múltiplos módulos
   - **When** as constantes são movidas para o schema de env (SYS-5) ou para um arquivo de config centralizado
   - **Then** nenhuma URL de produção ou magic constant está hardcoded em módulos de lógica; alterar um valor exige mudança em apenas um lugar

3. **Strings backend via `t()` (SYS-13)**
   - **Given** strings PT-BR de erros e respostas estão hardcoded em rotas e serviços backend, apesar do módulo `i18n/` existir
   - **When** as strings são roteadas pelo módulo `i18n/` via `t()`
   - **Then** nenhuma string PT-BR hardcoded em rotas/serviços backend; strings gerenciáveis centralmente via `i18n/`

4. **Strings frontend via `t()` (UX-5)**
   - **Given** strings PT-BR estão inline nos componentes e páginas React, fora do `t()`
   - **When** as strings inline são substituídas por chamadas ao `t()` do módulo i18n
   - **Then** nenhuma string PT-BR hardcoded em `src/components` ou `src/app`; frontend consome `i18n/` de forma consistente com o backend

5. **`chat/route.ts` usa taxonomia `AppError` (SYS-8, oportunístico)**
   - **Given** `chat/route.ts` faz string-matching no `catch` para classificar erros, contornando a taxonomia `AppError`/`classifyError` já existente
   - **When** o bloco de catch é refatorado para usar `classifyError` (ou equivalente da taxonomia existente)
   - **Then** erros no endpoint de chat são classificados consistentemente com o resto da aplicação; zero string-matching manual no catch

## Tasks / Subtasks

- [ ] Mapear todas as variáveis de env usadas no projeto (grep por `process.env`) para identificar o escopo completo do schema (SYS-5)
- [ ] Criar/estender schema Zod centralizado cobrindo todo env obrigatório: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `GEMINI_*`, limites de config (SYS-5)
- [ ] Integrar o schema Zod no boot da aplicação com mensagem de erro clara (SYS-5)
- [ ] Externalizar `MAX_FILE_URIS_PER_REQUEST`, rate defaults e outras magic constants para config centralizada ou env schema (SYS-6)
- [ ] Remover `NEXTAUTH_URL` e URLs de prod hardcoded dos módulos de lógica (SYS-6)
- [ ] Mapear strings PT-BR hardcoded no backend (rotas/serviços) e migrar para `t()` (SYS-13)
- [ ] Mapear strings PT-BR inline no frontend (componentes/páginas) e migrar para `t()` (UX-5)
- [ ] Refatorar bloco catch de `chat/route.ts` para usar `classifyError`/taxonomia `AppError` (SYS-8)
- [ ] Confirmar `npm test` + `npm run lint` passam após as mudanças; verificar que boot falha com env incompleto

## Estimativa

| Débito | Horas |
|--------|-------|
| SYS-5 (schema Zod + fail-fast) | 2–3h |
| SYS-6 (externalizar constantes) | 1–2h |
| SYS-13 (strings backend via `t()`) | 3–4h |
| UX-5 (strings frontend via `t()`) | 16–24h |
| SYS-8 (taxonomia AppError no chat) | 1–2h |
| **Total** | **~23–35h** |

> **Nota de esforço:** UX-5 é o item dominante (16–24h). SYS-5/6/13/8 somam apenas ~7–11h e podem ser entregues de forma independente dentro da mesma story se a prioridade de UX-5 for postergada.

## Dependencies

- **TD-4.1 (estabilização operacional):** recomendado aguardar estabilização antes de mudanças no boot (SYS-5 afeta startup do processo).
- **SYS-5 antes de SYS-6:** externalizar constantes para o schema Zod requer que o schema exista primeiro.
- **SYS-13 e UX-5 são paralelos:** backend e frontend podem ser migrados em paralelo ou por desenvolvedores diferentes.
- **TD-5.x inter-independência:** TD-5.4 é independente de TD-5.2, TD-5.3, TD-5.5.

## Definition of Done

- [ ] Schema Zod único cobrindo todo env obrigatório; boot falha com mensagem clara se variável ausente (SYS-5)
- [ ] Zero magic constants ou URLs de prod hardcoded em módulos de lógica (SYS-6)
- [ ] Strings PT-BR do backend roteadas via `t()` do módulo `i18n/` (SYS-13)
- [ ] Strings PT-BR do frontend roteadas via `t()` (UX-5)
- [ ] `chat/route.ts` usa `classifyError`/taxonomia `AppError` no catch (SYS-8)
- [ ] `npm test` + `npm run lint` verdes; zero regressões

## Priority

**P3** — sem urgência de prod (locale único hoje; nenhuma string causa bug ativo). Maior esforço (UX-5: 16–24h) sem ROI imediato — a base fica preparada para i18n real quando o produto precisar de multi-locale. SYS-5/6 e SYS-8 têm ROI mais imediato (clareza de configuração + consistência de erros) e podem ser priorizados separadamente dentro da story.

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-31 | 1.0.0 | Split de TD-5.1 umbrella → sub-story TD-5.4 (Tema G + SYS-8). Status: Draft. | @sm |
