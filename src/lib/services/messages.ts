import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { messages, type Message, type NewMessage } from "@/db/schema";

/**
 * Create a message in a conversation.
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
