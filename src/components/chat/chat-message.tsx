import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  role: "user" | "model";
  text: string;
  className?: string;
}

interface ChatMessageLoadingProps {
  className?: string;
}

export function ChatMessageLoading({ className }: ChatMessageLoadingProps) {
  return (
    <div className={cn("flex justify-start", className)}>
      <div className="bg-gray-800/40 p-4 rounded-2xl rounded-bl-none flex gap-2 items-center">
        <div
          className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}

export default function ChatMessage({ role, text, className }: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex",
        role === "user" ? "justify-end" : "justify-start",
        className
      )}
    >
      <div
        className={cn(
          "max-w-[80%] p-4 rounded-2xl",
          role === "user"
            ? "bg-purple-600/20 border border-purple-500/30 text-white rounded-br-none"
            : "bg-gray-800/40 border border-gray-700/50 text-gray-200 rounded-bl-none"
        )}
      >
        <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/50">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
