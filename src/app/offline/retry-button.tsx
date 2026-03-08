"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Client-side retry button that reloads the page.
 * Separated from the server component offline page for hydration boundary.
 */
export function OfflineRetryButton() {
  return (
    <Button
      onClick={() => window.location.reload()}
      className="bg-amber-600 hover:bg-amber-700 text-white"
    >
      <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
      Tentar Novamente
    </Button>
  );
}
