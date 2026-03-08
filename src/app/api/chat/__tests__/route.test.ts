import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  authMockModule,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAuthMocks,
} from "../../../../../tests/helpers/auth-mock";

// ── Hoisted mock functions (available before vi.mock hoisting) ────────

const {
  mockCheckRateLimit,
  mockIncrementRateLimit,
  mockCleanupExpiredLimits,
  mockGetMindByName,
  mockCreateConversation,
  mockGetConversationById,
  mockTouchConversation,
  mockCreateMessage,
  mockStreamMindChat,
  mockEstimateMessagesTokens,
  mockGetUserDailyUsage,
  mockGetUserMonthlyUsage,
  mockRecordUsage,
} = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
  mockIncrementRateLimit: vi.fn(),
  mockCleanupExpiredLimits: vi.fn(() => Promise.resolve()),
  mockGetMindByName: vi.fn(),
  mockCreateConversation: vi.fn(),
  mockGetConversationById: vi.fn(),
  mockTouchConversation: vi.fn(),
  mockCreateMessage: vi.fn(),
  mockStreamMindChat: vi.fn(),
  mockEstimateMessagesTokens: vi.fn(() => 100),
  mockGetUserDailyUsage: vi.fn(() =>
    Promise.resolve({ totalTokens: 0, totalCost: 0 })
  ),
  mockGetUserMonthlyUsage: vi.fn(() =>
    Promise.resolve({ totalTokens: 0, totalCost: 0 })
  ),
  mockRecordUsage: vi.fn(() => Promise.resolve()),
}));

// ── Mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => authMockModule());

vi.mock("@/lib/services/rate-limiter", () => ({
  checkRateLimit: mockCheckRateLimit,
  incrementRateLimit: mockIncrementRateLimit,
  cleanupExpiredLimits: mockCleanupExpiredLimits,
  DEFAULT_LIMITS: {
    sendMessage: {
      perMinute: { maxRequests: 10, windowMs: 60000 },
      perHour: { maxRequests: 100, windowMs: 3600000 },
    },
  },
}));

vi.mock("@/lib/services/minds", () => ({
  getMindByName: mockGetMindByName,
}));

vi.mock("@/lib/services/conversations", () => ({
  createConversation: mockCreateConversation,
  getConversationById: mockGetConversationById,
  touchConversation: mockTouchConversation,
}));

vi.mock("@/lib/services/messages", () => ({
  createMessage: mockCreateMessage,
}));

vi.mock("@/lib/ai", () => ({
  streamMindChat: mockStreamMindChat,
  TOKEN_LIMITS: { daily: 500000, monthly: 5000000 },
}));

vi.mock("@/lib/ai/context", () => ({
  estimateMessagesTokens: mockEstimateMessagesTokens,
}));

vi.mock("@/lib/services/token-usage", () => ({
  getUserDailyUsage: mockGetUserDailyUsage,
  getUserMonthlyUsage: mockGetUserMonthlyUsage,
  recordUsage: mockRecordUsage,
}));

vi.mock("@/lib/ai/pricing", () => ({
  calculateCost: vi.fn(() => 0.001),
}));

