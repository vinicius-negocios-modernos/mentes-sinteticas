"use client";

import { cn } from "@/lib/utils";

const DEFAULT_SUGGESTED_PROMPTS = [
  "Qual sua visao sobre lideranca?",
  "Resuma seus principais ensinamentos",
  "Como aplicar suas ideias no mundo atual?",
  "Conte sobre uma experiencia transformadora",
];

const DEFAULT_GREETING = "Explore ideias, questione estrategias, aprofunde conhecimentos";

interface ChatEmptyStateProps {
  mindName: string;
  onSelectPrompt: (prompt: string) => void;
  className?: string;
  /** Personalized greeting for this mind. Falls back to generic text. */
  greeting?: string;
  /** Personalized suggested prompts. Falls back to generic prompts. */
  suggestedPrompts?: string[];
}

export default function ChatEmptyState({
  mindName,
  onSelectPrompt,
  className,
  greeting,
  suggestedPrompts,
}: ChatEmptyStateProps) {
  const displayGreeting = greeting ?? DEFAULT_GREETING;
  const displayPrompts = suggestedPrompts ?? DEFAULT_SUGGESTED_PROMPTS;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center h-full px-6 py-12 text-center animate-in fade-in duration-700",
        className
      )}
    >
      {/* Dark Academia thematic icon -- quill & constellation */}
      <div className="relative w-20 h-20 rounded-full bg-purple-600/15 border border-purple-500/20 flex items-center justify-center mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-purple-400"
        >
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          <path d="M5 3v4" />
          <path d="M19 17v4" />
          <path d="M3 5h4" />
          <path d="M17 19h4" />
        </svg>
        {/* Subtle glow */}
        <div className="absolute inset-0 rounded-full bg-purple-500/5 blur-xl" aria-hidden="true" />
      </div>

      <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 mb-2">
        Converse com {mindName}
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        {displayGreeting}
      </p>

      {/* Suggested prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {displayPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelectPrompt(prompt)}
            className="text-left p-4 rounded-xl bg-black/30 border border-purple-500/10 hover:border-purple-500/40 hover:bg-purple-600/10 transition-all duration-200 group min-h-11"
          >
            <span className="text-sm text-muted-foreground group-hover:text-white transition-colors">
              {prompt}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
