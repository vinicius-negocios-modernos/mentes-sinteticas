import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getDebateById,
  getDebateParticipants,
} from "@/lib/services/debates";
import { listByConversation } from "@/lib/services/messages";
import DebateInterface from "@/components/debate/debate-interface";
import type { DebateStatus } from "@/lib/types";

export const metadata = {
  title: "Debate em Andamento — Mentes Sinteticas",
};

interface DebateViewPageProps {
  params: Promise<{ debateId: string }>;
}

export default async function DebateViewPage({ params }: DebateViewPageProps) {
  const { debateId } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Load debate
  const debate = await getDebateById(debateId, user.id);
  if (!debate) {
    redirect("/debate");
  }

  const participants = await getDebateParticipants(debateId);

  // Load existing messages
  let initialMessages: Array<{
    role: "user" | "model";
    text: string;
    mindName?: string;
    mindSlug?: string;
    turnNumber?: number;
  }> = [];

  if (debate.conversationId) {
    const stored = await listByConversation(debate.conversationId);
    let turnCounter = 0;
    initialMessages = stored.map((msg) => {
      const isAssistant = msg.role === "assistant";
      const participant = isAssistant && msg.mindSlug
        ? participants.find((p) => p.mindSlug === msg.mindSlug)
        : null;

      const result = {
        role: (isAssistant ? "model" : "user") as "user" | "model",
        text: msg.content,
        mindName: participant?.mindName,
        mindSlug: msg.mindSlug ?? undefined,
        turnNumber: isAssistant ? turnCounter : undefined,
      };

      if (isAssistant) turnCounter++;
      return result;
    });
  }

  return (
    <main className="min-h-dvh bg-background text-foreground flex flex-col px-6 py-4" aria-label="Debate em andamento">
      <DebateInterface
        debateId={debateId}
        topic={debate.topic}
        participants={participants}
        initialStatus={debate.status as DebateStatus}
        initialMessages={initialMessages}
        maxRounds={debate.maxRounds}
        currentTurn={debate.currentTurn}
      />
    </main>
  );
}
