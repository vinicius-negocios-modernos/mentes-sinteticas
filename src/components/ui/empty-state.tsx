import { cn } from "@/lib/utils";
import Link from "next/link";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: EmptyStateAction;
  className?: string;
  /** Smaller variant for sidebars/inline contexts */
  compact?: boolean;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  const actionElement = action ? (
    action.href ? (
      <Link
        href={action.href}
        className={cn(
          "inline-flex items-center justify-center rounded-xl border border-purple-500/40 bg-purple-600/20 text-purple-200 hover:bg-purple-600/40 transition-colors font-medium",
          compact
            ? "px-4 py-2 text-xs min-h-9"
            : "px-6 py-3 text-sm min-h-11"
        )}
      >
        {action.label}
      </Link>
    ) : (
      <button
        onClick={action.onClick}
        className={cn(
          "inline-flex items-center justify-center rounded-xl border border-purple-500/40 bg-purple-600/20 text-purple-200 hover:bg-purple-600/40 transition-colors font-medium",
          compact
            ? "px-4 py-2 text-xs min-h-9"
            : "px-6 py-3 text-sm min-h-11"
        )}
      >
        {action.label}
      </button>
    )
  ) : null;

  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center text-center animate-in fade-in duration-500",
        compact ? "px-4 py-6 gap-3" : "px-6 py-12 gap-4",
        className
      )}
    >
      {/* Icon container */}
      <div
        className={cn(
          "rounded-full bg-purple-600/15 border border-purple-500/20 flex items-center justify-center",
          compact ? "w-12 h-12" : "w-20 h-20"
        )}
      >
        <div className={cn("text-purple-400/80", compact ? "[&>svg]:w-5 [&>svg]:h-5" : "[&>svg]:w-8 [&>svg]:h-8")}>
          {icon}
        </div>
      </div>

      {/* Title */}
      <h3
        className={cn(
          "font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400",
          compact ? "text-sm" : "text-lg"
        )}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className={cn(
          "text-muted-foreground max-w-md",
          compact ? "text-xs" : "text-sm"
        )}
      >
        {description}
      </p>

      {/* Action */}
      {actionElement}
    </div>
  );
}
