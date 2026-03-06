"use client";

import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  "Qual sua visao sobre lideranca?",
  "Resuma seus principais ensinamentos",
  "Como aplicar suas ideias no mundo atual?",
  "Conte sobre uma experiencia transformadora",
];

interface ChatEmptyStateProps {
  mindName: string;
  onSelectPrompt: (prompt: string) => void;
  className?: string;
}

export default function ChatEmptyState({
  mindName,
  onSelectPrompt,
  className,
}: ChatEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center h-full px-6 py-12 text-center animate-in fade-in duration-700",
        className
      )}
    >
      {/* Thematic icon */}
      <div className="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-purple-400"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>

      <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 mb-2">
        Converse com {mindName}
      </h2>
      <p className="text-sm text-gray-400 max-w-md mb-8">
        Explore ideias, questione estrategias, aprofunde conhecimentos
      </p>

      {/* Suggested prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelectPrompt(prompt)}
            className="text-left p-4 rounded-xl bg-black/30 border border-white/10 hover:border-purple-500/40 hover:bg-purple-600/10 transition-all duration-200 group"
          >
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
              {prompt}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
