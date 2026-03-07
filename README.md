# Mentes Sinteticas — O Atheneum Digital

Dialogue com as maiores mentes da humanidade. Uma experiencia imersiva de conversas com mentes sinteticas inspiradas em pensadores historicos.

**Dark Academia meets Sci-Fi.**

## Tech Stack

- **Framework:** Next.js 16.1.1 (App Router)
- **Language:** TypeScript 5
- **UI:** React 19.2.3, Tailwind CSS v4, shadcn/ui (New York)
- **AI:** Vercel AI SDK v6, @ai-sdk/google, Google Gemini API
- **Database:** Supabase (PostgreSQL) via Drizzle ORM
- **Auth:** Supabase Auth (email/password) with @supabase/ssr
- **Theming:** next-themes (dark default)
- **Monitoring:** Sentry (error tracking), Vercel Analytics, SpeedInsights
- **Testing:** Vitest, @testing-library/react, Playwright (E2E)
- **Logging:** Structured logger with Sentry integration (`src/lib/logger.ts`)

## Prerequisites

- Node.js 18+
- npm (or yarn/pnpm)
- Supabase project (for database and auth)
- Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

## Setup

```bash
# 1. Clone the repository
git clone https://github.com/vinicius-negocios-modernos/mentes-sinteticas.git
cd mentes-sinteticas

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your actual values (see Environment Variables below)

# 4. Apply database migrations (requires Supabase CLI linked)
# supabase db push

# 5. Seed database from manifest (optional)
# npx tsx scripts/seed-db.ts

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Environment Variables

Copy `.env.example` to `.env` and fill in your values. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `DATABASE_URL` | Yes | PostgreSQL connection string (pooler, port 6543) |
| `DIRECT_URL` | Yes | PostgreSQL direct connection (port 5432, for migrations) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `GEMINI_MODEL` | No | Model name (default: `gemini-2.0-flash`) |
| `AI_PRESET` | No | Generation preset: `balanced`, `creative`, `precise` |
| `RATE_LIMIT_PER_MINUTE` | No | Max requests/minute (default: 20) |
| `RATE_LIMIT_PER_HOUR` | No | Max requests/hour (default: 200) |
| `TOKEN_DAILY_LIMIT` | No | Max tokens/day/user (default: 500000) |
| `TOKEN_MONTHLY_LIMIT` | No | Max tokens/month/user (default: 5000000) |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN for error monitoring |
| `NEXT_PUBLIC_APP_URL` | No | App URL for metadata/OG (default: Vercel URL) |

See `.env.example` for the full list with descriptions.

## Development Commands

```bash
npm run dev        # Start dev server (http://localhost:3000)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint check
npm run typecheck  # TypeScript type check
npm run test       # Run Vitest unit/integration tests
npm run test:e2e   # Run Playwright E2E tests
```

## Architecture

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/
│   │   ├── chat/           # POST /api/chat — streaming AI endpoint
│   │   ├── health/         # GET /api/health — DB + Auth health check
│   │   └── usage/          # GET /api/usage — token usage summary
│   ├── chat/[mindId]/      # Chat page per mind
│   ├── login/              # Login page
│   ├── signup/             # Signup page
│   └── layout.tsx          # Root layout (fonts, theme, auth nav)
│
├── components/
│   ├── chat/               # Chat UI (interface, message, input, header, empty-state, conversation-list)
│   ├── layout/             # App header & footer
│   ├── skeletons/          # Loading skeletons (chat, mind-card, conversation-list)
│   ├── providers/          # Theme provider
│   ├── ui/                 # shadcn/ui primitives (button, card, dialog, etc.)
│   └── error-boundary.tsx  # Error boundary with recovery UI
│
├── db/
│   ├── schema/             # Drizzle ORM table definitions
│   └── index.ts            # DB connection singleton
│
├── lib/
│   ├── ai/                 # AI module (see below)
│   ├── services/           # Business logic services (see below)
│   ├── supabase/           # Supabase client (server + browser)
│   ├── validations/        # Zod schemas (chat, manifest)
│   ├── config.ts           # App-level env config (Gemini key)
│   ├── errors.ts           # Error taxonomy (AppError hierarchy)
│   ├── logger.ts           # Structured logger (dev/prod, Sentry)
│   ├── types.ts            # Shared TypeScript types
│   └── utils.ts            # Utility functions (cn)
│
├── scripts/                # CLI scripts (ingest, seed, refresh, validate, upload)
└── data/                   # minds_manifest.json (legacy)
```

