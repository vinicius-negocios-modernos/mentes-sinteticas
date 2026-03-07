"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

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
  backHref?: string;
  className?: string;
  /** Increment to trigger a usage data refresh */
  refreshTrigger?: number;
}

export default function ChatHeader({
  mindName,
  mindDescription,
  backHref = "/",
  className,
  refreshTrigger = 0,
}: ChatHeaderProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);

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
      {/* Mind Avatar */}
      <Avatar size="lg" className="bg-purple-600/30 shrink-0">
        <AvatarFallback className="bg-purple-600/30 text-purple-200 text-sm font-semibold">
          {getInitials(mindName)}
        </AvatarFallback>
      </Avatar>

      {/* Name + Description + Status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 truncate">
            {mindName}
          </h1>
          {/* Online status indicator */}
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-xs text-green-400 hidden sm:inline">Online</span>
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

      {/* End Session button */}
      <Button
        variant="ghost"
        asChild
        className="text-sm text-muted-foreground hover:text-white shrink-0"
      >
        <Link href={backHref}>Encerrar Sessao</Link>
      </Button>
    </header>
  );
}
