import { z } from "zod";

export const AIModelConfigSchema = z.object({
  model: z.string().default("gemini-2.0-flash"),
  temperature: z.coerce.number().min(0).max(2).default(0.7),
  topK: z.coerce.number().int().min(1).default(40),
  topP: z.coerce.number().min(0).max(1).default(0.95),
  maxOutputTokens: z.coerce.number().int().min(1).default(8192),
});

export type AIModelConfig = z.infer<typeof AIModelConfigSchema>;

export const AI_PRESETS = {
  balanced: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
  },
  creative: {
    temperature: 1.0,
    topK: 40,
    topP: 0.98,
    maxOutputTokens: 8192,
  },
  precise: {
    temperature: 0.3,
    topK: 20,
    topP: 0.8,
    maxOutputTokens: 8192,
  },
} as const;

let _aiConfig: AIModelConfig | null = null;

export function getAIConfig(): AIModelConfig {
  if (!_aiConfig) {
    const presetName = process.env.AI_PRESET as keyof typeof AI_PRESETS | undefined;
    const preset = presetName && AI_PRESETS[presetName] ? AI_PRESETS[presetName] : AI_PRESETS.balanced;

    const raw = {
      model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
      temperature: process.env.GEMINI_TEMPERATURE ?? preset.temperature,
      topK: process.env.GEMINI_TOP_K ?? preset.topK,
      topP: process.env.GEMINI_TOP_P ?? preset.topP,
      maxOutputTokens: process.env.GEMINI_MAX_OUTPUT_TOKENS ?? preset.maxOutputTokens,
    };

    const result = AIModelConfigSchema.safeParse(raw);
    if (!result.success) {
      const errors = result.error.issues.map(i => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
      throw new Error(`AI model configuration error:\n${errors}`);
    }
    _aiConfig = result.data;
  }
  return _aiConfig;
}
