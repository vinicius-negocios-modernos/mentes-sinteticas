"use client";

/**
 * useTokenWarning — daily token-limit warning banner state (UX-11).
 *
 * Extracted from ChatInterface. The API route signals that the user is close to
 * the daily token limit via the `X-Token-Usage-Warning: approaching-limit`
 * response header; this hook owns the boolean banner state and the (single,
 * centralized) place that interprets that header. Behavior is identical to the
 * inline version: the banner latches on once the header is seen and the user can
 * dismiss it.
 *
 * @module hooks/use-token-warning
 */

import { useCallback, useState } from "react";

/** Header name the chat API uses to flag approaching token limits. */
export const TOKEN_USAGE_WARNING_HEADER = "X-Token-Usage-Warning";
/** Header value that triggers the warning banner. */
export const TOKEN_USAGE_WARNING_VALUE = "approaching-limit";

export interface UseTokenWarningResult {
  /** Whether the token-warning banner is currently shown. */
  tokenWarning: boolean;
  /** Read a fetch Response's headers and latch the warning on if present. */
  checkResponse: (response: Response) => void;
  /** Dismiss the banner. */
  dismiss: () => void;
}

export function useTokenWarning(): UseTokenWarningResult {
  const [tokenWarning, setTokenWarning] = useState(false);

  const checkResponse = useCallback((response: Response) => {
    const usageWarning = response.headers.get(TOKEN_USAGE_WARNING_HEADER);
    if (usageWarning === TOKEN_USAGE_WARNING_VALUE) {
      setTokenWarning(true);
    }
  }, []);

  const dismiss = useCallback(() => setTokenWarning(false), []);

  return { tokenWarning, checkResponse, dismiss };
}
