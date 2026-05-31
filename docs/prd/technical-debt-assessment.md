# Technical Debt Assessment - FINAL
**Projeto:** Mentes Sintéticas | **Data:** 2026-05-30 | **Gate:** APPROVED (Fase 7 reworks applied)

**Stack:** Next.js 16.1.1 + Drizzle/PostgreSQL 16 + NextAuth v5 + Gemini · **Autor:** Aria (@architect) · **Fase 8** (finalização) do Brownfield Discovery.

> **Origem:** consolidação de `system-architecture.md` (Fase 1, SYS), `DB-AUDIT.md` (Fase 2) re-validado por @data-engineer (Fase 5, `db-specialist-review.md`), `frontend-spec.md` (Fase 3) re-validado por @ux-design-expert (Fase 6, `ux-specialist-review.md`), e o QA-gate de @qa (Fase 7, `qa-review.md`).
> **Mudanças desta versão vs DRAFT (42 débitos):** +SYS-15/SYS-16 (gaps de QA), −DB-13 (rejeitado, fundido em DB-12), +DB-15/16/17/18, +UX-15/16, severidades re-balanceadas (DB-2/4 🔴→🟠, DB-7 🟠→🟡, UX-1 🟠→🟡 flagged). **Total final: 49 débitos.**
> **Substitui:** a versão de 2026-03-06 deste arquivo (predatava este assessment — inputs desalinhados).
> **Escala:** 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low.

---

## Executive Summary

- **Total de débitos:** **49** (DRAFT tinha 42; +7 líquido após reworks da Fase 7).
- **Por severidade:** 🔴 **Critical 1** · 🟠 **High 11** · 🟡 **Medium 22** · 🟢 **Low 15**.
- **Esforço total estimado (normalizado em horas):** **~135–165 horas** de engenharia.
  - **Track DB:** ~26.75h (de @data-engineer, Fase 5).
  - **Track UX:** ~66–96h (os 11–16 dias-dev da Fase 6 a 6 h produtivas/dia; exclui produção de áudio de UX-1 se virar must-fix, que é entrega de conteúdo).
  - **Track Sistema:** ~42–43h (SYS-1/10/11 infra + SYS-15/16 segurança/observabilidade + SYS-9 testes + demais).
- **A foto de risco real:** a arquitetura `route → service → db` e a taxonomia de erros são fortes e devem ser **preservadas**. O risco concentra-se em quatro eixos: (1) integridade de dados não-blindada no DB, (2) pipeline de deploy/knowledge sem rede de segurança automatizada, (3) **dependências com CVEs HIGH não-corrigidas tocando o próprio track de hardening** (descoberta da Fase 7), e (4) observabilidade instrumentada mas com alerting não-validado. O 🔴 único (DB-5) destrava o cache Gemini.

> **Mudança de severidade crítica vs DRAFT:** os 3 🔴 Critical do DRAFT eram todos de DB. A Fase 5 rebaixou DB-2 e DB-4 para High com evidência de código (sem data-loss/runtime ativo; atomicidade BEGIN/COMMIT protege). **Resta apenas DB-5 como Critical** — o `ON CONFLICT` sem UNIQUE que impede a recuperação do cache de File URI.

---

## Inventário Completo de Débitos (validado)

### Tabela 1 — Débitos de Sistema (16)

| ID | Débito | Severidade | Horas | Prioridade |
|----|--------|-----------|-------|-----------|
| **SYS-15** | Dependências com CVEs HIGH não monitoradas: `drizzle-orm` 0.45.1 (SQL-injection, fix 0.45.2) + `next` 16.1.1 (middleware-bypass/CSRF/XSS-CSP-nonce/DoS) + 6 transitivas; sem `npm audit` gate no CI | 🟠 High | 3–4h | **P1** |
| **SYS-1** | Gemini File URI expira (~48h), mantida viva por cron externo na VPS; app depende da freshness do cache. **SPOF sem alerta verificável** (ver SYS-16) | 🟠 High | 6–8h | **P1** |
| **SYS-10** | Migrations aplicadas manualmente via SSH tunnel; sem runner automatizado no deploy | 🟠 High | 8–10h | **P1** |
| **SYS-9** | **30 test files / 5 testes de componente (4 a11y-only) / 56 componentes** — 5/56 ≈ 9% cobertura de componente; lógica de UI (estado do chat, streaming, token-warning, scroll) sem rede de segurança | 🟠 High | 12–16h | **P2** |
| **SYS-2** | NextAuth pinado em `5.0.0-beta.30` (beta) — caminho crítico; quebras beta→beta possíveis, sem LTS. **Distinto de SYS-15** (estabilidade de API ≠ CVE) | 🟠 High | 4–6h | **P2** |
| **SYS-16** | Sentry **totalmente instrumentado** (`instrumentation.ts` + 3 configs + `logger.ts`) mas cobertura de alerting/incident-response **não validada**; cron SYS-1 é SPOF sem alarme verificável de falha | 🟡 Medium | 3–4h | **P2** |
| **SYS-11** | Sem smoke test pós-deploy; healthcheck do cron só testa `GET /`. **e2e existe** (4 specs Playwright + 1 integração de middleware) — o gap real é **e2e do debate + smoke de resposta Gemini real** (não "zero e2e") | 🟡 Medium | 4–6h | **P2** |
| **SYS-7** | Dois SDKs Gemini coexistem (`@ai-sdk/google` streaming + `@google/generative-ai` legacy/memory) | 🟡 Medium | 3–4h | **P3** |
| **SYS-5** | Validação de env parcial — só `GEMINI_*` via Zod; `DATABASE_URL`/`AUTH_SECRET`/limites lidos raw | 🟡 Medium | 2–3h | **P3** |
| **SYS-8** | `chat/route.ts` usa string-matching no catch em vez da taxonomia `AppError`/`classifyError` existente | 🟡 Medium | 1–2h | **P3** |
| **SYS-14** | `api/auth/signup/route.ts` (rota **pública, não-autenticada**) importa `@/db` direto **E não tem validação Zod** (valida `password.length < 6` à mão, sem formato de e-mail/schema). Apenas **3/11 rotas** validam input. Gap de input-validation + boundary leak | 🟡 Medium | 2–3h | **P3** |
| **SYS-3** | CI (`ci.yml`, `e2e.yml`) ainda injeta `NEXT_PUBLIC_SUPABASE_*` após remoção do Supabase | 🟡 Medium | 0.5h | **P3** |
| **SYS-4** | `@vercel/analytics` + `@vercel/speed-insights` embarcados mas app não está na Vercel; falham em prod | 🟡 Medium | 1h | **P3** |
| **SYS-12** | Side-effects fire-and-forget (usage, memory extract, cleanup) — falhas só logadas, sem retry/DLQ | 🟢 Low | 4h | **P4** |
| **SYS-13** | Strings PT-BR hardcoded em rotas/erros apesar de módulo `i18n/` existir | 🟢 Low | 3–4h | **P4** |
| **SYS-6** | URLs de prod + magic constants hardcoded (`NEXTAUTH_URL`, `MAX_FILE_URIS_PER_REQUEST=8`, rate defaults) | 🟢 Low | 1–2h | **P4** |

