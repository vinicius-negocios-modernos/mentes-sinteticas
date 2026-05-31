import { z } from "zod";

/**
 * Signup input validation (public, unauthenticated route).
 *
 * - email: valid email format, normalized to lowercase + trimmed, max 254 chars.
 * - password: 8-72 chars (bcrypt truncates at 72 bytes), with basic strength
 *   (at least one letter and one number) to reject trivially weak passwords.
 *
 * `.strict()` rejects any unknown/extra payload fields — this closes the
 * mass-assignment / payload-pollution surface on a public route.
 */
export const SignupSchema = z
  .object({
    email: z.preprocess(
      (val) => (typeof val === "string" ? val.trim().toLowerCase() : val),
      z
        .email("E-mail invalido.")
        .max(254, "E-mail excede o limite de 254 caracteres.")
    ),
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres.")
      .max(72, "A senha excede o limite de 72 caracteres.")
      .regex(/[A-Za-z]/, "A senha deve conter pelo menos uma letra.")
      .regex(/[0-9]/, "A senha deve conter pelo menos um numero."),
  })
  .strict();

export type SignupInput = z.infer<typeof SignupSchema>;
