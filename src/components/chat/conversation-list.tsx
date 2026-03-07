"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteConversation } from "@/app/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import EmptyState from "@/components/ui/empty-state";
import type { Conversation } from "@/db/schema";

interface ConversationListProps {
  conversations: Conversation[];
  mindId: string;
  activeConversationId?: string;
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays}d atras`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function ConversationList({
  conversations,
  mindId,
  activeConversationId,
}: ConversationListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleSelect(conversationId: string) {
    router.push(
      `/chat/${encodeURIComponent(mindId)}?conversation=${conversationId}`
    );
  }

  function handleNewChat() {
    router.push(`/chat/${encodeURIComponent(mindId)}`);
  }

  async function handleDelete(e: React.MouseEvent, conversationId: string) {
    e.stopPropagation();
    if (!confirm("Excluir esta conversa?")) return;

    setDeletingId(conversationId);
    await deleteConversation(conversationId);

    startTransition(() => {
      // If we deleted the active conversation, go to new chat
      if (conversationId === activeConversationId) {
        router.push(`/chat/${encodeURIComponent(mindId)}`);
      }
      router.refresh();
      setDeletingId(null);
    });
  }

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-2 w-full">
        <Button
          onClick={handleNewChat}
          variant="outline"
          className="w-full justify-start bg-purple-600/20 border-purple-500/30 hover:bg-purple-600/40 text-purple-200"
        >
          + Nova Conversa
        </Button>

        {conversations.length === 0 && (
          <EmptyState
            compact
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            }
            title="Nenhuma conversa ainda"
            description="Inicie um dialogo com esta mente para explorar novas ideias."
          />
        )}

        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => handleSelect(conv.id)}
            disabled={isPending || deletingId === conv.id}
            className={cn(
              "group w-full px-3 py-3 text-left text-sm rounded-lg border transition-colors min-h-11",
              conv.id === activeConversationId
                ? "bg-purple-600/30 border-purple-500/50 text-white"
                : "bg-gray-800/30 border-gray-700/30 text-gray-300 hover:bg-gray-800/50 hover:border-gray-600/50",
              deletingId === conv.id && "opacity-50"
            )}
          >
            <div className="flex justify-between items-start gap-2">
              <span className="truncate flex-1">
                {conv.title || "Sem titulo"}
              </span>
              <button
                onClick={(e) => handleDelete(e, conv.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity text-xs shrink-0 min-h-11 min-w-11 flex items-center justify-center"
                title="Excluir conversa"
              >
                X
              </button>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDate(conv.updatedAt)}
            </span>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
