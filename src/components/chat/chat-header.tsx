"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface ChatHeaderProps {
  mindName: string;
  mindDescription?: string;
  backHref?: string;
  className?: string;
}

export default function ChatHeader({
  mindName,
  mindDescription,
  backHref = "/",
  className,
}: ChatHeaderProps) {
  return (
    <header
      className={cn(
        "mb-6 flex items-center gap-4 px-2",
        className
      )}
    >
      {/* Mind Avatar */}
      <Avatar size="lg" className="bg-purple-600/30 shrink-0">
        <AvatarFallback className="bg-purple-600/30 text-purple-200 text-sm font-semibold">
          {getInitials(mindName)}
        </AvatarFallback>
      </Avatar>

      {/* Name + Description + Status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 truncate">
            {mindName}
          </h1>
          {/* Online status indicator */}
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-xs text-green-400 hidden sm:inline">Online</span>
          </span>
        </div>
        {mindDescription && (
          <p className="text-sm text-gray-400 truncate mt-0.5">
            {mindDescription}
          </p>
        )}
      </div>

      {/* End Session button */}
      <Button
        variant="ghost"
        asChild
        className="text-sm text-gray-500 hover:text-white shrink-0"
      >
        <Link href={backHref}>Encerrar Sessao</Link>
      </Button>
    </header>
  );
}
