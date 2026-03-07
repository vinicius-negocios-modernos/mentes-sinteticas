"use client";

import Link from "next/link";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="min-h-[100dvh] flex items-center justify-center p-8 font-[family-name:var(--font-geist-sans)]"
             style={{ background: "radial-gradient(circle at 50% 0%, #1e1b4b 0%, #030014 60%)" }}>
            <div className="glass-panel rounded-2xl p-8 max-w-md text-center">
                <h1 className="text-3xl font-bold mb-4 text-red-400">Algo deu errado</h1>
                <p className="text-gray-400 mb-6">
                    {error.message || "Ocorreu um erro inesperado. Tente novamente."}
                </p>
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={reset}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-medium transition-colors"
                    >
                        Tentar novamente
                    </button>
                    <Link href="/" className="px-6 py-3 border border-white/10 hover:bg-white/5 rounded-lg text-gray-300 font-medium transition-colors">
                        Voltar ao inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}
