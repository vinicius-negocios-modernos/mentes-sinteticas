/**
 * Minimal i18n infrastructure.
 *
 * Currently hardcoded to pt-BR.  To add a new locale:
 * 1. Create `src/lib/i18n/messages/<locale>.ts` with the same shape as `pt-BR.ts`.
 * 2. Import it here and wire it into the `locales` map.
 * 3. Change `activeLocale` (or make it configurable).
 *
 * The `t()` function uses dot-notation keys (e.g. `t("chat.send")`).
 * If a key is not found, the key itself is returned as a fallback.
 */

import { messages as ptBR, type Messages } from "./messages/pt-BR";

// ---------------------------------------------------------------------------
// Locale registry
// ---------------------------------------------------------------------------

const locales: Record<string, Messages> = {
  "pt-BR": ptBR,
};

const activeLocale = "pt-BR";

// ---------------------------------------------------------------------------
// Lookup helper
// ---------------------------------------------------------------------------

/**
 * Translate a dot-notation key into the corresponding string.
 *
 * @example
 * ```ts
 * t("chat.send")        // "Enviar"
 * t("auth.loginTitle")  // "Entrar"
 * t("unknown.key")      // "unknown.key"  (fallback)
 * ```
 */
export function t(key: string): string {
  const msgs = locales[activeLocale];
  if (!msgs) return key;

  const parts = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any = msgs;

  for (const part of parts) {
    if (result == null || typeof result !== "object") return key;
    result = result[part];
  }

  return typeof result === "string" ? result : key;
}

export type { Messages };
