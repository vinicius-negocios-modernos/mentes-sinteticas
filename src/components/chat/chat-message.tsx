"use client";

import { useState, useMemo, memo, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { CodeBlock } from "./code-block";
import { CollapsibleMessage } from "./collapsible-message";

/* ---------- Lazy-load KaTeX CSS ---------- */
let katexCssLoaded = false;
function ensureKatexCss() {
  if (katexCssLoaded || typeof document === "undefined") return;
  katexCssLoaded = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css";
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

/* ---------- Lazy-load highlight.js theme CSS ---------- */
let hljsCssLoaded = false;
function ensureHljsCss() {
  if (hljsCssLoaded || typeof document === "undefined") return;
  hljsCssLoaded = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/styles/github-dark.min.css";
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

/* ---------- Helpers ---------- */

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

/* ---------- remark / rehype plugin arrays (stable refs) ---------- */

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeKatex, rehypeHighlight];

/* ---------- Custom ReactMarkdown components ---------- */

/**
 * Extract raw text from React children tree (for code blocks).
 */
function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as React.ReactElement<{ children?: React.ReactNode }>).props.children);
  }
  return "";
}

const markdownComponents: Components = {
  // --- Code blocks (fenced) and inline code ---
  pre({ children, ...props }) {
    // rehype-highlight wraps code inside <pre><code>…</code></pre>
    // We intercept <pre> to render our CodeBlock component.
    const codeChild = children as React.ReactElement<{
      className?: string;
      children?: React.ReactNode;
    }>;

    if (
      codeChild &&
      typeof codeChild === "object" &&
      "props" in codeChild
    ) {
      const codeProps = codeChild.props;
      const lang = codeProps.className
        ?.split(/\s+/)
        .find((c: string) => c.startsWith("language-") || c.startsWith("hljs"))
        ?.replace("language-", "")
        .replace("hljs", "") || "";

      const rawText = extractText(codeProps.children);

      return <CodeBlock language={lang}>{rawText}</CodeBlock>;
    }

    return <pre {...props}>{children}</pre>;
  },

  code({ className, children, ...props }) {
    // If className contains "language-" it's a fenced block handled by <pre> above.
    // This catches **inline** code only.
    const isInline = !className?.includes("language-") && !className?.includes("hljs");

    if (isInline) {
      return (
        <code
          className="bg-white/10 text-[0.9em] rounded px-1.5 py-0.5 font-mono border border-white/5"
          {...props}
        >
          {children}
        </code>
      );
    }

    // Fenced code inside <pre> — pass through (handled by pre override)
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },

  // --- Links open in new tab ---
  a({ href, children, ...props }: ComponentPropsWithoutRef<"a">) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        {...props}
      >
        {children}
      </a>
    );
  },

  // --- Tables with dark theme styling ---
  table({ children, ...props }) {
    return (
      <div className="overflow-x-auto my-3 rounded-lg border border-white/10">
        <table className="w-full text-sm" {...props}>
          {children}
        </table>
      </div>
    );
  },
  thead({ children, ...props }) {
    return (
      <thead className="bg-white/5 border-b border-white/10" {...props}>
        {children}
      </thead>
    );
  },
  th({ children, ...props }) {
    return (
      <th
        className="px-3 py-2 text-left font-semibold text-foreground"
        {...props}
      >
        {children}
      </th>
    );
  },
  td({ children, ...props }) {
    return (
      <td
        className="px-3 py-2 border-t border-white/5 text-muted-foreground"
        {...props}
      >
        {children}
      </td>
    );
  },

  // --- Blockquotes ---
  blockquote({ children, ...props }) {
    return (
      <blockquote
        className="border-l-2 border-primary/50 pl-4 italic text-muted-foreground my-2"
        {...props}
      >
        {children}
      </blockquote>
    );
  },
};

/* ---------- Interfaces ---------- */

interface ChatMessageProps {
  role: "user" | "model";
  text: string;
  mindName?: string;
  timestamp?: Date;
  isStreaming?: boolean;
  className?: string;
  /** Whether TTS is supported and voice mode is enabled. */
  showSpeakerButton?: boolean;
  /** Whether TTS is currently speaking this message. */
  isSpeakingThis?: boolean;
  /** Speak this message via TTS. */
  onSpeak?: (text: string) => void;
  /** Stop TTS playback. */
  onStopSpeaking?: () => void;
}

interface ChatMessageLoadingProps {
  className?: string;
}

/* ---------- Loading component ---------- */

