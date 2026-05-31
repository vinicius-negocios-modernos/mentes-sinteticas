# Technical Debt Assessment - DRAFT
## Para Revisão dos Especialistas

**Projeto:** Mentes Sintéticas | **Data:** 2026-05-30 | **Stack:** Next.js 16 + Drizzle/PostgreSQL 16 + NextAuth v5 + Gemini

> **Autor:** Aria (@architect) · **Fase:** 4 (Consolidação) do Brownfield Discovery.
> **Origem:** merge de `system-architecture.md` (Fase 1, SYS-1..14), `DB-AUDIT.md` (Fase 2, DB-1..14) e `frontend-spec.md` (Fase 3, UX-1..14).
> **Status:** DRAFT — Seção 1 validada por @architect. Seções 2 e 3 aguardam sign-off dos especialistas (Fases 5 e 6). NÃO finalizar até as revisões.
> **Escala de severidade:** 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low.

---

## 1. Débitos de Sistema (validado por @architect)

| ID | Débito | Severidade | Impacto | Esforço | Prioridade prelim |
|----|--------|-----------|---------|---------|-------------------|
| **SYS-1** | Gemini File URI expira (~48h), mantida viva por cron externo na VPS; app depende da freshness do cache | 🟠 High | Cron para → mentes perdem conhecimento silenciosamente | M | **P1** |
| **SYS-10** | Migrations aplicadas **manualmente** via SSH tunnel; sem step automatizado no deploy | 🟠 High | Drift schema/código em prod (M1 local_path foi sintoma) | M | **P1** |
| **SYS-9** | 56 componentes React, quase-zero testes de componente (25 test files, quase todos em `lib/`) | 🟠 High | Regressões de UI não detectadas pela CI | L | **P2** |
| **SYS-2** | NextAuth pinado em `5.0.0-beta.30` (beta) | 🟠 High | Caminho crítico; quebras beta→beta possíveis, sem LTS | M | **P2** |
| **SYS-11** | Sem smoke test pós-deploy; healthcheck do cron só testa `GET /` | 🟡 Medium | `/api/chat` ou auth Gemini quebrados passam o healthcheck | M | **P2** |
| **SYS-7** | Dois SDKs Gemini coexistem (`@ai-sdk/google` streaming + `@google/generative-ai` legacy/memory) | 🟡 Medium | Dupla manutenção + bundle | M | **P3** |
| **SYS-5** | Validação de env parcial — só `GEMINI_*` via Zod; `DATABASE_URL`, `AUTH_SECRET`, limites lidos raw | 🟡 Medium | Falha silenciosa de config em runtime em vez de fail-fast no boot | M | **P3** |
| **SYS-8** | `chat/route.ts` usa string-matching no catch em vez da taxonomia `AppError`/`classifyError` que já possui | 🟡 Medium | Frágil a mudança de mensagens | S | **P3** |
| **SYS-14** | `api/auth/signup/route.ts` importa `@/db` direto, furando a camada `lib/services/` | 🟡 Medium | Vazamento de boundary; criação de user sem serviço testável | S | **P3** |
| **SYS-3** | CI (`ci.yml`, `e2e.yml`) ainda injeta `NEXT_PUBLIC_SUPABASE_*` após remoção do Supabase | 🟡 Medium | Config morta; induz devs futuros ao erro | S | **P3** |
| **SYS-4** | `@vercel/analytics` + `@vercel/speed-insights` embarcados, mas app não está na Vercel; falham em prod | 🟡 Medium | Erros de console em prod, sem ganho de telemetria | S | **P3** |
| **SYS-12** | Side-effects fire-and-forget (usage, memory extract, cleanup) — falhas só logadas, sem retry/DLQ | 🟢 Low | Sob carga, contabilidade de custo pode driftar silenciosamente | M | **P4** |
| **SYS-13** | Strings PT-BR hardcoded em rotas/erros apesar de módulo `i18n/` existir | 🟢 Low | Infra i18n contornada; localização futura = refactor grande | M | **P4** |
| **SYS-6** | URLs de prod + magic constants hardcoded (`NEXTAUTH_URL`, `MAX_FILE_URIS_PER_REQUEST=8`, rate defaults) | 🟢 Low | Não portável / não tunável sem rebuild | S | **P4** |

