import { z } from "zod";

const envSchema = z.object({
    GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required. Set it in .env.local"),
    GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
    GEMINI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
    GEMINI_TOP_K: z.coerce.number().int().min(1).default(40),
    GEMINI_TOP_P: z.coerce.number().min(0).max(1).default(0.95),
    GEMINI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(1).default(8192),
});

export type AppConfig = z.infer<typeof envSchema>;

let _config: AppConfig | null = null;

export function getConfig(): AppConfig {
    if (!_config) {
        const result = envSchema.safeParse(process.env);
        if (!result.success) {
            const errors = result.error.issues.map(i => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
            throw new Error(`Environment configuration error:\n${errors}`);
        }
        _config = result.data;
    }
    return _config;
}
