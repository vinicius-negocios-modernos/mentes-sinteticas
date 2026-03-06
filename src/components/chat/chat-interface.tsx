"use client";

import { useState, useRef, useEffect } from "react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessageType = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Prepare history for API (exclude greeting / initial messages for Gemini format)
    // Filter: skip the first message (greeting) from history sent to Gemini
    const startIdx = initialMessages ? 0 : 1;
    const historyForApi = messages.slice(startIdx).map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    const response = await sendMessage(
      mindName,
      userMsg.text,
      historyForApi,
      conversationId
    );

    if (response.success && response.text) {
      setMessages((prev) => [
        ...prev,
        { role: "model", text: response.text as string },
      ]);
      // Store conversationId from first response
      if (response.conversationId && !conversationId) {
        setConversationId(response.conversationId);
        // Update URL without full navigation so user can bookmark/reload
        const url = new URL(window.location.href);
        url.searchParams.set("conversation", response.conversationId);
        window.history.replaceState({}, "", url.toString());
      }
    } else {
      const errorMsg = response.error || "Erro desconhecido. Tente novamente.";
      setMessages((prev) => [
        ...prev,
        { role: "model", text: `*${errorMsg}*` },
      ]);
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
          {isLoading && <ChatMessageLoading />}
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
