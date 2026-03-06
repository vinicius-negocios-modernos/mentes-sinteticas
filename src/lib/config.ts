import { z } from "zod";

const envSchema = z.object({
    GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required. Set it in .env.local"),
    GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
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
