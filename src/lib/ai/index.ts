/**
 * AI Module — Public API
 *
 * Barrel export for all AI-related functionality.
 * Provides client creation, prompt building, knowledge retrieval,
 * streaming/non-streaming chat, context management, pricing, and config.
 */

// AI Config
export { getAIConfig, AI_PRESETS } from "./config";
export type { AIModelConfig } from "./config";

// Client
export { getGenAI, getGoogleProvider } from "./client";

// Prompts
export { buildSystemPrompt, buildKnowledgePrimingMessage, buildKnowledgePrimingResponse } from "./prompts";

// Knowledge
export {
  getMindManifest,
  getAvailableMinds,
  getMindFromDb,
  getFileUrisFromDb,
  getFileParts,
} from "./knowledge";

// Chat (non-streaming, legacy path)
export { createMindChat } from "./chat";

// Context Window Management
export {
  estimateTokenCount,
  estimateMessagesTokens,
  truncateHistory,
  getContextBudget,
  CONTEXT_LIMITS,
} from "./context";

// Streaming (Vercel AI SDK)
export { streamMindChat } from "./stream";
export type { StreamMindChatOptions, StreamUsageData } from "./stream";

// Pricing
export { calculateCost, MODEL_PRICING } from "./pricing";

// Token Limits
export { TOKEN_LIMITS } from "./config";
