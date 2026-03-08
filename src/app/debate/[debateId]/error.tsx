"use client";

import { Button } from "@/components/ui/button";

export default function DebateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-dvh bg-background text-foreground flex flex-col items-center justify-center gap-4 px-6">
      <h2 className="text-xl font-semibold text-white">Erro no debate</h2>
      <p className="text-muted-foreground text-center max-w-md">
        Ocorreu um erro ao carregar o debate. Tente novamente.
      </p>
      <Button onClick={reset} className="min-h-11">
        Tentar novamente
      </Button>
    </main>
  );
}
