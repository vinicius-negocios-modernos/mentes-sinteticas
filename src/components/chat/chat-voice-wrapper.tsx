"use client";

/**
 * Voice mode context provider and shared hook.
 *
 * Provides shared voice mode state (STT + TTS) to ChatHeader and ChatInterface,
 * which are rendered in different parts of the chat page layout.
 *
 * Usage in the page:
 *   <VoiceProvider mindSlug={slug}>
 *     <ChatHeader ... />  // consumes via useVoiceContext
 *     <ChatInterface ... />  // consumes via useVoiceContext
 *   </VoiceProvider>
 *
 * @module components/chat/chat-voice-wrapper
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { triggerHaptic } from "@/lib/haptics";
import {
  isSTTSupported,
  isTTSSupported,
  createSpeechRecognition,
  createSpeechSynthesis,
  getVoiceConfigForMind,
  type SpeechRecognitionInstance,
  type SpeechSynthesisInstance,
  type SpeechRecognitionError,
} from "@/lib/voice";

/** Shape of the shared voice mode state. */
export interface VoiceState {
  enabled: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  autoPlay: boolean;
  sttSupported: boolean;
  ttsSupported: boolean;
  toggleVoiceMode: () => void;
  toggleAutoPlay: () => void;
  startListening: () => void;
  stopListening: () => void;
  speakText: (text: string) => void;
  stopSpeaking: () => void;
  /** Register transcript callback (used by ChatInterface). */
  setOnTranscript: (
    cb: ((transcript: string, isFinal: boolean) => void) | null
  ) => void;
}

const VoiceContext = createContext<VoiceState | null>(null);

/**
 * Consume voice mode state from the nearest VoiceProvider.
 * Returns null if no provider is found (graceful degradation).
 */
export function useVoiceContext(): VoiceState | null {
  return useContext(VoiceContext);
}

interface VoiceProviderProps {
  mindSlug: string;
  children: ReactNode;
}

/**
 * Provider component that initializes STT + TTS and shares state via context.
 */
export function VoiceProvider({ mindSlug, children }: VoiceProviderProps) {
  const [enabled, setEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  const sttRef = useRef<SpeechRecognitionInstance | null>(null);
  const ttsRef = useRef<SpeechSynthesisInstance | null>(null);
  const onTranscriptRef = useRef<
    ((transcript: string, isFinal: boolean) => void) | null
  >(null);

  const sttSupported =
    typeof window !== "undefined" && isSTTSupported();
  const ttsSupported =
    typeof window !== "undefined" && isTTSSupported();
  const voiceConfig = getVoiceConfigForMind(mindSlug);

  // Initialize STT
  useEffect(() => {
    if (!sttSupported) return;

    const stt = createSpeechRecognition(voiceConfig.lang);
    if (!stt) return;

    stt.onResult((result) => {
      if (onTranscriptRef.current) {
        onTranscriptRef.current(result.transcript, result.isFinal);
      }
    });

    stt.onError((error: SpeechRecognitionError) => {
      setIsListening(false);
      const errorMessages: Record<string, string> = {
        "not-allowed": t("voice.errorPermission"),
        "no-speech": t("voice.errorNoSpeech"),
        network: t("voice.errorNetwork"),
        aborted: t("voice.errorAborted"),
        "audio-capture": t("voice.errorAudioCapture"),
        "service-not-allowed": t("voice.errorPermission"),
      };
      const msg = errorMessages[error.type] ?? t("voice.errorGeneric");
      toast.error(msg);
    });

    stt.onEnd(() => {
      setIsListening(false);
    });

    sttRef.current = stt;
    return () => {
      stt.destroy();
      sttRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sttSupported, voiceConfig.lang]);

  // Initialize TTS
  useEffect(() => {
    if (!ttsSupported) return;

    const tts = createSpeechSynthesis();
    if (!tts) return;

    tts.onSpeakingChange((speaking) => {
      setIsSpeaking(speaking);
    });

    ttsRef.current = tts;
    return () => {
      tts.destroy();
      ttsRef.current = null;
    };
  }, [ttsSupported]);

  const toggleVoiceMode = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      triggerHaptic("light");
      if (!next) {
        sttRef.current?.stopListening();
        ttsRef.current?.stop();
        setIsListening(false);
        setIsSpeaking(false);
      }
      return next;
    });
  }, []);

  const toggleAutoPlay = useCallback(() => {
    setAutoPlay((prev) => !prev);
    triggerHaptic("light");
  }, []);

  const startListening = useCallback(() => {
    if (!sttRef.current) return;
    triggerHaptic("light");
    sttRef.current.startListening();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    if (!sttRef.current) return;
    triggerHaptic("light");
    sttRef.current.stopListening();
    setIsListening(false);
  }, []);

  const speakText = useCallback(
    (text: string) => {
      if (!ttsRef.current) return;
      triggerHaptic("light");
      ttsRef.current.speak(text, voiceConfig);
    },
    [voiceConfig]
  );

  const stopSpeaking = useCallback(() => {
    if (!ttsRef.current) return;
    ttsRef.current.stop();
    setIsSpeaking(false);
  }, []);

  const setOnTranscript = useCallback(
    (cb: ((transcript: string, isFinal: boolean) => void) | null) => {
      onTranscriptRef.current = cb;
    },
    []
  );

  const value: VoiceState = {
    enabled,
    isListening,
    isSpeaking,
    autoPlay,
    sttSupported,
    ttsSupported,
    toggleVoiceMode,
    toggleAutoPlay,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    setOnTranscript,
  };

  return (
    <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
  );
}
