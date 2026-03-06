"use server";

import { eq } from "drizzle-orm";
import { createMindChat, getAvailableMinds } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { minds } from "@/db/schema";
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
import type {
  GeminiHistoryEntry,
  SendMessageResponse,
  ErrorType,
} from "@/lib/types";
import type { Conversation, Message } from "@/db/schema";

export async function getMinds() {
  return await getAvailableMinds();
}

function classifyError(error: unknown): { message: string; type: ErrorType } {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes("GEMINI_API_KEY")) {
    return {
      message: "Chave da API nao configurada. Contate o administrador.",
      type: "API_KEY_MISSING",
    };
  }
  if (msg.includes("not found in manifest")) {
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
 * Resolve a mind display-name to its DB UUID.
 * Returns null if not found in DB (graceful fallback).
 */
async function getMindIdByName(mindName: string): Promise<string | null> {
  const [mind] = await db
    .select({ id: minds.id })
    .from(minds)
    .where(eq(minds.name, mindName))
    .limit(1);
  return mind?.id ?? null;
}

/**
 * Send a message in a chat session.
 * If conversationId is provided, appends to existing conversation.
 * Otherwise creates a new conversation with auto-generated title.
 */
export async function sendMessage(
  mindName: string,
  message: string,
  history: GeminiHistoryEntry[],
  conversationId?: string
): Promise<SendMessageResponse> {
  try {
    // Verify authenticated session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Sessao expirada. Faca login novamente.",
        errorType: "API_ERROR",
      };
    }

    const userId = user.id;

    // Resolve mind DB id (may be null if minds not seeded yet)
    const mindDbId = await getMindIdByName(mindName);

    // Create or validate conversation
    let activeConversationId = conversationId;

    if (!activeConversationId && mindDbId) {
      // First message — create conversation with auto-title
      const title = message.slice(0, 60);
      const conversation = await createConversation(userId, mindDbId, title);
      activeConversationId = conversation.id;
    } else if (activeConversationId) {
      // Validate ownership
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

    // Persist user message to DB
    if (activeConversationId) {
      await createMessage(activeConversationId, "user", message);
    }

    // Call Gemini
    const chat = await createMindChat(mindName, history);
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    // Persist assistant response to DB
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  let mindDbId: string | undefined;
  if (mindName) {
    const id = await getMindIdByName(mindName);
    if (id) mindDbId = id;
  }

  return listByUser(user.id, mindDbId);
}

/**
 * Get messages for a specific conversation (with ownership check).
 */
export async function getConversationMessages(
  conversationId: string
): Promise<Message[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Verify ownership
  const conversation = await getConversationById(conversationId, user.id);
  if (!conversation) return [];

  return listByConversation(conversationId);
}

/**
 * Delete a conversation (cascades to messages).
 */
export async function deleteConversation(
  conversationId: string
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  return deleteConv(conversationId, user.id);
}
