import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { streamMindChat, TOKEN_LIMITS } from "@/lib/ai";
import { calculateCost } from "@/lib/ai/pricing";
import {
  checkRateLimit,
  incrementRateLimit,
  cleanupExpiredLimits,
  DEFAULT_LIMITS,
} from "@/lib/services/rate-limiter";
import {
  recordUsage,
  getUserDailyUsage,
  getUserMonthlyUsage,
} from "@/lib/services/token-usage";
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
import { logger } from "@/lib/logger";

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

    // ── Step 4b: Check token budget limits ─────────────────────────
    const [dailyUsage, monthlyUsage] = await Promise.all([
      getUserDailyUsage(userId),
      getUserMonthlyUsage(userId),
    ]);

    if (TOKEN_LIMITS.daily > 0 && dailyUsage.totalTokens >= TOKEN_LIMITS.daily) {
      return Response.json(
        {
          error:
            "Voce atingiu o limite de uso diario de tokens. Tente novamente amanha.",
        },
        { status: 429 }
      );
    }

    if (
      TOKEN_LIMITS.monthly > 0 &&
      monthlyUsage.totalTokens >= TOKEN_LIMITS.monthly
    ) {
      return Response.json(
        {
          error:
            "Voce atingiu o limite de uso mensal de tokens. Tente novamente no proximo mes.",
        },
        { status: 429 }
      );
    }

    // Calculate warning threshold (80%)
    const dailyPercentage =
      TOKEN_LIMITS.daily > 0
        ? dailyUsage.totalTokens / TOKEN_LIMITS.daily
        : 0;
    const approachingLimit = dailyPercentage >= 0.8;

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
      logger.info(
        `[context] Incoming history: ${incomingHistory.length} messages, ~${estimatedTokens} estimated tokens`
      );
    }

    const capturedConversationId = activeConversationId;

    const result = await Sentry.startSpan(
      { name: "gemini.generateContent", op: "ai.call" },
      async () => {
        return streamMindChat({
          mindName: validatedMindName,
          userMessage: sanitizedMessage,
          history: history ?? [],
          onFinish: async ({ text, usage, model }) => {
            // Persist assistant response after stream completes
            if (capturedConversationId) {
              await createMessage(capturedConversationId, "assistant", text);
              await touchConversation(capturedConversationId);
            }

            // Record token usage (fire-and-forget, non-blocking)
            if (usage && capturedConversationId) {
              const costUsd = calculateCost(
                model ?? "gemini-2.0-flash",
                usage.inputTokens,
                usage.outputTokens
              );
              recordUsage({
                userId,
                conversationId: capturedConversationId,
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                model: model ?? "gemini-2.0-flash",
                costUsd,
              }).catch((err) => {
                logger.error(
                  "Failed to record token usage:",
                  err instanceof Error ? err : new Error(String(err))
                );
              });
            }
          },
        });
      }
    );

    // Return streaming text response with conversationId in custom header
    const responseHeaders: Record<string, string> = {
      "X-Conversation-Id": capturedConversationId ?? "",
    };

    if (approachingLimit) {
      responseHeaders["X-Token-Usage-Warning"] = "approaching-limit";
    }

    return result.toTextStreamResponse({
      headers: responseHeaders,
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

    logger.error("Streaming chat error:", error instanceof Error ? error : new Error(String(error)));
    return Response.json(
      { error: "Erro ao processar sua mensagem. Tente novamente." },
      { status: 500 }
    );
  }
}
