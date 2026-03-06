# Epic 1: Transformacao Mentes Sinteticas -- De Prototipo a Produto Legendario

## Visao

Transformar o Mentes Sinteticas de um prototipo inoperante (~393 linhas, 6 arquivos, zero testes, zero auth, zero persistencia) em um produto de producao digno do titulo "O Atheneum Digital" -- um portal imersivo para dialogar com as maiores mentes da humanidade.

O sistema esta 100% inoperante desde 2026-01-02 (File URIs do Gemini expiraram). Este epic resolve 65 debitos tecnicos identificados por 4 especialistas (@architect, @data-engineer, @ux-design-expert, @qa) e estabelece a fundacao para features legendarias (Multi-Mind Debates, Session Themes, Mind Memory, Voice Mode).

**Stack consensual:** Supabase + Drizzle ORM + shadcn/ui + Vercel + Vercel AI SDK + Vitest + Playwright + Zod + Sentry + Framer Motion.

## Escopo

Cobre todas as 6 fases do plano de resolucao de divida tecnica:

| Fase | Nome | Horas Estimadas | Semanas |
|------|------|----------------|---------|
| 0 | Recuperacao Imediata | 2.5-3.5h | Dia 1 |
| 1 | Quick Wins + Correcoes Rapidas | 8-12h | Semana 1 |
| 2 | Fundacao de Dados | 32-48h | Semana 2-4 |
| 3 | Core UX + Chat Experience | 40-56h | Semana 4-6 |
| 4 | Qualidade + Mobile + Acessibilidade | 36-50h | Semana 6-8 |
| 5 | Polish & Launch Readiness | 20-30h | Semana 8-10 |

**Esforco total estimado:** 350-470 horas (completo) | 180-250 horas (core P0+P1)

## Criterios de Sucesso

| Metrica | Estado Atual | Target Fase 2 | Target Fase 4 | Target Fase 5 |
|---------|-------------|---------------|---------------|---------------|
| Sistema funcional | INOPERANTE | Funcional com auth | Testado + CI/CD | Launch-ready |
| Time-to-first-token | 5-15s (full wait) | N/A | < 500ms | < 300ms |
| Lighthouse Performance | ~60 | > 70 | > 80 | > 90 |
| Lighthouse Accessibility | ~30 | > 50 | > 70 | > 90 |
| Test coverage | 0% | 0% | > 80% | > 80% |
| WCAG AA compliance | 0 items | Core items | > 70% | Full |
| File URI uptime | 0% (expirado) | 100% (manual) | 99%+ (cron) | 99.9%+ |

---

## Stories (ordenadas por dependencia)

### Fase 0: Recuperacao Imediata
- [ ] Story 0.1: Re-ingestao de File URIs do Gemini e Restauracao do Sistema

### Fase 1: Quick Wins
- [ ] Story 1.1: Cleanup e Correcoes Rapidas (tipos, next/link, expires_at, async reads)
- [ ] Story 1.2: Error Handling e Graceful Degradation
- [ ] Story 1.3: Environment Variables e Configuracao Segura

### Fase 2: Fundacao de Dados
- [x] Story 2.1: Setup Supabase + Schema Inicial + Drizzle ORM
- [x] Story 2.2: Autenticacao com Supabase Auth + Middleware
- [x] Story 2.3: Persistencia de Conversas (CRUD + RLS)
- [x] Story 2.4: File URI Auto-Renewal (Edge Function Cron)
- [x] Story 2.5: Knowledge Base Backup + Migracao Manifest para DB
- [x] Story 2.6: Rate Limiting Persistente + Input Validation com Zod
- [x] Story 2.7: Security Headers + Health Check + Prompt Security Hardening

### Fase 3: Core UX + Chat Experience
- [x] Story 3.1: Design System (shadcn/ui + Design Tokens + Tailwind Config)
- [x] Story 3.2: Extracao de Componentes Reusaveis (Base + Chat)
- [x] Story 3.3: Refactor gemini.ts em Modulos + Streaming com Vercel AI SDK
- [ ] Story 3.4: Error Boundaries + Error Handling Strategy
- [ ] Story 3.5: Chat UX Redesign (Textarea, Avatares, Header, Actions, Scroll)
- [ ] Story 3.6: Type Safety + Model Config Externalization
- [ ] Story 3.7: Context Window Optimization (Cached Content API)

### Fase 4: Qualidade + Mobile + Acessibilidade
- [ ] Story 4.1: Setup Test Framework (Vitest + RTL + Playwright) + Unit Tests
- [ ] Story 4.2: Integration Tests (API, RLS, DB) + E2E Tests
- [ ] Story 4.3: CI/CD Pipeline (GitHub Actions + Vercel)
- [ ] Story 4.4: Monitoring e Observabilidade (Sentry + Structured Logging + Analytics)
- [ ] Story 4.5: Mobile-First Redesign (dvh, Touch Targets, Safe Areas)
- [ ] Story 4.6: Accessibility Pass 1 (ARIA, Live Regions, Focus, Contrast)
- [ ] Story 4.7: Loading/Suspense Boundaries + Greetings Personalizados
- [ ] Story 4.8: Token Usage Tracking + API Cost Management

