import { streamText } from "ai";
import type { ModelMessage } from "@ai-sdk/provider-utils";
import { createClient } from "@/lib/supabase/server";
import { DebateActionSchema } from "@/lib/validations/debate";
import {
  getDebateById,
  getDebateParticipants,
  updateDebateStatus,
  advanceTurn,
} from "@/lib/services/debates";
import { createMessage, listByConversation } from "@/lib/services/messages";
import { recordUsage } from "@/lib/services/token-usage";
import { calculateCost } from "@/lib/ai/pricing";
import { getGoogleProvider } from "@/lib/ai/client";
import { getAIConfig } from "@/lib/ai/config";
import { truncateHistory } from "@/lib/ai/context";
import {
  buildDebateSystemPrompt,
  getNextParticipant,
  isDebateComplete,
  DEBATE_MAX_HISTORY_TOKENS,
  DEBATE_MAX_OUTPUT_TOKENS,
} from "@/lib/ai/debate";
import { logger } from "@/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ debateId: string }> }
) {
  try {
    const { debateId } = await params;
    const body = await request.json();

    // ── Validate action ───────────────────────────────────────────────
    const validation = DebateActionSchema.safeParse({
      debateId,
      ...body,
    });

    if (!validation.success) {
      const errors = validation.error.issues.map((i) => i.message).join(" ");
      return Response.json({ error: errors }, { status: 400 });
    }

    const { action, message: userMessage } = validation.data;

    // ── Authenticate ──────────────────────────────────────────────────
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

    // ── Load debate ───────────────────────────────────────────────────
    const debate = await getDebateById(debateId, user.id);
    if (!debate) {
      return Response.json(
        { error: "Debate nao encontrado." },
        { status: 404 }
      );
    }

    // ── Handle control actions ────────────────────────────────────────
    if (action === "pause") {
      await updateDebateStatus(debateId, "paused");
      return Response.json({ status: "paused" });
    }

    if (action === "resume") {
      await updateDebateStatus(debateId, "active");
      return Response.json({ status: "active" });
    }

    if (action === "end") {
      await updateDebateStatus(debateId, "completed");
      return Response.json({ status: "completed" });
    }

    // ── Check debate is active or in setup ────────────────────────────
    if (debate.status === "completed") {
      return Response.json(
        { error: "Este debate ja foi encerrado." },
        { status: 400 }
      );
    }

    if (debate.status === "paused") {
      return Response.json(
        { error: "Este debate esta pausado. Retome antes de continuar." },
        { status: 400 }
      );
    }

    // Activate debate if still in setup
    if (debate.status === "setup") {
      await updateDebateStatus(debateId, "active");
    }

    const participants = await getDebateParticipants(debateId);
    if (participants.length < 2) {
      return Response.json(
        { error: "Debate precisa de pelo menos 2 participantes." },
        { status: 400 }
      );
    }

    // ── Handle interjection ───────────────────────────────────────────
    if (action === "interject") {
      if (!userMessage || userMessage.trim().length === 0) {
        return Response.json(
          { error: "Mensagem de interjeccao obrigatoria." },
          { status: 400 }
        );
      }

      if (debate.conversationId) {
        await createMessage(debate.conversationId, "user", userMessage.trim());
      }

      return Response.json({ status: "interjected" });
    }

    // ── Next turn logic ───────────────────────────────────────────────
    // Check if debate is complete
    if (
      isDebateComplete(debate.currentTurn, participants.length, debate.maxRounds)
    ) {
      await updateDebateStatus(debateId, "completed");
      return Response.json({
        status: "completed",
        message: "Debate concluido — todos os rounds foram completados.",
      });
    }

    // Determine next participant
    const nextParticipant = getNextParticipant(
      participants,
      debate.currentTurn
    );

    // Build conversation history from stored messages
    const conversationId = debate.conversationId;
    if (!conversationId) {
      return Response.json(
        { error: "Conversa do debate nao encontrada." },
        { status: 500 }
      );
    }

    const storedMessages = await listByConversation(conversationId);

    // Convert to ModelMessage format for the AI
    const historyMessages: ModelMessage[] = storedMessages.map((msg) => ({
      role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
      content: msg.mindSlug
        ? `[${msg.mindSlug}]: ${msg.content}`
        : msg.content,
    }));

    // Truncate history with debate-specific budget
    const truncated = truncateHistory(historyMessages, DEBATE_MAX_HISTORY_TOKENS);

    // Build system prompt with debate context
    const participantNames = participants.map((p) => p.mindName);
    const systemPrompt = buildDebateSystemPrompt(
      nextParticipant.mindName,
      debate.topic,
      participantNames
    );

    // Add turn instruction as the final user message
    const turnInstruction =
      truncated.length === 0
        ? `O debate comeca agora. O topico e: "${debate.topic}". E a sua vez de abrir a discussao.`
        : "E a sua vez de responder no debate. Reaja ao que foi dito.";

    const messagesForAI: ModelMessage[] = [
      ...truncated,
      { role: "user" as const, content: turnInstruction },
    ];

    // ── Stream response ───────────────────────────────────────────────
    const aiConfig = getAIConfig();
    const google = getGoogleProvider();

    const result = streamText({
      model: google(aiConfig.model),
      system: systemPrompt,
      messages: messagesForAI,
      temperature: aiConfig.temperature,
      topK: aiConfig.topK,
      topP: aiConfig.topP,
      maxOutputTokens: DEBATE_MAX_OUTPUT_TOKENS,
      onFinish: async ({ text, usage }) => {
        // Persist assistant message with mind_slug
        if (conversationId) {
          const tokenCount = usage
            ? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0)
            : undefined;
          await createMessage(
            conversationId,
            "assistant",
            text,
            tokenCount,
            nextParticipant.mindSlug
          );
        }

        // Advance turn counter
        await advanceTurn(debateId, participants.length);

        // Record token usage
        if (usage && conversationId) {
          const costUsd = calculateCost(
            aiConfig.model,
            usage.inputTokens ?? 0,
            usage.outputTokens ?? 0
          );
          recordUsage({
            userId: user.id,
            conversationId,
            inputTokens: usage.inputTokens ?? 0,
            outputTokens: usage.outputTokens ?? 0,
            model: aiConfig.model,
            costUsd,
          }).catch((err) => {
            logger.error(
              "Failed to record debate token usage:",
              err instanceof Error ? err : new Error(String(err))
            );
          });
        }
      },
    });

    return result.toTextStreamResponse({
      headers: {
        "X-Current-Mind": nextParticipant.mindSlug,
        "X-Mind-Name": encodeURIComponent(nextParticipant.mindName),
        "X-Turn-Order": String(nextParticipant.turnOrder),
        "X-Current-Turn": String(debate.currentTurn),
      },
    });
  } catch (error) {
    logger.error(
      "Error in debate turn:",
      error instanceof Error ? error : new Error(String(error))
    );
    return Response.json(
      { error: "Erro ao processar turno do debate. Tente novamente." },
      { status: 500 }
    );
  }
}
