"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DebateParticipantInfo } from "@/lib/types";

interface MindOption {
  slug: string;
  name: string;
  title?: string | null;
}

export default function DebateSetup() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [minds, setMinds] = useState<MindOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMinds, setIsLoadingMinds] = useState(true);

  // Fetch available minds
  useEffect(() => {
    async function loadMinds() {
      try {
        const res = await fetch("/api/minds");
        if (res.ok) {
          const data = await res.json();
          setMinds(data.minds ?? data ?? []);
        }
      } catch {
        toast.error("Erro ao carregar mentes.");
      } finally {
        setIsLoadingMinds(false);
      }
    }
    loadMinds();
  }, []);

  const toggleMind = (slug: string) => {
    setSelectedSlugs((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((s) => s !== slug);
      }
      if (prev.length >= 4) {
        toast.warning("Maximo de 4 mentes por debate.");
        return prev;
      }
      return [...prev, slug];
    });
  };

  const handleSubmit = async () => {
    if (topic.trim().length < 3) {
      toast.error("O topico deve ter pelo menos 3 caracteres.");
      return;
    }
    if (selectedSlugs.length < 2) {
      toast.error("Selecione pelo menos 2 mentes para o debate.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), participantSlugs: selectedSlugs }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Erro ao criar debate.");
        return;
      }

      const data = await res.json();
      router.push(`/debate/${data.debateId}`);
    } catch {
      toast.error("Erro ao criar debate. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = topic.trim().length >= 3 && selectedSlugs.length >= 2;

  return (
    <form
      className="max-w-2xl mx-auto w-full space-y-8"
      onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
      aria-label="Configurar debate"
    >
      {/* Topic Input */}
      <fieldset className="space-y-2">
        <legend className="sr-only">Topico do debate</legend>
        <label
          htmlFor="debate-topic"
          className="block text-sm font-medium text-gray-300"
        >
          Topico do Debate
        </label>
        <textarea
          id="debate-topic"
          rows={3}
          maxLength={500}
          placeholder="Ex: Qual e o papel da tecnologia no futuro da educacao?"
          className="w-full rounded-lg bg-gray-800/60 border border-gray-700/50 p-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          aria-describedby="topic-char-count"
          required
          minLength={3}
        />
        <p id="topic-char-count" className="text-xs text-muted-foreground">
          {topic.length}/500 caracteres
        </p>
      </fieldset>

      {/* Mind Selector */}
      <fieldset className="space-y-3">
        <legend className="sr-only">Selecione as mentes participantes</legend>
        <div role="group" aria-labelledby="mind-selector-label">
          <p id="mind-selector-label" className="text-sm font-medium text-gray-300 mb-3">
            Selecione as Mentes ({selectedSlugs.length}/4)
          </p>
          {isLoadingMinds ? (
            <div className="grid grid-cols-2 gap-3" aria-busy="true" aria-label="Carregando mentes">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-lg bg-gray-800/40 animate-pulse motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3" role="group" aria-label="Mentes disponiveis">
              {minds.map((mind) => {
                const isSelected = selectedSlugs.includes(mind.slug);
                return (
                  <button
                    key={mind.slug}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-label={`${mind.name}${mind.title ? ` — ${mind.title}` : ""}${isSelected ? " (selecionada)" : ""}`}
                    onClick={() => toggleMind(mind.slug)}
                    className={cn(
                      "p-4 rounded-lg border text-left transition-all",
                      "focus:outline-none focus:ring-2 focus:ring-purple-500/50",
                      "min-h-11",
                      isSelected
                        ? "bg-purple-600/20 border-purple-500/40 text-white"
                        : "bg-gray-800/40 border-gray-700/50 text-gray-300 hover:bg-gray-800/60 hover:border-gray-600/50"
                    )}
                  >
                    <span className="font-medium text-sm">{mind.name}</span>
                    {mind.title && (
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {mind.title}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </fieldset>

      {/* Submit */}
      <Button
        type="submit"
        disabled={!isValid || isLoading}
        className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-medium py-3 min-h-11"
        aria-label={isLoading ? "Criando debate, aguarde" : "Iniciar debate"}
      >
        {isLoading ? "Criando Debate..." : "Iniciar Debate"}
      </Button>
    </form>
  );
}
