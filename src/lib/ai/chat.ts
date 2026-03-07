import type { Content } from "@google/generative-ai";
import type { GeminiHistoryEntry } from "@/lib/types";
import { getGenAI } from "./client";
import { getAIConfig } from "./config";
import { buildSystemPrompt } from "./prompts";
import { getFileParts, getMindFromDb, getMindManifest } from "./knowledge";
import { getContextBudget, estimateTokenCount } from "./context";
import { logger } from "@/lib/logger";

/**
 * Create a non-streaming chat session for a mind (legacy path).
 * Uses @google/generative-ai directly for backward compatibility.
 */
export async function createMindChat(mindName: string, history: GeminiHistoryEntry[] = []) {
  // Verify mind exists (DB primary, manifest fallback)
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

  const model = getGenAI().getGenerativeModel({
    model: aiConfig.model,
    systemInstruction: buildSystemPrompt(mindName),
  });

  const generationConfig = {
    temperature: aiConfig.temperature,
    topK: aiConfig.topK,
    topP: aiConfig.topP,
    maxOutputTokens: aiConfig.maxOutputTokens,
  };

  let chatHistory: Content[] = history.map((h) => ({
    role: h.role,
    parts: h.parts.map((p) => {
      if (p.fileData) return { fileData: p.fileData };
      return { text: p.text ?? "" };
    }),
  }));

  // Truncate history to fit within context budget
  const { maxHistoryTokens, maxMessages } = getContextBudget();
  if (chatHistory.length > maxMessages) {
    chatHistory = chatHistory.slice(-maxMessages);
  }
  let tokenCount = 0;
  const truncated: Content[] = [];
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const text = chatHistory[i].parts
      .map((p) => ("text" in p && p.text ? p.text : ""))
      .join("");
    const msgTokens = estimateTokenCount(text) + 4;
    if (tokenCount + msgTokens > maxHistoryTokens && truncated.length > 0) break;
    tokenCount += msgTokens;
    truncated.unshift(chatHistory[i]);
  }
  if (truncated.length < chatHistory.length) {
    logger.info(
      `[context] Chat history truncated: ${chatHistory.length} → ${truncated.length} messages`
    );
  }
  chatHistory = truncated;

  if (fileParts.length > 0) {
    chatHistory = [
      {
        role: "user",
        parts: [
          ...fileParts,
          { text: "Estude estes arquivos. Eles sao a sua memoria e conhecimento. Encarnar a persona descrita." },
        ],
      },
      {
        role: "model",
        parts: [{ text: `Entendido. Eu sou ${mindName}. Estou pronto.` }],
      },
      ...chatHistory,
    ];
  }

  const chat = model.startChat({
    generationConfig,
    history: chatHistory,
  });

  return chat;
}
