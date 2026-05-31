# Story TD-5.5 — Test coverage & CI hardening (Tema B — testes)

**Status:** Draft
**Epic:** [Resolução de Débitos Técnicos](epic-technical-debt.md) · **Wave:** W5
**Prioridade:** P2 · **Estimativa:** ~28–42h
**Parent (superseded):** [TD-5.1](story-TD-5.1-cleanup-design-tests.md)

> Sub-story do split de TD-5.1 (umbrella). Cobre a parcela de testes do Tema B — cobertura de lógica de componentes (SYS-9), refactor de `chat-message`/`chat-interface` que o habilita (UX-11), e o follow-up de lint MNT-001 (5 setState-in-effect documentados). Inclui SYS-12 (standalone: retry/DLQ de side-effects fire-and-forget) que complementa a rede de segurança de runtime. **Depende de TD-5.3 para UX-11** (o refactor é pré-requisito da testabilidade dos componentes de chat).

## Story

**As a** equipe de engenharia do Mentes Sintéticas,
**I want** refatorar os dois componentes de chat sobrecarregados para testabilidade, escrever testes de lógica (não só a11y) para os 3 componentes de maior risco, e adicionar retry/DLQ para side-effects fire-and-forget,
**So that** a lógica de UI mais crítica (streaming, token-warning, scroll, debate) tenha rede de segurança contra regressão, os 5 setState-in-effect documentados sejam substituídos por padrões mais seguros com prova comportamental, e falhas nos side-effects não sejam silenciosas.

## Débitos cobertos

### Tema B (parcela de testes)

- **SYS-9** (🟠) — 5/56 componentes testados (4 a11y-only). Lógica de UI (estado do chat, streaming, token-warning, scroll) sem rede de segurança. Pré-requisito: UX-11 (refactor para testabilidade).
- **UX-11** (🟡) — `chat-message.tsx` (556 LOC) e `chat-interface.tsx` (515 LOC) sobrecarregados. Pré-requisito natural de SYS-9 (testabilidade). Extrair TTS auto-play, scroll, token-warning em hooks.

### Standalone (oportunístico)

- **SYS-12** (🟢) — Side-effects fire-and-forget (usage, memory extract, cleanup) — falhas só logadas, sem retry/DLQ. Mesma assinatura de risco operacional que o restante do Tema B.

**Total: 3 débitos.**

> **MNT-001 (setState-in-effect):** os 5 casos documentados de setState em useEffect são endereçados como parte de SYS-9 — ao escrever testes de lógica para os componentes afetados, o refactor para `useSyncExternalStore` (ou equivalente) é executado com testes provando equivalência comportamental antes e depois.

## Acceptance Criteria

1. **Refactor `chat-message`/`chat-interface` para testabilidade (UX-11)**
   - **Given** `chat-message.tsx` (556 LOC) e `chat-interface.tsx` (515 LOC) misturam múltiplas responsabilidades
   - **When** TTS auto-play, lógica de scroll e token-warning são extraídos em hooks dedicados
   - **Then** os componentes têm responsabilidade única; os hooks são testáveis isoladamente; nenhuma regressão funcional no fluxo de chat (verificada por testes existentes + novos)

2. **Testes de lógica de componente (SYS-9)** *(test: qa-review §4 Cluster Deploy)*
   - **Given** UX-11 refatorou `chat-message`/`chat-interface` para testabilidade
   - **When** testes de lógica (não só a11y) são escritos para:
     - `chat-interface`: streaming (chunks chegam progressivamente), token-warning (aparece no threshold correto), scroll (auto-scroll + lock de usuário)
     - `debate-interface`: estados de turno, renderização de participantes, transições de status
     - `conversation-drawer`: abertura/fechamento, seleção de conversa, empty-state
   - **Then** ≥ 3 componentes de maior risco têm testes de estado/interação; a suite passa com `npm test`

3. **MNT-001: setState-in-effect → useSyncExternalStore (dentro de SYS-9)**
   - **Given** 5 casos de `setState` em `useEffect` estão documentados nos componentes de maior risco
   - **When** cada caso é refatorado para `useSyncExternalStore` ou padrão equivalente, com testes escritos **antes** do refactor (comportamento atual como spec) e **depois** (equivalência comprovada)
   - **Then** todos os 5 casos documentados estão refatorados; testes provam equivalência comportamental; `npm run lint` não reporta novos `setState-in-effect` nos arquivos tocados

