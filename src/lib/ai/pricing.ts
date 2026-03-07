/**
 * Gemini model pricing configuration.
 * Prices are per 1 million tokens (USD).
 * Update values when Google changes pricing.
 */
export const MODEL_PRICING: Record<
  string,
  { inputPer1M: number; outputPer1M: number }
> = {
  "gemini-2.0-flash": { inputPer1M: 0.1, outputPer1M: 0.4 },
  "gemini-2.0-flash-lite": { inputPer1M: 0.075, outputPer1M: 0.3 },
  "gemini-1.5-pro": { inputPer1M: 1.25, outputPer1M: 5.0 },
  "gemini-1.5-flash": { inputPer1M: 0.075, outputPer1M: 0.3 },
};

/**
 * Calculate the cost in USD for a given model and token counts.
 * Returns 0 if the model is not found in the pricing table (graceful fallback).
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (
    (inputTokens * pricing.inputPer1M + outputTokens * pricing.outputPer1M) /
    1_000_000
  );
}
