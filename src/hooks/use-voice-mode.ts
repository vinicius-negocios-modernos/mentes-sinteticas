"use client";

/**
 * React hook for voice mode (STT + TTS).
 *
 * Combines SpeechRecognition and SpeechSynthesis into a single reactive state.
 * Accepts a `mindSlug` to apply per-mind voice configuration.
 *
 * @module hooks/use-voice-mode
 */

import { useState, useEffect, useRef, useCallback } from "react";
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

interface UseVoiceModeOptions {
  /** Mind slug for per-mind voice config. */
  mindSlug?: string;
  /** Callback when STT produces a transcript (interim or final). */
  onTranscript?: (transcript: string, isFinal: boolean) => void;
}

interface UseVoiceModeReturn {
  /** Whether voice mode is enabled for this session. */
  enabled: boolean;
  /** Whether the microphone is actively recording. */
  isListening: boolean;
  /** Whether TTS is currently speaking. */
  isSpeaking: boolean;
  /** Whether new AI responses are auto-played. */
  autoPlay: boolean;
  /** Whether STT is supported in this browser. */
  isSTTSupported: boolean;
  /** Whether TTS is supported in this browser. */
  isTTSSupported: boolean;
  /** Toggle voice mode on/off. */
  toggleVoiceMode: () => void;
  /** Toggle auto-play on/off. */
  toggleAutoPlay: () => void;
  /** Start listening for speech input. */
  startListening: () => void;
  /** Stop listening. */
  stopListening: () => void;
  /** Speak text using the mind's voice config. */
  speakText: (text: string) => void;
  /** Stop any current TTS playback. */
  stopSpeaking: () => void;
}

export function useVoiceMode({
  mindSlug,
  onTranscript,
}: UseVoiceModeOptions = {}): UseVoiceModeReturn {
  const [enabled, setEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  const sttRef = useRef<SpeechRecognitionInstance | null>(null);
  const ttsRef = useRef<SpeechSynthesisInstance | null>(null);
  const onTranscriptRef = useRef(onTranscript);

  // Keep callback ref up to date without re-creating effects
  onTranscriptRef.current = onTranscript;

  const sttSupported = typeof window !== "undefined" && isSTTSupported();
  const ttsSupported = typeof window !== "undefined" && isTTSSupported();

  const voiceConfig = getVoiceConfigForMind(mindSlug ?? "");

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
    // voiceConfig.lang is stable per mind
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
        // Turning off: stop everything
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

  return {
    enabled,
    isListening,
    isSpeaking,
    autoPlay,
    isSTTSupported: sttSupported,
    isTTSSupported: ttsSupported,
    toggleVoiceMode,
    toggleAutoPlay,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
  };
}
