import { MindCardSkeleton } from "@/components/skeletons/mind-card-skeleton";

export default function HomeLoading() {
  return (
    <div className="min-h-[100dvh] p-4 pb-20 sm:p-8 md:p-20 font-[family-name:var(--font-geist-sans)]">
      <main id="main-content" className="flex flex-col gap-6 sm:gap-8 row-start-2 items-center sm:items-start max-w-4xl mx-auto">
        {/* Header skeleton */}
        <div className="w-full space-y-3">
          <div className="h-10 w-64 rounded-lg bg-gray-700/30 animate-pulse" />
          <div className="h-4 w-96 rounded bg-gray-700/20 animate-pulse" />
        </div>

        {/* Mind cards grid skeleton */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <MindCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
