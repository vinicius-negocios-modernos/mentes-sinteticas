/**
 * Voice module types for TTS and STT integration.
 *
 * @module voice/types
 */

/** Per-mind voice configuration for SpeechSynthesis. */
export interface VoiceConfig {
  /** Preferred voice name (browser-dependent). */
  voiceName?: string;
  /** Pitch multiplier (0.1 - 2.0, default 1.0). */
  pitch: number;
  /** Rate multiplier (0.1 - 10.0, default 1.0). */
  rate: number;
  /** Volume (0.0 - 1.0, default 1.0). */
  volume: number;
  /** BCP 47 language tag (e.g. "pt-BR", "en-US"). */
  lang: string;
}

/** Reactive state exposed by useVoiceMode hook. */
export interface VoiceModeState {
  /** Whether voice mode is enabled for the current session. */
  enabled: boolean;
  /** Whether the microphone is actively recording (STT). */
  isListening: boolean;
  /** Whether TTS is currently speaking. */
  isSpeaking: boolean;
  /** Whether new AI messages are auto-played via TTS. */
  autoPlay: boolean;
  /** Whether SpeechRecognition is supported in this browser. */
  isSTTSupported: boolean;
  /** Whether SpeechSynthesis is supported in this browser. */
  isTTSSupported: boolean;
}

/** Result from SpeechRecognition. */
export interface SpeechRecognitionResult {
  /** The recognized transcript. */
  transcript: string;
  /** Whether this is a final (not interim) result. */
  isFinal: boolean;
  /** Recognition confidence (0.0 - 1.0). */
  confidence: number;
}

/** Error types from SpeechRecognition. */
export type SpeechRecognitionErrorType =
  | "not-allowed"
  | "no-speech"
  | "network"
  | "aborted"
  | "audio-capture"
  | "service-not-allowed"
  | "unknown";

/** Structured error from SpeechRecognition. */
export interface SpeechRecognitionError {
  type: SpeechRecognitionErrorType;
  message: string;
}
