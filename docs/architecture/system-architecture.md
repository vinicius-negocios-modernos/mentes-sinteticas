# System Architecture — Mentes Sintéticas (Brownfield Audit, FASE 1)

> **Author:** Aria (@architect) · **Date:** 2026-05-30 · **Type:** AS-IS audit of a production codebase
> **Supersedes:** prior FASE 1 audit dated 2026-03-06 (pre-dated the Supabase removal and current deploy state).
> **Scope:** System/architecture altitude. Detailed DB schema review = FASE 2 (@data-engineer). Detailed UX = FASE 3 (@ux). This document maps the system as it actually exists today and identifies system-level technical debt.

---

## 1. Executive Summary

Mentes Sintéticas is a **single Next.js 16 App Router application** (not a monorepo) that lets users chat and run debates with AI "synthetic minds" — personas backed by Google Gemini and a per-mind knowledge base (PDF/text files cached as Gemini File URIs). It is deployed to production on a Hostinger VPS via Docker Swarm + Traefik, with images built by GitHub Actions and pulled by a VPS cron.

The architecture is **clean and layered** for an app of this size: a clear `route → service → db` separation, a well-designed centralized error taxonomy, a structured logger with Sentry integration, lazy DB initialization to survive build-time, and Zod validation at the edges. The most material debts are **operational and dependency-related**, not structural: a deploy pipeline with no automated migration step or smoke test, dead/stale CI references to a removed Supabase, a Gemini free-tier coupling that drives a fragile File-URI renewal cron, and thin test coverage on the React component layer (56 components, near-zero component tests).

**Total system-level debts identified: 14** (4 high, 7 medium, 3 low).

---

## 2. Technology Stack (verified from package.json + code)

| Layer | Technology | Version | Role |
|-------|-----------|---------|------|
| Framework | Next.js (App Router, `output: standalone`) | 16.1.1 | SSR/routing/API routes |
| UI runtime | React / React DOM | 19.2.3 | Server + Client Components |
| Language | TypeScript | 5.9.3 | Type safety |
| Styling | Tailwind CSS v4 + `@tailwindcss/postcss` | 4.2.1 | Utility CSS |
| UI primitives | `radix-ui`, shadcn/ui (`components.json`), `lucide-react`, `class-variance-authority`, `tailwind-merge`, `sonner` | — | Component system + toasts |
| Theming | `next-themes` | 0.4.6 | Dark/light |
| ORM | Drizzle ORM + `postgres` (postgres-js driver) | 0.45.1 / 3.4.8 | DB access, schema, migrations |
| Database | PostgreSQL | 16 (VPS, Docker) | Persistence (~17 tables) |
| Auth | NextAuth v5 (`next-auth@5.0.0-beta.30`) + `@auth/drizzle-adapter` + `bcryptjs` | beta.30 / 1.11.1 / 3.0.3 | Credentials provider, JWT strategy |
| AI (streaming) | Vercel AI SDK (`ai`) + `@ai-sdk/google` | 6.0.116 / 3.0.43 | `streamText` chat |
| AI (legacy) | `@google/generative-ai` | 0.24.1 | Non-streaming path + memory extraction |
| Validation | Zod | 4.3.6 | Input + env + manifest schemas |
| Observability | `@sentry/nextjs` | 10.42.0 | Errors, tracing, request errors |
| Markdown/Math | `react-markdown`, `remark-gfm`, `remark-math`, `rehype-highlight`, `rehype-katex`, `katex`, `highlight.js` | — | Rich chat rendering |
| Offline | `idb` + service worker (`sw-register.ts`, `/offline`) | 8.0.3 | PWA / offline shell |
| Analytics | `@vercel/analytics`, `@vercel/speed-insights` | 1.6.1 / 1.3.1 | **Dead in prod — not on Vercel** |
| Testing | Vitest 4 + Testing Library + `@vitest/coverage-v8`; Playwright 1.58 (E2E) | — | 25 test files |

**Notable removal:** Supabase was fully removed (commit `aa0dade`). No `@supabase/*` in deps, no `supabase/` dir. Auth is NextAuth/Credentials; data is Drizzle/Postgres. **However, CI workflows still reference Supabase secrets** (see SYS-3).

---

## 3. Module / Folder Structure & Responsibilities

