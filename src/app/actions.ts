"use server";

import { createMindChat, getAvailableMinds } from "@/lib/ai";
import { auth } from "@/lib/auth";
import { listActiveMindNames, listActiveMinds, getMindByName } from "@/lib/services/minds";
import {
  createConversation,
  getConversationById,
  listByUser,
  deleteConversation as deleteConv,
  touchConversation,
} from "@/lib/services/conversations";
import {
  createMessage,
  listByConversation,
} from "@/lib/services/messages";
import {
  checkRateLimit,
  incrementRateLimit,
  cleanupExpiredLimits,
  DEFAULT_LIMITS,
} from "@/lib/services/rate-limiter";
import {
  SendMessageInputSchema,
  MindIdSchema,
  ConversationIdSchema,
} from "@/lib/validations/chat";
import type {
  GeminiHistoryEntry,
  SendMessageResponse,
  ErrorType,
} from "@/lib/types";
import type { Conversation, Message } from "@/db/schema";

/**
 * Get list of available mind names.
 * DB primary, manifest fallback for graceful degradation.
 */
export async function getMinds(): Promise<string[]> {
  try {
    const dbMinds = await listActiveMindNames();
    if (dbMinds.length > 0) return dbMinds;
  } catch {
    // DB unavailable — fall through to manifest
  }
  return await getAvailableMinds();
}

/**
 * Alias used by page.tsx for clarity.
 */
export async function getMindsList(): Promise<string[]> {
  return getMinds();
}

/**
 * Get list of active minds with name and slug for home page rendering.
 * Returns name + slug pairs for linking to both /chat/{name} and /mind/{slug}.
 */
export async function getMindsWithSlugs(): Promise<
  { name: string; slug: string }[]
> {
  try {
    const minds = await listActiveMinds();
    if (minds.length > 0) {
      return minds.map((m) => ({ name: m.name, slug: m.slug }));
    }
  } catch {
    // DB unavailable — fall through to manifest
  }
  // Fallback: use names as slugs (best effort)
  const names = await getAvailableMinds();
  return names.map((n) => ({ name: n, slug: n.toLowerCase().replace(/\s+/g, "-") }));
}

function classifyError(error: unknown): { message: string; type: ErrorType } {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes("GEMINI_API_KEY")) {
    return {
      message: "Chave da API nao configurada. Contate o administrador.",
      type: "API_KEY_MISSING",
    };
  }
  if (msg.includes("not found in manifest") || msg.includes("not found")) {
    return {
      message: "Esta mente nao foi encontrada no sistema.",
      type: "MIND_NOT_FOUND",
    };
  }
  if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429")) {
    return {
      message:
        "Limite de requisicoes atingido. Aguarde um momento e tente novamente.",
      type: "RATE_LIMITED",
    };
  }
  return {
    message: "Erro ao processar sua mensagem. Tente novamente.",
    type: "API_ERROR",
  };
}

/**
 * Format Zod validation errors into a user-friendly message.
 */
function formatValidationErrors(
  issues: { message: string }[]
): string {
  return issues.map((i) => i.message).join(" ");
}

/**
 * Resolve a mind display-name to its DB UUID.
 * Returns null if not found in DB (graceful fallback).
 */
