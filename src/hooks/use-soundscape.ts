/**
 * React hook for soundscape integration.
 *
 * Encapsulates the SoundscapeEngine lifecycle:
 * - Initializes/destroys the engine
 * - Reacts to mindId changes (crossfade)
 * - Manages Page Visibility API auto-pause
 * - Persists volume/mute/enabled preferences to localStorage
 * - Detects and respects prefers-reduced-motion
 * - Handles mobile autoplay restrictions
 *
 * @module use-soundscape
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SoundscapeEngine } from "@/lib/audio/soundscapes";
import { getSoundscapeConfig } from "@/lib/audio/soundscape-config";

/** localStorage key for soundscape preferences */
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

/**
 * Read preferences from localStorage.
 * Returns defaults if not found or invalid.
 */
function loadPrefs(): SoundscapePrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      volume:
        typeof parsed.volume === "number"
          ? Math.max(0, Math.min(1, parsed.volume))
          : DEFAULT_PREFS.volume,
      muted: typeof parsed.muted === "boolean" ? parsed.muted : DEFAULT_PREFS.muted,
      enabled:
        typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_PREFS.enabled,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/**
 * Persist preferences to localStorage.
 */
function savePrefs(prefs: SoundscapePrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Quota exceeded or private browsing — ignore
  }
}

/**
 * Check if user prefers reduced motion.
 * Always returns false on the server (SSR safety).
 */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface UseSoundscapeReturn {
  /** Current volume (0-1) */
  volume: number;
  /** Whether audio is muted */
  muted: boolean;
  /** Whether soundscapes are enabled (master toggle) */
  enabled: boolean;
  /** Whether audio is currently playing */
  playing: boolean;
  /** Whether autoplay is blocked by browser restrictions */
  autoplayBlocked: boolean;
  /** Whether prefers-reduced-motion caused initial mute */
  reducedMotionMuted: boolean;
  /** Display name of current soundscape */
  soundscapeName: string | null;
  /** Set volume (0-1) */
  setVolume: (v: number) => void;
  /** Toggle mute */
  toggleMute: () => void;
  /** Toggle master enable/disable */
  toggleEnabled: () => void;
  /** Attempt to activate audio (for autoplay-blocked scenario) */
  activateAudio: () => void;
}

/**
 * Hook to manage ambient soundscapes in chat sessions.
 *
 * @param mindSlug - Current mind slug (e.g. "aristoteles", "turing")
 */
export function useSoundscape(mindSlug: string | null): UseSoundscapeReturn {
  const engineRef = useRef<SoundscapeEngine | null>(null);
  const [volume, setVolumeState] = useState(DEFAULT_PREFS.volume);
  const [muted, setMuted] = useState(DEFAULT_PREFS.muted);
  const [enabled, setEnabled] = useState(DEFAULT_PREFS.enabled);
  const [playing, setPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [reducedMotionMuted, setReducedMotionMuted] = useState(false);
  const prevMindRef = useRef<string | null>(null);

  // Compute soundscape name
  const soundscapeName = mindSlug
    ? (getSoundscapeConfig(mindSlug)?.displayName ?? null)
    : null;

  // Initialize engine + load prefs
  useEffect(() => {
    if (!SoundscapeEngine.isAvailable()) return;

    const prefs = loadPrefs();
    const isReducedMotion = prefersReducedMotion();

    const engine = new SoundscapeEngine();
    engineRef.current = engine;

    // Apply loaded prefs
    engine.setVolume(prefs.volume);
    engine.setEnabled(prefs.enabled);

    setVolumeState(prefs.volume);
    setEnabled(prefs.enabled);

    // If prefers-reduced-motion, force mute by default
    if (isReducedMotion && !prefs.muted) {
      engine.mute();
      setMuted(true);
      setReducedMotionMuted(true);
    } else {
      if (prefs.muted) {
        engine.mute();
      }
      setMuted(prefs.muted);
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // React to mindSlug changes — play or crossfade
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !mindSlug || !enabled) return;

    if (prevMindRef.current && prevMindRef.current !== mindSlug) {
      // Crossfade from previous to new
      engine.crossfadeTo(mindSlug);
    } else if (!prevMindRef.current || prevMindRef.current !== mindSlug) {
      // First play or new slug
      engine.play(mindSlug);
    }

    prevMindRef.current = mindSlug;

    // Sync state after play attempt
    const timer = setTimeout(() => {
      setPlaying(engine.playing);
      setAutoplayBlocked(engine.autoplayBlocked);
    }, 100);

    return () => clearTimeout(timer);
  }, [mindSlug, enabled]);

  // Page Visibility API
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const handler = () => {
      engine.handleVisibilityChange(document.hidden);
      // Sync state
      setTimeout(() => {
        setPlaying(engine.playing);
      }, 600);
    };

    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  // User gesture listener for autoplay-blocked recovery
  useEffect(() => {
    if (!autoplayBlocked) return;

    const handler = async () => {
      const engine = engineRef.current;
      if (!engine) return;

      const resumed = await engine.resumeContext();
      if (resumed && mindSlug) {
        await engine.play(mindSlug);
        setPlaying(engine.playing);
        setAutoplayBlocked(engine.autoplayBlocked);
      }
    };

    document.addEventListener("click", handler, { once: true });
    document.addEventListener("touchstart", handler, { once: true });

    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [autoplayBlocked, mindSlug]);

  // Volume setter
  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    engineRef.current?.setVolume(clamped);
    savePrefs({
      volume: clamped,
      muted: engineRef.current?.muted ?? false,
      enabled: engineRef.current?.enabled ?? true,
    });
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (engine.muted) {
      engine.unmute();
      setMuted(false);
      setReducedMotionMuted(false);
    } else {
      engine.mute();
      setMuted(true);
    }

    savePrefs({
      volume: engine.volume,
      muted: engine.muted,
      enabled: engine.enabled,
    });
  }, []);

  // Toggle enabled
  const toggleEnabled = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const newEnabled = !engine.enabled;
    engine.setEnabled(newEnabled);
    setEnabled(newEnabled);
    setPlaying(engine.playing);

    if (newEnabled && mindSlug) {
      engine.play(mindSlug).then(() => {
        setPlaying(engine.playing);
        setAutoplayBlocked(engine.autoplayBlocked);
      });
    }

    savePrefs({
      volume: engine.volume,
      muted: engine.muted,
      enabled: newEnabled,
    });
  }, [mindSlug]);

  // Activate audio (manual user action for autoplay-blocked)
  const activateAudio = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;

    const resumed = await engine.resumeContext();
    if (resumed && mindSlug) {
      await engine.play(mindSlug);
      setPlaying(engine.playing);
      setAutoplayBlocked(engine.autoplayBlocked);
    }
  }, [mindSlug]);

  return {
    volume,
    muted,
    enabled,
    playing,
    autoplayBlocked,
    reducedMotionMuted,
    soundscapeName,
    setVolume,
    toggleMute,
    toggleEnabled,
    activateAudio,
  };
}