```
src/
├── app/            (47 files) — App Router: routes, layouts, error/loading boundaries, API
│   ├── api/        — chat, debate, conversations/share, memories, minds, usage, health, auth, signup
│   ├── chat/[mindId], debate/[debateId], mind/[slug], shared/[token] — dynamic routes
│   │                 each with error.tsx + loading.tsx boundaries (good discipline)
│   ├── offline/    — PWA offline fallback
│   ├── opengraph-image.tsx, apple-icon.tsx, */opengraph-image.tsx — OG/social images
│   └── error.tsx, global-error.tsx, not-found.tsx — top-level boundaries
├── components/     (57 files) — chat, debate, layout, memory, minds, onboarding, providers,
│                     skeletons, ui (shadcn). 56 .tsx, near-zero component tests (SYS-9)
├── lib/            (59 files)
│   ├── ai/         — client, config, chat, stream, context, knowledge, memory, prompts,
│   │                 greetings, pricing, index (barrel). Two Gemini clients coexist (SYS-7)
│   ├── services/   — conversations, messages, minds, debates, mind-memories, sharing,
│   │                 rate-limiter, token-usage (the data-access layer; all import @/db)
│   ├── validations/— chat, debate, manifest (Zod schemas)
│   ├── audio/, voice/, i18n/ — soundscapes, speech recog/synth, pt-BR messages
│   ├── auth.ts     — NextAuth config (Credentials + JWT)
│   ├── config.ts   — Zod-validated env (GEMINI_API_KEY, GEMINI_MODEL)
│   ├── errors.ts   — AppError taxonomy + classifyError (excellent)
│   ├── logger.ts   — structured logger + Sentry bridge (graceful degradation)
│   └── gemini.ts   — backward-compat re-export shim
├── db/             (13 files) — index.ts (lazy proxy) + schema/ (12 tables/relations)
├── config/, hooks/, types/, data/ — app config, custom hooks (6), shared types
└── middleware.ts, instrumentation.ts — auth gate (nodejs runtime), Sentry register
```

**Architectural verdict:** The layering is **disciplined**. API routes orchestrate; services own DB access; `lib/ai` isolates the LLM concern; validation lives at the edge. Error/loading boundaries exist per dynamic route. Above-average structure for a solo/small-team production app.

---

## 4. Dependencies — Count & Risk

- **Production deps:** 36 · **Dev deps:** 16.
- `npm outdated` shows **~29 packages behind**, mostly minor/patch (low risk). Notable:
  - `next-auth@5.0.0-beta.30` — **pinned to a beta** (latest beta.31). Auth is critical path; beta→beta breaking changes possible, no LTS guarantee. (SYS-2)
  - `@sentry/nextjs` 10.42→10.55, `ai` 6.0.116→6.0.193, `@ai-sdk/google` 3.0.43→3.0.80 — minor drift, low risk.
  - `@vercel/analytics` / `@vercel/speed-insights` — present but app is NOT on Vercel; scripts fail in prod (confirmed). Dead weight + console noise. (SYS-4)
  - Major upgrades available but intentionally held: `lucide-react` 0.577→1.x, `typescript` 5→6, `eslint` 9→10 — fine to defer.
- **Two Gemini SDKs** coexist (`ai`+`@ai-sdk/google` streaming, `@google/generative-ai` legacy/memory). Increases bundle + maintenance surface. (SYS-7)

---

## 5. Code Patterns & Conventions (observed)

| Concern | Pattern in use | Assessment |
|---------|---------------|------------|
| **Routing** | App Router, file-based, dynamic segments, per-route `error.tsx`/`loading.tsx` | Idiomatic, strong |
| **API design** | `route.ts`: parse → Zod validate → `auth()` → rate-limit → token-budget → service calls → stream/JSON | Consistent across chat/debate/memories. Good |
| **Data access** | Service modules in `lib/services/` wrap all Drizzle queries; routes avoid raw SQL (near-exception: `api/auth/signup` imports `@/db` directly) | Mostly clean separation |
| **State (client)** | Client Components (`"use client"`), `fetch()` to API routes (12 call sites), 6 custom hooks | Standard; no global store — fine at this scale |
| **DB init** | Lazy `getDb()` + `Proxy` default export — avoids throwing during `next build` when `DATABASE_URL` absent | Smart brownfield-safe pattern |
| **Error handling** | Centralized `AppError` taxonomy + `classifyError()` with PT-BR user messages, `recoverable`/`action` metadata | Excellent design |
| **Error mapping in routes** | `chat/route.ts` catch uses **string matching** (`msg.includes("not found")`, `"GEMINI_API_KEY"`) instead of the `AppError` taxonomy it already owns | Inconsistency / fragility (SYS-8) |
| **Logging** | Structured `logger` (JSON prod, colored dev), level filtering, Sentry breadcrumbs on warn, captureException on error, graceful if Sentry absent | Strong |
| **Validation** | Zod at every API boundary + env (`config.ts`) + manifest | Strong |
| **Config** | Env via `process.env`, partly Zod-validated (only `GEMINI_*`); rate/token limits read raw `process.env` with `parseInt` defaults | Partial — not all env centralized (SYS-5) |
| **Async side-effects** | Fire-and-forget for usage recording, memory extraction, cleanup — `.catch()` logged, non-blocking | Pragmatic; acceptable with logging |
| **i18n** | Single `pt-BR` bundle; user strings mostly hardcoded PT-BR in routes/errors | Single-locale by design; not fully centralized |

