import Link from "next/link";
import DebateSetup from "@/components/debate/debate-setup";

export const metadata = {
  title: "Debates — Mentes Sinteticas",
  description:
    "Lance um debate entre mentes sinteticas e observe perspectivas divergentes sobre qualquer tema.",
};

export default function DebatePage() {
  return (
    <main className="min-h-dvh bg-background text-foreground flex flex-col" aria-label="Configuracao de debate">
      <header className="w-full flex items-center justify-between px-6 py-4">
        <h1
          className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text"
          style={{
            background: "linear-gradient(135deg, #c084fc 0%, #60a5fa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Debates
        </h1>
        <nav aria-label="Navegacao">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-white transition-colors min-h-11 flex items-center px-3"
            aria-label="Voltar para pagina inicial"
          >
            Voltar
          </Link>
        </nav>
      </header>

      <section className="flex-1 flex flex-col items-center justify-start px-6 py-8" aria-labelledby="debate-intro">
        <p id="debate-intro" className="text-gray-400 text-center mb-8 max-w-lg">
          Selecione 2 a 4 mentes e defina um topico. Elas debaterao entre si em
          turnos — e voce controla o ritmo.
        </p>
        <DebateSetup />
      </section>
    </main>
  );
}
