"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessage from "@/components/chat/chat-message";
import { t } from "@/lib/i18n";
import type { SharedConversationData } from "@/lib/services/sharing";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface SharedConversationViewProps {
  data: SharedConversationData;
  className?: string;
}

/**
 * Read-only view of a shared conversation.
 * Displays messages with branding and a CTA to create an account.
 */
export default function SharedConversationView({
  data,
  className,
}: SharedConversationViewProps) {
  const { conversation, mind, messages } = data;
  const mindSlug = mind.slug;

  return (
    <div
      data-mind-theme={mindSlug}
      className={cn(
        "min-h-[100dvh] flex flex-col bg-[#0a0a0f] font-[family-name:var(--font-geist-sans)]",
        className
      )}
    >
      {/* Mind theme background gradient overlay */}
      <div className="mind-theme-bg" aria-hidden="true" />

      {/* Header */}
      <header
        className="relative z-10 border-b border-gray-800/50 px-4 sm:px-6 py-4"
        aria-label={t("sharing.sharedConversationHeader")}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          {/* Mind Avatar */}
          <Avatar
            size="lg"
            className="shrink-0"
            style={{ backgroundColor: "hsl(var(--primary) / 0.3)" }}
          >
            <AvatarFallback
              className="text-sm font-semibold"
              aria-label={`Avatar de ${mind.name}`}
              style={{
                backgroundColor: "hsl(var(--primary) / 0.3)",
                color: "hsl(var(--primary))",
              }}
            >
              {getInitials(mind.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h1
              className="text-xl font-bold text-transparent bg-clip-text truncate"
              style={{
                backgroundImage:
                  "linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent)))",
              }}
            >
              {mind.name}
            </h1>
            {conversation.title && (
              <p className="text-sm text-gray-400 truncate mt-0.5">
                {conversation.title}
              </p>
            )}
          </div>

          {/* Shared badge */}
          <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
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
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            {t("sharing.sharedBadge")}
          </span>
        </div>
      </header>

      {/* Messages */}
      <main id="main-content" className="relative z-10 flex-1 max-w-4xl mx-auto w-full">
        <ScrollArea className="h-[calc(100dvh-180px)]">
          <div
            className="p-4 sm:p-6 space-y-6"
            role="log"
            aria-label={`Conversa compartilhada com ${mind.name}`}
          >
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role === "assistant" ? "model" : "user"}
                text={msg.content}
                mindName={mind.name}
                timestamp={new Date(msg.created_at)}
              />
            ))}
          </div>
        </ScrollArea>
      </main>

      {/* Footer with branding + CTA */}
      <footer
        className="relative z-10 border-t border-gray-800/50 px-4 sm:px-6 py-6"
        aria-label={t("sharing.footerLabel")}
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Branding */}
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold text-gray-300">
              {t("common.appName")}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("common.tagline")}
            </p>
          </div>

          {/* CTAs */}
          <nav aria-label={t("sharing.footerNavLabel")} className="flex items-center gap-3">
            <Button variant="ghost" asChild className="text-sm text-gray-400 hover:text-white">
              <Link href="/">{t("sharing.exploreMindsCta")}</Link>
            </Button>
            <Button asChild className="text-sm">
              <Link href="/signup">{t("sharing.createAccountCta")}</Link>
            </Button>
          </nav>
        </div>
      </footer>
    </div>
  );
}