**Subtotal sistema:** 16 débitos — 0 🔴 · 5 🟠 · 8 🟡 · 3 🟢. **~42–43h.**

### Tabela 2 — Débitos de Database (17)

| ID | Débito | Severidade | Horas | Prioridade |
|----|--------|-----------|-------|-----------|
| **DB-5** | `file_uri_cache` sem UNIQUE em `knowledge_document_id`, mas scripts usam `ON CONFLICT (knowledge_document_id)` → upsert **aborta a transação**. Raiz estrutural do cache-miss não-recuperável. Requer dedupe ANTES do UNIQUE | 🔴 Critical | 1.5h | **P1** |
| **DB-2** | `user_id` em 5 tabelas sem FK p/ `users` (zero integridade referencial). App já filtra por `userId`, mas DB não garante. Pré-requisito do Tema D | 🟠 High | 4h | **P1** |
| **DB-3** | `local_path` em NFD (macOS) → mismatch em JOIN/`=` no **write-side** (read usa UUID, não `local_path`). Gatilho histórico do bug M1; já mitigado por script LIKE | 🟠 High | 3h | **P1** |
| **DB-6** | Índices ausentes em FK/filtros quentes: `messages.conversation_id` (read mais quente), `conversations.user_id`, `conversations.mind_id`, `debates.user_id`, `knowledge_documents.mind_id`, `file_uri_cache.knowledge_document_id` (`mind_memories`/`token_usage`/`rate_limits` JÁ têm via 0002) | 🟠 High | 1.5h | **P2** |
| **DB-1** | Sem RLS/authz no DB pós-Supabase — segurança 100% na app-layer. Gap de contrato (ADR), não bug | 🟠 High (analysis) | 3h | **P2** |
| **DB-4** | `fix-m1-local-path.sql` escreve `updated_at` em `knowledge_documents` (coluna inexistente). **Script morto** já superado pelo de 16/03; `BEGIN/COMMIT` garantiu zero corrupção. Risco = trap futura se reusado como template | 🟡 Medium | 0.25h | **P1** |
| **DB-7** | `conversations.share_token` sem índice → seq-scan em cada page-load de share. **Risco de colisão DESCARTADO** (`randomBytes(32)` = 256 bits). Só performance | 🟡 Medium | 0.5h | **P2** |
| **DB-9** | Enums (`messages.role`, `mind_memories.memory_type`, `debates.status`) só na ORM, sem CHECK/pg enum. DB aceita qualquer texto via raw SQL | 🟡 Medium | 1.5h | **P3** |
| **DB-10** | Sem auto-update de `updated_at` (sem triggers); app-mantido, pulado em writes raw | 🟡 Medium | 1.5h | **P3** |
| **DB-12** | `rate_limits`/`token_usage` crescem ilimitadamente. `cleanupExpiredLimits()` **É chamado** mas é **fire-and-forget acoplado ao tráfego de chat** (não agendado, falha só logada → SYS-12). `token_usage` (billing) deve ser **arquivado**, não deletado. **Absorve DB-13** | 🟡 Medium | 2.5h | **P3** |
| **DB-8** | Scripts `*.sql` ad-hoc mutam prod fora das migrations (DB-4/DB-5 são sintomas). **Bloqueado por SYS-10** | 🟡 Medium | 4h | **P3** |
| **DB-15** | `debate_participants.mind_id` FK `ON DELETE no action` (RESTRICT default) enquanto `debate_id` é CASCADE — inconsistente. Deletar mind com participações fica bloqueado. Decisão consciente necessária | 🟡 Medium | 0.5h | **P3** |
| **DB-11** | `token_usage.total_tokens` denormalizado (= input+output) sem CHECK | 🟢 Low | 0.5h | **P4** |
| **DB-14** | `knowledge_documents` tem `local_path` E `storage_path` (morto pós-Supabase). **Zero reads confirmado** — drop aprovável após DB-16 + aprovação de governança | 🟢 Low | 1h | **P4** |
| **DB-16** | `seed-db.ts:118-129` ainda popula `storage_path` (coluna morta). **Co-requisito de DB-14** (drop falha se seed continuar escrevendo) | 🟢 Low | 0.25h | **P4** |
| **DB-17** | `messages.mind_slug` é `varchar` solto, sem FK p/ `minds.slug` nem índice — slug órfão possível se mind renomeado. `user_id`-sem-FK em miniatura | 🟢 Low | 0.5h | **P4** |
| **DB-18** | Nenhum índice em `created_at` de `messages`/`conversations` p/ ordenação cronológica. Irrelevante em baixo volume; agrupar com DB-6 quando crescer | 🟢 Low | 0.5h | **P4** |

