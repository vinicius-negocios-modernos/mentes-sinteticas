/**
 * Mind Memories Service
 *
 * CRUD operations for mind memories with deduplication and token budget control.
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  mindMemories,
  type MindMemory,
  type NewMindMemory,
} from "@/db/schema/mind-memories";
import { estimateTokenCount } from "@/lib/ai/context";
import { logger } from "@/lib/logger";
import type { ExtractedMemory } from "@/lib/ai/memory";

// ── Config ────────────────────────────────────────────────────────────

/** Maximum tokens allowed for memories in the context window. */
export const MEMORY_MAX_TOKENS = parseInt(
  process.env.MEMORY_MAX_TOKENS ?? "2000",
  10
);

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Normalize content for deduplication comparison.
 * Lowercases, trims, and removes extra punctuation/whitespace.
 */
function normalizeContent(content: string): string {
  return content
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?]+$/g, "");
}

// ── Core Functions ────────────────────────────────────────────────────

/**
 * Save extracted memories, skipping duplicates.
 * Uses content normalization for dedup check.
 *
 * @param userId - The user's UUID
 * @param mindId - The mind's UUID
 * @param memories - Array of extracted memories from AI
 * @param conversationId - Optional source conversation UUID
 * @returns Number of new memories saved
 */
export async function saveMemories(
  userId: string,
  mindId: string,
  memories: ExtractedMemory[],
  conversationId?: string | null
): Promise<number> {
  if (memories.length === 0) return 0;

  let savedCount = 0;

  for (const memory of memories) {
    const normalized = normalizeContent(memory.content);

    // Check for duplicate using normalized content
    const existing = await db
      .select({ id: mindMemories.id })
      .from(mindMemories)
      .where(
        and(
          eq(mindMemories.userId, userId),
          eq(mindMemories.mindId, mindId),
          sql`lower(trim(${mindMemories.content})) = ${normalized}`
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update timestamp on existing memory (reinforce)
      await db
        .update(mindMemories)
        .set({ updatedAt: new Date() })
        .where(eq(mindMemories.id, existing[0].id));
      continue;
    }

    const values: NewMindMemory = {
      userId,
      mindId,
      memoryType: memory.memory_type,
      content: memory.content,
      sourceConversationId: conversationId ?? null,
    };

    await db.insert(mindMemories).values(values);
    savedCount++;
  }

  if (savedCount > 0) {
    logger.info(`[memory] Saved ${savedCount} new memories for mind ${mindId}`);
  }

  return savedCount;
}

/**
 * Get relevant memories for a user-mind pair, respecting token budget.
 * Returns most recently updated memories that fit within the budget.
 *
 * @param userId - The user's UUID
 * @param mindId - The mind's UUID
 * @param maxTokens - Token budget for memories (default: MEMORY_MAX_TOKENS)
 * @returns Array of memories fitting within the budget
 */
export async function getRelevantMemories(
  userId: string,
  mindId: string,
  maxTokens?: number
): Promise<MindMemory[]> {
  const budget = maxTokens ?? MEMORY_MAX_TOKENS;

  // Fetch all memories ordered by most recently updated
  const allMemories = await db
    .select()
    .from(mindMemories)
    .where(
      and(eq(mindMemories.userId, userId), eq(mindMemories.mindId, mindId))
    )
    .orderBy(desc(mindMemories.updatedAt));

  // Apply token budget
  const result: MindMemory[] = [];
  let tokenCount = 0;

  for (const memory of allMemories) {
    const memoryTokens = estimateTokenCount(memory.content) + 10; // +10 for type label overhead
    if (tokenCount + memoryTokens > budget && result.length > 0) {
      break;
    }
    tokenCount += memoryTokens;
    result.push(memory);
  }

  return result;
}

/**
 * Get all memories for a user, optionally filtered by mind.
 *
 * @param userId - The user's UUID
 * @param mindId - Optional mind UUID to filter by
 * @returns Array of memories
 */
export async function getUserMemories(
  userId: string,
  mindId?: string
): Promise<MindMemory[]> {
  const conditions = [eq(mindMemories.userId, userId)];
  if (mindId) {
    conditions.push(eq(mindMemories.mindId, mindId));
  }

  return db
    .select()
    .from(mindMemories)
    .where(and(...conditions))
    .orderBy(desc(mindMemories.updatedAt));
}

/**
 * Delete a specific memory by ID. Verifies ownership.
 *
 * @param memoryId - The memory UUID
 * @param userId - The user's UUID (for ownership check)
 * @returns true if deleted, false if not found or not owned
 */
export async function deleteMemory(
  memoryId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .delete(mindMemories)
    .where(
      and(eq(mindMemories.id, memoryId), eq(mindMemories.userId, userId))
    )
    .returning({ id: mindMemories.id });

  return result.length > 0;
}

/**
 * Delete all memories for a specific mind. Verifies ownership.
 *
 * @param userId - The user's UUID
 * @param mindId - The mind UUID
 * @returns Number of memories deleted
 */
export async function deleteAllMemoriesForMind(
  userId: string,
  mindId: string
): Promise<number> {
  const result = await db
    .delete(mindMemories)
    .where(
      and(eq(mindMemories.userId, userId), eq(mindMemories.mindId, mindId))
    )
    .returning({ id: mindMemories.id });

  return result.length;
}
