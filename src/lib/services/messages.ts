import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { messages, type Message, type NewMessage } from "@/db/schema";

/**
 * Create a message in a conversation.
 *
 * @param conversationId - The parent conversation UUID
 * @param role - Message author role ("user" or "assistant")
 * @param content - The message text content
 * @param tokenCount - Optional token count for usage tracking
 * @returns The newly created message record
 */
export async function createMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  tokenCount?: number
): Promise<Message> {
  const [message] = await db
    .insert(messages)
    .values({
      conversationId,
      role,
      content,
      tokenCount: tokenCount ?? null,
    } satisfies NewMessage)
    .returning();

  return message;
}

/**
 * List all messages in a conversation, ordered chronologically.
 *
 * @param conversationId - The conversation UUID
 * @returns Array of messages sorted by createdAt ascending
 */
export async function listByConversation(
  conversationId: string
): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
}
