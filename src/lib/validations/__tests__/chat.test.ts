import { describe, it, expect } from "vitest";
import {
  sanitizeMessage,
  ChatMessageSchema,
  MindIdSchema,
  ConversationIdSchema,
  SendMessageInputSchema,
} from "@/lib/validations/chat";

describe("sanitizeMessage()", () => {
  it("removes control characters", () => {
    const input = "Hello\x00World\x01!\x7F";
    expect(sanitizeMessage(input)).toBe("HelloWorld!");
  });

  it("preserves newlines (\\n and \\r)", () => {
    const input = "Line 1\nLine 2\rLine 3";
    expect(sanitizeMessage(input)).toBe("Line 1\nLine 2\rLine 3");
  });

  it("preserves tabs (\\t)", () => {
    // \t is \x09, which is NOT in the stripped range (\x00-\x08, \x0B, \x0C, \x0E-\x1F)
    const input = "Hello\tWorld";
    expect(sanitizeMessage(input)).toBe("Hello\tWorld");
  });

  it("trims whitespace", () => {
    expect(sanitizeMessage("  hello  ")).toBe("hello");
  });

  it("handles empty string after trim", () => {
    expect(sanitizeMessage("   ")).toBe("");
  });

  it("handles string with only control characters", () => {
    expect(sanitizeMessage("\x00\x01\x02")).toBe("");
  });
});

describe("ChatMessageSchema", () => {
  it("accepts valid message", () => {
    const result = ChatMessageSchema.safeParse("Hello, how are you?");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("Hello, how are you?");
    }
  });

  it("rejects empty string", () => {
    const result = ChatMessageSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects string > 4000 chars", () => {
    const longStr = "a".repeat(4001);
    const result = ChatMessageSchema.safeParse(longStr);
    expect(result.success).toBe(false);
  });

  it("accepts string at exactly 4000 chars", () => {
    const maxStr = "a".repeat(4000);
    const result = ChatMessageSchema.safeParse(maxStr);
    expect(result.success).toBe(true);
  });

  it("applies sanitization (strips control chars)", () => {
    const result = ChatMessageSchema.safeParse("Hello\x00World");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("HelloWorld");
    }
  });

  it("rejects string that becomes empty after sanitization", () => {
    // String of only control characters + whitespace
    const result = ChatMessageSchema.safeParse("\x00\x01  ");
    expect(result.success).toBe(false);
  });
});

describe("MindIdSchema", () => {
  it("accepts valid alphanumeric name", () => {
    const result = MindIdSchema.safeParse("test-mind");
    expect(result.success).toBe(true);
  });

  it("accepts name with spaces", () => {
    const result = MindIdSchema.safeParse("My Test Mind");
    expect(result.success).toBe(true);
  });

  it("accepts name with hyphens", () => {
    const result = MindIdSchema.safeParse("my-test-mind");
    expect(result.success).toBe(true);
  });

  it("rejects empty string", () => {
    const result = MindIdSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects name with special characters", () => {
    const result = MindIdSchema.safeParse("test@mind!");
    expect(result.success).toBe(false);
  });

  it("rejects name with unicode characters", () => {
    const result = MindIdSchema.safeParse("mente-sintetica-");
    // This has only allowed chars
    expect(result.success).toBe(true);
  });

  it("rejects name > 100 chars", () => {
    const result = MindIdSchema.safeParse("a".repeat(101));
    expect(result.success).toBe(false);
  });

  it("rejects name with underscores", () => {
    const result = MindIdSchema.safeParse("test_mind");
    expect(result.success).toBe(false);
  });
});

describe("ConversationIdSchema", () => {
  it("accepts valid UUID v4", () => {
    const result = ConversationIdSchema.safeParse(
      "550e8400-e29b-41d4-a716-446655440000"
    );
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID", () => {
    const result = ConversationIdSchema.safeParse("not-a-uuid");
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = ConversationIdSchema.safeParse("");
    expect(result.success).toBe(false);
  });
});

describe("SendMessageInputSchema", () => {
  it("accepts complete valid input", () => {
    const result = SendMessageInputSchema.safeParse({
      mindName: "test-mind",
      message: "Hello!",
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts input without conversationId (optional)", () => {
    const result = SendMessageInputSchema.safeParse({
      mindName: "test-mind",
      message: "Hello!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects input without mindName", () => {
    const result = SendMessageInputSchema.safeParse({
      message: "Hello!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects input without message", () => {
    const result = SendMessageInputSchema.safeParse({
      mindName: "test-mind",
    });
    expect(result.success).toBe(false);
  });

  it("rejects input with invalid conversationId", () => {
    const result = SendMessageInputSchema.safeParse({
      mindName: "test-mind",
      message: "Hello!",
      conversationId: "invalid",
    });
    expect(result.success).toBe(false);
  });
});
