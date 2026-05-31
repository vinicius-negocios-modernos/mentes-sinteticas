# Story TD-5.4b — i18n frontend: strings PT-BR via t() (UX-5 + SYS-13 backend resto)

**Status:** InProgress
**Epic:** [Resolução de Débitos Técnicos](epic-technical-debt.md) · **Wave:** W5-G (carry-forward de TD-5.4)
**Prioridade:** P3 · **Estimativa:** ~18–28h
**Parent:** [TD-5.4](story-TD-5.4-config-i18n-hardening.md) (carry-forward explícito)

> Carry-forward de TD-5.4 (gate CONCERNS, 2026-05-31). Cobre os dois débitos diferidos:
> **UX-5** (strings PT-BR hardcoded em ~39 componentes/páginas frontend, fora do `t()`) e o
> **SYS-13 backend restante** (5 rotas que não foram migradas em TD-5.4: debate, share, memories, actions.ts).
> A infra — módulo `i18n/`, função `t()`, namespaces existentes (chat, auth, debate, memory, sharing…) e
> namespace `api` adicionado em TD-5.4 — está completamente pronta para consumo. Zero blockers de infra.

---

## Story

**As a** equipe de engenharia do Mentes Sintéticas,
**I want** migrar incrementalmente todas as strings PT-BR hardcoded do frontend (componentes/páginas React) e o restante do backend (5 rotas) para chamadas ao `t()` do módulo `i18n/` existente,
**So that** todas as strings user-facing sejam gerenciadas centralmente — sem string dispersa em código —, a base fique preparada para multi-locale real quando o produto precisar, e nenhuma string visível ao usuário mude (byte-identical para pt-BR único).

---

## Débitos cobertos

| ID | Débito | Severidade | Escopo desta story |
|----|--------|-----------|-------------------|
| **UX-5** | i18n hardcoded pt-BR + strings inline fora do `t()` no frontend | 🟡 Medium | ~39 arquivos tsx em src/components e src/app |
| **SYS-13 (resto)** | Strings PT-BR hardcoded em rotas/erros backend (exceto chat/route.ts, já migrado em TD-5.4) | 🟢 Low | 5 arquivos: `debate/route.ts`, `debate/[debateId]/turn/route.ts`, `conversations/[id]/share/route.ts`, `memories/route.ts`, `memories/[id]/route.ts` |

**SYS-13 já entregue (TD-5.4):** `app/api/chat/route.ts` — totalmente migrado (namespace `api`, 16 testes de contrato PASS).

---

## Contexto: o sistema i18n

O sistema é **CUSTOM single-locale** — não usa next-intl nem bibliotecas externas. A função `t()` em `src/lib/i18n/index.ts` resolve chaves dot-notation contra `src/lib/i18n/messages/pt-BR.ts`. Hoje há apenas pt-BR; adicionar um segundo locale requer criar um arquivo irmão e trocar `activeLocale` — zero refactor de componente se eles já usam `t()`.

**Namespaces existentes em pt-BR.ts:** `common`, `home`, `chat`, `auth`, `footer`, `mindProfile`, `offline`, `sharing`, `memory`, `voice`, `soundscape`, `debate`, `errors`, `api` (adicionado em TD-5.4).

**Namespaces que precisam ser criados ou estendidos:** ver tarefas por incremento abaixo.

**Regra invariável:** `t('namespace.key')` DEVE retornar exatamente o mesmo texto que estava hardcoded. Sem alteração visível ao usuário em nenhum incremento. PT-BR é locale único; isso é centralização, não tradução ativa.

---

## Scale (dimensionamento)

