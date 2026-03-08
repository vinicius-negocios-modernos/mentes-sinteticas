"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "@/lib/i18n";
import { triggerHaptic } from "@/lib/haptics";

interface SharePopoverProps {
  conversationId: string;
  isShared: boolean;
  shareToken: string | null;
  onShareChange: (shared: boolean, token: string | null) => void;
}

/**
 * Share/unshare controls for a conversation.
 * Displays as a button that opens share actions.
 */
export default function SharePopover({
  conversationId,
  isShared,
  shareToken,
  onShareChange,
}: SharePopoverProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [statusAnnouncement, setStatusAnnouncement] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);

  // Focus first menu item when menu opens
  useEffect(() => {
    if (showMenu) {
      firstMenuItemRef.current?.focus();
    }
  }, [showMenu]);

  // Keyboard handler for the dropdown menu
  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMenu(false);
        triggerRef.current?.focus();
      } else if (e.key === "Tab") {
        // Trap focus inside menu — close on Tab out
        e.preventDefault();
        setShowMenu(false);
        triggerRef.current?.focus();
      }
    },
    []
  );

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const shareUrl = shareToken ? `${appUrl}/shared/${shareToken}` : null;

  /**
   * Copy the share URL to clipboard.
   */
  async function copyShareUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setStatusAnnouncement(t("sharing.linkCopied"));
      toast.success(t("sharing.linkCopied"));
      triggerHaptic("confirm");
    } catch {
      // Fallback for older browsers
      toast.info(`${t("sharing.copyFallback")}: ${url}`);
    }
  }

  /**
   * Share the conversation — calls the API and copies the URL.
   */
  async function handleShare() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/share`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Erro ao compartilhar");
      }

      const data = await res.json();
      onShareChange(true, data.token);
      await copyShareUrl(data.url);
      setShowMenu(false);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Erro ao compartilhar";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Revoke sharing — calls the API to remove the token.
   */
  async function handleUnshare() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/share`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Erro ao revogar compartilhamento");
      }

      onShareChange(false, null);
      triggerHaptic("medium");
      toast.success(t("sharing.shareRevoked"));
      setShowRevokeDialog(false);
      setShowMenu(false);
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Erro ao revogar compartilhamento";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Handle main button click:
   * - Not shared: share immediately
   * - Already shared: toggle menu
   */
  async function handleButtonClick() {
    if (!isShared) {
      await handleShare();
    } else {
      setShowMenu((prev) => !prev);
    }
  }

  return (
    <div className="relative">
      {/* Share button */}
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        onClick={handleButtonClick}
        disabled={isLoading}
        className="text-sm text-muted-foreground hover:text-white shrink-0 gap-1.5"
        aria-label={t("sharing.shareAriaLabel")}
        aria-expanded={isShared ? showMenu : undefined}
        aria-haspopup={isShared ? "menu" : undefined}
      >
        {/* Share icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        {isLoading ? t("common.loading") : t("sharing.shareButton")}
        {/* Shared indicator dot */}
        {isShared && (
          <>
            <span
              className="w-2 h-2 rounded-full bg-green-500 shrink-0"
              aria-hidden="true"
            />
            <span className="sr-only">({t("sharing.sharedIndicator")})</span>
          </>
        )}
      </Button>

      {/* Screen reader status announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {statusAnnouncement}
      </div>

      {/* Dropdown menu when already shared */}
      {showMenu && isShared && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
            aria-hidden="true"
          />
          <div
            ref={menuRef}
            role="menu"
            aria-label={t("sharing.shareAriaLabel")}
            onKeyDown={handleMenuKeyDown}
            className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-gray-700/50 bg-gray-900/95 backdrop-blur-sm shadow-xl p-1.5"
          >
            {/* Copy link */}
            <button
              ref={firstMenuItemRef}
              role="menuitem"
              onClick={async () => {
                if (shareUrl) {
                  await copyShareUrl(shareUrl);
                  setShowMenu(false);
                  triggerRef.current?.focus();
                }
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-md transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
              {t("sharing.copyLink")}
            </button>

            {/* Divider */}
            <div className="h-px bg-gray-700/50 my-1" role="separator" />

            {/* Revoke */}
            <button
              role="menuitem"
              onClick={() => {
                setShowMenu(false);
                setShowRevokeDialog(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 rounded-md transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {t("sharing.revokeSharing")}
            </button>
          </div>
        </>
      )}

      {/* Revoke confirmation dialog */}
      <Dialog
        open={showRevokeDialog}
        onOpenChange={(open) => {
          setShowRevokeDialog(open);
          if (!open) triggerRef.current?.focus();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sharing.revokeTitle")}</DialogTitle>
            <DialogDescription>
              {t("sharing.revokeDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowRevokeDialog(false)}
              disabled={isLoading}
            >
              {t("sharing.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnshare}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? t("common.loading") : t("sharing.revokeConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
