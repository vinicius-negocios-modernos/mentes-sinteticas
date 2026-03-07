# Technical Debt Assessment - FINAL

## Mentes Sinteticas

## Data: 2026-03-06

**Phase:** Brownfield Discovery - Phase 8 (Final Consolidation)
**Author:** @architect (Aria)
**Status:** FINAL - Aprovado pelo QA Gate (Phase 7)
**Input Documents:**
- `docs/prd/technical-debt-DRAFT.md` (Phase 4 - @architect)
- `docs/reviews/db-specialist-review.md` (Phase 5 - @data-engineer)
- `docs/reviews/ux-specialist-review.md` (Phase 6 - @ux-design-expert)
- `docs/reviews/qa-review.md` (Phase 7 - @qa)

**Project Stats:** ~393 linhas de TypeScript/TSX em 6 arquivos fonte. Estagio de prototipo single-user.

---

## Executive Summary

- **Total de debitos:** 65
- **Criticos:** 7 | **Altos:** 26 | **Medios:** 22 | **Baixos:** 10
- **Esforco total estimado:** 350-470 horas (remediacao completa)
- **Core (P0+P1):** 180-250 horas
- **Estado atual do sistema:** INOPERANTE -- File URIs do Gemini expiraram em 2026-01-02 (ha mais de 2 meses). Nenhuma conversa funciona.

O projeto Mentes Sinteticas e um prototipo funcional de chat com "mentes sinteticas" (clones digitais de pensadores historicos) construido com Next.js App Router + Google Gemini API. Apesar da visao ambiciosa, o prototipo possui gaps criticos em seguranca (zero autenticacao, zero rate limiting), persistencia (zero banco de dados), e experiencia de usuario (zero streaming, zero historico). O sistema esta atualmente 100% inoperante devido a expiracao dos File URIs do Gemini.

A analise envolveu 4 especialistas (@architect, @data-engineer, @ux-design-expert, @qa) e identificou 65 debitos unicos com grafo de dependencias validado, stack tecnologica consensual (Supabase + Drizzle + shadcn/ui + Vercel + Vercel AI SDK), e plano de resolucao em 6 fases dependency-aware.

---

## FASE 0: Recuperacao Imediata

**Estado:** O campo `last_updated` no `minds_manifest.json` e `2025-12-31T03:58:38.971Z`. Os File URIs do Gemini expiram 48 horas apos upload. Portanto, todos os 21 arquivos expiraram em **2026-01-02**. O sistema esta inoperante ha mais de 2 meses -- nenhuma conversa com nenhuma mente funciona.

**Acao imediata (antes de qualquer planejamento de sprint):**

| # | Acao | Horas | Dependencias | Responsavel |
|---|------|-------|-------------|-------------|
| 1 | Validar idempotencia do script `ingest_mind.ts` (verificar se re-executar cria duplicatas no Gemini File API) | 0.5 | Nenhuma | @dev |
| 2 | Re-executar ingestion via CLI: `npx tsx scripts/ingest_mind.ts "Antonio Napole"` | 1-2 | Validacao de idempotencia | @dev |
| 3 | Smoke test manual: abrir chat, enviar mensagem, confirmar resposta | 0.5 | Re-ingestion concluida | @qa |
| 4 | Quick fixes: `lang="pt-BR"` no layout.tsx, deletar `page.module.css`, remover console.logs | 0.5 | Nenhuma | @dev |

**Esforco total Fase 0: 2.5-3.5 horas**

**ALERTA:** O script `ingest_mind.ts` pode nao ser idempotente -- ninguem verificou se re-executar cria duplicatas. Validar antes de rodar.

---

## Inventario Completo de Debitos

### Sistema (validado por @architect + @qa)

#### Seguranca

| ID | Debito | Severidade | Horas | Prioridade | Dependencias |
|----|--------|-----------|-------|------------|-------------|
| SYS-001 | **No authentication system.** App publicamente acessivel. Qualquer pessoa consome creditos da Gemini API sem restricao. | CRITICO | 12-16 | P0 | SYS-027 (middleware), SYS-028 (security headers) |
| SYS-002 | **No rate limiting.** Sem throttling per-IP ou per-session. Chamadas ilimitadas a API. | CRITICO | 6-8 | P0 | SYS-027 (middleware), DATABASE SETUP (limites persistentes) |
| SYS-003 | **No input validation on messages.** Sem limites de tamanho, content filtering, ou protecao contra prompt injection. | CRITICO | 4-6 | P0 | Nenhuma |
| SYS-004 | **No input sanitization no mindId URL parameter.** URL-decoded e passado diretamente a lookups de filesystem. | ALTO | 2-3 | P2 | Nenhuma |
| SYS-005 | **API key exposure risk.** Gemini API key em `.env.local` plaintext. `list_models.ts` expoe key em query params. | ALTO | 2-3 | P0 | Nenhuma |
| SYS-006 | **`.env` file tracked no repositorio.** Revela nomes de variaveis secretas esperadas. | MEDIO | 1 | P3 | Nenhuma |
| SYS-NEW-001 | **Prompt security hardening.** Sem protecao contra persona escape ("ignore previous instructions"), indirect injection via knowledge base, ou system prompt leakage. Gap identificado por @qa. | ALTO | 4-6 | P1 | SYS-003 (input validation) |

#### Reliability

| ID | Debito | Severidade | Horas | Prioridade | Dependencias |
|----|--------|-----------|-------|------------|-------------|
| SYS-007 | **Module-level crash on missing env var.** `gemini.ts` throws at import se `GEMINI_API_KEY` ausente, crashando todo o servidor. | ALTO | 2 | P1 | Nenhuma |
| SYS-008 | **No error boundaries ou error pages.** Sem React Error Boundaries, sem `error.tsx`, sem `not-found.tsx`. | ALTO | 4-6 | P1 | UX-002 (componentes reusaveis) |
| SYS-009 | **No loading states (`loading.tsx`).** Sem Suspense boundaries para async server components. | MEDIO | 2-3 | P2 | UX-002 (componentes) |
| SYS-010 | **Gemini File URIs expiram em 48h sem mecanismo de renovacao.** Manifest armazena URIs stale indefinidamente. **Severidade elevada por @data-engineer:** URIs ja expiraram ha meses -- sistema 100% inoperante. | CRITICO | 6-8 | P0 | Fase 0 (workaround CLI), DATABASE SETUP (solucao permanente) |
| SYS-011 | **No health check endpoint.** Sem `/api/health` ou equivalente. | MEDIO | 1-2 | P2 | Nenhuma |

#### Performance

| ID | Debito | Severidade | Horas | Prioridade | Dependencias |
|----|--------|-----------|-------|------------|-------------|
| SYS-012 | **Context window bloat.** 21 file URIs + historico crescente re-enviados a cada mensagem. Custo de tokens escala linearmente. | ALTO | 8-12 | P1 | SYS-021 (refactor gemini.ts) |
| SYS-013 | **Stateless chat recreation.** Chat session recriado do zero em cada `sendMessage`. Zero reutilizacao de sessao. | ALTO | 6-8 | P1 | DATABASE SETUP (session store) |
| SYS-014 | **Synchronous filesystem reads.** `readFileSync` em funcoes async (`gemini.ts:33,39`). Bloqueia event loop. **Nota @qa:** deve ser P1 se deploy em Vercel (serverless). | MEDIO | 1-2 | P1 | Nenhuma |
| SYS-015 | **No response streaming.** Resposta completa aguardada antes de exibir ao usuario. 5-15s de espera sem feedback. **Combinado com UX-003.** | CRITICO | 12-16 | P0 | SYS-021 (refactor gemini.ts). **NAO depende de SYS-013** (ajuste @qa). |
| SYS-016 | **No manifest caching.** `minds_manifest.json` re-lido do disco em cada request. | MEDIO | 2-3 | P2 | Nenhuma (resolvido automaticamente com DB) |