**Frontend (~39 arquivos):**
- Chat: `chat-message.tsx`, `chat-interface.tsx`, `chat-input.tsx`, `chat-header.tsx`, `chat-empty-state.tsx`, `conversation-drawer.tsx`, `conversation-list.tsx`, `code-block.tsx`, `share-popover.tsx`, `shared-conversation-view.tsx` (10 arquivos)
- Debate: `debate-setup.tsx`, `debate-interface.tsx`, `debate-message.tsx` (3 arquivos)
- Mind: `mind-profile-hero.tsx`, `mind-profile-details.tsx`, `mind-knowledge-sources.tsx`, `mind-conversation-starters.tsx` (4 arquivos)
- Auth/onboarding: `signup/page.tsx`, `login/page.tsx`, `onboarding/onboarding-dialog.tsx` (3 arquivos)
- Shared/layout: `layout.tsx`, `page.tsx`, `error.tsx`, `error-boundary.tsx`, `home-empty-state.tsx`, `breadcrumb.tsx`, `search-empty-state.tsx` (7 arquivos)
- Páginas: `debate/page.tsx`, `debate/[debateId]/page.tsx`, `shared/[token]/page.tsx`, `mind/[slug]/page.tsx`, `offline/page.tsx`, `chat/[mindId]/error.tsx` (6 arquivos)
- Memoria: `memory-panel.tsx` (1 arquivo)
- Soundscape: `soundscape-controls.tsx` (1 arquivo)
- OG images (server-only, sem `t()` necessário): `apple-icon.tsx`, `opengraph-image.tsx`, `shared/[token]/opengraph-image.tsx`, `mind/[slug]/opengraph-image.tsx` — excluídos (não são user-facing runtime)

**Nota:** ~19 desses arquivos podem já não ter strings hardcoded (usam `t()` ou não têm texto user-facing); a contagem exata se confirma durante o mapeamento da Task 1.1.

**Backend SYS-13 restante (5 arquivos):**
- `src/app/api/debate/route.ts` — 2 strings hardcoded
- `src/app/api/debate/[debateId]/turn/route.ts` — ~12 strings + 1 string de IA (prompt)
- `src/app/api/conversations/[id]/share/route.ts` — 4 strings
- `src/app/api/memories/route.ts` — 4 strings
- `src/app/api/memories/[id]/route.ts` — 3 strings

---

## Acceptance Criteria

### Critério global (todos os incrementos)

- **Given** o sistema usa locale único (pt-BR)
- **When** uma string hardcoded é movida para `t('namespace.key')`
- **Then** o texto retornado é **byte-identical** ao texto hardcoded anterior; zero mudança visível ao usuário; nenhum teste de snapshot/contrato existente quebra

### Incremento 1 — Chat + Debate frontend (alto tráfego)

1. **Given** os componentes de chat (`chat-message.tsx`, `chat-interface.tsx`, `chat-input.tsx`, `chat-header.tsx`, `chat-empty-state.tsx`, `conversation-drawer.tsx`, `conversation-list.tsx`, `code-block.tsx`, `share-popover.tsx`, `shared-conversation-view.tsx`) e debate (`debate-setup.tsx`, `debate-interface.tsx`, `debate-message.tsx`) têm strings PT-BR inline
   - **When** as strings são migradas para o namespace `chat`, `sharing` e `debate` já existentes em pt-BR.ts (adicionando chaves faltantes)
   - **Then** zero string PT-BR hardcoded nos 13 arquivos acima; `t()` chamado para todo texto user-facing; `npm test` e `npm run lint` verdes

### Incremento 2 — Mind, auth, onboarding, shared e layout frontend

2. **Given** páginas/componentes de mind (`mind-profile-*`, `mind-conversation-starters.tsx`), auth (`login/page.tsx`, `signup/page.tsx`), onboarding (`onboarding-dialog.tsx`) e layout/shared (`layout.tsx`, `page.tsx`, `error.tsx`, `error-boundary.tsx`, `home-empty-state.tsx`, `breadcrumb.tsx`, `search-empty-state.tsx`, `offline/page.tsx`, páginas de mind/debate/shared/chat-error) têm strings PT-BR inline
   - **When** as strings são migradas para namespaces existentes (`auth`, `mindProfile`, `offline`, `home`, `errors`, `common`) ou novos sub-namespaces adicionados ao pt-BR.ts
   - **Then** zero string PT-BR hardcoded nos arquivos do escopo acima; `npm test` e `npm run lint` verdes; nenhuma string de OG image (`apple-icon.tsx`, `opengraph-image.tsx`) é obrigatória (server-only, excluídas do AC)

