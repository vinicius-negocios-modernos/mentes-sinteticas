import { Skeleton } from "@/components/ui/skeleton";

export default function SignupLoading() {
  return (
    <main id="main-content" className="min-h-[100dvh] flex items-center justify-center p-4 font-[family-name:var(--font-geist-sans)]">
      <div className="glass-panel rounded-2xl border-0 w-full max-w-md p-8">
        {/* Title */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <Skeleton className="h-9 w-40 bg-gray-700/30" />
          <Skeleton className="h-4 w-56 bg-gray-700/20" />
        </div>

        {/* Form fields */}
        <div className="flex flex-col gap-4">
          <div>
            <Skeleton className="h-4 w-12 bg-gray-700/20 mb-1" />
            <Skeleton className="h-12 w-full rounded-lg bg-gray-700/20" />
          </div>
          <div>
            <Skeleton className="h-4 w-12 bg-gray-700/20 mb-1" />
            <Skeleton className="h-12 w-full rounded-lg bg-gray-700/20" />
          </div>
          <Skeleton className="h-12 w-full rounded-lg bg-purple-600/20 mt-2" />
        </div>

        {/* Footer link */}
        <div className="flex justify-center mt-6">
          <Skeleton className="h-4 w-36 bg-gray-700/20" />
        </div>
      </div>
    </main>
  );
}
