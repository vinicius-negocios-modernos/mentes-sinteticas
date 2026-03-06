"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { sendMessage } from "@/app/actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import ChatMessage, { ChatMessageLoading } from "@/components/chat/chat-message";
import ChatInput from "@/components/chat/chat-input";
import ChatEmptyState from "@/components/chat/chat-empty-state";
import { ErrorBoundary } from "@/components/error-boundary";
import { classifyError, type AppError } from "@/lib/errors";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Toast helper — shows classified errors via Sonner
// ---------------------------------------------------------------------------

function showErrorToast(appError: AppError, onRetry?: () => void) {
  const duration = appError.severity === "warning" ? 3000 : 5000;

  if (appError.severity === "warning") {
    toast.warning(appError.userMessage, {
      duration,
      ...(appError.recoverable && onRetry
        ? { action: { label: appError.action, onClick: onRetry } }
        : {}),
    });
  } else {
    toast.error(appError.userMessage, {
      duration,
      ...(appError.recoverable && onRetry
        ? { action: { label: appError.action, onClick: onRetry } }
        : {}),
    });
  }
}

const MAX_HISTORY_MESSAGES = Number(
  process.env.NEXT_PUBLIC_MAX_HISTORY_MESSAGES ?? 50
);

interface ChatInterfaceProps {
  mindName: string;
  mindDescription?: string;
  initialMessages?: ChatMessageType[];
  initialConversationId?: string;
}

