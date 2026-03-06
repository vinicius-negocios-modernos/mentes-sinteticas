import type { Content } from "@google/generative-ai";
import type { GeminiHistoryEntry } from "@/lib/types";
import { getGenAI } from "./client";
import { getAIConfig } from "./config";
import { buildSystemPrompt } from "./prompts";
import { getFileParts, getMindFromDb, getMindManifest } from "./knowledge";

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
