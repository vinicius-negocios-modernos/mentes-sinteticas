"use client";

import { useEffect, useState, useCallback } from "react";
import {
  cacheConversation,
  getCachedConversationsByMind,
  getCachedConversation,
  type CachedConversation,
  type CachedMessage,
} from "@/lib/conversation-cache";

/**
 * Hook for offline conversation access via IndexedDB.
 *
 * - Automatically loads cached conversations for a given mind when offline.
 * - Provides `saveConversation` to cache after successful API fetches.
 * - Exposes `isOffline` state for conditional rendering.
 */
export function useOfflineConversations(mindId: string) {
  const [isOffline, setIsOffline] = useState(false);
  const [cachedConversations, setCachedConversations] = useState<
    CachedConversation[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  // Track online/offline state
  useEffect(() => {
    // Legitimate external-system sync: navigator.onLine is SSR-unsafe, so the
    // real connectivity value must be read post-mount. Not derived render state.
    // lint-followup (TD-2.1): candidate for useSyncExternalStore.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing initial value from navigator.onLine (external browser API, SSR-unsafe)
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

  // Load cached conversations when offline
  useEffect(() => {
    if (!isOffline || !mindId) return;

    // Legitimate async data-fetch effect: kicks off an IndexedDB read (external
    // system) and tracks loading state. setState here gates a pending request,
    // it is not derivable during render. lint-followup (TD-2.1).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for async IndexedDB fetch (external system)
    setIsLoading(true);
    getCachedConversationsByMind(mindId)
      .then(setCachedConversations)
      .finally(() => setIsLoading(false));
  }, [isOffline, mindId]);

  /**
   * Save a conversation to IndexedDB cache.
   * Call this after a successful fetch of conversation data.
   */
  const saveConversation = useCallback(
    async (
      conversationId: string,
      title: string,
      messages: CachedMessage[]
    ) => {
      await cacheConversation({
        conversationId,
        mindId,
        title,
        messages,
        cachedAt: Date.now(),
      });
    },
    [mindId]
  );

  /**
   * Load a single cached conversation by ID.
   */
  const loadConversation = useCallback(
    async (conversationId: string) => {
      return getCachedConversation(conversationId);
    },
    []
  );

  return {
    isOffline,
    isLoading,
    cachedConversations,
    saveConversation,
    loadConversation,
  };
}
