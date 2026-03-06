import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for the conversation list sidebar.
 */
export function ConversationListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {/* New conversation button skeleton */}
      <Skeleton className="h-9 w-full rounded-md bg-purple-600/10" />

      {/* Conversation item skeletons */}
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="px-3 py-2 rounded-lg border border-gray-700/30 bg-gray-800/20">
          <Skeleton className="h-4 w-3/4 bg-gray-700/30 mb-2" />
          <Skeleton className="h-3 w-16 bg-gray-700/20" />
        </div>
      ))}
    </div>
  );
}