### Incremento 3 — SYS-13 backend restante (5 rotas)

3. **Given** as rotas `debate/route.ts`, `debate/[debateId]/turn/route.ts`, `conversations/[id]/share/route.ts`, `memories/route.ts` e `memories/[id]/route.ts` têm strings PT-BR hardcoded nas respostas de erro
   - **When** as strings são roteadas pelo namespace `api` do módulo `i18n/` (adicionando chaves faltantes ao namespace já existente)
   - **Then** zero string PT-BR hardcoded nas 5 rotas; textos byte-idênticos aos anteriores; se existirem testes de contrato para essas rotas eles passam sem alteração no texto de resposta

---

## Tasks / Subtasks

### Incremento 1 — Chat + Debate frontend

- [x] **1.1** Mapear strings PT-BR em cada um dos 13 arquivos de chat/debate; confirmar quais chaves já existem nos namespaces `chat`, `sharing`, `debate` e quais precisam ser adicionadas
- [x] **1.2** Adicionar chaves faltantes ao `src/lib/i18n/messages/pt-BR.ts` (namespaces `chat`, `sharing`, `debate`) com texto byte-identical
- [x] **1.3** Migrar strings em componentes de chat (10 arquivos) para `t()` — um componente por vez para facilitar revisão
- [x] **1.4** Migrar strings em componentes de debate (3 arquivos) para `t()` — `debate-setup.tsx`, `debate-interface.tsx`, `debate-message.tsx`
- [x] **1.5** `npm test` (447/447 PASS) + `npm run lint` (0 erros) verdes; nenhum snapshot/teste de contrato quebrou; `tsc --noEmit` 0 erros; `npm run build` PASS

### Incremento 2 — Mind, auth, onboarding, shared e layout

- [ ] **2.1** Mapear strings PT-BR nos arquivos de mind (4), auth (2), onboarding (1), layout/shared (~7), páginas (6); identificar chaves faltantes por namespace
- [ ] **2.2** Adicionar chaves faltantes ao pt-BR.ts nos namespaces `auth`, `mindProfile`, `offline`, `home`, `errors`, `common` (criar sub-chaves onde necessário; não criar novos namespaces de topo sem necessidade)
- [ ] **2.3** Migrar strings em componentes de mind para `t()` (4 arquivos)
- [ ] **2.4** Migrar strings em componentes de auth e onboarding para `t()` (3 arquivos)
- [ ] **2.5** Migrar strings em componentes de layout, shared e páginas para `t()` (~13 arquivos)
- [ ] **2.6** `npm test` + `npm run lint` verdes

### Incremento 3 — SYS-13 backend restante

- [ ] **3.1** Listar todas as strings hardcoded nas 5 rotas backend; mapear contra namespace `api` existente em pt-BR.ts
- [ ] **3.2** Adicionar chaves faltantes ao namespace `api` no pt-BR.ts (strings de debate, share, memories — byte-identical)
- [ ] **3.3** Importar `t` de `src/lib/i18n` nas 5 rotas e substituir strings hardcoded por chamadas `t('api.*')`
- [ ] **3.4** Verificar se há testes de contrato de resposta nessas rotas; se sim, confirmar que passam sem mudança; se não, documentar ausência (não criar testes novos — escopo de TD-5.5)
- [ ] **3.5** `npm test` + `npm run lint` verdes

### Fechamento

- [ ] **4.1** Confirmar zero strings PT-BR user-facing hardcoded em `src/components` e `src/app` (exceto OG images server-only)
- [ ] **4.2** Confirmar zero strings PT-BR hardcoded nas 5 rotas backend de escopo
- [ ] **4.3** Atualizar esta story: checkboxes, File List e status

---

## Estimativa

| Incremento | Escopo | Horas |
|-----------|--------|-------|
| Inc 1 — Chat + Debate frontend | ~13 arquivos tsx | 6–9h |
| Inc 2 — Mind, auth, onboarding, layout | ~26 arquivos tsx | 8–14h |
| Inc 3 — SYS-13 backend restante | 5 arquivos de rota | 2–3h |
| Buffer (mapeamento + namespace + lint) | — | 2–2h |
| **Total** | **~44 arquivos** | **~18–28h** |

