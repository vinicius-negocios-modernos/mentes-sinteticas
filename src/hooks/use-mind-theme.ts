import { useMemo } from "react";
import { getMindTheme, defaultTheme, type MindTheme } from "@/config/mind-themes";

/**
 * Returns the MindTheme configuration for the given slug.
 *
 * This hook is for client components that need theme values programmatically
 * (e.g. dynamic SVG colors, canvas rendering). For CSS-based styling, prefer
 * using Tailwind classes that reference CSS custom properties — these are
 * set via the `[data-mind-theme]` selector applied on the server component.
 *
 * @param slug - The mind's URL slug (e.g. "aristoteles", "da-vinci")
 * @returns The MindTheme config, or the default theme if slug is unknown
 */
export function useMindTheme(slug: string): MindTheme {
  return useMemo(() => getMindTheme(slug), [slug]);
}

export { defaultTheme, type MindTheme };