4. **Retry/DLQ de side-effects (SYS-12, oportunístico)**
   - **Given** side-effects fire-and-forget (usage tracking, memory extraction, cleanup) falham silenciosamente — só logados, sem retry
   - **When** uma estratégia de retry com backoff (ou enfileiramento simples) é implementada para os side-effects críticos
   - **Then** falhas nos side-effects fazem pelo menos 1 retry com log estruturado antes de desistir; o mecanismo é testável (mock do handler de falha); falha após retry é capturada pelo Sentry (não só logada)

## Tasks / Subtasks

- [ ] Mapear os 5 casos de `setState-in-effect` (MNT-001) nos componentes afetados antes do refactor
- [ ] Extrair lógica de scroll de `chat-interface.tsx` em hook dedicado (`use-chat-scroll.ts` ou similar) (UX-11)
- [ ] Extrair lógica de token-warning de `chat-interface.tsx` em hook dedicado (UX-11)
- [ ] Extrair TTS auto-play de `chat-message.tsx` em hook dedicado (UX-11)
- [ ] Escrever testes de estado/interação para `chat-interface` (streaming, token-warning, scroll) (SYS-9)
- [ ] Escrever testes de estado/interação para `debate-interface` (turnos, participantes, status) (SYS-9)
- [ ] Escrever testes de estado/interação para `conversation-drawer` (abertura, seleção, empty-state) (SYS-9)
- [ ] Refatorar os 5 setState-in-effect para `useSyncExternalStore` com testes antes/depois (MNT-001 / SYS-9)
- [ ] Implementar retry com backoff para side-effects críticos: usage tracking, memory extraction (SYS-12)
- [ ] Integrar captura Sentry para falhas pós-retry dos side-effects (SYS-12)
- [ ] Confirmar `npm test` + `npm run lint` passam; verificar que nenhuma regressão no fluxo de chat/debate

## Estimativa

| Débito | Horas |
|--------|-------|
| UX-11 (refactor chat-message + chat-interface) | 12–16h |
| SYS-9 (testes de lógica para 3 componentes + MNT-001) | 12–16h (inclui tempo de setup de test harness + mocks) |
| SYS-12 (retry/DLQ side-effects) | 4h |
| **Total** | **~28–36h** |

## Dependencies

- **UX-11 antes de SYS-9 (interna):** o refactor de testabilidade habilita os testes de lógica. Executar nesta ordem dentro da story.
- **TD-5.3 (UX-11 duplicata de escopo):** UX-11 aparece em TD-5.3 como "pré-requisito de SYS-9". Para evitar trabalho duplicado, TD-5.5 DEVE ser implementada após ou em coordenação com TD-5.3. [AUTO-DECISION] UX-11 é atribuído a TD-5.5 como work principal (testes são o objetivo final); TD-5.3 o lista como habilitador mas não o implementa. O dev de TD-5.5 executa UX-11 + SYS-9 juntos.
- **TD-4.1 (estabilização operacional):** recomendado antes de grandes refactors dos componentes de chat (produto em produção).
- **TD-5.x inter-independência:** TD-5.5 depende implicitamente de TD-5.3 para UX-11; independente de TD-5.2 e TD-5.4.

## Definition of Done

- [ ] `chat-message.tsx` e `chat-interface.tsx` abaixo de 300 LOC cada (extraídos em hooks) (UX-11)
- [ ] ≥ 3 componentes de maior risco com testes de estado/interação passando (SYS-9)
- [ ] 5 casos MNT-001 de setState-in-effect refatorados com testes de equivalência comportamental
- [ ] Side-effects críticos têm retry + captura Sentry em falha pós-retry (SYS-12)
- [ ] `npm test` (todos os 335+ testes passam, sem regressão) + `npm run lint` verdes

## Priority

**P2** — cobertura de lógica dos componentes de maior risco é rede de segurança para o fluxo central do produto (chat + debate). MNT-001 tem risco de regressão silenciosa em atualizações de React. SYS-12 é P4 standalone mas sobe para P2 quando agrupado com SYS-9/UX-11 (mesmo PR de hardening de runtime).

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-31 | 1.0.0 | Split de TD-5.1 umbrella → sub-story TD-5.5 (Tema B testes + UX-11 + SYS-12). Status: Draft. | @sm |