vi.mock("@sentry/nextjs", () => ({
  startSpan: vi.fn((_opts: unknown, fn: () => unknown) => fn()),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// ── Import SUT after mocks ────────────────────────────────────────────

import { POST } from "../route";

// ── Helpers ───────────────────────────────────────────────────────────

const USER_ID = "user-001";
const USER_EMAIL = "test@example.com";
const CONV_ID = "550e8400-e29b-41d4-a716-446655440000";
const MIND_DB_ID = "mind-db-001";

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    mindName: "aristoteles",
    message: "Ola mente",
    ...overrides,
  };
}

function setupAuthenticatedAndAllowed() {
  mockAuthenticatedUser(USER_ID, USER_EMAIL);
  mockCheckRateLimit.mockResolvedValue({ allowed: true });
  mockIncrementRateLimit.mockResolvedValue(undefined);
}

function setupMindAndConversation() {
  mockGetMindByName.mockResolvedValue({ id: MIND_DB_ID, name: "aristoteles" });
  mockCreateConversation.mockResolvedValue({ id: CONV_ID });
  mockCreateMessage.mockResolvedValue(undefined);
  mockTouchConversation.mockResolvedValue(undefined);
}

function setupStreamResponse() {
  mockStreamMindChat.mockResolvedValue({
    toTextStreamResponse: ({ headers }: { headers: Record<string, string> }) =>
      new Response("streamed text", { status: 200, headers }),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("POST /api/chat", () => {
  beforeEach(() => {
    resetAuthMocks();
    vi.clearAllMocks();
  });

  // ── 400: Invalid body ───────────────────────────────────────────────

  describe("400 — Zod validation errors", () => {
    it("returns 400 when mindName is missing", async () => {
      const res = await POST(makeRequest({ message: "hello" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });

    it("returns 400 when message is empty", async () => {
      const res = await POST(makeRequest({ mindName: "aristoteles", message: "" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when message exceeds 4000 chars", async () => {
      const longMsg = "a".repeat(4001);
      const res = await POST(makeRequest({ mindName: "aristoteles", message: longMsg }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when conversationId is not a valid UUID", async () => {
      const res = await POST(
        makeRequest({ mindName: "aristoteles", message: "hi", conversationId: "not-a-uuid" })
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when mindName contains invalid characters", async () => {
      const res = await POST(makeRequest({ mindName: "ari$toteles!", message: "hi" }));
      expect(res.status).toBe(400);
    });
  });

  // ── 401: Unauthenticated ────────────────────────────────────────────

  describe("401 — unauthenticated", () => {
    it("returns 401 when no user is authenticated", async () => {
      mockUnauthenticatedUser();
      const res = await POST(makeRequest(validBody()));
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("login");
    });
  });

  // ── 429: Rate limit exceeded ────────────────────────────────────────

  describe("429 — rate limit exceeded", () => {
    it("returns 429 when rate limit is not allowed (per-minute)", async () => {
      mockAuthenticatedUser(USER_ID, USER_EMAIL);
      mockCheckRateLimit.mockResolvedValue({
        allowed: false,
        maxAllowed: 10,
        limitType: "per-minute",
        retryAfterSeconds: 30,
      });

      const res = await POST(makeRequest(validBody()));
      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.error).toContain("10");
      expect(json.error).toContain("minuto");
    });

    it("returns 429 with hora for per-hour limit", async () => {
      mockAuthenticatedUser(USER_ID, USER_EMAIL);
      mockCheckRateLimit.mockResolvedValue({
        allowed: false,
        maxAllowed: 100,
        limitType: "per-hour",
        retryAfterSeconds: 120,
      });

      const res = await POST(makeRequest(validBody()));
      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.error).toContain("hora");
    });
  });

  // ── 404: Conversation not found ─────────────────────────────────────

  describe("404 — conversation not found", () => {
    it("returns 404 when conversationId does not exist for user", async () => {
      setupAuthenticatedAndAllowed();
      mockGetMindByName.mockResolvedValue({ id: MIND_DB_ID, name: "aristoteles" });
      mockGetConversationById.mockResolvedValue(null);

      const res = await POST(makeRequest(validBody({ conversationId: CONV_ID })));
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toContain("Conversa");
    });
  });

  // ── 200: New conversation (no conversationId) ───────────────────────

  describe("success — creates new conversation when conversationId absent", () => {
    it("creates a new conversation and streams response", async () => {
      setupAuthenticatedAndAllowed();
      setupMindAndConversation();
      setupStreamResponse();

      const res = await POST(makeRequest(validBody()));

      expect(res.status).toBe(200);
      expect(mockCreateConversation).toHaveBeenCalledWith(
        USER_ID,
        MIND_DB_ID,
        expect.any(String)
      );
      expect(mockCreateMessage).toHaveBeenCalledWith(CONV_ID, "user", "Ola mente");
      expect(mockIncrementRateLimit).toHaveBeenCalledWith(USER_ID, "sendMessage");
      expect(res.headers.get("X-Conversation-Id")).toBe(CONV_ID);
    });
  });

  // ── 200: Existing conversation ──────────────────────────────────────

  describe("success — existing conversation", () => {
    it("uses existing conversation when conversationId provided", async () => {
      setupAuthenticatedAndAllowed();
      mockGetMindByName.mockResolvedValue({ id: MIND_DB_ID, name: "aristoteles" });
      mockGetConversationById.mockResolvedValue({ id: CONV_ID });
      mockCreateMessage.mockResolvedValue(undefined);
      mockTouchConversation.mockResolvedValue(undefined);
      setupStreamResponse();

      const res = await POST(makeRequest(validBody({ conversationId: CONV_ID })));

      expect(res.status).toBe(200);
      expect(mockGetConversationById).toHaveBeenCalledWith(CONV_ID, USER_ID);
      expect(mockCreateConversation).not.toHaveBeenCalled();
      expect(mockCreateMessage).toHaveBeenCalledWith(CONV_ID, "user", "Ola mente");
    });
  });

  // ── 200: Full flow with streamMindChat ──────────────────────────────

  describe("success — full streaming flow", () => {
    it("calls streamMindChat with correct params and returns stream", async () => {
      setupAuthenticatedAndAllowed();
      setupMindAndConversation();
      setupStreamResponse();

      const history = [{ role: "user" as const, content: "previous msg" }];
      const res = await POST(makeRequest(validBody({ history })));

      expect(res.status).toBe(200);
      expect(mockStreamMindChat).toHaveBeenCalledWith(
        expect.objectContaining({
          mindName: "aristoteles",
          userMessage: "Ola mente",
          history,
          onFinish: expect.any(Function),
        })
      );
      expect(mockEstimateMessagesTokens).toHaveBeenCalledWith(history);
    });

    it("onFinish persists assistant message and touches conversation", async () => {
      setupAuthenticatedAndAllowed();
      setupMindAndConversation();

      let capturedOnFinish: (args: {
        text: string;
        usage?: { inputTokens: number; outputTokens: number };
        model?: string;
      }) => Promise<void>;
      mockStreamMindChat.mockImplementation(
        async (opts: { onFinish: typeof capturedOnFinish }) => {
          capturedOnFinish = opts.onFinish;
          return {
            toTextStreamResponse: ({
              headers,
            }: {
              headers: Record<string, string>;
            }) => new Response("stream", { status: 200, headers }),
          };
        }
      );

      await POST(makeRequest(validBody()));

      // Invoke the captured onFinish callback
      await capturedOnFinish!({
        text: "AI response text",
        usage: { inputTokens: 50, outputTokens: 100 },
        model: "gemini-2.0-flash",
      });
      expect(mockCreateMessage).toHaveBeenCalledWith(
        CONV_ID,
        "assistant",
        "AI response text"
      );
      expect(mockTouchConversation).toHaveBeenCalledWith(CONV_ID);
    });
  });

  // ── 404/500: Error handling in catch block ──────────────────────────

  describe("error handling — catch block", () => {
    it("returns 404 when streamMindChat throws 'not found' error", async () => {
      setupAuthenticatedAndAllowed();
      setupMindAndConversation();
      mockStreamMindChat.mockRejectedValue(new Error("Mind not found"));

      const res = await POST(makeRequest(validBody()));
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toContain("Mente");
    });

    it("returns 500 when streamMindChat throws GEMINI_API_KEY error", async () => {
      setupAuthenticatedAndAllowed();
      setupMindAndConversation();
      mockStreamMindChat.mockRejectedValue(new Error("GEMINI_API_KEY is not set"));

      const res = await POST(makeRequest(validBody()));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain("Chave");
    });

    it("returns 500 for generic errors", async () => {
      setupAuthenticatedAndAllowed();
      setupMindAndConversation();
      mockStreamMindChat.mockRejectedValue(new Error("Something unexpected"));

      const res = await POST(makeRequest(validBody()));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain("Erro");
    });
  });
});