> Alinha com a faixa original de UX-5 (~16–24h) mais o complemento de SYS-13 (~2–4h). Estimativa conservadora assume que ~15–20% dos 39 componentes listados já usam `t()` parcialmente e precisam apenas de chaves adicionais.

---

## Dependencies

- **Nenhuma blocker.** A infra `t()` + namespace `api` está completamente pronta (TD-5.4, Done).
- **Increments são independentes entre si** — podem ser entregues em PRs separados ou em sequência na mesma sessão.
- **SYS-9 / TD-5.5** (test coverage): não é pré-requisito desta story. Se existirem testes de snapshot, eles devem passar inalterados (byte-identical é o contrato). Novos testes para as rotas SYS-13 ficam em TD-5.5.
- **UX-11 / TD-5.5** (`chat-message.tsx` e `chat-interface.tsx` refactor): esta story toca esses arquivos para migrar strings, mas **não os refatora** (extração de hooks fica em TD-5.5). A migração de `t()` é compatível com qualquer refator futuro.

---

## Risks

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Alterar texto visível acidentalmente (typo na chave ou string no pt-BR.ts diverge do hardcoded) | Médio | AC byte-identical obrigatório; testes existentes como rede de segurança; revisão por componente (não batch cego) |
| Namespace collision — chave já existe com texto diferente | Baixo | Task 1.1/2.1/3.1 mapeia antes de escrever; inspecionar pt-BR.ts antes de adicionar |
| `t()` não importado corretamente em componente React (SSR vs Client) | Baixo | `t()` é função pura síncrona — funciona igual em server e client components; sem restrição de uso |
| Incremento 2 muito amplo — 26 arquivos numa única sessão | Médio | Dividir em sub-lotes por área (mind → auth → layout) dentro da mesma task; @dev pode entregar em PRs separados |
| OG images incluídas inadvertidamente | Baixo | AC explicitamente exclui `apple-icon.tsx`, `opengraph-image.tsx`, `shared/[token]/opengraph-image.tsx`, `mind/[slug]/opengraph-image.tsx` |

---

## Definition of Done

- [ ] Zero strings PT-BR user-facing hardcoded em `src/components/` e `src/app/` (exceto OG images server-only e strings de sistema como class names, atributos não-visíveis)
- [ ] Zero strings PT-BR hardcoded nas 5 rotas backend de escopo (`debate/route.ts`, `debate/[debateId]/turn/route.ts`, `conversations/[id]/share/route.ts`, `memories/route.ts`, `memories/[id]/route.ts`)
- [ ] `t('namespace.key')` retorna texto byte-identical ao hardcoded anterior para cada chave migrada (verificado por revisão de código + testes passando)
- [ ] `npm test` verde (358 testes mínimo, sem regressões)
- [ ] `npm run lint` exit 0
- [ ] File List atualizado com todos os arquivos modificados

---

## Priority

**P3** — sem urgência de prod. Sistema opera com locale único (pt-BR) hoje; nenhuma string causa bug ativo. Valor é centralização + preparação para multi-locale futuro. Os incrementos são independentes e podem ser agendados por sprint conforme capacidade disponível após TD-5.5 ou em paralelo.

---

## File List

> Preenchido por @dev durante a implementação.

**Increment 1 — modificados (chat + debate frontend):**
- `src/lib/i18n/messages/pt-BR.ts` — +~70 chaves nos namespaces `chat`, `sharing`, `debate`
- `src/components/chat/chat-message.tsx`
- `src/components/chat/chat-interface.tsx`
- `src/components/chat/chat-input.tsx` (já migrado; verificado)
- `src/components/chat/chat-header.tsx` (tooltip de uso migrado)
- `src/components/chat/chat-empty-state.tsx`
- `src/components/chat/conversation-drawer.tsx`
- `src/components/chat/conversation-list.tsx`
- `src/components/chat/code-block.tsx` (já migrado; verificado)
- `src/components/chat/share-popover.tsx`
- `src/components/chat/shared-conversation-view.tsx`
- `src/components/debate/debate-interface.tsx`
- `src/components/debate/debate-message.tsx`
- `src/components/debate/debate-setup.tsx`

