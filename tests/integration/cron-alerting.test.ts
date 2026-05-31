import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Sentry mock (AC4: verify cron failure → captureException) ────────
const captureException = vi.fn();
const init = vi.fn();
const flush = vi.fn().mockResolvedValue(true);

vi.mock("@sentry/nextjs", () => ({
  init: (...args: unknown[]) => init(...args),
  captureException: (...args: unknown[]) => captureException(...args),
  flush: (...args: unknown[]) => flush(...args),
}));

import { reportCronFailure } from "../../scripts/report-cron-failure";

describe("SYS-16 — cron failure alerting (Sentry bridge)", () => {
  beforeEach(() => {
    captureException.mockClear();
    init.mockClear();
    flush.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset the module registry so the @sentry/nextjs mock in this file does
    // not leak into other test files that may share the same worker (the suite
    // has a known @/db singleton sensitivity to cross-file module state).
    vi.resetModules();
  });

  it("captures a CronFailure exception to Sentry when DSN is set", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const outcome = await reportCronFailure({
      cronName: "renew-uris",
      cronError: "Zero minds renewed (0/3) — quota exhaustion",
      dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
    });

    expect(outcome).toBe("sent");
    expect(init).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledTimes(1);

    const [errArg, ctxArg] = captureException.mock.calls[0];
    expect(errArg).toBeInstanceOf(Error);
    expect((errArg as Error).name).toBe("CronFailure");
    expect((errArg as Error).message).toContain("renew-uris");
    expect((errArg as Error).message).toContain("quota exhaustion");

    expect(ctxArg).toMatchObject({
      level: "error",
      tags: { source: "cron", cron: "renew-uris" },
      extra: { reason: "Zero minds renewed (0/3) — quota exhaustion" },
    });

    expect(flush).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("does NOT call Sentry when no DSN is configured (log-only, still non-silent)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const outcome = await reportCronFailure({
      cronName: "renew-uris",
      cronError: "GEMINI_API_KEY is not set",
      dsn: undefined,
    });

    expect(outcome).toBe("log-only");
    expect(captureException).not.toHaveBeenCalled();
    // A clearly-marked alert line is still emitted (grep-able alarm).
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("[cron-alert] renew-uris")
    );
    consoleError.mockRestore();
  });

  it("never throws even if the Sentry call rejects (alerting must not crash the cron)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    captureException.mockImplementationOnce(() => {
      throw new Error("network down");
    });

    const outcome = await reportCronFailure({
      cronName: "renew-uris",
      cronError: "boom",
      dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
    });

    expect(outcome).toBe("sdk-unavailable");
    consoleError.mockRestore();
  });
});
