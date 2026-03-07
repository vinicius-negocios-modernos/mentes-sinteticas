# System Architecture - Mentes Sinteticas

**Phase:** Brownfield Discovery - Phase 1 (System Documentation)
**Author:** @architect (Aria)
**Date:** 2026-03-06
**Status:** Complete

---

## 1. Project Overview

**Mentes Sinteticas** is a conversational AI application that allows users to chat with "synthetic minds" -- digital clones of real-world thinkers. The system uses Google Gemini's generative AI API with file-based knowledge retrieval to create persona-driven conversations grounded in uploaded documents.

**Core Concept:** Users select a thinker from a catalog, and the app creates a Gemini chat session pre-loaded with that thinker's knowledge base files (uploaded to Google's File API), plus a system instruction that forces the model to embody the persona.

---

## 2. Technology Stack

### Runtime & Framework

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.1.1 | Full-stack React framework (App Router) |
| React | 19.2.3 | UI library |
| React DOM | 19.2.3 | React rendering |
| TypeScript | ^5 | Type safety |
| Node.js | 18+ (assumed) | Server runtime |

### Dependencies (Production)

| Package | Version | Purpose |
|---------|---------|---------|
| `@google/generative-ai` | ^0.24.1 | Google Gemini SDK (client-side generative AI) |
| `next` | 16.1.1 | Framework |
| `react` | 19.2.3 | UI |
| `react-dom` | 19.2.3 | DOM rendering |
| `react-markdown` | ^10.1.0 | Markdown rendering in chat messages |

### Dependencies (Development)

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/node` | ^20 | Node.js type definitions |
| `@types/react` | ^19 | React type definitions |
| `@types/react-dom` | ^19 | React DOM type definitions |
| `dotenv` | ^17.2.3 | Environment variable loading (scripts) |
| `eslint` | ^9 | Linting |
| `eslint-config-next` | 16.1.1 | Next.js ESLint rules |
| `tsx` | ^4.21.0 | TypeScript execution for scripts |
| `typescript` | ^5 | TypeScript compiler |

### Styling

- **Tailwind CSS v4** (via Next.js 16 built-in support -- no tailwind.config file, no postcss.config file)
- **CSS Custom Properties** defined in `globals.css`
- **Custom glass-panel utility class** for glassmorphism effect
- **CSS Modules** present (`page.module.css`) but **NOT used** by the current page -- leftover from Create Next App scaffold

### Fonts

- **Geist** and **Geist Mono** (loaded via `next/font/google`)

---

## 3. Directory Structure

```
mentes-sinteticas/
|-- .claude/                    # AIOX framework configuration
|-- .github/agents/             # AIOX agent definitions (12 agents)
|-- .aiox-core/                 # AIOX framework core (not analyzed)
|-- data/
|   |-- minds_manifest.json     # Registry of uploaded minds and their Gemini file URIs
|-- knowledge_base/
|   |-- Antonio Napole/         # Knowledge files for one mind
|       |-- M1..M8 files        # Structured persona modules (8 files)
|       |-- overview            # Overview document
|       |-- analysis/           # 12 analysis documents
|-- scripts/
|   |-- ingest_mind.ts          # CLI tool to upload knowledge files to Gemini File API
|   |-- list_models.ts          # CLI tool to list available Gemini models
|-- src/
|   |-- app/
|   |   |-- globals.css         # Global styles (CSS custom properties, glass-panel, scrollbar)
|   |   |-- page.module.css     # UNUSED -- leftover from scaffold
|   |   |-- layout.tsx          # Root layout (Server Component)
|   |   |-- page.tsx            # Home page (Server Component) -- mind selection grid
|   |   |-- actions.ts          # Server Actions (getMinds, sendMessage)
|   |   |-- chat/
|   |       |-- [mindId]/
|   |           |-- page.tsx    # Chat page (Server Component) -- validates mind, renders ChatInterface
|   |-- components/
|   |   |-- ChatInterface.tsx   # Chat UI (Client Component) -- message list, input, send logic
|   |-- lib/
|       |-- gemini.ts           # Gemini SDK wrapper (manifest reading, chat session creation)
|-- .env.local                  # GEMINI_API_KEY (actual key present)
|-- .env                        # AIOX template env (all values empty)
|-- .env.example                # AIOX template env (all values empty)
|-- package.json
|-- tsconfig.json
|-- next.config.ts              # Empty config (no custom settings)
|-- eslint.config.mjs           # ESLint flat config (next core-web-vitals + typescript)
```

### File Count Summary

| Category | Count |
|----------|-------|
| Source files (src/) | 6 (.tsx/.ts) |
| Style files | 2 (.css) |
| Scripts | 2 (.ts) |
| Data files | 1 (.json) |
| Knowledge base files | ~22 documents |
| Config files | 5 (package.json, tsconfig, next.config, eslint, .env.local) |

---

## 4. Architecture Patterns

### 4.1 Next.js App Router

The application uses Next.js App Router with the following pattern:

| Route | Component Type | Description |
|-------|---------------|-------------|
| `/` | Server Component | Lists available minds from manifest file |
| `/chat/[mindId]` | Server Component (page) + Client Component (ChatInterface) | Chat with a specific mind |

### 4.2 Server Components vs Client Components

- **Server Components:** `layout.tsx`, `page.tsx`, `chat/[mindId]/page.tsx` -- handle data fetching, validation, and page structure
- **Client Components:** `ChatInterface.tsx` (`"use client"`) -- handles interactive chat UI, state management, and message sending
- **Server Actions:** `actions.ts` (`"use server"`) -- bridges client-side calls to server-side Gemini SDK operations

### 4.3 Data Flow Architecture

```
User Input (Client)
    |
    v
