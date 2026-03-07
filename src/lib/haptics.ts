/**
 * Haptic feedback utility using the Vibration API.
 *
 * Patterns are intentionally short and subtle — long vibrations feel intrusive.
 * Gracefully degrades on browsers/devices without Vibration API support (desktop,
 * Safari, etc.) and respects the `prefers-reduced-motion` user preference.
 *
 * @module haptics
 */

export type HapticPattern = "light" | "medium" | "confirm" | "error";

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  confirm: [10, 50, 10],
  error: [50, 30, 50],
};

/**
 * Returns `true` when the user has opted into reduced-motion at the OS level.
 * Always returns `false` on the server (SSR safety).
 */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Trigger a haptic vibration pattern.
 *
 * @param pattern - Predefined vibration pattern (default: `"light"`).
 * @returns `true` if vibration was triggered, `false` otherwise.
 */
export function triggerHaptic(pattern: HapticPattern = "light"): boolean {
  // SSR guard
  if (typeof navigator === "undefined") return false;

  // API availability check
  if (!navigator.vibrate) return false;

  // Respect reduced-motion preference
  if (prefersReducedMotion()) return false;

  const p = patterns[pattern];
  return navigator.vibrate(p);
}
