/**
 * Soundscape audio engine — Web Audio API wrapper for ambient audio.
 *
 * Uses AudioContext + GainNode for precise volume control and crossfade.
 * Handles browser autoplay restrictions, Page Visibility API auto-pause,
 * and seamless looping via HTMLMediaElement as source.
 *
 * @module soundscapes
 */

import { getSoundscapeConfig } from "./soundscape-config";

/** Default crossfade duration in milliseconds */
const DEFAULT_CROSSFADE_MS = 2000;

/** Default fade-in duration for initial play */
const DEFAULT_FADE_IN_MS = 1500;

/** Fade-in duration when resuming from tab visibility change */
const VISIBILITY_RESUME_FADE_MS = 500;

interface ActiveSource {
  audio: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  mindId: string;
}

/**
 * SoundscapeEngine manages ambient audio playback using Web Audio API.
 *
 * Design:
 * - Uses HTMLAudioElement as source (for network loading + looping)
 * - Routes through GainNode for precise volume/crossfade control
 * - Supports seamless crossfade between two soundscapes
 */
export class SoundscapeEngine {
  private context: AudioContext | null = null;
  private current: ActiveSource | null = null;
  private outgoing: ActiveSource | null = null;
  private _volume = 0.3;
  private _muted = false;
  private _enabled = true;
  private _autoplayBlocked = false;
  private _visibilityPausedBySystem = false;
  private _playing = false;

  /**
   * Check if Web Audio API is available (SSR safety).
   */
  static isAvailable(): boolean {
    return typeof window !== "undefined" && typeof AudioContext !== "undefined";
  }

