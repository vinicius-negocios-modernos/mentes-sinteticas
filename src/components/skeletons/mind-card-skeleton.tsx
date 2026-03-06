import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

/**
 * Loading skeleton for a MindCard on the home page.
 */
export function MindCardSkeleton() {
  return (
    <Card className="glass-panel rounded-2xl border-0 p-0">
      <CardHeader className="p-8 pb-0 space-y-3">
        <Skeleton className="h-7 w-48 bg-gray-700/50" />
        <Skeleton className="h-4 w-full bg-gray-700/30" />
        <Skeleton className="h-4 w-3/4 bg-gray-700/30" />
      </CardHeader>
      <CardContent className="p-8 pt-6">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-24 rounded-full bg-gray-700/30" />
          <Skeleton className="h-8 w-32 rounded-full bg-gray-700/30" />
          <Skeleton className="h-8 w-20 rounded-full bg-gray-700/30" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Grid of MindCard skeletons (default 2 cards matching home layout).
 */
export function MindCardsGridSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <MindCardSkeleton key={i} />
      ))}
    </div>
  );
}
