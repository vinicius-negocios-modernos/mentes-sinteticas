import { describe, it, expect } from "vitest";
import {
  soundscapeConfigs,
  getSoundscapeConfig,
  soundscapeSlugs,
  type SoundscapeConfig,
} from "../soundscape-config";

describe("soundscape-config", () => {
  const expectedMinds = [
    "aristoteles",
    "da-vinci",
    "tesla",
    "curie",
    "hypatia",
    "turing",
  ];

  it("should have a config for all 6 minds", () => {
    expect(soundscapeSlugs).toHaveLength(6);
    for (const mind of expectedMinds) {
      expect(soundscapeConfigs[mind]).toBeDefined();
    }
  });

  it("should return correct config via getSoundscapeConfig", () => {
    const config = getSoundscapeConfig("aristoteles");
    expect(config).toBeDefined();
    expect(config!.mindId).toBe("aristoteles");
    expect(config!.displayName).toBe("Grecia Antiga");
  });

  it("should return undefined for unknown mind slug", () => {
    expect(getSoundscapeConfig("unknown-mind")).toBeUndefined();
  });

  it("should have valid audio paths for each config", () => {
    for (const slug of expectedMinds) {
      const config = soundscapeConfigs[slug] as SoundscapeConfig;
      expect(config.audioSrc).toMatch(/^\/audio\/soundscapes\/.+\.webm$/);
      expect(config.audioSrcFallback).toMatch(
        /^\/audio\/soundscapes\/.+\.mp3$/
      );
    }
  });

  it("should have displayName and description for each config", () => {
    for (const slug of expectedMinds) {
      const config = soundscapeConfigs[slug] as SoundscapeConfig;
      expect(config.displayName.length).toBeGreaterThan(0);
      expect(config.description.length).toBeGreaterThan(0);
    }
  });

  it("soundscapeSlugs should match config keys", () => {
    expect(soundscapeSlugs.sort()).toEqual(
      Object.keys(soundscapeConfigs).sort()
    );
  });
});