**Subtotal database:** 17 débitos — 1 🔴 · 4 🟠 · 7 🟡 · 4 🟢 (DB-1 é High analysis-only). **~26.75h.** *(DB-13 do DRAFT rejeitado: premissa de race incorreta — INSERT-append+SUM é design intencional; o crescimento ilimitado é DB-12.)*

### Tabela 3 — Débitos de Frontend/UX (16)

| ID | Débito | Severidade | Horas | Prioridade |
|----|--------|-----------|-------|-----------|
| **UX-2** | Tokens de design contornados por cores cruas (`text-gray-*`, `bg-purple-*`, `text-white`) em **45 arquivos** (27× `text-gray-400`, 28 arquivos `text-white`). Light-mode + 7 mind-themes inconsistentes. **Habilitador de UX-3** | 🟠 High | 20–28h | **P2** |
| **UX-3** | Contraste WCAG AA não validado: `text-gray-400/500` + 7 mind-themes sem teste de ratio. `text-gray-500` sobre `card` escuro = candidato real a falha 4.5:1 | 🟠 High | 8–14h | **P2** |
| **UX-1** | Soundscapes são placeholders (6 `.mp3` 75 B + 6 `.webm` 43 B) expostos na UI mas não-funcionais. **🟡 Medium SE feature-flagged** (toggle `enabled` já existe; default `false` resolve em ~1h). 🟠 High se must-fix | 🟡 Medium (flagged) | 1h (flag) / +6–10h áudio | **P4 flagged / P2 must-fix** |
| **UX-4** | Claim VoiceOver/Lighthouse no `docs/accessibility.md` ≠ estado (QG2/QG3 pendentes). **Rebaixar o claim AA é P1 quick-win** (~1h), independente da validação real | 🟡 Medium | 1h + 6–10h (QG2/3) | **P3 (texto: P1)** |
| **UX-5** | i18n hardcoded pt-BR + strings inline fora do `t()`. Espelho de SYS-13 (Tema G) | 🟡 Medium | 16–24h | **P3** |
| **UX-11** | `chat-message.tsx` (556 LOC) e `chat-interface.tsx` (515 LOC) sobrecarregados. Pré-requisito natural de SYS-9 (testabilidade) | 🟡 Medium | 12–16h | **P3** |
| **UX-7** | `metadataBase`/JSON-LD apontam para `vercel.app`, não domínio de prod (2× hardcoded em `layout.tsx:35,106`) | 🟡 Medium | 1–2h | **P3 quick-win** |
| **UX-8** | Vercel Analytics + SpeedInsights carregam e falham fora da Vercel. Espelho de SYS-4 | 🟡 Medium | 1–2h | **P3 quick-win** |
| **UX-15** | `docs/accessibility.md` **se autocontradiz**: lista "sem skip-link" como limitação (linha 199) mas o skip-link **existe e funciona**. Mistura claims superestimados (VoiceOver) e subestimados (skip-link). Mesma raiz de UX-4 | 🟡 Medium | 1–2h | **P3 quick-win (c/ UX-4)** |
| **UX-9** | Gradiente do título triplicado (CSS `.text-gradient` + inline + Tailwind). Resolvido "de graça" dentro de UX-2 | 🟢 Low | 3–4h | **P4** |
| **UX-10** | Ícones inconsistentes: onboarding usa SVG inline; resto usa lucide-react | 🟢 Low | 2–4h | **P4** |
| **UX-6** | `themeColor` dourado (#c9a55a) destoa da primária roxa real | 🟢 Low | 0.5h | **P4** |
| **UX-14** | `mind-card` usa `role="article"` em elemento clicável sem role de botão/link claro (clicabilidade vem do `<Link>` pai — role interno redundante) | 🟢 Low | 3–4h | **P4** |
| **UX-16** | `SoundscapeEngine.isAvailable()` detecta só suporte a Web Audio API, **não** se o asset é real — placeholders de 75 B passam o guard, `play()` "tem sucesso" e nada toca, sem fallback de UI. Reforça por que UX-1 deve ser flag-off | 🟢 Low | 2–3h | **P4** |
| **UX-13** | Baixa otimização desktop-wide (apenas 4× `lg:`). Melhoria, não débito puro — requer decisão de design wide | 🟢 Low | 6–8h | **P4** |
| **UX-12** | SVGs órfãos do template Next.js em `public/` (vercel/next/window/globe/file) | 🟢 Low | 0.5h | **P4 quick-win** |

**Subtotal frontend/UX:** 16 débitos — 0 🔴 · 2 🟠 · 7 🟡 · 7 🟢. **~66–96h** (11–16 dias-dev a 6h/dia; exclui produção de áudio de UX-1 se must-fix).

---

## Matriz de Priorização Final

Tabela única ranqueada de todos os 49 débitos: severidade → impacto-em-prod → inversão de esforço (quick-wins críticos sobem). Tema entre {A..G}.

| Rank | ID | Débito (curto) | Área | Sev | Horas | Tema |
|------|----|----------------|------|-----|-------|------|
| 1 | DB-5 | `ON CONFLICT` sem UNIQUE → upsert aborta | DB | 🔴 | 1.5h | C/E |
| 2 | DB-4 | Script escreve `updated_at` inexistente (morto) | DB | 🟡 | 0.25h | C |
| 3 | SYS-15 | drizzle CVE SQL-inj + Next CVE multi; sem audit gate | Sys | 🟠 | 3–4h | — (security) |
| 4 | DB-3 | `local_path` NFD → write-side mismatch | DB | 🟠 | 3h | E |
| 5 | SYS-1 | File URI 48h dependente de cron externo (SPOF) | Sys | 🟠 | 6–8h | E |
| 6 | SYS-10 | Migrations manuais via SSH, sem runner | Sys | 🟠 | 8–10h | B |
| 7 | DB-2 | `user_id` sem FK em 5 tabelas | DB | 🟠 | 4h | C/D |
| 8 | DB-6 | Índices ausentes em FK/filtros quentes | DB | 🟠 | 1.5h | C |
| 9 | DB-1 | Sem authz no DB pós-Supabase (ADR) | DB | 🟠 | 3h | D |
| 10 | SYS-2 | NextAuth pinado em beta no caminho crítico | Sys | 🟠 | 4–6h | — (security) |
| 11 | SYS-9 | 5/56 componentes testados (4 a11y-only) | Sys | 🟠 | 12–16h | B |
| 12 | UX-3 | Contraste WCAG AA não validado (cores + 7 themes) | UX | 🟠 | 8–14h | F |
| 13 | UX-2 | Tokens contornados em 45 arquivos | UX | 🟠 | 20–28h | F |
| 14 | SYS-16 | Sentry wired mas alerting não-validado; cron sem alarme | Sys | 🟡 | 3–4h | B |
| 15 | DB-7 | `share_token` sem índice (seq-scan) | DB | 🟡 | 0.5h | C |
| 16 | SYS-11 | Sem smoke pós-deploy; falta e2e debate + Gemini real | Sys | 🟡 | 4–6h | B |
| 17 | UX-4 | Claim VoiceOver/Lighthouse ≠ estado (rebaixar já) | UX | 🟡 | 1h+ | F |
| 18 | UX-15 | `accessibility.md` autocontradiz (skip-link) | UX | 🟡 | 1–2h | F |
| 19 | DB-15 | `debate_participants.mind_id` RESTRICT vs CASCADE | DB | 🟡 | 0.5h | C |
| 20 | SYS-14 | signup sem Zod (rota pública) + `@/db` direto; 3/11 validam | Sys | 🟡 | 2–3h | D |
| 21 | SYS-3 | CI injeta secrets Supabase mortos | Sys | 🟡 | 0.5h | A |
| 22 | SYS-4 | Vercel Analytics/SpeedInsights falham em prod | Sys | 🟡 | 1h | A |
| 23 | UX-8 | Vercel Analytics falha (espelho UX de SYS-4) | UX | 🟡 | 1–2h | A |
| 24 | UX-7 | `metadataBase`/JSON-LD → vercel.app | UX | 🟡 | 1–2h | A |
| 25 | SYS-8 | `chat/route.ts` string-matching vs taxonomia | Sys | 🟡 | 1–2h | — |
| 26 | SYS-7 | Dois SDKs Gemini coexistem | Sys | 🟡 | 3–4h | E |
| 27 | SYS-5 | Validação de env parcial (só `GEMINI_*`) | Sys | 🟡 | 2–3h | G |
| 28 | DB-9 | Enums só na ORM, sem CHECK | DB | 🟡 | 1.5h | C |
| 29 | DB-8 | Scripts `*.sql` ad-hoc fora das migrations | DB | 🟡 | 4h | E |
| 30 | DB-12 | `rate_limits`/`token_usage` crescem ilimitados (absorve DB-13) | DB | 🟡 | 2.5h | C |
| 31 | DB-10 | Sem trigger de `updated_at` | DB | 🟡 | 1.5h | C |
| 32 | UX-5 | i18n hardcoded + strings inline fora do `t()` | UX | 🟡 | 16–24h | G |
| 33 | UX-11 | `chat-message`/`chat-interface` sobrecarregados | UX | 🟡 | 12–16h | F/B |
| 34 | UX-1 | Soundscape placeholder (flag-off shippable) | UX | 🟡 | 1h+ | F |
| 35 | SYS-12 | Side-effects fire-and-forget sem retry/DLQ | Sys | 🟢 | 4h | — |
| 36 | SYS-13 | Strings PT-BR hardcoded (i18n bypass) | Sys | 🟢 | 3–4h | G |
| 37 | SYS-6 | URLs/magic constants hardcoded | Sys | 🟢 | 1–2h | G |
| 38 | DB-14 | `storage_path` morto pós-Supabase (drop) | DB | 🟢 | 1h | A |
| 39 | DB-16 | seed escreve `storage_path` (co-req DB-14) | DB | 🟢 | 0.25h | A |
| 40 | DB-11 | `total_tokens` denormalizado sem CHECK | DB | 🟢 | 0.5h | C |
| 41 | DB-17 | `messages.mind_slug` sem FK/índice | DB | 🟢 | 0.5h | C |
| 42 | DB-18 | Sem índice em `created_at` (ordering) | DB | 🟢 | 0.5h | C |
| 43 | UX-9 | Gradiente de título triplicado | UX | 🟢 | 3–4h | F |
| 44 | UX-10 | Ícones inline vs lucide-react | UX | 🟢 | 2–4h | F |
| 45 | UX-16 | Engine de áudio sem guard de asset falso/decode | UX | 🟢 | 2–3h | F |
| 46 | UX-6 | `themeColor` dourado destoa da primária | UX | 🟢 | 0.5h | A |
| 47 | UX-14 | `mind-card` `role="article"` ambíguo | UX | 🟢 | 3–4h | F |
| 48 | UX-13 | Baixa otimização desktop-wide | UX | 🟢 | 6–8h | — |
| 49 | UX-12 | SVGs órfãos do template em `public/` | UX | 🟢 | 0.5h | A |

**Consolidado por severidade:** 🔴 **1** · 🟠 **11** · 🟡 **22** · 🟢 **15** = **49**.

| Severidade | Sistema | DB | UX | Total |
|------------|---------|-----|-----|-------|
| 🔴 Critical | 0 | 1 | 0 | **1** |
| 🟠 High | 5 | 4 | 2 | **11** |
| 🟡 Medium | 8 | 7 | 7 | **22** |
| 🟢 Low | 3 | 4 | 7 | **15** |
| **Total** | **16** | **17** | **16** | **49** |

---

## Cross-Cutting Themes (final, 7 temas)

Agrupamento de débitos que são **facetas de uma mesma raiz**. Resolver por tema (uma remediação coordenada) é mais barato e seguro do que item a item. As adições da Fase 7 foram dobradas nos temas existentes; segurança de dependências (SYS-15) é o único item que permanece **transversal a vários temas** (não é um tema próprio — é um pré-requisito de segurança do Tema C).

### Tema A — Limpeza pós-migração Supabase/Vercel incompleta
**Membros:** SYS-3, SYS-4, DB-14, DB-16, UX-6, UX-7, UX-8, UX-12.
**Raiz:** A remoção do Supabase (`aa0dade`) e a não-adoção da Vercel deixaram referências mortas em CI (secrets Supabase), runtime (Vercel Analytics), DB (`storage_path` + seed que ainda o escreve), metadados (URLs `vercel.app`) e assets (SVGs órfãos, themeColor antigo).
**Remediação única:** um PR "post-migration cleanup" / "PR de higiene": remover secrets Supabase (SYS-3), deps+tags Vercel (SYS-4/UX-8), corrigir `metadataBase`/JSON-LD (UX-7), `themeColor` roxo (UX-6), deletar SVGs órfãos (UX-12), remover escrita de `storage_path` no seed (DB-16) e dropar a coluna (DB-14, requer aprovação de drop). Todos S/XS — risco baixo, alto sinal de higiene.

### Tema B — Lacuna de testes, automação de deploy & observabilidade
**Membros:** SYS-9, SYS-10, SYS-11, SYS-16, UX-11 (testabilidade).
**Raiz:** O pipeline confia em verificação manual. Não há rede de segurança automatizada na **entrada** (testes de componente — 5/56), na **saída** (migração automática + smoke pós-deploy, hoje só `GET /`), nem na **operação** (Sentry wired mas alerting não-validado; cron SPOF sem alarme). Mesma assinatura: ausência de gates/alertas automatizados.
**Remediação única:** épico "deploy & operação confiáveis": (1) runner de migração gated no deploy com suporte a `CONCURRENTLY`/`NOT VALID`/`pg_dump`/rollback (SYS-10), (2) smoke `/api/health` + `/api/chat` com **resposta Gemini real** + e2e de debate (SYS-11), (3) testes de **lógica** (não só a11y) para `chat-interface`/`debate-interface`/`conversation-drawer` (SYS-9, habilitado por refactor UX-11), (4) alerting Sentry no cron + revisão de cobertura de breadcrumbs/on-call (SYS-16). SYS-10/SYS-11 são pré-requisito do Tema C.

### Tema C — Integridade de dados / camada de persistência
**Membros:** DB-2, DB-4, DB-5, DB-6, DB-7, DB-9, DB-10, DB-11, DB-12, DB-15, DB-17, DB-18.
**Raiz:** O schema foi gerado pela ORM com foco no caminho feliz; faltam as garantias que o DB deveria impor — FKs, UNIQUEs, índices, CHECKs e triggers. Daí: upsert que aborta (DB-5), scans (DB-6/DB-7/DB-18), ausência de integridade referencial (DB-2/DB-17), enums não-impostos (DB-9), drift de `updated_at` (DB-10) e crescimento ilimitado (DB-12).
**Remediação única:** uma migração consolidada de "hardening de schema", aplicada **via o runner automatizado do Tema B** (nunca por script ad-hoc — ver Tema E). **Pré-requisito de segurança: SYS-15 (bump drizzle-orm ^0.45.2) ANTES de escrever estas migrations.** Ordem segura: dedupe/audit de órfãos → UNIQUE `file_uri_cache` (DB-5) → índices `CONCURRENTLY` (DB-6) → FKs `NOT VALID`+`VALIDATE` com política por tabela (DB-2/DB-15) → CHECKs (DB-9/DB-11) → triggers (DB-10) → retenção (DB-12). **Não aplicável com segurança enquanto SYS-10 não existir.**

### Tema D — Segurança como contrato app-only (pós-RLS)
**Membros:** DB-1, DB-2, SYS-14.
**Raiz:** Com Supabase/RLS removido, a autorização vive 100% na camada de serviço. Isso só é defensável se (a) a app é o único gatekeeper e (b) o DB garante integridade referencial — hoje nenhuma é blindada. `user_id` sem FK (DB-2) significa que nem o app pode confiar que o `user_id` é real; o signup (SYS-14) fura a camada service **e** valida input à mão numa rota pública não-autenticada.
**Remediação única:** formalizar o contrato "app-is-the-only-gatekeeper": ADR explícito (DB-1), FKs com política por tabela (DB-2, ver Riscos), e canalizar signup por um `users` service único **com Zod schema** (SYS-14) — toda escrita pelo mesmo portão validado, integridade garantida nas duas pontas.

### Tema E — Pipeline de conhecimento Gemini frágil
**Membros:** SYS-1, SYS-7, DB-3, DB-5, DB-8.
**Raiz:** O subsistema RAG/knowledge (ingest → cache de File URI → injeção no prompt) é o ponto mais frágil do produto: URIs expiram em ~48h e dependem de cron externo SPOF sem alarme (SYS-1 + SYS-16), o cache quebra por encoding NFD no write-side (DB-3) e por upsert inválido (DB-5), e a manutenção é por SQL hand-edited fora das migrations (DB-8). Dois SDKs Gemini (SYS-7) ampliam a superfície.
**Remediação única:** redesenhar o pipeline para **auto-cura**: re-upload sob demanda na expiração (elimina a dependência do cron — SYS-1), normalizar `local_path` para NFC no ingest + backfill (DB-3), UNIQUE em `file_uri_cache` para o upsert funcionar (DB-5), mover o refresh para script Drizzle versionado (DB-8) e unificar no AI SDK dropando o legacy (SYS-7). Alerting Sentry no cron (SYS-16) cobre o período de transição.

### Tema F — Design system contornado
**Membros:** UX-1, UX-2, UX-3, UX-4, UX-9, UX-10, UX-14, UX-15, UX-16.
**Raiz:** Existe um design system de tokens sólido em `globals.css`, mas o código o **contorna** com cores cruas em 45 arquivos. Ramifica em: mind-themes/light-mode inconsistentes (UX-2), contraste WCAG não-validável (UX-3), gradiente triplicado (UX-9), ícones inconsistentes (UX-10). Doc de a11y desalinhado nos dois sentidos (UX-4 superestima, UX-15 subestima) e features expostas mas não-exercidas (UX-1 soundscape + UX-16 engine sem guard) compartilham a assinatura "a infra existe, o código a contorna/não a exercita".
**Remediação única:** campanha de "token adoption" com guard de CI anti-regressão: mapa cor-crua→token semântico, migração das 45 ocorrências (UX-2) — o que **habilita** a validação automatizada de contraste das 7 paletas (UX-3) e mata UX-9/UX-10/UX-14. Reconciliar o doc de a11y (UX-4+UX-15) é quick-win paralelo. UX-1 flag-off + guard de byteLength no engine (UX-16) tornam o soundscape honesto até existir áudio real.

### Tema G — Drift de configuração & env
**Membros:** SYS-5, SYS-6, SYS-13, UX-5.
**Raiz:** Configuração e strings localizáveis não estão centralizadas: env só parcialmente validado (SYS-5), magic constants/URLs hardcoded (SYS-6) e strings PT-BR inline contornando o módulo i18n existente no backend (SYS-13) e frontend (UX-5). Mesma assinatura do Tema F: "a infra existe, o código a contorna".
**Remediação única:** centralizar — schema Zod único cobrindo todo env obrigatório com fail-fast no boot (SYS-5), externalizar magic constants (SYS-6) e rotear todas as strings pelo `t()`/i18n (SYS-13 + UX-5) antes que a base cresça.

> **Itens fora de tema (standalone):** SYS-8 (taxonomia de erro no chat), SYS-12 (retry/DLQ de side-effects), UX-13 (otimização desktop-wide — melhoria, não débito), SYS-15/SYS-2 (segurança — pré-requisitos transversais, não tema). Resolvidos oportunisticamente dentro das waves adjacentes.

---

## Plano de Resolução (waves ordenadas, com dependências não-negociáveis)

O sequenciamento respeita **três ordens não-negociáveis** (todas confirmadas pelo QA-gate Fase 7):
1. **SYS-15 (bump drizzle-orm) ANTES de escrever as migrations do Tema C** — não re-gerar SQL sob versão com CVE de SQL-injection.
2. **SYS-10 + SYS-11 (runner + smoke) ANTES de qualquer DDL do Tema C** — não aplicar FK/UNIQUE/índice em prod viva via psql manual.
3. **DB-5 ANTES de DB-3** para recuperação de cache — DB-5 destrava o upsert; o read-side usa UUID, não `local_path`.

### Wave 0 — Quick-wins de código/script (NÃO-DDL, sem dependências) · ~6–8h
Edições de código/script/doc que não tocam o schema de prod. Podem ir imediatamente, em paralelo.
- **DB-4** (remover `, updated_at = NOW()` do script morto / arquivá-lo)
- **DB-3 (parte código)** — NFC no ingest + backfill via script LIKE já existente; **audit read-only de órfãos (DB-2) e duplicatas (DB-5)** como gate de diagnóstico
- **UX-1 flag-off** (default `enabled=false` + gate de env `NEXT_PUBLIC_SOUNDSCAPES_ENABLED`)
- **UX-4 + UX-15** (rebaixar claim AA → "AA-targeted, validation pending" + corrigir contradição do skip-link)
- **SYS-3/SYS-4** (remover config morta Supabase/Vercel — parte não-DDL)
**Racional:** remove a "vergonha visível" (promessa quebrada, claim falso) + destrava diagnóstico de dados, zero risco de prod.

### Wave 1 — Segurança de dependências (SECURITY, antes de qualquer migration) · ~7–10h
- **SYS-15** — bump `drizzle-orm ^0.45.2` (CVE SQL-injection) + `next` patched (middleware/CSP/DoS) + transitivas; adicionar `npm audit` gate no CI (build falha em HIGH não-waived).
- **SYS-2** — reavaliar NextAuth beta como passada coordenada de "atualização do caminho de auth" junto com o bump do Next; testar o middleware (runtime nodejs) com o teste de integração existente.
**Racional não-negociável:** o ORM e o framework do caminho crítico têm CVEs HIGH. Subir o Drizzle **antes** de escrever as migrations de hardening evita re-gerar SQL sob versão vulnerável.

### Wave 2 — Habilitador de infra (runner + smoke), antes do hardening · ~12–16h
- **SYS-10** — runner de migração gated no deploy, com suporte a statements fora de transação (`CONCURRENTLY`), `NOT VALID`/`VALIDATE`, `pg_dump` pré-migração e rollback step-by-step (critério de aceite, não detalhe).
- **SYS-11** — smoke pós-deploy: `GET /api/health` (DB+auth) **E** `/api/chat` com resposta Gemini real; e2e de debate.
- **SYS-16** — alerting Sentry no cron de URI (cron failure ≠ silencioso) + revisão de cobertura.
**Racional não-negociável:** nenhum DDL do Tema C antes desta wave. Sem runner versionado, todo hardening reintroduz o anti-padrão que gerou DB-4/DB-5/DB-8.

### Wave 3 — Tema C: hardening de schema (via runner) · ~13–15h
Ordem interna segura (dedupe/audit já feito na Wave 0):
1. **DB-5** — dedupe → `CREATE UNIQUE INDEX CONCURRENTLY file_uri_cache(knowledge_document_id)` → **destrava o cache Gemini** (🔴 resolvido).
2. **DB-6 / DB-18** — índices em FK/filtros quentes via `CONCURRENTLY`.
3. **DB-2 / DB-15 / DB-17** — FKs `NOT VALID`+`VALIDATE` com **política por tabela** (CASCADE em conversations/mind_memories/debates/rate_limits; **SET NULL/RESTRICT em `token_usage`** para preservar billing; decisão explícita de RESTRICT em `debate_participants.mind_id`).
4. **DB-9 / DB-11** — CHECKs. **DB-10** — triggers `BEFORE UPDATE`. **DB-7** — índice em `share_token`. **DB-12** — job de retenção (archive p/ `token_usage`).
**Racional:** Tema C completo, rodando pelo runner da Wave 2, com `pg_dump` antes de qualquer passo destrutivo.

### Wave 4 — Tema E (pipeline Gemini auto-cura) + Tema D (contrato app-only) · ~12–15h
- **Tema E:** SYS-1 (re-upload self-healing — elimina dependência do cron), DB-8 (refresh em script Drizzle versionado), SYS-7 (unificar no AI SDK).
- **Tema D:** DB-1 (ADR app-only gatekeeper), SYS-14 (signup via `users` service + Zod schema). DB-2 já blindou a integridade na Wave 3.
**Racional:** com FKs e cache destravados, fechar o pipeline de knowledge e o contrato de segurança nas duas pontas (escrita validada + integridade referencial).

### Wave 5 — Tema A (cleanup) + Tema F (design system) + Tema G (config/i18n) + SYS-9 (testes) · resto
- **Tema A** (PR único de higiene, baixo risco): drop `storage_path` (DB-14/DB-16, aprovação de drop), demais cleanup Supabase/Vercel.
- **Tema F** (épico de design): UX-2 (token adoption + guard de CI) → UX-3 (contraste automatizado das 7 paletas) → UX-9/10/14/16; UX-11 (refactor que habilita SYS-9).
- **Tema B testes** (SYS-9): testes de lógica de componente, contínuo, em paralelo.
- **Tema G** (SYS-5/6/13 + UX-5): centralização de env/config/i18n — maior esforço, sem urgência de prod.
**Racional:** estabilização operacional primeiro (Waves 1–4); maiores esforços sem urgência de prod por último, paralelizáveis.

---

## Riscos e Mitigações

| Risco | IDs Afetados | Mitigação |
|-------|--------------|-----------|
| **Aplicar FK/UNIQUE/índice em prod viva via psql manual** — anti-padrão que gerou DB-4/5/8 reaparece se o hardening rodar antes do runner | DB-2/5/6/9 (Tema C) × **SYS-10** | **Bloqueio de ordem não-negociável:** SYS-10 + SYS-11 ANTES de qualquer DDL do Tema C. `NOT VALID`/`VALIDATE` (FK) e `CREATE INDEX CONCURRENTLY` via runner versionado. `pg_dump` antes de dedupe/clean. |
| **Upgrade drizzle-orm (CVE SQL-inj) coincide com migrações de hardening** — subir o ORM no meio do Tema C muda geração de SQL | **SYS-15** × DB-5/2/6 | Subir `drizzle-orm ^0.45.2` **antes** de escrever as migrations (Wave 1, não no meio). Re-gerar/revisar migrations sob a versão patched. Patch minor, risco baixo, deve preceder o track. |
| **Pipeline Gemini = single point of knowledge loss silencioso** — URI expira → cron único renova → upsert não recupera → sem alerta | SYS-1 + DB-5 + DB-3 + **SYS-16** | Tema E (auto-cura elimina dependência do cron) + DB-5 UNIQUE (destrava upsert) + DB-3 NFC + **alerting Sentry no cron** (SYS-16). Os quatro juntos removem o risco; isolados, cada um deixa furo. |
| **Signup público sem Zod + sem FK em user_id** — rota não-autenticada cria users; `user_id` nunca garantido válido | **SYS-14** × DB-2 × DB-1 | Canalizar signup por `users` service + Zod schema, DEPOIS FKs (DB-2) — contrato app-only (DB-1) blindado nas duas pontas (escrita validada + integridade referencial). |
| **CVE Next.js (middleware/CSP/DoS) × NextAuth beta no mesmo runtime** | **SYS-15** × SYS-2 | Tratar upgrade Next + reavaliação NextAuth como passada coordenada de auth (Wave 1). Testar middleware (runtime nodejs) após ambos — o teste de integração de middleware existente é a rede mínima. |
| **FK CASCADE cego apaga billing** — delete de user cascateia `token_usage` (dado financeiro) | DB-2 × `token_usage` | Política por tabela: CASCADE em dados pessoais (conversations/mind_memories/debates/rate_limits); **SET NULL/RESTRICT + arquivamento em `token_usage`**. AC explícito por tabela. |
| **Rebaixar claim WCAG AA (UX-4) independente, mas validação real (UX-3) depende de UX-2** — claim público não-comprovado enquanto QG2/QG3 pendentes | UX-4, UX-15, UX-3, UX-2 | Rebaixar o claim AGORA (~1h, Wave 0), spot-check tático de contraste, DEPOIS UX-2 (tokens) → UX-3 automatizado. |
| **Constraint sobre dados sujos aborta** — UNIQUE/FK falha se houver duplicatas/órfãos | DB-5, DB-2 | Dedupe/audit de órfãos read-only (Wave 0) como **gate** antes de qualquer constraint. `pg_dump` antes de dedupe. Não prosseguir com órfão/duplicata > 0 sem decisão explícita. |

---

## Critérios de Sucesso (ACs que alimentam stories @pm, Fase 10)

### Cluster Segurança — SYS-15, SYS-14, SYS-2
- **`npm audit` gate no CI:** build falha em vuln HIGH não-waived. AC: `drizzle-orm ≥0.45.2`, Next patched; audit limpo em HIGH.
- **Signup validation:** Zod schema rejeita e-mail malformado, senha curta, payload extra/injection. AC: rota pública de signup tem schema validation com casos de borda.
- **Boundary:** signup passa por `users` service; nenhum import `@/db` direto na rota.
- **Auth path:** middleware (runtime nodejs) testado pós-upgrade Next + NextAuth.

### Cluster DB / Tema C — DB-2, DB-5, DB-6, DB-9
- **Migration-rollback:** cada migration de hardening tem `up`→`down`→schema idêntico ao baseline, verificado em staging com dump de prod.
- **Constraint integration:** após UNIQUE em `file_uri_cache`, `INSERT ... ON CONFLICT (knowledge_document_id)` faz upsert (não aborta); 2 inserts concorrentes do mesmo doc → 1 linha final.
- **FK CASCADE/SET NULL:** delete de user → `conversations/mind_memories/debates` cascateiam; **`token_usage` preserva** (SET NULL/RESTRICT). AC explícito por tabela.
- **Orphan-audit (gate pré-migração):** query read-only de órfãos = 0 antes do `VALIDATE CONSTRAINT`.
- **CHECK:** insert raw com `messages.role='invalid'` é rejeitado pós-DB-9.

### Cluster Pipeline Gemini / Tema E — SYS-1, DB-3, DB-5, SYS-16
- **Self-healing:** URI expirado → app re-faz upload sob demanda → cache repopula sem cron. AC: chat usa knowledge mesmo com cache stale.
- **NFC normalization:** ingest de doc NFD → `local_path` em NFC → JOIN por igualdade casa. Backfill verificado.
- **Alerting:** falha do cron de renovação dispara evento Sentry verificável (mock `captureException`). AC: cron failure ≠ silencioso.

### Cluster Deploy / Tema B — SYS-9, SYS-10, SYS-11
- **Smoke pós-deploy:** `GET /api/health` (200, DB+auth) **E** `/api/chat` com resposta Gemini real. AC: falha de Gemini auth derruba o smoke (hoje passa o healthcheck).
- **Component tests:** cobertura de **lógica** (não só a11y) para `chat-interface` (streaming, token-warning, scroll), `debate-interface`, `conversation-drawer`. AC: ≥ os 3 de maior risco com testes de estado/interação.
- **e2e debate:** spec Playwright para o fluxo de debate (hoje só chat/home/login/protected têm e2e).
- **Migration runner:** suporta `CONCURRENTLY`, `NOT VALID`/`VALIDATE`, `pg_dump` pré-migração, rollback step-by-step.

### Cluster UX / Tema F — UX-2, UX-3, UX-4
- **Contrast CI (pós-UX-2):** script percorre 7 paletas mind-theme × estados, valida 4.5:1 / 3:1. AC: build falha se paleta regredir.
- **Token-regression guard:** ESLint/grep no CI falha em `text-gray-`/`bg-purple-`/`text-white` fora da whitelist. AC: base não re-acumula cores cruas.
- **a11y doc reconciliation:** claim AA rebaixado para "AA-targeted, validation pending"; contradição do skip-link removida. AC verificável por revisão do doc.

---

## Nota de Consolidação Final

**Trade-off arquitetural central:** a maioria dos 49 débitos é **operacional / integridade / higiene**, não estrutural — a arquitetura `route → service → db` e a taxonomia de erros são fortes e devem ser preservadas. O risco real de produção concentra-se em (a) integridade de dados não-blindada no DB, (b) pipeline de deploy/knowledge sem rede de segurança automatizada, (c) **dependências com CVEs HIGH não-corrigidas** (descoberta da Fase 7 — o item mais barato e mais consequente) e (d) observabilidade instrumentada mas sem alerting validado. Resolver Waves 1→2→3→4 nessa ordem remove a maior parte do risco de produção com esforço majoritariamente S/M; os épicos maiores (Tema F design system, Tema G config/i18n) são sem urgência de prod e ficam para a Wave 5.

**Gate Fase 7: APPROVED** — os 6 reworks enumerados pelo QA (SYS-15, SYS-16, correção SYS-9, expansão SYS-14, wording DB-12, nota SYS-11) foram incorporados; as duas dimensões ausentes (supply-chain + observabilidade) agora têm débitos com área atribuída. Cobertura de área completa nos 49 débitos.

---

*Documento FINAL gerado na Fase 8 (Consolidação) do Brownfield Discovery. Substitui `technical-debt-DRAFT.md` como fonte de verdade. Alimenta o épico + stories do @pm (Fase 10) e o relatório executivo do @analyst (Fase 9).*