ChatInterface.tsx ("use client")
    |-- local state: messages[], input, isLoading
    |-- transforms messages to Gemini history format
    |-- calls sendMessage() Server Action
    |
    v
actions.ts ("use server")
    |-- sendMessage(mindName, message, history)
    |-- calls createMindChat() from lib/gemini.ts
    |
    v
lib/gemini.ts (Server-side only)
    |-- reads data/minds_manifest.json from filesystem (fs.readFileSync)
    |-- constructs Gemini chat session with:
    |   |-- System instruction (persona prompt)
    |   |-- File parts (uploaded document URIs)
    |   |-- Conversation history (hydrated with file context every call)
    |-- sends message via Gemini SDK
    |
    v
Google Gemini API (gemini-2.0-flash)
    |-- processes with file context + system instruction
    |-- returns generated text
    |
    v
Response flows back through Server Action -> Client state -> ReactMarkdown rendering
```

### 4.4 Knowledge Base Architecture

The system uses a two-phase approach:

1. **Ingestion (offline):** `scripts/ingest_mind.ts` walks a `knowledge_base/{MindName}/` directory, uploads each file to Google's Generative AI File API, and records the file URIs in `data/minds_manifest.json`.

2. **Runtime retrieval:** On each chat message, `lib/gemini.ts` reads the manifest, gets file URIs for the requested mind, and injects them as `fileData` parts in the first turn of chat history. This means every API call re-sends all file references.

**Current mind:** "Antonio Napole" with 21 files (8 structured persona modules M1-M8, 1 overview, 12 analysis documents).

### 4.5 State Management

- **No global state management** (no Redux, Zustand, Context, etc.)
- Chat state is local to `ChatInterface` component via `useState`
- **No persistence** -- conversation history is lost on page refresh/navigation
- History is reconstructed server-side on every `sendMessage` call by prepending file context

---

## 5. External Integrations

### 5.1 Google Gemini API

| Aspect | Details |
|--------|---------|
| SDK | `@google/generative-ai` v0.24.1 |
| Model | `gemini-2.0-flash` (hardcoded) |
| API Features Used | Chat sessions, System Instructions, File API (file URIs) |
| Authentication | API key via `GEMINI_API_KEY` env var |
| Generation Config | temperature=0.7, topK=40, topP=0.95, maxOutputTokens=8192 |

### 5.2 Google Generative AI File API

| Aspect | Details |
|--------|---------|
| SDK | `@google/generative-ai/server` (GoogleAIFileManager) |
| Used In | `scripts/ingest_mind.ts` only (offline ingestion) |
| Supported MIME Types | PDF, TXT, MD, CSV, JS, PY (defaults to text/plain) |
| File State Polling | Yes, with 2-second intervals |

### 5.3 No Database

The application has **no database**. All data is stored in:
- `data/minds_manifest.json` -- file-system JSON (mind registry)
- `knowledge_base/` -- raw document files (uploaded to Google, originals kept locally)

---

## 6. Configuration Analysis

### 6.1 Environment Variables

| Variable | File | Used By | Status |
|----------|------|---------|--------|
| `GEMINI_API_KEY` | `.env.local` | `lib/gemini.ts`, scripts | **ACTIVE** (key present in plaintext) |
| All other vars in `.env` | `.env` | Nothing in this project | AIOX template only, unused |

### 6.2 TypeScript Configuration

- **Target:** ES2017
- **Strict mode:** Enabled
- **Module resolution:** Bundler
- **Path aliases:** `@/*` -> `./src/*`
- **JSX:** react-jsx
- **Incremental compilation:** Enabled

### 6.3 Next.js Configuration

- **Empty config** -- no custom settings whatsoever
- No image optimization config
- No redirects/rewrites
- No headers/CORS config
- No middleware

### 6.4 ESLint Configuration

- Flat config format (ESLint 9)
- Extends: `next/core-web-vitals`, `next/typescript`
- No custom rules

---

## 7. Code Patterns Inventory

### 7.1 Patterns Used

| Pattern | Location | Assessment |
|---------|----------|------------|
| Server Components | `page.tsx`, `chat/[mindId]/page.tsx` | Correct usage for data fetching |
| Client Components | `ChatInterface.tsx` | Correct usage for interactive UI |
| Server Actions | `actions.ts` | Correct pattern for RPC-style server calls |
| Dynamic Routes | `chat/[mindId]/` | Standard Next.js pattern |
| Path Aliases | `@/lib/`, `@/app/`, `@/components/` | Consistent usage |
| Async Server Components | `page.tsx`, `chat/[mindId]/page.tsx` | Modern React 19 pattern |
| Promise-based params | `chat/[mindId]/page.tsx` | Next.js 16 pattern (params as Promise) |

### 7.2 Anti-Patterns Identified

| Anti-Pattern | Location | Severity |
|-------------|----------|----------|
| `any` type for history parameter | `actions.ts:9`, `gemini.ts:45` | MEDIUM |
| `any` type for error | `actions.ts:18` | LOW |
| `any` type for manifest data | `ingest_mind.ts:38`, `ingest_mind.ts:96-97` | LOW |
| Synchronous file reads (`readFileSync`) in async functions | `gemini.ts:33,39` | MEDIUM |
| Module-level side effects (throw on missing API key) | `gemini.ts:8` | HIGH |
| Hardcoded model name | `gemini.ts:55` | MEDIUM |
| Hardcoded generation config | `gemini.ts:63-68` | LOW |
| Console.log left in production code | `actions.ts:10`, `ChatInterface.tsx:29` | LOW |
| No input sanitization | `ChatInterface.tsx`, `actions.ts` | HIGH |
| Array index as React key | `ChatInterface.tsx:64` | LOW |

---

## 8. Technical Debt Assessment

### 8.1 CRITICAL -- Security Issues

| Issue | Location | Impact | Recommendation |
|-------|----------|--------|----------------|
| **API key exposed in `.env.local`** | `.env.local:1` | The Gemini API key is stored in plaintext. While `.env.local` is gitignored, it was readable by this analysis. The key format `AIzaSy...` is a real Google API key. | Rotate key immediately. Use secret management. Never log or expose. |
| **No input validation on user messages** | `actions.ts:9`, `ChatInterface.tsx:48` | Users can send arbitrary strings to the Gemini API. No length limits, no content filtering, no prompt injection protection. | Add server-side input validation, length limits, and content filtering. |
| **No input sanitization on mindId URL parameter** | `chat/[mindId]/page.tsx:7` | The `mindId` is decoded and displayed directly. While React escapes by default, the value is passed unchecked to `getMinds()` comparison and `createMindChat()`. | Validate mindId against allowlist before any processing. |
| **No rate limiting** | Global | Any user can make unlimited API calls, burning API credits and potentially causing billing issues. | Add rate limiting middleware (per-IP or per-session). |
| **No authentication** | Global | The application is publicly accessible. Anyone can use the Gemini API through it. | Add authentication (NextAuth, Clerk, or similar). |
| **`.env` file committed to repo** | `.env` | While empty, the file structure reveals expected secrets. The `.gitignore` has `.env*` but the git status shows it as committed. | Remove `.env` from tracking, keep only `.env.example`. |

### 8.2 HIGH -- Architecture Issues

| Issue | Location | Impact | Recommendation |
|-------|----------|--------|----------------|
| **No conversation persistence** | `ChatInterface.tsx` | All conversation history is lost on page refresh. Users cannot resume conversations. | Add database (Supabase/Prisma) for conversation storage. |
| **File context re-sent on every message** | `gemini.ts:91-106` | Every API call prepends ALL file URIs to history. With 21 files per mind, this grows the context window rapidly and increases latency/cost. | Use Gemini's cached content feature or implement a more efficient context strategy. |
| **Stateless chat architecture** | `gemini.ts:45-113` | The chat session is recreated from scratch on every `sendMessage` call. No server-side session caching. | Implement server-side session management or use streaming with persistent connections. |
| **Module-level crash on missing env var** | `gemini.ts:7-9` | If `GEMINI_API_KEY` is missing, the entire module throws at import time, crashing the server. | Move validation to function level with graceful error handling. |
| **No error boundary** | Global | Client-side errors crash the entire page. No recovery mechanism. | Add React Error Boundaries and a global error.tsx page. |
| **No loading.tsx or error.tsx** | `app/`, `app/chat/[mindId]/` | No Next.js built-in loading states or error handling pages. | Add `loading.tsx` and `error.tsx` at route levels. |
| **Synchronous filesystem reads on server** | `gemini.ts:33,39` | `fs.readFileSync` blocks the Node.js event loop. In production with concurrent users, this degrades performance. | Use `fs.promises.readFile` (async). |

### 8.3 MEDIUM -- Code Quality Issues

| Issue | Location | Impact | Recommendation |
|-------|----------|--------|----------------|
| **No TypeScript interfaces for API responses** | `actions.ts` | Server action returns `{ success, text }` or `{ success, error }` without a typed interface. | Define response types/discriminated unions. |
| **`any` types throughout** | `actions.ts:9,18`, `gemini.ts:45`, `ingest_mind.ts` | Defeats TypeScript's purpose. No compile-time safety on chat history format. | Define proper types for Gemini history, API responses, manifest data. |
| **No separation of concerns in `gemini.ts`** | `lib/gemini.ts` | File reading, manifest parsing, model config, chat creation, and prompt engineering are all in one file. | Split into: manifest service, gemini client config, prompt templates, chat service. |
| **Hardcoded strings (Portuguese)** | `page.tsx`, `ChatInterface.tsx`, `gemini.ts` | UI text, system prompts, and error messages are hardcoded inline. No i18n support. | Extract to constants file or i18n framework. |
| **Unused CSS module** | `page.module.css` | 142 lines of unused scaffold CSS. Dead code. | Delete the file. |
| **Console.log in production code** | `actions.ts:10,20`, `ChatInterface.tsx:29` | Debug logging left in. Leaks information. | Remove or replace with proper logging framework. |
| **No JSDoc or code documentation** | All files | No function documentation. Complex logic in `gemini.ts` has inline comments but no formal docs. | Add JSDoc to exported functions. |

### 8.4 LOW -- Missing Infrastructure

| Issue | Impact | Recommendation |
|-------|--------|----------------|
| **No tests whatsoever** | Zero test coverage. No unit, integration, or e2e tests. | Add Jest/Vitest for unit tests, Playwright for e2e. |
| **No CI/CD pipeline** | `.github/` only has agent definitions, no workflows. No automated builds, tests, or deployments. | Add GitHub Actions for lint, typecheck, test, build. |
| **No logging/monitoring** | No structured logging. No error tracking (Sentry DSN empty). No analytics. | Add structured logging, Sentry, and basic analytics. |
| **No middleware** | No Next.js middleware for auth, rate limiting, headers, CORS. | Add `middleware.ts` at project root. |
| **No API route alternative** | All server communication via Server Actions. No REST/GraphQL API. | Consider API routes for future mobile/external clients. |
| **No Docker/containerization** | No Dockerfile, no docker-compose. | Add for consistent deployments. |
| **No health check endpoint** | No way to verify app is running. | Add `/api/health` route. |
| **No SEO optimization** | Minimal metadata. No OpenGraph, no robots.txt, no sitemap. | Add metadata, OG images, sitemap generation. |
| **No PWA support** | No service worker, no manifest.json. | Add if offline support desired. |
| **`html lang="en"` but content is Portuguese** | `layout.tsx:26` | Accessibility/SEO mismatch. | Change to `lang="pt-BR"`. |

---

## 9. Knowledge Base Analysis

### 9.1 Structure

The knowledge base follows a structured persona model with 8 modules (M1-M8):

| Module | Content |
|--------|---------|
| M1 | Historia de Vida e Formacao |
| M2 | Sistemas de Pensamento |
| M3 | Dominio e Expertise |
| M4 | Comunicacao e Expressao |
| M5 | Valores e Principios |
| M6 | Contexto e Perspectiva |
| M7 | Legado e Impacto |
| M8 | Fontes e Referencias |

Plus an `overview` file and 12 `analysis/` documents providing deep dives.

### 9.2 File Format Issues

- Most knowledge base files have **no file extension** (not `.txt`, not `.md`)
- Only `M1 - Historia de Vida e Formacao.md` has a `.md` extension
- File names contain special characters (accents, colons, quotes, em dashes)
- The ingestion script defaults to `text/plain` for extensionless files -- this works but is fragile

### 9.3 Gemini File API Considerations

- Files uploaded to Gemini File API have a **48-hour TTL** (they expire)
- The manifest stores URIs but there is **no expiration check or re-upload mechanism**
- If file URIs expire, the chat will fail silently or with cryptic errors
- **No deduplication** -- re-running ingestion could upload duplicate files (mitigated by `localPath` check, but fragile)

---

## 10. Scripts Analysis

### 10.1 `scripts/ingest_mind.ts`

**Purpose:** Upload knowledge base files to Google Gemini File API and record URIs in manifest.

**Execution:** `npx tsx scripts/ingest_mind.ts "Mind Name"`

**Issues:**
- Uses `dotenv` to load `.env.local` directly (works but inconsistent with Next.js env loading)
- Error message says "Video processing failed" (copy-paste from video example)
- Saves manifest incrementally (good for crash recovery)
- No cleanup of previously uploaded files that may have expired

### 10.2 `scripts/list_models.ts`

**Purpose:** List available Gemini models via REST API.

**Execution:** `npx tsx scripts/list_models.ts`

**Issues:**
- Exposes API key in URL query parameter (`?key=${apiKey}`) -- visible in logs
- Uses `fetch` directly instead of SDK method
- Utility script, not production-critical

---

## 11. Performance Considerations

| Concern | Details | Severity |
|---------|---------|----------|
| **Context window bloat** | 21 file URIs + growing history re-sent every message | HIGH |
| **Synchronous file I/O** | `readFileSync` blocks event loop | MEDIUM |
| **No caching** | Manifest is re-read from disk on every request | MEDIUM |
| **No streaming** | Responses wait for full completion before display | MEDIUM |
| **No CDN/image optimization** | Next.js image optimization not configured | LOW |
| **No code splitting beyond routes** | Single ChatInterface component, no lazy loading | LOW |

---

## 12. Scalability Assessment

### Current State: Single-User Prototype

The application is designed as a **single-user prototype** with no multi-tenancy, no authentication, and no persistence. The architecture has the following scaling limitations:

| Dimension | Current | Production Need |
|-----------|---------|----------------|
| Users | 1 (implied) | Multi-user with auth |
| Minds | 1 (Antonio Napole) | N minds with admin CRUD |
| Conversations | Ephemeral (in-memory) | Persisted with history |
| Sessions | Stateless (recreated) | Cached or persistent |
| API calls | Unlimited, unmetered | Rate-limited, metered |
| Deployment | `npm run dev` | Containerized, CI/CD |
| Monitoring | Console.log | Structured logging + APM |

---

## 13. Dependency Health

| Package | Installed | Latest (approx) | Status |
|---------|-----------|-----------------|--------|
| `next` | 16.1.1 | 16.x | Current |
| `react` | 19.2.3 | 19.x | Current |
| `@google/generative-ai` | ^0.24.1 | 0.24+ | Current |
| `react-markdown` | ^10.1.0 | 10.x | Current |
| `typescript` | ^5 | 5.x | Current |
| `eslint` | ^9 | 9.x | Current |
| `dotenv` | ^17.2.3 | 17.x | Current |
| `tsx` | ^4.21.0 | 4.x | Current |

**Assessment:** All dependencies are recent and up to date. No outdated packages detected. The stack is modern (Next.js 16, React 19).

---

## 14. Summary of Findings

### What Works Well

1. Clean Server Component / Client Component separation
2. Server Actions pattern correctly applied
3. Path aliases (`@/`) consistently used
4. Knowledge base structured with a thoughtful 8-module persona model
5. Ingestion script with incremental save for crash recovery
6. Modern stack (Next.js 16, React 19, Gemini 2.0 Flash)
7. Glassmorphism UI design with custom CSS (visually polished)

### Critical Gaps for Production

1. **Security:** No auth, no rate limiting, no input validation, API key exposure risk
2. **Persistence:** No database, no conversation history, no session management
3. **Reliability:** No error boundaries, no loading states, file URI expiration not handled
4. **Quality:** Zero tests, no CI/CD, console.log debugging
5. **Performance:** Stateless chat recreation, synchronous I/O, no streaming, context bloat
6. **Operations:** No monitoring, no health checks, no containerization

### Recommended Priority Order

1. **P0 (Immediate):** Rotate API key, add authentication, add rate limiting
2. **P1 (Short-term):** Add database for persistence, implement error handling, add streaming
3. **P2 (Medium-term):** Add tests, CI/CD pipeline, monitoring
4. **P3 (Long-term):** Optimize Gemini context strategy, add admin CRUD for minds, i18n

---

## 15. File Inventory

All source files in the project:

| File | Type | Lines | Role |
|------|------|-------|------|
| `src/app/layout.tsx` | Server Component | 32 | Root layout, fonts, metadata |
| `src/app/page.tsx` | Server Component | 73 | Home page, mind selection |
| `src/app/actions.ts` | Server Actions | 23 | getMinds, sendMessage |
| `src/app/chat/[mindId]/page.tsx` | Server Component | 35 | Chat page, mind validation |
| `src/components/ChatInterface.tsx` | Client Component | 116 | Chat UI, message handling |
| `src/lib/gemini.ts` | Server Library | 114 | Gemini SDK wrapper, manifest reader |
| `src/app/globals.css` | Stylesheet | 67 | Global styles, glass-panel, scrollbar |
| `src/app/page.module.css` | Stylesheet | 141 | UNUSED (scaffold leftover) |
| `scripts/ingest_mind.ts` | CLI Script | 150 | Knowledge base ingestion to Gemini File API |
| `scripts/list_models.ts` | CLI Script | 39 | Gemini model listing utility |
| `data/minds_manifest.json` | Data | 156 | Mind registry with file URIs |

**Total application code:** ~393 lines of TypeScript/TSX (excluding CSS and data files).

---

*This document was generated as Phase 1 of Brownfield Discovery by @architect (Aria). It feeds into Phase 2 (@data-engineer), Phase 3 (@ux-design-expert), and Phase 4 (@architect technical debt draft).*
