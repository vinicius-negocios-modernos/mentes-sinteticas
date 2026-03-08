// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SoundscapeControls from "../soundscape-controls";
import type { UseSoundscapeReturn } from "@/hooks/use-soundscape";

// Radix Slider uses ResizeObserver which jsdom doesn't provide
beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function createMockSoundscape(
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

describe("SoundscapeControls", () => {
  it("should render master toggle, mute, and volume slider when enabled", () => {
    const soundscape = createMockSoundscape();
    render(<SoundscapeControls soundscape={soundscape} />);

    // Should have controls group
    const group = screen.getByRole("group");
    expect(group).toBeInTheDocument();

    // Should have mute button
    const muteBtn = screen.getByLabelText(/silenciar audio/i);
    expect(muteBtn).toBeInTheDocument();

    // Should have slider
    const slider = screen.getByLabelText(/volume/i);
    expect(slider).toBeInTheDocument();
  });

  it("should show activation button when autoplay is blocked", () => {
    const soundscape = createMockSoundscape({ autoplayBlocked: true });
    const { container } = render(<SoundscapeControls soundscape={soundscape} />);

    const activateBtn = container.querySelector('[aria-label="Ativar Audio Ambiente"]');
    expect(activateBtn).toBeInTheDocument();
  });

  it("should call toggleMute when mute button clicked", async () => {
    const user = userEvent.setup();
    const soundscape = createMockSoundscape();
    const { container } = render(<SoundscapeControls soundscape={soundscape} />);

    const muteBtn = container.querySelector('[aria-label="Silenciar audio"]')!;
    await user.click(muteBtn);
    expect(soundscape.toggleMute).toHaveBeenCalledOnce();
  });

  it("should call toggleEnabled when master toggle clicked", async () => {
    const user = userEvent.setup();
    const soundscape = createMockSoundscape();
    const { container } = render(<SoundscapeControls soundscape={soundscape} />);

    const toggleBtn = container.querySelector('[aria-label="Desativar som ambiente"]')!;
    await user.click(toggleBtn);
    expect(soundscape.toggleEnabled).toHaveBeenCalledOnce();
  });

  it("should call activateAudio when activation button clicked", async () => {
    const user = userEvent.setup();
    const soundscape = createMockSoundscape({ autoplayBlocked: true });
    const { container } = render(<SoundscapeControls soundscape={soundscape} />);

    const activateBtn = container.querySelector('[aria-label="Ativar Audio Ambiente"]')!;
    await user.click(activateBtn);
    expect(soundscape.activateAudio).toHaveBeenCalledOnce();
  });

  it("should hide volume controls when disabled", () => {
    const soundscape = createMockSoundscape({ enabled: false });
    const { container } = render(<SoundscapeControls soundscape={soundscape} />);

    // Master toggle should exist (when disabled, label = "Ativar som ambiente")
    const toggleBtn = container.querySelector('[aria-label="Ativar som ambiente"]');
    expect(toggleBtn).toBeInTheDocument();

    // Slider should NOT exist
    expect(container.querySelector('[role="slider"]')).not.toBeInTheDocument();
  });

  it("should show unmute label when muted", () => {
    const soundscape = createMockSoundscape({ muted: true });
    render(<SoundscapeControls soundscape={soundscape} />);

    // t("soundscape.unmute") = "Ativar audio" — use exact match to avoid matching "Ativar Audio Ambiente"
    const unmuteBtn = screen.getByLabelText("Ativar audio");
    expect(unmuteBtn).toBeInTheDocument();
  });

  // --- A11y assertions (Story 6.9) ---

  it("a11y: controls group has aria-label", () => {
    const soundscape = createMockSoundscape();
    const { container } = render(<SoundscapeControls soundscape={soundscape} />);

    // Use the top-level group with our specific aria-label (avoids Radix internal groups)
    const group = container.querySelector('[role="group"][aria-label]');
    expect(group).toBeInTheDocument();
    expect(group!.getAttribute("aria-label")).not.toBe("");
  });

  it("a11y: volume slider has aria-valuetext on container", () => {
    const soundscape = createMockSoundscape({ volume: 0.5 });
    const { container } = render(<SoundscapeControls soundscape={soundscape} />);

    // Radix Slider puts aria-valuetext on the root element (data-slot="slider")
    // The root spreads {...props} which includes aria-valuetext
    const sliderRoot = container.querySelector('[data-slot="slider"]');
    expect(sliderRoot).toBeInTheDocument();
    expect(sliderRoot).toHaveAttribute("aria-valuetext", "50%");
  });

  it("a11y: mute button has aria-pressed", () => {
    const soundscape = createMockSoundscape({ muted: false });
    const { container } = render(<SoundscapeControls soundscape={soundscape} />);

    const muteBtn = container.querySelector('button[aria-label="Silenciar audio"]');
    expect(muteBtn).toBeInTheDocument();
    expect(muteBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("a11y: mute button aria-pressed is true when muted", () => {
    const soundscape = createMockSoundscape({ muted: true });
    const { container } = render(<SoundscapeControls soundscape={soundscape} />);

    const muteBtn = container.querySelector('button[aria-label="Ativar audio"]');
    expect(muteBtn).toBeInTheDocument();
    expect(muteBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("a11y: master toggle has aria-pressed", () => {
    const soundscape = createMockSoundscape({ enabled: true });
    const { container } = render(<SoundscapeControls soundscape={soundscape} />);

    const toggle = container.querySelector('button[aria-label="Desativar som ambiente"]');
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("a11y: aria-live region exists for state announcements", () => {
    const soundscape = createMockSoundscape();
    const { container } = render(<SoundscapeControls soundscape={soundscape} />);

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
  });
});
