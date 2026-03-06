import { eq, and, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema/rate-limits";

// ── Configuration ─────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
}

/** Default rate limits — configurable via env vars */
export const DEFAULT_LIMITS = {
  sendMessage: {
    perMinute: {
      maxRequests: parseInt(process.env.RATE_LIMIT_PER_MINUTE ?? "20", 10),
      windowSeconds: 60,
    },
    perHour: {
      maxRequests: parseInt(process.env.RATE_LIMIT_PER_HOUR ?? "200", 10),
      windowSeconds: 3600,
    },
  },
} as const;

// ── Types ─────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the current window resets */
  retryAfterSeconds?: number;
  /** Which limit was exceeded */
  limitType?: string;
  /** Current request count in the violated window */
  currentCount?: number;
  /** Maximum allowed in the violated window */
  maxAllowed?: number;
}

// ── Core functions ────────────────────────────────────────────────────

/**
 * Compute the start of the sliding window for the given timestamp.
 * Windows are aligned to fixed boundaries (e.g., every minute boundary for 60s windows).
 */
function getWindowStart(now: Date, windowSeconds: number): Date {
  const epochSeconds = Math.floor(now.getTime() / 1000);
  const windowStart = epochSeconds - (epochSeconds % windowSeconds);
  return new Date(windowStart * 1000);
}

/**
 * Check whether a user is within rate limits for a given action.
 * Uses a sliding window approach with DB-backed persistence.
 *
 * @param userId - The authenticated user's UUID
 * @param action - The action being rate-limited (e.g. "sendMessage")
 * @param limits - Array of rate limit configurations to check
 * @returns RateLimitResult indicating whether the request is allowed
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  limits: { name: string; config: RateLimitConfig }[]
): Promise<RateLimitResult> {
  const now = new Date();

  for (const { name, config } of limits) {
    const windowStart = getWindowStart(now, config.windowSeconds);

    // Count requests in current window
    const result = await db
      .select({
        totalCount: sql<number>`COALESCE(SUM(${rateLimits.requestCount}), 0)`,
      })
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.userId, userId),
          eq(rateLimits.action, action),
          gte(rateLimits.windowStart, windowStart)
        )
      );

    const currentCount = Number(result[0]?.totalCount ?? 0);

    if (currentCount >= config.maxRequests) {
      // Calculate retry-after: time until window resets
      const windowEnd = new Date(
        windowStart.getTime() + config.windowSeconds * 1000
      );
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((windowEnd.getTime() - now.getTime()) / 1000)
      );

      return {
        allowed: false,
        retryAfterSeconds,
        limitType: name,
        currentCount,
        maxAllowed: config.maxRequests,
      };
    }
  }

  return { allowed: true };
}

/**
 * Record a request for rate limiting purposes.
 * Inserts one row per request with the current window timestamp.
 * The checkRateLimit function SUMs request_count across all rows in the window.
 */
export async function incrementRateLimit(
  userId: string,
  action: string
): Promise<void> {
  const now = new Date();
  // Use 1-minute granularity for window tracking
  const windowStart = getWindowStart(now, 60);

  await db.insert(rateLimits).values({
    userId,
    action,
    windowStart,
    requestCount: 1,
  });
}

/**
 * Clean up expired rate limit records (older than 24 hours).
 * Can be called lazily during rate limit checks.
 */
export async function cleanupExpiredLimits(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await db
    .delete(rateLimits)
    .where(lt(rateLimits.windowStart, cutoff));
}
