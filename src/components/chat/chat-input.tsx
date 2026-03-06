"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  className?: string;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Digite sua questao estrategica...",
  helperText,
  className,
}: ChatInputProps) {
  return (
    <div className={cn("p-4 border-t border-white/5 bg-black/20 backdrop-blur-md", className)}>
      <div className="flex gap-2 relative">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-black/30 border-white/10 rounded-xl px-4 py-4 h-auto focus-visible:border-purple-500/50 focus-visible:ring-purple-500/50 text-white placeholder-gray-500"
        />
        <Button
          onClick={onSend}
          disabled={disabled}
          className="absolute right-2 top-2 bottom-2 px-6 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-medium h-auto"
        >
          Enviar
        </Button>
      </div>
      {helperText && (
        <div className="text-center mt-2 text-xs text-gray-600">
          {helperText}
        </div>
      )}
    </div>
  );
}
