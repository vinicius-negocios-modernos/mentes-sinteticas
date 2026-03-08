import { z } from "zod";

/**
 * Schema for creating a new debate.
 * - topic: 3-500 characters
 * - participantSlugs: 2-4 mind slugs
 */
export const CreateDebateSchema = z.object({
  topic: z
    .string()
    .min(3, "O topico deve ter pelo menos 3 caracteres.")
    .max(500, "O topico excede o limite de 500 caracteres.")
    .transform((val) => val.trim()),
  participantSlugs: z
    .array(z.string().min(1, "Slug invalido."))
    .min(2, "Selecione pelo menos 2 mentes para o debate.")
    .max(4, "O maximo de mentes por debate e 4."),
});

export type CreateDebateInput = z.infer<typeof CreateDebateSchema>;

/**
 * Schema for debate actions (next turn, interject, pause, resume, end).
 */
export const DebateActionSchema = z.object({
  debateId: z.string().uuid("ID de debate invalido."),
  action: z.enum(["next-turn", "interject", "pause", "resume", "end"], {
    message: "Acao invalida.",
  }),
  message: z.string().max(4000).optional(),
});

export type DebateActionInput = z.infer<typeof DebateActionSchema>;
