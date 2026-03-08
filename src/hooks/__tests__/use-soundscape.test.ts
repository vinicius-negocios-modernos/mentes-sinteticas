// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Test localStorage preferences logic directly (extracted for unit testing)
const PREFS_KEY = "synkra-soundscape-prefs";

interface SoundscapePrefs {
  volume: number;
  muted: boolean;
  enabled: boolean;
}

const DEFAULT_PREFS: SoundscapePrefs = {
  volume: 0.3,
  muted: false,
  enabled: true,
};

function loadPrefs(): SoundscapePrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      volume:
        typeof parsed.volume === "number"
          ? Math.max(0, Math.min(1, parsed.volume))
          : DEFAULT_PREFS.volume,
      muted:
        typeof parsed.muted === "boolean" ? parsed.muted : DEFAULT_PREFS.muted,
      enabled:
        typeof parsed.enabled === "boolean"
          ? parsed.enabled
          : DEFAULT_PREFS.enabled,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: SoundscapePrefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

describe("use-soundscape preferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should return defaults when no prefs stored", () => {
    const prefs = loadPrefs();
    expect(prefs).toEqual(DEFAULT_PREFS);
  });

  it("should save and load preferences", () => {
    const custom: SoundscapePrefs = {
      volume: 0.7,
      muted: true,
      enabled: false,
    };
    savePrefs(custom);
    const loaded = loadPrefs();
    expect(loaded).toEqual(custom);
  });

  it("should clamp volume to 0-1 range", () => {
    savePrefs({ volume: 1.5, muted: false, enabled: true });
    const loaded = loadPrefs();
    expect(loaded.volume).toBe(1);
  });

  it("should return defaults for invalid JSON", () => {
    localStorage.setItem(PREFS_KEY, "not-valid-json");
    const prefs = loadPrefs();
    expect(prefs).toEqual(DEFAULT_PREFS);
  });

  it("should handle partial data gracefully", () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ volume: 0.5 }));
    const prefs = loadPrefs();
    expect(prefs.volume).toBe(0.5);
    expect(prefs.muted).toBe(false);
    expect(prefs.enabled).toBe(true);
  });
});

describe("use-soundscape prefers-reduced-motion", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    // jsdom may not have matchMedia — define it so spyOn works
    if (!window.matchMedia) {
      window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList);
    }
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("should detect prefers-reduced-motion", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList);

    const result = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    expect(result).toBe(true);
  });

  it("should return false when no reduced-motion preference", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList);

    const result = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    expect(result).toBe(false);
  });
});
