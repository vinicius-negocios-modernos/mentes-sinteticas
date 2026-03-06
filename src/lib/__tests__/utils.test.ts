import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn()", () => {
  it("merges simple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles single class", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });

  it("handles conditional classes (clsx)", () => {
    expect(cn("base", false && "hidden", true && "visible")).toBe(
      "base visible"
    );
  });

  it("handles undefined and null values", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });

  it("resolves Tailwind conflicts (tailwind-merge)", () => {
    // tailwind-merge should keep the last conflicting class
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("mt-2", "mt-4")).toBe("mt-4");
  });

  it("merges non-conflicting Tailwind classes", () => {
    expect(cn("p-4", "m-2")).toBe("p-4 m-2");
  });

  it("handles array of classes", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles object syntax for conditional classes", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });
});
