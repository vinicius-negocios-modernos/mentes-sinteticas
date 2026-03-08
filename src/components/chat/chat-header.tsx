"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import SharePopover from "@/components/chat/share-popover";
import MemoryPanel from "@/components/memory/memory-panel";
import { useVoiceContext } from "@/components/chat/chat-voice-wrapper";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatTokenCount(tokens: number): string {
  if (tokens < 1000) return `${tokens} tokens`;
  if (tokens < 1_000_000) return `~${(tokens / 1000).toFixed(1)}K tokens`;
  return `~${(tokens / 1_000_000).toFixed(1)}M tokens`;
}

interface UsageData {
  daily: {
    tokens: number;
    cost: number;
    limit: number;
    percentage: number;
  };
  monthly: {
    tokens: number;
    cost: number;
    limit: number;
    percentage: number;
  };
}

interface ChatHeaderProps {
  mindName: string;
  mindDescription?: string;
  /** Mind UUID for memory panel */
  mindDbId?: string;
  backHref?: string;
  className?: string;
  /** Increment to trigger a usage data refresh */
  refreshTrigger?: number;
  /** Current conversation ID (needed for sharing) */
  conversationId?: string;
  /** Whether the conversation is currently shared */
  initialShareToken?: string | null;
}

export default function ChatHeader({
  mindName,
  mindDescription,
  mindDbId,
  backHref = "/",
  className,
  refreshTrigger = 0,
  conversationId,
  initialShareToken = null,
}: ChatHeaderProps) {
  // Voice mode from context (null if no VoiceProvider wraps this)
  const voice = useVoiceContext();
  const showVoiceControls = !!voice && (voice.sttSupported || voice.ttsSupported);
  const voiceModeEnabled = voice?.enabled ?? false;
  const autoPlayEnabled = voice?.autoPlay ?? false;
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [isShared, setIsShared] = useState(!!initialShareToken);
  const [shareToken, setShareToken] = useState<string | null>(initialShareToken ?? null);

  useEffect(() => {
    let cancelled = false;
    async function fetchUsage() {
      try {
        const res = await fetch("/api/usage");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setUsage(data);
        }
      } catch {
        // Non-critical — silently ignore
      }
    }
    fetchUsage();
    return () => { cancelled = true; };
  }, [refreshTrigger]);

  const approachingLimit = usage && usage.daily.percentage >= 80;

  return (
    <header
      className={cn(
        "mb-6 flex items-center gap-4 px-2",
        className
      )}
    >
      {/* Mind Avatar — uses theme primary color */}
      <Avatar size="lg" className="shrink-0" style={{ backgroundColor: "hsl(var(--primary) / 0.3)" }}>
        <AvatarFallback className="text-sm font-semibold" style={{ backgroundColor: "hsl(var(--primary) / 0.3)", color: "hsl(var(--primary))" }}>
          {getInitials(mindName)}
        </AvatarFallback>
      </Avatar>

      {/* Name + Description + Status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-transparent bg-clip-text truncate" style={{ backgroundImage: "linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent)))" }}>
            {mindName}
          </h1>
          {/* Theme indicator dot + Online status */}
          <span
            className="relative flex h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: "hsl(var(--primary))" }}
            aria-hidden="true"
          />
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-xs text-green-400 hidden sm:inline">{t("chat.onlineStatus")}</span>
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {mindDescription && (
            <p className="text-sm text-gray-400 truncate">
              {mindDescription}
            </p>
          )}
          {usage && (
            <span
              className={cn(
                "text-xs shrink-0",
                approachingLimit
                  ? "text-amber-400"
                  : "text-muted-foreground"
              )}
              title={`Uso diario: ${usage.daily.percentage}% | $${usage.daily.cost.toFixed(4)}`}
            >
              {formatTokenCount(usage.daily.tokens)}
            </span>
          )}
        </div>
      </div>

      {/* Memory panel */}
      {mindDbId && (
        <MemoryPanel mindId={mindDbId} mindName={mindName} />
      )}

      {/* Voice mode toggle */}
      {showVoiceControls && (
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={voice?.toggleVoiceMode}
            aria-pressed={voiceModeEnabled}
            aria-label={
              voiceModeEnabled
                ? t("voice.voiceModeOn")
                : t("voice.voiceModeOff")
            }
            title={t("voice.voiceModeTooltip")}
            className={cn(
              "h-9 w-9 p-0 rounded-lg transition-colors",
              voiceModeEnabled
                ? "text-purple-400 bg-purple-500/20 hover:bg-purple-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/10"
            )}
          >
            {/* AudioLines icon */}
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
              aria-hidden="true"
            >
              <path d="M2 10v3" />
              <path d="M6 6v11" />
              <path d="M10 3v18" />
              <path d="M14 8v7" />
              <path d="M18 5v13" />
              <path d="M22 10v3" />
            </svg>
          </Button>
          {/* Auto-play sub-toggle — only visible when voice mode is on */}
          {voiceModeEnabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={voice?.toggleAutoPlay}
              aria-pressed={autoPlayEnabled}
              aria-label={
                autoPlayEnabled
                  ? t("voice.autoPlayOn")
                  : t("voice.autoPlayOff")
              }
              title={t("voice.autoPlayTooltip")}
              className={cn(
                "h-9 w-9 p-0 rounded-lg transition-colors",
                autoPlayEnabled
                  ? "text-green-400 bg-green-500/20 hover:bg-green-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              )}
            >
              {/* Play/Pause icon */}
              {autoPlayEnabled ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
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
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="22" x2="16" y1="9" y2="15" />
                  <line x1="16" x2="22" y1="9" y2="15" />
                </svg>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Share button */}
      {conversationId && (
        <SharePopover
          conversationId={conversationId}
          isShared={isShared}
          shareToken={shareToken}
          onShareChange={(shared, token) => {
            setIsShared(shared);
            setShareToken(token);
          }}
        />
      )}

      {/* End Session button */}
      <Button
        variant="ghost"
        asChild
        className="text-sm text-muted-foreground hover:text-white shrink-0"
      >
        <Link href={backHref}>{t("chat.endSession")}</Link>
      </Button>
    </header>
  );
}
