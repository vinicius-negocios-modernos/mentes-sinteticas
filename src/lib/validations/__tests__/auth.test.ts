import { describe, it, expect } from "vitest";
import { SignupSchema } from "@/lib/validations/auth";

describe("SignupSchema", () => {
  it("accepts a valid email + password", () => {
    const result = SignupSchema.safeParse({
      email: "user@example.com",
      password: "senha1234",
    });
    expect(result.success).toBe(true);
  });

  it("normalizes email to lowercase and trims it", () => {
    const result = SignupSchema.safeParse({
      email: "  User@Example.COM  ",
      password: "senha1234",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("rejects a malformed email", () => {
    const result = SignupSchema.safeParse({
      email: "not-an-email",
      password: "senha1234",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing email", () => {
    const result = SignupSchema.safeParse({
      password: "senha1234",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing password", () => {
    const result = SignupSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 chars", () => {
    const result = SignupSchema.safeParse({
      email: "user@example.com",
      password: "abc123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password longer than 72 chars", () => {
    const result = SignupSchema.safeParse({
      email: "user@example.com",
      password: "a1" + "x".repeat(71),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no number", () => {
    const result = SignupSchema.safeParse({
      email: "user@example.com",
      password: "onlyletters",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no letter", () => {
    const result = SignupSchema.safeParse({
      email: "user@example.com",
      password: "12345678",
    });
    expect(result.success).toBe(false);
  });

  it("rejects extra/unknown payload fields (.strict)", () => {
    const result = SignupSchema.safeParse({
      email: "user@example.com",
      password: "senha1234",
      role: "admin",
      isAdmin: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a SQL-injection-style email payload", () => {
    const result = SignupSchema.safeParse({
      email: "'; DROP TABLE users; --",
      password: "senha1234",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-string password (type confusion)", () => {
    const result = SignupSchema.safeParse({
      email: "user@example.com",
      password: 12345678,
    });
    expect(result.success).toBe(false);
  });
});