#### Quality

| ID | Debito | Severidade | Horas | Prioridade | Dependencias |
|----|--------|-----------|-------|------------|-------------|
| SYS-017 | **Zero test coverage.** Sem unit, integration, ou E2E tests. Sem test framework configurado. | ALTO | 12-16 | P2 | UX-002, SYS-021, SYS-018 |
| SYS-018 | **`any` types throughout codebase.** `history: any[]`, `error: any`, manifest data typed as `any`. | MEDIO | 3-4 | P2 | Nenhuma |
| SYS-019 | **Console.log em production code.** Debug logging em `actions.ts` e `ChatInterface.tsx`. | BAIXO | 1 | P3 | Nenhuma |
| SYS-020 | **No code documentation.** Sem JSDoc, sem inline docs para logica complexa. | MEDIO | 3-4 | P3 | Nenhuma |
| SYS-021 | **No separation of concerns em `gemini.ts`.** File reading, manifest parsing, model config, chat creation, e prompt engineering em 114 linhas. | MEDIO | 4-6 | P1 | Nenhuma |
| SYS-022 | **Hardcoded model name e generation config.** `gemini-2.0-flash` e temperatura/topK/topP hardcoded. | MEDIO | 2-3 | P2 | Nenhuma |
| SYS-023 | **Error message diz "Video processing failed."** Copy-paste do exemplo de video do Google. | BAIXO | 0.5 | P3 | Nenhuma |
| SYS-NEW-002 | **Footer diz "Gemini 1.5 Pro" mas sistema usa "gemini-2.0-flash".** Inconsistencia de credibilidade. Gap identificado por @qa. | BAIXO | 0.25 | P0 (quick fix) | Nenhuma |

#### Infrastructure

| ID | Debito | Severidade | Horas | Prioridade | Dependencias |
|----|--------|-----------|-------|------------|-------------|
| SYS-024 | **No CI/CD pipeline.** `.github/` tem apenas agent definitions, sem workflows. | ALTO | 6-8 | P2 | SYS-017 (tests) |
| SYS-025 | **No monitoring ou observability.** Sem structured logging, error tracking, analytics, ou APM. | ALTO | 6-8 | P2 | DATABASE SETUP |
| SYS-026 | **No Docker/containerization.** Sem Dockerfile, sem docker-compose. | MEDIO | 3-4 | P3 | Nenhuma |
| SYS-027 | **No middleware.** Sem `middleware.ts`. Sem auth checks, rate limiting, CORS, ou request logging centralizados. | ALTO | 4-6 | P1 | Nenhuma |
| SYS-028 | **Empty `next.config.ts`.** Sem security headers (CSP, HSTS, X-Frame-Options), sem image optimization. | MEDIO | 2-3 | P2 | Nenhuma |

---

### Dados (validado por @data-engineer)

| ID | Debito | Severidade | Horas | Prioridade | Dependencias |
|----|--------|-----------|-------|------------|-------------|
| DB-001 | **Manifest JSON nao tem `expires_at` por arquivo.** `last_updated` existe no nivel da mente, nao por arquivo. Impossivel saber qual URI expirou sem consultar a API do Gemini. O script `ingest_mind.ts` nao captura `expirationTime` do Gemini. | CRITICO | 2-3 | P0 | Nenhuma |
| DB-002 | **Nenhuma estrategia de backup da knowledge base.** Arquivos locais em `knowledge_base/` sao a unica copia. Re-criacao impossivel se perdidos. | ALTO | 2-3 | P1 | DATABASE SETUP (Supabase Storage) |
| DB-003 | **Manifest JSON e single point of failure.** JSON corrompido derruba todo o catalogo. Sem validacao de integridade. | ALTO | 1-2 | P1 | Nenhuma (resolvido com DB) |
| DB-004 | **Sem tracking de token usage por conversa/usuario.** `maxOutputTokens: 8192` configurado mas tokens usados nao registrados. Impossivel calcular custo ou detectar abuso. | MEDIO | 3-4 | P2 | DATABASE SETUP |
| DB-005 | **Sem controle de concorrencia no manifest.** Race condition possivel entre `ingest_mind.ts` e server. | MEDIO | 1-2 | P2 | Nenhuma (resolvido com DB) |
| DB-006 | **`localPath` no manifest usa caminhos com caracteres especiais.** Acentos, dois-pontos, aspas. Quebra em Windows e alguns filesystems. | MEDIO | 1-2 | P2 | Nenhuma |

---

### Frontend/UX (validado por @ux-design-expert)

#### Debitos Originais (com ajustes de severidade e esforco)

| ID | Debito | Severidade | Horas | Prioridade | Dependencias |
|----|--------|-----------|-------|------------|-------------|
| UX-001 | **No Design System / Token Architecture.** CSS custom properties declaradas mas nao usadas. Cores hardcoded via Tailwind. **Elevado por @ux-design-expert** (bloqueia theming, temas por mente). **@qa discorda de P0; mantido como P1 -- nao bloqueia o produto de funcionar.** | CRITICO | 10-14 | P1 | UX-010 (remover dead CSS), UX-011 (fix fonts) |
| UX-002 | **Zero reusable components.** Todo UI e inline JSX. Apenas `ChatInterface` extraido como monolito. | ALTO | 12-16 | P1 | UX-001 (design tokens) |
| UX-003 | **No streaming for chat responses.** 5-15s de silencio. Usuarios assumem app quebrado. **Elevado por @ux-design-expert para CRITICO.** Combinado com SYS-015. | CRITICO | (ver SYS-015) | P0 | SYS-021 (refactor gemini.ts) |
| UX-004 | **Chat history nao persistido.** Messages em `useState`. Refresh perde tudo. **Elevado por @data-engineer para CRITICO.** | CRITICO | 6-8 | P0 | DATABASE SETUP |
| UX-005 | **Accessibility failures.** Zero ARIA, zero live regions, zero form labels. Contrast failures (footer 2.7:1). | ALTO | 10-14 | P1 | UX-002 (componentes), UX-001 (tokens), UX-017 (lang) |
| UX-006 | **"Base de Conhecimento" card non-functional.** Hover effects e cursor pointer sem funcionalidade. | MEDIO | 2-3 | P2 | Nenhuma |
| UX-007 | **No `next/link` usage.** Navegacao via `<a>` tags. Full page reload. Flash branco contra #030014. **Elevado por @ux-design-expert para ALTO.** | ALTO | 1-2 | P1 | Nenhuma |
| UX-008 | **Missing error boundaries.** Cross-reference com SYS-008. | MEDIO | (ver SYS-008) | P1 | Nenhuma |
| UX-009 | **No loading/Suspense boundaries.** Cross-reference com SYS-009. | MEDIO | (ver SYS-009) | P2 | Nenhuma |
| UX-010 | **Unused CSS module file.** `page.module.css` com 142 linhas nao importadas. | BAIXO | 0.25 | P0 (quick fix) | Nenhuma |
| UX-011 | **Competing font declarations.** `globals.css` declara Inter, `layout.tsx` carrega Geist. Geist Mono carregado mas nao usado. | BAIXO | 0.5 | P3 | Nenhuma |
| UX-012 | **Mobile viewport issues.** `h-[calc(100vh-140px)]` ignora mobile browser chrome. Touch targets < 44px. **Elevado por @ux-design-expert para ALTO.** | ALTO | 6-8 | P1 | UX-002 (componentes extraidos) |
| UX-013 | **Missing empty states.** Sem ilustracoes, sem CTAs para novos usuarios. | MEDIO | 3-4 | P2 | UX-002 (componentes) |
| UX-014 | **Missing production meta tags / SEO.** Sem Open Graph, Twitter Cards, canonical URL, structured data. | MEDIO | 2-3 | P2 | Nenhuma |
| UX-015 | **Missing favicon / app icons.** Apenas SVGs scaffold do Next.js. | MEDIO | 2-3 | P2 | Nenhuma |
| UX-016 | **No user feedback for chat actions.** Sem copy, timestamps, regenerate, edit. **Elevado por @ux-design-expert para ALTO.** | ALTO | 8-10 | P1 | UX-002 (componentes de chat) |
| UX-017 | **`<html lang="en">` apesar de conteudo pt-BR.** Screen readers usam pronuncia inglesa. | MEDIO | 0.25 | P0 (quick fix) | Nenhuma |
| UX-018 | **No chat textarea.** Single-line `<input type="text">`. Sem multi-line, sem Shift+Enter. **Elevado por @ux-design-expert para ALTO.** | ALTO | 3-4 | P1 | Nenhuma |
| UX-019 | **Console.log em production code.** Cross-reference com SYS-019. | BAIXO | (ver SYS-019) | P3 | Nenhuma |
| UX-020 | **`any` TypeScript usage em UI.** Cross-reference com SYS-018. | BAIXO | (ver SYS-018) | P3 | Nenhuma |
| UX-021 | **No PWA / offline support.** Sem service worker, sem manifest.json. | BAIXO | 6-8 | P4 | Nenhuma |

