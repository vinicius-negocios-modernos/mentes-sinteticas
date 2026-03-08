"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Color themes for up to 4 debate participants. */
export const DEBATE_COLORS = [
  {
    bg: "bg-purple-600/30",
    text: "text-purple-200",
    border: "border-purple-500/25",
    glow: "rgba(168, 85, 247, 0.15)",
  },
  {
    bg: "bg-cyan-600/30",
    text: "text-cyan-200",
    border: "border-cyan-500/25",
    glow: "rgba(34, 211, 238, 0.15)",
  },
  {
    bg: "bg-amber-600/30",
    text: "text-amber-200",
    border: "border-amber-500/25",
    glow: "rgba(245, 158, 11, 0.15)",
  },
  {
    bg: "bg-emerald-600/30",
    text: "text-emerald-200",
    border: "border-emerald-500/25",
    glow: "rgba(52, 211, 153, 0.15)",
  },
] as const;

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const remarkPlugins = [remarkGfm];

interface DebateMessageProps {
  role: "user" | "model";
  text: string;
  mindName?: string;
  mindSlug?: string;
  colorIndex?: number;
  turnNumber?: number;
  isStreaming?: boolean;
  className?: string;
}

function DebateMessageInner({
  role,
  text,
  mindName,
  colorIndex = 0,
  turnNumber,
  isStreaming = false,
  className,
}: DebateMessageProps) {
  const isUser = role === "user";
  const color = DEBATE_COLORS[colorIndex % DEBATE_COLORS.length];

  const renderedMarkdown = useMemo(
    () => (
      <ReactMarkdown remarkPlugins={remarkPlugins}>{text}</ReactMarkdown>
    ),
    [text]
  );

  if (isUser) {
    return (
      <div
        className={cn("flex gap-3 flex-row-reverse", className)}
        role="article"
        aria-label="Voce disse"
      >
        <Avatar className="shrink-0 mt-1 bg-cyan-600/30">
          <AvatarFallback className="text-xs font-semibold bg-cyan-600/30 text-cyan-200">
            EU
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col max-w-[80%] items-end">
          <span className="text-xs text-cyan-300 mb-1 px-1 font-medium">
            Voce
          </span>
          <div className="p-4 rounded-2xl bg-cyan-600/15 border border-cyan-500/25 text-white rounded-br-none">
            <span className="sr-only">Voce:</span>
            <div className="prose prose-invert prose-sm max-w-none">
              {renderedMarkdown}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("flex gap-3 flex-row", className)}
      role="article"
      aria-label={`${mindName ?? "Mente"} disse`}
    >
      <Avatar
        className={cn("shrink-0 mt-1", color.bg)}
        aria-hidden="true"
      >
        <AvatarFallback
          className={cn("text-xs font-semibold", color.bg, color.text)}
          aria-hidden="true"
        >
          {mindName ? getInitials(mindName) : "MS"}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col max-w-[80%] items-start">
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className={cn("text-xs font-medium", color.text)}>
            {mindName ?? "Mente"}
          </span>
          {turnNumber !== undefined && (
            <span className="text-xs text-muted-foreground">
              Turno {turnNumber + 1}
            </span>
          )}
        </div>
        <div
          className={cn(
            "relative p-4 rounded-2xl rounded-bl-none",
            "bg-gray-800/40 border",
            color.border,
            "text-gray-200"
          )}
          style={{ boxShadow: `0 0 20px ${color.glow}` }}
        >
          <span className="sr-only">{mindName ?? "Mente"}:</span>
          <div className="prose prose-invert prose-sm prose-p:leading-relaxed max-w-none">
            {renderedMarkdown}
          </div>
          {isStreaming && (
            <span
              className="inline-block w-1.5 h-4 bg-white/60 animate-pulse ml-0.5 align-text-bottom motion-reduce:animate-none"
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading indicator shown when a mind is "thinking" during a debate turn.
 */
export function DebateMessageLoading({
  mindName,
  colorIndex = 0,
}: {
  mindName: string;
  colorIndex?: number;
}) {
  const color = DEBATE_COLORS[colorIndex % DEBATE_COLORS.length];

  return (
    <div className="flex gap-3" role="status" aria-live="polite" aria-label={`${mindName} esta respondendo`}>
      <Avatar className={cn("shrink-0 mt-1", color.bg)} aria-hidden="true">
        <AvatarFallback
          className={cn("text-xs font-semibold", color.bg, color.text)}
        >
          {getInitials(mindName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-start">
        <span className={cn("text-xs font-medium mb-1 px-1", color.text)}>
          {mindName}
        </span>
        <div
          className={cn(
            "p-4 rounded-2xl rounded-bl-none bg-gray-800/40 border flex gap-2 items-center",
            color.border
          )}
        >
          <span className="sr-only">{mindName} esta pensando...</span>
          {/* Animated dots — hidden for reduced-motion, replaced by static text */}
          {[0, 150, 300].map((delay) => (
            <div
              key={delay}
              className={cn("w-2 h-2 rounded-full animate-bounce motion-reduce:animate-none", color.bg)}
              style={{ animationDelay: `${delay}ms` }}
              aria-hidden="true"
            />
          ))}
          <span className="hidden motion-reduce:inline text-xs text-muted-foreground" aria-hidden="true">
            Pensando...
          </span>
        </div>
      </div>
    </div>
  );
}

const DebateMessage = memo(DebateMessageInner, (prev, next) => {
  return (
    prev.text === next.text &&
    prev.role === next.role &&
    prev.isStreaming === next.isStreaming &&
    prev.mindName === next.mindName
  );
});

DebateMessage.displayName = "DebateMessage";

export default DebateMessage;
