"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import ConversationList from "@/components/chat/conversation-list";
import type { Conversation } from "@/db/schema";

interface ConversationDrawerProps {
  conversations: Conversation[];
  mindId: string;
  activeConversationId?: string;
}

export default function ConversationDrawer({
  conversations,
  mindId,
  activeConversationId,
}: ConversationDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0 text-gray-400 hover:text-white"
          aria-label="Abrir conversas"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-4 bg-background">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-sm font-semibold text-muted-foreground">
            Conversas
          </SheetTitle>
        </SheetHeader>
        <div onClick={() => setOpen(false)}>
          <ConversationList
            conversations={conversations}
            mindId={mindId}
            activeConversationId={activeConversationId}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