#### Debitos Adicionados por @ux-design-expert

| ID | Debito | Severidade | Horas | Prioridade | Dependencias |
|----|--------|-----------|-------|------------|-------------|
| UX-NEW-001 | **Sem avatares para mentes.** Mensagens do modelo sem identidade visual. Sem foto, icone, ou iniciais. | ALTO | 4-6 | P1 | UX-002 (ChatBubble component) |
| UX-NEW-002 | **Sem indicacao de "quem esta falando" no header do chat.** Nome da mente sem subtitulo, expertise, bio, ou periodo historico. | ALTO | 3-4 | P1 | DATABASE SETUP (dados expandidos de minds) |
| UX-NEW-003 | **Greeting message hardcoded e generica.** Toda mente recebe mesma saudacao. Nao reflete personalidade do pensador. | MEDIO | 2-3 | P2 | DATABASE SETUP (config por mente) |
| UX-NEW-004 | **Sem transicao ou animacao de entrada para mensagens.** Aparecem instantaneamente sem fade/slide. | MEDIO | 2-3 | P2 | Framer Motion instalado |
| UX-NEW-005 | **Sem indicador de "typing" contextualizado.** Loading generico de 3 bolinhas em vez de "{MindName} esta refletindo..." | BAIXO | 1-2 | P2 | Nenhuma |
| UX-NEW-006 | **Sem onboarding ou tutorial.** Novos usuarios nao sabem o que o produto faz. | MEDIO | 4-6 | P2 | UX-002 (componentes) |
| UX-NEW-007 | **Sem feedback haptico/sonoro ao enviar mensagem.** | BAIXO | 1-2 | P3 | Nenhuma |
| UX-NEW-008 | **Scroll automatico intrusivo.** `scrollIntoView` executa em todo update, mesmo se usuario scrollou para cima. | MEDIO | 1-2 | P2 | UX-002 (MessageList component) |

---

### Cross-Cutting (validado por @architect + @qa)

| ID | Debito | Severidade | Horas | Prioridade | Dependencias |
|----|--------|-----------|-------|------------|-------------|
| CROSS-001 | **No error handling strategy.** Server retorna `{ success: false, error: string }` generico. Client mostra "Falha na conexao neural." hardcoded. Sem classification, retry, ou reporting. | ALTO | 8-12 | P1 | SYS-008 (error boundaries), SYS-027 (middleware) |
| CROSS-002 | **No auth + no persistence = no user identity.** Sem usuario, sem sessao, sem historico. Bloqueio fundamental para qualquer feature user-scoped. | CRITICO | 16-24 | P0 | SYS-001 (auth), DATABASE SETUP |
| CROSS-003 | **Stateless architecture impede features core.** App reconstroi todo contexto em cada request. Afeta performance, reliability, e UX. | ALTO | 12-16 | P1 | DATABASE SETUP |
| CROSS-004 | **No i18n infrastructure.** Strings hardcoded em portugues. `lang="en"` como sintoma. | MEDIO | 6-8 | P3 | Nenhuma |
| CROSS-005 | **No observability pipeline.** `console.log` como unico logging. Sem structured logs, error tracking, ou metrics. | ALTO | 6-8 | P2 | DATABASE SETUP (ou servico externo) |
| CROSS-006 | **Knowledge base management gap.** Ingestion CLI-only. File URIs expiram sem renovacao. Sem admin UI. Sistema quebra silenciosamente a cada 48h. | ALTO | 8-12 | P1 | SYS-010 (File URI), DATABASE SETUP, SYS-001 (auth p/ admin) |

### Gaps Adicionais (identificados por @qa)

| ID | Debito | Severidade | Horas | Prioridade | Dependencias |
|----|--------|-----------|-------|------------|-------------|
| CROSS-NEW-001 | **API cost management and tracking.** Sem quantificacao de custo por mensagem, projecao por usuario/mes, budget alerting, ou cost caps. | MEDIO | 4-6 | P2 | DB-004 (token tracking), DATABASE SETUP |
| QA-GAP-001 | **Analise de licenciamento pendente.** Termos de servico do Gemini API para aplicacoes que "personificam" individuos reais nao verificados. Risco legal. | MEDIO | 2-3 | P2 (nota para @pm) | Nenhuma (analise juridica) |
| QA-GAP-002 | **Ingestion script idempotencia nao verificada.** `ingest_mind.ts` pode criar duplicatas no Gemini File API ao re-executar. | ALTO | 1-2 | P0 (antes de re-ingestion) | Nenhuma |

---

## Stack Tecnologica Recomendada (Consenso dos Especialistas)

Todos os 4 especialistas convergem nas mesmas recomendacoes. Nenhuma contradicao entre as escolhas.

| Tecnologia | Proposito | Consenso | Justificativa |
|-----------|---------|----------|---------------|
| **Supabase** | Database + Auth + Realtime + Storage + Edge Functions | Unanime | Auth built-in elimina CROSS-002. PostgreSQL para queries relacionais. Realtime para Multi-Mind Debates. Storage para backup de knowledge base. Edge Functions para cron de File URI refresh. Free tier generoso (500MB DB, 1GB Storage, 50K auth users). |
| **Drizzle ORM** | Type-safe database access | @data-engineer recomenda, @qa concorda | 7KB bundle (vs 200KB+ Prisma) -- critico para serverless. SQL-like syntax. Schema-as-code. Performance superior em Vercel. **Ressalva @qa:** ecossistema menor que Prisma; se equipe conhece Prisma, bundle overhead e aceitavel. |
| **shadcn/ui** | Component library foundation | @ux-design-expert recomenda, @qa concorda fortemente | Radix UI primitives (a11y built-in). Tailwind nativo (ja e o stack). Copy-paste model (customizacao total). CSS variables para theming (alinha com temas por mente). Dark mode built-in. |
| **Vercel** | Hosting + CI/CD | Unanime | Native Next.js support. Edge functions. Preview deployments por PR. Analytics integrado. |
| **Vercel AI SDK** | Streaming + AI utilities | @architect + @ux-design-expert | Token-by-token streaming. Multi-model support. useChat hook para React. |
| **Vitest** | Unit + Integration testing | @qa recomenda | ESM-native, rapido, compativel com Next.js. Superior a Jest para projetos modernos. |
| **Playwright** | E2E testing | @qa recomenda | Melhor suporte Next.js. Multi-browser. Screenshots. |
| **Zod** | Schema validation | @architect recomenda | Input validation (SYS-003). Type-safe forms. Manifest validation (DB-003). |
| **Sentry** | Error tracking | @architect recomenda | Production observability (SYS-025). Free tier generoso. |
| **Framer Motion** | Animations | @ux-design-expert recomenda | Message animations, page transitions, mind themes. |

