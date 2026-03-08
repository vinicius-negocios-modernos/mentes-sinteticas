import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/ui/empty-state";
import type { KnowledgeDocument } from "@/db/schema";

interface MindKnowledgeSourcesProps {
  documents: KnowledgeDocument[];
  className?: string;
}

/**
 * Knowledge sources section of the mind profile page.
 * Lists associated knowledge documents with display name and description.
 * Shows an empty state if no documents are found.
 */
export default function MindKnowledgeSources({
  documents,
  className,
}: MindKnowledgeSourcesProps) {
  return (
    <section
      aria-labelledby="mind-knowledge"
      className={cn("glass-panel rounded-2xl p-6 sm:p-8", className)}
    >
      <h2
        id="mind-knowledge"
        className="text-xl font-semibold text-[#c9a55a] mb-4"
      >
        {t("mindProfile.knowledgeSources")}
      </h2>

      {documents.length === 0 ? (
        <EmptyState
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
            </svg>
          }
          title={t("mindProfile.noKnowledgeSources")}
          description={t("mindProfile.noKnowledgeSourcesDescription")}
          compact
        />
      ) : (
        <ul className="space-y-3" role="list">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
            >
              {/* Book icon */}
              <div className="mt-0.5 shrink-0 text-[#c9a55a]/60">
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
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-gray-200">
                  {doc.displayName}
                </p>
                {doc.description && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {doc.description}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
