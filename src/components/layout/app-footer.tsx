import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface AppFooterProps {
  className?: string;
}

export default function AppFooter({ className }: AppFooterProps) {
  return (
    <footer className={cn("fixed bottom-4 w-full text-center text-muted-foreground text-sm", className)}>
      {t("footer.builtWith")}
    </footer>
  );
}
