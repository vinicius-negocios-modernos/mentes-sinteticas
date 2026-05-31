"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribe to the browser connectivity store (`navigator.onLine` + the
 * `online`/`offline` window events).
 *
 * This is the correct primitive for syncing React state to an external browser
 * store (MNT-001 / TD-5.5): `useSyncExternalStore` reads a fresh snapshot on
 * every render and re-renders on store changes, with a stable server snapshot
 * that prevents hydration mismatches. It replaces the previous
 * `setState`-in-`useEffect` pattern.
 *
 * SSR safety: `getServerSnapshot` returns `true` (online) so server-rendered
 * markup assumes connectivity. Components that show offline-only UI therefore
 * render nothing on the server and reconcile post-hydration — matching the prior
 * `useState(false)` initial behavior with no banner flash.
 */
function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  // Stable SSR default: assume online (no offline UI on the server).
  return true;
}

/** Returns `true` when the browser reports an online connection. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Convenience inverse of {@link useOnlineStatus}. */
export function useOfflineStatus(): boolean {
  return !useOnlineStatus();
}