---

## 6. Integration Points

| Integration | How it's wired | Notes / Risk |
|-------------|----------------|--------------|
| **Gemini (streaming)** | `lib/ai/stream.ts` → Vercel AI SDK `streamText` with `@ai-sdk/google`; knowledge injected as priming user/assistant messages built from File URIs | Core path. Free-tier limits drive `MAX_FILE_URIS_PER_REQUEST=8` cap |
| **Gemini File URIs** | `lib/ai/knowledge.ts` reads URIs from `file_uri_cache` (primary) with manifest JSON fallback; filters expired URIs (~48h TTL) | **Fragile**: URIs expire ~48h, kept alive by VPS cron (`renew-uris.sh`). External-state coupling (SYS-1) |
| **Gemini (legacy)** | `lib/ai/client.ts` keeps a 2nd `@google/generative-ai` singleton for non-streaming + memory extraction | Dual-SDK debt (SYS-7) |
| **NextAuth** | `lib/auth.ts` Credentials + JWT, `trustHost:true`, bcrypt compare; `middleware.ts` gates routes (`runtime="nodejs"` — required by bcrypt/pg) | Sound. Beta dependency is the main risk |
| **Database** | `db/index.ts` lazy postgres-js pool (`max:10`, idle 20s, connect 10s); Drizzle schema in `db/schema/` | Pool sized for 1 replica. Schema review = FASE 2 |
| **Sentry** | `instrumentation.ts` registers server/edge; `next.config.ts` wraps build only if `SENTRY_AUTH_TOKEN` present; `logger` bridges runtime capture | Well-isolated, optional, graceful. prod `tracesSampleRate` 0.1 |
| **Deploy / CI** | GHCR image built by Actions on push to main; VPS cron pulls + `docker stack deploy`; **migrations manual** via SSH tunnel | No automated migration or post-deploy smoke (SYS-10, SYS-11) |
| **PWA / offline** | `sw-register.ts` + `/offline` route + `idb` | Standard |

---

## 7. Configuration & Secrets

- **`.env` (mode 600)** present locally with `.env.example` + `.env.local`. Prod secrets injected via Docker Swarm env (`${DATABASE_URL}`, `${AUTH_SECRET}`, `${GEMINI_API_KEY}` in `docker-compose.prod.yml`). Swarm does **not** auto-read `.env` (documented lesson).
- **Hardcoded values flagged:**
  - `docker-compose.prod.yml`: `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` hardcoded to the prod domain (acceptable single-env, not portable). (SYS-6)
  - `next.config.ts` CSP `connect-src` hardcodes `generativelanguage.googleapis.com` + `*.ingest.sentry.io` (correct but provider-coupled).
  - `lib/ai/knowledge.ts:15` `MAX_FILE_URIS_PER_REQUEST = 8` — magic constant tied to Gemini free tier, not env-configurable.
  - Rate/token limits read `process.env` directly with inline `parseInt` defaults (`rate-limiter.ts`) — outside central Zod config.
- **Secrets exposure risk:** No secrets found committed in source (config reads env only). `.env` gitignored (mode 600). Low risk. CI still declares `NEXT_PUBLIC_SUPABASE_*` secrets that are now meaningless (cleanup, not leak).

---

## 8. System-Level Technical Debts

