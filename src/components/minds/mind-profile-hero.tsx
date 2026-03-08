import Link from "next/link";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import MindAvatar from "./mind-avatar";
import type { Mind } from "@/db/schema";

interface MindProfileHeroProps {
  mind: Mind;
  className?: string;
}

/**
 * Hero section of the mind profile page.
 * Displays name, title, era, nationality, and avatar.
 * CTA button is inline on desktop, hidden here on mobile (sticky bottom instead).
 */
export default function MindProfileHero({
  mind,
  className,
}: MindProfileHeroProps) {
  return (
    <section
      aria-labelledby="mind-name"
      className={cn(
        "glass-panel rounded-2xl p-6 sm:p-8 md:p-10",
        className
      )}
    >
      <div className="flex flex-col items-center text-center md:flex-row md:items-start md:text-left gap-6 md:gap-8">
        {/* Avatar */}
        <MindAvatar
          name={mind.name}
          avatarUrl={mind.avatarUrl}
          size="lg"
          className="shrink-0"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1
            id="mind-name"
            className="text-3xl sm:text-4xl font-bold text-gradient"
          >
            {mind.name}
          </h1>

          {mind.title && (
            <p className="mt-2 text-lg text-[#c9a55a]/80 font-medium">
              {mind.title}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-muted-foreground">
            {mind.era && (
              <span className="inline-flex items-center gap-1.5">
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
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>
                  <span className="sr-only">{t("mindProfile.era")}: </span>
                  {mind.era}
                </span>
              </span>
            )}
            {mind.nationality && (
              <span className="inline-flex items-center gap-1.5">
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
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
                <span>
                  <span className="sr-only">
                    {t("mindProfile.nationality")}:{" "}
                  </span>
                  {mind.nationality}
                </span>
              </span>
            )}
          </div>

          {/* CTA — visible only on desktop (mobile has sticky bottom) */}
          <div className="mt-6 hidden md:block">
            <Button asChild size="lg">
              <Link
                href={`/chat/${encodeURIComponent(mind.name)}`}
                aria-label={`${t("mindProfile.startConversationWith")} ${mind.name}`}
              >
                {t("mindProfile.startConversation")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