**Alternativas descartadas (com justificativa):**

| Tecnologia | Descartada por | Motivo |
|-----------|---------------|--------|
| Firebase/Firestore | @data-engineer | NoSQL dificulta queries analiticas. Vendor lock-in forte. Sem SQL. |
| PlanetScale | @data-engineer | Nao bundla auth/storage/realtime. Mais moving parts. |
| Prisma | @data-engineer | Bundle 200KB+ problematico para serverless. Requer connection pooler com Supabase. |
| SQLite | @data-engineer | Sem auth, sem realtime, sem RLS. Nao escala para multi-usuario. |
| Custom design system (from scratch) | @ux-design-expert | 40+ horas so para a11y. shadcn/ui entrega equivalente em 2-3h. |

---

## Matriz de Priorizacao Final

Ordenada por: CRITICO > ALTO > MEDIO > BAIXO, depois por ratio impacto/esforco.

### P0 -- Critico / Imediato

| # | ID | Debito | Area | Severidade | Horas | Fase |
|---|-----|--------|------|-----------|-------|------|
| 1 | (Fase 0) | Re-ingestion de File URIs + quick fixes | Recovery | CRITICO | 2.5-3.5 | 0 |
| 2 | SYS-NEW-002 | Footer diz "Gemini 1.5 Pro" (usa 2.0-flash) | Quality | BAIXO | 0.25 | 0 |
| 3 | UX-017 | `lang="en"` -> `lang="pt-BR"` | UX/A11y | MEDIO | 0.25 | 0 |
| 4 | UX-010 | Deletar `page.module.css` (dead code) | UX | BAIXO | 0.25 | 0 |
| 5 | QA-GAP-002 | Validar idempotencia de `ingest_mind.ts` | Quality | ALTO | 1-2 | 0 |
| 6 | DB-001 | Manifest sem `expires_at` por arquivo | Data | CRITICO | 2-3 | 0/1 |
| 7 | SYS-010 | File URIs expiram sem renovacao | Reliability | CRITICO | 6-8 | 1 |
| 8 | CROSS-002 | No auth + no persistence | Cross | CRITICO | 16-24 | 2 |
| 9 | SYS-001 | No authentication | Security | CRITICO | 12-16 | 2 |
| 10 | SYS-002 | No rate limiting | Security | CRITICO | 6-8 | 2 |
| 11 | SYS-003 | No input validation | Security | CRITICO | 4-6 | 2 |
| 12 | SYS-015/UX-003 | No response streaming | Perf/UX | CRITICO | 12-16 | 3 |
| 13 | UX-004 | Chat history nao persistido | UX/Data | CRITICO | 6-8 | 2 |

### P1 -- Alto / Semana 1-6

| # | ID | Debito | Area | Severidade | Horas | Fase |
|---|-----|--------|------|-----------|-------|------|
| 14 | SYS-005 | API key exposure risk | Security | ALTO | 2-3 | 1 |
| 15 | SYS-007 | Module-level crash on missing env | Reliability | ALTO | 2 | 1 |
| 16 | SYS-027 | No middleware | Infra | ALTO | 4-6 | 2 |
| 17 | SYS-008 | No error boundaries | Reliability | ALTO | 4-6 | 3 |
| 18 | SYS-021 | No separation of concerns (gemini.ts) | Quality | MEDIO | 4-6 | 3 |
| 19 | SYS-012 | Context window bloat | Performance | ALTO | 8-12 | 3 |
| 20 | SYS-013 | Stateless chat recreation | Performance | ALTO | 6-8 | 2 |
| 21 | SYS-014 | Synchronous filesystem reads | Performance | MEDIO | 1-2 | 1 |
| 22 | SYS-NEW-001 | Prompt security hardening | Security | ALTO | 4-6 | 2 |
| 23 | CROSS-001 | No error handling strategy | Cross | ALTO | 8-12 | 3 |
| 24 | CROSS-003 | Stateless architecture | Cross | ALTO | 12-16 | 2 |
| 25 | CROSS-006 | Knowledge base management gap | Cross | ALTO | 8-12 | 2 |
| 26 | DB-002 | Sem backup da knowledge base | Data | ALTO | 2-3 | 2 |
| 27 | DB-003 | Manifest JSON single point of failure | Data | ALTO | 1-2 | 2 |
| 28 | UX-001 | No Design System / tokens | UX | CRITICO | 10-14 | 3 |
| 29 | UX-002 | Zero reusable components | UX | ALTO | 12-16 | 3 |
| 30 | UX-005 | Accessibility failures | UX | ALTO | 10-14 | 4 |
| 31 | UX-007 | No next/link usage | UX | ALTO | 1-2 | 1 |
| 32 | UX-012 | Mobile viewport issues | UX | ALTO | 6-8 | 4 |
| 33 | UX-016 | No chat action feedback | UX | ALTO | 8-10 | 3 |
| 34 | UX-018 | No chat textarea | UX | ALTO | 3-4 | 3 |
| 35 | UX-NEW-001 | Sem avatares para mentes | UX | ALTO | 4-6 | 3 |
| 36 | UX-NEW-002 | Sem contexto no header do chat | UX | ALTO | 3-4 | 3 |

### P2 -- Medio / Semana 4-8

| # | ID | Debito | Area | Severidade | Horas | Fase |
|---|-----|--------|------|-----------|-------|------|
| 37 | SYS-004 | No mindId sanitization | Security | ALTO | 2-3 | 2 |
| 38 | SYS-009 | No loading states | Reliability | MEDIO | 2-3 | 4 |
| 39 | SYS-011 | No health check endpoint | Reliability | MEDIO | 1-2 | 2 |
| 40 | SYS-016 | No manifest caching | Performance | MEDIO | 2-3 | 2 |
| 41 | SYS-017 | Zero test coverage | Quality | ALTO | 12-16 | 4 |
| 42 | SYS-018 | `any` types throughout | Quality | MEDIO | 3-4 | 3 |
| 43 | SYS-022 | Hardcoded model/config | Quality | MEDIO | 2-3 | 3 |
| 44 | SYS-024 | No CI/CD pipeline | Infra | ALTO | 6-8 | 4 |
| 45 | SYS-025 | No monitoring/observability | Infra | ALTO | 6-8 | 4 |
| 46 | SYS-028 | Empty next.config.ts | Infra | MEDIO | 2-3 | 2 |
| 47 | CROSS-005 | No observability pipeline | Cross | ALTO | 6-8 | 4 |
| 48 | CROSS-NEW-001 | API cost management | Cross | MEDIO | 4-6 | 4 |
| 49 | DB-004 | Sem tracking de token usage | Data | MEDIO | 3-4 | 4 |
| 50 | DB-005 | Sem controle de concorrencia | Data | MEDIO | 1-2 | 2 |
| 51 | DB-006 | localPath com caracteres especiais | Data | MEDIO | 1-2 | 2 |
| 52 | UX-006 | KB card non-functional | UX | MEDIO | 2-3 | 3 |
| 53 | UX-013 | Missing empty states | UX | MEDIO | 3-4 | 5 |
| 54 | UX-014 | Missing meta tags / SEO | UX | MEDIO | 2-3 | 5 |
| 55 | UX-015 | Missing favicon / app icons | UX | MEDIO | 2-3 | 5 |
| 56 | UX-NEW-003 | Greeting hardcoded | UX | MEDIO | 2-3 | 4 |
| 57 | UX-NEW-004 | Sem animacao de mensagens | UX | MEDIO | 2-3 | 3 |
| 58 | UX-NEW-005 | Typing indicator generico | UX | BAIXO | 1-2 | 3 |
| 59 | UX-NEW-006 | Sem onboarding | UX | MEDIO | 4-6 | 5 |
| 60 | UX-NEW-008 | Scroll automatico intrusivo | UX | MEDIO | 1-2 | 3 |
| 61 | QA-GAP-001 | Licenciamento Gemini API | Legal | MEDIO | 2-3 | 4 |

