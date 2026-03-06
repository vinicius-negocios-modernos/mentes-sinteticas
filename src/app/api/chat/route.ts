import { createClient } from "@/lib/supabase/server";
import { streamMindChat } from "@/lib/ai";
import {
  checkRateLimit,
  incrementRateLimit,
  cleanupExpiredLimits,
  DEFAULT_LIMITS,
} from "@/lib/services/rate-limiter";
import { SendMessageInputSchema } from "@/lib/validations/chat";
import { getMindByName } from "@/lib/services/minds";
import {
  createConversation,
  getConversationById,
  touchConversation,
} from "@/lib/services/conversations";
import { createMessage } from "@/lib/services/messages";
import type { ModelMessage } from "@ai-sdk/provider-utils";
import { estimateMessagesTokens } from "@/lib/ai/context";

export async function POST(request: Request) {
  try {
    // ── Step 1: Parse request body ────────────────────────────────
    const body = await request.json();
    const { mindName, message, history, conversationId } = body as {
      mindName: string;
      message: string;
      history?: ModelMessage[];
      conversationId?: string;
    };

    // ── Step 2: Validate inputs with Zod ──────────────────────────
    const validation = SendMessageInputSchema.safeParse({
      mindName,
      message,
      conversationId,
    });

    if (!validation.success) {
      const errors = validation.error.issues.map((i) => i.message).join(" ");
      return Response.json(
        { error: errors },
        { status: 400 }
      );
    }

    const validatedMindName = validation.data.mindName;
    const sanitizedMessage = validation.data.message;
    const validatedConversationId = validation.data.conversationId;

    // ── Step 3: Authenticate user ─────────────────────────────────
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "Sessao expirada. Faca login novamente." },
        { status: 401 }
      );
    }

    const userId = user.id;

    // ── Step 4: Check rate limits ─────────────────────────────────
    const rateLimitResult = await checkRateLimit(userId, "sendMessage", [
      { name: "per-minute", config: DEFAULT_LIMITS.sendMessage.perMinute },
      { name: "per-hour", config: DEFAULT_LIMITS.sendMessage.perHour },
    ]);

    if (!rateLimitResult.allowed) {
      return Response.json(
        {
          error: `Limite de ${rateLimitResult.maxAllowed} mensagens por ${rateLimitResult.limitType === "per-minute" ? "minuto" : "hora"} atingido. Tente novamente em ${rateLimitResult.retryAfterSeconds} segundos.`,
        },
        { status: 429 }
      );
    }

    // ── Step 5: Resolve mind and manage conversation ──────────────
    let activeConversationId = validatedConversationId;

    const mind = await getMindByName(validatedMindName);
    const mindDbId = mind?.id ?? null;

    if (!activeConversationId && mindDbId) {
      const title = sanitizedMessage.slice(0, 60);
      const conversation = await createConversation(userId, mindDbId, title);
      activeConversationId = conversation.id;
    } else if (activeConversationId) {
      const existing = await getConversationById(activeConversationId, userId);
      if (!existing) {
        return Response.json(
          { error: "Conversa nao encontrada ou acesso negado." },
          { status: 404 }
        );
      }
    }

    // ── Step 6: Persist user message ──────────────────────────────
    if (activeConversationId) {
      await createMessage(activeConversationId, "user", sanitizedMessage);
    }

    // ── Step 7: Increment rate limit counter ──────────────────────
    await incrementRateLimit(userId, "sendMessage");
    cleanupExpiredLimits().catch(() => {
      // Cleanup failure is non-critical
    });

    // ── Step 8: Stream response ───────────────────────────────────
    const incomingHistory = history ?? [];
    if (incomingHistory.length > 0) {
      const estimatedTokens = estimateMessagesTokens(incomingHistory);
      console.log(
        `[context] Incoming history: ${incomingHistory.length} messages, ~${estimatedTokens} estimated tokens`
      );
    }

    const capturedConversationId = activeConversationId;

    const result = await streamMindChat({
      mindName: validatedMindName,
      userMessage: sanitizedMessage,
      history: history ?? [],
      onFinish: async ({ text }) => {
        // Persist assistant response after stream completes
        if (capturedConversationId) {
          await createMessage(capturedConversationId, "assistant", text);
          await touchConversation(capturedConversationId);
        }
      },
    });

    // Return streaming text response with conversationId in custom header
    return result.toTextStreamResponse({
      headers: {
        "X-Conversation-Id": capturedConversationId ?? "",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    if (msg.includes("not found")) {
      return Response.json({ error: "Mente nao encontrada." }, { status: 404 });
    }
    if (msg.includes("GEMINI_API_KEY")) {
      return Response.json(
        { error: "Chave da API nao configurada." },
        { status: 500 }
      );
    }

    console.error("Streaming chat error:", error);
    return Response.json(
      { error: "Erro ao processar sua mensagem. Tente novamente." },
      { status: 500 }
    );
  }
}