| ID | Débito | Impacto | Esforço (rough) | Notas |
|----|--------|---------|-----------------|-------|
| **SYS-1** | Gemini File URI expiration (~48h) kept alive by external VPS cron; app depends on cache freshness | HIGH | M | `knowledge.ts` + `renew-uris.sh`. Cron stops → minds lose knowledge silently. Prefer self-healing re-upload on expiry |
| **SYS-2** | NextAuth pinned to `5.0.0-beta.30` (beta) | HIGH | M | Auth is critical path; beta→beta breaking changes possible, no LTS. Track stable v5, pin exact + test gate |
| **SYS-3** | CI (`ci.yml`, `e2e.yml`) still injects `NEXT_PUBLIC_SUPABASE_*` after Supabase removal | MED | S | Dead config; misleads future devs. Remove secret refs from workflows |
| **SYS-4** | `@vercel/analytics` + `@vercel/speed-insights` shipped but app not on Vercel; scripts fail in prod | MED | S | Confirmed failing. Remove deps + script tags; cuts console/CSP noise |
| **SYS-5** | Env validation partial — only `GEMINI_*` Zod-validated; `DATABASE_URL`, `AUTH_SECRET`, rate/token limits read raw `process.env` | MED | M | Centralize required env in `config.ts` Zod schema → fail-fast at boot |
| **SYS-6** | Hardcoded prod URLs + magic constants (`NEXTAUTH_URL`, `MAX_FILE_URIS_PER_REQUEST=8`, rate-limit defaults) | LOW | S | Not portable / not tunable without rebuild. Externalize to env |
| **SYS-7** | Two Gemini SDKs coexist (`@ai-sdk/google` streaming + `@google/generative-ai` legacy/memory) | MED | M | Dual maintenance + bundle. Migrate memory extraction to AI SDK, drop legacy |
| **SYS-8** | `chat/route.ts` catch uses string-matching instead of existing `AppError`/`classifyError` taxonomy | MED | S | Brittle to message changes. Route catch through `classifyError()` |
| **SYS-9** | 56 React components, near-zero component tests (25 test files, almost all on `lib/`) | HIGH | L | UI regressions undetected by CI. Cover chat-interface, conversation-drawer, debate views first |
| **SYS-10** | DB migrations applied **manually** via SSH tunnel; no automated migration step in deploy | HIGH | M | Schema/code drift risk in prod (M1 local_path mismatch was a symptom). Add gated migration runner |
| **SYS-11** | No automated post-deploy smoke; cron `docker stack deploy` healthcheck only on `GET /` | MED | M | Broken `/api/chat` or Gemini auth passes `/` healthcheck. Add `/api/health` + smoke |
| **SYS-12** | Fire-and-forget side effects (usage record, memory extract, cleanup) — failures only logged, no retry/DLQ | LOW | M | Acceptable now; under load, cost accounting can silently drift. Durable queue if billing matters |
| **SYS-13** | Single-locale PT-BR strings hardcoded across routes/errors despite `i18n/` module existing | LOW | M | i18n infra bypassed; future localization = large refactor. Route strings through i18n now |
| **SYS-14** | `api/auth/signup/route.ts` imports `@/db` directly, bypassing the `lib/services/` layer | MED | S | Layer-boundary leak; user creation should live in a `users` service for testability/consistency |

---

## 9. Architectural Strengths (preserve these)

- Clean `route → service → db` layering with Zod at the edges.
- Excellent centralized error taxonomy (`lib/errors.ts`) and structured logger with optional Sentry.
- Lazy DB proxy that keeps `next build` green without `DATABASE_URL` — brownfield-safe, worth keeping.
- Per-route `error.tsx` + `loading.tsx` discipline across all dynamic segments.
- Security headers + CSP locked down in `next.config.ts`; middleware auth gate on `nodejs` runtime (correct for bcrypt/pg).
- Sentry wrapping conditional/optional — builds never break on missing token.

---

## 10. Recommendations Priority (input for FASE 4/8)

1. **Operational hardening first** (SYS-10, SYS-11, SYS-1): automated migrations, real post-deploy smoke, File-URI self-healing — the production-fragility cluster.
2. **Dependency hygiene** (SYS-2, SYS-3, SYS-4): stabilize NextAuth, purge Supabase/Vercel dead refs.
3. **Consistency cleanups** (SYS-5, SYS-7, SYS-8, SYS-14): centralize env, unify Gemini SDK, route errors through taxonomy, push signup into a service.
4. **Test coverage** (SYS-9): component-level tests for chat/debate — highest user-facing risk.

> **Trade-off note:** SYS-1 (File URI cron) is the single most consequential debt — cheap day-to-day, catastrophic and silent when it fails. Prioritize a self-healing re-upload path over incremental cron babysitting.
</content>