**Subtotal sistema:** 14 débitos — 0 🔴 · 4 🟠 · 6 🟡 · 4 🟢.

---

## 2. Débitos de Database

⚠️ **PENDENTE: Revisão do @data-engineer (Fase 5).** Estimativas e ordem de migração abaixo são preliminares (de @data-engineer na Fase 2), aguardando confirmação sob a ótica de "live prod DB".

| ID | Débito | Severidade | Impacto | Esforço | Prioridade prelim |
|----|--------|-----------|---------|---------|-------------------|
| **DB-4** | `fix-m1-local-path.sql` escreve `updated_at` em `knowledge_documents` — **coluna não existe** | 🔴 Critical | Script aborta a transação em runtime | XS | **P1** |
| **DB-5** | `file_uri_cache` sem UNIQUE em `knowledge_document_id`, mas scripts usam `ON CONFLICT (knowledge_document_id)` | 🔴 Critical | Upsert falha; permite linhas de cache duplicadas por doc | S | **P1** |
| **DB-2** | `user_id` em 5 tabelas sem FK para `users` (zero integridade referencial) | 🔴 Critical | Linhas órfãs, sem cascade no delete de user | M | **P1** |
| **DB-3** | `knowledge_documents.local_path` em **NFD** (macOS) → mismatch em JOIN/`=` | 🟠 High | Causou 20/21 URI cache miss (bug M1) | S–M | **P1** |
| **DB-6** | Índices ausentes em FK/filtros quentes (`messages.conversation_id`, `conversations.user_id`, `debates.user_id`, `knowledge_documents.mind_id`, `file_uri_cache.knowledge_document_id`) | 🟠 High | Seq-scan em todas; `messages` é o read mais quente | S | **P2** |
| **DB-7** | `conversations.share_token` sem índice e sem UNIQUE — share público faz full scan; colisão possível | 🟠 High | Full scan em cada page-load de share; risco de colisão | XS | **P2** |
| **DB-13** | `rate_limits` sem UNIQUE em (user_id, action, window_start) — inserts concorrentes duplicam janela | 🟠 High | Race sob concorrência infla/divide contagem, enfraquece limite | S | **P2** |
| **DB-1** | Sem RLS / authz no DB pós-Supabase — segurança 100% na app-layer | 🟠 High | Qualquer query raw/admin/2º consumidor fura o escopo | M (análise) | **P2** |
| **DB-9** | Colunas enum-like (`messages.role`, `mind_memories.memory_type`, `debates.status`) só validadas na ORM, sem CHECK/pg enum | 🟡 Medium | DB aceita qualquer texto via raw SQL/script | S | **P3** |
| **DB-10** | Sem auto-update de `updated_at` (sem triggers); app-mantido, pulado em writes raw | 🟡 Medium | Drift entre `updated_at` e realidade em updates por script | S | **P3** |
| **DB-12** | `rate_limits` / `token_usage` crescem ilimitadamente — sem retenção/TTL/cleanup | 🟡 Medium | Janelas de `rate_limits` acumulam para sempre | M | **P3** |
| **DB-8** | Scripts `*.sql` ad-hoc mutam dados de prod fora do sistema de migrations | 🟡 Medium | Unversionados, manuais, propensos a erro (DB-4/DB-5 são sintomas) | M | **P3** |
| **DB-11** | `token_usage.total_tokens` denormalizado (= input+output) sem CHECK | 🟢 Low | Pode driftar | XS | **P4** |
| **DB-14** | `knowledge_documents` tem `local_path` E `storage_path` (pós-Supabase); semântica ambígua | 🟢 Low | `storage_path` provavelmente morto/inutilizado | S | **P4** |

**Subtotal database:** 14 débitos — 3 🔴 · 4 🟠 · 4 🟡 · 2 🟢. (DB-1 é "High" analysis-only.)

---

## 3. Débitos de Frontend/UX

⚠️ **PENDENTE: Revisão do @ux-design-expert (Fase 6).** Severidades e esforços (dias-dev) são preliminares (de @ux-design-expert na Fase 3), aguardando priorização final shippable vs must-fix.

