/**
 * Structured Logger
 *
 * Provides structured logging with level filtering and Sentry integration.
 * - Production: JSON output, debug silenced, errors/warns forwarded to Sentry.
 * - Development: human-readable console output, all levels active.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogMetadata = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const isProduction = process.env.NODE_ENV === "production";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel = isProduction ? "info" : "debug";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

// ---------------------------------------------------------------------------
// Sentry helpers (graceful degradation)
// ---------------------------------------------------------------------------

function getSentry(): typeof import("@sentry/nextjs") | null {
  try {
    // Dynamic require so the module is optional — no build error if Sentry
    // is not installed or not yet configured.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@sentry/nextjs");
  } catch {
    return null;
  }
}

function sentryCaptureError(error: Error, metadata?: LogMetadata): void {
  const sentry = getSentry();
  if (!sentry) return;
  sentry.captureException(error, metadata ? { extra: metadata } : undefined);
}

function sentryCaptureMessage(message: string, metadata?: LogMetadata): void {
  const sentry = getSentry();
  if (!sentry) return;
  sentry.captureMessage(message, {
    level: "error",
    extra: metadata,
  });
}

function sentryAddBreadcrumb(message: string, metadata?: LogMetadata): void {
  const sentry = getSentry();
  if (!sentry) return;
  sentry.addBreadcrumb({
    category: "logger",
    message,
    level: "warning",
    data: metadata,
  });
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatProduction(
  level: LogLevel,
  message: string,
  metadata?: LogMetadata
): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
  });
}

function formatDev(
  level: LogLevel,
  message: string,
  metadata?: LogMetadata
): string {
  const prefix: Record<LogLevel, string> = {
    debug: "\x1b[90m[DEBUG]\x1b[0m",
    info: "\x1b[36m[INFO]\x1b[0m",
    warn: "\x1b[33m[WARN]\x1b[0m",
    error: "\x1b[31m[ERROR]\x1b[0m",
  };
  const meta =
    metadata && Object.keys(metadata).length > 0
      ? ` ${JSON.stringify(metadata)}`
      : "";
  return `${prefix[level]} ${message}${meta}`;
}

const format = isProduction ? formatProduction : formatDev;

// ---------------------------------------------------------------------------
// Console dispatch
// ---------------------------------------------------------------------------

const CONSOLE_METHOD: Record<LogLevel, "debug" | "info" | "warn" | "error"> = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
};

function emit(level: LogLevel, message: string, metadata?: LogMetadata): void {
  if (!shouldLog(level)) return;
  const output = format(level, message, metadata);
  console[CONSOLE_METHOD[level]](output);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const logger = {
  debug(message: string, metadata?: LogMetadata): void {
    emit("debug", message, metadata);
  },

  info(message: string, metadata?: LogMetadata): void {
    emit("info", message, metadata);
  },

  warn(message: string, metadata?: LogMetadata): void {
    sentryAddBreadcrumb(message, metadata);
    emit("warn", message, metadata);
  },

  error(
    messageOrError: string | Error,
    errorOrMetadata?: Error | LogMetadata,
    metadata?: LogMetadata
  ): void {
    // Normalise overloaded arguments:
    //   logger.error('msg', error, meta)
    //   logger.error('msg', meta)
    //   logger.error(error)
    //   logger.error(error, meta)
    let message: string;
    let err: Error | undefined;
    let meta: LogMetadata | undefined;

    if (messageOrError instanceof Error) {
      err = messageOrError;
      message = err.message;
      meta = errorOrMetadata as LogMetadata | undefined;
    } else {
      message = messageOrError;
      if (errorOrMetadata instanceof Error) {
        err = errorOrMetadata;
        meta = metadata;
      } else {
        meta = errorOrMetadata as LogMetadata | undefined;
      }
    }

    // Include error stack in metadata for structured output
    const enrichedMeta: LogMetadata = {
      ...meta,
      ...(err ? { stack: err.stack } : {}),
    };

    emit("error", message, enrichedMeta);

    // Sentry integration
    if (err) {
      sentryCaptureError(err, meta);
    } else {
      sentryCaptureMessage(message, meta);
    }
  },
} as const;
