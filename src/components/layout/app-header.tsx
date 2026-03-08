import Link from "next/link";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { MessageSquarePlus } from "lucide-react";

interface AppHeaderProps {
  mindName?: string;
  backHref?: string;
  className?: string;
}

export default function AppHeader({ mindName, backHref, className }: AppHeaderProps) {
  return (
    <header className={cn("w-full flex items-center justify-between", className)}>
      {mindName ? (
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
            {mindName}
          </h1>
        </div>
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
            {t("home.heroTitle")}
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl">
            {t("home.heroSubtitle")}
          </p>
          <Link
            href="/debate"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-purple-300 hover:text-white transition-colors min-h-11 px-4 py-2 rounded-lg border border-purple-500/30 bg-purple-600/10 hover:bg-purple-600/20"
          >
            <MessageSquarePlus className="w-4 h-4" />
            {t("debate.navLabel")}
          </Link>
        </div>
      )}
      <div className="flex items-center gap-3">
        {!mindName && (
          <Link
            href="/debate"
            className="text-sm text-muted-foreground hover:text-white transition-colors min-h-11 min-w-11 items-center justify-center px-3 hidden"
          >
            {t("debate.navLabel")}
          </Link>
        )}
        {backHref && (
          <Link
            href={backHref}
            className="text-sm text-muted-foreground hover:text-white transition-colors min-h-11 min-w-11 flex items-center justify-center px-3"
          >
            {t("chat.endSession")}
          </Link>
        )}
      </div>
    </header>
  );
}
