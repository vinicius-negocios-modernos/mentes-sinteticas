"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";

interface MindTagProps {
  name: string;
  href: string;
  className?: string;
}

export default function MindTag({ name, href, className }: MindTagProps) {
  return (
    <Link
      href={href}
      onClick={() => triggerHaptic("light")}
      className={cn(
        "px-4 py-2 rounded-full bg-purple-600/20 border border-purple-500/50 hover:bg-purple-600/40 text-sm transition-colors text-purple-200",
        className
      )}
    >
      {name}
    </Link>
  );
}
