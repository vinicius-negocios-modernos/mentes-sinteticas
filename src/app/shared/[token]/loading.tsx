import { ChatMessagesSkeleton } from "@/components/skeletons/chat-messages-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the shared conversation page.
 */
export default function SharedConversationLoading() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0a0a0f]">
      {/* Header skeleton */}
      <header className="border-b border-gray-800/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full bg-gray-700/50" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-48 bg-gray-700/50" />
            <Skeleton className="h-4 w-32 bg-gray-700/50" />
          </div>
        </div>
      </header>

      {/* Messages skeleton */}
      <main className="flex-1 max-w-4xl mx-auto w-full">
        <ChatMessagesSkeleton />
      </main>
    </div>
  );
}
