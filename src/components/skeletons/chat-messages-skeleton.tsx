import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton that simulates 3 chat messages (alternating user/model).
 */
export function ChatMessagesSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Model message skeleton */}
      <div className="flex justify-start">
        <div className="max-w-[80%] space-y-2">
          <Skeleton className="h-4 w-64 bg-gray-700/50" />
          <Skeleton className="h-4 w-48 bg-gray-700/50" />
          <Skeleton className="h-4 w-56 bg-gray-700/50" />
        </div>
      </div>

      {/* User message skeleton */}
      <div className="flex justify-end">
        <div className="max-w-[80%] space-y-2">
          <Skeleton className="h-4 w-40 bg-purple-600/20" />
          <Skeleton className="h-4 w-32 bg-purple-600/20" />
        </div>
      </div>

      {/* Model message skeleton */}
      <div className="flex justify-start">
        <div className="max-w-[80%] space-y-2">
          <Skeleton className="h-4 w-72 bg-gray-700/50" />
          <Skeleton className="h-4 w-60 bg-gray-700/50" />
          <Skeleton className="h-4 w-44 bg-gray-700/50" />
          <Skeleton className="h-4 w-52 bg-gray-700/50" />
        </div>
      </div>
    </div>
  );
}
