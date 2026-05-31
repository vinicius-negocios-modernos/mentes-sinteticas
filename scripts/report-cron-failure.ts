/**
 * report-cron-failure.ts — Sentry alerting bridge for cron failures (SYS-16)
 *
 * The URI-renewal cron is a shell script; this tiny Node bridge lets it report
 * a failure to Sentry using the SDK already wired into the app
 * (`@sentry/nextjs`). It is best-effort and dependency-light: if SENTRY_DSN is
 * unset or the SDK is unavailable, it returns after logging a clearly-marked
 * ERROR line so the shell caller's log marker remains the source of truth.
 *
 * Invoked by scripts/renew-uris.sh:
 *   CRON_NAME=renew-uris CRON_ERROR="<reason>" npx tsx scripts/report-cron-failure.ts
 *
 * ENV:
 *   CRON_NAME   logical name of the failing cron (default: "unknown-cron")
 *   CRON_ERROR  human-readable failure reason (default: "unspecified failure")
 *   SENTRY_DSN  if set, the event is sent to Sentry; otherwise log-only.
 */

export interface CronFailureOptions {
  cronName?: string;
  cronError?: string;
  dsn?: string;
  /** Result of the attempt — for tests and for the CLI exit log. */
}

export type CronReportOutcome = "sent" | "log-only" | "sdk-unavailable";

/**
 * Report a cron failure to Sentry (best-effort). Returns an outcome string so
 * callers/tests can assert behaviour. NEVER throws — alerting must not crash
 * the cron it is reporting on.
 */
export async function reportCronFailure(
  opts: CronFailureOptions = {}
): Promise<CronReportOutcome> {
  const cronName = opts.cronName ?? process.env.CRON_NAME ?? "unknown-cron";
  const cronError =
    opts.cronError ?? process.env.CRON_ERROR ?? "unspecified failure";
  const dsn = opts.dsn ?? process.env.SENTRY_DSN;

  const logMarker = (line: string): void => {
    // Mirrors the shell marker so log-based alarms catch this path too.
    console.error(`[cron-alert] ${cronName}: ${line}`);
  };

  const error = new Error(`Cron "${cronName}" failed: ${cronError}`);
  error.name = "CronFailure";

  if (!dsn) {
    logMarker(`SENTRY_DSN not set — logging only. ${cronError}`);
    return "log-only";
  }

  try {
    // Dynamic import so the script does not hard-fail if the SDK is absent.
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({ dsn, environment: process.env.NODE_ENV ?? "production" });
    Sentry.captureException(error, {
      level: "error",
      tags: { source: "cron", cron: cronName },
      extra: { reason: cronError },
    });
    // Ensure the event is flushed before the process exits.
    await Sentry.flush(5000);
    logMarker(`reported to Sentry. ${cronError}`);
    return "sent";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logMarker(`Sentry capture unavailable (${msg}); logged only. ${cronError}`);
    return "sdk-unavailable";
  }
}

// ── CLI entry ────────────────────────────────────────────────────────
// Only run when invoked directly (tsx scripts/report-cron-failure.ts), not on
// import from a test. import.meta.url vs process.argv[1] is the ESM idiom.
const invokedDirectly =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  import.meta.url === `file://${process.argv[1]}`;

if (invokedDirectly) {
  reportCronFailure()
    .catch(() => undefined)
    .finally(() => process.exit(0));
}
