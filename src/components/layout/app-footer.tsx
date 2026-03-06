import { cn } from "@/lib/utils";

interface AppFooterProps {
  className?: string;
}

export default function AppFooter({ className }: AppFooterProps) {
  return (
    <footer className={cn("fixed bottom-4 w-full text-center text-gray-600 text-sm", className)}>
      Construido com Google Gemini 2.0 Flash &amp; File API
    </footer>
  );
}
