"use client";

import Link from "next/link";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";
import type { ConversationStarter } from "@/data/conversation-starters";

interface MindConversationStartersProps {
  /** Mind display name — used to build the /chat/{name} link */
  mindName: string;
  starters: ConversationStarter[];
  className?: string;
}

/**
 * Conversation starters section of the mind profile page.
 * Displays 3-5 contextual prompt suggestions as clickable cards
 * that redirect to the chat with the prompt pre-encoded in the URL.
 */
export default function MindConversationStarters({
  mindName,
  starters,
  className,
}: MindConversationStartersProps) {
  if (starters.length === 0) return null;

  return (
    <section
      aria-labelledby="mind-starters"
      className={cn("glass-panel rounded-2xl p-6 sm:p-8", className)}
    >
      <h2
        id="mind-starters"
        className="text-xl font-semibold text-[#c9a55a] mb-4"
      >
        {t("mindProfile.conversationStarters")}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list">
        {starters.map((starter) => (
          <Link
            key={starter.text}
            role="listitem"
            href={`/chat/${encodeURIComponent(mindName)}?prompt=${encodeURIComponent(starter.text)}`}
            onClick={() => triggerHaptic("light")}
            aria-label={`${t("mindProfile.startConversationWith")} ${mindName}: ${starter.text}`}
            className="group flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/40 hover:bg-purple-600/10 transition-colors text-left"
          >
            {/* Chat bubble icon */}
            <div className="shrink-0 text-purple-400/60 group-hover:text-purple-400 transition-colors">
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
                <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
              </svg>
            </div>
            <span className="text-sm text-gray-300 group-hover:text-gray-100 transition-colors">
              {starter.text}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
