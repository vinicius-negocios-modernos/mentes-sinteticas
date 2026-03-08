import { WifiOff } from "lucide-react";
import { OfflineRetryButton } from "./retry-button";

export const metadata = {
  title: "Offline",
};

/**
 * Static offline fallback page.
 * Pre-cached by the service worker on install event.
 * Shown when user navigates without a network connection and no cached page exists.
 */
export default function OfflinePage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-8 font-[family-name:var(--font-geist-sans)]">
      <div className="glass-panel rounded-2xl p-8 max-w-md text-center">
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10"
          aria-hidden="true"
        >
          <WifiOff className="h-8 w-8 text-amber-500" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-3">
          Voce esta offline
        </h1>

        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Reconecte-se a internet para continuar usando o Mentes Sinteticas.
          Suas conversas recentes podem estar disponiveis no cache local.
        </p>

        <OfflineRetryButton />
      </div>
    </div>
  );
}
