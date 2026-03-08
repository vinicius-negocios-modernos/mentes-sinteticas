"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { triggerHaptic } from "@/lib/haptics";
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
  /** Whether STT is supported and voice mode is enabled. */
  showMicButton?: boolean;
  /** Whether the mic is currently recording. */
  isListening?: boolean;
  /** Start STT recording. */
  onStartListening?: () => void;
  /** Stop STT recording. */
  onStopListening?: () => void;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = t("chat.inputPlaceholder"),
  helperText,
  className,
  showMicButton = false,
  isListening = false,
  onStartListening,
  onStopListening,
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
      triggerHaptic("confirm");
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
          aria-label={t("chat.inputAriaLabel")}
          className="flex-1 min-h-[44px] max-h-[150px] resize-none overflow-y-auto bg-black/30 border-white/10 rounded-xl px-4 py-3 text-base focus-visible:border-purple-500/50 focus-visible:ring-purple-500/50 text-white placeholder-gray-500 field-sizing-fixed"
        />
        {/* Mic button — only rendered when STT is supported and voice mode is on */}
        {showMicButton && (
          <Button
            type="button"
            onClick={() => {
              if (isListening) {
                onStopListening?.();
              } else {
                onStartListening?.();
              }
            }}
            disabled={disabled}
            aria-label={
              isListening
                ? t("voice.stopRecording")
                : t("voice.startRecording")
            }
            aria-pressed={isListening}
            className={cn(
              "relative h-[44px] w-[44px] shrink-0 rounded-lg p-0 transition-colors",
              isListening
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-white/10 hover:bg-white/20 text-gray-300"
            )}
          >
            {/* Pulsing ring animation when recording */}
            {isListening && (
              <span
                className="absolute inset-0 rounded-lg animate-voice-pulse"
                style={{ border: "2px solid rgba(239, 68, 68, 0.5)" }}
                aria-hidden="true"
              />
            )}
            {/* Mic icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </Button>
        )}
        <Button
          onClick={() => {
            triggerHaptic("confirm");
            onSend();
          }}
          disabled={disabled || !value.trim()}
          aria-label={t("chat.sendAriaLabel")}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-medium h-[44px] shrink-0 disabled:opacity-40"
        >
          {t("chat.send")}
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
