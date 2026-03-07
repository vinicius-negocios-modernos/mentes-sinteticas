/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { triggerHaptic, type HapticPattern } from "@/lib/haptics";

describe("triggerHaptic()", () => {
  let vibrateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateSpy = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "vibrate", {
      value: vibrateSpy,
      writable: true,
      configurable: true,
    });

    // Default: motion is NOT reduced
    Object.defineProperty(window, "matchMedia", {
      value: vi.fn().mockReturnValue({ matches: false }),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("triggers light pattern (10ms)", () => {
    const result = triggerHaptic("light");
    expect(vibrateSpy).toHaveBeenCalledWith(10);
    expect(result).toBe(true);
  });

  it("triggers medium pattern (25ms)", () => {
    triggerHaptic("medium");
    expect(vibrateSpy).toHaveBeenCalledWith(25);
  });

  it("triggers confirm pattern ([10, 50, 10])", () => {
    triggerHaptic("confirm");
    expect(vibrateSpy).toHaveBeenCalledWith([10, 50, 10]);
  });

  it("triggers error pattern ([50, 30, 50])", () => {
    triggerHaptic("error");
    expect(vibrateSpy).toHaveBeenCalledWith([50, 30, 50]);
  });

  it("defaults to light pattern when no argument", () => {
    triggerHaptic();
    expect(vibrateSpy).toHaveBeenCalledWith(10);
  });

  it("returns false when navigator.vibrate is not available", () => {
    Object.defineProperty(navigator, "vibrate", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const result = triggerHaptic("light");
    expect(result).toBe(false);
  });

  it("does not vibrate when prefers-reduced-motion is active", () => {
    Object.defineProperty(window, "matchMedia", {
      value: vi.fn().mockReturnValue({ matches: true }),
      writable: true,
      configurable: true,
    });
    const result = triggerHaptic("confirm");
    expect(vibrateSpy).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("accepts all valid HapticPattern types", () => {
    const validPatterns: HapticPattern[] = ["light", "medium", "confirm", "error"];
    for (const pattern of validPatterns) {
      vibrateSpy.mockClear();
      triggerHaptic(pattern);
      expect(vibrateSpy).toHaveBeenCalledTimes(1);
    }
  });
});
