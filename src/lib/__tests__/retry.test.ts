import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withRetry, runBackground } from "@/lib/retry";

// Silence/observe logger without coupling to its formatting.
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("succeeds on the first try without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const onFinalFailure = vi.fn();

    const result = await withRetry(fn, { onFinalFailure });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(onFinalFailure).not.toHaveBeenCalled();
  });

  it("succeeds after a transient failure (retries then ok)", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce("recovered");
    const onFinalFailure = vi.fn();

    const promise = withRetry(fn, {
      retries: 2,
      backoffMs: 100,
      onFinalFailure,
    });

    // Let the backoff timer (100ms * attempt 1) elapse.
    await vi.advanceTimersByTimeAsync(100);

    await expect(promise).resolves.toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(onFinalFailure).not.toHaveBeenCalled();
  });

  it("exhausts retries and calls onFinalFailure with the last error", async () => {
    const boom = new Error("persistent failure");
    const fn = vi.fn().mockRejectedValue(boom);
    const onFinalFailure = vi.fn();

    const promise = withRetry(fn, {
      retries: 2,
      backoffMs: 50,
      label: "recordUsage",
      onFinalFailure,
    });
    // Prevent unhandled rejection while timers advance.
    const settled = promise.catch((e) => e);

    // Two backoff windows: 50ms (attempt 1) + 100ms (attempt 2).
    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(100);

    const err = await settled;
    expect(err).toBe(boom);
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    expect(onFinalFailure).toHaveBeenCalledTimes(1);
    expect(onFinalFailure).toHaveBeenCalledWith(boom, 3);
  });

  it("wraps non-Error throws into Error before alerting", async () => {
    const fn = vi.fn().mockRejectedValue("string failure");
    const onFinalFailure = vi.fn();

    const promise = withRetry(fn, {
      retries: 0,
      onFinalFailure,
    });
    const err = await promise.catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe("string failure");
    expect(onFinalFailure).toHaveBeenCalledWith(expect.any(Error), 1);
  });

  it("never lets a throwing onFinalFailure escape", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("x"));
    const onFinalFailure = vi.fn(() => {
      throw new Error("alerting blew up");
    });

    const promise = withRetry(fn, { retries: 0, onFinalFailure });

    // The original error is thrown, not the alerting error.
    await expect(promise).rejects.toThrow("x");
    expect(onFinalFailure).toHaveBeenCalledTimes(1);
  });
});

describe("runBackground", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("never rejects, even when the side-effect fails", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("background boom"));
    const onFinalFailure = vi.fn();

    const promise = runBackground(fn, { retries: 0, onFinalFailure });

    // Resolves to undefined (swallowed) and still alerts.
    await expect(promise).resolves.toBeUndefined();
    expect(onFinalFailure).toHaveBeenCalledTimes(1);
  });

  it("resolves to undefined on success", async () => {
    const fn = vi.fn().mockResolvedValue("value");
    await expect(runBackground(fn)).resolves.toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
