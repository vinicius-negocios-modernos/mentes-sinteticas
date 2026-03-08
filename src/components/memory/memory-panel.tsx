"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ── Types ─────────────────────────────────────────────────────────────

interface MemoryItem {
  id: string;
  memoryType: "fact" | "preference" | "topic" | "insight";
  content: string;
  createdAt: string;
}

interface MemoryPanelProps {
  mindId: string;
  mindName: string;
  className?: string;
}

// ── Constants ─────────────────────────────────────────────────────────

const MEMORY_TYPE_CONFIG: Record<
  string,
  { label: string; emoji: string }
> = {
  fact: { label: t("memory.typeFact"), emoji: "📋" },
  preference: { label: t("memory.typePreference"), emoji: "⭐" },
  topic: { label: t("memory.typeTopic"), emoji: "📚" },
  insight: { label: t("memory.typeInsight"), emoji: "💡" },
};

// ── Component ─────────────────────────────────────────────────────────

export default function MemoryPanel({
  mindId,
  mindName,
  className,
}: MemoryPanelProps) {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchMemories = useCallback(async () => {
    if (!mindId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/memories?mindId=${mindId}`);
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories ?? []);
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, [mindId]);

  useEffect(() => {
    if (open) {
      fetchMemories();
    }
  }, [open, fetchMemories]);

  async function handleDeleteOne(memoryId: string) {
    setDeleting(memoryId);
    try {
      const res = await fetch(`/api/memories/${memoryId}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      }
    } catch {
      // Non-critical
    } finally {
      setDeleting(null);
    }
  }

  async function handleDeleteAll() {
    setBulkDeleting(true);
    try {
      const res = await fetch(`/api/memories?mindId=${mindId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      if (res.ok) {
        setMemories([]);
        setDeleteAllOpen(false);
      }
    } catch {
      // Non-critical
    } finally {
      setBulkDeleting(false);
    }
  }

  // Group memories by type
  const grouped: Record<string, MemoryItem[]> = {};
  for (const memory of memories) {
    if (!grouped[memory.memoryType]) grouped[memory.memoryType] = [];
    grouped[memory.memoryType].push(memory);
  }

  const typeOrder = ["fact", "preference", "topic", "insight"];

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("gap-1.5 text-muted-foreground hover:text-white", className)}
            title={t("memory.panelTitle")}
            aria-label={t("memory.panelTitle")}
          >
            <Brain className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline text-xs">{t("memory.buttonLabel")}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" aria-hidden="true" />
              {t("memory.panelTitle")}
            </SheetTitle>
            <SheetDescription>
              {t("memory.panelDescription", { mindName })}
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-4 flex flex-col gap-4" aria-live="polite">
            {loading && (
              <p className="text-sm text-muted-foreground animate-pulse" role="status">
                {t("common.loading")}
              </p>
            )}

            {!loading && memories.length === 0 && (
              <div className="text-center py-8" role="status">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  {t("memory.emptyState")}
                </p>
              </div>
            )}

            {!loading &&
              typeOrder.map((type) => {
                const items = grouped[type];
                if (!items || items.length === 0) return null;
                const config = MEMORY_TYPE_CONFIG[type];
                const headingId = `memory-group-${type}`;
                return (
                  <section key={type} aria-labelledby={headingId}>
                    <h3
                      id={headingId}
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2"
                    >
                      <span aria-hidden="true">{config.emoji} </span>
                      {config.label}
                    </h3>
                    <ul className="space-y-2" role="list">
                      {items.map((memory) => (
                        <li
                          key={memory.id}
                          className="group flex items-start gap-2 rounded-md border border-border/50 bg-muted/30 p-3"
                        >
                          <p className="flex-1 text-sm text-foreground">
                            {memory.content}
                          </p>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              onClick={() => handleDeleteOne(memory.id)}
                              disabled={deleting === memory.id}
                              aria-label={`${t("memory.deleteOne")}: ${memory.content.slice(0, 40)}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(memory.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}

            {!loading && memories.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="mt-4"
                onClick={() => setDeleteAllOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
                {t("memory.deleteAll")}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete All Confirmation Dialog */}
      <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
              {t("memory.deleteAllConfirmTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("memory.deleteAllConfirmDescription", { mindName })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteAllOpen(false)}
              disabled={bulkDeleting}
            >
              {t("memory.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? t("common.loading") : t("memory.confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
