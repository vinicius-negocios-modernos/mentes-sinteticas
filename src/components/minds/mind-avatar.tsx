import { cn } from "@/lib/utils";

interface MindAvatarProps {
  name: string;
  avatarUrl?: string | null;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Avatar component for a mind. Displays the avatar image if available,
 * otherwise falls back to styled initials with a dark academia gradient.
 */
export default function MindAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
}: MindAvatarProps) {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sizeClasses = {
    sm: "w-12 h-12 text-lg",
    md: "w-20 h-20 text-2xl",
    lg: "w-28 h-28 text-4xl",
  };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`Avatar de ${name}`}
        className={cn(
          "rounded-full object-cover border-2 border-[#c9a55a]/30",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`Avatar de ${name}`}
      className={cn(
        "rounded-full flex items-center justify-center font-serif font-bold",
        "bg-gradient-to-br from-purple-900/60 to-amber-900/40",
        "border-2 border-[#c9a55a]/30",
        "text-[#c9a55a]",
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
