"use client";

/**
 * useChatTTS — text-to-speech auto-play + speaking-index tracking (UX-11).
 *
 * Extracted from ChatInterface. Owns:
 *  - which message index is currently being spoken (`speakingMessageIdx`);
 *  - auto-play of the newest *model* message when voice mode + autoPlay + TTS
 *    support are all on and a new message just arrived (and we're not loading);
 *  - clearing the speaking index when the shared voice state reports TTS stopped.
 *
 * Behavior is identical to the inline effects. The dependency arrays and the
 * `prevMessageCountRef` guard are preserved verbatim so streaming and auto-play
 * timing do not change.
 *
 * @module hooks/use-chat-tts
 */

import { useEffect, useRef, useState } from "react";
import type { VoiceState } from "@/components/chat/chat-voice-wrapper";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

export interface UseChatTTSResult {
  /** Index of the message currently being spoken, or null. */
  speakingMessageIdx: number | null;
  /** Setter exposed so message-level speak/stop handlers can update it. */
  setSpeakingMessageIdx: React.Dispatch<React.SetStateAction<number | null>>;
}

export function useChatTTS(
  voice: VoiceState | null,
  messages: ChatMessageType[],
  isLoading: boolean
): UseChatTTSResult {
  const [speakingMessageIdx, setSpeakingMessageIdx] = useState<number | null>(
    null
  );

  // Track last message count for auto-play TTS.
  const prevMessageCountRef = useRef(messages.length);
  useEffect(() => {
    if (
      voice?.enabled &&
      voice.autoPlay &&
      voice.ttsSupported &&
      messages.length > prevMessageCountRef.current
    ) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === "model" && !isLoading) {
        voice.speakText(lastMsg.text);
        setSpeakingMessageIdx(messages.length - 1);
      }
    }
    prevMessageCountRef.current = messages.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, isLoading]);

  // Clear speaking index when TTS stops.
  useEffect(() => {
    if (voice && !voice.isSpeaking) {
      setSpeakingMessageIdx(null);
    }
  }, [voice?.isSpeaking, voice]);

  return { speakingMessageIdx, setSpeakingMessageIdx };
}
