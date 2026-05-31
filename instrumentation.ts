import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // SYS-5: fail fast at boot if required env vars are missing/invalid.
    // Runs only in the nodejs runtime (not edge, not build) so it never
    // breaks the build phase, which may run without all secrets present.
    const { validateEnv } = await import("./src/lib/config");
    validateEnv();

    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