### AI Module (`src/lib/ai/`)

| File | Purpose |
|------|---------|
| `client.ts` | Gemini client singletons (legacy + Vercel AI SDK) |
| `config.ts` | AI model config, presets, token limits |
| `context.ts` | Context window management, history truncation |
| `prompts.ts` | System prompt and knowledge priming builders |
| `knowledge.ts` | Mind lookup (DB primary, manifest fallback) + file URI retrieval |
| `chat.ts` | Non-streaming chat session (legacy path) |
| `stream.ts` | Streaming chat via Vercel AI SDK |
| `greetings.ts` | Personalized greetings per mind |
| `pricing.ts` | Gemini model pricing for cost calculation |
| `index.ts` | Barrel exports |

### Services (`src/lib/services/`)

| File | Purpose |
|------|---------|
| `conversations.ts` | CRUD for conversations (user-scoped) |
| `messages.ts` | Create/list messages in conversations |
| `minds.ts` | Mind lookup by slug/name, list active minds |
| `rate-limiter.ts` | Sliding-window rate limiting (DB-backed) |
| `token-usage.ts` | Token usage tracking and budget queries |

### Database (Supabase + Drizzle)

7 tables: `minds`, `knowledge_documents`, `file_uri_cache`, `conversations`, `messages`, `rate_limits`, `token_usage`.

Row Level Security (RLS) enforced on Supabase. Drizzle ORM for type-safe queries.

## Docker Setup

The project includes Docker support for reproducible builds and local development.

### Production Build

```bash
# Build the production image
docker build -t mentes-sinteticas .

# Run the production container
docker run -p 3000:3000 --env-file .env mentes-sinteticas
```

Or using Docker Compose:

```bash
# Start in production mode
docker compose up
```

### Development with Hot Reload

```bash
# Start in development mode (hot reload enabled)
docker compose --profile dev up dev
```

Changes in `src/` and `public/` are reflected automatically in the browser.

### Environment Variables

Docker containers read environment variables from your `.env` file (via `env_file`). Copy `.env.example` to `.env` and fill in your values before starting containers. No variables are hardcoded in the Docker configuration.

### Health Check

The production compose service includes a health check that polls `GET /api/health` every 30 seconds. Check container health with:

```bash
docker compose ps
```

## Deployment

Deployed on **Vercel**. Push to `main` triggers automatic deployment.

Configure environment variables in Vercel Dashboard. See `.env.example` for the full list.

## Adding a New Language (i18n)

The app ships with Portuguese (pt-BR) as the default and only active locale.
The i18n infrastructure is ready for new languages — no framework required.

### Steps

1. **Create a messages file** — copy `src/lib/i18n/messages/pt-BR.ts` to a new
   file named after the locale (e.g. `src/lib/i18n/messages/en-US.ts`).
2. **Translate** all string values in the new file. Keep the object keys
   identical.
3. **Register the locale** — in `src/lib/i18n/index.ts`, import the new
   messages and add them to the `locales` map:
   ```ts
   import { messages as enUS } from "./messages/en-US";
   const locales: Record<string, Messages> = {
     "pt-BR": ptBR,
     "en-US": enUS,
   };
   ```
4. **Set the active locale** — change `activeLocale` in the same file (or make
   it dynamic via cookie / user preference in a future story).

### Usage

Use the `t()` function with dot-notation keys:

```tsx
import { t } from "@/lib/i18n";

<h1>{t("common.appName")}</h1>      // "Mentes Sinteticas"
<button>{t("auth.loginButton")}</button> // "Entrar"
```

> **Note:** Full multi-language support (locale detection, language switcher UI,
> pluralisation, interpolation) is out of scope for the current release and will
> be addressed in a future story.

## License

Private project.
