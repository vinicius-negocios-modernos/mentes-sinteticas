"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    // Reset to auto to allow shrink
    textarea.style.height = "auto";
    // Set to scrollHeight but cap at ~6 lines (~150px)
    const newHeight = Math.min(textarea.scrollHeight, 150);
    textarea.style.height = `${newHeight}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className={cn("p-4 border-t border-white/5 bg-black/20 backdrop-blur-md safe-area-bottom", className)}>
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          aria-label="Digite sua mensagem"
          className="flex-1 min-h-[44px] max-h-[150px] resize-none overflow-y-auto bg-black/30 border-white/10 rounded-xl px-4 py-3 text-base focus-visible:border-purple-500/50 focus-visible:ring-purple-500/50 text-white placeholder-gray-500 field-sizing-fixed"
        />
        <Button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          aria-label="Enviar mensagem"
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-medium h-[44px] shrink-0 disabled:opacity-40"
        >
          Enviar
        </Button>
      </div>
      {helperText && (
        <div className="text-center mt-2 text-xs text-muted-foreground">
          {helperText}
        </div>
      )}
    </div>
  );
}