### Fase 5: Polish & Launch Readiness
- [ ] Story 5.1: Branding (Favicon, App Icons, Meta Tags, SEO, Open Graph)
- [ ] Story 5.2: Empty States + Onboarding / Tutorial
- [ ] Story 5.3: Code Documentation + Hygiene (.env fix, error messages, fonts)
- [ ] Story 5.4: Docker Setup + Containerization
- [ ] Story 5.5: Polish Final (Feedback Haptico, i18n Prep)

### Fase 6: Features Legendarias (pos-launch)
- [ ] Story 6.1: Session Themes -- Temas Visuais por Mente (8-12h)
- [ ] Story 6.2: Multi-Mind Debates V1 -- Round-Robin (16-24h)
- [ ] Story 6.3: Mind Memory -- Recall Cross-Session (12-16h)
- [ ] Story 6.4: Rich Message Formatting -- Code, LaTeX, Collapsible (12-16h)
- [ ] Story 6.5: Mind Profile Pages -- /mind/{slug} (6-8h)
- [ ] Story 6.6: Conversation Sharing -- Link Publico (8-12h)
- [ ] Story 6.7: Voice Mode -- TTS/STT (16-24h)
- [ ] Story 6.8: Ambient Soundscapes (8-12h)
- [ ] Story 6.9: Accessibility Pass 2 -- Full WCAG AA (8-12h)
- [ ] Story 6.10: PWA / Offline Support (6-8h)

---

## Timeline

```
Semana 1 ......... Fase 0 (Dia 1) + Fase 1 (Quick Wins)
Semana 2-4 ....... Fase 2 (Database/Backend) || Fase 3 inicio (Design System/Frontend)
Semana 4-6 ....... Fase 3 (Streaming, Componentes, Chat UX)
Semana 6-8 ....... Fase 4 (Testes, CI/CD, Mobile, A11y)
Semana 8-10 ...... Fase 5 (Polish, SEO, Onboarding, Launch)
Semana 10+ ....... Fase 6 (Features Legendarias)
```

**Paralelizacao:** Fases 2 (backend) e 3-inicio (frontend/design) podem ser executadas em paralelo -- zero dependencia entre DATABASE SETUP e DESIGN SYSTEM.

## Riscos

| # | Risco | Probabilidade | Impacto | Mitigacao |
|---|-------|--------------|---------|-----------|
| 1 | Sistema inoperante (File URIs expirados) | 100% (atual) | CRITICO | Fase 0: re-ingestion imediata via CLI |
| 2 | Prompt injection + sem auth = risco legal | ALTA | CRITICO | Auth + input validation + prompt security em Fases 1-2 |
| 3 | Migracao file-based -> DB causa downtime | MEDIA | ALTO | Dual-read transition + script de rollback + staging |
| 4 | Context window overflow em conversas longas | ALTA | ALTO | Limite de historico + Cached Content API + summarization |
| 5 | Custos de API nao controlados | ALTA | ALTO | Rate limiting (Fase 1) + token tracking (Fase 4) |
| 6 | Scope creep na visao "legendaria" | ALTA | MEDIO | Fases estritamente incrementais. Features so apos Fase 5 |
| 7 | Termos legais do Gemini API para "clones digitais" | BAIXA | ALTO | Analise juridica na Fase 4 (QA-GAP-001) |
| 8 | Drizzle ORM ecossistema menor que Prisma | BAIXA | BAIXO | Schema PostgreSQL e portavel. Migrar se necessario |
| 9 | Race condition no manifest durante re-ingestion | MEDIA | MEDIO | Parar servidor (Fase 0). DB resolve permanentemente (Fase 2) |
| 10 | Performance em serverless com sync I/O | MEDIA | MEDIO | SYS-014 (async reads) na Fase 1 |

---

## Referencias

- **Technical Debt Assessment (FINAL):** `docs/prd/technical-debt-assessment.md`
- **QA Review:** `docs/reviews/qa-review.md`
- **System Architecture:** `docs/architecture/system-architecture.md`
- **DB Specialist Review:** `docs/reviews/db-specialist-review.md`
- **UX Specialist Review:** `docs/reviews/ux-specialist-review.md`
- **Frontend Spec:** `docs/frontend/frontend-spec.md`

---

*Epic criado por @pm (Morgan) -- Brownfield Discovery Phase 10*
*Synkra AIOX v2.0*
