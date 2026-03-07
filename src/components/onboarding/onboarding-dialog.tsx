"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Step content definitions
// ---------------------------------------------------------------------------

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
        <path d="m9 10 2 2 4-4" />
      </svg>
    ),
    title: "Bem-vindo ao Atheneum",
    description:
      "As Mentes Sinteticas sao consciencias digitais inspiradas em grandes pensadores da humanidade. Cada mente possui conhecimentos, personalidade e estilo unicos -- como ter um mentor pessoal de outra era.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    ),
    title: "Escolha uma Mente",
    description:
      "Na pagina inicial, voce encontrara as mentes disponiveis. Cada uma representa um pensador diferente. Clique em qualquer nome para iniciar uma conversa com essa mente.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 10h.01" />
        <path d="M12 10h.01" />
        <path d="M16 10h.01" />
      </svg>
    ),
    title: "Inicie uma Conversa",
    description:
      "Digite sua pergunta ou escolha uma sugestao para comecar. A mente respondera com base em seus conhecimentos originais. Suas conversas ficam salvas para voce retomar quando quiser.",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface OnboardingDialogProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingDialog({
  open,
  onComplete,
  onSkip,
}: OnboardingDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;
  const step = STEPS[currentStep];

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  }, [isLastStep, onComplete]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((s) => s - 1);
    }
  }, [isFirstStep]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onSkip(); }}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md border-purple-500/20 bg-background/95 backdrop-blur-md"
        aria-label="Onboarding - conheca o Mentes Sinteticas"
      >
        <DialogHeader className="items-center text-center">
          {/* Step icon */}
          <div className="w-20 h-20 rounded-full bg-purple-600/15 border border-purple-500/20 flex items-center justify-center mx-auto mb-2">
            {step.icon}
          </div>

          <DialogTitle className="text-xl bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
            {step.title}
          </DialogTitle>

          <DialogDescription className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 py-2" role="group" aria-label={`Passo ${currentStep + 1} de ${STEPS.length}`}>
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                idx === currentStep
                  ? "bg-purple-400 w-6"
                  : idx < currentStep
                    ? "bg-purple-400/50"
                    : "bg-muted-foreground/30"
              )}
              aria-hidden="true"
            />
          ))}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          {/* Skip button -- always visible */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-muted-foreground hover:text-white min-h-11"
          >
            Pular
          </Button>

          <div className="flex gap-2">
            {/* Previous button */}
            {!isFirstStep && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                className="border-purple-500/30 min-h-11"
              >
                Anterior
              </Button>
            )}

            {/* Next / Complete button */}
            <Button
              size="sm"
              onClick={handleNext}
              className="bg-purple-600/80 hover:bg-purple-600 text-white border border-purple-500/40 min-h-11"
            >
              {isLastStep ? "Comecar" : "Proximo"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
