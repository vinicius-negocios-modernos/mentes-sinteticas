"use client";

import { useEffect, useState, useCallback } from "react";
import { useOfflineStatus } from "@/hooks/use-online-status";
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
  // Connectivity is an external browser store — read via useSyncExternalStore
  // (MNT-001 / TD-5.5). Replaces the prior setState-in-effect sync of
  // navigator.onLine and is SSR-safe (server snapshot = online).
  const isOffline = useOfflineStatus();
  const [cachedConversations, setCachedConversations] = useState<
    CachedConversation[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load cached conversations when offline
  useEffect(() => {
    if (!isOffline || !mindId) return;

    // Genuine async data-fetch effect (NOT an external store — useSyncExternalStore
    // would be the wrong tool here). Kicks off an IndexedDB read and gates a
    // pending request via the loading flag; the result is not derivable during
    // render. The setState here is the loading flag for an async fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for async IndexedDB fetch (external system), not derivable during render
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