### P3 -- Baixo / Semana 8-12+

| # | ID | Debito | Area | Severidade | Horas | Fase |
|---|-----|--------|------|-----------|-------|------|
| 62 | SYS-006 | `.env` tracked no repo | Security | MEDIO | 1 | 5 |
| 63 | SYS-019 | Console.log em production | Quality | BAIXO | 1 | 0 |
| 64 | SYS-020 | No code documentation | Quality | MEDIO | 3-4 | 5 |
| 65 | SYS-023 | Wrong error message in script | Quality | BAIXO | 0.5 | 5 |
| 66 | SYS-026 | No Docker/containerization | Infra | MEDIO | 3-4 | 5 |
| 67 | CROSS-004 | No i18n infrastructure | Cross | MEDIO | 6-8 | 5 |
| 68 | UX-011 | Competing font declarations | UX | BAIXO | 0.5 | 5 |
| 69 | UX-NEW-007 | Sem feedback haptico/sonoro | UX | BAIXO | 1-2 | 5 |

### P4 -- Futuro

| # | ID | Debito | Area | Severidade | Horas |
|---|-----|--------|------|-----------|-------|
| 70 | UX-021 | No PWA / offline support | UX | BAIXO | 6-8 |

---

## Plano de Resolucao por Fases

### Fase 0: Recuperacao Imediata (2.5-3.5 horas)

**Objetivo:** Restaurar o sistema a um estado funcional.

**Debitos resolvidos:** SYS-010 (workaround), QA-GAP-002, UX-017, UX-010, SYS-019 (console.logs), SYS-NEW-002
**Dependencias:** Nenhuma.

| Tarefa | Horas | Entrega |
|--------|-------|---------|
| Validar idempotencia de `ingest_mind.ts` | 0.5 | Confirmacao de seguranca |
| Re-ingestion via CLI | 1-2 | File URIs atualizados, chat funcional |
| Quick fixes (lang, dead CSS, console.logs, footer) | 0.75 | Limpeza basica |
| Smoke test | 0.5 | Confirmacao que chat funciona |

**Entregaveis:** Sistema funcional novamente. Chat responde. Quick fixes aplicados.

---

### Fase 1: Quick Wins + Seguranca Basica (22-32 horas, semana 1-2)

**Objetivo:** Eliminar vulnerabilidades criticas e aplicar melhorias rapidas de UX.

**Debitos resolvidos:** SYS-005, SYS-007, SYS-014, UX-007, DB-001, SYS-027, SYS-001, SYS-002, SYS-003, SYS-004
**Dependencias:** Fase 0 concluida.

| Tarefa | Horas | Dependencias | Entrega |
|--------|-------|-------------|---------|
| Fix API key exposure (env var management) | 2-3 | Nenhuma | Key segura |
| Graceful env var handling (SYS-007) | 2 | Nenhuma | Sem crash on missing env |
| Async filesystem reads (SYS-014) | 1-2 | Nenhuma | Event loop desbloqueado |
| Substituir `<a>` por `next/link` (UX-007) | 1-2 | Nenhuma | Sem flash branco |
| Capturar `expirationTime` no ingest script (DB-001) | 2-3 | Nenhuma | TTL tracking funcional |
| Criar `middleware.ts` (SYS-027) | 4-6 | Nenhuma | Base para auth + rate limit |
| Implementar autenticacao (SYS-001) | 12-16 | SYS-027 | Usuarios identificados |
| Rate limiting (SYS-002) | 6-8 | SYS-027 | Protecao contra abuso |
| Input validation com Zod (SYS-003) | 4-6 | Nenhuma | Validacao de mensagens |
| mindId sanitization (SYS-004) | 2-3 | Nenhuma | Path traversal prevenido |

**Nota:** Auth e rate limiting podem iniciar com in-memory e migrar para DB na Fase 2.

**Entregaveis:** App protegida com autenticacao, rate limiting, e input validation.

---

### Fase 2: Fundacao de Dados (32-48 horas, semana 2-4)

**Objetivo:** Estabelecer persistencia, migrar manifest para DB, implementar cron de File URI refresh.

**Debitos resolvidos:** CROSS-002, CROSS-003, UX-004, SYS-010 (permanente), SYS-013, SYS-NEW-001, CROSS-006, DB-002, DB-003, DB-005, DB-006, SYS-011, SYS-016, SYS-028
**Dependencias:** Fase 1 (auth) concluida.

| Tarefa | Horas | Dependencias | Entrega |
|--------|-------|-------------|---------|
| Setup Supabase project + connection | 1-2 | Nenhuma | DB operacional |
| Schema creation (migrations) | 3-4 | Setup | Tabelas criadas |
| Drizzle ORM setup + schema types | 2-3 | Schema | Type-safe DB access |
| RLS policies + testing | 3-4 | Schema | Seguranca no DB |
| Seed script (manifest -> DB, idempotente) | 2-3 | Schema + Drizzle | Minds no DB |
| Upload originais para Supabase Storage | 1-2 | Setup | Backup duravel |
| File refresh Edge Function (cron 12h) | 4-6 | Schema + Gemini | URIs auto-renovados |
| Supabase Auth integration (Next.js) | 4-6 | Setup | Login/logout funcional |
| Prompt security hardening (SYS-NEW-001) | 4-6 | SYS-003 | Persona escape prevented |
| Conversation persistence (CRUD) | 4-6 | Schema + Auth | Chat sobrevive refresh |
| Refactor rate limiting para DB-backed | 2-3 | Schema | Limites persistentes |
| Health check endpoint (SYS-011) | 1-2 | Nenhuma | Liveness probe |
| Security headers em next.config (SYS-028) | 2-3 | Nenhuma | CSP, HSTS, X-Frame |
| Dual-read transition + manifest removal | 2-3 | Tudo acima | DB e source-of-truth |

**Paralelizavel com Fase 3 (frontend):** DATABASE (backend) e DESIGN SYSTEM (frontend) sao independentes.

**Entregaveis:** Usuarios com login, conversas persistidas, File URIs renovando automaticamente, knowledge base com backup.

---

### Fase 3: Core UX + Chat Experience (40-56 horas, semana 4-6)

**Objetivo:** Transformar o chat de prototipo para experiencia moderna. Design system, streaming, componentes.

