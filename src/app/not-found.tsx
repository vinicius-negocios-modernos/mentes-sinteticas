import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-[100dvh] flex items-center justify-center p-8 font-[family-name:var(--font-geist-sans)]">
            <div className="glass-panel rounded-2xl p-8 max-w-md text-center">
                <h1 className="text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">404</h1>
                <h2 className="text-2xl font-semibold mb-2 text-white">Mente nao encontrada</h2>
                <p className="text-gray-400 mb-6">
                    Esta mente ainda nao foi despertada. Volte ao inicio para explorar as mentes disponiveis.
                </p>
                <Link href="/" className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-medium transition-colors">
                    Voltar ao inicio
                </Link>
            </div>
        </div>
    );
}
