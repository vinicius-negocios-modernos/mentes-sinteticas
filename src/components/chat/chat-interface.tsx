"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { sendMessage } from "@/app/actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessage, { ChatMessageLoading } from "@/components/chat/chat-message";
import ChatInput from "@/components/chat/chat-input";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

interface ChatInterfaceProps {
  mindName: string;
  initialMessages?: ChatMessageType[];
  initialConversationId?: string;
}

export default function ChatInterface({
  mindName,
  initialMessages,
  initialConversationId,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>(
    initialMessages ?? [
      {
        role: "model",
        text: `Ola. Eu sou a consciencia digital de **${mindName}**. Em que posso contribuir para sua estrategia hoje?`,
      },
    ]
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId
  );
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  /**
   * Send message via streaming API route.
   * Falls back to non-streaming server action on error.
   */
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessageType = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);
    setStreamingText("");

    try {
      // Build history for the API (exclude greeting for new conversations)
      const startIdx = initialMessages ? 0 : 1;
      const historyForApi = messages.slice(startIdx).map((m) => ({
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
          { role: "model", text: accumulated },
        ]);
      }
    } catch (error) {
      setStreamingText(null);

      // Fall back to non-streaming server action
      const startIdx = initialMessages ? 0 : 1;
      const historyForApi = messages.slice(startIdx).map((m) => ({
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
        setMessages((prev) => [
          ...prev,
          { role: "model", text: fallbackResponse.text as string },
        ]);
        if (fallbackResponse.conversationId && !conversationId) {
          setConversationId(fallbackResponse.conversationId);
          const url = new URL(window.location.href);
          url.searchParams.set("conversation", fallbackResponse.conversationId);
          window.history.replaceState({}, "", url.toString());
        }
      } else {
        const errorMsg =
          error instanceof Error ? error.message : "Erro desconhecido.";
        setMessages((prev) => [
          ...prev,
          { role: "model", text: `*${errorMsg}*` },
        ]);
      }
    }

    setIsLoading(false);
  };

  const helperText = `${mindName} acessara seus ${
    messages.length > 1 ? "arquivos de memoria" : "conhecimentos"
  } para responder.`;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full max-w-4xl mx-auto glass-panel rounded-2xl overflow-hidden animate-in fade-in duration-500">
      {/* Messages Area */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} role={msg.role} text={msg.text} />
          ))}
          {/* Show streaming text as it arrives */}
          {streamingText !== null && streamingText.length > 0 && (
            <ChatMessage role="model" text={streamingText} />
          )}
          {/* Show loading indicator when waiting for first token */}
          {isLoading && (streamingText === null || streamingText.length === 0) && (
            <ChatMessageLoading />
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={isLoading}
        helperText={helperText}
      />
    </div>
  );
}