**Debitos resolvidos:** UX-001, UX-002, SYS-015/UX-003, SYS-021, SYS-012, SYS-008, SYS-018, SYS-022, CROSS-001, UX-016, UX-018, UX-NEW-001, UX-NEW-002, UX-006, UX-NEW-004, UX-NEW-005, UX-NEW-008
**Dependencias:** Fase 1 parcialmente concluida (nao depende de DB para iniciar).

| Tarefa | Horas | Dependencias | Entrega |
|--------|-------|-------------|---------|
| Design tokens em `tailwind.config.ts` | 4-6 | Quick wins | Fundacao de design |
| Instalar e configurar shadcn/ui | 2-3 | Tokens | Componentes acessiveis |
| Extrair componentes base (Button, GlassCard, PageLayout, Header) | 4-6 | shadcn/ui | Reusabilidade |
| Extrair componentes de chat (ChatBubble, MessageList, ChatInput com textarea auto-resize) | 6-8 | Componentes base | Chat modular |
| Refactor gemini.ts em modulos (SYS-021) | 4-6 | Nenhuma | Testabilidade |
| Implementar streaming (Vercel AI SDK) | 12-16 | SYS-021 | Token-by-token display |
| Context window optimization (SYS-012) -- Gemini Cached Content API | 8-12 | SYS-021 | Latencia reduzida |
| Error boundaries + error/not-found pages | 4-6 | Componentes | Recovery graceful |
| Error handling strategy (CROSS-001) | 8-12 | Error boundaries | Erros classificados |
| Fix `any` types (SYS-018) | 3-4 | Refactor | Type safety |
| Model config externalization (SYS-022) | 2-3 | Refactor | A/B testable |
| Chat actions: copy, regenerate, timestamps (UX-016) | 3-4 | ChatBubble | Interatividade |
| Avatares para mentes (UX-NEW-001) | 3-4 | ChatBubble | Identidade visual |
| Chat header com contexto (UX-NEW-002) | 2-3 | DB minds data | Contexto |
| Message animations (UX-NEW-004) | 2-3 | Framer Motion | Polimento |
| Typing indicator contextualizado (UX-NEW-005) | 1 | Nenhuma | Imersao |
| Fix auto-scroll (UX-NEW-008) | 1-2 | MessageList | UX correto |
| KB card funcional ou remover interatividade (UX-006) | 2-3 | Componentes | UI honesta |

**Entregaveis:** Chat com streaming, design system, componentes reusaveis, error handling, UX moderna.

---

### Fase 4: Qualidade + Mobile + Acessibilidade (36-50 horas, semana 6-8)

**Objetivo:** Qualidade de producao. Testes, CI/CD, monitoring, mobile, acessibilidade.

**Debitos resolvidos:** SYS-017, SYS-024, SYS-025, CROSS-005, UX-005, UX-012, SYS-009, DB-004, CROSS-NEW-001, UX-NEW-003, QA-GAP-001
**Dependencias:** Fases 2 e 3 concluidas.

| Tarefa | Horas | Dependencias | Entrega |
|--------|-------|-------------|---------|
| Setup Vitest + React Testing Library | 2-3 | Nenhuma | Test framework |
| Unit tests (services, utils, components) | 6-8 | Componentes extraidos | 40-60 testes |
| Integration tests (API, RLS, DB) | 4-6 | DB setup | 15-25 testes |
| Setup Playwright + E2E tests | 4-6 | Nenhuma | 10-15 cenarios |
| CI/CD pipeline (GitHub Actions -> Vercel) | 6-8 | Testes existentes | Auto-deploy |
| Sentry integration + structured logging | 4-6 | Nenhuma | Observabilidade |
| Vercel Analytics integration | 1-2 | Vercel deploy | Performance metrics |
| Mobile-first redesign: dvh, touch targets, safe areas | 6-8 | Componentes | Usabilidade mobile |
| Accessibility pass 1: ARIA, live regions, focus, contrast | 6-8 | Componentes | WCAG AA core |
| Loading/Suspense boundaries (SYS-009) | 2-3 | Componentes | Perceived perf |
| Token usage tracking (DB-004) | 3-4 | DB | Metricas de custo |
| API cost management (CROSS-NEW-001) | 2-3 | DB-004 | Budget control |
| Greetings personalizados (UX-NEW-003) | 2-3 | DB minds config | Imersao |
| Nota licenciamento para @pm (QA-GAP-001) | 0.5 | Nenhuma | Documentacao |

**Paralelizavel:** Testes (backend) + Mobile/A11y (frontend).

**Entregaveis:** 80%+ test coverage, CI/CD funcional, mobile usavel, a11y basica, monitoring ativo.

---

### Fase 5: Polish & Launch Readiness (20-30 horas, semana 8-10)

**Objetivo:** Production readiness. Polimento visual, SEO, branding, documentacao.

**Debitos resolvidos:** UX-013, UX-014, UX-015, UX-NEW-006, SYS-006, SYS-020, SYS-023, SYS-026, CROSS-004, UX-011, UX-NEW-007
**Dependencias:** Fases 0-4 concluidas.

| Tarefa | Horas | Entrega |
|--------|-------|---------|
| Favicon + app icons customizados | 2-3 | Branding |
| Meta tags completos (OG, Twitter Cards, structured data) | 2-3 | Social sharing |
| Empty states com ilustracoes e CTAs | 3-4 | Onboarding |
| Onboarding / tutorial para novos usuarios (UX-NEW-006) | 4-6 | First-use experience |
| Fix `.env` tracking (SYS-006) | 1 | Security hygiene |
| Code documentation (JSDoc, inline) | 3-4 | Maintainability |
| Fix error message in ingest script (SYS-023) | 0.5 | Correctness |
| Docker setup (SYS-026) | 3-4 | Reproducible builds |
| Fix font declarations (UX-011) | 0.5 | Design consistency |
| Feedback haptico/sonoro (UX-NEW-007) | 1-2 | Polish |

**Entregaveis:** App pronta para lancamento publico.

---

### Fase 6: Features Legendarias (semana 10+, estimativas individuais)

**Objetivo:** Diferenciais competitivos que tornam o produto memoravel. Nao sao debitos -- sao features estrategicas.

| Feature | Horas | Diferenciador | Dependencias |
|---------|-------|---------------|-------------|
| **Temas visuais por mente** (Session Themes) | 8-12 | Nenhum competidor oferece. Cada mente transforma o ambiente. | Design tokens completos |
| **Multi-Mind Debates V1** (round-robin) | 16-24 | Debates AI-to-AI entre pensadores historicos. Unico. | Streaming, DB, Supabase Realtime |
| **Mind Memory** (recall cross-session) | 12-16 | "Last time we spoke..." Conexao emocional. | DB conversations + summarization |
| **Rich Message Formatting** (code, LaTeX, collapsible) | 12-16 | Essencial para minds tecnicas (fisicos, matematicos). | Componentes de chat |
| **Mind Profile Pages** (`/mind/{slug}`) | 6-8 (fase 1) | Identidade e discoverability. | DB minds + componentes |
| **Conversation Sharing** (link publico) | 8-12 | Viral growth. "Olha minha conversa com Einstein." | DB (share_slug), RLS |
| **Voice Mode** (TTS/STT) | 16-24 | "Ouvir Socrates falar." Transformador. | Web Speech API ou ElevenLabs |
| **Ambient Soundscapes** | 8-12 | Imersao sensorial. Lyra grega para Socrates. | Audio assets |
| **i18n / Multi-language** (CROSS-004) | 6-8 | Expansao global. | next-intl |
| **PWA / Offline** (UX-021) | 6-8 | Install-to-homescreen. | Service worker |
| **Accessibility Pass 2** (NVDA/VoiceOver, reduced motion, axe-core automation) | 8-12 | Full WCAG AA compliance. | Pass 1 concluido |

