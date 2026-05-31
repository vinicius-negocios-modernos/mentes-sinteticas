import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { streamMindChat, TOKEN_LIMITS, buildSystemPrompt, buildSystemPromptWithMemories } from "@/lib/ai";
import { extractMemories } from "@/lib/ai/memory";
import { calculateCost } from "@/lib/ai/pricing";
import {
  getRelevantMemories,
  saveMemories,
} from "@/lib/services/mind-memories";
import { estimateTokenCount, estimateMessagesTokens } from "@/lib/ai/context";
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

import { logger } from "@/lib/logger";
import { classifyError, ErrorCode } from "@/lib/errors";
import { t } from "@/lib/i18n";

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
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json(
        { error: t("api.sessionExpired") },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // ── Step 4: Check rate limits ─────────────────────────────────
    const rateLimitResult = await checkRateLimit(userId, "sendMessage", [
      { name: "per-minute", config: DEFAULT_LIMITS.sendMessage.perMinute },
      { name: "per-hour", config: DEFAULT_LIMITS.sendMessage.perHour },
    ]);

    if (!rateLimitResult.allowed) {
      return Response.json(
        {
          error: t("api.rateLimited", {
            maxAllowed: String(rateLimitResult.maxAllowed),
            window:
              rateLimitResult.limitType === "per-minute"
                ? t("api.perMinute")
                : t("api.perHour"),
            retryAfter: String(rateLimitResult.retryAfterSeconds),
          }),
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
        { error: t("api.tokenDailyLimit") },
        { status: 429 }
      );
    }

    if (
      TOKEN_LIMITS.monthly > 0 &&
      monthlyUsage.totalTokens >= TOKEN_LIMITS.monthly
    ) {
      return Response.json(
        { error: t("api.tokenMonthlyLimit") },
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
          { error: t("api.conversationNotFound") },
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

    // ── Step 8: Fetch memories & build system prompt ──────────────
    let systemPrompt: string | undefined;
    let memoryTokens = 0;

    if (mindDbId && userId) {
      try {
        const memories = await getRelevantMemories(userId, mindDbId);
        if (memories.length > 0) {
          systemPrompt = buildSystemPromptWithMemories(validatedMindName, memories);
          // Estimate tokens consumed by the memories section
          const basePrompt = buildSystemPrompt(validatedMindName);
          memoryTokens = estimateTokenCount(systemPrompt) - estimateTokenCount(basePrompt);
          logger.info(
            `[memory] Injected ${memories.length} memories (~${memoryTokens} tokens) for mind ${validatedMindName}`
          );
        }
      } catch (err) {
        logger.error(
          "Failed to fetch memories:",
          err instanceof Error ? err : new Error(String(err))
        );
      }
    }

    // ── Step 9: Stream response ───────────────────────────────────
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
          systemPrompt,
          memoryTokens,
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

            // Extract and save memories (fire-and-forget)
            if (mindDbId && capturedConversationId) {
              const conversationForMemory: ModelMessage[] = [
                ...(history ?? []),
                { role: "user" as const, content: sanitizedMessage },
                { role: "assistant" as const, content: text },
              ];
              extractMemories(validatedMindName, conversationForMemory)
                .then((extracted) => {
                  if (extracted.length > 0) {
                    return saveMemories(
                      userId,
                      mindDbId,
                      extracted,
                      capturedConversationId
                    );
                  }
                })
                .catch((err) => {
                  logger.error(
                    "Failed to extract/save memories:",
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
    // SYS-8: classify via the AppError taxonomy instead of ad-hoc string
    // matching. Observable contract is preserved — each branch returns the
    // SAME HTTP status and user message the client received before.
    const appError = classifyError(error);
    const rawMessage =
      error instanceof Error ? error.message : String(error);

    // Resource-not-found (e.g. mind lookup) → 404, same message as before.
    if (appError.code === ErrorCode.NOT_FOUND) {
      return Response.json({ error: t("api.mindNotFound") }, { status: 404 });
    }

    // Config-specific: missing Gemini key. Not a taxonomy category — it is a
    // boot/config concern, so we keep a targeted check (not classification).
    if (rawMessage.includes("GEMINI_API_KEY")) {
      return Response.json(
        { error: t("api.apiKeyMissing") },
        { status: 500 }
      );
    }

    logger.error(
      "Streaming chat error:",
      error instanceof Error ? error : new Error(String(error))
    );
    return Response.json(
      { error: t("api.chatProcessing") },
      { status: 500 }
    );
  }
}
