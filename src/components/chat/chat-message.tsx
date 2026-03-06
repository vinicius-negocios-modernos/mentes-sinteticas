"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatTimestamp(date: Date): string {
  return new Date(date).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ChatMessageProps {
  role: "user" | "model";
  text: string;
  mindName?: string;
  timestamp?: Date;
  className?: string;
}

interface ChatMessageLoadingProps {
  className?: string;
}

export function ChatMessageLoading({ className }: ChatMessageLoadingProps) {
  return (
    <div className={cn("flex justify-start gap-3", className)}>
      <Avatar className="bg-purple-600/30 shrink-0 mt-1">
        <AvatarFallback className="bg-purple-600/30 text-purple-200 text-xs">
          ...
        </AvatarFallback>
      </Avatar>
      <div className="bg-gray-800/40 p-4 rounded-2xl rounded-bl-none flex gap-2 items-center">
        <div
          className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}

export default function ChatMessage({
  role,
  text,
  mindName,
  timestamp,
  className,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Falha ao copiar texto.");
    }
  };

  return (
    <div
      className={cn(
        "group flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {/* Avatar */}
      <Avatar className={cn("shrink-0 mt-1", isUser ? "bg-cyan-600/30" : "bg-purple-600/30")}>
        <AvatarFallback
          className={cn(
            "text-xs font-semibold",
            isUser
              ? "bg-cyan-600/30 text-cyan-200"
              : "bg-purple-600/30 text-purple-200"
          )}
        >
          {isUser ? "EU" : mindName ? getInitials(mindName) : "MS"}
        </AvatarFallback>
      </Avatar>

      {/* Message bubble + meta */}
      <div className={cn("flex flex-col max-w-[80%]", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "relative p-4 rounded-2xl",
            isUser
              ? "bg-cyan-600/15 border border-cyan-500/25 text-white rounded-br-none"
              : "bg-gray-800/40 border border-gray-700/50 text-gray-200 rounded-bl-none"
          )}
        >
          <div className="prose prose-invert prose-sm prose-p:leading-relaxed prose-pre:bg-black/50 max-w-none">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>

          {/* Copy button — only on AI messages, shown on hover */}
          {!isUser && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="absolute -bottom-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-md"
              aria-label="Copiar mensagem"
            >
              {copied ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-400"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              )}
            </Button>
          )}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <span className="text-xs text-gray-500 mt-1.5 px-1">
            {formatTimestamp(timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}
