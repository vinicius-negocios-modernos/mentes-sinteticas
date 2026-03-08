/**
 * Per-mind voice configurations for TTS.
 *
 * Each mind has a distinct voice personality defined by pitch, rate, and volume.
 * Voices are keyed by mind slug (same as used in greetings and themes).
 *
 * @module voice/mind-voices
 */

import type { VoiceConfig } from "./types";

/**
 * Default voice config used when no mind-specific config exists.
 */
export const defaultVoiceConfig: VoiceConfig = {
  pitch: 1.0,
  rate: 1.0,
  volume: 1.0,
  lang: "pt-BR",
};

/**
 * Per-mind voice configs, keyed by mind slug.
 *
 * Personality mapping rationale:
 * - Analytical/philosophical minds: slower rate, deeper pitch
 * - Creative/energetic minds: faster rate, higher pitch
 * - Authoritative minds: slower rate, neutral pitch, full volume
 */
export const mindVoiceConfigs: Record<string, VoiceConfig> = {
  // Aristoteles — deep, slow, deliberate (ancient philosopher)
  aristoteles: {
    pitch: 0.85,
    rate: 0.85,
    volume: 1.0,
    lang: "pt-BR",
  },
  // Da Vinci — measured, warm, curious (Renaissance polymath)
  "da-vinci": {
    pitch: 0.95,
    rate: 0.9,
    volume: 1.0,
    lang: "pt-BR",
  },
  // Tesla — fast, high energy, intense (inventor/futurist)
  tesla: {
    pitch: 1.15,
    rate: 1.15,
    volume: 1.0,
    lang: "pt-BR",
  },
  // Curie — clear, precise, measured (scientist)
  curie: {
    pitch: 1.1,
    rate: 0.95,
    volume: 1.0,
    lang: "pt-BR",
  },
  // Hypatia — calm, resonant, wise (astronomer/philosopher)
  hypatia: {
    pitch: 1.05,
    rate: 0.9,
    volume: 1.0,
    lang: "pt-BR",
  },
  // Turing — analytical, crisp, methodical (mathematician)
  turing: {
    pitch: 1.0,
    rate: 1.05,
    volume: 1.0,
    lang: "en-US",
  },
  // Antonio Napole — confident, steady (business strategist)
  "antonio-napole": {
    pitch: 0.9,
    rate: 0.95,
    volume: 1.0,
    lang: "pt-BR",
  },
  // Ali Abdaal — energetic, bright (content creator)
  "ali-abdaal": {
    pitch: 1.1,
    rate: 1.1,
    volume: 1.0,
    lang: "en-US",
  },
};

/**
 * Get the voice config for a given mind slug.
 * Falls back to the default config if no mind-specific config exists.
 *
 * @param mindSlug - The mind's URL slug (e.g. "antonio-napole")
 * @returns The voice config for TTS
 */
export function getVoiceConfigForMind(mindSlug: string): VoiceConfig {
  return mindVoiceConfigs[mindSlug] ?? defaultVoiceConfig;
}
