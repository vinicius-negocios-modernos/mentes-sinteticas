import crypto from "crypto";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  conversations,
  messages as messagesTable,
  minds,
} from "@/db/schema";

/**
 * Shared conversation data returned by the RPC function.
 */
export interface SharedConversationData {
  conversation: {
    id: string;
    title: string | null;
    share_token: string;
    shared_at: string;
    created_at: string;
  };
  mind: {
    id: string;
    name: string;
    slug: string;
    title: string | null;
    era: string | null;
    nationality: string | null;
    avatar_url: string | null;
  };
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
  }>;
}

/**
 * Generate a cryptographically random share token.
 * 32 bytes = 64 hex characters = 256 bits of entropy.
 */
export function generateShareToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Share a conversation by generating a unique token.
 * Only the conversation owner can share it.
 * If already shared, returns the existing token.
 *
 * @param conversationId - The conversation UUID
 * @param userId - The authenticated user's UUID (ownership check)
 * @returns Object with token and share URL, or null if not found/not owned
 */
export async function shareConversation(
  conversationId: string,
  userId: string
): Promise<{ token: string; sharedAt: Date } | null> {
  // Check ownership and current share status
  const [conversation] = await db
    .select({
      id: conversations.id,
      shareToken: conversations.shareToken,
      sharedAt: conversations.sharedAt,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      )
    )
    .limit(1);

  if (!conversation) return null;

  // If already shared, return existing token
  if (conversation.shareToken && conversation.sharedAt) {
    return {
      token: conversation.shareToken,
      sharedAt: conversation.sharedAt,
    };
  }

  // Generate new token and save
  const token = generateShareToken();
  const sharedAt = new Date();

  await db
    .update(conversations)
    .set({ shareToken: token, sharedAt })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      )
    );

  return { token, sharedAt };
}

/**
 * Revoke sharing for a conversation.
 * Only the conversation owner can unshare.
 *
 * @param conversationId - The conversation UUID
 * @param userId - The authenticated user's UUID (ownership check)
 * @returns True if unshared successfully, false if not found/not owned
 */
export async function unshareConversation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .update(conversations)
    .set({ shareToken: null, sharedAt: null })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      )
    )
    .returning({ id: conversations.id });

  return result.length > 0;
}

/**
 * Get a shared conversation by its share token.
 * Uses the RPC function that bypasses RLS.
 *
 * @param token - The share token (64-char hex string)
 * @returns Shared conversation data, or null if not found
 */
export async function getSharedConversation(
  token: string
): Promise<SharedConversationData | null> {
  // Validate token format (must be 64 hex chars)
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return null;
  }

  // Query directly via Drizzle (bypasses RLS since we use service role / direct DB)
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.shareToken, token))
    .limit(1);

  if (!conversation) return null;

  // Fetch mind and messages data
  const [mind] = await db
    .select()
    .from(minds)
    .where(eq(minds.id, conversation.mindId))
    .limit(1);

  const messageRows = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversation.id))
    .orderBy(asc(messagesTable.createdAt));

  if (!mind) return null;

  return {
    conversation: {
      id: conversation.id,
      title: conversation.title,
      share_token: conversation.shareToken!,
      shared_at: conversation.sharedAt!.toISOString(),
      created_at: conversation.createdAt.toISOString(),
    },
    mind: {
      id: mind.id,
      name: mind.name,
      slug: mind.slug,
      title: mind.title,
      era: mind.era,
      nationality: mind.nationality,
      avatar_url: mind.avatarUrl,
    },
    messages: messageRows.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      created_at: m.createdAt.toISOString(),
    })),
  };
}
