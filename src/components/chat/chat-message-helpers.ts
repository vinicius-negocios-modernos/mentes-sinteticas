/**
 * Pure formatting + lazy-CSS helpers for ChatMessage (UX-11).
 *
 * Extracted verbatim from chat-message.tsx so the message component is a thinner
 * orchestrator and these pure functions are independently unit-testable. No
 * behavior change: same initials logic, same pt-BR time format, same one-time
 * CDN stylesheet injection guarded by module-level flags.
 *
 * @module components/chat/chat-message-helpers
 */

import type React from "react";

/* ---------- Lazy-load KaTeX CSS ---------- */
let katexCssLoaded = false;
export function ensureKatexCss() {
  if (katexCssLoaded || typeof document === "undefined") return;
  katexCssLoaded = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css";
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

/* ---------- Lazy-load highlight.js theme CSS ---------- */
let hljsCssLoaded = false;
export function ensureHljsCss() {
  if (hljsCssLoaded || typeof document === "undefined") return;
  hljsCssLoaded = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/styles/github-dark.min.css";
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

/* ---------- Pure formatting helpers ---------- */

/** First letters of the first two words of a name, uppercased. */
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** pt-BR HH:MM timestamp for a message. */
export function formatTimestamp(date: Date): string {
  return new Date(date).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Extract raw text from a React children tree (for code blocks).
 */
export function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText(
      (node as React.ReactElement<{ children?: React.ReactNode }>).props
        .children
    );
  }
  return "";
}
