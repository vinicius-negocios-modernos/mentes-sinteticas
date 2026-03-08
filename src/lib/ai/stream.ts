import { streamText } from "ai";
import type { ModelMessage } from "@ai-sdk/provider-utils";
import { getGoogleProvider } from "./client";
import { getAIConfig } from "./config";
import { buildSystemPrompt, buildKnowledgePrimingMessage, buildKnowledgePrimingResponse } from "./prompts";
import { getFileParts, getMindFromDb, getMindManifest } from "./knowledge";
import { truncateHistory, estimateMessagesTokens, getContextBudget } from "./context";
import { logger } from "@/lib/logger";

/**
 * Build the message array for streaming, including knowledge context injection.
 * Converts file URIs into user/assistant priming messages for the Vercel AI SDK format.
 */
async function buildStreamMessages(
  mindName: string,
  userMessage: string,
  history: ModelMessage[],
  memoryTokens: number = 0
): Promise<ModelMessage[]> {
  const fileParts = await getFileParts(mindName);
  const messages: ModelMessage[] = [];

  // Inject knowledge base as priming messages
  if (fileParts.length > 0) {
    // Build content parts with file data references + priming text
    const userParts: Array<
      | { type: "text"; text: string }
      | { type: "file"; data: URL; mediaType: string }
    > = [];

    for (const fp of fileParts) {
      userParts.push({
        type: "file" as const,
        data: new URL(fp.fileData.fileUri),
        mediaType: fp.fileData.mimeType,
      });
    }

    userParts.push({
      type: "text" as const,
      text: buildKnowledgePrimingMessage(),
    });

    messages.push({
      role: "user",
      content: userParts,
    });

    messages.push({
      role: "assistant",
      content: buildKnowledgePrimingResponse(mindName),
    });
  }

  // Truncate history to fit within context budget (reduced by memory tokens)
  const { maxHistoryTokens } = getContextBudget();
  const adjustedBudget = memoryTokens > 0 ? Math.max(1000, maxHistoryTokens - memoryTokens) : undefined;
  const truncatedHistory = truncateHistory(history, adjustedBudget);
  const beforeTokens = estimateMessagesTokens(history);
  const afterTokens = estimateMessagesTokens(truncatedHistory);
  if (beforeTokens !== afterTokens) {
    logger.info(
      `[context] History truncated: ${history.length} → ${truncatedHistory.length} messages, ~${beforeTokens} → ~${afterTokens} tokens`
    );
  }

  // Add conversation history
  messages.push(...truncatedHistory);

  // Add current user message
  messages.push({
    role: "user",
    content: userMessage,
  });

  return messages;
}

export interface StreamUsageData {
  inputTokens: number;
  outputTokens: number;
}

export interface StreamMindChatOptions {
  mindName: string;
  userMessage: string;
  history?: ModelMessage[];
  /** Optional override for the system prompt (e.g., with memories injected). */
  systemPrompt?: string;
  /** Tokens consumed by memories — subtracted from history budget. */
  memoryTokens?: number;
  onFinish?: (result: {
    text: string;
    usage?: StreamUsageData;
    model?: string;
  }) => void | Promise<void>;
}

/**
 * Stream a response from a mind using Vercel AI SDK.
 * Returns a streamText result that can be converted to a streaming response.
 */
export async function streamMindChat({
  mindName,
  userMessage,
  history = [],
  systemPrompt,
  memoryTokens = 0,
  onFinish,
}: StreamMindChatOptions) {
  // Verify mind exists
  const fileParts = await getFileParts(mindName);
  if (fileParts.length === 0) {
    const dbMind = await getMindFromDb(mindName);
    if (!dbMind) {
      const mindData = await getMindManifest(mindName);
      if (!mindData) {
        throw new Error(`Mind '${mindName}' not found.`);
      }
    }
  }

  const aiConfig = getAIConfig();
  const google = getGoogleProvider();

  const messages = await buildStreamMessages(mindName, userMessage, history, memoryTokens);

  const result = streamText({
    model: google(aiConfig.model),
    system: systemPrompt ?? buildSystemPrompt(mindName),
    messages,
    temperature: aiConfig.temperature,
    topK: aiConfig.topK,
    topP: aiConfig.topP,
    maxOutputTokens: aiConfig.maxOutputTokens,
    onFinish: onFinish
      ? async ({ text, usage }) => {
          await onFinish({
            text,
            usage: usage
              ? {
                  inputTokens: usage.inputTokens ?? 0,
                  outputTokens: usage.outputTokens ?? 0,
                }
              : undefined,
            model: aiConfig.model,
          });
        }
      : undefined,
  });

  return result;
}
