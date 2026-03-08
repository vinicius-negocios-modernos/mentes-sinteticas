/**
 * Service Worker registration utility.
 *
 * - Only registers in production (NODE_ENV check via build-time flag).
 * - Calls `skipWaiting` / `clientsClaim` from the SW itself.
 * - Provides optional onUpdate callback for "new version available" UX.
 */

export function registerServiceWorker(
  options: { onUpdate?: () => void } = {}
): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  // Disable in development to avoid stale cache
  if (process.env.NODE_ENV === "development") return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "activated" &&
            navigator.serviceWorker.controller
          ) {
            options.onUpdate?.();
          }
        });
      });
    } catch (error) {
      console.error("[SW] Registration failed:", error);
    }
  });
}
