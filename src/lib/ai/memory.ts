/**
 * AI-powered memory extraction from conversations.
 *
 * Analyzes conversation messages and extracts key facts, preferences,
 * topics of interest, and insights about the user.
 */

import { generateText } from "ai";
import { getGoogleProvider } from "./client";
import { getAIConfig } from "./config";
import { logger } from "@/lib/logger";
import type { ModelMessage } from "@ai-sdk/provider-utils";

// ── Types ─────────────────────────────────────────────────────────────

export interface ExtractedMemory {
  memory_type: "fact" | "preference" | "topic" | "insight";
  content: string;
  confidence: number;
}

// ── Extraction Prompt ─────────────────────────────────────────────────

function buildExtractionPrompt(mindName: string): string {
  return `You are an AI assistant analyzing a conversation between a user and ${mindName}.
Your task is to extract important facts, preferences, topics, and insights about the USER (not about ${mindName}).

Extract 0 to 5 key pieces of information. Only extract meaningful, specific information. Ignore small talk, greetings, and generic questions.

Categories:
- "fact": Personal facts the user declared about themselves (e.g., "I am a philosophy student", "I live in Brazil")
- "preference": Communication or learning preferences (e.g., "prefers practical examples", "likes Socratic dialogue")
- "topic": Recurring topics of interest (e.g., "studying Stoic ethics", "interested in leadership")
- "insight": Deeper observations about the user (e.g., "struggles with decision-making", "values critical thinking")

Rules:
- Each content must be max 500 characters
- Only include items you are confident about (confidence >= 0.7)
- Write content in the same language the user used in the conversation
- Do NOT extract information about ${mindName}, only about the user
- Do NOT extract trivial information like "the user said hello"
- If there is nothing meaningful to extract, return an empty array

Respond ONLY with a valid JSON array. No markdown, no explanation. Example:
[{"memory_type":"fact","content":"E estudante de filosofia na USP","confidence":0.9},{"memory_type":"preference","content":"Prefere exemplos praticos a teoria abstrata","confidence":0.8}]

If nothing to extract, respond with: []`;
}

// ── Core Function ─────────────────────────────────────────────────────

/**
 * Extract memories from a conversation using AI.
 * Returns 0-5 extracted memories with confidence >= 0.7.
 *
 * @param mindName - Name of the mind persona
 * @param conversationMessages - Messages from the conversation to analyze
 * @returns Array of extracted memories (may be empty)
 */
export async function extractMemories(
  mindName: string,
  conversationMessages: ModelMessage[]
): Promise<ExtractedMemory[]> {
  // Skip if conversation is too short (need at least 1 user + 1 assistant message)
  const userMessages = conversationMessages.filter((m) => m.role === "user");
  if (userMessages.length < 1) {
    return [];
  }

  // Build conversation text for analysis
  const conversationText = conversationMessages
    .map((m) => {
      const role = m.role === "user" ? "User" : mindName;
      const content =
        typeof m.content === "string"
          ? m.content
          : Array.isArray(m.content)
            ? m.content
                .map((p) => {
                  if (typeof p === "string") return p;
                  if ("text" in p && typeof p.text === "string") return p.text;
                  return "";
                })
                .filter(Boolean)
                .join(" ")
            : "";
      return `${role}: ${content}`;
    })
    .join("\n");

  try {
    const aiConfig = getAIConfig();
    const google = getGoogleProvider();

    const { text } = await generateText({
      model: google(aiConfig.model),
      system: buildExtractionPrompt(mindName),
      messages: [
        {
          role: "user",
          content: `Analyze this conversation and extract memories about the user:\n\n${conversationText}`,
        },
      ],
      temperature: 0.3, // Low temperature for consistent extraction
      maxOutputTokens: 1024,
    });

    // Parse JSON response
    const cleaned = text.trim();
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      logger.debug("[memory] No JSON array found in extraction response");
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]) as unknown[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Validate and filter
    const validTypes = new Set(["fact", "preference", "topic", "insight"]);
    const memories: ExtractedMemory[] = [];

    for (const item of parsed) {
      if (
        typeof item === "object" &&
        item !== null &&
        "memory_type" in item &&
        "content" in item &&
        "confidence" in item &&
        validTypes.has(String((item as ExtractedMemory).memory_type)) &&
        typeof (item as ExtractedMemory).content === "string" &&
        (item as ExtractedMemory).content.length > 0 &&
        (item as ExtractedMemory).content.length <= 500 &&
        typeof (item as ExtractedMemory).confidence === "number" &&
        (item as ExtractedMemory).confidence >= 0.7
      ) {
        memories.push({
          memory_type: (item as ExtractedMemory).memory_type,
          content: (item as ExtractedMemory).content.slice(0, 500),
          confidence: (item as ExtractedMemory).confidence,
        });
      }
    }

    // Max 5 memories per extraction
    return memories.slice(0, 5);
  } catch (error) {
    logger.error(
      "Failed to extract memories:",
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}