  /**
   * Get or create the AudioContext.
   * Lazy initialization to avoid SSR issues and respect user gesture requirements.
   */
  private getContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
    }
    return this.context;
  }

  /**
   * Resume AudioContext if it's in suspended state (mobile autoplay restriction).
   * Must be called from a user gesture handler.
   */
  async resumeContext(): Promise<boolean> {
    try {
      const ctx = this.getContext();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      this._autoplayBlocked = false;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create an ActiveSource for a given mind.
   */
  private createSource(mindId: string): ActiveSource | null {
    const config = getSoundscapeConfig(mindId);
    if (!config) return null;

    const ctx = this.getContext();
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.loop = true;
    audio.preload = "auto";

    // Try WebM first, fall back to MP3
    audio.src = config.audioSrc;
    audio.onerror = () => {
      audio.src = config.audioSrcFallback;
    };

    const source = ctx.createMediaElementSource(audio);
    const gain = ctx.createGain();
    gain.gain.value = 0; // Start silent for fade-in

    source.connect(gain);
    gain.connect(ctx.destination);

    return { audio, source, gain, mindId };
  }

  /**
   * Play soundscape for a given mind with fade-in.
   */
  async play(mindId: string): Promise<void> {
    if (!SoundscapeEngine.isAvailable() || !this._enabled) return;

    // If already playing this mind, do nothing
    if (this.current?.mindId === mindId && this._playing) return;

    // If another soundscape is playing, crossfade
    if (this.current && this._playing) {
      await this.crossfadeTo(mindId);
      return;
    }

    // Clean up any existing source
    this.cleanupSource(this.current);

    const activeSource = this.createSource(mindId);
    if (!activeSource) return;

    this.current = activeSource;

    try {
      const ctx = this.getContext();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      await activeSource.audio.play();
      this._playing = true;
      this._autoplayBlocked = false;

      // Fade in
      const targetVolume = this._muted ? 0 : this._volume;
      const now = ctx.currentTime;
      activeSource.gain.gain.setValueAtTime(0, now);
      activeSource.gain.gain.linearRampToValueAtTime(
        targetVolume,
        now + DEFAULT_FADE_IN_MS / 1000
      );
    } catch {
      this._autoplayBlocked = true;
      this._playing = false;
    }
  }

  /**
   * Crossfade from current soundscape to a new mind's soundscape.
   */
  async crossfadeTo(
    mindId: string,
    durationMs: number = DEFAULT_CROSSFADE_MS
  ): Promise<void> {
    if (!SoundscapeEngine.isAvailable() || !this._enabled) return;

    // If muted, just swap the loaded soundscape without playing
    if (this._muted) {
      this.cleanupSource(this.current);
      const newSource = this.createSource(mindId);
      if (newSource) {
        this.current = newSource;
      }
      return;
    }

    const ctx = this.getContext();
    const now = ctx.currentTime;
    const durationSec = durationMs / 1000;

    // Move current to outgoing
    if (this.outgoing) {
      this.cleanupSource(this.outgoing);
    }
    this.outgoing = this.current;

    // Fade out outgoing
    if (this.outgoing) {
      this.outgoing.gain.gain.setValueAtTime(
        this.outgoing.gain.gain.value,
        now
      );
      this.outgoing.gain.gain.linearRampToValueAtTime(0, now + durationSec);

      // Schedule cleanup after fade completes
      const outRef = this.outgoing;
      setTimeout(() => {
        this.cleanupSource(outRef);
        if (this.outgoing === outRef) {
          this.outgoing = null;
        }
      }, durationMs + 100);
    }

    // Create and fade in new source
    const newSource = this.createSource(mindId);
    if (!newSource) return;

    this.current = newSource;

    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      await newSource.audio.play();
      this._playing = true;

      const targetVolume = this._volume;
      newSource.gain.gain.setValueAtTime(0, now);
      newSource.gain.gain.linearRampToValueAtTime(
        targetVolume,
        now + durationSec
      );
    } catch {
      this._autoplayBlocked = true;
    }
  }

  /**
   * Pause playback.
   */
  pause(): void {
    if (this.current?.audio) {
      this.current.audio.pause();
      this._playing = false;
    }
  }

  /**
   * Resume playback with optional fade-in.
   */
  async resume(fadeMs: number = VISIBILITY_RESUME_FADE_MS): Promise<void> {
    if (!this.current?.audio || !this._enabled) return;

    try {
      const ctx = this.getContext();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const targetVolume = this._muted ? 0 : this._volume;
      const now = ctx.currentTime;
      this.current.gain.gain.setValueAtTime(0, now);
      this.current.gain.gain.linearRampToValueAtTime(
        targetVolume,
        now + fadeMs / 1000
      );

      await this.current.audio.play();
      this._playing = true;
    } catch {
      this._autoplayBlocked = true;
    }
  }

  /**
   * Stop all playback and release resources.
   */
  stop(): void {
    this.cleanupSource(this.current);
    this.cleanupSource(this.outgoing);
    this.current = null;
    this.outgoing = null;
    this._playing = false;
  }

  /**
   * Set volume (0-1).
   */
  setVolume(value: number): void {
    this._volume = Math.max(0, Math.min(1, value));
    if (this.current && !this._muted && this.context) {
      const now = this.context.currentTime;
      this.current.gain.gain.setValueAtTime(
        this.current.gain.gain.value,
        now
      );
      this.current.gain.gain.linearRampToValueAtTime(this._volume, now + 0.05);
    }
  }

  /**
   * Mute audio (preserves volume setting).
   */
  mute(): void {
    this._muted = true;
    if (this.current && this.context) {
      const now = this.context.currentTime;
      this.current.gain.gain.setValueAtTime(
        this.current.gain.gain.value,
        now
      );
      this.current.gain.gain.linearRampToValueAtTime(0, now + 0.05);
    }
  }

  /**
   * Unmute audio (restores previous volume).
   */
  unmute(): void {
    this._muted = false;
    if (this.current && this.context) {
      const now = this.context.currentTime;
      this.current.gain.gain.setValueAtTime(0, now);
      this.current.gain.gain.linearRampToValueAtTime(this._volume, now + 0.1);
    }
  }

  /**
   * Handle page visibility change — auto-pause when tab hidden.
   */
  handleVisibilityChange(hidden: boolean): void {
    if (hidden) {
      if (this._playing && !this._muted) {
        this._visibilityPausedBySystem = true;
        this.pause();
      }
    } else {
      if (this._visibilityPausedBySystem && this._enabled) {
        this._visibilityPausedBySystem = false;
        this.resume(VISIBILITY_RESUME_FADE_MS);
      }
    }
  }

  /**
   * Set enabled state (master toggle).
   */
  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  /** Current volume (0-1) */
  get volume(): number {
    return this._volume;
  }

  /** Whether audio is muted */
  get muted(): boolean {
    return this._muted;
  }

  /** Whether soundscapes are enabled (master toggle) */
  get enabled(): boolean {
    return this._enabled;
  }

  /** Whether autoplay was blocked by the browser */
  get autoplayBlocked(): boolean {
    return this._autoplayBlocked;
  }

  /** Whether audio is currently playing */
  get playing(): boolean {
    return this._playing;
  }

  /** Currently loaded mind ID */
  get currentMindId(): string | null {
    return this.current?.mindId ?? null;
  }

  /**
   * Destroy the engine and release all resources.
   */
  async destroy(): Promise<void> {
    this.stop();
    if (this.context && this.context.state !== "closed") {
      await this.context.close();
    }
    this.context = null;
  }

  /**
   * Clean up a source: pause audio, disconnect nodes.
   */
  private cleanupSource(source: ActiveSource | null): void {
    if (!source) return;
    try {
      source.audio.pause();
      source.audio.src = "";
      source.audio.load();
      source.source.disconnect();
      source.gain.disconnect();
    } catch {
      // Ignore cleanup errors
    }
  }
}
