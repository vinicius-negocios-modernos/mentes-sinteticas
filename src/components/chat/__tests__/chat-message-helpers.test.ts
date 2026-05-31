// @vitest-environment jsdom
/**
 * UX-11 / SYS-9 (TD-5.5) — unit tests for the pure ChatMessage helpers.
 *
 * getInitials / formatTimestamp / extractText were extracted from chat-message.tsx
 * so they could be tested directly. These pin their exact contracts (and ensure
 * the extraction did not alter them).
 */
import { describe, it, expect } from "vitest";
import {
  getInitials,
  formatTimestamp,
  extractText,
} from "../chat-message-helpers";

describe("getInitials", () => {
  it("returns the first letters of the first two words, uppercased", () => {
    expect(getInitials("Antonio Napole")).toBe("AN");
  });

  it("uses a single word's first letter when only one word is given", () => {
    expect(getInitials("Socrates")).toBe("S");
  });

  it("caps at two initials for longer names", () => {
    expect(getInitials("Marco Aurelio Antonino")).toBe("MA");
  });

  it("collapses repeated whitespace", () => {
    expect(getInitials("  Plato   Filosofo ")).toBe("PF");
  });
});

describe("formatTimestamp", () => {
  it("formats to pt-BR HH:MM (zero-padded)", () => {
    const out = formatTimestamp(new Date("2026-05-31T09:05:00"));
    expect(out).toMatch(/^\d{2}:\d{2}$/);
    expect(out).toBe("09:05");
  });
});

describe("extractText", () => {
  it("returns strings and numbers directly", () => {
    expect(extractText("hello")).toBe("hello");
    expect(extractText(42)).toBe("42");
  });

  it("joins arrays of nodes", () => {
    expect(extractText(["a", "b", 3])).toBe("ab3");
  });

  it("recurses into element children via props", () => {
    const node = { props: { children: ["x", { props: { children: "y" } }] } };
    expect(extractText(node as never)).toBe("xy");
  });

  it("returns empty string for null/undefined", () => {
    expect(extractText(null)).toBe("");
    expect(extractText(undefined)).toBe("");
  });
});
