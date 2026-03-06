import type { Content } from "@google/generative-ai";
import type { GeminiHistoryEntry } from "@/lib/types";
import { getConfig } from "@/lib/config";
import { getGenAI } from "./client";
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

  const config = getConfig();

  const model = getGenAI().getGenerativeModel({
    model: config.GEMINI_MODEL,
    systemInstruction: buildSystemPrompt(mindName),
  });

  const generationConfig = {
    temperature: config.GEMINI_TEMPERATURE,
    topK: config.GEMINI_TOP_K,
    topP: config.GEMINI_TOP_P,
    maxOutputTokens: config.GEMINI_MAX_OUTPUT_TOKENS,
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
