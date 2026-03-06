import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  conversations,
  type Conversation,
  type NewConversation,
} from "@/db/schema";

/**
 * Create a new conversation for a user + mind.
 * Title is auto-generated from the first user message (~60 chars).
 */
export async function createConversation(
  userId: string,
  mindId: string,
  title: string
): Promise<Conversation> {
  const [conversation] = await db
    .insert(conversations)
    .values({
      userId,
      mindId,
      title: title.slice(0, 60),
    } satisfies NewConversation)
    .returning();

  return conversation;
}

/**
 * Get a single conversation by ID, scoped to the owning user.
 */
export async function getConversationById(
  conversationId: string,
  userId: string
): Promise<Conversation | null> {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(eq(conversations.id, conversationId), eq(conversations.userId, userId))
    )
    .limit(1);

  return conversation ?? null;
}

/**
 * List conversations for a user, optionally filtered by mind.
 * Ordered by most-recently-updated first.
 */
export async function listByUser(
  userId: string,
  mindId?: string
): Promise<Conversation[]> {
  const conditions = [eq(conversations.userId, userId)];
  if (mindId) {
    conditions.push(eq(conversations.mindId, mindId));
  }

  return db
    .select()
    .from(conversations)
    .where(and(...conditions))
    .orderBy(desc(conversations.updatedAt));
}

/**
 * Delete a conversation (cascade deletes its messages via FK).
 * Scoped to the owning user as RLS backup.
 */
export async function deleteConversation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .delete(conversations)
    .where(
      and(eq(conversations.id, conversationId), eq(conversations.userId, userId))
    )
    .returning({ id: conversations.id });

  return result.length > 0;
}

/**
 * Update conversation title.
 */
export async function updateTitle(
  conversationId: string,
  userId: string,
  title: string
): Promise<Conversation | null> {
  const [updated] = await db
    .update(conversations)
    .set({ title: title.slice(0, 60), updatedAt: new Date() })
    .where(
      and(eq(conversations.id, conversationId), eq(conversations.userId, userId))
    )
    .returning();

  return updated ?? null;
}

/**
 * Touch updatedAt timestamp on a conversation.
 */
export async function touchConversation(
  conversationId: string
): Promise<void> {
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}
