import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockDb,
  dbMockModule,
  mockDbInsert,
  mockDbSelect,
  resetDbMocks,
} from "../../../../tests/helpers/db-mock";

vi.mock("@/db", () => dbMockModule());

// Must import AFTER vi.mock
import { createMessage, listByConversation } from "../messages";

// ── Fixtures ─────────────────────────────────────────────────────────

const NOW = new Date("2026-03-07T12:00:00Z");

function fakeMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg-1",
    conversationId: "conv-1",
    role: "user" as const,
    content: "Hello",
    tokenCount: null,
    createdAt: NOW,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe("messages service", () => {
  beforeEach(() => {
    resetDbMocks();
  });

  // ── createMessage ────────────────────────────────────────────────

  describe("createMessage()", () => {
    it("creates a user message", async () => {
      const expected = fakeMessage({ role: "user", content: "Hi there" });
      mockDbInsert([expected]);

      const result = await createMessage("conv-1", "user", "Hi there");

      expect(result).toEqual(expected);
      expect(mockDb.insert).toHaveBeenCalledOnce();
    });

    it("creates an assistant message", async () => {
      const expected = fakeMessage({
        id: "msg-2",
        role: "assistant",
        content: "Hello! How can I help?",
      });
      mockDbInsert([expected]);

      const result = await createMessage(
        "conv-1",
        "assistant",
        "Hello! How can I help?"
      );

      expect(result).toEqual(expected);
      expect(mockDb.insert).toHaveBeenCalledOnce();
    });

    it("creates a message with optional tokenCount", async () => {
      const expected = fakeMessage({
        id: "msg-3",
        content: "Counted message",
        tokenCount: 42,
      });
      mockDbInsert([expected]);

      const result = await createMessage("conv-1", "user", "Counted message", 42);

      expect(result).toEqual(expected);
      expect(result.tokenCount).toBe(42);
      expect(mockDb.insert).toHaveBeenCalledOnce();
    });

    it("sets tokenCount to null when not provided", async () => {
      const expected = fakeMessage({ tokenCount: null });
      mockDbInsert([expected]);

      const result = await createMessage("conv-1", "user", "Hello");

      expect(result.tokenCount).toBeNull();
    });
  });

  // ── listByConversation ───────────────────────────────────────────

  describe("listByConversation()", () => {
    it("returns messages ordered chronologically", async () => {
      const msg1 = fakeMessage({
        id: "msg-1",
        role: "user",
        content: "First",
        createdAt: new Date("2026-03-07T12:00:00Z"),
      });
      const msg2 = fakeMessage({
        id: "msg-2",
        role: "assistant",
        content: "Second",
        createdAt: new Date("2026-03-07T12:01:00Z"),
      });
      const msg3 = fakeMessage({
        id: "msg-3",
        role: "user",
        content: "Third",
        createdAt: new Date("2026-03-07T12:02:00Z"),
      });
      mockDbSelect([msg1, msg2, msg3]);

      const result = await listByConversation("conv-1");

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("msg-1");
      expect(result[2].id).toBe("msg-3");
      expect(mockDb.select).toHaveBeenCalledOnce();
    });

    it("returns empty array when no messages exist", async () => {
      mockDbSelect([]);

      const result = await listByConversation("conv-1");

      expect(result).toEqual([]);
    });
  });
});
