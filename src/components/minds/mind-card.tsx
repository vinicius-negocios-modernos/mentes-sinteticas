import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface MindCardProps {
  title: string;
  description: string;
  children?: React.ReactNode;
  hoverColor?: "purple" | "cyan";
  className?: string;
}

export default function MindCard({
  title,
  description,
  children,
  hoverColor = "purple",
  className,
}: MindCardProps) {
  const hoverClass =
    hoverColor === "cyan"
      ? "group-hover:text-cyan-400"
      : "group-hover:text-purple-400";

  return (
    <Card
      className={cn(
        "glass-panel rounded-2xl border-0 p-0 transition-transform hover:scale-[1.02] cursor-pointer group",
        className
      )}
    >
      <CardHeader className="p-8 pb-0">
        <CardTitle
          className={cn(
            "text-2xl font-semibold transition-colors",
            hoverClass
          )}
        >
          {title}
        </CardTitle>
        <CardDescription className="text-gray-400 mt-2">
          {description}
        </CardDescription>
      </CardHeader>
      {children && (
        <CardContent className="p-8 pt-6">{children}</CardContent>
      )}
    </Card>
  );
}
