import { describe, it, expect, vi, beforeEach } from "vitest";

describe("getConfig()", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("returns config with valid env vars", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-api-key-123");
    vi.stubEnv("DATABASE_URL", "postgres://localhost/test");
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
    vi.stubEnv("DATABASE_URL", "postgres://localhost/test");
    delete process.env.GEMINI_MODEL;

    const { getConfig } = await import("@/lib/config");
    const config = getConfig();

    expect(config.GEMINI_MODEL).toBe("gemini-2.0-flash");
  });

  it("caches config on subsequent calls (singleton)", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("DATABASE_URL", "postgres://localhost/test");
    vi.stubEnv("GEMINI_MODEL", "model-1");

    const { getConfig } = await import("@/lib/config");
    const first = getConfig();

    // Change env after first call — should still return cached value
    vi.stubEnv("GEMINI_MODEL", "model-2");
    const second = getConfig();

    expect(first).toBe(second);
    expect(second.GEMINI_MODEL).toBe("model-1");
  });

  it("requires DATABASE_URL (fail-fast)", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    delete process.env.DATABASE_URL;

    const { getConfig } = await import("@/lib/config");
    expect(() => getConfig()).toThrow(/DATABASE_URL/);
  });

  it("applies SYS-6 config defaults when limit vars are unset", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("DATABASE_URL", "postgres://localhost/test");
    delete process.env.MAX_FILE_URIS_PER_REQUEST;
    delete process.env.RATE_LIMIT_PER_MINUTE;
    delete process.env.TOKEN_DAILY_LIMIT;

    const { getConfig, CONFIG_DEFAULTS } = await import("@/lib/config");
    const config = getConfig();

    expect(config.MAX_FILE_URIS_PER_REQUEST).toBe(
      CONFIG_DEFAULTS.MAX_FILE_URIS_PER_REQUEST
    );
    expect(config.RATE_LIMIT_PER_MINUTE).toBe(CONFIG_DEFAULTS.RATE_LIMIT_PER_MINUTE);
    expect(config.TOKEN_DAILY_LIMIT).toBe(CONFIG_DEFAULTS.TOKEN_DAILY_LIMIT);
  });

  it("coerces limit env vars to numbers", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("DATABASE_URL", "postgres://localhost/test");
    vi.stubEnv("MAX_FILE_URIS_PER_REQUEST", "12");

    const { getConfig } = await import("@/lib/config");
    expect(getConfig().MAX_FILE_URIS_PER_REQUEST).toBe(12);
  });
});

describe("getAuthConfig()", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("accepts AUTH_SECRET", async () => {
    vi.stubEnv("AUTH_SECRET", "secret-123");
    delete process.env.NEXTAUTH_SECRET;

    const { getAuthConfig } = await import("@/lib/config");
    expect(getAuthConfig().AUTH_SECRET).toBe("secret-123");
  });

  it("accepts NEXTAUTH_SECRET as alternative", async () => {
    delete process.env.AUTH_SECRET;
    vi.stubEnv("NEXTAUTH_SECRET", "secret-456");

    const { getAuthConfig } = await import("@/lib/config");
    expect(getAuthConfig().NEXTAUTH_SECRET).toBe("secret-456");
  });

  it("throws when neither AUTH_SECRET nor NEXTAUTH_SECRET is set", async () => {
    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;

    const { getAuthConfig } = await import("@/lib/config");
    expect(() => getAuthConfig()).toThrow(/AUTH_SECRET/);
  });
});

describe("validateEnv()", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("passes with all required vars present", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("DATABASE_URL", "postgres://localhost/test");
    vi.stubEnv("AUTH_SECRET", "secret-123");

    const { validateEnv } = await import("@/lib/config");
    expect(() => validateEnv()).not.toThrow();
  });

  it("fails fast and lists every missing var at once", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.DATABASE_URL;
    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;

    const { validateEnv } = await import("@/lib/config");
    let caught: Error | null = null;
    try {
      validateEnv();
    } catch (e) {
      caught = e as Error;
    }

    expect(caught).not.toBeNull();
    expect(caught!.message).toContain("GEMINI_API_KEY");
    expect(caught!.message).toContain("DATABASE_URL");
    expect(caught!.message).toContain("AUTH_SECRET");
  });
});
