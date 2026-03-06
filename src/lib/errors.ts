/**
 * Centralized Error Handling Strategy
 *
 * Taxonomy: AppError (base) -> NetworkError, AuthError, RateLimitError, StreamError, ValidationError
 * Every error includes: code, user-friendly message (PT-BR), recoverable flag, and suggested action.
 */

// ---------------------------------------------------------------------------
// Error Codes
// ---------------------------------------------------------------------------

export enum ErrorCode {
  // Generic
  UNKNOWN = "UNKNOWN",
  // Network
  NETWORK_OFFLINE = "NETWORK_OFFLINE",
  NETWORK_TIMEOUT = "NETWORK_TIMEOUT",
  NETWORK_FAILED = "NETWORK_FAILED",
  // Auth
  AUTH_EXPIRED = "AUTH_EXPIRED",
  AUTH_UNAUTHORIZED = "AUTH_UNAUTHORIZED",
  AUTH_FORBIDDEN = "AUTH_FORBIDDEN",
  // Rate limit
  RATE_LIMIT = "RATE_LIMIT",
  // Stream
  STREAM_INTERRUPTED = "STREAM_INTERRUPTED",
  STREAM_UNAVAILABLE = "STREAM_UNAVAILABLE",
  // Validation
  VALIDATION_FAILED = "VALIDATION_FAILED",
  // Resource
  NOT_FOUND = "NOT_FOUND",
  SERVER_ERROR = "SERVER_ERROR",
}

export type ErrorSeverity = "error" | "warning" | "info";

// ---------------------------------------------------------------------------
// Base AppError
// ---------------------------------------------------------------------------

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly userMessage: string;
  readonly recoverable: boolean;
  readonly action: string;
  readonly severity: ErrorSeverity;
  readonly originalError?: unknown;

  constructor(opts: {
    code: ErrorCode;
    message: string;
    userMessage: string;
    recoverable: boolean;
    action: string;
    severity?: ErrorSeverity;
    originalError?: unknown;
  }) {
    super(opts.message);
    this.name = "AppError";
    this.code = opts.code;
    this.userMessage = opts.userMessage;
    this.recoverable = opts.recoverable;
    this.action = opts.action;
    this.severity = opts.severity ?? "error";
    this.originalError = opts.originalError;
  }
}

// ---------------------------------------------------------------------------
// Specialised errors
// ---------------------------------------------------------------------------

export class NetworkError extends AppError {
  constructor(opts?: { message?: string; originalError?: unknown }) {
    super({
      code: ErrorCode.NETWORK_FAILED,
      message: opts?.message ?? "Network request failed",
      userMessage: "Erro de conexao. Verifique sua internet e tente novamente.",
      recoverable: true,
      action: "Tentar novamente",
      severity: "warning",
      originalError: opts?.originalError,
    });
    this.name = "NetworkError";
  }
}

export class AuthError extends AppError {
  constructor(
    code: ErrorCode.AUTH_EXPIRED | ErrorCode.AUTH_UNAUTHORIZED | ErrorCode.AUTH_FORBIDDEN =
      ErrorCode.AUTH_EXPIRED,
    opts?: { originalError?: unknown }
  ) {
    const messages: Record<string, { user: string; action: string }> = {
      [ErrorCode.AUTH_EXPIRED]: {
        user: "Sua sessao expirou. Faca login novamente.",
        action: "Fazer login",
      },
      [ErrorCode.AUTH_UNAUTHORIZED]: {
        user: "Voce precisa estar autenticado para acessar este recurso.",
        action: "Fazer login",
      },
      [ErrorCode.AUTH_FORBIDDEN]: {
        user: "Voce nao tem permissao para acessar este recurso.",
        action: "Voltar",
      },
    };
    const m = messages[code] ?? messages[ErrorCode.AUTH_EXPIRED];
    super({
      code,
      message: `Auth error: ${code}`,
      userMessage: m.user,
      recoverable: false,
      action: m.action,
      severity: "error",
      originalError: opts?.originalError,
    });
    this.name = "AuthError";
  }
}

