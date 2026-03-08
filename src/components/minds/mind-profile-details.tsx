import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Mind } from "@/db/schema";

interface MindProfileDetailsProps {
  mind: Mind;
  className?: string;
}

/**
 * Details section of the mind profile page.
 * Displays "About" (from systemPrompt), personality traits as badges,
 * and areas of expertise derived from traits.
 */
export default function MindProfileDetails({
  mind,
  className,
}: MindProfileDetailsProps) {
  const traits = mind.personalityTraits ?? [];

  // Derive a short "about" text from the systemPrompt.
  // We take the first 2-3 sentences as a description.
  const aboutText = mind.systemPrompt
    ? extractAbout(mind.systemPrompt)
    : null;

  return (
    <div className={cn("space-y-6", className)}>
      {/* About Section */}
      {aboutText && (
        <section
          aria-labelledby="mind-about"
          className="glass-panel rounded-2xl p-6 sm:p-8"
        >
          <h2
            id="mind-about"
            className="text-xl font-semibold text-[#c9a55a] mb-4"
          >
            {t("mindProfile.about")}
          </h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
            {aboutText}
          </p>
        </section>
      )}

      {/* Personality Traits */}
      {traits.length > 0 && (
        <section
          aria-labelledby="mind-traits"
          className="glass-panel rounded-2xl p-6 sm:p-8"
        >
          <h2
            id="mind-traits"
            className="text-xl font-semibold text-[#c9a55a] mb-4"
          >
            {t("mindProfile.personalityTraits")}
          </h2>
          <div className="flex flex-wrap gap-2" role="list">
            {traits.map((trait) => (
              <span
                key={trait}
                role="listitem"
                className="px-3 py-1.5 rounded-full text-sm bg-purple-600/20 border border-purple-500/40 text-purple-200"
              >
                {trait}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Extract a readable "about" paragraph from a systemPrompt.
 * Takes the first meaningful block of text (up to ~500 chars).
 */
function extractAbout(systemPrompt: string): string {
  // Remove common prompt prefixes like "You are...", "Act as..."
  const cleaned = systemPrompt
    .replace(/^(You are|Act as|Voce e|Atue como)[^.]*\.\s*/i, "")
    .trim();

  // Take first ~500 characters, ending at a sentence boundary
  if (cleaned.length <= 500) return cleaned;

  const truncated = cleaned.slice(0, 500);
  const lastPeriod = truncated.lastIndexOf(".");
  if (lastPeriod > 200) {
    return truncated.slice(0, lastPeriod + 1);
  }
  return truncated + "...";
}
