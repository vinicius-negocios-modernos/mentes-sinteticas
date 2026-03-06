
import Link from "next/link";
import { getMindsList } from "./actions";

export default async function Home() {
  const minds = await getMindsList();

  return (
    <div className="min-h-screen p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start max-w-4xl mx-auto">

        {/* Header */}
        <header className="w-full flex flex-col items-center mb-12 text-center">
          <h1 className="text-5xl sm:text-7xl font-bold mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400"
            style={{
              background: 'linear-gradient(135deg, #c084fc 0%, #60a5fa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
            Mentes Sintéticas
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl">
            Acesse a sabedoria acumulada da humanidade. Converse com clones digitais gerados via arquitetura cognitiva avançada.
          </p>
        </header>

        {/* Action Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Card 1: Select Thinker */}
          <div className="glass-panel rounded-2xl p-8 transition-transform hover:scale-[1.02] cursor-pointer group">
            <h2 className="text-2xl font-semibold mb-2 group-hover:text-purple-400 transition-colors">
              Selecionar Mente
            </h2>
            <p className="text-gray-400 mb-6">
              Escolha com quem você quer debater hoje. De filósofos antigos a estrategistas modernos.
            </p>
            <div className="flex flex-wrap gap-2">
              {minds.length === 0 ? (
                <span className="text-xs text-gray-500">Nenhuma mente encontrada</span>
              ) : (
                minds.map(mind => (
                  <Link key={mind} href={`/chat/${encodeURIComponent(mind)}`} className="px-4 py-2 rounded-full bg-purple-600/20 border border-purple-500/50 hover:bg-purple-600/40 text-sm transition-colors text-purple-200">
                    {mind}
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Card 2: Knowledge Base (File Search) */}
          <div className="glass-panel rounded-2xl p-8 transition-transform hover:scale-[1.02] cursor-pointer group">
            <h2 className="text-2xl font-semibold mb-2 group-hover:text-cyan-400 transition-colors">
              Base de Conhecimento
            </h2>
            <p className="text-gray-400 mb-6">
              Gerencie os textos sagrados e obras completas que alimentam as Mentes Sintéticas via vetorização.
            </p>
            <div className="flex items-center gap-2 text-sm text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Google Gemini File Search Ativo
            </div>
          </div>

        </div>

      </main>

      <footer className="fixed bottom-4 w-full text-center text-gray-600 text-sm">
        Construído com Google Gemini 2.0 Flash & File API
      </footer>
    </div>
  );
}
