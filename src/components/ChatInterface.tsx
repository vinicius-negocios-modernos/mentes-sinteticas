"use client";

import { useState, useRef, useEffect } from "react";
import { sendMessage } from "@/app/actions";
import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "@/lib/types";

export default function ChatInterface({ mindName }: { mindName: string }) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: "model", text: `Olá. Eu sou a consciência digital de **${mindName}**. Em que posso contribuir para sua estratégia hoje?` }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
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
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        // Prepare history for API (excluding the last user message we just added locally for optimistic UI if we wanted, but here we send all previous)
        // Actually the `sendMessage` action expects `history` compatible with Gemini SDK.
        // Gemini SDK history format: { role: "user" | "model", parts: [{ text: string }] }

        // We transform our local simpler state to Gemini format
        // Filter out the first message (greeting) to not confuse the API history validation
        const historyForApi = messages.slice(1).map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const response = await sendMessage(mindName, userMsg.text, historyForApi);

        if (response.success && response.text) {
            setMessages(prev => [...prev, { role: "model", text: response.text as string }]);
        } else {
            const errorMsg = response.error || "Erro desconhecido. Tente novamente.";
            setMessages(prev => [...prev, { role: "model", text: `⚠️ *${errorMsg}*` }]);
        }

        setIsLoading(false);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] w-full max-w-4xl mx-auto glass-panel rounded-2xl overflow-hidden animate-in fade-in duration-500">

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                            className={`max-w-[80%] p-4 rounded-2xl ${msg.role === "user"
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
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
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
                        placeholder="Digite sua questão estratégica..."
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
                    {mindName} acessará seus {messages.length > 1 ? "arquivos de memória" : "conhecimentos"} para responder.
                </div>
            </div>
        </div>
    );
}
