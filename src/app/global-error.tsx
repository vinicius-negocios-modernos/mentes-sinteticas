"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="min-h-[100dvh] bg-gray-950 flex items-center justify-center p-8">
        <div className="max-w-md w-full rounded-lg border border-red-900/30 bg-gray-900/80 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-400 mb-2">
            Algo deu errado
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Ocorreu um erro inesperado. Tente novamente.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 text-sm rounded-md border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-white/20 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
