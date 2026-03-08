"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface CodeBlockProps {
  language?: string;
  children: string;
  className?: string;
}

/**
 * Syntax-highlighted code block with language label and copy button.
 * Used as a custom renderer inside ReactMarkdown for fenced code blocks.
 */
export function CodeBlock({ language, children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
    } catch {
      // Fallback for older browsers / insecure contexts
      const textarea = document.createElement("textarea");
      textarea.value = children;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  const displayLang = language?.replace(/^language-/, "") || "";

  return (
    <div
      className={cn("group/code relative rounded-lg overflow-hidden my-3", className)}
      role="region"
      aria-label={t("chat.codeBlockAria").replace("{lang}", displayLang || "code")}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 text-xs">
        <span className="text-muted-foreground font-mono select-none">
          {displayLang || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t("chat.copyCode")}
        >
          {copied ? (
            <>
              <CheckIcon className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400">{t("chat.codeCopied")}</span>
            </>
          ) : (
            <>
              <CopyIcon className="w-3.5 h-3.5" />
              <span>{t("chat.copyCodeShort")}</span>
            </>
          )}
        </button>
      </div>

      {/* Code content — highlight.js classes applied by rehype-highlight */}
      <div className="overflow-x-auto">
        <pre className="!m-0 !rounded-none !bg-black/40 p-4 text-sm leading-relaxed">
          <code className={cn("hljs", language && `language-${displayLang}`)}>
            {children}
          </code>
        </pre>
      </div>
    </div>
  );
}

/* ---------- Inline SVG icons ---------- */

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