export function ChatMessageLoading({ className }: ChatMessageLoadingProps) {
  return (
    <div className={cn("flex justify-start gap-3", className)}>
      <Avatar
        className="shrink-0 mt-1"
        style={{ backgroundColor: "hsl(var(--primary) / 0.3)" }}
        aria-hidden="true"
      >
        <AvatarFallback
          className="text-xs"
          style={{
            backgroundColor: "hsl(var(--primary) / 0.3)",
            color: "hsl(var(--primary))",
          }}
        >
          ...
        </AvatarFallback>
      </Avatar>
      <div
        className="bg-gray-800/40 p-4 rounded-2xl rounded-bl-none flex gap-2 items-center"
        aria-label="A mente esta respondendo"
        role="status"
      >
        <div
          className="w-2 h-2 rounded-full animate-bounce"
          style={{
            backgroundColor: "hsl(var(--primary))",
            animationDelay: "0ms",
          }}
          aria-hidden="true"
        />
        <div
          className="w-2 h-2 rounded-full animate-bounce"
          style={{
            backgroundColor: "hsl(var(--primary))",
            animationDelay: "150ms",
          }}
          aria-hidden="true"
        />
        <div
          className="w-2 h-2 rounded-full animate-bounce"
          style={{
            backgroundColor: "hsl(var(--primary))",
            animationDelay: "300ms",
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

/* ---------- Main message component ---------- */

function ChatMessageInner({
  role,
  text,
  mindName,
  timestamp,
  isStreaming = false,
  className,
  showSpeakerButton = false,
  isSpeakingThis = false,
  onSpeak,
  onStopSpeaking,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";

  // Lazy-load CSS for highlight.js and KaTeX on first AI message render
  if (!isUser) {
    ensureHljsCss();
    ensureKatexCss();
  }

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

  // Memoize markdown rendering to prevent unnecessary re-parses
  const renderedMarkdown = useMemo(
    () => (
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    ),
    [text]
  );

  return (
    <div
      data-role={role}
      role="article"
      aria-label={
        isUser
          ? "Mensagem do usuario"
          : mindName
            ? `Mensagem de ${mindName}`
            : "Mensagem da mente"
      }
      className={cn(
        "group flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {/* Avatar */}
      <Avatar
        className={cn("shrink-0 mt-1", isUser ? "bg-cyan-600/30" : "")}
        style={
          !isUser
            ? { backgroundColor: "hsl(var(--primary) / 0.3)" }
            : undefined
        }
        aria-label={
          isUser
            ? "Avatar do usuario"
            : mindName
              ? `Avatar de ${mindName}`
              : "Avatar da mente"
        }
      >
        <AvatarFallback
          className={cn(
            "text-xs font-semibold",
            isUser ? "bg-cyan-600/30 text-cyan-200" : ""
          )}
          style={
            !isUser
              ? {
                  backgroundColor: "hsl(var(--primary) / 0.3)",
                  color: "hsl(var(--primary))",
                }
              : undefined
          }
          aria-hidden="true"
        >
          {isUser ? "EU" : mindName ? getInitials(mindName) : "MS"}
        </AvatarFallback>
      </Avatar>

      {/* Message bubble + meta */}
      <div
        className={cn(
          "flex flex-col max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "relative p-4 rounded-2xl",
            isUser
              ? "bg-cyan-600/15 border border-cyan-500/25 text-white rounded-br-none"
              : "bg-gray-800/40 border border-gray-700/50 text-gray-200 rounded-bl-none"
          )}
          style={
            !isUser
              ? {
                  boxShadow:
                    "0 0 20px var(--mind-glow, rgba(168, 85, 247, 0.15))",
                }
              : undefined
          }
        >
          <div className="prose prose-invert prose-sm prose-p:leading-relaxed prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0 max-w-none">
            {isUser ? (
              renderedMarkdown
            ) : (
              <CollapsibleMessage text={text} isStreaming={isStreaming}>
                {renderedMarkdown}
              </CollapsibleMessage>
            )}
          </div>

          {/* Action buttons -- only on AI messages, shown on hover */}
          {!isUser && (
            <div className="absolute -bottom-3 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Speaker button for TTS */}
            {showSpeakerButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (isSpeakingThis) {
                    onStopSpeaking?.();
                  } else {
                    onSpeak?.(text);
                  }
                }}
                className={cn(
                  "h-7 px-2 text-xs rounded-md transition-colors",
                  isSpeakingThis
                    ? "text-purple-400 hover:text-purple-300 hover:bg-white/10"
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                )}
                aria-label={
                  isSpeakingThis
                    ? t("voice.stopListening")
                    : t("voice.listenMessage")
                }
                aria-pressed={isSpeakingThis}
              >
                {isSpeakingThis ? (
                  /* Sound waves animation icon */
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
                    className="animate-voice-waves"
                    aria-hidden="true"
                  >
                    <path d="M2 10v3" />
                    <path d="M6 6v11" />
                    <path d="M10 3v18" />
                    <path d="M14 8v7" />
                    <path d="M18 5v13" />
                    <path d="M22 10v3" />
                  </svg>
                ) : (
                  /* Volume icon */
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
                    aria-hidden="true"
                  >
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                )}
              </Button>
            )}
            {/* Copy button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-md"
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
                  aria-hidden="true"
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
                  aria-hidden="true"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              )}
            </Button>
            </div>
          )}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <span className="text-xs text-muted-foreground mt-1.5 px-1">
            {formatTimestamp(timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Memoized chat message — only re-renders when `text`, `role`, or `isStreaming` change.
 * This is critical for streaming performance (AC10).
 */
const ChatMessage = memo(ChatMessageInner, (prev, next) => {
  return (
    prev.text === next.text &&
    prev.role === next.role &&
    prev.isStreaming === next.isStreaming &&
    prev.mindName === next.mindName &&
    prev.showSpeakerButton === next.showSpeakerButton &&
    prev.isSpeakingThis === next.isSpeakingThis
  );
});

ChatMessage.displayName = "ChatMessage";

export default ChatMessage;
