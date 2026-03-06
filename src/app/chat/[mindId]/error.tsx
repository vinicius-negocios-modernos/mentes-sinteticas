"use client";

import Link from "next/link";

export default function ChatError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center p-8 font-[family-name:var(--font-geist-sans)]"
             style={{ background: "radial-gradient(circle at 50% 0%, #1e1b4b 0%, #030014 60%)" }}>
            <div className="glass-panel rounded-2xl p-8 max-w-md text-center">
                <h1 className="text-3xl font-bold mb-4 text-purple-400">Conexao interrompida</h1>
                <p className="text-gray-400 mb-6">
                    {error.message || "Nao foi possivel conectar com esta mente. Tente novamente em alguns instantes."}
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
