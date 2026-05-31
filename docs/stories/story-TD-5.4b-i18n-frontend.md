# Story TD-5.4b — i18n frontend: strings PT-BR via t() (UX-5 + SYS-13 backend resto)

**Status:** Done
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

- [x] **2.1** Mapear strings PT-BR nos arquivos de mind (4), auth (2), onboarding (1), layout/shared (~7), páginas (6); identificar chaves faltantes por namespace
- [x] **2.2** Adicionar chaves faltantes ao pt-BR.ts nos namespaces `auth`, `offline`, `home`, `errors`, `common`, `debate` + novo namespace `onboarding` (byte-identical)
- [x] **2.3** Migrar strings em componentes de mind para `t()` (`mind-avatar.tsx` único com string hardcoded; demais já migrados na infra TD-5.4)
- [x] **2.4** Migrar strings em componentes de auth e onboarding para `t()` (`login/page.tsx`, `signup/page.tsx`, `onboarding-dialog.tsx`)
- [x] **2.5** Migrar strings em componentes de layout, shared e páginas para `t()` (`layout.tsx`, `page.tsx`, `error.tsx`, `error-boundary.tsx`, `home-empty-state.tsx`, `breadcrumb.tsx`, `search-empty-state.tsx`, `offline/page.tsx`, `debate/page.tsx`, `debate/[debateId]/page.tsx`, `chat/[mindId]/error.tsx`)
- [x] **2.6** `npm test` (447/447 PASS) + `npm run lint` (exit 0) verdes; `tsc --noEmit` 0 erros; `npm run build` PASS; zero key-leak (67/67 chaves resolvem)

### Incremento 3 — SYS-13 backend restante

- [x] **3.1** Listar todas as strings hardcoded nas 5 rotas backend; mapear contra namespace `api` existente em pt-BR.ts
- [x] **3.2** Adicionar chaves faltantes ao namespace `api` no pt-BR.ts (strings de debate, share, memories — byte-identical)
- [x] **3.3** Importar `t` de `src/lib/i18n` nas 5 rotas e substituir strings hardcoded por chamadas `t('api.*')`
- [x] **3.4** Verificar se há testes de contrato de resposta nessas rotas; nenhum teste de rota asserta esses textos (apenas `lib/validations/debate.ts` e `lib/ai/debate.ts` têm testes, escopo diferente). Ausência documentada — não criados testes novos (escopo TD-5.5)
- [x] **3.5** `npm test` (447/447 PASS) + `npm run lint` (exit 0) verdes; `tsc --noEmit` 0 erros; `npm run build` PASS

### Fechamento

- [x] **4.1** Confirmar zero strings PT-BR user-facing hardcoded em `src/components` e `src/app` (exceto OG images server-only)
- [x] **4.2** Confirmar zero strings PT-BR hardcoded nas 5 rotas backend de escopo
- [x] **4.3** Atualizar esta story: checkboxes, File List e status

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

- [x] Zero strings PT-BR user-facing hardcoded em `src/components/` e `src/app/` (exceto OG images server-only e strings de sistema como class names, atributos não-visíveis)
- [x] Zero strings PT-BR hardcoded nas 5 rotas backend de escopo (`debate/route.ts`, `debate/[debateId]/turn/route.ts`, `conversations/[id]/share/route.ts`, `memories/route.ts`, `memories/[id]/route.ts`) — restam apenas 2 strings de prompt de IA (não user-facing) e 1 check `msg.includes("nao encontrada")` (lógica de service-passthrough, não literal de resposta), todos intencionalmente preservados
- [x] `t('namespace.key')` retorna texto byte-identical ao hardcoded anterior para cada chave migrada (verificado por revisão de código + testes passando + key-leak test via `t()` real, 23/23 resolvem)
- [x] `npm test` verde (447/447, sem regressões)
- [x] `npm run lint` exit 0
- [x] File List atualizado com todos os arquivos modificados

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

