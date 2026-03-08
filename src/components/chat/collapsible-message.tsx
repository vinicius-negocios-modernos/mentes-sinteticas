"use client";

import { useState, useId } from "react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

/** Number of visible lines when collapsed. */
const COLLAPSED_LINES = 10;
/** Threshold: messages with more lines than this are collapsible. */
const COLLAPSE_THRESHOLD = 15;

interface CollapsibleMessageProps {
  text: string;
  isStreaming?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps message content and collapses it when the raw text exceeds
 * COLLAPSE_THRESHOLD lines. Messages currently being streamed are
 * never collapsed.
 */
export function CollapsibleMessage({
  text,
  isStreaming = false,
  children,
  className,
}: CollapsibleMessageProps) {
  const lineCount = text.split("\n").length;
  const isLong = lineCount > COLLAPSE_THRESHOLD;
  const canCollapse = isLong && !isStreaming;

  const [expanded, setExpanded] = useState(!canCollapse);
  const contentId = useId();

  // If not collapsible, render children directly
  if (!canCollapse) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative", className)}>
      <div
        id={contentId}
        className={cn(
          "overflow-hidden transition-[max-height] duration-300 ease-in-out",
          !expanded && "max-h-[15rem]"
        )}
      >
        {children}
      </div>

      {/* Fade-out gradient when collapsed */}
      {!expanded && (
        <div
          className="absolute bottom-8 left-0 right-0 h-16 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent, hsl(var(--background) / 0.9))",
          }}
          aria-hidden="true"
        />
      )}

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        aria-expanded={expanded}
        aria-controls={contentId}
        aria-label={
          expanded ? t("chat.collapseLess") : t("chat.collapseMore")
        }
      >
        <ChevronIcon className={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-180")} />
        {expanded ? t("chat.collapseLess") : t("chat.collapseMore")}
      </button>
    </div>
  );
}

/** Exported for tests. */
export { COLLAPSE_THRESHOLD, COLLAPSED_LINES };

function ChevronIcon({ className }: { className?: string }) {
  return (
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
      className={className}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
