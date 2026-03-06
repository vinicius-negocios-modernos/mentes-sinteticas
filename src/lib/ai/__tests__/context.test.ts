import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ModelMessage } from "@ai-sdk/provider-utils";

describe("AI Context", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  describe("estimateTokenCount()", () => {
    it("estimates tokens as ceil(length / 4)", async () => {
      const { estimateTokenCount } = await import("@/lib/ai/context");
      expect(estimateTokenCount("")).toBe(0);
      expect(estimateTokenCount("a")).toBe(1); // ceil(1/4) = 1
      expect(estimateTokenCount("abcd")).toBe(1); // ceil(4/4) = 1
      expect(estimateTokenCount("abcde")).toBe(2); // ceil(5/4) = 2
    });

    it("handles long strings", async () => {
      const { estimateTokenCount } = await import("@/lib/ai/context");
      const longText = "a".repeat(1000);
      expect(estimateTokenCount(longText)).toBe(250); // ceil(1000/4)
    });
  });

  describe("estimateMessagesTokens()", () => {
    it("sums token estimates for all messages with overhead", async () => {
      const { estimateMessagesTokens } = await import("@/lib/ai/context");
      const messages: ModelMessage[] = [
        { role: "user", content: "Hello" }, // ceil(5/4) + 4 = 6
        { role: "assistant", content: "Hi there" }, // ceil(8/4) + 4 = 6
      ];
      expect(estimateMessagesTokens(messages)).toBe(12);
    });

    it("returns 0 for empty array", async () => {
      const { estimateMessagesTokens } = await import("@/lib/ai/context");
      expect(estimateMessagesTokens([])).toBe(0);
    });

    it("handles messages with array content", async () => {
      const { estimateMessagesTokens } = await import("@/lib/ai/context");
      const messages: ModelMessage[] = [
        {
          role: "user",
          content: [{ type: "text", text: "Hello world" }],
        } as ModelMessage,
      ];
      // "Hello world" = 11 chars -> ceil(11/4) = 3 + 4 overhead = 7
      expect(estimateMessagesTokens(messages)).toBe(7);
    });

    it("handles messages with plain string array parts", async () => {
      const { estimateMessagesTokens } = await import("@/lib/ai/context");
      const messages: ModelMessage[] = [
        {
          role: "user",
          content: ["Hello", "World"] as unknown,
        } as ModelMessage,
      ];
      // "HelloWorld" = 10 chars -> ceil(10/4) = 3 + 4 overhead = 7
      expect(estimateMessagesTokens(messages)).toBe(7);
    });

    it("handles messages with non-text array parts (returns empty)", async () => {
      const { estimateMessagesTokens } = await import("@/lib/ai/context");
      const messages: ModelMessage[] = [
        {
          role: "user",
          content: [{ type: "image", data: "binary" }] as unknown,
        } as ModelMessage,
      ];
      // no text -> 0 chars -> ceil(0/4) = 0 + 4 overhead = 4
      expect(estimateMessagesTokens(messages)).toBe(4);
    });

    it("handles messages with non-string non-array content", async () => {
      const { estimateMessagesTokens } = await import("@/lib/ai/context");
      const messages: ModelMessage[] = [
        {
          role: "user",
          content: 12345 as unknown,
        } as ModelMessage,
      ];
      // non-string, non-array -> empty string -> 0 + 4 overhead = 4
      expect(estimateMessagesTokens(messages)).toBe(4);
    });
  });

  describe("truncateHistory()", () => {
    it("returns all messages when within budget", async () => {
      delete process.env.CONTEXT_MAX_HISTORY_TOKENS;
      delete process.env.CONTEXT_MAX_MESSAGES;

      const { truncateHistory } = await import("@/lib/ai/context");
      const messages: ModelMessage[] = [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello" },
      ];
      const result = truncateHistory(messages, 1000);
      expect(result).toHaveLength(2);
      expect(result).toEqual(messages);
    });

    it("truncates oldest messages when exceeding token budget", async () => {
      delete process.env.CONTEXT_MAX_HISTORY_TOKENS;
      delete process.env.CONTEXT_MAX_MESSAGES;

      const { truncateHistory } = await import("@/lib/ai/context");
      const messages: ModelMessage[] = [
        { role: "user", content: "a".repeat(100) }, // ceil(100/4)+4 = 29
        { role: "assistant", content: "b".repeat(100) }, // 29
        { role: "user", content: "c".repeat(100) }, // 29
      ];
      // Budget of 30 should keep only the last message
      const result = truncateHistory(messages, 30);
      expect(result.length).toBeLessThan(messages.length);
      // Last message should always be included
      expect(result[result.length - 1]).toBe(messages[messages.length - 1]);
    });

    it("applies maxMessages limit", async () => {
      vi.stubEnv("CONTEXT_MAX_MESSAGES", "2");
      delete process.env.CONTEXT_MAX_HISTORY_TOKENS;

      const { truncateHistory } = await import("@/lib/ai/context");
      const messages: ModelMessage[] = [
        { role: "user", content: "First" },
        { role: "assistant", content: "Second" },
        { role: "user", content: "Third" },
      ];
      // maxMessages=2, large token budget so only message limit applies
      const result = truncateHistory(messages, 100000);
      expect(result).toHaveLength(2);
      // Should keep the most recent messages
      expect(result[0]).toBe(messages[1]);
      expect(result[1]).toBe(messages[2]);
    });

    it("handles empty history", async () => {
      delete process.env.CONTEXT_MAX_HISTORY_TOKENS;
      delete process.env.CONTEXT_MAX_MESSAGES;

      const { truncateHistory } = await import("@/lib/ai/context");
      const result = truncateHistory([], 1000);
      expect(result).toHaveLength(0);
    });

    it("keeps at least one message even if over budget", async () => {
      delete process.env.CONTEXT_MAX_HISTORY_TOKENS;
      delete process.env.CONTEXT_MAX_MESSAGES;

      const { truncateHistory } = await import("@/lib/ai/context");
      const messages: ModelMessage[] = [
        { role: "user", content: "a".repeat(1000) },
      ];
      // Budget of 1 token — message is way over, but should still keep it
      const result = truncateHistory(messages, 1);
      expect(result).toHaveLength(1);
    });
  });

  describe("getContextBudget()", () => {
    it("returns defaults when no env vars set", async () => {
      delete process.env.CONTEXT_MAX_HISTORY_TOKENS;
      delete process.env.CONTEXT_MAX_MESSAGES;

      const { getContextBudget } = await import("@/lib/ai/context");
      const budget = getContextBudget();

      expect(budget.maxHistoryTokens).toBe(30_000);
      expect(budget.maxMessages).toBe(50);
    });

    it("respects env var overrides", async () => {
      vi.stubEnv("CONTEXT_MAX_HISTORY_TOKENS", "10000");
      vi.stubEnv("CONTEXT_MAX_MESSAGES", "20");

      const { getContextBudget } = await import("@/lib/ai/context");
      const budget = getContextBudget();

      expect(budget.maxHistoryTokens).toBe(10000);
      expect(budget.maxMessages).toBe(20);
    });

    it("throws on invalid context config values", async () => {
      vi.stubEnv("CONTEXT_MAX_HISTORY_TOKENS", "invalid");

      const { getContextBudget } = await import("@/lib/ai/context");
      expect(() => getContextBudget()).toThrow("Context configuration error");
    });
  });
});
