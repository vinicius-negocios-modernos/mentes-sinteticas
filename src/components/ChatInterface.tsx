"use client";

import { useState, useRef, useEffect } from "react";
import { sendMessage } from "@/app/actions";
import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "@/lib/types";

interface ChatInterfaceProps {
  mindName: string;
  initialMessages?: ChatMessage[];
  initialConversationId?: string;
}

export default function ChatInterface({
  mindName,
  initialMessages,
  initialConversationId,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(
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

    const userMsg: ChatMessage = { role: "user", text: input };
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

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full max-w-4xl mx-auto glass-panel rounded-2xl overflow-hidden animate-in fade-in duration-500">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl ${
                msg.role === "user"
                  ? "bg-purple-600/20 border border-purple-500/30 text-white rounded-br-none"
                  : "bg-gray-800/40 border border-gray-700/50 text-gray-200 rounded-bl-none"
              }`}
            >
              <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/50">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800/40 p-4 rounded-2xl rounded-bl-none flex gap-2 items-center">
              <div
                className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-md">
        <div className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Digite sua questao estrategica..."
            disabled={isLoading}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-4 focus:outline-none focus:border-purple-500/50 transition-all text-white placeholder-gray-500"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="absolute right-2 top-2 bottom-2 px-6 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 rounded-lg text-white font-medium transition-colors"
          >
            Enviar
          </button>
        </div>
        <div className="text-center mt-2 text-xs text-gray-600">
          {mindName} acessara seus{" "}
          {messages.length > 1 ? "arquivos de memoria" : "conhecimentos"} para
          responder.
        </div>
      </div>
    </div>
  );
}