async function getMindIdByName(mindName: string): Promise<string | null> {
  try {
    const mind = await getMindByName(mindName);
    return mind?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Send a message in a chat session.
 * Validates inputs with Zod, checks rate limits, sanitizes message,
 * then processes the request.
 */
export async function sendMessage(
  mindName: string,
  message: string,
  history: GeminiHistoryEntry[],
  conversationId?: string
): Promise<SendMessageResponse> {
  try {
    // ── Step 1: Validate inputs with Zod ──────────────────────────
    const validation = SendMessageInputSchema.safeParse({
      mindName,
      message,
      conversationId,
    });

    if (!validation.success) {
      return {
        success: false,
        error: formatValidationErrors(validation.error.issues),
        errorType: "API_ERROR",
      };
    }

    // Use validated & sanitized data
    const validatedMindName = validation.data.mindName;
    const sanitizedMessage = validation.data.message;
    const validatedConversationId = validation.data.conversationId;

    // ── Step 2: Verify authenticated session ──────────────────────
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "Sessao expirada. Faca login novamente.",
        errorType: "API_ERROR",
      };
    }

    const userId = session.user.id;

    // ── Step 3: Check rate limits ─────────────────────────────────
    const rateLimitResult = await checkRateLimit(userId, "sendMessage", [
      { name: "per-minute", config: DEFAULT_LIMITS.sendMessage.perMinute },
      { name: "per-hour", config: DEFAULT_LIMITS.sendMessage.perHour },
    ]);

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: `Limite de ${rateLimitResult.maxAllowed} mensagens por ${rateLimitResult.limitType === "per-minute" ? "minuto" : "hora"} atingido. Tente novamente em ${rateLimitResult.retryAfterSeconds} segundos.`,
        errorType: "RATE_LIMITED",
      };
    }

    // ── Step 4: Resolve mind and manage conversation ──────────────
    const mindDbId = await getMindIdByName(validatedMindName);

    let activeConversationId = validatedConversationId;

    if (!activeConversationId && mindDbId) {
      const title = sanitizedMessage.slice(0, 60);
      const conversation = await createConversation(userId, mindDbId, title);
      activeConversationId = conversation.id;
    } else if (activeConversationId) {
      const existing = await getConversationById(
        activeConversationId,
        userId
      );
      if (!existing) {
        return {
          success: false,
          error: "Conversa nao encontrada ou acesso negado.",
          errorType: "API_ERROR",
        };
      }
    }

    // ── Step 5: Persist user message ──────────────────────────────
    if (activeConversationId) {
      await createMessage(activeConversationId, "user", sanitizedMessage);
    }

    // ── Step 6: Increment rate limit counter ──────────────────────
    await incrementRateLimit(userId, "sendMessage");

    // Lazy cleanup of expired rate limit records (fire-and-forget)
    cleanupExpiredLimits().catch(() => {
      // Cleanup failure is non-critical
    });

    // ── Step 7: Call Gemini with sanitized message ────────────────
    const chat = await createMindChat(validatedMindName, history);
    const result = await chat.sendMessage(sanitizedMessage);
    const response = await result.response;
    const text = response.text();

    // ── Step 8: Persist assistant response ────────────────────────
    if (activeConversationId) {
      await createMessage(activeConversationId, "assistant", text);
      await touchConversation(activeConversationId);
    }

    return {
      success: true,
      text,
      conversationId: activeConversationId,
    };
  } catch (error) {
    const classified = classifyError(error);
    return {
      success: false,
      error: classified.message,
      errorType: classified.type,
    };
  }
}

/**
 * Get conversations for the current user, optionally filtered by mind name.
 */
export async function getConversations(
  mindName?: string
): Promise<Conversation[]> {
  // Validate mindName if provided
  if (mindName !== undefined) {
    const validation = MindIdSchema.safeParse(mindName);
    if (!validation.success) return [];
  }

  const session = await auth();

  if (!session?.user?.id) return [];

  let mindDbId: string | undefined;
  if (mindName) {
    const id = await getMindIdByName(mindName);
    if (id) mindDbId = id;
  }

  return listByUser(session.user.id, mindDbId);
}

/**
 * Get messages for a specific conversation (with ownership check).
 */
export async function getConversationMessages(
  conversationId: string
): Promise<Message[]> {
  // Validate conversationId
  const validation = ConversationIdSchema.safeParse(conversationId);
  if (!validation.success) return [];

  const session = await auth();

  if (!session?.user?.id) return [];

  const conversation = await getConversationById(conversationId, session.user.id);
  if (!conversation) return [];

  return listByConversation(conversationId);
}

/**
 * Delete a conversation (cascades to messages).
 */
export async function deleteConversation(
  conversationId: string
): Promise<boolean> {
  // Validate conversationId
  const validation = ConversationIdSchema.safeParse(conversationId);
  if (!validation.success) return false;

  const session = await auth();

  if (!session?.user?.id) return false;

  return deleteConv(conversationId, session.user.id);
}
