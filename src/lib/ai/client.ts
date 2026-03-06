import { GoogleGenerativeAI } from "@google/generative-ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getConfig } from "@/lib/config";

// ── Legacy client singleton (@google/generative-ai) ─────────────────
let genAI: GoogleGenerativeAI | null = null;

/**
 * Get the legacy GoogleGenerativeAI client (used by non-streaming path).
 */
export function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const config = getConfig();
    genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
  return genAI;
}

// ── Vercel AI SDK Google provider (used by streaming path) ──────────

/**
 * Create a Vercel AI SDK Google provider instance.
 * Returns a new instance each time (the provider is lightweight).
 */
export function getGoogleProvider() {
  const config = getConfig();
  return createGoogleGenerativeAI({
    apiKey: config.GEMINI_API_KEY,
  });
}