**A ser modificado (estimado) — Inc 2/3:**
- `src/lib/i18n/messages/pt-BR.ts` — adição de chaves faltantes em namespaces existentes (todos os incrementos)
- `src/components/chat/*.tsx` — migração de strings para `t()` (Inc 1)
- `src/components/debate/*.tsx` — migração de strings para `t()` (Inc 1)
- `src/components/minds/*.tsx` — migração de strings para `t()` (Inc 2)
- `src/components/memory/memory-panel.tsx` — migração de strings para `t()` (Inc 2)
- `src/components/ui/search-empty-state.tsx`, `src/components/ui/breadcrumb.tsx` — migração de strings para `t()` (Inc 2)
- `src/components/error-boundary.tsx`, `src/components/home-empty-state.tsx` — migração de strings para `t()` (Inc 2)
- `src/components/onboarding/onboarding-dialog.tsx` — migração de strings para `t()` (Inc 2)
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/error.tsx` — migração de strings para `t()` (Inc 2)
- `src/app/login/page.tsx`, `src/app/signup/page.tsx` — migração de strings para `t()` (Inc 2)
- `src/app/offline/page.tsx` — migração de strings para `t()` (Inc 2)
- `src/app/debate/page.tsx`, `src/app/debate/[debateId]/page.tsx` — migração de strings para `t()` (Inc 2)
- `src/app/shared/[token]/page.tsx` — migração de strings para `t()` (Inc 2)
- `src/app/mind/[slug]/page.tsx` — migração de strings para `t()` (Inc 2)
- `src/app/chat/[mindId]/error.tsx` — migração de strings para `t()` (Inc 2)
- `src/app/api/debate/route.ts` — SYS-13 restante via `t()` (Inc 3)
- `src/app/api/debate/[debateId]/turn/route.ts` — SYS-13 restante via `t()` (Inc 3)
- `src/app/api/conversations/[id]/share/route.ts` — SYS-13 restante via `t()` (Inc 3)
- `src/app/api/memories/route.ts` — SYS-13 restante via `t()` (Inc 3)
- `src/app/api/memories/[id]/route.ts` — SYS-13 restante via `t()` (Inc 3)

---

## Dev Notes

- **`t()` é função pura síncrona** — pode ser importada diretamente em qualquer arquivo (server component, client component, route handler). Sem restrição de runtime.
- **Byte-identical é o contrato** — o texto em pt-BR.ts deve ser copiado literalmente do hardcoded, não reescrito. Se houver discrepância tipográfica no hardcoded original, manter o original (não "corrigir" durante a migração).
- **Mapeamento antes de escrever** — Tasks 1.1, 2.1 e 3.1 são de leitura/mapeamento. Não iniciar substituições sem o mapa completo de chaves para evitar colisão ou duplicação silenciosa.
- **Prompt de IA no `debate/[debateId]/turn/route.ts`** — a string `"E a sua vez de responder no debate. Reaq ao que foi dito."` (linha 180) é parte de um prompt de sistema para o Gemini. Migrar para `t()` é possível, mas requer atenção: se o namespace não tiver a chave, `t()` retorna o nome da chave (fallback seguro). Confirmar chave e valor antes de migrar.
- **OG images excluídas** — `apple-icon.tsx`, `opengraph-image.tsx` e suas variantes de rota são server-only e geram imagens; strings ali são atributos de imagem, não texto user-facing. Excluídas do escopo.

---

## QA Results

### Increment 1 — Chat + Debate frontend — **PASS** (Quinn @qa, 2026-05-31)

**Gate file:** `docs/qa/gates/TD-5.4b-inc1.yml` · **Story status:** stays InProgress (Inc 2/3 pending)

**Quality gates (all green):**

| Gate | Command | Result |
|------|---------|--------|
| Tests | `vitest --maxWorkers=2 --run` | **447/447 PASS** (40 suites) |
| Build | `npm run build` | **PASS** |
| Lint | `npm run lint` | **exit 0** (0 errors, 9 warnings) |
| Typecheck | `npx tsc --noEmit` | **0 errors** |

**Key-leak check (CRITICAL — primary failure mode): PASS.**
Extracted every `t('...')` key from the 13 Inc-1 files and resolved each through the real `t()` function (vitest harness). **165 keys checked → 165 resolved → 0 leaks.** No dot-path can render to the UI.

**Byte-identical spot-check (10 strings, chat + debate): all EXACT.**
- `chat.messageFrom` = `"Mensagem de {mindName}"` (TD-5.5 asserts "Mensagem de Socrates" ✓)
- `chat.initialGreeting`, `chat.tokenWarning` — identical to originals ✓
- `chat.usageTooltip` = `"Uso diario: {percentage}% | ${cost}"` — literal `$` preserved ✓
- `debate.startInstruction` = `'Clique em "Proximo Turno" para iniciar o debate.'` — @dev-flagged `&quot;`→`"` verified byte-identical at render ✓
- `debate.mindFallback`="mente" (interface, lowercase) vs `debate.mindFallbackCap`="Mente" (message, capitalized) — @dev-flagged casing split verified correct ✓
- `debate.debateActionToast` = `"Debate {action}."` interpolated, labels preserved ✓
- `debate.roundLabel`/`turnLabel` = "Round"/"Turno" (TD-5.5 asserts /Round 1\/3/ ✓)
- `debate.pauseAria` = "Pausar debate" (TD-5.5 asserts it ✓)

