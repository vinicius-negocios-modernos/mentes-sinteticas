// @vitest-environment jsdom
/**
 * UX-11 / SYS-9 (TD-5.5) — unit tests for useChatTTS.
 *
 * Pins the auto-play contract: speak the newest *model* message only when voice
 * is enabled + autoPlay on + TTS supported + not loading, track the speaking
 * index, and clear it when the shared voice state reports speaking stopped.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChatTTS } from "../use-chat-tts";
import type { VoiceState } from "@/components/chat/chat-voice-wrapper";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

function msg(role: "user" | "model", text: string): ChatMessageType {
  return { role, text, timestamp: new Date() };
}

function makeVoice(overrides: Partial<VoiceState> = {}): VoiceState {
  return {
    enabled: true,
    isListening: false,
    isSpeaking: false,
    autoPlay: true,
    sttSupported: true,
    ttsSupported: true,
    toggleVoiceMode: vi.fn(),
    toggleAutoPlay: vi.fn(),
    startListening: vi.fn(),
    stopListening: vi.fn(),
    speakText: vi.fn(),
    stopSpeaking: vi.fn(),
    setOnTranscript: vi.fn(),
    ...overrides,
  };
}

describe("useChatTTS", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does nothing when there is no voice provider", () => {
    const { result } = renderHook(() =>
      useChatTTS(null, [msg("model", "Ola")], false)
    );
    expect(result.current.speakingMessageIdx).toBeNull();
  });

  it("auto-plays the newest model message and sets the speaking index", () => {
    const voice = makeVoice();
    const initial = [msg("model", "greeting")];
    const { rerender, result } = renderHook(
      ({ messages }) => useChatTTS(voice, messages, false),
      { initialProps: { messages: initial } }
    );

    // A new model message arrives → auto-play fires.
    const next = [...initial, msg("user", "hi"), msg("model", "answer")];
    act(() => rerender({ messages: next }));

    expect(voice.speakText).toHaveBeenCalledWith("answer");
    expect(result.current.speakingMessageIdx).toBe(next.length - 1);
  });

  it("does NOT auto-play while loading (waiting for the stream)", () => {
    const voice = makeVoice();
    const initial = [msg("model", "greeting")];
    const { rerender } = renderHook(
      ({ messages, loading }) => useChatTTS(voice, messages, loading),
      { initialProps: { messages: initial, loading: true } }
    );
    const next = [...initial, msg("model", "answer")];
    act(() => rerender({ messages: next, loading: true }));
    expect(voice.speakText).not.toHaveBeenCalled();
  });

  it("does NOT auto-play when the newest message is from the user", () => {
    const voice = makeVoice();
    const initial = [msg("model", "greeting")];
    const { rerender } = renderHook(
      ({ messages }) => useChatTTS(voice, messages, false),
      { initialProps: { messages: initial } }
    );
    act(() => rerender({ messages: [...initial, msg("user", "hi")] }));
    expect(voice.speakText).not.toHaveBeenCalled();
  });

  it("does NOT auto-play when autoPlay is off", () => {
    const voice = makeVoice({ autoPlay: false });
    const initial = [msg("model", "greeting")];
    const { rerender } = renderHook(
      ({ messages }) => useChatTTS(voice, messages, false),
      { initialProps: { messages: initial } }
    );
    act(() => rerender({ messages: [...initial, msg("model", "answer")] }));
    expect(voice.speakText).not.toHaveBeenCalled();
  });

  it("clears the speaking index when voice reports it stopped speaking", () => {
    const speaking = makeVoice({ isSpeaking: true });
    const { rerender, result } = renderHook(
      ({ v }) => useChatTTS(v, [msg("model", "x")], false),
      { initialProps: { v: speaking } }
    );
    act(() => result.current.setSpeakingMessageIdx(0));
    expect(result.current.speakingMessageIdx).toBe(0);

    // Voice transitions to not-speaking → index clears.
    act(() => rerender({ v: makeVoice({ isSpeaking: false }) }));
    expect(result.current.speakingMessageIdx).toBeNull();
  });
});
