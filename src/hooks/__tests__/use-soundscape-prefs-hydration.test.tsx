// @vitest-environment jsdom
/**
 * MNT-001 (TD-5.5 / AC3) — behavior-equivalence tests for useSoundscape's
 * localStorage-prefs hydration (the setState-in-effect case).
 *
 * The hook reads persisted prefs from localStorage post-mount (SSR-unsafe) and
 * hydrates React state. This is an external store → refactored to
 * useSyncExternalStore. These assertions are the spec captured BEFORE the
 * refactor and must stay green UNCHANGED afterwards.
 *
 * The hook is double-gated: SOUNDSCAPES_FEATURE_ENABLED (env, default OFF) AND
 * SoundscapeEngine.isAvailable(). We force both ON via env stub + engine mock so
 * the hydration path actually executes.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const PREFS_KEY = "synkra-soundscape-prefs";

// --- Mock SoundscapeEngine so isAvailable() is true and methods are no-ops ---
vi.mock("@/lib/audio/soundscapes", () => {
  class MockSoundscapeEngine {
    _volume = 0.3;
    _enabled = true;
    _muted = false;
    playing = false;
    autoplayBlocked = false;
    static isAvailable() {
      return true;
    }
    setVolume(v: number) {
      this._volume = v;
    }
    setEnabled(e: boolean) {
      this._enabled = e;
    }
    get volume() {
      return this._volume;
    }
    get enabled() {
      return this._enabled;
    }
    get muted() {
      return this._muted;
    }
    mute() {
      this._muted = true;
    }
    unmute() {
      this._muted = false;
    }
    play() {
      return Promise.resolve();
    }
    crossfadeTo() {}
    handleVisibilityChange() {}
    resumeContext() {
      return Promise.resolve(true);
    }
    destroy() {}
  }
  return { SoundscapeEngine: MockSoundscapeEngine };
});

vi.mock("@/lib/audio/soundscape-config", () => ({
  getSoundscapeConfig: () => ({ displayName: "Mock Scape" }),
}));

async function loadHook() {
  // Force the feature flag ON for this module load.
  vi.stubEnv("NEXT_PUBLIC_SOUNDSCAPES_ENABLED", "true");
  vi.resetModules();
  const mod = await import("../use-soundscape");
  return mod.useSoundscape;
}

describe("useSoundscape — localStorage prefs hydration equivalence (MNT-001)", () => {
  beforeEach(() => {
    localStorage.clear();
    // matchMedia stub (jsdom lacks it)
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
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("hydrates volume + enabled from stored localStorage prefs after mount", async () => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ volume: 0.7, muted: false, enabled: true })
    );
    const useSoundscape = await loadHook();
    const { result } = renderHook(() => useSoundscape("aristoteles"));

    await waitFor(() => expect(result.current.volume).toBeCloseTo(0.7));
    expect(result.current.enabled).toBe(true);
  });

  it("hydrates the persisted disabled state (enabled=false)", async () => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ volume: 0.4, muted: false, enabled: false })
    );
    const useSoundscape = await loadHook();
    const { result } = renderHook(() => useSoundscape("aristoteles"));

    await waitFor(() => expect(result.current.enabled).toBe(false));
    expect(result.current.volume).toBeCloseTo(0.4);
  });

  it("falls back to default volume (0.3) when no prefs stored", async () => {
    const useSoundscape = await loadHook();
    const { result } = renderHook(() => useSoundscape("aristoteles"));

    await waitFor(() => expect(result.current.volume).toBeCloseTo(0.3));
    expect(result.current.enabled).toBe(true);
  });

  it("hydrates muted=true from stored prefs", async () => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ volume: 0.3, muted: true, enabled: true })
    );
    const useSoundscape = await loadHook();
    const { result } = renderHook(() => useSoundscape("aristoteles"));

    await waitFor(() => expect(result.current.muted).toBe(true));
  });
});
