/**
 * Offline conversation cache using IndexedDB via `idb`.
 *
 * Stores the last 10 conversations for read-only offline access.
 * Enforces a 5MB total storage limit and FIFO eviction.
 */

import { openDB, type IDBPDatabase } from "idb";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CachedMessage {
  role: "user" | "model";
  text: string;
}

export interface CachedConversation {
  conversationId: string;
  mindId: string;
  title: string;
  messages: CachedMessage[];
  cachedAt: number; // Date.now() timestamp
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_NAME = "mentes-sinteticas-offline";
const DB_VERSION = 1;
const STORE_NAME = "conversations";
const MAX_CONVERSATIONS = 10;
const MAX_STORAGE_BYTES = 5 * 1024 * 1024; // 5MB

// ---------------------------------------------------------------------------
// Database singleton
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB not available on server"));
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: "conversationId",
          });
          store.createIndex("cachedAt", "cachedAt", { unique: false });
          store.createIndex("mindId", "mindId", { unique: false });
        }
      },
    });
  }

  return dbPromise;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Save a conversation to the offline cache.
 * Enforces MAX_CONVERSATIONS (FIFO) and MAX_STORAGE_BYTES limits.
 */
export async function cacheConversation(
  conversation: CachedConversation
): Promise<void> {
  try {
    const db = await getDB();

    // Add/update the conversation
    const entry: CachedConversation = {
      ...conversation,
      cachedAt: Date.now(),
    };
    await db.put(STORE_NAME, entry);

    // Enforce entry count limit (FIFO — remove oldest)
    await enforceEntryLimit(db);

    // Enforce storage size limit
    await enforceStorageLimit(db);
  } catch (error) {
    console.error("[ConversationCache] Failed to cache:", error);
  }
}

/**
 * Retrieve all cached conversations, sorted by cachedAt descending (newest first).
 */
export async function getCachedConversations(): Promise<CachedConversation[]> {
  try {
    const db = await getDB();
    const all = await db.getAll(STORE_NAME);
    return all.sort(
      (a: CachedConversation, b: CachedConversation) =>
        b.cachedAt - a.cachedAt
    );
  } catch (error) {
    console.error("[ConversationCache] Failed to load:", error);
    return [];
  }
}

/**
 * Retrieve cached conversations for a specific mind.
 */
export async function getCachedConversationsByMind(
  mindId: string
): Promise<CachedConversation[]> {
  try {
    const db = await getDB();
    const all = await db.getAllFromIndex(STORE_NAME, "mindId", mindId);
    return all.sort(
      (a: CachedConversation, b: CachedConversation) =>
        b.cachedAt - a.cachedAt
    );
  } catch (error) {
    console.error("[ConversationCache] Failed to load by mind:", error);
    return [];
  }
}

/**
 * Retrieve a single cached conversation by ID.
 */
export async function getCachedConversation(
  conversationId: string
): Promise<CachedConversation | undefined> {
  try {
    const db = await getDB();
    return await db.get(STORE_NAME, conversationId);
  } catch (error) {
    console.error("[ConversationCache] Failed to get:", error);
    return undefined;
  }
}

/**
 * Remove a conversation from cache.
 */
export async function removeCachedConversation(
  conversationId: string
): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, conversationId);
  } catch (error) {
    console.error("[ConversationCache] Failed to remove:", error);
  }
}

/**
 * Clear all cached conversations.
 */
export async function clearConversationCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(STORE_NAME);
  } catch (error) {
    console.error("[ConversationCache] Failed to clear:", error);
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function enforceEntryLimit(db: IDBPDatabase): Promise<void> {
  const all = await db.getAllFromIndex(STORE_NAME, "cachedAt");
  if (all.length > MAX_CONVERSATIONS) {
    // all is sorted by cachedAt ascending — oldest first
    const toRemove = all.length - MAX_CONVERSATIONS;
    for (let i = 0; i < toRemove; i++) {
      await db.delete(STORE_NAME, all[i].conversationId);
    }
  }
}

async function enforceStorageLimit(db: IDBPDatabase): Promise<void> {
  const all = await db.getAllFromIndex(STORE_NAME, "cachedAt");
  let totalSize = estimateSize(all);

  // Remove oldest entries until under limit
  let idx = 0;
  while (totalSize > MAX_STORAGE_BYTES && idx < all.length) {
    await db.delete(STORE_NAME, all[idx].conversationId);
    totalSize -= estimateSize([all[idx]]);
    idx++;
  }
}

/**
 * Rough estimate of JSON serialized size in bytes.
 */
function estimateSize(items: CachedConversation[]): number {
  return new Blob([JSON.stringify(items)]).size;
}

// Re-export for testing
export const _internals = {
  MAX_CONVERSATIONS,
  MAX_STORAGE_BYTES,
  DB_NAME,
  STORE_NAME,
};
