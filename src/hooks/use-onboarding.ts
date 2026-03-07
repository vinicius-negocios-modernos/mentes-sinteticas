"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "mentes-sinteticas-onboarding-completed";

// ---------------------------------------------------------------------------
// External store for onboarding flag (localStorage)
// ---------------------------------------------------------------------------

let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return true; // Treat as completed if localStorage is unavailable
  }
}

function getServerSnapshot(): boolean {
  // On server, default to "completed" to avoid hydration mismatch
  return true;
}

function setCompleted() {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // Silently fail
  }
  emitChange();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook to manage onboarding state via localStorage.
 * Uses useSyncExternalStore for safe SSR hydration.
 */
export function useOnboarding() {
  const hasCompleted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const completeOnboarding = useCallback(() => {
    setCompleted();
  }, []);

  const skipOnboarding = useCallback(() => {
    setCompleted();
  }, []);

  return {
    /** Whether onboarding has been completed (or skipped). */
    hasCompletedOnboarding: hasCompleted,
    /** Mark onboarding as completed. */
    completeOnboarding,
    /** Skip onboarding (same effect as completing). */
    skipOnboarding,
    /** Whether the onboarding dialog should be shown. */
    shouldShowOnboarding: !hasCompleted,
  };
}
