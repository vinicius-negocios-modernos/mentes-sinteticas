import { describe, it, expect } from "vitest";
import {
  AppError,
  NetworkError,
  AuthError,
  RateLimitError,
  StreamError,
  ValidationError,
  ErrorCode,
  classifyError,
  getUserFriendlyMessage,
} from "@/lib/errors";

describe("AppError", () => {
  it("creates with all properties", () => {
    const err = new AppError({
      code: ErrorCode.UNKNOWN,
      message: "test error",
      userMessage: "Something went wrong",
      recoverable: true,
      action: "Retry",
      severity: "warning",
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe(ErrorCode.UNKNOWN);
    expect(err.message).toBe("test error");
    expect(err.userMessage).toBe("Something went wrong");
    expect(err.recoverable).toBe(true);
    expect(err.action).toBe("Retry");
    expect(err.severity).toBe("warning");
    expect(err.name).toBe("AppError");
  });

  it("defaults severity to 'error'", () => {
    const err = new AppError({
      code: ErrorCode.UNKNOWN,
      message: "test",
      userMessage: "test",
      recoverable: false,
      action: "none",
    });
    expect(err.severity).toBe("error");
  });

  it("stores originalError", () => {
    const original = new Error("original");
    const err = new AppError({
      code: ErrorCode.UNKNOWN,
      message: "wrapper",
      userMessage: "wrapper",
      recoverable: false,
      action: "none",
      originalError: original,
    });
    expect(err.originalError).toBe(original);
  });
});

describe("NetworkError", () => {
  it("creates with defaults", () => {
    const err = new NetworkError();
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe("NetworkError");
    expect(err.code).toBe(ErrorCode.NETWORK_FAILED);
    expect(err.recoverable).toBe(true);
    expect(err.severity).toBe("warning");
    expect(err.message).toBe("Network request failed");
  });

  it("accepts custom message", () => {
    const err = new NetworkError({ message: "Timeout" });
    expect(err.message).toBe("Timeout");
  });
});

describe("AuthError", () => {
  it("creates with default code (AUTH_EXPIRED)", () => {
    const err = new AuthError();
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe("AuthError");
    expect(err.code).toBe(ErrorCode.AUTH_EXPIRED);
    expect(err.recoverable).toBe(false);
  });

  it("creates with AUTH_UNAUTHORIZED", () => {
    const err = new AuthError(ErrorCode.AUTH_UNAUTHORIZED);
    expect(err.code).toBe(ErrorCode.AUTH_UNAUTHORIZED);
    expect(err.userMessage).toContain("autenticado");
  });

  it("creates with AUTH_FORBIDDEN", () => {
    const err = new AuthError(ErrorCode.AUTH_FORBIDDEN);
    expect(err.code).toBe(ErrorCode.AUTH_FORBIDDEN);
    expect(err.action).toBe("Voltar");
  });
});

describe("RateLimitError", () => {
  it("creates with correct properties", () => {
    const err = new RateLimitError();
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe("RateLimitError");
    expect(err.code).toBe(ErrorCode.RATE_LIMIT);
    expect(err.recoverable).toBe(true);
    expect(err.severity).toBe("warning");
  });
});

describe("StreamError", () => {
  it("creates with defaults", () => {
    const err = new StreamError();
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe("StreamError");
    expect(err.code).toBe(ErrorCode.STREAM_INTERRUPTED);
    expect(err.recoverable).toBe(true);
  });

  it("accepts custom message", () => {
    const err = new StreamError({ message: "Connection lost" });
    expect(err.message).toBe("Connection lost");
  });
});

describe("ValidationError", () => {
  it("creates with defaults", () => {
    const err = new ValidationError();
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe("ValidationError");
    expect(err.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(err.recoverable).toBe(true);
  });

  it("accepts custom userMessage", () => {
    const err = new ValidationError({ userMessage: "Campo invalido" });
    expect(err.userMessage).toBe("Campo invalido");
  });
});

describe("classifyError()", () => {
  it("returns AppError as-is", () => {
    const original = new NetworkError();
    const result = classifyError(original);
    expect(result).toBe(original);
  });

  it("classifies TypeError with fetch as NetworkError", () => {
    const err = new TypeError("Failed to fetch");
    const result = classifyError(err);
    expect(result).toBeInstanceOf(NetworkError);
    expect(result.originalError).toBe(err);
  });

  it("classifies TypeError with network as NetworkError", () => {
    const err = new TypeError("network error");
    const result = classifyError(err);
    expect(result).toBeInstanceOf(NetworkError);
  });

  it("classifies error with 429 as RateLimitError", () => {
    const err = new Error("HTTP 429 Too Many Requests");
    const result = classifyError(err);
    expect(result).toBeInstanceOf(RateLimitError);
  });

  it("classifies error with 'rate limit' as RateLimitError", () => {
    const err = new Error("Rate limit exceeded");
    const result = classifyError(err);
    expect(result).toBeInstanceOf(RateLimitError);
  });

  it("classifies error with 401 as AuthError (UNAUTHORIZED)", () => {
    const err = new Error("HTTP 401 Unauthorized");
    const result = classifyError(err);
    expect(result).toBeInstanceOf(AuthError);
    expect(result.code).toBe(ErrorCode.AUTH_UNAUTHORIZED);
  });

  it("classifies error with 403 as AuthError (FORBIDDEN)", () => {
    const err = new Error("HTTP 403 Forbidden");
    const result = classifyError(err);
    expect(result).toBeInstanceOf(AuthError);
    expect(result.code).toBe(ErrorCode.AUTH_FORBIDDEN);
  });

  it("classifies error with 'stream' as StreamError", () => {
    const err = new Error("Stream interrupted unexpectedly");
    const result = classifyError(err);
    expect(result).toBeInstanceOf(StreamError);
  });

  it("classifies error with 'readable' as StreamError", () => {
    const err = new Error("Readable stream closed");
    const result = classifyError(err);
    expect(result).toBeInstanceOf(StreamError);
  });

  it("classifies ZodError name as ValidationError", () => {
    const err = new Error("Invalid input");
    err.name = "ZodError";
    const result = classifyError(err);
    expect(result).toBeInstanceOf(ValidationError);
  });

  it("classifies error with 'validation' as ValidationError", () => {
    const err = new Error("Validation failed for field");
    const result = classifyError(err);
    expect(result).toBeInstanceOf(ValidationError);
  });

  it("classifies error with 404 as NOT_FOUND", () => {
    const err = new Error("HTTP 404 Not Found");
    const result = classifyError(err);
    expect(result.code).toBe(ErrorCode.NOT_FOUND);
    expect(result.recoverable).toBe(false);
  });

  it("classifies error with 500 as SERVER_ERROR", () => {
    const err = new Error("HTTP 500 Internal Server Error");
    const result = classifyError(err);
    expect(result.code).toBe(ErrorCode.SERVER_ERROR);
    expect(result.recoverable).toBe(true);
  });

  it("classifies unknown error as UNKNOWN", () => {
    const err = new Error("Something completely unexpected");
    const result = classifyError(err);
    expect(result.code).toBe(ErrorCode.UNKNOWN);
    expect(result.recoverable).toBe(true);
  });

  it("classifies non-Error value as UNKNOWN", () => {
    const result = classifyError("string error");
    expect(result.code).toBe(ErrorCode.UNKNOWN);
    expect(result.message).toBe("string error");
  });

  it("classifies DOMException AbortError as NetworkError", () => {
    const err = new DOMException("The operation was aborted", "AbortError");
    const result = classifyError(err);
    expect(result).toBeInstanceOf(NetworkError);
  });
});

describe("getUserFriendlyMessage()", () => {
  it("returns userMessage from AppError", () => {
    const err = new RateLimitError();
    expect(getUserFriendlyMessage(err)).toBe(err.userMessage);
  });

  it("returns userMessage for raw error", () => {
    const msg = getUserFriendlyMessage(new Error("Something unknown"));
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });
});
