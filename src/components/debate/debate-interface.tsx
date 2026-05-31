"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import DebateMessage, { DebateMessageLoading, DEBATE_COLORS } from "./debate-message";
import type { DebateParticipantInfo, DebateStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface DebateMessageData {
  role: "user" | "model";
  text: string;
  mindName?: string;
  mindSlug?: string;
  turnNumber?: number;
}

interface DebateInterfaceProps {
  debateId: string;
  topic: string;
  participants: DebateParticipantInfo[];
  initialStatus: DebateStatus;
  initialMessages?: DebateMessageData[];
  maxRounds: number;
  currentTurn: number;
}

export default function DebateInterface({
  debateId,
  topic,
  participants,
  initialStatus,
  initialMessages = [],
  maxRounds,
  currentTurn: initialTurn,
}: DebateInterfaceProps) {
  const [messages, setMessages] = useState<DebateMessageData[]>(initialMessages);
  const [status, setStatus] = useState<DebateStatus>(initialStatus);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingMind, setStreamingMind] = useState<{
    name: string;
    slug: string;
    colorIndex: number;
  } | null>(null);
  const [currentTurn, setCurrentTurn] = useState(initialTurn);
  const [showInterject, setShowInterject] = useState(false);
  const [interjectText, setInterjectText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  const [statusAnnouncement, setStatusAnnouncement] = useState("");
  const isComplete = status === "completed";
  const isPaused = status === "paused";
  const totalTurns = participants.length * maxRounds;

  // Build a slug-to-colorIndex map
  const colorMap = new Map<string, number>();
  participants.forEach((p, i) => colorMap.set(p.mindSlug, i));

  const currentMindName = useMemo(() => {
    if (participants.length === 0) return "";
    const idx = currentTurn % participants.length;
    return participants[idx].mindName;
  }, [currentTurn, participants]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  const handleNextTurn = async () => {
    if (isStreaming || isComplete) return;

    setIsStreaming(true);
    setStreamingText("");

    try {
      const res = await fetch(`/api/debate/${debateId}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "next-turn" }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.status === "completed") {
          setStatus("completed");
          toast.info(t("debate.debateCompletedToast"));
          return;
        }
        toast.error(data.error ?? t("debate.errorNextTurn"));
        return;
      }

      const mindSlug = res.headers.get("X-Current-Mind") ?? "";
      const mindName = decodeURIComponent(
        res.headers.get("X-Mind-Name") ?? ""
      );
      const turn = parseInt(res.headers.get("X-Current-Turn") ?? "0", 10);
      const colorIndex = colorMap.get(mindSlug) ?? 0;

      setStreamingMind({ name: mindName, slug: mindSlug, colorIndex });
      setStatusAnnouncement(t("debate.turnOf", { mindName }));

      // Read stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setStreamingText(fullText);
        }
      }

      // Add completed message
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: fullText,
          mindName,
          mindSlug,
          turnNumber: turn,
        },
      ]);
      setCurrentTurn(turn + 1);

      // Check if debate completed
      if (turn + 1 >= totalTurns) {
        setStatus("completed");
        setStatusAnnouncement(t("debate.debateFinished"));
        toast.info(t("debate.debateCompletedAllRounds"));
      }
    } catch {
      toast.error(t("debate.errorProcessTurn"));
    } finally {
      setIsStreaming(false);
      setStreamingText("");
      setStreamingMind(null);
    }
  };

  const handleInterject = async () => {
    if (!interjectText.trim()) return;

    try {
      const res = await fetch(`/api/debate/${debateId}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "interject", message: interjectText.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? t("debate.errorInterject"));
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "user", text: interjectText.trim() },
      ]);
      setInterjectText("");
      setShowInterject(false);
    } catch {
      toast.error(t("debate.errorSendInterject"));
    }
  };

  const handleControlAction = async (action: "pause" | "resume" | "end") => {
    try {
      const res = await fetch(`/api/debate/${debateId}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        const labels = {
          pause: t("debate.statusPaused"),
          resume: t("debate.statusResumed"),
          end: t("debate.statusEnded"),
        };
        const srLabels = {
          pause: t("debate.paused"),
          resume: t("debate.debateResumed"),
          end: t("debate.debateFinished"),
        };
        setStatusAnnouncement(srLabels[action]);
        toast.info(t("debate.debateActionToast", { action: labels[action] }));
      }
    } catch {
      toast.error(t("debate.errorControl"));
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100dvh-8rem)]">
      {/* Live region for status announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {statusAnnouncement}
      </div>

      {/* Header */}
      <div className="border-b border-gray-700/50 pb-4 mb-4">
        <h1 className="text-lg font-semibold text-white mb-2">{topic}</h1>
        <aside aria-label={t("debate.participantsAside")}>
          <h2 className="sr-only">{t("debate.participantsHeading")}</h2>
          <div className="flex flex-wrap gap-2" role="list">
            {participants.map((p, i) => {
              const color = DEBATE_COLORS[i % DEBATE_COLORS.length];
              return (
                <span
                  key={p.mindSlug}
                  role="listitem"
                  className={cn(
                    "text-xs px-2 py-1 rounded-full border",
                    color.bg,
                    color.text,
                    color.border
                  )}
                >
                  {p.mindName}
                </span>
              );
            })}
          </div>
        </aside>
        <p className="text-xs text-muted-foreground mt-2" aria-label={t("debate.roundTurnLabel", {
          round: String(Math.min(Math.floor(currentTurn / participants.length) + 1, maxRounds)),
          maxRounds: String(maxRounds),
          turn: String(currentTurn),
          totalTurns: String(totalTurns),
          endedSuffix: isComplete ? t("debate.ariaEndedSuffix") : "",
          pausedSuffix: isPaused ? t("debate.ariaPausedSuffix") : "",
        })}>
          {t("debate.roundLabel")} {Math.min(Math.floor(currentTurn / participants.length) + 1, maxRounds)}/{maxRounds}
          {" · "}
          {t("debate.turnLabel")} {currentTurn}/{totalTurns}
          {isComplete && t("debate.roundEndedSuffix")}
          {isPaused && t("debate.roundPausedSuffix")}
        </p>
      </div>

      {/* Messages — role="log" for debate conversation */}
      <ScrollArea className="flex-1 pr-4" ref={scrollViewportRef}>
        <div
          className="space-y-4 pb-4"
          role="log"
          aria-label={t("debate.debateLog")}
          aria-relevant="additions"
        >
          {messages.length === 0 && !isStreaming && (
            <p className="text-center text-muted-foreground py-8">
              {t("debate.startInstruction")}
            </p>
          )}

          {messages.map((msg, i) => (
            <DebateMessage
              key={i}
              role={msg.role}
              text={msg.text}
              mindName={msg.mindName}
              mindSlug={msg.mindSlug}
              colorIndex={msg.mindSlug ? (colorMap.get(msg.mindSlug) ?? 0) : 0}
              turnNumber={msg.turnNumber}
            />
          ))}

          {/* Streaming message */}
          {isStreaming && streamingMind && streamingText && (
            <DebateMessage
              role="model"
              text={streamingText}
              mindName={streamingMind.name}
              mindSlug={streamingMind.slug}
              colorIndex={streamingMind.colorIndex}
              isStreaming
            />
          )}

          {/* Loading indicator */}
          {isStreaming && streamingMind && !streamingText && (
            <DebateMessageLoading
              mindName={streamingMind.name}
              colorIndex={streamingMind.colorIndex}
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Interject Input */}
      {showInterject && !isComplete && (
        <div className="flex gap-2 mb-3" role="form" aria-label={t("debate.interjectFormLabel")}>
          <label htmlFor="interject-input" className="sr-only">
            {t("debate.interjectSrLabel")}
          </label>
          <input
            id="interject-input"
            type="text"
            value={interjectText}
            onChange={(e) => setInterjectText(e.target.value)}
            placeholder={t("debate.interjectPlaceholder")}
            className="flex-1 rounded-lg bg-gray-800/60 border border-gray-700/50 px-3 py-2 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleInterject();
              }
            }}
          />
          <Button
            size="sm"
            onClick={handleInterject}
            disabled={!interjectText.trim()}
            className="min-h-11"
            aria-label={t("debate.sendInterject")}
          >
            {t("debate.sendInterjectButton")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowInterject(false)}
            className="min-h-11"
            aria-label={t("debate.cancelInterject")}
          >
            {t("debate.cancel")}
          </Button>
        </div>
      )}

      {/* Controls */}
      <nav
        className="flex flex-wrap gap-2 pt-3 border-t border-gray-700/50"
        aria-label={t("debate.controlsLabel")}
        role="toolbar"
      >
        {!isComplete && (
          <>
            <Button
              onClick={handleNextTurn}
              disabled={isStreaming || isPaused}
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white min-h-11"
              aria-label={isStreaming ? t("debate.processingResponseOf", { mindName: streamingMind?.name ?? t("debate.mindFallback") }) : t("debate.nextTurnAria", { mindName: currentMindName })}
            >
              {isStreaming ? t("debate.processing") : t("debate.nextTurn")}
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowInterject(!showInterject)}
              disabled={isStreaming}
              className="min-h-11"
              aria-expanded={showInterject}
              aria-controls="interject-input"
            >
              {t("debate.interject")}
            </Button>

            {isPaused ? (
              <Button
                variant="outline"
                onClick={() => handleControlAction("resume")}
                className="min-h-11"
                aria-label={t("debate.resumeAria")}
              >
                {t("debate.resume")}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => handleControlAction("pause")}
                disabled={isStreaming}
                className="min-h-11"
                aria-label={t("debate.pauseAria")}
              >
                {t("debate.pause")}
              </Button>
            )}

            <Button
              variant="destructive"
              onClick={() => handleControlAction("end")}
              disabled={isStreaming}
              className="min-h-11"
              aria-label={t("debate.endAria")}
            >
              {t("debate.end")}
            </Button>
          </>
        )}

        {isComplete && (
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/debate")}
            className="min-h-11"
            aria-label={t("debate.newDebateAria")}
          >
            {t("debate.newDebate")}
          </Button>
        )}
      </nav>
    </div>
  );
}
