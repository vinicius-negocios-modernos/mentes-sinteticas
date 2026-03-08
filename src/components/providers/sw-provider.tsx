"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/sw-register";

/**
 * Client component that registers the service worker on mount.
 * Placed in the root layout so SW is registered on every page.
 */
export function ServiceWorkerProvider() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