**Increment 2 — modificados (mind/auth/onboarding/layout/shared/pages frontend):**
- `src/lib/i18n/messages/pt-BR.ts` — +~45 chaves: `common` (skip/nav/breadcrumb/searchEmpty ×3), `home` (selectMind/knowledgeBase card ×4 + fileSearchActive), `auth` (invalidCredentials/createAccountError/accountCreatedLogin), novo namespace `onboarding` (14 chaves), `offline.pageDescriptionFull`, `debate` (5 page-level chaves), `errors` (10 chaves error/boundary/chat-error)
- `src/components/minds/mind-avatar.tsx` — `Avatar de {name}` → reuso `chat.avatarOf`
- `src/app/login/page.tsx` — redirects de erro via `auth.requiredFields`/`auth.invalidCredentials`
- `src/app/signup/page.tsx` — redirects de erro via `auth.requiredFields`/`auth.createAccountError`/`auth.accountCreatedLogin`
- `src/components/onboarding/onboarding-dialog.tsx` — 3 steps + footer/aria via novo namespace `onboarding`
- `src/app/layout.tsx` — skip link, nav aria, botão Sair (namespace `common`); metadata OG/SEO intacta (out of scope)
- `src/app/page.tsx` — cards Selecionar Mente / Base de Conhecimento via `home.*`
- `src/app/error.tsx` — fallback global via `errors.*`
- `src/components/error-boundary.tsx` — fallback via `errors.*`
- `src/components/home-empty-state.tsx` — reuso `home.emptyState*`
- `src/app/offline/page.tsx` — `offline.pageTitle` + `offline.pageDescriptionFull`; metadata.title intacta (out of scope)
- `src/app/debate/page.tsx` — header/intro/aria via `debate.*`; metadata intacta (out of scope)
- `src/app/debate/[debateId]/page.tsx` — main aria via `debate.viewPageLabel`; metadata intacta (out of scope)
- `src/app/chat/[mindId]/error.tsx` — fallback via `errors.*`
- `src/components/ui/breadcrumb.tsx` — aria via `common.breadcrumbNav`
- `src/components/ui/search-empty-state.tsx` — via `common.searchEmpty*`
- `src/components/debate/debate-setup.tsx` — removido import de tipo não usado `DebateParticipantInfo` (limpeza do warning LOW do gate Inc-1)

**Increment 3 — modificados (SYS-13 backend restante, 5 rotas):**
- `src/lib/i18n/messages/pt-BR.ts` — +23 chaves no namespace `api` (debate ×9, share ×3, memory ×8 + reuso de `sessionExpired`/`conversationNotFound`), todas byte-idênticas
- `src/app/api/debate/route.ts` — 3 strings migradas (`sessionExpired` reuso, `debateRateLimited` interpolada, `debateCreateError`); `{ error: msg }` (service-passthrough) e check `msg.includes("nao encontrada")` preservados
- `src/app/api/debate/[debateId]/turn/route.ts` — 9 strings de resposta migradas; **2 strings de prompt de IA (turnInstruction, L180-181) intencionalmente LEFT** (instruções para o Gemini, nunca retornadas ao cliente — migrar arriscaria alterar comportamento do modelo)
- `src/app/api/conversations/[id]/share/route.ts` — 6 ocorrências migradas (`sessionExpired` ×2, `conversationNotFound` ×2 reuso, `shareRateLimited`, `shareError`, `unshareError`)
- `src/app/api/memories/route.ts` — 5 strings migradas (`authRequired` ×2, `memoryMindIdRequired`, `memoryConfirmRequired`, `memoryListError`, `memoryBulkDeleteError`)
- `src/app/api/memories/[id]/route.ts` — 4 strings migradas (`authRequired`, `memoryIdRequired`, `memoryNotFound`, `memoryDeleteError`)

**Sem alteração (já 100% migrados na infra TD-5.4, zero string hardcoded):** `mind-profile-hero.tsx`, `mind-profile-details.tsx`, `mind-knowledge-sources.tsx`, `mind-conversation-starters.tsx`, `mind-card.tsx`, `mind-tag.tsx`, `memory-panel.tsx`, `soundscape-controls.tsx`, `onboarding-wrapper.tsx`.

**Excluídos do escopo (server-only / SEO-OG metadata):** `mind/[slug]/page.tsx` (generateMetadata + JSON-LD), `shared/[token]/page.tsx` (generateMetadata + OG), blocos `metadata` de `layout.tsx`/`debate/page.tsx`/`debate/[debateId]/page.tsx`/`offline/page.tsx`, e os `*opengraph-image.tsx`/`apple-icon.tsx`.

**A ser modificado (estimado) — Inc 3:**
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

### Increments 2 + 3 — Mind/auth/onboarding/layout frontend + SYS-13 backend (combined gate) — **PASS** (Quinn @qa, 2026-05-31)

**Gate file:** `docs/qa/gates/TD-5.4b-inc2-3.yml` · **Story status:** InReview → **Done** (completes TD-5.4b)

**Scope gated together:** Inc 2 (15 frontend files, 67 keys used) + Inc 3 (5 backend API routes, 23 keys) — both in working tree, uncommitted.

**Quality gates (all green):**

| Gate | Command | Result |
|------|---------|--------|
| Tests | `vitest --maxWorkers=2 --run` | **447/447 PASS** (40 suites) |
| Build | `npm run build` | **PASS** |
| Lint | `npm run lint` | **exit 0** (0 errors, 8 warnings, all pre-existing) |
| Typecheck | `npx tsc --noEmit` | **0 errors** |