---

## Riscos e Mitigacoes

| # | Risco | Probabilidade | Impacto | Mitigacao |
|---|-------|--------------|---------|-----------|
| 1 | **Sistema inoperante (File URIs expirados).** Nenhuma conversa funciona desde 2026-01-02. | 100% (atual) | CRITICO | Fase 0: re-ingestion imediata via CLI. Depois, cron automatico. |
| 2 | **Prompt injection + sem auth = risco legal.** Qualquer pessoa pode gerar conteudo inapropriado "em nome de" pessoa real. | ALTA | CRITICO | Auth (SYS-001) + input validation (SYS-003) + prompt security (SYS-NEW-001) em conjunto na Fase 1-2. |
| 3 | **Migracao file-based -> DB pode causar downtime.** Se qualquer passo falhar, sistema fica mais inoperante. | MEDIA | ALTO | Dual-read transition (@data-engineer). Script de rollback para reverter ao manifest. Testar em staging. |
| 4 | **Context window overflow em conversas longas.** 21 file URIs + historico crescente pode exceder limite do modelo. | ALTA | ALTO | Limite de mensagens no historico enviado. Gemini Cached Content API. Conversation summarization. |
| 5 | **Race condition no manifest durante re-ingestion.** Server lendo enquanto script escreve. `readFileSync` + `writeFileSync` sem lock. | MEDIA | MEDIO | Parar servidor durante re-ingestion (Fase 0). DB resolve permanentemente (Fase 2). |
| 6 | **Custos de API nao controlados.** Sem tracking, sem budget cap, sem alertas. | ALTA | ALTO | DB-004 (token tracking) + CROSS-NEW-001 (cost management) na Fase 4. Rate limiting na Fase 1. |
| 7 | **Performance em serverless com sync I/O.** `readFileSync` bloqueia event loop em Vercel Lambda. | MEDIA (se deploy Vercel) | MEDIO | SYS-014 (async reads) elevado para Fase 1. |
| 8 | **Scope creep na visao "legendaria".** Temas, soundscapes, voice mode podem consumir 100+ horas. | ALTA | MEDIO | Fases estritamente incrementais. Features legendarias so apos Fase 5 (launch readiness). |
| 9 | **Termos legais do Gemini API para "clones digitais".** Personificacao de pessoas reais pode violar ToS. | BAIXA | ALTO | Analise juridica na Fase 4 (QA-GAP-001). Consulta formal aos termos do Google. |
| 10 | **Drizzle ORM ecossistema menor.** Documentacao menos madura que Prisma. | BAIXA | BAIXO | Aceitar tradeoff pelo bundle size. Migrar para Prisma se necessario (schema PostgreSQL e portavel). |

---

## Dependencias entre Debitos

### Grafo de Dependencias (validado por @qa com ajustes)

```
DEPENDENCY GRAPH (A --> B significa "A depende de B")

FASE 0: RECUPERACAO
  SYS-010a (workaround CLI) ............... Zero dependencias
  Quick fixes (UX-017, UX-010, SYS-019) .. Zero dependencias
  QA-GAP-002 (validar idempotencia) ...... ANTES de SYS-010a

CROSS-002 (Auth + Persistence)
  |
  +---> SYS-001 (Authentication)
  |       |
  |       +---> SYS-027 (Middleware) .......... Auth checks need middleware
  |       +---> SYS-028 (next.config) ......... Security headers
  |
  +---> DATABASE SETUP (Novo -- nao e debito, e nova arquitetura)
  |       |
  |       +---> SYS-007 (Graceful env) ....... DB connection string = env var
  |       +---> UX-004 (Chat persistence) .... Needs DB to store history
  |       +---> CROSS-003 (Stateful arch) .... Needs DB for sessions
  |       +---> SYS-025 (Monitoring) ......... Can log to DB/service
  |       +---> SYS-002 (Rate limiting) ...... Persistent limits need storage
  |       +---> SYS-013 (Session caching) .... Server-side session store
  |       +---> CROSS-006 (KB management) .... Manifest moves to DB
  |       +---> DB-002 (Backup) .............. Supabase Storage
  |       +---> DB-003 (SPOF) ................ DB replaces JSON
  |       +---> DB-005 (Concurrency) ......... ACID transactions

SYS-015 / UX-003 (Streaming) *** NOTA: NAO depende de SYS-013 (@qa) ***
  |
  +---> SYS-021 (Separation of concerns) .... gemini.ts must be refactored
  +---> SYS-012 (Context bloat) ............. Optimize before streaming amplifies cost

SYS-017 (Test coverage)
  |
  +---> UX-002 (Reusable components) ........ Components must exist before unit testing
  +---> SYS-021 (Separation of concerns) .... Modular code is testable code
  +---> SYS-018 (Fix any types) ............. Types enable meaningful assertions

SYS-024 (CI/CD)
  |
  +---> SYS-017 (Tests) .................... Tests must exist for CI to run them

UX-001 (Design system)
  |
  +---> UX-002 (Reusable components) ........ Components consume design tokens
  +---> UX-010 (Remove dead CSS) ............ Clean slate before building system
  +---> UX-011 (Fix fonts) .................. Font system is part of tokens

UX-005 (Accessibility)
  |
  +---> UX-002 (Reusable components) ........ ARIA belongs in shared components
  +---> UX-001 (Design system) .............. Contrast fixes need token system
  +---> UX-017 (Fix lang attribute) ......... Foundation for a11y

CROSS-006 (KB management)
  |
  +---> SYS-010 (File URI expiration) ....... Must handle TTL before admin UI
  +---> DATABASE SETUP ...................... Manifest should move to DB
  +---> SYS-001 (Auth) ..................... Admin actions need auth

SYS-NEW-001 (Prompt security)
  |
  +---> SYS-003 (Input validation) ......... Guardrails need validation layer
```

### Caminho Critico (validado e ajustado com inputs do @qa)

```
Fase 0: SYS-010a + quick fixes (3.5h)
  |
  v
Fase 1: SYS-027 (4-6h) --> SYS-001 (12-16h) --> SYS-002 (6-8h) --> SYS-003 (4-6h)
  |
  v (PARALELO)
Fase 2-Backend: DATABASE SETUP (32-48h) ----+
Fase 3-Frontend: UX-001 + UX-002 (22-30h) --+-- convergem
  |
  v
Fase 3-Integrated: SYS-021 (4-6h) --> SYS-015 streaming (12-16h)
  |
  v
Fase 4: SYS-017 testes (12-16h) --> SYS-024 CI/CD (6-8h)

Caminho critico estimado: 95-135 horas
```

### Oportunidades de Paralelizacao

| Paralelo A (Backend) | Paralelo B (Frontend) | Justificativa |
|----------------------|----------------------|---------------|
| DATABASE SETUP (32-48h) | Design system + componentes (22-30h) | Zero dependencia entre si |
| SYS-021 (refactor gemini.ts) | UX-002 (extrair componentes) | Backend e frontend refactor independentes |
| SYS-017 (setup test framework) | SYS-024 (setup CI/CD basico) | Configuracoes paralelas |
| SYS-028 (security headers) | UX-014 (meta tags) | Ambos em config/layout files |

---

## Criterios de Sucesso

### Por Fase

