import { describe, it, expect, vi, beforeEach } from "vitest";

describe("AI Config", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  describe("getAIConfig() defaults", () => {
    it("returns balanced preset defaults when no env vars set", async () => {
      // Clear any AI-related env vars
      delete process.env.AI_PRESET;
      delete process.env.GEMINI_MODEL;
      delete process.env.GEMINI_TEMPERATURE;
      delete process.env.GEMINI_TOP_K;
      delete process.env.GEMINI_TOP_P;
      delete process.env.GEMINI_MAX_OUTPUT_TOKENS;

      const { getAIConfig } = await import("@/lib/ai/config");
      const config = getAIConfig();

      expect(config.model).toBe("gemini-2.0-flash");
      expect(config.temperature).toBe(0.7);
      expect(config.topK).toBe(40);
      expect(config.topP).toBe(0.95);
      expect(config.maxOutputTokens).toBe(8192);
    });
  });

  describe("getAIConfig() with presets", () => {
    it("uses creative preset", async () => {
      vi.stubEnv("AI_PRESET", "creative");

      const { getAIConfig } = await import("@/lib/ai/config");
      const config = getAIConfig();

      expect(config.temperature).toBe(1.0);
      expect(config.topP).toBe(0.98);
    });

    it("uses precise preset", async () => {
      vi.stubEnv("AI_PRESET", "precise");

      const { getAIConfig } = await import("@/lib/ai/config");
      const config = getAIConfig();

      expect(config.temperature).toBe(0.3);
      expect(config.topK).toBe(20);
      expect(config.topP).toBe(0.8);
    });

    it("falls back to balanced for unknown preset", async () => {
      vi.stubEnv("AI_PRESET", "nonexistent");

      const { getAIConfig } = await import("@/lib/ai/config");
      const config = getAIConfig();

      expect(config.temperature).toBe(0.7);
    });
  });

  describe("getAIConfig() with env var overrides", () => {
    it("env vars override preset values", async () => {
      vi.stubEnv("AI_PRESET", "balanced");
      vi.stubEnv("GEMINI_TEMPERATURE", "1.5");
      vi.stubEnv("GEMINI_TOP_K", "10");
      vi.stubEnv("GEMINI_TOP_P", "0.5");
      vi.stubEnv("GEMINI_MAX_OUTPUT_TOKENS", "4096");
      vi.stubEnv("GEMINI_MODEL", "gemini-custom");

      const { getAIConfig } = await import("@/lib/ai/config");
      const config = getAIConfig();

      expect(config.temperature).toBe(1.5);
      expect(config.topK).toBe(10);
      expect(config.topP).toBe(0.5);
      expect(config.maxOutputTokens).toBe(4096);
      expect(config.model).toBe("gemini-custom");
    });
  });

  describe("AIModelConfigSchema validation", () => {
    it("rejects temperature > 2", async () => {
      const { AIModelConfigSchema } = await import("@/lib/ai/config");
      const result = AIModelConfigSchema.safeParse({
        model: "test",
        temperature: 3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      });
      expect(result.success).toBe(false);
    });

    it("rejects topP > 1", async () => {
      const { AIModelConfigSchema } = await import("@/lib/ai/config");
      const result = AIModelConfigSchema.safeParse({
        model: "test",
        temperature: 0.7,
        topK: 40,
        topP: 1.5,
        maxOutputTokens: 8192,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative temperature", async () => {
      const { AIModelConfigSchema } = await import("@/lib/ai/config");
      const result = AIModelConfigSchema.safeParse({
        model: "test",
        temperature: -1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid config", async () => {
      const { AIModelConfigSchema } = await import("@/lib/ai/config");
      const result = AIModelConfigSchema.safeParse({
        model: "gemini-2.0-flash",
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("AI_PRESETS", () => {
    it("has balanced, creative, and precise presets", async () => {
      const { AI_PRESETS } = await import("@/lib/ai/config");
      expect(AI_PRESETS).toHaveProperty("balanced");
      expect(AI_PRESETS).toHaveProperty("creative");
      expect(AI_PRESETS).toHaveProperty("precise");
    });

    it("balanced preset has correct values", async () => {
      const { AI_PRESETS } = await import("@/lib/ai/config");
      expect(AI_PRESETS.balanced.temperature).toBe(0.7);
      expect(AI_PRESETS.balanced.topK).toBe(40);
      expect(AI_PRESETS.balanced.topP).toBe(0.95);
      expect(AI_PRESETS.balanced.maxOutputTokens).toBe(8192);
    });
  });

  describe("singleton caching", () => {
    it("caches config on subsequent calls", async () => {
      delete process.env.AI_PRESET;
      const { getAIConfig } = await import("@/lib/ai/config");
      const first = getAIConfig();
      const second = getAIConfig();
      expect(first).toBe(second);
    });
  });

  describe("getAIConfig() error handling", () => {
    it("throws when env vars produce invalid config", async () => {
      vi.stubEnv("GEMINI_TEMPERATURE", "invalid-number");

      const { getAIConfig } = await import("@/lib/ai/config");
      expect(() => getAIConfig()).toThrow("AI model configuration error");
    });
  });
});
