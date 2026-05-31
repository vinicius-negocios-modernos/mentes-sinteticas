import { z } from "zod";

/**
 * SYS-6: single source-of-truth for tunable config defaults.
 *
 * These literals replace magic constants previously hardcoded across modules
 * (MAX_FILE_URIS_PER_REQUEST in knowledge.ts, rate-limit/token defaults in
 * rate-limiter.ts / ai/config.ts). Both the Zod env schema below and the
 * consumers read from here, so changing a default is a one-line edit.
 */
export const CONFIG_DEFAULTS = {
    GEMINI_MODEL: "gemini-2.0-flash",
    MAX_FILE_URIS_PER_REQUEST: 8,
    RATE_LIMIT_PER_MINUTE: 20,
    RATE_LIMIT_PER_HOUR: 200,
    TOKEN_DAILY_LIMIT: 500_000,
    TOKEN_MONTHLY_LIMIT: 5_000_000,
} as const;

/**
 * Single source-of-truth Zod schema for application environment variables.
 *
 * Covers required secrets (Gemini, database, auth), public URLs, and tunable
 * config limits. Validation is lazy (runs on first `getConfig()` call) so it
 * never breaks the Next.js build phase, which may run without all env vars —
 * it fails fast at runtime boot instead (see `instrumentation.ts`).
 *
 * SYS-5: fail-fast env validation. SYS-6: externalized magic constants.
 */
const envSchema = z.object({
    // ── Secrets (required at runtime) ─────────────────────────────────
    GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required. Set it in .env.local"),
    GEMINI_MODEL: z.string().default(CONFIG_DEFAULTS.GEMINI_MODEL),
    DATABASE_URL: z
        .string()
        .min(1, "DATABASE_URL is required. Configure it in .env.local (see .env.example)"),

    // ── Tunable config limits (SYS-6 — externalized magic constants) ──
    /** Max file URIs sent per Gemini request (free-tier rate-limit guard). */
    MAX_FILE_URIS_PER_REQUEST: z.coerce
        .number()
        .int()
        .positive()
        .default(CONFIG_DEFAULTS.MAX_FILE_URIS_PER_REQUEST),
    /** Per-minute / per-hour rate limits for sendMessage. */
    RATE_LIMIT_PER_MINUTE: z.coerce
        .number()
        .int()
        .positive()
        .default(CONFIG_DEFAULTS.RATE_LIMIT_PER_MINUTE),
    RATE_LIMIT_PER_HOUR: z.coerce
        .number()
        .int()
        .positive()
        .default(CONFIG_DEFAULTS.RATE_LIMIT_PER_HOUR),
    /** Daily / monthly token budget limits per user (0 disables the check). */
    TOKEN_DAILY_LIMIT: z.coerce
        .number()
        .int()
        .nonnegative()
        .default(CONFIG_DEFAULTS.TOKEN_DAILY_LIMIT),
    TOKEN_MONTHLY_LIMIT: z.coerce
        .number()
        .int()
        .nonnegative()
        .default(CONFIG_DEFAULTS.TOKEN_MONTHLY_LIMIT),
});

export type AppConfig = z.infer<typeof envSchema>;

/**
 * Auth-related env validated separately because either AUTH_SECRET or
 * NEXTAUTH_SECRET satisfies NextAuth v5, and NEXTAUTH_URL is optional
 * (NextAuth infers it from the request when `trustHost` is set).
 */
const authEnvSchema = z
    .object({
        AUTH_SECRET: z.string().min(1).optional(),
        NEXTAUTH_SECRET: z.string().min(1).optional(),
        NEXTAUTH_URL: z.string().url().optional(),
    })
    .refine((v) => Boolean(v.AUTH_SECRET || v.NEXTAUTH_SECRET), {
        message:
            "AUTH_SECRET (or NEXTAUTH_SECRET) is required for NextAuth. Set it in .env.local",
        path: ["AUTH_SECRET"],
    });

export type AuthConfig = z.infer<typeof authEnvSchema>;

let _config: AppConfig | null = null;
let _authConfig: AuthConfig | null = null;

/**
 * Get validated application configuration from environment variables.
 * Caches the result after first call.
 *
 * @returns Validated AppConfig (secrets + tunable limits)
 * @throws {Error} When required env vars are missing or invalid (lists each)
 */
export function getConfig(): AppConfig {
    if (!_config) {
        const result = envSchema.safeParse(process.env);
        if (!result.success) {
            const errors = result.error.issues
                .map(i => `  - ${i.path.join(".")}: ${i.message}`)
                .join("\n");
            throw new Error(`Environment configuration error:\n${errors}`);
        }
        _config = result.data;
    }
    return _config;
}

/**
 * Get validated auth configuration (AUTH_SECRET/NEXTAUTH_SECRET, NEXTAUTH_URL).
 * Caches the result after first call.
 *
 * @returns Validated AuthConfig
 * @throws {Error} When neither AUTH_SECRET nor NEXTAUTH_SECRET is set
 */
export function getAuthConfig(): AuthConfig {
    if (!_authConfig) {
        const result = authEnvSchema.safeParse(process.env);
        if (!result.success) {
            const errors = result.error.issues
                .map(i => `  - ${i.path.join(".")}: ${i.message}`)
                .join("\n");
            throw new Error(`Environment configuration error:\n${errors}`);
        }
        _authConfig = result.data;
    }
    return _authConfig;
}

/**
 * Validate ALL environment configuration at once and fail fast.
 *
 * Called at application boot (`instrumentation.ts`, nodejs runtime). Aggregates
 * failures from every schema so the boot error lists every missing/invalid var
 * at once — without leaking secret values (only names + messages are shown).
 *
 * @throws {Error} Listing every missing/invalid variable, if any.
 */
export function validateEnv(): void {
    const issues: string[] = [];

    const base = envSchema.safeParse(process.env);
    if (!base.success) {
        for (const i of base.error.issues) {
            issues.push(`  - ${i.path.join(".")}: ${i.message}`);
        }
    }

    const authResult = authEnvSchema.safeParse(process.env);
    if (!authResult.success) {
        for (const i of authResult.error.issues) {
            issues.push(`  - ${i.path.join(".")}: ${i.message}`);
        }
    }

    if (issues.length > 0) {
        throw new Error(
            `Environment configuration error — the following variables are missing or invalid:\n${issues.join(
                "\n"
            )}`
        );
    }
}
