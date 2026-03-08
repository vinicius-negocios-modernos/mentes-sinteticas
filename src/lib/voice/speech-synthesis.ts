/**
 * SpeechSynthesis (TTS) wrapper using the Web Speech API.
 *
 * SSR-safe: all browser API access is guarded by `typeof window` checks.
 * Supports per-mind voice configuration (pitch, rate, volume).
 *
 * @module voice/speech-synthesis
 */

import type { VoiceConfig } from "./types";

/**
 * Check whether SpeechSynthesis is supported in the current browser.
 */
export function isTTSSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window;
}

/**
 * Get available speech synthesis voices.
 * Voices may not be immediately available — some browsers load them async.
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isTTSSupported()) return [];
  return window.speechSynthesis.getVoices();
}

/**
 * Find the best matching voice for a given config.
 * Tries exact voiceName match first, then language match, then default.
 */
function findVoice(config: VoiceConfig): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  if (voices.length === 0) return null;

  // Try exact name match
  if (config.voiceName) {
    const exact = voices.find((v) => v.name === config.voiceName);
    if (exact) return exact;
  }

  // Try language match (e.g., "pt-BR")
  const langMatch = voices.find((v) => v.lang === config.lang);
  if (langMatch) return langMatch;

  // Try language prefix match (e.g., "pt")
  const langPrefix = config.lang.split("-")[0];
  const prefixMatch = voices.find((v) => v.lang.startsWith(langPrefix));
  if (prefixMatch) return prefixMatch;

  // Fallback to default voice
  const defaultVoice = voices.find((v) => v.default);
  return defaultVoice ?? voices[0] ?? null;
}

type SpeakingChangeCallback = (isSpeaking: boolean) => void;

/**
 * Create a managed SpeechSynthesis instance.
 *
 * Returns `null` if the API is not supported.
 */
export function createSpeechSynthesis() {
  if (!isTTSSupported()) return null;

  let isSpeakingNow = false;
  let speakingCallback: SpeakingChangeCallback | null = null;

  function updateSpeaking(value: boolean) {
    isSpeakingNow = value;
    if (speakingCallback) speakingCallback(value);
  }

  return {
    /**
     * Speak the given text using the provided voice config.
     * Stops any current speech before starting.
     */
    speak(text: string, config: VoiceConfig) {
      if (!text.trim()) return;

      // Stop any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = findVoice(config);
      if (voice) utterance.voice = voice;

      utterance.lang = config.lang;
      utterance.pitch = config.pitch;
      utterance.rate = config.rate;
      utterance.volume = config.volume;

      utterance.onstart = () => updateSpeaking(true);
      utterance.onend = () => updateSpeaking(false);
      utterance.onerror = (e) => {
        console.warn("[voice/tts] SpeechSynthesis error:", e.error);
        updateSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    },

    /** Stop all current and queued speech. */
    stop() {
      window.speechSynthesis.cancel();
      updateSpeaking(false);
    },

    /** Pause current speech. */
    pause() {
      window.speechSynthesis.pause();
    },

    /** Resume paused speech. */
    resume() {
      window.speechSynthesis.resume();
    },

    /** Register a callback for speaking state changes. */
    onSpeakingChange(cb: SpeakingChangeCallback) {
      speakingCallback = cb;
    },

    /** Whether TTS is currently speaking. */
    get isSpeaking() {
      return isSpeakingNow;
    },

    /** Clean up: stop speech and remove callbacks. */
    destroy() {
      window.speechSynthesis.cancel();
      updateSpeaking(false);
      speakingCallback = null;
    },
  };
}

export type SpeechSynthesisInstance = NonNullable<
  ReturnType<typeof createSpeechSynthesis>
>;
