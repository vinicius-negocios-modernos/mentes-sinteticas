import { describe, it, expect } from "vitest";
import { CreateDebateSchema, DebateActionSchema } from "@/lib/validations/debate";

describe("CreateDebateSchema", () => {
  it("accepts valid input with 2 participants", () => {
    const result = CreateDebateSchema.safeParse({
      topic: "O papel da IA na educacao",
      participantSlugs: ["socrates", "nietzsche"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with 4 participants", () => {
    const result = CreateDebateSchema.safeParse({
      topic: "Filosofia politica",
      participantSlugs: ["socrates", "nietzsche", "maquiavel", "kant"],
    });
    expect(result.success).toBe(true);
  });

  it("trims topic whitespace", () => {
    const result = CreateDebateSchema.safeParse({
      topic: "  Debate topic  ",
      participantSlugs: ["a", "b"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.topic).toBe("Debate topic");
    }
  });

  it("rejects topic shorter than 3 chars", () => {
    const result = CreateDebateSchema.safeParse({
      topic: "ab",
      participantSlugs: ["a", "b"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects topic longer than 500 chars", () => {
    const result = CreateDebateSchema.safeParse({
      topic: "x".repeat(501),
      participantSlugs: ["a", "b"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects fewer than 2 participants", () => {
    const result = CreateDebateSchema.safeParse({
      topic: "Valid topic",
      participantSlugs: ["alone"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 4 participants", () => {
    const result = CreateDebateSchema.safeParse({
      topic: "Valid topic",
      participantSlugs: ["a", "b", "c", "d", "e"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty slugs in array", () => {
    const result = CreateDebateSchema.safeParse({
      topic: "Valid topic",
      participantSlugs: ["a", ""],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing topic", () => {
    const result = CreateDebateSchema.safeParse({
      participantSlugs: ["a", "b"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing participantSlugs", () => {
    const result = CreateDebateSchema.safeParse({
      topic: "Valid topic",
    });
    expect(result.success).toBe(false);
  });
});

describe("DebateActionSchema", () => {
  it("accepts valid next-turn action", () => {
    const result = DebateActionSchema.safeParse({
      debateId: "550e8400-e29b-41d4-a716-446655440000",
      action: "next-turn",
    });
    expect(result.success).toBe(true);
  });

  it("accepts interject with message", () => {
    const result = DebateActionSchema.safeParse({
      debateId: "550e8400-e29b-41d4-a716-446655440000",
      action: "interject",
      message: "Concordo com Socrates neste ponto.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts pause action", () => {
    const result = DebateActionSchema.safeParse({
      debateId: "550e8400-e29b-41d4-a716-446655440000",
      action: "pause",
    });
    expect(result.success).toBe(true);
  });

  it("accepts resume action", () => {
    const result = DebateActionSchema.safeParse({
      debateId: "550e8400-e29b-41d4-a716-446655440000",
      action: "resume",
    });
    expect(result.success).toBe(true);
  });

  it("accepts end action", () => {
    const result = DebateActionSchema.safeParse({
      debateId: "550e8400-e29b-41d4-a716-446655440000",
      action: "end",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid debateId (not UUID)", () => {
    const result = DebateActionSchema.safeParse({
      debateId: "not-a-uuid",
      action: "next-turn",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid action", () => {
    const result = DebateActionSchema.safeParse({
      debateId: "550e8400-e29b-41d4-a716-446655440000",
      action: "invalid-action",
    });
    expect(result.success).toBe(false);
  });

  it("allows message to be optional", () => {
    const result = DebateActionSchema.safeParse({
      debateId: "550e8400-e29b-41d4-a716-446655440000",
      action: "next-turn",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBeUndefined();
    }
  });
});
