/**
 * SpeechRecognition (STT) wrapper using the Web Speech API.
 *
 * SSR-safe: all browser API access is guarded by `typeof window` checks.
 * Gracefully degrades when the API is unavailable (Firefox, older browsers).
 *
 * @module voice/speech-recognition
 */

import type {
  SpeechRecognitionResult,
  SpeechRecognitionError,
  SpeechRecognitionErrorType,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Web Speech API type declarations (not in standard TS lib)                 */
/* -------------------------------------------------------------------------- */

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultItem {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

/** Timeout in ms before auto-stopping on silence. */
const SILENCE_TIMEOUT_MS = 30_000;

type ResultCallback = (result: SpeechRecognitionResult) => void;
type ErrorCallback = (error: SpeechRecognitionError) => void;
type EndCallback = () => void;

/**
 * Check whether SpeechRecognition is supported in the current browser.
 */
export function isSTTSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  );
}

/**
 * Get the SpeechRecognition constructor (handles vendor prefix).
 */
function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => SpeechRecognition)
    | null;
}

/**
 * Create a managed SpeechRecognition instance.
 *
 * Returns `null` if the API is not supported.
 */
export function createSpeechRecognition(lang = "pt-BR") {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = lang;
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.maxAlternatives = 1;

  let resultCallback: ResultCallback | null = null;
  let errorCallback: ErrorCallback | null = null;
  let endCallback: EndCallback | null = null;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let isActive = false;

  function clearSilenceTimer() {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  }

  function resetSilenceTimer() {
    clearSilenceTimer();
    silenceTimer = setTimeout(() => {
      if (isActive) {
        recognition.stop();
      }
    }, SILENCE_TIMEOUT_MS);
  }

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    resetSilenceTimer();
    const last = event.results[event.results.length - 1];
    if (last && resultCallback) {
      resultCallback({
        transcript: last[0].transcript,
        isFinal: last.isFinal,
        confidence: last[0].confidence,
      });
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    const errorMap: Record<string, SpeechRecognitionErrorType> = {
      "not-allowed": "not-allowed",
      "service-not-allowed": "service-not-allowed",
      "no-speech": "no-speech",
      network: "network",
      aborted: "aborted",
      "audio-capture": "audio-capture",
    };
    const type: SpeechRecognitionErrorType =
      errorMap[event.error] ?? "unknown";

    console.warn(`[voice/stt] SpeechRecognition error: ${event.error}`);

    if (errorCallback) {
      errorCallback({
        type,
        message: event.error,
      });
    }
  };

  recognition.onend = () => {
    isActive = false;
    clearSilenceTimer();
    if (endCallback) endCallback();
  };

  return {
    /**
     * Start listening for speech input.
     * Automatically stops after 30s of silence.
     */
    startListening() {
      if (isActive) return;
      isActive = true;
      resetSilenceTimer();
      try {
        recognition.start();
      } catch (e) {
        // Already started — ignore DOMException
        console.warn("[voice/stt] start() failed:", e);
        isActive = false;
        clearSilenceTimer();
      }
    },

    /** Stop listening. */
    stopListening() {
      if (!isActive) return;
      clearSilenceTimer();
      try {
        recognition.stop();
      } catch {
        // Already stopped
      }
    },

    /** Register a callback for recognition results (interim + final). */
    onResult(cb: ResultCallback) {
      resultCallback = cb;
    },

    /** Register a callback for recognition errors. */
    onError(cb: ErrorCallback) {
      errorCallback = cb;
    },

    /** Register a callback for when recognition ends (by user or timeout). */
    onEnd(cb: EndCallback) {
      endCallback = cb;
    },

    /** Whether the recognition is actively listening. */
    get isListening() {
      return isActive;
    },

    /** Clean up all listeners and stop recognition. */
    destroy() {
      clearSilenceTimer();
      if (isActive) {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      }
      resultCallback = null;
      errorCallback = null;
      endCallback = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    },
  };
}

export type SpeechRecognitionInstance = NonNullable<
  ReturnType<typeof createSpeechRecognition>
>;
