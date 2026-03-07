import EmptyState from "@/components/ui/empty-state";

/**
 * Empty state shown on the home page when no minds/conversations are available.
 * Dark Academia theme: open book with sparkles.
 */
export default function HomeEmptyState() {
  return (
    <EmptyState
      className="w-full py-16"
      icon={
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
          <path d="m9 10 2 2 4-4" />
        </svg>
      }
      title="Comece sua jornada intelectual"
      description="Escolha uma mente sintetica acima para iniciar sua primeira conversa. Cada mente oferece uma perspectiva unica de um grande pensador."
      action={{
        label: "Iniciar sua primeira conversa",
        href: "#minds-grid",
      }}
    />
  );
}