> Nota de calibração de escala: a Fase 3 usou 🔴 Alta / 🟡 Média / 🟢 Baixa (3 níveis). Mapeado aqui como 🔴 Alta→High, 🟡 Média→Medium, 🟢 Baixa→Low para a matriz unificada. Nenhum débito UX foi classificado como 🔴 Critical (data-loss/runtime-failure/security).

| ID | Débito | Severidade | Impacto | Esforço | Prioridade prelim |
|----|--------|-----------|---------|---------|-------------------|
| **UX-1** | Áudios de soundscape são placeholders de 43–75 bytes — recurso exposto na UI mas não-funcional | 🟠 High | Promessa quebrada: usuário ativa ambiente e nada toca | 1d | **P2** |
| **UX-2** | Tokens de design contornados por cores cruas (`text-gray-*`, `bg-purple-*`, `text-white`) em 45 arquivos | 🟠 High | Light mode e mind-themes inconsistentes; rebrand custoso | 3–4d | **P2** |
| **UX-3** | Contraste WCAG não validado: `text-gray-400/500` e 7 mind-themes sem teste de ratio AA | 🟠 High | Risco real de falha 1.4.3; claim AA não comprovado | 1–2d | **P2** |
| **UX-5** | i18n hardcoded pt-BR + strings inline fora do `t()` (greetings, toasts, labels) | 🟡 Medium | Internacionalização efetivamente bloqueada | 2–3d | **P3** |
| **UX-11** | `chat-message.tsx` (556 LOC) e `chat-interface.tsx` (515 LOC) sobrecarregados | 🟡 Medium | Risco de regressão; difícil evoluir o fluxo central | 2d | **P3** |
| **UX-4** | Claim de teste VoiceOver/Lighthouse no doc não corresponde ao estado (QG2/QG3 pendentes) | 🟡 Medium | Doc de a11y superestima conformidade | 1d | **P3** |
| **UX-7** | `metadataBase`/JSON-LD apontam para vercel.app, não para domínio de prod | 🟡 Medium | OG/SEO e share cards com URL errada | 0.25d | **P3** |
| **UX-8** | Vercel Analytics + SpeedInsights carregam e falham fora da Vercel | 🟡 Medium | Erros de console em prod, sem ganho de telemetria | 0.25d | **P3** |
| **UX-9** | Gradiente do título triplicado (CSS `.text-gradient` + inline + classes Tailwind) | 🟢 Low | Manutenção; divergência visual entre usos | 0.5d | **P4** |
| **UX-10** | Ícones inconsistentes: onboarding usa SVG inline; resto usa lucide-react | 🟢 Low | Inconsistência visual e de manutenção | 0.5d | **P4** |
| **UX-6** | `themeColor` dourado (#c9a55a) destoa da primária roxa real | 🟢 Low | Barra de status do navegador fora da identidade | 0.25d | **P4** |
| **UX-12** | SVGs órfãos do template Next.js em `public/` (vercel/next/window/globe/file) | 🟢 Low | Lixo de bundle/repo | 0.1d | **P4** |
| **UX-13** | Baixa otimização desktop-wide (apenas 4× `lg:`, fora o grid da home) | 🟢 Low | Telas grandes subaproveitadas | 1d | **P4** |
| **UX-14** | `mind-card` usa `role="article"` em elemento clicável sem link/role de botão claro | 🟢 Low | Semântica/teclado ambígua para leitor de tela | 0.5d | **P4** |

**Subtotal frontend/UX:** 14 débitos — 0 🔴 · 3 🟠 · 5 🟡 · 6 🟢.

---

## 4. Matriz de Priorização Preliminar (consolidada)

Todos os 42 débitos, ordenados por severidade → impacto. **Score prelim** = peso(severidade) ponderado por impacto/fragilidade-de-prod, ajustado por inversão de esforço (quick-wins críticos sobem). Escala 0–100.

### 🔴 Críticos (resolver primeiro)

| ID | Débito (curto) | Área | Severidade | Esforço | Score prelim |
|----|----------------|------|-----------|---------|--------------|
| DB-4 | Script escreve coluna `updated_at` inexistente | DB | 🔴 Critical | XS | **98** |
| DB-5 | `ON CONFLICT` sem UNIQUE em `file_uri_cache` | DB | 🔴 Critical | S | **96** |
| DB-2 | `user_id` sem FK em 5 tabelas | DB | 🔴 Critical | M | **90** |

### 🟠 Altos

| ID | Débito (curto) | Área | Severidade | Esforço | Score prelim |
|----|----------------|------|-----------|---------|--------------|
| DB-3 | `local_path` NFD → cache miss | DB | 🟠 High | S–M | **85** |
| SYS-1 | File URI 48h dependente de cron externo | Sistema | 🟠 High | M | **84** |
| SYS-10 | Migrations manuais via SSH, sem automação no deploy | Sistema | 🟠 High | M | **82** |
| DB-7 | `share_token` sem índice/UNIQUE (full scan + colisão) | DB | 🟠 High | XS | **80** |
| DB-13 | `rate_limits` sem UNIQUE de janela (race) | DB | 🟠 High | S | **78** |
| DB-6 | Índices ausentes em FK/filtros quentes | DB | 🟠 High | S | **77** |
| DB-1 | Sem authz no DB pós-Supabase (app-only gatekeeper) | DB | 🟠 High | M (análise) | **74** |
| SYS-2 | NextAuth pinado em beta no caminho crítico | Sistema | 🟠 High | M | **72** |
| SYS-9 | Quase-zero testes de componente (56 componentes) | Sistema | 🟠 High | L | **70** |
| UX-3 | Contraste WCAG AA não validado (cores cruas + 7 themes) | UX | 🟠 High | 1–2d | **68** |
| UX-1 | Soundscape placeholder — recurso não-funcional exposto | UX | 🟠 High | 1d | **66** |
| UX-2 | Tokens de design contornados em 45 arquivos | UX | 🟠 High | 3–4d | **62** |

### 🟡 Médios

| ID | Débito (curto) | Área | Severidade | Esforço | Score prelim |
|----|----------------|------|-----------|---------|--------------|
| SYS-11 | Sem smoke test pós-deploy (healthcheck só `GET /`) | Sistema | 🟡 Medium | M | **58** |
| SYS-3 | CI ainda injeta secrets Supabase mortos | Sistema | 🟡 Medium | S | **55** |
| SYS-4 | Vercel Analytics/SpeedInsights falham em prod | Sistema | 🟡 Medium | S | **54** |
| UX-8 | Vercel Analytics falha (espelho UX de SYS-4) | UX | 🟡 Medium | 0.25d | **53** |
| UX-7 | `metadataBase`/JSON-LD apontam para vercel.app | UX | 🟡 Medium | 0.25d | **52** |
| SYS-8 | `chat/route.ts` string-matching em vez de taxonomia | Sistema | 🟡 Medium | S | **50** |
| SYS-14 | `signup` importa `@/db` direto (fura camada service) | Sistema | 🟡 Medium | S | **49** |
| SYS-7 | Dois SDKs Gemini coexistem | Sistema | 🟡 Medium | M | **48** |
| SYS-5 | Validação de env parcial (só `GEMINI_*`) | Sistema | 🟡 Medium | M | **47** |
| DB-9 | Enums só na ORM, sem CHECK no DB | DB | 🟡 Medium | S | **46** |
| DB-8 | Scripts `*.sql` ad-hoc fora das migrations | DB | 🟡 Medium | M | **45** |
| DB-12 | `rate_limits`/`token_usage` crescem ilimitados | DB | 🟡 Medium | M | **44** |
| DB-10 | Sem trigger de `updated_at` | DB | 🟡 Medium | S | **42** |
| UX-5 | i18n hardcoded + strings inline fora do `t()` | UX | 🟡 Medium | 2–3d | **41** |
| UX-11 | `chat-message`/`chat-interface` sobrecarregados (556/515 LOC) | UX | 🟡 Medium | 2d | **40** |
| UX-4 | Claim VoiceOver/Lighthouse não corresponde (QG2/QG3) | UX | 🟡 Medium | 1d | **39** |

### 🟢 Baixos

| ID | Débito (curto) | Área | Severidade | Esforço | Score prelim |
|----|----------------|------|-----------|---------|--------------|
| SYS-12 | Side-effects fire-and-forget sem retry/DLQ | Sistema | 🟢 Low | M | **30** |
| SYS-13 | Strings PT-BR hardcoded (i18n bypass) | Sistema | 🟢 Low | M | **28** |
| SYS-6 | URLs/magic constants hardcoded | Sistema | 🟢 Low | S | **26** |
| DB-14 | `storage_path` morto pós-Supabase | DB | 🟢 Low | S | **24** |
| DB-11 | `total_tokens` denormalizado sem CHECK | DB | 🟢 Low | XS | **22** |
| UX-9 | Gradiente de título triplicado | UX | 🟢 Low | 0.5d | **20** |
| UX-10 | Ícones inline vs lucide-react | UX | 🟢 Low | 0.5d | **18** |
| UX-6 | `themeColor` dourado destoa da primária | UX | 🟢 Low | 0.25d | **16** |
| UX-13 | Baixa otimização desktop-wide | UX | 🟢 Low | 1d | **14** |
| UX-14 | `mind-card` `role="article"` ambíguo | UX | 🟢 Low | 0.5d | **12** |
| UX-12 | SVGs órfãos do template em `public/` | UX | 🟢 Low | 0.1d | **10** |

**Consolidado por severidade:** 🔴 3 Critical · 🟠 14 High · 🟡 14 Medium · 🟢 11 Low.

---

## 5. Cross-Cutting Themes (síntese arquitetural)

Agrupamento de débitos que são **facetas de uma mesma raiz**. Resolver por tema (uma remediação coordenada) é mais barato e mais seguro do que tratar item a item.

### Tema A — Limpeza pós-migração Supabase/Vercel incompleta
**Membros:** SYS-3, SYS-4, DB-14, UX-7, UX-8 (+ correlato estrutural: DB-1, tratado no Tema D).
**Raiz comum:** A remoção do Supabase (`aa0dade`) e a não-adoção da Vercel deixaram referências mortas em três camadas — CI (secrets Supabase), runtime (scripts Vercel Analytics), DB (`storage_path`) e metadados/SEO (URLs `vercel.app`).
**Remediação única coordenada:** Uma única "sweep" de descomissionamento num PR "post-migration cleanup": remover secrets Supabase dos workflows (SYS-3), remover deps + script tags Vercel (SYS-4/UX-8), corrigir `metadataBase`/JSON-LD para o domínio de prod (UX-7) e dropar `storage_path` após confirmar zero reads (DB-14, requer aprovação de drop). Todos S/XS — risco baixo, alto sinal de higiene.

### Tema B — Lacuna de testes & automação de deploy
**Membros:** SYS-9, SYS-10, SYS-11.
**Raiz comum:** O pipeline confia em verificação manual. Não há rede de segurança automatizada nem na **entrada** (testes de componente) nem na **saída** (migração automática + smoke pós-deploy). A lacuna é a mesma: ausência de gates automatizados.
**Remediação única coordenada:** Épico "deploy confiável": (1) runner de migração gated no deploy (SYS-10), (2) smoke `/api/health` + endpoint crítico `/api/chat` pós-deploy (SYS-11), (3) testes de componente para chat/debate/conversation-drawer na CI (SYS-9). SYS-10/SYS-11 são pré-requisito para qualquer mudança de schema segura (liga ao Tema C).

### Tema C — Integridade de dados / camada de persistência
**Membros:** DB-2, DB-4, DB-5, DB-6, DB-7, DB-13 (+ DB-9, DB-10 como reforço de constraints).
**Raiz comum:** O schema foi gerado pela ORM com foco no caminho feliz da aplicação; faltam as garantias que o DB deveria impor — FKs, UNIQUEs, índices e CHECKs. Daí: upserts que não funcionam (DB-4/DB-5), races (DB-13), scans (DB-6/DB-7) e ausência de integridade referencial (DB-2).
**Remediação única coordenada:** Uma migração consolidada de "hardening de schema", aplicada **através do runner automatizado do Tema B** (não via script ad-hoc — ver Tema E). Ordem segura preliminar: corrigir scripts quebrados (DB-4) → UNIQUEs (DB-5, DB-7, DB-13) → índices (DB-6) → FKs após checagem de órfãos (DB-2) → CHECKs (DB-9). **Crítico:** este tema não pode ser aplicado com segurança enquanto SYS-10 (migração automatizada) não existir.

### Tema D — Segurança como contrato app-only (pós-RLS)
**Membros:** DB-1, DB-2, SYS-14.
**Raiz comum:** Com Supabase/RLS removido, a autorização vive 100% na camada de serviço. Isso só é defensável se (a) a app é o **único** gatekeeper e (b) o DB ao menos garante integridade referencial. Hoje nenhuma das duas é blindada: `user_id` sem FK (DB-2) significa que nem o próprio app pode confiar que o `user_id` é real, e `signup` furando a camada service (SYS-14) abre uma segunda porta de escrita fora do contrato.
**Remediação única coordenada:** Formalizar e blindar o contrato "app-is-the-only-gatekeeper": documentar explicitamente (DB-1), adicionar FKs `ON DELETE CASCADE` (DB-2) e canalizar criação de user por um `users` service único (SYS-14) para que toda escrita passe pelo mesmo portão validado.

### Tema E — Pipeline de conhecimento Gemini frágil
**Membros:** SYS-1, SYS-7, DB-3 (+ DB-5 e DB-8 como sintomas materiais do mesmo pipeline).
**Raiz comum:** O subsistema de RAG/knowledge (ingest → cache de File URI → injeção no prompt) é o ponto mais frágil do produto: URIs expiram em ~48h e dependem de cron externo (SYS-1), o cache quebra por encoding NFD (DB-3) e por upsert inválido (DB-5), e a manutenção é feita por SQL hand-edited fora das migrations (DB-8). Dois SDKs Gemini (SYS-7) ampliam a superfície.
**Remediação única coordenada:** Redesenhar o pipeline para **auto-cura**: re-upload sob demanda na expiração (elimina a dependência do cron — SYS-1), normalizar `local_path` para NFC no ingest + backfill (DB-3), UNIQUE em `file_uri_cache` para o upsert funcionar (DB-5), mover o refresh para o script Drizzle parametrizado e versionado (DB-8) e unificar no AI SDK dropando o legacy (SYS-7).

### Tema F — Design system contornado
**Membros:** UX-1, UX-2, UX-3 (+ UX-9, UX-10 como sintomas de inconsistência visual).
**Raiz comum:** Existe um design system de tokens sólido em `globals.css`, mas o código o **contorna** com cores cruas em 45 arquivos. A consequência se ramifica: mind-themes/light-mode inconsistentes (UX-2), contraste WCAG não-validável (UX-3) e gradiente triplicado (UX-9). UX-1 (soundscape) é funcionalmente distinto, mas compartilha a assinatura "feature existe mas não é exercida de forma consistente".
**Remediação única coordenada:** Campanha de "token adoption": migrar as 45 ocorrências de cores cruas para classes semânticas (UX-2), o que **habilita** a validação de contraste automatizada das 7 paletas (UX-3) e elimina o gradiente triplicado (UX-9). UX-1 (produzir/licenciar 6 trilhas reais) anda em paralelo como entrega de conteúdo, não de código.

### Tema G — Drift de configuração & env (cluster adicional identificado)
**Membros:** SYS-5, SYS-6, SYS-13 (+ UX-5 como espelho de i18n no frontend).
**Raiz comum:** Configuração e strings localizáveis não estão centralizadas: env só parcialmente validado (SYS-5), magic constants/URLs hardcoded (SYS-6) e strings PT-BR inline contornando o módulo i18n existente tanto no backend (SYS-13) quanto no frontend (UX-5). Mesma assinatura do Tema F: "a infra existe, o código a contorna".
**Remediação única coordenada:** Centralizar — schema Zod único cobrindo todo env obrigatório com fail-fast no boot (SYS-5), externalizar magic constants para env (SYS-6) e rotear todas as strings pelo `t()`/i18n (SYS-13 + UX-5) antes que a base cresça mais.

---

## 6. Perguntas para os Especialistas

### Para @data-engineer (Fase 5)
1. **DB-5 é a causa-raiz confirmada do Gemini cache miss?** Ou DB-3 (NFD) é o gatilho primário e DB-5 só impede a recuperação via upsert? Precisamos saber qual corrigir primeiro para destravar o cache.
2. **Ordem de migração mais segura para adicionar FKs (DB-2) numa prod DB viva:** há órfãos hoje? O `ON DELETE CASCADE` é seguro dado que a app já filtra por `userId`, ou há risco de cascade-delete não intencional?
3. **DB-4 já causou incidente em prod?** A transação abortada por `updated_at` inexistente travou alguma rodada de refresh de URI, ou os scripts nunca chegaram a rodar esse caminho?
4. **DB-13 (race de rate_limit):** o limite já foi observado sendo furado por concorrência em prod, ou é risco teórico? Isso muda a prioridade.
5. **DB-14:** confirmar que `storage_path` tem **zero reads** no código atual antes de aprovar o drop da coluna.

### Para @ux-design-expert (Fase 6)
1. **UX-1 (soundscape placeholder):** o recurso é *shippable-hidden* (esconder o controle até existir áudio real) ou *must-fix* (produzir as 6 trilhas antes do próximo release)? Define se vira P2 ou desce para P4.
2. **Prioridade UX-2 (adoção de tokens) vs UX-3 (validação de contraste WCAG):** UX-2 habilita UX-3 — confirma que devem ser feitos juntos/nessa ordem, ou há urgência de compliance (claim AA público) que force validar contraste antes mesmo da migração de tokens?
3. **UX-4:** o claim WCAG 2.1 AA no `docs/accessibility.md` deve ser **rebaixado/qualificado** imediatamente enquanto QG2/QG3 estão pendentes, para não expor risco de claim não-comprovado?

---

## 7. Notas de Consolidação

**Contagem total: 42 débitos.**

| Severidade | Sistema | DB | UX | Total |
|------------|---------|----|----|-------|
| 🔴 Critical | 0 | 3 | 0 | **3** |
| 🟠 High | 4 | 4 | 3 | **11** |
| 🟡 Medium | 6 | 4 | 5 | **15** |
| 🟢 Low | 4 | 3 | 6 | **13** |
| **Total** | **14** | **14** | **14** | **42** |

**Verificado vs pendente:**
- ✅ **Verificado:** Seção 1 (sistema, SYS-1..14) — validado por @architect na Fase 1 a partir de código/CI/deploy reais.
- ⏳ **Pendente de sign-off:** Seção 2 (DB) → @data-engineer Fase 5; Seção 3 (UX) → @ux-design-expert Fase 6. Os 3 🔴 Critical são todos de DB — a validação da Fase 5 é o gargalo crítico para fechar este assessment.

**Recomendação preliminar de sequenciamento (sujeita a ajuste pós-Fases 5/6):**

1. **Quick-wins críticos primeiro** (DB-4, DB-7, DB-5) — XS/S, destravam upserts e share, alto sinal. DB-4 é praticamente gratuito.
2. **Habilitador de infra antes do hardening de dados:** SYS-10 (migração automatizada) + SYS-11 (smoke) **antes** de aplicar o Tema C — não se deve adicionar FKs/UNIQUEs numa prod via script manual. Ordem não-negociável do ponto de vista arquitetural.
3. **Tema E (pipeline Gemini auto-cura)** — o débito mais consequente do produto (SYS-1): barato no dia-a-dia, catastrófico e silencioso quando falha. Priorizar re-upload self-healing sobre babá de cron.
4. **Tema C completo** (hardening de schema: DB-2/DB-6/DB-13 + CHECKs) rodando pelo runner do passo 2.
5. **Tema A (cleanup pós-migração)** — um PR único, baixo risco, paralelizável a qualquer momento.
6. **Tema F + G (token adoption + centralização de config/i18n)** — maiores em esforço, sem urgência de prod; agendar após estabilização operacional.
7. **SYS-9 (testes de componente)** — contínuo; começar pelos componentes de maior risco (chat-interface, debate-interface, conversation-drawer) em paralelo às correções acima.

> **Trade-off arquitetural central:** A maioria dos débitos é **operacional/integridade**, não estrutural — a arquitetura `route → service → db` e a taxonomia de erros são fortes e devem ser preservadas. O risco real concentra-se em (a) integridade de dados não-blindada no DB e (b) um pipeline de deploy/knowledge sem rede de segurança automatizada. Resolver Temas B + C + E nessa ordem remove a maior parte do risco de produção com esforço majoritariamente S/M.

---

*DRAFT gerado na Fase 4 (Consolidação) do Brownfield Discovery. Aguarda revisão dos especialistas (Fases 5 e 6) antes de virar `technical-debt-assessment.md` final (Fase 8).*