export class RateLimitError extends AppError {
  constructor(opts?: { originalError?: unknown }) {
    super({
      code: ErrorCode.RATE_LIMIT,
      message: "Rate limit exceeded",
      userMessage: "Muitas requisicoes. Aguarde alguns segundos e tente novamente.",
      recoverable: true,
      action: "Aguardar e tentar novamente",
      severity: "warning",
      originalError: opts?.originalError,
    });
    this.name = "RateLimitError";
  }
}

export class StreamError extends AppError {
  constructor(opts?: { message?: string; originalError?: unknown }) {
    super({
      code: ErrorCode.STREAM_INTERRUPTED,
      message: opts?.message ?? "Stream interrupted",
      userMessage: "A resposta foi interrompida. Tente enviar sua mensagem novamente.",
      recoverable: true,
      action: "Tentar novamente",
      severity: "warning",
      originalError: opts?.originalError,
    });
    this.name = "StreamError";
  }
}

export class ValidationError extends AppError {
  constructor(opts?: { message?: string; userMessage?: string; originalError?: unknown }) {
    super({
      code: ErrorCode.VALIDATION_FAILED,
      message: opts?.message ?? "Validation failed",
      userMessage: opts?.userMessage ?? "Dados invalidos. Verifique as informacoes e tente novamente.",
      recoverable: true,
      action: "Corrigir e tentar novamente",
      severity: "warning",
      originalError: opts?.originalError,
    });
    this.name = "ValidationError";
  }
}

// ---------------------------------------------------------------------------
// classifyError — converts raw errors into AppError taxonomy
// ---------------------------------------------------------------------------

export function classifyError(error: unknown): AppError {
  // Already classified
  if (error instanceof AppError) return error;

  // Fetch / network errors
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch")) {
      return new NetworkError({ message: error.message, originalError: error });
    }
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new NetworkError({ message: "Request aborted", originalError: error });
  }

  // HTTP Response-based errors (from our fetch handlers)
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // Rate limit
    if (msg.includes("429") || msg.includes("rate limit") || msg.includes("too many")) {
      return new RateLimitError({ originalError: error });
    }

    // Auth
    if (msg.includes("401") || msg.includes("unauthorized")) {
      return new AuthError(ErrorCode.AUTH_UNAUTHORIZED, { originalError: error });
    }
    if (msg.includes("403") || msg.includes("forbidden")) {
      return new AuthError(ErrorCode.AUTH_FORBIDDEN, { originalError: error });
    }

    // Stream
    if (msg.includes("stream") || msg.includes("readable")) {
      return new StreamError({ message: error.message, originalError: error });
    }

    // Zod validation
    if (msg.includes("zod") || msg.includes("validation") || error.name === "ZodError") {
      return new ValidationError({ message: error.message, originalError: error });
    }

    // Not found
    if (msg.includes("404") || msg.includes("not found")) {
      return new AppError({
        code: ErrorCode.NOT_FOUND,
        message: error.message,
        userMessage: "Recurso nao encontrado.",
        recoverable: false,
        action: "Voltar",
        severity: "error",
        originalError: error,
      });
    }

    // Server error
    if (msg.includes("500") || msg.includes("server error") || msg.includes("internal")) {
      return new AppError({
        code: ErrorCode.SERVER_ERROR,
        message: error.message,
        userMessage: "Erro interno do servidor. Tente novamente mais tarde.",
        recoverable: true,
        action: "Tentar novamente",
        severity: "error",
        originalError: error,
      });
    }
  }

  // Fallback
  const message = error instanceof Error ? error.message : String(error);
  return new AppError({
    code: ErrorCode.UNKNOWN,
    message,
    userMessage: "Ocorreu um erro inesperado. Tente novamente.",
    recoverable: true,
    action: "Tentar novamente",
    severity: "error",
    originalError: error,
  });
}

// ---------------------------------------------------------------------------
// getUserFriendlyMessage — shorthand
// ---------------------------------------------------------------------------

export function getUserFriendlyMessage(error: unknown): string {
  return classifyError(error).userMessage;
}
