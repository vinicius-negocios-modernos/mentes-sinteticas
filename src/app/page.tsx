
import { Suspense } from "react";
import { getMindsList } from "./actions";
import AppHeader from "@/components/layout/app-header";
import AppFooter from "@/components/layout/app-footer";
import MindCard from "@/components/minds/mind-card";
import MindTag from "@/components/minds/mind-tag";
import { MindCardSkeleton } from "@/components/skeletons/mind-card-skeleton";

/**
 * Async Server Component that fetches and renders mind cards.
 * Extracted to enable Suspense boundary around the data-fetching part.
 */
async function MindCardsGrid() {
  const minds = await getMindsList();

  return (
    <>
      {/* Card 1: Select Thinker */}
      <MindCard
        title="Selecionar Mente"
        description="Escolha com quem voce quer debater hoje. De filosofos antigos a estrategistas modernos."
        hoverColor="purple"
      >
        <div className="flex flex-wrap gap-2">
          {minds.length === 0 ? (
            <span className="text-xs text-muted-foreground">Nenhuma mente encontrada</span>
          ) : (
            minds.map(mind => (
              <MindTag
                key={mind}
                name={mind}
                href={`/chat/${encodeURIComponent(mind)}`}
              />
            ))
          )}
        </div>
      </MindCard>

      {/* Card 2: Knowledge Base (File Search) */}
      <MindCard
        title="Base de Conhecimento"
        description="Gerencie os textos sagrados e obras completas que alimentam as Mentes Sinteticas via vetorizacao."
        hoverColor="cyan"
      >
        <div className="flex items-center gap-2 text-sm text-cyan-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          Google Gemini File Search Ativo
        </div>
      </MindCard>
    </>
  );
}

/**
 * Fallback skeleton shown while MindCardsGrid loads.
 */
function MindCardsFallback() {
  return (
    <>
      {Array.from({ length: 2 }).map((_, i) => (
        <MindCardSkeleton key={i} />
      ))}
    </>
  );
}

export default function Home() {
  return (
    <div className="min-h-[100dvh] p-4 pb-20 sm:p-8 md:p-20 font-[family-name:var(--font-geist-sans)]">
      <main id="main-content" className="flex flex-col gap-6 sm:gap-8 row-start-2 items-center sm:items-start max-w-4xl mx-auto">

        {/* Header */}
        <AppHeader />

        {/* Action Grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Suspense fallback={<MindCardsFallback />}>
            <MindCardsGrid />
          </Suspense>
        </div>

      </main>

      <AppFooter />
    </div>
  );
}
