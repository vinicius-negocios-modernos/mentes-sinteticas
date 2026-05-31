/**
 * Lightweight retry helper for fire-and-forget background side-effects.
 *
 * Runs an async function and retries it up to `retries` times with simple
 * (linear-step) backoff. If all attempts fail, `onFinalFailure` is invoked with
 * the last error — the intended hook for alerting (e.g. Sentry captureException).
 *
 * Designed for non-blocking background work: callers should NOT await the
 * returned promise on the user-facing path. `runBackground` makes that explicit
 * and guarantees the helper never throws into the caller.
 *
 * Dependency-light: no external packages, only the project logger.
 */
import { logger } from "@/lib/logger";

export interface RetryOptions {
  /** Number of retries AFTER the initial attempt (default: 2 → up to 3 tries). */
  retries?: number;
  /** Base backoff in ms; attempt N waits `backoffMs * N` (default: 200). */
  backoffMs?: number;
  /** Human-readable label for logs/alerts (e.g. "recordUsage"). */
  label?: string;
  /**
   * Called once if every attempt fails. Receives the last error and the total
   * number of attempts made. Use this to alert (Sentry captureException).
   * Errors thrown here are swallowed so the helper never rejects loudly.
   */
  onFinalFailure?: (error: Error, attempts: number) => void;
}

const DEFAULT_RETRIES = 2;
const DEFAULT_BACKOFF_MS = 200;

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run `fn`, retrying on failure with simple backoff.
 *
 * Resolves with the function's result on success. On exhaustion it calls
 * `onFinalFailure` (if provided) and re-throws the last error — callers that
 * want pure fire-and-forget should use {@link runBackground} instead.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = DEFAULT_RETRIES,
    backoffMs = DEFAULT_BACKOFF_MS,
    label = "withRetry",
    onFinalFailure,
  } = options;

  const maxAttempts = Math.max(1, retries + 1);
  let lastError: Error = new Error(`${label}: no attempts ran`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = toError(err);
      const isLast = attempt === maxAttempts;
      if (isLast) {
        logger.error(`[retry] ${label} failed after ${attempt} attempt(s)`, {
          error: lastError.message,
          attempts: attempt,
        });
        if (onFinalFailure) {
          try {
            onFinalFailure(lastError, attempt);
          } catch {
            // Never let the alerting hook break the background flow.
          }
        }
        throw lastError;
      }
      logger.warn(
        `[retry] ${label} attempt ${attempt}/${maxAttempts} failed, retrying`,
        { error: lastError.message }
      );
      await delay(backoffMs * attempt);
    }
  }

  // Unreachable, but satisfies the type checker.
  throw lastError;
}

/**
 * Fire-and-forget wrapper around {@link withRetry}. Never throws and never
 * needs to be awaited on the response path — the retry + alert happens in the
 * background. Returns the underlying promise only so tests can await completion.
 */
export function runBackground<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<void> {
  return withRetry(fn, options).then(
    () => undefined,
    () => undefined // already logged + alerted inside withRetry
  );
}
