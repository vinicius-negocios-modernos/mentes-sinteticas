"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { t } from "@/lib/i18n";

/**
 * Banner that appears at the top of the page when the user goes offline.
 * Disappears automatically when connectivity is restored.
 *
 * Uses `navigator.onLine` for initial state and listens to
 * `online`/`offline` events for real-time changes.
 */
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Set initial state (only on client)
    setIsOffline(!navigator.onLine);

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

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
