import { z } from "zod";
import type { ModelMessage } from "@ai-sdk/provider-utils";

const ContextConfigSchema = z.object({
  maxHistoryTokens: z.coerce.number().int().min(1).default(30_000),
  maxMessages: z.coerce.number().int().min(1).default(50),
});

/** Maximum context window sizes (in tokens) for known Gemini models. */
export const CONTEXT_LIMITS: Record<string, number> = {
  "gemini-2.0-flash": 1_048_576,
  "gemini-2.0-pro": 2_097_152,
};

let _contextConfig: z.infer<typeof ContextConfigSchema> | null = null;

function getContextConfig() {
  if (!_contextConfig) {
    const result = ContextConfigSchema.safeParse({
      maxHistoryTokens: process.env.CONTEXT_MAX_HISTORY_TOKENS ?? 30_000,
      maxMessages: process.env.CONTEXT_MAX_MESSAGES ?? 50,
    });
    if (!result.success) {
      const errors = result.error.issues.map(i => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
      throw new Error(`Context configuration error:\n${errors}`);
    }
    _contextConfig = result.data;
  }
  return _contextConfig;
}

/**
 * Get the context budget configuration (max tokens and messages for history).
 *
 * @returns Object with maxHistoryTokens and maxMessages limits
 */
export function getContextBudget(): { maxHistoryTokens: number; maxMessages: number } {
  const config = getContextConfig();
  return {
    maxHistoryTokens: config.maxHistoryTokens,
    maxMessages: config.maxMessages,
  };
}

/**
 * Estimate the token count for a text string using a ~4 chars/token heuristic.
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count (ceiling)
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function messageToText(message: ModelMessage): string {
  if (typeof message.content === "string") {
    return message.content;
  }
  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => {
        if (typeof part === "string") return part;
        if ("text" in part && typeof part.text === "string") return part.text;
        return "";
      })
      .join("");
  }
  return "";
}

/**
 * Estimate total token count for an array of messages, including role overhead.
 *
 * @param messages - Array of ModelMessage objects
 * @returns Total estimated token count
 */
export function estimateMessagesTokens(messages: ModelMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    total += estimateTokenCount(messageToText(msg));
    total += 4; // role overhead
  }
  return total;
}

/**
 * Truncate conversation history to fit within the context budget.
 * Uses a sliding window approach, keeping the most recent messages.
 *
 * @param messages - Full conversation history
 * @param maxTokens - Optional token limit override (defaults to config value)
 * @returns Truncated message array that fits within the budget
 */
export function truncateHistory(
  messages: ModelMessage[],
  maxTokens?: number
): ModelMessage[] {
  const budget = maxTokens ?? getContextBudget().maxHistoryTokens;
  const maxMsgs = getContextBudget().maxMessages;

  // Apply message count limit first (safety net)
  const limited = messages.length > maxMsgs ? messages.slice(-maxMsgs) : messages;

  // Check if all messages fit within token budget
  if (estimateMessagesTokens(limited) <= budget) {
    return limited;
  }

  // Sliding window: keep most recent messages that fit
  const result: ModelMessage[] = [];
  let tokenCount = 0;

  for (let i = limited.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokenCount(messageToText(limited[i])) + 4;
    if (tokenCount + msgTokens > budget && result.length > 0) {
      break;
    }
    tokenCount += msgTokens;
    result.unshift(limited[i]);
  }

  return result;
}
