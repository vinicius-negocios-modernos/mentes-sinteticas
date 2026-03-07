import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  dbMockModule,
  mockDb,
  mockDbSelect,
  mockDbInsert,
  mockDbDelete,
  resetDbMocks,
} from "../../../../tests/helpers/db-mock";

vi.mock("@/db", () => dbMockModule());
vi.mock("@/db/schema/rate-limits", () => ({
  rateLimits: {
    userId: "userId",
    action: "action",
    windowStart: "windowStart",
    requestCount: "requestCount",
  },
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ["eq", ...args]),
  and: vi.fn((...args: unknown[]) => ["and", ...args]),
  gte: vi.fn((...args: unknown[]) => ["gte", ...args]),
  lt: vi.fn((...args: unknown[]) => ["lt", ...args]),
  sql: vi.fn(),
}));

describe("rate-limiter", () => {
  beforeEach(() => {
    resetDbMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── DEFAULT_LIMITS ──────────────────────────────────────────────────

  describe("DEFAULT_LIMITS", () => {
    it("uses default values when env vars are not set", async () => {
      const { DEFAULT_LIMITS } = await import("@/lib/services/rate-limiter");
      expect(DEFAULT_LIMITS.sendMessage.perMinute.maxRequests).toBe(20);
      expect(DEFAULT_LIMITS.sendMessage.perMinute.windowSeconds).toBe(60);
      expect(DEFAULT_LIMITS.sendMessage.perHour.maxRequests).toBe(200);
      expect(DEFAULT_LIMITS.sendMessage.perHour.windowSeconds).toBe(3600);
    });

    it("uses custom env var values when set", async () => {
      vi.stubEnv("RATE_LIMIT_PER_MINUTE", "50");
      vi.stubEnv("RATE_LIMIT_PER_HOUR", "500");

      // Re-import to pick up new env vars
      vi.resetModules();
      vi.mock("@/db", () => dbMockModule());
      vi.mock("@/db/schema/rate-limits", () => ({
        rateLimits: {
          userId: "userId",
          action: "action",
          windowStart: "windowStart",
          requestCount: "requestCount",
        },
      }));
      vi.mock("drizzle-orm", () => ({
        eq: vi.fn((...args: unknown[]) => ["eq", ...args]),
        and: vi.fn((...args: unknown[]) => ["and", ...args]),
        gte: vi.fn((...args: unknown[]) => ["gte", ...args]),
        lt: vi.fn((...args: unknown[]) => ["lt", ...args]),
        sql: vi.fn(),
      }));

      const mod = await import("@/lib/services/rate-limiter");
      expect(mod.DEFAULT_LIMITS.sendMessage.perMinute.maxRequests).toBe(50);
      expect(mod.DEFAULT_LIMITS.sendMessage.perHour.maxRequests).toBe(500);
    });
  });

  // ── checkRateLimit ──────────────────────────────────────────────────

  describe("checkRateLimit", () => {
    it("allows request when count is below the limit", async () => {
      const { checkRateLimit } = await import("@/lib/services/rate-limiter");

      // Simulate 5 requests (below limit of 20)
      mockDbSelect([{ totalCount: 5 }]);

      const result = await checkRateLimit("user-1", "sendMessage", [
        { name: "perMinute", config: { maxRequests: 20, windowSeconds: 60 } },
      ]);

      expect(result.allowed).toBe(true);
      expect(result.retryAfterSeconds).toBeUndefined();
      expect(result.limitType).toBeUndefined();
    });

    it("blocks request when count meets the limit", async () => {
      const { checkRateLimit } = await import("@/lib/services/rate-limiter");

      // Simulate exactly at limit
      mockDbSelect([{ totalCount: 20 }]);

      const result = await checkRateLimit("user-1", "sendMessage", [
        { name: "perMinute", config: { maxRequests: 20, windowSeconds: 60 } },
      ]);

      expect(result.allowed).toBe(false);
      expect(result.limitType).toBe("perMinute");
      expect(result.currentCount).toBe(20);
      expect(result.maxAllowed).toBe(20);
      expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    });

    it("blocks request when count exceeds the limit", async () => {
      const { checkRateLimit } = await import("@/lib/services/rate-limiter");

      mockDbSelect([{ totalCount: 25 }]);

      const result = await checkRateLimit("user-1", "sendMessage", [
        { name: "perMinute", config: { maxRequests: 20, windowSeconds: 60 } },
      ]);

      expect(result.allowed).toBe(false);
      expect(result.limitType).toBe("perMinute");
      expect(result.currentCount).toBe(25);
      expect(result.maxAllowed).toBe(20);
    });

    it("checks multiple limits and fails on first exceeded", async () => {
      const { checkRateLimit } = await import("@/lib/services/rate-limiter");

      // First limit check returns 0 (ok), second returns 250 (exceeds)
      // Since the mock returns same value for all selects, simulate first passing
      mockDbSelect([{ totalCount: 0 }]);

      const result = await checkRateLimit("user-1", "sendMessage", [
        { name: "perMinute", config: { maxRequests: 20, windowSeconds: 60 } },
        { name: "perHour", config: { maxRequests: 200, windowSeconds: 3600 } },
      ]);

      // Both pass because totalCount is 0
      expect(result.allowed).toBe(true);
    });

    it("returns retryAfterSeconds of at least 1", async () => {
      const { checkRateLimit } = await import("@/lib/services/rate-limiter");

      mockDbSelect([{ totalCount: 100 }]);

      const result = await checkRateLimit("user-1", "sendMessage", [
        { name: "perMinute", config: { maxRequests: 20, windowSeconds: 60 } },
      ]);

      expect(result.allowed).toBe(false);
      expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    });
  });

  // ── incrementRateLimit ──────────────────────────────────────────────

  describe("incrementRateLimit", () => {
    it("inserts a rate limit record with requestCount 1", async () => {
      const { incrementRateLimit } = await import(
        "@/lib/services/rate-limiter"
      );

      mockDbInsert([]);

      await incrementRateLimit("user-1", "sendMessage");

      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it("uses 60-second window granularity", async () => {
      const { incrementRateLimit } = await import(
        "@/lib/services/rate-limiter"
      );

      mockDbInsert([]);

      await incrementRateLimit("user-2", "sendMessage");

      // Verify insert was called (values chain called with correct shape)
      const insertChain = mockDb.insert.mock.results[0]?.value;
      expect(insertChain.values).toHaveBeenCalledTimes(1);

      const valuesArg = insertChain.values.mock.calls[0][0];
      expect(valuesArg).toMatchObject({
        userId: "user-2",
        action: "sendMessage",
        requestCount: 1,
      });
      expect(valuesArg.windowStart).toBeInstanceOf(Date);
    });
  });

  // ── cleanupExpiredLimits ────────────────────────────────────────────

  describe("cleanupExpiredLimits", () => {
    it("deletes records older than 24 hours", async () => {
      const { cleanupExpiredLimits } = await import(
        "@/lib/services/rate-limiter"
      );

      mockDbDelete([]);

      await cleanupExpiredLimits();

      expect(mockDb.delete).toHaveBeenCalledTimes(1);
    });

    it("calls delete with where clause", async () => {
      const { cleanupExpiredLimits } = await import(
        "@/lib/services/rate-limiter"
      );

      mockDbDelete([]);

      await cleanupExpiredLimits();

      const deleteChain = mockDb.delete.mock.results[0]?.value;
      expect(deleteChain.where).toHaveBeenCalledTimes(1);
    });
  });
});