export default function ChatInterface({
  mindName,
  mindDescription,
  initialMessages,
  initialConversationId,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>(
    initialMessages ?? [
      {
        role: "model",
        text: `Ola. Eu sou a consciencia digital de **${mindName}**. Em que posso contribuir para sua estrategia hoje?`,
        timestamp: new Date(),
      },
    ]
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId
  );
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    // Only auto-scroll if user is near the bottom
    const viewport = scrollViewportRef.current;
    if (viewport) {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      if (distanceFromBottom < 200) {
        scrollToBottom();
      }
    } else {
      scrollToBottom();
    }
  }, [messages, streamingText, scrollToBottom]);

  // Scroll detection for "scroll to bottom" button
  const handleScroll = useCallback(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollButton(distanceFromBottom > 200);
  }, []);

  // Attach scroll listener to the ScrollArea viewport
  useEffect(() => {
    // The ScrollArea viewport is the element with data-slot="scroll-area-viewport"
    const scrollAreaEl = document.querySelector(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLDivElement | null;
    if (scrollAreaEl) {
      scrollViewportRef.current = scrollAreaEl;
      scrollAreaEl.addEventListener("scroll", handleScroll);
      return () => scrollAreaEl.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  /**
   * Handle selecting a suggested prompt from the empty state.
   */
  const handleSelectPrompt = useCallback(
    (prompt: string) => {
      setInput(prompt);
      // Auto-send after a brief tick so state updates
      setTimeout(() => {
        // We need to trigger send with the prompt directly
        sendPrompt(prompt);
      }, 0);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Send message via streaming API route.
   * Falls back to non-streaming server action on error.
   */
  const sendPrompt = async (promptText?: string) => {
    const textToSend = promptText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessageType = {
      role: "user",
      text: textToSend,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = textToSend;
    setInput("");
    setIsLoading(true);
    setStreamingText("");

    try {
      // Build history for the API (exclude greeting for new conversations)
      const startIdx = initialMessages ? 0 : 1;
      const allHistory = messages.slice(startIdx);
      const trimmedHistory = allHistory.length > MAX_HISTORY_MESSAGES
        ? allHistory.slice(-MAX_HISTORY_MESSAGES)
        : allHistory;
      const historyForApi = trimmedHistory.map((m) => ({
        role: m.role === "model" ? "assistant" : "user",
        content: m.text,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mindName,
          message: currentInput,
          history: historyForApi,
          conversationId,
        }),
      });

      if (!response.ok) {
        // Try to parse error JSON, fall back to non-streaming
        const errorData = await response.json().catch(() => null);
        const errorMsg = errorData?.error || "Erro ao processar mensagem.";
        throw new Error(errorMsg);
      }

      // Capture conversationId from header
      const newConversationId = response.headers.get("X-Conversation-Id");
      if (newConversationId && !conversationId) {
        setConversationId(newConversationId);
        const url = new URL(window.location.href);
        url.searchParams.set("conversation", newConversationId);
        window.history.replaceState({}, "", url.toString());
      }

      // Read streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Stream not available");
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamingText(accumulated);
      }

      // Stream complete — add final message
      setStreamingText(null);
      if (accumulated) {
        setMessages((prev) => [
          ...prev,
          { role: "model", text: accumulated, timestamp: new Date() },
        ]);
      }
    } catch (error) {
      setStreamingText(null);
      const classified = classifyError(error);

      // Fall back to non-streaming server action
      try {
        const startIdx = initialMessages ? 0 : 1;
        const fallbackAll = messages.slice(startIdx);
        const fallbackTrimmed = fallbackAll.length > MAX_HISTORY_MESSAGES
          ? fallbackAll.slice(-MAX_HISTORY_MESSAGES)
          : fallbackAll;
        const historyForApi = fallbackTrimmed.map((m) => ({
          role: m.role,
          parts: [{ text: m.text }],
        }));

        const fallbackResponse = await sendMessage(
          mindName,
          currentInput,
          historyForApi,
          conversationId
        );

        if (fallbackResponse.success && fallbackResponse.text) {
          const responseText = fallbackResponse.text;
          setMessages((prev) => [
            ...prev,
            {
              role: "model",
              text: responseText,
              timestamp: new Date(),
            },
          ]);
          if (fallbackResponse.conversationId && !conversationId) {
            setConversationId(fallbackResponse.conversationId);
            const url = new URL(window.location.href);
            url.searchParams.set(
              "conversation",
              fallbackResponse.conversationId
            );
            window.history.replaceState({}, "", url.toString());
          }
          return; // Fallback succeeded — no need to show error
        }
      } catch {
        // Fallback also failed — show toast for the original error
      }

      // Show toast for transient/recoverable errors
      showErrorToast(
        classified,
        classified.recoverable ? () => sendPrompt(currentInput) : undefined
      );

      // Show inline error message in chat
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: `*${classified.userMessage}*`,
          timestamp: new Date(),
        },
      ]);
    }

    setIsLoading(false);
  };

  const handleSend = () => sendPrompt();

  const helperText = `${mindName} acessara seus ${
    messages.length > 1 ? "arquivos de memoria" : "conhecimentos"
  } para responder.`;

  // Show empty state when only the greeting message exists (no user messages yet)
  const showEmptyState = messages.length <= 1 && !isLoading && streamingText === null;

  // Provide mindDescription fallback — unused prop is harmless
  void mindDescription;

  return (
    <ErrorBoundary
      variant="inline"
      fallback={({ reset }) => (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] w-full max-w-4xl mx-auto glass-panel rounded-2xl p-8 text-center">
          <p className="text-red-400 text-lg mb-2">Erro no chat</p>
          <p className="text-gray-400 text-sm mb-4">
            Ocorreu um erro na interface de chat. Tente reconectar.
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-200 hover:bg-purple-600/50 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}
    >
      <div className="flex flex-col h-[calc(100vh-140px)] w-full max-w-4xl mx-auto glass-panel rounded-2xl overflow-hidden animate-in fade-in duration-500">
        {/* Messages Area */}
        <div className="relative flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {showEmptyState ? (
              <ChatEmptyState
                mindName={mindName}
                onSelectPrompt={handleSelectPrompt}
              />
            ) : (
              <div className="p-6 space-y-6">
                {messages.map((msg, idx) => (
                  <ChatMessage
                    key={idx}
                    role={msg.role}
                    text={msg.text}
                    mindName={mindName}
                    timestamp={msg.timestamp}
                  />
                ))}
                {/* Show streaming text as it arrives */}
                {streamingText !== null && streamingText.length > 0 && (
                  <ChatMessage
                    role="model"
                    text={streamingText}
                    mindName={mindName}
                  />
                )}
                {/* Show loading indicator when waiting for first token */}
                {isLoading &&
                  (streamingText === null || streamingText.length === 0) && (
                    <ChatMessageLoading />
                  )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Scroll to bottom floating button */}
          <div
            className={`absolute bottom-4 right-4 transition-all duration-300 ${
              showScrollButton
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4 pointer-events-none"
            }`}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => scrollToBottom("smooth")}
              className="h-9 w-9 rounded-full bg-purple-600/50 hover:bg-purple-600/70 border border-purple-500/40 text-white shadow-lg backdrop-blur-sm p-0"
              aria-label="Ir para o final"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14" />
                <path d="m19 12-7 7-7-7" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Input Area */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={isLoading}
          helperText={helperText}
        />
      </div>
    </ErrorBoundary>
  );
}
