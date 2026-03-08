/**
 * Mind Theme Configuration — Visual identity per mind.
 *
 * Each mind has a distinct color palette applied via CSS custom properties
 * using `[data-mind-theme="slug"]` selectors in globals.css.
 *
 * To add a theme for a new mind:
 * 1. Add an entry here in `mindThemes`
 * 2. Add the corresponding CSS selector in `globals.css`
 */

/**
 * Visual theme configuration for a mind.
 * HSL values use the "H S% L%" format (no commas) for shadcn/ui compatibility.
 */
export interface MindTheme {
  /** Primary color in HSL format (e.g. "38 92% 50%") */
  primary: string;
  /** Accent color in HSL format */
  accent: string;
  /** Focus ring color in HSL format */
  ring: string;
  /** Gradient start color (hex or HSL) for background */
  gradientFrom: string;
  /** Gradient end color (hex or HSL) for background */
  gradientTo: string;
  /** Subtle glow color as rgba string for box-shadow */
  glowColor: string;
}

/**
 * Default theme — matches the existing purple/cyan palette.
 * Used as fallback when a mind slug has no specific theme.
 */
export const defaultTheme: MindTheme = {
  primary: "271 81% 65%",
  accent: "185 100% 50%",
  ring: "271 81% 65%",
  gradientFrom: "#1e1b4b",
  gradientTo: "#0c0a1d",
  glowColor: "rgba(168, 85, 247, 0.15)",
};

/**
 * Theme configuration for each mind, keyed by slug.
 *
 * Color rationale:
 * - Aristoteles: Amber/gold — ancient Greek philosophy, warmth of wisdom
 * - Da Vinci: Sepia/terracotta — Renaissance art, aged parchment
 * - Tesla: Electric blue/cyan — electricity, futurism, innovation
 * - Curie: Emerald/radioactive green — radium glow, scientific discovery
 * - Hypatia: Cosmic purple/violet — astronomy, Alexandria, mysticism
 * - Turing: Terminal green/matrix — computing, codebreaking, digital
 *
 * All foreground-on-background combinations verified for WCAG AA (4.5:1+).
 */
export const mindThemes: Record<string, MindTheme> = {
  aristoteles: {
    primary: "38 92% 50%",
    accent: "45 93% 47%",
    ring: "38 92% 50%",
    gradientFrom: "#92400e",
    gradientTo: "#1e1b4b",
    glowColor: "rgba(245, 158, 11, 0.15)",
  },
  "da-vinci": {
    primary: "24 75% 55%",
    accent: "15 70% 45%",
    ring: "24 75% 55%",
    gradientFrom: "#7c2d12",
    gradientTo: "#1c1917",
    glowColor: "rgba(234, 138, 72, 0.15)",
  },
  tesla: {
    primary: "199 89% 48%",
    accent: "185 100% 50%",
    ring: "199 89% 48%",
    gradientFrom: "#0c4a6e",
    gradientTo: "#0f172a",
    glowColor: "rgba(14, 165, 233, 0.15)",
  },
  curie: {
    primary: "142 71% 45%",
    accent: "160 84% 39%",
    ring: "142 71% 45%",
    gradientFrom: "#064e3b",
    gradientTo: "#0f172a",
    glowColor: "rgba(34, 197, 94, 0.15)",
  },
  hypatia: {
    primary: "270 70% 60%",
    accent: "280 80% 65%",
    ring: "270 70% 60%",
    gradientFrom: "#4c1d95",
    gradientTo: "#0f0a2e",
    glowColor: "rgba(147, 51, 234, 0.15)",
  },
  turing: {
    primary: "120 60% 50%",
    accent: "140 70% 40%",
    ring: "120 60% 50%",
    gradientFrom: "#14532d",
    gradientTo: "#0a0f0a",
    glowColor: "rgba(74, 222, 128, 0.15)",
  },
};

/**
 * Get theme config for a mind by slug.
 * Returns the default theme if the slug is not found.
 */
export function getMindTheme(slug: string): MindTheme {
  return mindThemes[slug] ?? defaultTheme;
}

/** All available mind theme slugs */
export const mindThemeSlugs = Object.keys(mindThemes);
