import Link from "next/link";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  mindName?: string;
  backHref?: string;
  className?: string;
}

export default function AppHeader({ mindName, backHref, className }: AppHeaderProps) {
  return (
    <header className={cn("w-full flex items-center justify-between", className)}>
      {mindName ? (
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
          {mindName}
        </h1>
      ) : (
        <div className="flex flex-col items-center w-full mb-12 text-center">
          <h1
            className="text-5xl sm:text-7xl font-bold mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400"
            style={{
              background: "linear-gradient(135deg, #c084fc 0%, #60a5fa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Mentes Sinteticas
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl">
            Acesse a sabedoria acumulada da humanidade. Converse com clones
            digitais gerados via arquitetura cognitiva avancada.
          </p>
        </div>
      )}
      {backHref && (
        <Link
          href={backHref}
          className="text-sm text-gray-500 hover:text-white transition-colors"
        >
          Encerrar Sessao
        </Link>
      )}
    </header>
  );
}