The TD-5.5 a11y/interface suites assert exact strings and all pass in the 447/447 run — independent confirmation of byte-identical.

**Coverage: COMPLETE.** Scanned all 13 files (quoted literals + JSX text nodes) — zero missed user-facing PT-BR strings. Remaining quoted literals are non-user-facing (API paths, htmlFor/id attrs, type literal, displayName).

**Minor (non-blocking, LOW):** unused type import `DebateParticipantInfo` in `debate-setup.tsx` (eslint warning, 0-error, not user-facing). Recommend removal during Inc-2 touch of debate files.

**Verdict: PASS** — zero key-leak, all spot-checks byte-identical, all CI gates green. Increment 1 of TD-5.4b approved. Story remains InProgress for Increments 2 and 3.

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-31 | 1.0.0 | Carry-forward de TD-5.4 (UX-5 + SYS-13 backend resto). Story TD-5.4b criada. Status: Draft. | @sm |
| 2026-05-31 | 1.1.0 | Validated GO (10/10) — Status: Draft → Ready. Byte-identical AC testável; Inc 1 (13 arquivos chat/debate) independentemente shippable; OG images corretamente excluídas. Recomendado 3 gates incrementais. | @po |
| 2026-05-31 | 1.2.0 | Increment 1 implementado (YOLO, byte-identical). Status: Ready → InProgress. 13 arquivos chat/debate migrados para `t()`; ~70 chaves novas em `chat`/`sharing`/`debate` com texto byte-idêntico. Verificação: `vitest` 447/447 PASS (rede de segurança snapshot/a11y verde), `tsc --noEmit` 0 erros, `eslint` 0 erros, `npm run build` PASS. Zero key-leak (171 chaves usadas resolvem para string). | @dev |
| 2026-05-31 | 1.3.0 | **QA Gate Increment 1 — PASS** (Quinn @qa). Tests 447/447, build PASS, lint exit 0, tsc 0 erros. Key-leak: 165 chaves verificadas via `t()` real → 165 resolvem → 0 leaks. 10 spot-checks byte-identical EXATOS (incl. `&quot;`→`"` em startInstruction e split mindFallback/mindFallbackCap). Coverage completa nos 13 arquivos. 1 warning LOW não-bloqueante (import de tipo `DebateParticipantInfo` não usado em debate-setup.tsx). Gate: `docs/qa/gates/TD-5.4b-inc1.yml`. Status permanece InProgress (Inc 2/3 pendentes). | @qa |