**Key-leak check (CRITICAL — primary failure mode): PASS.**
Extracted every `t('...')` key from the Inc-2 frontend files AND Inc-3 route files; resolved each through the real `t()` function (vitest harness; leak = `t(key) === key`). **Inc 2: 67/67 resolve. Inc 3: 23/23 resolve. → 90/90 keys resolve, 0 leaks.** No dot-path can render to the UI nor surface as a dot-path in an API error response to clients. (Regex also surfaced bare `email`/`password`/`mindId` — confirmed FALSE POSITIVES from `formData.get(...)`, not `t()` keys.)

**Byte-identical spot-check (12+ strings, frontend + backend): all EXACT.**
- Frontend: `auth.requiredFields`="Email e senha sao obrigatorios.", `auth.invalidCredentials`="Credenciais invalidas.", `auth.accountCreatedLogin`="Conta criada. Faca login." ✓ ; `onboarding.step1Title`="Bem-vindo ao Atheneum" + skip/start/previous/next ✓ ; `onboarding.stepProgress` interpolates "Passo 1 de 3" (orig `` `Passo ${currentStep+1} de ${STEPS.length}` ``) ✓ ; `debate.pageIntro` em-dash "...em turnos — e voce controla o ritmo." ✓
- Backend: `api.sessionExpired` ✓ ; `api.debateRateLimited` interpolated template matches original and call-site passes `maxAllowed`+`retryAfter` (param names match → no placeholder leak) ✓ ; `api.debateCompleted` em-dash "Debate concluido — todos os rounds foram completados." ✓ ; `api.memoryNotFound`/`memoryDeleteError`/`memoryListError` ✓ ; `api.memoryConfirmRequired` preserves literal `{ confirm: true }` ✓

**AI-prompt strings LEFT (Inc 3): CONFIRMED correct.** The 2 `turnInstruction` template literals (turn/route.ts L180-181) feed `{ role: "user", content: turnInstruction }` (L185) → sent to Gemini, never returned to client. Correctly NOT migrated — migrating Gemini prompts is out of scope / would risk altering model behavior.

**Server-only exclusions (Inc 2): CONFIRMED correct.** `layout.tsx` `metadata` object (title/description/OG, L32-82) uses plain string literals, NOT routed through client `t()`. Only runtime user-facing strings (`common.skipToContent`/`accountNav`/`signOut`) use `t()`. OG/metadata/generateMetadata correctly excluded.

**Coverage sanity: bounded-complete.** Spot-grepped Inc-2 (page.tsx, onboarding-dialog, error.tsx) + Inc-3 (debate/route.ts, share/route.ts). Remaining literals all non-user-facing: JSX comments, TS type annotations, Zod error passthrough (`{ error: errors }`), `console.error` log labels.