| Fase | Criterio | Metrica |
|------|----------|---------|
| **Fase 0** | Sistema funcional: chat responde a mensagens | Smoke test passa |
| **Fase 1** | Rotas protegidas retornam 401 sem auth. Rate limit retorna 429. Input validado. | Testes de seguranca manuais |
| **Fase 2** | Login funciona. Conversa persiste apos refresh. File URIs renovam automaticamente. | Lighthouse, RLS tests, cron logs |
| **Fase 3** | Primeiro token em < 500ms. Componentes reusaveis. Error boundaries. | Time-to-first-token, component count |
| **Fase 4** | 80%+ test coverage. CI/CD funcional. Mobile usavel. a11y basica. | Coverage report, Lighthouse |
| **Fase 5** | App pronta para lancamento. Branding, SEO, onboarding. | Checklist de launch |

### Metricas Target

| Metrica | Estado Atual | Fase 2 | Fase 4 | Fase 5 |
|---------|-------------|--------|--------|--------|
| **Time-to-first-token (streaming)** | 5-15s (full wait) | N/A | < 500ms | < 300ms |
| **Lighthouse Performance** | ~60 (estimado) | > 70 | > 80 | > 90 |
| **Lighthouse Accessibility** | ~30 (estimado) | > 50 | > 70 | > 90 |
| **Lighthouse SEO** | ~50 (estimado) | > 60 | > 80 | > 95 |
| **Test coverage (lines)** | 0% | 0% | > 80% | > 80% |
| **Component reuse ratio** | 0% | 0% | > 60% | > 85% |
| **WCAG AA compliance** | 0 items | Core items | > 70% | Full |
| **Mobile usability** | Broken | Functional | Optimized | Optimized |
| **Design token coverage** | ~5% | > 40% | > 70% | > 95% |
| **Uptime (File URI health)** | 0% (expirado) | 100% (manual) | 99%+ (cron) | 99.9%+ |

---

## Estrategia de Testes (definida por @qa)

### Piramide de Testes Target

| Tipo | Quantidade | Cobertura | Ferramenta |
|------|-----------|-----------|-----------|
| Unit (services, utils, componentes) | 40-60 testes | Logica isolada | Vitest + React Testing Library |
| Integration (API, RLS, DB, server actions) | 15-25 testes | Fluxos integrados | Vitest + Supabase client |
| E2E (fluxos criticos de usuario) | 10-15 cenarios | User journeys | Playwright |
| **Total** | **65-100 testes** | **~80% cobertura** | |

### Gemini API Mocking

- **Unit/Integration:** Mock `@google/generative-ai` inteiramente. Fixtures JSON para cenarios: sucesso, rate limit, File URI expirado, resposta vazia, resposta longa.
- **E2E:** MSW (Mock Service Worker) interceptando chamadas ao Gemini API endpoint.
- **Streaming:** Mock `ReadableStream` com chunks pre-definidos e delays simulados.
- **NUNCA** usar API key real em testes.

### Checklists Pos-Resolucao

Cada fase tem checklist de validacao definido pelo @qa (documentado em `docs/reviews/qa-review.md`, Secao "Testes Pos-Resolucao").

---

## Visao do Produto -- "O Atheneum Digital"

### Conceito (consolidado de todos os especialistas)

O Mentes Sinteticas nao e apenas um chat com AI. E um **portal para dialogar com as maiores mentes da humanidade**. A experiencia deve evocar a sensacao de entrar em um espaco sagrado de conhecimento -- uma mistura de biblioteca antiga com tecnologia de fronteira.

**O que torna este produto unico:**

1. **Imersao sensorial** -- Temas visuais por mente (Session Themes) sao o diferenciador visual que nenhum competidor oferece. Socrates com estetica de marmore grego. Einstein com grid de equacoes e particulas. Cada conversa e uma viagem a uma era diferente.

2. **Multi-Mind Debates** -- Selecionar 2-3 mentes e ve-las debater um topico. Nenhum competidor oferece debates AI-to-AI entre pensadores historicos. "O que e justica?" respondido simultaneamente por Socrates, Sun Tzu, e Marcus Aurelius.

3. **Mind Memory** -- Mentes que lembram conversas anteriores. "Da ultima vez que conversamos, voce perguntou sobre etica..." Cria conexao emocional e aumenta retencao.

4. **Gravitas intelectual** -- Tipografia serif para headings (Playfair Display), paleta sofisticada (gold antigo + purple profundo + teal escuro), micro-textos que comunicam reverencia. Um produto que voce mostra para amigos.

### Posicionamento Visual

Entre a seriedade intelectual do Claude e a personalidade imersiva do Character.ai, com a qualidade de streaming do ChatGPT. Nenhum competidor oferece temas ambientais por pensador -- este e o diferenciador.

### Feature Roadmap Alem do Debt

Apos resolucao de todos os debitos (Fases 0-5), o roadmap de features legendarias (Fase 6) inclui: temas por mente, Multi-Mind Debates, Voice Mode, Mind Memory, Rich Formatting, Mind Profiles, Conversation Sharing, Ambient Soundscapes. Estimativa total: 100-150 horas adicionais.

---

## Schema de Dados Proposto (@data-engineer)

O schema completo (7 tabelas + RLS + triggers + indexes) esta documentado em `docs/reviews/db-specialist-review.md`, Secao 3.2. Resumo das tabelas:

| Tabela | Proposito | Chave |
|--------|---------|-------|
| `profiles` | Dados adicionais de usuario (Supabase Auth gerencia `auth.users`) | UUID (FK auth.users) |
| `minds` | Catalogo de pensadores com config de modelo | UUID, slug unico |
| `mind_files` | Knowledge base URIs com TTL tracking e status | UUID, FK minds |
| `conversations` | Sessoes de chat com metadata e sharing | UUID, FK users + minds |
| `messages` | Append-only log de mensagens com token tracking | UUID, FK conversations |
| `analytics_events` | Eventos de uso (event sourcing) | BIGSERIAL |
| `file_refresh_log` | Auditoria de renovacao de File URIs | BIGSERIAL, FK mind_files |

---

## Notas Finais

### Para Phase 9 (@analyst)

Este documento contem todos os dados necessarios para o TECHNICAL-DEBT-REPORT executivo: 65 debitos, 350-470h de esforco total, 180-250h de core (P0+P1), plano de 6 fases, e stack tecnologica consensual.

### Para Phase 10 (@pm)

Os debitos estao prontos para serem convertidos em epics e stories. Sugestao de estrutura:

- **Epic 1:** Recuperacao e Seguranca (Fases 0-1)
- **Epic 2:** Fundacao de Dados (Fase 2)
- **Epic 3:** Experiencia de Chat Moderna (Fase 3)
- **Epic 4:** Qualidade e Production Readiness (Fases 4-5)
- **Epic 5:** Features Legendarias (Fase 6)

**Nota juridica:** Verificar termos de servico do Gemini API para criacao de "clones digitais" de pessoas reais (QA-GAP-001).

### Alertas Criticos do @data-engineer

1. **Gemini Cached Content API** deve ser avaliada ANTES de decidir estrategia de context injection. Se usar cached content, o fluxo de `gemini.ts` muda drasticamente.
2. **Supabase free tier** permite 500K Edge Function invocations/mes. Monitorar se numero de minds crescer.
3. **Schema tem dependencia circular** em `profiles.default_mind_id REFERENCES minds(id)`. Usar `DEFERRABLE INITIALLY DEFERRED` ou inserir sem default inicialmente.

---

*Este documento foi gerado como Phase 8 de Brownfield Discovery por @architect (Aria).*
*Consolida e finaliza os achados de Phase 4 (DRAFT), Phase 5 (@data-engineer), Phase 6 (@ux-design-expert), e Phase 7 (@qa).*
*Todos os debitos, severidades, estimativas, e prioridades foram validados por pelo menos 2 especialistas.*

*Synkra AIOX v2.0*
