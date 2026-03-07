"use client";

import EmptyState from "@/components/ui/empty-state";

interface SearchEmptyStateProps {
  query?: string;
  className?: string;
}

/**
 * Empty state shown when a search/filter returns no results.
 * Reusable across any search context in the app.
 */
export default function SearchEmptyState({ query, className }: SearchEmptyStateProps) {
  return (
    <EmptyState
      className={className}
      icon={
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
          <path d="M8 11h6" />
        </svg>
      }
      title="Nenhum resultado encontrado"
      description={
        query
          ? `Nao encontramos resultados para "${query}". Tente ajustar os termos de busca.`
          : "Nao encontramos resultados. Tente ajustar os termos de busca."
      }
    />
  );
}
