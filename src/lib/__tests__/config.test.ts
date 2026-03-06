import { describe, it, expect, vi, beforeEach } from "vitest";

describe("getConfig()", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("returns config with valid env vars", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-api-key-123");
    vi.stubEnv("GEMINI_MODEL", "gemini-2.0-pro");

    const { getConfig } = await import("@/lib/config");
    const config = getConfig();

    expect(config.GEMINI_API_KEY).toBe("test-api-key-123");
    expect(config.GEMINI_MODEL).toBe("gemini-2.0-pro");
  });

  it("throws error without GEMINI_API_KEY", async () => {
    // Ensure GEMINI_API_KEY is not set
    delete process.env.GEMINI_API_KEY;

    const { getConfig } = await import("@/lib/config");
    expect(() => getConfig()).toThrow("Environment configuration error");
  });

  it("uses default GEMINI_MODEL when not provided", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    delete process.env.GEMINI_MODEL;

    const { getConfig } = await import("@/lib/config");
    const config = getConfig();

    expect(config.GEMINI_MODEL).toBe("gemini-2.0-flash");
  });

  it("caches config on subsequent calls (singleton)", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "model-1");

    const { getConfig } = await import("@/lib/config");
    const first = getConfig();

    // Change env after first call — should still return cached value
    vi.stubEnv("GEMINI_MODEL", "model-2");
    const second = getConfig();

    expect(first).toBe(second);
    expect(second.GEMINI_MODEL).toBe("model-1");
  });
});
