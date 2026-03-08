import { Skeleton } from "@/components/ui/skeleton";

export default function MindProfileLoading() {
  return (
    <div className="min-h-[100dvh] p-4 pb-28 sm:p-8 sm:pb-28 md:p-20 md:pb-20 font-[family-name:var(--font-geist-sans)]">
      <main
        id="main-content"
        className="flex flex-col gap-6 max-w-3xl mx-auto"
      >
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-12 bg-gray-700/30" />
          <Skeleton className="h-4 w-4 bg-gray-700/20" />
          <Skeleton className="h-4 w-28 bg-gray-700/30" />
        </div>

        {/* Hero skeleton */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 md:p-10">
          <div className="flex flex-col items-center md:flex-row md:items-start gap-6 md:gap-8">
            <Skeleton className="w-28 h-28 rounded-full bg-gray-700/30 shrink-0" />
            <div className="flex-1 space-y-3 w-full">
              <Skeleton className="h-10 w-64 bg-gray-700/40 mx-auto md:mx-0" />
              <Skeleton className="h-5 w-48 bg-gray-700/30 mx-auto md:mx-0" />
              <div className="flex items-center justify-center md:justify-start gap-3">
                <Skeleton className="h-4 w-24 bg-gray-700/20" />
                <Skeleton className="h-4 w-20 bg-gray-700/20" />
              </div>
              <Skeleton className="h-10 w-40 bg-gray-700/30 hidden md:block" />
            </div>
          </div>
        </div>

        {/* About skeleton */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-3">
          <Skeleton className="h-6 w-20 bg-gray-700/40" />
          <Skeleton className="h-4 w-full bg-gray-700/20" />
          <Skeleton className="h-4 w-full bg-gray-700/20" />
          <Skeleton className="h-4 w-3/4 bg-gray-700/20" />
        </div>

        {/* Traits skeleton */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-3">
          <Skeleton className="h-6 w-48 bg-gray-700/40" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-8 w-24 rounded-full bg-gray-700/20"
              />
            ))}
          </div>
        </div>

        {/* Knowledge sources skeleton */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-3">
          <Skeleton className="h-6 w-52 bg-gray-700/40" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.06]"
            >
              <Skeleton className="w-5 h-5 bg-gray-700/20 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48 bg-gray-700/30" />
                <Skeleton className="h-3 w-full bg-gray-700/15" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
