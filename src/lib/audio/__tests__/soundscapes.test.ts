// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SoundscapeEngine } from "../soundscapes";

// Mock GainNode
function createMockGainNode() {
  return {
    gain: {
      value: 0,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

// Mock MediaElementAudioSourceNode
function createMockSourceNode() {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

// Mock AudioContext
function createMockAudioContext() {
  return {
    state: "running" as string,
    currentTime: 0,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => createMockGainNode()),
    createMediaElementSource: vi.fn(() => createMockSourceNode()),
    decodeAudioData: vi.fn().mockResolvedValue({}),
    createBufferSource: vi.fn(() => ({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      buffer: null,
      loop: false,
      onended: null,
    })),
  };
}

// Mock HTMLAudioElement
function createMockAudio() {
  const audio = {
    src: "",
    crossOrigin: null as string | null,
    loop: false,
    preload: "",
    onerror: null as (() => void) | null,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
  };
  return audio;
}

describe("SoundscapeEngine", () => {
  let originalAudioContext: typeof globalThis.AudioContext;
  let originalAudio: typeof globalThis.Audio;
  let mockCtx: ReturnType<typeof createMockAudioContext>;

  beforeEach(() => {
    originalAudioContext = globalThis.AudioContext;
    originalAudio = globalThis.Audio;

    mockCtx = createMockAudioContext();
    globalThis.AudioContext = vi.fn().mockImplementation(function () {
      return mockCtx;
    }) as unknown as typeof AudioContext;
    globalThis.Audio = vi.fn().mockImplementation(function () {
      return createMockAudio();
    }) as unknown as typeof Audio;
  });

  afterEach(() => {
    globalThis.AudioContext = originalAudioContext;
    globalThis.Audio = originalAudio;
  });

  it("should detect availability via isAvailable()", () => {
    expect(SoundscapeEngine.isAvailable()).toBe(true);
  });

  it("should start with default values", () => {
    const engine = new SoundscapeEngine();
    expect(engine.volume).toBe(0.3);
    expect(engine.muted).toBe(false);
    expect(engine.enabled).toBe(true);
    expect(engine.playing).toBe(false);
    expect(engine.autoplayBlocked).toBe(false);
    expect(engine.currentMindId).toBeNull();
  });

  it("should set volume correctly", () => {
    const engine = new SoundscapeEngine();
    engine.setVolume(0.7);
    expect(engine.volume).toBe(0.7);
  });

  it("should clamp volume to 0-1 range", () => {
    const engine = new SoundscapeEngine();
    engine.setVolume(1.5);
    expect(engine.volume).toBe(1);
    engine.setVolume(-0.5);
    expect(engine.volume).toBe(0);
  });

  it("should toggle mute state", () => {
    const engine = new SoundscapeEngine();
    expect(engine.muted).toBe(false);
    engine.mute();
    expect(engine.muted).toBe(true);
    engine.unmute();
    expect(engine.muted).toBe(false);
  });

  it("should toggle enabled state", () => {
    const engine = new SoundscapeEngine();
    expect(engine.enabled).toBe(true);
    engine.setEnabled(false);
    expect(engine.enabled).toBe(false);
  });

  it("should play audio for a valid mind", async () => {
    const engine = new SoundscapeEngine();
    await engine.play("aristoteles");
    expect(engine.playing).toBe(true);
    expect(engine.currentMindId).toBe("aristoteles");
  });

  it("should not play for unknown mind", async () => {
    const engine = new SoundscapeEngine();
    await engine.play("unknown");
    expect(engine.playing).toBe(false);
    expect(engine.currentMindId).toBeNull();
  });

  it("should not play when disabled", async () => {
    const engine = new SoundscapeEngine();
    engine.setEnabled(false);
    await engine.play("aristoteles");
    expect(engine.playing).toBe(false);
  });

  it("should stop and clean up", async () => {
    const engine = new SoundscapeEngine();
    await engine.play("aristoteles");
    engine.stop();
    expect(engine.playing).toBe(false);
    expect(engine.currentMindId).toBeNull();
  });

  it("should handle visibility change — pause when hidden", async () => {
    const engine = new SoundscapeEngine();
    await engine.play("aristoteles");
    engine.handleVisibilityChange(true);
    expect(engine.playing).toBe(false);
  });

  it("should mark autoplayBlocked when play() rejects", async () => {
    const engine = new SoundscapeEngine();
    // Make play reject
    globalThis.Audio = vi.fn().mockImplementation(function () {
      const audio = createMockAudio();
      audio.play = vi.fn().mockRejectedValue(new Error("NotAllowedError"));
      return audio;
    }) as unknown as typeof Audio;

    await engine.play("aristoteles");
    expect(engine.autoplayBlocked).toBe(true);
    expect(engine.playing).toBe(false);
  });

  it("should resume context successfully", async () => {
    mockCtx.state = "suspended";
    const engine = new SoundscapeEngine();
    const result = await engine.resumeContext();
    expect(result).toBe(true);
    expect(mockCtx.resume).toHaveBeenCalled();
  });

  it("should destroy engine and close context", async () => {
    const engine = new SoundscapeEngine();
    await engine.play("aristoteles");
    await engine.destroy();
    expect(engine.playing).toBe(false);
    expect(mockCtx.close).toHaveBeenCalled();
  });
});
