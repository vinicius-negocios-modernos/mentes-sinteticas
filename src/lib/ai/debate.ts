import { buildSystemPrompt } from "./prompts";
import type { DebateParticipantInfo } from "@/lib/types";

/**
 * Build the debate-specific addon to append to a mind's system prompt.
 * Instructs the mind to participate in a structured debate.
 */
export function buildDebatePromptAddon(
  topic: string,
  participants: string[],
  currentMind: string
): string {
  const others = participants.filter((p) => p !== currentMind);
  return `\n\nVoce esta participando de um debate sobre: "${topic}".
Outros participantes: ${others.join(", ")}.
Responda ao que foi dito pelos outros participantes. Defenda sua perspectiva.
Interaja diretamente com os argumentos apresentados. Seja respeitoso mas firme.
Mantenha sua personalidade e base suas respostas no seu conhecimento.
Resposta concisa — maximo 300 palavras.`;
}

/**
 * Build the complete system prompt for a mind in a debate context.
 * Combines the base persona prompt with the debate addon.
 */
export function buildDebateSystemPrompt(
  mindName: string,
  topic: string,
  participantNames: string[]
): string {
  const base = buildSystemPrompt(mindName);
  const addon = buildDebatePromptAddon(topic, participantNames, mindName);
  return base + addon;
}

/**
 * Determine the next participant in the round-robin cycle.
 *
 * @param participants - Sorted array of debate participants
 * @param currentTurn - Total number of turns completed so far
 * @returns The participant whose turn is next
 */
export function getNextParticipant(
  participants: DebateParticipantInfo[],
  currentTurn: number
): DebateParticipantInfo {
  const sorted = [...participants].sort((a, b) => a.turnOrder - b.turnOrder);
  const turnIndex = currentTurn % sorted.length;
  return sorted[turnIndex];
}

/**
 * Check if the debate has completed all rounds.
 *
 * @param currentTurn - Total turns completed
 * @param participantCount - Number of participants
 * @param maxRounds - Maximum rounds allowed
 * @returns True if all rounds are complete
 */
export function isDebateComplete(
  currentTurn: number,
  participantCount: number,
  maxRounds: number
): boolean {
  return currentTurn >= participantCount * maxRounds;
}

/**
 * Calculate the current round number (0-indexed) from total turns completed.
 */
export function getCurrentRound(
  currentTurn: number,
  participantCount: number
): number {
  return Math.floor(currentTurn / participantCount);
}

/** Default max history tokens for debates (configurable via env). */
export const DEBATE_MAX_HISTORY_TOKENS = parseInt(
  process.env.DEBATE_MAX_HISTORY_TOKENS ?? "20000",
  10
);

/** Max output tokens per debate turn response. */
export const DEBATE_MAX_OUTPUT_TOKENS = 1024;
