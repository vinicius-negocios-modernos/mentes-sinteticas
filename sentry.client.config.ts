import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  const environment =
    process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "development";
  const isProduction = environment === "production";

  Sentry.init({
    dsn: SENTRY_DSN,
    environment,
    tracesSampleRate: Number(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ??
        (isProduction ? 0.1 : 1.0)
    ),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    debug: false,
  });
}
