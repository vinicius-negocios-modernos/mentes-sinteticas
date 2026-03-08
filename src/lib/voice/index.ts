/**
 * Voice module re-exports.
 *
 * @module voice
 */

export type {
  VoiceConfig,
  VoiceModeState,
  SpeechRecognitionResult,
  SpeechRecognitionError,
  SpeechRecognitionErrorType,
} from "./types";

export {
  isSTTSupported,
  createSpeechRecognition,
  type SpeechRecognitionInstance,
} from "./speech-recognition";

export {
  isTTSSupported,
  getAvailableVoices,
  createSpeechSynthesis,
  type SpeechSynthesisInstance,
} from "./speech-synthesis";

export {
  defaultVoiceConfig,
  mindVoiceConfigs,
  getVoiceConfigForMind,
} from "./mind-voices";
