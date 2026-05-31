// @vitest-environment jsdom
/**
 * MNT-001 (TD-5.5 / AC3) — behavior-equivalence tests for the aria-live
 * announcement in SoundscapeControls (the setState-in-effect case kept as a
 * useEffect: a genuine DOM side-effect — announce on `enabled` change — NOT
 * state derivation, so useSyncExternalStore is the wrong tool).
 *
 * Observable contract (captured BEFORE the refactor; must stay green after):
 *  - no announcement on first render (ref-guard: prev === current)
 *  - enabled true→false announces the disabled message
 *  - enabled false→true announces the enabled message (incl. soundscape name)
 *  - re-render with the SAME enabled value does not re-announce
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import SoundscapeControls from "../soundscape-controls";
import type { UseSoundscapeReturn } from "@/hooks/use-soundscape";

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function mockSoundscape(
  overrides: Partial<UseSoundscapeReturn> = {}
): UseSoundscapeReturn {
  return {
    volume: 0.3,
    muted: false,
    enabled: true,
    playing: true,
    autoplayBlocked: false,
    reducedMotionMuted: false,
    soundscapeName: "Grecia Antiga",
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    toggleEnabled: vi.fn(),
    activateAudio: vi.fn(),
    ...overrides,
  };
}

function liveText(container: HTMLElement): string {
  return (
    container.querySelector('[aria-live="polite"]')?.textContent ?? ""
  ).trim();
}

describe("SoundscapeControls aria-live announcement — equivalence (MNT-001)", () => {
  it("does not announce on first render (ref-guarded)", () => {
    const { container } = render(
      <SoundscapeControls soundscape={mockSoundscape({ enabled: true })} />
    );
    expect(liveText(container)).toBe("");
  });

  it("announces the disabled message when enabled goes true→false", () => {
    const { container, rerender } = render(
      <SoundscapeControls soundscape={mockSoundscape({ enabled: true })} />
    );
    expect(liveText(container)).toBe("");

    rerender(
      <SoundscapeControls soundscape={mockSoundscape({ enabled: false })} />
    );
    expect(liveText(container)).toBe("Som ambiente desativado");
  });

  it("announces the enabled message (with soundscape name) when false→true", () => {
    const { container, rerender } = render(
      <SoundscapeControls soundscape={mockSoundscape({ enabled: false })} />
    );
    expect(liveText(container)).toBe("");

    rerender(
      <SoundscapeControls
        soundscape={mockSoundscape({
          enabled: true,
          soundscapeName: "Grecia Antiga",
        })}
      />
    );
    expect(liveText(container)).toContain("Som ambiente ativado");
    expect(liveText(container)).toContain("Grecia Antiga");
  });

  it("does not re-announce when re-rendered with the same enabled value", () => {
    const { container, rerender } = render(
      <SoundscapeControls soundscape={mockSoundscape({ enabled: true })} />
    );
    // Toggle to produce one announcement.
    rerender(
      <SoundscapeControls soundscape={mockSoundscape({ enabled: false })} />
    );
    expect(liveText(container)).toBe("Som ambiente desativado");

    // Re-render again with the SAME enabled=false → ref-guard suppresses change.
    rerender(
      <SoundscapeControls
        soundscape={mockSoundscape({ enabled: false, muted: true })}
      />
    );
    expect(liveText(container)).toBe("Som ambiente desativado");
  });
});
