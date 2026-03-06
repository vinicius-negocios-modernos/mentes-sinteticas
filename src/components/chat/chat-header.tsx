import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  mindName: string;
  backHref?: string;
  className?: string;
}

export default function ChatHeader({
  mindName,
  backHref = "/",
  className,
}: ChatHeaderProps) {
  return (
    <header className={cn("mb-8 flex items-center justify-between", className)}>
      <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
        {mindName}
      </h1>
      <Button variant="ghost" asChild className="text-sm text-gray-500 hover:text-white">
        <Link href={backHref}>Encerrar Sessao</Link>
      </Button>
    </header>
  );
}
