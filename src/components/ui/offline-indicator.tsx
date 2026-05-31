"use client";

import { WifiOff } from "lucide-react";
import { t } from "@/lib/i18n";
import { useOfflineStatus } from "@/hooks/use-online-status";

/**
 * Banner that appears at the top of the page when the user goes offline.
 * Disappears automatically when connectivity is restored.
 *
 * Subscribes to the browser connectivity store via `useSyncExternalStore`
 * (MNT-001 / TD-5.5): `navigator.onLine` is the snapshot and `online`/`offline`
 * window events drive updates. The server snapshot assumes online, so no banner
 * is rendered during SSR and there is no hydration mismatch.
 */
export function OfflineIndicator() {
  const isOffline = useOfflineStatus();

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-[100] bg-amber-600/95 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2 backdrop-blur-sm"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{t("offline.indicator")}</span>
    </div>
  );
}
