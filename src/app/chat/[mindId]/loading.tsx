import { ChatMessagesSkeleton } from "@/components/skeletons/chat-messages-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <div className="min-h-[100dvh] p-2 sm:p-4 md:p-8 font-[family-name:var(--font-geist-sans)] flex flex-col">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-8 w-8 rounded bg-gray-700/30" />
        <Skeleton className="h-6 w-48 rounded bg-gray-700/30" />
      </div>

      <main id="main-content" className="flex-1 w-full flex gap-4">
        {/* Sidebar skeleton (hidden on mobile) */}
        <aside className="hidden md:flex flex-col w-64 shrink-0">
          <Skeleton className="h-4 w-20 bg-gray-700/30 mb-3" />
          <Skeleton className="h-9 w-full rounded-md bg-purple-600/10 mb-2" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-3 py-2 rounded-lg border border-gray-700/30 bg-gray-800/20 mb-2">
              <Skeleton className="h-4 w-3/4 bg-gray-700/30 mb-2" />
              <Skeleton className="h-3 w-16 bg-gray-700/20" />
            </div>
          ))}
        </aside>

        {/* Chat area skeleton */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col h-[calc(100dvh-140px)] w-full max-w-4xl mx-auto glass-panel rounded-2xl overflow-hidden">
            <ChatMessagesSkeleton />
          </div>
        </div>
      </main>
    </div>
  );
}
