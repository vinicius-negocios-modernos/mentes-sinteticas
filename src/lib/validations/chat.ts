import { z } from "zod";

// ── Sanitization helpers ──────────────────────────────────────────────

/**
 * Strip control characters from a string, preserving newlines (\n, \r).
 * Removes: \x00-\x08, \x0B, \x0C, \x0E-\x1F, \x7F
 */
export function sanitizeMessage(input: string): string {
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

// ── Zod Schemas ───────────────────────────────────────────────────────

/**
 * Chat message validation: non-empty string, max 4000 chars, trimmed.
 * Applies sanitization (strip control chars) as a transform.
 */
export const ChatMessageSchema = z
  .string()
  .min(1, "Mensagem nao pode estar vazia.")
  .max(4000, "Mensagem excede o limite de 4000 caracteres.")
  .transform((val) => sanitizeMessage(val))
  .pipe(z.string().min(1, "Mensagem nao pode estar vazia apos sanitizacao."));

/**
 * Mind slug/name validation: alphanumeric + hyphens + spaces, max 100 chars.
 */
export const MindIdSchema = z
  .string()
  .min(1, "Nome da mente e obrigatorio.")
  .max(100, "Nome da mente excede o limite de 100 caracteres.")
  .regex(
    /^[a-zA-Z0-9\s\-]+$/,
    "Nome da mente contem caracteres invalidos."
  );

/**
 * Conversation ID validation: UUID v4 format.
 */
export const ConversationIdSchema = z
  .string()
  .uuid("ID de conversa invalido.");

/**
 * Complete sendMessage input validation.
 */
export const SendMessageInputSchema = z.object({
  mindName: MindIdSchema,
  message: ChatMessageSchema,
  conversationId: ConversationIdSchema.optional(),
});