**Verdict: PASS** — zero key-leak (90/90 resolve), all byte-identical spot-checks EXACT, AI-prompt strings correctly left, server-only metadata correctly excluded, all CI gates green. **TD-5.4b COMPLETE (Inc 1+2+3).** Status: InReview → Done.

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-31 | 1.0.0 | Carry-forward de TD-5.4 (UX-5 + SYS-13 backend resto). Story TD-5.4b criada. Status: Draft. | @sm |
| 2026-05-31 | 1.1.0 | Validated GO (10/10) — Status: Draft → Ready. Byte-identical AC testável; Inc 1 (13 arquivos chat/debate) independentemente shippable; OG images corretamente excluídas. Recomendado 3 gates incrementais. | @po |
| 2026-05-31 | 1.2.0 | Increment 1 implementado (YOLO, byte-identical). Status: Ready → InProgress. 13 arquivos chat/debate migrados para `t()`; ~70 chaves novas em `chat`/`sharing`/`debate` com texto byte-idêntico. Verificação: `vitest` 447/447 PASS (rede de segurança snapshot/a11y verde), `tsc --noEmit` 0 erros, `eslint` 0 erros, `npm run build` PASS. Zero key-leak (171 chaves usadas resolvem para string). | @dev |
| 2026-05-31 | 1.3.0 | **QA Gate Increment 1 — PASS** (Quinn @qa). Tests 447/447, build PASS, lint exit 0, tsc 0 erros. Key-leak: 165 chaves verificadas via `t()` real → 165 resolvem → 0 leaks. 10 spot-checks byte-identical EXATOS (incl. `&quot;`→`"` em startInstruction e split mindFallback/mindFallbackCap). Coverage completa nos 13 arquivos. 1 warning LOW não-bloqueante (import de tipo `DebateParticipantInfo` não usado em debate-setup.tsx). Gate: `docs/qa/gates/TD-5.4b-inc1.yml`. Status permanece InProgress (Inc 2/3 pendentes). | @qa |
| 2026-05-31 | 1.5.0 | **Increment 3 implementado (SYS-13 backend restante — ÚLTIMO incremento)** (YOLO, byte-identical). 5 rotas backend migradas (`debate/route.ts`, `debate/[debateId]/turn/route.ts`, `conversations/[id]/share/route.ts`, `memories/route.ts`, `memories/[id]/route.ts`); +23 chaves novas no namespace `api` (debate ×9, share ×3, memory ×8) com reuso de `sessionExpired`/`conversationNotFound` existentes. 27 ocorrências de string user-facing migradas para `t('api.*')`. **2 strings de prompt de IA (turnInstruction) intencionalmente LEFT** — instruções de sistema/usuário para o Gemini, nunca retornadas ao cliente; migrá-las arriscaria alterar comportamento do modelo (constraint da story). Check `msg.includes("nao encontrada")` e `{ error: msg }` (service-passthrough) preservados — não são literais de resposta hardcoded. Sem testes de contrato de rota para essas 5 rotas (apenas `lib/validations/debate` e `lib/ai/debate` têm testes, escopo diferente) — ausência documentada, sem testes novos (TD-5.5). Verificação: `vitest` 447/447 PASS, `tsc --noEmit` 0 erros, `eslint` exit 0 (0 errors, 8 warnings pré-existentes), `npm run build` PASS. Key-leak: 23/23 chaves novas resolvem via `t()` real → 0 leaks; byte-identical spot-checks EXATOS (interpolação debateRateLimited, literal `{ confirm: true }` em memoryConfirmRequired, em-dash em debateCompleted). **TD-5.4b COMPLETA (Inc 1+2+3).** Status: InProgress → InReview. | @dev |
| 2026-05-31 | 1.6.0 | **QA Gate Increments 2+3 (combined) — PASS** (Quinn @qa). Gated Inc 2 (15 frontend files, 67 keys) + Inc 3 (5 backend routes, 23 keys) together. Tests 447/447 PASS, build PASS, lint exit 0 (8 pre-existing warnings), tsc 0 errors. Key-leak: 90/90 keys resolve via real `t()` (Inc2 67/67 + Inc3 23/23) → 0 leaks; no dot-path can surface in UI or API error responses. Byte-identical spot-check (12+ strings, frontend+backend) all EXACT — incl. interpolated `debateRateLimited` (call-site param names match template), em-dash in `debate.pageIntro`/`api.debateCompleted`, literal `{ confirm: true }` in `memoryConfirmRequired`. 2 AI-prompt `turnInstruction` strings correctly LEFT unmigrated (Gemini prompts, never returned to client). Server-only OG/metadata correctly excluded from client `t()`. Coverage bounded-complete. Gate: `docs/qa/gates/TD-5.4b-inc2-3.yml`. **TD-5.4b COMPLETE.** Status: InReview → Done. | @qa |
| 2026-05-31 | 1.4.0 | **Increment 2 implementado** (YOLO, byte-identical). 15 arquivos frontend migrados (mind-avatar, login, signup, onboarding-dialog, layout, page, error, error-boundary, home-empty-state, offline, debate page, debate/[debateId], chat/[mindId]/error, breadcrumb, search-empty-state); ~45 chaves novas em `common`/`home`/`auth`/`offline`/`debate`/`errors` + novo namespace `onboarding` (14 chaves), todas byte-idênticas. Reuso de chaves existentes onde aplicável (`chat.avatarOf`, `auth.requiredFields`, `home.*`, `offline.pageTitle`, `debate.pageTitle`/`back`, `errors.tryAgain`/`backToHome`). Cleanup: removido import de tipo `DebateParticipantInfo` não usado em debate-setup.tsx (warning LOW do gate Inc-1 — agora 8 warnings vs 9). 9 arquivos já 100% migrados na infra TD-5.4 (sem alteração). OG/SEO metadata e server-only OG images corretamente excluídos. Verificação: `vitest` 447/447 PASS, `tsc --noEmit` 0 erros, `eslint` exit 0 (0 errors, 8 warnings pré-existentes), `npm run build` PASS. Key-leak: 67/67 chaves usadas resolvem via `t()` real → 0 leaks. Spot-check byte-identical de 9 strings EXATO (incl. em-dash em pageIntro, `--` em onboarding, interpolação stepProgress/searchEmpty/avatarOf). Status permanece InProgress (Inc 3 backend pendente). | @dev |
